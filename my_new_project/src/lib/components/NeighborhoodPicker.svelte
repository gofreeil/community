<script lang="ts">
    // בורר מיקום שכונה — דגם "סמן קבוע במרכז":
    // הסמן 📍 יושב תמיד במרכז המסך. התושב גורר את המפה כך שהסמן יהיה על המיקום
    // המבוקש, ולוחץ על כפתור "אישור המיקום". מרכז המפה = הקואורדינטה (lat/lng, bind).
    // אין צורך "לנעוץ" או "לגרור פין" — כמו בגוגל מפות / גט / וולט.
    import { onMount, untrack } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { getCoordsFor, hasPreciseCoords } from '$lib/neighborhoodCoords';
    import 'leaflet/dist/leaflet.css';

    let {
        city = '',
        neighborhood = '',
        restrictToCity = false,
        fallbackCenter = null,
        lat = $bindable<number | null>(null),
        lng = $bindable<number | null>(null),
        onUserPin,
    }: {
        city?: string;
        /** כשידועה - המפה נפתחת ממוקדת על השכונה (זום קרוב) במקום על מרכז העיר */
        neighborhood?: string;
        /** נועל את הגלילה לסביבת העיר - שהמשתמש לא ישוטט בטעות בכל הארץ */
        restrictToCity?: boolean;
        /** מרכז חלופי (lat/lng) לעיר שאין לה קואורדינטה מובנית - למשל תוצאת geocoding.
         *  מבטיח שהמפה נפתחת על העיר הנבחרת ולא על ברירת המחדל (ירושלים). */
        fallbackCenter?: [number, number] | null;
        lat?: number | null;
        lng?: number | null;
        /** נקרא כשהמשתמש עצמו מיקם/אישר את הסמן (להבדיל מהצבה תוכנתית מבחוץ) */
        onUserPin?: (lat: number, lng: number) => void;
    } = $props();

    // OSM הרשמי - צבעוני עם שמות רחובות בעברית. שרת יחיד (HTTP/2), בלי מפתח.
    const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    let mapEl: HTMLDivElement;
    let L: any = null;
    let map: any = null;
    let ready = $state(false);

    // "נקבע מיקום" נגזר ישירות מהקואורדינטות: כך שניקוי שדה קואורדינטה ידני
    // מחזיר את המצב ל"טרם נקבע" במקום להישאר תקוע על "אושר" בלי מיקום בפועל.
    let placed = $derived(lat != null && lng != null);
    // האם המפה נגררת ברגע זה (להנפשת "הרמת" הסמן)
    let dragging = $state(false);
    // דגל: התזוזה הבאה יזמה המשתמש (נדלק ב-dragstart בלבד). תזוזות תוכנתיות
    // (setView / invalidateSize / zoom) לא מדליקות אותו ולכן לא נחשבות לסימון.
    let userGesture = false;

    // הצגת שדות קואורדינטות ידניים (מקופל כברירת מחדל - למתקדמים בלבד)
    let showManual = $state(false);

    // הדגמה מונפשת חד-פעמית: יד גוררת את המפה. נעלמת אחרי כמה שניות / בגרירה ראשונה
    let showDemo = $state(false);
    let demoTimer: ReturnType<typeof setTimeout> | null = null;
    function playDemo() {
        showDemo = true;
        if (demoTimer) clearTimeout(demoTimer);
        demoTimer = setTimeout(() => (showDemo = false), 6000);
    }
    function dismissDemo() {
        showDemo = false;
        if (demoTimer) clearTimeout(demoTimer);
        demoTimer = null;
    }

    // הגדלה למסך מלא וסגירה חזרה
    let expanded = $state(false);
    function toggleExpand() {
        expanded = !expanded;
        // Leaflet חייב invalidateSize אחרי שינוי גודל המכולה
        setTimeout(() => map?.invalidateSize?.(), 60);
        setTimeout(() => map?.invalidateSize?.(), 320);
    }
    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && expanded) toggleExpand();
    }
    // נעילת גלילת הרקע כשהמפה במסך מלא
    $effect(() => {
        if (typeof document === 'undefined') return;
        document.body.style.overflow = expanded ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    });

    function zoomIn()  { map?.zoomIn?.(); }
    function zoomOut() { map?.zoomOut?.(); }

    // קורא את מרכז המפה → lat/lng. fromUser=true כשזו פעולה של המשתמש.
    function captureCenter(fromUser: boolean) {
        if (!map) return;
        const c = map.getCenter();
        lat = +c.lat.toFixed(6);
        lng = +c.lng.toFixed(6);
        if (fromUser) { onUserPin?.(lat, lng); dismissDemo(); }
    }

    // "אישור המיקום": קובע את המרכז הנוכחי כמיקום + סוגר מסך מלא אם פתוח.
    // זהו הכפתור הראשי — עונה על השאלה "מה עכשיו?" שהמשתמש נתקע בה.
    function confirmLocation() {
        captureCenter(true);
        if (expanded) toggleExpand();
    }

    // הזנת קואורדינטות ידנית → מזיז את המפה למיקום שהוקלד
    function onManualInput() {
        if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && map) {
            map.setView([lat, lng], Math.max(map.getZoom(), 16), { animate: true });
            onUserPin?.(lat, lng);
            dismissDemo();
        }
    }

    // הצבה מבחוץ (geocoding של הכתובת שהוקלדה): כשה-lat/lng הכבולים משתנים
    // שלא דרך גרירת המפה - ממרכזים את המפה עליהם (לא נחשב סימון של המשתמש).
    $effect(() => {
        const la = lat, ln = lng;
        if (!map || la == null || ln == null) return;
        const c = map.getCenter();
        if (Math.abs(c.lat - la) < 1e-6 && Math.abs(c.lng - ln) < 1e-6) return;
        map.setView([la, ln], Math.max(map.getZoom(), 16), { animate: true });
    });

    onMount(async () => {
        try {
            const mod = await import('leaflet');
            L = (mod as any).default ?? mod;
            ready = true;
        } catch (e) {
            console.error('[NeighborhoodPicker] Leaflet load failed:', e instanceof Error ? e.message : e);
        }
    });

    // נקודת הפתיחה: שכונה מדויקת (זום קרוב) → מרכז עיר → ברירת מחדל.
    function homeView(): { center: [number, number]; zoom: number } {
        // עיר מוכרת → מרכזה המדויק. עיר שאינה בטבלה → מרכז חלופי מ-geocoding אם
        // הועבר (fallbackCenter), אחרת ברירת המחדל (ירושלים) - כדי לא לפתוח על עיר אחרת.
        const cityCenter: [number, number] = hasPreciseCoords(undefined, city)
            ? getCoordsFor(undefined, city)
            : (fallbackCenter ?? getCoordsFor(undefined, city));
        if (neighborhood) {
            const nb = getCoordsFor(neighborhood, city);
            if (nb[0] !== cityCenter[0] || nb[1] !== cityCenter[1]) {
                return { center: nb, zoom: 15 };
            }
        }
        return { center: cityCenter, zoom: 13 };
    }

    // גבולות שוטטות סביב העיר (±~13 ק"מ) - רק כשהעיר באמת מוכרת לנו.
    function cityBounds(): [[number, number], [number, number]] | null {
        if (!restrictToCity || !hasPreciseCoords(undefined, city)) return null;
        const [cLat, cLng] = getCoordsFor(undefined, city);
        return [[cLat - 0.12, cLng - 0.15], [cLat + 0.12, cLng + 0.15]];
    }

    // אתחול המפה — פעם אחת בלבד כשהיא מוכנה. הקריאה ל-lat/lng/city/neighborhood
    // עטופה ב-untrack כדי שהאפקט לא יתלה בהם: אחרת כל גרירה (שמעדכנת lat/lng)
    // הייתה מריצה מחדש את האפקט, מוחקת ובונה מחדש את כל מפת Leaflet (הבהוב + קפיצת זום).
    // האפקט תלוי רק ב-ready. שינויי עיר/שכונה/מיקום מטופלים באפקטים הייעודיים למטה.
    $effect(() => {
        if (!ready || !L || !mapEl || map) return;

        untrack(() => {
            const home = homeView();
            const center: [number, number] =
                lat != null && lng != null ? [lat, lng] : home.center;
            const bounds = cityBounds();

            map = L.map(mapEl, {
                zoomControl: false,
                scrollWheelZoom: true,
                minZoom: bounds ? 11 : 8,
                maxZoom: 19,
                ...(bounds ? { maxBounds: bounds, maxBoundsViscosity: 1.0 } : {}),
            }).setView(center, lat != null && lng != null ? 16 : home.zoom);
            map.attributionControl?.setPrefix(false);

            L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19, maxNativeZoom: 19, keepBuffer: 4, updateWhenZooming: false }).addTo(map);

            // המשתמש גורר את המפה → הסמן (מרכז) נשאר על המיקום; ב-dragend קוראים אותו.
            // רק גרירה יזומה נספרת: תזוזות תוכנתיות (setView/invalidateSize/zoom) מדלגות.
            map.on('dragstart', () => { userGesture = true; dragging = true; dismissDemo(); });
            map.on('moveend', () => {
                dragging = false;
                if (userGesture) { userGesture = false; captureCenter(true); }
            });

            setTimeout(() => map?.invalidateSize?.(), 50);
            setTimeout(() => map?.invalidateSize?.(), 300);

            // הדגמה מונפשת רק כשעדיין לא נקבע מיקום
            if (!placed) setTimeout(playDemo, 500);
        });

        return () => {
            try { map?.remove?.(); } catch {}
            map = null;
        };
    });

    // מרכוז מחדש כשעדיין אין מיקום והעיר/שכונה משתנות + עדכון גבולות השוטטות.
    // תלוי גם ב-fallbackCenter כדי שכשה-geocoding של העיר מסתיים - המפה תזוז אליה.
    $effect(() => {
        void city; void neighborhood; void fallbackCenter; // תלות מפורשת
        if (!map) return;
        const bounds = cityBounds();
        if (bounds) {
            map.setMaxBounds(bounds);
            map.setMinZoom(11);
        } else {
            map.setMaxBounds(null);
            map.setMinZoom(8);
        }
        if (placed) return;
        const home = homeView();
        map.setView(home.center, home.zoom, { animate: true });
    });
</script>

<svelte:window on:keydown={onKeydown} />

<div class="space-y-2">
    <!-- מכולת המפה: יחסית כדי לעגן את הסמן הקבוע, ההוראה, הכפתורים וההדגמה -->
    <div class="map-wrap {expanded ? 'map-wrap--expanded' : ''}">
        <div
            bind:this={mapEl}
            class="map-el {expanded ? '' : 'h-64 rounded-xl'} w-full overflow-hidden border border-white/15 bg-slate-800"
        ></div>

        <!-- הסמן הקבוע במרכז: התושב מזיז את המפה מתחתיו. לא חוסם גרירה. -->
        <div class="center-pin {dragging ? 'center-pin--lift' : ''}" aria-hidden="true">
            <div class="center-pin__icon">📍</div>
            <div class="center-pin__dot"></div>
        </div>

        <!-- הוראה מתמדת בראש המפה: מסבירה בדיוק מה לעשות -->
        <div class="map-hint">{$_('components.np_drag_map')}</div>

        <!-- כפתורי זום (פינה ימנית-עליונה) -->
        <div class="map-zoom" aria-hidden={!ready}>
            <button type="button" onclick={zoomIn} class="map-btn map-zoom-btn" aria-label={$_('components.np_zoom_in')} title={$_('components.np_zoom_in')}>+</button>
            <button type="button" onclick={zoomOut} class="map-btn map-zoom-btn" aria-label={$_('components.np_zoom_out')} title={$_('components.np_zoom_out')}>−</button>
        </div>

        {#if expanded}
            <!-- מסך מלא: כפתור סגירה קטן למעלה + סרגל אישור גדול בתחתית -->
            <button
                type="button"
                onclick={toggleExpand}
                class="map-btn map-btn--x"
                aria-label={$_('components.np_close_map_aria')}
                title={$_('components.np_close_map_title')}
            >✕</button>

            <div class="map-confirmbar">
                <div class="map-confirmbar__text">
                    {placed ? $_('components.np_center_here') : $_('components.np_position_then_confirm')}
                </div>
                <button type="button" onclick={confirmLocation} class="map-confirm-btn">
                    ✓ {$_('components.np_confirm')}
                </button>
            </div>
        {:else}
            <!-- מוקטן: כפתור הגדלה למסך מלא -->
            <button
                type="button"
                onclick={toggleExpand}
                class="map-btn map-btn--expand"
                aria-label={$_('components.np_expand_map_aria')}
                title={$_('components.np_expand_map_title')}
            >
                <span class="text-base leading-none">⤢</span>
                <span class="hidden sm:inline">{$_('components.np_expand')}</span>
            </button>
        {/if}

        <!-- שכבת ההדגמה המונפשת: יד גוררת את המפה -->
        {#if showDemo && !expanded}
            <div class="demo-overlay">
                <div class="demo-banner">{$_('components.np_drag_map')}</div>
                <div class="demo-hand">🖐️</div>
            </div>
        {/if}
    </div>

    {#if !expanded}
        <!-- כפתור אישור ראשי מתחת למפה המוקטנת -->
        <button
            type="button"
            onclick={confirmLocation}
            class="confirm-inline {placed ? 'confirm-inline--done' : ''}"
        >
            {placed ? `✓ ${$_('components.np_confirmed')}` : `📍 ${$_('components.np_confirm')}`}
        </button>
        <p class="text-center text-xs {placed ? 'text-emerald-400' : 'text-gray-400'}">
            {placed ? $_('components.np_drag_to_adjust') : $_('components.np_drag_map')}
        </p>

        <!-- קואורדינטות ידניות - מקופל, למי שכבר יש לו קו רוחב/אורך -->
        <div class="pt-0.5">
            <button
                type="button"
                onclick={() => (showManual = !showManual)}
                class="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
                {showManual ? '▴' : '▾'} {$_('components.np_manual_coords')}
            </button>
            {#if showManual}
                <div class="mt-1.5 flex gap-2" dir="ltr">
                    <input
                        type="number" step="any" inputmode="decimal"
                        bind:value={lat} oninput={onManualInput}
                        placeholder={$_('components.np_lat_placeholder')}
                        class="w-1/2 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
                    />
                    <input
                        type="number" step="any" inputmode="decimal"
                        bind:value={lng} oninput={onManualInput}
                        placeholder={$_('components.np_lng_placeholder')}
                        class="w-1/2 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
                    />
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    :global(.leaflet-container) {
        background: #e8e6e0;
    }
    /* OSM כבר צבעוני מטבעו - חידוד עדין בלבד. */
    :global(.leaflet-tile-pane) {
        filter: saturate(1.1);
    }
    /* שורת הייחוס (חובה חוקית) - מוקטנת ודהויה */
    :global(.leaflet-control-attribution) {
        font-size: 8px !important;
        line-height: 1.4 !important;
        padding: 0 4px !important;
        background: rgba(255, 255, 255, 0.7) !important;
        color: rgba(30, 41, 59, 0.55) !important;
        border-top-left-radius: 6px;
    }
    :global(.leaflet-control-attribution a) {
        color: rgba(30, 41, 59, 0.8) !important;
    }
    /* במסך מלא סרגל האישור יושב בתחתית - מרימים את הייחוס (חובה חוקית) מעליו כדי
       שלא ייחסם, ומעל ה-z-index שלו כדי שיישאר גלוי. */
    .map-wrap--expanded :global(.leaflet-control-attribution) {
        bottom: calc(7.5rem + env(safe-area-inset-bottom)) !important;
        z-index: 1001 !important;
    }

    .map-wrap {
        position: relative;
    }
    /* מצב מוגדל: מסך מלא מעל כל התוכן */
    .map-wrap--expanded {
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: #0f172a;
        padding: 0;
    }
    .map-wrap--expanded .map-el {
        height: 100dvh;
        border-radius: 0;
        border: 0;
    }

    /* ===== הסמן הקבוע במרכז ===== */
    .center-pin {
        position: absolute;
        top: 50%;
        left: 50%;
        z-index: 800;
        pointer-events: none; /* חשוב: הגרירה עוברת דרכו אל המפה */
        transform: translate(-50%, -100%);
        transition: transform 0.18s ease;
    }
    /* בזמן גרירה הסמן "נרם" מעט כלפי מעלה - משוב מגע */
    .center-pin--lift {
        transform: translate(-50%, -100%) translateY(-6px);
    }
    .center-pin__icon {
        font-size: 2.6rem;
        line-height: 1;
        filter: drop-shadow(0 4px 4px rgba(0, 0, 0, 0.5));
    }
    /* נקודה קטנה שמסמנת את הנקודה המדויקת שעליה יושב חוד הסמן */
    .center-pin__dot {
        position: absolute;
        bottom: -3px;
        left: 50%;
        width: 8px;
        height: 8px;
        margin-left: -4px;
        border-radius: 999px;
        background: rgba(220, 38, 38, 0.9);
        box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.25);
    }

    /* ===== הוראה מתמדת בראש המפה ===== */
    .map-hint {
        position: absolute;
        top: 0.5rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        max-width: min(90%, 22rem);
        padding: 0.4rem 0.9rem;
        border-radius: 999px;
        font-size: 0.8rem;
        font-weight: 700;
        text-align: center;
        color: #fff;
        background: rgba(15, 23, 42, 0.82);
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(2px);
        pointer-events: none;
    }

    /* ===== סרגל האישור בתחתית (מסך מלא) ===== */
    .map-confirmbar {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.5rem;
        padding: 0.9rem 1rem calc(0.9rem + env(safe-area-inset-bottom));
        background: linear-gradient(to top, rgba(15, 23, 42, 0.97) 65%, rgba(15, 23, 42, 0));
    }
    .map-confirmbar__text {
        text-align: center;
        font-size: 0.9rem;
        font-weight: 700;
        color: #e2e8f0;
    }
    .map-confirm-btn {
        width: 100%;
        padding: 0.95rem;
        border-radius: 0.9rem;
        border: 0;
        font-size: 1.1rem;
        font-weight: 900;
        color: #fff;
        background: linear-gradient(90deg, #059669, #10b981);
        box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
        cursor: pointer;
        transition: filter 0.15s, transform 0.1s;
    }
    .map-confirm-btn:hover { filter: brightness(1.06); }
    .map-confirm-btn:active { transform: scale(0.98); }

    /* ===== כפתור אישור מתחת למפה המוקטנת ===== */
    .confirm-inline {
        width: 100%;
        padding: 0.85rem;
        border-radius: 0.9rem;
        border: 1px solid rgba(16, 185, 129, 0.5);
        font-size: 1rem;
        font-weight: 900;
        color: #fff;
        background: linear-gradient(90deg, #2563eb, #7c3aed);
        box-shadow: 0 4px 16px rgba(37, 99, 235, 0.35);
        cursor: pointer;
        transition: filter 0.15s, transform 0.1s;
    }
    .confirm-inline:hover { filter: brightness(1.06); }
    .confirm-inline:active { transform: scale(0.99); }
    .confirm-inline--done {
        background: linear-gradient(90deg, #059669, #10b981);
        box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
    }

    /* ===== כפתורי בקרה על המפה ===== */
    .map-btn {
        position: absolute;
        z-index: 1000;
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        font-family: inherit;
        font-weight: 700;
        color: #0f172a;
        background: rgba(255, 255, 255, 0.94);
        border: 1px solid rgba(15, 23, 42, 0.15);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
        cursor: pointer;
        transition: background 0.15s, transform 0.15s;
    }
    .map-btn:hover {
        background: #fff;
        transform: translateY(-1px);
    }
    .map-btn--expand {
        bottom: 0.5rem;
        left: 0.5rem;
        padding: 0.4rem 0.65rem;
        border-radius: 0.6rem;
        font-size: 0.8rem;
    }
    .map-btn--x {
        top: 0.5rem;
        left: 0.5rem;
        width: 2.2rem;
        height: 2.2rem;
        justify-content: center;
        border-radius: 0.6rem;
        font-size: 1rem;
    }
    /* כפתורי זום מוערמים בפינה ימנית-עליונה */
    .map-zoom {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }
    .map-zoom-btn {
        position: static;
        width: 2rem;
        height: 2rem;
        justify-content: center;
        border-radius: 0.6rem;
        font-size: 1.35rem;
        line-height: 1;
        padding: 0;
    }

    /* ===== שכבת ההדגמה: יד גוררת את המפה ===== */
    .demo-overlay {
        position: absolute;
        inset: 0;
        z-index: 900;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(2, 6, 23, 0.28);
        backdrop-filter: blur(1px);
        animation: demo-fade 0.4s ease;
    }
    .demo-banner {
        margin-bottom: 1rem;
        padding: 0.55rem 1.1rem;
        border-radius: 999px;
        font-size: 0.95rem;
        font-weight: 800;
        color: #fff;
        background: linear-gradient(90deg, #2563eb, #7c3aed);
        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    }
    .demo-hand {
        font-size: 2.4rem;
        line-height: 1;
        filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
        animation: demo-swipe 2.2s ease-in-out infinite;
    }
    /* היד נעה שמאלה-ימינה כדי להדגים גרירת המפה */
    @keyframes demo-swipe {
        0%   { transform: translateX(46px) rotate(-6deg); }
        50%  { transform: translateX(-46px) rotate(6deg); }
        100% { transform: translateX(46px) rotate(-6deg); }
    }
    @keyframes demo-fade {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
        .demo-hand, .center-pin { animation: none; transition: none; }
    }
</style>

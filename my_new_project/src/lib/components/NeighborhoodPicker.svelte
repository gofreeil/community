<script lang="ts">
    // בורר מיקום שכונה: התושב לוחץ/גורר פין על המפה כדי לסמן את מיקום השכונה החדשה,
    // או מקליד קואורדינטות ידנית אם יש לו. lat/lng נחשפים ב-bind.
    import { onMount } from 'svelte';
    import { _ } from 'svelte-i18n';
    import { getCoordsFor, hasPreciseCoords } from '$lib/neighborhoodCoords';
    import 'leaflet/dist/leaflet.css';

    let {
        city = '',
        neighborhood = '',
        restrictToCity = false,
        lat = $bindable<number | null>(null),
        lng = $bindable<number | null>(null),
        onUserPin,
    }: {
        city?: string;
        /** כשידועה - המפה נפתחת ממוקדת על השכונה (זום קרוב) במקום על מרכז העיר */
        neighborhood?: string;
        /** נועל את הגלילה לסביבת העיר - שהמשתמש לא ישוטט בטעות בכל הארץ */
        restrictToCity?: boolean;
        lat?: number | null;
        lng?: number | null;
        /** נקרא כשהמשתמש עצמו הזיז/סימן פין (להבדיל מהצבה תוכנתית מבחוץ), עם הקואורדינטות החדשות */
        onUserPin?: (lat: number, lng: number) => void;
    } = $props();

    // רקע מפה בהיר מ-CARTO (Positron) - בהיר וברור. ייחוס מוקטן ב-CSS למטה.
    const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> · <a href="https://carto.com/attributions">CARTO</a>';

    let mapEl: HTMLDivElement;
    let L: any = null;
    let map: any = null;
    let marker: any = null;
    let ready = $state(false);

    // אנימציית הדגמה: יד שגוררת פין על המפה עם הסבר, נעלמת אחרי כמה שניות
    let showDemo = $state(false);
    let demoTimer: ReturnType<typeof setTimeout> | null = null;

    function playDemo() {
        showDemo = true;
        if (demoTimer) clearTimeout(demoTimer);
        demoTimer = setTimeout(() => (showDemo = false), 6500);
    }
    function dismissDemo() {
        showDemo = false;
        if (demoTimer) clearTimeout(demoTimer);
        demoTimer = null;
    }

    // הגדלת המפה למסך מלא וסגירה חזרה
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

    // זום פנימה/החוצה דרך כפתורים מותאמים (במקום בקרת Leaflet המובנית)
    function zoomIn()  { map?.zoomIn?.(); }
    function zoomOut() { map?.zoomOut?.(); }

    function pinIcon() {
        return L.divIcon({
            html: '<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5));">📍</div>',
            className: '',
            iconSize: [30, 30],
            iconAnchor: [15, 30],
        });
    }

    function setPin(latlng: { lat: number; lng: number }, recenter = false, byUser = true) {
        lat = +latlng.lat.toFixed(6);
        lng = +latlng.lng.toFixed(6);
        if (byUser) { onUserPin?.(lat, lng); dismissDemo(); }
        if (!map) return;
        if (!marker) {
            marker = L.marker([lat, lng], { draggable: true, icon: pinIcon() }).addTo(map);
            marker.on('dragend', () => setPin(marker.getLatLng()));
        } else {
            marker.setLatLng([lat, lng]);
        }
        if (recenter) map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
    }

    function onManualInput() {
        if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && map) {
            setPin({ lat, lng }, true);
        }
    }

    // הצבת פין מבחוץ (geocoding של הכתובת שהוקלדה): כשה-lat/lng הכבולים משתנים
    // שלא דרך אינטראקציה עם המפה - מזיזים את הסמן ומתמקדים עליו.
    $effect(() => {
        const la = lat, ln = lng;
        if (!map || la == null || ln == null) return;
        if (marker) {
            const cur = marker.getLatLng();
            if (Math.abs(cur.lat - la) < 1e-7 && Math.abs(cur.lng - ln) < 1e-7) return;
        }
        setPin({ lat: la, lng: ln }, true, false);
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
    // שכונה נחשבת מדויקת רק אם יש לה קואורדינטה משלה (שונה ממרכז העיר).
    function homeView(): { center: [number, number]; zoom: number } {
        const cityCenter = getCoordsFor(undefined, city);
        if (neighborhood) {
            const nb = getCoordsFor(neighborhood, city);
            if (nb[0] !== cityCenter[0] || nb[1] !== cityCenter[1]) {
                return { center: nb, zoom: 15 };
            }
        }
        return { center: cityCenter, zoom: 13 };
    }

    // גבולות שוטטות סביב העיר (±~13 ק"מ) - רק כשהעיר באמת מוכרת לנו,
    // אחרת (יישוב חדש ללא קואורדינטות) המפה נשארת חופשית.
    function cityBounds(): [[number, number], [number, number]] | null {
        if (!restrictToCity || !hasPreciseCoords(undefined, city)) return null;
        const [cLat, cLng] = getCoordsFor(undefined, city);
        return [[cLat - 0.12, cLng - 0.15], [cLat + 0.12, cLng + 0.15]];
    }

    // אתחול המפה כשהיא מוכנה
    $effect(() => {
        if (!ready || !L || !mapEl || map) return;

        const home = homeView();
        const center: [number, number] =
            lat != null && lng != null ? [lat, lng] : home.center;
        const bounds = cityBounds();

        map = L.map(mapEl, {
            // בקרת הזום המובנית של Leaflet יושבת בפינה שמאל-עליון ומתנגשת בכפתור
            // ההגדלה - לכן מכבים אותה ומשתמשים בכפתורי זום מותאמים (map-zoom).
            zoomControl: false,
            scrollWheelZoom: true,
            minZoom: bounds ? 11 : 8,
            maxZoom: 20,
            ...(bounds ? { maxBounds: bounds, maxBoundsViscosity: 1.0 } : {}),
        }).setView(center, lat != null && lng != null ? 15 : home.zoom);
        map.attributionControl?.setPrefix(false); // מסיר את הקישור "Leaflet" משורת הייחוס

        L.tileLayer(TILE_URL, { attribution: TILE_ATTR, subdomains: 'abcd', maxZoom: 20, maxNativeZoom: 20, detectRetina: true, keepBuffer: 4, updateWhenZooming: false }).addTo(map);
        map.on('click', (e: any) => setPin(e.latlng));

        // פין קיים (עריכה/geocoding) מוצב תוכנתית - לא נחשב סימון ידני של המשתמש
        if (lat != null && lng != null) setPin({ lat, lng }, false, false);

        setTimeout(() => map?.invalidateSize?.(), 50);
        setTimeout(() => map?.invalidateSize?.(), 300);

        // הדגמה מונפשת רק כשעדיין אין פין (המשתמש צריך לסמן)
        if (lat == null || lng == null) setTimeout(playDemo, 400);

        return () => {
            try { map?.remove?.(); } catch {}
            map = null;
            marker = null;
        };
    });

    // מרכוז מחדש כשאין עדיין פין והעיר/שכונה משתנות + עדכון גבולות השוטטות
    $effect(() => {
        void city; void neighborhood; // תלות מפורשת
        if (!map) return;
        const bounds = cityBounds();
        if (bounds) {
            map.setMaxBounds(bounds);
            map.setMinZoom(11);
        } else {
            map.setMaxBounds(null);
            map.setMinZoom(8);
        }
        if (marker) return;
        const home = homeView();
        map.setView(home.center, home.zoom, { animate: true });
    });
</script>

<svelte:window on:keydown={onKeydown} />

<div class="space-y-2">
    <!-- מכולת המפה: יחסית כדי לעגן את שכבת ההדגמה וכפתור ההגדלה -->
    <div class="map-wrap {expanded ? 'map-wrap--expanded' : ''}">
        <div
            bind:this={mapEl}
            class="map-el {expanded ? '' : 'h-56 rounded-xl'} w-full overflow-hidden border border-white/15 bg-slate-800"
        ></div>

        <!-- כפתור הגדלה / סגירה -->
        <button
            type="button"
            onclick={toggleExpand}
            class="map-btn map-btn--expand"
            aria-label={expanded ? $_('components.np_close_map_aria') : $_('components.np_expand_map_aria')}
            title={expanded ? $_('components.np_close_map_title') : $_('components.np_expand_map_title')}
        >
            {#if expanded}
                <span class="text-lg leading-none">✕</span>
                <span class="hidden sm:inline">{$_('components.close')}</span>
            {:else}
                <span class="text-lg leading-none">⤢</span>
                <span class="hidden sm:inline">{$_('components.np_expand')}</span>
            {/if}
        </button>

        <!-- כפתורי זום מותאמים (פינה ימנית-עליונה, לא מתנגשים בכפתור ההגדלה) -->
        <div class="map-zoom" aria-hidden={!ready}>
            <button
                type="button"
                onclick={zoomIn}
                class="map-btn map-zoom-btn"
                aria-label={$_('components.np_zoom_in')}
                title={$_('components.np_zoom_in')}
            >+</button>
            <button
                type="button"
                onclick={zoomOut}
                class="map-btn map-zoom-btn"
                aria-label={$_('components.np_zoom_out')}
                title={$_('components.np_zoom_out')}
            >−</button>
        </div>

        <!-- שכבת ההדגמה המונפשת: יד גוררת פין על המפה -->
        {#if showDemo}
            <div class="demo-overlay">
                <div class="demo-banner">{$_('components.np_drag_pin')}</div>
                <div class="demo-stage">
                    <div class="demo-pin">📍</div>
                    <div class="demo-hand">🖐️</div>
                </div>
            </div>
            <!-- כפתור הפעלה חוזרת של ההדגמה -->
            <button type="button" onclick={dismissDemo} class="map-btn map-btn--gotit">{$_('components.np_got_it')}</button>
        {:else}
            <button
                type="button"
                onclick={playDemo}
                class="map-btn map-btn--help"
                aria-label={$_('components.np_how_to_mark_aria')}
                title={$_('components.np_show_demo_title')}
            >?</button>
        {/if}
    </div>

    <div class="flex gap-2" dir="ltr">
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
    {#if lat != null && lng != null}
        <p class="text-xs text-emerald-400">{$_('components.np_location_marked', { values: { lat, lng } })}</p>
    {/if}
</div>

<style>
    :global(.leaflet-container) {
        background: #e6e3dd;
    }
    /* חידוד אריחי Voyager (לא על הפינים) - saturate גבוה מבליט את ירוק הגינות/הפארקים */
    :global(.leaflet-tile-pane) {
        filter: contrast(1.06) saturate(1.45);
    }
    /* שורת הייחוס (חובה חוקית) - מוקטנת ודהויה כדי שלא תבלוט */
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
    /* מכולת המפה */
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

    /* כפתורי בקרה על המפה (מעל שכבות Leaflet) */
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
        top: 0.5rem;
        left: 0.5rem;
        padding: 0.35rem 0.6rem;
        border-radius: 0.6rem;
        font-size: 0.8rem;
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
    .map-btn--help {
        bottom: 0.5rem;
        right: 0.5rem;
        width: 1.9rem;
        height: 1.9rem;
        justify-content: center;
        border-radius: 999px;
        font-size: 1.05rem;
        color: #1e293b;
    }
    .map-btn--gotit {
        bottom: 0.6rem;
        right: 0.5rem;
        padding: 0.4rem 0.8rem;
        border-radius: 999px;
        font-size: 0.85rem;
        background: #10b981;
        color: #fff;
        border-color: rgba(16, 185, 129, 0.6);
    }
    .map-btn--gotit:hover {
        background: #059669;
    }

    /* שכבת ההדגמה המונפשת */
    .demo-overlay {
        position: absolute;
        inset: 0;
        z-index: 900;
        pointer-events: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: rgba(2, 6, 23, 0.32);
        backdrop-filter: blur(1px);
        animation: demo-fade 0.4s ease;
    }
    .demo-banner {
        margin-bottom: 1.4rem;
        padding: 0.55rem 1.1rem;
        border-radius: 999px;
        font-size: 1.05rem;
        font-weight: 800;
        color: #fff;
        background: linear-gradient(90deg, #2563eb, #7c3aed);
        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.5);
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        animation: demo-pop 2.2s ease-in-out infinite;
    }
    /* אזור התנועה: פין קבוע + יד שנעה וגוררת אותו */
    .demo-stage {
        position: relative;
        width: 160px;
        height: 60px;
    }
    .demo-pin {
        position: absolute;
        top: 0;
        left: 50%;
        font-size: 2.6rem;
        line-height: 1;
        filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.55));
        transform-origin: bottom center;
        animation: demo-drag-pin 2.6s ease-in-out infinite;
    }
    .demo-hand {
        position: absolute;
        top: 1.4rem;
        left: 50%;
        font-size: 2.1rem;
        line-height: 1;
        filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
        animation: demo-drag-hand 2.6s ease-in-out infinite;
    }

    /* הפין: נאחז (קפיצה קטנה) ואז נגרר שמאלה עם היד */
    @keyframes demo-drag-pin {
        0%   { transform: translateX(0) scale(1); }
        12%  { transform: translateX(0) scale(1.18); }
        20%  { transform: translateX(0) scale(1.12); }
        60%  { transform: translateX(-58px) scale(1.12); }
        72%  { transform: translateX(-58px) scale(1); }
        100% { transform: translateX(-58px) scale(1); }
    }
    @keyframes demo-drag-hand {
        0%   { transform: translateX(6px) rotate(0deg); }
        12%  { transform: translateX(2px) rotate(-8deg); }
        60%  { transform: translateX(-56px) rotate(-8deg); }
        72%  { transform: translateX(-52px) rotate(0deg); }
        100% { transform: translateX(6px) rotate(0deg); opacity: 0.9; }
    }
    @keyframes demo-pop {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.06); }
    }
    @keyframes demo-fade {
        from { opacity: 0; }
        to   { opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
        .demo-banner, .demo-pin, .demo-hand { animation: none; }
    }
</style>

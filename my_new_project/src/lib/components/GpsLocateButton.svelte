<script lang="ts">
    // כרטיס "שתף את המיקום שלי" — חוויה בסגנון וואטסאפ לקריאת מצוקה בנייד.
    // בלחיצה אחת: בקשת הרשאת מיקום מהמכשיר → קליטת GPS → תצוגת מפה מוקטנת עם
    // הכתובת והדיוק, וכוונון הפין בגרירה. טיפול מקיף בכל מצבי ההרשאה:
    // בדיקה מוקדמת (Permissions API כשנתמך), חסום/מסורב, לא נתמך, וחיבור לא-מאובטח,
    // כולל הוראות הפעלה מדויקות לכל פלטפורמה (iOS / Android / דסקטופ).
    import { onMount, onDestroy, tick } from 'svelte';
    import { _ } from 'svelte-i18n';
    import 'leaflet/dist/leaflet.css';

    let {
        lat = $bindable<number | null>(null),
        lng = $bindable<number | null>(null),
        active = $bindable(false),
        onLocated,
    }: {
        lat?: number | null;
        lng?: number | null;
        /** true כשיש קיבוע GPS פעיל (הכרטיס במצב "שותף") - ההורה מסתיר את המסלול הידני */
        active?: boolean;
        onLocated: (r: { lat: number; lng: number; address: string; accuracy: number | null }) => void;
    } = $props();

    type Phase   = 'idle' | 'locating' | 'success' | 'error';
    type ErrKind = '' | 'denied' | 'timeout' | 'unavailable' | 'unsupported' | 'insecure';

    let phase     = $state<Phase>('idle');
    let errKind   = $state<ErrKind>('');
    let permState = $state<'unknown' | 'granted' | 'prompt' | 'denied'>('unknown');
    let address   = $state('');
    let accuracy  = $state<number | null>(null);
    let showHelp  = $state(false);
    // זיהוי פלטפורמה — לבחירת הוראות ההפעלה הנכונות במצב "חסום"
    let platform  = $state<'ios' | 'android' | 'desktop'>('desktop');

    let L: any = null;
    let map: any = null;
    let marker: any = null;
    let mapEl: HTMLDivElement | undefined = $state();
    let revTimer: ReturnType<typeof setTimeout> | null = null;
    let permStatusRef: any = null;

    const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    function detectPlatform(): 'ios' | 'android' | 'desktop' {
        if (typeof navigator === 'undefined') return 'desktop';
        const ua = navigator.userAgent || '';
        // iPadOS מתחזה ל-Mac — מזהים לפי מסך מגע
        if (/iP(hone|ad|od)/.test(ua) || (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)) return 'ios';
        if (/Android/.test(ua)) return 'android';
        return 'desktop';
    }

    onMount(async () => {
        platform = detectPlatform();
        // בדיקת הרשאה מוקדמת (כשנתמך) — כדי לרמז "חסום" עוד לפני ניסיון כושל.
        // Safari ישן לא תומך ב-permissions על geolocation → נופלים בשקט לזרימת getCurrentPosition.
        try {
            const perms = (navigator as any)?.permissions;
            if (perms?.query) {
                const st = await perms.query({ name: 'geolocation' });
                permStatusRef = st;
                permState = st.state;
                st.onchange = () => { permState = st.state; };
            }
        } catch { /* לא נתמך — מתעלמים */ }
    });

    onDestroy(() => {
        if (revTimer) clearTimeout(revTimer);
        if (permStatusRef) { try { permStatusRef.onchange = null; } catch {} }
        destroyMap();
    });

    function destroyMap() {
        try { map?.remove?.(); } catch {}
        map = null; marker = null;
    }

    async function reverseGeocode(la: number, ln: number): Promise<string> {
        try {
            const res = await fetch(`/api/reverse-geocode?lat=${la}&lng=${ln}`);
            if (!res.ok) return '';
            const data = await res.json();
            return typeof data?.address === 'string' ? data.address : '';
        } catch {
            return '';
        }
    }

    function emit() {
        if (lat == null || lng == null) return;
        onLocated({ lat, lng, address, accuracy });
    }

    function locate() {
        errKind = ''; showHelp = false;
        // חיבור לא-מאובטח (לא https) — הדפדפן יחסום גישה למיקום
        if (typeof window !== 'undefined' && window.isSecureContext === false) {
            phase = 'error'; errKind = 'insecure'; return;
        }
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            phase = 'error'; errKind = 'unsupported'; return;
        }
        phase = 'locating';
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                lat = +pos.coords.latitude.toFixed(6);
                lng = +pos.coords.longitude.toFixed(6);
                accuracy = pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null;
                permState = 'granted';
                phase = 'success';
                active = true;
                emit();                                   // שולחים מיד (הכתובת תעודכן כשתגיע)
                address = await reverseGeocode(lat!, lng!);
                emit();
                ensureMap();
            },
            (err) => {
                phase = 'error';
                if (err.code === err.PERMISSION_DENIED)  { errKind = 'denied'; permState = 'denied'; showHelp = true; }
                else if (err.code === err.TIMEOUT)       { errKind = 'timeout'; }
                else                                      { errKind = 'unavailable'; }
            },
            // קריאת מצוקה — דיוק גבוה, עד 15ש', מקבלים קיבוע מטמון עד 15ש'
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 },
        );
    }

    function reset() {
        phase = 'idle'; errKind = ''; active = false; showHelp = false;
        lat = null; lng = null; address = ''; accuracy = null;
        destroyMap();
    }

    // מפה מוקטנת (תצוגה + כוונון בגרירה) — נטענת רק בדפדפן, אחרי מצב success
    async function ensureMap() {
        if (map || lat == null || lng == null) return;
        try {
            const mod = await import('leaflet');
            L = (mod as any).default ?? mod;
        } catch { return; }
        await tick();
        if (!mapEl || map || lat == null || lng == null) return;
        map = L.map(mapEl, {
            zoomControl: false, scrollWheelZoom: false, doubleClickZoom: false,
            boxZoom: false, keyboard: false, dragging: true, attributionControl: false,
        }).setView([lat, lng], 16);
        L.tileLayer(TILE_URL, { maxZoom: 19 }).addTo(map);
        marker = L.marker([lat, lng], { draggable: true, icon: pinIcon() }).addTo(map);
        marker.on('dragend', () => {
            const ll = marker.getLatLng();
            lat = +ll.lat.toFixed(6); lng = +ll.lng.toFixed(6);
            map.panTo([lat, lng], { animate: true });
            scheduleRefine();
        });
        map.on('click', (e: any) => {
            lat = +e.latlng.lat.toFixed(6); lng = +e.latlng.lng.toFixed(6);
            marker.setLatLng([lat, lng]);
            scheduleRefine();
        });
        setTimeout(() => map?.invalidateSize?.(), 60);
        setTimeout(() => map?.invalidateSize?.(), 300);
    }

    // כוונון ידני של הפין — מרעננים כתובת (debounce) ומאפסים את נתון הדיוק
    function scheduleRefine() {
        if (revTimer) clearTimeout(revTimer);
        revTimer = setTimeout(async () => {
            if (lat == null || lng == null) return;
            accuracy = null;
            address = await reverseGeocode(lat, lng);
            emit();
        }, 600);
    }

    function pinIcon() {
        return L.divIcon({
            html: '<div style="font-size:30px;line-height:1;filter:drop-shadow(0 2px 3px rgba(0,0,0,.5));">📍</div>',
            className: '', iconSize: [30, 30], iconAnchor: [15, 30],
        });
    }
</script>

<div dir="rtl">
    {#if phase === 'success'}
        <!-- כרטיס "המיקום שותף" בסגנון וואטסאפ: תצוגת מפה + כתובת + כוונון -->
        <div class="rounded-2xl overflow-hidden border border-emerald-500/40 bg-emerald-500/5">
            <div bind:this={mapEl} class="h-36 w-full bg-slate-800"></div>
            <div class="p-3">
                <div class="flex items-center gap-2 text-emerald-300 font-black text-sm">
                    <span class="text-base leading-none">✅</span>
                    <span>{$_('listings.gps_success_title')}</span>
                </div>
                {#if address}
                    <p class="mt-1 text-gray-200 text-sm leading-snug">📍 {address}</p>
                {/if}
                {#if accuracy != null}
                    <p class="mt-0.5 text-xs text-gray-400">{$_('listings.gps_accuracy', { values: { m: accuracy } })}</p>
                {/if}
                <p class="mt-1 text-[11px] text-gray-500">{$_('listings.gps_refine_hint')}</p>
                <button type="button" onclick={reset}
                    class="mt-2 text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors">
                    {$_('listings.gps_change')}
                </button>
            </div>
        </div>

    {:else if phase === 'locating'}
        <div class="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 px-4 py-4 flex items-center gap-3">
            <span class="gps-spin text-xl leading-none">🛰️</span>
            <div class="min-w-0">
                <p class="text-emerald-200 font-black text-sm">{$_('listings.gps_locating')}</p>
                <p class="text-xs text-gray-400 mt-0.5">{$_('listings.gps_locating_sub')}</p>
            </div>
        </div>

    {:else if phase === 'error'}
        <div class="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
            <p class="text-amber-200 font-bold text-sm leading-relaxed">
                {#if errKind === 'denied'}{$_('listings.gps_denied_body')}
                {:else if errKind === 'timeout'}{$_('listings.gps_timeout')}
                {:else if errKind === 'insecure'}{$_('listings.gps_insecure')}
                {:else if errKind === 'unsupported'}{$_('listings.gps_unsupported')}
                {:else}{$_('listings.gps_unavailable')}{/if}
            </p>

            {#if errKind === 'denied'}
                <button type="button" onclick={() => (showHelp = !showHelp)}
                    class="mt-2 text-xs font-bold text-amber-300 underline underline-offset-2">
                    {$_('listings.gps_how_enable')} <span class="text-[10px]">{showHelp ? '▲' : '▼'}</span>
                </button>
                {#if showHelp}
                    <ol class="mt-2 list-decimal pr-4 space-y-1 text-xs text-amber-100/90 leading-relaxed">
                        {#each $_('listings.gps_steps_' + platform).split('|') as step}
                            <li>{step}</li>
                        {/each}
                    </ol>
                {/if}
            {/if}

            {#if errKind !== 'unsupported' && errKind !== 'insecure'}
                <button type="button" onclick={locate}
                    class="mt-3 w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm py-2.5 transition-all">
                    {$_('listings.gps_retry')}
                </button>
            {/if}
        </div>

    {:else}
        <!-- idle: כרטיס הזמנה בסגנון וואטסאפ ("שתף את המיקום שלי") -->
        <button type="button" onclick={locate}
            class="w-full flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-gradient-to-l from-emerald-600/15 to-teal-600/10 hover:from-emerald-600/25 hover:to-teal-600/20 px-4 py-3.5 text-right transition-all">
            <span class="shrink-0 w-11 h-11 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl leading-none">📍</span>
            <span class="flex-1 min-w-0">
                <span class="block text-white font-black text-sm">{$_('listings.gps_share_title')}</span>
                <span class="block text-emerald-200/80 text-xs mt-0.5">
                    {permState === 'denied' ? $_('listings.gps_blocked_sub') : $_('listings.gps_share_sub')}
                </span>
            </span>
            <span class="shrink-0 text-emerald-300 text-lg leading-none">‹</span>
        </button>
    {/if}
</div>

<style>
    .gps-spin {
        display: inline-block;
        animation: gps-spin 1.1s linear infinite;
    }
    @keyframes gps-spin {
        to { transform: rotate(360deg); }
    }
    @media (prefers-reduced-motion: reduce) {
        .gps-spin { animation: none; }
    }
</style>

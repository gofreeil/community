<script lang="ts">
    // בורר מיקום שכונה: התושב לוחץ/גורר פין על המפה כדי לסמן את מיקום השכונה החדשה,
    // או מקליד קואורדינטות ידנית אם יש לו. lat/lng נחשפים ב-bind.
    import { onMount } from 'svelte';
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
        /** נקרא כשהמשתמש עצמו הזיז/סימן פין (להבדיל מהצבה תוכנתית מבחוץ) */
        onUserPin?: () => void;
    } = $props();

    const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    let mapEl: HTMLDivElement;
    let L: any = null;
    let map: any = null;
    let marker: any = null;
    let ready = $state(false);

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
        if (byUser) onUserPin?.();
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
            zoomControl: true,
            scrollWheelZoom: true,
            minZoom: bounds ? 11 : 8,
            maxZoom: 19,
            ...(bounds ? { maxBounds: bounds, maxBoundsViscosity: 1.0 } : {}),
        }).setView(center, lat != null && lng != null ? 15 : home.zoom);

        L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
        map.on('click', (e: any) => setPin(e.latlng));

        // פין קיים (עריכה/geocoding) מוצב תוכנתית - לא נחשב סימון ידני של המשתמש
        if (lat != null && lng != null) setPin({ lat, lng }, false, false);

        setTimeout(() => map?.invalidateSize?.(), 50);
        setTimeout(() => map?.invalidateSize?.(), 300);

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

<div class="space-y-2">
    <div
        bind:this={mapEl}
        class="w-full h-56 rounded-xl overflow-hidden border border-white/15 bg-slate-800"
    ></div>
    <p class="text-xs text-gray-300">
        📍 לחצו על המפה כדי לסמן את מיקום השכונה (אפשר לגרור את הסמן לדיוק)
    </p>
    <div class="flex gap-2" dir="ltr">
        <input
            type="number" step="any" inputmode="decimal"
            bind:value={lat} oninput={onManualInput}
            placeholder="lat (קו רוחב)"
            class="w-1/2 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
        />
        <input
            type="number" step="any" inputmode="decimal"
            bind:value={lng} oninput={onManualInput}
            placeholder="lng (קו אורך)"
            class="w-1/2 rounded-lg bg-white/5 border border-white/15 px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500"
        />
    </div>
    {#if lat != null && lng != null}
        <p class="text-xs text-emerald-400">✓ מיקום סומן: {lat}, {lng}</p>
    {/if}
</div>

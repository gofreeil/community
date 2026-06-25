<script lang="ts">
    // בורר מיקום שכונה: התושב לוחץ/גורר פין על המפה כדי לסמן את מיקום השכונה החדשה,
    // או מקליד קואורדינטות ידנית אם יש לו. lat/lng נחשפים ב-bind.
    import { onMount } from 'svelte';
    import { getCoordsFor } from '$lib/neighborhoodCoords';
    import 'leaflet/dist/leaflet.css';

    let {
        city = '',
        lat = $bindable<number | null>(null),
        lng = $bindable<number | null>(null),
    }: { city?: string; lat?: number | null; lng?: number | null } = $props();

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

    function setPin(latlng: { lat: number; lng: number }, recenter = false) {
        lat = +latlng.lat.toFixed(6);
        lng = +latlng.lng.toFixed(6);
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

    onMount(async () => {
        try {
            const mod = await import('leaflet');
            L = (mod as any).default ?? mod;
            ready = true;
        } catch (e) {
            console.error('[NeighborhoodPicker] Leaflet load failed:', e instanceof Error ? e.message : e);
        }
    });

    // אתחול המפה כשהיא מוכנה
    $effect(() => {
        if (!ready || !L || !mapEl || map) return;

        const center: [number, number] =
            lat != null && lng != null ? [lat, lng] : getCoordsFor(undefined, city);

        map = L.map(mapEl, {
            zoomControl: true,
            scrollWheelZoom: true,
            minZoom: 8,
            maxZoom: 19,
        }).setView(center, lat != null && lng != null ? 15 : 13);

        L.tileLayer(TILE_URL, { attribution: TILE_ATTR, maxZoom: 19 }).addTo(map);
        map.on('click', (e: any) => setPin(e.latlng));

        if (lat != null && lng != null) setPin({ lat, lng });

        setTimeout(() => map?.invalidateSize?.(), 50);
        setTimeout(() => map?.invalidateSize?.(), 300);

        return () => {
            try { map?.remove?.(); } catch {}
            map = null;
            marker = null;
        };
    });

    // מרכוז מחדש על העיר כשאין עדיין פין והעיר משתנה
    $effect(() => {
        const c = city; // תלות מפורשת
        if (!map || marker) return;
        map.setView(getCoordsFor(undefined, c), 13, { animate: true });
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

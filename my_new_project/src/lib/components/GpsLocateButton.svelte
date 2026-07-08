<script lang="ts">
    // כפתור "קח מיקום מה-GPS": בנייד זו הדרך המהירה לסמן מיקום מדויק בקריאת מצוקה -
    // בלחיצה אחת מבקשים הרשאת מיקום מהדפדפן, קולטים קואורדינטות, ומזקקים כתובת
    // קריאה בעברית (reverse geocoding) כדי למלא את השדות עבור התושב בלי בירוקרטיה.
    import { _ } from 'svelte-i18n';

    let {
        onLocated,
    }: {
        // נקרא כשהמיקום אותר בהצלחה. address = כתובת מ-reverse geocoding (best-effort, יכול להיות '')
        onLocated: (r: { lat: number; lng: number; address: string }) => void;
    } = $props();

    let status   = $state<'idle' | 'locating' | 'success' | 'error'>('idle');
    let errorMsg = $state('');

    async function reverseGeocode(lat: number, lng: number): Promise<string> {
        try {
            const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`);
            if (!res.ok) return '';
            const data = await res.json();
            return typeof data?.address === 'string' ? data.address : '';
        } catch {
            return '';
        }
    }

    function locate() {
        errorMsg = '';
        // דפדפן ללא תמיכה / הקשר לא-מאובטח (לא https) - אין גישה ל-GPS
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
            status = 'error';
            errorMsg = $_('listings.gps_unsupported');
            return;
        }
        status = 'locating';
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                const lat = +pos.coords.latitude.toFixed(6);
                const lng = +pos.coords.longitude.toFixed(6);
                const address = await reverseGeocode(lat, lng);
                status = 'success';
                onLocated({ lat, lng, address });
            },
            (err) => {
                status = 'error';
                if (err.code === err.PERMISSION_DENIED)      errorMsg = $_('listings.gps_denied');
                else if (err.code === err.TIMEOUT)           errorMsg = $_('listings.gps_timeout');
                else                                         errorMsg = $_('listings.gps_unavailable');
            },
            // דיוק גבוה (GPS ולא רק רשת), עד 12ש', מקבלים מיקום מטמון עד דקה
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
        );
    }
</script>

<div>
    <button
        type="button"
        onclick={locate}
        disabled={status === 'locating'}
        class="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-black text-sm transition-all
            {status === 'success'
                ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg hover:shadow-emerald-500/25 disabled:opacity-70 disabled:cursor-wait'}"
    >
        {#if status === 'locating'}
            <span class="gps-spin text-base leading-none">🛰️</span>
            {$_('listings.gps_locating')}
        {:else if status === 'success'}
            <span class="text-base leading-none">✅</span>
            {$_('listings.gps_success')}
        {:else}
            <span class="text-base leading-none">📍</span>
            {$_('listings.gps_use')}
        {/if}
    </button>

    {#if status === 'success'}
        <p class="mt-1.5 text-center text-xs text-emerald-400/90">{$_('listings.gps_success_hint')}</p>
    {:else if status === 'error'}
        <p class="mt-1.5 text-xs leading-relaxed text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            ⚠️ {errorMsg}
        </p>
    {:else}
        <p class="mt-1.5 text-center text-xs text-gray-500">{$_('listings.gps_hint')}</p>
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

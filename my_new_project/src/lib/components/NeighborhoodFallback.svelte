<script lang="ts">
    // ============================================================
    // מוצא ל"השכונה שלי לא ברשימה" - פאנל אחד לכל הטפסים באתר.
    // ------------------------------------------------------------
    // הבעיה שהוא פותר: תושב שנמצא במקום שאין לו שכונת מגורים ברשימה (אזור
    // תעשייה בראשון לציון, שכונה חדשה, יישוב שלא מופה) לא הצליח לפרסם בכלל -
    // הבורר הציע רשימה סגורה בלבד ולא היה שום מוצא.
    //
    // העיקרון: *לא חוסמים*. המשתמש כותב את שם האזור, מסמן פין (או לוחץ "המיקום
    // שלי"), וממשיך לפרסם באותו רגע. הפין נשמר עם הפריט ולכן הוא נוחת במקום
    // הנכון על המפה, והשם מוצג ברמת העיר עד שהמנהל מאשר את האזור כשכונה.
    // ============================================================
    import { get } from 'svelte/store';
    import { t, locale } from 'svelte-i18n';
    import NeighborhoodPicker from './NeighborhoodPicker.svelte';
    import { hasPreciseCoords } from '$lib/neighborhoodCoords';

    let {
        city = '',
        name = $bindable(''),
        lat = $bindable<number | null>(null),
        lng = $bindable<number | null>(null),
        onback,
    }: {
        /** העיר שבתוכה מסומן האזור - קובעת את מרכז המפה ונשלחת עם הבקשה */
        city?: string;
        /** שם האזור שהמשתמש הקליד (bind) */
        name?: string;
        /** הפין שסימן (bind) - מה שמאפשר לפריט לנחות נכון על המפה */
        lat?: number | null;
        lng?: number | null;
        /** חזרה לבורר השכונות הרגיל (מוצג רק כשההורה מספק אותו) */
        onback?: () => void;
    } = $props();

    // tFn ריאקטיבי - $t אסור ב-Svelte 5
    let _loc = $state(get(locale));
    $effect(() => locale.subscribe((l) => (_loc = l)));
    const tFn = (k: string, values?: Record<string, string | number>) => {
        void _loc;
        return get(t)(k, values ? { values } : undefined);
    };

    const placed = $derived(lat != null && lng != null);
    const ready  = $derived(!!name.trim() && placed);

    // ---- מרכז חלופי למפה ----
    // לעיר שאין לה קואורדינטה מובנית - geocoding, כדי שהמפה לא תיפתח על
    // ירושלים כברירת מחדל ותשלח את המשתמש לגרור חצי ארץ.
    let mapCenter = $state<[number, number] | null>(null);
    let lastGeocodedCity = '';
    $effect(() => {
        const c = city;
        if (!c || c === lastGeocodedCity) return;
        lastGeocodedCity = c;
        mapCenter = null;
        if (hasPreciseCoords(undefined, c)) return;
        (async () => {
            try {
                const res = await fetch(`/api/geocode?q=${encodeURIComponent(c)}`);
                if (!res.ok) return;
                const r = await res.json();
                // תוצאה מיושנת אם המשתמש כבר החליף עיר בינתיים
                if (c === city && typeof r?.lat === 'number' && typeof r?.lng === 'number') {
                    mapCenter = [r.lat, r.lng];
                }
            } catch { /* המפה תיפול לברירת המחדל */ }
        })();
    });

    // ---- אישור פין → ניסיון למלא את השם אוטומטית ----
    // רוב האנשים לא יודעים לנסח את שם האזור שלהם. אחרי שהם מסמנים על המפה,
    // reverse-geocoding נותן הצעה שהם רק צריכים לאשר או לתקן.
    async function handleConfirm(la: number, ln: number) {
        if (name.trim()) return;
        try {
            const res = await fetch(`/api/reverse-geocode?lat=${la}&lng=${ln}`);
            if (!res.ok) return;
            const j = await res.json();
            const nb = (j?.neighborhood ?? '').toString().trim();
            // ממלאים רק אם המשתמש עדיין לא הקליד בעצמו בינתיים
            if (nb && !name.trim()) name = nb;
        } catch { /* best effort - המשתמש יקליד בעצמו */ }
    }
</script>

<div class="rounded-2xl border border-yellow-500/30 bg-yellow-500/[0.06] p-3.5 md:p-4 space-y-3" dir="rtl">
    <div>
        <p class="text-yellow-300 font-bold text-sm">{tFn('components.nf_title')}</p>
        <p class="text-white/60 text-xs leading-relaxed mt-1">{tFn('components.nf_hint')}</p>
    </div>

    <!-- 1. שם האזור -->
    <div>
        <label for="nf-name" class="block text-xs text-gray-400 font-bold mb-1">
            {tFn('components.nf_name_label')}
        </label>
        <input
            id="nf-name"
            type="text"
            bind:value={name}
            placeholder={tFn('components.nf_name_placeholder')}
            class="w-full bg-[#070b14] border border-white/10 focus:border-yellow-500/60 rounded-xl
                   px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-white/25"
        />
    </div>

    <!-- 2. הפין - בלעדיו הפריט לא יידע לנחות במקום הנכון על המפה -->
    <div>
        <p class="text-yellow-300/90 text-xs font-bold mb-1">{tFn('components.nf_map_title')}</p>
        <p class="text-white/45 text-xs leading-relaxed mb-2">{tFn('components.nf_map_hint')}</p>
        <NeighborhoodPicker
            {city}
            fallbackCenter={mapCenter}
            onConfirm={handleConfirm}
            bind:lat
            bind:lng
        />
    </div>

    {#if ready}
        <p class="text-emerald-300 text-xs font-bold bg-emerald-900/20 border border-emerald-500/30 rounded-lg py-2 px-3">
            {tFn('components.nf_ready', { name: name.trim() })}
        </p>
    {/if}

    {#if onback}
        <button
            type="button"
            onclick={onback}
            class="text-xs text-white/50 hover:text-white/80 transition-colors underline underline-offset-2"
        >
            {tFn('components.nf_back')}
        </button>
    {/if}
</div>

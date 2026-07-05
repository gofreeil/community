<script lang="ts">
    // בורר רחוב + מספר בית: הרחובות נטענים מהרשימה הרשמית של העיר הנבחרת
    // (/api/streets) והמשתמש בוחר מתוכם במקום להקליד - כך אין עשרה איותים
    // שונים לאותו רחוב. הקלדה חופשית עדיין אפשרית (רחוב חדש/חסר ברשימה).
    let {
        city = '',
        value = '',
        placeholder = 'שם הרחוב',
        withHouseNumber = true,
        onValueChange,
    }: {
        city?: string;
        value?: string;
        placeholder?: string;
        /** false = שדה רחוב בלבד (כשמספר הבית הוא שדה נפרד בטופס המארח) */
        withHouseNumber?: boolean;
        onValueChange: (v: string) => void;
    } = $props();

    // פירוק ערך קיים (טיוטא/עריכה) של "רחוב מספר" לשני השדות
    const initialMatch = withHouseNumber
        ? (value ?? '').trim().match(/^(.*?)\s+(\d+[^\s]*)$/)
        : null;
    let street   = $state(initialMatch ? initialMatch[1] : (value ?? '').trim());
    let houseNum = $state(initialMatch ? initialMatch[2] : '');

    let streets       = $state<string[]>([]);
    let loading       = $state(false);
    let dropdownOpen  = $state(false);
    let loadedForCity = $state('');

    // דיווח הערך המשולב חזרה לטופס בכל שינוי
    function emit() {
        onValueChange([street.trim(), houseNum.trim()].filter(Boolean).join(' '));
    }

    // סנכרון פנימה כשהערך משתנה מבחוץ אחרי האתחול (שחזור טיוטא / מצב עריכה):
    // בלי זה הרכיב היה מציג שדה ריק למרות שהטופס כבר מחזיק כתובת.
    $effect(() => {
        const v = (value ?? '').trim();
        const combined = [street.trim(), houseNum.trim()].filter(Boolean).join(' ');
        if (v === combined) return;
        const m = withHouseNumber ? v.match(/^(.*?)\s+(\d+[^\s]*)$/) : null;
        street   = m ? m[1] : v;
        houseNum = m ? m[2] : '';
    });

    // טעינת רחובות בכל החלפת עיר (עם הגנה מתשובות ישנות שמגיעות באיחור)
    $effect(() => {
        const c = city?.trim();
        if (!c || c === loadedForCity) return;
        loadedForCity = c;
        loading = true;
        streets = [];
        fetch(`/api/streets?city=${encodeURIComponent(c)}`)
            .then((r) => r.json())
            .then((data) => {
                // עיר התחלפה שוב בזמן הטעינה - התשובה הזו כבר לא רלוונטית
                if (loadedForCity !== c) return;
                streets = Array.isArray(data?.streets) ? data.streets : [];
            })
            .catch(() => { /* אין רשימה - נשארים בהקלדה חופשית */ })
            .finally(() => { if (loadedForCity === c) loading = false; });
    });

    // התאמות לתפריט: קודם רחובות שמתחילים בטקסט שהוקלד, אחר כך שמכילים אותו
    const normalize = (s: string) => s.replace(/["'׳״`]/g, '').replace(/\s+/g, ' ').trim();
    const suggestions = $derived.by(() => {
        if (!streets.length) return [];
        const q = normalize(street);
        if (!q) return streets.slice(0, 80);
        const starts: string[] = [];
        const contains: string[] = [];
        for (const s of streets) {
            const ns = normalize(s);
            if (ns.startsWith(q)) starts.push(s);
            else if (ns.includes(q)) contains.push(s);
            if (starts.length >= 80) break;
        }
        return [...starts, ...contains].slice(0, 80);
    });
    const exactInList = $derived(streets.some((s) => normalize(s) === normalize(street)) && street.trim() !== '');

    function pickStreet(s: string) {
        street = s;
        dropdownOpen = false;
        emit();
    }

    function onStreetInput(e: Event) {
        street = (e.target as HTMLInputElement).value;
        dropdownOpen = true;
        emit();
    }

    function onStreetBlur() {
        // דיליי קטן - שלחיצה על אופציה בתפריט תספיק להיקלט לפני הסגירה
        setTimeout(() => (dropdownOpen = false), 150);
    }

    const inputClass = `w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 md:px-4 md:py-3
        text-white placeholder:text-gray-600 text-sm
        focus:outline-none focus:border-amber-500/60 focus:bg-amber-900/10
        transition-all`;
</script>

<div class="space-y-1.5">
    <div class="flex gap-2">
        <!-- שם הרחוב + תפריט השלמה -->
        <div class="relative flex-1 min-w-0">
            <input
                type="text"
                value={street}
                oninput={onStreetInput}
                onfocus={() => (dropdownOpen = true)}
                onblur={onStreetBlur}
                placeholder={loading ? 'טוען רחובות...' : placeholder}
                class={inputClass}
                autocomplete="off"
                dir="rtl"
            />
            {#if dropdownOpen && streets.length > 0}
                <div
                    class="absolute z-30 top-full right-0 left-0 mt-1 max-h-56 overflow-y-auto rounded-xl border border-white/20 bg-slate-900 shadow-2xl"
                    dir="rtl"
                >
                    {#if street.trim() && !exactInList}
                        <button
                            type="button"
                            onmousedown={(e) => e.preventDefault()}
                            onclick={() => pickStreet(street.trim())}
                            class="w-full text-right px-3 py-2 text-sm text-amber-300 hover:bg-white/10 transition-colors border-b border-white/10"
                        >
                            ➕ השתמש ברחוב "{street.trim()}" (לא ברשימה)
                        </button>
                    {/if}
                    {#each suggestions as s (s)}
                        <button
                            type="button"
                            onmousedown={(e) => e.preventDefault()}
                            onclick={() => pickStreet(s)}
                            class="w-full text-right px-3 py-2 text-sm text-gray-200 hover:bg-amber-500/15 transition-colors"
                        >
                            {s}
                        </button>
                    {:else}
                        <p class="px-3 py-2 text-xs text-gray-500">אין רחוב כזה ברשימה - אפשר להמשיך בהקלדה חופשית</p>
                    {/each}
                </div>
            {/if}
        </div>

        <!-- מספר בית -->
        {#if withHouseNumber}
            <input
                type="text"
                inputmode="numeric"
                value={houseNum}
                oninput={(e) => { houseNum = (e.target as HTMLInputElement).value; emit(); }}
                placeholder="מס'"
                class="{inputClass} !w-20 shrink-0 text-center"
                autocomplete="off"
            />
        {/if}
    </div>

    {#if street.trim()}
        {#if exactInList}
            <p class="text-emerald-400 text-xs">✓ רחוב מהרשימה הרשמית של {city}</p>
        {:else if streets.length > 0}
            <p class="text-amber-300/90 text-xs">✏️ רחוב בהקלדה חופשית - ודאו שהאיות נכון (או בחרו מהרשימה)</p>
        {/if}
    {:else if streets.length > 0}
        <p class="text-gray-400 text-xs">התחילו להקליד ובחרו רחוב מהרשימה של {city}</p>
    {/if}
</div>

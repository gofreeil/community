<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { heRank, normalizeHe } from '$lib/search';
    // בורר רחוב + מספר בית: הרחובות נטענים מהרשימה הרשמית של העיר הנבחרת
    // (/api/streets) והמשתמש בוחר מתוכם במקום להקליד - כך אין עשרה איותים
    // שונים לאותו רחוב. הקלדה חופשית עדיין אפשרית (רחוב חדש/חסר ברשימה).
    let {
        city = '',
        value = '',
        placeholder = '',
        withHouseNumber = true,
        onValueChange,
        onResolvedChange,
        onStreetListChange,
    }: {
        city?: string;
        value?: string;
        placeholder?: string;
        /** false = שדה רחוב בלבד (כשמספר הבית הוא שדה נפרד בטופס המארח) */
        withHouseNumber?: boolean;
        onValueChange: (v: string) => void;
        /**
         * מדווח האם הכתובת "נפתרה" - כלומר הרחוב נבחר מהרשימה הרשמית של העיר
         * (וכשהרכיב מנהל גם מספר בית - שהמספר מולא). הטופס המארח משתמש בזה כדי
         * להציע סימון על המפה רק כשהכתובת לא נפתרה (רחוב חסר / ללא מספר).
         */
        onResolvedChange?: (resolved: boolean) => void;
        /**
         * מדווח האם לעיר הנבחרת יש בכלל רשימת רחובות רשמית. כשאין (יישוב קטן כמו
         * כפר תפוח) - אי אפשר לאמת כתובת, והטופס המארח הופך את סימון המפה לחובה.
         */
        onStreetListChange?: (info: { hasList: boolean; loading: boolean }) => void;
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

    // התאמות לתפריט. המאגר הממשלתי שומר שמות בסדר "שם-משפחה שם-פרטי"
    // (למשל "ויטל חיים"), בעוד שגולשים מקלידים בסדר הטבעי ("חיים ויטל") ולעיתים
    // בכתיב שונה (ויטל/ויטאל). heRank מטפל בשני המקרים - התאמה לפי מילים בכל
    // סדר + שכבת כתיב רופף - ומדרג מהטובה להתאמה החלשה. ראו $lib/search.
    const suggestions = $derived(heRank(street, streets, (s) => s, 80));
    const exactInList = $derived(
        street.trim() !== '' && streets.some((s) => normalizeHe(s) === normalizeHe(street)),
    );

    // כתובת "נפתרה": רחוב מהרשימה הרשמית + (אם הרכיב מנהל מספר בית) מספר מולא.
    // כשאין רשימת רחובות לעיר כלל - אי אפשר לאמת, ולכן נחשב לא-פתור (→ מציעים מפה).
    const resolved = $derived(withHouseNumber ? (exactInList && houseNum.trim() !== '') : exactInList);
    $effect(() => { onResolvedChange?.(resolved); });

    // דיווח זמינות רשימת הרחובות לעיר (אחרי סיום הטעינה) - הטופס המארח מחליט לפי זה
    // אם להפוך את המפה לחובה.
    $effect(() => { onStreetListChange?.({ hasList: streets.length > 0, loading }); });

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
                placeholder={loading ? $_('components.sp_loading_streets') : (placeholder || $_('components.sp_street_name'))}
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
                            {$_('components.sp_use_street', { values: { street: street.trim() } })}
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
                        <p class="px-3 py-2 text-xs text-gray-500">{$_('components.sp_no_such_street')}</p>
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
                placeholder={$_('components.sp_house_num')}
                class="{inputClass} !w-20 shrink-0 text-center"
                autocomplete="off"
            />
        {/if}
    </div>

    {#if street.trim()}
        {#if exactInList}
            <p class="text-emerald-400 text-xs">{$_('components.sp_from_official_list', { values: { city } })}</p>
        {:else if streets.length > 0}
            <p class="text-amber-300/90 text-xs">{$_('components.sp_free_typing')}</p>
        {/if}
    {:else if streets.length > 0}
        <p class="text-gray-400 text-xs">{$_('components.sp_start_typing', { values: { city } })}</p>
    {/if}
</div>

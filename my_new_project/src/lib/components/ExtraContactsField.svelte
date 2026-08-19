<script lang="ts">
    // ============================================================
    // "אנשי קשר נוספים" - בלוק אחד לכל טפסי ההוספה באתר.
    // ------------------------------------------------------------
    // לכל פריט יש איש קשר ראשי (שם + טלפון) בשדות הרגילים של הטופס. הרכיב
    // הזה מוסיף מתחתיו כפתור "+" שפותח שורות נוספות - למשל גמ"ח שמנוהל
    // בשתי כתובות, טרמפ עם שני נהגים, או מסירה שאפשר לתאם עם בן/בת הזוג.
    //
    // הערך יוצא כמחרוזת JSON יחידה (bind:value), ובנוסף נכתב ל-hidden input
    // כשמקבלים `name` - כך אותו רכיב עובד גם בטפסים שמגישים FormData (use:enhance)
    // וגם בטפסים ששולחים JSON ל-/api/items.
    // ============================================================
    import { get } from 'svelte/store';
    import { t, locale } from 'svelte-i18n';
    import {
        MAX_EXTRA_CONTACTS,
        parseExtraContacts,
        serializeExtraContacts,
        type ExtraContact,
    } from '$lib/extraContacts';

    let {
        value = $bindable(''),
        name = '',
        idPrefix = 'extra-contact',
        compact = false,
    }: {
        /** מחרוזת JSON של הרשימה (bind) */
        value?: string;
        /** שם ה-hidden input - לטפסים שמגישים FormData. ריק = בלי hidden input */
        name?: string;
        /** קידומת ל-id של השדות, כדי שלא יתנגשו עם שדות אחרים בדף */
        idPrefix?: string;
        /** גרסה צרה יותר לטפסים צפופים */
        compact?: boolean;
    } = $props();

    // tFn ריאקטיבי - $t אסור ב-Svelte 5
    let _loc = $state(get(locale));
    $effect(() => locale.subscribe((l) => (_loc = l)));
    const tr = (key: string, fallback: string) => {
        void _loc;
        const out = get(t)(key);
        return !out || out === key ? fallback : out;
    };

    // מצב פנימי: מערך שורות. שורה ריקה חדשה נשמרת כאן אך לא בערך המוגש,
    // כדי שמשתמש שלחץ "+" ולא מילא כלום לא ייצור איש קשר ריק.
    let rows = $state<ExtraContact[]>(parseExtraContacts(value));

    // סנכרון מבחוץ (טעינת טיוטה / מצב עריכה) בלי לדרוס הקלדה באמצע
    $effect(() => {
        const incoming = serializeExtraContacts(parseExtraContacts(value));
        if (incoming !== serializeExtraContacts(rows)) {
            rows = parseExtraContacts(value);
        }
    });

    function commit() {
        value = serializeExtraContacts(rows);
    }

    function addRow() {
        if (rows.length >= MAX_EXTRA_CONTACTS) return;
        rows = [...rows, { name: '', phone: '' }];
    }

    function removeRow(index: number) {
        rows = rows.filter((_, i) => i !== index);
        commit();
    }

    const canAdd = $derived(rows.length < MAX_EXTRA_CONTACTS);
    const inputClass = $derived(`min-w-[7.5rem] flex-1 rounded-lg border border-white/15 bg-white/5 px-3 ${compact ? 'py-2' : 'py-2.5'}
        text-white placeholder:text-gray-600 text-sm
        focus:outline-none focus:border-amber-500/60 focus:bg-amber-900/10
        transition-all`);
</script>

{#if name}
    <input type="hidden" {name} value={serializeExtraContacts(rows)} />
{/if}

<div class="mt-2 space-y-2">
    {#each rows as row, i (i)}
        <div class="flex items-start gap-2">
            <!-- flex-wrap ולא grid: הבלוק יושב גם בשדה חצי-רוחב (מסעדות) ואז השורות נערמות במקום להצטמק -->
            <div class="flex-1 flex flex-wrap gap-2">
                <input
                    id="{idPrefix}-name-{i}"
                    type="text"
                    bind:value={rows[i].name}
                    oninput={commit}
                    maxlength="40"
                    placeholder={tr('listings.extra_contact_name_ph', 'שם איש הקשר')}
                    aria-label={tr('listings.extra_contact_name_ph', 'שם איש הקשר')}
                    class="{inputClass}"
                />
                <input
                    id="{idPrefix}-phone-{i}"
                    type="tel"
                    dir="ltr"
                    bind:value={rows[i].phone}
                    oninput={commit}
                    maxlength="40"
                    placeholder={tr('listings.ph_phone', '050-0000000')}
                    aria-label={tr('listings.extra_contact_phone_ph', 'טלפון של איש הקשר')}
                    class="{inputClass}"
                />
            </div>
            <button
                type="button"
                onclick={() => removeRow(i)}
                aria-label={tr('listings.extra_contact_remove', 'הסר איש קשר')}
                title={tr('listings.extra_contact_remove', 'הסר איש קשר')}
                class="shrink-0 rounded-lg border border-white/15 bg-white/5 hover:bg-red-500/20 hover:border-red-500/40
                    text-gray-400 hover:text-red-200 {compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} transition-all"
            >
                ✕
            </button>
        </div>
    {/each}

    {#if canAdd}
        <button
            type="button"
            onclick={addRow}
            class="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-400/40 hover:border-amber-400/70
                bg-amber-500/5 hover:bg-amber-500/10 text-amber-200 text-xs md:text-sm font-bold px-3 py-1.5 transition-all"
        >
            <span class="text-base leading-none">+</span>
            {rows.length
                ? tr('listings.extra_contact_add_more', 'הוסף עוד איש קשר')
                : tr('listings.extra_contact_add', 'הוסף איש קשר נוסף')}
        </button>
    {/if}
</div>

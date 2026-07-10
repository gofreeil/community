<script lang="ts">
    // בורר "סמל השירות" לקטגוריית שירות ציבורי.
    // ברירת המחדל: הסמל שהותאם אוטומטית לפי שם השירות מוצג מכווץ, עם כפתור
    // "שנה סמל". רק בלחיצה נפתח תפריט הסמלים המלא (מחפש + רשת מקובצת).
    // אם עדיין אין סמל - התפריט נפתח מעצמו כדי להזמין בחירה.
    import { SERVICE_GROUPS, serviceLogoDataUri, getServiceType } from '$lib/serviceTypes';
    import { heMatches } from '$lib/search';

    let {
        value = '',
        auto = false,
        onSelect,
    }: {
        value?: string;
        /** true = הסמל הנוכחי הותאם אוטומטית מהשם (מוצג תג "אוטומטי") */
        auto?: boolean;
        onSelect: (id: string) => void;
    } = $props();

    const selected = $derived(getServiceType(value));
    // פתוח אוטומטית כשאין בחירה עדיין; אחרת מכווץ עד שהמשתמש לוחץ "שנה"
    let expanded = $state(false);
    let query = $state('');

    const groups = $derived.by(() => {
        const q = query.trim();
        if (!q) return SERVICE_GROUPS;
        return SERVICE_GROUPS
            .map(g => ({
                group: g.group,
                items: g.items.filter(it => heMatches(q, it.label, g.group, ...(it.aliases ?? []))),
            }))
            .filter(g => g.items.length > 0);
    });

    const noResults = $derived(groups.length === 0);

    function pick(id: string) {
        onSelect(id);
        expanded = false;
        query = '';
    }
</script>

<div class="stp">
    <!-- מצב מכווץ: הסמל הנבחר + כפתור שינוי -->
    {#if selected && !expanded}
        <div class="stp-current">
            <img src={serviceLogoDataUri(selected.id)} alt="" class="stp-current-icon" />
            <div class="stp-current-text">
                <span class="stp-current-label">
                    {selected.label}
                    {#if auto}<span class="stp-auto">✨ הותאם אוטומטית</span>{/if}
                </span>
                <span class="stp-current-hint">כך יופיע השירות על המפה</span>
            </div>
            <button type="button" class="stp-change" onclick={() => (expanded = true)}>שנה סמל</button>
        </div>
    {:else}
        <!-- מצב פתוח: חיפוש + רשת בחירה -->
        {#if selected}
            <button type="button" class="stp-collapse" onclick={() => { expanded = false; query = ''; }}>
                ✕ סגור בלי לשנות (נשאר: {selected.label})
            </button>
        {/if}
        <input
            type="text"
            bind:value={query}
            placeholder="חיפוש סוג שירות (עירייה, דואר, בנק, מקווה...)"
            class="stp-search"
            dir="rtl"
        />
        <div class="stp-scroll">
            {#if noResults}
                <p class="stp-empty">לא נמצא סוג שירות מתאים. נסו מילה אחרת, או בחרו "בנק אחר" / "עירייה".</p>
            {/if}
            {#each groups as g (g.group)}
                <div class="stp-group">
                    <div class="stp-group-title">{g.group}</div>
                    <div class="stp-grid">
                        {#each g.items as it (it.id)}
                            <button
                                type="button"
                                class="stp-item {value === it.id ? 'stp-item--on' : ''}"
                                style="--sc:{it.color}"
                                onclick={() => pick(it.id)}
                                title={it.label}
                            >
                                <img src={serviceLogoDataUri(it.id)} alt="" class="stp-item-icon" loading="lazy" />
                                <span class="stp-item-label">{it.label}</span>
                            </button>
                        {/each}
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .stp { display: flex; flex-direction: column; gap: 10px; }

    /* --- מצב מכווץ --- */
    .stp-current {
        display: flex; align-items: center; gap: 12px;
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.04);
        border-radius: 14px; padding: 10px 12px;
    }
    .stp-current-icon { width: 46px; height: 46px; border-radius: 9999px; flex-shrink: 0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
    .stp-current-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
    .stp-current-label { font-weight: 800; color: #fff; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .stp-auto { font-size: 0.65rem; font-weight: 700; color: #a5b4fc; background: rgba(129,140,248,0.15);
        border: 1px solid rgba(129,140,248,0.35); border-radius: 9999px; padding: 1px 8px; }
    .stp-current-hint { font-size: 0.7rem; color: rgba(255,255,255,0.5); }
    .stp-change {
        flex-shrink: 0; font-size: 0.78rem; font-weight: 800; color: #fff;
        background: rgba(129,140,248,0.25); border: 1px solid rgba(129,140,248,0.5);
        border-radius: 10px; padding: 7px 12px; cursor: pointer; transition: background 0.12s ease;
    }
    .stp-change:hover { background: rgba(129,140,248,0.4); }

    /* --- מצב פתוח --- */
    .stp-collapse {
        align-self: flex-start; font-size: 0.75rem; font-weight: 700; color: rgba(255,255,255,0.7);
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12);
        border-radius: 9999px; padding: 5px 12px; cursor: pointer; transition: color 0.12s ease;
    }
    .stp-collapse:hover { color: #fff; }

    .stp-search {
        width: 100%; border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(255,255,255,0.05);
        color: #fff; padding: 10px 14px; font-size: 0.9rem; font-weight: 600;
    }
    .stp-search::placeholder { color: rgba(255,255,255,0.4); font-weight: 500; }
    .stp-search:focus { outline: none; border-color: rgba(129,140,248,0.7); background: rgba(255,255,255,0.08); }

    .stp-scroll { max-height: 340px; overflow-y: auto; padding-left: 2px; display: flex; flex-direction: column; gap: 14px; }
    .stp-empty { color: rgba(255,255,255,0.6); font-size: 0.85rem; text-align: center; padding: 16px 8px; }

    .stp-group-title {
        font-size: 0.72rem; font-weight: 800; letter-spacing: 0.02em;
        color: rgba(255,255,255,0.5); margin-bottom: 6px; padding-right: 2px;
    }
    .stp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }

    .stp-item {
        display: flex; flex-direction: column; align-items: center; gap: 6px;
        border: 1.5px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.03);
        border-radius: 14px; padding: 10px 6px 8px; cursor: pointer;
        transition: transform 0.12s ease, border-color 0.12s ease, background 0.12s ease;
        text-align: center;
    }
    .stp-item:hover { transform: translateY(-2px); border-color: var(--sc); background: rgba(255,255,255,0.07); }
    .stp-item--on {
        border-color: var(--sc);
        background: color-mix(in srgb, var(--sc) 18%, transparent);
        box-shadow: 0 0 0 1.5px var(--sc) inset;
    }
    .stp-item-icon { width: 40px; height: 40px; border-radius: 9999px; box-shadow: 0 2px 5px rgba(0,0,0,0.35); }
    .stp-item-label {
        font-size: 0.7rem; font-weight: 700; color: rgba(255,255,255,0.85);
        line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .stp-item--on .stp-item-label { color: #fff; }
</style>

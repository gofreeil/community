<script lang="ts">
    // בורר "סוג השירות" לקטגוריית שירות ציבורי. המשתמש בוחר עירייה / דואר /
    // בנק / מקווה וכו', והסמל המתאים (data URI) יוצג על המפה. הבחירה נשמרת
    // ב-formValues.service_type בטופס ההוספה.
    import { SERVICE_GROUPS, serviceLogoDataUri, getServiceType } from '$lib/serviceTypes';
    import { heMatches } from '$lib/search';

    let {
        value = '',
        onSelect,
    }: {
        value?: string;
        onSelect: (id: string) => void;
    } = $props();

    let query = $state('');

    const selected = $derived(getServiceType(value));

    // קבוצות מסוננות לפי החיפוש (שם השירות + כינויים + שם הקבוצה)
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
</script>

<div class="stp">
    <!-- תצוגת הבחירה הנוכחית -->
    {#if selected}
        <div class="stp-selected">
            <img src={serviceLogoDataUri(selected.id)} alt="" class="stp-selected-icon" />
            <div class="stp-selected-text">
                <span class="stp-selected-label">{selected.label}</span>
                <span class="stp-selected-hint">כך יופיע השירות על המפה · אפשר לשנות בכל רגע</span>
            </div>
        </div>
    {/if}

    <!-- חיפוש -->
    <input
        type="text"
        bind:value={query}
        placeholder="חיפוש סוג שירות (עירייה, דואר, בנק, מקווה...)"
        class="stp-search"
        dir="rtl"
    />

    <!-- רשת הבחירה, מקובצת לפי נושא -->
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
                            onclick={() => onSelect(it.id)}
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
</div>

<style>
    .stp { display: flex; flex-direction: column; gap: 10px; }

    .stp-selected {
        display: flex; align-items: center; gap: 12px;
        border: 1px solid var(--sc, rgba(255,255,255,0.15));
        background: rgba(255,255,255,0.04);
        border-radius: 14px; padding: 10px 12px;
    }
    .stp-selected-icon { width: 46px; height: 46px; border-radius: 9999px; flex-shrink: 0;
        box-shadow: 0 2px 6px rgba(0,0,0,0.4); }
    .stp-selected-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .stp-selected-label { font-weight: 800; color: #fff; font-size: 0.95rem; }
    .stp-selected-hint { font-size: 0.7rem; color: rgba(255,255,255,0.55); }

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
        line-height: 1.15; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .stp-item--on .stp-item-label { color: #fff; }
</style>

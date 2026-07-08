<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { getReviews, addReview, getRatingSummary, type Review } from '$lib/restaurantReviews';

    interface Props {
        open: boolean;
        itemId: string;
        itemLabel: string;
        onclose: () => void;
    }
    let { open, itemId, itemLabel, onclose }: Props = $props();

    let reviews = $state<Review[]>([]);
    let summary = $state({ avg: 0, count: 0 });

    // טופס ביקורת חדשה
    let formRating = $state(0);
    let hoverRating = $state(0);
    let formAuthor = $state('');
    let formText = $state('');
    let formError = $state('');
    let justAdded = $state(false);

    // טען מחדש כשנפתח / משתנה מסעדה
    $effect(() => {
        if (open && itemId) {
            reviews = getReviews(itemId);
            summary = getRatingSummary(itemId);
            formRating = 0;
            hoverRating = 0;
            formAuthor = '';
            formText = '';
            formError = '';
            justAdded = false;
        }
    });

    // התפלגות כוכבים (5→1)
    let distribution = $derived.by(() => {
        const d = [0, 0, 0, 0, 0];
        for (const r of reviews) d[5 - r.rating]++;
        return d;
    });

    function submitReview() {
        formError = '';
        if (formRating < 1) { formError = $_('components.rr_choose_rating'); return; }
        if (!formText.trim()) { formError = $_('components.rr_write_experience'); return; }
        reviews = addReview(itemId, formAuthor, formRating, formText);
        summary = getRatingSummary(itemId);
        formRating = 0;
        formAuthor = '';
        formText = '';
        justAdded = true;
    }

    function fmtDate(iso: string): string {
        try { return new Date(iso).toLocaleDateString('he-IL'); }
        catch { return ''; }
    }
</script>

{#if open}
<div
    class="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4"
    role="button"
    tabindex="-1"
    onclick={onclose}
    onkeydown={(e) => e.key === 'Escape' && onclose()}
>
    <div
        class="bg-[#0f172a] w-full md:max-w-lg md:rounded-3xl rounded-t-3xl border border-orange-500/30 shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        onclick={(e) => e.stopPropagation()}
        onkeydown={(e) => e.stopPropagation()}
        dir="rtl"
    >
        <!-- כותרת -->
        <div class="sticky top-0 bg-gradient-to-l from-orange-600 to-amber-600 px-5 py-4 flex items-center justify-between">
            <div class="min-w-0">
                <h2 class="text-white font-black text-lg truncate">{$_('components.rr_ratings_reviews')}</h2>
                <p class="text-white/80 text-xs truncate">{itemLabel}</p>
            </div>
            <button
                type="button"
                onclick={onclose}
                aria-label={$_('components.close')}
                class="text-white/90 hover:text-white text-2xl leading-none w-9 h-9 rounded-full hover:bg-white/15 transition-colors cursor-pointer flex-shrink-0"
            >×</button>
        </div>

        <div class="p-5">
            <!-- סיכום דירוג -->
            <div class="flex items-center gap-5 mb-5">
                <div class="text-center flex-shrink-0">
                    <div class="text-4xl font-black text-orange-400">{summary.avg || '-'}</div>
                    <div class="text-yellow-400 text-sm">
                        {#each [1,2,3,4,5] as s}
                            <span>{s <= Math.round(summary.avg) ? '★' : '☆'}</span>
                        {/each}
                    </div>
                    <div class="text-gray-500 text-xs mt-1">{$_('components.rr_reviews_count', { values: { n: summary.count } })}</div>
                </div>
                <div class="flex-1 space-y-1">
                    {#each [5,4,3,2,1] as star, i}
                        <div class="flex items-center gap-2">
                            <span class="text-gray-400 text-xs w-3">{star}</span>
                            <span class="text-yellow-400 text-xs">★</span>
                            <div class="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div
                                    class="h-full bg-gradient-to-l from-orange-500 to-amber-400 rounded-full"
                                    style="width: {reviews.length ? (distribution[i] / reviews.length) * 100 : 0}%"
                                ></div>
                            </div>
                            <span class="text-gray-500 text-xs w-5 text-left">{distribution[i]}</span>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- טופס ביקורת חדשה -->
            <div class="bg-black/30 border border-white/10 rounded-2xl p-4 mb-5">
                <h3 class="text-white font-bold text-sm mb-3">{$_('components.rr_rate_restaurant')}</h3>
                {#if justAdded}
                    <p class="text-green-400 text-sm font-bold mb-3">{$_('components.rr_thanks_added')}</p>
                {/if}
                <div class="flex items-center gap-1 mb-3" role="radiogroup" aria-label={$_('components.rr_rating_aria')}>
                    {#each [1,2,3,4,5] as s}
                        <button
                            type="button"
                            aria-label={$_('components.rr_stars_aria', { values: { n: s } })}
                            onclick={() => formRating = s}
                            onmouseenter={() => hoverRating = s}
                            onmouseleave={() => hoverRating = 0}
                            class="text-3xl leading-none transition-transform hover:scale-110 cursor-pointer
                                   {s <= (hoverRating || formRating) ? 'text-yellow-400' : 'text-gray-600'}"
                        >★</button>
                    {/each}
                </div>
                <input
                    bind:value={formAuthor}
                    placeholder={$_('components.rr_name_placeholder')}
                    class="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-orange-500"
                />
                <textarea
                    bind:value={formText}
                    placeholder={$_('components.rr_text_placeholder')}
                    rows="3"
                    class="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-orange-500"
                ></textarea>
                {#if formError}
                    <p class="text-red-400 text-xs font-bold mt-2">{formError}</p>
                {/if}
                <button
                    type="button"
                    onclick={submitReview}
                    class="w-full mt-3 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                    {$_('components.rr_publish')}
                </button>
            </div>

            <!-- רשימת ביקורות -->
            <h3 class="text-white font-bold text-sm mb-3">{$_('components.rr_reviews_count', { values: { n: reviews.length } })}</h3>
            <div class="space-y-3">
                {#each reviews as r (r.id)}
                    <div class="bg-black/20 border border-white/5 rounded-xl p-3">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-white font-bold text-sm">
                                {r.author}
                                {#if r.fromUser}
                                    <span class="text-orange-400 text-[10px] font-bold mr-1">{$_('components.rr_your_review')}</span>
                                {/if}
                            </span>
                            <span class="text-gray-600 text-xs">{fmtDate(r.date)}</span>
                        </div>
                        <div class="text-yellow-400 text-sm mb-1">
                            {#each [1,2,3,4,5] as s}<span>{s <= r.rating ? '★' : '☆'}</span>{/each}
                        </div>
                        <p class="text-gray-300 text-sm leading-relaxed">{r.text}</p>
                    </div>
                {/each}
            </div>
        </div>
    </div>
</div>
{/if}

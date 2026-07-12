<script lang="ts">
    import { get } from 'svelte/store';
    import { t, locale } from 'svelte-i18n';
    import { invalidateAll } from '$app/navigation';
    import LevelUpCard from './LevelUpCard.svelte';
    import { userTier, TIER_META, type Tier, type TierUserFields } from '$lib/tiers';

    // באנר סטטוס דרגה לדף הפרופיל: מראה למשתמש איפה הוא ומה נפתח בדרגה הבאה,
    // עם השלמה במקום (LevelUpCard נפתח מתחת). ריכוז מקור-האמת ב-$lib/tiers.
    let { user }: { user: TierUserFields } = $props();

    let _loc = $state(get(locale));
    $effect(() => locale.subscribe((l) => (_loc = l)));
    const tFn = (k: string, values?: Record<string, string | number>) => {
        void _loc;
        return get(t)(`tiers.${k}`, values ? { values } : undefined);
    };

    const tier = $derived(userTier(user));
    const nextTier = $derived<Tier | null>(tier < 3 ? ((tier + 1) as Tier) : null);
    let expanded = $state(false);

    const benefit = $derived(nextTier === 3 ? tFn('banner_benefit_3') : tFn('banner_benefit_2'));
</script>

<div class="rounded-2xl border border-white/10 bg-[#0f172a] overflow-hidden mb-4" dir="rtl">
    <div class="flex items-center gap-3 p-4">
        <span class="text-2xl flex-shrink-0">{TIER_META[tier].emoji}</span>
        <div class="flex-1 min-w-0">
            <p class="text-white font-bold text-sm">{tFn('banner_you_are', { name: tFn(TIER_META[tier].nameKey) })}</p>
            {#if nextTier}
                <p class="text-white/50 text-xs">{tFn('banner_next_unlock', { tier: nextTier, benefit })}</p>
            {:else}
                <p class="text-green-400/80 text-xs">{tFn('banner_complete')}</p>
            {/if}
        </div>
        {#if nextTier}
            <button type="button" onclick={() => (expanded = !expanded)}
                class="flex-shrink-0 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-semibold hover:opacity-90 transition">
                {expanded ? '✕' : tFn('banner_upgrade_btn')}
            </button>
        {/if}
    </div>

    {#if expanded && nextTier}
        <div class="px-4 pb-4">
            <LevelUpCard
                {user}
                target={nextTier}
                reason={nextTier === 3 ? tFn('reason_singles') : tFn('reason_publish')}
                onDone={() => { expanded = false; invalidateAll(); }}
            />
        </div>
    {/if}
</div>

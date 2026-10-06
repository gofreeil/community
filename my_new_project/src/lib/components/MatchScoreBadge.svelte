<script lang="ts">
    // עיגול ציון ההתאמה (1-100). הצבע לפי רמת ההתאמה; ציון חלקי (חסר שאלון) מקווקו.
    let { score, partial = false, size = 'md' }: { score: number; partial?: boolean; size?: 'sm' | 'md' | 'lg' } = $props();

    const tone = $derived(
        score >= 72 ? 'text-emerald-300 border-emerald-400/70 bg-emerald-500/10'
        : score >= 58 ? 'text-cyan-300 border-cyan-400/70 bg-cyan-500/10'
        : score >= 45 ? 'text-amber-300 border-amber-400/70 bg-amber-500/10'
        : 'text-gray-300 border-white/30 bg-white/5',
    );
    const dims = $derived(size === 'lg' ? 'w-20 h-20 text-3xl' : size === 'sm' ? 'w-10 h-10 text-sm' : 'w-14 h-14 text-xl');
</script>

<span class="inline-flex items-center justify-center rounded-full border-2 font-black leading-none {dims} {tone} {partial ? 'border-dashed' : ''}"
    title={partial ? 'ציון חלקי - חסר שאלון' : 'ציון התאמה מ-1 עד 100'}>{score}</span>

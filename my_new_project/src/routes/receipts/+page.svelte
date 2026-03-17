<script lang="ts">
	import type { PageData } from './$types';
	let { data }: { data: PageData } = $props();
</script>

<div class="min-h-screen bg-[#080f1e] text-white px-4 py-8 max-w-2xl mx-auto" dir="rtl">

	<!-- כפתור חזרה -->
	<a href="/profile" class="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm font-bold mb-6 transition-colors group">
		<svg class="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
			<polyline points="9 18 15 12 9 6"/>
		</svg>
		חזרה לפרופיל
	</a>

	<!-- כרטיס יתרה -->
	<div class="relative rounded-3xl overflow-hidden mb-8 shadow-2xl"
		style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%);">
		<div class="absolute inset-0 opacity-20"
			style="background: radial-gradient(ellipse at 70% 30%, #7c3aed 0%, transparent 60%);">
		</div>
		<div class="relative p-8 flex flex-col gap-1">
			<span class="text-purple-300 text-sm font-bold">היתרה הנוכחית שלי</span>
			<span class="text-5xl font-black text-white mt-1">{data.balance}<span class="text-2xl text-purple-300 mr-1">₪</span></span>
			<span class="text-purple-400/70 text-xs mt-2">{data.user?.name ?? ''}</span>
		</div>
		<!-- עיטור -->
		<div class="absolute -bottom-6 -left-6 w-32 h-32 rounded-full bg-white/5 blur-xl"></div>
		<div class="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-purple-500/10 blur-lg"></div>
	</div>

	<!-- כותרת רשימה -->
	<h2 class="text-lg font-black text-white mb-4 flex items-center gap-2">
		<span class="w-5 h-5 rounded-full bg-purple-600 text-white text-xs font-black flex items-center justify-center">₪</span>
		פירוט תקבולים
	</h2>

	<!-- רשימת תקבולים -->
	{#if data.receipts.length === 0}
		<div class="text-center py-16 text-gray-500">
			<span class="text-5xl block mb-4">📭</span>
			<p class="text-sm">אין תקבולים להצגה</p>
		</div>
	{:else}
		<div class="flex flex-col gap-3">
			{#each data.receipts as r}
				<div class="bg-[#0f172a] rounded-2xl border border-white/10 px-5 py-4 flex items-center justify-between transition-all hover:border-purple-500/30">
					<div class="flex flex-col gap-0.5">
						<span class="text-white font-bold text-sm">{r.description}</span>
						<span class="text-gray-500 text-xs">{new Date(r.date).toLocaleDateString('he-IL')}</span>
					</div>
					<span class="font-black text-base tabular-nums {r.type === 'in' ? 'text-emerald-400' : 'text-red-400'}">
						{r.type === 'in' ? '+' : ''}{r.amount}₪
					</span>
				</div>
			{/each}
		</div>
	{/if}

</div>

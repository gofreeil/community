<script lang="ts">
	// בורר שכונה עם חיפוש בהקלדה - גרסה משותפת של הבורר מדף הפרופיל, לכל
	// הטפסים באתר. רשימות ארוכות (ירושלים ~140 שכונות) מקבלות שדה חיפוש דביק
	// עם התאמה סלחנית (heRank: סדר מילים, כתיב מלא/חסר, קרית↔קריית) + נפילה
	// להסרת קידומת "שכונת" ("שכונת פת" → "פת"), ואימוץ אוטומטי של שם שהוקלד
	// במלואו כשיוצאים מהשדה בלי לבחור מהרשימה.
	import { get } from 'svelte/store';
	import { t, locale } from 'svelte-i18n';
	import { heRank, normalizeHe, loosenHe } from '$lib/search';

	interface Props {
		neighborhoods: string[];
		value?: string;
		id?: string;
		name?: string;
		disabled?: boolean;
		placeholder?: string;
		/** עקיפת עיצוב כפתור הטריגר - כדי להתאים לשדות הטופס המארח */
		buttonClass?: string;
		/** פריט פעולה בתחתית הרשימה (למשל "השכונה שלי לא ברשימה") */
		extraOptionLabel?: string;
		onpick?: (n: string) => void;
		onextra?: () => void;
	}

	let {
		neighborhoods,
		value = $bindable(''),
		id,
		name,
		disabled = false,
		placeholder,
		buttonClass = '',
		extraOptionLabel,
		onpick,
		onextra,
	}: Props = $props();

	let open = $state(false);
	let query = $state('');

	// tFn: תרגום reactive - $t אסור ב-Svelte 5
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe((l) => (_loc = l)));
	const tFn = (k: string) => { void _loc; return get(t)(k); };

	// שדה החיפוש מוצג רק כשהרשימה ארוכה מספיק כדי להצדיק אותו
	const searchable = $derived(neighborhoods.length > 10);

	const filtered = $derived.by(() => {
		const q = query.trim();
		if (!q) return neighborhoods;
		const ranked = heRank(q, neighborhoods, (n) => n, 200);
		if (ranked.length > 0) return ranked;
		const stripped = q.replace(/^שכונת\s+/, '');
		return stripped !== q ? heRank(stripped, neighborhoods, (n) => n, 200) : [];
	});

	function pick(n: string) {
		value = n;
		open = false;
		query = '';
		onpick?.(n);
	}

	// הוקלד שם שכונה מלא בלי בחירה מהרשימה? נאמץ אותו אוטומטית ביציאה -
	// מדויק, או בכתיב רופף כשיש התאמה יחידה. בכוונה לא רץ תוך כדי הקלדה:
	// "רמות" היא גם שכונה שלמה וגם תחילת "רמות אלון".
	function resolveTyped() {
		const q = normalizeHe(query.replace(/^שכונת\s+/, ''));
		if (!q) return;
		const exact = neighborhoods.find((n) => normalizeHe(n) === q);
		if (exact) {
			pick(exact);
			return;
		}
		const loose = neighborhoods.filter((n) => loosenHe(normalizeHe(n)) === loosenHe(q));
		if (loose.length === 1) pick(loose[0]);
	}

	// פוקוס אוטומטי לשדה החיפוש כשהרשימה נפתחת. רק בדסקטופ - בנייד פוקוס
	// מקפיץ מקלדת שמסתירה את רוב הרשימה למי שרק רוצה לגלול ולבחור
	function focusOnMount(node: HTMLElement) {
		try {
			if (window.matchMedia('(pointer: fine)').matches) setTimeout(() => node.focus(), 0);
		} catch { /* noop */ }
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative"
	onfocusout={(e) => {
		// סוגר רק כשהפוקוס עוזב את כל האזור - מעבר לשדה החיפוש הפנימי לא סוגר
		const next = e.relatedTarget as Node | null;
		if (!next || !e.currentTarget.contains(next)) {
			resolveTyped();
			setTimeout(() => (open = false), 150);
		}
	}}
>
	{#if name}
		<input type="hidden" {name} {value} />
	{/if}
	<button
		{id}
		type="button"
		{disabled}
		onclick={() => { open = !open; query = ''; }}
		class={buttonClass ||
			'w-full text-right bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl ' +
			'px-4 py-3 text-sm transition-colors outline-none flex items-center justify-between gap-2 ' +
			'disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ' +
			(value ? 'text-white' : 'text-white/40')}
	>
		<span>{value || placeholder || tFn('choose_neighborhood')}</span>
		<span class="opacity-50 text-xs">▾</span>
	</button>
	{#if open}
		<ul
			class="absolute z-50 right-0 left-0 mt-1 max-h-64 overflow-y-auto rounded-xl
			       bg-[#0f172a] border border-purple-500/30 shadow-2xl"
			role="listbox"
		>
			{#if searchable}
				<li role="presentation" class="sticky top-0 bg-[#0f172a] p-2 border-b border-white/10">
					<input
						type="text"
						use:focusOnMount
						bind:value={query}
						placeholder={tFn('profile.nb_search_placeholder')}
						onkeydown={(e) => {
							if (e.key === 'Enter') {
								e.preventDefault();
								if (filtered.length > 0) pick(filtered[0]);
							} else if (e.key === 'Escape') {
								open = false;
							}
						}}
						class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-lg
						       px-3 py-2 text-sm text-white placeholder-white/30 outline-none transition-colors"
					/>
				</li>
			{/if}
			{#if searchable && query.trim() && filtered.length === 0}
				<li role="presentation" class="px-4 py-2 text-sm text-white/40">
					{tFn('profile.nb_search_no_results')}
				</li>
			{/if}
			{#each filtered as n}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
				<li
					role="option"
					aria-selected={n === value}
					onmousedown={() => pick(n)}
					class="px-4 py-2 text-sm text-white cursor-pointer transition-colors
					       hover:bg-white/5 {n === value ? 'font-bold text-purple-300' : ''}"
				>
					{n}
				</li>
			{/each}
			{#if extraOptionLabel}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
				<li
					role="option"
					aria-selected={false}
					onmousedown={() => { open = false; query = ''; onextra?.(); }}
					class="px-4 py-2.5 text-sm text-yellow-300 cursor-pointer transition-colors
					       hover:bg-yellow-500/10 border-t border-white/10 font-bold"
				>
					{extraOptionLabel}
				</li>
			{/if}
		</ul>
	{/if}
</div>

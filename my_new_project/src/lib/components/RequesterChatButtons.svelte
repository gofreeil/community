<script lang="ts">
	// שני מסלולי תקשורת עם המבקש (סעיף ב):
	//  1) צ'אט פנימי - נפתח ב-/admin/users/[id] (שרשור דו-כיווני שנשמר באתר),
	//     עם טקסט פתיחה מוכן (?draft=) לגבי הבקשה הספציפית.
	//  2) וואטסאפ - קישור wa.me עם הודעת פתיחה מוכנה.
	// כל כפתור מוצג רק אם יש את פרטי הקשר המתאימים (user_id / טלפון).
	let {
		userId = '',
		phone = '',
		waText = '',
		internalDraft = '',
	}: {
		userId?: string;
		phone?: string;
		waText?: string;
		internalDraft?: string;
	} = $props();

	const internalHref = $derived(
		userId
			? `/admin/users/${userId}${internalDraft ? `?draft=${encodeURIComponent(internalDraft)}` : ''}#chat`
			: '',
	);

	const waHref = $derived.by(() => {
		if (!phone) return '';
		const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
		return `https://wa.me/${digits}${waText ? `?text=${encodeURIComponent(waText)}` : ''}`;
	});
</script>

<div class="flex gap-2 flex-wrap items-center">
	{#if internalHref}
		<a
			href={internalHref}
			class="px-3 py-1.5 text-sm rounded-lg bg-purple-500/15 text-purple-200 border border-purple-500/40 hover:bg-purple-500/25 transition-all font-bold whitespace-nowrap"
			title="פתח צ'אט פנימי עם המבקש - הודעה שתופיע אצלו בתיבת ההודעות באתר"
		>
			💬 צ'אט פנימי
		</a>
	{/if}

	{#if waHref}
		<a
			href={waHref}
			target="_blank"
			rel="noopener noreferrer"
			class="px-3 py-1.5 text-sm rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/25 transition-all font-bold whitespace-nowrap"
			title="פתח צ'אט וואטסאפ עם המבקש על הבקשה הזו"
		>
			🟢 וואטסאפ
		</a>
	{/if}

	{#if !internalHref && !waHref}
		<span class="text-xs text-gray-500">אין פרטי קשר ליצירת קשר עם המבקש</span>
	{/if}
</div>

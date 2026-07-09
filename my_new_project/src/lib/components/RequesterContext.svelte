<script lang="ts">
	// פאנל הקשר על מבקש בקשה (סעיף א): מי הוא, מהיכן הוא רשום, מה הוא כתב.
	// נבנה מהמידע שכבר קיים על המשתמש/הבקשה - בלי שינוי בבאקאנד.
	let {
		userId = '',
		name = null,
		phone = '',
		email = null,
		city = '',
		neighborhood = '',
		business = '',
		wrote = '',
		sourceLabel = '',
	}: {
		userId?: string;
		name?: string | null;
		phone?: string;
		email?: string | null;
		city?: string | null;
		neighborhood?: string | null;
		business?: string | null;
		wrote?: string | null;
		sourceLabel?: string | null;
	} = $props();

	// מקום המגורים הרשום בפרופיל המבקש - כדי שהאדמין יבין לאיזה אזור הבקשה שייכת
	// (שכונת "מרכז" = ברירת מחדל כשאין שכונה, לכן מציגים רק את העיר במקרה זה)
	const residence = $derived.by(() => {
		const n = (neighborhood ?? '').trim();
		const c = (city ?? '').trim();
		if (c && n && n !== 'מרכז') return `${c} · ${n}`;
		return c || (n && n !== 'מרכז' ? n : '');
	});
</script>

<div class="rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm space-y-1">
	<!-- מי המבקש + היכן הוא רשום -->
	<div class="flex items-center gap-1.5 flex-wrap text-gray-300">
		<span class="font-bold">👤 {name || 'תושב ללא שם'}</span>
		<span class="text-gray-600">·</span>
		{#if residence}
			<span title="מקום המגורים הרשום בפרופיל המבקש">🏠 {residence}</span>
		{:else}
			<span class="text-gray-500">🏠 לא מילא מקום מגורים</span>
		{/if}
	</div>

	<!-- דרכי יצירת קשר -->
	{#if phone || email || business}
		<div class="flex items-center gap-x-3 gap-y-0.5 flex-wrap text-gray-400 text-[13px]">
			{#if phone}<a href="tel:{phone}" dir="ltr" class="underline hover:text-white">📞 {phone}</a>{/if}
			{#if email}<a href="mailto:{email}" class="underline hover:text-white truncate max-w-[220px]">✉️ {email}</a>{/if}
			{#if business}<span>💼 {business}</span>{/if}
		</div>
	{/if}

	<!-- מהיכן הגיעה הבקשה -->
	{#if sourceLabel}
		<div class="text-gray-500 text-[13px]" title="מהיכן הגיעה הבקשה">🌐 {sourceLabel}</div>
	{/if}

	<!-- מה שהמבקש כתב (כשזה טקסט חופשי ולא סתם שם) -->
	{#if wrote}
		<div class="text-gray-300 text-[13px] bg-white/[0.03] rounded-lg px-2 py-1 border border-white/5">
			📝 <span class="text-gray-500">מה שנכתב:</span> "{wrote}"
		</div>
	{/if}

	<!-- קישור לכרטיס המשתמש המלא (פרופיל + כל היסטוריית הצ'אט) -->
	{#if userId}
		<a
			href="/admin/users/{userId}"
			class="inline-block text-[12px] text-blue-300/80 hover:text-blue-200 underline mt-0.5"
		>
			🔗 לכרטיס המשתמש המלא (פרופיל + היסטוריית צ'אט)
		</a>
	{/if}
</div>

<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';

	let { data, form } = $props();

	const u = $derived(data.profileUser);

	// === צ'אט פנימי ===
	let chatText = $state('');
	let sending = $state(false);
	let scrollBox = $state<HTMLDivElement | null>(null);

	async function scrollToBottom() {
		await tick();
		if (scrollBox) scrollBox.scrollTop = scrollBox.scrollHeight;
	}

	// גלילה לתחתית עם טעינת/עדכון השרשור
	$effect(() => {
		if (data.thread) scrollToBottom();
	});

	function fmtChatTime(iso: string): string {
		if (!iso) return '';
		try {
			return new Date(iso).toLocaleString('he-IL', {
				day: 'numeric', month: 'numeric',
				hour: '2-digit', minute: '2-digit',
			});
		} catch {
			return '';
		}
	}

	function roleBadge(role: string) {
		switch (role) {
			case 'super_admin': return { text: 'מנהל ראשי', color: 'bg-white/15 text-white border-white/30 font-black' };
			case 'neighborhood_admin': return { text: 'אדמין שכונתי', color: 'bg-white/5 text-gray-200 border-white/20' };
			default: return { text: 'משתמש', color: 'bg-white/5 text-gray-400 border-white/10' };
		}
	}

	function fmtDate(d: string | null | undefined): string {
		if (!d) return '';
		try {
			return new Date(d).toLocaleDateString('he-IL', { year: 'numeric', month: 'long', day: 'numeric' });
		} catch {
			return d;
		}
	}

	function genderLabel(g: string): string {
		if (g === 'male' || g === 'זכר') return 'זכר';
		if (g === 'female' || g === 'נקבה') return 'נקבה';
		return g || '';
	}

	// שדות הפרופיל להצגה - רק מה שיש בו ערך
	const fields = $derived([
		{ label: 'אימייל', value: u.email, icon: '✉️' },
		{ label: 'טלפון', value: u.phone, icon: '📞' },
		{ label: 'כינוי', value: u.nickname, icon: '🏷️' },
		{ label: 'עיר', value: u.city, icon: '🏙️' },
		{ label: 'שכונה', value: u.neighborhood, icon: '📍' },
		{ label: 'עסק', value: u.business, icon: '🏪' },
		{ label: 'מגדר', value: genderLabel(u.gender), icon: '👤' },
		{ label: 'מצב משפחתי', value: u.family_status, icon: '💍' },
		{ label: 'תאריך לידה', value: fmtDate(u.birth_date), icon: '🎂' },
		{ label: 'ספק התחברות', value: u.provider, icon: '🔑' },
		{ label: 'הצטרף בתאריך', value: fmtDate(u.created_at), icon: '📅' },
	].filter(f => f.value));
</script>

<svelte:head>
	<title>פרופיל {u.name ?? 'משתמש'} · ניהול</title>
</svelte:head>

<div dir="rtl" class="min-h-screen bg-[#070b14] text-white px-4 py-6 md:py-8">
	<div class="max-w-3xl mx-auto">
		<!-- ניווט חזרה -->
		<a href="/admin" class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-6">
			<span>→</span> חזרה לניהול המשתמשים
		</a>

		<!-- כרטיס ראשי -->
		<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 mb-6">
			<div class="flex flex-col sm:flex-row sm:items-center gap-5">
				{#if u.avatar_url}
					<img src={u.avatar_url} alt="" class="w-24 h-24 rounded-full object-cover ring-2 ring-purple-500/40 flex-shrink-0" />
				{:else}
					<div class="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-3xl font-black flex-shrink-0">
						{(u.name ?? '?')[0]}
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<div class="flex items-center gap-3 flex-wrap">
						<h1 class="text-2xl md:text-3xl font-black truncate">{u.name ?? 'ללא שם'}</h1>
						{#if u.banned}
							<span class="text-sm bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1 rounded-full font-bold">חסום</span>
						{/if}
					</div>
					<div class="flex items-center gap-2 flex-wrap mt-2">
						<span class="text-sm font-bold border px-3 py-1 rounded-full {roleBadge(u.role).color}">
							{roleBadge(u.role).text}
						</span>
						{#if u.coordinator_of?.length > 0}
							<span class="text-sm font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full">
								🏘️ רכז · {u.coordinator_of.join(', ')}
							</span>
						{/if}
					</div>
					<p class="text-xs text-gray-500 mt-3 break-all">מזהה: {u.id}</p>
				</div>
			</div>
		</div>

		<!-- פרטי פרופיל -->
		<div class="bg-[#0f172a] rounded-2xl border border-white/10 p-4 mb-6">
			<h2 class="text-lg font-black text-purple-300 mb-3">פרטי פרופיל</h2>
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2.5">
				{#each fields as f}
					<div class="flex items-start gap-2">
						<span class="text-xl flex-shrink-0 leading-tight">{f.icon}</span>
						<div class="min-w-0">
							<div class="text-xs text-gray-500 leading-tight">{f.label}</div>
							<div class="text-base font-bold break-words leading-tight">{f.value}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- צ'אט בסגנון וואטסאפ/טלגרם -->
		<div class="rounded-2xl border border-white/10 overflow-hidden mb-6 shadow-lg">
			<!-- סרגל עליון: בן-שיח -->
			<div class="flex items-center gap-3 px-4 py-2.5 bg-[#0f172a] border-b border-black/30">
				{#if u.avatar_url}
					<img src={u.avatar_url} alt="" class="w-9 h-9 rounded-full object-cover flex-shrink-0" />
				{:else}
					<div class="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-sm font-black flex-shrink-0">
						{(u.name ?? '?')[0]}
					</div>
				{/if}
				<div class="min-w-0">
					<div class="font-bold text-sm leading-tight truncate">{u.name ?? 'משתמש'}</div>
					<div class="text-[11px] text-gray-500 leading-tight">הודעה אישית</div>
				</div>
			</div>

			<!-- אזור ההודעות -->
			<div
				bind:this={scrollBox}
				class="h-80 overflow-y-auto px-3 py-4 space-y-1.5 bg-[#0b141a]"
			>
				{#if data.thread.length === 0}
					<div class="h-full flex items-center justify-center">
						<p class="text-xs text-gray-500 bg-black/30 rounded-full px-4 py-1.5">אין עדיין הודעות — כתוב למטה כדי להתחיל</p>
					</div>
				{:else}
					{#each data.thread as msg (msg.id)}
						<div class="flex {msg.direction === 'out' ? 'justify-end' : 'justify-start'}">
							<div
								class="relative max-w-[78%] px-3 py-1.5 text-sm shadow-md {msg.direction === 'out'
									? 'bg-[#7c3aed] text-white rounded-2xl rounded-tl-md'
									: 'bg-[#202c33] text-gray-100 rounded-2xl rounded-tr-md'}"
							>
								{#if msg.sender_name}
									<p class="text-[11px] font-bold text-amber-200 leading-tight mb-0.5">{msg.sender_name}</p>
								{/if}
								{#if msg.title}
									<p class="font-bold leading-snug">{msg.title}</p>
								{/if}
								<p class="whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
								<div class="flex items-center justify-end gap-1 mt-0.5 {msg.direction === 'out' ? 'text-purple-200/70' : 'text-gray-400/70'}">
									<span class="text-[10px]">{fmtChatTime(msg.created_at)}</span>
									{#if msg.direction === 'out'}
										<svg viewBox="0 0 18 18" class="w-3.5 h-3.5" fill="currentColor"><path d="M5.6 12.4 2 8.8l1-1 2.6 2.6L11.5 4.5l1 1zm4 0L6 8.8l1-1 2.6 2.6L15.5 4.5l1 1z"/></svg>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- שגיאה -->
			{#if form?.chatError}
				<p class="text-sm text-red-400 px-4 py-1.5 bg-[#0f172a]">{form.chatError}</p>
			{/if}

			<!-- סרגל הקלדה -->
			<form
				method="POST"
				action="?/sendMessage"
				use:enhance={() => {
					sending = true;
					return async ({ result, update }) => {
						sending = false;
						if (result.type === 'success') {
							chatText = '';
							await update();        // טוען מחדש את השרשור מהשרת
							scrollToBottom();
						} else {
							await update({ reset: false });
						}
					};
				}}
				class="flex items-end gap-2 px-3 py-2.5 bg-[#0f172a] border-t border-black/30"
			>
				<textarea
					name="text"
					bind:value={chatText}
					rows="1"
					placeholder="הקלד הודעה..."
					class="flex-1 resize-none max-h-28 bg-[#202c33] rounded-3xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/40"
					onkeydown={(e) => {
						if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
							e.preventDefault();
							(e.currentTarget.form as HTMLFormElement)?.requestSubmit();
						}
					}}
				></textarea>
				<button
					type="submit"
					disabled={sending || !chatText.trim()}
					aria-label="שלח"
					class="flex-shrink-0 w-11 h-11 rounded-full bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
				>
					{#if sending}
						<span class="text-lg leading-none">⋯</span>
					{:else}
						<svg viewBox="0 0 24 24" class="w-5 h-5" fill="currentColor" style="transform: scaleX(-1)"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>
					{/if}
				</button>
			</form>
		</div>

		<!-- פרסומים של המשתמש -->
		<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8">
			<div class="flex items-center gap-2 mb-4">
				<h2 class="text-lg font-black text-purple-300">פרסומים</h2>
				<span class="text-xs font-bold bg-white/10 text-gray-300 border border-white/20 px-2 py-0.5 rounded-full">
					{data.items.length}
				</span>
			</div>

			{#if data.items.length === 0}
				<p class="text-sm text-gray-500 text-center py-6">למשתמש אין פרסומים</p>
			{:else}
				<div class="space-y-3">
					{#each data.items as item (item.id)}
						<a
							href="/items/{item.id}"
							class="block bg-[#070b14] rounded-2xl border border-white/10 p-4 hover:border-white/25 transition-all"
						>
							<div class="flex items-center gap-3">
								<span class="text-2xl flex-shrink-0">{item.icon || '📦'}</span>
								<div class="min-w-0 flex-1">
									<div class="text-base font-bold truncate">{item.label}</div>
									<div class="text-sm text-gray-400 truncate">{item.description}</div>
								</div>
								<div class="text-xs text-gray-500 flex-shrink-0 text-left">
									<div>{item.category}</div>
									<div>{item.view_count ?? 0} צפיות</div>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

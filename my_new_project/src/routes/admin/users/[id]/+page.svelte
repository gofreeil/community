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
		<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 mb-6">
			<h2 class="text-lg font-black text-purple-300 mb-4">פרטי פרופיל</h2>
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
				{#each fields as f}
					<div class="flex items-start gap-3">
						<span class="text-xl flex-shrink-0">{f.icon}</span>
						<div class="min-w-0">
							<div class="text-xs text-gray-500">{f.label}</div>
							<div class="text-base font-bold break-words">{f.value}</div>
						</div>
					</div>
				{/each}
			</div>
		</div>

		<!-- צ'אט פנימי - הודעות אישיות למשתמש -->
		<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 mb-6">
			<div class="flex items-center gap-2 mb-4">
				<h2 class="text-lg font-black text-purple-300">💬 צ'אט פנימי</h2>
				<span class="text-xs text-gray-500">— שלח הודעה אישית ל{u.name ?? 'משתמש'}</span>
			</div>

			<!-- היסטוריית שיחה -->
			<div
				bind:this={scrollBox}
				class="space-y-2 max-h-80 overflow-y-auto mb-4 pe-1"
			>
				{#if data.thread.length === 0}
					<p class="text-sm text-gray-500 text-center py-8">אין עדיין הודעות. שלח הודעה ראשונה ↓</p>
				{:else}
					{#each data.thread as msg (msg.id)}
						<div class="flex {msg.direction === 'out' ? 'justify-end' : 'justify-start'}">
							<div
								class="max-w-[80%] rounded-2xl px-4 py-2 {msg.direction === 'out'
									? 'bg-purple-600 text-white rounded-bl-sm'
									: 'bg-white/10 text-gray-100 rounded-br-sm'}"
							>
								<p class="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.text}</p>
								<p class="text-[10px] mt-1 {msg.direction === 'out' ? 'text-purple-200/80' : 'text-gray-500'} text-left">
									{fmtChatTime(msg.created_at)}
								</p>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<!-- שגיאה / הצלחה -->
			{#if form?.chatError}
				<p class="text-sm text-red-400 mb-2">{form.chatError}</p>
			{/if}

			<!-- שליחת הודעה -->
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
				class="flex items-end gap-2"
			>
				<textarea
					name="text"
					bind:value={chatText}
					rows="2"
					placeholder="כתוב הודעה אישית..."
					class="flex-1 resize-none bg-[#070b14] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-purple-500/50 focus:outline-none"
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
					class="flex-shrink-0 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-2xl transition-colors text-sm"
				>
					{sending ? '...' : 'שלח'}
				</button>
			</form>
			<p class="text-[11px] text-gray-600 mt-2">ההודעה תופיע בתיבת ההודעות האישית של המשתמש. Ctrl+Enter לשליחה מהירה.</p>
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
									<div>👁️ {item.view_count ?? 0}</div>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>

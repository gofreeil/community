<script lang="ts">
	import { enhance } from '$app/forms';
	import { signOut } from '@auth/sveltekit/client';
	import type { CityEntry } from '$lib/neighborhoodsData';

	let { data } = $props();

	let isEditing  = $state(false);
	let saveSuccess = $state(false);

	// ערכי טופס — data.user הוא server-loaded (לא משתנה ריאקטיבית), ולכן בטוח לאתחל כך
	/* eslint-disable svelte/valid-compile */
	let name         = $state(data.user?.name         ?? '');
	let phone        = $state(data.user?.phone        ?? '');
	let city         = $state(data.user?.city         ?? '');
	let neighborhood = $state(data.user?.neighborhood ?? '');

	// שכונות זמינות לפי עיר נבחרת
	let availableNeighborhoods = $derived(
		(data.citiesData as CityEntry[]).find((c) => c.city === city)?.neighborhoods ?? []
	);

	// אות ראשונה לאווטר
	let avatarLetter = $derived(
		(data.user?.name ?? data.user?.email ?? 'U').charAt(0).toUpperCase()
	);
</script>

<svelte:head>
	<title>הפרופיל שלי | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8" dir="rtl">

	<!-- ===== Header Card ===== -->
	<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 mb-6 shadow-xl">
		<div class="flex items-center gap-5">

			<!-- אווטר -->
			<div class="relative flex-shrink-0">
				{#if data.user?.avatar_url}
					<img
						src={data.user.avatar_url}
						alt={data.user.name ?? 'משתמש'}
						class="w-20 h-20 rounded-full border-4 border-purple-500/40 shadow-xl object-cover"
					/>
				{:else}
					<div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-purple-700
					            flex items-center justify-center border-4 border-purple-500/40 shadow-xl">
						<span class="text-3xl font-black text-white">{avatarLetter}</span>
					</div>
				{/if}
				<!-- ספק (Google/Facebook badge) -->
				<span class="absolute -bottom-1 -left-1 text-lg leading-none">
					{data.user?.provider === 'google' ? '🔵' : data.user?.provider === 'facebook' ? '🟦' : '👤'}
				</span>
			</div>

			<div class="min-w-0 flex-1">
				<h1 class="text-2xl font-black text-white truncate">
					{data.user?.name ?? 'משתמש'}
				</h1>
				{#if data.user?.email}
					<p class="text-gray-400 text-sm mt-0.5">{data.user.email}</p>
				{/if}
				{#if data.user?.neighborhood || data.user?.city}
					<p class="text-purple-400 text-sm mt-1">
						📍 {[data.user?.neighborhood, data.user?.city].filter(Boolean).join(', ')}
					</p>
				{/if}
				<!-- מספר פרסומות -->
				<div class="flex gap-3 mt-2">
					<span class="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full font-bold">
						{data.items.length} פרסומות
					</span>
				</div>
			</div>

			<!-- כפתור ניתוק -->
			<button
				onclick={() => signOut({ redirectTo: '/' })}
				class="flex-shrink-0 text-xs text-gray-500 hover:text-red-400 transition-colors border border-white/10
				       hover:border-red-500/30 px-3 py-2 rounded-xl cursor-pointer"
			>
				התנתקות
			</button>
		</div>
	</div>

	<!-- ===== פרטים אישיים ===== -->
	<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 mb-6 shadow-xl">

		<div class="flex items-center justify-between mb-6">
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span class="w-1.5 h-7 bg-purple-500 rounded-full inline-block"></span>
				פרטים אישיים
			</h2>
			<button
				onclick={() => { isEditing = !isEditing; saveSuccess = false; }}
				class="text-sm font-bold px-4 py-2 rounded-xl transition-all cursor-pointer
				       {isEditing
				         ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
				         : 'bg-purple-600/30 text-purple-300 hover:bg-purple-600/50 border border-purple-500/30'}"
			>
				{isEditing ? 'ביטול' : '✏️ עריכה'}
			</button>
		</div>

		{#if saveSuccess}
			<div class="mb-5 rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3 text-center">
				<p class="text-green-400 text-sm font-bold">✅ הפרופיל עודכן בהצלחה!</p>
			</div>
		{/if}

		<form
			method="POST"
			action="?/updateProfile"
			use:enhance={() => {
				return async ({ result, update }) => {
					await update();
					if (result.type === 'success') {
						isEditing = false;
						saveSuccess = true;
						setTimeout(() => (saveSuccess = false), 4000);
					}
				};
			}}
		>
			<div class="grid grid-cols-1 md:grid-cols-2 gap-5">

				<!-- שם מלא -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">שם מלא</label>
					{#if isEditing}
						<input
							name="name"
							type="text"
							bind:value={name}
							placeholder="השם המלא שלך"
							class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none focus:bg-white/8"
						/>
					{:else}
						<p class="text-white font-medium py-3 px-1">{data.user?.name || '—'}</p>
					{/if}
				</div>

				<!-- טלפון -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">טלפון</label>
					{#if isEditing}
						<input
							name="phone"
							type="tel"
							bind:value={phone}
							placeholder="050-0000000"
							class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none"
						/>
					{:else}
						<p class="text-white font-medium py-3 px-1">{data.user?.phone || '—'}</p>
					{/if}
				</div>

				<!-- עיר -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">עיר</label>
					{#if isEditing}
						<select
							name="city"
							bind:value={city}
							onchange={() => (neighborhood = '')}
							class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none appearance-none"
						>
							<option value="">בחר עיר</option>
							{#each (data.citiesData as CityEntry[]) as c}
								<option value={c.city}>{c.city}</option>
							{/each}
						</select>
					{:else}
						<p class="text-white font-medium py-3 px-1">{data.user?.city || '—'}</p>
					{/if}
				</div>

				<!-- שכונה -->
				<div>
					<label class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">שכונה</label>
					{#if isEditing}
						<select
							name="neighborhood"
							bind:value={neighborhood}
							disabled={!city}
							class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none appearance-none
							       disabled:opacity-40 disabled:cursor-not-allowed"
						>
							<option value="">בחר שכונה</option>
							{#each availableNeighborhoods as n}
								<option value={n}>{n}</option>
							{/each}
						</select>
					{:else}
						<p class="text-white font-medium py-3 px-1">{data.user?.neighborhood || '—'}</p>
					{/if}
				</div>

			</div>

			{#if isEditing}
				<div class="mt-6">
					<button
						type="submit"
						class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
						       text-white font-bold px-7 py-3 rounded-xl shadow-lg transition-all hover:-translate-y-0.5
						       cursor-pointer"
					>
						שמור שינויים
					</button>
				</div>
			{/if}
		</form>
	</div>

	<!-- ===== הפרסומות שלי ===== -->
	<div class="bg-[#0f172a] rounded-3xl border border-white/10 p-6 md:p-8 shadow-xl">

		<h2 class="text-xl font-black text-white flex items-center gap-2 mb-6">
			<span class="w-1.5 h-7 bg-blue-500 rounded-full inline-block"></span>
			הפרסומות שלי
			{#if data.items.length > 0}
				<span class="text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">
					{data.items.length}
				</span>
			{/if}
		</h2>

		{#if data.items.length === 0}
			<!-- ריק -->
			<div class="text-center py-12">
				<span class="text-6xl block mb-4">📭</span>
				<p class="text-gray-400 mb-6 text-sm">עדיין לא פרסמת שום פריט בקהילה</p>
				<a
					href="/"
					class="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
					       text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
				>
					פרסם פריט ראשון
				</a>
			</div>
		{:else}
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				{#each data.items as item}
					<a
						href="/items/{item.id}"
						class="bg-white/5 rounded-2xl border border-white/10 p-4
						       hover:border-purple-500/30 hover:bg-white/8 transition-all group block"
					>
						<div class="flex items-start gap-3">
							<span class="text-3xl flex-shrink-0 mt-0.5">{item.icon ?? '📋'}</span>
							<div class="min-w-0 flex-1">
								<div class="flex items-center gap-2 flex-wrap mb-1">
									<h3 class="text-white font-bold text-sm truncate group-hover:text-purple-300 transition-colors">
										{item.label}
									</h3>
									<!-- Status badge -->
									<span class="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0
									  {item.status === 'active'
									    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
									    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}">
										{item.status === 'active' ? '● פעיל' : item.status}
									</span>
								</div>
								{#if item.description}
									<p class="text-gray-400 text-xs line-clamp-2">{item.description}</p>
								{/if}
								<div class="flex items-center gap-3 mt-1.5">
									{#if item.neighborhood}
										<span class="text-purple-400/70 text-xs">📍 {item.neighborhood}</span>
									{/if}
									<span class="text-gray-600 text-xs">
										{new Date(item.created_at).toLocaleDateString('he-IL')}
									</span>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		{/if}
	</div>

</div>

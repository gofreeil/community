<script lang="ts">
	import { ads } from '$lib/adsData';

	interface Props {
		currentUser?: { username: string; avatar_url?: string | null };
	}
	let { currentUser }: Props = $props();

	let open = $state(false);

	// ---- Swipe gestures ----
	let touchStartX = 0;
	let touchStartY = 0;

	function onTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		touchStartY = e.touches[0].clientY;
	}

	// על הדרואר: משיכה שמאלה → סגור
	function onDrawerTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		if (dx < -50 && Math.abs(dx) > Math.abs(dy)) {
			open = false;
		}
	}

	// על הלשונית: משיכה ימינה → פתח
	function onTabTouchEnd(e: TouchEvent) {
		const dx = e.changedTouches[0].clientX - touchStartX;
		const dy = e.changedTouches[0].clientY - touchStartY;
		if (dx > 30 && Math.abs(dx) > Math.abs(dy)) {
			open = true;
		}
	}
</script>

<!-- מוצג רק בנייד -->
<div class="lg:hidden" dir="rtl">

	<!-- Overlay כהה כשפתוח -->
	{#if open}
	<button
		class="overlay"
		onclick={() => open = false}
		aria-label="סגור פרסומות"
	></button>
	{/if}

	<!-- Drawer -->
	<div class="drawer" class:drawer-open={open} aria-hidden={!open}
		ontouchstart={onTouchStart}
		ontouchend={onDrawerTouchEnd}
	>
		<!-- כותרת Drawer -->
		<div class="drawer-header">
			<span class="drawer-title">🌟 לאזור האישי והטבות</span>
			<button class="close-btn" onclick={() => open = false} aria-label="סגור">✕</button>
		</div>

		<!-- כפתור התחברות / אזור אישי -->
		<div class="auth-section">
			{#if currentUser}
			<a href="/profile" class="profile-btn" onclick={() => open = false}>
				{#if currentUser.avatar_url}
				<img src={currentUser.avatar_url} alt="avatar" class="profile-avatar" />
				{:else}
				<span class="profile-avatar-placeholder">👤</span>
				{/if}
				<div class="profile-btn-text">
					<span class="profile-btn-name">{currentUser.username}</span>
					<span class="profile-btn-sub">לאזור האישי שלי ←</span>
				</div>
			</a>
			{:else}
			<a href="/login?redirect=/profile" class="login-btn" onclick={() => open = false}>
				<div class="anon-avatar-wrap">
					<span class="anon-avatar">
						<svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" width="40" height="40">
							<circle cx="20" cy="20" r="20" fill="#374151"/>
							<circle cx="20" cy="16" r="7" fill="#6b7280"/>
							<ellipse cx="20" cy="34" rx="12" ry="8" fill="#6b7280"/>
						</svg>
					</span>
					<span class="login-icon">🔐</span>
				</div>
				<div class="login-btn-text">
					<span class="login-btn-title">התחברות / הרשמה</span>
					<span class="login-btn-sub">לאזור האישי שלך ←</span>
				</div>
			</a>
			{/if}
		</div>

		<!-- רשימת פרסומות -->
		<div class="ads-list">
			{#each ads as ad (ad.id)}
			<a
				href={ad.href}
				target="_blank"
				rel="noopener noreferrer"
				class="ad-card"
				onclick={() => open = false}
			>
				<div class="ad-img-wrap">
					<img src={ad.image} alt={ad.title} class="ad-img" loading="lazy" />
				</div>
				<div class="ad-body">
					<p class="ad-title">{ad.title}</p>
					<p class="ad-desc">{ad.description}</p>
					<span class="ad-cta">← {ad.cta}</span>
				</div>
			</a>
			{/each}

			<!-- מקום פרסום ריק -->
			<a href="/advertise" class="ad-card ad-empty" onclick={() => open = false}>
				<div class="ad-empty-inner">
					<span class="ad-empty-icon">📌</span>
					<p class="ad-empty-text">מקום פרסום</p>
					<p class="ad-empty-sub">לחץ לפרסם כאן</p>
				</div>
			</a>
		</div>
	</div>

	<!-- לשונית קטנה בצד שמאל (נראית כשה-Drawer סגור) -->
	{#if !open}
	<button
		class="tab"
		onclick={() => open = true}
		ontouchstart={onTouchStart}
		ontouchend={onTabTouchEnd}
		aria-label="פתח הטבות לקהילה"
	>
		<span class="tab-text">לאזור האישי והטבות</span>
	</button>
	{/if}

</div>

<style>
	/* ---- Overlay ---- */
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.55);
		z-index: 1100;
		cursor: pointer;
		border: none;
		padding: 0;
	}

	/* ---- Drawer ---- */
	.drawer {
		position: fixed;
		top: 0;
		left: 0;
		height: 100dvh;
		width: min(340px, 92vw);
		background: linear-gradient(180deg, #0a0f1e 0%, #070b14 100%);
		border-left: none;
		border-right: 1px solid rgba(99, 102, 241, 0.2);
		z-index: 1200;
		display: flex;
		flex-direction: column;
		transform: translateX(-100%);
		transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
		box-shadow: 8px 0 32px rgba(0, 0, 0, 0.5);
	}

	.drawer-open {
		transform: translateX(0);
	}

	/* ---- כותרת ---- */
	.drawer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		border-bottom: 1px solid rgba(99, 102, 241, 0.15);
		flex-shrink: 0;
	}

	.drawer-title {
		font-size: 1rem;
		font-weight: 700;
		color: #e0e7ff;
	}

	.close-btn {
		background: rgba(255,255,255,0.08);
		border: 1px solid rgba(255,255,255,0.12);
		color: #9ca3af;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		font-size: 0.8rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: background 0.2s;
	}

	.close-btn:hover { background: rgba(255,255,255,0.15); }

	/* ---- כפתור auth ---- */
	.auth-section {
		padding: 0.75rem;
		border-bottom: 1px solid rgba(99,102,241,0.15);
		flex-shrink: 0;
	}

	.profile-btn, .login-btn {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.75rem 1rem;
		border-radius: 0.75rem;
		text-decoration: none;
		transition: background 0.2s;
	}

	.profile-btn {
		background: rgba(99,102,241,0.12);
		border: 1px solid rgba(99,102,241,0.3);
	}
	.profile-btn:hover { background: rgba(99,102,241,0.22); }

	.login-btn {
		background: rgba(250,204,21,0.1);
		border: 1px solid rgba(250,204,21,0.3);
	}
	.login-btn:hover { background: rgba(250,204,21,0.18); }

	.profile-avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		object-fit: cover;
		flex-shrink: 0;
		border: 2px solid rgba(99,102,241,0.5);
	}

	.profile-avatar-placeholder {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: rgba(99,102,241,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.2rem;
		flex-shrink: 0;
	}

	.anon-avatar-wrap {
		position: relative;
		flex-shrink: 0;
		display: flex;
		align-items: center;
	}

	.anon-avatar {
		border-radius: 50%;
		overflow: hidden;
		display: flex;
	}

	.login-icon {
		font-size: 0.9rem;
		position: absolute;
		bottom: -2px;
		left: -4px;
	}

	.profile-btn-text, .login-btn-text {
		display: flex;
		flex-direction: column;
		text-align: right;
		flex: 1;
	}

	.profile-btn-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #e0e7ff;
	}

	.profile-btn-sub, .login-btn-sub {
		font-size: 0.7rem;
		color: #94a3b8;
	}

	.login-btn-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: #fde047;
	}

	/* ---- רשימת פרסומות ---- */
	.ads-list {
		overflow-y: auto;
		-webkit-overflow-scrolling: touch;
		flex: 1;
		min-height: 0;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(99,102,241,0.3) transparent;
	}

	/* ---- כרטיס פרסומת ---- */
	.ad-card {
		display: flex;
		gap: 0.75rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(99,102,241,0.15);
		border-radius: 0.75rem;
		text-decoration: none;
		transition: background 0.2s, border-color 0.2s, transform 0.15s;
		padding: 0.75rem;
		align-items: center;
		min-height: 96px;
	}

	.ad-card:hover {
		background: rgba(99,102,241,0.12);
		border-color: rgba(99,102,241,0.35);
		transform: scale(1.01);
	}

	.ad-img-wrap {
		position: relative;
		width: 72px;
		height: 72px;
		border-radius: 0.5rem;
		overflow: hidden;
		flex-shrink: 0;
	}

	.ad-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

.ad-body {
		flex: 1;
		min-width: 0;
	}

	.ad-title {
		font-size: 0.9rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0 0 0.2rem;
		line-height: 1.3;
		white-space: normal;
		word-break: break-word;
	}

	.ad-desc {
		font-size: 0.75rem;
		color: #94a3b8;
		margin: 0 0 0.3rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		line-height: 1.4;
	}

	.ad-cta {
		display: inline-block;
		font-size: 0.7rem;
		color: #a5b4fc;
		font-weight: 600;
		background: rgba(99,102,241,0.12);
		border-radius: 4px;
		padding: 0.15rem 0.45rem;
	}

	/* ---- כרטיס ריק ---- */
	.ad-empty {
		justify-content: center;
		border-style: dashed;
		border-color: rgba(99,102,241,0.3);
		background: transparent;
	}

	.ad-empty-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.2rem;
		padding: 0.5rem;
	}

	.ad-empty-icon { font-size: 1.3rem; }
	.ad-empty-text { font-size: 0.75rem; font-weight: 600; color: #6366f1; margin: 0; }
	.ad-empty-sub  { font-size: 0.65rem; color: #64748b; margin: 0; }

	/* ---- לשונית ---- */
	.tab {
		position: fixed;
		top: 50%;
		left: 0;
		transform: translateY(-50%);
		z-index: 1050;
		background: linear-gradient(180deg, #4f46e5, #7c3aed);
		border: none;
		border-radius: 0 8px 8px 0;
		padding: 0.6rem 0.3rem;
		cursor: pointer;
		box-shadow: 3px 0 12px rgba(79,70,229,0.4);
		transition: padding 0.2s, box-shadow 0.2s;
	}

	.tab:hover {
		padding: 0.7rem 0.4rem;
		box-shadow: 4px 0 18px rgba(79,70,229,0.6);
	}

	.tab-text {
		writing-mode: vertical-rl;
		text-orientation: mixed;
		transform: rotate(180deg);
		font-size: 0.7rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.08em;
	}
</style>

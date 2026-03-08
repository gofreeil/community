<script lang="ts">
	import { ads } from '$lib/adsData';

	let open = $state(false);
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
	<div class="drawer" class:drawer-open={open} aria-hidden={!open}>
		<!-- כותרת Drawer -->
		<div class="drawer-header">
			<span class="drawer-title">🌟 הטבות חשובות לקהילה</span>
			<button class="close-btn" onclick={() => open = false} aria-label="סגור">✕</button>
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
					<div class="ad-gradient"></div>
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
		aria-label="פתח הטבות לקהילה"
	>
		<span class="tab-text">הטבות חשובות לקהילה</span>
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
		width: min(300px, 82vw);
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

	/* ---- רשימת פרסומות ---- */
	.ads-list {
		overflow-y: auto;
		flex: 1;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		scrollbar-width: thin;
		scrollbar-color: rgba(99,102,241,0.3) transparent;
	}

	/* ---- כרטיס פרסומת ---- */
	.ad-card {
		display: flex;
		gap: 0.6rem;
		background: rgba(255,255,255,0.05);
		border: 1px solid rgba(99,102,241,0.15);
		border-radius: 0.75rem;
		overflow: hidden;
		text-decoration: none;
		transition: background 0.2s, border-color 0.2s, transform 0.15s;
		padding: 0.5rem;
		align-items: center;
	}

	.ad-card:hover {
		background: rgba(99,102,241,0.12);
		border-color: rgba(99,102,241,0.35);
		transform: scale(1.01);
	}

	.ad-img-wrap {
		position: relative;
		width: 56px;
		height: 56px;
		border-radius: 0.5rem;
		overflow: hidden;
		flex-shrink: 0;
	}

	.ad-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* שכבת עמעום כהה אחידה מלמטה — ללא צבע ייחודי לכל מודעה */
	.ad-gradient {
		position: absolute;
		inset: 0;
		background: linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%);
	}

	.ad-body {
		flex: 1;
		min-width: 0;
	}

	.ad-title {
		font-size: 0.82rem;
		font-weight: 700;
		color: #f1f5f9;
		margin: 0 0 0.15rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.ad-desc {
		font-size: 0.68rem;
		color: #94a3b8;
		margin: 0 0 0.25rem;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.ad-cta {
		display: inline-block;
		font-size: 0.63rem;
		color: #a5b4fc;
		font-weight: 600;
		background: rgba(99,102,241,0.12);
		border-radius: 4px;
		padding: 0.1rem 0.35rem;
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
		font-size: 0.7rem;
		font-weight: 700;
		color: #fff;
		letter-spacing: 0.08em;
	}
</style>

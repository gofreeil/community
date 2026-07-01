<script lang="ts">
	import "../app.css";
	import "flag-icons/css/flag-icons.min.css";
	import "$lib/i18n";
	import Header from "$lib/components/Header.svelte";
	import NewsTicker from "$lib/components/NewsTicker.svelte";
	import RightAdBanner from "$lib/components/RightAdBanner.svelte";
	import AdsSidebar from "$lib/components/AdsSidebar.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import CoinAnimation from "$lib/components/CoinAnimation.svelte";
	import MobileAdsDrawer from "$lib/components/MobileAdsDrawer.svelte";
	import MobileAdPopup from "$lib/components/MobileAdPopup.svelte";
	import { signOut } from "@auth/sveltekit/client";
	import { goto, beforeNavigate } from "$app/navigation";
	import { page } from "$app/state";
	import { closeAdPopup } from "$lib/adPopupStore";
	import { registerDynamicNeighborhoods, MY_PIN_LS_KEY } from "$lib/neighborhoodCoords";
	import { neighborhoodState } from "$lib/neighborhoodState.svelte";
	import { browser } from "$app/environment";

	let { children, data } = $props();

	// מקור אמת יחיד למצב ההתחברות של מצב-השכונה: הסשן מה-layout, בכל עמוד.
	// אורח → init תמיד יפתח בברירת המחדל, ובחירת שכונה תציג נדנוד להרשמה.
	$effect(() => {
		neighborhoodState.setLoggedIn(!!data.session?.user);
	});

	// רישום שכונות מאושרות (פין מדויק) למנגנון הקואורדינטות - כך שהמפה
	// תציב פריטים בשכונות חדשות במקום שסומן, בכל האתר.
	$effect(() => {
		if (data.approvedNeighborhoods?.length) {
			registerDynamicNeighborhoods(data.approvedNeighborhoods);
		}
	});

	// מיקום אישי שהמשתמש סימן בעצמו (לפני אישור אדמין) - תיקון מיידי למפה שלו
	// בלבד, נשמר מקומית במכשיר. אחרי אישור אדמין זה ממילא יגיע מ-approvedNeighborhoods.
	$effect(() => {
		if (!browser) return;
		try {
			const raw = localStorage.getItem(MY_PIN_LS_KEY);
			if (!raw) return;
			const p = JSON.parse(raw);
			if (p?.city && p?.name && Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
				registerDynamicNeighborhoods([p]);
			}
		} catch {}
	});

	// ממפה את session.user לצורה שה-Header מצפה לה
	let currentUser = $derived(
		data.session?.user
			? {
				username:   data.layoutUser?.nickname || data.layoutUser?.name || (data.session.user.name ?? data.session.user.email ?? 'משתמש'),
				avatar_url: data.layoutUser?.avatar_url ?? data.session.user.image ?? null,
					name:              data.layoutUser?.name ?? null,
					email:             data.layoutUser?.email ?? data.session.user.email ?? null,
					nickname:          data.layoutUser?.nickname ?? null,
					phone:             data.layoutUser?.phone ?? null,
					city:              data.layoutUser?.city ?? null,
					neighborhood:      data.layoutUser?.neighborhood ?? null,
					gender:            data.layoutUser?.gender ?? null,
					business:          data.layoutUser?.business ?? null,
					family_status:     data.layoutUser?.family_status ?? null,
					birth_date:        data.layoutUser?.birth_date ?? null,
					security_question: data.layoutUser?.security_question ?? null,
					security_answer:   data.layoutUser?.security_answer ?? null,
			  }
			: undefined
	);

	async function handleLogout() {
		await signOut({ redirectTo: '/' });
	}

	function handleShowAuth() {
		goto(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
	}

	beforeNavigate(() => {
		closeAdPopup();
	});
</script>

<svelte:head>
	<!-- אין כאן <title> בכוונה: כל דף מגדיר את ה-title שלו ב-<svelte:head>.
	     title קבוע ב-layout היה דורס את ה-title של דף הבית. -->
	<link rel="icon" href="/images/community-logo1.png" type="image/png" />
	<link rel="apple-touch-icon" href="/images/community-logo1.png" />
	<!-- tabnav: מושבת לבינתיים - לא רשום על הדומיין הנוכחי -->
	<!-- <script src="https://widget.tabnav.com/widget.min.js.gz" defer></script> -->
	<!-- <noscript>נדרש ג'אווה סקריפט כדי ש<a href="https://tabnav.com/he">הנגשת אתרים</a> תעבוד כראוי.</noscript> -->
	<!-- Google Analytics -->
	<!-- svelte-ignore -->
	{@html `<script async src="https://www.googletagmanager.com/gtag/js?id=G-05DGN7JQ4M"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-05DGN7JQ4M');
</script>`}
</svelte:head>

<a href="#main-content" class="skip-link">דלג לתוכן הראשי</a>
<CoinAnimation />
<MobileAdsDrawer currentUser={currentUser} layoutUser={data.layoutUser} />
<MobileAdPopup />
<div class="min-h-screen flex flex-col bg-[#0f172a]">
	<Header
		currentUser={currentUser}
		onLogout={handleLogout}
		onShowAuth={handleShowAuth}
	/>

	<div class="layout-container flex-grow">
		<RightAdBanner />
		<main id="main-content" tabindex="-1" class="main-content">
			{@render children()}
		</main>
		<AdsSidebar approvedAds={data.approvedAds ?? []} />
	</div>

	<Footer />
</div>

<!-- נדנוד הרשמה: מופיע כשאורח (לא מחובר) בוחר שכונה, כדי לתמרץ הרשמה -->
{#if neighborhoodState.showRegisterNudge && !data.session?.user}
	<div class="register-nudge" dir="rtl" role="status">
		<button
			class="nudge-close"
			aria-label="סגירה"
			onclick={() => neighborhoodState.dismissNudge()}
		>×</button>
		<div class="nudge-text">
			<span class="nudge-emoji">💜</span>
			כדי שהפלטפורמה תזכור את השכונה שבחרת בפעם הבאה — כדאי להירשם.
		</div>
		<button
			class="nudge-cta"
			onclick={() => {
				neighborhoodState.dismissNudge();
				goto(`/register?redirect=${encodeURIComponent(page.url.pathname)}`);
			}}
		>הרשמה מהירה</button>
	</div>
{/if}

<style>
	/* נדנוד הרשמה לאורחים */
	.register-nudge {
		position: fixed;
		bottom: 1.25rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 60;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		max-width: min(92vw, 30rem);
		padding: 0.85rem 1.1rem;
		border-radius: 1rem;
		background: linear-gradient(135deg, #4c1d95, #7c3aed, #db2777);
		color: #fff;
		box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
		border: 1px solid rgba(255, 255, 255, 0.15);
		animation: nudge-in 0.35s ease;
	}

	@keyframes nudge-in {
		from { opacity: 0; transform: translate(-50%, 1rem); }
		to   { opacity: 1; transform: translate(-50%, 0); }
	}

	.nudge-text {
		font-size: 0.9rem;
		line-height: 1.4;
		flex: 1;
		min-width: 0;
	}

	.nudge-emoji {
		margin-inline-end: 0.25rem;
	}

	.nudge-cta {
		flex-shrink: 0;
		background: #fff;
		color: #6d28d9;
		font-weight: 700;
		font-size: 0.85rem;
		padding: 0.5rem 0.9rem;
		border-radius: 0.7rem;
		border: none;
		cursor: pointer;
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}

	.nudge-cta:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
	}

	.nudge-close {
		position: absolute;
		top: 0.35rem;
		inset-inline-start: 0.5rem;
		background: none;
		border: none;
		color: rgba(255, 255, 255, 0.75);
		font-size: 1.25rem;
		line-height: 1;
		cursor: pointer;
		padding: 0.15rem 0.35rem;
	}

	.nudge-close:hover {
		color: #fff;
	}

	@media (max-width: 640px) {
		.register-nudge {
			flex-direction: column;
			text-align: center;
			bottom: 0.75rem;
		}
	}

	.layout-container {
		max-width: 1440px;
		margin: 0 auto;
		display: flex;
		gap: 2rem;
		padding: 2rem 2rem 0 2rem;
		width: 100%;
	}

	.main-content {
		flex: 1;
		min-width: 0;
	}

	@media (max-width: 1024px) {
		.layout-container {
			padding: 0;
			gap: 0;
			flex-direction: column;
			max-width: 100vw;
			overflow-x: hidden;
		}
		.main-content {
			max-width: 100vw;
			overflow-x: hidden;
		}
	}
</style>

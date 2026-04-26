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

	let { children, data } = $props();

	// ממפה את session.user לצורה שה-Header מצפה לה
	let currentUser = $derived(
		data.session?.user
			? {
				username:   data.layoutUser?.nickname || data.layoutUser?.name || (data.session.user.name ?? data.session.user.email ?? 'משתמש'),
				avatar_url: data.layoutUser?.avatar_url ?? data.session.user.image ?? null,
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
	<title>קהילה בשכונה</title>
	<link rel="icon" href="/images/community-logo1.png" type="image/png" />
	<link rel="apple-touch-icon" href="/images/community-logo1.png" />
	<!-- tabnav: מושבת לבינתיים — לא רשום על הדומיין הנוכחי -->
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
		<AdsSidebar />
	</div>

	<Footer />
</div>

<style>
	/* Asides: absolute (out of flow) — main מכתיב גובה הדף, אין רווח מעל ה-footer.
	   layout-container הוא flex-col עם flex-grow → main ב-flex:1 ממלא דפים קצרים. */
	.layout-container {
		max-width: 1440px;
		margin: 0 auto;
		position: relative;
		padding: 2rem 2rem 0 2rem;
		width: 100%;
		overflow: hidden;
		display: flex;
		flex-direction: column;
	}

	.main-content {
		width: 100%;
		min-width: 0;
		flex: 1; /* ממלא את המכולה אנכית גם בדפים קצרים */
	}

	/* lg+ : AdsSidebar (w-48 = 12rem) בצד שמאל */
	@media (min-width: 1024px) {
		.main-content {
			margin-left: 14rem; /* aside (12) + gap (2) */
		}
	}

	/* xl+ : RightAdBanner (w-36 = 9rem) בצד ימין */
	@media (min-width: 1280px) {
		.main-content {
			margin-right: 11rem; /* aside (9) + gap (2) */
		}
	}

	@media (max-width: 1023px) {
		.layout-container {
			padding: 0;
			max-width: 100vw;
			overflow-x: hidden;
		}
		.main-content {
			max-width: 100vw;
			margin-left: 0;
			margin-right: 0;
			overflow-x: hidden;
		}
	}
</style>

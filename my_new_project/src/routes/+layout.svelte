<script lang="ts">
	import "../app.css";
	import "flag-icons/css/flag-icons.min.css";
	import "$lib/i18n";
	import { _ } from "svelte-i18n";
	import Header from "$lib/components/Header.svelte";
	import NewsTicker from "$lib/components/NewsTicker.svelte";
	import RightAdBanner from "$lib/components/RightAdBanner.svelte";
	import AdsSidebar from "$lib/components/AdsSidebar.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import CoinAnimation from "$lib/components/CoinAnimation.svelte";
	import MobileAdsDrawer from "$lib/components/MobileAdsDrawer.svelte";
	import MobileAdPopup from "$lib/components/MobileAdPopup.svelte";
	import ImageCropper from "$lib/components/ImageCropper.svelte";
	import WelcomeScreen from "$lib/components/WelcomeScreen.svelte";
	import { signOut } from "@auth/sveltekit/client";
	import { goto, beforeNavigate } from "$app/navigation";
	import { page, navigating } from "$app/state";
	import { closeAdPopup, registerPaidAds } from "$lib/adPopupStore";
	import { registerDynamicNeighborhoods, MY_PIN_LS_KEY } from "$lib/neighborhoodCoords";
	import { neighborhoodState } from "$lib/neighborhoodState.svelte";
	import { installFormGuard } from "$lib/formGuard";
	import { browser } from "$app/environment";

	let { children, data } = $props();

	// הגנה גלובלית מפני "לחצתי ושום דבר לא קרה": כשהדפדפן חוסם שליחת טופס
	// בגלל שדה חובה, גוללים אל השדה, מבליטים אותו ומסבירים מה חסר. בלי זה
	// הבועה הנטיבית נעלמת (ובנייד לרוב לא מוצגת כלל) והכפתור נראה מקולקל.
	$effect(() => installFormGuard());

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

	// פרסומות משולמות → הפופ-אפ בנייד. הטור הימני הוא דסקטופ בלבד, ולכן
	// בלי זה מי ששילם לא הופיע בנייד כלל - למרות שהבילדר מבטיח לו בשלב 7
	// "כך הפרסומת תיפתח בנייד". התמונה הייעודית לנייד (אם הועלתה) מועדפת.
	$effect(() => {
		registerPaidAds(
			(data.approvedAds ?? [])
				.filter((a) => a.mainImage)
				.map((a) => ({
					id:             a.id,
					title:          a.title,
					description:    a.subtitle,
					cta:            a.cta || a.title,
					href:           `/ads/${a.id}`,
					internal:       true,
					image:          a.mainImage,
					mobileImage:    a.mobileImage || undefined,
					mobileImageFit: a.mobileImage ? a.mobileImageFit : undefined,
					color:          a.gradient,
					hover:          a.hover,
				})),
		);
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
		// מוחק גם את עוגיות strapi_jwt/gofreeil-auth - אחרת ssoAutoAdopt
		// מחבר מחדש אוטומטית בניווט הבא ("אי-אפשר להתנתק")
		try { await fetch('/api/logout', { method: 'POST' }); } catch { /* ממשיכים לניתוק הסשן */ }
		await signOut({ redirectTo: '/' });
	}

	function handleShowAuth() {
		goto(`/login?redirect=${encodeURIComponent(page.url.pathname)}`);
	}

	beforeNavigate(() => {
		closeAdPopup();
	});

	// ספירת כניסות: beacon יחיד לכל session של הדפדפן (לסטטיסטיקה בלוח הניהול)
	$effect(() => {
		if (!browser) return;
		try {
			if (sessionStorage.getItem('visit_tracked')) return;
			sessionStorage.setItem('visit_tracked', '1');
			fetch('/api/track-visit', { method: 'POST', keepalive: true }).catch(() => {});
		} catch { /* גלישה פרטית וכו' - לא קריטי */ }
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

<a href="#main-content" class="skip-link">{$_('chrome.skip_to_content')}</a>

<!-- חיווי ניווט. אותו עיקרון של installFormGuard למעלה, רק לניווט: לחיצה על
     לינק חייבת לייצר שינוי מסך *מיידי*. SvelteKit מוריד את נתוני העמוד הבא
     לפני שהוא מצייר משהו, וכשהמטען כבד (הפרסומות ב-+layout.server.ts) הדף
     נשאר זהה לחלוטין למשך שניות - והמשתמש חווה "לחצתי ולא קרה כלום". -->
{#if navigating.to}
	<div class="nav-progress" role="status" aria-label={$_('chrome.navigating')}></div>
{/if}

<CoinAnimation />
<ImageCropper />

<!-- מסך פתיחה אחרי זיהוי חדש — גלובלי, כדי שיופיע בכל יעד נחיתה -->
{#if data.session?.user}
	<WelcomeScreen userName={data.session.user.name ?? ""} />
{/if}
<MobileAdsDrawer currentUser={currentUser} layoutUser={data.layoutUser} />
<MobileAdPopup />
<div class="min-h-screen flex flex-col bg-[#0f172a]">
	<Header
		currentUser={currentUser}
		onLogout={handleLogout}
		onShowAuth={handleShowAuth}
	/>

	<div class="layout-container flex-grow">
		<!-- ב-RTL הילד הראשון הוא הצד הימני: הפרסומות בימין, אתרי הרשת בשמאל.
		     approvedAds מגיע ל-RightAdBanner בלבד - אין פרסומות בטור השמאלי. -->
		<RightAdBanner approvedAds={data.approvedAds ?? []} />
		<main id="main-content" tabindex="-1" class="main-content">
			{@render children()}
		</main>
		<AdsSidebar />
	</div>

	<Footer />
</div>

<!-- נדנוד הרשמה: מופיע כשאורח (לא מחובר) בוחר שכונה, כדי לתמרץ הרשמה -->
{#if neighborhoodState.showRegisterNudge && !data.session?.user}
	<div class="register-nudge" dir="rtl" role="status">
		<button
			class="nudge-close"
			aria-label={$_('chrome.close')}
			onclick={() => neighborhoodState.dismissNudge()}
		>×</button>
		<div class="nudge-text">
			<span class="nudge-emoji">💜</span>
			{$_('chrome.register_nudge_text')}
		</div>
		<button
			class="nudge-cta"
			onclick={() => {
				neighborhoodState.dismissNudge();
				goto(`/register?redirect=${encodeURIComponent(page.url.pathname)}`);
			}}
		>{$_('chrome.register_nudge_cta')}</button>
	</div>
{/if}

<style>
	/* פס התקדמות הניווט - נצמד לראש החלון מעל ההדר (z-index שלו 1100).
	   pointer-events:none כדי שלא יבלע אף לחיצה. הרוחב זוחל ל-90% ונעצר שם:
	   אי אפשר לדעת כמה נותר, והשלמה ל-100% קורית מעצמה כשהאלמנט מוסר. */
	.nav-progress {
		position: fixed;
		top: 0;
		inset-inline: 0;
		height: 3px;
		z-index: 1300;
		pointer-events: none;
		background: linear-gradient(90deg, #2563eb, #7c3aed, #db2777);
		box-shadow: 0 0 10px rgba(124, 58, 237, 0.7);
		transform-origin: right center; /* RTL - מתקדם מימין לשמאל */
		animation: nav-progress-grow 12s cubic-bezier(0.15, 0.85, 0.25, 1) forwards;
	}

	@keyframes nav-progress-grow {
		from { transform: scaleX(0.02); }
		to   { transform: scaleX(0.9); }
	}

	/* מכבדים העדפת "פחות תנועה": הפס עדיין מופיע, רק בלי אנימציית זחילה */
	@media (prefers-reduced-motion: reduce) {
		.nav-progress {
			animation: none;
			transform: scaleX(1);
			opacity: 0.85;
		}
	}

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
			/* clip ולא hidden: hidden הופך את האלמנט ל-scroll container ושובר position:sticky של צאצאים */
			overflow-x: clip;
		}
		.main-content {
			max-width: 100vw;
			overflow-x: clip;
		}
	}
</style>

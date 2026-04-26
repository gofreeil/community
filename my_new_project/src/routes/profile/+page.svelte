<script lang="ts">
	import { enhance } from "$app/forms";
	import { signOut, signIn } from "@auth/sveltekit/client";
	import {
		subscribeToPush,
		unsubscribeFromPush,
		saveSubscription,
		deleteSubscription,
	} from "$lib/push.js";
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import type { CityEntry } from "$lib/neighborhoodsData";
	import { t, locale } from "svelte-i18n";
	import { get } from "svelte/store";
	import { neighborhoodState } from "$lib/neighborhoodState.svelte";
	import { findWhatsAppGroups } from "$lib/data/whatsapp-groups";

	let { data, form } = $props();

	// snapshot ראשוני של נתוני המשתמש לאתחול שדות הטופס (intentional — form manages its own state)
	const _ud = data.user;

	// tFn: פונקציית תרגום reactive — לא משתמשים ב-$t ישירות כי Prettier מוחק אותו
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe((l) => (_loc = l)));
	const tFn = (k: string) => {
		void _loc;
		return get(t)(k);
	};

	const DRAFT_KEY = "profile_draft";

	const _photoDone = page.url.searchParams.get("photo_done") === "1";
	let isEditing = $state(_photoDone);
	let showLevels = $state(false);
	let showMessages = $state(false);
	let showMyInfo = $state(true);
	let showFeedback = $state(false);
	let mobileTab = $state<
		"main" | "profile" | "messages" | "items" | "levels"
	>("main");

	// ניהול המלצות — מחיקה / דחייה לאוחר
	function loadRecSet(key: string): Set<string> {
		if (typeof localStorage === "undefined") return new Set();
		try {
			return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
		} catch {
			return new Set();
		}
	}
	function saveRecSet(key: string, s: Set<string>) {
		if (typeof localStorage !== "undefined")
			localStorage.setItem(key, JSON.stringify([...s]));
	}
	let dismissedRecs = $state<Set<string>>(loadRecSet("rec_dismissed"));
	let snoozedRecs = $state<Set<string>>(loadRecSet("rec_snoozed"));
	function dismissRec(id: string) {
		dismissedRecs = new Set([...dismissedRecs, id]);
		saveRecSet("rec_dismissed", dismissedRecs);
	}
	function snoozeRec(id: string) {
		snoozedRecs = new Set([...snoozedRecs, id]);
		saveRecSet("rec_snoozed", snoozedRecs);
	}
	function isRecVisible(id: string) {
		return !dismissedRecs.has(id) && !snoozedRecs.has(id);
	}
	let messages = $state(
		(data.messages ?? []).length > 0
			? (data.messages ?? []).map(
					(m: import("$lib/server/db").DbItem) => ({
						from: m.label ?? "מערכת",
						text: m.description ?? "",
						time: new Date(m.created_at).toLocaleDateString(
							"he-IL",
						),
						read: false,
					}),
				)
			: [
					{
						from: "מערכת",
						text: "ברוך הבא לקהילה! השלם את הפרופיל שלך.",
						time: "לפני 2 ימים",
						read: false,
					},
					{
						from: "מנהל",
						text: "הצטרפות שלך אושרה. כעת תוכל לפרסם תוכן.",
						time: "לפני 5 ימים",
						read: false,
					},
				],
	);
	let unreadCount = $derived(messages.filter((m) => !m.read).length);
	let secTipShow = $state(false);
	let showStatusMenu = $state(false);

	async function updateStatus(newStatus: string) {
		status = newStatus;
		showStatusMenu = false;
		// שמירה מיידית ב-Strapi
		try {
			const formData = new FormData();
			formData.set("status", newStatus);
			await fetch("?/updateStatus", { method: "POST", body: formData });
		} catch {}
	}
	let secTipX = $state(0);
	let secTipY = $state(0);
	let secTipIsOpen = $state(false);
	function handleSecMouseMove(e: MouseEvent, isOpen: boolean) {
		secTipX = e.clientX;
		secTipY = e.clientY;
		secTipIsOpen = isOpen;
	}
	let levelTipX = $state(0);
	let levelTipY = $state(0);
	function handleLevelMouseMove(e: MouseEvent) {
		levelTipX = e.clientX;
		levelTipY = e.clientY;
	}
	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: "smooth" });
	}
	function scrollToMessages() {
		showMessages = true;
		setTimeout(() => {
			const el = document.getElementById("sec-messages");
			if (!el) return;
			const top = el.getBoundingClientRect().top + window.scrollY - 80;
			slowScrollTo(top);
		}, 50);
	}
	let saveSuccess = $state(_photoDone); // הצג הצלחה אם חזרנו מהעתקת תמונה
	if (_photoDone) setTimeout(() => (saveSuccess = false), 3000);
	let avatarPreview = $state<string | null>(_ud?.avatar_url ?? null);
	let avatarBase64 = $state("");

	let name = $state(_ud?.name ?? "");
	let email = $state(_ud?.email ?? "");
	let nickname = $state(_ud?.nickname ?? "");
	let phone = $state(_ud?.phone ?? "");
	let city = $state(_ud?.city ?? "");
	let neighborhood = $state(_ud?.neighborhood ?? "");
	let business = $state(_ud?.business ?? "");
	let customLocation = $state("");
	let locationInteracted = $state(false);
	let family_status = $state(_ud?.family_status ?? "");
	let gender = $state(_ud?.gender ?? "");
	let whatsappMatches = $derived(findWhatsAppGroups(city, neighborhood));
	const birthParts = (_ud?.birth_date ?? "").split("-");
	let birthYear = $state(birthParts[0] ?? "");
	let birthMonth = $state(
		birthParts[1] ? String(parseInt(birthParts[1])) : "",
	);
	let birthDay = $state(birthParts[2] ? String(parseInt(birthParts[2])) : "");
	let notifications = $state(_ud?.notifications !== 0);
	let security_question = $state(_ud?.security_question ?? "");
	let security_answer = $state(_ud?.security_answer ?? "");
	let status = $state((_ud as any)?.status ?? "active");

	// סטטוסים לפי מגדר
	const statusOptions = $derived(() => {
		const isFemale = gender === "female";
		return [
			{
				value: "active",
				emoji: "🟢",
				label: isFemale ? "פעילה" : "פעיל",
			},
			{
				value: "unavailable",
				emoji: "🔴",
				label: isFemale ? "לא זמינה" : "לא זמין",
			},
			{
				value: "pregnant",
				emoji: "🤰",
				label: "לפני לידה",
				femaleOnly: true,
			},
			{
				value: "postbirth",
				emoji: "👶",
				label: "אחרי לידה",
				femaleOnly: true,
			},
			{ value: "vacation", emoji: "🏖️", label: "בחופשה" },
			{ value: "sick", emoji: "🤒", label: "חולה" },
			{ value: "miluim", emoji: "🪖", label: "במילואים" },
		].filter((o) => !("femaleOnly" in o) || isFemale);
	});
	let termsAccepted = $state(
		typeof localStorage !== "undefined"
			? localStorage.getItem("terms_accepted") === "1"
			: false,
	);

	// ===== Web Push =====
	async function handleNotificationsToggle(enabled: boolean) {
		if (enabled) {
			const sub = await subscribeToPush();
			if (sub) {
				await saveSubscription(sub, data.user?.id);
			} else {
				// המשתמש סירב להרשאה — החזר toggle
				notifications = false;
			}
		} else {
			const reg = await navigator.serviceWorker?.getRegistration?.("/");
			const sub = await reg?.pushManager?.getSubscription?.();
			if (sub) {
				await deleteSubscription(sub);
				await unsubscribeFromPush();
			}
		}
	}
	let showTermsError = $state(false);

	// ===== שליפת תמונה מגוגל/פייסבוק =====
	let showSocialPhotoModal = $state<"google" | "facebook" | null>(null);
	let socialPhotoInput = $state("");
	let socialPhotoError = $state("");
	let socialPhotoLoading = $state(false);

	async function fetchSocialPhoto() {
		socialPhotoError = "";
		socialPhotoLoading = true;
		try {
			let url = "";
			if (showSocialPhotoModal === "facebook") {
				// חילוץ שם משתמש מ-URL או שימוש ישיר
				const username = socialPhotoInput
					.trim()
					.replace(/^https?:\/\/(www\.)?facebook\.com\//, "")
					.replace(/\/$/, "");
				url = `https://graph.facebook.com/${username}/picture?type=large&redirect=true`;
			} else if (showSocialPhotoModal === "google") {
				// Google: קבלת URL ישיר של תמונת פרופיל
				url = socialPhotoInput.trim();
				if (!url.startsWith("http")) {
					socialPhotoError = "הכנס URL תקין של תמונת הפרופיל";
					socialPhotoLoading = false;
					return;
				}
			}
			// טעינת התמונה כ-base64
			const res = await fetch(url);
			if (!res.ok) throw new Error("לא ניתן לטעון את התמונה");
			const blob = await res.blob();
			const reader = new FileReader();
			reader.onload = (e) => {
				avatarPreview = e.target?.result as string;
				avatarBase64 = e.target?.result as string;
				showSocialPhotoModal = null;
				socialPhotoInput = "";
			};
			reader.readAsDataURL(blob);
		} catch {
			socialPhotoError = "לא הצלחנו לטעון את התמונה. נסה שנית.";
		} finally {
			socialPhotoLoading = false;
		}
	}

	// ===== חיתוך תמונה =====
	const CROP_VP = 280;
	let showCrop = $state(false);
	let cropSrc = $state("");
	let cropScale = $state(1);
	let cropMinScale = $state(0.5);
	let cropOffsetX = $state(0);
	let cropOffsetY = $state(0);
	let cropNatW = $state(0);
	let cropNatH = $state(0);

	// נקה טיוטה ישנה — הנתונים מגיעים מהשרת בלבד
	onMount(() => {
		try {
			localStorage.removeItem(DRAFT_KEY);
		} catch {}
	});

	// שמור טיוטה ב-localStorage בכל שינוי
	$effect(() => {
		try {
			localStorage.setItem(
				DRAFT_KEY,
				JSON.stringify({
					name,
					email,
					nickname,
					phone,
					city,
					neighborhood,
					business,
					family_status,
					gender,
					notifications,
				}),
			);
		} catch {}
	});

	function clearDraft() {
		try {
			localStorage.removeItem(DRAFT_KEY);
		} catch {}
	}

	// טולטיפ כפתור עריכה
	let showEditTooltip = $state(false);
	let editTooltipX = $state(0);
	let editTooltipY = $state(0);

	function handleEditMouseMove(e: MouseEvent) {
		editTooltipX = e.clientX + 14;
		editTooltipY = e.clientY + 20;
	}

	let availableNeighborhoods = $derived(
		(data.citiesData as CityEntry[]).find((c) => c.city === city)
			?.neighborhoods ?? [],
	);

	let avatarLetter = $derived(
		(data.user?.name ?? data.user?.email ?? "U").charAt(0).toUpperCase(),
	);

	// מעגל מילוי פרופיל — דינמי: כל שדה שווה 100/מספר_שדות
	const ringCircumference = 2 * Math.PI * 43; // r=43, SVG 92×92

	// שדות פרופיל שהמשתמש צריך למלא (לא notifications שמגיע כברירת מחדל)
	let profileFields = $derived([
		!!name,
		!!email,
		!!avatarPreview,
		!!nickname,
		!!phone,
		!!city,
		!!neighborhood,
		!!gender,
		!!business,
		!!family_status,
		!!(birthYear && birthMonth && birthDay),
		!!(security_question && security_answer),
	]);

	let profileCompletion = $derived(
		Math.round(
			(profileFields.filter(Boolean).length / profileFields.length) * 100,
		),
	);

	let ringColor = $derived(
		profileCompletion < 40
			? "#ef4444"
			: profileCompletion < 70
				? "#eab308"
				: "#22c55e",
	);

	// דרגה 1 = צופה (נרשם בלבד)
	// דרגה 2 = משתמש (מילא עיר, שכונה, אימייל וטלפון)
	let userLevel = $derived(city && neighborhood && email && phone ? 2 : 1);

	// מספר מניות פלטפורמה — placeholder פרונט בלבד עד חיבור ל-backend
	let userShares = $derived(10 + data.items.length * 5);

	let isUserAdmin = $derived(
		(data.user as any)?.role === "neighborhood_admin" ||
			(data.user as any)?.role === "super_admin",
	);

	let isSuperAdmin = $derived((data.user as any)?.role === "super_admin");

	// טיפ למעגל — המפתח של השדה הבא שלא מולא
	const ringTipKeys = [
		"tip_name",
		"tip_email",
		"tip_avatar",
		"tip_nickname",
		"tip_phone",
		"tip_city",
		"tip_neighborhood",
		"tip_gender",
		"tip_business",
		"tip_family_status",
		"tip_birth_date",
		"tip_security",
	] as const;
	let nextTipKey = $derived(
		profileCompletion >= 100
			? "profile_complete"
			: (ringTipKeys[profileFields.findIndex((f) => !f)] ??
					"profile_complete"),
	);

	// ספירת שדות ביטחון שנשארו (שאלה + תשובה = 2 שדות)
	let securityFieldsRemaining = $derived(
		(security_question ? 0 : 1) + (security_answer ? 0 : 1),
	);

	let showRingTooltip = $state(false);
	let ringTipX = $state(0);

	// אנימציה מדורגת של המעגל — מופעלת רק כשנכנס לתצוגה
	let animatedCompletion = $state(0);
	let ringAnimated = $state(false);

	function animateRing(target: number) {
		if (ringAnimated) return;
		ringAnimated = true;
		const duration = 1400; // ms
		const steps = 60;
		const stepTime = duration / steps;
		let current = 0;
		const increment = target / steps;

		const timer = setInterval(() => {
			current = Math.min(current + increment, target);
			animatedCompletion = Math.round(current);
			if (current >= target) {
				clearInterval(timer);
				// ודא שהערך הסופי תמיד מדויק
				animatedCompletion = target;
			}
		}, stepTime);
	}

	// אם profileCompletion משתנה אחרי האנימציה (נטען מהשרת), עדכן ישירות
	$effect(() => {
		if (ringAnimated) {
			animatedCompletion = profileCompletion;
		}
	});

	function ringObserver(node: SVGElement) {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					setTimeout(() => animateRing(profileCompletion), 400);
					observer.disconnect();
				}
			},
			{ threshold: 0.5 },
		);
		observer.observe(node);
		return { destroy: () => observer.disconnect() };
	}
	let ringTipY = $state(0);
	function slowScrollTo(targetTop: number, duration = 800) {
		const start = window.scrollY;
		const dist = targetTop - start;
		const startTime = performance.now();
		function step(now: number) {
			const elapsed = now - startTime;
			const progress = Math.min(elapsed / duration, 1);
			// easeInOutCubic
			const ease =
				progress < 0.5
					? 4 * progress * progress * progress
					: 1 - Math.pow(-2 * progress + 2, 3) / 2;
			window.scrollTo(0, start + dist * ease);
			if (progress < 1) requestAnimationFrame(step);
		}
		requestAnimationFrame(step);
	}
	function scrollToLevels() {
		if (showLevels) return;
		showLevels = true;
		setTimeout(() => {
			const el = document.getElementById("sec-levels");
			if (!el) return;
			const top = el.getBoundingClientRect().top + window.scrollY - 80;
			slowScrollTo(top);
		}, 50);
	}
	function scrollToEditProfile() {
		if (profileCompletion >= 100) return;
		if (isEditing) return;
		isEditing = true;
		setTimeout(() => {
			const el = document.getElementById("sec-edit-profile");
			if (!el) return;
			const top = el.getBoundingClientRect().top + window.scrollY - 80;
			slowScrollTo(top);
		}, 50);
	}
	function handleRingMouseMove(e: MouseEvent) {
		ringTipX = e.clientX + 14;
		ringTipY = e.clientY + 20;
	}

	function handleImageChange(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = (ev) => {
			cropSrc = ev.target?.result as string;
			cropOffsetX = 0;
			cropOffsetY = 0;
			showCrop = true;
		};
		reader.readAsDataURL(file);
	}

	function onCropLoad(e: Event) {
		const img = e.target as HTMLImageElement;
		cropNatW = img.naturalWidth;
		cropNatH = img.naturalHeight;
		const minS = Math.max(CROP_VP / cropNatW, CROP_VP / cropNatH);
		cropMinScale = minS;
		cropScale = minS;
		cropOffsetX = 0;
		cropOffsetY = 0;
	}

	function cropInteraction(node: HTMLElement) {
		let dragging = false,
			sx = 0,
			sy = 0,
			sox = 0,
			soy = 0;

		function wheel(ev: WheelEvent) {
			ev.preventDefault();
			const f = ev.deltaY > 0 ? 0.92 : 1.09;
			cropScale = Math.max(
				cropMinScale,
				Math.min(cropScale * f, cropMinScale * 6),
			);
		}
		function mdown(ev: MouseEvent) {
			dragging = true;
			sx = ev.clientX;
			sy = ev.clientY;
			sox = cropOffsetX;
			soy = cropOffsetY;
		}
		function mmove(ev: MouseEvent) {
			if (!dragging) return;
			cropOffsetX = sox + ev.clientX - sx;
			cropOffsetY = soy + ev.clientY - sy;
		}
		function mup() {
			dragging = false;
		}
		function tstart(ev: TouchEvent) {
			ev.preventDefault();
			dragging = true;
			sx = ev.touches[0].clientX;
			sy = ev.touches[0].clientY;
			sox = cropOffsetX;
			soy = cropOffsetY;
		}
		function tmove(ev: TouchEvent) {
			ev.preventDefault();
			if (!dragging) return;
			cropOffsetX = sox + ev.touches[0].clientX - sx;
			cropOffsetY = soy + ev.touches[0].clientY - sy;
		}
		function tend() {
			dragging = false;
		}

		node.addEventListener("wheel", wheel, { passive: false });
		node.addEventListener("mousedown", mdown);
		node.addEventListener("mousemove", mmove);
		node.addEventListener("mouseup", mup);
		node.addEventListener("mouseleave", mup);
		node.addEventListener("touchstart", tstart, { passive: false });
		node.addEventListener("touchmove", tmove, { passive: false });
		node.addEventListener("touchend", tend);

		return {
			destroy() {
				node.removeEventListener("wheel", wheel);
				node.removeEventListener("mousedown", mdown);
				node.removeEventListener("mousemove", mmove);
				node.removeEventListener("mouseup", mup);
				node.removeEventListener("mouseleave", mup);
				node.removeEventListener("touchstart", tstart);
				node.removeEventListener("touchmove", tmove);
				node.removeEventListener("touchend", tend);
			},
		};
	}

	async function confirmCrop() {
		const OUT = 400;
		const canvas = document.createElement("canvas");
		canvas.width = OUT;
		canvas.height = OUT;
		const ctx = canvas.getContext("2d")!;

		ctx.beginPath();
		ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
		ctx.clip();

		const img = new Image();
		img.src = cropSrc;
		await new Promise<void>((r) => {
			if (img.complete) r();
			else img.onload = () => r();
		});

		const factor = OUT / CROP_VP;
		const scaledW = cropNatW * cropScale;
		const scaledH = cropNatH * cropScale;
		const drawX = (CROP_VP / 2 + cropOffsetX - scaledW / 2) * factor;
		const drawY = (CROP_VP / 2 + cropOffsetY - scaledH / 2) * factor;

		ctx.drawImage(img, drawX, drawY, scaledW * factor, scaledH * factor);

		const result = canvas.toDataURL("image/jpeg", 0.92);
		avatarPreview = result;
		avatarBase64 = result;
		showCrop = false;
	}
</script>

<svelte:head>
	<title>{tFn("profile_title")}</title>
</svelte:head>

<div class="max-w-3xl mx-auto px-4 py-8 overflow-x-hidden" dir="rtl">
	<!-- כפתור התחברות/הרשמה לאורחים בלבד -->
	{#if !data.user}
		<div
			class="flex flex-wrap justify-center gap-2 mb-4 p-4 bg-[#0f172a] rounded-2xl border border-white/10"
		>
			<a
				href="/login?redirect=/profile"
				class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600
			          hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold
			          shadow-lg transition-all duration-200 hover:-translate-y-0.5"
			>
				כניסה לחשבון
			</a>
			<a
				href="/register"
				class="px-5 py-2.5 rounded-xl border border-white/15 hover:border-purple-500/50
			          text-gray-300 hover:text-white text-sm font-bold transition-all hover:bg-white/5"
			>
				הרשמה חינם
			</a>
			<button
				type="button"
				onclick={() => signIn("google", { callbackUrl: "/profile" })}
				class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10
				       border border-white/10 hover:border-red-400/40 text-sm text-gray-300 transition-all cursor-pointer"
			>
				<img
					src="https://www.google.com/favicon.ico"
					class="w-4 h-4"
					alt=""
				/>Google
			</button>
			<button
				type="button"
				onclick={() => signIn("facebook", { callbackUrl: "/profile" })}
				class="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10
				       border border-white/10 hover:border-blue-400/40 text-sm text-gray-300 transition-all cursor-pointer"
			>
				<img
					src="https://www.facebook.com/favicon.ico"
					class="w-4 h-4"
					alt=""
				/>Facebook
			</button>
		</div>
	{/if}

	<!-- ===== ברוך הבא — הרשמה חדשה ===== -->
	{#if page.url.searchParams.get("new") === "1"}
		<div
			class="mb-6 rounded-2xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-purple-500/30 px-6 py-5 text-center shadow-lg"
		>
			<p class="text-2xl mb-1">🎉</p>
			<h2 class="text-white font-black text-lg mb-1">
				{tFn("welcome_community")}
			</h2>
			<p class="text-gray-300 text-sm">{tFn("registration_complete")}</p>
		</div>
	{/if}

	<!-- ===== לשוניות ניווט — נייד בלבד ===== -->
	<div class="md:hidden flex gap-1 overflow-x-auto pb-1 mb-3 scrollbar-none">
		{#each [{ id: "main", icon: "🏠", label: "ראשי" }, { id: "profile", icon: "✏️", label: "פרופיל" }, { id: "messages", icon: "💬", label: "הודעות" }, { id: "items", icon: "📦", label: "נכסים" }, { id: "levels", icon: "🏆", label: "דרגות" }] as tab}
			<button
				type="button"
				onclick={() => (mobileTab = tab.id as typeof mobileTab)}
				class="flex-shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-2xl text-[11px] font-bold transition-all
					{mobileTab === tab.id
					? 'bg-purple-600/30 border border-purple-500/50 text-white'
					: 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}"
			>
				<span class="text-base leading-none">{tab.icon}</span>
				<span>{tab.label}</span>
			</button>
		{/each}
	</div>

	<!-- ===== קומה 1: האזור האישי ===== -->
	<div
		class="bg-[#0f172a] rounded-3xl border border-white/10 p-4 md:p-6 shadow-xl mb-2 {mobileTab !==
		'main'
			? 'hidden md:block'
			: ''}"
	>
		<!-- כותרת + כפתור התנתקות -->
		<div class="flex items-center justify-between mb-5">
			<div class="flex items-center gap-2">
				<span
					class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>1</span
				>
				<h2 class="text-base font-black text-white">
					<span class="md:hidden">לוח הבקרה</span>
					<span class="hidden md:inline"
						>{tFn("section_personal_area")}</span
					>
				</h2>
			</div>
			<div class="flex items-center gap-2">
				{#if isSuperAdmin}
					<a
						href="/admin"
						class="text-sm font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer px-4 py-2 rounded-xl hover:bg-amber-500/10 border border-amber-500/30 hover:border-amber-400/50 flex items-center gap-1.5"
						title="לוח ניהול"
					>
						👑 ניהול
					</a>
				{/if}
				<button
					onclick={() => signOut({ callbackUrl: "/" })}
					class="text-sm font-bold text-gray-400 hover:text-red-400 transition-colors cursor-pointer px-4 py-2 rounded-xl hover:bg-red-500/10 border border-white/10 hover:border-red-500/30"
					title={tFn("logout_btn")}
				>
					{tFn("logout_btn")}
				</button>
			</div>
		</div>
		<!-- נייד: שם(ימין)|אווטר(מרכז)|ארנק קטן(שמאל) | דסקטופ: RTL אווטר|ארנק|שם -->
		<div
			class="flex flex-wrap md:flex-nowrap items-stretch gap-3 md:gap-6 w-full"
			style="justify-content: space-between;"
		>
			<!-- אווטר + מעגל מילוי -->
			<div
				class="order-2 md:order-1 flex-shrink-0 flex flex-col items-center justify-between min-h-[120px] mr-2"
			>
				<div
					class="relative cursor-pointer"
					onmouseenter={() => (showRingTooltip = true)}
					onmouseleave={() => (showRingTooltip = false)}
					onmousemove={handleRingMouseMove}
					onclick={scrollToEditProfile}
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ")
							scrollToEditProfile();
					}}
					role="button"
					tabindex={0}
					aria-label={tFn(nextTipKey)}
				>
					{#if avatarPreview}
						<img
							src={avatarPreview}
							alt={tFn("profile_photo")}
							class="w-24 h-24 rounded-full border-2 border-purple-500/40 shadow-xl object-cover"
						/>
					{:else}
						<div
							class="w-24 h-24 rounded-full bg-gray-700
						            flex items-center justify-center border-2 border-gray-600 shadow-xl"
						>
							<svg
								viewBox="0 0 24 24"
								class="w-12 h-12 text-gray-400"
								fill="currentColor"
								xmlns="http://www.w3.org/2000/svg"
							>
								<circle cx="12" cy="8" r="4" />
								<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
							</svg>
						</div>
					{/if}

					<!-- מעגל מילוי פרופיל -->
					<svg
						class="absolute inset-0 w-full h-full -rotate-90 pointer-events-none"
						viewBox="0 0 92 92"
						xmlns="http://www.w3.org/2000/svg"
						use:ringObserver
					>
						<circle
							cx="46"
							cy="46"
							r="43"
							stroke="rgba(255,255,255,0.08)"
							stroke-width="3"
							fill="none"
						/>
						<circle
							cx="46"
							cy="46"
							r="43"
							stroke={ringColor}
							stroke-width="3"
							fill="none"
							stroke-linecap="round"
							stroke-dasharray={ringCircumference}
							stroke-dashoffset={ringCircumference *
								(1 - Math.min(animatedCompletion, 100) / 100)}
							style="filter: drop-shadow(0 0 4px {ringColor}88);"
						/>
					</svg>

					<!-- עיגול הודעות — שמאל מטה -->
					<button
						onclick={(e) => {
							e.stopPropagation();
							scrollToMessages();
						}}
						class="absolute -bottom-1 -left-1 px-2 h-[22px]
					       bg-orange-500 border-2 border-[#0f172a] rounded-full
					       flex items-center justify-center cursor-pointer
					       text-white text-[11px] font-black leading-none shadow-lg
					       hover:bg-orange-400 transition-colors whitespace-nowrap"
					>
						{unreadCount} הודעות
					</button>
				</div>

				<!-- תווית סטטוס מתחת לתמונה -->
				<div
					class="relative flex items-center gap-2 flex-wrap justify-center mt-auto pt-4"
				>
					<span class="text-base text-orange-400 font-bold"
						>סטטוס</span
					>
					{#if true}
						{@const currentStatus = statusOptions().find(
							(o) => o.value === status,
						)}
						<button
							type="button"
							onclick={() => (showStatusMenu = !showStatusMenu)}
							class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold cursor-pointer transition-all hover:scale-105
								{status === 'active'
								? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
								: 'bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30'}"
						>
							{currentStatus?.emoji ?? "🟢"}
							{currentStatus?.label ?? "פעיל/ה"} ▾
						</button>
					{/if}

					{#if showStatusMenu}
						<!-- backdrop -->
						<button
							type="button"
							class="fixed inset-0 z-40"
							onclick={() => (showStatusMenu = false)}
							aria-label="סגור תפריט"
						></button>
						<!-- תפריט -->
						<div
							class="absolute top-full mt-2 right-0 z-50 bg-[#0f172a] border border-white/15 rounded-2xl shadow-2xl p-2 min-w-[180px] flex flex-col gap-1"
						>
							{#each statusOptions() as opt}
								<button
									type="button"
									onclick={() => updateStatus(opt.value)}
									class="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer text-right
										{status === opt.value
										? 'bg-purple-600/30 text-white'
										: 'text-gray-300 hover:bg-white/8 hover:text-white'}"
								>
									{opt.emoji}
									{opt.label}
									{#if status === opt.value}<span
											class="mr-auto text-purple-400 text-xs"
											>✓</span
										>{/if}
								</button>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- הארנק שלי — גם בנייד בלשונית ראשי -->
			<a
				href="/receipts"
				class="order-3 md:order-2 flex-1 {mobileTab === 'main'
					? 'flex'
					: 'hidden md:flex'} flex-col items-center justify-between cursor-pointer group select-none no-underline"
			>
				<div
					class="w-20 md:w-52 group-hover:scale-105 transition-transform duration-200 md:-mt-8"
					style="-webkit-mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 80%); mask-image: radial-gradient(ellipse 60% 60% at 50% 50%, black 20%, transparent 80%);"
				>
					<img
						src="/images/wallet.png"
						alt="המזומן שלי"
						class="w-full h-auto block"
					/>
				</div>
				<span
					class="text-xs md:text-base text-gray-300 font-bold pt-1 md:pt-4 mt-auto text-center"
					>היתרה שלי:<br class="md:hidden" /><span
						class="text-green-400"
					>
						{(data.user as { balance?: number })?.balance ??
							0}₪</span
					></span
				>
			</a>

			<div
				class="order-1 md:order-3 min-w-0 flex-shrink-0 flex flex-col justify-between pl-4 md:pl-8"
			>
				<div class="flex flex-col gap-0.5">
					<div class="flex items-center gap-2">
						<h1
							class="text-2xl font-black truncate {data.user
								?.nickname || data.user?.name
								? 'text-white'
								: 'text-gray-500 italic'}"
						>
							{data.user?.nickname ||
								data.user?.name ||
								"צופה אנונימי"}
						</h1>
					</div>
					{#if data.user?.email}
						<p class="text-gray-400 text-sm">{data.user.email}</p>
					{/if}
					<p class="text-purple-400 text-sm">
						{#if data.user?.neighborhood || data.user?.city}
							📍 {[data.user.neighborhood, data.user.city]
								.filter(Boolean)
								.join(", ")}
						{:else}
							📍 שכונה לא ידועה
						{/if}
					</p>
				</div>
				<div class="flex-1 min-h-[24px]"></div>
				<div class="flex gap-3 mt-2 flex-wrap items-center">
					{#if data.items.length > 0}
						<span
							class="text-sm text-blue-400 font-bold"
						>
							{data.items.length}
							{tFn("publications_count")}
						</span>
					{/if}
					<span
						class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full
						       bg-amber-500/15 text-amber-300 border border-amber-500/30"
						title="מניות פלטפורמה"
					>
						📈 {userShares} מניות
					</span>
				</div>
				<div
					class="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition-opacity"
					onclick={scrollToLevels}
					onkeydown={(e) => {
						if (e.key === "Enter" || e.key === " ")
							scrollToLevels();
					}}
					role="button"
					tabindex={0}
				>
					<span class="text-white/50 text-base font-bold">דרגה:</span>
					{#if isUserAdmin}
						<span class="text-red-400 text-base font-black"
							>{(data.user as any)?.role === "super_admin"
								? "מנהל ראשי 👑"
								: "אדמין שכונתי 🛡️"}</span
						>
					{:else if (data.user as any)?.coordinator_of?.length > 0}
						<span class="text-amber-400 text-base font-black"
							>רכז שכונה 🏘️</span
						>
					{:else if userLevel >= 2}
						<span class="text-emerald-400 text-base font-black"
							>משתמש</span
						>
					{:else}
						<span class="text-gray-400 text-base font-black"
							>צופה</span
						>
					{/if}
				</div>
			</div>
		</div>
		<div class="mt-2"></div>
	</div>

	<!-- ===== קומה 2: פרטי פרופיל ===== -->
	<div
		id="sec-edit-profile"
		class="relative bg-[#0f172a] rounded-3xl border border-white/10 p-4 md:p-6 mb-2 shadow-xl overflow-hidden
	            before:absolute before:inset-x-0 before:top-0 before:h-24 before:rounded-t-3xl
	            before:bg-gradient-to-b before:from-white/8 before:to-transparent
	            before:transition-all before:duration-300 before:pointer-events-none
	            hover:before:from-white/18 {mobileTab !== 'profile'
			? 'hidden md:block'
			: ''}"
	>
		<div
			class="relative flex items-center justify-between cursor-pointer select-none -mx-4 px-4 -mt-4 pt-3 md:-mx-6 md:px-6 md:-mt-6 md:pt-4 {isEditing
				? 'pb-4 mb-4'
				: 'pb-4'}"
			onclick={() => {
				if (isEditing) {
					isEditing = false;
					saveSuccess = false;
				} else {
					isEditing = true;
				}
			}}
			onmouseenter={() => {
				secTipShow = true;
				secTipIsOpen = isEditing;
			}}
			onmouseleave={() => (secTipShow = false)}
			onmousemove={(e) => handleSecMouseMove(e, isEditing)}
			role="button"
			tabindex={0}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					if (isEditing) {
						isEditing = false;
						saveSuccess = false;
					} else {
						isEditing = true;
					}
				}
			}}
		>
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span
					class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>2</span
				>
				{tFn("section_profile_details")}
			</h2>
			<div class="flex items-center gap-2">
				<span
					class="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full font-bold"
					>{profileCompletion}% הושלם</span
				>
				<svg
					class="w-4 h-4 text-yellow-400 transition-transform duration-300 flex-shrink-0 {isEditing
						? 'rotate-180'
						: ''}"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					><polyline points="6 9 12 15 18 9" /></svg
				>
			</div>
		</div>

		{#if isEditing}
			<form
				method="POST"
				action="?/updateProfile"
				enctype="multipart/form-data"
				use:enhance={() => {
					return async ({ result, update }) => {
						if (result.type === "success") {
							isEditing = false;
							saveSuccess = true;
							clearDraft();
							// סנכרן שכונה ועיר לstate המשותף → מעדכן דף הבית + מפה
							if (neighborhood && city) {
								neighborhoodState.select(neighborhood, city);
							}
							setTimeout(() => (saveSuccess = false), 3000);
							// גלול למעלה לאט כדי שהמשתמש יראה את עדכון האחוזים במעגל
							setTimeout(() => slowScrollTo(0, 1400), 150);
						} else {
							await update();
						}
					};
				}}
			>
				<!-- שדה נסתר לתמונה -->
				<input
					type="hidden"
					name="avatar_base64"
					value={avatarBase64}
				/>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-5">
					<!-- שם מלא -->
					<div>
						<label
							for="p-name"
							class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
							>{tFn("full_name_label")}</label
						>
						{#if isEditing}
							<input
								id="p-name"
								name="name"
								type="text"
								bind:value={name}
								placeholder={tFn("full_name_placeholder")}
								required
								class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none"
							/>
						{:else}
							<p class="text-white font-medium py-3 px-1">
								{name || "—"}
							</p>
						{/if}
					</div>

					<!-- אימייל -->
					<div>
						<label
							for="email"
							class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
							>{tFn("email")}</label
						>
						{#if isEditing}
							<input
								id="email"
								name="email"
								type="email"
								bind:value={email}
								autocomplete="email"
								class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none"
							/>
						{:else}
							<p class="text-white font-medium py-3 px-1">
								{email || "—"}
							</p>
						{/if}
					</div>

					<!-- תמונת פרופיל -->
					{#if isEditing}
						<div class="md:col-span-2 flex items-center gap-5">
							<div class="relative flex-shrink-0">
								{#if avatarPreview}
									<img
										src={avatarPreview}
										alt={tFn("profile_photo")}
										class="w-20 h-20 rounded-full object-cover border-4 border-purple-500/40"
									/>
								{:else}
									<div
										class="w-20 h-20 rounded-full bg-gray-700
							            flex items-center justify-center border-4 border-gray-600"
									>
										<svg
											viewBox="0 0 24 24"
											class="w-12 h-12 text-gray-400"
											fill="currentColor"
											xmlns="http://www.w3.org/2000/svg"
										>
											<circle cx="12" cy="8" r="4" />
											<path
												d="M4 20c0-4 3.6-7 8-7s8 3 8 7"
											/>
										</svg>
									</div>
								{/if}
							</div>
							<div>
								<p class="text-xs text-gray-400 font-bold mb-2">
									{tFn("profile_photo")}
								</p>
								{#if saveSuccess}
									<p
										class="text-green-400 text-xs font-bold mb-2 flex items-center gap-1"
									>
										<span>✓</span>
										{tFn("profile_updated")}
									</p>
								{/if}
								<div class="flex flex-wrap gap-2">
									<label
										class="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/10
							              hover:border-purple-500/40 rounded-xl px-4 py-2 text-sm text-gray-300
							              transition-all inline-block"
									>
										{tFn("choose_photo")}
										<input
											type="file"
											accept="image/*"
											class="hidden"
											aria-label={tFn("choose_photo")}
											onchange={handleImageChange}
										/>
									</label>
									<!-- כפתור גוגל - תמיד פעיל -->
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											signIn("google", {
												callbackUrl:
													"/profile?copy_photo=1",
											});
										}}
										class="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/15 hover:border-red-400/50 rounded-xl px-3 py-2 text-sm text-gray-200 transition-all inline-flex items-center gap-2"
									>
										<img
											src="https://www.google.com/favicon.ico"
											class="w-4 h-4"
											alt="Google"
										/>
										העתק מחשבון גוגל
									</button>
									<!-- כפתור פייסבוק - תמיד פעיל -->
									<button
										type="button"
										onclick={(e) => {
											e.stopPropagation();
											showSocialPhotoModal = "facebook";
											socialPhotoInput = "";
											socialPhotoError = "";
										}}
										class="cursor-pointer bg-white/5 hover:bg-white/10 border border-white/15 hover:border-blue-400/50 rounded-xl px-3 py-2 text-sm text-gray-200 transition-all inline-flex items-center gap-2"
									>
										<img
											src="https://www.facebook.com/favicon.ico"
											class="w-4 h-4"
											alt="Facebook"
										/>
										העתק מחשבון פייסבוק
									</button>
								</div>
							</div>
						</div>
					{/if}

					<!-- כינוי -->
					<div>
						<label
							for="p-nickname"
							class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
							>{tFn("nickname_label")}</label
						>
						{#if isEditing}
							<input
								id="p-nickname"
								name="nickname"
								type="text"
								bind:value={nickname}
								placeholder={tFn("nickname_placeholder")}
								class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none"
							/>
						{:else}
							<p class="text-white font-medium py-3 px-1">
								{nickname || "—"}
							</p>
						{/if}
					</div>

					<!-- מגדר -->
					<div>
						<p
							id="gender-label"
							class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
						>
							{tFn("gender_label")}
						</p>
						{#if isEditing}
							<div
								class="flex gap-3"
								role="group"
								aria-labelledby="gender-label"
							>
								<button
									type="button"
									onclick={() => (gender = "male")}
									aria-pressed={gender === "male"}
									class="flex-1 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer
								       {gender === 'male'
										? 'bg-blue-600/30 border-blue-500/60 text-blue-300'
										: 'bg-white/5 border-white/10 text-gray-400 hover:border-blue-500/30 hover:text-blue-300'}"
								>
									{tFn("male")}
								</button>
								<button
									type="button"
									onclick={() => (gender = "female")}
									aria-pressed={gender === "female"}
									class="flex-1 py-3 rounded-xl border font-bold text-sm transition-all cursor-pointer
								       {gender === 'female'
										? 'bg-pink-600/30 border-pink-500/60 text-pink-300'
										: 'bg-white/5 border-white/10 text-gray-400 hover:border-pink-500/30 hover:text-pink-300'}"
								>
									{tFn("female")}
								</button>
							</div>
							<input type="hidden" name="gender" value={gender} />
						{:else}
							<p class="text-white font-medium py-3 px-1">
								{gender === "male"
									? tFn("male")
									: gender === "female"
										? tFn("female")
										: "—"}
							</p>
						{/if}
					</div>

					<!-- טלפון -->
					<div>
						<label
							for="p-phone"
							class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
							>{tFn("phone_label")}</label
						>
						{#if isEditing}
							<input
								id="p-phone"
								name="phone"
								type="tel"
								bind:value={phone}
								placeholder="050-0000000"
								class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none"
							/>
						{:else}
							<p class="text-white font-medium py-3 px-1">
								{phone || "—"}
							</p>
						{/if}
					</div>

					<!-- עיר + שכונה — תמיד ביחד -->
					<div
						class="md:col-span-2 grid grid-cols-2 gap-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 p-3"
					>
						<!-- עיר -->
						<div>
							<label
								for="p-city"
								class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
							>
								{tFn("city_label")}
								<span class="text-red-400">*</span>
							</label>
							{#if isEditing}
								<select
									id="p-city"
									name="city"
									bind:value={city}
									onchange={() => { neighborhood = ""; locationInteracted = true; }}
									onfocus={() => (locationInteracted = true)}
									required
									class="w-full bg-[#070b14] border {!city
										? 'border-red-500/50'
										: 'border-white/10'} focus:border-purple-500/50 rounded-xl
								       px-4 py-3 text-white text-sm transition-colors outline-none appearance-none"
								>
									<option value=""
										>{tFn("choose_city")}</option
									>
									{#each data.citiesData as CityEntry[] as c}
										<option value={c.city}>{c.city}</option>
									{/each}
								</select>
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{city || "—"}
								</p>
							{/if}
						</div>
						<!-- שכונה -->
						<div>
							<label
								for="p-neighborhood"
								class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
							>
								{tFn("neighborhood_label")}
								<span class="text-red-400">*</span>
							</label>
							{#if isEditing}
								<select
									id="p-neighborhood"
									name="neighborhood"
									bind:value={neighborhood}
									onfocus={() => (locationInteracted = true)}
									onchange={() => (locationInteracted = true)}
									disabled={!city}
									required
									class="w-full bg-[#070b14] border {!neighborhood
										? 'border-red-500/50'
										: 'border-white/10'} focus:border-purple-500/50 rounded-xl
								       px-4 py-3 text-white text-sm transition-colors outline-none appearance-none
								       disabled:opacity-40 disabled:cursor-not-allowed"
								>
									<option value=""
										>{tFn("choose_neighborhood")}</option
									>
									{#each availableNeighborhoods as n}
										<option value={n}>{n}</option>
									{/each}
								</select>
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{neighborhood || "—"}
								</p>
							{/if}
						</div>

						<!-- מיקום שאינו מופיע ברשימה — בתוך אותה מסגרת -->
						{#if isEditing}
							<div
								class="col-span-2 border-t border-purple-500/15 pt-3 mt-1 transition-all duration-500"
							>
								<label
									for="p-custom-location"
									class="flex items-center gap-2 font-bold mb-1.5 transition-colors duration-500
									       {locationInteracted ? 'text-sm text-yellow-300' : 'text-xs text-gray-400 uppercase tracking-wider'}"
								>
									{#if locationInteracted}
										<span class="relative flex h-2.5 w-2.5">
											<span
												class="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"
											></span>
											<span
												class="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-400"
											></span>
										</span>
									{/if}
									📍 {locationInteracted ? 'לא מצאת את העיר או השכונה שלך ברשימה?' : 'מיקום שאינו מופיע ברשימה?'}
								</label>
								<p class="text-gray-500 text-xs mb-2 leading-relaxed">
									כתוב כאן את העיר והשכונה שלך — הבקשה תישלח
									מיד למנהל האתר ותתווסף לרשימה.
								</p>
								<input
									id="p-custom-location"
									name="custom_location"
									type="text"
									bind:value={customLocation}
									placeholder="לדוגמה: רמת השרון, שכונת הצפון..."
									class="w-full bg-[#070b14] border rounded-xl px-4 py-3 text-white text-sm
							       transition-all duration-500 outline-none placeholder:text-white/20
							       focus:border-yellow-500/70 focus:shadow-[0_0_18px_2px_rgba(250,204,21,0.25)]
							       {locationInteracted ? 'border-yellow-500/40 custom-loc-glow' : 'border-white/10'}"
								/>
							</div>
						{/if}
					</div>
					<!-- סגירת מסגרת עיר+שכונה -->

					<!-- עסק + סטטוס משפחתי + תאריך לידה — שורה אחת בדסקטופ -->
					<div
						class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5"
					>
						<div>
							<label
								for="p-business"
								class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
								>{tFn("business_label")}</label
							>
							{#if isEditing}
								<input
									id="p-business"
									name="business"
									type="text"
									bind:value={business}
									placeholder={tFn("business_placeholder")}
									class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm transition-colors outline-none placeholder:text-white/15 hover:placeholder:text-transparent focus:placeholder:text-transparent placeholder:transition-colors placeholder:duration-200"
								/>
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{business || "—"}
								</p>
							{/if}
						</div>

						<!-- סטטוס משפחתי -->
						<div>
							<label
								for="p-family-status"
								class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
								>{tFn("family_status_label")}</label
							>
							{#if isEditing}
								<select
									id="p-family-status"
									name="family_status"
									bind:value={family_status}
									class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none appearance-none"
								>
									<option value="single_m"
										>{tFn("status_single_m")}</option
									>
									<option value="single_f"
										>{tFn("status_single_f")}</option
									>
									<option value="family"
										>{tFn("status_family")}</option
									>
								</select>
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{family_status === "single_m"
										? tFn("status_single_m")
										: family_status === "single_f"
											? tFn("status_single_f")
											: family_status === "family"
												? tFn("status_family")
												: "—"}
								</p>
							{/if}
							<p class="text-gray-600 text-xs mt-1 px-1">
								{tFn("not_shown_public")}
							</p>
						</div>

						<!-- תאריך לידה — באותה שורה עם עסק וסטטוס -->
						<div>
							<label
								for="p-birth-day"
								class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
								>{tFn("birth_date_label")}</label
							>
							{#if isEditing}
								<div class="flex gap-1.5">
									<label for="p-birth-day" class="sr-only"
										>יום לידה</label
									>
									<select
										id="p-birth-day"
										name="birth_day"
										bind:value={birthDay}
										class="flex-1 bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-2 py-3 text-white text-sm outline-none appearance-none text-center"
									>
										<option value=""
											>{tFn("birth_day")}</option
										>
										{#each Array.from({ length: 31 }, (_, i) => i + 1) as d}
											<option value={String(d)}
												>{d}</option
											>
										{/each}
									</select>
									<label for="p-birth-month" class="sr-only"
										>חודש לידה</label
									>
									<select
										id="p-birth-month"
										name="birth_month"
										bind:value={birthMonth}
										class="flex-[1.5] bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-2 py-3 text-white text-sm outline-none appearance-none text-center"
									>
										<option value=""
											>{tFn("birth_month")}</option
										>
										{#each tFn("months_list").split(",") as month, i}
											<option value={String(i + 1)}
												>{month}</option
											>
										{/each}
									</select>
									<label for="p-birth-year" class="sr-only"
										>שנת לידה</label
									>
									<select
										id="p-birth-year"
										name="birth_year"
										bind:value={birthYear}
										class="flex-1 bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-2 py-3 text-white text-sm outline-none appearance-none text-center"
									>
										<option value=""
											>{tFn("birth_year")}</option
										>
										{#each Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i) as y}
											<option value={String(y)}
												>{y}</option
											>
										{/each}
									</select>
								</div>
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{birthDay && birthMonth && birthYear
										? `${birthDay} / ${tFn("months_list").split(",")[parseInt(birthMonth) - 1]} / ${birthYear}`
										: "—"}
								</p>
							{/if}
							<p class="text-gray-600 text-xs mt-1 px-1">
								{tFn("not_shown_public")}
							</p>
						</div>
					</div>

					<!-- סטטוס — מוצג לקהילה -->
					<div class="md:col-span-2">
						<label
							class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
						>
							🟢 סטטוס <span
								class="text-purple-400 text-xs font-normal normal-case"
								>(גלוי לכל הקהילה)</span
							>
						</label>
						{#if isEditing}
							<div class="flex flex-wrap gap-2">
								{#each statusOptions() as opt}
									<button
										type="button"
										onclick={() => (status = opt.value)}
										class="px-3 py-2 rounded-xl border text-sm font-bold transition-all cursor-pointer
										{status === opt.value
											? 'bg-purple-600/30 border-purple-500 text-white'
											: 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/40 hover:text-white'}"
									>
										{opt.emoji}
										{opt.label}
									</button>
								{/each}
							</div>
							<input type="hidden" name="status" value={status} />
						{:else}
							<p class="text-white font-medium py-3 px-1">
								{statusOptions().find((o) => o.value === status)
									?.emoji ?? "🟢"}
								{statusOptions().find((o) => o.value === status)
									?.label ?? "פעיל/ה"}
							</p>
						{/if}
					</div>

					<!-- שאלת ביטחון + התראות — שורה אחת -->
					<div
						class="md:col-span-2 grid md:grid-cols-2 gap-4 items-start"
					>
						<!-- שאלת ביטחון — אופציונלי -->
						<div>
							<label
								class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
							>
								🛡️ שאלת ביטחון <span
									class="text-purple-400 text-xs font-normal normal-case"
									>(אופציונלי — לשחזור סיסמה)</span
								>
							</label>
							{#if isEditing}
								<select
									name="security_question"
									bind:value={security_question}
									class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none mb-2"
								>
									<option value="">— בחר שאלה —</option>
									<option value="שם הרחוב שגדלת בו"
										>שם הרחוב שגדלת בו</option
									>
									<option value="שם החיה הראשונה שלך"
										>שם החיה הראשונה שלך</option
									>
									<option value="שם בית הספר היסודי שלך"
										>שם בית הספר היסודי שלך</option
									>
									<option value="עיר הולדתך"
										>עיר הולדתך</option
									>
									<option
										value="שם משפחה של אמא לפני הנישואים"
										>שם משפחה של אמא לפני הנישואים</option
									>
								</select>
								{#if security_question}
									<input
										type="text"
										name="security_answer"
										bind:value={security_answer}
										placeholder="תשובה (לא תוצג בפומבי)"
										class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-white/20"
									/>
								{/if}
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{security_question || "—"}
								</p>
							{/if}
							<p class="text-gray-400 text-sm mt-1 px-1">
								משמש לאימות זהות בעת שחזור סיסמה
							</p>
						</div>

						<!-- התראות -->
						<div>
							<p
								class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-3"
							>
								{tFn("notifications_label")}
							</p>
							{#if isEditing}
								<label
									class="flex items-center gap-3 cursor-pointer group"
								>
									<div class="relative" dir="ltr">
										<input
											type="checkbox"
											bind:checked={notifications}
											id="notifications-toggle"
											role="switch"
											aria-checked={notifications}
											class="sr-only peer"
											onchange={(e) =>
												handleNotificationsToggle(
													(
														e.target as HTMLInputElement
													).checked,
												)}
										/>
										<div
											class="w-12 h-7 bg-gray-700 rounded-full peer-checked:bg-green-500
								            transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5
								            after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all
								            peer-checked:after:translate-x-5 shadow-inner"
										></div>
									</div>
									<span
										class="text-sm transition-colors {notifications
											? 'text-green-400 font-bold'
											: 'text-gray-500'}"
									>
										{notifications
											? "✅ מסכים לקבל התראות מחברי השכונה בשעת צרה"
											: "❌ לא מסכים לקבל התראות"}
									</span>
								</label>
								<input
									type="hidden"
									name="notifications"
									value={notifications ? "true" : "false"}
								/>
							{:else}
								<p
									class="text-white font-medium py-1 px-1 flex items-center gap-2"
								>
									{#if notifications}
										<span class="text-green-400">✅</span>
										{tFn("notifications_yes")}
									{:else}
										<span class="text-gray-500">❌</span>
										{tFn("notifications_no")}
									{/if}
								</p>
							{/if}
						</div>
					</div>
					<!-- סוף grid שאלת ביטחון + התראות -->
				</div>

				{#if isEditing}
					<div class="mt-2 flex flex-col gap-3 items-end">
						<label class="flex items-center gap-3 cursor-pointer">
							<input
								type="checkbox"
								bind:checked={termsAccepted}
								onchange={() => {
									if (termsAccepted) {
										showTermsError = false;
										try {
											localStorage.setItem(
												"terms_accepted",
												"1",
											);
										} catch {}
									}
								}}
								class="w-4 h-4 accent-purple-500 cursor-pointer flex-shrink-0"
							/>
							<span class="text-sm text-gray-300">
								{tFn("terms_agree_prefix")}
								<a
									href="/about/legal"
									target="_blank"
									class="text-purple-400 hover:underline"
									>תנאי השימוש ומדיניות הפרטיות</a
								>
								{tFn("terms_agree_suffix")}
							</span>
						</label>
						{#if showTermsError}
							<p class="text-red-400 text-xs font-bold">
								יש לאשר את תנאי השימוש ומדיניות הפרטיות לפני
								השמירה
							</p>
						{/if}
						{#if form?.error}
							<p class="text-red-400 text-xs font-bold">
								{form.error}
							</p>
						{/if}
						<button
							type="submit"
							onclick={(e) => {
								if (!termsAccepted) {
									e.preventDefault();
									showTermsError = true;
									return;
								}
								if (!city || !neighborhood) {
									e.preventDefault();
									alert("יש למלא עיר ושכונה לפני השמירה");
									return;
								}
							}}
							class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
						       text-white font-black px-8 py-3 rounded-2xl shadow-xl text-sm transition-all hover:-translate-y-0.5
						       cursor-pointer"
						>
							{tFn("save_changes")}
						</button>
					</div>
				{/if}
			</form>
		{/if}
	</div>

	<!-- ===== קומה 3: דרגה והרשאות ===== -->
	<div
		id="sec-levels"
		class="relative bg-[#0f172a] rounded-3xl border border-white/10 p-4 md:p-6 shadow-xl mb-2 overflow-hidden
	            before:absolute before:inset-x-0 before:top-0 before:h-24 before:rounded-t-3xl
	            before:bg-gradient-to-b before:from-white/8 before:to-transparent
	            before:transition-all before:duration-300 before:pointer-events-none
	            hover:before:from-white/18 group/sec3 {mobileTab !== 'levels'
			? 'hidden md:block'
			: ''}"
	>
		<div
			class="relative flex items-center justify-between cursor-pointer select-none transition-all
			       -mx-4 px-4 -mt-4 pt-3 md:-mx-6 md:px-6 md:-mt-6 md:pt-4 pb-4 min-h-14
			       {showLevels ? 'mb-5' : ''}"
			onclick={() => {
				showLevels = !showLevels;
			}}
			onmouseenter={() => {
				secTipShow = true;
				secTipIsOpen = showLevels;
			}}
			onmouseleave={() => (secTipShow = false)}
			onmousemove={(e) => handleSecMouseMove(e, showLevels)}
			role="button"
			tabindex={0}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ")
					showLevels = !showLevels;
			}}
		>
			<h2
				class="relative text-xl font-black text-white flex items-center gap-2"
			>
				<span
					class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>3</span
				>
				דרגה והרשאות
			</h2>
			<!-- סיכום דרגה נוכחית -->
			<div class="flex items-center gap-2">
				{#if isUserAdmin}
					<span
						class="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full font-bold"
						>דרגה נוכחית — רכז שכונה</span
					>
				{:else if userLevel >= 2}
					<span
						class="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full font-bold"
						>דרגה נוכחית — משתמש</span
					>
				{:else}
					<span
						class="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full font-bold"
						>דרגה נוכחית — צופה</span
					>
				{/if}
				<svg
					class="w-4 h-4 text-yellow-400 transition-transform duration-300 flex-shrink-0 {showLevels
						? 'rotate-180'
						: ''}"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					><polyline points="6 9 12 15 18 9" /></svg
				>
			</div>
		</div>

		{#if showLevels}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- דרגה 1: צופה -->
				<div
					class="relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all
			            {userLevel >= 1
						? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
						: 'border-white/10 bg-white/3 opacity-60'}"
				>
					{#if userLevel >= 1}
						<div
							class="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-emerald-500 border-[3px] border-[#0f172a] flex items-center justify-center shadow-lg shadow-emerald-500/50 z-10"
						>
							<span
								class="text-white font-black text-lg leading-none"
								>✓</span
							>
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<span
							class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0
					             {userLevel >= 1
								? 'bg-emerald-500 text-white'
								: 'bg-white/10 text-gray-400'}">1</span
						>
						<span class="font-black text-white text-base">צופה</span
						>
						{#if userLevel === 1}
							<span
								class="mr-auto text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold"
								>הדרגה שלך</span
							>
						{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center gap-1.5">
							<span class="text-emerald-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>כניסה וצפיה באתר</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-red-400 text-sm">✕</span>
							<span class="text-gray-200 text-xs"
								>משתתף במשאלי עם שכונתיים</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-red-400 text-sm">✕</span>
							<span class="text-gray-200 text-xs">העלאת תוכן</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-red-400 text-sm">✕</span>
							<span class="text-gray-200 text-xs">ניהול תוכן</span
							>
						</div>
					</div>
				</div>

				<!-- דרגה 2: משתמש -->
				<div
					class="relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all
			            {userLevel >= 2
						? 'border-purple-500 bg-purple-500/10 shadow-lg shadow-purple-500/10'
						: 'border-white/10 bg-white/3 opacity-60'}"
				>
					{#if userLevel >= 2}
						<div
							class="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-purple-500 border-[3px] border-[#0f172a] flex items-center justify-center shadow-lg shadow-purple-500/50 z-10"
						>
							<span
								class="text-white font-black text-lg leading-none"
								>✓</span
							>
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<span
							class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0
					             {userLevel >= 2
								? 'bg-purple-500 text-white'
								: 'bg-white/10 text-gray-400'}">2</span
						>
						<span class="font-black text-white text-base"
							>משתמש</span
						>
						{#if userLevel === 2}
							<span
								class="mr-auto text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold"
								>הדרגה שלך</span
							>
						{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center gap-1.5">
							<span class="text-purple-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>כניסה וצפיה באתר</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-purple-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>העלאת תוכן</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-purple-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>משתתף במשאלי עם שכונתיים</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-red-400 text-sm">✕</span>
							<span class="text-gray-200 text-xs">ניהול תוכן</span
							>
						</div>
					</div>
					{#if userLevel < 2}
						<p class="text-yellow-500/70 text-[11px]">
							נדרש: מילוי כל שדות הפרופיל
						</p>
					{/if}
				</div>

				<!-- דרגה 3: רכז שכונה -->
				<a
					href={isUserAdmin ? "/admin" : undefined}
					class="relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all no-underline
		       {isUserAdmin
						? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 hover:bg-blue-500/20 cursor-pointer'
						: 'border-white/10 bg-white/3 opacity-60 pointer-events-none'}"
					title={isUserAdmin ? "ערוך את הפרטים בשכונה שלך" : ""}
				>
					{#if isUserAdmin}
						<div
							class="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-blue-500 border-[3px] border-[#0f172a] flex items-center justify-center shadow-lg shadow-blue-500/50 z-10"
						>
							<span
								class="text-white font-black text-lg leading-none"
								>✓</span
							>
						</div>
					{/if}
					<div class="flex items-center gap-2">
						<span
							class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0
			             {isUserAdmin
								? 'bg-blue-500 text-white'
								: 'bg-white/10 text-gray-400'}">3</span
						>
						<span class="font-black text-white text-base"
							>רכז שכונה</span
						>
						{#if isUserAdmin}
							<span
								class="mr-auto text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold"
								>הדרגה שלך</span
							>
						{/if}
						{#if isSuperAdmin}
							<a
								href="/admin"
								class="mt-2 bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-full font-bold text-center no-underline hover:bg-red-500/30 transition-colors"
							>
								פאנל ניהול ראשי 👑
							</a>
						{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center gap-1.5">
							<span class="text-blue-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>כניסה וצפיה באתר</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-blue-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>העלאת תוכן</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-blue-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>משתתף במשאלי עם שכונתיים</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-blue-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>ניהול תוכן</span
							>
						</div>
					</div>
				</a>
			</div>
		{/if}
	</div>

	<!-- ===== קומה 4: הודעות אישיות ===== -->
	<div
		id="sec-messages"
		class="relative bg-[#0f172a] rounded-3xl border border-white/10 p-4 md:p-6 shadow-xl mb-2 overflow-hidden
	            before:absolute before:inset-x-0 before:top-0 before:h-24 before:rounded-t-3xl
	            before:bg-gradient-to-b before:from-white/8 before:to-transparent
	            before:transition-all before:duration-300 before:pointer-events-none
	            hover:before:from-white/18 {!showMessages
			? 'cursor-pointer'
			: ''} {mobileTab !== 'messages' ? 'hidden md:block' : ''}"
		onclick={() => {
			if (!showMessages) showMessages = true;
		}}
	>
		<div
			class="relative flex items-center justify-between cursor-pointer select-none -mx-4 px-4 -mt-4 pt-3 md:-mx-6 md:px-6 md:-mt-6 md:pt-4 min-h-14 {showMessages
				? 'pb-4 mb-4'
				: 'pb-4'}"
			onclick={(e) => {
				e.stopPropagation();
				showMessages = !showMessages;
			}}
			role="button"
			tabindex={0}
			onmouseenter={() => {
				secTipShow = true;
				secTipIsOpen = showMessages;
			}}
			onmouseleave={() => (secTipShow = false)}
			onmousemove={(e) => handleSecMouseMove(e, showMessages)}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					if (showMessages) {
						showMessages = false;
					} else {
						showMessages = true;
					}
				}
			}}
		>
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span
					class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>4</span
				>
				הודעות אישיות
			</h2>
			<div class="flex items-center gap-2">
				<span
					class="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full font-bold"
					>{unreadCount} הודעות שלא נקראו</span
				>
				<svg
					class="w-4 h-4 text-yellow-400 transition-transform duration-300 flex-shrink-0 {showMessages
						? 'rotate-180'
						: ''}"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					><polyline points="6 9 12 15 18 9" /></svg
				>
			</div>
		</div>

		{#if showMessages}
			<div
				class="flex flex-col gap-3"
				onclick={(e) => e.stopPropagation()}
			>
				{#each messages as msg}
					<div
						class="flex items-start gap-3 bg-white/5 rounded-2xl border {msg.read
							? 'border-white/5'
							: 'border-orange-500/20'} px-4 py-3 transition-all hover:border-white/15"
					>
						<div
							class="w-2 h-2 rounded-full {msg.read
								? 'bg-white/10'
								: 'bg-orange-500'} mt-1.5 flex-shrink-0"
						></div>
						<div class="min-w-0 flex-1">
							<div
								class="flex items-center justify-between gap-2 mb-0.5"
							>
								<span class="text-white text-xs font-black"
									>{msg.from}</span
								>
								<span
									class="text-gray-600 text-[10px] flex-shrink-0"
									>{msg.time}</span
								>
							</div>
							<p class="text-gray-300 text-xs">{msg.text}</p>
						</div>
					</div>
				{/each}

				<!-- קריאות שכונה שפרסמתי -->
				{#if (data.communityRequests ?? []).length > 0}
					<div class="mt-2 mb-1">
						<p class="text-xs font-black text-orange-400 mb-2 px-1">קריאות שכונה שפרסמתי</p>
						<div class="flex flex-col gap-2">
							{#each data.communityRequests as req}
								<div class="flex items-start gap-3 bg-orange-500/5 rounded-2xl border border-orange-500/20 px-4 py-3">
									<span class="text-xl flex-shrink-0">{req.icon ?? '🆘'}</span>
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between gap-2 mb-0.5">
											<span class="text-white text-xs font-black">{req.label}</span>
											<span class="text-gray-600 text-[10px] flex-shrink-0">{new Date(req.created_at).toLocaleDateString('he-IL')}</span>
										</div>
										{#if req.description}
											<p class="text-gray-400 text-xs line-clamp-2">{req.description}</p>
										{/if}
										<span class="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold
											{req.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}">
											{req.status === 'active' ? 'פעיל' : req.status}
										</span>
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}

				<!-- המלצות מותאמות אישית -->
				{#if business || family_status === "single_m" || family_status === "single_f" || whatsappMatches.length > 0}
					{@const allRecs = [
						...(business
							? [
									{
										id: "biz",
										emoji: "🏪",
										title: "מועדון בעלי העסקים הכשרים",
										sub: "הצטרף לרשת בעלי העסקים הכשרים בישראל",
										href: "https://index-chi-sage.vercel.app/",
										external: true,
										color: "amber",
									},
								]
							: []),
						...(family_status === "single_m" ||
						family_status === "single_f"
							? [
									{
										id: "singles",
										emoji: "💑",
										title: "רשימת הפנויים והפנויות הארצית",
										sub: "הצטרף לרשימה ומצא את השידוך המתאים",
										href: "/national/singles",
										external: false,
										color: "pink",
									},
								]
							: []),
						...whatsappMatches.map((g) => ({
							id: "wa_" + g.label,
							emoji: "💬",
							title: g.label,
							sub: "הצטרף לקבוצת הווטסאפ של השכונה שלך",
							href: g.url,
							external: true,
							color: "green",
						})),
					]}
					{@const visibleRecs = allRecs.filter((r) =>
						isRecVisible(r.id),
					)}
					{#if visibleRecs.length > 0}
						<div class="mt-2 flex flex-col gap-3">
							<p
								class="text-xs text-gray-400 uppercase tracking-widest font-bold"
							>
								המלצות עבורך
							</p>
							{#each visibleRecs as rec}
								<div
									class="rounded-2xl border px-4 pt-4 pb-3
					{rec.color === 'amber'
										? 'bg-amber-500/10 border-amber-500/30'
										: rec.color === 'pink'
											? 'bg-pink-500/10  border-pink-500/30'
											: 'bg-green-500/10 border-green-500/30'}"
								>
									<!-- תוכן -->
									<div class="flex items-center gap-3 mb-3">
										<span class="text-3xl flex-shrink-0"
											>{rec.emoji}</span
										>
										<div class="flex-1 text-right">
											<p
												class="text-white font-bold text-sm"
											>
												{rec.title}
											</p>
											<p
												class="text-xs mt-0.5
								{rec.color === 'amber'
													? 'text-amber-300/80'
													: rec.color === 'pink'
														? 'text-pink-300/80'
														: 'text-green-300/80'}"
											>
												{rec.sub} ←
											</p>
										</div>
									</div>
									<!-- כפתורי פעולה -->
									<div
										class="flex items-center gap-2 justify-end border-t border-white/8 pt-2.5"
									>
										<button
											type="button"
											onclick={() => dismissRec(rec.id)}
											class="text-[11px] text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
										>
											🗑 מחק
										</button>
										<button
											type="button"
											onclick={() => snoozeRec(rec.id)}
											class="text-[11px] text-gray-500 hover:text-yellow-300 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-500/10"
										>
											🔔 הזכר לי מאוחר יותר
										</button>
										<a
											href={rec.href}
											target={rec.external
												? "_blank"
												: "_self"}
											rel={rec.external
												? "noopener noreferrer"
												: ""}
											class="text-[11px] font-bold text-white px-3 py-1 rounded-lg
							{rec.color === 'amber'
												? 'bg-amber-500/25 hover:bg-amber-500/40'
												: rec.color === 'pink'
													? 'bg-pink-500/25  hover:bg-pink-500/40'
													: 'bg-green-500/25 hover:bg-green-500/40'} transition-colors"
										>
											עבור אל ←
										</a>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
		{/if}
	</div>
	<!-- ===== קומה 5: כתוב למערכת ===== -->
	<div
		class="relative bg-[#0f172a] rounded-3xl border border-white/10 p-4 md:p-6 shadow-xl mb-2 overflow-hidden
	            before:absolute before:inset-x-0 before:top-0 before:h-24 before:rounded-t-3xl
	            before:bg-gradient-to-b before:from-white/8 before:to-transparent
	            before:transition-all before:duration-300 before:pointer-events-none
	            hover:before:from-white/18 {mobileTab !== 'messages'
			? 'hidden md:block'
			: ''}"
	>
		<div
			class="relative flex items-center justify-between cursor-pointer select-none -mx-4 px-4 -mt-4 pt-3 md:-mx-6 md:px-6 md:-mt-6 md:pt-4 min-h-14 {showFeedback
				? 'pb-4 mb-4'
				: 'pb-4'}"
			onclick={() => {
				showFeedback = !showFeedback;
			}}
			onmouseenter={() => {
				secTipShow = true;
				secTipIsOpen = showFeedback;
			}}
			onmouseleave={() => (secTipShow = false)}
			onmousemove={(e) => handleSecMouseMove(e, showFeedback)}
			role="button"
			tabindex={0}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ")
					showFeedback = !showFeedback;
			}}
		>
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span
					class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>5</span
				>
				כתוב למערכת
			</h2>
			<svg
				class="w-4 h-4 text-yellow-400 transition-transform duration-300 flex-shrink-0 {showFeedback
					? 'rotate-180'
					: ''}"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2.5"
				stroke-linecap="round"
				stroke-linejoin="round"
				><polyline points="6 9 12 15 18 9" /></svg
			>
		</div>

		{#if showFeedback}
			<p class="relative text-gray-400 text-sm mb-5">
				כתוב לנו כיצד לשפר את האתר עבורך — הצוות של יוצאים לחירות יקרא
				ויחזור אליך.
			</p>

			{#if form?.feedbackSuccess}
				<div
					class="relative bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-emerald-400 text-sm font-bold text-center"
				>
					✅ פנייתך נשלחה בהצלחה! נחזור אליך בהקדם.
				</div>
			{:else}
				<form
					method="POST"
					action="?/sendFeedback"
					use:enhance
					class="relative flex flex-col gap-4"
				>
					<textarea
						name="feedback_text"
						rows="5"
						placeholder="כתוב כאן את הצעתך / תלונתך / בקשתך..."
						class="w-full bg-[#1e293b] border border-white/10 rounded-2xl px-4 py-3 text-white text-sm
					       placeholder:text-gray-600 focus:outline-none focus:border-purple-500/50 resize-none
					       transition-colors"
						required
						minlength="5"
					></textarea>
					{#if form?.feedbackError}
						<p class="text-red-400 text-xs">{form.feedbackError}</p>
					{/if}
					<button
						type="submit"
						class="self-end bg-gradient-to-l from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500
					       text-white font-bold text-sm px-6 py-2.5 rounded-full transition-all shadow-lg"
					>
						שלח פנייה ←
					</button>
				</form>
			{/if}
		{/if}
	</div>

	<!-- ===== קומה 6: המידע שלי ===== -->
	<div
		class="relative bg-[#0f172a] rounded-3xl border border-white/10 p-4 md:p-6 shadow-xl overflow-hidden
	            before:absolute before:inset-x-0 before:top-0 before:h-24 before:rounded-t-3xl
	            before:bg-gradient-to-b before:from-white/8 before:to-transparent
	            before:transition-all before:duration-300 before:pointer-events-none
	            hover:before:from-white/18 {mobileTab !== 'items'
			? 'hidden md:block'
			: ''}"
	>
		<div
			class="relative flex items-center justify-between cursor-pointer select-none -mx-4 px-4 -mt-4 pt-3 md:-mx-6 md:px-6 md:-mt-6 md:pt-4 min-h-14 {showMyInfo
				? 'pb-4 mb-4'
				: 'pb-4'}"
			onclick={() => {
				showMyInfo = !showMyInfo;
			}}
			onmouseenter={() => {
				secTipShow = true;
				secTipIsOpen = showMyInfo;
			}}
			onmouseleave={() => (secTipShow = false)}
			onmousemove={(e) => handleSecMouseMove(e, showMyInfo)}
			role="button"
			tabindex={0}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ")
					showMyInfo = !showMyInfo;
			}}
		>
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span
					class="w-7 h-7 rounded-full text-black text-sm font-black flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>6</span
				>
				הנכסים שלי
			</h2>
			<div class="flex items-center gap-2">
				<span
					class="text-sm bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-full font-bold text-center leading-tight"
					title="מניות פלטפורמה"
					>📈 {userShares}<br />מניות</span
				>
				<span
					class="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full font-bold text-center leading-tight"
					>{data.items.length} פריטים<br />שפרסמת</span
				>
				<svg
					class="w-4 h-4 text-yellow-400 transition-transform duration-300 flex-shrink-0 {showMyInfo
						? 'rotate-180'
						: ''}"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					><polyline points="6 9 12 15 18 9" /></svg
				>
			</div>
		</div>

		{#if showMyInfo}
			{#if data.items.length === 0}
				<div class="text-center py-12">
					<span class="text-6xl block mb-4">📭</span>
					<p class="text-gray-400 mb-6 text-sm">{tFn("no_items")}</p>
					<a
						href="/"
						class="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
					       text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
					>
						{tFn("publish_first")}
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
								<span class="text-3xl flex-shrink-0 mt-0.5"
									>{item.icon ?? "📋"}</span
								>
								<div class="min-w-0 flex-1">
									<div
										class="flex items-center gap-2 flex-wrap mb-1"
									>
										<h3
											class="text-white font-bold text-sm truncate group-hover:text-purple-300 transition-colors"
										>
											{item.label}
										</h3>
										<span
											class="text-xs px-2 py-0.5 rounded-full font-bold flex-shrink-0
									  {item.status === 'active'
												? 'bg-green-500/20 text-green-400 border border-green-500/30'
												: 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}"
										>
											{item.status === "active"
												? tFn("status_active")
												: item.status}
										</span>
									</div>
									{#if item.description}
										<p
											class="text-gray-400 text-xs line-clamp-2"
										>
											{item.description}
										</p>
									{/if}
									<div class="flex items-center gap-3 mt-1.5">
										{#if item.neighborhood}
											<span
												class="text-purple-400/70 text-xs"
												>📍 {item.neighborhood}</span
											>
										{/if}
										<span class="text-gray-600 text-xs">
											{new Date(
												item.created_at,
											).toLocaleDateString("he-IL")}
										</span>
									</div>
								</div>
							</div>
						</a>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>

{#if showRingTooltip}
	<div
		class="fixed z-[9999] pointer-events-none"
		style="left: {ringTipX}px; top: {ringTipY}px;"
	>
		<div
			class="bg-[#1e293b]/95 backdrop-blur-sm border border-white/10 shadow-2xl
		            rounded-xl px-3 py-2 text-center max-w-[200px]"
		>
			<div class="text-xs font-black mb-1" style="color: {ringColor}">
				{profileCompletion}% הושלם
			</div>
			<div class="text-white text-xs leading-snug">
				{#if profileCompletion >= 100}
					לעריכת פרופיל
				{:else if nextTipKey === "tip_security"}
					🛡️ הוסף שאלת ביטחון לחשבונך
					{#if securityFieldsRemaining > 0}
						<div class="text-orange-300 text-[10px] mt-0.5">
							נותרו {securityFieldsRemaining} שדות מתוך 2 להגדרה
						</div>
					{/if}
				{:else}
					{tFn(nextTipKey)}
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- מודל שליפת תמונה מגוגל/פייסבוק -->
{#if showSocialPhotoModal}
	<div
		class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
		onclick={() => (showSocialPhotoModal = null)}
		role="presentation"
	>
		<div
			class="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
			onclick={(e) => e.stopPropagation()}
			role="presentation"
		>
			<div class="flex items-center gap-3 mb-4">
				{#if showSocialPhotoModal === "google"}
					<img
						src="https://www.google.com/favicon.ico"
						class="w-6 h-6"
						alt="Google"
					/>
					<h3 class="text-white font-bold text-lg">קח תמונה מגוגל</h3>
				{:else}
					<img
						src="https://www.facebook.com/favicon.ico"
						class="w-6 h-6"
						alt="Facebook"
					/>
					<h3 class="text-white font-bold text-lg">
						קח תמונה מפייסבוק
					</h3>
				{/if}
			</div>

			<p class="text-gray-400 text-sm mb-4">
				{#if showSocialPhotoModal === "google"}
					הכנס את ה-URL של תמונת הפרופיל שלך בגוגל
				{:else}
					הכנס את שם המשתמש שלך בפייסבוק או קישור לפרופיל
				{/if}
			</p>

			<input
				type="text"
				bind:value={socialPhotoInput}
				placeholder={showSocialPhotoModal === "google"
					? "https://lh3.googleusercontent.com/..."
					: "שם משתמש או קישור לפרופיל"}
				class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
				       px-4 py-3 text-white text-sm placeholder-gray-500 outline-none transition-colors mb-3"
				onkeydown={(e) => e.key === "Enter" && fetchSocialPhoto()}
			/>

			{#if socialPhotoError}
				<p class="text-red-400 text-xs mb-3">{socialPhotoError}</p>
			{/if}

			<div class="flex gap-2">
				<button
					type="button"
					onclick={fetchSocialPhoto}
					disabled={!socialPhotoInput.trim() || socialPhotoLoading}
					class="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600
					       hover:from-blue-500 hover:to-purple-500 text-white text-sm font-bold
					       transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
				>
					{#if socialPhotoLoading}
						<span
							class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
						></span>
					{:else}
						טען תמונה
					{/if}
				</button>
				<button
					type="button"
					onclick={() => (showSocialPhotoModal = null)}
					class="px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 hover:text-white
					       hover:border-white/20 text-sm transition-all cursor-pointer"
				>
					ביטול
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- ===== מודל חיתוך תמונה ===== -->
{#if showCrop}
	<div
		class="fixed inset-0 z-[10000] flex items-center justify-center bg-black/75 backdrop-blur-sm"
		role="presentation"
	>
		<div
			class="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl flex flex-col items-center gap-4"
		>
			<h3 class="text-white font-black text-lg">חתוך את התמונה</h3>
			<p class="text-gray-400 text-xs text-center">
				גרור להזזה · גלגלת עכבר להגדלה/הקטנה
			</p>

			<!-- אזור חיתוך -->
			<div
				class="relative overflow-hidden rounded-full border-2 border-purple-500/50 cursor-grab active:cursor-grabbing select-none touch-none"
				style="width: {CROP_VP}px; height: {CROP_VP}px;"
				use:cropInteraction
			>
				{#if cropSrc}
					<img
						src={cropSrc}
						alt="חיתוך"
						onload={onCropLoad}
						draggable="false"
						style="
							position: absolute;
							width: {cropNatW * cropScale}px;
							height: {cropNatH * cropScale}px;
							left: {CROP_VP / 2 + cropOffsetX - (cropNatW * cropScale) / 2}px;
							top:  {CROP_VP / 2 + cropOffsetY - (cropNatH * cropScale) / 2}px;
							pointer-events: none;
							user-select: none;
						"
					/>
				{/if}
				<!-- עיגול הנחיה -->
				<div
					class="absolute inset-0 rounded-full ring-2 ring-purple-500/30 pointer-events-none"
				></div>
			</div>

			<div class="flex gap-3 w-full">
				<button
					type="button"
					onclick={confirmCrop}
					class="flex-1 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600
					       hover:from-purple-500 hover:to-blue-500 text-white font-bold transition-all cursor-pointer"
				>
					אשר תמונה
				</button>
				<button
					type="button"
					onclick={() => {
						showCrop = false;
						cropSrc = "";
					}}
					class="px-5 py-3 rounded-xl border border-white/10 text-gray-400 hover:text-white
					       hover:border-white/20 transition-all cursor-pointer"
				>
					ביטול
				</button>
			</div>
		</div>
	</div>
{/if}

{#if secTipShow}
	<div
		class="fixed z-[9999] pointer-events-none"
		style="left: {secTipX + 14}px; top: {secTipY + 14}px;"
	>
		<div
			class="bg-gray-900/95 backdrop-blur-sm
		            text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-xl
		            border border-white/10 whitespace-nowrap"
		>
			{secTipIsOpen ? "גלול מעלה" : "גלול מטה לפרטים"}
		</div>
	</div>
{/if}

<style>
	@keyframes customLocGlow {
		0%, 100% {
			box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.0);
		}
		50% {
			box-shadow: 0 0 14px 1px rgba(250, 204, 21, 0.22);
		}
	}
	.custom-loc-glow:not(:focus) {
		animation: customLocGlow 2.8s ease-in-out infinite;
	}
</style>

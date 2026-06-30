<script lang="ts">
	import { enhance } from "$app/forms";
	import { beforeNavigate, goto } from "$app/navigation";
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
	import { registerDynamicNeighborhoods, hasPreciseCoords, MY_PIN_LS_KEY } from "$lib/neighborhoodCoords";
	import { findWhatsAppGroups } from "$lib/data/whatsapp-groups";
	import { getLikedItems, removeLike, type LikedItem } from "$lib/likedItems";
	import { statusLabel, type UserStatus } from "$lib/singlesMock";
	import NeighborhoodPicker from "$lib/components/NeighborhoodPicker.svelte";

	let { data, form } = $props();

	// snapshot ראשוני של נתוני המשתמש לאתחול שדות הטופס (intentional - form manages its own state)
	const _ud = data.user;

	// tFn: פונקציית תרגום reactive - לא משתמשים ב-$t ישירות כי Prettier מוחק אותו
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
	let showMyInfo = $state(false);
	let showFeedback = $state(false);
	let showLikes = $state(false);
	let likedItems = $state<LikedItem[]>([]);
	let userStatus = $state<UserStatus>('available');
	let showStatusSelector = $state(false);
	let showLoginOptions = $state(false);
	let receivedMessages = $state<any[]>([]);
	let showReceivedMessages = $state(false);

	$effect(() => {
		if (typeof window === "undefined") return;
		(async () => {
			try {
				const res = await fetch('/api/messages');
				if (res.ok) {
					const msgs = await res.json();
					receivedMessages = msgs.slice(0, 10);
				}
			} catch {}
		})();
	});

	function refreshLikes() {
		likedItems = getLikedItems();
	}

	// --- ניהול מודעות מוקפאות מהפרופיל: מחיקה לצמיתות / פרסום שנית ---
	let deletingItemId = $state<string | null>(null);
	let deletedItemIds = $state<string[]>([]);
	let republishingItemId = $state<string | null>(null);
	let republishedItemIds = $state<string[]>([]);

	async function deleteOwnItem(itemId: string, label: string) {
		if (!confirm(`למחוק לצמיתות את "${label}"? פעולה זו אינה הפיכה.`)) return;
		deletingItemId = itemId;
		try {
			const res = await fetch(`/api/items/${itemId}`, {
				method: 'DELETE',
				headers: { 'X-From-Profile': '1' },
			});
			const data = await res.json();
			if (data.success) {
				deletedItemIds = [...deletedItemIds, itemId];
			} else {
				alert(data.message ?? 'שגיאה במחיקה');
			}
		} catch {
			alert('שגיאת תקשורת - נסה שוב');
		}
		deletingItemId = null;
	}

	async function republishOwnItem(itemId: string) {
		republishingItemId = itemId;
		try {
			const res = await fetch(`/api/items/${itemId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'unfreeze' }),
			});
			const data = await res.json();
			if (data.success) {
				republishedItemIds = [...republishedItemIds, itemId];
			} else {
				alert(data.message ?? 'שגיאה בפרסום מחדש');
			}
		} catch {
			alert('שגיאת תקשורת - נסה שוב');
		}
		republishingItemId = null;
	}

	function unlike(item: LikedItem) {
		removeLike(item.type, item.id);
		refreshLikes();
	}

	$effect(() => {
		if (typeof window === "undefined") return;
		refreshLikes();
	});

	let likedGiveaways = $derived(
		likedItems.filter((x) => x.type === "giveaway"),
	);
	let likedSingles = $derived(
		likedItems.filter((x) => x.type === "single"),
	);
	let likedBabysitters = $derived(
		likedItems.filter((x) => x.type === "babysitter"),
	);
	let mobileTab = $state<
		"main" | "profile" | "messages" | "items" | "levels"
	>("main");

	// בחירת לשונית בנייד - פותחת אוטומטית את המקטעים השייכים אליה
	// כדי שהמשתמש לא יצטרך ללחוץ לחיצה נוספת כדי לפתוח
	function selectTab(
		id: "main" | "profile" | "messages" | "items" | "levels",
	) {
		mobileTab = id;
		if (id === "messages") {
			showMessages = true;
			showFeedback = true;
			showReceivedMessages = true;
		} else if (id === "items") {
			showMyInfo = true;
		} else if (id === "levels") {
			showLevels = true;
		} else if (id === "profile") {
			isEditing = true;
		}
	}

	// ניהול המלצות - מחיקה / דחייה לאוחר
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

	// ===== business_type (localStorage) =====
	// ערך-דגל לשדה business עבור מי שאין לו עסק/שירות — נשמר ב-DB כדי שהפרופיל יגיע ל-100%
	const NO_BUSINESS = "ללא עסק או שירות עצמאי";
	const BIZ_TYPE_KEY = "business_type_v1";
	let businessType = $state(
		(typeof localStorage !== "undefined" ? localStorage.getItem(BIZ_TYPE_KEY) : null)
			?? (_ud?.business === NO_BUSINESS ? "none" : ""),
	);
	$effect(() => {
		try { localStorage.setItem(BIZ_TYPE_KEY, businessType); } catch {}
	});

	type RecColor = "amber" | "pink" | "green" | "blue" | "purple" | "red" | "orange" | "cyan";
	interface DailyRec {
		id: string;
		emoji: string;
		title: string;
		sub: string;
		href: string;
		external: boolean;
		color: RecColor;
		eligible: () => boolean;
	}
	function recColorClasses(c: RecColor): string {
		return ({
			amber:  "bg-amber-500/10 border-amber-500/30",
			pink:   "bg-pink-500/10 border-pink-500/30",
			green:  "bg-green-500/10 border-green-500/30",
			blue:   "bg-blue-500/10 border-blue-500/30",
			purple: "bg-purple-500/10 border-purple-500/30",
			red:    "bg-red-500/10 border-red-500/30",
			orange: "bg-orange-500/10 border-orange-500/30",
			cyan:   "bg-cyan-500/10 border-cyan-500/30",
		})[c];
	}
	function recButtonClasses(c: RecColor): string {
		return ({
			amber:  "bg-amber-500/25 hover:bg-amber-500/40",
			pink:   "bg-pink-500/25 hover:bg-pink-500/40",
			green:  "bg-green-500/25 hover:bg-green-500/40",
			blue:   "bg-blue-500/25 hover:bg-blue-500/40",
			purple: "bg-purple-500/25 hover:bg-purple-500/40",
			red:    "bg-red-500/25 hover:bg-red-500/40",
			orange: "bg-orange-500/25 hover:bg-orange-500/40",
			cyan:   "bg-cyan-500/25 hover:bg-cyan-500/40",
		})[c];
	}
	function recSubColorClass(c: RecColor): string {
		return ({
			amber:  "text-amber-300/80",
			pink:   "text-pink-300/80",
			green:  "text-green-300/80",
			blue:   "text-blue-300/80",
			purple: "text-purple-300/80",
			red:    "text-red-300/80",
			orange: "text-orange-300/80",
			cyan:   "text-cyan-300/80",
		})[c];
	}
	// === Ad-builder draft (resume from /about/advertise/builder) ===
	type AdDraft = { title?: string; subtitle?: string; mainImage?: string; logo?: string; phone?: string; products?: unknown[]; address?: string };
	let adDraft = $state<AdDraft | null>(null);
	let adDraftProgress = $derived.by(() => {
		if (!adDraft) return 0;
		const fields = [adDraft.mainImage, adDraft.title, adDraft.subtitle, adDraft.logo, adDraft.phone, adDraft.address];
		const filled = fields.filter(Boolean).length;
		return Math.round((filled / fields.length) * 100);
	});

	function dismissAdDraft() {
		if (!confirm("למחוק את טיוטת הפרסומת?")) return;
		try { localStorage.removeItem("ad_builder_draft_v1"); } catch {}
		adDraft = null;
	}

	// מיפוי סוג הודעת ניהול → מקום הטיפול בעמוד הניהול (כל הכרטיס נעשה קישור)
	const MSG_TYPE_LINKS: Record<string, string> = {
		coordinator_request: "/admin#coord-requests",
		location_request: "/admin#pending-neighborhoods",
		neighborhood_request: "/admin#pending-neighborhoods",
		singles_review: "/admin/singles-review",
	};

	// הודעת התאמה לדף פנויים/פנויות - לפי קבוצת הגיל והמגדר של המשתמש
	const singlesMatchMessage = (data as { singlesMatchInfo?: { count: number; ageGroupLabel: string; oppositeGenderLabel: string } | null }).singlesMatchInfo
		? {
				id: "singles-match",
				from: "💑 פנויים/פנויות",
				text: `דף הפרופיל שלך מוכן ויש עבורך כ-${(data as { singlesMatchInfo?: { count: number } }).singlesMatchInfo!.count} ${(data as { singlesMatchInfo?: { oppositeGenderLabel: string } }).singlesMatchInfo!.oppositeGenderLabel} בגילך (${(data as { singlesMatchInfo?: { ageGroupLabel: string } }).singlesMatchInfo!.ageGroupLabel}).`,
				time: "עכשיו",
				read: false,
			}
		: null;

	let messages = $state(
		[
			...(singlesMatchMessage ? [singlesMatchMessage] : []),
			...((data.messages ?? []).length > 0
				? (data.messages ?? []).map(
						(m: import("$lib/server/db").DbItem) => {
							let efType = "";
							let efLink: string | undefined;
							try {
								const ef = JSON.parse(m.extra_fields || "{}");
								efType = ef?.type ?? "";
								efLink = ef?.link ?? undefined;
							} catch {}
							return {
								id: `db-${m.id}`,
								from: m.label ?? "מערכת",
								text: m.description ?? "",
								time: new Date(m.created_at).toLocaleDateString(
									"he-IL",
								),
								read: false,
								// סוג ההודעה (singles_review וכו') - משמש לזיהוי התראות שניתן לסמן כטופלו
								kind: efType,
								// לחיצה על כל הכרטיס פותחת את עמוד הניהול במקום הרלוונטי לטיפול בבקשה
								link:
									efLink ??
									MSG_TYPE_LINKS[efType] ??
									undefined,
							};
						},
					)
				: [
						{
							id: "mock-welcome",
							from: "מערכת",
							text: "ברוך הבא לקהילה! השלם את הפרופיל שלך.",
							time: "לפני 2 ימים",
							read: false,
						},
						{
							id: "mock-approved",
							from: "מנהל",
							text: "הצטרפות שלך אושרה. כעת תוכל לפרסם תוכן.",
							time: "לפני 5 ימים",
							read: false,
						},
					]),
		],
	);

	// === ניהול מצב הודעות (מחיקה / ארכיון / תזכורת) - נשמר ב-localStorage ===
	const MSG_DELETED_KEY = "msgs_deleted_v1";
	const MSG_ARCHIVED_KEY = "msgs_archived_v1";
	const MSG_SNOOZED_KEY = "msgs_snoozed_v1";
	const SNOOZE_MS = 2 * 24 * 60 * 60 * 1000; // יומיים

	function loadIdSet(key: string): Set<string> {
		if (typeof localStorage === "undefined") return new Set();
		try {
			return new Set(JSON.parse(localStorage.getItem(key) ?? "[]"));
		} catch {
			return new Set();
		}
	}
	function loadIdMap(key: string): Record<string, number> {
		if (typeof localStorage === "undefined") return {};
		try {
			return JSON.parse(localStorage.getItem(key) ?? "{}") ?? {};
		} catch {
			return {};
		}
	}
	function saveJSON(key: string, value: unknown) {
		if (typeof localStorage === "undefined") return;
		localStorage.setItem(key, JSON.stringify(value));
	}

	let deletedMsgs = $state<Set<string>>(loadIdSet(MSG_DELETED_KEY));
	let archivedMsgs = $state<Set<string>>(loadIdSet(MSG_ARCHIVED_KEY));
	let snoozedMsgs = $state<Record<string, number>>(loadIdMap(MSG_SNOOZED_KEY));
	let nowTs = $state(Date.now());
	let showArchive = $state(false);
	let showHandled = $state(false);

	$effect(() => {
		if (typeof window === "undefined") return;
		const i = setInterval(() => (nowTs = Date.now()), 60_000);
		return () => clearInterval(i);
	});

	function deleteMsg(id: string) {
		deletedMsgs = new Set([...deletedMsgs, id]);
		saveJSON(MSG_DELETED_KEY, [...deletedMsgs]);
	}
	function archiveMsg(id: string) {
		archivedMsgs = new Set([...archivedMsgs, id]);
		saveJSON(MSG_ARCHIVED_KEY, [...archivedMsgs]);
	}
	function unarchiveMsg(id: string) {
		const next = new Set(archivedMsgs);
		next.delete(id);
		archivedMsgs = next;
		saveJSON(MSG_ARCHIVED_KEY, [...archivedMsgs]);
	}
	function snoozeMsg(id: string) {
		snoozedMsgs = { ...snoozedMsgs, [id]: Date.now() + SNOOZE_MS };
		saveJSON(MSG_SNOOZED_KEY, snoozedMsgs);
	}
	function markRead(id: string) {
		// "אם הוא קרא - מחוק את ההתראות מהפרופיל שלו"
		deleteMsg(id);
	}
	// הודעה אישית עבור טיוטת פרסומת - מופיעה למעלה אם יש טיוטה.
	// כוללת תזכורת על חלון העריכה החינמי (היום עד 23:59) או שהוא פג.
	let freeEditInfo = $derived.by(() => {
		try {
			const raw = typeof localStorage !== "undefined" ? localStorage.getItem("ad_paid_at") : null;
			if (!raw) return null;
			const paidAt = new Date(raw);
			if (isNaN(paidAt.getTime())) return null;
			const endOfPaidDay = new Date(paidAt);
			endOfPaidDay.setHours(23, 59, 59, 999);
			const expired = Date.now() > endOfPaidDay.getTime();
			const dateStr = endOfPaidDay.toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit" });
			return { expired, dateStr };
		} catch { return null; }
	});

	// התראות "כרטיס פנויים ממתין לאישור" נחשבות טופלו ברגע שאין יותר כרטיסים ממתינים.
	// אז הן יורדות מההתראות הפעילות (ומספירת שלא-נקראו) ועוברות להיסטוריית ההודעות עם וי ירוק.
	let pendingSinglesCount = $derived(data.pendingSinglesCount ?? 0);
	function isHandledMsg(m: { id: string; kind?: string }): boolean {
		return m.kind === "singles_review" && pendingSinglesCount === 0;
	}

	let visibleMessages = $derived.by(() => {
		void nowTs;
		return messages.filter((m) => {
			if (deletedMsgs.has(m.id)) return false;
			if (archivedMsgs.has(m.id)) return false;
			if (isHandledMsg(m)) return false; // טופלה → להיסטוריה
			const sn = snoozedMsgs[m.id];
			if (sn && sn > nowTs) return false;
			return true;
		});
	});
	let archivedList = $derived(messages.filter((m) => archivedMsgs.has(m.id)));
	// הודעות שטופלו (התראות פנויים אחרי שכל הממתינים אושרו/נדחו) - לא מחוקות, מוצגות בהיסטוריה
	let handledList = $derived(
		messages.filter((m) => isHandledMsg(m) && !deletedMsgs.has(m.id)),
	);
	let displayedMessages = $derived.by(() => {
		void nowTs;
		const base = visibleMessages;
		if (!adDraft) return base;
		// אם המשתמש סיים את העריכה (100%) - לא צריך להציג nag "סיים את עריכתו".
		// הוא יראה את כרטיס "פרסומת בעריכה" למטה אם ירצה להמשיך לפרסום.
		if (adDraftProgress >= 100) return base;
		// מכבד את אותן פעולות (מחיקה/ארכיון/הזכר) כמו הודעות רגילות
		if (deletedMsgs.has("draft")) return base;
		if (archivedMsgs.has("draft")) return base;
		const sn = snoozedMsgs["draft"];
		if (sn && sn > nowTs) return base;
		let extraTxt = "";
		if (freeEditInfo) {
			extraTxt = freeEditInfo.expired
				? ` ⌛ זמן העריכה החינמי שלך נגמר ב-${freeEditInfo.dateStr} ב-23:59. כל זמן שעובר ללא ניצול - מבוזבז.`
				: ` ⏰ נותר לך זמן עריכה חינם עד ${freeEditInfo.dateStr} ב-23:59 - עדיף לסיים היום!`;
		}
		const draftMsg = {
			id: "draft",
			from: "🎨 בילדר הפרסומות",
			text: `יש לך פרסום בטיוטא - סיים את עריכתו! "${adDraft.title || "ללא כותרת"}" (${adDraftProgress}% הושלמו).${extraTxt}`,
			time: "עכשיו",
			read: false,
			isDraft: true,
		};
		return [draftMsg, ...base];
	});
	let unreadCount = $derived(displayedMessages.filter((m) => !m.read).length);
	let _msgsAutoOpened = false;
	$effect(() => {
		if (!_msgsAutoOpened && unreadCount > 0) {
			showMessages = true;
			_msgsAutoOpened = true;
		}
	});

	// פתיחה אוטומטית של פאנל "פרטיי" אם הפרופיל לא מושלם (סטטוס לא-פטיר)
	let _myInfoAutoOpened = false;
	$effect(() => {
		if (_myInfoAutoOpened) return;
		const u = data.user;
		if (!u) return;
		// עיר ללא שכונות ברשימה → שכונה אינה נדרשת לצורך "פרופיל מושלם"
		const savedCityHasNeighborhoods =
			((data.citiesData as CityEntry[]).find((c) => c.city === u.city)?.neighborhoods ?? []).length > 0;
		const neighborhoodMissing = savedCityHasNeighborhoods && !u.neighborhood?.trim();
		const isIncomplete = !u.name?.trim() || !u.phone?.trim() || !u.city?.trim() || neighborhoodMissing;
		if (isIncomplete) {
			showMyInfo = true;
			_myInfoAutoOpened = true;
		}
	});
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
	// ברירת מחדל לתמונה: avatar_url מה-DB, ואם אין - תמונת הפרופיל מגוגל (oauth_image)
	let avatarPreview = $state<string | null>(
		_ud?.avatar_url || (data as { oauth_image?: string | null }).oauth_image || null,
	);
	let avatarBase64 = $state("");

	let name = $state(_ud?.name ?? "");
	let email = $state(_ud?.email ?? "");
	let nickname = $state(_ud?.nickname ?? "");
	let phone = $state(_ud?.phone ?? "");

	// נרמול טלפון בעת יציאה מהשדה - מונע פורמטים מבלבלים (+972, רווחים, סוגריים)
	// וממיר לפורמט ישראלי אחיד 05X-XXXXXXX כדי שההתאמה במערכת לא תיכשל.
	function normalizePhoneInput() {
		let d = (phone ?? "").replace(/\D/g, "");
		if (!d) { phone = ""; return; }
		if (d.startsWith("972")) d = "0" + d.slice(3);           // +972-5x → 05x
		else if (d.length === 9 && d[0] !== "0") d = "0" + d;     // 5xxxxxxxx → 05xxxxxxxx
		// הוספת מקף אחרי הקידומת (050-, 02-) לקריאוּת
		if (d.length >= 9 && d.startsWith("05")) phone = d.slice(0, 3) + "-" + d.slice(3);
		else if (d.length >= 9 && d[0] === "0") phone = d.slice(0, 2) + "-" + d.slice(2);
		else phone = d;
	}

	let city = $state(_ud?.city ?? "");
	let neighborhood = $state(_ud?.neighborhood ?? "");
	let cityQuery = $state(_ud?.city ?? "");
	let showCitySuggestions = $state(false);
	let cityHighlightIdx = $state(-1);
	// רשימת שכונות נפתחת (dropdown מותאם)
	let showNbSuggestions = $state(false);

	function citySuggestions(): string[] {
		const q = cityQuery.trim().toLowerCase();
		const all = (data.citiesData as CityEntry[]).map((c) => c.city);
		if (!q) return all.slice(0, 50);
		return all.filter((c) => c.toLowerCase().includes(q)).slice(0, 50);
	}

	function pickCity(c: string) {
		city = c;
		cityQuery = c;
		showCitySuggestions = false;
		cityHighlightIdx = -1;
		locationInteracted = true;
		// קביעת השכונה לפי העיר שנבחרה
		const nbs = (data.citiesData as CityEntry[]).find((x) => x.city === c)?.neighborhoods ?? [];
		const noReal = nbs.length === 0 || (nbs.length === 1 && nbs[0] === "מרכז");
		if (noReal) {
			// אין שכונות אמיתיות בעיר → "מרכז" מסומן אוטומטית
			neighborhood = "מרכז";
			showNbSuggestions = false;
		} else {
			// יש שכונות → פתח מיד את הרשימה כדי שהמשתמש יבחר
			neighborhood = "";
			showNbSuggestions = true;
		}
	}

	function pickNeighborhood(n: string) {
		neighborhood = n;
		showNbSuggestions = false;
		locationInteracted = true;
	}

	// "לא מצאתי את השכונה שלי" → חשיפת תיבת המיקום החופשי שנשלחת למנהל
	function pickNeighborhoodNotFound() {
		neighborhood = "";
		showNbSuggestions = false;
		locationInteracted = true;
		setTimeout(() => document.getElementById("p-custom-location")?.focus(), 50);
	}

	function onCityInputKey(e: KeyboardEvent) {
		const list = citySuggestions();
		if (e.key === "ArrowDown") {
			e.preventDefault();
			showCitySuggestions = true;
			cityHighlightIdx = Math.min(cityHighlightIdx + 1, list.length - 1);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			cityHighlightIdx = Math.max(cityHighlightIdx - 1, 0);
		} else if (e.key === "Enter") {
			if (cityHighlightIdx >= 0 && list[cityHighlightIdx]) {
				e.preventDefault();
				pickCity(list[cityHighlightIdx]);
			} else if (list.length === 1) {
				e.preventDefault();
				pickCity(list[0]);
			}
		} else if (e.key === "Escape") {
			showCitySuggestions = false;
		}
	}
	let business = $state(_ud?.business ?? "");
	// בחירת "ללא עסק או שירות עצמאי" ממלאת את שדה העסק (כך הפרופיל מגיע ל-100%);
	// מעבר משם מנקה את ערך-הדגל כדי לא להשאיר אותו בטעות.
	$effect(() => {
		if (businessType === "none" && business !== NO_BUSINESS) business = NO_BUSINESS;
		else if (businessType !== "none" && business === NO_BUSINESS) business = "";
	});
	let customLocation = $state("");
	let customLat = $state<number | null>(null);
	let customLng = $state<number | null>(null);
	let locationInteracted = $state(false);

	// ---- סימון עצמי של מיקום הישוב על המפה (כשהמפה לא מדויקת) ----
	let showCityPin = $state(false);
	let cityPinLat = $state<number | null>(null);
	let cityPinLng = $state<number | null>(null);
	let savingCityPin = $state(false);
	let cityPinSaved = $state(false);
	let cityPinError = $state("");
	// המפה כבר מדויקת לישוב? (אם לא - נציע למשתמש לסמן בעצמו)
	let cityHasCoords = $derived(hasPreciseCoords(neighborhood, city));

	async function saveCityPin() {
		if (cityPinLat == null || cityPinLng == null) {
			cityPinError = "נא לסמן את המיקום על המפה";
			return;
		}
		if (!city) {
			cityPinError = "יש לבחור עיר תחילה";
			return;
		}
		savingCityPin = true;
		cityPinError = "";
		const nb = neighborhood || "מרכז";
		const pin = { name: nb, city, lat: cityPinLat, lng: cityPinLng };
		try {
			// 1) רשומת שכונה ממתינה - לאחר אישור אדמין תתקן את המפה לכל תושבי הישוב
			const res = await fetch("/api/neighborhoods", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(pin),
			});
			const r = await res.json();
			if (!r?.success) {
				cityPinError = r?.message || "השמירה נכשלה, נסה שוב";
				savingCityPin = false;
				return;
			}
			// 2) תיקון מיידי למפה של המשתמש עצמו - רישום מקומי + שמירה במכשיר
			registerDynamicNeighborhoods([pin]);
			try { localStorage.setItem(MY_PIN_LS_KEY, JSON.stringify(pin)); } catch {}
			cityPinSaved = true;
		} catch {
			cityPinError = "שגיאה בשמירה, נסה שוב";
		}
		savingCityPin = false;
	}
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
	let securityAnswerConfirmed = $state(false);
	let security_question_2 = $state((_ud as any)?.security_question_2 ?? "");
	let security_answer_2 = $state((_ud as any)?.security_answer_2 ?? "");
	let securityAnswer2Confirmed = $state(false);

	function confirmSecurityAnswer() {
		if (!security_question || !security_answer.trim()) return;
		securityAnswerConfirmed = true;
	}
	function confirmSecurityAnswer2() {
		if (!security_question_2 || !security_answer_2.trim()) return;
		securityAnswer2Confirmed = true;
	}
	let status = $state((_ud as any)?.status ?? "active");

	// ===== ערך תצוגה בלוח המכוונים: מתעדכן אחרי שמירה מוצלחת בלבד =====
	let savedCity         = $state(_ud?.city ?? "");
	let savedNeighborhood = $state(_ud?.neighborhood ?? "");

	// ===== אזהרת שינויים לא-שמורים =====
	const initialSnapshot = {
		name:              _ud?.name ?? "",
		email:             _ud?.email ?? "",
		nickname:          _ud?.nickname ?? "",
		phone:             _ud?.phone ?? "",
		city:              _ud?.city ?? "",
		neighborhood:      _ud?.neighborhood ?? "",
		business:          _ud?.business ?? "",
		family_status:     _ud?.family_status ?? "",
		gender:            _ud?.gender ?? "",
		birth_date:        _ud?.birth_date ?? "",
		notifications:     _ud?.notifications !== 0,
		security_question:   _ud?.security_question ?? "",
		security_answer:     _ud?.security_answer ?? "",
		security_question_2: (_ud as any)?.security_question_2 ?? "",
		security_answer_2:   (_ud as any)?.security_answer_2 ?? "",
		status:              (_ud as any)?.status ?? "active",
		avatar_url:        _ud?.avatar_url ?? null,
	};
	let suppressDirtyCheck = $state(false);

	let composedBirth = $derived(
		(birthYear || birthMonth || birthDay)
			? `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
			: ""
	);

	let isDirty = $derived(
		isEditing && !suppressDirtyCheck && (
			name              !== initialSnapshot.name              ||
			email             !== initialSnapshot.email             ||
			nickname          !== initialSnapshot.nickname          ||
			phone             !== initialSnapshot.phone             ||
			city              !== initialSnapshot.city              ||
			neighborhood      !== initialSnapshot.neighborhood      ||
			business          !== initialSnapshot.business          ||
			family_status     !== initialSnapshot.family_status     ||
			gender            !== initialSnapshot.gender            ||
			composedBirth     !== initialSnapshot.birth_date        ||
			notifications     !== initialSnapshot.notifications     ||
			security_question   !== initialSnapshot.security_question   ||
			security_answer     !== initialSnapshot.security_answer     ||
			security_question_2 !== initialSnapshot.security_question_2 ||
			security_answer_2   !== initialSnapshot.security_answer_2   ||
			status              !== initialSnapshot.status              ||
			!!avatarBase64
		)
	);

	$effect(() => {
		function onBeforeUnload(e: BeforeUnloadEvent) {
			if (isDirty) {
				e.preventDefault();
				e.returnValue = "";
			}
		}
		window.addEventListener("beforeunload", onBeforeUnload);
		return () => window.removeEventListener("beforeunload", onBeforeUnload);
	});

	beforeNavigate(({ cancel, to }) => {
		if (!isDirty) return;
		const target = to?.url?.pathname ?? "";
		if (target === page.url.pathname) return;
		const ok = window.confirm(
			"יש לך שינויים שלא נשמרו בפרופיל.\n\nלחץ 'ביטול' כדי לחזור ולשמור, או 'אישור' כדי לעזוב ולאבד את השינויים."
		);
		if (!ok) cancel();
	});

	// ===== מאגר 12 ההמלצות =====
	let allRecs = $derived<DailyRec[]>([
		{
			id: "biz_discount",
			emoji: "🎁",
			title: "תן הנחה לקהילת יוצאים לחירות וצרף את העסק לאתר הרכישות הקבוצתיות",
			sub: "חשיפה לאלפי לקוחות מהקהילה — והצטרפות למועדון ההנחות של יוצאים לחירות",
			href: "https://groups.gofreeil.com/",
			external: true,
			color: "amber",
			eligible: () => businessType === "business_owner",
		},
		{
			id: "service_index",
			emoji: "🛠️",
			title: "פרסם חינם את המקצוע שלך באינדקס בעלי המקצוע של הקהילה",
			sub: "תושבי הקהילה מחפשים בעלי מקצוע אמינים — תופיע אצלם בחיפוש, ללא עלות",
			href: "https://index.gofreeil.com/",
			external: true,
			color: "orange",
			eligible: () => businessType === "service_provider",
		},
		{
			id: "singles",
			emoji: "💑",
			title: "רשימת הפנויים והפנויות הארצית של הקהילה",
			sub: gender === "female"
				? "הכירי את הפנויים בארץ ומצאי את המוצא חן בעיניך"
				: "הכר את הפנויות ברשימה הארצית ומצא את המוצאת חן בעיניך",
			href: "/national/singles",
			external: false,
			color: "pink",
			eligible: () => family_status === "single_m" || family_status === "single_f",
		},
		{
			id: "coordinator",
			emoji: "🏘️",
			title: "היה רכז השכונה שלך — וקבל 30% מהרווחים שמייצרת השכונה",
			sub: "הפעל את הקהילה בשכונתך, היה שותף ב-30% מההכנסות. כל הפרטים בעמוד אודותינו",
			href: "/about/revenue#section-4",
			external: false,
			color: "amber",
			eligible: () => true,
		},
		{
			id: "shareholders",
			emoji: "📈",
			title: "היה בעל מניות בפלטפורמה — ותשתתף בחלק מרווחי כל השכונות",
			sub: "השקעה בפלטפורמת קהילה הולכת ומתפתחת. כל הפרטים בעמוד אודותינו",
			href: "/about/revenue#section-5",
			external: false,
			color: "blue",
			eligible: () => true,
		},
		{
			id: "ad_pius",
			emoji: "🤝",
			title: "בתי הפיוס — יש לך סכסוך?",
			sub: "מתנדבים נותנים לך סיוע מלא בדין ובפיוס בכל סכסוך — חינם",
			href: "https://chachmim.gofreeil.com/",
			external: true,
			color: "red",
			eligible: () => true,
		},
		{
			id: "ad_gemach",
			emoji: "🎁",
			title: 'כל הגמ"חים של ישראל במקום אחד',
			sub: 'מצא בקלות כל גמ"ח שאתה צריך — תרופות, ציוד, ספרים, ועוד',
			href: "https://gemach.gofreeil.com/",
			external: true,
			color: "pink",
			eligible: () => true,
		},
		{
			id: "ad_vaadim",
			emoji: "🏛️",
			title: "ועדי שכונות — מהפכת משילות העם",
			sub: "הכר את המהפכה של משילות התושב על מוסדות השלטון והשתתף",
			href: "https://neighborhoods.gofreeil.com/",
			external: true,
			color: "cyan",
			eligible: () => true,
		},
		{
			id: "ad_criticism",
			emoji: "🔎",
			title: "מבקר רשויות המדינה — מצה את זכותך",
			sub: "מבקרים את הרשויות, מטפלים בליקויים, ממצים את זכות התושב",
			href: "https://criticism.gofreeil.com/",
			external: true,
			color: "blue",
			eligible: () => true,
		},
		{
			id: "ad_rating",
			emoji: "⭐",
			title: "דירוג ציבורי — העם מדרג",
			sub: "תן ציון לרשויות ולעובדי הציבור שאתה מכיר — שקיפות מבוססת קהילה",
			href: "https://rating.gofreeil.com/",
			external: true,
			color: "amber",
			eligible: () => true,
		},
		{
			id: "ad_referendum",
			emoji: "🗳️",
			title: "משאלי העם — הבע דעתך",
			sub: "הצבע על הסוגיות האקטואליות שעל סדר היום הציבורי",
			href: "https://referendum.gofreeil.com/",
			external: true,
			color: "purple",
			eligible: () => true,
		},
		{
			id: "ad_shop",
			emoji: "🛍️",
			title: "חנות החירות — מוצרים נבחרים",
			sub: "בריאות טבעית, חקלאות ביתית, טכנולוגיה ועוד — מוצרים נבחרים בקפידה",
			href: "https://shop.gofreeil.com/",
			external: true,
			color: "green",
			eligible: () => true,
		},
	]);

	// ===== "אחת ביום עד שתסתיים הרשימה" =====
	const DAILY_KEY = "daily_rec_v1";
	type DailyState = { lastDate: string; shownIds: string[] };
	function loadDaily(): DailyState {
		if (typeof localStorage === "undefined") return { lastDate: "", shownIds: [] };
		try {
			const raw = localStorage.getItem(DAILY_KEY);
			if (!raw) return { lastDate: "", shownIds: [] };
			const p = JSON.parse(raw);
			return {
				lastDate: typeof p?.lastDate === "string" ? p.lastDate : "",
				shownIds: Array.isArray(p?.shownIds) ? p.shownIds.filter((x: unknown) => typeof x === "string") : [],
			};
		} catch { return { lastDate: "", shownIds: [] }; }
	}
	function saveDaily(s: DailyState) {
		try { localStorage.setItem(DAILY_KEY, JSON.stringify(s)); } catch {}
	}
	let dailyState = $state<DailyState>(loadDaily());

	onMount(() => {
		const today = new Date().toISOString().slice(0, 10);
		if (dailyState.lastDate === today && dailyState.shownIds.length > 0) {
			const lastId = dailyState.shownIds[dailyState.shownIds.length - 1];
			if (allRecs.find(r => r.id === lastId && r.eligible() && isRecVisible(r.id))) return;
		}
		const next = allRecs.find(r => r.eligible() && isRecVisible(r.id) && !dailyState.shownIds.includes(r.id));
		if (!next) return;
		dailyState = { lastDate: today, shownIds: [...dailyState.shownIds, next.id] };
		saveDaily(dailyState);
	});

	let todaysRec = $derived.by<DailyRec | null>(() => {
		if (!dailyState.shownIds.length) return null;
		const lastId = dailyState.shownIds[dailyState.shownIds.length - 1];
		const r = allRecs.find(rec => rec.id === lastId);
		if (!r || !r.eligible() || !isRecVisible(r.id)) return null;
		return r;
	});

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
				// המשתמש סירב להרשאה - החזר toggle
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

	// נקה טיוטת פרופיל ישנה + טען טיוטת בילדר פרסומת
	onMount(() => {
		try {
			localStorage.removeItem(DRAFT_KEY);
		} catch {}
		try {
			if (localStorage.getItem(VIEWER_TIP_KEY) === "1")
				viewerTipDismissed = true;
		} catch {}
		try {
			const raw = localStorage.getItem("ad_builder_draft_v1");
			if (raw) {
				const d = JSON.parse(raw);
				if (d && (d.title || d.mainImage || d.subtitle)) {
					adDraft = d;
				}
			}
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

	// שכונות מאושרות שהוצעו ע"י תושבים (פין על המפה) - מתמזגות לרשימה לפי עיר
	let approvedForCity = $derived(
		((data as any).approvedNeighborhoods as Array<{ name: string; city: string }> | undefined)
			?.filter((n) => n.city === city)
			.map((n) => n.name) ?? [],
	);

	let availableNeighborhoods = $derived([
		...((data.citiesData as CityEntry[]).find((c) => c.city === city)?.neighborhoods ?? []),
		...approvedForCity.filter(
			(n) => !((data.citiesData as CityEntry[]).find((c) => c.city === city)?.neighborhoods ?? []).includes(n),
		),
	]);

	// עיר נבחרה אך אין לה שכונות אמיתיות (לדוגמה: כפר תפוח - רק "מרכז") →
	// אין לחייב בחירת שכונה, אפשר לשמור עם העיר בלבד
	let cityWithoutNeighborhoods = $derived(
		!!city &&
			(availableNeighborhoods.length === 0 ||
				(availableNeighborhoods.length === 1 &&
					availableNeighborhoods[0] === "מרכז")),
	);

	let avatarLetter = $derived(
		(data.user?.name ?? data.user?.email ?? "U").charAt(0).toUpperCase(),
	);

	// מעגל מילוי פרופיל - דינמי: כל שדה שווה 100/מספר_שדות
	const ringCircumference = 2 * Math.PI * 43; // r=43, SVG 92×92

	// שדות פרופיל שהמשתמש צריך למלא (לא notifications שמגיע כברירת מחדל)
	let profileFields = $derived([
		!!name,
		!!email,
		!!avatarPreview,
		!!nickname,
		!!phone,
		!!city,
		!!neighborhood || cityWithoutNeighborhoods,
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

	// פרופיל הושלם ל-100% → להסתיר תזכורת "השלם את הפרופיל"
	let finalDisplayedMessages = $derived(
		profileCompletion >= 100
			? displayedMessages.filter((m) => !m.text?.includes("השלם את הפרופיל"))
			: displayedMessages,
	);
	let finalUnreadCount = $derived(
		finalDisplayedMessages.filter((m) => !m.read).length,
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
	let userLevel = $derived(
		city && (neighborhood || cityWithoutNeighborhoods) && email && phone ? 2 : 1,
	);

	// טיפ ל"צופה" - מעודד למלא שכונה ושאר פרטים כדי לעלות לדרגת משתמש.
	// נסגר ע"י המשתמש (נשמר ב-localStorage) ומוסתר אוטומטית כשמגיע לדרגה 2.
	const VIEWER_TIP_KEY = "profile_viewer_tip_dismissed";
	let viewerTipDismissed = $state(false);
	function dismissViewerTip() {
		viewerTipDismissed = true;
		try {
			localStorage.setItem(VIEWER_TIP_KEY, "1");
		} catch {}
	}

	// מספר מניות פלטפורמה - placeholder פרונט בלבד עד חיבור ל-backend
	let userShares = $derived(10 + data.items.length * 5);

	// טיוטות במסירה - מודעות שהמשתמש התחיל אך טרם הוסיף תמונה
	let giveawayDrafts = $derived(
		data.items.filter(
			(i: import("$lib/server/db").DbItem) =>
				i.category === "giveaway" && i.status === "draft",
		),
	);

	let isUserAdmin = $derived(
		(data.user as any)?.role === "neighborhood_admin" ||
			(data.user as any)?.role === "super_admin",
	);

	let isSuperAdmin = $derived((data.user as any)?.role === "super_admin");
	// קישור פרטי שלי בלבד - גישה ישירה ל-DB של Strapi
	let isPrimaryAdmin = $derived((data.user as any)?.email === "yahavanter@gmail.com");

	// דרגה 3 - רכז שכונה: מי שיש לו coordinator_of או role=neighborhood_admin (לא super_admin)
	let isCoordOrNbhAdmin = $derived(
		((data.user as any)?.coordinator_of?.length ?? 0) > 0 ||
		(data.user as any)?.role === "neighborhood_admin",
	);

	// טיפ למעגל - המפתח של השדה הבא שלא מולא
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

	// אנימציה מדורגת של המעגל - מופעלת רק כשנכנס לתצוגה
	let animatedCompletion = $state(0);
	let ringAnimated = $state(false);

	// ברגע שהפרופיל הגיע ל-100% האנימציה רצה פעם אחת אחרונה ואז לא חוזרת.
	// מסמנים זאת ב-localStorage כדי שבביקורים הבאים המעגל יוצג מלא מיד, בלי מילוי וצליל.
	const RING_DONE_KEY = "profile_ring_100_done";
	function ringAlreadyCelebrated(): boolean {
		try {
			return typeof window !== "undefined" &&
				localStorage.getItem(RING_DONE_KEY) === "1";
		} catch {
			return false;
		}
	}

	// ניגון צליל קצר (WebAudio) בזמן מילוי המעגל
	let ringAudioCtx: AudioContext | null = null;
	function playRingTone(progress: number, isFinal = false) {
		try {
			if (typeof window === "undefined") return;
			if (!ringAudioCtx) {
				const Ctor = (window as any).AudioContext ?? (window as any).webkitAudioContext;
				if (!Ctor) return;
				ringAudioCtx = new Ctor();
			}
			const ctx = ringAudioCtx!;
			if (ctx.state === "suspended") ctx.resume().catch(() => {});
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			// תדר עולה עם ההתקדמות (440Hz → ~880Hz)
			const freq = 440 + Math.min(progress, 100) * 4.4;
			osc.type = "sine";
			osc.frequency.value = isFinal ? freq + 80 : freq;
			const peak = isFinal ? 0.09 : 0.045;
			const tail = isFinal ? 0.22 : 0.09;
			const now = ctx.currentTime;
			gain.gain.setValueAtTime(0.0001, now);
			gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
			gain.gain.exponentialRampToValueAtTime(0.0001, now + tail);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start(now);
			osc.stop(now + tail + 0.02);
		} catch {
			// אין תמיכה – פשוט בלי צליל
		}
	}

	function animateRing(target: number) {
		if (ringAnimated) return;
		ringAnimated = true;
		const duration = 2800; // ms - איטי יותר כדי שהמשתמש יראה את המעגל מתמלא
		const startTime = performance.now();
		let lastTickAt = 0;
		let lastReported = -1;

		function step(now: number) {
			const elapsed = now - startTime;
			const tNorm = Math.min(elapsed / duration, 1);
			// easeOutCubic - מילוי מורגש בסוף
			const eased = 1 - Math.pow(1 - tNorm, 3);
			const current = target * eased;
			animatedCompletion = Math.round(current);

			// צליל "טיק" כל ~140ms תוך כדי המילוי
			if (tNorm < 1 && now - lastTickAt > 140 && animatedCompletion !== lastReported) {
				playRingTone(current);
				lastTickAt = now;
				lastReported = animatedCompletion;
			}

			if (tNorm < 1) {
				requestAnimationFrame(step);
			} else {
				animatedCompletion = target;
				// צליל סיום בולט יותר
				playRingTone(target, true);
				// הגענו ל-100% → לסמן שהאנימציה רצה פעם אחת אחרונה ולא תחזור
				if (target >= 100) {
					try {
						localStorage.setItem(RING_DONE_KEY, "1");
					} catch {
						// אין localStorage – פשוט בלי שמירה
					}
				}
			}
		}
		requestAnimationFrame(step);
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
					// כבר חגגנו 100% בעבר → להציג את המעגל מלא מיד, בלי מילוי וצליל
					if (profileCompletion >= 100 && ringAlreadyCelebrated()) {
						ringAnimated = true;
						animatedCompletion = profileCompletion;
					} else {
						setTimeout(() => animateRing(profileCompletion), 400);
					}
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
	// קיצורי דרך בדסקטופ - גלילה למקטע המתאים + פתיחת התוכן שלו
	// (מקביל ל-selectTab בנייד, אך בדסקטופ הכל גלוי ולכן רק גוללים)
	function gotoSection(
		id: "main" | "messages" | "items" | "levels" | "profile",
	) {
		if (id === "main") {
			scrollToTop();
			return;
		}
		if (id === "messages") {
			showMessages = true;
			showFeedback = true;
			showReceivedMessages = true;
		} else if (id === "items") {
			showMyInfo = true;
		} else if (id === "levels") {
			showLevels = true;
		} else if (id === "profile") {
			isEditing = true;
		}
		const anchor = id === "profile" ? "sec-edit-profile" : `sec-${id}`;
		setTimeout(() => {
			const el = document.getElementById(anchor);
			if (!el) return;
			const top = el.getBoundingClientRect().top + window.scrollY - 80;
			slowScrollTo(top);
		}, 50);
	}
	// מיפוי שדות פרופיל ל-ID של האלמנט המתאים בטופס העריכה
	const profileFieldElementIds = [
		"p-name",          // 0  - שם
		"email",           // 1  - אימייל
		"p-avatar",        // 2  - תמונת פרופיל
		"p-nickname",      // 3  - כינוי
		"p-phone",         // 4  - טלפון
		"p-city",          // 5  - עיר
		"p-neighborhood",  // 6  - שכונה
		"p-gender",        // 7  - מגדר
		"p-business",      // 8  - עסק
		"p-family-status", // 9  - סטטוס משפחתי
		"p-birth-day",     // 10 - תאריך לידה
		"p-security",      // 11 - שאלת ביטחון
	] as const;

	function flashField(id: string) {
		const el = document.getElementById(id);
		if (!el) return;
		el.classList.remove("field-flash");
		// כפיית reflow כדי להפעיל מחדש את האנימציה אם קוראים פעמיים ברצף
		void (el as HTMLElement).offsetWidth;
		el.classList.add("field-flash");
		setTimeout(() => el.classList.remove("field-flash"), 1300);
	}

	function scrollToEditProfile() {
		if (profileCompletion >= 100) return;
		const wasEditing = isEditing;
		if (!wasEditing) isEditing = true;

		// מצא את השדה הראשון שלא מולא
		const missingIdx = profileFields.findIndex((f) => !f);
		const targetId =
			missingIdx >= 0 ? profileFieldElementIds[missingIdx] : null;

		// אם הטופס כבר פתוח – נגלול מיד; אחרת ניתן זמן ל-DOM להיבנות
		const delay = wasEditing ? 50 : 200;
		setTimeout(() => {
			const targetEl = targetId
				? document.getElementById(targetId)
				: null;
			const fallback = document.getElementById("sec-edit-profile");
			const el = targetEl ?? fallback;
			if (!el) return;
			const top = el.getBoundingClientRect().top + window.scrollY - 100;
			slowScrollTo(top);
			if (targetEl && targetId) {
				// היבהוב קל אחרי שהגלילה מתחילה
				setTimeout(() => flashField(targetId), 350);
			}
		}, delay);
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
		<div class="mb-4 p-4 bg-[#0f172a] rounded-2xl border border-white/10">
			<!-- שני כפתורים ראשיים: התחבר / הירשם -->
			<div class="flex flex-wrap justify-center gap-2">
				<button
					type="button"
					onclick={() => (showLoginOptions = !showLoginOptions)}
					aria-expanded={showLoginOptions}
					class="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600
				          hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold
				          shadow-lg transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
				>
					התחבר:
					<svg class="w-4 h-4 transition-transform duration-300 {showLoginOptions ? 'rotate-180' : ''}"
						viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
					</svg>
				</button>
				<a
					href="/register"
					class="group relative px-6 py-2.5 rounded-xl border border-white/15 hover:border-purple-500/50
				          text-gray-300 hover:text-white text-sm font-bold transition-all hover:bg-white/5"
				>
					הירשם
					<span class="absolute top-full right-1/2 translate-x-1/2 mt-2 hidden group-hover:block
					             bg-gray-900 text-white text-xs font-bold rounded-lg px-3 py-1.5
					             whitespace-nowrap border border-white/10 shadow-xl pointer-events-none z-50">
						צור חשבון חדש
					</span>
				</a>
			</div>

			<!-- אפשרויות התחברות - נפתחות בלחיצה על 'התחבר' -->
			{#if showLoginOptions}
				<div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
					<!-- 1. יוצאים לחירות (החשבון המאוחד לכל אתרי gofreeil) -->
					<button
						type="button"
						onclick={() => signIn("gofreeil-sso", { callbackUrl: "/profile" })}
						class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl cursor-pointer
						       bg-gradient-to-r from-amber-500/15 to-pink-500/15 border border-amber-400/30
						       hover:border-amber-400/60 text-sm font-bold text-white transition-all hover:-translate-y-0.5"
					>
						<span class="text-base">🕊️</span>
						עם יוצאים לחירות
					</button>
					<!-- 2. גוגל -->
					<button
						type="button"
						onclick={() => signIn("google", { callbackUrl: "/profile" })}
						class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10
						       border border-white/10 hover:border-red-400/40 text-sm font-bold text-gray-200 transition-all cursor-pointer"
					>
						<img src="https://www.google.com/favicon.ico" class="w-4 h-4" alt="" />
						עם גוגל
					</button>
					<!-- 3. פייסבוק -->
					<button
						type="button"
						onclick={() => signIn("facebook", { callbackUrl: "/profile" })}
						class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10
						       border border-white/10 hover:border-blue-400/40 text-sm font-bold text-gray-200 transition-all cursor-pointer"
					>
						<img src="https://www.facebook.com/favicon.ico" class="w-4 h-4" alt="" />
						עם פייסבוק
					</button>
					<!-- 4. שם משתמש וסיסמה -->
					<a
						href="/login?redirect=/profile"
						class="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10
						       border border-white/10 hover:border-purple-400/40 text-sm font-bold text-gray-200 transition-all"
					>
						<span class="text-base">🔑</span>
						עם שם משתמש וסיסמה
					</a>
				</div>
			{/if}
		</div>
	{/if}

	<!-- ===== ברוך הבא - הרשמה חדשה ===== -->
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

	<!-- ===== לשוניות ניווט - נייד בלבד ===== -->
	<div class="md:hidden flex gap-1 mb-3">
		{#each [{ id: "main", icon: "🎛️", label: "לוח הבקרה" }, { id: "profile", icon: "✏️", label: "פרופיל" }, { id: "messages", icon: "💬", label: "הודעות" }, { id: "items", icon: "💼", label: "נכסים" }, { id: "levels", icon: "🔑", label: "הרשאות" }] as tab}
			<button
				type="button"
				onclick={() => selectTab(tab.id as typeof mobileTab)}
				class="flex-1 min-w-0 flex flex-col items-center justify-center gap-1 px-1 py-2.5 rounded-2xl text-[13px] leading-tight font-bold transition-all
					{mobileTab === tab.id
					? 'bg-purple-600/30 border border-purple-500/50 text-white'
					: 'bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10'}"
			>
				<span class="text-xl leading-none">{tab.icon}</span>
				<span class="text-center">{tab.label}</span>
			</button>
		{/each}
	</div>

	<!-- ===== קיצורי דרך - דסקטופ בלבד ===== -->
	<!-- בדסקטופ כל המקטעים גלויים בערימה; הכפתורים גוללים ישירות למקטע המבוקש -->
	<div class="hidden md:flex flex-wrap gap-2 mb-3">
		{#each [{ id: "main", icon: "🎛️", label: "לוח הבקרה" }, { id: "profile", icon: "✏️", label: "פרופיל" }, { id: "messages", icon: "💬", label: "הודעות" }, { id: "items", icon: "💼", label: "נכסים" }, { id: "levels", icon: "🔑", label: "הרשאות" }] as sc}
			<button
				type="button"
				onclick={() =>
					gotoSection(sc.id as "main" | "messages" | "items" | "levels" | "profile")}
				class="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-purple-600/25 hover:border-purple-500/50 transition-all cursor-pointer"
			>
				<span class="text-base leading-none">{sc.icon}</span>
				<span>{sc.label}</span>
			</button>
		{/each}
	</div>

	<!-- באנר outage - מוצג כש-Strapi לא זמין -->
	{#if data.user && data.strapiAvailable === false}
		<div
			class="mb-3 rounded-2xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-500/15 to-orange-500/10 px-4 py-3 flex items-start gap-3 shadow-lg"
			role="alert"
		>
			<span class="text-2xl flex-shrink-0">⚠️</span>
			<div class="flex-1 min-w-0">
				<p class="text-amber-200 font-black text-sm md:text-base mb-0.5">
					בעיה זמנית בטעינת הפרופיל
				</p>
				<p class="text-amber-100/80 text-xs md:text-sm">
					המידע שלך מאובטח ולא נמחק.
					{#if data.userFromStaleCache}
						אנחנו מציגים נתונים מהזיכרון האחרון -
					{/if}
					נסה לרענן את הדף בהמשך.
				</p>
			</div>
			<button
				type="button"
				onclick={() => location.reload()}
				class="flex-shrink-0 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-200 text-xs font-black border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
			>
				🔄 רענן
			</button>
		</div>
	{/if}

	<!-- ===== טיפ לצופה - מעודד למלא שכונה ופרטים ===== -->
	{#if data.user && userLevel === 1 && !viewerTipDismissed}
		<div
			class="mb-4 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-blue-600/15 to-purple-600/15 px-4 py-3 md:px-5 md:py-4 flex items-start gap-3 shadow-lg"
			role="status"
		>
			<span class="text-2xl flex-shrink-0">👋</span>
			<div class="flex-1 min-w-0">
				<p class="text-white font-black text-sm md:text-base mb-0.5">
					כרגע אתה בדרגת <span class="text-purple-300">צופה</span>
				</p>
				<p class="text-gray-300 text-xs md:text-sm leading-relaxed">
					הוסף את השכונה שלך ושאר הפרטים בפרופיל כדי לקבל את מלוא
					השירות מהקהילה הקרובה למקומך וליהנות מכל יתרונות האתר.
				</p>
				<button
					type="button"
					onclick={scrollToEditProfile}
					class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/30 text-purple-100 text-xs md:text-sm font-black border border-purple-500/40 hover:bg-purple-600/50 transition-colors cursor-pointer"
				>
					✏️ השלמת הפרטים שלי
				</button>
			</div>
			<button
				type="button"
				onclick={dismissViewerTip}
				class="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
				aria-label="סגור"
			>
				✕
			</button>
		</div>
	{/if}

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
					class="w-7 h-7 rounded-full text-black text-sm font-black hidden md:flex items-center justify-center flex-shrink-0"
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
				<!-- כפתורי ניהול סופר־אדמין הועברו לסקציית "הנכסים שלי" → "ניהול האתר" -->

				{#if data.user}
					<button
						onclick={() => signOut({ callbackUrl: "/" })}
						class="text-sm font-bold text-gray-400 hover:text-red-400 transition-colors cursor-pointer px-4 py-2 rounded-xl hover:bg-red-500/10 border border-white/10 hover:border-red-500/30"
						title={tFn("logout_btn")}
					>
						{tFn("logout_btn")}
					</button>
				{/if}
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

					<!-- עיגול הודעות - שמאל מטה -->
					{#if finalUnreadCount > 0}
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
							{finalUnreadCount} הודעות
						</button>
					{/if}
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

			<!-- הארנק שלי - גם בנייד בלשונית ראשי -->
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
						{#if savedNeighborhood || savedCity}
							📍 {[savedNeighborhood, savedCity]
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
						class="text-sm text-amber-300 font-bold"
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

	<!-- ===== ניהול האתר (סופר־אדמין בלבד) - מתחת ללוח הבקרה ===== -->
	{#if isSuperAdmin}
		<div class="bg-gradient-to-br from-amber-500/10 to-emerald-500/10 rounded-2xl border border-amber-500/30 p-3 md:p-4 mb-2 {mobileTab !== 'main' ? 'hidden md:block' : ''}">
			<div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
				<h3 class="text-white font-bold text-sm flex items-center gap-2">
					<span class="text-amber-400 text-lg">👑</span>
					ניהול האתר
					<span class="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">סופר־אדמין</span>
				</h3>
			</div>
			<div class="flex flex-wrap gap-2">
				<a
					href="/admin?tab=users#coordinators"
					class="relative flex-1 min-w-[160px] text-xs md:text-sm font-bold text-amber-300 hover:text-amber-200 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-amber-500/10 border border-amber-500/30 hover:border-amber-400/50 flex items-center justify-center gap-1.5"
					title="ניהול משתמשים ורכזי שכונות"
				>
					🏘️ ניהול משתמשים
					{#if (data.coordinatorsCount ?? 0) > 0}
						<span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500/30 text-amber-100 border border-amber-400/40 text-[11px] font-black">
							{data.coordinatorsCount}
						</span>
					{/if}
				</a>
				<a
					href="/admin/ads-review"
					class="relative flex-1 min-w-[160px] text-xs md:text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400/50 flex items-center justify-center gap-1.5"
					title="ניהול תוכן, פרסומות, תזמון ומפרסמים"
				>
					📢 ניהול תוכן
					{#if (data.pendingAdsCount ?? 0) > 0}
						<span class="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-black text-[11px] font-black shadow-lg animate-pulse">
							{data.pendingAdsCount}
						</span>
					{/if}
				</a>
				<a
					href="/coordinator"
					class="flex-1 min-w-[160px] text-xs md:text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400/50 flex items-center justify-center gap-1.5"
					title="אישור אירועים שכונתיים"
				>
					🏘️ אזור רכזים
				</a>
				{#if isPrimaryAdmin}
					<a
						href="https://api.gofreeil.com/admin"
						target="_blank"
						rel="noopener noreferrer"
						class="flex-1 min-w-[160px] text-xs md:text-sm font-bold text-rose-300 hover:text-rose-200 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-rose-500/10 border border-rose-500/30 hover:border-rose-400/50 flex items-center justify-center gap-1.5"
						title="גישה ישירה ל-Strapi (פרטי - רק לך)"
					>
						🗄️ Strapi DB
					</a>
				{/if}
			</div>
		</div>
	{:else if ((data.user as any)?.coordinator_of?.length ?? 0) > 0}
		<div class="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 rounded-2xl border border-emerald-500/30 p-3 md:p-4 mb-2 {mobileTab !== 'main' ? 'hidden md:block' : ''}">
			<div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
				<h3 class="text-white font-bold text-sm flex items-center gap-2">
					<span class="text-emerald-400 text-lg">🏘️</span>
					אזור רכזים
				</h3>
			</div>
			<a
				href="/coordinator"
				class="block text-center text-xs md:text-sm font-bold text-emerald-300 hover:text-emerald-200 transition-colors cursor-pointer px-3 py-2 rounded-lg hover:bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-400/50"
				title="אישור אירועים שכונתיים"
			>
				כניסה לאישור אירועים
			</a>
		</div>
	{/if}

	<!-- ===== קומה 2: הודעות אישיות ===== -->
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
					class="w-7 h-7 rounded-full text-black text-sm font-black hidden md:flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>2</span
				>
				הודעות אישיות
			</h2>
			<div class="flex items-center gap-2">
				{#if finalUnreadCount > 0}
					<span
						class="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full font-bold"
						>{finalUnreadCount} הודעות שלא נקראו</span
					>
				{/if}
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
				{#each finalDisplayedMessages as msg}
					{@const isDraft = (msg as { isDraft?: boolean }).isDraft}
					{@const isSinglesMatch = msg.id === 'singles-match'}
					{@const msgLink = (msg as { link?: string }).link}
					{@const navTarget = isSinglesMatch ? '/singles' : msgLink}
					{@const isClickable = !!navTarget}
					<div
						role={isClickable ? 'link' : undefined}
						tabindex={isClickable ? 0 : undefined}
						aria-label={isSinglesMatch ? 'פתח את לוח פנויים/פנויות' : (isClickable ? 'פתח את ההודעה בעמוד הניהול' : undefined)}
						onclick={isClickable ? () => goto(navTarget!) : undefined}
						onkeydown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goto(navTarget!); } } : undefined}
						class="flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all
							{isClickable ? 'cursor-pointer hover:scale-[1.01] hover:shadow-lg focus:outline-none focus:ring-2' : ''}
							{isSinglesMatch ? 'hover:shadow-pink-500/10 focus:ring-pink-400/60' : (isClickable ? 'hover:shadow-blue-500/10 focus:ring-blue-400/60' : '')}
							{isDraft
								? 'bg-gradient-to-br from-purple-900/30 to-indigo-900/20 border-purple-500/50 hover:border-purple-400/70'
								: isSinglesMatch
									? 'bg-gradient-to-br from-pink-900/30 to-rose-900/20 border-pink-500/40 hover:border-pink-400/60'
									: msg.read
										? 'bg-white/5 border-white/5 hover:border-white/15'
										: 'bg-white/5 border-orange-500/20 hover:border-white/15'}"
					>
						<div
							class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0
								{isDraft ? 'bg-purple-400 animate-pulse' : msg.read ? 'bg-white/10' : 'bg-orange-500'}"
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
							<p class="text-gray-300 text-xs leading-relaxed">{msg.text}</p>
							{#if isDraft}
								<div class="flex items-center gap-1.5 justify-between mt-2 flex-wrap">
									<a href="/about/advertise/builder"
									   class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-colors">
										🚀 סיים את העריכה
									</a>
									<div class="flex items-center gap-1.5 flex-wrap">
										<button
											type="button"
											onclick={() => snoozeMsg(msg.id)}
											class="text-[11px] text-gray-400 hover:text-yellow-300 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-500/10"
											title="תוצג שוב בעוד יומיים"
										>
											🔔 הזכר לי בהמשך
										</button>
										<button
											type="button"
											onclick={() => archiveMsg(msg.id)}
											class="text-[11px] text-gray-400 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-500/10"
											title="העבר לארכיון"
										>
											📦 לארכיון
										</button>
										<button
											type="button"
											onclick={() => deleteMsg(msg.id)}
											class="text-[11px] text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
											title="הסר את ההודעה (הטיוטא תישאר)"
										>
											🗑 מחק
										</button>
									</div>
								</div>
							{:else}
								<div
									class="flex items-center gap-1.5 justify-end mt-2 pt-2 border-t border-white/8 flex-wrap"
									onclick={(e) => e.stopPropagation()}
									onkeydown={(e) => e.stopPropagation()}
									role="group"
								>
									<button
										type="button"
										onclick={(e) => { e.stopPropagation(); markRead(msg.id); }}
										class="text-[11px] text-gray-400 hover:text-green-400 transition-colors px-2 py-1 rounded-lg hover:bg-green-500/10"
										title="סמן כנקראה - תוסר מהפרופיל"
									>
										סמן כנקראה
									</button>
									<button
										type="button"
										onclick={(e) => { e.stopPropagation(); snoozeMsg(msg.id); }}
										class="text-[11px] text-gray-400 hover:text-yellow-300 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-500/10"
										title="תוצג שוב בעוד יומיים"
									>
										🔔 הזכר לי בהמשך
									</button>
									<button
										type="button"
										onclick={(e) => { e.stopPropagation(); archiveMsg(msg.id); }}
										class="text-[11px] text-gray-400 hover:text-blue-400 transition-colors px-2 py-1 rounded-lg hover:bg-blue-500/10"
										title="העבר לארכיון"
									>
										📦 לארכיון
									</button>
									<button
										type="button"
										onclick={(e) => { e.stopPropagation(); deleteMsg(msg.id); }}
										class="text-[11px] text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
										title="מחק לצמיתות"
									>
										🗑 מחק
									</button>
								</div>
							{/if}
						</div>
					</div>
				{/each}

				<!-- מצב ריק: אין הודעות פעילות → 0 שלא נקראו + קישור להיסטוריה -->
				{#if finalDisplayedMessages.length === 0}
					<div class="flex flex-col items-center text-center py-6 gap-3">
						<div class="text-4xl">📭</div>
						<p class="font-bold text-gray-300">0 הודעות שלא נקראו</p>
						<a
							href="/messages"
							class="inline-flex items-center gap-1.5 text-sm font-bold text-blue-300 hover:text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-4 py-2 rounded-xl transition-colors"
						>
							🗂️ להיסטוריית ההודעות
						</a>
					</div>
				{/if}

				<!-- כפתור הצגת הארכיון -->
				{#if archivedList.length > 0}
					<button
						type="button"
						onclick={() => (showArchive = !showArchive)}
						class="self-start text-xs font-bold text-blue-300 hover:text-blue-200 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 mt-1"
					>
						📦 ארכיון ההודעות
						<span class="bg-blue-500/30 text-white rounded-full px-2 py-0.5 text-[10px]">{archivedList.length}</span>
						<svg class="w-3 h-3 transition-transform {showArchive ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
					</button>

					{#if showArchive}
						<div class="flex flex-col gap-2 mt-1">
							<p class="text-[11px] text-gray-500 px-1">הודעות שהעברת לארכיון</p>
							{#each archivedList as msg}
								<div class="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3">
									<div class="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-blue-400/60"></div>
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between gap-2 mb-0.5">
											<span class="text-gray-300 text-xs font-black">{msg.from}</span>
											<span class="text-gray-600 text-[10px] flex-shrink-0">{msg.time}</span>
										</div>
										<p class="text-gray-400 text-xs leading-relaxed">{msg.text}</p>
										<div class="flex items-center gap-1.5 justify-end mt-2 pt-2 border-t border-white/8 flex-wrap">
											<button
												type="button"
												onclick={() => unarchiveMsg(msg.id)}
												class="text-[11px] text-gray-400 hover:text-green-400 transition-colors px-2 py-1 rounded-lg hover:bg-green-500/10"
												title="החזר להודעות הפעילות"
											>
												↩️ שחזר
											</button>
											<button
												type="button"
												onclick={() => { unarchiveMsg(msg.id); deleteMsg(msg.id); }}
												class="text-[11px] text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
												title="מחק לצמיתות"
											>
												🗑 מחק
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}

				<!-- היסטוריית הודעות שטופלו (התראות פנויים אחרי שכל הממתינים אושרו/נדחו) -->
				{#if handledList.length > 0}
					<button
						type="button"
						onclick={() => (showHandled = !showHandled)}
						class="self-start text-xs font-bold text-green-300 hover:text-green-200 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 mt-1"
					>
						✅ הודעות שטופלו
						<span class="bg-green-500/30 text-white rounded-full px-2 py-0.5 text-[10px]">{handledList.length}</span>
						<svg class="w-3 h-3 transition-transform {showHandled ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
					</button>

					{#if showHandled}
						<div class="flex flex-col gap-2 mt-1">
							<p class="text-[11px] text-gray-500 px-1">התראות שכל הממתינים בהן כבר טופלו</p>
							{#each handledList as msg}
								<div class="flex items-start gap-3 rounded-2xl border border-green-500/20 bg-green-500/[0.04] px-4 py-3">
									<div class="w-5 h-5 rounded-full mt-0.5 flex-shrink-0 bg-green-500/20 border border-green-500/40 flex items-center justify-center">
										<span class="text-green-400 text-xs font-black leading-none">✓</span>
									</div>
									<div class="min-w-0 flex-1">
										<div class="flex items-center justify-between gap-2 mb-0.5">
											<span class="text-gray-300 text-xs font-black">{msg.from}</span>
											<span class="text-gray-600 text-[10px] flex-shrink-0">{msg.time}</span>
										</div>
										<p class="text-gray-400 text-xs leading-relaxed">{msg.text}</p>
										<div class="flex items-center gap-1.5 justify-between mt-2 pt-2 border-t border-white/8 flex-wrap">
											<span class="inline-flex items-center gap-1 text-[10px] font-bold text-green-300 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-full">
												✓ טופלה
											</span>
											<button
												type="button"
												onclick={() => deleteMsg(msg.id)}
												class="text-[11px] text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
												title="מחק לצמיתות"
											>
												🗑 מחק
											</button>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}

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

				<!-- קבוצות וואטסאפ של השכונה (מידע קהילתי - תמיד מוצג כשיש התאמה) -->
				{#if whatsappMatches.length > 0}
					<div class="mt-2 flex flex-col gap-2">
						<p class="text-xs text-gray-400 uppercase tracking-widest font-bold">
							💬 קבוצות וואטסאפ של השכונה שלך
						</p>
						{#each whatsappMatches as g}
							<a
								href={g.url}
								target="_blank"
								rel="noopener noreferrer"
								class="block rounded-xl border border-green-500/30 bg-green-500/10 hover:bg-green-500/20 transition-colors px-3 py-2"
							>
								<p class="text-white font-bold text-sm">💬 {g.label}</p>
								<p class="text-green-300/80 text-xs mt-0.5">הצטרף לקבוצת הווטסאפ של השכונה שלך ←</p>
							</a>
						{/each}
					</div>
				{/if}

				<!-- המלצה יומית (מתחלפת מדי יום עד שמיצינו את כל הרשימה) -->
				{#if todaysRec}
					<div class="mt-2 flex flex-col gap-3">
						<p class="text-xs text-gray-400 uppercase tracking-widest font-bold">
							💡 ההמלצה היומית שלך
						</p>
						<div class="rounded-2xl border px-4 pt-4 pb-3 {recColorClasses(todaysRec.color)}">
							<div class="flex items-center gap-3 mb-3">
								<span class="text-3xl flex-shrink-0">{todaysRec.emoji}</span>
								<div class="flex-1 text-right">
									<p class="text-white font-bold text-sm">{todaysRec.title}</p>
									<p class="text-xs mt-0.5 {recSubColorClass(todaysRec.color)}">
										{todaysRec.sub} ←
									</p>
								</div>
							</div>
							<div class="flex items-center gap-2 justify-end border-t border-white/8 pt-2.5">
								<button
									type="button"
									onclick={() => dismissRec(todaysRec!.id)}
									class="text-[11px] text-gray-500 hover:text-red-400 transition-colors px-2 py-1 rounded-lg hover:bg-red-500/10"
								>
									🗑 מחק
								</button>
								<button
									type="button"
									onclick={() => snoozeRec(todaysRec!.id)}
									class="text-[11px] text-gray-500 hover:text-yellow-300 transition-colors px-2 py-1 rounded-lg hover:bg-yellow-500/10"
								>
									🔔 הזכר לי מחר
								</button>
								<a
									href={todaysRec.href}
									target={todaysRec.external ? "_blank" : "_self"}
									rel={todaysRec.external ? "noopener noreferrer" : ""}
									class="text-[11px] font-bold text-white px-3 py-1 rounded-lg transition-colors {recButtonClasses(todaysRec.color)}"
								>
									עבור אל ←
								</a>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- ===== קומה 3: המידע שלי ===== -->
	<div
		id="sec-items"
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
					class="w-7 h-7 rounded-full text-black text-sm font-black hidden md:flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>3</span
				>
				הנכסים שלי
			</h2>
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

		{#if showMyInfo}
			<div class="flex flex-col gap-4">
				<!-- ===== ערבי מפגש / סעודות קהילתיות ===== -->
				<a href="/gatherings" class="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-amber-500/15 to-rose-500/10 border border-amber-500/30 hover:border-amber-500/60 px-4 py-3.5 transition-all group">
					<span class="text-3xl flex-shrink-0">🍽️</span>
					<div class="flex-1 min-w-0">
						<p class="text-white font-bold text-sm">ערבי מפגש וסעודות קהילתיות</p>
						<p class="text-amber-200/80 text-xs mt-0.5">הקימו סעודה משותפת, חלקו את רשימת המאכלים וראו מי מגיע</p>
					</div>
					<span class="text-amber-300 text-lg flex-shrink-0 transition-transform group-hover:translate-x-[-3px]" aria-hidden="true">←</span>
				</a>

				<!-- ===== סאב-מקטע: פרסומיי ===== -->
				<div class="bg-[#0a1224]/60 rounded-2xl border border-white/10 p-3 md:p-4">
					<div class="flex items-center justify-between gap-2 mb-3 flex-wrap">
						<h3 class="text-white font-bold text-sm flex items-center gap-2">
							<span class="text-purple-400 text-lg">📋</span>
							פרסומיי
							{#if data.items.length > 0}
								<span class="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">{data.items.length}</span>
							{/if}
						</h3>
						{#if isSuperAdmin}
							<a
								href="/about/advertise/builder"
								class="text-xs font-bold text-purple-300 hover:text-purple-200 transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-purple-500/10 border border-purple-500/30 hover:border-purple-400/50 flex items-center gap-1.5"
								title="בילדר פרסומות (סופר-אדמין)"
							>
								🎨 בילדר פרסומות
							</a>
						{/if}
					</div>

					{#if adDraft}
						<div class="mb-3 rounded-2xl border-2 border-purple-500/40 bg-gradient-to-br from-purple-900/30 to-indigo-900/20 p-3 md:p-4">
							<div class="flex items-start gap-3">
								{#if adDraft.mainImage}
									<img src={adDraft.mainImage} alt="טיוטת הפרסומת" class="w-14 h-14 md:w-16 md:h-16 rounded-xl object-cover flex-shrink-0 border border-white/10" />
								{:else}
									<div class="w-14 h-14 md:w-16 md:h-16 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center flex-shrink-0 text-2xl">🎨</div>
								{/if}
								<div class="flex-1 min-w-0">
									<div class="flex items-center gap-2 mb-1 flex-wrap">
										<span class="text-purple-300 font-black text-sm md:text-base">📝 פרסומת בעריכה</span>
										<span class="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">{adDraftProgress}% הושלמו</span>
									</div>
									<p class="text-white font-bold text-xs md:text-sm leading-tight mb-2 truncate">
										{adDraft.title || "ללא כותרת"}{adDraft.subtitle ? " - " + adDraft.subtitle : ""}
									</p>
									<div class="flex items-center gap-2 flex-wrap">
										<a href="/about/advertise/builder"
										   class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-xs transition-colors">
											🚀 המשך לערוך
										</a>
										<button type="button" onclick={dismissAdDraft}
										   class="text-[11px] text-gray-400 hover:text-red-400 underline underline-offset-2 font-bold">
											מחק טיוטה
										</button>
									</div>
								</div>
							</div>
						</div>
					{/if}

					{#if giveawayDrafts.length > 0}
						<a
							href="/giveaways/my?tab=drafts"
							class="flex items-center gap-3 mb-4 rounded-2xl bg-gradient-to-r from-yellow-900/30 to-amber-900/20 border border-yellow-500/30 hover:border-yellow-400/60 px-4 py-3 transition-all group"
						>
							<span class="text-3xl flex-shrink-0">📝</span>
							<div class="flex-1 min-w-0">
								<p class="text-yellow-200 font-bold text-sm">
									{giveawayDrafts.length === 1
										? "טיוטה אחת ממתינה לתמונה"
										: `${giveawayDrafts.length} טיוטות ממתינות לתמונה`}
								</p>
								<p class="text-yellow-300/70 text-xs mt-0.5">
									השלם את הפרסום על ידי הוספת תמונה למוצר למסירה
								</p>
							</div>
							<span
								class="text-yellow-300 text-lg flex-shrink-0 group-hover:translate-x-[-3px] transition-transform"
								aria-hidden="true">←</span
							>
						</a>
					{/if}
					{#if data.items.length === 0}
						<div class="text-center py-8">
							<span class="text-5xl block mb-3">📭</span>
							<p class="text-gray-400 mb-4 text-sm">{tFn("no_items")}</p>
							<a
								href="/"
								class="inline-block bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500
							       text-white font-bold px-6 py-3 rounded-xl shadow-lg transition-all hover:-translate-y-0.5"
							>
								{tFn("publish_first")}
							</a>
						</div>
					{:else}
						<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
							{#each data.items.filter(i => !deletedItemIds.includes(i.id)) as item}
								<div class="bg-white/5 rounded-2xl border border-white/10 p-4 hover:border-purple-500/30 hover:bg-white/8 transition-all group">
								<a
									href="/items/{item.id}"
									class="block"
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
														: item.status === 'frozen'
														? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
														: 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}"
												>
													{item.status === "active"
														? tFn("status_active")
														: item.status === "frozen"
															? "לא פעילה"
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
											<div class="flex items-center gap-3 mt-1.5 flex-wrap">
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
												{#if item.view_count !== undefined}
													<span
														class="text-yellow-400/70 text-xs flex items-center gap-1"
													>
														{item.view_count} ביקורים
													</span>
												{/if}
											</div>
										</div>
									</div>
								</a>
								<div class="mt-3 pt-3 border-t border-white/5 flex justify-end gap-2 flex-wrap">
									{#if item.status === 'frozen' && !republishedItemIds.includes(item.id)}
										<button
											type="button"
											onclick={() => republishOwnItem(item.id)}
											disabled={republishingItemId === item.id}
											class="text-[11px] font-bold text-green-400/90 hover:text-green-300 hover:bg-green-500/10 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
											title="פרסם מחדש בלוח הציבורי"
										>{republishingItemId === item.id ? '...' : '🚀 פרסם שנית'}</button>
									{:else if republishedItemIds.includes(item.id)}
										<span class="text-[11px] font-bold text-green-300 px-2.5 py-1">✓ פורסם מחדש</span>
									{/if}
									<button
										type="button"
										onclick={() => deleteOwnItem(item.id, item.label)}
										disabled={deletingItemId === item.id}
										class="text-[11px] font-bold text-red-400/80 hover:text-red-300 hover:bg-red-500/10 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
										title="מחיקה לצמיתות (אינה הפיכה)"
									>{deletingItemId === item.id ? '...' : '🗑 מחק לצמיתות'}</button>
								</div>
							</div>
							{/each}
						</div>
					{/if}
				</div>

				<!-- ===== סאב-מקטע: האהבתי (קיצורי דרך לפריטים שאהבתי) ===== -->
				<div class="bg-[#0a1224]/60 rounded-2xl border border-white/10 p-3 md:p-4">
					<h3 class="text-white font-bold text-sm mb-3 flex items-center gap-2">
						<span class="text-lg" aria-hidden="true">❤️</span>
						האהבתי
						{#if likedItems.length > 0}
							<span class="text-xs bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-0.5 rounded-full font-bold">{likedItems.length}</span>
						{/if}
					</h3>

					{#if likedItems.length === 0}
						<div class="text-center py-6">
							<span class="text-4xl block mb-2">💔</span>
							<p class="text-gray-400 text-sm mb-3">
								עדיין לא סימנת פריטים או אישיות שאהבת
							</p>
							<p class="text-gray-500 text-xs leading-relaxed">
								לחצי/לחץ על ❤️ בדף
								<a href="/giveaways" class="text-orange-400 hover:text-orange-300 font-bold">למסירה</a>,
								בדף
								<a href="/singles" class="text-pink-400 hover:text-pink-300 font-bold">פנויים ופנויות</a>
								או בדף
								<a href="/babysitters" class="text-rose-400 hover:text-rose-300 font-bold">בייבי סיטר</a>
								כדי להוסיף לכאן קיצור דרך מהיר.
							</p>
						</div>
					{:else}
						<div class="flex flex-col gap-4">
							{#if likedGiveaways.length > 0}
								<div>
									<h4 class="text-white font-bold text-xs mb-2 flex items-center gap-2">
										<span class="text-orange-400">🎁</span>
										פריטים למסירה ({likedGiveaways.length})
									</h4>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
										{#each likedGiveaways as it (it.id)}
											<div class="group relative flex items-center gap-3 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-orange-500/40 rounded-2xl p-3 transition-all">
												<a
													href={it.url}
													class="flex items-center gap-3 flex-1 min-w-0"
												>
													{#if it.image}
														<img
															src={it.image}
															alt=""
															loading="lazy"
															class="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-[#0a0f1a]"
														/>
													{:else}
														<div class="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center text-2xl flex-shrink-0">🎁</div>
													{/if}
													<div class="min-w-0 flex-1">
														<p class="text-white text-sm font-bold truncate group-hover:text-orange-300 transition-colors">{it.label}</p>
														{#if it.summary}
															<p class="text-gray-400 text-xs truncate mt-0.5">📍 {it.summary}</p>
														{/if}
													</div>
												</a>
												<button
													type="button"
													onclick={() => unlike(it)}
													aria-label="הסר מהאהובים"
													title="הסר מהאהובים"
													class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-base transition-colors"
												>❤️</button>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if likedSingles.length > 0}
								<div>
									<h4 class="text-white font-bold text-xs mb-2 flex items-center gap-2">
										<span class="text-pink-400">💑</span>
										פנויים ופנויות ({likedSingles.length})
									</h4>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
										{#each likedSingles as it (it.id)}
											<div class="group relative flex items-center gap-3 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-pink-500/40 rounded-2xl p-3 transition-all">
												<a
													href={it.url}
													class="flex items-center gap-3 flex-1 min-w-0"
												>
													<div class="w-14 h-14 rounded-full bg-pink-500/20 flex items-center justify-center text-2xl flex-shrink-0">
														{it.summary?.startsWith("👨") ? "👨" : "👩"}
													</div>
													<div class="min-w-0 flex-1">
														<p class="text-white text-sm font-bold truncate group-hover:text-pink-300 transition-colors">{it.label}</p>
														{#if it.summary}
															<p class="text-gray-400 text-xs truncate mt-0.5">{it.summary}</p>
														{/if}
													</div>
												</a>
												<button
													type="button"
													onclick={() => unlike(it)}
													aria-label="הסר מהאהובים"
													title="הסר מהאהובים"
													class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-base transition-colors"
												>❤️</button>
											</div>
										{/each}
									</div>
								</div>
							{/if}

							{#if likedBabysitters.length > 0}
								<div>
									<h4 class="text-white font-bold text-xs mb-2 flex items-center gap-2">
										<span class="text-rose-400">👶</span>
										בייבי סיטר ({likedBabysitters.length})
									</h4>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-3">
										{#each likedBabysitters as it (it.id)}
											<div class="group relative flex items-center gap-3 bg-white/5 hover:bg-white/8 border border-white/10 hover:border-rose-500/40 rounded-2xl p-3 transition-all">
												<a
													href={it.url}
													class="flex items-center gap-3 flex-1 min-w-0"
												>
													<div class="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">👶</div>
													<div class="min-w-0 flex-1">
														<p class="text-white text-sm font-bold truncate group-hover:text-rose-300 transition-colors">{it.label}</p>
														{#if it.summary}
															<p class="text-gray-400 text-xs truncate mt-0.5">📍 {it.summary}</p>
														{/if}
													</div>
												</a>
												<button
													type="button"
													onclick={() => unlike(it)}
													aria-label="הסר מהאהובים"
													title="הסר מהאהובים"
													class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 hover:text-rose-200 text-base transition-colors"
												>❤️</button>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</div>

	<!-- ===== קומה 4: דרגה והרשאות ===== -->
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
					class="w-7 h-7 rounded-full text-black text-sm font-black hidden md:flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>4</span
				>
				דרגה והרשאות
			</h2>
			<!-- סיכום דרגה נוכחית -->
			<div class="flex items-center gap-2">
				{#if isSuperAdmin}
					<span
						class="text-sm bg-red-500/20 text-red-300 border border-red-500/30 px-3 py-1.5 rounded-full font-bold"
						>דרגה נוכחית - מנהל ראשי 👑</span
					>
				{:else if (data.user as any)?.role === "neighborhood_admin"}
					<span
						class="text-sm bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1.5 rounded-full font-bold"
						>דרגה נוכחית - אדמין שכונתי 🛡️</span
					>
				{:else if ((data.user as any)?.coordinator_of?.length ?? 0) > 0}
					<span
						class="text-sm bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1.5 rounded-full font-bold"
						>דרגה נוכחית - רכז שכונה 🏘️</span
					>
				{:else if userLevel >= 2}
					<span
						class="text-sm bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-full font-bold"
						>דרגה נוכחית - משתמש</span
					>
				{:else}
					<span
						class="text-sm bg-gray-500/20 text-gray-300 border border-gray-500/30 px-3 py-1.5 rounded-full font-bold"
						>דרגה נוכחית - צופה</span
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
			<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

				<!-- דרגה 3: רכז שכונה (לא כולל סופר־אדמין) -->
				<a
					href={isCoordOrNbhAdmin ? "/admin" : undefined}
					class="relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all no-underline
		       {isCoordOrNbhAdmin
							? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10 hover:bg-blue-500/20 cursor-pointer'
							: 'border-white/10 bg-white/3 opacity-60 pointer-events-none'}"
					title={isCoordOrNbhAdmin ? "ניהול תוכן בשכונה שלך" : ""}
				>
					{#if isCoordOrNbhAdmin}
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
			             {isCoordOrNbhAdmin
									? 'bg-blue-500 text-white'
									: 'bg-white/10 text-gray-400'}">3</span
						>
						<span class="font-black text-white text-base"
							>רכז שכונה 🏘️</span
						>
						{#if isCoordOrNbhAdmin}
							<span
								class="mr-auto text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold"
								>הדרגה שלך</span
							>
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
								>ניהול תוכן בשכונה שלו</span
							>
						</div>
					</div>
				</a>

				<!-- דרגה 4: מנהל ראשי (סופר־אדמין) -->
				<a
					href={isSuperAdmin ? "/admin" : undefined}
					class="relative rounded-2xl border-2 p-5 flex flex-col gap-3 transition-all no-underline
		       {isSuperAdmin
							? 'border-red-500 bg-gradient-to-br from-red-500/15 to-amber-500/10 shadow-lg shadow-red-500/20 hover:from-red-500/25 hover:to-amber-500/20 cursor-pointer'
							: 'border-white/10 bg-white/3 opacity-60 pointer-events-none'}"
					title={isSuperAdmin ? "פאנל ניהול ראשי" : "דרגה זו בלעדית למנהל הראשי של האתר"}
				>
					{#if isSuperAdmin}
						<div
							class="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-red-500 border-[3px] border-[#0f172a] flex items-center justify-center shadow-lg shadow-red-500/50 z-10"
						>
							<span class="text-white font-black text-lg leading-none">✓</span>
						</div>
					{/if}
					<div class="flex items-center gap-2 flex-wrap">
						<span
							class="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0
			             {isSuperAdmin
									? 'bg-red-500 text-white'
									: 'bg-white/10 text-gray-400'}">4</span
						>
						<span class="font-black text-white text-base"
							>מנהל ראשי 👑</span
						>
						{#if isSuperAdmin}
							<span
								class="mr-auto text-[10px] bg-red-500/20 text-red-300 border border-red-500/40 px-2 py-0.5 rounded-full font-bold whitespace-nowrap"
								>הדרגה שלך</span
							>
						{/if}
					</div>
					<div class="flex flex-col gap-1.5">
						<div class="flex items-center gap-1.5">
							<span class="text-red-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>כל הרשאות הרכזים</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-red-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>אישור פרסומות + מינוי רכזים</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-red-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>ניהול משתמשים והרשאות</span
							>
						</div>
						<div class="flex items-center gap-1.5">
							<span class="text-red-400 text-sm">✓</span>
							<span class="text-gray-300 text-xs font-bold"
								>ניהול תוכן בכל האתר</span
							>
						</div>
					</div>
				</a>
			</div>
		{/if}
	</div>

	<!-- ===== קומה 5: פרטי פרופיל ===== -->
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
					class="w-7 h-7 rounded-full text-black text-sm font-black hidden md:flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>5</span
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
							// עדכן snapshot כדי שעריכה הבאה תתחיל "נקי"
							initialSnapshot.name              = name;
							initialSnapshot.email             = email;
							initialSnapshot.nickname          = nickname;
							initialSnapshot.phone             = phone;
							initialSnapshot.city              = city;
							initialSnapshot.neighborhood      = neighborhood;
							initialSnapshot.business          = business;
							initialSnapshot.family_status     = family_status;
							initialSnapshot.gender            = gender;
							initialSnapshot.birth_date        = composedBirth;
							initialSnapshot.notifications     = notifications;
							initialSnapshot.security_question   = security_question;
							initialSnapshot.security_answer     = security_answer;
							initialSnapshot.security_question_2 = security_question_2;
							initialSnapshot.security_answer_2   = security_answer_2;
							initialSnapshot.status              = status;
							avatarBase64 = "";
							// עדכן ערכי תצוגה בלוח המכוונים
							savedCity         = city;
							savedNeighborhood = neighborhood;
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
								{name || "-"}
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
								{email || "-"}
							</p>
						{/if}
					</div>

					<!-- תמונת פרופיל -->
					{#if isEditing}
						<div id="p-avatar" class="md:col-span-2 flex items-center gap-5">
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
								{nickname || "-"}
							</p>
						{/if}
					</div>

					<!-- מגדר -->
					<div id="p-gender">
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
										: "-"}
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
								inputmode="tel"
								dir="ltr"
								maxlength="20"
								bind:value={phone}
								onblur={normalizePhoneInput}
								placeholder="050-0000000"
								class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl
							       px-4 py-3 text-white text-sm transition-colors outline-none text-right"
							/>
							<p class="text-xs text-gray-500 mt-1.5">{tFn("phone_hint")}</p>
						{:else}
							<p class="text-white font-medium py-3 px-1">
								{phone || "-"}
							</p>
						{/if}
					</div>

					<!-- עיר + שכונה - תמיד ביחד -->
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
								<div class="relative">
									<input
										id="p-city"
										type="text"
										autocomplete="off"
										bind:value={cityQuery}
										oninput={() => {
											showCitySuggestions = true;
											cityHighlightIdx = -1;
											locationInteracted = true;
											if (cityQuery !== city) city = "";
										}}
										onfocus={() => {
											showCitySuggestions = true;
											locationInteracted = true;
										}}
										onblur={() => setTimeout(() => (showCitySuggestions = false), 150)}
										onkeydown={onCityInputKey}
										placeholder={tFn("choose_city") + " - הקלד לחיפוש..."}
										class="w-full bg-[#070b14] border {!city
											? 'border-red-500/50'
											: 'border-white/10'} focus:border-purple-500/50 rounded-xl
									       px-4 py-3 text-white text-sm transition-colors outline-none placeholder-white/30"
									/>
									<input type="hidden" name="city" value={city} />
									{#if showCitySuggestions}
										{@const list = citySuggestions()}
										<ul
											class="absolute z-50 right-0 left-0 mt-1 max-h-64 overflow-y-auto rounded-xl
											       bg-[#0f172a] border border-purple-500/30 shadow-2xl"
											role="listbox"
										>
											{#if list.length === 0}
												<li class="px-4 py-3 text-gray-400 text-xs">
													לא נמצאו ערים תואמות. מלא ב"לא מצאת את העיר?" למטה.
												</li>
											{:else}
												{#each list as c, i}
													<li
														role="option"
														aria-selected={cityHighlightIdx === i}
														onmousedown={() => pickCity(c)}
														onmouseenter={() => (cityHighlightIdx = i)}
														class="px-4 py-2 text-sm text-white cursor-pointer transition-colors
														       {cityHighlightIdx === i ? 'bg-purple-600/30' : 'hover:bg-white/5'}
														       {c === city ? 'font-bold text-purple-300' : ''}"
													>
														{c}
													</li>
												{/each}
											{/if}
										</ul>
									{/if}
								</div>
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{city || "-"}
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
								{#if !cityWithoutNeighborhoods}
									<span class="text-red-400">*</span>
								{/if}
							</label>
							{#if isEditing}
								{#if cityWithoutNeighborhoods}
									<!-- אין שכונות אמיתיות בעיר זו - רק "מרכז", מסומן אוטומטית -->
									<input type="hidden" name="neighborhood" value="מרכז" />
									<button
										type="button"
										onclick={() => pickNeighborhood("מרכז")}
										class="w-full text-right bg-[#070b14] border border-white/10 rounded-xl
									       px-4 py-3 text-white text-sm transition-colors outline-none flex items-center justify-between gap-2"
									>
										<span>מרכז</span>
										<span class="text-green-400 text-xs">✓ נבחר</span>
									</button>
									<p class="text-gray-400 text-xs leading-relaxed mt-1.5">
										בעיר זו לא קיימת שכונה, רק מרכז — אפשר לשמור עם העיר בלבד.
									</p>
								{:else}
									<div class="relative">
										<input type="hidden" name="neighborhood" value={neighborhood} />
										<button
											id="p-neighborhood"
											type="button"
											onclick={() => { if (city) showNbSuggestions = !showNbSuggestions; locationInteracted = true; }}
											onblur={() => setTimeout(() => (showNbSuggestions = false), 150)}
											disabled={!city}
											class="w-full text-right bg-[#070b14] border {!neighborhood
												? 'border-red-500/50'
												: 'border-white/10'} focus:border-purple-500/50 rounded-xl
										       px-4 py-3 text-sm transition-colors outline-none flex items-center justify-between gap-2
										       disabled:opacity-40 disabled:cursor-not-allowed {neighborhood ? 'text-white' : 'text-white/40'}"
										>
											<span>{neighborhood || tFn("choose_neighborhood")}</span>
											<span class="text-white/40 text-xs">▾</span>
										</button>
										{#if showNbSuggestions}
											<ul
												class="absolute z-50 right-0 left-0 mt-1 max-h-64 overflow-y-auto rounded-xl
												       bg-[#0f172a] border border-purple-500/30 shadow-2xl"
												role="listbox"
											>
												{#each availableNeighborhoods as n}
													<li
														role="option"
														aria-selected={n === neighborhood}
														onmousedown={() => pickNeighborhood(n)}
														class="px-4 py-2 text-sm text-white cursor-pointer transition-colors
														       hover:bg-white/5 {n === neighborhood ? 'font-bold text-purple-300' : ''}"
													>
														{n}
													</li>
												{/each}
												<li
													role="option"
													aria-selected={false}
													onmousedown={() => pickNeighborhoodNotFound()}
													class="px-4 py-2.5 text-sm text-yellow-300 cursor-pointer transition-colors
													       hover:bg-yellow-500/10 border-t border-white/10 font-bold"
												>
													📍 לא מצאתי את השכונה שלי
												</li>
											</ul>
										{/if}
									</div>
								{/if}
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{neighborhood || "-"}
								</p>
							{/if}
						</div>

						<!-- מיקום שאינו מופיע ברשימה - בתוך אותה מסגרת -->
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
									כתוב כאן את העיר והשכונה שלך - הבקשה תישלח
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

								<!-- סימון מיקום מדויק על המפה - מאפשר למנהל להציב את השכונה במקום הנכון -->
								{#if customLocation.trim()}
									<div class="mt-3">
										<p class="text-yellow-300 text-xs font-bold mb-1.5">
											🗺️ סמן את מיקום השכונה המדויק על המפה
										</p>
										<p class="text-gray-500 text-xs mb-2 leading-relaxed">
											לא חובה, אבל עוזר לנו למקם את השכונה בדיוק. אם יש לך קואורדינטות — אפשר להקליד אותן.
										</p>
										<NeighborhoodPicker {city} bind:lat={customLat} bind:lng={customLng} />
									</div>
								{/if}

								<!-- שדות נסתרים שנשלחים עם הטופס -->
								<input type="hidden" name="custom_lat" value={customLat ?? ''} />
								<input type="hidden" name="custom_lng" value={customLng ?? ''} />
							</div>

							<!-- סימון עצמי של מיקום הישוב על המפה (כשהמפה לא מדויקת) -->
							{#if city}
								<div class="col-span-2 border-t border-emerald-500/15 pt-3 mt-1">
									<button
										type="button"
										onclick={() => (showCityPin = !showCityPin)}
										class="w-full flex items-center justify-between gap-2 text-right rounded-xl px-4 py-3 transition-colors
										       {cityHasCoords
											? 'bg-[#070b14] border border-white/10 text-gray-300'
											: 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-200'}"
									>
										<span class="flex items-center gap-2 text-sm font-bold">
											🗺️ {cityHasCoords
												? 'המפה לא מדויקת? סמן את מיקום הישוב שלך'
												: `המפה של ${city} לא מדויקת — סמן את מיקום הישוב`}
										</span>
										<span class="text-xs opacity-70">{showCityPin ? '▴' : '▾'}</span>
									</button>

									{#if showCityPin}
										<div class="mt-3 space-y-2">
											<p class="text-gray-400 text-xs leading-relaxed">
												לחץ על המפה במקום שבו נמצא הישוב שלך (אפשר לגרור את הסמן לדיוק).
												המיקום יתוקן <span class="text-emerald-300 font-bold">מיד אצלך</span>,
												ויעודכן לכל תושבי {city} לאחר אישור מנהל.
											</p>
											<NeighborhoodPicker {city} bind:lat={cityPinLat} bind:lng={cityPinLng} />

											{#if cityPinError}
												<p class="text-red-400 text-sm">{cityPinError}</p>
											{/if}

											{#if cityPinSaved}
												<p class="text-emerald-400 text-sm font-bold bg-emerald-900/20 border border-emerald-500/30 rounded-lg py-2 px-3">
													✓ המיקום נשמר! המפה שלך כבר מתוקנת. הוא יופיע לכל תושבי {city} לאחר אישור מנהל.
												</p>
											{:else}
												<button
													type="button"
													onclick={saveCityPin}
													disabled={savingCityPin || cityPinLat == null}
													class="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500
													       text-white font-black py-3 rounded-xl transition-all
													       disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{savingCityPin ? '⏳ שומר…' : '📍 שמור את מיקום הישוב'}
												</button>
											{/if}
										</div>
									{/if}
								</div>
							{/if}
						{/if}
					</div>
					<!-- סגירת מסגרת עיר+שכונה -->

					<!-- עסק + סטטוס משפחתי + תאריך לידה - שורה אחת בדסקטופ -->
					<div
						class="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-5"
					>
						<div>
							<label
								for="p-business-type"
								class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
								>בעל עסק / נותן שירות?</label
							>
							{#if isEditing}
								<select
									id="p-business-type"
									bind:value={businessType}
									class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none mb-2"
								>
									<option value="">בחר/י...</option>
										<option value="none">ללא עסק או שירות עצמאי</option>
									<option value="business_owner">בעל עסק</option>
									<option value="service_provider">נותן שירות</option>
								</select>
								{#if businessType === 'business_owner' || businessType === 'service_provider'}
									<input
										id="p-business"
										name="business"
										type="text"
										bind:value={business}
										placeholder={businessType === 'service_provider' ? 'תחום המקצוע (לדוגמה: רואה חשבון)' : tFn("business_placeholder")}
										class="w-full bg-white/5 border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm transition-colors outline-none placeholder:text-white/15 hover:placeholder:text-transparent focus:placeholder:text-transparent placeholder:transition-colors placeholder:duration-200"
									/>
								{:else}
									<input type="hidden" name="business" value={business} />
								{/if}
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{businessType === 'business_owner' ? `🏪 ${business || 'בעל עסק'}` : businessType === 'service_provider' ? `🛠️ ${business || 'נותן שירות'}` : (business === NO_BUSINESS ? 'ללא עסק' : business || '-')}
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
												: "-"}
								</p>
							{/if}
							<p class="text-gray-600 text-xs mt-1 px-1">
								{tFn("not_shown_public")}
							</p>
						</div>

						<!-- תאריך לידה - באותה שורה עם עסק וסטטוס -->
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
										: "-"}
								</p>
							{/if}
							<p class="text-gray-600 text-xs mt-1 px-1">
								{tFn("not_shown_public")}
							</p>
						</div>
					</div>

					<!-- סטטוס - מוצג לקהילה -->
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

					<!-- שאלת ביטחון + התראות - שורה אחת -->
					<div
						class="md:col-span-2 grid md:grid-cols-2 gap-4 items-start"
					>
						<!-- שאלת ביטחון - אופציונלי -->
						<div id="p-security">
							<label
								class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
							>
								🛡️ שאלת ביטחון <span
									class="text-purple-400 text-xs font-normal normal-case"
									>(מומלץ - לשחזור סיסמה)</span
								>
							</label>
							{#if isEditing}
								<select
									name="security_question"
									bind:value={security_question}
									class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none mb-2"
								>
									<option value="">- בחר שאלה -</option>
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
									<div class="flex gap-2">
										<input
											type="text"
											name="security_answer"
											bind:value={security_answer}
											oninput={() => (securityAnswerConfirmed = false)}
											onkeydown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault();
													confirmSecurityAnswer();
												}
											}}
											placeholder="תשובה (לא תוצג בפומבי)"
											class="flex-1 bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-white/20"
										/>
										<button
											type="button"
											onclick={confirmSecurityAnswer}
											disabled={!security_answer.trim() || securityAnswerConfirmed}
											class="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600
											       hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold
											       shadow-md transition-all whitespace-nowrap
											       disabled:opacity-40 disabled:cursor-not-allowed"
										>
											{securityAnswerConfirmed ? "✓ נקלט" : "אישור"}
										</button>
									</div>
									{#if securityAnswerConfirmed}
										<div class="mt-2 rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-2">
											<p class="text-green-400 text-xs font-bold">
												✅ תשובתך נקלטה במערכת
											</p>
											<p class="text-gray-300 text-[11px] mt-1 leading-relaxed">
												💡 מומלץ להגדיר שאלת ביטחון נוספת לאבטחה כפולה
											</p>
										</div>

										<!-- שאלת ביטחון שנייה (אבטחה כפולה) -->
										<div class="mt-3">
											<label
												class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2"
											>
												🛡️ שאלת ביטחון שנייה <span
													class="text-purple-400 text-xs font-normal normal-case"
													>(אבטחה כפולה - אופציונלי)</span
												>
											</label>
											<select
												name="security_question_2"
												bind:value={security_question_2}
												class="w-full bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none mb-2"
											>
												<option value="">- בחר שאלה שנייה -</option>
												{#each [
													"שם הרחוב שגדלת בו",
													"שם החיה הראשונה שלך",
													"שם בית הספר היסודי שלך",
													"עיר הולדתך",
													"שם משפחה של אמא לפני הנישואים",
												].filter((q) => q !== security_question) as q}
													<option value={q}>{q}</option>
												{/each}
											</select>
											{#if security_question_2}
												<div class="flex gap-2">
													<input
														type="text"
														name="security_answer_2"
														bind:value={security_answer_2}
														oninput={() => (securityAnswer2Confirmed = false)}
														onkeydown={(e) => {
															if (e.key === "Enter") {
																e.preventDefault();
																confirmSecurityAnswer2();
															}
														}}
														placeholder="תשובה (לא תוצג בפומבי)"
														class="flex-1 bg-[#070b14] border border-white/10 focus:border-purple-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none placeholder-white/20"
													/>
													<button
														type="button"
														onclick={confirmSecurityAnswer2}
														disabled={!security_answer_2.trim() || securityAnswer2Confirmed}
														class="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600
														       hover:from-purple-500 hover:to-blue-500 text-white text-sm font-bold
														       shadow-md transition-all whitespace-nowrap
														       disabled:opacity-40 disabled:cursor-not-allowed"
													>
														{securityAnswer2Confirmed ? "✓ נקלט" : "אישור"}
													</button>
												</div>
												{#if securityAnswer2Confirmed}
													<div class="mt-2 rounded-xl bg-green-500/10 border border-green-500/30 px-3 py-2">
														<p class="text-green-400 text-xs font-bold">
															✅ תשובה שנייה נקלטה - אבטחה כפולה מופעלת
														</p>
													</div>
												{/if}
											{/if}
										</div>
									{/if}
								{/if}
							{:else}
								<p class="text-white font-medium py-3 px-1">
									{security_question || "-"}
								</p>
								{#if security_question_2}
									<p class="text-white/80 font-medium py-1 px-1 text-sm">
										+ {security_question_2}
									</p>
								{/if}
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
								if (!city) {
									e.preventDefault();
									alert("יש לבחור עיר לפני השמירה");
									return;
								}
								// שכונה נדרשת רק אם קיימות שכונות ברשימה לעיר זו -
								// אלא אם המשתמש דיווח על מיקום שאינו ברשימה (אז מותר לשמור והבקשה תישלח למנהל)
								if (!cityWithoutNeighborhoods && !neighborhood && !customLocation.trim()) {
									e.preventDefault();
									alert("יש לבחור שכונה, או — אם השכונה שלך לא מופיעה — למלא אותה בשדה 'לא מצאת את העיר או השכונה שלך?'");
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

	<!-- ===== קומה 6: כתוב למערכת ===== -->
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
					class="w-7 h-7 rounded-full text-black text-sm font-black hidden md:flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%); opacity: 0.75"
					>6</span
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
				כתוב לנו כיצד לשפר את האתר עבורך - הצוות של יוצאים לחירות יקרא
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

	<!-- ===== קומה 7: סטטוס לפנויים ===== -->
	<div
		class="relative bg-[#0f172a] rounded-3xl border border-white/10 p-4 md:p-6 shadow-xl mb-2 overflow-hidden
	            before:absolute before:inset-x-0 before:top-0 before:h-24 before:rounded-t-3xl
	            before:bg-gradient-to-b before:from-white/8 before:to-transparent
	            before:transition-all before:duration-300 before:pointer-events-none
	            hover:before:from-white/18 {mobileTab !== 'profile'
			? 'hidden md:block'
			: ''}"
	>
		<div
			class="relative flex items-center justify-between cursor-pointer select-none -mx-4 px-4 -mt-4 pt-3 md:-mx-6 md:px-6 md:-mt-6 md:pt-4 min-h-14 {showStatusSelector
				? 'pb-4 mb-4'
				: 'pb-4'}"
			onclick={() => {
				showStatusSelector = !showStatusSelector;
			}}
			role="button"
			tabindex={0}
			onkeydown={(e) => {
				if (e.key === "Enter" || e.key === " ")
					showStatusSelector = !showStatusSelector;
			}}
		>
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span
					class="w-7 h-7 rounded-full text-black text-sm font-black hidden md:flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #a78bfa 0%, #9f7aea 60%, #805ad5 100%); opacity: 0.75"
					>7</span
				>
				הסטטוס שלי בלוח פנויים
			</h2>
			<svg
				class="w-4 h-4 text-purple-400 transition-transform duration-300 flex-shrink-0 {showStatusSelector
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

		{#if showStatusSelector}
			<div class="relative">
				<p class="text-gray-400 text-sm mb-4">
					בחר את הסטטוס שלך - אחרים יראו זאת בפרופיל שלך בלוח הפנויים
				</p>
				<div class="grid grid-cols-2 md:grid-cols-4 gap-2">
					<button
						type="button"
						onclick={() => { userStatus = 'available'; }}
						class="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all {userStatus === 'available'
							? 'bg-green-500/20 border-green-500/50'
							: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-green-500/30'}"
					>
						<span class="text-3xl">✅</span>
						<span class="text-xs font-bold text-white text-center">זמין/ה</span>
					</button>
					<button
						type="button"
						onclick={() => { userStatus = 'not_available'; }}
						class="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all {userStatus === 'not_available'
							? 'bg-red-500/20 border-red-500/50'
							: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-red-500/30'}"
					>
						<span class="text-3xl">🔴</span>
						<span class="text-xs font-bold text-white text-center">לא זמין/ה</span>
					</button>
					<button
						type="button"
						onclick={() => { userStatus = 'in_relationship'; }}
						class="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all {userStatus === 'in_relationship'
							? 'bg-pink-500/20 border-pink-500/50'
							: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-pink-500/30'}"
					>
						<span class="text-3xl">💑</span>
						<span class="text-xs font-bold text-white text-center">בקשר</span>
					</button>
					<button
						type="button"
						onclick={() => { userStatus = 'taking_break'; }}
						class="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all {userStatus === 'taking_break'
							? 'bg-blue-500/20 border-blue-500/50'
							: 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/30'}"
					>
						<span class="text-3xl">⏸️</span>
						<span class="text-xs font-bold text-white text-center">הפסקה זמנית</span>
					</button>
				</div>
				<p class="text-xs text-gray-500 mt-4">
					הסטטוס שלך יופיע בתוך כמה שניות בלוח הפנויים
				</p>
			</div>
		{/if}
	</div>

	<!-- ===== קומה 8: הודעות שקיבלתי ===== -->
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
			class="relative flex items-center justify-between cursor-pointer select-none -mx-4 px-4 -mt-4 pt-3 md:-mx-6 md:px-6 md:-mt-6 md:pt-4 min-h-14 {showReceivedMessages
				? 'pb-4 mb-4'
				: 'pb-4'}"
			onclick={() => {
				showReceivedMessages = !showReceivedMessages;
			}}
			role="button"
			tabindex={0}
		>
			<h2 class="text-xl font-black text-white flex items-center gap-2">
				<span
					class="w-7 h-7 rounded-full text-black text-sm font-black hidden md:flex items-center justify-center flex-shrink-0"
					style="background: radial-gradient(circle, #60a5fa 0%, #3b82f6 60%, #1d4ed8 100%); opacity: 0.75"
					>8</span
				>
				הודעות שקיבלתי
				{#if receivedMessages.length > 0}
					<span class="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold">{receivedMessages.length}</span>
				{/if}
			</h2>
			<svg
				class="w-4 h-4 text-blue-400 transition-transform duration-300 flex-shrink-0 {showReceivedMessages
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

		{#if showReceivedMessages}
			<div class="relative">
				{#if receivedMessages.length === 0}
					<p class="text-center text-gray-400 text-sm py-6">🔇 עדיין לא קיבלת הודעות</p>
				{:else}
					<div class="flex flex-col gap-3">
						{#each receivedMessages as msg}
							<div class="bg-white/5 border border-white/10 rounded-2xl p-4 hover:bg-white/8 transition-colors">
								<div class="flex items-start justify-between gap-2 mb-2">
									<span class="font-bold text-white text-sm">
										{msg.sender?.username || msg.sender?.email?.split('@')[0] || 'משתמש'}
									</span>
									<span class="text-gray-500 text-xs flex-shrink-0">
										{new Date(msg.createdAt).toLocaleDateString('he-IL')}
									</span>
								</div>
								<p class="text-gray-200 text-sm leading-relaxed mb-3">{msg.content}</p>
								<button class="text-xs font-bold text-blue-300 hover:text-blue-200 transition-colors">
									💬 הגב
								</button>
							</div>
						{/each}
					</div>
				{/if}
			</div>
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
				{:else if profileCompletion === 0}
					💡 הירשם וצור חשבון
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

	/* היבהוב קצר לשדה שצריך השלמה - מופעל כשהמשתמש לוחץ על מעגל הפרופיל */
	@keyframes fieldFlash {
		0% {
			box-shadow: 0 0 0 0 rgba(168, 85, 247, 0);
			background-color: transparent;
		}
		25% {
			box-shadow:
				0 0 0 4px rgba(168, 85, 247, 0.5),
				0 0 26px 8px rgba(168, 85, 247, 0.45);
			background-color: rgba(168, 85, 247, 0.14);
		}
		60% {
			box-shadow:
				0 0 0 3px rgba(168, 85, 247, 0.35),
				0 0 18px 6px rgba(168, 85, 247, 0.3);
			background-color: rgba(168, 85, 247, 0.08);
		}
		100% {
			box-shadow: 0 0 0 0 rgba(168, 85, 247, 0);
			background-color: transparent;
		}
	}
	:global(.field-flash) {
		animation: fieldFlash 1.2s ease-out;
		border-radius: 14px;
		scroll-margin-top: 100px;
	}
</style>

<script lang="ts">
    import { headerHeight } from '$lib/actions/headerHeight';
    import { t, locale } from 'svelte-i18n';
	import { get } from 'svelte/store';
    import { goto, beforeNavigate, afterNavigate } from "$app/navigation";
    import { onMount } from "svelte";
    import { page } from '$app/state';
    import { mapSearchState } from "$lib/mapSearchState.svelte";
    import { isSystemNotification } from "$lib/notificationKind";
    import { createClickOutside } from "$lib/actions/clickOutside";

    interface Props {
        currentUser?: any;
        onLogout?: () => void;
        onShowAuth?: () => void;
    }

    import { fade } from "svelte/transition";
    import { ads, type Ad } from "$lib/adsData";
    import FullAdModal from "$lib/components/FullAdModal.svelte";

    let { currentUser, onLogout, onShowAuth }: Props = $props();

    let languages = [
        { name: "עברית", code: "he", flag: "il" },
        { name: "English", code: "en", flag: "us" },
        { name: "русский", code: "ru", flag: "ru" },
    ];

    let showLangDropdown = $state(false);
    // ערך פתיחה עד לתשובת ה-ping הראשונה: הגולש עצמו + היסט התצוגה (+2) שמוחל ב-/api/ping
    let onlineUsers = $state(3);

    // מספר הודעות שלא נקראו - להצגת עיגול התראה על תמונת הפרופיל (כמו בדף הפרופיל).
    // בנוסף לספירה הכוללת נספרות בנפרד התראות מערכת (בקשות שמחכות לטיפול ניהולי)
    // והתראות פרטיות (מה שנוגע למשתמש עצמו) - שני קיצורי דרך נפרדים סביב התמונה.
    let unreadMessages = $state(0);
    let unreadSystem = $state(0);
    let unreadPrivate = $state(0);
    const badgeNum = (n: number) => (n > 99 ? '99+' : String(n));
    // ההתראות שנספרות בפועל - הרשימה שמאחורי המספר, כדי שלחיצה על הבאדג'
    // תראה *על מה* ההתראות במקום לשלוח לחפש אותן בדף הפרופיל
    type LiveMsg = { id: number | string; label?: string; created_at?: string; type?: string; icon?: string; link?: string };
    let liveMsgs = $state<LiveMsg[]>([]);
    let unreadLabel = $derived(badgeNum(unreadMessages));
    let systemLabel = $derived(badgeNum(unreadSystem));
    let privateLabel = $derived(badgeNum(unreadPrivate));

    // אותם מפתחות localStorage כמו דף הפרופיל - כדי שהספירה תהיה עקבית עם תיבת ההודעות
    function loadMsgSet(key: string): Set<string> {
        if (typeof localStorage === 'undefined') return new Set();
        try { return new Set(JSON.parse(localStorage.getItem(key) ?? '[]')); } catch { return new Set(); }
    }
    function loadMsgMap(key: string): Record<string, number> {
        if (typeof localStorage === 'undefined') return {};
        try { return JSON.parse(localStorage.getItem(key) ?? '{}') ?? {}; } catch { return {}; }
    }

    // ההודעות שנשלפו לאחרונה מהשרת - נשמרות כדי לחשב מחדש את המונה מיידית (ללא רשת)
    // כשהמשתמש קורא/מטפל בהודעה בדף הפרופיל/הודעות ומשדר את האירוע 'msgs:changed'.
    let lastMsgs: any[] = [];

    // חישוב מונה שלא-נקראו מתוך רשימה נתונה מול מצב ה-localStorage העדכני.
    // מחריגים הודעות שהמשתמש מחק / העביר לארכיון / דחה - בדיוק כמו בדף הפרופיל.
    function computeUnread(msgs: any[]) {
        const deleted  = loadMsgSet('msgs_deleted_v1');
        const archived = loadMsgSet('msgs_archived_v1');
        const snoozed  = loadMsgMap('msgs_snoozed_v1');
        const now = Date.now();
        const live = msgs.filter((m: any) => {
            const id = `db-${m.id}`;
            if (deleted.has(id) || archived.has(id)) return false;
            const sn = snoozed[id];
            if (sn && sn > now) return false;
            return true;
        });
        liveMsgs = live as LiveMsg[];
        unreadMessages = live.length;
        unreadSystem = live.filter((m: any) => isSystemNotification(m?.type)).length;
        unreadPrivate = unreadMessages - unreadSystem;
    }

    // קיצורי הדרך של הבאדג'ים: פותחים את תיבת ההודעות בפרופיל מסוננת לערוץ
    const MSG_SYSTEM_HREF  = '/profile?tab=messages&filter=system';
    const MSG_PRIVATE_HREF = '/profile?tab=messages&filter=private';

    function resetUnread() { unreadMessages = 0; unreadSystem = 0; unreadPrivate = 0; liveMsgs = []; }

    // כששני הערוצים פעילים מוצגים שני באדג'ים נפרדים (אדום/ירוק) ולצידם הסכום.
    // כשכל ההתראות מערוץ אחד, באדג' אחד בצבע הערוץ אומר את הכול - שני עיגולים
    // על אותה התראה אחת רק נראו כמו שתי התראות.
    let onlyChannel = $derived(
        unreadSystem > 0 && unreadPrivate === 0 ? 'system'
        : unreadPrivate > 0 && unreadSystem === 0 ? 'private'
        : ''
    );
    let mixedChannels = $derived(unreadSystem > 0 && unreadPrivate > 0);
    let totalTone = $derived(
        onlyChannel === 'system' ? 'from-rose-500 to-red-600'
        : onlyChannel === 'private' ? 'from-emerald-500 to-green-600'
        : 'from-indigo-500 to-violet-600'
    );

    // הפאנל שנפתח מהבאדג': איזה ערוץ מוצג כרגע ('' = סגור)
    let openChannel = $state<'' | 'all' | 'system' | 'private'>('');
    const notifOutside = createClickOutside(() => (openChannel = ''));
    function toggleChannel(ch: 'all' | 'system' | 'private') {
        openChannel = openChannel === ch ? '' : ch;
    }
    let panelMsgs = $derived(
        openChannel === '' ? []
        : openChannel === 'all' ? liveMsgs
        : liveMsgs.filter((m) => isSystemNotification(m.type) === (openChannel === 'system'))
    );
    let panelHref = $derived(
        openChannel === 'system' ? MSG_SYSTEM_HREF
        : openChannel === 'private' ? MSG_PRIVATE_HREF
        : '/profile?tab=messages&filter=all'
    );
    function msgTime(iso?: string) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        return d.toLocaleString(_loc ?? 'he', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    // סגירת הפאנל בניווט, שלא יישאר פתוח מעל הדף הבא
    beforeNavigate(() => { openChannel = ''; });

    async function fetchUnreadMessages() {
        if (!currentUser) { resetUnread(); lastMsgs = []; return; }
        try {
            // /api/my-messages = הודעות חיות (category='message'); הישן /api/messages הוא collection מת
            const res = await fetch('/api/my-messages');
            if (!res.ok) { resetUnread(); return; }
            const msgs = await res.json();
            if (!Array.isArray(msgs)) { resetUnread(); return; }
            lastMsgs = msgs;
            computeUnread(msgs);
        } catch { /* ignore */ }
    }

    // חישוב מיידי מתוך המטמון - נקרא כשהמשתמש קורא/מטפל בהודעה (אירוע 'msgs:changed'),
    // כדי שהעיגול ייעלם מיד במקום להמתין עד 30 שנ' לפול הבא של fetchUnreadMessages.
    function recomputeUnread() {
        if (!currentUser) { resetUnread(); return; }
        computeUnread(lastMsgs);
    }

    async function pingServer() {
        try {
            const res = await fetch('/api/ping', { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                onlineUsers = data.count;
            }
        } catch { /* ignore */ }
    }
    let tooltipX = $state(0);
    let tooltipY = $state(0);
    let showProfileTooltip = $state(false);

    function handleProfileMouseMove(e: MouseEvent) {
        tooltipX = e.clientX + 12;
        tooltipY = e.clientY + 18;
    }

    // מעגל מילוי פרופיל בהדר - זהה ללוח הבקרה בדף הפרופיל
    const headerRingC = 2 * Math.PI * 27; // r=27, viewBox 60×60

    // זהה לחישוב profileCompletion בלוח הבקרה (12 שדות) כדי ששתי הטבעות יציגו אותו ערך
    let headerCompletion = $derived(
        currentUser ? Math.round([
            !!currentUser.name,
            !!currentUser.email,
            !!currentUser.avatar_url,
            !!currentUser.nickname,
            !!currentUser.phone,
            !!currentUser.city,
            !!currentUser.neighborhood,
            !!currentUser.gender,
            !!currentUser.business,
            !!currentUser.family_status,
            !!currentUser.birth_date,
            !!(currentUser.security_question && currentUser.security_answer),
        ].filter(Boolean).length / 12 * 100) : 0
    );

    let headerRingColor = $derived(
        headerCompletion >= 100 ? '#fbbf24' :   // זהב — פרופיל מלא 100%
        headerCompletion < 40 ? '#ef4444' :
        headerCompletion < 70 ? '#eab308' : '#22c55e'
    );

    let selectedAdForModal = $state<Ad | null>(null);

    // חיפוש
    let searchQuery     = $state('');
    let showMobileSearch = $state(false);

    function doSearch() {
        const q = searchQuery.trim();
        if (!q) return;
        goto(`/search?q=${encodeURIComponent(q)}`);
        showMobileSearch = false;
        searchQuery = '';
    }
    function handleSearchKey(e: KeyboardEvent) {
        if (e.key === 'Enter') doSearch();
        if (e.key === 'Escape') { showMobileSearch = false; searchQuery = ''; }
    }

    // כפתור "חיפוש" בהדר (דסקטופ): בדף הבית פותח/סוגר את מצב החיפוש של המפה;
    // בכל דף אחר (אין מפה מורכבת) מנווט לדף החיפוש הכללי.
    function onHeaderSearchClick() {
        if (mapSearchState.mounted) mapSearchState.toggle();
        else goto('/search');
    }

    function changeLang(language: { name: string; code: string }) {
        locale.set(language.code);
        try { localStorage.setItem('lang', language.code); } catch {}
    }

    onMount(() => {
        // שחזר שפה שמורה
        try {
            const saved = localStorage.getItem('lang');
            if (saved) locale.set(saved);
        } catch {}

        pingServer();
        const usersInterval = setInterval(pingServer, 30000);

        fetchUnreadMessages();
        const msgsInterval = setInterval(fetchUnreadMessages, 30000);

        // עדכון מיידי של העיגול כשהמשתמש קורא/מטפל בהודעה בדף הפרופיל/הודעות (אירוע מקומי),
        // וכשחוזרים ללשונית - בלי להמתין לפול ה-30 שנ'.
        const onMsgsChanged = () => recomputeUnread();
        const onVisible = () => { if (document.visibilityState === 'visible') fetchUnreadMessages(); };
        window.addEventListener('msgs:changed', onMsgsChanged);
        document.addEventListener('visibilitychange', onVisible);

        // hover על כפתור אודות - תמונה ב-fixed position
        const preview = document.getElementById('about-preview') as HTMLElement | null;
        const btnWrapper = document.getElementById('about-btn-wrapper');
        if (preview && btnWrapper) {
            btnWrapper.addEventListener('mouseenter', () => {
                const rect = btnWrapper.getBoundingClientRect();
                const imgW = 700;
                let left = rect.left + rect.width / 2 - imgW / 2;
                if (left < 8) left = 8;
                if (left + imgW > window.innerWidth - 8) left = window.innerWidth - imgW - 8;
                preview.style.left = left + 'px';
                preview.style.top = (rect.bottom + 10) + 'px';
                preview.style.opacity = '1';
                preview.style.transform = 'scale(1)';
            });
            btnWrapper.addEventListener('mouseleave', () => {
                preview.style.opacity = '0';
                preview.style.transform = 'scale(0.05)';
            });
        }

        document.addEventListener("click", handleClickOutside);
        return () => {
            clearInterval(usersInterval);
            clearInterval(msgsInterval);
            document.removeEventListener("click", handleClickOutside);
            window.removeEventListener('msgs:changed', onMsgsChanged);
            document.removeEventListener('visibilitychange', onVisible);
        };
    });

    // אחרי ניווט (למשל חזרה מדף ההודעות אחרי מחיקה בשרת) - רענון מלא.
    // מדלגים על הטעינה הראשונית ('enter') כי היא כבר מטופלת ב-onMount.
    afterNavigate((nav) => {
        if (nav.type === 'enter') return;
        fetchUnreadMessages();
    });

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest(".lang-dropdown-container")) {
            showLangDropdown = false;
        }
    }

    function handleLangKeydown(event: KeyboardEvent) {
        if (event.key === 'Escape') {
            showLangDropdown = false;
            return;
        }

        // פתיחת הרשימה עם חץ למטה כשהיא סגורה
        if (event.key === 'ArrowDown' && !showLangDropdown) {
            event.preventDefault();
            showLangDropdown = true;
            setTimeout(() => {
                const container = (event.target as HTMLElement).closest('.lang-dropdown-container');
                const firstOption = container?.querySelector('[role="option"]') as HTMLElement;
                firstOption?.focus();
            }, 0);
            return;
        }

        if (!showLangDropdown) return;

        const target = event.target as HTMLElement;
        const container = target.closest('.lang-dropdown-container');
        if (!container) return;

        const options = Array.from(container.querySelectorAll('[role="option"]')) as HTMLElement[];
        if (options.length === 0) return;

        const currentIndex = options.indexOf(target);

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            options[currentIndex < options.length - 1 ? currentIndex + 1 : 0].focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            options[currentIndex > 0 ? currentIndex - 1 : options.length - 1].focus();
        } else if (event.key === 'Home') {
            event.preventDefault();
            options[0].focus();
        } else if (event.key === 'End') {
            event.preventDefault();
            options[options.length - 1].focus();
        }
    }
	// tFn: תרגום reactive - $t אסור ב-Svelte 5
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe(l => (_loc = l)));
	const tFn = (k: string, options?: { values?: Record<string, unknown> }) => { void _loc; return get(t)(k, options as any); };

	// כותרת הבאדג' הכולל - תלויה ב-tFn, ולכן מוגדרת אחריו
	let totalTitle = $derived(
		onlyChannel === 'system' ? tFn("chrome.unread_system", { values: { n: unreadSystem } })
		: onlyChannel === 'private' ? tFn("chrome.unread_private", { values: { n: unreadPrivate } })
		: tFn("chrome.unread_messages", { values: { n: unreadMessages } })
	);

	// סגור תמונת preview של אודות בזמן ניווט
	beforeNavigate(() => {
		const preview = document.getElementById('about-preview') as HTMLElement | null;
		if (preview) {
			// עיכוב של שנייה אחת כדי שהתמונה תישאר עוד רגע
			// שקיפות הולכת וגוברת ללא הקטנה
			setTimeout(() => {
				preview.style.opacity = '0';
			}, 1000);
		}
	});

</script>

{#snippet notifPanel()}
    <!-- פאנל ההתראות: מה שמאחורי המספר - כותרת, זמן וקישור ישיר ליעד של כל התראה -->
    <div
        class="absolute top-full mt-2 left-0 z-[1200] w-[min(20rem,calc(100vw-1.5rem))]
               rounded-2xl border border-white/15 bg-[#0f172a] shadow-2xl overflow-hidden"
        dir="rtl"
    >
        <div class="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10">
            <span class="text-xs font-black text-white">
                {openChannel === 'system'
                    ? tFn("chrome.notif_panel_system")
                    : openChannel === 'private'
                        ? tFn("chrome.notif_panel_private")
                        : tFn("chrome.notif_panel_all")}
            </span>
            <button
                type="button"
                onclick={() => (openChannel = '')}
                class="text-gray-400 hover:text-white text-xs leading-none px-1 cursor-pointer"
                aria-label={tFn("chrome.close")}
            >✕</button>
        </div>
        <div class="max-h-[60vh] overflow-y-auto divide-y divide-white/5">
            {#each panelMsgs.slice(0, 8) as m (m.id)}
                <a
                    href={m.link || '/profile?tab=messages'}
                    class="flex items-start gap-2 px-3 py-2.5 hover:bg-white/5 transition-colors"
                >
                    <span class="text-base leading-none mt-0.5" aria-hidden="true">{m.icon || '🔔'}</span>
                    <span class="min-w-0 flex-1">
                        <span class="block text-[12px] font-bold text-white leading-snug break-words">{m.label}</span>
                        <span class="block text-[10px] text-gray-400 mt-0.5">{msgTime(m.created_at)}</span>
                    </span>
                    <span
                        class="mt-1 h-2 w-2 rounded-full flex-shrink-0 {isSystemNotification(m.type)
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'}"
                        aria-hidden="true"
                    ></span>
                </a>
            {/each}
        </div>
        <a
            href={panelHref}
            class="block px-3 py-2 text-center text-[11px] font-black text-violet-300 hover:text-white
                   hover:bg-white/5 border-t border-white/10 transition-colors"
        >{tFn("chrome.notif_panel_all_link")}</a>
    </div>
{/snippet}

<header use:headerHeight
    class="sticky top-0 z-[1100] border-b-2 md:border-b-4 border-blue-600 shadow-lg backdrop-blur-lg"
    style="background: linear-gradient(to bottom, rgba(17, 24, 39, 0.88) 0%, rgba(17, 24, 39, 0.88) 66%, rgba(17, 24, 39, 0.1) 100%);"
>
    <div class="relative mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
        <!-- Mobile Header Area -->
        <div class="md:hidden h-[80px] relative">
                <!-- Mobile Header -->
                <div
                    class="flex items-center justify-between h-full px-1 absolute inset-0"
                >
                    <a
                        href="/"
                        class="flex items-center gap-2.5 flex-1 min-w-0"
                    >
                        <div class="relative">
                            <div class="h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
                                <img
                                    src="/images/community-logo1.webp"
                                    alt=""
                                    class="w-full h-full object-cover scale-[1.2]"
                                />
                            </div>
                            <div
                                class="hidden absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"
                            ></div>
                        </div>
                        <div class="min-w-0 flex-1">
                            <!-- שם המותג בכותרת הוא <p> ולא <h1>: ה-h1 שייך לכותרת הייחודית של כל דף.
                                 h1 גלובלי זהה בכל הדפים היה מטשטש לגוגל במה כל דף עוסק. -->
                            <p
                                class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-xl font-black text-transparent leading-tight"
                            >
                                {tFn("welcome")}
                            </p>
                            <p class="text-xs text-gray-400 leading-tight">
                                {tFn("app_description")}
                            </p>
                        </div>
                    </a>

                    <div class="flex items-center gap-1.5">
                        <!-- כפתור אודות - מובייל -->
                        <button
                            onclick={() => goto("/about/revenue")}
                            class="flex items-center justify-center gap-1 h-8 px-1.5 rounded-lg bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors"
                            aria-label={tFn("chrome.about_community_aria")}
                        >
                            <span class="text-sm font-bold text-white leading-none whitespace-nowrap">{tFn("about")}</span>
                        </button>

                        <!-- כפתור דגל שפה - מובייל -->
                        <div class="relative lang-dropdown-container">
                            <button
                                onclick={() => (showLangDropdown = !showLangDropdown)}
                                onkeydown={handleLangKeydown}
                                class="flex items-center justify-center w-7 h-8 hover:opacity-80 transition-opacity"
                                aria-label={tFn("chrome.choose_language")}
                                aria-haspopup="listbox"
                                aria-expanded={showLangDropdown}
                            >
                                <span
                                    class="fi fi-{languages.find((l) => l.code === $locale || $locale?.startsWith(l.code))?.flag || 'il'}"
                                    style="font-size: 0.95rem;"
                                    aria-hidden="true"
                                ></span>
                            </button>
                            {#if showLangDropdown}
                                <div
                                    class="absolute left-0 z-[160] mt-2 w-36 rounded-lg bg-[#0f172a] border border-white/10 shadow-xl"
                                    role="listbox"
                                    aria-label={tFn("chrome.choose_language")}
                                >
                                    {#each languages as langOption}
                                        <button
                                            class="flex w-full items-center gap-3 px-3 py-2 text-right text-white hover:bg-white/10 transition-colors"
                                            onclick={() => { changeLang(langOption); showLangDropdown = false; }}
                                            onkeydown={handleLangKeydown}
                                            role="option"
                                            aria-selected={$locale === langOption.code || $locale?.startsWith(langOption.code)}
                                        >
                                            <span class="fi fi-{langOption.flag}" style="font-size: 1.2rem;" aria-hidden="true"></span>
                                            <span class="text-sm">{langOption.name}</span>
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>

                        {#if currentUser}
                            <div class="relative group flex-shrink-0" use:notifOutside>
                                <a href="/profile" class="block relative h-9 w-9" aria-label={tFn("chrome.to_personal_area", { values: { name: currentUser.username ?? tFn("default_user") } })}>
                                    {#if currentUser.avatar_url}
                                        <img
                                            src={currentUser.avatar_url}
                                            alt=""
                                            class="h-9 w-9 rounded-full object-cover shadow-lg"
                                        />
                                    {:else}
                                        <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 shadow-lg" aria-hidden="true">
                                            <span class="font-bold text-white text-xs">{currentUser.username?.charAt(0) || "U"}</span>
                                        </div>
                                    {/if}
                                    <!-- מעגל מילוי פרופיל - זהה ללוח הבקרה -->
                                    <svg style="width:40px;height:40px" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none"
                                         viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="30" cy="30" r="27" stroke="rgba(255,255,255,0.08)" stroke-width="2.5" fill="none" />
                                        <circle cx="30" cy="30" r="27" stroke={headerRingColor} stroke-width="2.5" fill="none"
                                                stroke-linecap="round" stroke-dasharray={headerRingC}
                                                stroke-dashoffset={headerRingC * (1 - Math.min(headerCompletion, 100) / 100)}
                                                style="filter: drop-shadow(0 0 3px {headerRingColor}88);" />
                                    </svg>
                                </a>
                                <!-- ספירה כוללת - במקום הקודם; צבועה לפי הערוץ כשכל
                                     ההתראות מאותו סוג, ולחיצה פותחת את רשימתן -->
                                {#if unreadMessages > 0}
                                    <button
                                        type="button"
                                        onclick={() => toggleChannel('all')}
                                        aria-expanded={openChannel === 'all'}
                                        class="absolute -top-1.5 -left-1.5 min-w-[18px] h-[18px] px-1
                                               bg-gradient-to-br {totalTone}
                                               border-2 border-[#0f172a] rounded-full
                                               flex items-center justify-center text-white text-[10px]
                                               font-black leading-none shadow-lg cursor-pointer
                                               hover:scale-110 transition-transform"
                                        title={totalTitle}
                                        aria-label={totalTitle}
                                    >{unreadLabel}</button>
                                {/if}
                                <!-- קיצורי דרך נפרדים סביב התמונה - רק כששני הערוצים פעילים -->
                                {#if mixedChannels}
                                    <button
                                        type="button"
                                        onclick={() => toggleChannel('system')}
                                        aria-expanded={openChannel === 'system'}
                                        class="absolute -bottom-1.5 -left-1.5 min-w-[17px] h-[17px] px-1
                                               bg-gradient-to-br from-rose-500 to-red-600
                                               border-2 border-[#0f172a] rounded-full
                                               flex items-center justify-center text-white text-[9px]
                                               font-black leading-none shadow-lg cursor-pointer
                                               hover:scale-110 transition-transform"
                                        title={tFn("chrome.unread_system", { values: { n: unreadSystem } })}
                                        aria-label={tFn("chrome.unread_system", { values: { n: unreadSystem } })}
                                    >{systemLabel}</button>
                                    <button
                                        type="button"
                                        onclick={() => toggleChannel('private')}
                                        aria-expanded={openChannel === 'private'}
                                        class="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1
                                               bg-gradient-to-br from-emerald-500 to-green-600
                                               border-2 border-[#0f172a] rounded-full
                                               flex items-center justify-center text-white text-[9px]
                                               font-black leading-none shadow-lg cursor-pointer
                                               hover:scale-110 transition-transform"
                                        title={tFn("chrome.unread_private", { values: { n: unreadPrivate } })}
                                        aria-label={tFn("chrome.unread_private", { values: { n: unreadPrivate } })}
                                    >{privateLabel}</button>
                                {/if}
                                {#if openChannel !== ''}
                                    {@render notifPanel()}
                                {/if}
                            </div>
                        {:else}
                            <a
                                href="/profile"
                                class="relative group flex-shrink-0 flex items-center gap-1 px-2 h-9 rounded-full
                                       border border-white/30 shadow-md hover:scale-105 transition-transform"
                                style="background:linear-gradient(135deg,#2563eb,#7c3aed); box-shadow:0 2px 10px rgba(124,58,237,0.45);"
                                aria-label={tFn("chrome.personal_area")}
                            >
                                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" aria-hidden="true">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                <span class="text-white text-[11px] font-extrabold whitespace-nowrap">{tFn("chrome.login")}</span>
                            </a>
                        {/if}
                    </div>
                </div>
        </div>

        <!-- Desktop Header - Full Layout -->
        <div
            class="hidden md:flex flex-col items-center pt-0 pb-0.5 md:flex-row md:items-center md:justify-between"
        >
            <div class="flex items-center space-x-4">
                <div class="relative group logo-wrap">
                    <a
                        href="/"
                        class="flex h-28 w-28 items-center justify-center transition-transform hover:scale-105"
                    >
                        <div class="h-16 w-16 rounded-full overflow-hidden shadow-lg">
                            <img
                                src="/images/community-logo1.webp"
                                alt=""
                                class="w-full h-full object-cover scale-[1.2]"
                            />
                        </div>
                    </a>
                    <!-- Tooltip - Below Logo -->
                    <div
                        class="logo-tip absolute top-full left-1/2 mt-2 z-[9999]"
                    >
                        <div
                            class="bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-xl whitespace-nowrap"
                        >
                            {tFn("back_home")}
                            <div
                                class="logo-tip-arrow absolute bottom-full left-1/2 border-8 border-transparent border-b-gray-900"
                            ></div>
                        </div>
                    </div>
                </div>
                <a href="/" class="group">
                    <p
                        class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent group-hover:opacity-80 transition-opacity"
                    >
                        {tFn("welcome")}
                    </p>
                    <p class="text-lg text-gray-100 font-extrabold group-hover:opacity-80 transition-opacity">{tFn("app_description")}</p>
                </a>
            </div>
<div class="flex items-center gap-2">
                <!-- כפתור אודות עם תצוגה מקדימה -->
                <div class="relative" id="about-btn-wrapper">
                    <button
                        class="relative flex items-center rounded-lg px-4 py-2 font-bold text-white transition-all duration-300 hover:scale-105 hover:tracking-wide"
                        style="background:linear-gradient(135deg,#4f46e5,#7c3aed); box-shadow:0 4px 15px rgba(124,58,237,0.4);"
                        onmouseenter={(e) => (e.currentTarget as HTMLElement).style.boxShadow='0 0 24px 6px rgba(167,139,250,0.7), 0 4px 15px rgba(124,58,237,0.5)'}
                        onmouseleave={(e) => (e.currentTarget as HTMLElement).style.boxShadow='0 4px 15px rgba(124,58,237,0.4)'}
                        onclick={() => goto("/about/revenue")}
                    >
                        {tFn("about")}
                    </button>
                </div>
                <!-- תמונת preview - position:fixed כדי לחמוק מ-overflow של ההדר -->
                <div id="about-preview"
                     style="position:fixed; z-index:9999; pointer-events:none;
                            transition: opacity 0.2s ease-out, transform 0.2s ease-out;
                            opacity:0; transform:scale(0.05);
                            transform-origin: top center;">
                    <img
                        src="/images/community-advantages.webp"
                        alt={tFn("welcome")}
                        style="width:580px; border-radius:24px;
                               -webkit-mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 55%, transparent 100%);
                               mask-image: radial-gradient(ellipse 90% 90% at 50% 50%, black 55%, transparent 100%);
                               filter: drop-shadow(0 0 40px rgba(0,0,0,0.95)) drop-shadow(0 0 80px rgba(0,0,0,0.7));"
                    />
                </div>
                <!-- Language Dropdown -->
                <div class="lang-dropdown-container relative">
                    <button
                        class="flex items-center rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-sm text-white transition-colors"
                        onclick={() => (showLangDropdown = !showLangDropdown)}
                        onkeydown={handleLangKeydown}
                        aria-label={tFn("chrome.choose_language")}
                        aria-haspopup="listbox"
                        aria-expanded={showLangDropdown}
                    >
                        <span
                            class="fi fi-{languages.find(
                                (l) => l.code === $locale || $locale?.startsWith(l.code),
                            )?.flag || 'il'} ml-2"
                            style="font-size: 1.5rem; margin-left: 0.75rem;"
                            aria-hidden="true"
                        ></span>
                        {languages.find((l) => l.code === $locale || $locale?.startsWith(l.code))?.name ||
                            'עברית'}
                        <svg
                            class="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>
                    {#if showLangDropdown}
                        <div
                            class="absolute right-0 z-[160] mt-2 w-44 rounded-lg bg-[#0f172a] border border-white/10 shadow-xl"
                            role="listbox"
                            aria-label={tFn("chrome.choose_language")}
                        >
                            {#each languages as langOption}
                                <button
                                    class="flex w-full items-center gap-4 px-4 py-2 text-right text-white hover:bg-white/10 transition-colors"
                                    onclick={() => {
                                        changeLang(langOption);
                                        showLangDropdown = false;
                                    }}
                                    onkeydown={handleLangKeydown}
                                    role="option"
                                    aria-selected={$locale === langOption.code || $locale?.startsWith(langOption.code)}
                                >
                                    <span class="text-sm">{langOption.name}</span>
                                    <span
                                        class="fi fi-{langOption.flag}"
                                        style="font-size: 1.5rem;"
                                        aria-hidden="true"
                                    ></span>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
                <!-- כפתור חיפוש (דסקטופ) - הועבר לכאן מהפינה שמעל המפה.
                     בנייד שדה החיפוש נשאר בשורת הכפתורים של המפה. -->
                <button
                    onclick={onHeaderSearchClick}
                    title={tFn("map.search")}
                    aria-pressed={mapSearchState.open}
                    class="hidden md:flex items-center gap-1.5 rounded-lg border-2 {mapSearchState.open ? 'border-purple-500 text-purple-300 bg-purple-500/10' : 'border-white/20 text-white/80 bg-white/10'} hover:border-purple-500/70 hover:text-white px-3 py-1.5 text-sm font-bold transition-all hover:scale-105"
                >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="7"/>
                        <path d="m21 21-4.35-4.35"/>
                    </svg>
                    <span class="text-xs">{tFn("map.search")}</span>
                </button>
            </div>
            {#if true}
                <div class="flex items-center gap-4">
                    <!-- מספר גולשים -->
                    <div
                        class="flex items-center gap-2 bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-500/30 online-counter"
                        aria-label={tFn("chrome.online_now", { values: { n: onlineUsers } })}
                        role="status"
                    >
                        <span class="text-green-400 text-xl" aria-hidden="true">●</span>
                        <span class="text-white text-sm font-bold" aria-hidden="true">{onlineUsers}</span>
                        <span class="text-gray-300 text-sm" aria-hidden="true">{tFn("connected")}</span>
                    </div>

                    {#if currentUser}
                        {@const userName = currentUser.username ?? "U"}
                        <div class="flex items-center gap-3">
                            <!-- תמונת פרופיל עם hover -->
                            <div
                                class="relative flex-shrink-0"
                                use:notifOutside
                                role="presentation"
                                onmouseenter={() => showProfileTooltip = true}
                                onmouseleave={() => showProfileTooltip = false}
                                onmousemove={handleProfileMouseMove}
                            >
                                <a
                                    href="/profile"
                                    class="block relative h-14 w-14"
                                    aria-label={tFn("chrome.to_personal_area", { values: { name: userName } })}
                                >
                                    {#if currentUser.avatar_url}
                                        <img
                                            src={currentUser.avatar_url}
                                            alt=""
                                            class="h-14 w-14 rounded-full object-cover shadow-lg transition-all"
                                        />
                                    {:else}
                                        <div class="flex h-14 w-14 items-center justify-center rounded-full
                                                    bg-gradient-to-br from-green-400 to-blue-500 shadow-lg transition-all"
                                             aria-hidden="true">
                                            <span class="font-bold text-white text-sm">{userName.charAt(0)}</span>
                                        </div>
                                    {/if}
                                    <!-- מעגל מילוי פרופיל - זהה ללוח הבקרה -->
                                    <svg style="width:62px;height:62px" class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none"
                                         viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                                        <circle cx="30" cy="30" r="27" stroke="rgba(255,255,255,0.08)" stroke-width="2" fill="none" />
                                        <circle cx="30" cy="30" r="27" stroke={headerRingColor} stroke-width="2" fill="none"
                                                stroke-linecap="round" stroke-dasharray={headerRingC}
                                                stroke-dashoffset={headerRingC * (1 - Math.min(headerCompletion, 100) / 100)}
                                                style="filter: drop-shadow(0 0 4px {headerRingColor}88);" />
                                    </svg>
                                </a>
                                <!-- ספירה כוללת - במקום הקודם; צבועה לפי הערוץ כשכל
                                     ההתראות מאותו סוג, ולחיצה פותחת את רשימתן -->
                                {#if unreadMessages > 0}
                                    <button
                                        type="button"
                                        onclick={() => toggleChannel('all')}
                                        aria-expanded={openChannel === 'all'}
                                        class="absolute -bottom-1 -left-1 min-w-[22px] h-[22px] px-1.5
                                               bg-gradient-to-br {totalTone}
                                               border-2 border-[#0f172a] rounded-full
                                               flex items-center justify-center text-white text-[11px]
                                               font-black leading-none shadow-lg cursor-pointer
                                               hover:scale-110 transition-transform"
                                        title={totalTitle}
                                        aria-label={totalTitle}
                                    >{unreadLabel}</button>
                                {/if}
                                <!-- קיצורי דרך נפרדים סביב התמונה - רק כששני הערוצים פעילים -->
                                {#if mixedChannels}
                                    <button
                                        type="button"
                                        onclick={() => toggleChannel('system')}
                                        aria-expanded={openChannel === 'system'}
                                        class="absolute -top-1 -left-1 min-w-[20px] h-[20px] px-1.5
                                               bg-gradient-to-br from-rose-500 to-red-600
                                               border-2 border-[#0f172a] rounded-full
                                               flex items-center justify-center text-white text-[10px]
                                               font-black leading-none shadow-lg cursor-pointer
                                               hover:scale-110 transition-transform"
                                        title={tFn("chrome.unread_system", { values: { n: unreadSystem } })}
                                        aria-label={tFn("chrome.unread_system", { values: { n: unreadSystem } })}
                                    >{systemLabel}</button>
                                    <button
                                        type="button"
                                        onclick={() => toggleChannel('private')}
                                        aria-expanded={openChannel === 'private'}
                                        class="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5
                                               bg-gradient-to-br from-emerald-500 to-green-600
                                               border-2 border-[#0f172a] rounded-full
                                               flex items-center justify-center text-white text-[10px]
                                               font-black leading-none shadow-lg cursor-pointer
                                               hover:scale-110 transition-transform"
                                        title={tFn("chrome.unread_private", { values: { n: unreadPrivate } })}
                                        aria-label={tFn("chrome.unread_private", { values: { n: unreadPrivate } })}
                                    >{privateLabel}</button>
                                {/if}
                                {#if openChannel !== ''}
                                    {@render notifPanel()}
                                {/if}
                            </div>
                        </div>
                    {:else}
                        <a
                            href="/profile"
                            class="relative group flex-shrink-0 flex items-center gap-2 px-4 h-12 rounded-full
                                   border border-white/30 shadow-md hover:scale-105 transition-transform"
                            style="background:linear-gradient(135deg,#2563eb,#7c3aed); box-shadow:0 4px 15px rgba(124,58,237,0.4);"
                            aria-label={tFn("chrome.personal_area")}
                        >
                            <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" aria-hidden="true">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                            <span class="text-white text-sm font-extrabold whitespace-nowrap">{tFn("chrome.login_personal_area")}</span>
                        </a>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</header>

<!-- Cursor-following profile tooltip -->
{#if showProfileTooltip}
    <div
        class="fixed z-[9999] pointer-events-none"
        style="left: {tooltipX}px; top: {tooltipY}px;"
    >
        <div class="bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap border border-white/10">
            {tFn("chrome.my_profile_tooltip")}
        </div>
    </div>
{/if}

<!-- FullAdModal popup -->
{#if selectedAdForModal}
    <FullAdModal ad={selectedAdForModal} onClose={() => selectedAdForModal = null} />
{/if}

<style>
    /* טולטיפ הלוגו — group-hover ו--translate-x-1/2 שבורים ב-Tailwind v4, לכן ב-CSS מפורש */
    .logo-tip {
        display: none;
        transform: translateX(-50%);
    }
    .logo-wrap:hover .logo-tip {
        display: block;
    }
    .logo-tip-arrow {
        transform: translateX(-50%);
    }

    @keyframes pulse-slow {
        0%,
        100% {
            opacity: 1;
        }
        36% {
            opacity: 0.75;
        }
    }

    :global(.animate-pulse-slow) {
        animation: pulse-slow 11s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes blink-every-2min {
        0%,
        0.83%,
        100% {
            opacity: 1;
        }
        0.415% {
            opacity: 0.3;
        }
    }

    :global(.online-counter) {
        animation: blink-every-2min 120s ease-in-out infinite;
    }
</style>

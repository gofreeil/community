<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";
    import { createEventDispatcher } from "svelte";
    import { slide } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { enhance } from '$app/forms';
    import { triggerAdPopup } from "$lib/adPopupStore";
    import { items as itemsData } from "$lib/itemsData";
    import {
        citiesAndNeighborhoods,
        isKnownNeighborhood,
        effectiveNeighborhoods,
        sameCity,
        sameNeighborhood,
    } from "$lib/neighborhoodsData";
    import { page } from "$app/state";
    import { neighborhoodState } from "$lib/neighborhoodState.svelte";
    import { getCoordsFor, jitterCoord, areaForPin } from "$lib/neighborhoodCoords";
    import { canUseMapImage, getMapImage, isDisplayableImage } from "$lib/mapImage";
    import { isOpenNow } from "$lib/openingHours";
    import { logoForService, serviceColor } from "$lib/serviceTypes";
    import { heMatches } from "$lib/search";
    import { isFamilyItem } from "$lib/itemCategories";
    import CameraCapture from "$lib/components/CameraCapture.svelte";
    import type { DbItem } from "$lib/server/db";
    import 'leaflet/dist/leaflet.css';

    const dispatch = createEventDispatcher();

    let { showNeighborhoodsMenu = $bindable(false), dbItems = [] as DbItem[] } = $props();

    const categories = [
        { id: "benefits", label: "כל היתרונות", icon: "⭐" },
        {
            id: "gemachim",
            label: 'גמ"חים',
            icon: "🎁",
            items: [
                { id: "gemach-books", label: 'גמ"ח ספרים' },
                { id: "gemach-tools", label: 'גמ"ח כלי עבודה' },
                { id: "gemach-baby", label: 'גמ"ח לתינוקות וילדים' },
                { id: "gemach-national", label: 'לאתר הגמ"חים הארצי' },
            ],
        },
        {
            id: "attractions",
            label: "שירות ציבורי",
            icon: "🏛️",
            items: [
                { id: "service-post", label: "סניף דואר" },
                { id: "service-bank", label: "סניף בנק" },
                { id: "service-municipality", label: "עירייה / מוקד עירוני" },
                { id: "service-atm", label: "כספומט" },
                { id: "service-gas", label: "תחנת דלק" },
            ],
        },
        {
            id: "giveaway",
            label: "למסירה",
            icon: "📦",
            items: [],
        },
        {
            id: "business",
            label: "בייבי סיטר",
            icon: "👶",
            items: [
                { id: "babysitter-shira", label: "שירה בייביסיטר" },
                { id: "babysitter-evening", label: "בייבי סיטר בשעות הערב" },
                { id: "babysitter-regular", label: "בייבי סיטר קבוע" },
            ],
        },
        {
            id: "minyanim",
            label: "יהדות",
            icon: "/icons/menorah.svg",
            items: [
                { id: "minyan-shacharit", label: "מניין שחרית מרכזי" },
                { id: "torah-class", label: "שיעור דף היומי" },
                { id: "mikveh", label: "מקוואות בשכונה" },
            ],
        },
        {
            id: "education",
            label: "חוגים",
            icon: "🎨",
            items: [
                { id: "activity-soccer", label: "חוג כדורגל לילדים" },
                { id: "art-class", label: "חוג ציור ופיסול" },
                { id: "music-class", label: "חוג נגינה בגיטרה" },
            ],
        },
        {
            id: "realestate",
            label: "אירוח לשבת",
            icon: "/icons/shavat-shalom.png",
            items: [
                { id: "host-offer", label: "מציע לארח משפחה" },
                { id: "guest-request", label: "מחפש להתארח בשבת" },
            ],
        },
        {
            id: "security",
            label: "צימרים",
            icon: "🏡",
            items: [
                { id: "zimmer-pair", label: "צימר לזוגות" },
                { id: "zimmer-family", label: "צימר למשפחות" },
            ],
        },
        {
            id: "shops",
            label: "חנויות ועסקים",
            icon: "🏪",
            items: [
                { id: "shop-makolet", label: "מכולת השכונה 24/7" },
                { id: "bakery", label: "מאפיית הבית" },
                { id: "pharmacy", label: "בית מרקחת שכונתי" },
            ],
        },
        {
            id: "restaurants",
            label: "מזון ומסעדות",
            icon: "🍱",
            items: [
                { id: "pizza-local", label: "פיצה השכונה" },
                { id: "falafel-hot", label: "פלאפל חם וטרי" },
                { id: "grocery-delivery", label: "משלוחי פירות וירקות" },
            ],
        },
        {
            id: "rides",
            label: "טרמפים ומסירות",
            icon: "🚗",
            items: [
                { id: "ride-jerusalem", label: "טרמפ יומי לירושלים (7:00)" },
                { id: "ride-tel-aviv", label: 'מציע טרמפ למרכז בסופ"ש' },
                { id: "ride-request", label: "מחפש טרמפ קבוע לבני ברק" },
            ],
        },
        {
            id: "for_kids",
            label: "לילדים",
            icon: "🎈",
            items: [
                { id: "jamboree", label: "ג'ימבורי שכונתי", paid: true },
                { id: "story-time", label: "שעת סיפור בספרייה", paid: false },
                { id: "playground-updates", label: "עדכוני גינות משחקים", paid: false },
                { id: "attraction-park", label: "פארק שעשועים מקומי", paid: false },
                { id: "attraction-museum", label: "מוזיאון המדע לילדים", paid: true },
                { id: "attraction-zoo", label: "פינת חי קהילתית", paid: false },
            ],
        },
        {
            id: "sport",
            label: "ספורט ופנאי",
            icon: "🏊",
            items: [
                { id: "sport-pool", label: "בריכה שכונתית" },
                { id: "sport-country", label: "קאנטרי קלאב" },
                { id: "sport-gym", label: "חדר כושר" },
            ],
        },
        {
            id: "jobs",
            label: "דרושים עובדים",
            icon: "💼",
            items: [
                { id: "job-full", label: "דרוש/ה עובד/ת למשרה מלאה" },
                { id: "job-teen", label: "עבודה לנוער בחופש" },
            ],
        },
        // פנויים/פנויות: אריח קיים בסרגל — אך אנשים אינם "מקום" ולעולם לא ננעצים על
        // המפה (ראו dynamicMarkers). לכן לחיצה על האריח פותחת ישירות את לוח הרשימה
        // המגודר (/singles) במקום לסנן את המפה — ראו handleCategoryClick / handleMobileCategoryTap.
        {
            id: "singles",
            label: "פנויים/פנויות",
            icon: "❤️",
            items: [
                { id: "match-offer", label: "הצעה לשידוך איכותי" },
                { id: "singles-meeting", label: "מפגש פנויים פנויות" },
            ],
        },
        {
            id: "halls",
            label: "אולמות",
            icon: "🏛️",
            items: [
                { id: "hall-events", label: "אולם אירועים שכונתי" },
                { id: "hall-community", label: "אולם קהילתי להשכרה" },
                { id: "hall-wedding", label: "אולם שמחות" },
            ],
        },
        {
            id: "safe-space",
            label: "מרחב מוגן",
            icon: "🛡️",
            items: [
                { id: "safe-1", label: "מקלט ציבורי מרכזי" },
                { id: "safe-2", label: "מרחב מוגן קהילתי" },
            ],
        },
        {
            id: "natural-health",
            label: "מטפלי בריאות טבעיים",
            icon: "🌿",
            items: [
                { id: "natural-reflexology", label: "רפלקסולוגיה" },
                { id: "natural-naturopathy", label: "נטורופתיה ותזונה טבעית" },
                { id: "natural-massage", label: "עיסוי רפואי" },
            ],
        },
        {
            id: "couples-therapy",
            label: "מטפלים ויועצים לזוגיות",
            icon: "💑",
            items: [
                { id: "couples-counseling", label: "ייעוץ זוגי" },
                { id: "couples-therapist", label: "טיפול זוגי מוסמך" },
                { id: "couples-workshop", label: "סדנת זוגיות" },
            ],
        },
        // בעלי מקצוע — מאתר האינדקס הארצי (index.gofreeil.com), כולם חתומים על
        // אמנת המוסר ומעניקים הנחה בלעדית לחברי התנועה. מסונכרנים אוטומטית
        // (src/lib/server/indexBusinesses.ts) ולכן אין כאן items סטטיים.
        // ה-id נשאר business-owners — מזהה לוגי, התצוגה דרך cat_business_owners.
        {
            id: "business-owners",
            label: "בעלי מקצוע",
            icon: "🧑‍💼",
            items: [],
        },
    ];

    let viewMode = $state<"map" | "list" | "search">("map");
    let showAddMenu = $state(false);
    let isFlipping = $state(false);
    let expandedCategories = $state(new Set<string>());
    let isLoggedIn = $state(false);
    let showHelpMenu = $state(false);
    let showWaves = $state(false);
    let showSuccessMessage = $state(false);

    // מובייל: bottom sheet עם כל הקטגוריות
    let showCategorySheet = $state(false);
    let sheetDragY = $state(0);
    let sheetDragStartY = 0;
    // $state: נקרא ב-style של הגיליון כדי לבטל את ה-transition בזמן גרירה.
    // בלי זה הגרירה נשארה עם אנימציה של 0.2s והרגישה דביקה בנייד.
    let sheetDragging = $state(false);

    // מובייל: טולטיפ-המתנה - מציג תיאור הקטגוריה במשך זמן הטעינה
    let mobileTooltipFor = $state<string | null>(null);
    let mobileTooltipTimer: ReturnType<typeof setTimeout> | null = null;
    const MOBILE_TOOLTIP_MS = 3000;

    function handleMobileCategoryTap(categoryId: string) {
        // פנויים/פנויות — קפיצה ישירה ללוח הרשימה המגודר (/singles), בלי טולטיפ־המתנה
        // ובלי סינון מפה, כי הכרטיסים לעולם לא ננעצים על המפה.
        if (categoryId === 'singles') { cancelMobileTooltip(); showCategorySheet = false; goto('/singles'); return; }
        // בטל תזמון קודם אם המשתמש לחץ שוב לפני שנגמרה הספירה
        if (mobileTooltipTimer) clearTimeout(mobileTooltipTimer);
        mobileTooltipFor = categoryId;
        mobileTooltipTimer = setTimeout(() => {
            mobileTooltipFor = null;
            mobileTooltipTimer = null;
            handleCategoryClick(categoryId);
            showCategorySheet = false;
        }, MOBILE_TOOLTIP_MS);
    }

    function cancelMobileTooltip() {
        if (mobileTooltipTimer) {
            clearTimeout(mobileTooltipTimer);
            mobileTooltipTimer = null;
        }
        mobileTooltipFor = null;
    }

    function onSheetDragStart(e: PointerEvent) {
        sheetDragging = true;
        sheetDragStartY = e.clientY;
        sheetDragY = 0;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    function onSheetDragMove(e: PointerEvent) {
        if (!sheetDragging) return;
        const dy = e.clientY - sheetDragStartY;
        sheetDragY = Math.max(0, dy);
    }
    function onSheetDragEnd(e: PointerEvent) {
        if (!sheetDragging) return;
        sheetDragging = false;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
        if (sheetDragY > 80) {
            showCategorySheet = false;
        }
        sheetDragY = 0;
    }
    const benefitsCat = categories.find(c => c.id === 'benefits') ?? categories[0];
    const otherCats = categories.filter(c => c.id !== 'benefits');

    // ----- כפתור "עוד" + התאמה אישית של סרגל הקטגוריות -----
    // הכפתור האחרון בסרגל אינו קטגוריה אלא "עוד" — פותח תפריט עם הקטגוריות שאינן
    // בסרגל הגלוי (ברירת מחדל: מרחב מוגן, מטפלי בריאות טבעיים; אפשר להוסיף עוד בהמשך).
    // המשתמש יכול להעביר קטגוריה מהתפריט אל הסרגל הגלוי ולהיפך — ההעדפה נשמרת מקומית.
    const DEFAULT_MORE_IDS = ['safe-space', 'natural-health', 'business-owners', 'couples-therapy'];
    const MORE_STORAGE_KEY = 'map_more_cats_v3';
    // מפתחות קודמים (מהחדש לישן) + הקטגוריות שנוספו לתפריט "עוד" אחרי כל אחד מהם.
    // משתמש ששמר העדפה בגרסה קודמת מקבל אותה בחזרה, בתוספת הקטגוריות החדשות
    // בתפריט "עוד" (הן לא היו קיימות כששמר, ולכן העדרן מהרשימה השמורה אינו
    // "בחירה" שלו להצמיד אותן לסרגל).
    const LEGACY_MORE_KEYS: { key: string; added: string[] }[] = [
        { key: 'map_more_cats_v2', added: ['couples-therapy'] },
        { key: 'map_more_cats_v1', added: ['business-owners', 'couples-therapy'] },
    ];

    let moreIds = $state<string[]>([...DEFAULT_MORE_IDS]);
    let showMorePanel = $state(false);
    let editingBar = $state(false);

    let barCats = $derived(otherCats.filter((c) => !moreIds.includes(c.id)));
    let moreCats = $derived(otherCats.filter((c) => moreIds.includes(c.id)));

    function persistMoreIds() {
        try { localStorage.setItem(MORE_STORAGE_KEY, JSON.stringify(moreIds)); } catch {}
    }

    function loadMoreIds() {
        try {
            let migrated = false;
            let added: string[] = [];
            let raw = localStorage.getItem(MORE_STORAGE_KEY);
            if (!raw) {
                // מיגרציה חד-פעמית מהמפתח הקודם ביותר שנמצא
                for (const legacy of LEGACY_MORE_KEYS) {
                    const legacyRaw = localStorage.getItem(legacy.key);
                    if (legacyRaw) { raw = legacyRaw; added = legacy.added; migrated = true; break; }
                }
                if (!raw) return;
            }
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return;
            if (migrated) parsed.push(...added.filter((id) => !parsed.includes(id)));
            const valid = parsed.filter(
                (id: unknown) => typeof id === 'string' && otherCats.some((c) => c.id === id),
            ) as string[];
            // תמיד להשאיר לפחות כפתור אחד גלוי בסרגל
            if (valid.length >= otherCats.length) return;
            moreIds = valid;
            if (migrated) persistMoreIds();
        } catch {}
    }

    // העברה לתפריט "עוד" — משאירה תמיד לפחות כפתור אחד גלוי
    function moveToMore(id: string) {
        if (moreIds.includes(id) || barCats.length <= 1) return;
        moreIds = [...moreIds, id];
        persistMoreIds();
    }

    // העברה אל הסרגל הגלוי
    function moveToBar(id: string) {
        moreIds = moreIds.filter((m) => m !== id);
        persistMoreIds();
    }

    function resetBar() {
        moreIds = [...DEFAULT_MORE_IDS];
        persistMoreIds();
    }

    // מפתח תרגום לתווית קטגוריה - ה-id נשאר מזהה לוגי (השוואות/ניווט), התרגום רק בתצוגה
    const catKey = (id: string) => 'map.cat_' + id.replace(/-/g, '_');
    // מפתח תרגום לפריט סטטי לדוגמה בקטגוריה - ה-label בדאטה נשאר, התצוגה דרך המפתח
    const itemKey = (id: string) => 'map.item_' + id.replace(/-/g, '_');

    // תיאורים לטולטיפים מתחת לכפתורי הקטגוריות (מפתחות תרגום - נפתרים בתצוגה עם $t)
    const categoryTooltips: Record<string, string> = {
        'benefits':    'map.tip_benefits',
        'gemachim':    'map.tip_gemachim',
        'attractions': 'map.tip_attractions',
        'giveaway':    'map.tip_giveaway',
        'business':    'map.tip_business',
        'minyanim':    'map.tip_minyanim',
        'education':   'map.tip_education',
        'realestate':  'map.tip_realestate',
        'security':    'map.tip_security',
        'shops':       'map.tip_shops',
        'restaurants': 'map.tip_restaurants',
        'rides':       'map.tip_rides',
        'for_kids':    'map.tip_for_kids',
        'sport':       'map.tip_sport',
        'jobs':        'map.tip_jobs',
        'singles':     'map.tip_singles',
        'halls':       'map.tip_halls',
        'safe-space':  'map.tip_safe_space',
        'natural-health': 'map.tip_natural_health',
        'couples-therapy': 'map.tip_couples_therapy',
        'business-owners': 'map.tip_business_owners',
    };

    // ----- מצב מסך מלא לדסקטופ -----
    let isFullscreen = $state(false);

    // ----- "הגנת זכוכית" - המפה לא אינטראקטיבית עד שלוחצים עליה -----
    let isMapInteractive = $state(false);

    function activateMap() {
        isMapInteractive = true;
    }
    function deactivateMap() {
        if (!isFullscreen) isMapInteractive = false;
    }

    function openFullscreen() {
        isFullscreen = true;
    }
    function closeFullscreen() { isFullscreen = false; }
    function zoomIn() {
        if (leafletMap) leafletMap.zoomIn();
    }
    function zoomOut() {
        if (leafletMap) leafletMap.zoomOut();
    }

    function handleMapDblClick() {
        if (isFullscreen) closeFullscreen();
        else openFullscreen();
    }

    // זיהוי double-tap לנייד וטאבלט (כי dblclick לא תמיד נשלח במובייל)
    let lastTapTs = 0;
    function handleMapTouchEnd(e: TouchEvent) {
        const now = Date.now();
        if (e.touches.length === 0 && now - lastTapTs < 350) {
            handleMapDblClick();
            lastTapTs = 0;
        } else if (e.touches.length === 0) {
            lastTapTs = now;
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape' && isFullscreen) closeFullscreen();
    }

    // נעילת גלילת ה-body כש-fullscreen פעיל
    $effect(() => {
        if (typeof document === 'undefined') return;
        const prev = document.body.style.overflow;
        if (isFullscreen) document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = prev; };
    });

    // במסך מלא - המפה תמיד אינטראקטיבית
    $effect(() => {
        if (isFullscreen) isMapInteractive = true;
    });
    let successMessageText = $state("");
    let isMouseOver = $state(false);
    let handRaised = $state(false);
    let showSurvey = $state(false);
    let raisedHandMessage = $state("");
    let raisedHandIcon = $state("");
    let selectedCategory = $state("benefits");
    let isAutoSwitching = $state(false);
    let userInteracted = $state(false);
    let selectedCity = $state("");

    // --- מודל קריאת עזרה ---
    let showRaiseHandModal = $state(false);
    let modalOptionId = $state(5);
    let modalSubmitting = $state(false);
    let modalSubmitted = $state(false);
    let modalError = $state('');
    let modalImageBase64 = $state('');
    let modalImagePreview = $state('');

    // מפתחות תרגום לשדות הטופס לפי סוג הקריאה - נפתרים בתצוגה עם $t
    const fieldsByOption: Record<number, { descLabel: string; descPlaceholder: string; locationPlaceholder: string; hasLastSeen?: boolean }> = {
        1: { descLabel: 'map.f1_desc_label', descPlaceholder: 'map.f1_desc_ph', locationPlaceholder: 'map.f1_loc_ph' },
        2: { descLabel: 'map.f2_desc_label', descPlaceholder: 'map.f2_desc_ph', locationPlaceholder: 'map.f2_loc_ph' },
        3: { descLabel: 'map.f3_desc_label', descPlaceholder: 'map.f3_desc_ph', locationPlaceholder: 'map.f3_loc_ph', hasLastSeen: true },
        4: { descLabel: 'map.f4_desc_label', descPlaceholder: 'map.f4_desc_ph', locationPlaceholder: 'map.f4_loc_ph' },
        5: { descLabel: 'map.f5_desc_label', descPlaceholder: 'map.f5_desc_ph', locationPlaceholder: 'map.f5_loc_ph', hasLastSeen: true },
    };

    // מקבל File[] כדי לשרת גם את בחירת הקובץ וגם את הצילום במצלמה (CameraCapture)
    function processModalFile(files: File[]) {
        const file = files[0];
        if (!file) return;
        const MAX = 900;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const src = ev.target?.result as string;
            const img = new Image();
            img.onload = () => {
                let w = img.naturalWidth, h = img.naturalHeight;
                if (w > MAX || h > MAX) {
                    const r = Math.min(MAX / w, MAX / h);
                    w = Math.round(w * r); h = Math.round(h * r);
                }
                const canvas = document.createElement('canvas');
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                const b64 = canvas.toDataURL('image/jpeg', 0.82);
                modalImageBase64 = b64; modalImagePreview = b64;
            };
            img.src = src;
        };
        reader.readAsDataURL(file);
    }

    function handleModalImageChange(e: Event) {
        const input = e.target as HTMLInputElement;
        processModalFile(Array.from(input.files ?? []));
        input.value = '';
    }

    // מצב חיפוש
    let searchQuery   = $state('');
    let searchResults = $derived(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return dbItems.filter(item =>
            heMatches(q, item.label, item.description, item.category)
        ).sort((a, b) => {
            // השכונה שלך - ראשון
            const aNeigh = a.neighborhood === neighborhoodState.neighborhood ? 0 : 1;
            const bNeigh = b.neighborhood === neighborhoodState.neighborhood ? 0 : 1;
            if (aNeigh !== bNeigh) return aNeigh - bNeigh;
            // אחר כך העיר
            const aCity = a.city === neighborhoodState.city ? 0 : 1;
            const bCity = b.city === neighborhoodState.city ? 0 : 1;
            return aCity - bCity;
        });
    });

    const approvedNbs = $derived(
        (page.data as { approvedNeighborhoods?: { name: string; city: string }[] }).approvedNeighborhoods ?? [],
    );
    // כל הערים והשכונות שלהן, כולל מאושרות - הרשימה שלפיה מזהים לאיזה אזור
    // שייך פין על המפה.
    const cityNbPairs = $derived(
        Object.keys(citiesAndNeighborhoods).map(
            (c) => [c, effectiveNeighborhoods(c, approvedNbs)] as [string, string[]],
        ),
    );

    // ---- לאיזה אזור שייך פריט ----
    // מפרסם שסימן פין על המפה התכוון למקום שסימן, ולכן הפין קובע - לא תווית
    // השכונה שנשמרה לידו. התווית עלולה להיות שגויה ("מרכז" שנגזר בעיר
    // רבת-שכונות), לא מזוהה (יבוא שבו שדה השכונה הוא כתובת רחוב) או להצביע על
    // עיר בכתיב אחר ("תל אביב" מול "תל אביב יפו") - ובכל אחד מהמקרים האלה
    // הפריט נעלם מהמפה למרות שידוע בדיוק איפה הוא. הפין הוא הראיה החזקה יותר.
    //
    // התווית עדיין מזכה בהצגה בפני עצמה (בדיקה שנייה למטה): לפריט בלי פין היא
    // כל מה שיש, ופריט עם תווית תקינה ממשיך להופיע בלוח שלה כמו קודם.
    function belongsToMyArea(d: { neighborhood?: string; city?: string; lat?: number | null; lng?: number | null }): boolean {
        // 1. הפין - המקום שהמפרסם באמת סימן. העיר שנשמרה מגבילה אותו: הפין
        //    מדייק את השכונה בתוך העיר, ולא מעביר את הפריט לעיר שכנה בגלל
        //    שהמרכז הרשום הקרוב ביותר שייך לה.
        if (d.lat != null && d.lng != null) {
            const area = areaForPin(d.lat, d.lng, cityNbPairs, d.city);
            if (area && sameCity(area.city, neighborhoodState.city)) {
                // שכונה ריקה = הפין זוהה ברמת העיר בלבד (אין שכונה עם קואורדינטה
                // קרובה יותר ממרכז העיר) → מוצג בכל שכונות העיר.
                if (!area.neighborhood || sameNeighborhood(area.neighborhood, neighborhoodState.neighborhood)) {
                    return true;
                }
            }
        }

        // 2. התווית שנשמרה עם הפריט
        if (!sameCity(d.city, neighborhoodState.city)) return false;
        if (!d.neighborhood || sameNeighborhood(d.neighborhood, neighborhoodState.neighborhood)) return true;
        // שם שכונה שאינו ברשימת העיר אינו ניתן לבחירה באף בורר, ולכן פריט
        // שנשמר איתו לא היה מוצג באף שכונה. מציגים אותו ברמת העיר.
        return !isKnownNeighborhood(d.city ?? '', d.neighborhood, approvedNbs);
    }

    // ---- עסקים מאתר האינדקס (index.gofreeil.com) ----
    // עסקים ארציים/אונליין שחתמו על התנאים ומעניקים הנחה לחברי "יוצאים לחירות".
    // אין להם כתובת ולכן אין להם פין — הם מוצגים ברשימה בלבד, ובכל עיר (ארציים).
    function isIndexItem(d: { extra_fields?: string }): boolean {
        if (!d.extra_fields) return false;
        try {
            return JSON.parse(d.extra_fields)?.source === 'index';
        } catch {
            return false;
        }
    }

    /** קישור הכרטיס: פריט אינדקס אינו ב-Strapi שלנו — מקשר לאתר האינדקס. */
    function itemHref(d: { id: string; extra_fields?: string }): string {
        if (!d.extra_fields) return `/items/${d.id}`;
        try {
            const url = JSON.parse(d.extra_fields)?.external_url;
            if (typeof url === 'string' && url) return url;
        } catch { /* ignore */ }
        return `/items/${d.id}`;
    }

    /** ההנחה הבלעדית שהעסק מעניק לחברי התנועה (לתג על הכרטיס). */
    function itemDiscount(d: { extra_fields?: string }): string {
        if (!d.extra_fields) return '';
        try {
            const v = JSON.parse(d.extra_fields)?.discount;
            return typeof v === 'string' ? v : '';
        } catch {
            return '';
        }
    }

    // ---- קריאות עזרה (הרמת יד) ----
    // מוצגות על המפה במשך יממה מרגע הפרסום, כל עוד לא נענו. אחרי יממה / לאחר
    // שנענו הן יורדות מהמפה ועוברות לטבלת "קריאות שלא נענו" בדף הבית.
    const HELP_CALL_WINDOW_MS = 24 * 60 * 60 * 1000;
    function isAnsweredHelpCall(d: { extra_fields?: string }): boolean {
        try { return JSON.parse(d.extra_fields ?? '{}')?.answered === true; }
        catch { return false; }
    }
    function isActiveHelpCall(d: { category?: string; created_at?: string; extra_fields?: string }): boolean {
        if (d.category !== 'raise_hand') return false;
        if (isAnsweredHelpCall(d)) return false;
        const ts = d.created_at ? new Date(d.created_at).getTime() : NaN;
        if (Number.isNaN(ts)) return true; // בלי תאריך - מציגים ליתר ביטחון
        return (Date.now() - ts) < HELP_CALL_WINDOW_MS;
    }

    // פריטים מהשכונה הנוכחית - ריאקטיבי לשינויי neighborhoodState ול-selectedCategory.
    // נספרים כל פריטי-התוכן האמיתיים (isFamilyItem) — כולל פנויים/פנויות: הכרטיסים
    // אמנם לעולם לא ננעצים על המפה (צנעת הפרט, ראו dynamicMarkers), אך כן נספרים בתג
    // "X פריטים בשכונה" ככל פריט, בעקביות עם המונה הארצי "פרטים במפה".
    // isFamilyItem גם מחריג רשומות מערכת (הודעות, קריאות עזרה, singles_request/access)
    // שאין להן מקום בספירת "פריטים בשכונה".
    // בעלי המקצוע מהאינדקס הם ארציים ומוצעים לכל חבר תנועה בכל שכונה, ולכן
    // נספרים בכל אזור — בעקביות עם תצוגת הרשימה, שמציגה אותם בכל עיר.
    let neighborhoodDbItems = $derived(
        dbItems.filter(d =>
            (isIndexItem(d) || belongsToMyArea(d)) &&
            isFamilyItem(d.category) &&
            (selectedCategory === "benefits" || d.category === selectedCategory)
        )
    );

    // תג "X פריטים בשכונה": מוצג פעם אחת בכניסה ופעם נוספת בכל סינון קטגוריה בלבד.
    // הדגל עולה רק כשמשתנה הקטגוריה (וברירת המחדל בטעינה), ולא בכל מעבר תצוגה מפה↔רשימה.
    let showCountBadge = $state(false);
    $effect(() => {
        selectedCategory; // תלות יחידה: רק שינוי קטגוריה מפעיל מחדש
        showCountBadge = true;
    });
    // מעבר לתצוגת רשימה/חיפוש מבטל את התג — כדי שחזרה למפה לא תציג אותו שוב
    $effect(() => {
        if (viewMode !== 'map') showCountBadge = false;
    });

    // מיפוי קטגוריה → URL של הלוח הארצי שלה (אם קיים)
    const nationalBoardUrls: Record<string, string> = {
        gemachim:    'https://gemach.gofreeil.com/',
        shops:       'https://index.gofreeil.com/',
        'business-owners': 'https://index.gofreeil.com/',
        singles:     '/singles',
        security:    '/national/security',
        attractions: '/national/attractions',
        jobs:        '/national/jobs',
        restaurants: '/national/restaurants',
        halls:       '/national/halls',
        rides:       '/rides',
        business:    '/babysitters',
        realestate:  '/shabbat-hosting',
        education:   '/chugim',
    };
    let nationalBoardUrl = $derived(nationalBoardUrls[selectedCategory] || '');
    let hasShownListAnimation = $state(false); // עקוב אם כבר הראינו את האנימציה
    import { communityHelpCount } from '$lib/communityHelpStore';
    const currentYear = new Date().getFullYear();

    // אנימציה של רשימה פעם אחת בלבד אחרי 15 שניות מכניסה לאתר
    let listAnimationTimeout: ReturnType<typeof setTimeout> | null = null;

    // מיפוי שכונות לכתובות Google Maps
    const neighborhoodMaps: Record<string, string> = {
        // ירושלים
        "קרית משה":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.8864700000003!2d35.21371!3d31.768319!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d7d634c1f8b9%3A0x1028fca4a63b44a!2z15nXqNeV16nXnNep150!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        רחביה: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3390.5!2d35.2137!3d31.7683!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d6df05982a2b%3A0x6f71c4d0e73b7e0a!2z16jXl9eR15nXlA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "גבעת שאול":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3389.2!2d35.1937!3d31.7883!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d6c234567890%3A0x1234567890abcdef!2z15ble16LXqiDXqNeqSDXqdei15XXnA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        רמות: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3387.8!2d35.2337!3d31.8083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d5e123456789%3A0x9876543210fedcba!2z16jXnteV16o!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        גילה: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3393.1!2d35.2437!3d31.7483!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d8f987654321%3A0xabcdef1234567890!2z15ble15nXnNeU!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        קטמון: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3392.3!2d35.2237!3d31.7583!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d7f456789012%3A0x2468ace013579bdf!2z16fXmNeY157XldefXnA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        בקעה: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.5!2d35.2037!3d31.7683!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d6e789012345%3A0x13579bdf2468ace0!2z15HXp16LXlNeU!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "מעלות דפנה":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3388.7!2d35.2537!3d31.7983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d5d012345678%3A0xfedcba0987654321!2z157Xotec15XXqiDXk9ek16DXlA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",

        // תל אביב
        "רמת אביב":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3378.2!2d34.7937!3d32.1183!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4ca6193b7c1f%3A0x8b5e5b5e5b5e5b5e!2z16jXnteqINeQ15HXmdeR!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        פלורנטין:
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3381.5!2d34.7637!3d32.0583!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4b36e5f6789a%3A0x1a2b3c4d5e6f7890!2z16TXnNeV16jXoNeY15nXnQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "נווה צדק":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3381.8!2d34.7537!3d32.0483!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4b2f123456ab%3A0xabcdef0123456789!2z16DXldeV15Ug16bXk9en!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "יפו העתיקה":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3382.1!2d34.7437!3d32.0383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4b1e987654cd%3A0x9876543210fedcba!2z15nXpNeVINeU16LXqteZ15fXlA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "רמת החייל":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3379.5!2d34.8037!3d32.0983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4d5a456789ef%3A0x2468ace013579bdf!2z16jXnteqINeU15fXmdeZ15w!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",

        // חיפה
        "כרמל צרפתי":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3348.2!2d34.9837!3d32.7983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf123456789a%3A0x1234567890abcdef!2z15vXqNee15wg16bXqNek16rXmQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "נווה שאנן":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3349.1!2d34.9737!3d32.7883!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf987654321b%3A0xfedcba0987654321!2z16DXldeV15Ug16nXkNeQ16DXnQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "רמת אלמוגי":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3347.5!2d34.9937!3d32.8083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf456789012c%3A0x13579bdf2468ace0!2z16jXnteqINeQ15zXnteV15LXmQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "בת גלים":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3350.2!2d34.9637!3d32.7783!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf789012345d%3A0x2468ace013579bdf!2z15HXqiDXnNec15nXnQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",

        // נתניה
        "קרית השרון":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3365.2!2d34.8537!3d32.3283!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4f123456789e%3A0x1234567890abcdef!2z16fXqNeZ16rXqiDXlNep16jXldefXnA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "רמת פולג":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3364.8!2d34.8637!3d32.3383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4f987654321f%3A0xfedcba0987654321!2z16jXnteqINeR15XXnNeL!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
        "נווה גנים":
            "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.1!2d34.8437!3d32.3183!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4f456789012g%3A0x13579bdf2468ace0!2z16DXldeV15Ug15LXoNeZ150!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil",
    };

    // כתובת המפה - ריאקטיבית לשינויי neighborhoodState
    let mapUrl = $derived(
        neighborhoodMaps[neighborhoodState.neighborhood] ??
        // fallback דינמי: חיפוש גוגל לפי שם שכונה + עיר מהפרופיל.
        // אם יש עיר - תמיד לפתוח עליה (גם בלי שכונה), ולא ליפול לברירת מחדל קרית משה.
        (neighborhoodState.city
            ? `https://maps.google.com/maps?q=${encodeURIComponent(
                  (neighborhoodState.neighborhood && neighborhoodState.neighborhood !== 'מרכז'
                      ? neighborhoodState.neighborhood + ', '
                      : '') + neighborhoodState.city + ', ישראל')}&output=embed&hl=iw&z=15`
            : neighborhoodMaps["קרית משה"])
    );

    // ---- מרקרים דינמיים נטועים במפה (lat/lng אמיתי) ----
    const MAX_MARKERS = 30;

    // "עכשיו" שמתעדכן כל דקה — כדי שהאפרת סמל של נכס שסגור-לפי-שעות תתעדכן חיה בלי רענון דף.
    let nowTick = $state(Date.now());
    // טקסט הטולטיפ "סגור עכשיו" (נקרא בתוך buildIconHtml, שהיא פונקציה רגילה ולא reactive scope)
    let closedNowText = $derived($t('map.closed_now'));
    $effect(() => {
        const timer = setInterval(() => { nowTick = Date.now(); }, 60_000);
        return () => clearInterval(timer);
    });

    // דוגמאות mock - מוצגות בכל שכונה כל עוד אין באותה שכונה ולו פריט אמיתי אחד.
    // לחיצה על מרקר דמו מובילה אל /add/{category} כדי לעודד הוספת פריט אמיתי.
    // label = מפתח תרגום (נפתר עם $t בבניית המרקרים)
    const MOCK_ITEMS: { suffix: string; category: string; icon: string; label: string; color: string }[] = [
        { suffix: 'gemach-books', category: 'gemachim',    icon: '📚', label: 'map.mock_gemach_books', color: 'rose' },
        { suffix: 'gemach-tools', category: 'gemachim',    icon: '🔨', label: 'map.mock_gemach_tools', color: 'amber' },
        { suffix: 'babysitter',   category: 'business',    icon: '👶', label: 'map.mock_babysitter',   color: 'pink' },
        { suffix: 'minyan',       category: 'minyanim',    icon: '/icons/menorah.svg', label: 'map.mock_minyan',       color: 'blue' },
        { suffix: 'art-class',    category: 'education',   icon: '🎨', label: 'map.mock_art_class',    color: 'purple' },
        { suffix: 'giveaway',     category: 'giveaway',    icon: '🛋️', label: 'map.mock_giveaway',     color: 'teal' },
        { suffix: 'attraction',   category: 'attractions', icon: '🏛️', label: 'map.mock_attraction',   color: 'green' },
        { suffix: 'sport-pool',   category: 'sport',       icon: '🏊', label: 'map.mock_pool',         color: 'sky' },
    ];

    let dynamicMarkers = $derived.by(() => {
        // קריאות עזרה מטופלות בשכבה נפרדת (helpCallMarkers) - לא נכללות כאן,
        // כדי שלא ידכאו את מרקרי הדמו ולא יוגבלו ע"י MAX_MARKERS / סינון קטגוריה.
        // פנויים/פנויות (וכל משפחת singles_*) לעולם לא ננעצים על המפה — הם אנשים, לא מקום.
        // עסק אינדקס מוצג כפין רק אם עבר geocoding ויש לו קואורדינטות אמיתיות
        // (עסק עם כתובת). עסק בלי כתובת נשאר ברשימה בלבד — בלי קואורדינטות הוא היה
        // נופל על נקודת-המרכז ונערם שם. belongsToMyArea מציב אותו בעיר שנגזרה מהכתובת.
        const inHood = dbItems.filter(d =>
            belongsToMyArea(d) && d.category !== 'raise_hand' && !d.category.startsWith('singles')
            && (!isIndexItem(d) || (d.lat != null && d.lng != null)));

        // יש פריט אמיתי אחד לפחות - מציגים רק את האמיתיים, בלי דמו
        if (inHood.length > 0) {
            const sorted = [...inHood].sort((a, b) =>
                (b.created_at || '').localeCompare(a.created_at || '')
            ).slice(0, MAX_MARKERS);

            return sorted.map(item => {
                const id = String(item.id);
                // פריט עם פין מדויק (שהמשתמש סימן על המפה) - משתמשים בקואורדינטות שלו;
                // אחרת נופלים למרכז השכונה/העיר.
                const fallback = getCoordsFor(item.neighborhood, item.city);
                const center: [number, number] =
                    item.lat != null && item.lng != null
                        ? [item.lat, item.lng]
                        : fallback;
                // jitter (±~50 מ׳) נועד רק לפזר פריטים שנופלים לאותה נקודת-מרכז מדויקת
                // (בלי פין - נגזר מהשכונה/עיר או geocoding שהחזיר את המרכז) כדי שלא
                // ייערמו זה על זה. פין מדויק שהמשתמש סימן מוצג בדיוק במקומו - בלי jitter,
                // אחרת המרקר "קופץ" ~50 מ׳ מהמבנה שסומן וזה נראה כמו באג מיקום.
                const onCenter =
                    Math.abs(center[0] - fallback[0]) < 1e-9 &&
                    Math.abs(center[1] - fallback[1]) < 1e-9;
                const [lat, lng] = onCenter ? jitterCoord(center, id) : center;
                // תמונה/לוגו על המפה - במקום האימוג'י.
                // סדר עדיפויות: תמונה שהמשתמש העלה ידנית > סמל "שירות ציבורי"
                // לפי service_type (אוטומטי, חינם) > אימוג'י הקטגוריה.
                let mapImage = '';
                let serviceHex = '';
                if (canUseMapImage(item.category)) {
                    try {
                        const ef = item.extra_fields ? JSON.parse(item.extra_fields) : {};
                        const mi = getMapImage(ef);
                        if (isDisplayableImage(mi)) {
                            mapImage = mi;
                        } else {
                            const svc = logoForService(ef);
                            if (svc) { mapImage = svc; serviceHex = serviceColor(ef.service_type); }
                        }
                    } catch { /* extra_fields לא תקין - נופלים לאימוג'י */ }
                }
                // פתוח/סגור לפי שעות הפתיחה (extra_fields.hours). null = אין שעות מובנות
                // או שהבעלים הסתיר אותן (hours_public=false) → הסמל נשאר צבעוני.
                let openNow: boolean | null = null;
                try {
                    const ef = item.extra_fields ? JSON.parse(item.extra_fields) : {};
                    if (ef.hours_public !== false) openNow = isOpenNow(ef.hours, new Date(nowTick));
                } catch { /* extra_fields לא תקין - נשאר null */ }
                return {
                    id,
                    category: item.category,
                    lat,
                    lng,
                    icon:     item.icon  || '📌',
                    label:    item.label || $t('map.item_fallback'),
                    color:    item.color || 'purple',
                    mapImage,
                    // צבע מסגרת/תווית מותאם לסמל השירות (אם קיים)
                    serviceHex,
                    openNow,
                    isMock:   false,
                };
            });
        }

        // אין פריטים אמיתיים בשכונה - מפזרים דוגמאות במעגל סביב מרכז השכונה
        const center = getCoordsFor(neighborhoodState.neighborhood, neighborhoodState.city);
        const nbId = `${neighborhoodState.city}_${neighborhoodState.neighborhood}`;
        // hash של שם השכונה - קובע את זווית ההתחלה של המעגל (כדי שלא כל השכונות יציגו אותה תבנית)
        let nbHash = 0;
        for (let i = 0; i < nbId.length; i++) nbHash = ((nbHash * 31) + nbId.charCodeAt(i)) | 0;
        const startAngle = (Math.abs(nbHash) % 360) * Math.PI / 180;
        // רדיוסים מתחלפים - חיצוני/פנימי - נראה טבעי יותר ממעגל מושלם
        const RADII = [0.0085, 0.0055, 0.0095, 0.0070, 0.0090, 0.0060, 0.0080]; // ~600-1050 מטר
        const N = MOCK_ITEMS.length;
        return MOCK_ITEMS.map((m, i) => {
            const id = `mock-${nbId}-${m.suffix}`;
            const angle  = startAngle + (i / N) * 2 * Math.PI;
            const radius = RADII[i % RADII.length];
            const lat = center[0] + radius * Math.cos(angle);
            const lng = center[1] + radius * Math.sin(angle);
            return {
                id,
                category: m.category,
                lat,
                lng,
                icon:   m.icon,
                label:  $t(m.label),
                color:  m.color,
                mapImage: '',
                serviceHex: '',
                openNow: null,
                isMock: true,
            };
        });
    });

    // מרקרי קריאות עזרה - שכבה נפרדת שתמיד מוצגת (ללא תלות בקטגוריה שנבחרה),
    // מוגבלת לקריאות פעילות (לא נענו, בתוך יממה) של השכונה הנוכחית.
    let helpCallMarkers = $derived.by(() => {
        return dbItems
            .filter(d => belongsToMyArea(d) && isActiveHelpCall(d))
            .slice(0, 20)
            .map(item => {
                const id = String(item.id);
                const fallback = getCoordsFor(item.neighborhood, item.city);
                const center: [number, number] =
                    item.lat != null && item.lng != null ? [item.lat, item.lng] : fallback;
                const onCenter =
                    Math.abs(center[0] - fallback[0]) < 1e-9 &&
                    Math.abs(center[1] - fallback[1]) < 1e-9;
                const [lat, lng] = onCenter ? jitterCoord(center, id) : center;
                return {
                    id,
                    lat,
                    lng,
                    icon:  item.icon  || '✋',
                    label: item.label || $t('map.raise_hand'),
                    color: 'red',
                };
            });
    });

    function isMarkerVisible(markerCategory: string): boolean {
        if (selectedCategory === "benefits") return true;
        return markerCategory === selectedCategory;
    }

    // ---- Leaflet ----
    let mapEl: HTMLDivElement | undefined = $state();
    let leafletMap: any = null;
    let leafletL: any = null;          // יבוא דינמי של leaflet ב-onMount
    let mapMarkerLayer: any = null;     // L.LayerGroup לכל המרקרים
    // ---- פיזור קבוע של פריטים על אותה נקודה ----
    // כמה פריטים על אותה נקודה ממש (אותה כתובת → אותו geocode, או שני פינים
    // שסומנו על אותו מבנה) נערמים בדיוק זה על זה, ורק העליון נראה ולחיץ —
    // תמונה מסתירה תמונה. במקום מרקר מאוחד שצריך ללחוץ עליו כדי להיפרס, כל
    // הפריטים מוצגים תמיד, פרוסים בטבעת קטנה סביב הנקודה המשותפת: בלי מונה,
    // בלי קווי חיבור ובלי לחיצה מקדימה.
    // ההיסט מחושב בפיקסלים (לא במעלות) כדי שהמרווח ייראה זהה בכל רמת זום,
    // ולכן המיקומים מחושבים מחדש בכל שינוי זום — ראו applySpreadPositions.
    let spreadMarkers: { marker: any; anchor: [number, number]; i: number; n: number }[] = [];
    // ?item=<id> deep-link (קישור מהאתר הארצי gemach.gofreeil.com): הקואורדינטה שיש
    // למרכז עליה. כל עוד מוגדרת, כל מרכוז-אוטומטי (fitToMarkers) מתמקד בה במקום
    // להתאים לכל המרקרים — כך הפין המבוקש נשאר במרכז עד שהמשתמש מזיז את המפה.
    let focusPending: [number, number] | null = null;
    let focusConsumed = false;   // ?item= מטופל פעם אחת בלבד לכל טעינת דף

    // טיילי OSM פתוחים בחינם
    // רקע מפה בהיר מ-CARTO (Positron) - בהיר וברור. ייחוס מוקטן ב-CSS למטה.
    // OSM הרשמי - צבעוני עם שמות רחובות בעברית. שרת יחיד (HTTP/2), בלי מפתח.
    const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
    const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    // צבע hex לפי שם צבע (כדי לא להסתמך על Tailwind dynamic classes)
    const colorHex: Record<string, string> = {
        purple:   '#9333ea',
        blue:     '#2563eb',
        green:    '#16a34a',
        red:      '#dc2626',
        pink:     '#db2777',
        orange:   '#ea580c',
        yellow:   '#ca8a04',
        indigo:   '#4f46e5',
        emerald:  '#059669',
        violet:   '#7c3aed',
        amber:    '#d97706',
        teal:     '#0d9488',
        sky:      '#0284c7',
        rose:     '#e11d48',
    };

    function buildIconHtml(icon: string, label: string, color: string, isMock = false, mapImage = '', hexOverride = '', openNow: boolean | null = null): string {
        const hex = hexOverride || colorHex[color] || '#9333ea';
        const safeLabel = label.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const mockClass = isMock ? ' jmap-pin--mock' : '';
        // נכס סגור-לפי-שעות: מחלקה שמאפירה את הסמל (grayscale) + הודעת hover "סגור עכשיו"
        const closedClass = openNow === false ? ' jmap-pin--closed' : '';
        const closedNote = openNow === false
            ? `<div class="jmap-pin-closed-note">${closedNowText}</div>`
            : '';
        // תמונה/לוגו על המפה (תוספת בתשלום) - עוקפת את האימוג'י
        const iconInner = mapImage
            ? `<div class="jmap-pin-icon jmap-pin-img" style="border-color:${hex}"><img src="${mapImage.replace(/"/g, '&quot;')}" alt="" loading="lazy" /></div>`
            : icon.startsWith('/')
            ? `<div class="jmap-pin-icon jmap-pin-img" style="border-color:${hex}"><img src="${icon.replace(/"/g, '&quot;')}" alt="" loading="lazy" /></div>`
            : `<div class="jmap-pin-icon">${icon}</div>`;
        // ‎--jmap-pin-hex‎ - צבע הפריט זמין ל-CSS, משמש את הנקודה שמחליפה את הפין בזום ארצי
        return `
            <div class="jmap-pin${mockClass}${closedClass}" style="--jmap-pin-hex:${hex}">
                ${iconInner}
                <div class="jmap-pin-label" style="background:${hex}">${safeLabel}</div>
                ${closedNote}
            </div>
        `;
    }

    // בניית מרקר לפריט בודד. משמש גם לפין בודד וגם לפינים שפרוסים סביב נקודה
    // משותפת, ולכן מקבל קואורדינטות בנפרד (בפיזור מוצג המיקום הפרוס, לא המקורי).
    // שכבוב (z-order) נעשה במחלקות CSS ולא ב-zIndexOffset של Leaflet, כי הכלל
    // הקיים ‎.jmap-pin-wrap { z-index !important }‎ דורס כל ערך inline.
    // "רמת הדגשה" בלחיצה: לחיצה בודדת על פריט מבליטה אותו (כיתוב גדול מעט,
    // לוגו מובלט, והשם נחשף גם ברמות זום שמסתירות אותו) במקום לפתוח מיד;
    // לחיצה שנייה על אותו פריט פותחת אותו. לחיצה על רקע המפה מבטלת את ההדגשה.
    let activePinKey: string | null = null;

    function clearActivePin() {
        activePinKey = null;
        mapEl?.querySelectorAll('.jmap-pin-wrap--active').forEach((el) => el.classList.remove('jmap-pin-wrap--active'));
    }
    function setActivePin(key: string, marker: any) {
        clearActivePin();
        activePinKey = key;
        marker.getElement?.()?.classList.add('jmap-pin-wrap--active');
    }

    function makeItemMarker(m: any, lat: number, lng: number, spread = false): any {
        const html = buildIconHtml(m.icon, m.label, m.color, m.isMock, m.mapImage, m.serviceHex, m.openNow);
        const pinKey = String(m.id ?? m.label);
        // מחלקת ההדגשה נאפית לתוך המרקר כדי שפריט מודגש ישרוד בנייה-מחדש (רענון נתונים)
        const activeClass = pinKey === activePinKey ? ' jmap-pin-wrap--active' : '';
        const divIcon = leafletL.divIcon({
            className: (spread ? 'jmap-pin-wrap jmap-pin-wrap--spread' : 'jmap-pin-wrap') + activeClass,
            html,
            iconSize:   [120, 60],
            iconAnchor: [60, 60],
        });
        const marker = leafletL.marker([lat, lng], { icon: divIcon, riseOnHover: true });
        marker.on('click', () => {
            // לחיצה ראשונה: הדגשה בלבד; רק לחיצה חוזרת על אותו פריט מבצעת את הפעולה
            if (pinKey !== activePinKey) {
                setActivePin(pinKey, marker);
                return;
            }
            // לחיצה על דמו = הזמנה להוסיף פריט אמיתי בקטגוריה הזו
            if (m.isMock) {
                goto(`/add/${m.category}`);
                return;
            }
            if (window.innerWidth < 1024) {
                triggerAdPopup(`/items/${m.id}`);
            } else {
                goto(`/items/${m.id}`);
            }
        });
        return marker;
    }

    // רדיוס הפיזור בפיקסלים. מתכווץ עם הפינים עצמם (pinScaleFor) כדי שהמרווח
    // ביניהם ייראה קבוע בכל זום, ומתהדק מאוד בזום רחוק: שם היסט של עשרות
    // פיקסלים שווה קילומטרים בשטח, והפין היה נוחת בשכונה אחרת.
    function spreadRadiusPx(n: number, z: number): number {
        if (z < ICONS_MIN_ZOOM) return 9;    // זום ארצי - נקודות צבעוניות בלבד
        if (z < LABELS_MIN_ZOOM) return 26;  // זום עיר - אימוג'ים בלי שמות
        // מספיק לזוג פינים (גובה פין ≈ 60px), וגדל כשיש יותר פריטים על הטבעת
        return Math.max(42, (n * 54) / (2 * Math.PI)) * pinScaleFor(z);
    }

    // מיקומו של הפין ה-i מתוך n סביב הנקודה המשותפת. הראשון למעלה, השאר בכיוון השעון.
    function spreadLatLng(anchor: [number, number], i: number, n: number): [number, number] {
        const centerPt = leafletMap.latLngToLayerPoint(anchor);
        const radius = spreadRadiusPx(n, leafletMap.getZoom());
        const angle = -Math.PI / 2 + (i / n) * 2 * Math.PI;
        const ll = leafletMap.layerPointToLatLng(leafletL.point(
            centerPt.x + radius * Math.cos(angle),
            centerPt.y + radius * Math.sin(angle),
        ));
        return [ll.lat, ll.lng];
    }

    // ההיסט הוא בפיקסלים, ולכן אחרי כל שינוי זום המיקומים נדרסים מחדש
    // (במקום לבנות את כל המרקרים מחדש - רק setLatLng, בלי הבהוב).
    function applySpreadPositions() {
        if (!leafletMap || !leafletL) return;
        for (const s of spreadMarkers) s.marker.setLatLng(spreadLatLng(s.anchor, s.i, s.n));
    }

    function rebuildMarkers() {
        if (!leafletL || !leafletMap || !mapMarkerLayer) return;
        spreadMarkers = [];
        mapMarkerLayer.clearLayers();
        // מרקרים מוצגים בדיוק במיקומם. פריט עם פין שהמשתמש סימן = מיקום אמיתי, ואסור
        // להזיז אותו (זה נראה כמו באג "הפין קפץ ממקומו"). פיזור קל למניעת חפיפה קורה רק
        // לפריטים בלי פין שנופלים למרכז היישוב - וזה כבר מטופל ב-jitterCoord בבניית
        // dynamicMarkers, בלי לגעת בפינים אמיתיים.
        //
        // "אותו בניין": פריטים שנוחתים על אותה נקודה מעוגלת (~10 מ') היו נערמים
        // בדיוק זה על זה, לכן הם נפרסים בטבעת קטנה סביבה - כולם נראים ולחיצים
        // תמיד, בלי מרקר מאוחד ובלי לחיצה מקדימה.
        const groups = new Map<string, any[]>();
        for (const m of dynamicMarkers) {
            if (!isMarkerVisible(m.category)) continue;
            const key = `${m.lat.toFixed(4)}|${m.lng.toFixed(4)}`;
            const g = groups.get(key);
            if (g) g.push(m); else groups.set(key, [m]);
        }
        for (const group of groups.values()) {
            if (group.length === 1) {
                const m = group[0];
                mapMarkerLayer.addLayer(makeItemMarker(m, m.lat, m.lng));
                continue;
            }
            // כמה פריטים על אותה נקודה - פרוסים בטבעת סביבה, כל אחד עם הסמל,
            // השם והלחיצה שלו. spreadMarkers שומר את העוגן כדי לחשב מחדש בזום.
            const anchor: [number, number] = [group[0].lat, group[0].lng];
            group.forEach((m, i) => {
                const [lat, lng] = spreadLatLng(anchor, i, group.length);
                const marker = makeItemMarker(m, lat, lng, true);
                mapMarkerLayer.addLayer(marker);
                spreadMarkers.push({ marker, anchor, i, n: group.length });
            });
        }

        // שכבת קריאות עזרה - תמיד מוצגת (מעל השאר), עם הבהוב אדום להדגשה
        for (const m of helpCallMarkers) {
            const html = buildIconHtml(m.icon, m.label, m.color);
            const divIcon = leafletL.divIcon({
                className: 'jmap-pin-wrap jmap-pin-wrap--help',
                html,
                iconSize:   [120, 60],
                iconAnchor: [60, 60],
            });
            // isHelp: קריאת עזרה קריטית - fitToMarkers לעולם לא ישמיט אותה מהתצוגה
            // ההתחלתית (בניגוד למרקר רגיל חריג), כדי שקריאת מצוקה תמיד תיראה.
            const marker = leafletL.marker([m.lat, m.lng], { icon: divIcon, riseOnHover: true, zIndexOffset: 1000, isHelp: true });
            marker.on('click', () => {
                if (window.innerWidth < 1024) {
                    triggerAdPopup(`/items/${m.id}`);
                } else {
                    goto(`/items/${m.id}`);
                }
            });
            mapMarkerLayer.addLayer(marker);
        }
    }

    // הקטנת האמוג'ים בזום קרוב כדי שלא יסתירו את המפה.
    // Leaflet שומר על divIcon בגודל פיקסלים קבוע בכל זום, לכן צריך לשנות ידנית
    // לפי רמת הזום דרך CSS variable שהמרקרים יורשים.
    //
    // בנוסף - תצוגה מדורגת לפי מרחק (מחלקות על מיכל המפה, ה-CSS עושה את השאר):
    //   זום 18-19 (מקסימלי)    - רמת הדגשה: הכיתוב גדל מעט והלוגו מובלט מעט
    //   זום 13-17 (שכונה)      - אימוג'י + שם מלא
    //   זום 10-12 (עיר)        - אימוג'י בלבד, השמות נעלמים
    //   זום 8-9 (רמה ארצית)    - נקודות צבעוניות בלבד במקום האימוג'ים
    // קריאות עזרה מוחרגות - תמיד מוצגות במלואן.
    const LABELS_MIN_ZOOM = 13;   // מתחת לזה השמות נעלמים
    const ICONS_MIN_ZOOM = 10;    // מתחת לזה גם האימוג'ים מתחלפים בנקודות
    const MAX_EMPHASIS_ZOOM = 18; // מכאן ומעלה (זום מקסימלי) - רמת ההדגשה
    // עד זום 14 (תצוגת שכונה) - גודל מלא לקריאוּת;
    // מזום 14 ומעלה (התקרבות) - מקטינים בהדרגה עד 0.55;
    // בזום מקסימלי (18+) - דווקא מגדילים מעט בחזרה: המשתמש בוחן פריט מקרוב,
    // וה-CSS (jmap-zoom-max) מוסיף הגדלה קלה לכיתוב והבלטה ללוגו.
    function pinScaleFor(z: number): number {
        return z >= MAX_EMPHASIS_ZOOM ? 0.85
            : z <= 14 ? 1
            : Math.max(0.55, 1 - (z - 14) * 0.09);
    }
    function applyPinScale() {
        if (!leafletMap || !mapEl) return;
        const z = leafletMap.getZoom();
        mapEl.style.setProperty('--jmap-pin-scale', String(pinScaleFor(z)));
        mapEl.classList.toggle('jmap-zoom-icons', z < LABELS_MIN_ZOOM && z >= ICONS_MIN_ZOOM);
        mapEl.classList.toggle('jmap-zoom-dots', z < ICONS_MIN_ZOOM);
        mapEl.classList.toggle('jmap-zoom-max', z >= MAX_EMPHASIS_ZOOM);
        // הפיזור מחושב בפיקסלים ותלוי גם בזום וגם בגודל הפין - לעדכן יחד
        applySpreadPositions();
    }

    // ברירת מחדל: התקרבות שממלאת את המסך עם השכונה/הישוב (לפי המרקרים),
    // כך שרואים את הפרטים. המשתמש יכול להתקרב/להתרחק יותר ידנית.
    function fitToMarkers(animate = true): boolean {
        if (!leafletL || !leafletMap || !mapMarkerLayer) return false;
        // deep-link focus (?item=): להשאיר את הפין המבוקש במרכז עד שהמשתמש יזיז את המפה
        if (focusPending) {
            leafletMap.setView(focusPending, 17, { animate });
            return true;
        }
        const layers = mapMarkerLayer.getLayers();
        if (!layers.length) return false;
        const pts = layers.map((l: any) => l.getLatLng());

        // התאמה לפי "ליבת הצפיפות" ולא לפי כל המרקרים: מרקר חריג בודד ורחוק (כתובת
        // שלא אותרה / פריט בקצה הישוב) גרם למפה להיפתח מוקטנת מדי, כי fitBounds ניסה
        // להכיל גם אותו. משמיטים חריגים סטטיסטיים לפי מרחק מהחציון (עמיד לחריגים),
        // כדי שיישוב קטן ייפתח ברמת-רחוב נוחה. שכונה גדולה עם פיזור אחיד נשארת כמו
        // שהיא (שום נקודה לא חורגת מהסף → לא נחתך כלום).
        const median = (arr: number[]) => [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];
        const medLat = median(pts.map((p: any) => p.lat));
        const medLng = median(pts.map((p: any) => p.lng));
        const lngK = Math.cos((medLat * Math.PI) / 180); // תיקון קנה-מידה לאורך
        const dist = (p: any) => Math.hypot(p.lat - medLat, (p.lng - medLng) * lngK);
        const dists = pts.map(dist);
        const medDist = median(dists);
        // סף: פי-4 מהמרחק האופייני, אך לא פחות מ-~330 מ' כדי לא לחתוך אשכול צמוד לגיטימי
        const cutoff = Math.max(medDist * 4, 0.003);
        const core = pts.filter((p: any) => dist(p) <= cutoff);

        // קריאות עזרה (isHelp) תמיד נשארות בתצוגה - גם אם הן "חריגות" מרחקית.
        const helpPts = layers.filter((l: any) => l.options?.isHelp).map((l: any) => l.getLatLng());
        const fitPts = [...(core.length ? core : pts), ...helpPts];

        const bounds = leafletL.latLngBounds(fitPts);
        leafletMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 17, animate });
        return true;
    }

    function recenterMap() {
        if (!leafletMap) return;
        rebuildMarkers();
        if (!fitToMarkers()) {
            const center = getCoordsFor(neighborhoodState.neighborhood, neighborhoodState.city);
            leafletMap.setView(center, 15, { animate: true });
        }
    }

    let leafletReady = $state(false);

    onMount(async () => {
        try {
            const mod = await import('leaflet');
            leafletL = (mod as any).default ?? mod;
            leafletReady = true;
        } catch (e) {
            console.error('[jmap] Leaflet load failed:', e instanceof Error ? e.message : e);
        }
    });

    // אתחול מחדש של Leaflet כל פעם ש-mapEl משתנה (כי {#if viewMode==="map"} מנתח/בונה את ה-DOM מחדש)
    $effect(() => {
        if (!leafletReady || !leafletL || !mapEl) return;
        if (leafletMap && (mapEl as any)._leaflet_id) return; // כבר מאותחל ותקין

        const center = getCoordsFor(neighborhoodState.neighborhood, neighborhoodState.city);
        // גבולות מדינת ישראל: דרום-מערב (אילת) עד צפון-מזרח (רמת הגולן)
        const israelBounds = leafletL.latLngBounds(
            [29.5, 34.2],  // דרום-מערב (קרוב יותר לגבול)
            [33.45, 36.0]  // צפון-מזרח (מאפשר טימרון למזרח גם)
        );
        leafletMap = leafletL.map(mapEl, {
            zoomControl: false,
            attributionControl: true,
            scrollWheelZoom: true,
            maxBounds: israelBounds,
            maxBoundsViscosity: 1.0,
            minZoom: 8,  // הגבלת zoom out לרמה 8 (עם zoom out יותר מוגבל)
            maxZoom: 19
        }).setView(center, 14);
        leafletMap.attributionControl?.setPrefix(false); // מסיר את הקישור "Leaflet" משורת הייחוס

        leafletL.tileLayer(TILE_URL, {
            attribution: TILE_ATTR,
            maxZoom: 19,
            maxNativeZoom: 19,        // רמת ה-zoom המקסימלית ש-OSM מגיש בפועל
            keepBuffer: 4,            // שומר יותר אריחים מסביב לתצוגה - פחות ריבועים לבנים בגרירה/זום
            updateWhenZooming: false, // לא לבקש אריחים באמצע אנימציית הזום - זום חלק בלי הבזק לבן
            // בלי subdomains/detectRetina בכוונה: OSM = שרת יחיד HTTP/2, פחות בקשות = מהיר יותר ופחות חסימות
        }).addTo(leafletMap);

        mapMarkerLayer = leafletL.layerGroup().addTo(leafletMap);
        // לחיצה על רקע המפה מבטלת את הדגשת הפריט (רמת ההדגשה של לחיצה בודדת)
        leafletMap.on('click', clearActivePin);
        rebuildMarkers();
        // ברירת מחדל: למלא את המסך עם הישוב/השכונה (במקום זום קבוע רחוק)
        fitToMarkers(false);
        // הקטנת האמוג'ים בזום קרוב
        applyPinScale();
        leafletMap.on('zoomend', applyPinScale);

        setTimeout(() => { leafletMap?.invalidateSize?.(); fitToMarkers(false); }, 0);
        setTimeout(() => { leafletMap?.invalidateSize?.(); fitToMarkers(false); }, 250);

        // ---- deep-link ?item=<id>: מרכוז המפה על פריט ספציפי (קישור מהאתר הארצי) ----
        try {
            const focusId = new URLSearchParams(window.location.search).get('item');
            if (focusId && !focusConsumed) {
                focusConsumed = true;
                const target = dbItems.find((d) => String(d.id) === focusId);
                if (target) {
                    // עוברים לאזור של הפריט כדי שהפין ייכלל בשכבת המרקרים והתצוגה תתאים אליו
                    if (target.city) neighborhoodState.city = target.city;
                    neighborhoodState.neighborhood = target.neighborhood || 'מרכז';
                    const coords: [number, number] =
                        (typeof target.lat === 'number' && typeof target.lng === 'number')
                            ? [target.lat, target.lng]
                            : getCoordsFor(target.neighborhood, target.city);
                    focusPending = coords;
                    isMapInteractive = true;
                    rebuildMarkers();
                    leafletMap.setView(coords, 17, { animate: false });
                    // שחרור הנעילה ברגע שהמשתמש גורר את המפה, וגם רשת-ביטחון אחרי 6 שניות
                    leafletMap.once('dragstart', () => { focusPending = null; });
                    setTimeout(() => { focusPending = null; }, 6000);
                }
            }
        } catch { /* window/URL לא זמינים — מתעלמים */ }

        // ניקוי כשה-element מנותק
        return () => {
            try { leafletMap?.remove?.(); } catch {}
            leafletMap = null;
            mapMarkerLayer = null;
            spreadMarkers = [];
        };
    });

    // ריאקטיב: כש-dynamicMarkers משתנה (פריטים חדשים, החלפת קטגוריה) - לבנות מחדש
    $effect(() => {
        // תלות מפורשת
        void dynamicMarkers;
        void helpCallMarkers;
        void selectedCategory;
        rebuildMarkers();
    });

    // ריאקטיב: כשהמשתמש מחליף שכונה - למרכז את המפה מחדש
    $effect(() => {
        void neighborhoodState.neighborhood;
        void neighborhoodState.city;
        recenterMap();
    });

    // כש-fullscreen משתנה - Leaflet צריך לעדכן את גודל המיכל ולהתאים מחדש לישוב
    $effect(() => {
        void isFullscreen;
        if (leafletMap) {
            setTimeout(() => { leafletMap.invalidateSize(); fitToMarkers(); }, 100);
        }
    });

    let categoryButtonsWrapperRef: HTMLElement;

    function handleCategoryClick(categoryId: string) {
        // פנויים/פנויות אינם ננעצים על המפה (צנעת הפרט) — הכפתור פותח ישירות את
        // לוח הרשימה המגודר במקום לסנן את המפה לתצוגה ריקה.
        if (categoryId === 'singles') { goto('/singles'); return; }
        selectedCategory = categoryId;
        // בתצוגת רשימה - פתח אוטומטית את הקטגוריה הנבחרת
        if (categoryId !== "benefits") {
            const next = new Set(expandedCategories);
            next.add(categoryId);
            expandedCategories = next;
        }
        // גלול לאט כך שהכפתורים נשארים נראים (לא לגלול מתחת אליהם או מתחת ל-header הדביק)
        if (!isFullscreen && categoryButtonsWrapperRef) {
            const rect = categoryButtonsWrapperRef.getBoundingClientRect();
            const stickyHeader = document.querySelector('header.sticky') as HTMLElement | null;
            const headerH = stickyHeader?.getBoundingClientRect().height ?? 0;
            const targetY = Math.max(0, window.scrollY + rect.top - headerH - 12);
            smoothScrollTo(targetY, 1100);
        }
    }

    function smoothScrollTo(targetY: number, duration: number) {
        const startY = window.scrollY;
        const diff = targetY - startY;
        if (Math.abs(diff) < 2) return;
        const startTime = performance.now();
        const easeInOutCubic = (t: number) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        function step(now: number) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            window.scrollTo(0, startY + diff * easeInOutCubic(t));
            if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    // citiesAndNeighborhoods imported from $lib/neighborhoodsData

    // key = מפתח תרגום (נפתר בתצוגה עם $t)
    const helpOptions = [
        { id: 3, key: "map.help_lost_child", icon: "👶" },
        { id: 5, key: "map.help_lost_dog", icon: "🐕" },
        { id: 1, key: "map.help_elderly", icon: "👴" },
        { id: 2, key: "map.help_car", icon: "🚗" },
        { id: 4, key: "map.help_other", icon: "✍️" },
    ];

    // Automatic switching was removed as per user request to keep it manual

    function handleMouseEnter() {
        isMouseOver = true;
    }

    function handleMouseLeave() {
        isMouseOver = false;
    }

    function toggleMenu() {
        showNeighborhoodsMenu = !showNeighborhoodsMenu;
        selectedCity = "";
        dispatch("toggleMenu");
    }

    // Public method that can be called from parent
    export function openMenu() {
        showNeighborhoodsMenu = true;
        selectedCity = "";
    }

    function selectCity(city: string) {
        selectedCity = selectedCity === city ? "" : city;
    }

    function selectNeighborhood(city: string, neighborhood: string) {
        neighborhoodState.select(neighborhood, city);
        showNeighborhoodsMenu = false;
        selectedCity = "";
    }

    onMount(() => {
        // אתחל שכונה מ-localStorage (אם הדף הראשי לא אתחל כבר)
        neighborhoodState.init();

        // העדפת המשתמש: אילו קטגוריות יושבות מתחת לכפתור "עוד"
        loadMoreIds();

        // אנימציה של רשימה פעם אחת בלבד! מצוין כמשיכת תשומת לב
        listAnimationTimeout = setTimeout(() => {
            // בצע רק אם המשתמש לא לחץ או שינה לפני כן, והעכבר לא על המפה, והמפה לא במסך מלא
            if (
                !hasShownListAnimation &&
                !userInteracted &&
                !showAddMenu &&
                !isMouseOver &&
                !isFullscreen &&
                viewMode === "map"
            ) {
                hasShownListAnimation = true;
                isAutoSwitching = true; // hint cycle 1 - מציג לחיצה לפני המעבר לרשימה

                // המתן לסיום פעימת הלחיצה, ואז עבור לרשימה
                setTimeout(() => {
                    if (userInteracted) {
                        isAutoSwitching = false;
                        return;
                    }
                    isFlipping = true;
                    setTimeout(() => {
                        viewMode = "list";
                    }, 350);
                    setTimeout(() => {
                        isFlipping = false;
                    }, 700);
                }, 2000);

                // לאחר סיום מחזור 1, אתחל את האנימציה ונגן לחיצה שנייה לפני החזרה
                setTimeout(() => {
                    if (userInteracted || viewMode !== "list") {
                        isAutoSwitching = false;
                        return;
                    }
                    isAutoSwitching = false; // הסר כיתה כדי לאפשר רענון אנימציה
                    setTimeout(() => {
                        if (userInteracted) return;
                        isAutoSwitching = true; // hint cycle 2 - לחיצה לפני החזרה למפה
                        setTimeout(() => {
                            if (userInteracted || viewMode !== "list") {
                                isAutoSwitching = false;
                                return;
                            }
                            isFlipping = true;
                            setTimeout(() => {
                                viewMode = "map";
                            }, 350);
                            setTimeout(() => {
                                isFlipping = false;
                                isAutoSwitching = false;
                            }, 700);
                        }, 2000);
                    }, 80);
                }, 4200);
            }
        }, 8000); // 8 שניות

        // סגירת תפריט כשלוחצים מחוץ לו
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (
                showNeighborhoodsMenu &&
                !target.closest(".neighborhoods-menu-container")
            ) {
                showNeighborhoodsMenu = false;
                selectedCity = "";
            }
            if (showMorePanel && !target.closest(".more-cats-container")) {
                showMorePanel = false;
                editingBar = false;
            }
        };

        document.addEventListener("click", handleClickOutside);

        // Mobile scroll indicators logic - simplified
        const setupScrollIndicators = () => {
            const buttonsContainer = document.querySelector(
                ".category-buttons-container",
            ) as HTMLElement;
            if (!buttonsContainer) return;

            // Scrollable on mobile via touch/swipe (no arrow buttons needed)
        };

        // Setup scroll indicators after DOM is ready
        setupScrollIndicators();

        return () => {
            if (listAnimationTimeout) {
                clearTimeout(listAnimationTimeout);
            }
            document.removeEventListener("click", handleClickOutside);
        };
    });

    function handleViewToggle(isAutoParam = false) {
        if (showAddMenu) showAddMenu = false;

        const isAuto = isAutoParam === true; // וודא שזה בוליאני ולא אובייקט אירוע

        isFlipping = true;
        setTimeout(() => {
            const newViewMode = viewMode === "map" ? "list" : "map";
            viewMode = newViewMode;
            // אם חוזרים למפה, אפס את userInteracted כדי שהספירה תתחיל מחדש
            if (newViewMode === "map") {
                userInteracted = false;
            } else {
                // אם הולכים לרשימה, סמן שהיה אינטראקציה רק אם זה לא אוטומטי
                userInteracted = !isAuto;
            }
        }, 350); // Change content at middle of animation
        setTimeout(() => {
            isFlipping = false;
        }, 700);
    }

    function handleAddAdvantage() {
        showAddMenu = !showAddMenu;
    }

    function toggleCategory(categoryId: string) {
        const next = new Set(expandedCategories);
        if (next.has(categoryId)) {
            next.delete(categoryId);
        } else {
            next.add(categoryId);
        }
        expandedCategories = next;
    }

    function handleAddItem(categoryId: string) {
        showAddMenu = false;
        // בעלי מקצוע אינם נרשמים אצלנו: ההופעה באינדקס מותנית בחתימה על אמנת
        // המוסר ובהתחייבות להנחה בלעדית — ולכן ההרשמה נעשית באתר האינדקס עצמו,
        // ומשם הם מסונכרנים אלינו אוטומטית. אין /add/business-owners.
        if (categoryId === 'business-owners') {
            window.open('https://index.gofreeil.com/', '_blank', 'noopener');
            return;
        }
        goto(`/add/${categoryId}`);
    }

    function handleHelpRequest(optionId: number) {
        if (showAddMenu) showAddMenu = false;
        showHelpMenu = false;

        // פתח מודל על דף הבית במקום לנווט לדף אחר
        modalOptionId = optionId;
        modalSubmitted = false;
        modalError = '';
        modalImageBase64 = '';
        modalImagePreview = '';
        showRaiseHandModal = true;
        return;

        // הקוד שלמטה נשמר כ-fallback אם הניווט נכשל
        const option = helpOptions.find((o) => o.id === optionId);
        const wasNotInMapView = viewMode !== "map";

        // עבור לתצוגת מפה כדי לראות את הגלים
        if (wasNotInMapView) {
            isFlipping = true;
            setTimeout(() => {
                viewMode = "map";
                userInteracted = false;
            }, 350);
            setTimeout(() => {
                isFlipping = false;
            }, 700);
        }

        // הפעל אנימציית גלים אחרי מעבר למפה
        setTimeout(
            () => {
                showWaves = true;
                handRaised = true; // סמן שהיד מורמת
                raisedHandMessage = option ? $t(option.key) : "";
                raisedHandIcon = option?.icon || "🆘";

                // כבה את הגלים אחרי 2 שניות
                setTimeout(() => {
                    showWaves = false;
                }, 2000);
            },
            wasNotInMapView ? 750 : 0,
        );

        if (optionId === 4) {
            // אפשרות "אחר" - פתח טופס
            setTimeout(
                () => {
                    const customHelp = prompt($t('map.describe_help'));
                    if (customHelp) {
                        raisedHandMessage = customHelp;
                        successMessageText = $t('map.help_sent_msg', { values: { what: customHelp } });
                        showSuccessMessage = true;
                        setTimeout(() => {
                            showSuccessMessage = false;
                        }, 3000);
                    } else {
                        // אם ביטל - הורד את היד
                        handRaised = false;
                        raisedHandMessage = "";
                        raisedHandIcon = "";
                    }
                },
                wasNotInMapView ? 850 : 100,
            );
        } else {
            setTimeout(
                () => {
                    successMessageText = $t('map.help_sent_msg', { values: { what: option ? $t(option.key) : '' } });
                    showSuccessMessage = true;
                    setTimeout(() => {
                        showSuccessMessage = false;
                    }, 3000);
                },
                wasNotInMapView ? 750 : 0,
            );
        }
    }

    function handleLowerHand() {
        showSurvey = true;
    }

    function handleSurveyResponse(response: "community" | "other" | "cancel") {
        if (response === "community") {
            communityHelpCount.update(n => n + 1);
            successMessageText = $t('map.thanks_community');
            showSuccessMessage = true;
            setTimeout(() => {
                showSuccessMessage = false;
            }, 3000);
        } else if (response === "other") {
            successMessageText = $t('map.thanks_feedback');
            showSuccessMessage = true;
            setTimeout(() => {
                showSuccessMessage = false;
            }, 3000);
        }

        if (response !== "cancel") {
            handRaised = false;
            raisedHandMessage = "";
            raisedHandIcon = "";
        }
        showSurvey = false;
    }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- אייקון קטגוריה (אמוג'י או קובץ) - משותף לסרגל, לתפריט "עוד" ולמצב העריכה -->
{#snippet catIcon(category: { id: string; icon: string }, sizeClass: string, imgClass: string)}
    {#if category.icon?.startsWith('/')}
        <img src={category.icon} class={imgClass} alt={$t(catKey(category.id))} />
    {:else}
        <span
            class="{sizeClass} leading-none"
            style={category.id === "realestate"
                ? "letter-spacing: -0.25em; margin-left: 0.15em; display: inline-block;"
                : ""}>{category.icon}</span
        >
    {/if}
{/snippet}

<!-- תוכן תפריט "עוד": קטגוריות נוספות + מצב עריכה להחלפת כפתורים מול הסרגל הגלוי -->
{#snippet morePanel(mobile: boolean)}
    <div class="flex items-center justify-between gap-2 mb-2">
        <h4 class="text-white font-bold text-sm">{$t('map.more_categories_title')}</h4>
        <button
            type="button"
            onclick={() => (editingBar = !editingBar)}
            class="text-[11px] font-bold px-2.5 py-1 rounded-full border transition-colors shrink-0 {editingBar
                ? 'bg-yellow-400 text-gray-900 border-yellow-500'
                : 'bg-white/10 text-yellow-300 border-yellow-400/40 hover:bg-white/20'}"
        >
            {editingBar ? $t('map.done_editing') : '✎ ' + $t('map.customize_bar')}
        </button>
    </div>

    {#if !editingBar}
        {#if moreCats.length === 0}
            <p class="text-slate-400 text-xs text-center py-3">{$t('map.more_empty')}</p>
        {:else}
            <div class="grid grid-cols-2 gap-2">
                {#each moreCats as category (category.id)}
                    <button
                        type="button"
                        onclick={() => {
                            if (mobile) {
                                handleMobileCategoryTap(category.id);
                            } else {
                                showMorePanel = false;
                                handleCategoryClick(category.id);
                            }
                        }}
                        class="flex flex-col items-center justify-center gap-1 {selectedCategory === category.id
                            ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-500 ring-2 ring-purple-300'
                            : 'bg-gradient-to-br from-white to-gray-200 hover:from-blue-100 hover:to-white text-gray-900 border-purple-300'} px-2 py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all border map-category-button min-h-[68px]"
                    >
                        {@render catIcon(category, 'text-2xl', 'w-7 h-7')}
                        <span class="leading-tight text-center">{$t(catKey(category.id))}</span>
                    </button>
                {/each}
            </div>
        {/if}
        <p class="text-[11px] text-slate-400 mt-2.5 text-center leading-snug">{$t('map.customize_hint')}</p>
    {:else}
        <div class="flex flex-col gap-3">
            <div>
                <p class="text-[11px] font-bold text-emerald-300 mb-1.5">
                    ⬆ {$t('map.shown_on_bar')}
                </p>
                <div class="flex flex-wrap gap-1.5">
                    {#each barCats as category (category.id)}
                        <button
                            type="button"
                            onclick={() => moveToMore(category.id)}
                            title={$t('map.move_to_more')}
                            aria-label="{$t(catKey(category.id))} — {$t('map.move_to_more')}"
                            class="inline-flex items-center gap-1 bg-white/10 hover:bg-red-500/25 border border-white/20 text-white text-[11px] font-bold px-2 py-1 rounded-full transition-colors"
                        >
                            {@render catIcon(category, 'text-sm', 'w-4 h-4')}
                            <span>{$t(catKey(category.id))}</span>
                            <span class="text-red-300 leading-none">↓</span>
                        </button>
                    {/each}
                </div>
            </div>
            <div>
                <p class="text-[11px] font-bold text-yellow-300 mb-1.5">
                    ⬇ {$t('map.in_more_menu')}
                </p>
                <div class="flex flex-wrap gap-1.5">
                    {#each moreCats as category (category.id)}
                        <button
                            type="button"
                            onclick={() => moveToBar(category.id)}
                            title={$t('map.move_to_bar')}
                            aria-label="{$t(catKey(category.id))} — {$t('map.move_to_bar')}"
                            class="inline-flex items-center gap-1 bg-yellow-400/15 hover:bg-emerald-500/30 border border-yellow-400/40 text-white text-[11px] font-bold px-2 py-1 rounded-full transition-colors"
                        >
                            {@render catIcon(category, 'text-sm', 'w-4 h-4')}
                            <span>{$t(catKey(category.id))}</span>
                            <span class="text-emerald-300 leading-none">↑</span>
                        </button>
                    {:else}
                        <span class="text-slate-400 text-[11px]">{$t('map.more_empty')}</span>
                    {/each}
                </div>
            </div>
            <button
                type="button"
                onclick={resetBar}
                class="self-center text-[11px] text-slate-300 hover:text-white underline underline-offset-2"
            >
                {$t('map.reset_bar')}
            </button>
        </div>
    {/if}
{/snippet}

{#if isFullscreen}
    <!-- שכבה כהה מאחורי המסך המלא -->
    <button
        type="button"
        aria-label={$t('map.close_fullscreen')}
        onclick={closeFullscreen}
        class="fixed inset-0 z-[1190] bg-black/80 backdrop-blur-sm cursor-default"
    ></button>
{/if}

<div
    class={isFullscreen
        ? 'jmap-fullscreen fixed inset-2 md:inset-4 z-[1200] flex flex-col gap-2 bg-[#070b14] rounded-2xl shadow-2xl shadow-purple-500/30 overflow-hidden p-3'
        : 'flex flex-col gap-4'}
>
    <div class="flex flex-col gap-4">
        <!-- כותרת שכונה - הוסרה לדף הראשי -->

        <div class="flex flex-col gap-2">
            <!-- Buttons Container -->
            <div class="relative category-buttons-wrapper" bind:this={categoryButtonsWrapperRef}>
                <!-- Mobile: שורה אחת קומפקטית - סינון קטגוריות (ימין, צהוב) + שדה חיפוש חופשי (שמאל, רחב) -->
                <div class="md:hidden px-3 py-2 w-full flex items-center gap-2">
                    <!-- כפתור פתיחת חלונית סינון - צהוב וצר (כמו שבב "כל היתרונות" שהוסר) -->
                    <button
                        type="button"
                        onclick={() => (showCategorySheet = true)}
                        class="flex items-center justify-center shrink-0 bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 border border-yellow-500 px-2.5 py-2 rounded-full text-xs font-bold shadow-lg active:scale-95 whitespace-nowrap"
                        aria-label={$t('map.open_category_filter')}
                    >
                        {$t('map.choose_category')}
                    </button>
                    <!-- שדה חיפוש חופשי - רחב; נשען על אותה לוגיקת searchQuery/searchResults של תצוגת החיפוש -->
                    <div class="flex items-center gap-1.5 flex-1 min-w-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full px-3 py-2 shadow-lg border border-purple-400">
                        <svg class="w-4 h-4 shrink-0 text-white/90" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                            <circle cx="11" cy="11" r="7"/>
                            <path d="m21 21-4.35-4.35"/>
                        </svg>
                        <input
                            bind:value={searchQuery}
                            onfocus={() => (viewMode = 'search')}
                            oninput={() => (viewMode = 'search')}
                            type="text"
                            placeholder={$t('map.search_placeholder')}
                            class="flex-1 min-w-0 bg-transparent text-white placeholder:text-white/60 text-xs font-bold focus:outline-none"
                            dir="rtl"
                            aria-label={$t('map.search')}
                        />
                        {#if viewMode === 'search'}
                            <button
                                type="button"
                                onclick={() => { searchQuery = ''; viewMode = 'map'; }}
                                class="shrink-0 text-white/70 hover:text-white text-sm leading-none px-1"
                                aria-label={$t('map.close')}
                            >✕</button>
                        {/if}
                    </div>
                </div>

                <!-- Bottom Sheet: כל הקטגוריות -->
                {#if showCategorySheet}
                    <!-- Backdrop -->
                    <div
                        class="md:hidden fixed inset-0 bg-black/60 z-[10000] backdrop-blur-sm"
                        role="presentation"
                        onclick={() => { cancelMobileTooltip(); showCategorySheet = false; }}
                    ></div>
                    <!-- Sheet -->
                    <div
                        class="md:hidden fixed top-1/2 left-3 right-3 z-[10001] bg-[#0f172a] border-2 border-purple-500 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col"
                        style="animation: sheetFadeIn 0.25s ease-out; transform: translateY(calc(-50% + {sheetDragY}px)); transition: {sheetDragging ? 'none' : 'transform 0.2s ease-out'};"
                        role="dialog"
                        aria-label={$t('map.category_filter')}
                    >
                        <!-- Drag handle + header -->
                        <div
                            class="pt-2 pb-1 flex flex-col items-center shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
                            onpointerdown={onSheetDragStart}
                            onpointermove={onSheetDragMove}
                            onpointerup={onSheetDragEnd}
                            onpointercancel={onSheetDragEnd}
                            role="button"
                            tabindex="0"
                            aria-label={$t('map.drag_to_close')}
                        >
                            <div class="w-16 h-1.5 rounded-full bg-white/40 mb-2"></div>
                            <div class="w-full px-4 flex items-center justify-center">
                                <h3 class="text-white font-bold text-lg">{$t('map.sheet_title')}</h3>
                            </div>
                        </div>
                        <!-- Grid of all categories -->
                        <div class="px-3 pb-4 pt-2 overflow-y-auto">
                            <!-- שורה 1: 'כל היתרונות' לבד וממורכז -->
                            <div class="flex justify-center mb-2">
                                <button
                                    onclick={() => handleMobileCategoryTap(benefitsCat.id)}
                                    class="flex flex-col items-center justify-center gap-1 {selectedCategory === benefitsCat.id
                                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 border-yellow-500 ring-2 ring-yellow-300'
                                        : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 border-yellow-500'} px-6 py-3 rounded-xl text-sm font-bold shadow-md active:scale-95 border map-category-button min-h-[72px] w-[42%]"
                                >
                                    <span class="text-3xl leading-none">{benefitsCat.icon}</span>
                                    <span class="leading-tight text-center">{$t(catKey(benefitsCat.id))}</span>
                                </button>
                            </div>
                            <!-- שורה 2+: הקטגוריות בגריד 4 בשורה; האריח האחרון = "עוד" -->
                            <div class="grid grid-cols-4 gap-1.5">
                                {#each barCats as category (category.id)}
                                    <button
                                        onclick={() => handleMobileCategoryTap(category.id)}
                                        class="flex flex-col items-center justify-center gap-1 {selectedCategory === category.id
                                            ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-500 ring-2 ring-purple-300'
                                            : 'bg-gradient-to-br from-white to-gray-200 text-gray-900 border-purple-300'} px-1 py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 border map-category-button min-h-[70px]"
                                    >
                                        {@render catIcon(category, 'text-2xl', 'w-7 h-7')}
                                        <span class="leading-tight text-center">{$t(catKey(category.id))}</span>
                                    </button>
                                {/each}
                                <!-- אריח "עוד" - פותח את הקטגוריות הנוספות ואת ההתאמה האישית -->
                                <button
                                    type="button"
                                    onclick={() => (showMorePanel = !showMorePanel)}
                                    aria-expanded={showMorePanel}
                                    class="flex flex-col items-center justify-center gap-1 {showMorePanel
                                        ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-500 ring-2 ring-purple-300'
                                        : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 border-yellow-500'} px-1 py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 border map-category-button min-h-[70px]"
                                >
                                    <span class="text-2xl leading-none">{showMorePanel ? '✕' : '➕'}</span>
                                    <span class="leading-tight text-center">{$t('map.more_categories')}</span>
                                </button>
                            </div>

                            <!-- פאנל "עוד" נפתח בתוך החלונית, מתחת לגריד -->
                            {#if showMorePanel}
                                <div
                                    class="mt-2 rounded-xl border-2 border-yellow-400/50 bg-black/30 p-2.5"
                                    style="animation: sheetFadeIn 0.2s ease-out;"
                                >
                                    {@render morePanel(true)}
                                </div>
                            {/if}
                        </div>

                        <!-- שכבת המתנה: תיאור הקטגוריה למשך זמן הטעינה -->
                        {#if mobileTooltipFor}
                            {@const tooltipCat = categories.find(c => c.id === mobileTooltipFor)}
                            {#if tooltipCat}
                                <div
                                    class="md:hidden absolute inset-0 z-10 flex items-center justify-center px-5 rounded-2xl"
                                    style="background: linear-gradient(160deg, rgba(15,23,42,0.96), rgba(30,27,75,0.96)); animation: mobileTooltipFadeIn 0.18s ease-out;"
                                    role="status"
                                    aria-live="polite"
                                >
                                    <div class="flex flex-col items-center gap-4 text-center max-w-[90%]">
                                        {#if tooltipCat.icon?.startsWith('/')}
                                            <img src={tooltipCat.icon} class="w-20 h-20" alt={$t(catKey(tooltipCat.id))} />
                                        {:else}
                                            <span class="text-7xl leading-none">{tooltipCat.icon}</span>
                                        {/if}
                                        <h4 class="text-yellow-300 text-3xl font-extrabold leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                                            {$t(catKey(tooltipCat.id))}
                                        </h4>
                                        <p class="text-slate-100 text-lg leading-relaxed font-medium">
                                            {categoryTooltips[mobileTooltipFor] ? $t(categoryTooltips[mobileTooltipFor]) : ''}
                                        </p>
                                        <!-- פס התקדמות שמסמן שתכף הסינון נכנס לתוקף -->
                                        <div class="w-48 h-1.5 mt-2 rounded-full bg-white/15 overflow-hidden">
                                            <div
                                                class="h-full bg-gradient-to-l from-yellow-300 to-orange-400"
                                                style="animation: mobileTooltipProgress {MOBILE_TOOLTIP_MS}ms linear forwards;"
                                            ></div>
                                        </div>
                                        <span class="text-sm text-slate-400 mt-1">{$t('map.loading_data')}</span>
                                    </div>
                                </div>
                            {/if}
                        {/if}
                    </div>
                {/if}

                <!-- Desktop: שורה אחת flex-wrap (ללא שינוי) -->
                <div
                    class="hidden md:flex category-buttons-container flex-wrap justify-between gap-x-2 gap-y-3 p-2 w-full"
                >
                    {#each [benefitsCat, ...barCats] as category (category.id)}
                        <button
                            onclick={() => handleCategoryClick(category.id)}
                            class="relative flex items-center justify-center flex-1 {category.id === 'rides' ? 'gap-1 px-2 min-w-[19%]' : category.id === 'education' ? 'gap-1.5 px-3 min-w-[11%]' : 'gap-1.5 px-3 min-w-[15%]'} {selectedCategory === category.id
                                ? category.id === 'benefits'
                                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500 ring-2 ring-yellow-300'
                                    : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-purple-500 ring-2 ring-purple-300'
                                : category.id === 'benefits'
                                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500'
                                  : 'bg-gradient-to-br from-white to-gray-200 hover:from-blue-100 hover:to-white text-gray-900 border-purple-300'} py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all hover:scale-105 border shrink-0 whitespace-nowrap map-category-button category-with-tooltip"
                        >
                            {#if category.icon?.startsWith('/')}
                                <img src={category.icon} class="w-5 h-5 inline-block" alt={$t(catKey(category.id))} />
                            {:else}
                                <span
                                    class="text-base icon"
                                    style={category.id === "realestate"
                                        ? "letter-spacing: -0.25em; margin-left: 0.15em; display: inline-block;"
                                        : ""}>{category.icon}</span
                                >
                            {/if}
                            {$t(catKey(category.id))}
                            {#if categoryTooltips[category.id]}
                                <span class="category-tooltip" role="tooltip">
                                    <span class="category-tooltip-title">{$t(catKey(category.id))}</span>
                                    <span class="category-tooltip-desc">{$t(categoryTooltips[category.id])}</span>
                                </span>
                            {/if}
                        </button>
                    {/each}

                    <!-- הכפתור האחרון: "עוד" - תפריט קטגוריות נוספות + התאמה אישית של הסרגל -->
                    <div class="relative flex-1 min-w-[15%] flex more-cats-container">
                        <button
                            type="button"
                            onclick={() => (showMorePanel = !showMorePanel)}
                            aria-expanded={showMorePanel}
                            class="w-full relative flex items-center justify-center gap-1.5 px-3 {showMorePanel
                                ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-500 ring-2 ring-purple-300'
                                : 'bg-gradient-to-br from-white to-gray-200 hover:from-blue-100 hover:to-white text-gray-900 border-purple-300'} py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all hover:scale-105 border whitespace-nowrap map-category-button"
                        >
                            <span class="text-base icon">{showMorePanel ? '✕' : '➕'}</span>
                            {$t('map.more_categories')}
                        </button>
                        {#if showMorePanel}
                            <div
                                class="absolute top-full mt-2 left-0 z-[900] w-[340px] max-w-[90vw] bg-[#0f172a] border-2 border-purple-500 rounded-xl shadow-2xl p-3 text-right"
                                style="animation: sheetFadeIn 0.18s ease-out;"
                                dir="rtl"
                            >
                                {@render morePanel(false)}
                            </div>
                        {/if}
                    </div>
                </div>
            </div><!-- /relative wrapper -->
        </div>
    </div>

    <!-- Map Container -->
    <div
        role="region"
        aria-label="Map and List View Container"
        class={isFullscreen
            ? 'relative w-full border-4 border-purple-600 shadow-2xl bg-[#0f172a] flex flex-col jmap-mc-fullscreen'
            : 'relative w-full border-8 md:border-4 border-purple-600 shadow-2xl bg-[#0f172a] mb-8 transition-all duration-700'}
        style={isFullscreen
            ? 'border-radius: 24px; transform-style: preserve-3d; height: calc(100vh - 220px); min-height: 50vh;'
            : 'border-radius: 24px; transform-style: preserve-3d;'}
        class:flipping-container={isFlipping}
        onmouseenter={handleMouseEnter}
        onmouseleave={handleMouseLeave}
    >
        <!-- כפתור סגירת מסך-מלא: ראש המפה, ממורכז, חצי-שקוף (הדרך המקובלת לסגור מסך) -->
        {#if isFullscreen}
            <button
                type="button"
                onclick={closeFullscreen}
                aria-label={$t('map.close_fullscreen')}
                title={$t('map.close_esc')}
                class="absolute top-14 left-1/2 z-[500] flex items-center gap-1.5 px-4 py-2 rounded-full bg-black/45 hover:bg-black/65 text-white text-sm font-bold backdrop-blur-md border border-white/40 shadow-xl transition-all hover:scale-105"
                style="transform: translateX(-50%);"
            >
                <span class="text-lg leading-none">✕</span>
                <span>{$t('map.close')}</span>
            </button>
        {/if}

        <!-- כפתור מעבר תצוגה - משולש מקופל בפינה -->
        <button
            onclick={() => {
                if (isFullscreen) return;
                handleViewToggle(false);
            }}
            class="page-corner absolute top-0 left-0 z-30 transition-all duration-500 hover:scale-110"
            class:flipping={isFlipping}
            class:auto-switching={isAutoSwitching}
            class:menu-open={showHelpMenu || showSurvey}
            style="position: absolute; top: 0; left: 0;"
            aria-label={viewMode === "map" ? $t('map.to_list_view') : $t('map.to_map_view')}
        >
            <svg
                width="130"
                height="130"
                viewBox="0 0 130 130"
                class="transition-transform duration-500"
                aria-hidden="true"
                focusable="false"
            >
                <path
                    d="M 0,24 Q 0,0 24,0 L 130,0 L 0,130 Z"
                    fill="#9333ea"
                    class="transition-all duration-500"
                />
                <text
                    x="52"
                    y="42"
                    fill="white"
                    font-size="14"
                    font-weight="bold"
                    transform="rotate(-45 52 42)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {$t('map.corner_line1')}
                </text>
                <text
                    x="60"
                    y="58"
                    fill="white"
                    font-size="14"
                    font-weight="bold"
                    transform="rotate(-45 60 58)"
                    text-anchor="middle"
                    class="pointer-events-none"
                >
                    {viewMode === "map" ? $t('map.corner_list') : $t('map.corner_map')}
                </text>
            </svg>
            <span class="hint hint-cursor" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="32" height="32">
                    <path
                        d="M4 2 L4 20 L9 16 L12 23 L15.5 21.5 L12.5 14.5 L19 14.5 Z"
                        fill="white"
                    />
                </svg>
            </span>
            <span class="hint hint-fingerprint" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="36" height="36">
                    <path
                        d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.68-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.99.47 6.03 1.52.25.13.34.43.21.67-.09.18-.26.28-.44.28zM3.5 9.72c-.1 0-.2-.03-.29-.09-.23-.16-.28-.47-.12-.7.99-1.4 2.25-2.5 3.75-3.27C9.98 4.04 14 4.03 17.15 5.65c1.5.77 2.76 1.86 3.75 3.25.16.22.11.54-.12.7-.23.16-.54.11-.7-.12-.9-1.26-2.04-2.25-3.39-2.94-2.87-1.47-6.54-1.47-9.4.01-1.36.7-2.5 1.7-3.4 2.96-.08.14-.23.21-.39.21zm6.25 12.07c-.13 0-.26-.05-.35-.15-.87-.87-1.34-1.43-2.01-2.64-.69-1.23-1.05-2.73-1.05-4.34 0-2.97 2.54-5.39 5.66-5.39s5.66 2.42 5.66 5.39c0 .28-.22.5-.5.5s-.5-.22-.5-.5c0-2.42-2.09-4.39-4.66-4.39-2.57 0-4.66 1.97-4.66 4.39 0 1.44.32 2.77.93 3.85.64 1.15 1.08 1.64 1.85 2.42.19.2.19.51 0 .71-.11.1-.24.15-.37.15zm7.17-1.85c-1.19 0-2.24-.3-3.1-.89-1.49-1.01-2.38-2.65-2.38-4.39 0-.28.22-.5.5-.5s.5.22.5.5c0 1.41.72 2.74 1.94 3.56.71.48 1.54.72 2.54.72.24 0 .64-.03 1.04-.1.27-.05.53.13.58.41.05.27-.13.53-.41.58-.57.11-1.07.11-1.21.11zM14.91 22c-.04 0-.09-.01-.13-.02-1.59-.44-2.63-1.03-3.72-2.1-1.4-1.39-2.17-3.24-2.17-5.22 0-1.62 1.38-2.94 3.08-2.94 1.7 0 3.08 1.32 3.08 2.94 0 1.07.93 1.94 2.08 1.94s2.08-.87 2.08-1.94c0-3.77-3.25-6.83-7.25-6.83-2.84 0-5.44 1.58-6.61 4.03-.39.81-.59 1.76-.59 2.8 0 .78.07 2.01.67 3.61.1.26-.03.55-.29.64-.26.1-.55-.04-.64-.29-.49-1.31-.73-2.61-.73-3.96 0-1.2.23-2.29.68-3.24 1.33-2.79 4.28-4.6 7.51-4.6 4.55 0 8.25 3.51 8.25 7.83 0 1.62-1.38 2.94-3.08 2.94s-3.08-1.32-3.08-2.94c0-1.07-.93-1.94-2.08-1.94s-2.08.87-2.08 1.94c0 1.71.66 3.31 1.87 4.51.95.94 1.86 1.46 3.27 1.85.27.07.42.35.35.61-.05.23-.26.38-.47.38z"
                        fill="white"
                    />
                </svg>
            </span>
        </button>

        {#if viewMode === "map"}
            <!-- תצוגת מפה -->
            <div
                class={isFullscreen
                    ? 'w-full h-full overflow-hidden relative'
                    : 'w-full h-[350px] md:h-[450px] overflow-hidden relative'}
                style="border-radius: 20px; touch-action: manipulation;"
                ondblclick={handleMapDblClick}
                ontouchend={handleMapTouchEnd}
                role="button"
                tabindex="-1"
                aria-label={$t('map.dblclick_fullscreen')}
            >
                <!-- אנימציית גלים -->
                {#if showWaves}
                    <div
                        class="absolute inset-0 flex items-end justify-center pointer-events-none z-10"
                    >
                        <div class="wave-container">
                            <div class="wave wave-1"></div>
                            <div class="wave wave-2"></div>
                            <div class="wave wave-3"></div>
                            <div class="wave wave-4"></div>
                        </div>
                    </div>
                {/if}

                <!-- בועת בקשת עזרה -->
                {#if handRaised && raisedHandMessage}
                    <div
                        class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20"
                    >
                        <div
                            class="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-yellow-400 max-w-md"
                        >
                            <div class="flex items-center gap-4">
                                <span class="text-5xl">{raisedHandIcon}</span>
                                <div>
                                    <p class="font-black text-xl mb-1">
                                        {$t('map.active_help_call')}
                                    </p>
                                    <p class="text-lg font-bold">
                                        {raisedHandMessage}
                                    </p>
                                    <p class="text-sm text-yellow-200 mt-2">
                                        {$t('map.waiting_help')}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- מפת Leaflet - מרקרים אמיתיים שזזים יחד עם המפה -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <!-- mouseleave בלבד (משחרר את גלגלת הזום כשהעכבר יוצא מהמפה) -
                     אין כאן פעולה שמשתמש מקלדת יכול או צריך להפעיל -->
                <div
                    bind:this={mapEl}
                    onmouseleave={deactivateMap}
                    class="w-full h-full relative z-0"
                    aria-label={$t('map.neighborhood_map_aria')}
                ></div>

                <!-- "הגנת זכוכית" - שכבת overlay מעל המפה כשהיא לא אינטראקטיבית -->
                {#if !isMapInteractive}
                    <button
                        type="button"
                        onclick={activateMap}
                        class="absolute inset-0 z-10 w-full h-full bg-transparent cursor-pointer flex items-center justify-center group"
                        aria-label={$t('map.click_activate_map')}
                    >
                        <div class="bg-black/50 backdrop-blur-sm text-white px-6 py-3 rounded-xl border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <span class="text-sm font-bold">🖱️ {$t('map.click_activate_map')}</span>
                        </div>
                    </button>
                {/if}

                <!-- כפתור מסך-מלא - פינה ימנית-עליונה, נפרד מהזום כדי לפנות את הפינה הימנית-תחתונה -->
                <!-- (שם יושב תג "פריטים בשכונה") ולא להסתיר את פינת "המעבר לרשימה" השמאלית-עליונה -->
                <button
                    type="button"
                    onclick={(e) => { e.stopPropagation(); openFullscreen(); }}
                    class="absolute top-12 right-3 z-30 w-10 h-10 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-xl leading-none flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg {isFullscreen ? 'hidden' : ''}"
                    aria-label={$t('map.open_fullscreen')}
                    title={$t('map.open_fullscreen_title')}
                >⛶</button>

                <!-- כפתורי זום - עובדים גם מעל שכבת ההפעלה (במיוחד בנייד שאין גלגלת) -->
                <!-- מוסתרים במסך-מלא: שם זום ייעודי בפינה הימנית התחתונה -->
                <div class="absolute bottom-9 right-3 z-30 flex-col gap-1.5 {isFullscreen ? 'hidden' : 'flex'}">
                    <button
                        type="button"
                        onclick={(e) => { e.stopPropagation(); activateMap(); zoomIn(); }}
                        class="w-10 h-10 rounded-lg bg-black/60 hover:bg-black/80 text-white text-2xl leading-none font-bold flex items-center justify-center backdrop-blur-sm border border-white/25 shadow-lg"
                        aria-label={$t('map.zoom_in_map')}
                    >+</button>
                    <button
                        type="button"
                        onclick={(e) => { e.stopPropagation(); activateMap(); zoomOut(); }}
                        class="w-10 h-10 rounded-lg bg-black/60 hover:bg-black/80 text-white text-2xl leading-none font-bold flex items-center justify-center backdrop-blur-sm border border-white/25 shadow-lg"
                        aria-label={$t('map.zoom_out_map')}
                    >−</button>
                    <button
                        type="button"
                        onclick={(e) => { e.stopPropagation(); fitToMarkers(); }}
                        class="w-10 h-10 rounded-lg bg-black/60 hover:bg-black/80 text-white text-lg leading-none flex items-center justify-center backdrop-blur-sm border border-white/25 shadow-lg"
                        aria-label={$t('map.fit_to_town')}
                        title={$t('map.fit_to_town_title')}
                    >⊙</button>
                </div>

                <!-- Badge לפריטים חדשים בשכונה + קישור ללוח הארצי -->
                {#if selectedCategory === 'giveaway'}
                    <!-- כשנבחרת "למסירה" - אותו כפתור מוביל ללוח הארצי -->
                    <button
                        type="button"
                        onclick={(e) => { e.stopPropagation(); goto('/giveaways'); }}
                        class="absolute bottom-4 left-4 z-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 hover:from-amber-300 hover:via-orange-400 hover:to-red-400 text-white font-black px-6 py-3 rounded-2xl shadow-lg border border-orange-300/60 transition-all hover:scale-105 hover:opacity-100 flex flex-col items-center gap-1.5 text-center leading-tight opacity-25"
                        title={$t('map.national_board_giveaway_title')}
                    >
                        <span class="text-lg">{$t('map.to_national_board')}</span>
                        <img src="/images/delivery.webp" alt="" class="w-7 h-7 object-contain" />
                    </button>
                {:else if nationalBoardUrl}
                    <div class="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
                        {#if nationalBoardUrl}
                            <a
                                href={nationalBoardUrl}
                                target={nationalBoardUrl.startsWith('http') ? '_blank' : '_self'}
                                rel={nationalBoardUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                                onclick={(e) => e.stopPropagation()}
                                class="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 hover:from-amber-300 hover:via-orange-400 hover:to-red-400 text-white text-base font-black px-4 py-2 rounded-xl shadow-lg border border-orange-300/60 transition-all hover:scale-105 flex items-center text-center leading-tight"
                                title={$t('map.national_board_title')}
                            >
                                <span>{$t('map.to_national_board')}</span>
                            </a>
                        {/if}
                    </div>
                {/if}

                <!-- מספר הפריטים בשכונה - תג צר בן 2 שורות, צמוד לשוליים הימניים ונמוך יותר -->
                <!-- כדי לא להסתיר את מרכז המפה ולא להתנגש בכפתורי הזום שבפינה הימנית-תחתונה -->
                {#if showCountBadge && neighborhoodDbItems.length > 0}
                    <div
                        class="neighborhood-count-fade absolute top-28 right-2 z-20 flex flex-col items-center text-center leading-none bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 text-white font-black px-3.5 py-2 rounded-xl shadow-lg border border-orange-300/60"
                        onanimationend={() => (showCountBadge = false)}
                    >
                        <span class="text-2xl leading-none">{neighborhoodDbItems.length}</span>
                        <span class="text-xs font-bold mt-0.5 whitespace-nowrap">
                            {selectedCategory === 'giveaway'
                                ? $t('map.giveaways_in_hood_label')
                                : $t('map.items_in_hood_label')}
                        </span>
                    </div>
                {/if}
            </div>
        {:else if viewMode === "list"}
            <!-- תצוגת רשימה -->
            <!-- כפתור מסך-מלא לרשימה - פינה ימנית-תחתונה (מוסתר במסך-מלא; שם יש כפתור סגירה מרכזי) -->
            <button
                type="button"
                onclick={openFullscreen}
                class="absolute bottom-3 right-3 z-40 w-10 h-10 rounded-lg bg-purple-600/80 hover:bg-purple-500 text-white text-xl leading-none flex items-center justify-center backdrop-blur-sm border border-white/30 shadow-lg {isFullscreen ? 'hidden' : ''}"
                aria-label={$t('map.open_fullscreen')}
                title={$t('map.open_fullscreen')}
            >⛶</button>
            <div
                class={isFullscreen
                    ? 'jmap-list-fullscreen w-full flex-1 min-h-0 overflow-y-auto px-3 md:px-6 pb-4 md:pb-6 pt-24 md:pt-24 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20'
                    : 'w-full h-[350px] md:h-[450px] overflow-y-auto p-3 md:p-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20'}
                style="border-radius: 20px;"
            >
                <div class="space-y-2 md:space-y-3">
                    {#each categories.filter((cat) => cat.id !== "benefits" && cat.id !== "singles" && (selectedCategory === "benefits" || cat.id === selectedCategory)) as category}
                        <!-- עסקי האינדקס ארציים — מוצגים בכל עיר, לא רק בשכונה הנבחרת -->
                        {@const categoryDbItems = dbItems.filter(d =>
                            d.category === category.id && (isIndexItem(d) || belongsToMyArea(d))
                        )}
                        {@const totalItems = (category.items?.length || 0) + categoryDbItems.length}
                        {@const hasNationalPage = ['singles','security','attractions','jobs'].includes(category.id)}
                        {@const giveawayNational = category.id === 'giveaway'}
                        {@const babysitterNational = category.id === 'business'}
                        {@const shabbatNational = category.id === 'realestate'}
                        {@const chugimNational = category.id === 'education'}
                        <div
                            class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg md:rounded-xl overflow-hidden transition-all"
                        >
                            <button
                                onclick={() => toggleCategory(category.id)}
                                class="w-full p-2 md:p-4 hover:border-purple-500 transition-all hover:bg-purple-900/20 cursor-pointer"
                            >
                                <div class="flex items-center justify-between">
                                    <div
                                        class="flex items-center gap-2 md:gap-3"
                                    >
                                        {#if category.id === 'giveaway'}
                                            <img
                                                src="/images/delivery.webp"
                                                alt=""
                                                class="w-7 h-7 md:w-8 md:h-8 object-contain"
                                            />
                                        {:else if category.icon?.startsWith('/')}
                                            <img
                                                src={category.icon}
                                                alt={$t(catKey(category.id))}
                                                class="w-7 h-7 md:w-8 md:h-8 object-contain"
                                            />
                                        {:else}
                                            <span
                                                class="text-2xl md:text-xl md:text-3xl"
                                                >{category.icon}</span
                                            >
                                        {/if}
                                        <span
                                            class="text-white font-bold text-base md:text-sm md:text-lg"
                                            >{$t(catKey(category.id))}</span
                                        >
                                        {#if categoryDbItems.length > 0}
                                            <span class="bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                {$t('map.new_count', { values: { n: categoryDbItems.length } })}
                                            </span>
                                        {/if}
                                        {#if hasNationalPage}
                                            <!-- קישור ארצי - ליד שם הקטגוריה בשורת הכותרת -->
                                            <span
                                                role="link"
                                                tabindex="0"
                                                onclick={(e) => { e.stopPropagation(); goto(`/national/${category.id}`); }}
                                                onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); goto(`/national/${category.id}`); } }}
                                                class="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer
                                                       underline underline-offset-2 decoration-purple-500/40 hover:decoration-purple-400
                                                       transition-colors font-medium whitespace-nowrap"
                                            >{$t('map.to_national_list')}</span>
                                        {/if}
                                        {#if giveawayNational}
                                            <span
                                                role="link"
                                                tabindex="0"
                                                onclick={(e) => { e.stopPropagation(); goto('/giveaways'); }}
                                                onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); goto('/giveaways'); } }}
                                                class="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer
                                                       underline underline-offset-2 decoration-purple-500/40 hover:decoration-purple-400
                                                       transition-colors font-medium whitespace-nowrap"
                                            >{$t('map.to_national_list')}</span>
                                        {/if}
                                        {#if babysitterNational}
                                            <span
                                                role="link"
                                                tabindex="0"
                                                onclick={(e) => { e.stopPropagation(); goto('/babysitters'); }}
                                                onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); goto('/babysitters'); } }}
                                                class="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer
                                                       underline underline-offset-2 decoration-purple-500/40 hover:decoration-purple-400
                                                       transition-colors font-medium whitespace-nowrap"
                                            >{$t('map.to_national_list')}</span>
                                        {/if}
                                        {#if shabbatNational}
                                            <span
                                                role="link"
                                                tabindex="0"
                                                onclick={(e) => { e.stopPropagation(); goto('/shabbat-hosting'); }}
                                                onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); goto('/shabbat-hosting'); } }}
                                                class="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer
                                                       underline underline-offset-2 decoration-purple-500/40 hover:decoration-purple-400
                                                       transition-colors font-medium whitespace-nowrap"
                                            >{$t('map.to_shabbat_board')}</span>
                                        {/if}
                                        {#if chugimNational}
                                            <span
                                                role="link"
                                                tabindex="0"
                                                onclick={(e) => { e.stopPropagation(); goto('/chugim'); }}
                                                onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); goto('/chugim'); } }}
                                                class="inline-flex items-center gap-1.5 text-[11px] font-bold text-white
                                                       bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500
                                                       px-2.5 py-1 rounded-full shadow-md shadow-indigo-500/30 hover:shadow-indigo-500/50
                                                       transition-all whitespace-nowrap cursor-pointer"
                                                title={$t('map.chugim_board_title')}
                                            >
                                                <span class="bg-white/25 px-1.5 rounded-full text-[10px] font-black">{totalItems}</span>
                                                {$t('map.to_chugim_board')}
                                            </span>
                                        {/if}
                                    </div>
                                    <div
                                        class="flex items-center gap-2 md:gap-3"
                                    >
                                        <span
                                            class="text-purple-400 text-sm md:text-xs md:text-sm"
                                            >{$t('map.n_items', { values: { n: totalItems } })}</span
                                        >
                                        <svg
                                            class="w-5 h-5 md:w-4 md:h-4 md:w-6 md:h-6 text-purple-400 transition-transform duration-300 {expandedCategories.has(
                                                category.id,
                                            )
                                                ? 'rotate-180'
                                                : ''}"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                stroke-linecap="round"
                                                stroke-linejoin="round"
                                                stroke-width="2"
                                                d="M19 9l-7 7-7-7"
                                            />
                                        </svg>
                                    </div>
                                </div>
                            </button>


                            {#if expandedCategories.has(category.id)}
                                <div
                                    class="px-4 pb-4 space-y-2 animate-slideDown"
                                >
                                    <!-- פריטים סטטיים קיימים -->
                                    {#each category.items ?? [] as item}
                                        <a
                                            href="/items/{item.id}"
                                            class="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 hover:bg-purple-900/30 hover:border-purple-500/40 transition-all cursor-pointer flex items-center justify-between group/item"
                                        >
                                            <span class="flex items-center gap-2 min-w-0">
                                                <span class="text-white text-sm truncate"
                                                    >• {$t(itemKey(item.id))}</span
                                                >
                                                {#if 'paid' in item}
                                                    <span
                                                        class="flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border {item.paid
                                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                            : 'bg-green-500/20 text-green-400 border-green-500/40'}"
                                                    >
                                                        {item.paid ? $t('map.paid') : $t('map.free')}
                                                    </span>
                                                {/if}
                                            </span>
                                            <div
                                                class="flex-shrink-0 bg-purple-600 group-hover/item:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                                            >
                                                {$t('map.view_details')}
                                            </div>
                                        </a>
                                    {/each}

                                    <!-- פריטים מה-DB (חדשים) -->
                                    {#each categoryDbItems as dbItem}
                                        {@const isIdx = isIndexItem(dbItem)}
                                        {@const discount = itemDiscount(dbItem)}
                                        <a
                                            href={itemHref(dbItem)}
                                            target={isIdx ? '_blank' : null}
                                            rel={isIdx ? 'noopener noreferrer' : null}
                                            class="bg-green-900/15 border border-green-500/25 rounded-lg p-3 hover:bg-green-900/25 hover:border-green-500/40 transition-all cursor-pointer flex items-center justify-between group/item"
                                        >
                                            <div class="flex items-center gap-2 min-w-0">
                                                <span class="text-lg flex-shrink-0">{dbItem.icon}</span>
                                                <div class="min-w-0">
                                                    <span class="text-white text-sm block truncate">• {dbItem.label}</span>
                                                    {#if isIdx && discount}
                                                        <span class="text-amber-300 text-xs block truncate" title={discount}>🎁 {discount}</span>
                                                    {:else if dbItem.neighborhood}
                                                        <span class="text-gray-500 text-xs">{dbItem.neighborhood}</span>
                                                    {/if}
                                                </div>
                                                {#if isIdx}
                                                    <span class="bg-amber-500/20 text-amber-300 text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0">הטבה</span>
                                                {:else}
                                                    <span class="bg-green-500/20 text-green-400 text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0">{$t('map.new_badge')}</span>
                                                {/if}
                                            </div>
                                            <div
                                                class="bg-green-700 group-hover/item:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors flex-shrink-0 mr-2"
                                            >
                                                {$t('map.view_details')}
                                            </div>
                                        </a>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {/if}

        {#if showAddMenu}
            <!-- תצוגת הוספת יתרון (וילון גלילה) -->
            <div
                transition:slide={{ duration: 400 }}
                class="absolute top-0 inset-x-0 w-full h-full min-h-[350px] md:min-h-[450px] overflow-y-auto p-6 pt-12 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20 bg-[#0f172a] shadow-2xl z-40"
                style="border-radius: 18px;"
            >
                <div class="grid grid-cols-2 gap-2 md:gap-3">
                    {#each categories.filter((cat) => cat.id !== "benefits") as category}
                        <button
                            onclick={() => handleAddItem(category.id)}
                            class="w-full bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-2 md:p-3 hover:border-green-500 hover:from-green-900/40 hover:to-emerald-900/40 transition-all cursor-pointer"
                        >
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-1.5 md:gap-2">
                                    {#if category.icon?.startsWith('/')}
                                        <img src={category.icon} class="w-6 h-6 md:w-7 md:h-7 inline-block" alt={$t(catKey(category.id))} />
                                    {:else}
                                        <span class="text-xl md:text-2xl">{category.icon}</span>
                                    {/if}
                                    <span
                                        class="text-white font-bold text-xs md:text-sm"
                                        >{$t(catKey(category.id))}</span
                                    >
                                </div>
                                <div class="flex items-center">
                                    <span
                                        class="text-lg md:text-xl text-green-400"
                                        >➕</span
                                    >
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        {:else if viewMode === "search"}
            <!-- מצב חיפוש -->
            <div class="w-full h-[350px] md:h-[450px] flex flex-col p-3 md:p-5" style="border-radius: 20px;">
                <!-- שדה חיפוש (דסקטופ; בנייד הקלט מגיע משדה החיפוש שבשורת הכפתורים) -->
                <div class="hidden md:flex gap-2 mb-4 mt-6 max-w-sm mx-auto w-full">
                    <!-- svelte-ignore a11y_autofocus -->
                    <!-- autofocus מכוון: השדה נפתח בתוך חלון החיפוש שהמשתמש בחר לפתוח -->
                    <input
                        bind:value={searchQuery}
                        type="text"
                        placeholder={$t('map.search_placeholder')}
                        autofocus
                        class="flex-1 bg-white/8 border border-white/20 rounded-xl px-5 py-3.5
                               text-white placeholder:text-gray-500 text-base focus:outline-none
                               focus:border-purple-500/60 transition-colors"
                        dir="rtl"
                    />
                    {#if searchQuery}
                        <button
                            onclick={() => searchQuery = ''}
                            class="text-gray-400 hover:text-white px-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-base cursor-pointer"
                        >✕</button>
                    {/if}
                </div>

                <!-- מצב ריק - תמונה ללא גלילה -->
                {#if !searchQuery.trim()}
                    <div class="text-center py-4 text-gray-500">
                        <div class="text-4xl mb-3">🔍</div>
                        <p class="text-sm">{$t('map.search_type_hint')}</p>
                    </div>
                    <div class="flex justify-center mt-3">
                        <img src="/images/vaadei-search.webp" alt="" class="max-w-[320px] w-full rounded-xl opacity-80" />
                    </div>
                {:else}
                <!-- תוצאות -->
                <div class="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent">
                    {#if searchResults().length === 0}
                        <div class="text-center py-12 text-gray-500">
                            <div class="text-4xl mb-3">😕</div>
                            <p class="text-sm">{$t('map.no_results')}</p>
                        </div>
                    {:else}
                        <p class="text-xs text-gray-500 mb-2">{$t('map.n_results', { values: { n: searchResults().length } })}</p>
                        {#each searchResults() as item}
                            <a
                                href="/items/{item.id}"
                                class="flex items-center gap-3 bg-white/4 hover:bg-white/8 border border-white/8 hover:border-purple-500/40 rounded-xl px-3 py-2.5 transition-all"
                            >
                                <span class="text-xl flex-shrink-0">{item.icon ?? '📌'}</span>
                                <div class="min-w-0 flex-1">
                                    <p class="text-white font-bold text-sm truncate">{item.label}</p>
                                    {#if item.description}
                                        <p class="text-gray-400 text-xs line-clamp-1">{item.description}</p>
                                    {/if}
                                </div>
                                {#if item.neighborhood === neighborhoodState.neighborhood}
                                    <span class="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex-shrink-0">{$t('map.your_neighborhood')}</span>
                                {:else if item.city === neighborhoodState.city}
                                    <span class="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full flex-shrink-0">{item.city}</span>
                                {/if}
                            </a>
                        {/each}
                    {/if}
                </div>
                {/if}
            </div>
        {/if}


        <!-- כפתור חיפוש - פינה ימנית עליונה (דסקטופ בלבד; בנייד יש שדה חיפוש בשורת הכפתורים) -->
        <div class="hidden md:block absolute right-4 z-50" style="top: -14px;">
            <button
                onclick={() => { viewMode = viewMode === 'search' ? 'list' : 'search'; searchQuery = ''; }}
                title={$t('map.search')}
                class="flex items-center gap-1.5 bg-[#0f172a] border-2 {viewMode === 'search' ? 'border-purple-500 text-purple-300' : 'border-white/20 text-white/70'} hover:border-purple-500/70 hover:text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-xl transition-all hover:scale-105"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7"/>
                    <path d="m21 21-4.35-4.35"/>
                </svg>
                <span class="text-xs hidden md:inline">{$t('map.search')}</span>
            </button>
        </div>

        <!-- כפתור הוסף יתרון - בחלק העליון (שוחזר; מירכוז ב-translateX מפורש כי -translate-x-1/2 שבור ב-v4) -->
        <div
            class="absolute left-1/2 z-50"
            style="top: -10px; transform: translateX(-50%);"
        >
            <button
                onclick={handleAddAdvantage}
                title={showAddMenu ? $t('map.close_menu') : $t('map.add_advantage_title')}
                class="relative group overflow-hidden bg-gradient-to-br {showAddMenu
                    ? 'from-green-900 via-emerald-900 to-teal-950'
                    : 'from-green-500 via-emerald-500 to-teal-600'} hover:{showAddMenu
                    ? 'from-green-800 via-emerald-800 to-teal-900'
                    : 'from-green-400 via-emerald-400 hover:to-teal-500'} text-white px-4 py-2 rounded-lg font-bold text-lg shadow-xl transition-all hover:scale-105 border-2 {showAddMenu
                    ? 'border-red-500'
                    : 'border-purple-600'}"
            >
                <div
                    class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"
                ></div>
                <div class="relative flex flex-row items-center justify-center gap-1.5 whitespace-nowrap">
                    <span class="text-xs leading-none">{showAddMenu ? "✖️" : "➕"}</span>
                    <span class="leading-none">{showAddMenu ? $t('map.close') : $t('map.add')}</span>
                </div>
            </button>
        </div>

        <!-- כפתור הרמת יד מיוחד - בתחתית המפה -->
        <!-- מרכוז ב-flex (לא transform) כדי לא ליצור stacking-context שכולא את z-index של התפריט הנפתח -->
        <div
            class="absolute -bottom-8 md:-bottom-8 inset-x-0 flex justify-center pointer-events-none"
        >
            {#if !handRaised}
                <!-- כפתור הרמת יד רגיל -->
                <button
                    onclick={() => (showHelpMenu = !showHelpMenu)}
                    title={$t('map.ask_community_help')}
                    class="pointer-events-auto relative group overflow-hidden bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 hover:from-red-400 hover:via-pink-400 hover:to-purple-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base shadow-xl transition-all hover:scale-105 border-2 md:border-4 border-purple-600"
                >
                    <div
                        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"
                    ></div>
                    <div class="relative flex items-center gap-2 md:gap-3">
                        <span class="text-xl md:text-2xl">✋</span>
                        <span>{$t('map.raise_hand')}</span>
                    </div>
                </button>
            {:else}
                <!-- כפתור יד מורמת -->
                <button
                    onclick={handleLowerHand}
                    title={$t('map.lower_hand_title')}
                    class="pointer-events-auto relative group overflow-hidden bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 hover:from-yellow-400 hover:via-orange-400 hover:to-red-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base shadow-xl transition-all hover:scale-105 border-2 md:border-4 border-yellow-400 animate-pulse"
                >
                    <div class="relative flex items-center gap-2 md:gap-3">
                        <span class="text-xl md:text-2xl">🙋</span>
                        <span>{$t('map.hand_raised')}</span>
                    </div>
                </button>
            {/if}

            <!-- תפריט "פתח קריאה" והסקר עברו לרמת-העל של הרכיב (מודל מרכזי) כדי -->
            <!-- להימנע מ-stacking-context/overflow של עוטף המפה שהסתיר אותם בנייד -->
        </div>

        <!-- Zoom Buttons בתחתית ימין -->
        {#if isFullscreen}
            <div class="absolute bottom-3 right-3 z-[60] flex flex-col gap-2">
                <button
                    type="button"
                    onclick={zoomIn}
                    aria-label={$t('map.zoom_in')}
                    title={$t('map.zoom_in_title')}
                    class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-lg font-bold flex items-center justify-center transition-all shadow-lg border border-purple-400 hover:scale-110"
                >
                    +
                </button>
                <button
                    type="button"
                    onclick={zoomOut}
                    aria-label={$t('map.zoom_out')}
                    title={$t('map.zoom_out_title')}
                    class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-lg font-bold flex items-center justify-center transition-all shadow-lg border border-purple-400 hover:scale-110"
                >
                    −
                </button>
            </div>
        {/if}
    </div>
</div>

{#if handRaised}
    <div class="text-white text-lg text-center mt-2">
        {$t('map.community_solved', { values: { n: $communityHelpCount, year: currentYear } })}
    </div>
{/if}

<!-- ===== תפריט "פתח קריאה" (מודל מרכזי ברמת-העל - צף מעל כל שכבה בנייד ובדסקטופ) ===== -->
{#if showHelpMenu}
    <div
        class="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onclick={(e) => { if (e.target === e.currentTarget) showHelpMenu = false; }}
        onkeydown={(e) => { if (e.key === "Escape") showHelpMenu = false; }}
        aria-label={$t("map.open_call")}
        tabindex="-1"
    >
        <div
            class="w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl border-2 border-purple-600 overflow-hidden animate-slideDown"
            dir="rtl"
        >
            <div class="bg-gradient-to-r from-red-500 to-pink-500 p-3 text-center">
                <h3 class="text-white font-bold text-lg">{$t('map.open_call')}</h3>
            </div>
            <div class="p-2">
                {#each helpOptions as option}
                    <button
                        onclick={() => handleHelpRequest(option.id)}
                        class="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-colors text-right border-b border-gray-200 last:border-b-0"
                    >
                        <span class="text-2xl">{option.icon}</span>
                        <span class="text-gray-800 font-medium text-sm">{$t(option.key)}</span>
                    </button>
                {/each}
            </div>
            <button
                onclick={() => (showHelpMenu = false)}
                class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 text-sm font-bold transition-colors"
            >
                {$t('map.cancel')}
            </button>
        </div>
    </div>
{/if}

<!-- ===== סקר הורדת יד (מודל מרכזי ברמת-העל) ===== -->
{#if showSurvey}
    <div
        class="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onclick={(e) => { if (e.target === e.currentTarget) showSurvey = false; }}
        onkeydown={(e) => { if (e.key === "Escape") showSurvey = false; }}
        aria-label={$t("map.survey_title")}
        tabindex="-1"
    >
        <div
            class="w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl border-2 border-yellow-600 overflow-hidden animate-slideDown"
            dir="rtl"
        >
            <div class="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 text-center">
                <h3 class="text-white font-bold text-lg">{$t('map.survey_title')}</h3>
            </div>
            <div class="p-4 space-y-3">
                <button
                    onclick={() => handleSurveyResponse("community")}
                    class="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border-2 border-green-300"
                >
                    <span class="text-3xl">🤝</span>
                    <div class="text-right">
                        <p class="font-bold text-green-800">{$t('map.community_helped')}</p>
                        <p class="text-xs text-green-600">{$t('map.thanks_all')}</p>
                    </div>
                </button>
                <button
                    onclick={() => handleSurveyResponse("other")}
                    class="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-300"
                >
                    <span class="text-3xl">✅</span>
                    <div class="text-right">
                        <p class="font-bold text-blue-800">{$t('map.solved_other')}</p>
                        <p class="text-xs text-blue-600">{$t('map.all_ok')}</p>
                    </div>
                </button>
            </div>
            <button
                onclick={() => handleSurveyResponse("cancel")}
                class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 text-sm font-bold transition-colors"
            >
                {$t('map.cancel')}
            </button>
        </div>
    </div>
{/if}

<!-- ===== מודל קריאת עזרה ===== -->
{#if showRaiseHandModal}
    <div
        class="fixed inset-0 z-[9999] flex items-start justify-center pt-6 pb-8 px-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onclick={(e) => { if (e.target === e.currentTarget) showRaiseHandModal = false; }}
        onkeydown={(e) => { if (e.key === "Escape") showRaiseHandModal = false; }}
        aria-label={$t("map.raise_hand")}
        tabindex="-1"
    >
        <!-- הרקע נסגר רק בלחיצה עליו עצמו, ולכן אין צורך ב-stopPropagation -->
        <div class="w-full max-w-lg" dir="rtl">

            {#if modalSubmitted}
                <!-- מסך הצלחה -->
                <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-8 shadow-2xl text-center mt-8">
                    <div class="text-6xl mb-4">✅</div>
                    <h2 class="text-xl font-black text-white mb-3">{$t('map.call_sent_title')}</h2>
                    <p class="text-gray-400 text-sm mb-6">{$t('map.call_sent_sub')}</p>
                    <button
                        onclick={() => showRaiseHandModal = false}
                        class="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-lg transition-all"
                    >
                        {$t('map.close')}
                    </button>
                </div>
            {:else}
                <!-- כותרת -->
                <div class="text-center mb-6 mt-4">
                    <div class="text-5xl mb-3">{helpOptions.find(o => o.id === modalOptionId)?.icon ?? '🆘'}</div>
                    <h1 class="text-2xl font-black text-white mb-1">{$t(helpOptions.find(o => o.id === modalOptionId)?.key ?? 'map.help_call')}</h1>
                    <p class="text-gray-400 text-sm">{$t('map.modal_sub')}</p>
                    <div class="mt-3 inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-red-400">
                        {$t('map.call_badge')}
                    </div>
                </div>

                <!-- כרטיס טופס -->
                <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-6 shadow-2xl">

                    {#if modalError}
                        <div class="mb-4 px-4 py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-sm font-bold">
                            ⚠️ {modalError}
                        </div>
                    {/if}

                    <form
                        method="POST"
                        action="/raise-hand/add"
                        use:enhance={() => {
                            modalSubmitting = true;
                            return async ({ result }) => {
                                modalSubmitting = false;
                                if (result.type === 'redirect') {
                                    modalSubmitted = true;
                                } else if (result.type === 'failure') {
                                    modalError = (result.data as Record<string, string>)?.error ?? $t('map.error_retry');
                                }
                            };
                        }}
                        class="space-y-5"
                    >
                        <input type="hidden" name="option_id" value={modalOptionId} />

                        <!-- תיאור -->
                        <div>
                            <label for="modal-rh-desc" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                {$t(fieldsByOption[modalOptionId]?.descLabel ?? 'map.f1_desc_label')} *
                            </label>
                            <textarea
                                id="modal-rh-desc"
                                name="description"
                                rows="4"
                                required
                                placeholder={$t(fieldsByOption[modalOptionId]?.descPlaceholder ?? 'map.f1_desc_ph')}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600 resize-none"
                            ></textarea>
                        </div>

                        <!-- מיקום -->
                        <div>
                            <label for="modal-rh-location" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                {$t('map.location')} *
                            </label>
                            <input
                                id="modal-rh-location"
                                name="location"
                                type="text"
                                required
                                placeholder={$t(fieldsByOption[modalOptionId]?.locationPlaceholder ?? 'map.location_ph')}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                            />
                        </div>

                        <!-- מתי נראה לאחרונה (רק אבד ילד/כלב) -->
                        {#if fieldsByOption[modalOptionId]?.hasLastSeen}
                        <div>
                            <label for="modal-rh-lastseen" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                👁️ {$t('map.last_seen_when')}
                            </label>
                            <input
                                id="modal-rh-lastseen"
                                name="last_seen_time"
                                type="text"
                                placeholder={$t('map.last_seen_when_ph')}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                            />
                        </div>
                        {/if}

                        <!-- תמונה -->
                        <div>
                            <p class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                {$t('map.photo_optional')}
                            </p>
                            {#if modalImagePreview}
                                <div class="relative w-full rounded-xl overflow-hidden border border-white/10">
                                    <img src={modalImagePreview} alt={$t('map.preview_alt')} class="w-full max-h-52 object-contain bg-black/30" />
                                    <button
                                        type="button"
                                        onclick={() => { modalImageBase64 = ''; modalImagePreview = ''; }}
                                        class="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors"
                                    >✕</button>
                                </div>
                            {:else}
                                <label class="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-white/15 hover:border-red-500/50 bg-white/3 hover:bg-red-900/10 cursor-pointer transition-all">
                                    <span class="text-2xl">📷</span>
                                    <span class="text-gray-400 text-sm font-bold">{$t('map.upload_photo')}</span>
                                    <input type="file" accept="image/*" class="hidden" onchange={handleModalImageChange} />
                                </label>
                                <div class="mt-2">
                                    <CameraCapture onfiles={processModalFile} class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 hover:border-red-500/50 bg-white/5 hover:bg-red-900/15 text-gray-300 hover:text-white text-sm font-bold transition-all cursor-pointer" />
                                </div>
                            {/if}
                            <input type="hidden" name="image_base64" value={modalImageBase64} />
                        </div>

                        <!-- יצירת קשר -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="modal-rh-contact" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                    {$t('map.contact_name')}
                                </label>
                                <input
                                    id="modal-rh-contact"
                                    name="contact"
                                    type="text"
                                    placeholder={$t('map.first_name_ph')}
                                    class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                />
                            </div>
                            <div>
                                <label for="modal-rh-phone" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                    {$t('map.phone')} *
                                </label>
                                <input
                                    id="modal-rh-phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    placeholder="050-0000000"
                                    class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                />
                            </div>
                        </div>

                        <!-- שלח -->
                        <button
                            type="submit"
                            disabled={modalSubmitting}
                            class="w-full py-3.5 rounded-xl font-black text-base transition-all
                                {modalSubmitting
                                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-lg hover:shadow-red-500/25'}"
                        >
                            {#if modalSubmitting}
                                {$t('map.sending_call')}
                            {:else}
                                {$t('map.send_call')}
                            {/if}
                        </button>
                    </form>
                </div>

                <!-- סגירה -->
                <div class="text-center mt-5">
                    <button
                        onclick={() => showRaiseHandModal = false}
                        class="text-gray-500 hover:text-gray-300 text-sm transition-colors"
                    >
                        ✕ {$t('map.close')}
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    /* ===== מספר הפריטים בשכונה - מופיע לכמה שניות ואז נעלם בהדרגה ===== */
    @keyframes neighborhoodCountFade {
        0%   { opacity: 0; transform: translateY(-6px); }
        7%   { opacity: 1; transform: translateY(0); }
        14%  { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(0); }
    }
    .neighborhood-count-fade {
        animation: neighborhoodCountFade 12s ease-in-out forwards;
        pointer-events: none;
    }

    /* ===== טולטיפ לכפתורי קטגוריות (דסקטופ) ===== */
    /* מיכל הכפתורים חייב להיות מעל פאנלי Leaflet (z=200..700)
       וגם stacking-context סגור כדי שה-z-index של הטולטיפ יעבוד נכון */
    .category-buttons-wrapper {
        position: relative;
        z-index: 1000;
        isolation: isolate;
    }
    .category-with-tooltip {
        position: relative;
        overflow: visible;
    }
    /* הרמת הכפתור המרוחף מעל אחיו (שורה הבאה ב-flex-wrap)
       — אחרת transform: scale(1.05) יוצר stacking-context שלוכד את הטולטיפ */
    .category-with-tooltip:hover,
    .category-with-tooltip:focus-visible {
        z-index: 20;
    }
    .category-tooltip {
        position: absolute;
        top: calc(100% + 10px);
        left: 50%;
        transform: translateX(-50%) translateY(-4px);
        background: linear-gradient(135deg, #1e1b4b, #312e81);
        color: #f8fafc;
        padding: 10px 14px;
        border-radius: 12px;
        white-space: normal;
        width: max-content;
        max-width: 260px;
        min-width: 180px;
        text-align: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.18s ease, transform 0.18s ease;
        z-index: 9999;
        border: 1.5px solid #a855f7;
        box-shadow: 0 10px 30px rgba(0,0,0,0.75), 0 0 0 1px rgba(168,85,247,0.25);
        font-weight: 400;
        line-height: 1.4;
        direction: rtl;
    }
    .category-tooltip::before {
        content: '';
        position: absolute;
        top: -7px;
        left: 50%;
        transform: translateX(-50%) rotate(45deg);
        width: 13px;
        height: 13px;
        background: #1e1b4b;
        border-top: 1.5px solid #a855f7;
        border-left: 1.5px solid #a855f7;
    }
    .category-tooltip-title {
        display: block;
        font-size: 0.85rem;
        font-weight: 700;
        color: #fde047;
        margin-bottom: 3px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .category-tooltip-desc {
        display: block;
        font-size: 0.78rem;
        color: #f1f5f9;
    }
    /* Tailwind v4 group-hover שבור — חייבים hover מפורש על האב */
    .category-with-tooltip:hover .category-tooltip,
    .category-with-tooltip:focus-visible .category-tooltip {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
        transition-delay: 0.12s;
    }
    /* Touch: אל תציג טולטיפ דסקטופ במכשירי מגע - מפריע ל-tap-to-filter */
    @media (hover: none) {
        .category-tooltip { display: none; }
    }

    /* ===== טולטיפ-המתנה במובייל ===== */
    @keyframes mobileTooltipFadeIn {
        from { opacity: 0; transform: scale(0.96); }
        to   { opacity: 1; transform: scale(1); }
    }
    @keyframes mobileTooltipProgress {
        from { width: 0%; }
        to   { width: 100%; }
    }

    @keyframes sheetSlideUp {
        from { transform: translateY(100%); }
        to   { transform: translateY(0); }
    }
    @keyframes sheetFadeIn {
        from { transform: translateY(calc(-50% + 20px)); opacity: 0; }
        to   { transform: translateY(-50%); opacity: 1; }
    }

    /* ----- מרקרי מפה (Leaflet) ----- */
    :global(.jmap-pin-wrap) {
        background: transparent !important;
        border: 0 !important;
        z-index: 20 !important;
    }
    /* קריאת עזרה - הבהוב אדום שמושך תשומת לב */
    :global(.jmap-pin-wrap--help) {
        z-index: 1000 !important;
    }
    :global(.jmap-pin-wrap--help .jmap-pin-icon) {
        animation: helpPinPulse 1.4s ease-in-out infinite;
        filter: drop-shadow(0 0 6px rgba(220,38,38,0.9));
    }
    /* שכבוב מרקרים במחלקות CSS: הכלל הבסיסי למעלה קובע z-index עם !important,
       ולכן zIndexOffset של Leaflet (ערך inline) לא משפיע — השכבוב חייב לקרות כאן.
       פין מפוזר (כמה פריטים על אותה נקודה) — מעל פינים רגילים (20), אחרת תיבת
       ההקלקה השקופה (120×60) של מרקר סמוך בולעת את ההקשה עליו. */
    :global(.jmap-pin-wrap--spread) {
        z-index: 30 !important;
    }
    @keyframes helpPinPulse {
        0%, 100% { transform: scale(1); }
        50%      { transform: scale(1.22); }
    }
    :global(.jmap-pin) {
        text-align: center;
        cursor: pointer;
        transform: scale(var(--jmap-pin-scale, 1));
        transform-origin: bottom center;
        transition: transform 0.15s ease;
    }
    :global(.jmap-pin:hover) {
        transform: scale(calc(var(--jmap-pin-scale, 1) * 1.12));
    }
    :global(.jmap-pin-icon) {
        font-size: 1.875rem;
        line-height: 1;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    }
    :global(.jmap-pin-img) {
        width: 48px;
        height: 48px;
        margin: 0 auto;
        border-radius: 9999px;
        border: 3px solid #9333ea;
        background: #fff;
        overflow: hidden;
        box-shadow: 0 2px 6px rgba(0,0,0,0.45);
    }
    :global(.jmap-pin-img img) {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
    }
    :global(.jmap-pin-label) {
        display: inline-block;
        margin-top: 2px;
        padding: 2px 8px;
        color: #fff;
        font-size: 0.75rem;
        font-weight: 700;
        border-radius: 6px;
        white-space: nowrap;
        max-width: 140px;
        overflow: hidden;
        text-overflow: ellipsis;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
    }
    /* מרקרי דוגמה - האייקון נשאר ברור, רק התווית הטקסטואלית מקבלת שקיפות + מסגרת מקווקווית */
    :global(.jmap-pin--mock .jmap-pin-icon) {
        opacity: 1;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
    }
    :global(.jmap-pin--mock .jmap-pin-label) {
        opacity: 0.78;
        outline: 1.5px dashed rgba(255,255,255,0.7);
        outline-offset: 1px;
        background-image: linear-gradient(rgba(255,255,255,0.12), rgba(0,0,0,0.0));
    }
    :global(.jmap-pin--mock:hover .jmap-pin-label) {
        opacity: 1;
    }
    /* נכס סגור כרגע (לפי שעות הפתיחה) — הסמל/הלוגו בשחור-לבן, נהיה צבעוני שוב כשפתוח */
    :global(.jmap-pin--closed .jmap-pin-icon) {
        filter: grayscale(1) drop-shadow(0 2px 4px rgba(0,0,0,0.4));
        opacity: 0.8;
    }
    :global(.jmap-pin--closed .jmap-pin-img) {
        filter: grayscale(1);
        opacity: 0.85;
    }
    :global(.jmap-pin--closed .jmap-pin-label) {
        filter: grayscale(0.9);
        opacity: 0.8;
    }
    /* הודעת "סגור עכשיו" — מוצגת רק במעבר עכבר על פין סגור */
    :global(.jmap-pin-closed-note) {
        display: none;
        margin: 3px auto 0;
        padding: 2px 8px;
        background: rgba(17,24,39,0.95);
        color: #fca5a5;
        font-size: 0.7rem;
        font-weight: 700;
        border-radius: 6px;
        white-space: nowrap;
        box-shadow: 0 4px 6px rgba(0,0,0,0.35);
    }
    :global(.jmap-pin--closed:hover .jmap-pin-closed-note) {
        display: inline-block;
    }
    /* ----- תצוגה תלוית-זום (המחלקות מוחלפות ב-applyPinScale) -----
       jmap-zoom-icons (זום עיר): רק אימוג'ים, בלי שמות.
       jmap-zoom-dots (זום ארצי): נקודות צבעוניות במקום האימוג'ים.
       מוחרגים - תמיד מוצגים במלואם: קריאות עזרה (--help)
       ופריט שהודגש בלחיצה בודדת (--active). */
    :global(.jmap-zoom-icons .jmap-pin-wrap:not(.jmap-pin-wrap--help):not(.jmap-pin-wrap--active) .jmap-pin-label),
    :global(.jmap-zoom-icons .jmap-pin-wrap:not(.jmap-pin-wrap--help):not(.jmap-pin-wrap--active) .jmap-pin-closed-note) {
        display: none;
    }
    :global(.jmap-zoom-dots .jmap-pin-wrap:not(.jmap-pin-wrap--help):not(.jmap-pin-wrap--active) .jmap-pin > *) {
        display: none;
    }
    :global(.jmap-zoom-dots .jmap-pin-wrap:not(.jmap-pin-wrap--help):not(.jmap-pin-wrap--active) .jmap-pin) {
        position: relative;
        height: 100%;
    }
    /* הנקודה ממורכזת בדיוק על הקואורדינטה (עוגן המרקר = תחתית-מרכז התיבה) */
    :global(.jmap-zoom-dots .jmap-pin-wrap:not(.jmap-pin-wrap--help):not(.jmap-pin-wrap--active) .jmap-pin)::after {
        content: '';
        position: absolute;
        left: 50%;
        bottom: 0;
        transform: translate(-50%, 50%);
        width: 11px;
        height: 11px;
        border-radius: 9999px;
        background: var(--jmap-pin-hex, #9333ea);
        border: 2px solid #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.55);
    }
    /* ----- רמת הדגשה: לחיצה בודדת על פריט (--active) או זום מקסימלי (jmap-zoom-max) -----
       הכיתוב גדל מעט והלוגו/אימוג'י מובלט מעט. פריט מודגש מוחרג מכללי ההסתרה
       למעלה, כך שלחיצה על אימוג'י/נקודה גם חושפת את שמו. */
    :global(.jmap-pin-wrap--active) {
        z-index: 40 !important; /* מעל פינים רגילים (20) ואשכולות (30) */
    }
    :global(.jmap-pin-wrap--active .jmap-pin-label),
    :global(.jmap-zoom-max .jmap-pin-label) {
        font-size: 0.85rem;
        max-width: 175px;
    }
    :global(.jmap-pin-wrap--active .jmap-pin-icon),
    :global(.jmap-zoom-max .jmap-pin-icon) {
        transform: scale(1.15);
        transform-origin: center bottom;
        filter: drop-shadow(0 2px 5px rgba(0,0,0,0.5)) drop-shadow(0 0 6px rgba(255,255,255,0.55));
        transition: transform 0.15s ease;
    }
    /* z-index לעטיפת ה-Leaflet במצב מסך מלא */
    :global(.leaflet-container) {
        font-family: inherit;
        background: #e8e6e0;
    }
    /* OSM כבר צבעוני מטבעו - בלי פילטר שמעוות. חידוד עדין בלבד. */
    :global(.leaflet-tile-pane) {
        filter: saturate(1.1);
    }
    /* שורת הייחוס (חובה חוקית) - מוקטנת ודהויה כדי שלא תבלוט */
    :global(.leaflet-control-attribution) {
        font-size: 8px !important;
        line-height: 1.4 !important;
        padding: 0 4px !important;
        background: rgba(255, 255, 255, 0.7) !important;
        color: rgba(30, 41, 59, 0.55) !important;
        border-top-left-radius: 6px;
    }
    :global(.leaflet-control-attribution a) {
        color: rgba(30, 41, 59, 0.8) !important;
    }

    /* ----- מצב מסך מלא: כפתורי קטגוריה קומפקטיים + מפה ממלאת ----- */
    :global(.jmap-fullscreen) .category-buttons-container {
        flex-wrap: wrap !important;
        justify-content: center !important;
        gap: 0.375rem !important;
        padding: 0.25rem 0.5rem !important;
    }
    :global(.jmap-fullscreen) .map-category-button {
        flex: 0 0 auto !important;
        min-width: auto !important;
        padding: 0.3rem 0.7rem !important;
        font-size: 0.75rem !important;
        font-weight: 700 !important;
    }
    :global(.jmap-fullscreen) .map-category-button .icon {
        font-size: 0.95rem !important;
    }
    /* מיכל המפה ממלא את כל הגובה הנותר במסך מלא */
    :global(.jmap-mc-fullscreen) {
        flex: 1 1 0% !important;
        min-height: 0 !important;
    }
    :global(.jmap-mc-fullscreen) > [class*="overflow-hidden"][role="button"] {
        flex: 1 1 0% !important;
        height: auto !important;
        min-height: 0 !important;
    }

    @keyframes shimmer {
        0% {
            transform: translateX(-100%);
        }
        100% {
            transform: translateX(100%);
        }
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
            transform: scale(0.8);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }

    .animate-fadeIn {
        animation: fadeIn 0.5s ease-out;
    }

    @keyframes wave {
        0%,
        100% {
            transform: rotate(0deg);
        }
        25% {
            transform: rotate(-15deg);
        }
        75% {
            transform: rotate(15deg);
        }
    }

    .animate-shimmer-once {
        animation: shimmer 2s ease-in-out 1;
    }

    .animate-wave-once {
        display: inline-block;
        animation: wave 1.5s ease-in-out 1;
    }

    .page-corner {
        cursor: pointer;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        z-index: 30 !important;
    }

    .page-corner.menu-open {
        z-index: 0 !important;
    }

    .page-corner.flipping {
        animation: flip 0.5s ease-in-out;
    }

    @keyframes flip {
        0% {
            transform: rotateY(0deg);
        }
        50% {
            transform: rotateY(90deg);
        }
        100% {
            transform: rotateY(0deg);
        }
    }

    @keyframes peelPage {
        0% {
            transform: rotate(0deg) scale(1);
            transform-origin: top left;
        }
        50% {
            transform: rotate(-15deg) scale(1.3);
            transform-origin: top left;
        }
        100% {
            transform: rotate(0deg) scale(1);
            transform-origin: top left;
        }
    }

    @keyframes flipContainer {
        0% {
            transform: perspective(1000px) rotateY(0deg);
        }
        50% {
            transform: perspective(1000px) rotateY(-90deg);
        }
        100% {
            transform: perspective(1000px) rotateY(0deg);
        }
    }

    @keyframes waveExpand {
        0% {
            width: 0;
            height: 0;
            opacity: 0.8;
        }
        50% {
            opacity: 0.4;
        }
        100% {
            width: 600px;
            height: 600px;
            opacity: 0;
        }
    }

    .wave-container {
        position: relative;
        width: 0;
        height: 0;
        bottom: 0;
    }

    .wave {
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translate(-50%, 50%);
        border: 3px solid #ef4444;
        border-radius: 50%;
        animation: waveExpand 2s ease-out;
    }

    .wave-1 {
        animation-delay: 0s;
    }

    .wave-2 {
        animation-delay: 0.5s;
    }

    .wave-3 {
        animation-delay: 1s;
    }

    .wave-4 {
        animation-delay: 1.5s;
    }

    .flipping-container {
        animation: flipContainer 0.7s ease-in-out;
    }

    .page-corner.flipping {
        animation: peelPage 0.5s ease-in-out;
    }

    .page-corner.auto-switching {
        position: relative;
    }

    .hint {
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
        opacity: 0;
        z-index: 35;
        will-change: transform, opacity;
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.55));
    }

    .hint-cursor {
        display: inline-block;
        line-height: 0;
    }

    .hint-fingerprint {
        display: none;
        line-height: 0;
    }

    .page-corner.auto-switching .hint-cursor {
        animation: hintClickDesktop 4s ease-in-out;
    }

    .page-corner.auto-switching .hint-fingerprint {
        animation: hintClickMobile 4s ease-in-out;
    }

    @keyframes hintClickDesktop {
        0% {
            opacity: 0;
            transform: translate(62px, 14px) scale(0.85);
        }
        15% {
            opacity: 1;
            transform: translate(58px, 18px) scale(0.95);
        }
        45% {
            opacity: 1;
            transform: translate(42px, 38px) scale(1);
        }
        52% {
            opacity: 1;
            transform: translate(42px, 38px) scale(0.78);
            filter: drop-shadow(0 0 14px rgba(147, 51, 234, 0.95))
                drop-shadow(0 2px 4px rgba(0, 0, 0, 0.55));
        }
        62% {
            opacity: 1;
            transform: translate(42px, 38px) scale(1.05);
        }
        88% {
            opacity: 1;
            transform: translate(42px, 38px) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(35px, 45px) scale(0.9);
        }
    }

    @keyframes hintClickMobile {
        0% {
            opacity: 0;
            transform: translate(78px, -38px) rotate(-45deg) scale(0.6);
        }
        18% {
            opacity: 1;
            transform: translate(58px, -18px) rotate(-42deg) scale(0.95);
        }
        45% {
            opacity: 1;
            transform: translate(22px, 22px) rotate(-38deg) scale(1);
        }
        52% {
            opacity: 1;
            transform: translate(22px, 22px) rotate(-38deg) scale(0.72);
            filter: drop-shadow(0 0 12px rgba(147, 51, 234, 0.95))
                drop-shadow(0 2px 4px rgba(0, 0, 0, 0.55));
        }
        62% {
            opacity: 1;
            transform: translate(22px, 22px) rotate(-38deg) scale(1.1);
        }
        88% {
            opacity: 1;
            transform: translate(22px, 22px) rotate(-38deg) scale(1);
        }
        100% {
            opacity: 0;
            transform: translate(8px, 40px) rotate(-30deg) scale(0.85);
        }
    }

    .page-corner.auto-switching svg {
        animation: buttonGlow 4s ease-in-out;
    }

    @keyframes buttonGlow {
        0%,
        40% {
            filter: brightness(1) drop-shadow(0 0 0 rgba(147, 51, 234, 0));
        }
        60% {
            filter: brightness(2.5) drop-shadow(0 0 25px rgba(255, 255, 255, 1))
                drop-shadow(0 0 50px rgba(147, 51, 234, 1));
        }
        80% {
            filter: brightness(2) drop-shadow(0 0 20px rgba(255, 255, 255, 0.8))
                drop-shadow(0 0 40px rgba(147, 51, 234, 0.8));
        }
        100% {
            filter: brightness(1) drop-shadow(0 0 0 rgba(147, 51, 234, 0));
        }
    }

    @keyframes slideDown {
        from {
            opacity: 0;
            max-height: 0;
        }
        to {
            opacity: 1;
            max-height: 500px;
        }
    }

    .animate-slideDown {
        animation: slideDown 0.3s ease-out;
    }

    /* היו כאן שני כללי iframe מימי ההטמעה של Google Maps. המפה עברה
       ל-Leaflet ואין יותר iframe ברכיב, ולכן הכללים היו קוד מת. */

    /* Custom scrollbar styling */
    :global(.scrollbar-thin::-webkit-scrollbar) {
        width: 8px;
    }

    :global(.scrollbar-thin::-webkit-scrollbar-track) {
        background: rgba(88, 28, 135, 0.2);
        border-radius: 10px;
        margin: 20px 0;
    }

    :global(.scrollbar-thin::-webkit-scrollbar-thumb) {
        background: #9333ea;
        border-radius: 10px;
    }

    :global(.scrollbar-thin::-webkit-scrollbar-thumb:hover) {
        background: #a855f7;
    }

    /* Mobile buttons layout */
    @media (max-width: 768px) {
        .map-category-button span.icon,
        .map-category-button span[style*="letter-spacing"] {
            display: none !important;
        }

        .category-buttons-container {
            scrollbar-width: none;
            -webkit-overflow-scrolling: touch;
            scroll-behavior: smooth;
        }

        .category-buttons-container::-webkit-scrollbar {
            display: none;
        }

        /* Remove CSS pseudo-elements to prevent duplicates */
        .flex.flex-wrap.justify-start.gap-3.p-2.w-full.scrollable-mobile::before,
        .flex.flex-wrap.justify-start.gap-3.p-2.w-full.scrollable-mobile::after {
            display: none !important;
        }


        /* Reduce gaps on mobile - minimal between title and buttons, reasonable between buttons and map */
        div > .flex.flex-col.gap-4 {
            gap: 16px !important;
        }

        .flex.flex-col.gap-2 {
            gap: 0px !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        /* Target the first div with gap-4 specifically */
        .flex.flex-col.gap-4:first-child {
            gap: 0px !important;
            margin-bottom: 0 !important;
            padding-bottom: 0 !important;
        }

        /* Add margin to map container */
        .relative.w-full.border-8 {
            margin-top: 8px !important;
        }

        /* Make triangle button smaller on mobile */
        .page-corner > svg {
            width: 80px !important;
            height: 80px !important;
        }

        .page-corner text {
            font-size: 14px !important;
        }

        .hint-cursor {
            display: none !important;
        }

        .hint-fingerprint {
            display: inline-block !important;
        }

        .hint-fingerprint svg {
            width: 32px !important;
            height: 32px !important;
        }
    }
</style>

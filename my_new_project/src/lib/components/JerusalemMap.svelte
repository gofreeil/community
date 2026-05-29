<script lang="ts">
    import { onMount } from "svelte";
    import { t } from "svelte-i18n";
    import { createEventDispatcher } from "svelte";
    import { slide } from "svelte/transition";
    import { goto } from "$app/navigation";
    import { enhance } from '$app/forms';
    import { triggerAdPopup } from "$lib/adPopupStore";
    import { items as itemsData } from "$lib/itemsData";
    import { citiesAndNeighborhoods } from "$lib/neighborhoodsData";
    import { neighborhoodState } from "$lib/neighborhoodState.svelte";
    import { getCoordsFor, jitterCoord } from "$lib/neighborhoodCoords";
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
            icon: "✡️",
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
            label: "חנויות",
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
            id: "jobs",
            label: "דרושים עובדים",
            icon: "💼",
            items: [
                { id: "job-full", label: "דרוש/ה עובד/ת למשרה מלאה" },
                { id: "job-teen", label: "עבודה לנוער בחופש" },
            ],
        },
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
    let sheetDragging = false;

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

    // ----- מצב מסך מלא לדסקטופ -----
    let isFullscreen = $state(false);

    // ----- "הגנת זכוכית" — המפה לא אינטראקטיבית עד שלוחצים עליה -----
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

    // במסך מלא — המפה תמיד אינטראקטיבית
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

    const fieldsByOption: Record<number, { descLabel: string; descPlaceholder: string; locationPlaceholder: string }> = {
        1: { descLabel: 'תיאור המצב', descPlaceholder: 'פרט את המצב — מה קרה, באיזו עזרה נדרש...', locationPlaceholder: 'רחוב, כניסה, קומה...' },
        2: { descLabel: 'פרטי הרכב', descPlaceholder: 'צבע הרכב, דגם, לוחית רישוי...', locationPlaceholder: 'היכן הרכב חונה? רחוב ומספר...' },
        3: { descLabel: 'תיאור הילד', descPlaceholder: 'גיל, לבוש, מאפיינים בולטים, מתי נעלם...', locationPlaceholder: 'איפה נראה לאחרונה? שם המקום, רחוב...' },
        4: { descLabel: 'תיאור בקשת העזרה', descPlaceholder: 'פרט מה קרה ובמה נדרשת עזרה...', locationPlaceholder: 'מיקום — רחוב, שכונה...' },
        5: { descLabel: 'תיאור הכלב', descPlaceholder: 'גזע, צבע, שם הכלב, מתי ואיפה נעלם...', locationPlaceholder: 'אזור שאבד לאחרונה...' },
    };

    function handleModalImageChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
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

    // מצב חיפוש
    let searchQuery   = $state('');
    let searchResults = $derived(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return [];
        return dbItems.filter(item =>
            item.label?.toLowerCase().includes(q) ||
            item.description?.toLowerCase().includes(q) ||
            item.category?.toLowerCase().includes(q)
        ).sort((a, b) => {
            // השכונה שלך — ראשון
            const aNeigh = a.neighborhood === neighborhoodState.neighborhood ? 0 : 1;
            const bNeigh = b.neighborhood === neighborhoodState.neighborhood ? 0 : 1;
            if (aNeigh !== bNeigh) return aNeigh - bNeigh;
            // אחר כך העיר
            const aCity = a.city === neighborhoodState.city ? 0 : 1;
            const bCity = b.city === neighborhoodState.city ? 0 : 1;
            return aCity - bCity;
        });
    });

    // פריטים מהשכונה הנוכחית — ריאקטיבי לשינויי neighborhoodState ול-selectedCategory
    let neighborhoodDbItems = $derived(
        dbItems.filter(d =>
            (d.neighborhood === neighborhoodState.neighborhood ||
                (d.neighborhood === '' && d.city === neighborhoodState.city)) &&
            (selectedCategory === "benefits" || d.category === selectedCategory)
        )
    );

    // מיפוי קטגוריה → URL של הלוח הארצי שלה (אם קיים)
    const nationalBoardUrls: Record<string, string> = {
        gemachim:    'https://national-gemach.vercel.app/',
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

    // כתובת המפה — ריאקטיבית לשינויי neighborhoodState
    let mapUrl = $derived(
        neighborhoodMaps[neighborhoodState.neighborhood] ??
        // fallback דינמי: חיפוש גוגל לפי שם שכונה + עיר מהפרופיל
        (neighborhoodState.neighborhood && neighborhoodState.city
            ? `https://maps.google.com/maps?q=${encodeURIComponent(neighborhoodState.neighborhood + ', ' + neighborhoodState.city + ', ישראל')}&output=embed&hl=iw&z=15`
            : neighborhoodMaps["קרית משה"])
    );

    // ---- מרקרים דינמיים נטועים במפה (lat/lng אמיתי) ----
    const MAX_MARKERS = 30;

    // דוגמאות mock — מוצגות בכל שכונה כל עוד אין באותה שכונה ולו פריט אמיתי אחד.
    // לחיצה על מרקר דמו מובילה אל /add/{category} כדי לעודד הוספת פריט אמיתי.
    const MOCK_ITEMS: { suffix: string; category: string; icon: string; label: string; color: string }[] = [
        { suffix: 'gemach-books', category: 'gemachim',    icon: '📚', label: 'גמ״ח ספרים',     color: 'rose' },
        { suffix: 'gemach-tools', category: 'gemachim',    icon: '🔨', label: 'גמ״ח כלי עבודה', color: 'amber' },
        { suffix: 'babysitter',   category: 'business',    icon: '👶', label: 'בייבי סיטר',     color: 'pink' },
        { suffix: 'minyan',       category: 'minyanim',    icon: '✡️', label: 'מניין שחרית',    color: 'blue' },
        { suffix: 'art-class',    category: 'education',   icon: '🎨', label: 'חוג ציור',       color: 'purple' },
        { suffix: 'giveaway',     category: 'giveaway',    icon: '🛋️', label: 'מסירת ספה',      color: 'teal' },
        { suffix: 'attraction',   category: 'attractions', icon: '🎡', label: 'גן שעשועים',     color: 'green' },
    ];

    let dynamicMarkers = $derived.by(() => {
        const inHood = dbItems.filter(d =>
            d.neighborhood === neighborhoodState.neighborhood ||
            (d.neighborhood === '' && d.city === neighborhoodState.city)
        );

        // יש פריט אמיתי אחד לפחות — מציגים רק את האמיתיים, בלי דמו
        if (inHood.length > 0) {
            const sorted = [...inHood].sort((a, b) =>
                (b.created_at || '').localeCompare(a.created_at || '')
            ).slice(0, MAX_MARKERS);

            return sorted.map(item => {
                const id = String(item.id);
                const center = getCoordsFor(item.neighborhood, item.city);
                const [lat, lng] = jitterCoord(center, id);
                return {
                    id,
                    category: item.category,
                    lat,
                    lng,
                    icon:     item.icon  || '📌',
                    label:    item.label || 'פריט',
                    color:    item.color || 'purple',
                    isMock:   false,
                };
            });
        }

        // אין פריטים אמיתיים בשכונה — מפזרים דוגמאות במעגל סביב מרכז השכונה
        const center = getCoordsFor(neighborhoodState.neighborhood, neighborhoodState.city);
        const nbId = `${neighborhoodState.city}_${neighborhoodState.neighborhood}`;
        // hash של שם השכונה — קובע את זווית ההתחלה של המעגל (כדי שלא כל השכונות יציגו אותה תבנית)
        let nbHash = 0;
        for (let i = 0; i < nbId.length; i++) nbHash = ((nbHash * 31) + nbId.charCodeAt(i)) | 0;
        const startAngle = (Math.abs(nbHash) % 360) * Math.PI / 180;
        // רדיוסים מתחלפים — חיצוני/פנימי — נראה טבעי יותר ממעגל מושלם
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
                label:  m.label,
                color:  m.color,
                isMock: true,
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

    // טיילי OSM פתוחים בחינם
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

    function buildIconHtml(icon: string, label: string, color: string, isMock = false): string {
        const hex = colorHex[color] ?? '#9333ea';
        const safeLabel = label.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const mockClass = isMock ? ' jmap-pin--mock' : '';
        return `
            <div class="jmap-pin${mockClass}">
                <div class="jmap-pin-icon">${icon}</div>
                <div class="jmap-pin-label" style="background:${hex}">${safeLabel}</div>
            </div>
        `;
    }

    function rebuildMarkers() {
        if (!leafletL || !leafletMap || !mapMarkerLayer) return;
        mapMarkerLayer.clearLayers();
        for (const m of dynamicMarkers) {
            if (!isMarkerVisible(m.category)) continue;
            const html = buildIconHtml(m.icon, m.label, m.color, m.isMock);
            const divIcon = leafletL.divIcon({
                className: 'jmap-pin-wrap',
                html,
                iconSize:   [120, 60],
                iconAnchor: [60, 60],
            });
            const marker = leafletL.marker([m.lat, m.lng], { icon: divIcon, riseOnHover: true });
            marker.on('click', () => {
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
            mapMarkerLayer.addLayer(marker);
        }
    }

    function recenterMap() {
        if (!leafletMap) return;
        const center = getCoordsFor(neighborhoodState.neighborhood, neighborhoodState.city);
        leafletMap.setView(center, 14, { animate: true });
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

        leafletL.tileLayer(TILE_URL, {
            attribution: TILE_ATTR,
            maxZoom: 19,
        }).addTo(leafletMap);

        mapMarkerLayer = leafletL.layerGroup().addTo(leafletMap);
        rebuildMarkers();

        setTimeout(() => leafletMap?.invalidateSize?.(), 0);
        setTimeout(() => leafletMap?.invalidateSize?.(), 250);

        // ניקוי כשה-element מנותק
        return () => {
            try { leafletMap?.remove?.(); } catch {}
            leafletMap = null;
            mapMarkerLayer = null;
        };
    });

    // ריאקטיב: כש-dynamicMarkers משתנה (פריטים חדשים, החלפת קטגוריה) — לבנות מחדש
    $effect(() => {
        // תלות מפורשת
        void dynamicMarkers;
        void selectedCategory;
        rebuildMarkers();
    });

    // ריאקטיב: כשהמשתמש מחליף שכונה — למרכז את המפה מחדש
    $effect(() => {
        void neighborhoodState.neighborhood;
        void neighborhoodState.city;
        recenterMap();
    });

    // כש-fullscreen משתנה — Leaflet צריך לעדכן את גודל המיכל
    $effect(() => {
        void isFullscreen;
        if (leafletMap) {
            setTimeout(() => leafletMap.invalidateSize(), 100);
        }
    });

    let categoryButtonsWrapperRef: HTMLElement;

    function handleCategoryClick(categoryId: string) {
        selectedCategory = categoryId;
        // בתצוגת רשימה — פתח אוטומטית את הקטגוריה הנבחרת
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

    const helpOptions = [
        { id: 3, text: "הלך ילד לאיבוד", icon: "👶" },
        { id: 5, text: "אבד כלב", icon: "🐕" },
        { id: 1, text: "מבוגר זקוק לעזרה", icon: "👴" },
        { id: 2, text: "זקוק לעזרה עם הרכב להתנעה", icon: "🚗" },
        { id: 4, text: "אחר - כתוב את העזרה הזקוקה לך", icon: "✍️" },
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
                isAutoSwitching = true; // hint cycle 1 — מציג לחיצה לפני המעבר לרשימה

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
                        isAutoSwitching = true; // hint cycle 2 — לחיצה לפני החזרה למפה
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
                raisedHandMessage = option?.text || "";
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
                    const customHelp = prompt("תאר את העזרה שאתה זקוק לה:");
                    if (customHelp) {
                        raisedHandMessage = customHelp;
                        successMessageText = `בקשת עזרה נשלחה: ${customHelp}`;
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
                    successMessageText = `בקשת עזרה נשלחה: ${option?.text}`;
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
            successMessageText = "תודה! שמחים שהקהילה עזרה 🎉";
            showSuccessMessage = true;
            setTimeout(() => {
                showSuccessMessage = false;
            }, 3000);
        } else if (response === "other") {
            successMessageText = "תודה על המשוב! 👍";
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

{#if isFullscreen}
    <!-- שכבה כהה מאחורי המסך המלא -->
    <button
        type="button"
        aria-label="סגור מסך מלא"
        onclick={closeFullscreen}
        class="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm cursor-default"
    ></button>
{/if}

<div
    class={isFullscreen
        ? 'jmap-fullscreen fixed inset-2 md:inset-4 z-50 flex flex-col gap-2 bg-[#070b14] rounded-2xl shadow-2xl shadow-purple-500/30 overflow-hidden p-3'
        : 'flex flex-col gap-4'}
>
    {#if isFullscreen}
        <button
            type="button"
            onclick={closeFullscreen}
            aria-label="סגור מסך מלא"
            title="סגור (Esc)"
            class="absolute top-3 left-3 z-[60] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-xl font-bold flex items-center justify-center transition-all backdrop-blur-sm border border-white/20"
        >
            ✕
        </button>
    {/if}
    <div class="flex flex-col gap-4">
        <!-- כותרת שכונה - הוסרה לדף הראשי -->

        <div class="flex flex-col gap-2">
            <!-- Buttons Container -->
            <div class="relative" bind:this={categoryButtonsWrapperRef}>
                <!-- Mobile: שורה אחת קומפקטית — סינון פעיל + כפתור פתיחת bottom sheet -->
                <div class="md:hidden px-3 py-2 w-full flex items-center gap-2">
                    <!-- שבב המראה את הסינון הפעיל (מימין) -->
                    {#each [categories.find(c => c.id === selectedCategory) ?? categories[0]] as active}
                        <button
                            type="button"
                            onclick={() => (showCategorySheet = true)}
                            class="flex items-center gap-1 shrink-0 max-w-[45%] {active.id === 'benefits'
                                ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 border-yellow-500'
                                : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-500'}
                                px-2.5 py-2 rounded-full text-xs font-bold shadow-lg active:scale-95 border whitespace-nowrap overflow-hidden"
                        >
                            {#if active.icon?.startsWith('/')}
                                <img src={active.icon} class="w-5 h-5 shrink-0" alt={active.label} />
                            {:else}
                                <span class="text-base leading-none shrink-0">{active.icon}</span>
                            {/if}
                            <span class="truncate">{active.label}</span>
                            <span class="text-[10px] opacity-75 shrink-0">▾</span>
                        </button>
                    {/each}
                    <!-- כפתור פתיחת חלונית סינון (משמאל) -->
                    <button
                        type="button"
                        onclick={() => (showCategorySheet = true)}
                        class="flex items-center justify-center gap-1.5 flex-1 min-w-0 bg-gradient-to-br from-purple-600 to-blue-600 text-white px-3 py-2 rounded-full text-xs font-bold shadow-lg active:scale-95 border border-purple-400"
                        aria-label="פתח סינון קטגוריות"
                    >
                        <span class="text-base leading-none shrink-0">🎛️</span>
                        <span class="truncate">בחר קטגוריה</span>
                    </button>
                </div>

                <!-- Bottom Sheet: כל הקטגוריות -->
                {#if showCategorySheet}
                    <!-- Backdrop -->
                    <div
                        class="md:hidden fixed inset-0 bg-black/60 z-[10000] backdrop-blur-sm"
                        role="presentation"
                        onclick={() => (showCategorySheet = false)}
                    ></div>
                    <!-- Sheet -->
                    <div
                        class="md:hidden fixed top-1/2 left-3 right-3 z-[10001] bg-[#0f172a] border-2 border-purple-500 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col"
                        style="animation: sheetFadeIn 0.25s ease-out; transform: translateY(calc(-50% + {sheetDragY}px)); transition: {sheetDragging ? 'none' : 'transform 0.2s ease-out'};"
                        role="dialog"
                        aria-label="סינון קטגוריות"
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
                            aria-label="גרור למטה כדי לסגור"
                        >
                            <div class="w-16 h-1.5 rounded-full bg-white/40 mb-2"></div>
                            <div class="w-full px-4 flex items-center justify-end">
                                <h3 class="text-white font-bold text-lg">סנן את היתרונות הדרושים לך</h3>
                            </div>
                        </div>
                        <!-- Grid of all categories -->
                        <div class="px-3 pb-4 pt-2 overflow-y-auto">
                            <!-- שורה 1: 'כל היתרונות' לבד וממורכז -->
                            <div class="flex justify-center mb-2">
                                <button
                                    onclick={() => { handleCategoryClick(benefitsCat.id); showCategorySheet = false; }}
                                    class="flex flex-col items-center justify-center gap-1 {selectedCategory === benefitsCat.id
                                        ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 border-yellow-500 ring-2 ring-yellow-300'
                                        : 'bg-gradient-to-br from-yellow-400 to-orange-500 text-gray-900 border-yellow-500'} px-6 py-3 rounded-xl text-sm font-bold shadow-md active:scale-95 border map-category-button min-h-[72px] w-[42%]"
                                >
                                    <span class="text-3xl leading-none">{benefitsCat.icon}</span>
                                    <span class="leading-tight text-center">{benefitsCat.label}</span>
                                </button>
                            </div>
                            <!-- שורה 2+: 16 קטגוריות בגריד 4×4 סימטרי -->
                            <div class="grid grid-cols-4 gap-1.5">
                                {#each otherCats as category}
                                    <button
                                        onclick={() => { handleCategoryClick(category.id); showCategorySheet = false; }}
                                        class="flex flex-col items-center justify-center gap-1 {selectedCategory === category.id
                                            ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white border-purple-500 ring-2 ring-purple-300'
                                            : 'bg-gradient-to-br from-white to-gray-200 text-gray-900 border-purple-300'} px-1 py-2.5 rounded-xl text-xs font-bold shadow-md active:scale-95 border map-category-button min-h-[70px]"
                                    >
                                        {#if category.icon?.startsWith('/')}
                                            <img src={category.icon} class="w-7 h-7" alt={category.label} />
                                        {:else}
                                            <span
                                                class="text-2xl leading-none"
                                                style={category.id === "realestate"
                                                    ? "letter-spacing: -0.25em; margin-left: 0.15em; display: inline-block;"
                                                    : ""}>{category.icon}</span
                                            >
                                        {/if}
                                        <span class="leading-tight text-center">{category.label}</span>
                                    </button>
                                {/each}
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- Desktop: שורה אחת flex-wrap (ללא שינוי) -->
                <div
                    class="hidden md:flex category-buttons-container flex-wrap justify-between gap-x-2 gap-y-3 p-2 w-full"
                >
                    {#each categories as category, index}
                        <button
                            onclick={() => handleCategoryClick(category.id)}
                            title="לחץ כדי לסנן במפה"
                            class="flex items-center justify-center flex-1 {category.id === 'rides' ? 'gap-1 px-2 min-w-[19%]' : category.id === 'education' ? 'gap-1.5 px-3 min-w-[11%]' : 'gap-1.5 px-3 min-w-[15%]'} {selectedCategory === category.id
                                ? category.id === 'benefits'
                                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500 ring-2 ring-yellow-300'
                                    : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-purple-500 ring-2 ring-purple-300'
                                : category.id === 'benefits'
                                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500'
                                  : 'bg-gradient-to-br from-white to-gray-200 hover:from-blue-100 hover:to-white text-gray-900 border-purple-300'} py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all hover:scale-105 border shrink-0 whitespace-nowrap map-category-button"
                        >
                            {#if category.icon?.startsWith('/')}
                                <img src={category.icon} class="w-5 h-5 inline-block" alt={category.label} />
                            {:else}
                                <span
                                    class="text-base icon"
                                    style={category.id === "realestate"
                                        ? "letter-spacing: -0.25em; margin-left: 0.15em; display: inline-block;"
                                        : ""}>{category.icon}</span
                                >
                            {/if}
                            {category.label}
                        </button>
                    {/each}
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
            aria-label={viewMode === "map" ? "עבור לתצוגת רשימה" : "עבור לתצוגת מפה"}
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
                    {viewMode === "map" ? "עבור לתצוגת" : "עבור לתצוגת"}
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
                    {viewMode === "map" ? "רשימה" : "מפה"}
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
                aria-label="לחץ פעמיים לפתיחה במסך מלא"
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
                                        🚨 בקשת עזרה פעילה
                                    </p>
                                    <p class="text-lg font-bold">
                                        {raisedHandMessage}
                                    </p>
                                    <p class="text-sm text-yellow-200 mt-2">
                                        ממתין לעזרה מהקהילה...
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}

                <!-- מפת Leaflet — מרקרים אמיתיים שזזים יחד עם המפה -->
                <div
                    bind:this={mapEl}
                    onmouseleave={deactivateMap}
                    class="w-full h-full relative z-0"
                    aria-label="מפת השכונה"
                ></div>

                <!-- "הגנת זכוכית" — שכבת overlay מעל המפה כשהיא לא אינטראקטיבית -->
                {#if !isMapInteractive}
                    <button
                        type="button"
                        onclick={activateMap}
                        class="absolute inset-0 z-10 w-full h-full bg-transparent cursor-pointer flex items-center justify-center group"
                        aria-label="לחץ להפעלת המפה"
                    >
                        <div class="bg-black/50 backdrop-blur-sm text-white px-6 py-3 rounded-xl border border-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                            <span class="text-sm font-bold">🖱️ לחץ להפעלת המפה</span>
                        </div>
                    </button>
                {/if}

                <!-- Badge לפריטים חדשים בשכונה + קישור ללוח הארצי -->
                {#if selectedCategory === 'giveaway'}
                    <!-- כשנבחרת "למסירה" — אותו כפתור מוביל ללוח הארצי -->
                    <button
                        type="button"
                        onclick={(e) => { e.stopPropagation(); goto('/giveaways'); }}
                        class="absolute bottom-4 left-4 z-20 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 hover:from-amber-300 hover:via-orange-400 hover:to-red-400 text-white text-sm font-black px-4 py-2 rounded-xl shadow-lg border border-orange-300/60 transition-all hover:scale-105 flex items-center gap-2 text-center leading-tight"
                        title="עבור ללוח הארצי של פריטים למסירה"
                    >
                        <img src="/images/delivery.png" alt="" class="w-5 h-5 object-contain" />
                        <span class="flex flex-col items-center">
                            <span>{neighborhoodDbItems.length} למסירה בשכונה</span>
                            <span>← ללוח הארצי</span>
                        </span>
                    </button>
                {:else if neighborhoodDbItems.length > 0 || nationalBoardUrl}
                    <div class="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2">
                        {#if neighborhoodDbItems.length > 0}
                            <button
                                onclick={() => handleViewToggle(false)}
                                class="bg-green-600/90 backdrop-blur-sm text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg border border-green-400/50 hover:bg-green-500/90 transition-all hover:scale-105"
                                title="עבור לרשימה לצפייה בפריטים החדשים"
                            >
                                🆕 {neighborhoodDbItems.length} פריטים ב{neighborhoodState.neighborhood} — לחץ לצפייה
                            </button>
                        {/if}
                        {#if nationalBoardUrl}
                            <a
                                href={nationalBoardUrl}
                                target={nationalBoardUrl.startsWith('http') ? '_blank' : '_self'}
                                rel={nationalBoardUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                                onclick={(e) => e.stopPropagation()}
                                class="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 hover:from-amber-300 hover:via-orange-400 hover:to-red-400 text-white text-sm font-black px-4 py-2 rounded-xl shadow-lg border border-orange-300/60 transition-all hover:scale-105 flex flex-col items-center text-center leading-tight"
                                title="עבור ללוח הארצי"
                            >
                                <span>{neighborhoodDbItems.length} פריטים בשכונה</span>
                                <span>← ללוח הארצי</span>
                            </a>
                        {/if}
                    </div>
                {/if}
            </div>
        {:else if viewMode === "list"}
            <!-- תצוגת רשימה -->
            <div
                class="w-full h-[350px] md:h-[450px] overflow-y-auto p-3 md:p-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20"
                style="border-radius: 20px;"
            >
                <div class="space-y-2 md:space-y-3">
                    {#each categories.filter((cat) => cat.id !== "benefits" && (selectedCategory === "benefits" || cat.id === selectedCategory)) as category}
                        {@const categoryDbItems = dbItems.filter(d =>
                            d.category === category.id &&
                            (d.neighborhood === neighborhoodState.neighborhood ||
                             (d.neighborhood === '' && d.city === neighborhoodState.city))
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
                                                src="/images/delivery.png"
                                                alt=""
                                                class="w-7 h-7 md:w-8 md:h-8 object-contain"
                                            />
                                        {:else if category.icon?.startsWith('/')}
                                            <img
                                                src={category.icon}
                                                alt={category.label}
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
                                            >{category.label}</span
                                        >
                                        {#if categoryDbItems.length > 0}
                                            <span class="bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                🆕 {categoryDbItems.length} חדש
                                            </span>
                                        {/if}
                                        {#if hasNationalPage}
                                            <!-- קישור ארצי — ליד שם הקטגוריה בשורת הכותרת -->
                                            <span
                                                role="link"
                                                tabindex="0"
                                                onclick={(e) => { e.stopPropagation(); goto(`/national/${category.id}`); }}
                                                onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); goto(`/national/${category.id}`); } }}
                                                class="text-[11px] text-purple-400 hover:text-purple-300 cursor-pointer
                                                       underline underline-offset-2 decoration-purple-500/40 hover:decoration-purple-400
                                                       transition-colors font-medium whitespace-nowrap"
                                            >← לרשימה הארצית</span>
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
                                            >← לרשימה הארצית</span>
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
                                            >← לרשימה הארצית</span>
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
                                            >← ללוח שבת שלום</span>
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
                                                title="לוח חוגים ארצי"
                                            >
                                                <span class="bg-white/25 px-1.5 rounded-full text-[10px] font-black">{totalItems}</span>
                                                ← ללוח חוגים ארצי
                                            </span>
                                        {/if}
                                    </div>
                                    <div
                                        class="flex items-center gap-2 md:gap-3"
                                    >
                                        <span
                                            class="text-purple-400 text-sm md:text-xs md:text-sm"
                                            >{totalItems} פריטים</span
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
                                                    >• {item.label}</span
                                                >
                                                {#if 'paid' in item}
                                                    <span
                                                        class="flex-shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border {item.paid
                                                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                                            : 'bg-green-500/20 text-green-400 border-green-500/40'}"
                                                    >
                                                        {item.paid ? 'בתשלום' : 'חינם'}
                                                    </span>
                                                {/if}
                                            </span>
                                            <div
                                                class="flex-shrink-0 bg-purple-600 group-hover/item:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
                                            >
                                                צפה בפרטים
                                            </div>
                                        </a>
                                    {/each}

                                    <!-- פריטים מה-DB (חדשים) -->
                                    {#each categoryDbItems as dbItem}
                                        <a
                                            href="/items/{dbItem.id}"
                                            class="bg-green-900/15 border border-green-500/25 rounded-lg p-3 hover:bg-green-900/25 hover:border-green-500/40 transition-all cursor-pointer flex items-center justify-between group/item"
                                        >
                                            <div class="flex items-center gap-2 min-w-0">
                                                <span class="text-lg flex-shrink-0">{dbItem.icon}</span>
                                                <div class="min-w-0">
                                                    <span class="text-white text-sm block truncate">• {dbItem.label}</span>
                                                    {#if dbItem.neighborhood}
                                                        <span class="text-gray-500 text-xs">{dbItem.neighborhood}</span>
                                                    {/if}
                                                </div>
                                                <span class="bg-green-500/20 text-green-400 text-[10px] font-black px-1.5 py-0.5 rounded flex-shrink-0">חדש</span>
                                            </div>
                                            <div
                                                class="bg-green-700 group-hover/item:bg-green-600 text-white px-3 py-1 rounded text-xs font-bold transition-colors flex-shrink-0 mr-2"
                                            >
                                                צפה בפרטים
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
                                        <img src={category.icon} class="w-6 h-6 md:w-7 md:h-7 inline-block" alt={category.label} />
                                    {:else}
                                        <span class="text-xl md:text-2xl">{category.icon}</span>
                                    {/if}
                                    <span
                                        class="text-white font-bold text-xs md:text-sm"
                                        >{category.label}</span
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
                <!-- שדה חיפוש -->
                <div class="flex gap-2 mb-4 mt-6 max-w-sm mx-auto w-full">
                    <input
                        bind:value={searchQuery}
                        type="text"
                        placeholder="חפש חוג, גמ&quot;ח, שמרטפ, מניין..."
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

                <!-- מצב ריק — תמונה ללא גלילה -->
                {#if !searchQuery.trim()}
                    <div class="text-center py-4 text-gray-500">
                        <div class="text-4xl mb-3">🔍</div>
                        <p class="text-sm">הקלד מה אתה מחפש</p>
                    </div>
                    <div class="flex justify-center mt-3">
                        <img src="/images/vaadei-search.png" alt="" class="max-w-[320px] w-full rounded-xl opacity-80" />
                    </div>
                {:else}
                <!-- תוצאות -->
                <div class="flex-1 overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-transparent">
                    {#if false}
                    {:else if searchResults().length === 0}
                        <div class="text-center py-12 text-gray-500">
                            <div class="text-4xl mb-3">😕</div>
                            <p class="text-sm">לא נמצאו תוצאות</p>
                        </div>
                    {:else}
                        <p class="text-xs text-gray-500 mb-2">{searchResults().length} תוצאות</p>
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
                                    <span class="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full flex-shrink-0">השכונה שלך</span>
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


        <!-- כפתור חיפוש - פינה ימנית עליונה -->
        <div class="absolute right-4 z-50" style="top: -14px;">
            <button
                onclick={() => { viewMode = viewMode === 'search' ? 'list' : 'search'; searchQuery = ''; }}
                title="חיפוש"
                class="flex items-center gap-1.5 bg-[#0f172a] border-2 {viewMode === 'search' ? 'border-purple-500 text-purple-300' : 'border-white/20 text-white/70'} hover:border-purple-500/70 hover:text-white px-3 py-1.5 rounded-lg font-bold text-sm shadow-xl transition-all hover:scale-105"
            >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7"/>
                    <path d="m21 21-4.35-4.35"/>
                </svg>
                <span class="text-xs hidden md:inline">חיפוש</span>
            </button>
        </div>

        <!-- כפתור הוסף יתרון - בחלק העליון -->
        <div
            class="absolute left-1/2 transform -translate-x-1/2 z-50"
            style="top: -10px;"
        >
            <button
                onclick={handleAddAdvantage}
                title={showAddMenu ? "סגור תפריט" : "הוסף יתרון חדש לשכונה"}
                class="relative group overflow-hidden bg-gradient-to-br {showAddMenu
                    ? 'from-green-900 via-emerald-900 to-teal-950'
                    : 'from-green-500 via-emerald-500 to-teal-600'} hover:{showAddMenu
                    ? 'from-green-800 via-emerald-800 to-teal-900'
                    : 'from-green-400 via-emerald-400 hover:to-teal-500'} text-white px-3 py-1.5 rounded-lg font-bold text-base shadow-xl transition-all hover:scale-105 border-2 {showAddMenu
                    ? 'border-red-500'
                    : 'border-purple-600'}"
            >
                <div
                    class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"
                ></div>
                <div class="relative flex flex-row items-center justify-center gap-1.5 whitespace-nowrap">
                    <span class="text-[10px] leading-none">{showAddMenu ? "✖️" : "➕"}</span>
                    <span class="leading-none">{showAddMenu ? "סגור" : "הוסף"}</span>
                </div>
            </button>
        </div>

        <!-- כפתור הרמת יד מיוחד - בתחתית המפה -->
        <div
            class="absolute -bottom-8 md:-bottom-8 left-1/2 transform -translate-x-1/2 z-50"
        >
            {#if !handRaised}
                <!-- כפתור הרמת יד רגיל -->
                <button
                    onclick={() => (showHelpMenu = !showHelpMenu)}
                    title="בקש עזרה מהקהילה"
                    class="relative group overflow-hidden bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 hover:from-red-400 hover:via-pink-400 hover:to-purple-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base shadow-xl transition-all hover:scale-105 border-2 md:border-4 border-purple-600"
                >
                    <div
                        class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"
                    ></div>
                    <div class="relative flex items-center gap-2 md:gap-3">
                        <span class="text-xl md:text-2xl">✋</span>
                        <span>הרמת יד</span>
                    </div>
                </button>
            {:else}
                <!-- כפתור יד מורמת -->
                <button
                    onclick={handleLowerHand}
                    title="הורד את היד"
                    class="relative group overflow-hidden bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 hover:from-yellow-400 hover:via-orange-400 hover:to-red-500 text-white px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-sm md:text-base shadow-xl transition-all hover:scale-105 border-2 md:border-4 border-yellow-400 animate-pulse"
                >
                    <div class="relative flex items-center gap-2 md:gap-3">
                        <span class="text-xl md:text-2xl">🙋</span>
                        <span>יד מורמת - לחץ להורדה</span>
                    </div>
                </button>
            {/if}

            <!-- תפריט עזרה -->
            {#if showHelpMenu}
                <div
                    class="fixed md:absolute bottom-24 md:bottom-full left-1/2 transform -translate-x-1/2 md:mb-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl border-2 border-purple-600 overflow-hidden animate-slideDown z-[100]"
                >
                    <div
                        class="bg-gradient-to-r from-red-500 to-pink-500 p-3 text-center"
                    >
                        <h3 class="text-white font-bold text-lg">פתח קריאה</h3>
                    </div>
                    <div class="p-2">
                        {#each helpOptions as option}
                            <button
                                onclick={() => handleHelpRequest(option.id)}
                                class="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-colors text-right border-b border-gray-200 last:border-b-0"
                            >
                                <span class="text-2xl">{option.icon}</span>
                                <span class="text-gray-800 font-medium text-sm"
                                    >{option.text}</span
                                >
                            </button>
                        {/each}
                    </div>
                    <button
                        onclick={() => (showHelpMenu = false)}
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 text-sm font-bold transition-colors"
                    >
                        ביטול
                    </button>
                </div>
            {/if}

            <!-- סקר הורדת יד -->
            {#if showSurvey}
                <div
                    class="fixed md:absolute bottom-24 md:bottom-full left-1/2 transform -translate-x-1/2 md:mb-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-2xl border-2 border-yellow-600 overflow-hidden animate-slideDown z-[100]"
                >
                    <div
                        class="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 text-center"
                    >
                        <h3 class="text-white font-bold text-lg">
                            איך הבעיה נפתרה?
                        </h3>
                    </div>
                    <div class="p-4 space-y-3">
                        <button
                            onclick={() => handleSurveyResponse("community")}
                            class="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border-2 border-green-300"
                        >
                            <span class="text-3xl">🤝</span>
                            <div class="text-right">
                                <p class="font-bold text-green-800">
                                    הקהילה עזרה לי
                                </p>
                                <p class="text-xs text-green-600">
                                    תודה לכולם!
                                </p>
                            </div>
                        </button>
                        <button
                            onclick={() => handleSurveyResponse("other")}
                            class="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-300"
                        >
                            <span class="text-3xl">✅</span>
                            <div class="text-right">
                                <p class="font-bold text-blue-800">
                                    הבעיה נפתרה אחרת
                                </p>
                                <p class="text-xs text-blue-600">
                                    הכל בסדר עכשיו
                                </p>
                            </div>
                        </button>
                    </div>
                    <button
                        onclick={() => handleSurveyResponse("cancel")}
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 text-sm font-bold transition-colors"
                    >
                        ביטול
                    </button>
                </div>
            {/if}
        </div>

        <!-- Zoom Buttons בתחתית ימין -->
        {#if isFullscreen}
            <div class="absolute bottom-3 right-3 z-[60] flex flex-col gap-2">
                <button
                    type="button"
                    onclick={zoomIn}
                    aria-label="הגדל"
                    title="הגדל (Zoom In)"
                    class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-lg font-bold flex items-center justify-center transition-all shadow-lg border border-purple-400 hover:scale-110"
                >
                    +
                </button>
                <button
                    type="button"
                    onclick={zoomOut}
                    aria-label="הקטן"
                    title="הקטן (Zoom Out)"
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
        הקהילה עזרה לפתור {$communityHelpCount} קריאות בשנת {currentYear}
    </div>
{/if}

<!-- ===== מודל קריאת עזרה ===== -->
{#if showRaiseHandModal}
    <div
        class="fixed inset-0 z-[9999] flex items-start justify-center pt-6 pb-8 px-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
        role="dialog"
        aria-modal="true"
        onclick={(e) => { if (e.target === e.currentTarget) showRaiseHandModal = false; }}
    >
        <div class="w-full max-w-lg" onclick={(e) => e.stopPropagation()} dir="rtl">

            {#if modalSubmitted}
                <!-- מסך הצלחה -->
                <div class="bg-[#1e293b] border border-white/10 rounded-2xl p-8 shadow-2xl text-center mt-8">
                    <div class="text-6xl mb-4">✅</div>
                    <h2 class="text-xl font-black text-white mb-3">הקריאה נשלחה לקהילה!</h2>
                    <p class="text-gray-400 text-sm mb-6">אנחנו על זה — הקהילה תעזור בהקדם</p>
                    <button
                        onclick={() => showRaiseHandModal = false}
                        class="w-full py-3 rounded-xl font-black text-sm bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 text-white shadow-lg transition-all"
                    >
                        סגור
                    </button>
                </div>
            {:else}
                <!-- כותרת -->
                <div class="text-center mb-6 mt-4">
                    <div class="text-5xl mb-3">{helpOptions.find(o => o.id === modalOptionId)?.icon ?? '🆘'}</div>
                    <h1 class="text-2xl font-black text-white mb-1">{helpOptions.find(o => o.id === modalOptionId)?.text ?? 'קריאת עזרה'}</h1>
                    <p class="text-gray-400 text-sm">מלא את הפרטים ונעדכן את הקהילה מיד</p>
                    <div class="mt-3 inline-flex items-center gap-1.5 bg-red-500/10 border border-red-500/30 rounded-full px-4 py-1.5 text-xs font-bold text-red-400">
                        🆘 קריאת עזרה לקהילה
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
                                    modalError = (result.data as Record<string, string>)?.error ?? 'שגיאה, נסה שוב';
                                }
                            };
                        }}
                        class="space-y-5"
                    >
                        <input type="hidden" name="option_id" value={modalOptionId} />

                        <!-- תיאור -->
                        <div>
                            <label for="modal-rh-desc" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                {fieldsByOption[modalOptionId]?.descLabel ?? 'תיאור המצב'} *
                            </label>
                            <textarea
                                id="modal-rh-desc"
                                name="description"
                                rows="4"
                                required
                                placeholder={fieldsByOption[modalOptionId]?.descPlaceholder ?? ''}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600 resize-none"
                            ></textarea>
                        </div>

                        <!-- מיקום -->
                        <div>
                            <label for="modal-rh-location" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                מיקום *
                            </label>
                            <input
                                id="modal-rh-location"
                                name="location"
                                type="text"
                                required
                                placeholder={fieldsByOption[modalOptionId]?.locationPlaceholder ?? 'מיקום...'}
                                class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                            />
                        </div>

                        <!-- תמונה -->
                        <div>
                            <p class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                תמונה (אופציונלי)
                            </p>
                            {#if modalImagePreview}
                                <div class="relative w-full rounded-xl overflow-hidden border border-white/10">
                                    <img src={modalImagePreview} alt="תצוגה מקדימה" class="w-full max-h-52 object-contain bg-black/30" />
                                    <button
                                        type="button"
                                        onclick={() => { modalImageBase64 = ''; modalImagePreview = ''; }}
                                        class="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors"
                                    >✕</button>
                                </div>
                            {:else}
                                <label class="flex flex-col items-center justify-center gap-2 w-full h-24 rounded-xl border-2 border-dashed border-white/15 hover:border-red-500/50 bg-white/3 hover:bg-red-900/10 cursor-pointer transition-all">
                                    <span class="text-2xl">📷</span>
                                    <span class="text-gray-400 text-sm font-bold">לחץ להעלאת תמונה</span>
                                    <input type="file" accept="image/*" class="hidden" onchange={handleModalImageChange} />
                                </label>
                            {/if}
                            <input type="hidden" name="image_base64" value={modalImageBase64} />
                        </div>

                        <!-- יצירת קשר -->
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="modal-rh-contact" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                    שם ליצירת קשר
                                </label>
                                <input
                                    id="modal-rh-contact"
                                    name="contact"
                                    type="text"
                                    placeholder="שם פרטי"
                                    class="w-full bg-white/5 border border-white/10 focus:border-red-500/50 rounded-xl px-4 py-3 text-white text-sm outline-none transition-colors placeholder:text-gray-600"
                                />
                            </div>
                            <div>
                                <label for="modal-rh-phone" class="block text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">
                                    טלפון *
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
                                שולח קריאת עזרה...
                            {:else}
                                ✋ שלח קריאת עזרה לקהילה
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
                        ✕ סגור
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
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
    :global(.jmap-pin) {
        text-align: center;
        cursor: pointer;
        transition: transform 0.15s ease;
    }
    :global(.jmap-pin:hover) {
        transform: scale(1.1);
    }
    :global(.jmap-pin-icon) {
        font-size: 1.875rem;
        line-height: 1;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));
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
    /* מרקרי דוגמה — האייקון נשאר ברור, רק התווית הטקסטואלית מקבלת שקיפות + מסגרת מקווקווית */
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
    /* z-index לעטיפת ה-Leaflet במצב מסך מלא */
    :global(.leaflet-container) {
        font-family: inherit;
        background: #1a2233;
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

    iframe {
        filter: contrast(1.1);
    }

    /* Hide Google Maps controls */
    iframe {
        pointer-events: auto;
    }

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

<script lang="ts">
    import { onMount } from 'svelte';
    
    const categories = [
        { id: "benefits", label: "כל היתרונות", icon: "⭐" },
        { id: "gemachim", label: 'גמ"חים', icon: "🎁", items: ["גמ\"ח ספרים", "גמ\"ח כלים", "גמ\"ח ציוד לתינוקות", "גמ\"ח בגדים"] },
        { id: "giveaway", label: "למסירה", icon: "📦", items: ["רהיטים", "מוצרי חשמל", "ספרים", "בגדים", "צעצועים"] },
        { id: "business", label: "בייבי סיטר", icon: "👶", items: ["בייבי סיטר בשעות הערב", "בייבי סיטר סופי שבוע", "בייבי סיטר קבוע"] },
        { id: "minyanim", label: "יהדות", icon: "✡️", items: ["מניינים לתפילה", "שיעורי תורה", "מקוואות", "בתי כנסת"] },
        { id: "education", label: "חוגים", icon: "🎨", items: ["חוגי ספורט", "חוגי אומנות", "חוגי מוזיקה", "חוגי מדעים"] },
        { id: "realestate", label: "בתי הארחה לשבת", icon: "🏠", items: ["בתי הארחה משפחתיים", "בתי הארחה לזוגות", "בתי הארחה ליחידים"] },
        { id: "security", label: "צימרים", icon: "🏡", items: ["צימרים זוגיים", "צימרים משפחתיים", "צימרים עם בריכה"] },
        { id: "kids", label: "לילדים", icon: "🧒", items: ["גני משחקים", "פעילויות לילדים", "ספריות לילדים", "מועדוניות"] },
        { id: "shops", label: "חנויות", icon: "🏪", items: ["מכולת", "מאפייה", "בית מרקחת", "חנות בגדים", "דואר", "בנקים", "כספומט"] },
        { id: "restaurants", label: "מסעדות", icon: "🍽️", items: ["מסעדה", "מזון מהיר"] },
        { id: "transport", label: "טרמפים", icon: "🚗", items: ["נוסע קבוע ל...", "מציע טרמפ", "דרוש טרמפ"] },
    ];

    let viewMode: 'map' | 'list' | 'add' = 'map';
    let isFlipping = false;
    let expandedCategories: Set<string> = new Set();
    let isLoggedIn = false; // במציאות זה יבוא מניהול משתמשים
    let showHelpMenu = false;
    let showWaves = false;
    let showSuccessMessage = false;
    let successMessageText = '';
    let isMouseOver = false;
    let handRaised = false;
    let showSurvey = false;
    let raisedHandMessage = '';
    let raisedHandIcon = '';
    let selectedCategory = 'benefits'; // קטגוריה נבחרת
    let autoSwitchInterval: number | null = null;
    let isAutoSwitching = false;
    let showNeighborhoodsMenu = false;
    let selectedNeighborhood = 'קרית משה';
    let selectedNeighborhoodCity = 'ירושלים';
    let selectedCity = '';

    // מיפוי שכונות לכתובות Google Maps
    const neighborhoodMaps: Record<string, string> = {
        // ירושלים
        'קרית משה': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.8864700000003!2d35.21371!3d31.768319!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d7d634c1f8b9%3A0x1028fca4a63b44a!2z15nXqNeV16nXnNep150!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'רחביה': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3390.5!2d35.2137!3d31.7683!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d6df05982a2b%3A0x6f71c4d0e73b7e0a!2z16jXl9eR15nXlA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'גבעת שאול': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3389.2!2d35.1937!3d31.7883!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d6c234567890%3A0x1234567890abcdef!2z15ble16LXqiDXqNeqSDXqdei15XXnA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'רמות': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3387.8!2d35.2337!3d31.8083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d5e123456789%3A0x9876543210fedcba!2z16jXnteV16o!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'גילה': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3393.1!2d35.2437!3d31.7483!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d8f987654321%3A0xabcdef1234567890!2z15ble15nXnNeU!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'קטמון': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3392.3!2d35.2237!3d31.7583!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d7f456789012%3A0x2468ace013579bdf!2z16fXmNeY157XldefXnA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'בקעה': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.5!2d35.2037!3d31.7683!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d6e789012345%3A0x13579bdf2468ace0!2z15HXp16LXlNeU!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'מעלות דפנה': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3388.7!2d35.2537!3d31.7983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d5d012345678%3A0xfedcba0987654321!2z157Xotec15XXqiDXk9ek16DXlA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        
        // תל אביב
        'רמת אביב': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3378.2!2d34.7937!3d32.1183!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4ca6193b7c1f%3A0x8b5e5b5e5b5e5b5e!2z16jXnteqINeQ15HXmdeR!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'פלורנטין': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3381.5!2d34.7637!3d32.0583!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4b36e5f6789a%3A0x1a2b3c4d5e6f7890!2z16TXnNeV16jXoNeY15nXnQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'נווה צדק': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3381.8!2d34.7537!3d32.0483!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4b2f123456ab%3A0xabcdef0123456789!2z16DXldeV15Ug16bXk9en!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'יפו העתיקה': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3382.1!2d34.7437!3d32.0383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4b1e987654cd%3A0x9876543210fedcba!2z15nXpNeVINeU16LXqteZ15fXlA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'רמת החייל': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3379.5!2d34.8037!3d32.0983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4d5a456789ef%3A0x2468ace013579bdf!2z16jXnteqINeU15fXmdeZ15w!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        
        // חיפה
        'כרמל צרפתי': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3348.2!2d34.9837!3d32.7983!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf123456789a%3A0x1234567890abcdef!2z15vXqNee15wg16bXqNek16rXmQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'נווה שאנן': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3349.1!2d34.9737!3d32.7883!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf987654321b%3A0xfedcba0987654321!2z16DXldeV15Ug16nXkNeQ16DXnQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'רמת אלמוגי': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3347.5!2d34.9937!3d32.8083!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf456789012c%3A0x13579bdf2468ace0!2z16jXnteqINeQ15zXnteV15LXmQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'בת גלים': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3350.2!2d34.9637!3d32.7783!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151dcf789012345d%3A0x2468ace013579bdf!2z15HXqiDXnNec15nXnQ!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        
        // נתניה
        'קרית השרון': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3365.2!2d34.8537!3d32.3283!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4f123456789e%3A0x1234567890abcdef!2z16fXqNeZ16rXqiDXlNep16jXldefXnA!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'רמת פולג': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3364.8!2d34.8637!3d32.3383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4f987654321f%3A0xfedcba0987654321!2z16jXnteqINeR15XXnNeL!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil',
        'נווה גנים': 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3366.1!2d34.8437!3d32.3183!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x151d4f456789012g%3A0x13579bdf2468ace0!2z16DXldeV15Ug15LXoNeZ150!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil'
    };

    // פונקציה לקבלת כתובת המפה
    function getMapUrl(): string {
        const key = selectedNeighborhood;
        return neighborhoodMaps[key] || neighborhoodMaps['קרית משה']; // ברירת מחדל
    }

    // מיפוי בין קטגוריות לסימונים במפה
    const categoryMarkers: Record<string, string[]> = {
        'benefits': ['gemach', 'babysitter', 'minyan', 'shop', 'giveaway', 'activity', 'restaurant'],
        'gemachim': ['gemach'],
        'giveaway': ['giveaway'],
        'business': ['babysitter'],
        'minyanim': ['minyan'],
        'shops': ['shop'],
        'restaurants': ['restaurant'],
        'education': ['activity']
    };

    const mapMarkers = [
        { id: 'gemach', category: 'gemachim', top: '25%', left: '30%', icon: '🎁', label: 'גמ"ח ספרים', color: 'purple' },
        { id: 'babysitter', category: 'business', top: '40%', left: '60%', icon: '👶', label: 'בייבי סיטר', color: 'pink' },
        { id: 'minyan', category: 'minyanim', top: '60%', left: '25%', icon: '✡️', label: 'מניין שחרית', color: 'blue' },
        { id: 'shop', category: 'shops', top: '35%', left: '75%', icon: '🏪', label: 'מכולת 24/7', color: 'green' },
        { id: 'giveaway', category: 'giveaway', top: '70%', left: '55%', icon: '📦', label: 'ספה למסירה', color: 'orange' },
        { id: 'activity', category: 'education', top: '50%', left: '45%', icon: '🎨', label: 'חוג כדורגל', color: 'red' }
    ];

    function isMarkerVisible(markerId: string): boolean {
        if (selectedCategory === 'benefits') return true;
        const visibleMarkers = categoryMarkers[selectedCategory] || [];
        return visibleMarkers.includes(markerId);
    }

    function handleCategoryClick(categoryId: string) {
        selectedCategory = categoryId;
    }

    const citiesAndNeighborhoods = {
        'אילת': ['שכונת התמרים', 'שכונת הדקלים', 'שכונת השחמון'],
        'באר שבע': ['רמות', 'נווה זאב', 'נווה נוי', 'רמת חן'],
        'בני ברק': ['פרדס כץ', 'רמת אלחנן', 'שיכון ה'],
        'הרצליה': ['הרצליה פיתוח', 'נוה עובד', 'נווה ישראל'],
        'חיפה': ['כרמל צרפתי', 'נווה שאנן', 'רמת אלמוגי', 'בת גלים'],
        'ירושלים': ['קרית משה', 'רחביה', 'גבעת שאול', 'רמות', 'גילה', 'קטמון', 'בקעה', 'מעלות דפנה'],
        'נתניה': ['קרית השרון', 'רמת פולג', 'נווה גנים'],
        'פתח תקווה': ['קרית אריה', 'נווה עוז', 'שיכון דן'],
        'ראשון לציון': ['נווה דקלים', 'רמת אליהו', 'שיכון ותיקים'],
        'רחובות': ['רמת רחובות', 'נווה חוף', 'שכונת הדרים'],
        'תל אביב': ['רמת אביב', 'פלורנטין', 'נווה צדק', 'יפו העתיקה', 'רמת החייל']
    };

    const helpOptions = [
        { id: 3, text: "הלך ילד לאיבוד", icon: "👶" },
        { id: 5, text: "אבד כלב", icon: "🐕" },
        { id: 1, text: "מבוגר זקוק לעזרה", icon: "👴" },
        { id: 2, text: "זקוק לעזרה עם הרכב להתנעה", icon: "🚗" },
        { id: 4, text: "אחר - כתוב את העזרה הזקוקה לך", icon: "✍️" }
    ];

    function startAutoSwitch() {
        if (autoSwitchInterval) {
            clearInterval(autoSwitchInterval);
        }
        
        autoSwitchInterval = setInterval(() => {
            if (!isMouseOver && viewMode !== 'add') {
                if (viewMode === 'map') {
                    // עבור לרשימה ל-3 שניות
                    isAutoSwitching = true;
                    setTimeout(() => {
                        isAutoSwitching = false;
                    }, 1000);
                    handleViewToggle();
                    
                    // חזור למפה אחרי 3 שניות
                    setTimeout(() => {
                        if (viewMode === 'list' && !isMouseOver) {
                            isAutoSwitching = true;
                            setTimeout(() => {
                                isAutoSwitching = false;
                            }, 1000);
                            handleViewToggle();
                        }
                    }, 3000);
                }
            }
        }, 30000); // 30 שניות
    }

    function handleMouseEnter() {
        isMouseOver = true;
    }

    function handleMouseLeave() {
        isMouseOver = false;
    }

    function toggleNeighborhoodsMenu() {
        showNeighborhoodsMenu = !showNeighborhoodsMenu;
        selectedCity = '';
    }

    function selectCity(city: string) {
        selectedCity = selectedCity === city ? '' : city;
    }

    function selectNeighborhood(city: string, neighborhood: string) {
        selectedNeighborhood = neighborhood;
        selectedNeighborhoodCity = city;
        showNeighborhoodsMenu = false;
        selectedCity = '';
    }

    onMount(() => {
        startAutoSwitch();
        
        // סגירת תפריט כשלוחצים מחוץ לו
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showNeighborhoodsMenu && !target.closest('.neighborhoods-menu-container')) {
                showNeighborhoodsMenu = false;
                selectedCity = '';
            }
        };
        
        document.addEventListener('click', handleClickOutside);
        
        return () => {
            if (autoSwitchInterval) {
                clearInterval(autoSwitchInterval);
            }
            document.removeEventListener('click', handleClickOutside);
        };
    });

    function handleViewToggle() {
        isFlipping = true;
        setTimeout(() => {
            viewMode = viewMode === 'map' ? 'list' : 'map';
        }, 350); // Change content at middle of animation
        setTimeout(() => {
            isFlipping = false;
        }, 700);
    }

    function handleAddAdvantage() {
        isFlipping = true;
        setTimeout(() => {
            viewMode = 'add';
        }, 350);
        setTimeout(() => {
            isFlipping = false;
        }, 700);
    }

    function toggleCategory(categoryId: string) {
        if (expandedCategories.has(categoryId)) {
            expandedCategories.delete(categoryId);
        } else {
            expandedCategories.add(categoryId);
        }
        expandedCategories = expandedCategories; // trigger reactivity
    }

    function handleAddItem(categoryId: string) {
        if (!isLoggedIn) {
            alert('יש להירשם כדי להוסיף פריטים. מעבר לדף הרשמה...');
            // כאן תוכל להוסיף ניווט לדף הרשמה
            return;
        }
        // כאן תוכל להוסיף לוגיקה להוספת פריט
        alert(`הוספת פריט לקטגוריה: ${categories.find(c => c.id === categoryId)?.label}`);
    }

    function handleHelpRequest(optionId: number) {
        const option = helpOptions.find(o => o.id === optionId);
        showHelpMenu = false;
        
        const wasNotInMapView = viewMode !== 'map';
        
        // עבור לתצוגת מפה כדי לראות את הגלים
        if (wasNotInMapView) {
            isFlipping = true;
            setTimeout(() => {
                viewMode = 'map';
            }, 350);
            setTimeout(() => {
                isFlipping = false;
            }, 700);
        }
        
        // הפעל אנימציית גלים אחרי מעבר למפה
        setTimeout(() => {
            showWaves = true;
            handRaised = true; // סמן שהיד מורמת
            raisedHandMessage = option?.text || '';
            raisedHandIcon = option?.icon || '🆘';
            
            // כבה את הגלים אחרי 2 שניות
            setTimeout(() => {
                showWaves = false;
            }, 2000);
        }, wasNotInMapView ? 750 : 0);

        if (optionId === 4) {
            // אפשרות "אחר" - פתח טופס
            setTimeout(() => {
                const customHelp = prompt('תאר את העזרה שאתה זקוק לה:');
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
                    raisedHandMessage = '';
                    raisedHandIcon = '';
                }
            }, wasNotInMapView ? 850 : 100);
        } else {
            setTimeout(() => {
                successMessageText = `בקשת עזרה נשלחה: ${option?.text}`;
                showSuccessMessage = true;
                setTimeout(() => {
                    showSuccessMessage = false;
                }, 3000);
            }, wasNotInMapView ? 750 : 0);
        }
    }

    function handleLowerHand() {
        showSurvey = true;
    }

    function handleSurveyResponse(response: 'community' | 'other' | 'cancel') {
        if (response === 'community') {
            successMessageText = 'תודה! שמחים שהקהילה עזרה 🎉';
            showSuccessMessage = true;
            setTimeout(() => {
                showSuccessMessage = false;
            }, 3000);
        } else if (response === 'other') {
            successMessageText = 'תודה על המשוב! 👍';
            showSuccessMessage = true;
            setTimeout(() => {
                showSuccessMessage = false;
            }, 3000);
        }
        
        if (response !== 'cancel') {
            handRaised = false;
            raisedHandMessage = '';
            raisedHandIcon = '';
        }
        showSurvey = false;
    }
</script>

<div class="flex flex-col gap-4">
<div class="flex flex-col gap-4">
    <!-- כותרת שכונה -->
    <div class="text-center mb-2 relative neighborhoods-menu-container">
        <div class="flex items-center justify-center gap-4">
            <div class="relative group">
                <h2 class="text-4xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default">
                    יתרונות קהילת {selectedNeighborhood}, {selectedNeighborhoodCity}
                </h2>
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-[9999] pointer-events-none">
                    <div class="bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-xl whitespace-nowrap">
                        גלה את כל מה שהשכונה שלך מציעה
                        <div class="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            </div>
            <button
                on:click={toggleNeighborhoodsMenu}
                class="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg transition-all hover:scale-105"
            >
                🏘️ לכלל השכונות
            </button>
        </div>
        
        <!-- תפריט ערים ושכונות -->
        {#if showNeighborhoodsMenu}
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-xl shadow-2xl border-2 border-purple-600 overflow-hidden z-50 w-[600px] max-h-[500px] overflow-y-auto">
                <div class="bg-gradient-to-r from-purple-600 to-blue-600 p-3 text-center sticky top-0 z-10">
                    <h3 class="text-white font-bold text-lg">בחר עיר ושכונה</h3>
                </div>
                <div class="p-4">
                    {#each Object.keys(citiesAndNeighborhoods).sort() as city}
                        <div class="mb-2">
                            <button
                                on:click={() => selectCity(city)}
                                class="w-full text-right p-3 rounded-lg hover:bg-purple-50 transition-colors border border-gray-200 flex items-center justify-between"
                            >
                                <span class="font-bold text-gray-800 text-lg">🏙️ {city}</span>
                                <svg 
                                    class="w-5 h-5 text-purple-600 transition-transform duration-300 {selectedCity === city ? 'rotate-180' : ''}"
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>
                            
                            {#if selectedCity === city}
                                <div class="mr-4 mt-2 space-y-1 animate-slideDown">
                                    {#each citiesAndNeighborhoods[city] as neighborhood}
                                        <button
                                            on:click={() => selectNeighborhood(city, neighborhood)}
                                            class="w-full text-right p-2 rounded-lg hover:bg-blue-50 transition-colors text-gray-700 hover:text-blue-600 border border-transparent hover:border-blue-300"
                                        >
                                            📍 {neighborhood}
                                        </button>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
                <button
                    on:click={toggleNeighborhoodsMenu}
                    class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-3 text-sm font-bold transition-colors sticky bottom-0"
                >
                    סגור
                </button>
            </div>
        {/if}
    </div>
    
    <div class="flex flex-col gap-2">
        <!-- Buttons Container -->
        <div class="flex flex-wrap justify-center gap-3 p-2">
            {#each categories as category}
                <button
                    on:click={() => handleCategoryClick(category.id)}
                    title="לחץ כדי לסנן במפה"
                    class="flex items-center gap-1.5 {selectedCategory === category.id ? (category.id === 'benefits' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500 scale-110' : 'bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white border-purple-500 scale-110') : (category.id === 'benefits' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500' : 'bg-gradient-to-br from-white to-gray-200 hover:from-blue-100 hover:to-white text-gray-900 border-purple-300')} px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all hover:scale-105 border"
                >
                    <span class="text-base">{category.icon}</span>
                    {category.label}
                </button>
            {/each}
        </div>
    </div>
</div>

    <!-- Map Container -->
    <div
        class="relative w-full border-4 border-purple-600 shadow-2xl bg-[#0f172a] mb-8 transition-all duration-700"
        style="border-radius: 24px; transform-style: preserve-3d;"
        class:flipping-container={isFlipping}
        on:mouseenter={handleMouseEnter}
        on:mouseleave={handleMouseLeave}
    >
        <!-- כפתור מעבר תצוגה - משולש מקופל בפינה -->
        <button
            on:click={handleViewToggle}
            class="page-corner absolute top-0 left-0 z-10 transition-all duration-500 hover:scale-110"
            class:flipping={isFlipping}
            class:auto-switching={isAutoSwitching}
        >
            <svg width="130" height="130" viewBox="0 0 130 130" class="transition-transform duration-500">
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
                    {viewMode === 'map' ? 'עבור לתצוגת' : 'עבור לתצוגת'}
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
                    {viewMode === 'map' ? 'רשימה' : 'מפה'}
                </text>
            </svg>
        </button>

        {#if viewMode === 'map'}
            <!-- תצוגת מפה -->
            <div class="w-full h-[550px] overflow-hidden relative" style="border-radius: 20px;">
                <!-- אנימציית גלים -->
                {#if showWaves}
                    <div class="absolute inset-0 flex items-end justify-center pointer-events-none z-10">
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
                    <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                        <div class="bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-4 border-yellow-400 max-w-md">
                            <div class="flex items-center gap-4">
                                <span class="text-5xl">{raisedHandIcon}</span>
                                <div>
                                    <p class="font-black text-xl mb-1">🚨 בקשת עזרה פעילה</p>
                                    <p class="text-lg font-bold">{raisedHandMessage}</p>
                                    <p class="text-sm text-yellow-200 mt-2">ממתין לעזרה מהקהילה...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}
                
                <!-- סמנים על המפה -->
                <div class="absolute inset-0 z-10 pointer-events-none">
                    {#each mapMarkers as marker}
                        {#if isMarkerVisible(marker.id)}
                            <div class="absolute transition-all duration-500" style="top: {marker.top}; left: {marker.left};">
                                <div class="text-center animate-fadeIn">
                                    <span class="text-3xl drop-shadow-lg">{marker.icon}</span>
                                    <div class="bg-{marker.color}-600 text-white text-xs px-2 py-1 rounded mt-1 whitespace-nowrap font-bold shadow-lg">
                                        {marker.label}
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/each}
                </div>
                
                <iframe
                    title="מפת {selectedNeighborhood}, {selectedNeighborhoodCity}"
                    width="100%"
                    height="100%"
                    style="border:0"
                    src={getMapUrl()}
                    allowfullscreen
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                >
                </iframe>
            </div>
        {:else if viewMode === 'list'}
            <!-- תצוגת רשימה -->
            <div class="w-full h-[550px] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20" style="border-radius: 20px;">
                <div class="space-y-3">
                    {#each categories.filter(cat => cat.id !== 'benefits') as category}
                        <div class="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-xl overflow-hidden transition-all">
                            <button 
                                on:click={() => toggleCategory(category.id)}
                                class="w-full p-4 hover:border-purple-500 transition-all hover:bg-purple-900/20 cursor-pointer"
                            >
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center gap-3">
                                        <span class="text-3xl">{category.icon}</span>
                                        <span class="text-white font-bold text-lg">{category.label}</span>
                                    </div>
                                    <div class="flex items-center gap-3">
                                        <span class="text-purple-400 text-sm">{category.items?.length || 0} פריטים</span>
                                        <svg 
                                            class="w-6 h-6 text-purple-400 transition-transform duration-300 {expandedCategories.has(category.id) ? 'rotate-180' : ''}"
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </button>
                            
                            {#if expandedCategories.has(category.id) && category.items}
                                <div class="px-4 pb-4 space-y-2 animate-slideDown">
                                    {#each category.items as item}
                                        <div class="bg-purple-900/20 border border-purple-500/20 rounded-lg p-3 hover:bg-purple-900/30 hover:border-purple-500/40 transition-all cursor-pointer">
                                            <div class="flex items-center justify-between">
                                                <span class="text-white text-sm">• {item}</span>
                                                <button class="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1 rounded text-xs font-bold transition-colors">
                                                    פרטים
                                                </button>
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>
        {:else}
            <!-- תצוגת הוספת יתרון -->
            <div class="w-full h-[550px] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20" style="border-radius: 20px;">
                <h3 class="text-2xl font-bold text-white mb-4 text-center">הוסף יתרון חדש</h3>
                <p class="text-center text-gray-400 text-sm mb-6">בחר קטגוריה והוסף פריט חדש</p>
                <div class="space-y-3">
                    {#each categories.filter(cat => cat.id !== 'benefits') as category}
                        <button
                            on:click={() => handleAddItem(category.id)}
                            class="w-full bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-4 hover:border-green-500 hover:from-green-900/40 hover:to-emerald-900/40 transition-all cursor-pointer"
                        >
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-3">
                                    <span class="text-3xl">{category.icon}</span>
                                    <span class="text-white font-bold text-lg">{category.label}</span>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="text-green-400 text-sm">הוסף פריט</span>
                                    <span class="text-2xl text-green-400">➕</span>
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            </div>
        {/if}

        <!-- Decoration -->
        <div
            class="absolute bottom-4 right-4 bg-purple-600/90 backdrop-blur-md text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg"
        >
            {viewMode === 'map' ? `📍 מפת הקהילה - ${selectedNeighborhood}, ${selectedNeighborhoodCity}` : '📋 רשימת שירותים'}
        </div>

        <!-- הודעת הצלחה -->
        {#if showSuccessMessage}
            <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-slideDown">
                <div class="bg-green-600 text-white px-6 py-4 rounded-xl shadow-2xl border-2 border-green-400">
                    <div class="flex items-center gap-3">
                        <span class="text-3xl">✅</span>
                        <div>
                            <p class="font-bold text-lg">הקריאה נשלחה בהצלחה!</p>
                            <p class="text-sm text-green-100">{successMessageText}</p>
                        </div>
                    </div>
                </div>
            </div>
        {/if}

        <!-- כפתור הוסף יתרון - בחלק העליון -->
        <div class="absolute left-1/2 transform -translate-x-1/2 z-20" style="top: -10px;">
            <button
                on:click={handleAddAdvantage}
                title="הוסף יתרון חדש לשכונה"
                class="relative group overflow-hidden bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600 hover:from-green-400 hover:via-emerald-400 hover:to-teal-500 text-white px-3 py-1.5 rounded-lg font-bold text-base shadow-xl transition-all hover:scale-105 border-2 border-purple-600"
            >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"></div>
                <div class="relative flex items-center gap-1.5">
                    <span class="text-[10px]">➕</span>
                    <span>הוסף</span>
                </div>
            </button>
        </div>

        <!-- כפתור הרמת יד מיוחד - בתחתית המפה -->
        <div class="absolute -bottom-8 left-1/2 transform -translate-x-1/2 z-20">
            {#if !handRaised}
                <!-- כפתור הרמת יד רגיל -->
                <button
                    on:click={() => showHelpMenu = !showHelpMenu}
                    title="בקש עזרה מהקהילה"
                    class="relative group overflow-hidden bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 hover:from-red-400 hover:via-pink-400 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold text-base shadow-xl transition-all hover:scale-105 border-4 border-purple-600"
                >
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"></div>
                    <div class="relative flex items-center gap-3">
                        <span class="text-2xl">✋</span>
                        <span>הרמת יד</span>
                    </div>
                </button>
            {:else}
                <!-- כפתור יד מורמת -->
                <button
                    on:click={handleLowerHand}
                    title="הורד את היד"
                    class="relative group overflow-hidden bg-gradient-to-br from-yellow-500 via-orange-500 to-red-600 hover:from-yellow-400 hover:via-orange-400 hover:to-red-500 text-white px-6 py-3 rounded-xl font-bold text-base shadow-xl transition-all hover:scale-105 border-4 border-yellow-400 animate-pulse"
                >
                    <div class="relative flex items-center gap-3">
                        <span class="text-2xl">🙋</span>
                        <span>יד מורמת - לחץ להורדה</span>
                    </div>
                </button>
            {/if}

            <!-- תפריט עזרה -->
            {#if showHelpMenu}
                <div class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-80 bg-white rounded-xl shadow-2xl border-2 border-purple-600 overflow-hidden animate-slideDown">
                    <div class="bg-gradient-to-r from-red-500 to-pink-500 p-3 text-center">
                        <h3 class="text-white font-bold text-lg">פתח קריאה</h3>
                    </div>
                    <div class="p-2">
                        {#each helpOptions as option}
                            <button
                                on:click={() => handleHelpRequest(option.id)}
                                class="w-full flex items-center gap-3 p-3 hover:bg-red-50 rounded-lg transition-colors text-right border-b border-gray-200 last:border-b-0"
                            >
                                <span class="text-2xl">{option.icon}</span>
                                <span class="text-gray-800 font-medium text-sm">{option.text}</span>
                            </button>
                        {/each}
                    </div>
                    <button
                        on:click={() => showHelpMenu = false}
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 text-sm font-bold transition-colors"
                    >
                        ביטול
                    </button>
                </div>
            {/if}

            <!-- סקר הורדת יד -->
            {#if showSurvey}
                <div class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-80 bg-white rounded-xl shadow-2xl border-2 border-yellow-600 overflow-hidden animate-slideDown">
                    <div class="bg-gradient-to-r from-yellow-500 to-orange-500 p-3 text-center">
                        <h3 class="text-white font-bold text-lg">איך הבעיה נפתרה?</h3>
                    </div>
                    <div class="p-4 space-y-3">
                        <button
                            on:click={() => handleSurveyResponse('community')}
                            class="w-full flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border-2 border-green-300"
                        >
                            <span class="text-3xl">🤝</span>
                            <div class="text-right">
                                <p class="font-bold text-green-800">הקהילה עזרה לי</p>
                                <p class="text-xs text-green-600">תודה לכולם!</p>
                            </div>
                        </button>
                        <button
                            on:click={() => handleSurveyResponse('other')}
                            class="w-full flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border-2 border-blue-300"
                        >
                            <span class="text-3xl">✅</span>
                            <div class="text-right">
                                <p class="font-bold text-blue-800">הבעיה נפתרה אחרת</p>
                                <p class="text-xs text-blue-600">הכל בסדר עכשיו</p>
                            </div>
                        </button>
                    </div>
                    <button
                        on:click={() => handleSurveyResponse('cancel')}
                        class="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 text-sm font-bold transition-colors"
                    >
                        ביטול
                    </button>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
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
        0%, 100% {
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

    .page-corner.auto-switching svg {
        animation: pulseGlow 2s ease-in-out;
    }

    @keyframes pulseGlow {
        0%, 100% {
            transform: scale(1);
            filter: brightness(1) drop-shadow(0 0 0 rgba(147, 51, 234, 0));
        }
        25% {
            transform: scale(1.05);
            filter: brightness(1.2) drop-shadow(0 0 8px rgba(147, 51, 234, 0.6));
        }
        50% {
            transform: scale(1.1);
            filter: brightness(1.4) drop-shadow(0 0 15px rgba(147, 51, 234, 0.8));
        }
        75% {
            transform: scale(1.05);
            filter: brightness(1.2) drop-shadow(0 0 8px rgba(147, 51, 234, 0.6));
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
        filter: contrast(1.1) brightness(0.95);
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
</style>

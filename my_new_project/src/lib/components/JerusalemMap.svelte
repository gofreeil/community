<script lang="ts">
    import { onMount } from 'svelte';
    
    const categories = [
        { id: "benefits", label: "כל היתרונות", icon: "⭐" },
        { id: "gemachim", label: 'גמ"חים', icon: "🎁", items: ["גמ\"ח ספרים", "גמ\"ח כלים", "גמ\"ח ציוד לתינוקות", "גמ\"ח בגדים"] },
        { id: "giveaway", label: "למסירה", icon: "📦", items: ["רהיטים", "מוצרי חשמל", "ספרים", "בגדים", "צעצועים"] },
        { id: "business", label: "בייבי סיטר", icon: "👶", items: ["בייבי סיטר בשעות הערב", "בייבי סיטר סופי שבוע", "בייבי סיטר קבוע"] },
        { id: "minyanim", label: "יהדות", icon: "✡️", items: ["מניינים לתפילה", "שיעורי תורה", "מקוואות", "בתי כנסת"] },
        { id: "realestate", label: "בתי הארחה לשבת", icon: "🏠", items: ["בתי הארחה משפחתיים", "בתי הארחה לזוגות", "בתי הארחה ליחידים"] },
        { id: "security", label: "צימרים", icon: "🏡", items: ["צימרים זוגיים", "צימרים משפחתיים", "צימרים עם בריכה"] },
        { id: "education", label: "חוגים", icon: "🎨", items: ["חוגי ספורט", "חוגי אומנות", "חוגי מוזיקה", "חוגי מדעים"] },
        { id: "kids", label: "לילדים", icon: "🧒", items: ["גני משחקים", "פעילויות לילדים", "ספריות לילדים", "מועדוניות"] },
        { id: "shops", label: "חנויות", icon: "🏪", items: ["מכולת", "מאפייה", "בית מרקחת", "חנות בגדים", "דואר", "מסעדות", "בנקים", "כספומט"] },
        { id: "transport", label: "טרמפים", icon: "🚗", items: ["נוסע קבוע ל...", "נוסע חד פעמי ומוכן לצרף טרמפיסט", "דרוש טרמפ"] },
    ];

    let viewMode: 'map' | 'list' | 'add' = 'map';
    let isFlipping = false;
    let expandedCategories: Set<string> = new Set();
    let isLoggedIn = false; // במציאות זה יבוא מניהול משתמשים
    let showHelpMenu = false;
    let showWaves = false;
    let isMouseOver = false;
    let autoSwitchInterval: number | null = null;
    let showNeighborhoodsMenu = false;
    let selectedCity = '';

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
                handleViewToggle();
            }
        }, 20000); // 20 שניות
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
        // כאן תוכל להוסיף לוגיקה לשינוי השכונה
        alert(`נבחרה: ${neighborhood}, ${city}`);
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
        
        // הפעל אנימציית גלים
        showWaves = true;
        
        // המתן שהאנימציה תתחיל לפני ה-alert
        setTimeout(() => {
            if (optionId === 4) {
                // אפשרות "אחר" - פתח טופס
                const customHelp = prompt('תאר את העזרה שאתה זקוק לה:');
                if (customHelp) {
                    alert(`בקשת עזרה נשלחה: ${customHelp}`);
                }
            } else {
                alert(`בקשת עזרה נשלחה: ${option?.text}`);
            }
        }, 100);
        
        // כבה את הגלים אחרי 2 שניות
        setTimeout(() => {
            showWaves = false;
        }, 2000);
    }
</script>

<div class="flex flex-col gap-4">
<div class="flex flex-col gap-4">
    <!-- כותרת שכונה -->
    <div class="text-center mb-2 relative neighborhoods-menu-container">
        <div class="flex items-center justify-center gap-4">
            <div class="relative group">
                <h2 class="text-3xl font-black bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent cursor-default">
                    יתרונות קהילת קרית משה, ירושלים
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
                    title="לחץ כדי לסנן במפה"
                    class="flex items-center gap-1.5 {category.id === 'benefits' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-gray-900 border-yellow-500' : 'bg-gradient-to-br from-white to-gray-200 hover:from-blue-100 hover:to-white text-gray-900 border-purple-300'} px-3 py-1.5 rounded-lg text-xs font-bold shadow-lg transition-all hover:scale-105 border"
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
                
                <!-- סמנים על המפה -->
                <div class="absolute inset-0 z-10 pointer-events-none">
                    <!-- גמ"ח ספרים -->
                    <div class="absolute" style="top: 25%; left: 30%;">
                        <div class="text-center">
                            <span class="text-3xl drop-shadow-lg">🎁</span>
                            <div class="bg-purple-600 text-white text-xs px-2 py-1 rounded mt-1 whitespace-nowrap font-bold shadow-lg">
                                גמ"ח ספרים
                            </div>
                        </div>
                    </div>
                    
                    <!-- בייבי סיטר -->
                    <div class="absolute" style="top: 40%; left: 60%;">
                        <div class="text-center">
                            <span class="text-3xl drop-shadow-lg">👶</span>
                            <div class="bg-pink-600 text-white text-xs px-2 py-1 rounded mt-1 whitespace-nowrap font-bold shadow-lg">
                                בייבי סיטר
                            </div>
                        </div>
                    </div>
                    
                    <!-- מניין תפילה -->
                    <div class="absolute" style="top: 60%; left: 25%;">
                        <div class="text-center">
                            <span class="text-3xl drop-shadow-lg">✡️</span>
                            <div class="bg-blue-600 text-white text-xs px-2 py-1 rounded mt-1 whitespace-nowrap font-bold shadow-lg">
                                מניין שחרית
                            </div>
                        </div>
                    </div>
                    
                    <!-- מכולת -->
                    <div class="absolute" style="top: 35%; left: 75%;">
                        <div class="text-center">
                            <span class="text-3xl drop-shadow-lg">🏪</span>
                            <div class="bg-green-600 text-white text-xs px-2 py-1 rounded mt-1 whitespace-nowrap font-bold shadow-lg">
                                מכולת 24/7
                            </div>
                        </div>
                    </div>
                    
                    <!-- למסירה - רהיטים -->
                    <div class="absolute" style="top: 70%; left: 55%;">
                        <div class="text-center">
                            <span class="text-3xl drop-shadow-lg">📦</span>
                            <div class="bg-orange-600 text-white text-xs px-2 py-1 rounded mt-1 whitespace-nowrap font-bold shadow-lg">
                                ספה למסירה
                            </div>
                        </div>
                    </div>
                    
                    <!-- חוג ספורט -->
                    <div class="absolute" style="top: 50%; left: 45%;">
                        <div class="text-center">
                            <span class="text-3xl drop-shadow-lg">🎨</span>
                            <div class="bg-red-600 text-white text-xs px-2 py-1 rounded mt-1 whitespace-nowrap font-bold shadow-lg">
                                חוג כדורגל
                            </div>
                        </div>
                    </div>
                </div>
                
                <iframe
                    title="מפת ירושלים"
                    width="100%"
                    height="100%"
                    style="border:0"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3391.8864700000003!2d35.21371!3d31.768319!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1502d7d634c1f8b9%3A0x1028fca4a63b44a!2z15nXqNeV16nXnNep150!5e0!3m2!1siw!2sil!4v1700000000000!5m2!1siw!2sil"
                    allowfullscreen
                    loading="lazy"
                    referrerpolicy="no-referrer-when-downgrade"
                >
                </iframe>
            </div>
        {:else if viewMode === 'list'}
            <!-- תצוגת רשימה -->
            <div class="w-full h-[550px] overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-purple-600 scrollbar-track-purple-900/20" style="border-radius: 20px;">
                <h3 class="text-2xl font-bold text-white mb-6 text-center">כל היתרונות בשכונה</h3>
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
            {viewMode === 'map' ? '📍 מפת הקהילה - ירושלים' : '📋 רשימת שירותים'}
        </div>

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
            <button
                on:click={() => showHelpMenu = !showHelpMenu}
                title="בקש עזרה מהקהילה"
                class="relative group overflow-hidden bg-gradient-to-br from-red-500 via-pink-500 to-purple-600 hover:from-red-400 hover:via-pink-400 hover:to-purple-500 text-white px-6 py-3 rounded-xl font-bold text-base shadow-xl transition-all hover:scale-105 border-4 border-purple-600"
            >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer-once"></div>
                <div class="relative flex items-center gap-3">
                    <span class="text-2xl animate-wave-once">✋</span>
                    <span>הרמת יד</span>
                </div>
            </button>

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

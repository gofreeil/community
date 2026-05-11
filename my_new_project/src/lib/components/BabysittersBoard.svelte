<script lang="ts">
    interface DbItem {
        id: string;
        category: string;
        label: string;
        description: string;
        contact: string;
        phone: string;
        address: string;
        icon: string;
        color: string;
        neighborhood: string;
        city: string;
        extra_fields: string;
        status: string;
        user_id: string | null;
        created_at: string;
        view_count: number;
    }

    interface Sitter {
        id: string;
        name: string;
        age: number;
        city: string;
        neighborhood: string;
        rating: number;
        reviews: number;
        rate: number;            // ₪/שעה
        experience: number;      // שנות ניסיון
        verified: boolean;
        bgCheck: boolean;
        ageGroups: string[];     // ['0-2','2-5','5-10','10+']
        languages: string[];
        certifications: string[];
        specialties: string[];
        days: string[];          // ['א','ב','ג','ד','ה','ו','ש']
        timeOfDay: string[];     // ['בוקר','צהריים','אחה״צ','ערב','לילה','סופ״ש']
        bio: string;
        phone: string;
        photoSeed: string;       // למחולל אווטר
        gradient: string;        // צבע רקע לאווטר
        lastActive: string;      // "פעיל היום" וכו'
        isReal?: boolean;        // האם מקור אמיתי מ-DB
    }

    interface Props {
        items: DbItem[];
    }

    let { items }: Props = $props();

    function parseExtra(raw: string): Record<string, unknown> {
        try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
    }

    function initials(name: string): string {
        const parts = (name || '').trim().split(/\s+/).slice(0, 2);
        return parts.map(p => p[0] || '').join('') || '?';
    }

    function waLink(phone: string): string {
        const digits = (phone ?? '').replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    const GRADIENTS = [
        'from-pink-500 to-rose-600',
        'from-purple-500 to-fuchsia-600',
        'from-sky-500 to-blue-600',
        'from-emerald-500 to-teal-600',
        'from-amber-500 to-orange-600',
        'from-indigo-500 to-violet-600',
        'from-rose-400 to-pink-500',
        'from-cyan-500 to-blue-500',
    ];

    // המרה מ-DbItem למבנה Sitter מועשר
    function dbToSitter(item: DbItem, idx: number): Sitter {
        const ef = parseExtra(item.extra_fields);
        const ageRange = String(ef.age_range ?? '').toLowerCase();
        const ageGroups: string[] = [];
        if (/0|1|2|תינוק/.test(ageRange)) ageGroups.push('0-2');
        if (/3|4|5|פעוט/.test(ageRange))  ageGroups.push('2-5');
        if (/6|7|8|9|10/.test(ageRange))  ageGroups.push('5-10');
        if (/11|12|13|14|נוער/.test(ageRange)) ageGroups.push('10+');
        const expRaw = String(ef.experience ?? '');
        const expNum = /4\+/.test(expRaw) ? 5 : /2-3/.test(expRaw) ? 3 : /שנה/.test(expRaw) ? 1 : 0;

        return {
            id: item.id,
            name: item.label || item.contact || 'בייבי סיטר',
            age: Number(ef.age) || 22,
            city: item.city || '',
            neighborhood: item.neighborhood || item.address || '',
            rating: 0,
            reviews: 0,
            rate: Number(ef.price_hour) || 0,
            experience: expNum,
            verified: false,
            bgCheck: false,
            ageGroups: ageGroups.length ? ageGroups : ['0-2','2-5','5-10'],
            languages: ['עברית'],
            certifications: [],
            specialties: [],
            days: ['א','ב','ג','ד','ה'],
            timeOfDay: ['אחה״צ','ערב'],
            bio: ef.description ? String(ef.description) : (item.description || ''),
            phone: item.phone,
            photoSeed: item.id,
            gradient: GRADIENTS[idx % GRADIENTS.length],
            lastActive: 'פעיל לאחרונה',
            isReal: true,
        };
    }

    // ===== Mock data — נתונים עשירים בהשראת אתרים מובילים =====
    const mockSitters: Sitter[] = [
        {
            id: 'mb1', name: 'שירה לוי', age: 23, city: 'ירושלים', neighborhood: 'קרית משה',
            rating: 4.9, reviews: 47, rate: 50, experience: 4,
            verified: true, bgCheck: true,
            ageGroups: ['0-2','2-5','5-10'], languages: ['עברית','אנגלית'],
            certifications: ['עזרה ראשונה','החייאה'], specialties: ['עזרה בשיעורים','בישול לילדים'],
            days: ['א','ב','ג','ד','ה','ו'], timeOfDay: ['אחה״צ','ערב','סופ״ש'],
            bio: 'סטודנטית לחינוך מיוחד, אוהבת ילדים, יצירתית וסבלנית. ניסיון עשיר עם תינוקות וילדים בגיל הגן.',
            phone: '050-1234567', photoSeed: 'shira', gradient: 'from-pink-500 to-rose-600', lastActive: 'פעילה היום',
        },
        {
            id: 'mb2', name: 'נועה כהן', age: 19, city: 'תל אביב', neighborhood: 'רמת אביב',
            rating: 4.8, reviews: 23, rate: 45, experience: 2,
            verified: true, bgCheck: false,
            ageGroups: ['2-5','5-10'], languages: ['עברית','אנגלית','רוסית'],
            certifications: ['עזרה ראשונה'], specialties: ['פעילויות יצירה','קריאת ספרים'],
            days: ['ג','ד','ה','ו','ש'], timeOfDay: ['ערב','לילה','סופ״ש'],
            bio: 'תלמידת תיכון אחראית, מנוסה עם אחים קטנים. אוהבת לתכנן פעילויות יצירה ומשחקי לוח.',
            phone: '052-2345678', photoSeed: 'noa', gradient: 'from-purple-500 to-fuchsia-600', lastActive: 'פעילה היום',
        },
        {
            id: 'mb3', name: 'מיכל ברקוביץ׳', age: 28, city: 'בני ברק', neighborhood: 'רמת אהרן',
            rating: 5.0, reviews: 89, rate: 65, experience: 5,
            verified: true, bgCheck: true,
            ageGroups: ['0-2','2-5'], languages: ['עברית','אנגלית','יידיש'],
            certifications: ['עזרה ראשונה','החייאה','קורס מטפלות'], specialties: ['תינוקות','שינה','הזנה'],
            days: ['א','ב','ג','ד','ה'], timeOfDay: ['בוקר','צהריים','אחה״צ'],
            bio: 'מטפלת מקצועית בעלת קורס מטפלות מוסמך. מומחיות בתינוקות מגיל לידה — שגרת שינה, האכלה ופעילויות התפתחותיות.',
            phone: '053-3456789', photoSeed: 'michal', gradient: 'from-sky-500 to-blue-600', lastActive: 'פעילה היום',
        },
        {
            id: 'mb4', name: 'אביגיל אדרי', age: 21, city: 'אשדוד', neighborhood: 'רובע ז',
            rating: 4.7, reviews: 31, rate: 40, experience: 3,
            verified: true, bgCheck: true,
            ageGroups: ['2-5','5-10','10+'], languages: ['עברית','צרפתית'],
            certifications: ['עזרה ראשונה'], specialties: ['עזרה בשיעורים','ספורט וטיולים','אנגלית'],
            days: ['א','ב','ג','ד','ה','ו'], timeOfDay: ['אחה״צ','ערב'],
            bio: 'בת שירות לאומי, אחות בכירה במשפחה של 7 ילדים. מצוינת בעזרה בלימודים וביצירת אווירה כיפית בבית.',
            phone: '054-4567890', photoSeed: 'avigail', gradient: 'from-emerald-500 to-teal-600', lastActive: 'אתמול',
        },
        {
            id: 'mb5', name: 'יעל ישראלי', age: 25, city: 'חיפה', neighborhood: 'הדר',
            rating: 4.9, reviews: 56, rate: 55, experience: 4,
            verified: true, bgCheck: true,
            ageGroups: ['0-2','2-5','5-10'], languages: ['עברית','אנגלית','ערבית'],
            certifications: ['עזרה ראשונה','החייאה'], specialties: ['ילדים עם צרכים מיוחדים','גמילה מחיתולים'],
            days: ['א','ב','ג','ד','ה','ש'], timeOfDay: ['בוקר','אחה״צ','ערב','סופ״ש'],
            bio: 'סטודנטית לריפוי בעיסוק, ניסיון עם ילדים עם צרכים מיוחדים. עדינה וקשובה, יודעת להכיל מצבים מאתגרים.',
            phone: '055-5678901', photoSeed: 'yael', gradient: 'from-amber-500 to-orange-600', lastActive: 'פעילה היום',
        },
        {
            id: 'mb6', name: 'תמר שטרן', age: 22, city: 'בית שמש', neighborhood: 'רמת בית שמש א',
            rating: 4.8, reviews: 38, rate: 45, experience: 3,
            verified: true, bgCheck: false,
            ageGroups: ['2-5','5-10'], languages: ['עברית','אנגלית'],
            certifications: ['עזרה ראשונה'], specialties: ['פעילויות חוץ','משחקי תפקידים'],
            days: ['ג','ד','ה','ו','ש'], timeOfDay: ['אחה״צ','ערב','סופ״ש'],
            bio: 'אוהבת המון את החיים בחוץ — פארק, טרמפולינות, גינות שעשועים. הילדים מתעייפים בכיף ויוצאים חיוכים.',
            phone: '050-6789012', photoSeed: 'tamar', gradient: 'from-indigo-500 to-violet-600', lastActive: 'לפני יומיים',
        },
        {
            id: 'mb7', name: 'רוני מזרחי', age: 20, city: 'ראשון לציון', neighborhood: 'נווה ים',
            rating: 4.6, reviews: 14, rate: 40, experience: 1,
            verified: true, bgCheck: false,
            ageGroups: ['5-10','10+'], languages: ['עברית','אנגלית','ספרדית'],
            certifications: [], specialties: ['גיימינג','תכנות לילדים'],
            days: ['ג','ה','ו','ש'], timeOfDay: ['ערב','לילה','סופ״ש'],
            bio: 'סטודנט להנדסת מחשבים, מצוין עם ילדים בגיל בית ספר. ילדים אוהבים אותי כי אני מבין אותם.',
            phone: '052-7890123', photoSeed: 'roni', gradient: 'from-rose-400 to-pink-500', lastActive: 'פעיל היום',
        },
        {
            id: 'mb8', name: 'הילה גולדברג', age: 26, city: 'פתח תקווה', neighborhood: 'כפר אברהם',
            rating: 4.9, reviews: 72, rate: 60, experience: 5,
            verified: true, bgCheck: true,
            ageGroups: ['0-2','2-5'], languages: ['עברית','אנגלית'],
            certifications: ['עזרה ראשונה','החייאה','גננת בהכשרה'], specialties: ['פעוטות','שעת לילה','תאומים'],
            days: ['א','ב','ג','ד','ה','ו','ש'], timeOfDay: ['בוקר','צהריים','אחה״צ','ערב','סופ״ש'],
            bio: 'גננת בהכשרה עם 5 שנות ניסיון. מתמחה בתאומים, מודעת להתפתחות חברתית-רגשית של פעוטות.',
            phone: '053-8901234', photoSeed: 'hila', gradient: 'from-cyan-500 to-blue-500', lastActive: 'פעילה היום',
        },
        {
            id: 'mb9', name: 'דניאל פרידמן', age: 24, city: 'נתניה', neighborhood: 'קרית השרון',
            rating: 4.7, reviews: 22, rate: 50, experience: 3,
            verified: true, bgCheck: true,
            ageGroups: ['5-10','10+'], languages: ['עברית','אנגלית','גרמנית'],
            certifications: ['עזרה ראשונה'], specialties: ['ספורט','שחייה','עזרה בשיעורים'],
            days: ['א','ב','ג','ד','ה'], timeOfDay: ['אחה״צ','ערב'],
            bio: 'מאמן שחייה לילדים, סטודנט לחינוך גופני. אוהב לקחת ילדים לפעילויות ספורט ולעודד אורח חיים בריא.',
            phone: '054-9012345', photoSeed: 'daniel', gradient: 'from-emerald-500 to-teal-600', lastActive: 'לפני יומיים',
        },
        {
            id: 'mb10', name: 'אסתר רוזנברג', age: 30, city: 'ירושלים', neighborhood: 'הר נוף',
            rating: 5.0, reviews: 124, rate: 70, experience: 8,
            verified: true, bgCheck: true,
            ageGroups: ['0-2','2-5','5-10','10+'], languages: ['עברית','אנגלית','יידיש'],
            certifications: ['עזרה ראשונה','החייאה','קורס מטפלות','אחות מוסמכת'], specialties: ['תינוקות','ילדים מרובים','שינה','אורח חיים דתי'],
            days: ['א','ב','ג','ד','ה','ו'], timeOfDay: ['בוקר','צהריים','אחה״צ','ערב','לילה'],
            bio: 'אחות מוסמכת בעלת 8 שנות ניסיון. מתמחה בטיפול בתינוקות וילדים מרובים. שומרת מסורת.',
            phone: '055-0123456', photoSeed: 'esther', gradient: 'from-purple-500 to-fuchsia-600', lastActive: 'פעילה היום',
        },
    ];

    // איחוד DB + mock
    let realSitters = $derived(items.map((it, idx) => dbToSitter(it, idx)));
    let allSitters  = $derived([...realSitters, ...mockSitters]);

    // ===== Filters =====
    let searchQuery   = $state('');
    let selectedCity  = $state('');
    let sortBy        = $state<'featured' | 'rating' | 'rate_low' | 'rate_high' | 'experience'>('featured');

    let availableCities = $derived(
        [...new Set(allSitters.map(s => s.city).filter(Boolean))].sort()
    );

    let filtered = $derived.by(() => {
        let arr = allSitters.filter(s => {
            const q = searchQuery.trim();
            const matchSearch = !q ||
                s.name.includes(q) || s.bio.includes(q) ||
                s.neighborhood.includes(q) || s.city.includes(q) ||
                s.specialties.some(x => x.includes(q)) ||
                s.languages.some(x => x.includes(q));
            const matchCity   = !selectedCity || s.city === selectedCity;
            return matchSearch && matchCity;
        });

        if (sortBy === 'rating')     arr = [...arr].sort((a,b) => b.rating - a.rating);
        if (sortBy === 'rate_low')   arr = [...arr].sort((a,b) => (a.rate || 9999) - (b.rate || 9999));
        if (sortBy === 'rate_high')  arr = [...arr].sort((a,b) => b.rate - a.rate);
        if (sortBy === 'experience') arr = [...arr].sort((a,b) => b.experience - a.experience);
        if (sortBy === 'featured')   arr = [...arr].sort((a,b) => (b.rating * Math.log(b.reviews + 2)) - (a.rating * Math.log(a.reviews + 2)));
        return arr;
    });

    function clearAll() {
        searchQuery = ''; selectedCity = ''; sortBy = 'featured';
    }

    let saved = $state<Record<string, boolean>>({});
    function toggleSave(id: string) { saved[id] = !saved[id]; }
</script>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20" dir="rtl">

    <!-- ===== Hero ===== -->
    <div class="max-w-6xl mx-auto px-4 mb-6">
        <div class="relative overflow-hidden rounded-3xl p-6 md:p-12 text-center min-h-[260px] md:min-h-[340px] flex items-center justify-center">
            <!-- תמונת רקע -->
            <img src="/images/babysitter.png" alt="" class="absolute inset-0 w-full h-full object-cover" />
            <!-- שכבת כהות מעל התמונה כדי שהטקסט יבלוט -->
            <div class="absolute inset-0 bg-black/55"></div>
            <!-- תוכן -->
            <div class="relative">
                <h1 class="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-lg">לוח בייבי סיטר ארצי</h1>
                <p class="text-white/95 text-sm md:text-lg mb-4 drop-shadow">מצאו בייבי סיטר מומלצת לפי שכונה, גיל הילדים, מחיר וזמינות</p>
                <div class="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2">
                    <span class="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
                    <span class="text-white text-sm font-medium">{allSitters.length} מטפלות זמינות</span>
                </div>
            </div>
        </div>
    </div>

    <!-- ===== CTA הוסף בייבי סיטר ===== -->
    <div class="max-w-6xl mx-auto px-4 mb-5 flex justify-center">
        <a
            href="/add/business"
            class="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold px-7 py-3 rounded-full shadow-lg hover:shadow-pink-500/30 transition-all hover:scale-105 text-sm"
        >
            <span class="font-black text-lg leading-none">+</span>
            הציעו שירותי בייביסיטר
        </a>
    </div>

    <!-- ===== Search + filters ===== -->
    <div class="max-w-6xl mx-auto px-4 mb-4">
        <!-- חיפוש + עיר + מיון -->
        <div class="flex flex-col md:flex-row gap-3 mb-3">
            <div class="flex-1 relative">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="🔍  חיפוש לפי שם, שכונה, התמחות..."
                    class="w-full bg-[#0f172a] border border-white/10 focus:border-pink-500/50 rounded-2xl px-5 py-3 text-white placeholder-gray-500 text-sm outline-none transition-colors"
                />
                {#if searchQuery}
                    <button onclick={() => (searchQuery = '')} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-lg cursor-pointer">×</button>
                {/if}
            </div>
            {#if availableCities.length > 0}
                <select bind:value={selectedCity} class="bg-[#0f172a] border border-white/10 focus:border-pink-500/50 rounded-2xl px-5 py-3 text-white text-sm outline-none appearance-none transition-colors min-w-[160px]">
                    <option value="" style="background:#fff;color:#0f172a;">📍 כל הערים</option>
                    {#each availableCities as c}
                        <option value={c} style="background:#fff;color:#0f172a;">{c}</option>
                    {/each}
                </select>
            {/if}
            <select bind:value={sortBy} class="bg-[#0f172a] border border-white/10 focus:border-pink-500/50 rounded-2xl px-5 py-3 text-white text-sm outline-none appearance-none transition-colors min-w-[160px]">
                <option value="featured"   style="background:#fff;color:#0f172a;">⭐ מומלצות</option>
                <option value="rating"     style="background:#fff;color:#0f172a;">★ דירוג גבוה</option>
                <option value="rate_low"   style="background:#fff;color:#0f172a;">₪ מחיר נמוך</option>
                <option value="rate_high"  style="background:#fff;color:#0f172a;">₪ מחיר גבוה</option>
                <option value="experience" style="background:#fff;color:#0f172a;">🏆 ניסיון רב</option>
            </select>
        </div>

        <!-- סיכום + נקה -->
        <p class="text-gray-500 text-sm mt-3 flex items-center gap-3">
            <span>מציג <span class="text-white font-bold">{filtered.length}</span> בייבי סיטר</span>
            {#if searchQuery || selectedCity}
                <button onclick={clearAll} class="text-pink-400 hover:text-pink-300 underline cursor-pointer text-xs">נקה סינון</button>
            {/if}
        </p>
    </div>

    <!-- ===== Grid ===== -->
    <div class="max-w-6xl mx-auto px-4">
        {#if filtered.length === 0}
            <div class="text-center py-16">
                <div class="text-5xl mb-4">🔎</div>
                <p class="text-gray-400 mb-3">לא נמצאו בייבי סיטר התואמות לחיפוש</p>
                <button onclick={clearAll} class="text-pink-400 hover:text-pink-300 underline text-sm cursor-pointer">נקה סינון</button>
            </div>
        {:else}
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {#each filtered as s}
                    <div class="bg-[#0f172a] rounded-2xl border border-white/10 hover:border-pink-500/40 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-pink-500/10 transition-all hover:-translate-y-1 flex flex-col">

                        <!-- כותרת: אווטר + שם + דירוג -->
                        <div class="p-4 flex items-start gap-3 border-b border-white/5">
                            <!-- אווטר -->
                            <div class="relative flex-shrink-0">
                                <div class="w-14 h-14 rounded-full bg-gradient-to-br {s.gradient} flex items-center justify-center text-white font-black text-lg shadow-lg">
                                    {initials(s.name)}
                                </div>
                                {#if s.verified}
                                    <span class="absolute -bottom-0.5 -left-0.5 w-5 h-5 bg-blue-500 border-2 border-[#0f172a] rounded-full flex items-center justify-center text-white text-[10px] font-black" title="זהות מאומתת">✓</span>
                                {/if}
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-2">
                                    <h3 class="text-white font-black text-base truncate">
                                        {s.name}<span class="text-gray-400 font-normal">, {s.age}</span>
                                    </h3>
                                    <button onclick={() => toggleSave(s.id)} class="flex-shrink-0 text-xl leading-none transition-transform hover:scale-110 cursor-pointer" aria-label="שמור">
                                        {saved[s.id] ? '❤️' : '🤍'}
                                    </button>
                                </div>
                                {#if s.city || s.neighborhood}
                                    <p class="text-gray-400 text-xs mt-0.5 truncate">
                                        📍 {[s.neighborhood, s.city].filter(Boolean).join(', ')}
                                    </p>
                                {/if}
                                <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                                    {#if s.rating > 0}
                                        <span class="inline-flex items-center gap-0.5 text-amber-400 text-xs font-bold">
                                            ★ {s.rating.toFixed(1)}
                                            <span class="text-gray-500 font-normal">({s.reviews})</span>
                                        </span>
                                    {/if}
                                    <span class="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                        {s.lastActive}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <!-- מטריקות מהירות -->
                        <div class="grid grid-cols-3 divide-x divide-x-reverse divide-white/5 border-b border-white/5 text-center">
                            <div class="py-2.5">
                                <div class="text-pink-300 font-black text-base leading-none">
                                    {s.rate ? `₪${s.rate}` : '—'}
                                </div>
                                <div class="text-[10px] text-gray-500 mt-0.5">לשעה</div>
                            </div>
                            <div class="py-2.5">
                                <div class="text-white font-black text-base leading-none">
                                    {s.experience || '—'}{s.experience ? '+' : ''}
                                </div>
                                <div class="text-[10px] text-gray-500 mt-0.5">שנות ניסיון</div>
                            </div>
                            <div class="py-2.5">
                                <div class="text-white font-black text-base leading-none">{s.ageGroups.length}</div>
                                <div class="text-[10px] text-gray-500 mt-0.5">קבוצות גיל</div>
                            </div>
                        </div>

                        <!-- תגיות: גילאים + שפות -->
                        <div class="p-4 pb-2 flex-1">
                            <div class="flex flex-wrap gap-1.5 mb-2">
                                {#each s.ageGroups as ag}
                                    <span class="text-[10px] bg-pink-500/10 border border-pink-500/30 text-pink-300 px-2 py-0.5 rounded-full font-bold">
                                        {ag === '0-2' ? '🍼' : ag === '2-5' ? '🧸' : ag === '5-10' ? '🎒' : '🎮'} {ag}
                                    </span>
                                {/each}
                                {#each s.languages as lang}
                                    <span class="text-[10px] bg-white/5 border border-white/10 text-gray-300 px-2 py-0.5 rounded-full">
                                        🌐 {lang}
                                    </span>
                                {/each}
                            </div>

                            <!-- ביו -->
                            {#if s.bio}
                                <p class="text-gray-300 text-xs leading-relaxed mb-3 line-clamp-2">{s.bio}</p>
                            {/if}

                            <!-- הסמכות -->
                            {#if s.certifications.length > 0}
                                <div class="flex flex-wrap gap-1 mb-2">
                                    {#each s.certifications as cert}
                                        <span class="inline-flex items-center gap-1 text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-medium">
                                            ✓ {cert}
                                        </span>
                                    {/each}
                                </div>
                            {/if}

                            <!-- התמחויות -->
                            {#if s.specialties.length > 0}
                                <div class="flex flex-wrap gap-1 mb-3">
                                    {#each s.specialties.slice(0, 3) as spec}
                                        <span class="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">
                                            ⭐ {spec}
                                        </span>
                                    {/each}
                                    {#if s.specialties.length > 3}
                                        <span class="text-[10px] text-gray-500 px-1 py-0.5">+{s.specialties.length - 3}</span>
                                    {/if}
                                </div>
                            {/if}

                            <!-- זמינות -->
                            <div class="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1">
                                <span class="text-gray-500">📅 ימים:</span>
                                {#each ['א','ב','ג','ד','ה','ו','ש'] as d}
                                    <span class="w-5 h-5 rounded-full flex items-center justify-center font-bold text-[9px] {s.days.includes(d) ? 'bg-pink-500/20 text-pink-300' : 'bg-white/5 text-gray-600'}">
                                        {d}
                                    </span>
                                {/each}
                            </div>
                            <div class="flex flex-wrap gap-1 mt-1.5">
                                {#each s.timeOfDay as t}
                                    <span class="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded">🕐 {t}</span>
                                {/each}
                            </div>
                        </div>

                        <!-- פעולות -->
                        <div class="p-3 pt-2 flex gap-2 border-t border-white/5">
                            <a href={waLink(s.phone)} target="_blank" rel="noopener noreferrer"
                                class="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
                                💬 WhatsApp
                            </a>
                            <a href="tel:{s.phone}"
                                class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white py-2.5 px-4 rounded-xl transition-colors text-sm" aria-label="חייג">
                                📞
                            </a>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}

        <!-- חזרה -->
        <div class="text-center mt-10">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>

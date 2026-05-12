<script lang="ts">
    import { onMount } from 'svelte';
    import { neighborhoodState } from '$lib/neighborhoodState.svelte';
    import { getCoordsFor, type Coord } from '$lib/neighborhoodCoords';
    import { isLiked, toggleLike } from '$lib/likedItems';

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

    type ClassCategory =
        | 'ספורט' | 'מוזיקה' | 'אומנות' | 'ריקוד' | 'אומנויות לחימה'
        | 'מדע ורובוטיקה' | 'בישול' | 'דרמה' | 'שחייה' | 'יהדות' | 'שפות' | 'אחר';

    interface Klass {
        id: string;
        label: string;             // שם החוג
        category: ClassCategory;
        instructor: string;
        sector?: 'כללי' | 'דתי' | 'חרדי';
        city: string;
        neighborhood: string;
        address?: string;
        rating: number;
        reviews: number;
        pricePerMonth: number;     // ₪/חודש
        pricePerSession?: number;  // ₪/שיעור (אופציונלי)
        freeTrial: boolean;        // שיעור ניסיון חינם
        format: 'פרונטלי' | 'מקוון' | 'היברידי';
        ageMin: number;
        ageMax: number;
        days: string[];            // ['א','ב','ג','ד','ה','ו','ש']
        timeStart: string;         // "16:30"
        timeEnd: string;           // "17:30"
        verified: boolean;
        spotsLeft: number;         // 0 = מלא
        capacity: number;
        skills: string[];          // ['סולמות', 'תרגול קבוצתי']
        description: string;
        phone: string;
        gradient: string;
        startedYear: number;
        lastActive: string;
        isReal?: boolean;
    }

    interface Props {
        items: DbItem[];
        userNeighborhood?: string | null;
        userCity?: string | null;
    }

    let { items, userNeighborhood = null, userCity = null }: Props = $props();

    onMount(() => {
        neighborhoodState.init(userNeighborhood, userCity);
    });

    function parseExtra(raw: string): Record<string, unknown> {
        try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
    }

    function waLink(phone: string): string {
        const digits = (phone ?? '').replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    // ===== מפת קטגוריה → אייקון + גרדיאנט (השראה: Outschool/Sawyer) =====
    const CAT_META: Record<ClassCategory, { icon: string; gradient: string }> = {
        'ספורט':              { icon: '⚽', gradient: 'from-emerald-500 to-teal-600' },
        'מוזיקה':             { icon: '🎵', gradient: 'from-indigo-500 to-violet-600' },
        'אומנות':             { icon: '🎨', gradient: 'from-pink-500 to-rose-600' },
        'ריקוד':              { icon: '💃', gradient: 'from-fuchsia-500 to-pink-600' },
        'אומנויות לחימה':     { icon: '🥋', gradient: 'from-red-500 to-orange-600' },
        'מדע ורובוטיקה':      { icon: '🔬', gradient: 'from-cyan-500 to-blue-600' },
        'בישול':              { icon: '🍳', gradient: 'from-amber-500 to-orange-600' },
        'דרמה':               { icon: '🎭', gradient: 'from-purple-500 to-fuchsia-600' },
        'שחייה':              { icon: '🏊', gradient: 'from-sky-500 to-cyan-600' },
        'יהדות':              { icon: '✡️', gradient: 'from-blue-500 to-indigo-600' },
        'שפות':               { icon: '🗣️', gradient: 'from-yellow-500 to-amber-600' },
        'אחר':                { icon: '🎯', gradient: 'from-slate-500 to-gray-600' },
    };

    const ALL_CATEGORIES: ClassCategory[] = [
        'ספורט','מוזיקה','אומנות','ריקוד','אומנויות לחימה',
        'מדע ורובוטיקה','בישול','דרמה','שחייה','יהדות','שפות','אחר',
    ];

    function detectCategory(label: string, desc: string): ClassCategory {
        const txt = `${label} ${desc}`;
        if (/כדור|ספורט|התעמלות|אופניים|אתלטיקה|טניס/.test(txt)) return 'ספורט';
        if (/פסנתר|גיטרה|כינור|מוזיקה|תופים|זמרה/.test(txt))      return 'מוזיקה';
        if (/ציור|אומנות|פיסול|יצירה/.test(txt))                  return 'אומנות';
        if (/ריקוד|בלט|היפ הופ/.test(txt))                        return 'ריקוד';
        if (/קראטה|ג'ודו|טאקוונדו|קרב מגע/.test(txt))             return 'אומנויות לחימה';
        if (/רובוטיקה|מדע|תכנות|לגו/.test(txt))                   return 'מדע ורובוטיקה';
        if (/בישול|אפיה|מטבח/.test(txt))                          return 'בישול';
        if (/דרמה|משחק|תיאטרון/.test(txt))                        return 'דרמה';
        if (/שחיה|שחייה|בריכה/.test(txt))                         return 'שחייה';
        if (/תורה|פרשה|גמרא|מועד/.test(txt))                      return 'יהדות';
        if (/אנגלית|רוסית|ספרדית|שפה|צרפתית/.test(txt))           return 'שפות';
        return 'אחר';
    }

    function parseAge(raw: string): { min: number; max: number } {
        const m = String(raw || '').match(/(\d+)\D+(\d+)/);
        if (m) return { min: Number(m[1]), max: Number(m[2]) };
        const single = String(raw || '').match(/(\d+)/);
        if (single) return { min: Number(single[1]), max: Number(single[1]) + 4 };
        return { min: 5, max: 14 };
    }

    function parseDays(raw: string): string[] {
        const txt = String(raw || '');
        const out: string[] = [];
        for (const d of ['א','ב','ג','ד','ה','ו','ש']) if (txt.includes(d)) out.push(d);
        return out.length ? out : ['ב','ד'];
    }

    function parseTime(raw: string): { start: string; end: string } {
        const t = String(raw || '');
        const m = t.match(/(\d{1,2}:\d{2})/);
        const start = m ? m[1] : '16:30';
        const [h, mi] = start.split(':').map(Number);
        const endH = (h + 1) % 24;
        const end = `${String(endH).padStart(2,'0')}:${String(mi).padStart(2,'0')}`;
        return { start, end };
    }

    function dbToKlass(item: DbItem, idx: number): Klass {
        const ef = parseExtra(item.extra_fields);
        const category = detectCategory(item.label, item.description);
        const meta = CAT_META[category];
        const age = parseAge(String(ef.age_group ?? ''));
        const time = parseTime(String(ef.time ?? ''));
        return {
            id: item.id,
            label: item.label || 'חוג',
            category,
            instructor: item.contact || 'מדריך/ה',
            city: item.city || '',
            neighborhood: item.neighborhood || item.address || '',
            address: item.address || '',
            rating: 0,
            reviews: 0,
            pricePerMonth: Number(ef.price_month) || 0,
            freeTrial: false,
            format: 'פרונטלי',
            ageMin: age.min,
            ageMax: age.max,
            days: parseDays(String(ef.days ?? '')),
            timeStart: time.start,
            timeEnd: time.end,
            verified: false,
            spotsLeft: 5,
            capacity: 12,
            skills: [],
            description: item.description || '',
            phone: item.phone,
            gradient: meta.gradient,
            startedYear: new Date().getFullYear() - 1,
            lastActive: 'פעיל לאחרונה',
            isReal: true,
        };
    }

    // ===== Mock data — בהשראת Outschool / Sawyer / KidPass =====
    const mockKlasses: Klass[] = [
        {
            id: 'mc1', label: 'כדורגל לילדים', category: 'ספורט', instructor: 'דני אבני', sector: 'כללי',
            city: 'ירושלים', neighborhood: 'קרית משה', rating: 4.9, reviews: 84,
            pricePerMonth: 250, pricePerSession: 70, freeTrial: true, format: 'פרונטלי',
            ageMin: 6, ageMax: 12, days: ['ב','ד'], timeStart: '16:30', timeEnd: '17:30',
            verified: true, spotsLeft: 3, capacity: 16,
            skills: ['כושר אישי','עבודת צוות','משחק קבוצתי'],
            description: 'אימוני כדורגל ברמה גבוהה בקבוצות קטנות. דגש על כיף, חברות וכושר. ציוד מקצועי כלול.',
            phone: '050-1111111', gradient: 'from-emerald-500 to-teal-600', startedYear: 2019, lastActive: 'פעיל היום',
        },
        {
            id: 'mc2', label: 'פסנתר קלאסי וג\'אז', category: 'מוזיקה', instructor: 'ענת רוזן',
            city: 'תל אביב', neighborhood: 'רמת אביב', rating: 5.0, reviews: 137,
            pricePerMonth: 480, pricePerSession: 130, freeTrial: true, format: 'היברידי',
            ageMin: 5, ageMax: 18, days: ['א','ג','ה'], timeStart: '15:00', timeEnd: '16:00',
            verified: true, spotsLeft: 2, capacity: 6,
            skills: ['פיתוח שמיעה','סולמות','תיאוריה'],
            description: 'בוגרת אקדמיה למוזיקה עם 12 שנות הוראה. שיעורים פרטיים, הכנה לבחינות.',
            phone: '050-2222222', gradient: 'from-indigo-500 to-violet-600', startedYear: 2012, lastActive: 'פעילה היום',
        },
        {
            id: 'mc3', label: 'אומנות וקרמיקה', category: 'אומנות', instructor: 'מירב פרץ',
            city: 'חיפה', neighborhood: 'הדר', rating: 4.8, reviews: 56,
            pricePerMonth: 300, freeTrial: true, format: 'פרונטלי',
            ageMin: 4, ageMax: 10, days: ['ב','ה'], timeStart: '17:00', timeEnd: '18:30',
            verified: true, spotsLeft: 5, capacity: 12,
            skills: ['קרמיקה','ציור','עבודת יד'],
            description: 'סדנת יצירה לילדים — קרמיקה, ציור וקולאז\'. כל ילד לוקח הביתה יצירה. החומרים כלולים.',
            phone: '050-3333333', gradient: 'from-pink-500 to-rose-600', startedYear: 2015, lastActive: 'פעילה היום',
        },
        {
            id: 'mc4', label: 'בלט קלאסי', category: 'ריקוד', instructor: 'אנה פטרובה',
            city: 'ירושלים', neighborhood: 'בית הכרם', rating: 4.9, reviews: 92,
            pricePerMonth: 420, freeTrial: false, format: 'פרונטלי',
            ageMin: 4, ageMax: 16, days: ['א','ג'], timeStart: '16:00', timeEnd: '17:00',
            verified: true, spotsLeft: 0, capacity: 14,
            skills: ['בלט','גמישות','קצב'],
            description: 'סטודיו לבלט קלאסי בוגרת בולשוי. הופעות שנתיות, מבחני רמה. רקדניות בסטודיו שלנו התקבלו ל-Bat-Sheva.',
            phone: '050-4444444', gradient: 'from-fuchsia-500 to-pink-600', startedYear: 2008, lastActive: 'פעילה היום',
        },
        {
            id: 'mc5', label: 'קראטה — חגורה לחגורה', category: 'אומנויות לחימה', instructor: 'אבי שני (חגורה שחורה 3 דאן)',
            city: 'בני ברק', neighborhood: 'רמת אהרן', sector: 'דתי', rating: 4.8, reviews: 41,
            pricePerMonth: 280, freeTrial: true, format: 'פרונטלי',
            ageMin: 6, ageMax: 15, days: ['ב','ד','ה'], timeStart: '17:30', timeEnd: '18:30',
            verified: true, spotsLeft: 4, capacity: 18,
            skills: ['משמעת','ביטחון עצמי','כושר'],
            description: 'דוג\'ו מסורתי, גישה חינוכית — דגש על משמעת, ערכים וביטחון עצמי. מבחני חגורה פעמיים בשנה.',
            phone: '050-5555555', gradient: 'from-red-500 to-orange-600', startedYear: 2014, lastActive: 'פעיל היום',
        },
        {
            id: 'mc6', label: 'רובוטיקה ולגו מתקדם', category: 'מדע ורובוטיקה', instructor: 'מעבדת FuturoBot',
            city: 'תל אביב', neighborhood: 'רמת החייל', rating: 4.9, reviews: 178,
            pricePerMonth: 550, pricePerSession: 150, freeTrial: true, format: 'פרונטלי',
            ageMin: 7, ageMax: 14, days: ['ג'], timeStart: '17:00', timeEnd: '18:30',
            verified: true, spotsLeft: 1, capacity: 10,
            skills: ['תכנות','הנדסה','פתרון בעיות'],
            description: 'בניית רובוטים עם LEGO Mindstorms + תכנות חזותי. תחרויות FIRST LEGO League. ערכת חומרים כלולה.',
            phone: '050-6666666', gradient: 'from-cyan-500 to-blue-600', startedYear: 2017, lastActive: 'פעיל היום',
        },
        {
            id: 'mc7', label: 'בישול לילדים', category: 'בישול', instructor: 'שירה גינדי',
            city: 'אשדוד', neighborhood: 'רובע ז', rating: 4.7, reviews: 38,
            pricePerMonth: 320, freeTrial: false, format: 'פרונטלי',
            ageMin: 8, ageMax: 14, days: ['ד'], timeStart: '17:00', timeEnd: '19:00',
            verified: true, spotsLeft: 3, capacity: 8,
            skills: ['בטיחות במטבח','אפייה','מתכונים בריאים'],
            description: 'מטבח לילדים — אפייה, פסטות, סלטים. כל מפגש המנה הולכת הביתה. כל המרכיבים כלולים.',
            phone: '050-7777777', gradient: 'from-amber-500 to-orange-600', startedYear: 2020, lastActive: 'פעילה היום',
        },
        {
            id: 'mc8', label: 'דרמה ומשחק', category: 'דרמה', instructor: 'יוני מזרחי',
            city: 'רמת גן', neighborhood: 'מרכז העיר', rating: 4.8, reviews: 49,
            pricePerMonth: 380, freeTrial: true, format: 'פרונטלי',
            ageMin: 9, ageMax: 17, days: ['ב'], timeStart: '18:00', timeEnd: '19:30',
            verified: true, spotsLeft: 6, capacity: 14,
            skills: ['ביטוי עצמי','אילתור','עבודה מול קהל'],
            description: 'סטודיו למשחק — אילתורים, מונולוגים, סצינות. הצגת סוף שנה. שחרור הבמה — פחות ביישנות, יותר ביטחון.',
            phone: '050-8888888', gradient: 'from-purple-500 to-fuchsia-600', startedYear: 2016, lastActive: 'פעיל אתמול',
        },
        {
            id: 'mc9', label: 'שחייה רמת מתחילים-מתקדמים', category: 'שחייה', instructor: 'אורן יעקובי',
            city: 'נתניה', neighborhood: 'קרית השרון', rating: 4.9, reviews: 215,
            pricePerMonth: 450, pricePerSession: 120, freeTrial: false, format: 'פרונטלי',
            ageMin: 4, ageMax: 18, days: ['א','ג'], timeStart: '16:00', timeEnd: '17:00',
            verified: true, spotsLeft: 2, capacity: 10,
            skills: ['ארבעת הסגנונות','בטיחות במים','אימון תחרותי'],
            description: 'מאמן שחייה מוסמך, ניסיון אולימפי. קבוצות קטנות לפי רמה. בריכה מקורה.',
            phone: '050-9999999', gradient: 'from-sky-500 to-cyan-600', startedYear: 2010, lastActive: 'פעיל היום',
        },
        {
            id: 'mc10', label: 'אנגלית במשחק (קונברסיישן)', category: 'שפות', instructor: 'Sarah Goldstein',
            city: 'הרצליה', neighborhood: 'מרכז הרצליה', rating: 4.9, reviews: 73,
            pricePerMonth: 360, freeTrial: true, format: 'מקוון',
            ageMin: 6, ageMax: 12, days: ['א','ג'], timeStart: '17:00', timeEnd: '17:45',
            verified: true, spotsLeft: 4, capacity: 6,
            skills: ['דיבור','אוצר מילים','משחקי שפה'],
            description: 'דוברת אנגלית ילידית מבוסטון. שיעורים אינטראקטיביים בקבוצות קטנטנות עם משחקים, שירים וסיפורים.',
            phone: '050-0123456', gradient: 'from-yellow-500 to-amber-600', startedYear: 2018, lastActive: 'פעילה היום',
        },
        {
            id: 'mc11', label: 'תלמוד וגמרא לבני 10+', category: 'יהדות', instructor: 'הרב יצחק לוי', sector: 'דתי',
            city: 'ירושלים', neighborhood: 'הר נוף', rating: 5.0, reviews: 64,
            pricePerMonth: 200, freeTrial: true, format: 'פרונטלי',
            ageMin: 10, ageMax: 16, days: ['א','ב','ג','ד','ה'], timeStart: '19:00', timeEnd: '20:00',
            verified: true, spotsLeft: 7, capacity: 18,
            skills: ['לימוד עיוני','חשיבה אנליטית'],
            description: 'שיעור גמרא יומי לילדים אחה"צ. גישה משכילית — הבנת הסוגיה, לא רק שינון. גם בזום.',
            phone: '050-1234567', gradient: 'from-blue-500 to-indigo-600', startedYear: 2013, lastActive: 'פעיל היום',
        },
        {
            id: 'mc12', label: 'היפ הופ ילדים', category: 'ריקוד', instructor: 'דניאל פלאש',
            city: 'באר שבע', neighborhood: 'נאות לון', rating: 4.7, reviews: 28,
            pricePerMonth: 290, freeTrial: true, format: 'פרונטלי',
            ageMin: 7, ageMax: 14, days: ['ב','ה'], timeStart: '17:30', timeEnd: '18:30',
            verified: true, spotsLeft: 8, capacity: 20,
            skills: ['כוריאוגרפיה','קצב','ביטוי גופני'],
            description: 'סטודיו דינמי עם מוזיקה ועוצמה. תחרויות בארץ ובחו"ל. שיעור פתוח חינם בכל חודש.',
            phone: '050-2345678', gradient: 'from-fuchsia-500 to-pink-600', startedYear: 2019, lastActive: 'פעיל אתמול',
        },
    ];

    // איחוד DB + mock
    let realKlasses = $derived(items.map((it, idx) => dbToKlass(it, idx)));
    let allKlasses  = $derived([...realKlasses, ...mockKlasses]);

    // ===== Filters =====
    let searchQuery     = $state('');
    let selectedCity    = $state('');
    let selectedCat     = $state<ClassCategory | ''>('');
    let selectedAge     = $state<'' | 'tot' | 'child' | 'tween' | 'teen'>('');
    let onlyFreeTrial   = $state(false);
    let onlyAvailable   = $state(false);
    let sortBy          = $state<'featured' | 'rating' | 'price_low' | 'price_high' | 'newest'>('featured');

    let availableCities = $derived(
        [...new Set(allKlasses.map(s => s.city).filter(Boolean))].sort()
    );

    function ageInBucket(min: number, max: number): boolean {
        if (!selectedAge) return true;
        const bucket = selectedAge === 'tot'   ? [0,5]
                     : selectedAge === 'child' ? [6,10]
                     : selectedAge === 'tween' ? [11,14]
                     :                           [15,18];
        return !(max < bucket[0] || min > bucket[1]);
    }

    let filtered = $derived.by(() => {
        let arr = allKlasses.filter(k => {
            const q = searchQuery.trim();
            const matchSearch = !q ||
                k.label.includes(q) || k.description.includes(q) ||
                k.instructor.includes(q) || k.neighborhood.includes(q) ||
                k.city.includes(q) || k.skills.some(x => x.includes(q));
            const matchCity   = !selectedCity || k.city === selectedCity;
            const matchCat    = !selectedCat  || k.category === selectedCat;
            const matchAge    = ageInBucket(k.ageMin, k.ageMax);
            const matchTrial  = !onlyFreeTrial || k.freeTrial;
            const matchAvail  = !onlyAvailable || k.spotsLeft > 0;
            return matchSearch && matchCity && matchCat && matchAge && matchTrial && matchAvail;
        });

        if (sortBy === 'rating')     arr = [...arr].sort((a,b) => b.rating - a.rating);
        if (sortBy === 'price_low')  arr = [...arr].sort((a,b) => (a.pricePerMonth || 9999) - (b.pricePerMonth || 9999));
        if (sortBy === 'price_high') arr = [...arr].sort((a,b) => b.pricePerMonth - a.pricePerMonth);
        if (sortBy === 'newest')     arr = [...arr].sort((a,b) => b.startedYear - a.startedYear);
        if (sortBy === 'featured')   arr = [...arr].sort((a,b) => (b.rating * Math.log(b.reviews + 2)) - (a.rating * Math.log(a.reviews + 2)));
        return arr;
    });

    function clearAll() {
        searchQuery = ''; selectedCity = ''; selectedCat = ''; selectedAge = '';
        onlyFreeTrial = false; onlyAvailable = false; sortBy = 'featured'; currentPage = 1;
    }

    // ===== ❤️ Save =====
    let saved = $state<Record<string, boolean>>({});
    onMount(() => {
        const map: Record<string, boolean> = {};
        for (const k of allKlasses) if (isLiked('class', k.id)) map[k.id] = true;
        saved = map;
    });
    function toggleSave(k: Klass) {
        const loc = [k.neighborhood, k.city].filter(Boolean).join(', ');
        const summary = `${k.category} · ${loc}${k.pricePerMonth ? ` · ₪${k.pricePerMonth}/חודש` : ''}`;
        const isNow = toggleLike({ type: 'class', id: k.id, label: k.label, url: '/chugim', summary });
        saved[k.id] = isNow;
    }

    // ===== שיתוף =====
    let shareMenuId = $state<string | null>(null);
    function buildShareText(k: Klass): { title: string; text: string; url: string } {
        const url = typeof window !== 'undefined' ? `${window.location.origin}/chugim` : 'https://kehila-bashchuna.co.il/chugim';
        const loc = [k.neighborhood, k.city].filter(Boolean).join(', ');
        const lines = [`${CAT_META[k.category].icon} ${k.label} — ${k.instructor}`];
        if (loc) lines.push(`📍 ${loc}`);
        if (k.pricePerMonth) lines.push(`💰 ₪${k.pricePerMonth}/חודש`);
        if (k.description) lines.push(k.description);
        lines.push(url);
        return { title: 'חוגים — קהילה בשכונה', text: lines.join('\n'), url };
    }
    async function nativeShare(k: Klass) {
        const payload = buildShareText(k);
        if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
            try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(payload); return; } catch {}
        }
        shareMenuId = k.id;
    }
    function shareTo(network: 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'copy', k: Klass) {
        const { text, url } = buildShareText(k);
        const enc = encodeURIComponent;
        if (network === 'whatsapp')      window.open(`https://wa.me/?text=${enc(text)}`, '_blank');
        else if (network === 'telegram') window.open(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, '_blank');
        else if (network === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, '_blank');
        else if (network === 'x')        window.open(`https://twitter.com/intent/tweet?text=${enc(text)}`, '_blank');
        else if (network === 'copy')     navigator.clipboard?.writeText(text);
        shareMenuId = null;
    }

    // ===== מרחק =====
    function haversineKm(a: Coord, b: Coord): number {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b[0] - a[0]);
        const dLon = toRad(b[1] - a[1]);
        const lat1 = toRad(a[0]);
        const lat2 = toRad(b[0]);
        const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }

    const SECTION_TITLES = ['החוגים באזורך', 'חוגים בעירך', 'ערים קרובות', 'שאר הארץ'];

    function sectionFor(k: Klass, userNeigh: string, userCty: string): number {
        const sCoord = getCoordsFor(k.neighborhood, k.city);
        const uCoord = getCoordsFor(userNeigh, userCty);
        const dist   = haversineKm(sCoord, uCoord);
        if (k.city === userCty) {
            if (k.neighborhood === userNeigh || dist < 3) return 0;
            return 1;
        }
        if (dist < 35) return 2;
        return 3;
    }

    type SectionedKlass = Klass & { _section: number; _dist: number };
    let sectionedKlasses = $derived.by<SectionedKlass[]>(() => {
        const uN = neighborhoodState.neighborhood;
        const uC = neighborhoodState.city;
        const uCoord = getCoordsFor(uN, uC);
        return filtered.map(k => {
            const sCoord = getCoordsFor(k.neighborhood, k.city);
            return { ...k, _section: sectionFor(k, uN, uC), _dist: haversineKm(sCoord, uCoord) };
        }).sort((a, b) => {
            if (a._section !== b._section) return a._section - b._section;
            return a._dist - b._dist;
        });
    });

    // ===== פאג'ינציה =====
    const PAGE_SIZE = 8;
    let currentPage = $state(1);
    let totalPages  = $derived(Math.max(1, Math.ceil(sectionedKlasses.length / PAGE_SIZE)));

    $effect(() => {
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1)          currentPage = 1;
    });

    let pageGroups = $derived.by(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        const slice = sectionedKlasses.slice(start, start + PAGE_SIZE);
        const groups: { section: number; items: SectionedKlass[] }[] = [];
        for (const k of slice) {
            const last = groups[groups.length - 1];
            if (!last || last.section !== k._section) groups.push({ section: k._section, items: [k] });
            else last.items.push(k);
        }
        return groups;
    });

    function goToPage(p: number) {
        if (p < 1 || p > totalPages) return;
        currentPage = p;
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    $effect(() => {
        searchQuery; selectedCity; selectedCat; selectedAge; onlyFreeTrial; onlyAvailable; sortBy;
        currentPage = 1;
    });

    function ageLabel(k: Klass): string {
        return `גילאי ${k.ageMin}-${k.ageMax}`;
    }
</script>

{#snippet shareBtn(k: Klass)}
    <div class="relative flex-shrink-0">
        <button
            type="button"
            onclick={() => nativeShare(k)}
            title="שיתוף"
            aria-label="שיתוף"
            class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white py-2.5 px-3 rounded-xl transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="18" cy="5" r="3"/>
                <circle cx="6" cy="12" r="3"/>
                <circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
        </button>
        {#if shareMenuId === k.id}
            <div class="absolute right-0 bottom-full mb-1.5 z-30 w-44 rounded-xl bg-slate-900 border border-white/15 shadow-2xl p-1.5 flex flex-col gap-0.5">
                <button type="button" onclick={() => shareTo('whatsapp', k)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">💬 WhatsApp</button>
                <button type="button" onclick={() => shareTo('telegram', k)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">✈️ Telegram</button>
                <button type="button" onclick={() => shareTo('facebook', k)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">📘 Facebook</button>
                <button type="button" onclick={() => shareTo('x',        k)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">𝕏 Twitter</button>
                <button type="button" onclick={() => shareTo('copy',     k)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">📋 העתק קישור</button>
                <button type="button" onclick={() => shareMenuId = null} class="flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-lg px-2.5 py-1 text-[10px] transition-colors">סגור</button>
            </div>
        {/if}
    </div>
{/snippet}

<div class="min-h-screen bg-[#070b14] pt-6 pb-20" dir="rtl">

    <!-- ===== Hero ===== -->
    <div class="max-w-6xl mx-auto px-4 mb-6">
        <div class="relative overflow-hidden rounded-3xl p-6 md:p-12 text-center min-h-[240px] md:min-h-[320px] flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-rose-900">
            <!-- שכבת אייקונים מרחפת ברקע -->
            <div class="absolute inset-0 opacity-20 select-none pointer-events-none text-5xl md:text-7xl">
                <span class="absolute top-4 right-8">🎨</span>
                <span class="absolute top-12 left-12">🎵</span>
                <span class="absolute bottom-6 right-1/4">⚽</span>
                <span class="absolute bottom-12 left-1/4">🔬</span>
                <span class="absolute top-1/2 right-1/2">💃</span>
                <span class="absolute bottom-8 left-8">🥋</span>
            </div>
            <div class="relative">
                <h1 class="text-3xl md:text-5xl font-black text-white mb-3 drop-shadow-lg">לוח חוגים ארצי</h1>
                <p class="text-white/95 text-sm md:text-lg mb-4 drop-shadow">מצאו חוג מושלם לילד שלכם — לפי גיל, קטגוריה, מחיר ומיקום</p>
                <div class="inline-flex items-center gap-2 bg-black/40 backdrop-blur-sm border border-white/30 rounded-full px-4 py-2">
                    <span class="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
                    <span class="text-white text-sm font-medium">{allKlasses.length} חוגים פעילים</span>
                </div>
            </div>
        </div>
    </div>

    <!-- ===== CTA הוסף חוג ===== -->
    <div class="max-w-6xl mx-auto px-4 mb-5 flex justify-center">
        <a
            href="/add/education"
            class="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold px-7 py-3 rounded-full shadow-lg hover:shadow-indigo-500/30 transition-all hover:scale-105 text-sm"
        >
            <span class="font-black text-lg leading-none">+</span>
            הוסף חוג ללוח
        </a>
    </div>

    <!-- ===== קטגוריות (chips אופקיים) — בהשראת CourseHorse/Outschool ===== -->
    <div class="max-w-6xl mx-auto px-4 mb-3">
        <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-thin" style="scrollbar-width: thin;">
            <button
                onclick={() => (selectedCat = '')}
                class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
                    {selectedCat === ''
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                        : 'bg-[#0f172a] border border-white/10 text-gray-300 hover:border-indigo-500/40'}"
            >🌟 הכל</button>
            {#each ALL_CATEGORIES as cat}
                {@const meta = CAT_META[cat]}
                <button
                    onclick={() => (selectedCat = selectedCat === cat ? '' : cat)}
                    class="flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap
                        {selectedCat === cat
                            ? `bg-gradient-to-r ${meta.gradient} text-white shadow-lg`
                            : 'bg-[#0f172a] border border-white/10 text-gray-300 hover:border-white/30'}"
                >{meta.icon} {cat}</button>
            {/each}
        </div>
    </div>

    <!-- ===== Search + filters ===== -->
    <div class="max-w-6xl mx-auto px-4 mb-4">
        <div class="flex flex-col md:flex-row gap-3 mb-3">
            <div class="flex-1 relative">
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="🔍  חיפוש לפי שם החוג, מדריך, התמחות..."
                    class="w-full bg-[#0f172a] border border-white/10 focus:border-indigo-500/50 rounded-2xl px-5 py-3 text-white placeholder-gray-500 text-sm outline-none transition-colors"
                />
                {#if searchQuery}
                    <button onclick={() => (searchQuery = '')} class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-lg cursor-pointer">×</button>
                {/if}
            </div>
            {#if availableCities.length > 0}
                <select bind:value={selectedCity} class="bg-[#0f172a] border border-white/10 focus:border-indigo-500/50 rounded-2xl px-5 py-3 text-white text-sm outline-none appearance-none transition-colors min-w-[150px]">
                    <option value="" style="background:#fff;color:#0f172a;">📍 כל הערים</option>
                    {#each availableCities as c}
                        <option value={c} style="background:#fff;color:#0f172a;">{c}</option>
                    {/each}
                </select>
            {/if}
            <select bind:value={selectedAge} class="bg-[#0f172a] border border-white/10 focus:border-indigo-500/50 rounded-2xl px-5 py-3 text-white text-sm outline-none appearance-none transition-colors min-w-[150px]">
                <option value=""      style="background:#fff;color:#0f172a;">👧 כל הגילאים</option>
                <option value="tot"   style="background:#fff;color:#0f172a;">🍼 פעוטות (0-5)</option>
                <option value="child" style="background:#fff;color:#0f172a;">🎒 ילדים (6-10)</option>
                <option value="tween" style="background:#fff;color:#0f172a;">🛹 חטיבה (11-14)</option>
                <option value="teen"  style="background:#fff;color:#0f172a;">🎓 נוער (15-18)</option>
            </select>
            <select bind:value={sortBy} class="bg-[#0f172a] border border-white/10 focus:border-indigo-500/50 rounded-2xl px-5 py-3 text-white text-sm outline-none appearance-none transition-colors min-w-[150px]">
                <option value="featured"   style="background:#fff;color:#0f172a;">⭐ מומלצים</option>
                <option value="rating"     style="background:#fff;color:#0f172a;">★ דירוג גבוה</option>
                <option value="price_low"  style="background:#fff;color:#0f172a;">₪ מחיר נמוך</option>
                <option value="price_high" style="background:#fff;color:#0f172a;">₪ מחיר גבוה</option>
                <option value="newest"     style="background:#fff;color:#0f172a;">🆕 חדשים</option>
            </select>
        </div>

        <!-- Toggles + סיכום -->
        <div class="flex flex-wrap items-center gap-3 mt-2 text-xs">
            <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" bind:checked={onlyFreeTrial} class="accent-indigo-500 w-4 h-4 cursor-pointer" />
                <span class="text-gray-300">🎁 רק עם שיעור ניסיון חינם</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" bind:checked={onlyAvailable} class="accent-indigo-500 w-4 h-4 cursor-pointer" />
                <span class="text-gray-300">✅ רק עם מקומות פנויים</span>
            </label>
            <div class="flex-1"></div>
            <p class="text-gray-500 flex items-center gap-3">
                <span>מציג <span class="text-white font-bold">{filtered.length}</span> חוגים</span>
                {#if searchQuery || selectedCity || selectedCat || selectedAge || onlyFreeTrial || onlyAvailable}
                    <button onclick={clearAll} class="text-indigo-400 hover:text-indigo-300 underline cursor-pointer">נקה סינון</button>
                {/if}
            </p>
        </div>
    </div>

    <!-- ===== Grid ===== -->
    <div class="max-w-6xl mx-auto px-4">
        {#if filtered.length === 0}
            <div class="text-center py-16">
                <div class="text-5xl mb-4">🔎</div>
                <p class="text-gray-400 mb-3">לא נמצאו חוגים התואמים לחיפוש</p>
                <button onclick={clearAll} class="text-indigo-400 hover:text-indigo-300 underline text-sm cursor-pointer">נקה סינון</button>
            </div>
        {:else}
            {#each pageGroups as group (group.section + '-' + currentPage)}
                <!-- כותרת סקציה -->
                <div class="flex items-center gap-3 mt-6 mb-4 first:mt-0">
                    <span class="text-xl">
                        {group.section === 0 ? '📍' : group.section === 1 ? '🏙️' : group.section === 2 ? '🚗' : '🇮🇱'}
                    </span>
                    <h2 class="text-white font-black text-base md:text-lg whitespace-nowrap">
                        {SECTION_TITLES[group.section]}
                        {#if group.section === 0 && neighborhoodState.neighborhood}
                            <span class="text-indigo-300 font-bold">— {neighborhoodState.neighborhood}</span>
                        {:else if group.section === 1 && neighborhoodState.city}
                            <span class="text-indigo-300 font-bold">— {neighborhoodState.city}</span>
                        {/if}
                    </h2>
                    <div class="flex-1 h-px bg-gradient-to-l from-indigo-500/40 via-white/10 to-transparent"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {#each group.items as k}
                    {@const meta = CAT_META[k.category]}
                    <div class="bg-[#0f172a] rounded-2xl border border-white/10 hover:border-indigo-500/40 overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-indigo-500/10 transition-all hover:-translate-y-1 flex flex-col">

                        <!-- ===== באנר קטגוריה (Outschool-style) ===== -->
                        <div class="relative h-24 bg-gradient-to-br {meta.gradient} flex items-center justify-center">
                            <span class="text-6xl drop-shadow-lg">{meta.icon}</span>
                            <span class="absolute top-2 right-2 text-[10px] font-black bg-black/40 backdrop-blur-sm text-white px-2 py-1 rounded-full">
                                {k.category}
                            </span>
                            <button
                                onclick={() => toggleSave(k)}
                                class="absolute top-2 left-2 w-9 h-9 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-lg hover:scale-110 transition-transform cursor-pointer"
                                aria-label="שמור"
                                title={saved[k.id] ? 'מוצג בפרופיל שלך' : 'סמן אהבתי'}
                            >
                                {saved[k.id] ? '❤️' : '🤍'}
                            </button>
                            {#if k.freeTrial}
                                <span class="absolute bottom-2 right-2 text-[10px] font-black bg-yellow-400 text-amber-900 px-2 py-1 rounded-full shadow-lg animate-pulse">
                                    🎁 שיעור ניסיון חינם
                                </span>
                            {/if}
                            {#if k.spotsLeft > 0 && k.spotsLeft <= 3}
                                <span class="absolute bottom-2 left-2 text-[10px] font-black bg-red-500 text-white px-2 py-1 rounded-full shadow-lg">
                                    ⚡ {k.spotsLeft} מקומות אחרונים
                                </span>
                            {:else if k.spotsLeft === 0}
                                <span class="absolute bottom-2 left-2 text-[10px] font-black bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                                    מלא — רשימת המתנה
                                </span>
                            {/if}
                        </div>

                        <!-- כותרת + מדריך -->
                        <div class="p-4 border-b border-white/5">
                            <div class="flex items-start justify-between gap-2 mb-1">
                                <h3 class="text-white font-black text-base leading-tight">{k.label}</h3>
                            </div>
                            <p class="text-gray-300 text-xs flex items-center gap-1.5">
                                <span class="text-indigo-300">👤</span>
                                <span class="font-bold">{k.instructor}</span>
                                {#if k.verified}
                                    <span class="inline-flex items-center justify-center w-4 h-4 bg-blue-500 rounded-full text-white text-[9px] font-black" title="מאומת">✓</span>
                                {/if}
                            </p>
                            {#if k.city || k.neighborhood}
                                <p class="text-gray-400 text-xs mt-1 flex items-center gap-1">
                                    📍 {[k.neighborhood, k.city].filter(Boolean).join(', ')}
                                </p>
                            {/if}
                            <div class="flex items-center gap-2 mt-1.5 flex-wrap">
                                {#if k.rating > 0}
                                    <span class="inline-flex items-center gap-0.5 text-amber-400 text-xs font-bold">
                                        ★ {k.rating.toFixed(1)}
                                        <span class="text-gray-500 font-normal">({k.reviews})</span>
                                    </span>
                                {/if}
                                {#if k.sector}
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full {k.sector === 'חרדי'
                                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                        : k.sector === 'דתי'
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                            : 'bg-white/10 text-gray-300 border border-white/20'}">
                                        {k.sector}
                                    </span>
                                {/if}
                                <span class="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
                                    {k.format === 'מקוון' ? '💻' : k.format === 'היברידי' ? '🔀' : '🏫'} {k.format}
                                </span>
                            </div>
                        </div>

                        <!-- מטריקות: מחיר + גיל + לוז -->
                        <div class="grid grid-cols-3 divide-x divide-x-reverse divide-white/5 border-b border-white/5 text-center">
                            <div class="py-2.5">
                                <div class="text-indigo-300 font-black text-base leading-none">
                                    {k.pricePerMonth ? `₪${k.pricePerMonth}` : '—'}
                                </div>
                                <div class="text-[10px] text-gray-500 mt-0.5">לחודש</div>
                            </div>
                            <div class="py-2.5">
                                <div class="text-white font-black text-sm leading-none">{k.ageMin}-{k.ageMax}</div>
                                <div class="text-[10px] text-gray-500 mt-0.5">גילאים</div>
                            </div>
                            <div class="py-2.5">
                                <div class="text-white font-black text-sm leading-none">{k.days.join(',')}</div>
                                <div class="text-[10px] text-gray-500 mt-0.5">{k.timeStart}-{k.timeEnd}</div>
                            </div>
                        </div>

                        <!-- תיאור + מיומנויות -->
                        <div class="p-4 pb-2 flex-1">
                            {#if k.description}
                                <p class="text-gray-300 text-xs leading-relaxed mb-3 line-clamp-3">{k.description}</p>
                            {/if}

                            {#if k.skills.length > 0}
                                <div class="flex flex-wrap gap-1 mb-3">
                                    {#each k.skills.slice(0, 4) as skill}
                                        <span class="text-[10px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-md">
                                            ⭐ {skill}
                                        </span>
                                    {/each}
                                    {#if k.skills.length > 4}
                                        <span class="text-[10px] text-gray-500 px-1 py-0.5">+{k.skills.length - 4}</span>
                                    {/if}
                                </div>
                            {/if}

                            <!-- ימי שבוע ויזואלי -->
                            <div class="mt-2">
                                <div class="text-[10px] text-gray-500 mb-1.5 flex items-center gap-1">
                                    <span>📅</span> ימי החוג
                                </div>
                                <div class="grid grid-cols-7 gap-1">
                                    {#each ['א','ב','ג','ד','ה','ו','ש'] as d}
                                        {@const isOn = k.days.includes(d)}
                                        <div class="aspect-square flex items-center justify-center rounded text-[10px] font-bold
                                            {isOn
                                                ? 'bg-gradient-to-br ' + meta.gradient + ' text-white shadow'
                                                : 'bg-white/5 border border-white/10 text-gray-600'}">
                                            {d}
                                        </div>
                                    {/each}
                                </div>
                            </div>
                        </div>

                        <!-- פעולות -->
                        <div class="p-3 pt-2 flex gap-2 border-t border-white/5">
                            {@render shareBtn(k)}
                            <a href={waLink(k.phone)} target="_blank" rel="noopener noreferrer"
                                class="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm">
                                💬 הירשמו עכשיו
                            </a>
                            <a href="tel:{k.phone}"
                                class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white py-2.5 px-4 rounded-xl transition-colors text-sm" aria-label="חייג">
                                📞
                            </a>
                        </div>
                    </div>
                    {/each}
                </div>
            {/each}

            <!-- ===== Pagination ===== -->
            {#if totalPages > 1}
                <div class="mt-10 flex flex-col items-center gap-3">
                    <div class="flex items-center gap-2 flex-wrap justify-center">
                        <button
                            onclick={() => goToPage(currentPage - 1)}
                            disabled={currentPage === 1}
                            class="px-3 py-2 rounded-xl bg-[#0f172a] border border-white/10 text-white text-sm font-bold hover:border-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            aria-label="עמוד קודם"
                        >→ הקודם</button>

                        {#each Array.from({ length: totalPages }, (_, i) => i + 1) as p}
                            <button
                                onclick={() => goToPage(p)}
                                class="w-10 h-10 rounded-xl text-sm font-bold transition-all cursor-pointer
                                    {currentPage === p
                                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                                        : 'bg-[#0f172a] border border-white/10 text-white hover:border-indigo-500/40'}"
                                aria-label="עמוד {p}"
                                aria-current={currentPage === p ? 'page' : undefined}
                            >{p}</button>
                        {/each}

                        <button
                            onclick={() => goToPage(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            class="px-3 py-2 rounded-xl bg-[#0f172a] border border-white/10 text-white text-sm font-bold hover:border-indigo-500/40 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                            aria-label="עמוד הבא"
                        >הבא ←</button>
                    </div>

                    <p class="text-gray-400 text-sm font-medium">
                        עמוד <span class="text-white font-black">{currentPage}</span> מתוך <span class="text-white font-black">{totalPages}</span>
                    </p>
                </div>
            {/if}
        {/if}

        <!-- חזרה -->
        <div class="text-center mt-10 flex items-center justify-center gap-3 text-sm">
            <button
                type="button"
                onclick={() => typeof window !== 'undefined' && window.scrollTo({ top: 0, behavior: 'smooth' })}
                class="text-gray-500 hover:text-white transition-colors cursor-pointer"
            >↑ חזור לראש הדף</button>
            <span class="text-gray-700">|</span>
            <button
                type="button"
                onclick={() => typeof window !== 'undefined' && window.history.back()}
                class="text-gray-500 hover:text-white transition-colors cursor-pointer"
            >← חזור אחורה</button>
        </div>
    </div>
</div>

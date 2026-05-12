<script lang="ts">
    // לוח דרושים ארצי — בהשראת LinkedIn Jobs / Indeed / Glassdoor / AllJobs
    interface Item {
        id: string;
        label: string;
        description: string;
        icon: string;
        city: string;
        neighborhood: string;
        address: string;
        phone: string;
        contact: string;
        category: string;
        created_at: string;
        status: string;
        extra_fields?: string;
        view_count?: number;
    }

    let { data } = $props();

    // ====== Helpers ======
    function ef(item: Item, key: string): string {
        try { return JSON.parse(item.extra_fields ?? '{}')?.[key] ?? ''; } catch { return ''; }
    }
    function waLink(phone: string): string {
        const digits = (phone ?? '').replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }
    function timeAgo(iso: string): string {
        const d = new Date(iso).getTime();
        if (!d || Number.isNaN(d)) return '';
        const sec = Math.floor((Date.now() - d) / 1000);
        if (sec < 60) return 'עכשיו';
        const min = Math.floor(sec / 60);
        if (min < 60) return `לפני ${min} דק׳`;
        const hr = Math.floor(min / 60);
        if (hr < 24) return `לפני ${hr} שע׳`;
        const day = Math.floor(hr / 24);
        if (day < 7) return `לפני ${day} ימים`;
        const wk = Math.floor(day / 7);
        if (wk < 4) return `לפני ${wk} שב׳`;
        const mo = Math.floor(day / 30);
        return `לפני ${mo} חודשים`;
    }
    function initials(s: string): string {
        const trimmed = (s ?? '').trim();
        if (!trimmed) return '💼';
        const parts = trimmed.split(/\s+/);
        return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
    }
    function avatarColor(seed: string): string {
        const palette = [
            'from-indigo-500 to-purple-600',
            'from-blue-500 to-cyan-600',
            'from-emerald-500 to-teal-600',
            'from-amber-500 to-orange-600',
            'from-rose-500 to-pink-600',
            'from-violet-500 to-fuchsia-600',
        ];
        let h = 0;
        for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
        return palette[h % palette.length];
    }

    // ====== Mock fallback (לפי המדיניות — דוגמאות עד שיש מספיק פריטים אמיתיים) ======
    const mockItems: Item[] = [
        {
            id: 'mock-job-1', label: 'מנהל/ת חשבונות בכיר/ה',
            description: 'משרד רואי חשבון בירושלים מחפש מנהל/ת חשבונות מנוסה. סביבת עבודה משפחתית, אופציה להיברידי.',
            icon: '💼', city: 'ירושלים', neighborhood: 'תלפיות', address: 'ירושלים',
            phone: '052-1234567', contact: 'משרד רוזנברג ושות׳', category: 'jobs',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), status: 'active',
            extra_fields: JSON.stringify({ job_type: 'משרה מלאה', salary: '14,000-18,000 ₪', hours: 'א-ה 8:30-17:30', employer: 'משרד רוזנברג ושות׳', requirements: '3 שנות ניסיון, שליטה ב-חשבשבת' }),
            view_count: 412,
        },
        {
            id: 'mock-job-2', label: 'מורה פרטית למתמטיקה',
            description: 'מחפשים מורה למתמטיקה לכיתות ז-ט, פעמיים בשבוע, שעות אחה״צ.',
            icon: '📚', city: 'בני ברק', neighborhood: '', address: 'בני ברק',
            phone: '054-7654321', contact: 'משפחת לוי', category: 'jobs',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(), status: 'active',
            extra_fields: JSON.stringify({ job_type: 'פרילנס', salary: '120 ₪/שעה', hours: '2 פגישות בשבוע' }),
            view_count: 87,
        },
        {
            id: 'mock-job-3', label: 'מפתח/ת Frontend (React/Svelte)',
            description: 'סטארטאפ צומח מחפש מפתח/ת Frontend עם ניסיון. עבודה היברידית, גמישות מלאה.',
            icon: '💻', city: 'תל אביב', neighborhood: '', address: 'תל אביב',
            phone: '053-9988776', contact: 'דנה — HR', category: 'jobs',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), status: 'active',
            extra_fields: JSON.stringify({ job_type: 'משרה מלאה', salary: '25,000-35,000 ₪', hours: 'גמיש', employer: 'NovaTech', requirements: 'React/Svelte, TypeScript, 3+ שנים' }),
            view_count: 921,
        },
        {
            id: 'mock-job-4', label: 'בייבי סיטר לאחה״צ',
            description: 'מחפשים בייבי סיטר אחראית לילדה בת 4, שלושה ימים בשבוע 15:00-19:00.',
            icon: '👶', city: 'ירושלים', neighborhood: 'קרית משה', address: 'קרית משה, ירושלים',
            phone: '058-1112222', contact: 'משפחת כהן', category: 'jobs',
            created_at: new Date(Date.now() - 1000 * 60 * 50).toISOString(), status: 'active',
            extra_fields: JSON.stringify({ job_type: 'משרה חלקית', salary: '45 ₪/שעה', hours: '3 ימים, 15:00-19:00' }),
            view_count: 33,
        },
        {
            id: 'mock-job-5', label: 'מתנדב/ת בארגון חסד',
            description: 'ארגון חסד גדול בירושלים מחפש מתנדבים לחלוקת ארוחות לקשישים. שעתיים פעם בשבוע.',
            icon: '❤️', city: 'ירושלים', neighborhood: '', address: 'ירושלים',
            phone: '02-5555555', contact: 'יד שרה', category: 'jobs',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4).toISOString(), status: 'active',
            extra_fields: JSON.stringify({ job_type: 'התנדבות', hours: 'שעתיים בשבוע' }),
            view_count: 56,
        },
        {
            id: 'mock-job-6', label: 'נהג/ת משלוחים',
            description: 'בית עסק בפתח תקווה מחפש נהג/ת רכב פרטי למשלוחים באזור המרכז. שעות גמישות.',
            icon: '🚗', city: 'פתח תקווה', neighborhood: '', address: 'פתח תקווה',
            phone: '050-3334444', contact: 'משלוחי בזק', category: 'jobs',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(), status: 'active',
            extra_fields: JSON.stringify({ job_type: 'עבודה מזדמנת', salary: '55 ₪/שעה + דלק', hours: 'גמיש' }),
            view_count: 142,
        },
    ];

    const realItems = (data.items as Item[]) ?? [];
    let baseItems = $derived<Item[]>(realItems.length > 0 ? realItems : mockItems);

    // ====== State ======
    let searchQuery = $state('');
    let locationQuery = $state('');
    let selectedTypes = $state<Set<string>>(new Set());
    let salaryFilter = $state<'all' | 'hourly' | 'monthly' | 'high'>('all');
    let recentFilter = $state<'all' | '24h' | 'week' | 'month'>('all');
    let sortBy = $state<'recent' | 'popular' | 'salary'>('recent');
    let savedIds = $state<Set<string>>(new Set());

    // טעינת שמורים מהדפדפן
    $effect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = localStorage.getItem('jobs:saved');
            if (raw) savedIds = new Set(JSON.parse(raw));
        } catch {}
    });
    function toggleSave(id: string) {
        const next = new Set(savedIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        savedIds = next;
        try { localStorage.setItem('jobs:saved', JSON.stringify([...next])); } catch {}
    }

    const jobTypes = ['משרה מלאה', 'משרה חלקית', 'פרילנס', 'עבודה מזדמנת', 'התנדבות'];

    function toggleType(t: string) {
        const next = new Set(selectedTypes);
        if (next.has(t)) next.delete(t); else next.add(t);
        selectedTypes = next;
    }

    function parseSalaryNumber(s: string): number {
        if (!s) return 0;
        const nums = s.replace(/[,\s]/g, '').match(/\d+/g);
        if (!nums) return 0;
        return Math.max(...nums.map(Number));
    }

    let availableCities = $derived(
        [...new Set(baseItems.map((i) => i.city).filter(Boolean))].sort()
    );

    let filteredItems = $derived.by(() => {
        const q = searchQuery.trim().toLowerCase();
        const loc = locationQuery.trim().toLowerCase();
        const now = Date.now();
        const out = baseItems.filter((item) => {
            // חיפוש משולב
            if (q) {
                const hay = [item.label, item.description, ef(item, 'employer'), ef(item, 'requirements')]
                    .join(' ').toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (loc) {
                const hay = [item.city, item.neighborhood, item.address].join(' ').toLowerCase();
                if (!hay.includes(loc)) return false;
            }
            // סוג משרה
            if (selectedTypes.size > 0) {
                const jt = ef(item, 'job_type');
                if (!selectedTypes.has(jt)) return false;
            }
            // שכר
            if (salaryFilter !== 'all') {
                const sal = ef(item, 'salary');
                if (!sal) return false;
                const isHourly = /שע|hr|hour|\/ש/i.test(sal);
                const num = parseSalaryNumber(sal);
                if (salaryFilter === 'hourly' && !isHourly) return false;
                if (salaryFilter === 'monthly' && isHourly) return false;
                if (salaryFilter === 'high' && num < 20000) return false;
            }
            // פורסם לאחרונה
            if (recentFilter !== 'all') {
                const ts = new Date(item.created_at).getTime();
                if (!ts) return false;
                const age = now - ts;
                if (recentFilter === '24h' && age > 1000 * 60 * 60 * 24) return false;
                if (recentFilter === 'week' && age > 1000 * 60 * 60 * 24 * 7) return false;
                if (recentFilter === 'month' && age > 1000 * 60 * 60 * 24 * 30) return false;
            }
            return true;
        });

        // מיון
        if (sortBy === 'recent') {
            out.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        } else if (sortBy === 'popular') {
            out.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0));
        } else if (sortBy === 'salary') {
            out.sort((a, b) => parseSalaryNumber(ef(b, 'salary')) - parseSalaryNumber(ef(a, 'salary')));
        }
        return out;
    });

    // סטטיסטיקות לכותרת
    let stats = $derived.by(() => {
        const employers = new Set(baseItems.map((i) => ef(i, 'employer') || i.contact).filter(Boolean));
        const last24h = baseItems.filter((i) => Date.now() - new Date(i.created_at).getTime() < 86400000).length;
        return {
            total: baseItems.length,
            employers: employers.size,
            cities: new Set(baseItems.map((i) => i.city).filter(Boolean)).size,
            last24h,
        };
    });

    // משרות "חמות" — לפי view_count
    let hotJobs = $derived(
        [...baseItems].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 3)
    );

    function clearAll() {
        searchQuery = '';
        locationQuery = '';
        selectedTypes = new Set();
        salaryFilter = 'all';
        recentFilter = 'all';
        sortBy = 'recent';
    }

    function typeColor(t: string): string {
        switch (t) {
            case 'משרה מלאה':   return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
            case 'משרה חלקית':  return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
            case 'פרילנס':      return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
            case 'עבודה מזדמנת': return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
            case 'התנדבות':     return 'bg-pink-500/15 text-pink-300 border-pink-500/30';
            default:            return 'bg-white/10 text-gray-300 border-white/20';
        }
    }
</script>

<svelte:head>
    <title>לוח דרושים ארצי | קהילה בשכונה</title>
    <meta name="description" content="לוח דרושים ארצי — אלפי משרות מובחרות מכל הארץ. חיפוש, סינון לפי סוג משרה, שכר ומיקום." />
</svelte:head>

<div class="min-h-screen" dir="rtl">

    <!-- ====== Hero ====== -->
    <div class="relative overflow-hidden rounded-3xl mb-6 mx-4 md:mx-0">
        <div class="absolute inset-0 bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-700 opacity-95"></div>
        <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>

        <div class="relative px-5 py-8 md:px-10 md:py-12">
            <div class="flex items-center justify-between flex-wrap gap-3 mb-5">
                <div>
                    <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-3 py-1 mb-3">
                        <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <span class="text-white/90 text-xs font-bold">לוח ארצי · מתעדכן בזמן אמת</span>
                    </div>
                    <h1 class="text-3xl md:text-5xl font-black text-white mb-1 flex items-center gap-3">
                        <span class="text-4xl md:text-5xl">💼</span>
                        דרושים לעבודה
                    </h1>
                    <p class="text-white/80 text-sm md:text-base">המשרה הבאה שלך מחכה — חיפוש חכם בכל הארץ</p>
                </div>
                <a
                    href="/jobs/add"
                    class="inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 font-black px-5 py-3 rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all"
                >
                    <span class="text-lg">➕</span>
                    פרסם משרה חינם
                </a>
            </div>

            <!-- חיפוש כפול: משרה + מיקום (כמו Indeed / LinkedIn) -->
            <div class="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-2 flex flex-col md:flex-row gap-2">
                <div class="flex-1 flex items-center gap-2 bg-white/95 rounded-xl px-4 py-2">
                    <span class="text-indigo-600">🔍</span>
                    <input
                        type="text"
                        bind:value={searchQuery}
                        placeholder="תפקיד, מילות מפתח, חברה..."
                        class="flex-1 bg-transparent text-gray-900 placeholder-gray-500 text-sm outline-none"
                    />
                    {#if searchQuery}
                        <button onclick={() => (searchQuery = '')} class="text-gray-400 hover:text-gray-700 text-lg cursor-pointer">×</button>
                    {/if}
                </div>
                <div class="flex-1 flex items-center gap-2 bg-white/95 rounded-xl px-4 py-2">
                    <span class="text-indigo-600">📍</span>
                    <input
                        type="text"
                        bind:value={locationQuery}
                        placeholder="עיר, שכונה או 'מהבית'..."
                        list="cities-list"
                        class="flex-1 bg-transparent text-gray-900 placeholder-gray-500 text-sm outline-none"
                    />
                    <datalist id="cities-list">
                        {#each availableCities as c}
                            <option value={c}></option>
                        {/each}
                    </datalist>
                    {#if locationQuery}
                        <button onclick={() => (locationQuery = '')} class="text-gray-400 hover:text-gray-700 text-lg cursor-pointer">×</button>
                    {/if}
                </div>
            </div>

            <!-- סטטיסטיקות -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
                <div class="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2">
                    <div class="text-white text-xl font-black">{stats.total}</div>
                    <div class="text-white/70 text-[11px]">משרות פעילות</div>
                </div>
                <div class="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2">
                    <div class="text-white text-xl font-black">{stats.employers}</div>
                    <div class="text-white/70 text-[11px]">מעסיקים</div>
                </div>
                <div class="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2">
                    <div class="text-white text-xl font-black">{stats.cities}</div>
                    <div class="text-white/70 text-[11px]">ערים בארץ</div>
                </div>
                <div class="bg-white/10 backdrop-blur-sm border border-white/15 rounded-xl px-3 py-2">
                    <div class="text-white text-xl font-black">{stats.last24h}</div>
                    <div class="text-white/70 text-[11px]">חדשות ב-24 שעות</div>
                </div>
            </div>
        </div>
    </div>

    <!-- ====== סינונים ====== -->
    <div class="px-4 md:px-0 mb-5">
        <div class="bg-[#0f172a] border border-white/10 rounded-2xl p-3 md:p-4">
            <!-- שורת סוג משרה -->
            <div class="flex items-center gap-2 mb-3 flex-wrap">
                <span class="text-gray-400 text-xs font-bold ml-1">סוג משרה:</span>
                {#each jobTypes as t}
                    <button
                        type="button"
                        onclick={() => toggleType(t)}
                        class="px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer
                               {selectedTypes.has(t)
                                 ? 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white border-transparent shadow'
                                 : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}"
                    >{t}</button>
                {/each}
            </div>

            <!-- שורת שכר + פורסם + מיון -->
            <div class="flex flex-wrap items-center gap-3">
                <div class="flex items-center gap-1.5">
                    <span class="text-gray-400 text-xs font-bold">שכר:</span>
                    <div class="inline-flex bg-white/5 border border-white/10 rounded-full p-0.5">
                        {#each [['all','הכל'],['hourly','שעתי'],['monthly','חודשי'],['high','20K+']] as [val, lbl]}
                            <button
                                type="button"
                                onclick={() => (salaryFilter = val as typeof salaryFilter)}
                                class="px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer
                                       {salaryFilter === val ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow' : 'text-gray-400 hover:text-white'}"
                            >{lbl}</button>
                        {/each}
                    </div>
                </div>

                <div class="flex items-center gap-1.5">
                    <span class="text-gray-400 text-xs font-bold">פורסם:</span>
                    <div class="inline-flex bg-white/5 border border-white/10 rounded-full p-0.5">
                        {#each [['all','הכל'],['24h','24 שעות'],['week','שבוע'],['month','חודש']] as [val, lbl]}
                            <button
                                type="button"
                                onclick={() => (recentFilter = val as typeof recentFilter)}
                                class="px-3 py-1 rounded-full text-[11px] font-bold transition-all cursor-pointer
                                       {recentFilter === val ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow' : 'text-gray-400 hover:text-white'}"
                            >{lbl}</button>
                        {/each}
                    </div>
                </div>

                <div class="flex items-center gap-1.5 mr-auto">
                    <span class="text-gray-400 text-xs font-bold">מיון:</span>
                    <select
                        bind:value={sortBy}
                        class="bg-white/5 border border-white/10 hover:border-indigo-500/40 rounded-full px-3 py-1 text-[11px] font-bold text-white outline-none cursor-pointer"
                    >
                        <option value="recent" style="background:#fff;color:#0f172a;">הכי חדש</option>
                        <option value="popular" style="background:#fff;color:#0f172a;">הכי נצפה</option>
                        <option value="salary" style="background:#fff;color:#0f172a;">שכר גבוה</option>
                    </select>
                </div>

                {#if searchQuery || locationQuery || selectedTypes.size > 0 || salaryFilter !== 'all' || recentFilter !== 'all'}
                    <button
                        onclick={clearAll}
                        class="text-rose-400 hover:text-rose-300 text-xs font-bold underline cursor-pointer"
                    >נקה הכל ×</button>
                {/if}
            </div>
        </div>
    </div>

    <!-- ====== Hot Jobs (top 3) ====== -->
    {#if hotJobs.length > 0 && !searchQuery && !locationQuery && selectedTypes.size === 0}
        <div class="px-4 md:px-0 mb-5">
            <div class="flex items-center gap-2 mb-2">
                <span class="text-orange-400 text-lg">🔥</span>
                <h2 class="text-white font-black text-sm">המשרות הכי לוהטות השבוע</h2>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                {#each hotJobs as item}
                    {@const jt = ef(item, 'job_type')}
                    {@const salary = ef(item, 'salary')}
                    {@const employer = ef(item, 'employer') || item.contact}
                    <a
                        href="/items/{item.id}"
                        class="block bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/30 hover:border-orange-400/60 rounded-2xl p-3 transition-all hover:-translate-y-0.5"
                    >
                        <div class="flex items-center gap-2 mb-1.5">
                            <span class="text-[10px] font-black bg-gradient-to-r from-orange-500 to-red-500 text-white px-2 py-0.5 rounded-full">🔥 חם</span>
                            <span class="text-gray-500 text-[10px]">{item.view_count ?? 0} צפיות</span>
                        </div>
                        <h3 class="text-white font-bold text-sm mb-1 truncate">{item.label}</h3>
                        <p class="text-gray-400 text-xs truncate mb-1">{employer}</p>
                        <div class="flex items-center gap-2 text-[11px]">
                            {#if salary}<span class="text-emerald-400 font-bold">💰 {salary}</span>{/if}
                            {#if jt}<span class="text-gray-400">· {jt}</span>{/if}
                        </div>
                    </a>
                {/each}
            </div>
        </div>
    {/if}

    <!-- ====== תוצאות ====== -->
    <div class="px-4 md:px-0">
        <div class="flex items-center justify-between mb-3">
            <p class="text-gray-400 text-sm">
                <span class="text-white font-black">{filteredItems.length}</span> משרות
                {#if savedIds.size > 0}
                    <span class="mr-2 text-yellow-400">· {savedIds.size} שמורות ⭐</span>
                {/if}
            </p>
        </div>

        {#if filteredItems.length === 0}
            <div class="text-center py-16 bg-[#0f172a] border border-white/10 rounded-2xl">
                <div class="text-5xl mb-3">🔎</div>
                <h2 class="text-white font-bold text-lg mb-1">לא נמצאו משרות מתאימות</h2>
                <p class="text-gray-400 text-sm mb-5">נסה לשנות את החיפוש או הסינון</p>
                <button
                    onclick={clearAll}
                    class="inline-block bg-gradient-to-r from-indigo-600 to-blue-700 text-white font-bold px-6 py-2.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all"
                >נקה סינון</button>
            </div>
        {:else}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {#each filteredItems as item}
                    {@const jt = ef(item, 'job_type')}
                    {@const salary = ef(item, 'salary')}
                    {@const hours = ef(item, 'hours')}
                    {@const employer = ef(item, 'employer') || item.contact || ''}
                    {@const requirements = ef(item, 'requirements')}
                    {@const saved = savedIds.has(item.id)}
                    {@const isNew = Date.now() - new Date(item.created_at).getTime() < 86400000}
                    <div class="group bg-[#0f172a] border border-white/10 hover:border-indigo-500/50 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-900/20 flex flex-col">
                        <div class="flex items-start gap-3 mb-2">
                            <!-- אווטר חברה -->
                            <div class="w-12 h-12 rounded-xl bg-gradient-to-br {avatarColor(employer || item.label)} flex items-center justify-center text-white font-black text-lg flex-shrink-0 shadow-lg">
                                {initials(employer || item.label)}
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="flex items-start justify-between gap-2">
                                    <a href="/items/{item.id}" class="block min-w-0 flex-1">
                                        <h3 class="text-white font-bold text-base group-hover:text-indigo-300 transition-colors truncate flex items-center gap-1.5">
                                            {item.label}
                                            {#if isNew}<span class="text-[9px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full flex-shrink-0">חדש</span>{/if}
                                        </h3>
                                        {#if employer}
                                            <p class="text-gray-400 text-xs truncate">{employer}</p>
                                        {/if}
                                    </a>
                                    <button
                                        type="button"
                                        onclick={() => toggleSave(item.id)}
                                        aria-label={saved ? 'הסר מהשמורים' : 'שמור משרה'}
                                        title={saved ? 'הסר מהשמורים' : 'שמור משרה'}
                                        class="flex-shrink-0 text-xl transition-all hover:scale-110 cursor-pointer {saved ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400'}"
                                    >{saved ? '⭐' : '☆'}</button>
                                </div>
                            </div>
                        </div>

                        <!-- צ'יפים: סוג + שכר + שעות -->
                        <div class="flex flex-wrap gap-1.5 mb-2">
                            {#if jt}
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border {typeColor(jt)}">{jt}</span>
                            {/if}
                            {#if salary}
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">💰 {salary}</span>
                            {/if}
                            {#if hours}
                                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10">🕒 {hours}</span>
                            {/if}
                        </div>

                        <!-- מיקום + תאריך -->
                        <div class="flex items-center gap-3 text-[11px] text-gray-400 mb-2">
                            {#if item.city || item.neighborhood}
                                <span class="flex items-center gap-1">📍 {[item.neighborhood, item.city].filter(Boolean).join(', ')}</span>
                            {/if}
                            <span class="mr-auto text-gray-500">{timeAgo(item.created_at)}</span>
                        </div>

                        <!-- תיאור -->
                        {#if item.description}
                            <p class="text-gray-300 text-xs leading-relaxed line-clamp-2 mb-2">{item.description}</p>
                        {/if}
                        {#if requirements}
                            <p class="text-gray-500 text-[11px] line-clamp-1 mb-3"><span class="text-indigo-400 font-bold">דרישות:</span> {requirements}</p>
                        {/if}

                        <!-- פעולות -->
                        <div class="flex gap-2 mt-auto pt-2 border-t border-white/5">
                            <a
                                href="/items/{item.id}"
                                class="flex-1 text-center bg-gradient-to-r from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white font-bold py-2 rounded-xl text-xs transition-all"
                            >פרטים מלאים</a>
                            {#if item.phone}
                                <a
                                    href={waLink(item.phone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="flex items-center justify-center gap-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors"
                                    aria-label="WhatsApp"
                                >💬</a>
                                <a
                                    href="tel:{item.phone}"
                                    class="flex items-center justify-center gap-1 bg-white/10 hover:bg-white/15 text-white font-bold py-2 px-3 rounded-xl text-xs transition-colors"
                                    aria-label="התקשר"
                                >📞</a>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>

    <!-- ====== CTA ====== -->
    <div class="mt-10 mb-6 mx-4 md:mx-0">
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-700 to-blue-800 p-6 md:p-8 text-center">
            <div class="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' viewBox=\'0 0 40 40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23fff\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M20 20l-10-10v20zM20 20l10-10v20z\'/%3E%3C/g%3E%3C/svg%3E')]"></div>
            <div class="relative">
                <div class="text-4xl mb-2">📢</div>
                <h2 class="text-white text-xl md:text-2xl font-black mb-1">מחפש/ת עובדים?</h2>
                <p class="text-white/80 text-sm mb-5">פרסם משרה בחינם ותחשף לאלפי מועמדים בכל הארץ</p>
                <a
                    href="/jobs/add"
                    class="inline-block bg-white text-indigo-700 hover:bg-indigo-50 font-black px-8 py-3 rounded-2xl shadow-xl hover:-translate-y-0.5 transition-all"
                >+ פרסם משרה חינם</a>
                <div class="mt-4">
                    <a href="/" class="text-white/60 hover:text-white text-xs transition-colors">← חזרה לדף הבית</a>
                </div>
            </div>
        </div>
    </div>
</div>

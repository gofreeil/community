<script lang="ts">
    import type { PageData } from './$types';
    import { toggleLike, isLiked } from '$lib/likedItems';

    let { data }: { data: PageData } = $props();

    type Gender = 'all' | 'male' | 'female';
    // אם המשתמש מחובר ויש לו מגדר — נועלים את הסינון על המגדר הנגדי
    const lockedFilter: Gender | null =
        data.currentUserGender === 'male' ? 'female'
        : data.currentUserGender === 'female' ? 'male'
        : null;
    let filter = $state<Gender>(lockedFilter ?? 'all');

    type AgeGroup = 'all' | 'under30' | '30plus' | 'golden';
    type Religiosity = 'all' | 'haredi' | 'dl' | 'general';
    let ageFilter = $state<AgeGroup>('all');
    let relFilter = $state<Religiosity>('all');

    function ageGroupOf(ageStr: string): AgeGroup {
        const n = parseInt(ageStr, 10);
        if (!Number.isFinite(n)) return 'all';
        if (n >= 60) return 'golden';
        if (n >= 30) return '30plus';
        return 'under30';
    }

    let favorites = $state<Set<string>>(new Set());

    $effect(() => {
        if (typeof window === 'undefined') return;
        // אתחול ראשוני: סנכרון מצב הלבבות עם liked_items_v1
        const next = new Set<string>();
        try {
            const raw = localStorage.getItem('liked_items_v1');
            if (raw) {
                const arr = JSON.parse(raw);
                if (Array.isArray(arr)) {
                    for (const x of arr) {
                        if (x?.type === 'single' && x?.id) next.add(String(x.id));
                    }
                }
            }
        } catch {}
        favorites = next;
    });

    function toggleFavorite(person: { id: string; label: string; gender: 'male' | 'female'; age: string; city: string; description: string }, e: MouseEvent) {
        e.preventDefault();
        e.stopPropagation();
        const id = String(person.id);
        const nowLiked = toggleLike({
            type: 'single',
            id,
            label: person.label,
            url: '/singles',
            summary: `${person.gender === 'male' ? '👨' : '👩'} ${person.age} · ${person.city}`,
        });
        const next = new Set(favorites);
        if (nowLiked) next.add(id);
        else next.delete(id);
        favorites = next;
    }

    function getGender(extraFields: string): 'male' | 'female' {
        try {
            const ef = JSON.parse(extraFields);
            return ef.gender === 'male' ? 'male' : 'female';
        } catch { return 'male'; }
    }

    function getAge(extraFields: string): string {
        try { return JSON.parse(extraFields)?.age ?? ''; }
        catch { return ''; }
    }

    function getCity(extraFields: string): string {
        try { return JSON.parse(extraFields)?.city ?? ''; }
        catch { return ''; }
    }

    function getDescription(extraFields: string): string {
        try { return JSON.parse(extraFields)?.about ?? ''; }
        catch { return ''; }
    }

    // --- שיתוף כרטיס ---
    let shareMenuItemId = $state<string | null>(null);
    function buildShareText(it: { label: string; age?: string; city?: string; description?: string }): { title: string; text: string; url: string } {
        const url = typeof window !== 'undefined' ? `${window.location.origin}/singles` : 'https://kehila-bashchuna.co.il/singles';
        const meta = [it.age ? `🎂 ${it.age}` : '', it.city ? `📍 ${it.city}` : ''].filter(Boolean).join(' · ');
        const lines = [`💑 לוח פנויים ופנויות — ${it.label}`];
        if (meta) lines.push(meta);
        if (it.description) lines.push(it.description);
        const text = lines.join('\n');
        return { title: 'לוח פנויים ופנויות — קהילה בשכונה', text, url };
    }
    async function nativeShare(it: { id: string; label: string; age?: string; city?: string; description?: string }) {
        const payload = buildShareText(it);
        if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
            try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(payload); return; } catch {}
        }
        shareMenuItemId = it.id;
    }
    function shareTo(network: 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'copy', it: { label: string; age?: string; city?: string; description?: string }) {
        const { text, url } = buildShareText(it);
        const textWithUrl = `${text}\n${url}`;
        const enc = encodeURIComponent;
        if (network === 'whatsapp')      window.open(`https://wa.me/?text=${enc(textWithUrl)}`, '_blank');
        else if (network === 'telegram') window.open(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, '_blank');
        else if (network === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, '_blank');
        else if (network === 'x')        window.open(`https://twitter.com/intent/tweet?text=${enc(textWithUrl)}`, '_blank');
        else if (network === 'copy')     navigator.clipboard?.writeText(textWithUrl);
        shareMenuItemId = null;
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    let filtered = $derived(
        filter === 'all'
            ? data.items
            : data.items.filter(i => getGender(i.extra_fields) === filter)
    );

    // Mock data for display
    // התמונות נוצרות דינמית ע"י DiceBear (SVG מאויר — אנונימי, פרטי, ולא משויך לאדם אמיתי)
    const avatar = (seed: string, female: boolean) =>
        `https://api.dicebear.com/9.x/personas/svg?seed=${encodeURIComponent(seed)}` +
        (female
            ? '&hair=long,curly,bobCut,bobBangs,curlyBun,straightBun,pigtails,bunUndercut'
            : '&hair=shortCombover,shortComboverChops,buzzcut,fade,sideShave,curlyHighTop');

    const mockSingles = [
        { id: '1', nickname: 'דודי',     label: 'פנוי, 28, ירושלים',   gender: 'male'   as const, age: '28', religiosity: 'haredi'  as const, city: 'ירושלים',   description: 'סטודנט למדעי המחשב, אוהב טיולים ומוזיקה.',           lookingFor: 'בת זוג רצינית, יראת שמיים, עם חוש הומור',  inspiration: '"איזהו עשיר? השמח בחלקו"',                  avatar: avatar('Dudi-1',  false), contact: 'דוד',     phone: '050-1234567' },
        { id: '2', nickname: 'שרהל\'ה', label: 'פנויה, 25, ירושלים',  gender: 'female' as const, age: '25', religiosity: 'haredi'  as const, city: 'ירושלים',   description: 'מורה לאנגלית, אוהבת ספרים ובישול.',                  lookingFor: 'בן זוג ירא שמיים, רגיש וחכם, עם שאיפות',     inspiration: '"כל מה שעשה הקב"ה — לטובה עשה"',           avatar: avatar('Sara-2',  true),  contact: 'שרה',     phone: '050-2345678' },
        { id: '3', nickname: 'יוסי',     label: 'פנוי, 31, בני ברק',   gender: 'male'   as const, age: '31', religiosity: 'haredi'  as const, city: 'בני ברק',   description: 'מהנדס תוכנה, בוגר ישיבה.',                            lookingFor: 'בת זוג עם ערכים, יראת שמיים, אכפתית',       inspiration: '"איזהו חכם? הלומד מכל אדם"',                avatar: avatar('Yossi-3', false), contact: 'יוסף',    phone: '050-3456789' },
        { id: '4', nickname: 'רחלי',     label: 'פנויה, 24, רמת גן',   gender: 'female' as const, age: '24', religiosity: 'dl'      as const, city: 'רמת גן',    description: 'סטודנטית לעבודה סוציאלית, מתנדבת בארגון "לתת".',     lookingFor: 'בן זוג רציני, אוהב חסד, עם לב טוב',          inspiration: '"ואהבת לרעך כמוך"',                          avatar: avatar('Racheli-4', true),  contact: 'רחל',     phone: '050-4567890' },
        { id: '5', nickname: 'מושיק',    label: 'פנוי, 29, ירושלים',   gender: 'male'   as const, age: '29', religiosity: 'dl'      as const, city: 'ירושלים',   description: 'עורך דין, אוהב ספורט ושיעורי תורה.',                  lookingFor: 'בת זוג עם חוש הומור, חכמה, רגישה',           inspiration: '"חזק ואמץ כי אתה תנחיל"',                    avatar: avatar('Moshik-5', false), contact: 'משה',     phone: '050-5678901' },
        { id: '6', nickname: 'לאל\'ה',  label: 'פנויה, 27, פתח תקווה', gender: 'female' as const, age: '27', religiosity: 'general' as const, city: 'פתח תקווה', description: 'גרפיקאית, אוהבת אמנות ויצירה.',                       lookingFor: 'בן זוג עם חוש הומור, יצירתי, אוהב חיים',     inspiration: '"להאמין ולחלום ולא לוותר"',                  avatar: avatar('Leah-6',   true),  contact: 'לאה',     phone: '050-6789012' },
        { id: '7', nickname: 'אברימי',  label: 'פנוי, 63, ירושלים',   gender: 'male'   as const, age: '63', religiosity: 'dl'      as const, city: 'ירושלים',   description: 'רואה חשבון בגמלאות, אוהב חסד ועזרה לזולת.',          lookingFor: 'בת זוג לבניין בית, חמה ואוהבת',              inspiration: '"בלי לוותר על אהבה — בכל גיל"',              avatar: avatar('Avremi-7', false), contact: 'אברהם',  phone: '050-7890123' },
        { id: '8', nickname: 'מירי',     label: 'פנויה, 65, ירושלים',  gender: 'female' as const, age: '65', religiosity: 'general' as const, city: 'ירושלים',   description: 'אחות בדימוס, אוהבת טבע וטיולים.',                     lookingFor: 'בן זוג אמיתי, רגיש, אוהב חיים',              inspiration: '"זה הזמן להתחיל פרק חדש"',                   avatar: avatar('Miri-8',   true),  contact: 'מרים',   phone: '050-8901234' },
    ];

    let filteredMock = $derived(
        mockSingles
            .filter(s => filter === 'all' || s.gender === filter)
            .filter(s => ageFilter === 'all' || ageGroupOf(s.age) === ageFilter)
            .filter(s => relFilter === 'all' || s.religiosity === relFilter)
    );
</script>

<svelte:head>
    <title>לוח פנויים ופנויות | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-4xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-6">
            <div class="inline-block p-[3px] rounded-3xl bg-gradient-to-br from-pink-500 via-rose-400 to-purple-600 shadow-2xl shadow-pink-500/30 mb-4">
                <div class="rounded-[1.3rem] bg-[#0f172a] p-2">
                    <img src="/images/Available.png" alt="לוח פנויים ופנויות" class="h-48 md:h-64 rounded-2xl mx-auto block" />
                </div>
            </div>
            <h1 class="text-3xl font-black text-white mb-2">לוח פנויים ופנויות</h1>
            <p class="text-gray-400">לוח ארצי — מציאת בן/בת זוג מכל רחבי הארץ</p>
        </div>

        <!-- Filters: גילאים + רמה דתית -->
        <div class="mb-6 space-y-3">
            <!-- גילאים -->
            <div>
                <div class="text-gray-400 text-xs font-bold mb-2 text-center">גילאים</div>
                <div class="flex flex-wrap justify-center gap-2">
                    <button
                        onclick={() => ageFilter = 'all'}
                        class="px-4 py-1.5 rounded-full text-sm font-bold transition-all {ageFilter === 'all' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/15'}"
                    >הכל</button>
                    <button
                        onclick={() => ageFilter = 'under30'}
                        class="px-4 py-1.5 rounded-full text-sm font-bold transition-all {ageFilter === 'under30' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/15'}"
                    >עד גיל 30</button>
                    <button
                        onclick={() => ageFilter = '30plus'}
                        class="px-4 py-1.5 rounded-full text-sm font-bold transition-all {ageFilter === '30plus' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/15'}"
                    >30+</button>
                    <button
                        onclick={() => ageFilter = 'golden'}
                        class="px-4 py-1.5 rounded-full text-sm font-bold transition-all {ageFilter === 'golden' ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/15'}"
                    >גיל הזהב</button>
                </div>
            </div>

            <!-- רמה דתית -->
            <div>
                <div class="text-gray-400 text-xs font-bold mb-2 text-center">רמה דתית</div>
                <div class="flex flex-wrap justify-center gap-2">
                    <button
                        onclick={() => relFilter = 'all'}
                        class="px-4 py-1.5 rounded-full text-sm font-bold transition-all {relFilter === 'all' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/15'}"
                    >הכל</button>
                    <button
                        onclick={() => relFilter = 'haredi'}
                        class="px-4 py-1.5 rounded-full text-sm font-bold transition-all {relFilter === 'haredi' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/15'}"
                    >חרדי</button>
                    <button
                        onclick={() => relFilter = 'dl'}
                        class="px-4 py-1.5 rounded-full text-sm font-bold transition-all {relFilter === 'dl' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/15'}"
                    >דתי לאומי</button>
                    <button
                        onclick={() => relFilter = 'general'}
                        class="px-4 py-1.5 rounded-full text-sm font-bold transition-all {relFilter === 'general' ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg' : 'bg-white/10 text-gray-300 hover:bg-white/15'}"
                    >מגזר כללי</button>
                </div>
            </div>

            {#if lockedFilter}
                <div class="flex justify-center">
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r {lockedFilter === 'male' ? 'from-blue-500 to-cyan-500' : 'from-pink-500 to-rose-500'} text-white shadow">
                        <span>{lockedFilter === 'male' ? '👨 פנויים' : '👩 פנויות'}</span>
                        <span class="text-white/80">· מותאם לפרופיל שלך</span>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Add button -->
        <div class="flex justify-center mb-6">
            <a
                href="/singles/add"
                class="inline-flex items-center gap-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-full shadow-lg hover:shadow-pink-500/25 transition-all hover:scale-105"
            >
                <span class="text-lg">💌</span>
                פרסם מודעה חדשה
            </a>
        </div>

        <!-- Counter -->
        <div class="text-center mb-6">
            <p class="text-gray-500 text-sm">💑 {filteredMock.length} פרופילים פעילים</p>
        </div>

        <!-- Cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredMock as person}
                {@const isMale = person.gender === 'male'}
                {@const isFav = favorites.has(person.id)}
                <div class="rounded-2xl bg-[#0f172a] border {isMale ? 'border-blue-500/30' : 'border-pink-500/30'} overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                    <!-- Card header -->
                    <div class="bg-gradient-to-r {isMale ? 'from-blue-600 to-cyan-600' : 'from-pink-600 to-rose-500'} p-4 flex items-center gap-3 relative">
                        <div class="w-16 h-16 rounded-full bg-white/25 ring-2 ring-white/30 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
                            <img src={person.avatar} alt={person.nickname} class="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-white font-black text-lg leading-tight">{person.nickname}</h3>
                            <p class="text-white/70 text-xs font-medium mb-1">{person.label}</p>
                            <div class="flex items-center gap-3 text-white/85 text-sm">
                                <span>🎂 {person.age}</span>
                                <span>📍 {person.city}</span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onclick={(e) => toggleFavorite(person, e)}
                            aria-label={isFav ? 'הסר מהאהובים' : 'הוסף לאהובים'}
                            title={isFav ? 'הסר מהאהובים' : 'אהבתי'}
                            class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 backdrop-blur-sm text-xl transition-all {isFav ? 'text-rose-300 scale-110' : 'text-white/80 hover:text-rose-200'}"
                        >{isFav ? '❤️' : '🤍'}</button>
                    </div>

                    <!-- Card body -->
                    <div class="p-4">
                        <p class="text-gray-300 text-sm leading-relaxed mb-3">{person.description}</p>

                        {#if person.lookingFor}
                            <div class="mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                                <p class="text-[11px] font-bold {isMale ? 'text-cyan-300' : 'text-pink-300'} mb-0.5">{isMale ? 'מחפש' : 'מחפשת'}</p>
                                <p class="text-gray-200 text-sm leading-snug">{person.lookingFor}</p>
                            </div>
                        {/if}

                        {#if person.inspiration}
                            <p class="text-gray-400 text-xs italic leading-snug mb-4 border-r-2 {isMale ? 'border-cyan-500/40' : 'border-pink-500/40'} pr-2">
                                {person.inspiration}
                            </p>
                        {/if}

                        <div class="flex gap-2">
                            <div class="relative flex-shrink-0">
                                <button
                                    type="button"
                                    onclick={() => nativeShare(person)}
                                    title="שיתוף"
                                    aria-label="שיתוף"
                                    class="flex items-center justify-center bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-3 rounded-xl transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                        <circle cx="18" cy="5" r="3"/>
                                        <circle cx="6" cy="12" r="3"/>
                                        <circle cx="18" cy="19" r="3"/>
                                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                                    </svg>
                                </button>
                                {#if shareMenuItemId === person.id}
                                    <div class="absolute right-0 bottom-full mb-1.5 z-30 w-44 rounded-xl bg-slate-900 border border-white/15 shadow-2xl p-1.5 flex flex-col gap-0.5">
                                        <button type="button" onclick={() => shareTo('whatsapp', person)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">💬 WhatsApp</button>
                                        <button type="button" onclick={() => shareTo('telegram', person)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">✈️ Telegram</button>
                                        <button type="button" onclick={() => shareTo('facebook', person)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">📘 Facebook</button>
                                        <button type="button" onclick={() => shareTo('x',        person)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">𝕏 Twitter</button>
                                        <button type="button" onclick={() => shareTo('copy',     person)} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">📋 העתק קישור</button>
                                        <button type="button" onclick={() => shareMenuItemId = null} class="flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-lg px-2.5 py-1 text-[10px] transition-colors">סגור</button>
                                    </div>
                                {/if}
                            </div>
                            <a
                                href={waLink(person.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="שלח הודעת וואטסאפ ל-{person.label} (נפתח בחלון חדש)"
                                class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                            >
                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.03L.789 23.702l4.823-1.467A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.33 0-4.481-.76-6.234-2.048l-.447-.334-2.862.87.908-2.745-.367-.472A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                                WhatsApp
                            </a>
                            <a
                                href="tel:{person.phone}"
                                class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                            >
                                📞 התקשר
                            </a>
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        {#if filteredMock.length === 0}
            <div class="text-center py-16">
                <span class="text-5xl mb-4 block">💔</span>
                <p class="text-gray-400 text-lg">אין פרופילים בקטגוריה זו כרגע</p>
                <p class="text-gray-500 text-sm mt-2">היה הראשון לפרסם!</p>
            </div>
        {/if}

        <!-- Back link -->
        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לדף הראשי</a>
        </div>
    </div>
</div>

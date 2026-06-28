<script lang="ts">
    import type { PageData } from './$types';
    import { goto } from '$app/navigation';
    import { toggleLike, isLiked } from '$lib/likedItems';
    import { avatarUrl as avatar } from '$lib/singlesMock';
    import type { SingleProfile } from '$lib/singlesMock';
    import JsonLd from "$lib/components/JsonLd.svelte";
    import { breadcrumbSchema, collectionSchema, canonical } from "$lib/seo";

    let { data }: { data: PageData } = $props();

    type Gender = 'all' | 'male' | 'female';
    // גבר רואה רק נקבות, אישה רואה רק גברים — נעול לחלוטין, אין ממשק שינוי.
    // אם אין מגדר משתמש (אורח/לא מולא בפרופיל) — מציגים הכל.
    const lockedFilter: Gender | null =
        data.currentUserGender === 'male' ? 'female'
        : data.currentUserGender === 'female' ? 'male'
        : null;
    // סופר-אדמין יכול לעקוף את הנעילה ולבחון את לוח הגברים/הנשים.
    let adminGender = $state<Gender>('all');
    const filter = $derived<Gender>(data.isSuperAdmin ? adminGender : (lockedFilter ?? 'all'));

    // אורח (לא מחובר) - טשטוש תמונות + חסימת כניסה לדף פרופיל
    const isGuest: boolean = !data.currentUserId;
    function openProfile(id: string) {
        // פתיחת הדף המלא בעיצוב העשיר (/items/[id]) - לבקשת המשתמש
        if (isGuest) {
            goto('/login?next=' + encodeURIComponent(`/items/${id}`));
            return;
        }
        goto(`/items/${id}`);
    }

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

    // כל הפרופילים האמיתיים מ-Strapi, מסוננים לפי המסננים הפעילים
    let filteredProfiles = $derived(
        (data.profiles as SingleProfile[]).filter((p) => {
            if (filter !== 'all' && p.gender !== filter) return false;
            if (ageFilter !== 'all' && ageGroupOf(p.age) !== ageFilter) return false;
            if (relFilter !== 'all' && p.religiosity !== relFilter) return false;
            return true;
        })
    );

    // --- שיתוף כרטיס ---
    let shareMenuItemId = $state<string | null>(null);
    let copiedItemId = $state<string | null>(null);
    function buildShareText(it: { id: string; nickname?: string; label: string; gender?: 'male' | 'female'; age?: string; city?: string; description?: string }): { title: string; text: string; url: string } {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'https://kehila-bashchuna.co.il';
        const url = `${origin}/items/${it.id}`;
        const who = it.nickname || it.label;
        const meta = [it.age ? `🎂 ${it.age}` : '', it.city ? `📍 ${it.city}` : ''].filter(Boolean).join(' · ');
        const heading = it.gender === 'female'
            ? `💑 הכירו את ${who} - פנויה מלוח קהילה בשכונה`
            : it.gender === 'male'
            ? `💑 הכירו את ${who} - פנוי מלוח קהילה בשכונה`
            : `💑 ${who} - לוח פנויים ופנויות`;
        const lines = [heading];
        if (meta) lines.push(meta);
        if (it.description) lines.push('', it.description);
        lines.push('', '👇 לפרופיל המלא:');
        const text = lines.join('\n');
        return { title: 'לוח פנויים ופנויות - קהילה בשכונה', text, url };
    }
    async function nativeShare(it: { id: string; nickname?: string; label: string; gender?: 'male' | 'female'; age?: string; city?: string; description?: string }) {
        const payload = buildShareText(it);
        if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
            try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(payload); return; } catch {}
        }
        shareMenuItemId = it.id;
    }
    function shareTo(network: 'whatsapp' | 'telegram' | 'facebook' | 'x' | 'copy', it: { id: string; nickname?: string; label: string; gender?: 'male' | 'female'; age?: string; city?: string; description?: string }) {
        const { text, url } = buildShareText(it);
        const textWithUrl = `${text}\n${url}`;
        const enc = encodeURIComponent;
        if (network === 'whatsapp')      window.open(`https://wa.me/?text=${enc(textWithUrl)}`, '_blank');
        else if (network === 'telegram') window.open(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, '_blank');
        else if (network === 'facebook') window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, '_blank');
        else if (network === 'x')        window.open(`https://twitter.com/intent/tweet?text=${enc(textWithUrl)}`, '_blank');
        else if (network === 'copy') {
            navigator.clipboard?.writeText(textWithUrl);
            copiedItemId = it.id;
            setTimeout(() => { if (copiedItemId === it.id) copiedItemId = null; }, 1800);
        }
        if (network !== 'copy') shareMenuItemId = null;
    }

    function waLink(phone: string): string {
        const digits = phone.replace(/\D/g, '').replace(/^0/, '972');
        return `https://wa.me/${digits}`;
    }

    // ===== כרטיס המשתמש המחובר =====
    function calcAge(birth: string): string {
        if (!birth) return '';
        const d = new Date(birth);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        let age = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
        return age > 0 && age < 130 ? String(age) : '';
    }

    type SelfCard = {
        id: 'self';
        nickname: string;
        label: string;
        gender: 'male' | 'female';
        age: string;
        city: string;
        avatar: string;
        phone: string;
    };
    const selfCard: SelfCard | null = (() => {
        const u = data.currentUser;
        if (!u) return null;
        const g = (u.gender || '').toLowerCase();
        if (g !== 'male' && g !== 'female') return null;
        const isMale = g === 'male';
        const nickname = u.nickname || u.name || (isMale ? 'אני' : 'אני');
        const age = calcAge(u.birth_date);
        const labelParts = [age, u.city].filter(Boolean);
        return {
            id: 'self',
            nickname,
            label: labelParts.join(', '),
            gender: g,
            age,
            city: u.city,
            avatar: u.avatar_url || avatar(nickname || 'me', !isMale),
            phone: u.phone,
        };
    })();
</script>

<svelte:head>
    <title>שידוכים — פנויים ופנויות בשכונה | קהילה בשכונה</title>
    <meta name="description" content="לוח שידוכים והיכרויות קהילתי — פנויים ופנויות, סינון לפי גיל, מגזר ומיקום. מצאו שידוך בשכונה ובכל הארץ, בקהילה בשכונה." />
    <link rel="canonical" href={canonical('/singles')} />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
</svelte:head>
<JsonLd schema={[breadcrumbSchema([{ name: 'בית', path: '/' }, { name: 'שידוכים', path: '/singles' }]), collectionSchema({ name: 'שידוכים — פנויים ופנויות', description: 'לוח שידוכים והיכרויות קהילתי — פנויים ופנויות, סינון לפי גיל, מגזר ומיקום. מצאו שידוך בשכונה ובכל הארץ, בקהילה בשכונה.', path: '/singles' })]} />

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
            <p class="text-gray-400 mb-4">לוח ארצי - מציאת בן/בת זוג מכל רחבי הארץ</p>

            <a
                href="/add/singles"
                class="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold py-2.5 px-6 rounded-full transition-all text-sm shadow-lg shadow-pink-500/30"
            >
                ➕ הוסף כרטיס פרופיל
            </a>
        </div>

        <!-- Filters: chips מינימליסטיים בשורה זורמת -->
        <div class="mb-6">
            <div class="flex flex-wrap justify-center items-center gap-x-2 gap-y-2">
                <span class="text-gray-300 text-sm font-semibold tracking-wide me-1 inline-flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                    סנן:
                </span>

                <!-- גילאים -->
                <button
                    onclick={() => ageFilter = 'all'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {ageFilter === 'all' ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >כל הגילאים</button>
                <button
                    onclick={() => ageFilter = 'under30'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {ageFilter === 'under30' ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >עד 30</button>
                <button
                    onclick={() => ageFilter = '30plus'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {ageFilter === '30plus' ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >30+</button>
                <button
                    onclick={() => ageFilter = 'golden'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {ageFilter === 'golden' ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >גיל הזהב</button>

                <span class="text-gray-600 mx-1 hidden sm:inline">·</span>

                <!-- רמה דתית -->
                <button
                    onclick={() => relFilter = 'all'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {relFilter === 'all' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >כל המגזרים</button>
                <button
                    onclick={() => relFilter = 'haredi'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {relFilter === 'haredi' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >חרדי</button>
                <button
                    onclick={() => relFilter = 'dl'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {relFilter === 'dl' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >דתי לאומי</button>
                <button
                    onclick={() => relFilter = 'general'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {relFilter === 'general' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >מגזר כללי</button>
            </div>

            {#if data.isSuperAdmin}
                <div class="flex justify-center items-center gap-2 mt-3 flex-wrap">
                    <span class="text-amber-300 text-xs font-bold">🛡️ מנהל · בחן לוח:</span>
                    {#each [['all', 'הכל'], ['male', '👨 גברים'], ['female', '👩 נשים']] as [val, lbl]}
                        <button
                            onclick={() => adminGender = val as Gender}
                            class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {adminGender === val ? 'bg-amber-500/20 text-amber-100 border-amber-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                        >{lbl}</button>
                    {/each}
                    <a href="/admin/singles-review" class="px-3 py-1.5 rounded-md text-[13px] font-bold border border-pink-400/60 bg-pink-500/15 text-pink-200 hover:bg-pink-500/25 transition-colors">💑 דף אישור</a>
                </div>
            {/if}

            <div class="flex justify-center items-center gap-3 mt-3 flex-wrap">
                {#if lockedFilter && !data.isSuperAdmin}
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r {lockedFilter === 'male' ? 'from-blue-500 to-cyan-500' : 'from-pink-500 to-rose-500'} text-white shadow">
                        <span>{lockedFilter === 'male' ? '👨 פנויים' : '👩 פנויות'}</span>
                        <span class="text-white/80">· מותאם לפרופיל שלך</span>
                    </div>
                {/if}
                <p class="text-gray-400 text-sm">💑 {filteredProfiles.length} פרופילים פעילים</p>
            </div>
        </div>

        <!-- כרטיס המשתמש - במרכז מעל הרשת, להבדלה ברורה -->
        {#if data.selfProfile}
            <!-- הכרטיס האמיתי של המשתמש, בדיוק כפי שאחרים רואים אותו -->
            {@const me = data.selfProfile as SingleProfile}
            {@const isMale = me.gender === 'male'}
            {@const isPending = data.selfStatus === 'pending'}
            {@const isRejected = data.selfStatus === 'rejected'}
            <div class="mb-8 flex flex-col items-center">
                <h2 class="text-amber-300 text-sm md:text-base font-bold mb-3 text-center">
                    ⭐ כך נראה הכרטיס שלך
                </h2>
                {#if isPending}
                    <div class="w-full max-w-md mb-2 rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-2.5 text-center">
                        <p class="text-amber-200 text-sm font-bold">⏳ הכרטיס ממתין לאישור מנהל</p>
                        <p class="text-amber-300/70 text-xs mt-0.5">לאחר בדיקת התמונות הוא יופיע בלוח. בינתיים הוא גלוי רק לך.</p>
                    </div>
                {:else if isRejected}
                    <div class="w-full max-w-md mb-2 rounded-xl bg-red-500/15 border border-red-400/40 px-4 py-2.5 text-center">
                        <p class="text-red-200 text-sm font-bold">🚫 הכרטיס נדחה</p>
                        <p class="text-red-300/70 text-xs mt-0.5">ייתכן שהתמונות לא היו צנועות. ערוך והעלה שוב לאישור מחדש.</p>
                    </div>
                {/if}
                <div class="w-full max-w-md rounded-2xl bg-[#0f172a] border-2 {isMale ? 'border-blue-400' : 'border-pink-400'} overflow-hidden shadow-xl ring-2 {isMale ? 'ring-blue-500/40' : 'ring-pink-500/40'} relative">
                    <!-- Card header -->
                    <div class="bg-gradient-to-r {isMale ? 'from-blue-600 to-cyan-600' : 'from-pink-600 to-rose-500'} p-4 flex items-center gap-3 relative">
                        <div class="w-16 h-16 rounded-full bg-white/25 ring-2 ring-white/30 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
                            <img src={me.avatar} alt={me.nickname} class="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-white font-black text-lg leading-tight mb-1">{me.nickname}</h3>
                            <div class="flex items-center gap-3 text-white/85 text-sm">
                                {#if me.age}<span>🎂 {me.age}</span>{/if}
                                {#if me.city}<span>📍 {me.city}</span>{/if}
                            </div>
                        </div>
                    </div>

                    <!-- Card body - תוכן אמיתי -->
                    <div class="p-4">
                        {#if me.description}
                            <p class="text-gray-300 text-sm leading-relaxed mb-3">{me.description}</p>
                        {/if}
                        {#if me.lookingFor}
                            <div class="mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                                <p class="text-[11px] font-bold {isMale ? 'text-cyan-300' : 'text-pink-300'} mb-0.5">{isMale ? 'מחפש' : 'מחפשת'}</p>
                                <p class="text-gray-200 text-sm leading-snug">{me.lookingFor}</p>
                            </div>
                        {/if}
                        {#if me.inspiration}
                            <p class="text-gray-400 text-xs italic leading-snug mb-4 border-r-2 {isMale ? 'border-cyan-500/40' : 'border-pink-500/40'} pr-2">
                                {me.inspiration}
                            </p>
                        {/if}
                        <div class="flex gap-2">
                            <a
                                href="/items/{me.id}"
                                class="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                            >
                                👁️ צפה בכרטיס המלא
                            </a>
                            <a
                                href="/add/singles"
                                class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg"
                            >
                                ✏️ ערוך
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        {:else if selfCard}
            <!-- אין עדיין כרטיס פנויים - תצוגת CTA גנרית להקמתו -->
            {@const isMale = selfCard.gender === 'male'}
            <div class="mb-8 flex flex-col items-center">
                <h2 class="text-amber-300 text-sm md:text-base font-bold mb-3 text-center">
                    ⭐ כך ייראה הכרטיס שלך
                </h2>
                <div class="w-full max-w-md rounded-2xl bg-[#0f172a] border-2 {isMale ? 'border-blue-400' : 'border-pink-400'} overflow-hidden shadow-xl ring-2 {isMale ? 'ring-blue-500/40' : 'ring-pink-500/40'} relative">
                    <!-- Card header -->
                    <div class="bg-gradient-to-r {isMale ? 'from-blue-600 to-cyan-600' : 'from-pink-600 to-rose-500'} p-4 flex items-center gap-3 relative">
                        <div class="w-16 h-16 rounded-full bg-white/25 ring-2 ring-white/30 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
                            <img src={selfCard.avatar} alt={selfCard.nickname} class="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-white font-black text-lg leading-tight mb-1">{selfCard.nickname}</h3>
                            <div class="flex items-center gap-3 text-white/85 text-sm">
                                {#if selfCard.age}<span>🎂 {selfCard.age}</span>{/if}
                                {#if selfCard.city}<span>📍 {selfCard.city}</span>{/if}
                            </div>
                        </div>
                    </div>

                    <!-- Card body -->
                    <div class="p-4">
                        <p class="text-gray-400 text-sm leading-relaxed mb-3">
                            עדיין לא יצרת כרטיס פנויים - צור אחד עם תיאור, גיל, מה אתה מחפש ועוד, והקהילה תראה אותך.
                        </p>
                        <a
                            href="/add/singles"
                            class="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg"
                        >
                            ➕ צור את הכרטיס שלי
                        </a>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredProfiles as person}
                {@const isMale = person.gender === 'male'}
                {@const isFav = favorites.has(person.id)}
                <div
                    role="link"
                    tabindex="0"
                    aria-label={isGuest ? `התחבר כדי לצפות בפרופיל של ${person.nickname}` : `פרטים מלאים על ${person.nickname}`}
                    onclick={() => openProfile(person.id)}
                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfile(person.id); } }}
                    class="relative rounded-2xl bg-[#0f172a] border {isMale ? 'border-blue-500/30' : 'border-pink-500/30'} overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                >
                    {#if isGuest}
                        <div class="absolute top-2 left-2 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-black/60 backdrop-blur text-white border border-white/15 shadow-lg">
                            🔒 התחבר לצפייה
                        </div>
                    {/if}
                    <!-- Card header -->
                    <div class="bg-gradient-to-r {isMale ? 'from-blue-600 to-cyan-600' : 'from-pink-600 to-rose-500'} p-4 flex items-center gap-3 relative">
                        <div class="w-16 h-16 rounded-full bg-white/25 ring-2 ring-white/30 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
                            <img src={person.avatar} alt={person.nickname} class="w-full h-full object-cover transition-all {isGuest ? 'blur-md scale-110' : ''}" loading="lazy" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-white font-black text-lg leading-tight mb-1">{person.nickname}</h3>
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

                        <div class="flex gap-2" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="group">
                            <div class="relative flex-shrink-0">
                                <button
                                    type="button"
                                    onclick={(e) => { e.stopPropagation(); nativeShare(person); }}
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
                                        <button type="button" onclick={(e) => { e.stopPropagation(); shareTo('whatsapp', person); }} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">💬 WhatsApp</button>
                                        <button type="button" onclick={(e) => { e.stopPropagation(); shareTo('telegram', person); }} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">✈️ Telegram</button>
                                        <button type="button" onclick={(e) => { e.stopPropagation(); shareTo('facebook', person); }} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">📘 Facebook</button>
                                        <button type="button" onclick={(e) => { e.stopPropagation(); shareTo('x',        person); }} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">𝕏 Twitter</button>
                                        <button type="button" onclick={(e) => { e.stopPropagation(); shareTo('copy',     person); }} class="flex items-center gap-2 text-right text-gray-200 hover:bg-white/10 rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors">
                                            {copiedItemId === person.id ? '✓ הועתק!' : '📋 העתק קישור'}
                                        </button>
                                        <button type="button" onclick={(e) => { e.stopPropagation(); shareMenuItemId = null; }} class="flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-lg px-2.5 py-1 text-[10px] transition-colors">סגור</button>
                                    </div>
                                {/if}
                            </div>
                            {#if person.matchmakerPhone}
                                <a
                                    href={waLink(person.matchmakerPhone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="שלח וואטסאפ לשדכן/ית של {person.nickname} (נפתח בחלון חדש)"
                                    title={person.matchmaker ? `WhatsApp לשדכן: ${person.matchmaker}` : 'WhatsApp לשדכן'}
                                    class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                                >
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.03L.789 23.702l4.823-1.467A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.33 0-4.481-.76-6.234-2.048l-.447-.334-2.862.87.908-2.745-.367-.472A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                                    WhatsApp לשדכן
                                </a>
                                <a
                                    href="tel:{person.matchmakerPhone}"
                                    aria-label="התקשר לשדכן/ית של {person.nickname}"
                                    class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                                >
                                    📞 התקשר
                                </a>
                            {:else}
                                <span class="flex-1 flex items-center justify-center gap-2 bg-white/5 text-gray-500 italic font-medium py-2.5 rounded-xl text-xs">
                                    אין שדכן פעיל
                                </span>
                            {/if}
                        </div>
                    </div>
                </div>
            {/each}
        </div>

        {#if filteredProfiles.length === 0}
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

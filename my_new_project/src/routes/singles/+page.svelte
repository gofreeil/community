<script lang="ts">
    import type { PageData } from './$types';
    import { _ } from 'svelte-i18n';
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

    // ── שער גישה: הלוח סגור לצפייה. הורים/שדכנים מבקשים גישה; מפרסם כרטיס נכנס אוטומטית ──
    type AccessRole = 'single' | 'parent' | 'matchmaker';
    let gateRole = $state<AccessRole | null>(null);
    let gateAgreed = $state(false);
    let gateSubmitting = $state(false);
    let gateSent = $state(false);
    let gateError = $state('');

    async function submitAccessRequest() {
        gateError = '';
        if (isGuest) { goto('/login?next=' + encodeURIComponent('/singles')); return; }
        if (!gateRole) { gateError = $_('extras.s_gate_need_role'); return; }
        if (!gateAgreed) { gateError = $_('extras.s_gate_need_terms'); return; }
        gateSubmitting = true;
        try {
            const res = await fetch('/api/singles-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: gateRole, agreed: true }),
            });
            const out = await res.json().catch(() => ({}));
            if (res.ok && out?.success) {
                if (out.already === 'granted') { location.reload(); return; }
                gateSent = true;
            } else {
                gateError = out?.message || $_('extras.s_gate_error');
            }
        } catch {
            gateError = $_('extras.s_gate_error');
        } finally {
            gateSubmitting = false;
        }
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
            ? $_('extras.s_share_heading_f', { values: { name: who } })
            : it.gender === 'male'
            ? $_('extras.s_share_heading_m', { values: { name: who } })
            : $_('extras.s_share_heading_n', { values: { name: who } });
        const lines = [heading];
        if (meta) lines.push(meta);
        if (it.description) lines.push('', it.description);
        lines.push('', $_('extras.s_share_full_profile'));
        const text = lines.join('\n');
        return { title: $_('extras.s_share_title'), text, url };
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
        const nickname = u.nickname || u.name || '';
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

    // ── שדכן מערכת: בקשה / סטטוס ──
    let mmStatus = $state<string>(data.matchmakerStatus ?? 'none');
    let mmSubmitting = $state(false);
    let mmError = $state('');

    async function requestMatchmaker() {
        if (isGuest) { goto('/login?next=' + encodeURIComponent('/singles')); return; }
        mmError = '';
        mmSubmitting = true;
        try {
            const res = await fetch('/api/matchmaker-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
            });
            const out = await res.json().catch(() => ({}));
            if (res.ok && out?.success) {
                mmStatus = out.already === 'approved' ? 'approved' : 'pending';
            } else {
                mmError = out?.message || $_('extras.s_mm_error');
            }
        } catch {
            mmError = $_('extras.s_mm_error');
        } finally {
            mmSubmitting = false;
        }
    }
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
                    <img src="/images/Available.webp" alt={$_('extras.s_board_img_alt')} class="h-48 md:h-64 rounded-2xl mx-auto block" />
                </div>
            </div>
            <h1 class="text-3xl font-black text-white mb-2">{$_('extras.s_title')}</h1>
            <p class="text-gray-400 mb-4">{$_('extras.s_subtitle')}</p>

            <a
                href="/add/singles"
                class="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-bold py-2.5 px-6 rounded-full transition-all text-sm shadow-lg shadow-pink-500/30"
            >
                {$_('extras.s_add_card')}
            </a>
        </div>

        {#if data.gated}
            <!-- ── שער גישה ללוח (לוח סגור: רואים כרטיסים רק אחרי אישור) ── -->
            <div class="mb-8 rounded-3xl bg-[#0f172a] border border-pink-500/30 shadow-2xl shadow-pink-500/10 overflow-hidden">
                <div class="bg-gradient-to-r from-pink-600/30 to-purple-600/20 px-5 py-4 border-b border-pink-500/20 flex items-center gap-3">
                    <span class="text-3xl">🔒</span>
                    <div>
                        <h2 class="text-white font-black text-lg leading-tight">{$_('extras.s_gate_title')}</h2>
                        <p class="text-pink-200/80 text-xs mt-0.5">{$_('extras.s_gate_sub')}</p>
                    </div>
                </div>

                <div class="p-5 space-y-5">
                    {#if data.accessStatus === 'pending' || gateSent}
                        <div class="rounded-2xl bg-amber-500/10 border border-amber-400/40 px-4 py-5 text-center">
                            <div class="text-3xl mb-2">⏳</div>
                            <p class="text-amber-200 font-bold">{$_('extras.s_gate_pending_title')}</p>
                            <p class="text-amber-100/70 text-sm mt-1">{$_('extras.s_gate_pending_sub')}</p>
                        </div>
                    {:else}
                        <!-- מסלול א: פרסום כרטיס = גישה אוטומטית עם אישורו -->
                        <div class="rounded-2xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-400/40 px-4 py-4">
                            <p class="text-amber-200 font-bold text-sm">{$_('extras.s_gate_publish_cta_title')}</p>
                            <p class="text-amber-100/70 text-xs mt-1 mb-3">{$_('extras.s_gate_publish_cta_sub')}</p>
                            <a href="/add/singles" class="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold py-2.5 px-5 rounded-xl transition-all text-sm shadow-lg">
                                {$_('extras.s_gate_publish_btn')}
                            </a>
                        </div>

                        <div class="flex items-center gap-3 text-gray-500 text-xs">
                            <div class="flex-1 h-px bg-white/10"></div>
                            <span>{$_('extras.s_gate_or')}</span>
                            <div class="flex-1 h-px bg-white/10"></div>
                        </div>

                        <!-- מסלול ב: בקשת גישה (הורה / שדכן שאין לו כרטיס) -->
                        <div>
                            <p class="text-white font-bold text-sm mb-2">{$_('extras.s_gate_request_title')}</p>
                            <p class="text-gray-400 text-xs mb-3">{$_('extras.s_gate_role_label')}</p>
                            <div class="flex flex-wrap gap-2 mb-4">
                                {#each [['single','s_gate_role_single'],['parent','s_gate_role_parent'],['matchmaker','s_gate_role_matchmaker']] as [role, key]}
                                    <button type="button"
                                        onclick={() => gateRole = role as AccessRole}
                                        class="px-4 py-2 rounded-full text-sm font-bold border transition-colors {gateRole === role ? 'bg-pink-500/25 border-pink-400 text-pink-100' : 'bg-white/5 border-white/10 text-gray-300 hover:border-pink-400/50'}">
                                        {$_('extras.' + key)}
                                    </button>
                                {/each}
                            </div>

                            <label class="flex items-start gap-2 mb-4 cursor-pointer">
                                <input type="checkbox" bind:checked={gateAgreed} class="mt-1 accent-pink-500 w-4 h-4 flex-shrink-0" />
                                <span class="text-gray-300 text-xs leading-snug">{$_('extras.s_gate_terms')}</span>
                            </label>

                            {#if gateError}
                                <p class="text-red-400 text-xs mb-2">{gateError}</p>
                            {/if}

                            <button type="button" onclick={submitAccessRequest} disabled={gateSubmitting}
                                class="w-full bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-all text-sm shadow-lg">
                                {gateSubmitting ? $_('extras.s_gate_submitting') : $_('extras.s_gate_submit')}
                            </button>
                        </div>
                    {/if}

                    {#if data.selfStatus === 'pending'}
                        <p class="text-center text-amber-200/80 text-xs">{$_('extras.s_gate_self_pending')}</p>
                    {/if}
                </div>
            </div>
        {/if}

        {#if !data.gated}
        <!-- ── באנר ערבי מפגש / סעודות ── -->
        <a href="/gatherings" class="block mb-6 rounded-2xl bg-gradient-to-r from-amber-500/15 to-rose-500/10 border border-amber-500/30 px-4 py-3.5 hover:border-amber-500/60 transition">
            <div class="flex items-center gap-3">
                <div class="text-2xl">🍽️</div>
                <div class="flex-1 text-right">
                    <p class="text-white font-bold text-sm">{$_('extras.s_gatherings_title')}</p>
                    <p class="text-amber-200/80 text-xs mt-0.5">{$_('extras.s_gatherings_sub')}</p>
                </div>
            </div>
        </a>

        <!-- ── שדכן מערכת: בקשה / סטטוס (מוצג לגברים ולנשים כאחד) ── -->
        {#if mmStatus === 'approved'}
            <a href="/singles/matchmaker" class="block mb-6 rounded-2xl bg-gradient-to-r from-rose-500/15 to-pink-500/10 border border-rose-500/40 px-4 py-3.5 hover:border-rose-500/70 transition">
                <div class="flex items-center gap-3">
                    <div class="text-2xl">💘</div>
                    <div class="flex-1 text-right">
                        <p class="text-white font-bold text-sm">{$_('extras.s_mm_approved')}</p>
                        <p class="text-rose-200/80 text-xs mt-0.5">{$_('extras.s_mm_tools_hint')}</p>
                    </div>
                    <span class="shrink-0 bg-rose-500/20 text-rose-100 text-xs font-bold px-3 py-1.5 rounded-full border border-rose-400/40">{$_('extras.s_mm_tools_btn')} ←</span>
                </div>
            </a>
        {:else if mmStatus === 'pending'}
            <div class="mb-6 rounded-2xl bg-amber-500/10 border border-amber-400/30 px-4 py-3.5 text-center">
                <p class="text-amber-200 text-sm font-bold">⏳ {$_('extras.s_mm_pending')}</p>
            </div>
        {:else}
            <div class="mb-6 rounded-2xl bg-gradient-to-r from-rose-500/12 to-purple-500/8 border border-rose-500/30 px-4 py-4">
                <div class="flex items-start gap-3">
                    <div class="text-2xl">💘</div>
                    <div class="flex-1 text-right">
                        <p class="text-white font-bold text-sm">{$_('extras.s_mm_cta_title')}</p>
                        <p class="text-rose-200/80 text-xs mt-0.5 mb-3">{$_('extras.s_mm_cta_desc')}</p>
                        {#if mmError}<p class="text-red-400 text-xs mb-2">{mmError}</p>{/if}
                        <button
                            type="button"
                            onclick={requestMatchmaker}
                            disabled={mmSubmitting}
                            class="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-500 hover:to-pink-400 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-full transition-all text-sm shadow-lg shadow-rose-500/30"
                        >
                            {mmSubmitting ? $_('extras.s_mm_submitting') : $_('extras.s_mm_cta_btn')}
                        </button>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Filters: chips מינימליסטיים בשורה זורמת -->
        <div class="mb-6">
            <div class="flex flex-wrap justify-center items-center gap-x-2 gap-y-2">
                <span class="text-gray-300 text-sm font-semibold tracking-wide me-1 inline-flex items-center gap-1.5">
                    <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                    </svg>
                    {$_('extras.s_filter')}
                </span>

                <!-- גילאים -->
                <button
                    onclick={() => ageFilter = 'all'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {ageFilter === 'all' ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{$_('extras.s_age_all')}</button>
                <button
                    onclick={() => ageFilter = 'under30'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {ageFilter === 'under30' ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{$_('extras.s_age_under30')}</button>
                <button
                    onclick={() => ageFilter = '30plus'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {ageFilter === '30plus' ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{$_('extras.s_age_30plus')}</button>
                <button
                    onclick={() => ageFilter = 'golden'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {ageFilter === 'golden' ? 'bg-pink-500/15 text-pink-200 border-pink-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{$_('extras.s_age_golden')}</button>

                <span class="text-gray-600 mx-1 hidden sm:inline">·</span>

                <!-- רמה דתית -->
                <button
                    onclick={() => relFilter = 'all'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {relFilter === 'all' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{$_('extras.s_rel_all')}</button>
                <button
                    onclick={() => relFilter = 'haredi'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {relFilter === 'haredi' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{$_('extras.s_rel_haredi')}</button>
                <button
                    onclick={() => relFilter = 'dl'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {relFilter === 'dl' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{$_('extras.s_rel_dl')}</button>
                <button
                    onclick={() => relFilter = 'general'}
                    class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {relFilter === 'general' ? 'bg-cyan-500/15 text-cyan-200 border-cyan-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                >{$_('extras.s_rel_general')}</button>
            </div>

            {#if data.isSuperAdmin}
                <div class="flex justify-center items-center gap-2 mt-3 flex-wrap">
                    <span class="text-amber-300 text-xs font-bold">{$_('extras.s_admin_test_board')}</span>
                    {#each [['all', $_('extras.s_admin_all')], ['male', $_('extras.s_admin_male')], ['female', $_('extras.s_admin_female')]] as [val, lbl]}
                        <button
                            onclick={() => adminGender = val as Gender}
                            class="px-3 py-1.5 rounded-md text-[13px] font-medium border transition-colors {adminGender === val ? 'bg-amber-500/20 text-amber-100 border-amber-400/60' : 'bg-transparent text-gray-400 border-white/10 hover:border-white/25 hover:text-gray-200'}"
                        >{lbl}</button>
                    {/each}
                    <a href="/admin/singles-review" class="px-3 py-1.5 rounded-md text-[13px] font-bold border border-pink-400/60 bg-pink-500/15 text-pink-200 hover:bg-pink-500/25 transition-colors">{$_('extras.s_admin_review')}</a>
                </div>
            {/if}

            <div class="flex justify-center items-center gap-3 mt-3 flex-wrap">
                {#if lockedFilter && !data.isSuperAdmin}
                    <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r {lockedFilter === 'male' ? 'from-blue-500 to-cyan-500' : 'from-pink-500 to-rose-500'} text-white shadow">
                        <span>{lockedFilter === 'male' ? $_('extras.s_locked_male') : $_('extras.s_locked_female')}</span>
                        <span class="text-white/80">{$_('extras.s_locked_note')}</span>
                    </div>
                {/if}
                <p class="text-gray-400 text-sm">{$_('extras.s_active_profiles', { values: { n: filteredProfiles.length } })}</p>
            </div>
        </div>
        {/if}

        <!-- כרטיס המשתמש - במרכז מעל הרשת, להבדלה ברורה -->
        {#if data.selfProfile}
            <!-- הכרטיס האמיתי של המשתמש, בדיוק כפי שאחרים רואים אותו -->
            {@const me = data.selfProfile as SingleProfile}
            {@const isMale = me.gender === 'male'}
            {@const isPending = data.selfStatus === 'pending'}
            {@const isRejected = data.selfStatus === 'rejected'}
            {@const isMatchmakersOnly = me.visibility === 'matchmakers'}
            <div class="mb-8 flex flex-col items-center">
                <h2 class="text-amber-300 text-sm md:text-base font-bold mb-3 text-center">
                    {$_('extras.s_self_card_title')}
                </h2>
                {#if isPending}
                    <div class="w-full max-w-md mb-2 rounded-xl bg-amber-500/15 border border-amber-400/40 px-4 py-2.5 text-center">
                        <p class="text-amber-200 text-sm font-bold">{$_('extras.s_pending_title')}</p>
                        <p class="text-amber-300/70 text-xs mt-0.5">{$_('extras.s_pending_sub')}</p>
                    </div>
                {:else if isRejected}
                    <div class="w-full max-w-md mb-2 rounded-xl bg-red-500/15 border border-red-400/40 px-4 py-2.5 text-center">
                        <p class="text-red-200 text-sm font-bold">{$_('extras.s_rejected_title')}</p>
                        <p class="text-red-300/70 text-xs mt-0.5">{$_('extras.s_rejected_sub')}</p>
                    </div>
                {/if}
                {#if isMatchmakersOnly}
                    <div class="w-full max-w-md mb-2 rounded-xl bg-purple-500/15 border border-purple-400/40 px-4 py-2.5 text-center">
                        <p class="text-purple-200 text-sm font-bold">{$_('extras.s_mm_only_title')}</p>
                        <p class="text-purple-300/70 text-xs mt-0.5">{$_('extras.s_mm_only_sub')}</p>
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
                        {#if me.unvaccinated}
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 text-xs font-bold mb-2.5">
                                {$_('extras.s_tag_unvaccinated')}
                            </span>
                        {/if}
                        {#if me.description}
                            <p class="text-gray-300 text-sm leading-relaxed mb-3">{me.description}</p>
                        {/if}
                        {#if me.lookingFor}
                            <div class="mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                                <p class="text-[11px] font-bold {isMale ? 'text-cyan-300' : 'text-pink-300'} mb-0.5">{isMale ? $_('extras.s_looking_m') : $_('extras.s_looking_f')}</p>
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
                                {$_('extras.s_view_full')}
                            </a>
                            <a
                                href="/add/singles"
                                class="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg"
                            >
                                {$_('extras.s_edit')}
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
                    {$_('extras.s_self_card_future')}
                </h2>
                <div class="w-full max-w-md rounded-2xl bg-[#0f172a] border-2 {isMale ? 'border-blue-400' : 'border-pink-400'} overflow-hidden shadow-xl ring-2 {isMale ? 'ring-blue-500/40' : 'ring-pink-500/40'} relative">
                    <!-- Card header -->
                    <div class="bg-gradient-to-r {isMale ? 'from-blue-600 to-cyan-600' : 'from-pink-600 to-rose-500'} p-4 flex items-center gap-3 relative">
                        <div class="w-16 h-16 rounded-full bg-white/25 ring-2 ring-white/30 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md">
                            <img src={selfCard.avatar} alt={selfCard.nickname || $_('extras.s_me')} class="w-full h-full object-cover" loading="lazy" />
                        </div>
                        <div class="flex-1 min-w-0">
                            <h3 class="text-white font-black text-lg leading-tight mb-1">{selfCard.nickname || $_('extras.s_me')}</h3>
                            <div class="flex items-center gap-3 text-white/85 text-sm">
                                {#if selfCard.age}<span>🎂 {selfCard.age}</span>{/if}
                                {#if selfCard.city}<span>📍 {selfCard.city}</span>{/if}
                            </div>
                        </div>
                    </div>

                    <!-- Card body -->
                    <div class="p-4">
                        <p class="text-gray-400 text-sm leading-relaxed mb-3">
                            {$_('extras.s_no_card_yet')}
                        </p>
                        <a
                            href="/add/singles"
                            class="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-bold py-2.5 rounded-xl transition-all text-sm shadow-lg"
                        >
                            {$_('extras.s_create_my_card')}
                        </a>
                    </div>
                </div>
            </div>
        {/if}

        {#if !data.gated}
        <!-- Cards grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each filteredProfiles as person}
                {@const isMale = person.gender === 'male'}
                {@const isFav = favorites.has(person.id)}
                <div
                    role="link"
                    tabindex="0"
                    aria-label={isGuest ? $_('extras.s_aria_login_to_view', { values: { name: person.nickname } }) : $_('extras.s_aria_full_details', { values: { name: person.nickname } })}
                    onclick={() => openProfile(person.id)}
                    onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProfile(person.id); } }}
                    class="relative rounded-2xl bg-[#0f172a] border {isMale ? 'border-blue-500/30' : 'border-pink-500/30'} overflow-hidden shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                >
                    {#if isGuest}
                        <div class="absolute top-2 left-2 z-20 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-black/60 backdrop-blur text-white border border-white/15 shadow-lg">
                            {$_('extras.s_login_to_view')}
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
                            aria-label={isFav ? $_('extras.s_fav_remove') : $_('extras.s_fav_add')}
                            title={isFav ? $_('extras.s_fav_remove') : $_('extras.s_fav_liked')}
                            class="shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-black/30 hover:bg-black/50 backdrop-blur-sm text-xl transition-all {isFav ? 'text-rose-300 scale-110' : 'text-white/80 hover:text-rose-200'}"
                        >{isFav ? '❤️' : '🤍'}</button>
                    </div>

                    <!-- Card body -->
                    <div class="p-4">
                        {#if person.unvaccinated}
                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 text-xs font-bold mb-2.5">
                                {$_('extras.s_tag_unvaccinated')}
                            </span>
                        {/if}
                        <p class="text-gray-300 text-sm leading-relaxed mb-3">{person.description}</p>

                        {#if person.lookingFor}
                            <div class="mb-3 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                                <p class="text-[11px] font-bold {isMale ? 'text-cyan-300' : 'text-pink-300'} mb-0.5">{isMale ? $_('extras.s_looking_m') : $_('extras.s_looking_f')}</p>
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
                                    title={$_('extras.s_share')}
                                    aria-label={$_('extras.s_share')}
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
                                            {copiedItemId === person.id ? $_('extras.s_copied') : $_('extras.s_copy_link')}
                                        </button>
                                        <button type="button" onclick={(e) => { e.stopPropagation(); shareMenuItemId = null; }} class="flex items-center justify-center text-gray-500 hover:text-gray-300 rounded-lg px-2.5 py-1 text-[10px] transition-colors">{$_('extras.close')}</button>
                                    </div>
                                {/if}
                            </div>
                            {#if person.matchmakerPhone}
                                <a
                                    href={waLink(person.matchmakerPhone)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label={$_('extras.s_wa_matchmaker_aria', { values: { name: person.nickname } })}
                                    title={person.matchmaker ? $_('extras.s_wa_matchmaker_named', { values: { name: person.matchmaker } }) : $_('extras.s_wa_matchmaker')}
                                    class="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold py-2.5 rounded-xl transition-colors text-sm"
                                >
                                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.03L.789 23.702l4.823-1.467A11.95 11.95 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75c-2.33 0-4.481-.76-6.234-2.048l-.447-.334-2.862.87.908-2.745-.367-.472A9.718 9.718 0 012.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/></svg>
                                    {$_('extras.s_wa_matchmaker')}
                                </a>
                                <a
                                    href="tel:{person.matchmakerPhone}"
                                    aria-label={$_('extras.s_call_matchmaker_aria', { values: { name: person.nickname } })}
                                    class="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold py-2.5 px-4 rounded-xl transition-colors text-sm"
                                >
                                    {$_('extras.s_call')}
                                </a>
                            {:else}
                                <span class="flex-1 flex items-center justify-center gap-2 bg-white/5 text-gray-500 italic font-medium py-2.5 rounded-xl text-xs">
                                    {$_('extras.s_no_matchmaker')}
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
                <p class="text-gray-400 text-lg">{$_('extras.s_empty_title')}</p>
                <p class="text-gray-500 text-sm mt-2">{$_('extras.s_empty_sub')}</p>
            </div>
        {/if}
        {/if}

        <!-- Back link -->
        <div class="text-center mt-8">
            <a href="/" class="text-gray-500 hover:text-white transition-colors text-sm">{$_('extras.s_back_home')}</a>
        </div>
    </div>
</div>

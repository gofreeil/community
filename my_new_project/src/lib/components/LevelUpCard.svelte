<script lang="ts">
    import { get } from 'svelte/store';
    import { t, locale } from 'svelte-i18n';
    import { citiesAndNeighborhoods } from '$lib/neighborhoodsData';
    import {
        missingForTier, TIER_META, type Tier, type TierField, type TierUserFields,
    } from '$lib/tiers';

    // user   — פרטי המשתמש הנוכחיים (מחושב מהם מה חסר)
    // target — דרגת היעד הנדרשת לפעולה
    // reason — מפתח i18n שמסביר *למה* צריך להשלים (למשל "כדי לפרסם מודעה")
    // onDone — נקרא כשההשלמה הצליחה (ההורה ממשיך בפעולה / מרענן)
    let {
        user,
        target,
        reason = '',
        onDone = () => {},
        compact = false,
    }: {
        user: TierUserFields;
        target: Tier;
        reason?: string;
        onDone?: () => void;
        compact?: boolean;
    } = $props();

    // tFn ריאקטיבי (כמו בשאר האתר) — נענה לשינוי שפה
    let _loc = $state(get(locale));
    $effect(() => locale.subscribe((l) => (_loc = l)));
    const tFn = (k: string, values?: Record<string, string | number>) => {
        void _loc;
        return get(t)(`tiers.${k}`, values ? { values } : undefined);
    };

    const missing = $derived(missingForTier(user, target));

    // ערכי הטופס (מאותחלים מהמשתמש הקיים)
    let city         = $state(user.city ?? '');
    let neighborhood = $state(user.neighborhood ?? '');
    let phone        = $state(user.phone ?? '');
    let gender       = $state(user.gender ?? '');
    let birthDate    = $state(user.birth_date ?? '');

    let saving      = $state(false);
    let errorKey    = $state<string | null>(null);
    let emailSent   = $state(false);

    const cityList = Object.keys(citiesAndNeighborhoods).sort((a, b) => a.localeCompare(b, 'he'));
    const hoods = $derived.by(() => {
        const list = citiesAndNeighborhoods[city] ?? [];
        return list.includes('מרכז') ? list : ['מרכז', ...list];
    });
    // כשמשנים עיר — אם השכונה הנוכחית לא שייכת לה, מאפסים ל"מרכז"
    $effect(() => {
        if (city && !hoods.includes(neighborhood)) neighborhood = hoods.includes('מרכז') ? 'מרכז' : (hoods[0] ?? '');
    });

    function has(key: TierField['key']): boolean {
        return missing.some((m) => m.key === key);
    }

    // טלפון שהוקלד אך קצר מדי — מציגים רמז מתחת לשדה, אחרת המשתמש רואה כפתור אפור בלי הסבר
    const phoneTooShort = $derived(phone.trim() !== '' && phone.replace(/\D/g, '').length < 9);

    // האם אפשר לשמור: כל השדות החסרים (מלבד אימות-מייל, שנפרד) מולאו
    const canSave = $derived.by(() => {
        for (const f of missing) {
            if (f.key === 'email_confirmed') continue;
            if (f.key === 'city'         && !city.trim())         return false;
            if (f.key === 'neighborhood' && !neighborhood.trim()) return false;
            if (f.key === 'phone'        && phone.replace(/\D/g, '').length < 9) return false;
            if (f.key === 'gender'       && !gender.trim())       return false;
            if (f.key === 'birth_date'   && !birthDate.trim())    return false;
        }
        return true;
    });

    async function requestEmailVerify() {
        errorKey = null;
        try {
            const res = await fetch('/api/profile/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'verify_email' }),
            });
            if (res.ok) emailSent = true;
            else errorKey = 'err_email_verify';
        } catch { errorKey = 'err_network'; }
    }

    async function save() {
        if (!canSave || saving) return;
        saving = true;
        errorKey = null;
        const payload: Record<string, string> = {};
        if (has('city'))         payload.city         = city.trim();
        if (has('neighborhood')) payload.neighborhood = neighborhood.trim();
        if (has('phone'))        payload.phone        = phone.trim();
        if (has('gender'))       payload.gender       = gender.trim();
        if (has('birth_date'))   payload.birth_date   = birthDate.trim();
        try {
            const res = await fetch('/api/profile/upgrade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data?.ok) {
                onDone();
            } else {
                errorKey = data?.error === 'invalid_phone' ? 'err_phone' : 'err_save';
            }
        } catch {
            errorKey = 'err_network';
        } finally {
            saving = false;
        }
    }

    const meta = $derived(TIER_META[target]);

</script>

<div class="rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-600/10 to-[#0f172a] p-5 md:p-6" dir="rtl">
    <!-- כותרת: לאיזו דרגה משלימים -->
    <div class="flex items-center gap-3 mb-3">
        <span class="text-2xl">{meta.emoji}</span>
        <div>
            <h3 class="text-white font-bold text-base leading-tight">{tFn('levelup_title', { tier: target, name: tFn(meta.nameKey) })}</h3>
            <p class="text-white/50 text-xs">{tFn(meta.descKey)}</p>
        </div>
    </div>

    {#if reason}
        <p class="text-white/70 text-sm mb-4 bg-white/5 rounded-xl px-3 py-2 border border-white/10">{reason}</p>
    {/if}

    <div class="space-y-4">
        {#each missing as f (f.key)}
            {#if f.key === 'city'}
                <div>
                    <label for="lu-city" class="block text-sm font-medium text-gray-300 mb-1">{tFn(f.labelKey)}</label>
                    <select id="lu-city" bind:value={city}
                        class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition">
                        <option value="" disabled>{tFn('choose_city')}</option>
                        {#each cityList as c}<option value={c}>{c}</option>{/each}
                    </select>
                    <p class="text-white/40 text-xs mt-1">{tFn(f.hintKey)}</p>
                </div>
            {:else if f.key === 'neighborhood'}
                <div>
                    <label for="lu-hood" class="block text-sm font-medium text-gray-300 mb-1">{tFn(f.labelKey)}</label>
                    <select id="lu-hood" bind:value={neighborhood} disabled={!city}
                        class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition disabled:opacity-50">
                        {#each hoods as h}<option value={h}>{h}</option>{/each}
                    </select>
                    <p class="text-white/40 text-xs mt-1">{tFn(f.hintKey)}</p>
                </div>
            {:else if f.key === 'phone'}
                <div>
                    <label for="lu-phone" class="block text-sm font-medium text-gray-300 mb-1">{tFn(f.labelKey)}</label>
                    <input id="lu-phone" type="tel" inputmode="tel" bind:value={phone} placeholder="050-0000000"
                        class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition" />
                    <p class="text-white/40 text-xs mt-1">{tFn(f.hintKey)}</p>
                    {#if phoneTooShort}
                        <p class="text-amber-400 text-xs mt-1">{tFn('hint_phone_short')}</p>
                    {/if}
                </div>
            {:else if f.key === 'gender'}
                <div>
                    <span class="block text-sm font-medium text-gray-300 mb-1">{tFn(f.labelKey)}</span>
                    <div class="flex gap-2">
                        <button type="button" onclick={() => (gender = 'male')}
                            class="flex-1 py-3 rounded-xl border font-semibold transition {gender === 'male' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#1e293b] border-white/10 text-white/70 hover:border-white/30'}">
                            {tFn('gender_male')}
                        </button>
                        <button type="button" onclick={() => (gender = 'female')}
                            class="flex-1 py-3 rounded-xl border font-semibold transition {gender === 'female' ? 'bg-pink-600 border-pink-500 text-white' : 'bg-[#1e293b] border-white/10 text-white/70 hover:border-white/30'}">
                            {tFn('gender_female')}
                        </button>
                    </div>
                </div>
            {:else if f.key === 'birth_date'}
                <div>
                    <label for="lu-bdate" class="block text-sm font-medium text-gray-300 mb-1">{tFn(f.labelKey)}</label>
                    <input id="lu-bdate" type="date" bind:value={birthDate}
                        class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition" />
                    <p class="text-white/40 text-xs mt-1">{tFn(f.hintKey)}</p>
                </div>
            {:else if f.key === 'name'}
                <div>
                    <label for="lu-name" class="block text-sm font-medium text-gray-300 mb-1">{tFn(f.labelKey)}</label>
                    <input id="lu-name" type="text" value=""
                        class="w-full bg-[#1e293b] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition" disabled />
                    <p class="text-white/40 text-xs mt-1">{tFn(f.hintKey)}</p>
                </div>
            {:else if f.key === 'email_confirmed'}
                <div class="rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3">
                    <p class="text-amber-200 text-sm mb-2">{tFn(f.hintKey)}</p>
                    {#if emailSent}
                        <p class="text-green-400 text-sm font-medium">{tFn('email_verify_sent')}</p>
                    {:else}
                        <button type="button" onclick={requestEmailVerify}
                            class="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 text-sm font-semibold hover:bg-amber-500/30 transition">
                            {tFn('email_verify_btn')}
                        </button>
                    {/if}
                </div>
            {/if}
        {/each}
    </div>

    {#if errorKey}
        <p class="text-red-400 text-sm mt-3">{tFn(errorKey)}</p>
    {/if}

    <button type="button" onclick={save} disabled={!canSave || saving}
        class="w-full mt-5 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-lg hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed">
        {#if saving}
            <span class="inline-flex items-center gap-2 justify-center">
                <span class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                {tFn('saving')}
            </span>
        {:else}
            {tFn('save_and_continue')}
        {/if}
    </button>
</div>
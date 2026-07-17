<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { citiesAndNeighborhoods, effectiveNeighborhoods } from '$lib/neighborhoodsData';
    import NeighborhoodPicker from '$lib/components/NeighborhoodPicker.svelte';

    interface PageData {
        user: { name: string; phone: string; neighborhood?: string; city?: string } | null;
        loggedIn?: boolean;
        takenAreas?: Record<string, string>;
    }

    let { data }: { data: PageData } = $props();

    // האם המשתמש מחובר (נקבע בשרת). אם לא — מציגים הכוונה בעברית במקום הטופס,
    // כי ה-API של בקשת רכז דורש התחברות ואחרת מחזיר 401.
    const isLoggedIn = $derived(data.loggedIn ?? (data.user !== null));
    const loginUrl = '/login?redirect=/coordinator/apply';   // חוזר לעמוד אחרי כניסה
    const registerUrl = '/register';

    /** מפתח השוואה אחיד לאזור: שם|עיר באותיות קטנות, תואם לצד השרת */
    const areaMatchKey = (name: string, cityName: string) =>
        `${name.trim().toLowerCase()}|${(cityName || '').trim().toLowerCase()}`;

    let name = $state(data.user?.name || '');
    let phone = $state(data.user?.phone || '');
    // ברירת מחדל: לוקחים עיר ושכונה מהפרופיל, אך ניתן לערוך כאן
    let city = $state(data.user?.city || '');
    let neighborhood = $state(data.user?.neighborhood || '');
    let experience = $state('');
    let motivation = $state('');
    let isLoading = $state(false);
    let error = $state<string | null>(null);
    let authError = $state(false); // השגיאה היא חסימת התחברות → מציגים כפתורי הרשמה/כניסה
    let success = $state(false);
    // המבקש כבר רכז של האזור שביקש → אין בקשה חוזרת; מציגים הודעה כנה (לא "נשלח בהצלחה")
    let alreadyCoordinator = $state(false);
    let alreadyArea = $state('');

    // רשימת ערים/יישובים
    const allCities = Object.keys(citiesAndNeighborhoods).sort((a, b) => a.localeCompare(b, 'he'));

    // שכונות אמיתיות של העיר הנבחרת — מסננים את ה"מרכז" הגנרי (יישוב ללא שכונות מוגדרות)
    const cityNeighborhoods = $derived(
        effectiveNeighborhoods(city, (data as any).approvedNeighborhoods).filter((n) => n && n !== 'מרכז')
    );
    // יודעים בוודאות שיש לעיר שכונות? רק אז דורשים בחירת שכונה
    const cityHasNeighborhoods = $derived(cityNeighborhoods.length > 0);

    // השכונה שלי לא ברשימה → מאפשרים לסמן שכונה חדשה על המפה
    let nbNotListed = $state(false);
    let newNbName = $state('');
    // פין על המפה לאימות מיקום (גם לשכונה חדשה וגם לאימות יישוב)
    let pinLat = $state<number | null>(null);
    let pinLng = $state<number | null>(null);

    // אם העיר השתנתה והשכונה הישנה כבר לא ברשימה — מאפסים
    $effect(() => {
        if (neighborhood && !cityNeighborhoods.includes(neighborhood)) {
            neighborhood = '';
        }
    });

    // מהו האזור שעליו יבקש להיות רכז — null אם עדיין אי אפשר להמשיך
    type Area = {
        label: string;
        roleLabel: string;
        key: string;
        pendingNeighborhood?: { name: string; city: string; lat: number; lng: number } | null;
    };
    const area = $derived.by((): Area | null => {
        const c = city.trim();
        if (!c) return null;

        if (cityHasNeighborhoods) {
            if (nbNotListed) {
                const nm = newNbName.trim();
                if (!nm) return null;
                return {
                    label: `${nm} (${c})`,
                    key: areaMatchKey(nm, c),
                    roleLabel: $_('coordinator_area_neighborhood'),
                    pendingNeighborhood:
                        pinLat != null && pinLng != null ? { name: nm, city: c, lat: pinLat, lng: pinLng } : null,
                };
            }
            if (!neighborhood) return null;
            return { label: `${neighborhood} (${c})`, key: areaMatchKey(neighborhood, c), roleLabel: $_('coordinator_area_neighborhood') };
        }

        // ליישוב אין שכונות מוגדרות → רכז של היישוב כולו (לא חוסמים!)
        return {
            label: c,
            key: areaMatchKey(c, ''),
            roleLabel: $_('coordinator_area_city'),
            pendingNeighborhood:
                pinLat != null && pinLng != null ? { name: neighborhood || 'מרכז', city: c, lat: pinLat, lng: pinLng } : null,
        };
    });

    // אם לאזור שנבחר כבר יש רכז — שם הרכז הנוכחי (אחרת null)
    const existingCoordinator = $derived(area ? (data.takenAreas?.[area.key] ?? null) : null);

    const canSubmit = $derived(!!name.trim() && !!phone.trim() && area !== null);

    async function handleSubmit(e: Event) {
        e.preventDefault();
        if (!area) {
            error = $_('coordinator_need_area');
            return;
        }
        error = null;
        authError = false;
        alreadyCoordinator = false;
        isLoading = true;

        try {
            // אם סומן פין על המפה — יוצרים בקשת שכונה ממתינה לאישור מנהל (best-effort)
            if (area.pendingNeighborhood) {
                try {
                    await fetch('/api/neighborhoods', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        // שם וטלפון מהטופס - כדי שהאדמין יוכל ליצור קשר עם המבקש מהפאנל
                        body: JSON.stringify({ ...area.pendingNeighborhood, requester_name: name.trim(), requester_phone: phone.trim() }),
                    });
                } catch { /* לא מכשיל את בקשת הרכז */ }
            }

            const response = await fetch('/api/coordinator-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, neighborhoods: [area.label], experience, motivation }),
            });

            if (!response.ok) {
                // תרגום חסימות השרת לעברית + הכוונה, במקום מחרוזת אנגלית גולמית ("Unauthorized")
                if (response.status === 401) {
                    authError = true;
                    error = $_('coordinator_unauthorized');
                } else if (response.status === 400) {
                    error = $_('coordinator_missing_fields');
                } else {
                    error = $_('coordinator_error');
                }
                return;
            }

            // כבר רכז של האזור המבוקש → השרת מחזיר alreadyCoordinator בלי ליצור בקשה.
            // חובה להבחין מ"נשלח בהצלחה" - אחרת המשתמש חושב שהגיש והאדמין לא רואה כלום.
            const result = await response.json().catch(() => ({} as Record<string, unknown>));
            if (result?.alreadyCoordinator) {
                alreadyArea = area.label;
                alreadyCoordinator = true;
                return;
            }

            success = true;
            experience = '';
            motivation = '';
        } catch {
            error = $_('coordinator_error');
        } finally {
            isLoading = false;
        }
    }
</script>

<svelte:head>
    <title>בקשה להיות רכז שכונה | קהילה בשכונה</title>
    <meta name="description" content="הגישו בקשה להיות רכז שכונה בקהילה בשכונה ולהוביל את הפעילות הקהילתית בשכונה שלכם." />
    <link rel="canonical" href="https://community.gofreeil.com/coordinator/apply" />
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-4">{$_('coordinator_title')}</h1>
            <p class="text-lg text-slate-300">{$_('coordinator_subtitle')}</p>
        </div>

        {#if success}
            <div class="bg-green-900 border border-green-500 rounded-lg p-6 mb-6">
                <p class="text-green-200 text-center">{$_('coordinator_success')}</p>
            </div>
        {:else if alreadyCoordinator}
            <!-- כבר רכז של האזור המבוקש → הודעה כנה, לא "נשלח בהצלחה" -->
            <div class="bg-blue-900/30 border border-blue-500/40 rounded-lg p-6 mb-6">
                <p class="text-blue-100 text-center">{$_('coordinator_already_self', { values: { area: alreadyArea } })}</p>
            </div>
        {:else if !isLoggedIn}
            <!-- לא מחובר → הכוונה בעברית לפי הסדר (הרשמה/כניסה), במקום טופס שיוחזר מ-401 -->
            <div class="bg-blue-900/30 border border-blue-500/40 rounded-lg p-6 mb-6">
                <p class="text-blue-100 font-bold text-lg mb-3">🔒 {$_('coordinator_login_required_title')}</p>
                <p class="text-slate-300 text-sm mb-4">{$_('coordinator_login_required_intro')}</p>
                <ol class="text-slate-200 text-sm list-decimal pr-5 space-y-1.5 mb-5">
                    <li>{$_('coordinator_login_step1')}</li>
                    <li>{$_('coordinator_login_step2')}</li>
                    <li>{$_('coordinator_login_step3')}</li>
                </ol>
                <div class="flex flex-wrap gap-3">
                    <a href={registerUrl} class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded transition-colors">{$_('coordinator_go_register')}</a>
                    <a href={loginUrl} class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 px-6 rounded transition-colors">{$_('coordinator_go_login')}</a>
                </div>
            </div>
        {:else}
            <form
                onsubmit={handleSubmit}
                class="bg-slate-800 rounded-lg p-8 border border-slate-700"
            >
                {#if error}
                    <div class="bg-red-900 border border-red-500 rounded-lg p-4 mb-6">
                        <p class="text-red-200">{error}</p>
                        {#if authError}
                            <div class="flex flex-wrap gap-3 mt-3">
                                <a href={loginUrl} class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded transition-colors">{$_('coordinator_go_login')}</a>
                                <a href={registerUrl} class="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-5 rounded transition-colors">{$_('coordinator_go_register')}</a>
                            </div>
                        {/if}
                    </div>
                {/if}

                <!-- Name -->
                <div class="mb-6">
                    <label for="c-name" class="block text-sm font-medium mb-2">{$_('coordinator_name')}</label>
                    <input
                        id="c-name"
                        type="text"
                        bind:value={name}
                        required
                        class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <!-- Phone -->
                <div class="mb-6">
                    <label for="c-phone" class="block text-sm font-medium mb-2">{$_('coordinator_phone')}</label>
                    <input
                        id="c-phone"
                        type="tel"
                        bind:value={phone}
                        required
                        class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <!-- City (ברירת מחדל מהפרופיל, ניתן לערוך) -->
                <div class="mb-6">
                    <label for="c-city" class="block text-sm font-medium mb-2">{$_('coordinator_city')}</label>
                    <input
                        id="c-city"
                        list="cities-list"
                        bind:value={city}
                        required
                        placeholder={$_('coordinator_choose_city')}
                        class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                    <datalist id="cities-list">
                        {#each allCities as c}
                            <option value={c}></option>
                        {/each}
                    </datalist>
                </div>

                <!-- Neighborhood: רק אם ידוע שיש לעיר שכונות -->
                {#if city && cityHasNeighborhoods}
                    <div class="mb-6">
                        <label for="c-neighborhood" class="block text-sm font-medium mb-2">{$_('coordinator_neighborhood')}</label>
                        {#if !nbNotListed}
                            <select
                                id="c-neighborhood"
                                value={neighborhood}
                                onchange={(e) => {
                                    const v = e.currentTarget.value;
                                    if (v === '__not_listed__') {
                                        nbNotListed = true;
                                        neighborhood = '';
                                    } else {
                                        neighborhood = v;
                                    }
                                }}
                                class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            >
                                <option value="">{$_('coordinator_choose_neighborhood')}</option>
                                <option value="__not_listed__">{$_('coordinator_nb_not_listed')}</option>
                                {#each cityNeighborhoods as nb}
                                    <option value={nb}>{nb}</option>
                                {/each}
                            </select>
                        {/if}

                        <label class="flex items-center gap-2 mt-3 text-sm text-slate-300 cursor-pointer">
                            <input type="checkbox" bind:checked={nbNotListed} class="accent-blue-500" />
                            {$_('coordinator_nb_not_listed')}
                        </label>

                        {#if nbNotListed}
                            <input
                                type="text"
                                bind:value={newNbName}
                                placeholder={$_('coordinator_new_nb_name')}
                                class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 mt-3 text-white focus:outline-none focus:border-blue-500"
                            />
                            <p class="text-sm text-amber-300 mt-3 mb-1.5">{$_('coordinator_verify_location')}</p>
                            <p class="text-xs text-slate-400 mb-2">{$_('coordinator_verify_optional')}</p>
                            <NeighborhoodPicker {city} bind:lat={pinLat} bind:lng={pinLng} />
                        {/if}
                    </div>
                {:else if city && !cityHasNeighborhoods}
                    <!-- יישוב ללא שכונות → רכז היישוב, עם אימות מיקום אופציונלי -->
                    <div class="mb-6 bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                        <p class="text-emerald-200 text-sm font-bold">📍 {city}</p>
                        <p class="text-slate-300 text-sm mt-1">{$_('coordinator_city_only_note')}</p>
                        <p class="text-sm text-amber-300 mt-3 mb-1.5">{$_('coordinator_verify_location')}</p>
                        <p class="text-xs text-slate-400 mb-2">{$_('coordinator_verify_optional')}</p>
                        <NeighborhoodPicker {city} bind:lat={pinLat} bind:lng={pinLng} />
                    </div>
                {/if}

                <!-- Experience -->
                <div class="mb-6">
                    <label for="c-exp" class="block text-sm font-medium mb-2">{$_('coordinator_experience')}</label>
                    <textarea
                        id="c-exp"
                        bind:value={experience}
                        rows="3"
                        class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder={$_('coordinator_experience')}
                    ></textarea>
                </div>

                <!-- Motivation -->
                <div class="mb-8">
                    <label for="c-mot" class="block text-sm font-medium mb-2">{$_('coordinator_motivation')}</label>
                    <textarea
                        id="c-mot"
                        bind:value={motivation}
                        rows="3"
                        class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder={$_('coordinator_motivation')}
                    ></textarea>
                </div>

                {#if existingCoordinator}
                    <div class="bg-amber-900/30 border border-amber-500/40 rounded-lg p-4 mb-4">
                        <p class="text-amber-200 text-sm">{$_('coordinator_already_has', { values: { name: existingCoordinator } })}</p>
                    </div>
                {/if}

                {#if !canSubmit && city}
                    <p class="text-amber-300/80 text-sm mb-3">{$_('coordinator_need_area')}</p>
                {/if}

                <button
                    type="submit"
                    disabled={isLoading || !canSubmit}
                    class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded transition-colors"
                >
                    {#if isLoading}
                        {$_('coordinator_submitting')}
                    {:else}
                        {$_('coordinator_submit')}
                    {/if}
                </button>
            </form>
        {/if}

        <div class="text-center mt-8">
            <a href="/" class="text-blue-400 hover:text-blue-300 underline"
                >{$_('back_home')}</a
            >
        </div>
    </div>
</div>

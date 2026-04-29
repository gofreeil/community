<script lang="ts">
    import type { ActionData, PageData } from './$types';
    import { categoryConfig } from '$lib/categoryFields';
    import { citiesAndNeighborhoods } from '$lib/neighborhoodsData';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const conditions = categoryConfig.giveaway.fields.find(f => f.key === 'condition')?.options ?? [];
    const cities = Object.keys(citiesAndNeighborhoods).sort();

    let condition = $state<string>('');
    let label = $state('');
    let description = $state('');

    // הערכים ההתחלתיים נטענים פעם אחת מ-data.defaults; המשתמש יכול לערוך
    const { name: defName, phone: defPhone, neighborhood: defNeighborhood, city: defCity } = data.defaults;
    let city         = $state(defCity);
    let neighborhood = $state(defNeighborhood);
    let contact      = $state(defName);
    let phone        = $state(defPhone);

    let neighborhoodOptions = $derived(citiesAndNeighborhoods[city] ?? []);

    $effect(() => {
        if (city && !neighborhoodOptions.includes(neighborhood)) {
            neighborhood = '';
        }
    });

    let labelLen = $derived(label.length);
    let descLen  = $derived(description.length);

    const LABEL_MAX = 60;
    const DESC_MAX = 1500;

    const hasDefaults = !!(defName || defPhone || defNeighborhood || defCity);
</script>

<svelte:head>
    <title>פרסום פריט למסירה | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">📦</span>
            <h1 class="text-3xl font-black text-white mb-2">פרסום פריט למסירה</h1>
            <p class="text-gray-400">שיתוף פריט בקהילה לוקח פחות מדקה — חינם ובלי עמלות</p>
        </div>

        {#if !data.userId}
            <div class="rounded-xl bg-red-900/30 border border-red-500/30 p-4 mb-4 text-center">
                <p class="text-red-200 mb-2">יש להתחבר כדי לפרסם</p>
                <a href="/login?redirect=/giveaways/add" class="inline-block bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold">התחברות</a>
            </div>
        {:else}
            <form method="POST" class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-5">

                <!-- Section 1: העיקר -->
                <div class="space-y-4">
                    <h2 class="text-orange-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <span class="w-1.5 h-5 bg-orange-500 rounded-full"></span>
                        פרטי הפריט
                    </h2>

                    <div>
                        <label for="label" class="text-white text-sm font-bold mb-1 flex justify-between">
                            <span>שם הפריט *</span>
                            <span class="text-gray-500 text-xs font-normal">{labelLen}/{LABEL_MAX}</span>
                        </label>
                        <input
                            id="label"
                            name="label"
                            required
                            maxlength={LABEL_MAX}
                            bind:value={label}
                            placeholder="לדוגמה: ספה דו-מושבית במצב מצוין"
                            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                        />
                    </div>

                    <div>
                        <span class="text-white text-sm font-bold mb-2 block">מצב הפריט *</span>
                        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {#each conditions as c}
                                <button
                                    type="button"
                                    onclick={() => condition = c}
                                    class="px-3 py-2.5 rounded-xl text-sm font-bold transition-all border {condition === c ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400 shadow-lg' : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'}"
                                >{c}</button>
                            {/each}
                        </div>
                        <input type="hidden" name="condition" value={condition} />
                    </div>

                    <div>
                        <label for="description" class="text-white text-sm font-bold mb-1 flex justify-between">
                            <span>תיאור *</span>
                            <span class="text-gray-500 text-xs font-normal">{descLen}/{DESC_MAX}</span>
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            required
                            rows="4"
                            maxlength={DESC_MAX}
                            bind:value={description}
                            placeholder="תאר את הפריט: גודל, צבע, ניסיון שימוש, סיבת המסירה..."
                            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors resize-none"
                        ></textarea>
                    </div>

                    <div>
                        <label for="tags" class="text-white text-sm font-bold mb-1 block">תגיות (אופציונלי)</label>
                        <input
                            id="tags"
                            name="tags"
                            placeholder="ריהוט, סלון, אורן (מופרדות בפסיקים)"
                            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                        />
                        <p class="text-gray-500 text-xs mt-1">תגיות עוזרות לאחרים למצוא את הפריט בחיפוש</p>
                    </div>
                </div>

                <!-- Section 2: מיקום -->
                <div class="space-y-4 pt-3 border-t border-white/5">
                    <h2 class="text-orange-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <span class="w-1.5 h-5 bg-orange-500 rounded-full"></span>
                        מיקום (לאיתור הפריט במפה)
                    </h2>

                    {#if hasDefaults}
                        <div class="rounded-lg bg-emerald-900/20 border border-emerald-500/20 px-3 py-2 text-emerald-300 text-xs">
                            💡 השדות שלמטה הוזנו מראש מהפרופיל שלך — אפשר לערוך אם צריך
                        </div>
                    {/if}

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label for="city" class="text-white text-sm font-bold mb-1 block">עיר *</label>
                            <select
                                id="city"
                                name="city"
                                required
                                bind:value={city}
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-orange-500/50 focus:outline-none transition-colors"
                            >
                                <option value="">בחר עיר</option>
                                {#each cities as c}
                                    <option value={c}>{c}</option>
                                {/each}
                            </select>
                        </div>
                        <div>
                            <label for="neighborhood" class="text-white text-sm font-bold mb-1 block">שכונה *</label>
                            <select
                                id="neighborhood"
                                name="neighborhood"
                                required
                                bind:value={neighborhood}
                                disabled={!city}
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:border-orange-500/50 focus:outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <option value="">{city ? 'בחר שכונה' : 'בחר עיר קודם'}</option>
                                {#each neighborhoodOptions as n}
                                    <option value={n}>{n}</option>
                                {/each}
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label for="street" class="text-white text-sm font-bold mb-1 block">רחוב (אופציונלי)</label>
                            <input
                                id="street"
                                name="street"
                                placeholder="שם הרחוב"
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label for="buildingNum" class="text-white text-sm font-bold mb-1 block">מספר בניין (אופציונלי)</label>
                            <input
                                id="buildingNum"
                                name="buildingNum"
                                placeholder="מספר"
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-3">
                        <div>
                            <label for="floor" class="text-white text-sm font-bold mb-1 block">קומה</label>
                            <input
                                id="floor"
                                name="floor"
                                placeholder="לדוגמה: 3"
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label for="apartment" class="text-white text-sm font-bold mb-1 block">מספר דירה</label>
                            <input
                                id="apartment"
                                name="apartment"
                                placeholder="לדוגמה: 5"
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                        <div></div>
                    </div>

                    <div>
                        <label for="arrivalNotes" class="text-white text-sm font-bold mb-1 block">הערות הגעה</label>
                        <textarea
                            id="arrivalNotes"
                            name="arrivalNotes"
                            rows="2"
                            placeholder="לדוגמה: כנסו דרך הכניסה הצדדית"
                            class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors resize-none"
                            style="color-scheme: dark;"
                        ></textarea>
                    </div>
                </div>

                <!-- Section 3: יצירת קשר -->
                <div class="space-y-4 pt-3 border-t border-white/5">
                    <h2 class="text-orange-400 text-xs font-black uppercase tracking-wider flex items-center gap-2">
                        <span class="w-1.5 h-5 bg-orange-500 rounded-full"></span>
                        יצירת קשר
                    </h2>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label for="contact" class="text-white text-sm font-bold mb-1 block">שם *</label>
                            <input
                                id="contact"
                                name="contact"
                                required
                                bind:value={contact}
                                placeholder="שמך"
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                        <div>
                            <label for="phone" class="text-white text-sm font-bold mb-1 block">טלפון *</label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                required
                                bind:value={phone}
                                placeholder="05X-XXXXXXX"
                                class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-orange-500/50 focus:outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                {#if form?.error}
                    <p class="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-lg py-2">{form.error}</p>
                {/if}

                <button
                    type="submit"
                    class="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.01]"
                >
                    📦 פרסם פריט
                </button>

                <p class="text-gray-500 text-xs text-center">
                    בלחיצה על "פרסם" אתה מאשר שהפריט אכן עומד למסירה ושתעדכן כשיילקח
                </p>
            </form>
        {/if}

        <div class="text-center mt-6">
            <a href="/giveaways" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לרשימה</a>
        </div>
    </div>
</div>

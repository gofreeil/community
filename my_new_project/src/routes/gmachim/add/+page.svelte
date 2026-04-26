<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { enhance } from '$app/forms';
    import { citiesAndNeighborhoods, LS_KEY, DEFAULT_NEIGHBORHOOD } from '$lib/neighborhoodsData';
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    const DRAFT_KEY = 'add_draft_gmach';

    // Shared vocabulary with the national site (national-gemach):
    // value = key stored in Strapi (extra_fields.gmach_type), label = Hebrew display.
    const GMACH_TYPES = [
        { key: 'clothing',    label: '👕 ביגוד' },
        { key: 'baby',        label: '🍼 תינוקות' },
        { key: 'books',       label: '📚 ספרים' },
        { key: 'furniture',   label: '🪑 ריהוט' },
        { key: 'medical',     label: '🏥 ציוד רפואי' },
        { key: 'food',        label: '🥫 מזון' },
        { key: 'tools',       label: '🔧 כלים' },
        { key: 'wedding',     label: '💍 חתונה' },
        { key: 'judaism',     label: '✡️ יהדות' },
        { key: 'initiatives', label: '🌟 מיזמים חשובים לציבור' },
        { key: 'other',       label: '📦 אחר' },
    ];

    // ---- Form state ----
    let title       = $state('');
    let headline    = $state('');
    let summary     = $state('');
    let icon        = $state('🤝');
    let description = $state('');
    let address     = $state('');
    let hours       = $state('');
    let contact     = $state('');
    let phone       = $state('');
    let gmachType   = $state('');
    let city        = $state(data.userCity || 'ירושלים');
    let neighborhood = $state(data.userNeighborhood || DEFAULT_NEIGHBORHOOD);
    let logoBase64  = $state('');
    let images      = $state<string[]>([]);
    let tags        = $state<string[]>([]);
    let tagInput    = $state('');

    function addTag() {
        const raw = tagInput.trim().replace(/^#+/, '').trim();
        if (raw && !tags.includes(raw)) {
            tags = [...tags, raw];
        }
        tagInput = '';
    }

    function handleTagKeyDown(e: KeyboardEvent) {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
            tags = tags.slice(0, -1);
        }
    }

    function removeTag(i: number) {
        tags = tags.filter((_, idx) => idx !== i);
    }

    const MAX_IMAGES = 6;

    let clientError    = $state('');
    let redirectingMsg = $state('');

    // ---- Image utilities ----
    function fileToResizedBase64(file: File, maxDim: number, quality = 0.82): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('read error'));
            reader.onload = (ev) => {
                const src = ev.target?.result as string;
                const img = new Image();
                img.onerror = () => reject(new Error('image error'));
                img.onload = () => {
                    let w = img.naturalWidth;
                    let h = img.naturalHeight;
                    if (w > maxDim || h > maxDim) {
                        const ratio = Math.min(maxDim / w, maxDim / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = src;
            };
            reader.readAsDataURL(file);
        });
    }

    async function handleLogoChange(e: Event) {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        try {
            logoBase64 = await fileToResizedBase64(file, 400, 0.85);
        } catch {
            clientError = 'בעיה בטעינת הלוגו, נסה תמונה אחרת';
        }
    }

    async function handleImagesChange(e: Event) {
        const files = Array.from((e.target as HTMLInputElement).files ?? []);
        if (files.length === 0) return;

        const remaining = MAX_IMAGES - images.length;
        const toProcess = files.slice(0, remaining);

        try {
            const newImgs: string[] = [];
            for (const f of toProcess) {
                newImgs.push(await fileToResizedBase64(f, 900, 0.82));
            }
            images = [...images, ...newImgs];
        } catch {
            clientError = 'בעיה בטעינת אחת התמונות, נסה תמונות אחרות';
        }
        // איפוס ערך ה-input כדי לאפשר העלאה חוזרת של אותו קובץ
        (e.target as HTMLInputElement).value = '';
    }

    function removeLogo() { logoBase64 = ''; }
    function removeImage(i: number) { images = images.filter((_, idx) => idx !== i); }

    // ---- Restore draft + neighborhood from localStorage ----
    onMount(() => {
        if (!browser) return;

        // אם אין נתוני פרופיל — נסה localStorage של בחירת השכונה הכללית
        if (!data.userCity || !data.userNeighborhood) {
            try {
                const saved = localStorage.getItem(LS_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.neighborhood) neighborhood = parsed.neighborhood;
                    if (parsed.city)         city         = parsed.city;
                }
            } catch {}
        }

        // שחזר טיוטה (אם חזר מהרשמה)
        try {
            const draft = localStorage.getItem(DRAFT_KEY);
            if (draft) {
                const d = JSON.parse(draft);
                if (d.title)        title        = d.title;
                if (d.headline)     headline     = d.headline;
                if (d.summary)      summary      = d.summary;
                if (d.icon)         icon         = d.icon;
                if (d.description)  description  = d.description;
                if (d.address)      address      = d.address;
                if (d.hours)        hours        = d.hours;
                if (d.contact)      contact      = d.contact;
                if (d.phone)        phone        = d.phone;
                if (d.gmachType)    gmachType    = d.gmachType;
                if (d.city)         city         = d.city;
                if (d.neighborhood) neighborhood = d.neighborhood;
                if (d.logoBase64)   logoBase64   = d.logoBase64;
                if (Array.isArray(d.images)) images = d.images;
                if (Array.isArray(d.tags))   tags   = d.tags;
                localStorage.removeItem(DRAFT_KEY);
            }
        } catch {}
    });

    let neighborhoodsForCity = $derived(citiesAndNeighborhoods[city] ?? []);

    // אם משתנה עיר — איפוס לשכונה הראשונה אם הקיימת לא תואמת
    $effect(() => {
        if (neighborhoodsForCity.length > 0 && !neighborhoodsForCity.includes(neighborhood)) {
            neighborhood = neighborhoodsForCity[0];
        }
    });

    function validate(): string | null {
        if (!title.trim())        return 'יש למלא שם הגמ"ח';
        if (!phone.trim())        return 'יש למלא טלפון ליצירת קשר';
        if (!address.trim())      return 'יש למלא כתובת מדויקת';
        if (!city.trim())         return 'יש לבחור עיר';
        if (!neighborhood.trim()) return 'יש לבחור שכונה';
        return null;
    }

    function saveDraft() {
        if (!browser) return;
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({
                title, headline, summary, icon, description, address, hours, contact, phone, gmachType, city, neighborhood,
                logoBase64, images, tags,
            }));
        } catch {
            // אם חרגנו ממכסת localStorage (תמונות גדולות) — שמור בלי תמונות
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({
                    title, headline, summary, icon, description, address, hours, contact, phone, gmachType, city, neighborhood, tags,
                }));
            } catch {}
        }
    }

    // ---- Submit handler ----
    function handleSubmit(e: Event) {
        clientError = '';
        const err = validate();
        if (err) {
            e.preventDefault();
            clientError = err;
            return;
        }

        // אם לא מחובר — שמור טיוטה והפנה להרשמה
        if (!data.userId) {
            e.preventDefault();
            saveDraft();
            redirectingMsg = 'הטיוטה שלך נשמרה ✓\nאתה מועבר להרשמה — הפרסום יושלם מיד לאחריה.';
            setTimeout(() => goto('/login?redirect=/gmachim/add'), 2200);
            return;
        }
        // מחובר — תן ל-form action הרגיל לרוץ
    }
</script>

<svelte:head>
    <title>פרסום גמ"ח חדש | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">🤝</span>
            <h1 class="text-3xl font-black text-white mb-2">פרסום גמ"ח חדש</h1>
            <p class="text-gray-400">פרסם את הגמ"ח שלך — יופיע בקהילה ובאתר הגמ"ח הארצי</p>
        </div>

        {#if !data.userId}
            <div class="rounded-xl bg-blue-900/20 border border-blue-500/30 p-3 mb-4 text-center text-blue-200 text-sm">
                💡 ניתן למלא את הטופס כעת — בסיום תועבר להרשמה קצרה והפרסום יושלם אוטומטית.
            </div>
        {/if}

        {#if redirectingMsg}
            <div class="rounded-2xl border-2 border-blue-500/40 bg-blue-900/20 p-8 text-center">
                <div class="text-4xl mb-4">💾</div>
                {#each redirectingMsg.split('\n') as line}
                    <p class="text-blue-200 font-bold text-base mb-2">{line}</p>
                {/each}
                <div class="mt-4 flex justify-center">
                    <span class="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                </div>
            </div>
        {:else}
            <form method="POST" onsubmit={handleSubmit} use:enhance class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-4">
                <div>
                    <label for="title" class="text-white text-sm font-bold mb-1 block">שם הגמ"ח *</label>
                    <input id="title" name="title" bind:value={title} required placeholder='לדוגמה: גמ"ח כיסאות' class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>

                <div>
                    <label for="headline" class="text-white text-sm font-bold mb-1 block">כותרת</label>
                    <input id="headline" name="headline" bind:value={headline} placeholder="כותרת קצרה ומושכת לגמ&quot;ח" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                </div>

                <div>
                    <label for="summary" class="text-white text-sm font-bold mb-1 block">תיאור</label>
                    <textarea id="summary" name="summary" bind:value={summary} rows="3" placeholder="תיאור כללי של הגמ&quot;ח" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" style="color-scheme: dark;"></textarea>
                </div>

                <!-- Logo upload -->
                <div>
                    <p class="text-white text-sm font-bold mb-1">לוגו (אופציונלי)</p>
                    {#if logoBase64}
                        <div class="relative inline-block">
                            <img src={logoBase64} alt="לוגו" class="w-24 h-24 rounded-xl object-cover border border-white/15 bg-black/30" />
                            <button type="button" onclick={removeLogo} aria-label="הסר לוגו"
                                class="absolute -top-2 -left-2 w-7 h-7 rounded-full bg-black/70 hover:bg-red-600 text-white text-sm flex items-center justify-center transition-colors">✕</button>
                        </div>
                    {:else}
                        <label class="flex flex-col items-center justify-center gap-1 w-32 h-32 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/3 hover:bg-amber-900/10 cursor-pointer transition-all">
                            <span class="text-2xl">🎨</span>
                            <span class="text-gray-400 text-xs font-bold">העלה לוגו</span>
                            <span class="text-gray-600 text-[10px]">תמונה ריבועית מומלצת</span>
                            <input type="file" accept="image/*" class="hidden" onchange={handleLogoChange} />
                        </label>
                    {/if}
                    <input type="hidden" name="logo_base64" value={logoBase64} />
                </div>

                <!-- Multi image upload -->
                <div>
                    <p class="text-white text-sm font-bold mb-1">תמונות (עד {MAX_IMAGES}, אופציונלי)</p>
                    <div class="grid grid-cols-3 gap-2">
                        {#each images as img, i}
                            <div class="relative aspect-square rounded-lg overflow-hidden border border-white/10">
                                <img src={img} alt="תמונה {i + 1}" class="w-full h-full object-cover bg-black/30" />
                                <button type="button" onclick={() => removeImage(i)} aria-label="הסר תמונה"
                                    class="absolute top-1 left-1 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white text-xs flex items-center justify-center transition-colors">✕</button>
                            </div>
                        {/each}
                        {#if images.length < MAX_IMAGES}
                            <label class="aspect-square flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/3 hover:bg-amber-900/10 cursor-pointer transition-all">
                                <span class="text-2xl">📷</span>
                                <span class="text-gray-400 text-xs font-bold">הוסף</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange={handleImagesChange} />
                            </label>
                        {/if}
                    </div>
                    <input type="hidden" name="images_json" value={JSON.stringify(images)} />
                </div>

                <div>
                    <label for="gmach_type" class="text-white text-sm font-bold mb-1 block">סוג הגמ"ח</label>
                    <select id="gmach_type" name="gmach_type" bind:value={gmachType} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" style="color-scheme: dark;">
                        <option value="">-- בחר סוג --</option>
                        {#each GMACH_TYPES as t}
                            <option value={t.key}>{t.label}</option>
                        {/each}
                    </select>
                </div>

                <div>
                    <label for="icon" class="text-white text-sm font-bold mb-1 block">אייקון (אמוג'י)</label>
                    <input id="icon" name="icon" bind:value={icon} maxlength="4" placeholder="🤝" class="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-center text-xl" />
                    <p class="text-gray-500 text-xs mt-1">משמש כברירת מחדל אם לא הועלה לוגו</p>
                </div>

                <div>
                    <label for="description" class="text-white text-sm font-bold mb-2 block">פירוט הגמ"ח *</label>
                    <textarea id="description" name="description" bind:value={description} rows="3" placeholder="רשום את הפרטים הנמצאים במלאי" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" style="color-scheme: dark;"></textarea>

                    <!-- Tags input (chip windows) -->
                    <div class="mt-3">
                        <label for="tag_input" class="text-white text-sm font-bold mb-0.5 block">תגים</label>
                        <p class="text-gray-400 text-xs mb-2">(באמצעות התגים יהיה ניתן לאתר את הגמ"ח בקלות יותר)</p>
                        <div class="flex flex-wrap items-center gap-2 p-2 bg-white/5 border border-white/10 rounded-lg min-h-[3rem] focus-within:border-amber-500/50 transition-colors">
                            {#each tags as tag, i}
                                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-600/20 border border-amber-500/40 text-amber-100 text-sm font-medium">
                                    <span>#{tag}</span>
                                    <button type="button" onclick={() => removeTag(i)} aria-label="הסר תג"
                                        class="text-amber-200/70 hover:text-red-400 transition-colors">✕</button>
                                </span>
                            {/each}
                            <input
                                id="tag_input"
                                type="text"
                                bind:value={tagInput}
                                onkeydown={handleTagKeyDown}
                                onblur={addTag}
                                placeholder={tags.length === 0 ? 'בגדי תינוקות' : 'הוסף תג נוסף...'}
                                class="flex-1 min-w-[120px] bg-transparent outline-none text-white text-sm px-1 py-1 placeholder:text-gray-500"
                            />
                        </div>
                        <p class="text-gray-500 text-xs mt-1.5 leading-relaxed">
                            לחץ <kbd class="px-1.5 py-0.5 rounded bg-white/10 border border-white/15 text-gray-300 text-[10px]">Enter</kbd>
                            להוספת תג חדש — כל תג יופיע בחלון נפרד.<br />
                            דוגמאות: <span class="text-amber-300">#בגדי תינוקות</span> · <span class="text-amber-300">#אוכל לנזקקים</span> · <span class="text-amber-300">#כלי בית</span>
                        </p>
                        <input type="hidden" name="tags_json" value={JSON.stringify(tags)} />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="city" class="text-white text-sm font-bold mb-1 block">עיר *</label>
                        <select id="city" name="city" bind:value={city} required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" style="color-scheme: dark;">
                            {#each Object.keys(citiesAndNeighborhoods) as c}
                                <option value={c}>{c}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label for="neighborhood" class="text-white text-sm font-bold mb-1 block">שכונה *</label>
                        <select id="neighborhood" name="neighborhood" bind:value={neighborhood} required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" style="color-scheme: dark;">
                            {#each neighborhoodsForCity as n}
                                <option value={n}>{n}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="address" class="text-white text-sm font-bold mb-1 block">כתובת מדויקת *</label>
                        <input id="address" name="address" bind:value={address} required placeholder="רחוב ומספר" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                    </div>
                    <div>
                        <label for="hours" class="text-white text-sm font-bold mb-1 block">שעות פעילות</label>
                        <input id="hours" name="hours" bind:value={hours} placeholder="לדוגמה: 9:00-21:00" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="contact" class="text-white text-sm font-bold mb-1 block">שם איש קשר</label>
                        <input id="contact" name="contact" bind:value={contact} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                    </div>
                    <div>
                        <label for="phone" class="text-white text-sm font-bold mb-1 block">טלפון *</label>
                        <input id="phone" name="phone" bind:value={phone} type="tel" required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" />
                    </div>
                </div>

                {#if clientError}
                    <p class="text-red-400 text-sm text-center">{clientError}</p>
                {/if}
                {#if form?.error}
                    <p class="text-red-400 text-sm text-center">{form.error}</p>
                {/if}

                <button type="submit" class="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                    {data.userId ? 'פרסם גמ"ח' : 'המשך להרשמה ופרסום'}
                </button>

                <p class="text-gray-500 text-xs text-center pt-2 border-t border-white/5">
                    🌐 הגמ"ח יופיע באתר הקהילה <strong class="text-gray-400">וגם</strong> באתר הגמ"ח הארצי
                </p>
            </form>
        {/if}

        <div class="text-center mt-6">
            <a href="https://national-gemach.vercel.app" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-white transition-colors text-sm">← לכל הגמ"חים באתר הארצי ↗</a>
        </div>
    </div>
</div>

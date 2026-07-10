<script lang="ts">
    // עורך "פרטי היתרון" בדף הפריט (מצב בנייה) - השדות שהוסרו מטופס ההוספה
    // (שעות פתיחה, מחיר, כשרות, שירותים וכו') נערכים כאן ונשמרים ב-extra_fields.
    import { _ } from 'svelte-i18n';
    import { categoryConfig, detailStepFields, cfFieldKey, cfOptKey, trOr, type FieldDef } from '$lib/categoryFields';
    import OpeningHoursEditor from './OpeningHoursEditor.svelte';
    import { openCropper } from '$lib/imageCropper.svelte';

    let {
        itemId,
        category,
        extraFields = {},
        onSaved,
    }: {
        itemId: string;
        category: string;
        extraFields?: Record<string, unknown>;
        /** נקרא אחרי שמירה מוצלחת - כדי לעדכן את התצוגה בדף מיד */
        onSaved?: (key: string, value: unknown) => void;
    } = $props();

    // שדות שכבר נערכים במקום אחר בדף הפריט (כותרת/תיאור/טלפון/תמונות/קישורים/שירותים)
    const HANDLED_ELSEWHERE = new Set([
        'label', 'description', 'phone', 'contact', 'images', 'address', 'location',
        'type', 'activities', 'links', 'website', 'facebook', 'instagram', 'youtube', 'tiktok',
    ]);

    const cfg = categoryConfig[category];
    const fields: FieldDef[] = cfg
        ? detailStepFields(cfg).filter(f => !HANDLED_ELSEWHERE.has(f.key) && f.type !== 'map_pin')
        : [];

    // ערכים נוכחיים (מחרוזת לכל שדה; images = מערך)
    function initVal(f: FieldDef): string {
        const raw = extraFields?.[f.key];
        if (raw == null) return '';
        if (Array.isArray(raw)) return '';
        return typeof raw === 'string' ? raw : String(raw);
    }
    let values = $state<Record<string, string>>(
        Object.fromEntries(fields.map(f => [f.key, initVal(f)]))
    );
    let imageValues = $state<Record<string, string[]>>(
        Object.fromEntries(
            fields.filter(f => f.type === 'images').map(f => {
                const raw = extraFields?.[f.key];
                return [f.key, Array.isArray(raw) ? (raw as unknown[]).filter((s): s is string => typeof s === 'string') : []];
            })
        )
    );

    let savingKey = $state<string | null>(null);
    let savedKey = $state<string | null>(null);
    let errorKey = $state<string | null>(null);

    function isVisible(f: FieldDef): boolean {
        if (!f.showIf) return true;
        return values[f.showIf.field] === f.showIf.equals;
    }

    async function saveField(key: string, value: unknown) {
        savingKey = key;
        savedKey = null;
        errorKey = null;
        try {
            const res = await fetch(`/api/items/${itemId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_fields', fields: { [key]: value } }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.success) { errorKey = key; return; }
            savedKey = key;
            onSaved?.(key, value);
        } catch {
            errorKey = key;
        } finally {
            savingKey = null;
        }
    }

    // ---- שינוי ערך טקסטואלי ----
    function onText(f: FieldDef, v: string) {
        values[f.key] = v;
    }
    function commitText(f: FieldDef) {
        saveField(f.key, values[f.key]);
    }
    // ---- toggle / select ----
    function pick(f: FieldDef, opt: string) {
        values[f.key] = opt;
        saveField(f.key, opt);
    }
    // ---- multi_select (מחרוזת מופרדת בפסיקים) ----
    function toggleMulti(f: FieldDef, opt: string) {
        const cur = (values[f.key] || '').split(',').filter(Boolean);
        const i = cur.indexOf(opt);
        if (i >= 0) cur.splice(i, 1); else cur.push(opt);
        const joined = cur.join(',');
        values[f.key] = joined;
        saveField(f.key, joined);
    }
    function isOn(f: FieldDef, opt: string) {
        return (values[f.key] || '').split(',').filter(Boolean).includes(opt);
    }
    // ---- opening_hours ----
    function onHours(f: FieldDef, v: string) {
        values[f.key] = v;
        saveField(f.key, v);
    }
    // ---- images (למשל תמונות תפריט) ----
    const MAX_IMAGES = 5;
    function compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 1000;
                    let { width: w, height: h } = img;
                    if (w > MAX || h > MAX) { const s = Math.min(MAX / w, MAX / h); w = Math.round(w * s); h = Math.round(h * s); }
                    const canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = reject;
                img.src = reader.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    async function addImages(f: FieldDef, e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const files = Array.from(input.files ?? []).filter(fl => fl.type.startsWith('image/'));
        input.value = '';
        if (!files.length) return;
        const cur = [...(imageValues[f.key] ?? [])];
        const slots = MAX_IMAGES - cur.length;
        if (slots <= 0) return;
        savingKey = f.key;
        try {
            const added = await Promise.all(files.slice(0, slots).map(compressImage));
            const next = [...cur, ...added];
            imageValues[f.key] = next;
            await saveField(f.key, next);
        } catch { errorKey = f.key; } finally { savingKey = null; }
    }
    function removeImage(f: FieldDef, idx: number) {
        const next = (imageValues[f.key] ?? []).filter((_, i) => i !== idx);
        imageValues[f.key] = next;
        saveField(f.key, next);
    }
    async function repositionImage(f: FieldDef, idx: number) {
        const arr = imageValues[f.key] ?? [];
        if (idx < 0 || idx >= arr.length) return;
        const cropped = await openCropper(arr[idx], {
            shape: 'rect',
            aspect: 1,
            title: 'מיקום התמונה',
            hint: 'גררו למיקום הרצוי · הזיזו את המחוון להגדלה',
        });
        if (!cropped) return;
        const next = arr.map((s, i) => (i === idx ? cropped : s));
        imageValues[f.key] = next;
        await saveField(f.key, next);
    }

    const inputCls = 'w-full bg-[#0a0f1a] border border-white/15 rounded-lg text-white text-sm px-2.5 py-1.5 focus:border-amber-500/60 outline-none';
</script>

{#if fields.length > 0}
    <section class="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-3" dir="rtl">
        <h2 class="text-base font-bold text-white flex items-center gap-1.5">
            <span class="w-1 h-4 bg-amber-400 rounded-full"></span>📋 פרטי היתרון
        </h2>
        <p class="text-xs text-gray-400 -mt-1.5">כל שינוי נשמר אוטומטית ומופיע בדף לגולשים.</p>

        {#each fields as f (f.key)}
            {#if isVisible(f)}
                <div>
                    <label for="det-{f.key}" class="block text-[13px] font-bold text-gray-300 mb-1">{trOr($_, cfFieldKey(category, f), f.label)}</label>

                    {#if f.type === 'toggle' && f.options}
                        <div class="flex flex-wrap gap-1.5">
                            {#each f.options as opt}
                                <button type="button" onclick={() => pick(f, opt)}
                                    class="px-3 py-1.5 rounded-full text-xs font-bold border transition-all {values[f.key] === opt
                                        ? 'bg-amber-500 text-white border-transparent'
                                        : 'bg-white/5 text-gray-300 border-white/15 hover:bg-white/10'}">{trOr($_, cfOptKey(category, f, opt), opt)}</button>
                            {/each}
                        </div>

                    {:else if f.type === 'select' && f.options}
                        <select id="det-{f.key}" bind:value={values[f.key]} onchange={() => commitText(f)} class="{inputCls} cursor-pointer">
                            <option value="" style="background:#fff;color:#0f172a;">— בחרו —</option>
                            {#each f.options as opt}
                                <option value={opt} style="background:#fff;color:#0f172a;">{trOr($_, cfOptKey(category, f, opt), opt)}</option>
                            {/each}
                        </select>

                    {:else if f.type === 'multi_select' && f.options}
                        <div class="flex flex-wrap gap-1.5">
                            {#each f.options as opt}
                                <button type="button" onclick={() => toggleMulti(f, opt)}
                                    class="px-3 py-1.5 rounded-full text-xs font-bold border transition-all {isOn(f, opt)
                                        ? 'bg-amber-500 text-white border-transparent'
                                        : 'bg-white/5 text-gray-300 border-white/15 hover:bg-white/10'}">{isOn(f, opt) ? '✓ ' : ''}{trOr($_, cfOptKey(category, f, opt), opt)}</button>
                            {/each}
                        </div>

                    {:else if f.type === 'textarea'}
                        <textarea id="det-{f.key}" rows="3" maxlength={f.maxLength ?? 3000}
                            value={values[f.key]}
                            oninput={(e) => onText(f, (e.currentTarget as HTMLTextAreaElement).value)}
                            onblur={() => commitText(f)}
                            placeholder={trOr($_, cfFieldKey(category, f, 'ph'), f.placeholder ?? '')} class="{inputCls} resize-none"></textarea>

                    {:else if f.type === 'opening_hours'}
                        <OpeningHoursEditor value={values[f.key]} onchange={(v) => onHours(f, v)} />

                    {:else if f.type === 'images'}
                        <div class="flex flex-wrap gap-2">
                            {#each imageValues[f.key] ?? [] as src, idx}
                                <div class="relative w-16 h-16 rounded-lg overflow-hidden border border-white/15">
                                    <img src={src} alt="" class="w-full h-full object-cover" />
                                    <button type="button" onclick={() => removeImage(f, idx)} aria-label="הסר"
                                        class="absolute top-0.5 left-0.5 bg-black/70 hover:bg-black/90 text-red-300 text-xs w-5 h-5 rounded-full leading-none">×</button>
                                    <button type="button" onclick={() => repositionImage(f, idx)} aria-label="מקם / חתוך" title="מקם / חתוך"
                                        class="absolute bottom-0.5 right-0.5 bg-black/70 hover:bg-purple-600 text-white text-[10px] w-5 h-5 rounded-full leading-none flex items-center justify-center">🎯</button>
                                </div>
                            {/each}
                            {#if (imageValues[f.key] ?? []).length < MAX_IMAGES}
                                <label class="w-16 h-16 rounded-lg border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 flex items-center justify-center cursor-pointer text-2xl text-gray-400">
                                    ＋
                                    <input type="file" accept="image/*" multiple class="hidden" onchange={(e) => addImages(f, e)} />
                                </label>
                            {/if}
                        </div>

                    {:else}
                        <input id="det-{f.key}" type={f.type === 'number' ? 'number' : f.type === 'time' ? 'time' : f.type === 'date' ? 'date' : 'text'}
                            value={values[f.key]}
                            oninput={(e) => onText(f, (e.currentTarget as HTMLInputElement).value)}
                            onblur={() => commitText(f)}
                            placeholder={trOr($_, cfFieldKey(category, f, 'ph'), f.placeholder ?? '')} class="{inputCls}"
                            dir={f.type === 'number' || f.type === 'email' ? 'ltr' : 'rtl'} />
                    {/if}

                    {#if f.hint}
                        <p class="text-gray-500 text-xs mt-0.5">{trOr($_, cfFieldKey(category, f, 'hint'), f.hint)}</p>
                    {/if}
                    {#if savingKey === f.key}
                        <p class="text-amber-300 text-xs mt-0.5">שומר...</p>
                    {:else if savedKey === f.key}
                        <p class="text-green-400 text-xs mt-0.5">✓ נשמר</p>
                    {:else if errorKey === f.key}
                        <p class="text-red-400 text-xs mt-0.5">שגיאה בשמירה - נסו שוב</p>
                    {/if}
                </div>
            {/if}
        {/each}
    </section>
{/if}

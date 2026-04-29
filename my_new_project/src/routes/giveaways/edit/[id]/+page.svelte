<script lang="ts">
    import type { ActionData, PageData } from './$types';

    let { data, form }: { data: PageData; form: ActionData } = $props();

    let images = $state<string[]>([]);
    const MAX_IMAGES = 5;

    function compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const MAX = 1000;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const src = ev.target?.result as string;
                const img = new Image();
                img.onload = () => {
                    let w = img.naturalWidth;
                    let h = img.naturalHeight;
                    if (w > MAX || h > MAX) {
                        const ratio = Math.min(MAX / w, MAX / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width  = w;
                    canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = reject;
                img.src = src;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async function handleImagesChange(e: Event) {
        const files = Array.from((e.target as HTMLInputElement).files ?? []);
        const slots = MAX_IMAGES - images.length;
        const toAdd = files.slice(0, slots);
        const compressed = await Promise.all(toAdd.map(compressImage));
        images = [...images, ...compressed];
        (e.target as HTMLInputElement).value = '';
    }

    function removeImage(index: number) {
        images = images.filter((_, i) => i !== index);
    }
</script>

<svelte:head>
    <title>השלמת פרסום — {data.item.label} | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] pt-6 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-6">
            <span class="text-5xl mb-3 block">📷</span>
            <h1 class="text-3xl font-black text-white mb-2">השלמת פרסום הטיוטה</h1>
            <p class="text-gray-400">צרף תמונה של "{data.item.label}" כדי שהמודעה תעלה לאוויר</p>
        </div>

        <div class="rounded-2xl bg-[#0f172a] border border-white/10 p-5 mb-4">
            <div class="flex items-start gap-3 mb-3">
                <span class="text-3xl flex-shrink-0">{data.item.icon || '📦'}</span>
                <div class="flex-1 min-w-0">
                    <h2 class="text-white font-bold text-lg">{data.item.label}</h2>
                    {#if data.item.description}
                        <p class="text-gray-400 text-sm line-clamp-3 mt-1">{data.item.description}</p>
                    {/if}
                </div>
                <span class="px-2 py-1 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 flex-shrink-0">
                    טיוטה
                </span>
            </div>
            <div class="flex flex-wrap gap-3 text-xs text-gray-500">
                {#if data.item.neighborhood}
                    <span>📍 {data.item.neighborhood}{data.item.city ? `, ${data.item.city}` : ''}</span>
                {/if}
                {#if data.item.contact}
                    <span>👤 {data.item.contact}</span>
                {/if}
            </div>
        </div>

        <form method="POST" class="rounded-2xl bg-[#0f172a] border border-white/10 p-6 space-y-5">
            <div>
                <div class="flex items-center justify-between mb-2">
                    <span class="text-white text-sm font-bold">תמונות (עד {MAX_IMAGES}) *</span>
                    <span class="text-gray-500 text-xs">{images.length}/{MAX_IMAGES}</span>
                </div>
                {#if images.length > 0}
                    <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mb-2">
                        {#each images as src, i (i)}
                            <div class="relative aspect-square rounded-xl overflow-hidden border border-white/10">
                                <img src={src} alt="" class="w-full h-full object-cover" />
                                {#if i === 0}
                                    <span class="absolute bottom-1 start-1 px-1.5 py-0.5 rounded bg-orange-500 text-white text-[9px] font-black shadow">ראשית</span>
                                {/if}
                                <button
                                    type="button"
                                    onclick={() => removeImage(i)}
                                    class="absolute top-1 left-1 bg-black/70 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                    aria-label="הסר תמונה"
                                >×</button>
                            </div>
                        {/each}
                        {#if images.length < MAX_IMAGES}
                            <label class="flex flex-col items-center justify-center gap-1 aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-orange-500/50 bg-white/3 hover:bg-orange-900/10 cursor-pointer transition-all">
                                <span class="text-2xl">＋</span>
                                <span class="text-gray-500 text-[10px]">עוד</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange={handleImagesChange} />
                            </label>
                        {/if}
                    </div>
                {:else}
                    <label class="flex flex-col items-center justify-center gap-2 w-full h-40 rounded-xl border-2 border-dashed border-yellow-500/40 hover:border-yellow-500/70 bg-yellow-900/10 hover:bg-yellow-900/20 cursor-pointer transition-all">
                        <span class="text-4xl">📷</span>
                        <span class="text-yellow-200 text-sm font-bold">לחץ להעלאת תמונות</span>
                        <span class="text-gray-500 text-xs">JPG, PNG · עד {MAX_IMAGES} תמונות</span>
                        <input type="file" accept="image/*" multiple class="hidden" onchange={handleImagesChange} />
                    </label>
                {/if}
                <input type="hidden" name="images_json" value={JSON.stringify(images)} />
            </div>

            {#if form?.error}
                <p class="text-red-400 text-sm text-center bg-red-900/20 border border-red-500/30 rounded-lg py-2">{form.error}</p>
            {/if}

            <button
                type="submit"
                disabled={images.length === 0}
                class="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black py-3.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
                🚀 פרסם עכשיו
            </button>

            <p class="text-gray-500 text-xs text-center">
                לאחר הוספת התמונה, המודעה תעלה לאוויר בקהילה
            </p>
        </form>

        <div class="text-center mt-6">
            <a href="/giveaways/my?tab=drafts" class="text-gray-500 hover:text-white transition-colors text-sm">← חזרה לטיוטות</a>
        </div>
    </div>
</div>

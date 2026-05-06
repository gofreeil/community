<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";

    let { data } = $props<{
        data: {
            layoutUser?: { email?: string | null; phone?: string | null; nickname?: string | null } | null;
            isSuperAdmin?: boolean;
        };
    }>();

    // ===== Persistence — same key as the main builder so state shares freely =====
    const LS_KEY = "ad_builder_draft_v1";
    const PAID_KEY = "ad_paid";

    // ===== Access gate (same logic as the main builder) =====
    let accessGranted = $state(false);
    let accessChecked = $state(false);
    let isSuperAdmin = $derived(Boolean(data?.isSuperAdmin));

    // ===== Form state — landing editor fields =====
    let landingHeadline   = $state<string>("");
    let landingPitch      = $state<string>("");
    let landingExtended   = $state<string>("");
    let landingImage      = $state<string>("");
    let landingAdvantages = $state<[string, string, string]>(["", "", ""]);
    let phone             = $state<string>(data?.layoutUser?.phone ?? "");
    let whatsapp          = $state<string>(data?.layoutUser?.phone ?? "");
    let website           = $state<string>("");
    let email             = $state<string>(data?.layoutUser?.email ?? "");

    // ===== Read-only fields used in the preview (filled in earlier steps) =====
    let title       = $state<string>("");
    let subtitle    = $state<string>("");
    let mainImage   = $state<string>("");
    let logo        = $state<string>("");
    let logoShape   = $state<"square" | "circle">("square");
    let gradient    = $state<string>("from-amber-500 to-orange-600");
    let address     = $state<string>("");
    let hours       = $state<string>("");
    let uniqueness  = $state<string>("");
    type ProductRow = { id: number; name: string; price: string; image: string; description: string };
    let products    = $state<ProductRow[]>([]);

    // ===== Drag state =====
    let isDraggingLandingImage = $state(false);

    // ===== Image helpers =====
    async function fileToDataUrl(file: File): Promise<string> {
        return new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.onerror = rej;
            fr.readAsDataURL(file);
        });
    }
    function approxDataUrlBytes(dataUrl: string): number {
        const i = dataUrl.indexOf(",");
        const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
        return Math.ceil(b64.length * 3 / 4);
    }
    async function compressImageToFit(file: File, maxBytes: number): Promise<{ dataUrl: string; wasCompressed: boolean; originalMB: number; finalMB: number }> {
        const originalMB = file.size / (1024 * 1024);
        if (file.size <= maxBytes) {
            const dataUrl = await fileToDataUrl(file);
            return { dataUrl, wasCompressed: false, originalMB, finalMB: originalMB };
        }
        const srcUrl = await fileToDataUrl(file);
        const img = new Image();
        img.src = srcUrl;
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(new Error("image load failed")); });
        let w = img.naturalWidth, h = img.naturalHeight;
        const MAX_EDGE = 2400;
        const longest = Math.max(w, h);
        if (longest > MAX_EDGE) {
            const scale = MAX_EDGE / longest;
            w = Math.round(w * scale);
            h = Math.round(h * scale);
        }
        let quality = 0.85;
        let dataUrl = "";
        for (let attempt = 0; attempt < 10; attempt++) {
            const canvas = document.createElement("canvas");
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            dataUrl = canvas.toDataURL("image/jpeg", quality);
            if (approxDataUrlBytes(dataUrl) <= maxBytes) break;
            if (quality > 0.5) {
                quality -= 0.1;
            } else {
                w = Math.round(w * 0.85);
                h = Math.round(h * 0.85);
                quality = 0.7;
            }
        }
        return { dataUrl, wasCompressed: true, originalMB, finalMB: approxDataUrlBytes(dataUrl) / (1024 * 1024) };
    }

    let compressNotice = $state<{ visible: boolean; originalMB: number; finalMB: number }>({ visible: false, originalMB: 0, finalMB: 0 });
    let compressNoticeTimer: number | null = null;
    function showCompressNotice(originalMB: number, finalMB: number) {
        if (compressNoticeTimer) { clearTimeout(compressNoticeTimer); compressNoticeTimer = null; }
        compressNotice = { visible: true, originalMB, finalMB };
        compressNoticeTimer = window.setTimeout(() => {
            compressNotice = { ...compressNotice, visible: false };
            compressNoticeTimer = null;
        }, 9000);
    }
    function dismissCompressNotice() {
        if (compressNoticeTimer) { clearTimeout(compressNoticeTimer); compressNoticeTimer = null; }
        compressNotice = { ...compressNotice, visible: false };
    }

    async function processLandingImage(file: File | null | undefined) {
        if (!file) return;
        if (!file.type.startsWith("image/")) { alert("נא להעלות קובץ תמונה"); return; }
        const MAX_BYTES = 5 * 1024 * 1024;
        const { dataUrl, wasCompressed, originalMB, finalMB } = await compressImageToFit(file, MAX_BYTES);
        if (wasCompressed) showCompressNotice(originalMB, finalMB);
        landingImage = dataUrl;
    }
    async function handleImage(e: Event) {
        const f = (e.target as HTMLInputElement).files?.[0];
        await processLandingImage(f);
    }
    function clearLandingImage() { landingImage = ""; }
    function dragOver(e: DragEvent) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault(); e.stopPropagation();
        isDraggingLandingImage = true;
    }
    function dragLeave(e: DragEvent) {
        e.preventDefault(); e.stopPropagation();
        isDraggingLandingImage = false;
    }
    async function handleDrop(e: DragEvent) {
        e.preventDefault(); e.stopPropagation();
        isDraggingLandingImage = false;
        const f = e.dataTransfer?.files?.[0];
        await processLandingImage(f);
    }

    // ===== Load draft from localStorage on mount =====
    function checkAccess() {
        if (!browser) return;
        const paid = localStorage.getItem(PAID_KEY) === "1";
        accessGranted = isSuperAdmin || paid;
        accessChecked = true;
    }

    onMount(() => {
        if (!browser) return;
        checkAccess();

        // Block dropped files outside upload zones
        const blockOutsideDrop = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
        };
        window.addEventListener("dragover", blockOutsideDrop);
        window.addEventListener("drop", blockOutsideDrop);

        if (!accessGranted) {
            return () => {
                window.removeEventListener("dragover", blockOutsideDrop);
                window.removeEventListener("drop", blockOutsideDrop);
            };
        }

        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                landingHeadline   = d.landingHeadline ?? "";
                landingPitch      = d.landingPitch ?? "";
                landingExtended   = d.landingExtended ?? "";
                landingImage      = d.landingImage ?? "";
                if (Array.isArray(d.landingAdvantages)) {
                    landingAdvantages = [
                        d.landingAdvantages[0] ?? "",
                        d.landingAdvantages[1] ?? "",
                        d.landingAdvantages[2] ?? "",
                    ];
                }
                phone     = d.phone ?? phone;
                whatsapp  = d.whatsapp ?? whatsapp;
                website   = d.website ?? "";
                email     = d.email ?? email;
                title     = d.title ?? "";
                subtitle  = d.subtitle ?? "";
                mainImage = d.mainImage ?? "";
                logo      = d.logo ?? "";
                logoShape = d.logoShape ?? "square";
                gradient  = d.gradient ?? gradient;
                address   = d.address ?? "";
                hours     = d.hours ?? "";
                uniqueness = d.uniqueness ?? "";
                products  = Array.isArray(d.products) ? d.products : [];
            }
        } catch {}

        return () => {
            window.removeEventListener("dragover", blockOutsideDrop);
            window.removeEventListener("drop", blockOutsideDrop);
        };
    });

    // ===== Persist landing fields back to the same draft =====
    $effect(() => {
        if (!browser) return;
        // Read current snapshot, merge our fields, write back
        try {
            const raw = localStorage.getItem(LS_KEY);
            const cur = raw ? JSON.parse(raw) : {};
            const merged = {
                ...cur,
                landingHeadline, landingPitch, landingExtended, landingImage, landingAdvantages,
                phone, whatsapp, website, email,
            };
            localStorage.setItem(LS_KEY, JSON.stringify(merged));
        } catch {}
    });

    function goBack() { goto("/about/advertise/builder"); }
</script>

<svelte:head>
    <title>עריכת דף נחיתה — בונה הפרסומות</title>
</svelte:head>

<div class="ad-builder max-w-5xl mx-auto px-4 py-8 md:py-12" dir="rtl">

    {#if accessChecked && !accessGranted}
        <div class="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
            <h1 class="text-xl font-black text-amber-300 mb-2">דרושה גישה לבונה הפרסומות</h1>
            <p class="text-sm text-gray-300 mb-4">חזור לדף הראשי של הבונה כדי להמשיך.</p>
            <button type="button" onclick={goBack}
                    class="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold">
                חזרה לבונה
            </button>
        </div>
    {:else if accessGranted}

        {#if compressNotice.visible}
            <div class="compress-toast" role="status" aria-live="polite">
                <button type="button" class="compress-toast-close" onclick={dismissCompressNotice} aria-label="סגור">✕</button>
                <p class="text-sm text-amber-100 font-bold m-0">
                    🗜️ התמונה דחוסה אוטומטית: {compressNotice.originalMB.toFixed(1)}MB → {compressNotice.finalMB.toFixed(1)}MB
                </p>
            </div>
        {/if}

        <!-- ===== Page header ===== -->
        <header class="text-center mb-8">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
                <span class="text-amber-300 text-xs font-bold tracking-wider">שלב 8 — דף הנחיתה</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-black text-white mb-3">עכשיו בואו נעצב את דף הנחיתה</h1>
            <p class="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                לאן הגולש מגיע אחרי הקלקה על הפרסומת? כאן תעצב את הדף הפנימי שיציג לו את העסק/השירות שלך
                במלואו — כותרת, תיאור, יתרונות, ותמונה גדולה.
            </p>
        </header>

        <!-- ===== Step card — landing editor ===== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">8</span>
                <h2>דף נחיתה — לאן המשתמש יגיע?</h2>
            </div>
            <p class="step-help">בחר אופציה אחת או יותר — אם יש לך אתר, נשלח את הגולש אליו. אם לא — נשתמש בדף הנחיתה הפנימי שלנו.</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="field-label">📞 טלפון לקבלת פניות</label>
                    <input type="tel" bind:value={phone} placeholder="050-1234567" class="text-input" />
                </div>
                <div>
                    <label class="field-label">💬 וואטסאפ</label>
                    <input type="tel" bind:value={whatsapp} placeholder="050-1234567" class="text-input" />
                </div>
                <div>
                    <label class="field-label">🌐 אתר אינטרנט (אופציונלי)</label>
                    <input type="url" bind:value={website} placeholder="https://my-site.co.il" class="text-input" />
                </div>
                <div>
                    <label class="field-label">✉️ אימייל</label>
                    <input type="email" bind:value={email} placeholder="me@example.com" class="text-input" />
                </div>

                <div class="md:col-span-2">
                    <label class="field-label">כותרת לדף הנחיתה (אופציונלי — אחרת נשתמש בכותרת הראשית)</label>
                    <input type="text" bind:value={landingHeadline} placeholder="ברוכים הבאים ל..." class="text-input" />
                </div>
                <div class="md:col-span-2">
                    <label class="field-label">פסקת פתיחה לדף הנחיתה (אופציונלי)</label>
                    <textarea bind:value={landingPitch} rows="3" placeholder="תיאור קצר על מה שאתם מציעים, למי זה מתאים, ומה הופך אתכם למיוחדים." class="text-input"></textarea>
                </div>
                <div class="md:col-span-2">
                    <label class="field-label">תוכן מורחב לדף הנחיתה (אופציונלי)</label>
                    <p class="text-xs text-gray-400 mb-1.5 leading-relaxed">
                        מקום להרחיב — סיפור העסק/השירות, פירוט מה אתם מציעים ולמי, ערכים, ניסיון, ומה מבדיל אתכם.
                        אפשר לכתוב כמה פסקאות (ירידות שורה יישמרו). הטקסט יוצג כסעיף נפרד בדף הנחיתה, מתחת לכותרת הראשית.
                    </p>
                    <textarea bind:value={landingExtended} rows="8"
                              placeholder="לדוגמה: אנחנו פועלים בשכונה כבר 12 שנה ומלווים מאות משפחות בכל גיל. הסטנדרטים שלנו...&#10;&#10;מה שמייחד אותנו: ..."
                              class="text-input"></textarea>
                </div>

                <div class="md:col-span-2">
                    <label class="field-label">🖼️ תמונה לדף הנחיתה (אופציונלי — אחרת נשתמש בתמונת הפרסומת)</label>
                    <p class="text-xs text-gray-400 mb-2 leading-relaxed">
                        אפשר להעלות תמונה אחרת ספציפית לדף הנחיתה — בדרך כלל תמונה רחבה ואיכותית יותר מזו שבפרסומת הקטנה.
                    </p>
                    <label class="upload-zone-sm"
                           class:has-image={!!landingImage}
                           class:dragging={isDraggingLandingImage}
                           ondragover={dragOver}
                           ondragleave={dragLeave}
                           ondrop={handleDrop}>
                        {#if landingImage}
                            <img src={landingImage} alt="תמונה לדף נחיתה" />
                            <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearLandingImage(); }} aria-label="הסר תמונה">✕</button>
                        {:else}
                            <div class="text-center">
                                <div class="text-2xl mb-1">{isDraggingLandingImage ? "✨" : "🖼️"}</div>
                                <p class="text-xs font-bold text-gray-300">{isDraggingLandingImage ? "שחרר" : "העלה תמונה"}</p>
                            </div>
                        {/if}
                        <input type="file" accept="image/*" onchange={handleImage} class="hidden" />
                    </label>
                </div>

                <div class="md:col-span-2">
                    <label class="field-label">✓ שלושה יתרונות של המוצר/השירות שלך (אופציונלי)</label>
                    <p class="text-xs text-gray-400 mb-2 leading-relaxed">
                        כתוב <strong class="text-amber-300">שלושה יתרונות קצרים וברורים</strong> שגורמים לבחור בך — כל יתרון בשורה משלו.
                        הם יוצגו בדף הנחיתה כרשימה מעוצבת עם סימני וי (✓) על רקע צבע הפרסומת.
                    </p>
                    <div class="space-y-2">
                        <input type="text" bind:value={landingAdvantages[0]} maxlength="80"
                               placeholder="יתרון 1 — לדוגמה: איכות חומרי גלם פרימיום בלעדית"
                               class="text-input" />
                        <input type="text" bind:value={landingAdvantages[1]} maxlength="80"
                               placeholder="יתרון 2 — לדוגמה: שירות אישי 7 ימים בשבוע"
                               class="text-input" />
                        <input type="text" bind:value={landingAdvantages[2]} maxlength="80"
                               placeholder="יתרון 3 — לדוגמה: אחריות מלאה לשנה"
                               class="text-input" />
                    </div>
                </div>
            </div>

            <!-- ===== Live preview ===== -->
            <div class="mt-8 pt-6 border-t border-white/10">
                <div class="flex items-center gap-2 mb-4">
                    <span class="text-2xl">👁️</span>
                    <h3 class="text-lg font-bold text-amber-300">תצוגה מקדימה של דף הנחיתה</h3>
                </div>
                <p class="step-help">כך ייראה דף הנחיתה שעיצבת — אליו הגולש יגיע בלחיצה על הפרסומת.</p>
                <div class="preview-frame landing">
                    <div class="landing-mock">
                        <header class="landing-hero bg-gradient-to-br {gradient}">
                            {#if landingImage || mainImage}
                                <img src={landingImage || mainImage} alt={title} class="landing-hero-bg" />
                            {/if}
                            <div class="landing-hero-overlay"></div>
                            {#if logo}
                                <img src={logo} alt="לוגו" class="landing-logo {logoShape === 'circle' ? 'landing-logo-circle' : ''}" />
                            {/if}
                            <div class="landing-hero-content">
                                <h1>{landingHeadline || title || "כותרת מרכזית"}</h1>
                                <p>{landingPitch || subtitle || "תיאור קצר ומושך"}</p>
                                {#if phone}
                                    <a href="tel:{phone}" class="landing-cta">📞 {phone}</a>
                                {:else if website}
                                    <a href={website} class="landing-cta">🌐 לאתר המלא</a>
                                {:else}
                                    <span class="landing-cta opacity-60">השלם פרטי קשר →</span>
                                {/if}
                            </div>
                        </header>

                        {#if landingAdvantages.some(a => a.trim())}
                            <section class="landing-section landing-advantages">
                                <h2>3 סיבות לבחור בנו</h2>
                                <ul class="advantages-list">
                                    {#each landingAdvantages as adv, i}
                                        {#if adv.trim()}
                                            <li class="advantage-item">
                                                <span class="advantage-check bg-gradient-to-br {gradient}" aria-hidden="true">✓</span>
                                                <span class="advantage-text">{adv}</span>
                                            </li>
                                        {/if}
                                    {/each}
                                </ul>
                            </section>
                        {/if}

                        {#if landingExtended}
                            <section class="landing-section">
                                <h2>הסיפור שלנו</h2>
                                <p style="white-space: pre-line">{landingExtended}</p>
                            </section>
                        {/if}

                        {#if uniqueness}
                            <section class="landing-section">
                                <h2>למה דווקא אנחנו</h2>
                                <p style="white-space: pre-line">{uniqueness}</p>
                            </section>
                        {/if}

                        {#if products.length > 0}
                            <section class="landing-section">
                                <h2>המוצרים / השירותים שלנו</h2>
                                <div class="products-grid">
                                    {#each products as p}
                                        <div class="product-card">
                                            {#if p.image}
                                                <img src={p.image} alt={p.name} />
                                            {:else}
                                                <div class="img-placeholder small">תמונה</div>
                                            {/if}
                                            <div class="product-info">
                                                <p class="product-name">{p.name || "שם מוצר"}</p>
                                                {#if p.description}<p class="product-desc">{p.description}</p>{/if}
                                                {#if p.price}<p class="product-price">₪{p.price}</p>{/if}
                                            </div>
                                        </div>
                                    {/each}
                                </div>
                            </section>
                        {/if}

                        <section class="landing-section landing-contact">
                            <h2>צור קשר</h2>
                            <ul>
                                {#if phone}<li>📞 <a href="tel:{phone}">{phone}</a></li>{/if}
                                {#if whatsapp}<li>💬 <a href="https://wa.me/{whatsapp.replace(/\D/g,'')}">וואטסאפ {whatsapp}</a></li>{/if}
                                {#if email}<li>✉️ <a href="mailto:{email}">{email}</a></li>{/if}
                                {#if website}<li>🌐 <a href={website} target="_blank" rel="noopener">{website}</a></li>{/if}
                                {#if address}<li>📍 {address}</li>{/if}
                                {#if hours}<li>🕒 {hours}</li>{/if}
                            </ul>
                        </section>
                    </div>
                </div>
            </div>

            <div class="step-nav-row">
                <button type="button" class="step-nav-btn step-nav-btn-secondary" onclick={goBack}>
                    ↻ חזרה לבונה
                </button>
            </div>
        </section>
    {/if}
</div>

<style>
    /* All styles are :global — this page is rendered standalone, separate from /builder. */

    .ad-builder :global(*) { box-sizing: border-box; }

    /* ============== Compress notice toast ============== */
    :global(.compress-toast) {
        position: fixed;
        top: 5rem;
        left: 50%;
        transform: translateX(-50%);
        z-index: 60;
        width: calc(100% - 1.5rem);
        max-width: 32rem;
        padding: 0.875rem 2.5rem 0.875rem 1rem;
        border-radius: 1rem;
        border: 1px solid rgba(251, 191, 36, 0.55);
        background: linear-gradient(135deg, rgba(120, 53, 15, 0.92), rgba(146, 64, 14, 0.88));
        box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(251, 191, 36, 0.15) inset;
        backdrop-filter: blur(8px);
    }
    :global(.compress-toast-close) {
        position: absolute;
        top: 0.4rem; left: 0.5rem;
        width: 1.6rem; height: 1.6rem;
        border-radius: 9999px;
        background: rgba(0, 0, 0, 0.35);
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.75rem;
        line-height: 1;
        display: flex; align-items: center; justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.18);
        cursor: pointer;
    }
    :global(.compress-toast-close:hover) { background: rgba(220, 38, 38, 0.85); }

    /* ============== Step Card ============== */
    :global(.step-card) {
        background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.25rem;
        padding: 1.25rem 1.25rem 1.5rem;
        margin-bottom: 1.25rem;
        scroll-margin-top: 8rem;
        position: relative;
    }
    @media (min-width: 768px) {
        :global(.step-card) { padding: 1.75rem; margin-bottom: 1.75rem; }
    }

    :global(.step-head) {
        display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
        color: rgb(229,231,235); font-weight: 900; flex-wrap: wrap;
    }
    :global(.step-head h2) {
        font-size: 1.125rem; font-weight: 900; line-height: 1.3; margin: 0;
    }
    @media (min-width: 768px) {
        :global(.step-head h2) { font-size: 1.5rem; }
    }
    :global(.step-num) {
        width: 2rem; height: 2rem; border-radius: 9999px;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(circle, #fde047 0%, #f59e0b 60%, #d97706 100%);
        color: #000; font-weight: 900; font-size: 0.95rem;
        opacity: 0.85; flex-shrink: 0;
    }
    :global(.step-help) {
        color: rgb(156, 163, 175); font-size: 0.875rem; line-height: 1.55; margin: 0 0 1rem;
    }

    /* ============== Inputs ============== */
    :global(.text-input) {
        width: 100%; padding: 0.75rem 1rem; border-radius: 0.75rem;
        background: rgba(255,255,255,0.04); border: 2px solid rgba(255,255,255,0.08);
        color: white; font-size: 0.95rem; font-weight: 500; outline: none;
        transition: border-color 0.15s, background 0.15s;
        font-family: inherit;
    }
    :global(.text-input::placeholder) { color: rgb(107, 114, 128); }
    :global(.text-input:focus) {
        border-color: rgba(245, 158, 11, 0.6);
        background: rgba(255,255,255,0.06);
    }
    :global(.field-label) {
        display: block; color: rgb(209, 213, 219); font-weight: 700; font-size: 0.85rem;
        margin-bottom: 0.4rem;
    }

    /* ============== Upload zone ============== */
    :global(.upload-zone-sm) {
        position: relative; display: flex; align-items: center; justify-content: center;
        width: 100%; max-width: 360px;
        min-height: 160px;
        border: 2px dashed rgba(245, 158, 11, 0.4); border-radius: 0.85rem;
        background: rgba(245, 158, 11, 0.04); cursor: pointer; overflow: hidden;
    }
    :global(.upload-zone-sm.has-image) { border-style: solid; padding: 0; }
    :global(.upload-zone-sm img) { width: 100%; height: 100%; object-fit: cover; }
    :global(.upload-zone-sm.dragging) {
        border-color: rgb(34, 197, 94);
        background: rgba(34, 197, 94, 0.12);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
    }
    :global(.remove-x) {
        position: absolute; top: 0.4rem; left: 0.4rem; z-index: 5;
        width: 1.75rem; height: 1.75rem; border-radius: 9999px;
        background: rgba(0,0,0,0.65); color: white; border: 1px solid rgba(255,255,255,0.2);
        font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    :global(.remove-x:hover) { background: rgba(220,38,38,0.85); }

    /* ============== Bottom nav button ============== */
    :global(.step-nav-row) {
        margin-top: 1.5rem;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
    }
    :global(.step-nav-btn) {
        display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
        padding: 0.7rem 1.5rem;
        border-radius: 0.85rem;
        background: rgb(245, 158, 11);
        color: #000;
        font-size: 0.95rem; font-weight: 800; line-height: 1.1;
        border: 1px solid rgba(245, 158, 11, 0.85);
        cursor: pointer;
        transition: background 0.15s, transform 0.1s, box-shadow 0.15s;
        white-space: nowrap;
        font-family: inherit;
        box-shadow: 0 4px 14px -4px rgba(245, 158, 11, 0.5);
    }
    :global(.step-nav-btn:hover) { background: rgb(252, 191, 36); }
    :global(.step-nav-btn:active) { transform: scale(0.97); }
    :global(.step-nav-btn-secondary) {
        background: rgba(255,255,255,0.06);
        color: rgb(229,231,235);
        border-color: rgba(255,255,255,0.18);
        box-shadow: none;
    }
    :global(.step-nav-btn-secondary:hover) { background: rgba(255,255,255,0.12); }

    /* ============== Preview frame ============== */
    :global(.preview-frame) { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }

    /* ============== LANDING MOCK ============== */
    :global(.landing-mock) {
        width: 100%; max-width: 720px; background: #0f172a;
        border-radius: 0.85rem; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    :global(.landing-hero) {
        position: relative; padding: 1.6rem 1.4rem; text-align: center; min-height: 160px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        overflow: hidden;
    }
    :global(.landing-hero-bg) {
        position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
        opacity: 0.28;
    }
    :global(.landing-hero-overlay) {
        position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25));
    }
    :global(.landing-hero-content) { position: relative; z-index: 2; max-width: 480px; }
    :global(.landing-logo) {
        position: absolute;
        top: 0.7rem; right: 0.7rem;
        width: 42px; height: 42px;
        border-radius: 0.55rem;
        background: white;
        padding: 4px;
        object-fit: contain;
        z-index: 3;
        margin: 0;
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
    }
    :global(.landing-logo.landing-logo-circle) { border-radius: 9999px; }
    :global(.landing-hero h1) { color: white; font-size: 1.55rem; font-weight: 900; margin: 0 0 0.4rem; }
    :global(.landing-hero p)  { color: rgba(255,255,255,0.92); font-size: 0.95rem; margin: 0 0 1rem; line-height: 1.45; }

    /* ===== Advantages list ===== */
    :global(.advantages-list) {
        list-style: none; padding: 0; margin: 0;
        display: grid; gap: 0.65rem;
        max-width: 540px; margin-inline: auto;
    }
    :global(.advantage-item) {
        display: flex; align-items: center; gap: 0.85rem;
        padding: 0.7rem 0.95rem;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 0.85rem;
        transition: transform 200ms ease, border-color 200ms ease, background 200ms ease;
        text-align: right;
    }
    :global(.advantage-item:hover) {
        transform: translateX(-3px);
        border-color: rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.07);
    }
    :global(.advantage-check) {
        flex-shrink: 0;
        width: 32px; height: 32px;
        border-radius: 9999px;
        display: flex; align-items: center; justify-content: center;
        color: white;
        font-weight: 900;
        font-size: 1rem;
        line-height: 1;
        box-shadow: 0 4px 12px rgba(0,0,0,0.35);
    }
    :global(.advantage-text) {
        color: rgb(229,231,235);
        font-size: 0.92rem;
        line-height: 1.4;
        font-weight: 600;
    }
    :global(.landing-cta) {
        display: inline-block; padding: 0.75rem 1.5rem; border-radius: 9999px;
        background: white; color: black; font-weight: 800; font-size: 1rem;
        text-decoration: none; box-shadow: 0 8px 25px rgba(0,0,0,0.25);
    }
    :global(.landing-section) {
        padding: 1.25rem 1.5rem; border-top: 1px solid rgba(255,255,255,0.05);
    }
    :global(.landing-section h2) {
        color: white; font-size: 1.15rem; font-weight: 900; margin: 0 0 0.75rem; text-align: center;
    }
    :global(.landing-section p) { color: rgb(209,213,219); font-size: 0.9rem; line-height: 1.55; }
    :global(.products-grid) {
        display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 0.75rem;
    }
    :global(.product-card) {
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
        border-radius: 0.75rem; overflow: hidden; display: flex; flex-direction: column;
    }
    :global(.product-card img) { width: 100%; height: 100px; object-fit: cover; }
    :global(.product-info) { padding: 0.6rem; }
    :global(.product-name)  { color: white; font-weight: 700; font-size: 0.85rem; margin: 0 0 0.2rem; }
    :global(.product-desc)  { color: rgb(156,163,175); font-size: 0.72rem; margin: 0 0 0.3rem; line-height: 1.3; }
    :global(.product-price) { color: #fbbf24; font-weight: 900; font-size: 0.95rem; margin: 0; }
    :global(.landing-contact ul) { list-style: none; padding: 0; max-width: 360px; margin: 0 auto; }
    :global(.landing-contact li) { padding: 0.4rem 0; color: rgb(229,231,235); font-size: 0.9rem; }
    :global(.landing-contact a)  { color: #fbbf24; text-decoration: none; }
    :global(.landing-contact a:hover) { text-decoration: underline; }

    :global(.img-placeholder) {
        width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
        background: rgba(255,255,255,0.03); color: rgb(107, 114, 128); font-size: 0.85rem; font-weight: 700;
    }
    :global(.img-placeholder.small) { font-size: 0.7rem; }
</style>

<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";

    // ===== Page payload (logged-in user prefill) =====
    let { data } = $props<{
        data: { layoutUser?: { email?: string | null; phone?: string | null; nickname?: string | null } | null };
    }>();

    // ===== Persistence =====
    const LS_KEY = "ad_builder_draft_v1";
    const PAID_KEY = "ad_paid";

    // ===== Access gate state =====
    let accessGranted = $state(false);
    let accessChecked = $state(false);
    let usedOneTimePass = $state(false);

    // ===== Form state =====
    type ProductRow = { id: number; name: string; price: string; image: string; description: string };

    let logo            = $state<string>("");                  // base64 data url
    let mainImage       = $state<string>("");                  // base64 data url
    let title           = $state<string>("");
    let subtitle        = $state<string>("");
    let hoverText       = $state<string>("");
    let cta             = $state<string>("לפרטים נוספים");
    let gradient        = $state<string>("from-amber-500 to-orange-600");
    let landingHeadline = $state<string>("");
    let landingPitch    = $state<string>("");
    let uniqueness      = $state<string>("");
    let phone           = $state<string>(data?.layoutUser?.phone ?? "");
    let whatsapp        = $state<string>(data?.layoutUser?.phone ?? "");
    let website         = $state<string>("");
    let email           = $state<string>(data?.layoutUser?.email ?? "");
    let address         = $state<string>("");
    let hours           = $state<string>("");
    let products        = $state<ProductRow[]>([]);
    let nextProductId   = 1;

    // ===== Tutorial state (lit-number + glowing title + finger pointer) =====
    type Step =
        | "image" | "logo" | "title" | "subtitle" | "hover"
        | "preview" | "landing-link" | "products" | "uniqueness"
        | "address" | "submit" | "done";

    const stepOrder: Step[] = [
        "image", "logo", "title", "subtitle", "preview",
        "hover", "landing-link", "products", "uniqueness",
        "address", "submit", "done"
    ];

    let activeStep = $state<Step>("image");

    // step -> {numLight, titleLight} flags (one entry per step)
    const litFlags: Record<Step, { num: boolean; title: boolean }> = $state({
        image:        { num: false, title: false },
        logo:         { num: false, title: false },
        title:        { num: false, title: false },
        subtitle:     { num: false, title: false },
        hover:        { num: false, title: false },
        preview:      { num: false, title: false },
        "landing-link":{ num: false, title: false },
        products:     { num: false, title: false },
        uniqueness:   { num: false, title: false },
        address:      { num: false, title: false },
        submit:       { num: false, title: false },
        done:         { num: false, title: false },
    });

    const NUM_MS = 700;
    const TITLE_MS = 1500;

    function flashStep(step: Step) {
        const timers: number[] = [];
        litFlags[step].num = true;
        timers.push(window.setTimeout(() => (litFlags[step].num = false), NUM_MS));
        timers.push(window.setTimeout(() => (litFlags[step].title = true), NUM_MS));
        timers.push(window.setTimeout(() => (litFlags[step].title = false), NUM_MS + TITLE_MS));
        return () => timers.forEach(clearTimeout);
    }

    $effect(() => {
        if (!browser) return;
        const cleanup = flashStep(activeStep);
        return cleanup;
    });

    let stepRefs: Record<Step, HTMLElement | null> = $state({
        image: null, logo: null, title: null, subtitle: null, hover: null,
        preview: null, "landing-link": null, products: null, uniqueness: null,
        address: null, submit: null, done: null,
    });

    function slowScrollTo(el: HTMLElement | null, duration = 1400) {
        if (!el) return;
        const startY = window.scrollY;
        const stickyHeader = document.querySelector<HTMLElement>("header");
        const headerOffset = stickyHeader ? stickyHeader.offsetHeight + 16 : 16;
        const targetY = el.getBoundingClientRect().top + window.scrollY - headerOffset;
        const distance = targetY - startY;
        if (Math.abs(distance) < 4) return;
        const startTime = performance.now();
        const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
        function step(now: number) {
            const elapsed = now - startTime;
            const t = Math.min(1, elapsed / duration);
            window.scrollTo(0, startY + distance * ease(t));
            if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function advance(to: Step) {
        activeStep = to;
        queueMicrotask(() => slowScrollTo(stepRefs[to]));
    }

    function nextOf(s: Step): Step {
        const i = stepOrder.indexOf(s);
        return stepOrder[Math.min(i + 1, stepOrder.length - 1)];
    }

    // ===== Image upload helpers =====
    async function fileToDataUrl(file: File): Promise<string> {
        return new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.onerror = rej;
            fr.readAsDataURL(file);
        });
    }

    async function handleImage(e: Event, target: "main" | "logo") {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
            alert("התמונה גדולה מדי — עד 5MB");
            return;
        }
        const url = await fileToDataUrl(f);
        if (target === "main") {
            mainImage = url;
            if (activeStep === "image") advance("logo");
        } else {
            logo = url;
            if (activeStep === "logo") advance("title");
        }
    }

    function clearImage(target: "main" | "logo") {
        if (target === "main") mainImage = "";
        else logo = "";
    }

    async function handleProductImage(e: Event, id: number) {
        const f = (e.target as HTMLInputElement).files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
            alert("התמונה גדולה מדי — עד 5MB");
            return;
        }
        const url = await fileToDataUrl(f);
        const idx = products.findIndex(p => p.id === id);
        if (idx >= 0) {
            products[idx] = { ...products[idx], image: url };
            products = [...products];
        }
    }

    function addProduct() {
        products = [...products, { id: nextProductId++, name: "", price: "", image: "", description: "" }];
    }
    function removeProduct(id: number) {
        products = products.filter(p => p.id !== id);
    }

    // ===== Field commit (advance on blur if value present) =====
    function commitField(field: Step) {
        if (activeStep !== field) return;
        advance(nextOf(field));
    }

    // ===== Color palette =====
    const palettes = [
        { id: "amber",  label: "כתום-זהב",  cls: "from-amber-500 to-orange-600" },
        { id: "blue",   label: "כחול",      cls: "from-blue-600 to-cyan-600" },
        { id: "purple", label: "סגול-ורוד", cls: "from-purple-600 to-pink-600" },
        { id: "green",  label: "ירוק",      cls: "from-green-600 to-emerald-600" },
        { id: "red",    label: "אדום-ורוד", cls: "from-red-600 to-pink-600" },
        { id: "indigo", label: "אינדיגו",   cls: "from-indigo-600 to-blue-600" },
    ];

    // ===== Mobile/Desktop preview toggle =====
    let previewMode = $state<"mobile" | "desktop" | "landing">("mobile");
    let hoverPreview = $state(false);

    // ===== Access gate =====
    // Allow entry only when one of these is true:
    //   1. localStorage[PAID_KEY] is set (real flow — set by payment confirmation)
    //   2. URL contains ?test=1 (one-time test pass — burns immediately)
    function checkAccess() {
        if (!browser) return;
        const params = new URLSearchParams(window.location.search);
        const oneTime = params.get("test") === "1";
        const paid = localStorage.getItem(PAID_KEY) === "1";

        if (paid) {
            accessGranted = true;
        } else if (oneTime) {
            accessGranted = true;
            usedOneTimePass = true;
            // Burn the one-time pass: strip ?test from the URL so a refresh blocks again.
            const url = new URL(window.location.href);
            url.searchParams.delete("test");
            window.history.replaceState({}, "", url.toString());
        } else {
            accessGranted = false;
        }
        accessChecked = true;
    }

    // ===== Persistence (autosave) =====
    onMount(() => {
        if (!browser) return;
        checkAccess();
        if (!accessGranted) return;
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                logo            = d.logo ?? "";
                mainImage       = d.mainImage ?? "";
                title           = d.title ?? "";
                subtitle        = d.subtitle ?? "";
                hoverText       = d.hoverText ?? "";
                cta             = d.cta ?? "לפרטים נוספים";
                gradient        = d.gradient ?? gradient;
                landingHeadline = d.landingHeadline ?? "";
                landingPitch    = d.landingPitch ?? "";
                uniqueness      = d.uniqueness ?? "";
                phone           = d.phone ?? phone;
                whatsapp        = d.whatsapp ?? whatsapp;
                website         = d.website ?? "";
                email           = d.email ?? email;
                address         = d.address ?? "";
                hours           = d.hours ?? "";
                products        = Array.isArray(d.products) ? d.products : [];
                nextProductId   = (products.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
            }
        } catch {}
    });

    $effect(() => {
        if (!browser) return;
        const snapshot = {
            logo, mainImage, title, subtitle, hoverText, cta, gradient,
            landingHeadline, landingPitch, uniqueness, phone, whatsapp, website,
            email, address, hours, products,
        };
        try { localStorage.setItem(LS_KEY, JSON.stringify(snapshot)); } catch {}
    });

    // ===== Validation =====
    let canSubmit = $derived(
        Boolean(mainImage && title && subtitle && hoverText && (phone || website) && (landingHeadline || landingPitch))
    );

    let submitting = $state(false);
    let submitted = $state(false);

    async function submitAd() {
        if (!canSubmit || submitting) return;
        submitting = true;
        // For now: just store as "pending review" in localStorage and show confirmation.
        // A real backend submission would POST to /api/submit-ad here.
        try {
            const payload = {
                title, subtitle, hoverText, cta, gradient,
                logo, mainImage,
                landing: { headline: landingHeadline, pitch: landingPitch, uniqueness, phone, whatsapp, website, email, address, hours, products },
                submittedAt: new Date().toISOString(),
            };
            const queue = JSON.parse(localStorage.getItem("ad_submissions_queue") ?? "[]");
            queue.push(payload);
            localStorage.setItem("ad_submissions_queue", JSON.stringify(queue));
            await new Promise(r => setTimeout(r, 700));
            submitted = true;
            advance("done");
        } finally {
            submitting = false;
        }
    }

    function resetDraft() {
        if (!confirm("לאפס את כל השדות ולהתחיל מחדש?")) return;
        try { localStorage.removeItem(LS_KEY); } catch {}
        location.reload();
    }
</script>

<svelte:head>
    <title>בניית הפרסומת שלי | קהילה בשכונה</title>
</svelte:head>

{#if accessChecked && !accessGranted}
    <!-- ===== GATE — payment required ===== -->
    <div class="max-w-xl mx-auto px-4 py-12 md:py-20 text-center" dir="rtl">
        <div class="text-6xl mb-4">🔒</div>
        <h1 class="text-2xl md:text-4xl font-black text-amber-400 mb-3">
            דף בניית הפרסומת — נעול
        </h1>
        <p class="text-gray-300 text-base md:text-lg mb-6 leading-relaxed">
            הדף הזה זמין רק למפרסמים שהשלימו תשלום.
            <br />ראיתם את העלות בדף הפרסום ושילמתם דרך הסליקה? אנחנו בודקים ומאשרים גישה.
        </p>
        <div class="flex flex-col sm:flex-row gap-3 justify-center mb-8">
            <a href="/about/advertise"
               class="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-colors">
                💳 לדף התשלום
            </a>
            <a href="https://wa.me/972508750632?text=שלום, שילמתי על פרסום ואני רוצה לבנות את הפרסומת באתר"
               target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black transition-colors">
                💬 שילמתי כבר — צרו קשר
            </a>
        </div>

        <!-- One-time test access hint -->
        <details class="text-xs text-gray-500">
            <summary class="cursor-pointer hover:text-gray-300 transition-colors">🧪 בדיקה חד-פעמית (למפתחים בלבד)</summary>
            <div class="mt-3 rounded-xl border border-white/10 bg-white/3 p-4 text-right text-gray-400 leading-relaxed">
                <p class="mb-2">לכניסה <strong class="text-amber-300">חד-פעמית</strong> ללא תשלום — הוסף לקישור:</p>
                <code class="inline-block bg-black/40 border border-amber-500/30 rounded px-2 py-1 text-amber-300 font-bold mb-3" dir="ltr">?test=1</code>
                <p class="mb-3">דוגמה:</p>
                <code class="block bg-black/40 border border-white/10 rounded px-3 py-2 text-amber-200 break-all" dir="ltr">/about/advertise/builder?test=1</code>
                <p class="mt-3">⚠️ הפרמטר נמחק מיד ברגע הכניסה — רענון העמוד יחזיר אותך לכאן.</p>
                <button type="button"
                        onclick={() => location.href = '/about/advertise/builder?test=1'}
                        class="mt-3 w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-bold text-xs transition-colors">
                    🚪 כניסה חד-פעמית עכשיו
                </button>
            </div>
        </details>
    </div>
{:else if !accessChecked}
    <!-- Brief loading state to avoid flicker -->
    <div class="min-h-[40vh]" aria-hidden="true"></div>
{:else}
<div class="ad-builder max-w-5xl mx-auto px-4 py-8 md:py-12" dir="rtl">

    <!-- Header / hero -->
    <div class="text-center mb-8 md:mb-12">
        <div class="text-5xl mb-3">🎨</div>
        <h1 class="text-3xl md:text-5xl font-black bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent mb-3">
            בונים את הפרסומת שלי
        </h1>
        <p class="text-gray-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            עברנו את שלב התשלום. עכשיו, יחד, נבנה פרסומת שתבלוט לתושבי השכונה.
            <br/>פשוט מלא שלב אחרי שלב — בכל רגע תראה תצוגה מקדימה חיה.
        </p>
        <div class="mt-4 flex items-center justify-center gap-3 text-xs text-gray-400">
            <span class="inline-flex items-center gap-1.5"><span class="text-green-400">✓</span> נשמר אוטומטית</span>
            <span>•</span>
            <button type="button" onclick={resetDraft} class="text-amber-400 hover:text-amber-300 underline underline-offset-2">איפוס טיוטה</button>
        </div>
    </div>

    <!-- =================== STEP 1: MAIN IMAGE =================== -->
    <section bind:this={stepRefs.image} class="step-card" onclick={() => activeStep === "image" || (activeStep = "image")}>
        <div class="step-head" class:step-title-light={litFlags.image.title}>
            <span class="step-num" class:step-num-light={litFlags.image.num}>1</span>
            <h2>העלה תמונה ראשית לפרסומת</h2>
            {#if activeStep === "image" && !mainImage}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">תמונה איכותית — מוצר, חזית העסק, אווירת השירות. תופיע גם בנייד וגם בדסקטופ. עד 5MB.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="upload-zone" class:has-image={!!mainImage}>
                {#if mainImage}
                    <img src={mainImage} alt="תמונה ראשית" />
                    <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage("main"); }} aria-label="הסר תמונה">✕</button>
                {:else}
                    <div class="upload-empty">
                        <div class="text-4xl mb-2">📸</div>
                        <p class="font-bold text-base text-white">לחץ או גרור תמונה לכאן</p>
                        <p class="text-xs text-gray-400 mt-1">JPG, PNG, WebP — עד 5MB</p>
                    </div>
                {/if}
                <input type="file" accept="image/*" onchange={(e) => handleImage(e, "main")} class="hidden" />
            </label>

            <div class="bg-white/3 rounded-2xl border border-white/10 p-4 text-sm text-gray-300 space-y-2">
                <p class="font-bold text-amber-400 mb-2">💡 טיפים לתמונה מנצחת</p>
                <ul class="space-y-1.5 text-[13px] leading-relaxed">
                    <li>✨ צילום ברור עם תאורה טובה</li>
                    <li>🎯 פוקוס על המוצר/שירות — לא רקע מבולגן</li>
                    <li>📐 יחס מומלץ: 4:3 או 16:9 (אופקי)</li>
                    <li>🚫 בלי טקסט מודבק על התמונה — נכתוב טקסט בנפרד</li>
                </ul>
            </div>
        </div>
    </section>

    <!-- =================== STEP 2: LOGO =================== -->
    <section bind:this={stepRefs.logo} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.logo.title}>
            <span class="step-num" class:step-num-light={litFlags.logo.num}>2</span>
            <h2>לוגו (אופציונלי)</h2>
            {#if activeStep === "logo" && !logo}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">העלה לוגו — עדיף עם רקע שקוף (PNG). יוצב בפינת הפרסומת. אם אין לוגו — דלג.</p>

        <div class="flex items-start gap-4 flex-wrap">
            <label class="upload-zone-sm" class:has-image={!!logo}>
                {#if logo}
                    <img src={logo} alt="לוגו" />
                    <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage("logo"); }} aria-label="הסר לוגו">✕</button>
                {:else}
                    <div class="text-center">
                        <div class="text-2xl mb-1">🏷️</div>
                        <p class="text-xs font-bold text-gray-300">העלה לוגו</p>
                    </div>
                {/if}
                <input type="file" accept="image/*" onchange={(e) => handleImage(e, "logo")} class="hidden" />
            </label>

            <button type="button" onclick={() => advance("title")}
                    class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-amber-500/40 text-gray-300 hover:text-amber-300 text-sm font-bold transition-colors self-center">
                דלג שלב זה →
            </button>
        </div>
    </section>

    <!-- =================== STEP 3: TITLE =================== -->
    <section bind:this={stepRefs.title} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.title.title}>
            <span class="step-num" class:step-num-light={litFlags.title.num}>3</span>
            <h2>כותרת ראשית</h2>
            {#if activeStep === "title" && !title}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">שם העסק או המוצר — קצר וברור. עד 35 תווים.</p>

        <input type="text" bind:value={title} maxlength="35"
               onfocus={() => activeStep === "title" || (activeStep = "title")}
               onblur={() => title.trim() && commitField("title")}
               placeholder="לדוגמה: גמ״ח כלי עבודה — קרית משה"
               class="text-input" />
        <div class="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>{title.length}/35</span>
            {#if title}
                <button type="button" onclick={() => commitField("title")} class="text-amber-400 hover:text-amber-300 font-bold">
                    המשך לכותרת משנה ←
                </button>
            {/if}
        </div>
    </section>

    <!-- =================== STEP 4: SUBTITLE =================== -->
    <section bind:this={stepRefs.subtitle} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.subtitle.title}>
            <span class="step-num" class:step-num-light={litFlags.subtitle.num}>4</span>
            <h2>כותרת משנה / סלוגן</h2>
            {#if activeStep === "subtitle" && !subtitle}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">משפט אחד שמסביר מה אתה מציע ולמה זה שווה לתושבים. עד 70 תווים.</p>

        <input type="text" bind:value={subtitle} maxlength="70"
               onfocus={() => activeStep === "subtitle" || (activeStep = "subtitle")}
               onblur={() => subtitle.trim() && commitField("subtitle")}
               placeholder="לדוגמה: כל כלי עבודה שצריך — בלי תשלום, בלי בירוקרטיה"
               class="text-input" />
        <div class="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>{subtitle.length}/70</span>
            {#if subtitle}
                <button type="button" onclick={() => commitField("subtitle")} class="text-amber-400 hover:text-amber-300 font-bold">
                    המשך ←
                </button>
            {/if}
        </div>
    </section>

    <!-- =================== STEP 5: PREVIEW =================== -->
    <section bind:this={stepRefs.preview} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.preview.title}>
            <span class="step-num" class:step-num-light={litFlags.preview.num}>5</span>
            <h2>תצוגה מקדימה — איך זה ייראה לתושבים?</h2>
            {#if activeStep === "preview"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">החלף בין מצבי תצוגה. תוכל לחזור לשלבים הקודמים ולשנות בכל רגע.</p>

        <!-- Mode toggle -->
        <div class="inline-flex rounded-xl border border-white/10 bg-black/30 p-1 mb-5">
            {#each [
                { id: "mobile",  label: "📱 נייד" },
                { id: "desktop", label: "🖥️ דסקטופ" },
                { id: "landing", label: "🌐 דף נחיתה" }
            ] as opt}
                <button type="button" onclick={() => previewMode = opt.id as any}
                    class="px-4 py-2 rounded-lg text-sm font-bold transition-all
                           {previewMode === opt.id ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                    {opt.label}
                </button>
            {/each}
        </div>

        <!-- ===== MOBILE PREVIEW — full-screen popup style ===== -->
        {#if previewMode === "mobile"}
            <div class="preview-frame mobile">
                <div class="phone-screen">
                    <div class="phone-notch"></div>
                    <div class="phone-content">
                        <div class="mobile-popup">
                            <div class="popup-img pro-img-wrap">
                                {#if mainImage}
                                    <img src={mainImage} alt={title} />
                                {:else}
                                    <div class="img-placeholder">תמונה ראשית</div>
                                {/if}
                                <!-- Diagonal color band -->
                                <div class="pro-diag bg-gradient-to-br {gradient}"></div>
                                <!-- Title sits on the diagonal -->
                                <div class="pro-title-wrap mobile">
                                    <h3 class="pro-title">{title || "כותרת ראשית"}</h3>
                                    <p class="pro-sub">{subtitle || "כותרת משנה / סלוגן"}</p>
                                </div>
                                {#if logo}
                                    <img src={logo} alt="לוגו" class="popup-logo" />
                                {/if}
                                <div class="close-countdown">5</div>
                            </div>
                            <div class="popup-body">
                                <button type="button" class="popup-cta bg-gradient-to-r {gradient}">
                                    ← {cta}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <p class="preview-caption">כך הפרסומת תיפתח בנייד למשך 5 שניות כשמשתמש לוחץ על אחד היתרונות באתר.</p>
            </div>
        {/if}

        <!-- ===== DESKTOP PREVIEW — looks like the actual site (header + map + content + RIGHT-side ad) ===== -->
        {#if previewMode === "desktop"}
            <div class="preview-frame desktop">
                <div class="desktop-mock" dir="rtl">
                    <!-- Site header (mimics real Header.svelte) -->
                    <div class="mock-header">
                        <div class="mock-header-inner">
                            <div class="mock-logo">
                                <span class="mock-logo-circle">🏘️</span>
                                <div>
                                    <div class="mock-site-name">קהילה בשכונה</div>
                                    <div class="mock-site-sub">כל יתרונות השכונה תחת קורת גג אחת</div>
                                </div>
                            </div>
                            <div class="mock-nav">
                                <span>אודות</span>
                                <span class="mock-lang">🌐 עברית</span>
                                <span class="mock-user">👤</span>
                            </div>
                        </div>
                        <!-- News ticker line -->
                        <div class="mock-ticker">📰 חדשות השכונה • אירועים השבוע • מבצעים חדשים…</div>
                    </div>

                    <!-- Body: 3-col layout (right ad | content | left helper sidebar) -->
                    <div class="mock-body">
                        <!-- RIGHT-SIDE AD (this is where the user's ad lives) -->
                        <aside class="mock-right-ad">
                            <h4 class="mock-ad-label">תוכן שיווקי</h4>
                            <div
                                role="button"
                                tabindex="0"
                                class="desktop-ad pro-ad group"
                                onmouseenter={() => hoverPreview = true}
                                onmouseleave={() => hoverPreview = false}
                                onfocus={() => hoverPreview = true}
                                onblur={() => hoverPreview = false}
                            >
                                <div class="ad-img-wrap pro-img-wrap" style:height="220px">
                                    {#if mainImage}
                                        <img src={mainImage} alt={title}
                                             class="ad-img"
                                             style:opacity={hoverPreview ? 0 : 1} />
                                    {:else}
                                        <div class="img-placeholder">תמונה</div>
                                    {/if}

                                    <!-- Diagonal color band -->
                                    <div class="pro-diag bg-gradient-to-br {gradient}"
                                         style:opacity={hoverPreview ? 0 : 1}></div>

                                    <!-- Title overlay (sits on the diagonal) -->
                                    <div class="pro-title-wrap" style:opacity={hoverPreview ? 0 : 1}>
                                        <h3 class="pro-title">{title || "כותרת ראשית"}</h3>
                                        <p class="pro-sub">{subtitle || "סלוגן / כותרת משנה"}</p>
                                    </div>

                                    <!-- Hover overlay (replaces image on hover) -->
                                    <div class="hover-overlay" style:opacity={hoverPreview ? 1 : 0}>
                                        <h3 class="hover-title">{title || "כותרת"}</h3>
                                        <p class="hover-text">{hoverText || "כאן יופיע הטקסט בריחוף"}</p>
                                    </div>

                                    {#if logo}
                                        <img src={logo} alt="לוגו" class="ad-logo" />
                                    {/if}
                                </div>
                                <div class="ad-cta bg-gradient-to-r {gradient}">
                                    <p>{cta}</p>
                                </div>
                            </div>
                            <!-- Pointer arrow showing "this is your ad" -->
                            <div class="mock-here-pointer">
                                <span>הפרסומת שלך כאן</span>
                                <span class="arrow">←</span>
                            </div>
                        </aside>

                        <!-- MAIN CONTENT (mock map + categories) -->
                        <main class="mock-main">
                            <div class="mock-h1">יתרונות שכונת קרית משה</div>
                            <!-- Mock map -->
                            <div class="mock-map">
                                <div class="mock-map-grid"></div>
                                <div class="mock-pin" style="top:30%; right:25%;">📍</div>
                                <div class="mock-pin" style="top:60%; right:60%;">📍</div>
                                <div class="mock-pin" style="top:45%; right:75%;">📍</div>
                                <div class="mock-map-label">🗺️ מפת השכונה</div>
                            </div>
                            <!-- Mock category chips -->
                            <div class="mock-cats">
                                {#each ["גמ״ח","יהדות","חוגים","טרמפים","חנויות","שבת"] as cat}
                                    <span class="mock-cat-chip">{cat}</span>
                                {/each}
                            </div>
                        </main>

                        <!-- LEFT SIDEBAR (other ads / partners — like real AdsSidebar) -->
                        <aside class="mock-left-ads">
                            <h4 class="mock-ad-label">שותפים</h4>
                            {#each ["from-blue-600 to-cyan-600","from-purple-600 to-pink-600","from-green-600 to-emerald-600"] as col}
                                <div class="mock-other-ad">
                                    <div class="mock-other-img"></div>
                                    <div class="mock-other-cta bg-gradient-to-r {col}">פרסומת אחרת</div>
                                </div>
                            {/each}
                        </aside>
                    </div>
                </div>
                <p class="preview-caption">📌 העבר עכבר על הפרסומת (בצד ימין) כדי לראות את הטקסט בריחוף — כפי שהגולש יראה.</p>
            </div>
        {/if}

        <!-- ===== LANDING PAGE PREVIEW — full mini-site ===== -->
        {#if previewMode === "landing"}
            <div class="preview-frame landing">
                <div class="landing-mock">
                    <header class="landing-hero bg-gradient-to-br {gradient}">
                        {#if mainImage}
                            <img src={mainImage} alt={title} class="landing-hero-bg" />
                        {/if}
                        <div class="landing-hero-overlay"></div>
                        <div class="landing-hero-content">
                            {#if logo}<img src={logo} alt="לוגו" class="landing-logo" />{/if}
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
                <p class="preview-caption">כך ייראה דף הנחיתה המלא — אליו הגולש יגיע בלחיצה על הפרסומת.</p>
            </div>
        {/if}

        <div class="mt-6 text-center">
            <button type="button" onclick={() => advance("hover")}
                class="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-colors">
                נראה מעולה — המשך לטקסט בריחוף →
            </button>
        </div>
    </section>

    <!-- =================== STEP 6: HOVER TEXT =================== -->
    <section bind:this={stepRefs.hover} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.hover.title}>
            <span class="step-num" class:step-num-light={litFlags.hover.num}>6</span>
            <h2>טקסט בריחוף — מה רואים כשהעכבר על הפרסומת</h2>
            {#if activeStep === "hover" && !hoverText}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">
            כשמשתמש בדסקטופ מצביע עם העכבר על הפרסומת — הטקסט הזה יופיע במקום התמונה.
            <br/>
            <strong class="text-amber-300">כתוב משפט קצר שמסקרן</strong> את הגולש —
            אבל ברור מספיק כדי שיבין מיד באיזה מוצר או שירות מדובר.
        </p>

        <textarea bind:value={hoverText} maxlength="90" rows="2"
                  onfocus={() => activeStep === "hover" || (activeStep = "hover")}
                  onblur={() => hoverText.trim() && commitField("hover")}
                  placeholder="לדוגמה: כלי עבודה לכל בית — להשאלה חינם 🛠️"
                  class="text-input"></textarea>
        <div class="flex items-center justify-between text-xs text-gray-500 mt-1">
            <span>{hoverText.length}/90</span>
            {#if hoverText}
                <button type="button" onclick={() => commitField("hover")} class="text-amber-400 hover:text-amber-300 font-bold">
                    המשך לדף הנחיתה ←
                </button>
            {/if}
        </div>

        <!-- Color palette -->
        <div class="mt-6">
            <p class="text-sm font-bold text-gray-300 mb-2">צבע הפרסומת:</p>
            <div class="flex flex-wrap gap-2">
                {#each palettes as p}
                    <button type="button" onclick={() => (gradient = p.cls)}
                        class="px-3 py-2 rounded-xl text-xs font-bold text-white transition-all
                               bg-gradient-to-r {p.cls}
                               {gradient === p.cls ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'}">
                        {p.label}
                    </button>
                {/each}
            </div>
        </div>
    </section>

    <!-- =================== STEP 7: LANDING LINK / CONTACT =================== -->
    <section bind:this={stepRefs["landing-link"]} class="step-card">
        <div class="step-head" class:step-title-light={litFlags["landing-link"].title}>
            <span class="step-num" class:step-num-light={litFlags["landing-link"].num}>7</span>
            <h2>דף נחיתה — לאן המשתמש יגיע?</h2>
            {#if activeStep === "landing-link"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">בחר אופציה אחת או יותר — אם יש לך אתר, נשלח את הגולש אליו. אם לא — נשתמש בדף הנחיתה הפנימי שלנו.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label class="field-label">📞 טלפון לקבלת פניות</label>
                <input type="tel" bind:value={phone} placeholder="050-1234567"
                       onfocus={() => activeStep === "landing-link" || (activeStep = "landing-link")}
                       class="text-input" />
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
        </div>

        <div class="mt-4 text-center">
            <button type="button" onclick={() => advance("products")}
                class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
                המשך לתמונות מוצרים ←
            </button>
        </div>
    </section>

    <!-- =================== STEP 8: PRODUCTS =================== -->
    <section bind:this={stepRefs.products} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.products.title}>
            <span class="step-num" class:step-num-light={litFlags.products.num}>8</span>
            <h2>תמונות מוצרים / שירותים + מחירים</h2>
            {#if activeStep === "products"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">הוסף 3-6 מוצרים או שירותים. תמונה איכותית ומחיר ברור הם הדבר הכי משכנע.</p>

        <div class="space-y-3">
            {#each products as p, idx (p.id)}
                <div class="product-row">
                    <label class="upload-zone-sm" class:has-image={!!p.image}>
                        {#if p.image}
                            <img src={p.image} alt={p.name} />
                        {:else}
                            <div class="text-center text-xs text-gray-400">📷<br/>תמונה</div>
                        {/if}
                        <input type="file" accept="image/*" onchange={(e) => handleProductImage(e, p.id)} class="hidden" />
                    </label>
                    <div class="grow grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input type="text" bind:value={products[idx].name} placeholder="שם המוצר/שירות" class="text-input small" />
                        <input type="text" bind:value={products[idx].price} placeholder="מחיר (₪)" class="text-input small" />
                        <input type="text" bind:value={products[idx].description} placeholder="תיאור קצר (אופציונלי)" class="text-input small" />
                    </div>
                    <button type="button" onclick={() => removeProduct(p.id)} class="remove-btn" aria-label="הסר">✕</button>
                </div>
            {/each}
        </div>

        <button type="button" onclick={addProduct}
            class="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/70 font-bold text-sm transition-colors">
            + הוסף מוצר
        </button>

        <div class="mt-4 text-center">
            <button type="button" onclick={() => advance("uniqueness")}
                class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
                המשך — מה מייחד אותך ←
            </button>
        </div>
    </section>

    <!-- =================== STEP 9: UNIQUENESS =================== -->
    <section bind:this={stepRefs.uniqueness} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.uniqueness.title}>
            <span class="step-num" class:step-num-light={litFlags.uniqueness.num}>9</span>
            <h2>מה מייחד אותך?</h2>
            {#if activeStep === "uniqueness"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">
            🌟 <strong class="text-amber-300">זה החלק הכי חשוב!</strong>
            תושבי השכונה רוצים לדעת — למה דווקא אצלך? נסיון, איכות, מחיר, יחס אישי, ערך מוסף.
            כתוב 2-3 משפטים שמסבירים את הייחוד שלך.
        </p>

        <textarea bind:value={uniqueness} rows="5" maxlength="500"
                  onfocus={() => activeStep === "uniqueness" || (activeStep = "uniqueness")}
                  placeholder={`לדוגמה:\n• 15 שנות נסיון בשכונה — אנחנו חלק מהקהילה\n• כל המוצרים בייצור בית, ללא חומרים משמרים\n• אחריות מלאה ושירות אישי 24/7`}
                  class="text-input"></textarea>
        <div class="text-xs text-gray-500 mt-1 text-left">{uniqueness.length}/500</div>

        <div class="mt-4 text-center">
            <button type="button" onclick={() => advance("address")}
                class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
                המשך לכתובת ופרטי קשר ←
            </button>
        </div>
    </section>

    <!-- =================== STEP 10: ADDRESS =================== -->
    <section bind:this={stepRefs.address} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.address.title}>
            <span class="step-num" class:step-num-light={litFlags.address.num}>10</span>
            <h2>כתובת ושעות פעילות</h2>
            {#if activeStep === "address"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="md:col-span-2">
                <label class="field-label">📍 כתובת מלאה (רחוב, מספר, עיר)</label>
                <input type="text" bind:value={address}
                       onfocus={() => activeStep === "address" || (activeStep = "address")}
                       placeholder="לדוגמה: בן ציון 12, קרית משה, ירושלים"
                       class="text-input" />
            </div>
            <div class="md:col-span-2">
                <label class="field-label">🕒 שעות פעילות (אופציונלי)</label>
                <input type="text" bind:value={hours}
                       placeholder="לדוגמה: א-ה 9:00-19:00, ו 9:00-13:00"
                       class="text-input" />
            </div>
        </div>

        <div class="mt-4 text-center">
            <button type="button" onclick={() => advance("submit")}
                class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
                סיימתי — שלח לאישור ←
            </button>
        </div>
    </section>

    <!-- =================== STEP 11: SUBMIT =================== -->
    <section bind:this={stepRefs.submit} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.submit.title}>
            <span class="step-num" class:step-num-light={litFlags.submit.num}>11</span>
            <h2>בדיקה אחרונה ושליחה</h2>
            {#if activeStep === "submit"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>

        <ul class="checklist">
            <li class:done={!!mainImage}><span>{mainImage ? "✅" : "⬜"}</span> תמונה ראשית</li>
            <li class:done={!!title}><span>{title ? "✅" : "⬜"}</span> כותרת ראשית</li>
            <li class:done={!!subtitle}><span>{subtitle ? "✅" : "⬜"}</span> כותרת משנה</li>
            <li class:done={!!hoverText}><span>{hoverText ? "✅" : "⬜"}</span> טקסט בריחוף</li>
            <li class:done={!!(phone || website)}><span>{(phone || website) ? "✅" : "⬜"}</span> ערוץ פנייה (טלפון/אתר)</li>
            <li class:done={products.length > 0}><span>{products.length > 0 ? "✅" : "⬜"}</span> תמונות מוצרים ({products.length})</li>
            <li class:done={!!uniqueness}><span>{uniqueness ? "✅" : "⬜"}</span> מה מייחד אותך</li>
            <li class:done={!!address}><span>{address ? "✅" : "⬜"}</span> כתובת</li>
        </ul>

        {#if !canSubmit}
            <p class="text-amber-300 text-sm mt-3 font-bold">⚠️ נא למלא לפחות: תמונה, כותרת, כותרת משנה, טקסט ריחוף, ערוץ פנייה.</p>
        {/if}

        <button type="button" onclick={submitAd} disabled={!canSubmit || submitting}
            class="mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-lg shadow-xl shadow-green-500/30 transition-all
                   {canSubmit && !submitting ? 'hover:scale-[1.02] active:scale-95' : 'opacity-50 cursor-not-allowed'}">
            {#if submitting}שולח…{:else}🚀 שלח לאישור ופרסום{/if}
        </button>
    </section>

    <!-- =================== STEP 12: DONE =================== -->
    {#if submitted}
        <section bind:this={stepRefs.done} class="step-card success-card">
            <div class="text-center py-6">
                <div class="text-6xl mb-3">🎉</div>
                <h2 class="text-2xl md:text-3xl font-black text-green-300 mb-2">הפרסומת נשלחה לאישור!</h2>
                <p class="text-gray-300 max-w-lg mx-auto">
                    נבחן את הפרסומת ונאשר אותה תוך 24 שעות. תקבל אימייל ברגע שהיא מתפרסמת בפועל בשכונה שלך.
                </p>
                <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <a href="/" class="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors">
                        חזרה לעמוד הבית
                    </a>
                    <a href="/profile" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
                        לפרופיל שלי
                    </a>
                </div>
            </div>
        </section>
    {/if}

</div>
{/if}

<!-- One-time pass banner -->
{#if usedOneTimePass}
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[200] rounded-xl border border-amber-500/50 bg-gray-900/95 px-4 py-2 shadow-2xl backdrop-blur" dir="rtl">
        <p class="text-amber-300 text-xs font-bold flex items-center gap-2">
            <span>🧪</span>
            <span>גישה חד-פעמית פעילה — רענון יחסום מחדש</span>
        </p>
    </div>
{/if}

<style>
    /* ============== Page-level layout ============== */
    .ad-builder :global(*) { box-sizing: border-box; }

    /* ============== Step Card ============== */
    :global(.step-card) {
        background: linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01));
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 1.25rem;
        padding: 1.25rem 1.25rem 1.5rem;
        margin-bottom: 1.25rem;
        scroll-margin-top: 8rem;
    }
    @media (min-width: 768px) {
        :global(.step-card) { padding: 1.75rem; margin-bottom: 1.75rem; }
    }
    :global(.success-card) {
        background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04));
        border-color: rgba(16,185,129,0.4);
    }

    /* ============== Step heading ============== */
    :global(.step-head) {
        display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem;
        color: rgb(229,231,235); font-weight: 900;
        flex-wrap: wrap;
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
    :global(.text-input.small) { padding: 0.55rem 0.75rem; font-size: 0.85rem; }
    :global(.text-input::placeholder) { color: rgb(107, 114, 128); }
    :global(.text-input:focus) {
        border-color: rgba(245, 158, 11, 0.6);
        background: rgba(255,255,255,0.06);
    }
    :global(.field-label) {
        display: block; color: rgb(209, 213, 219); font-weight: 700; font-size: 0.85rem;
        margin-bottom: 0.4rem;
    }

    /* ============== Upload zones ============== */
    :global(.upload-zone) {
        position: relative; display: flex; align-items: center; justify-content: center;
        min-height: 200px; border: 2px dashed rgba(245, 158, 11, 0.4);
        border-radius: 1rem; background: rgba(245, 158, 11, 0.04);
        cursor: pointer; transition: border-color 0.15s, background 0.15s;
        overflow: hidden;
    }
    :global(.upload-zone:hover) { border-color: rgba(245, 158, 11, 0.7); background: rgba(245, 158, 11, 0.08); }
    :global(.upload-zone.has-image) { border-style: solid; padding: 0; }
    :global(.upload-zone img) { width: 100%; height: 100%; min-height: 200px; max-height: 280px; object-fit: cover; }
    :global(.upload-empty) { text-align: center; padding: 1rem; }

    :global(.upload-zone-sm) {
        position: relative; display: flex; align-items: center; justify-content: center;
        width: 100px; height: 100px; flex-shrink: 0;
        border: 2px dashed rgba(245, 158, 11, 0.4); border-radius: 0.75rem;
        background: rgba(245, 158, 11, 0.04); cursor: pointer; overflow: hidden;
    }
    :global(.upload-zone-sm.has-image) { border-style: solid; padding: 0; }
    :global(.upload-zone-sm img) { width: 100%; height: 100%; object-fit: cover; }

    :global(.remove-x) {
        position: absolute; top: 0.4rem; left: 0.4rem; z-index: 5;
        width: 1.75rem; height: 1.75rem; border-radius: 9999px;
        background: rgba(0,0,0,0.65); color: white; border: 1px solid rgba(255,255,255,0.2);
        font-size: 0.85rem; cursor: pointer; display: flex; align-items: center; justify-content: center;
    }
    :global(.remove-x:hover) { background: rgba(220,38,38,0.85); }

    /* ============== Product row ============== */
    :global(.product-row) {
        display: flex; align-items: stretch; gap: 0.75rem;
        background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 0.85rem; padding: 0.75rem;
    }
    @media (max-width: 768px) {
        :global(.product-row) { flex-direction: column; }
    }
    :global(.product-row .grow) { flex: 1; }
    :global(.remove-btn) {
        width: 2rem; height: 2rem; border-radius: 9999px; background: rgba(255,255,255,0.05);
        color: rgb(156, 163, 175); border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer; align-self: center; flex-shrink: 0;
    }
    :global(.remove-btn:hover) { background: rgba(220,38,38,0.6); color: white; }

    /* ============== Tutorial finger animation (matches /about/advertise) ============== */
    @keyframes gentleHover {
        0%, 100% { transform: translateY(0) scale(1); }
        50%      { transform: translateY(-5px) scale(1.03); }
    }
    :global(.tutorial-finger) {
        display: inline-block;
        animation: gentleHover 2.6s ease-in-out infinite;
        font-size: 1.25rem;
        margin-right: auto;
        will-change: transform;
        filter: drop-shadow(0 0 5px rgba(245,158,11,0.45));
    }

    /* Step number flash */
    @keyframes stepNumFlashAnim {
        0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0); transform: scale(1); filter: brightness(1); }
        50%      { box-shadow: 0 0 18px 6px rgba(251, 191, 36, 0.95); transform: scale(1.25); filter: brightness(1.55); }
    }
    :global(.step-num.step-num-light) {
        animation: stepNumFlashAnim 0.7s ease-in-out 1;
    }

    /* Step title glow */
    @keyframes stepTitleGlowAnim {
        0%, 100% { color: rgb(229,231,235); text-shadow: 0 0 0 rgba(251,191,36,0); }
        50%      { color: #fbbf24; text-shadow: 0 0 14px rgba(251,191,36,0.9), 0 0 28px rgba(251,191,36,0.5); }
    }
    :global(.step-head.step-title-light h2) {
        animation: stepTitleGlowAnim 1.5s ease-in-out 1;
    }

    /* ============== MOBILE PREVIEW (phone frame) ============== */
    :global(.preview-frame) { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }
    :global(.preview-caption) {
        color: rgb(156,163,175); font-size: 0.8rem; text-align: center; max-width: 28rem;
    }

    :global(.phone-screen) {
        width: 280px; height: 540px; max-width: 90vw;
        background: #0b1224; border-radius: 2rem;
        border: 8px solid #111827; box-shadow: 0 20px 60px rgba(0,0,0,0.5), 0 0 0 2px rgba(255,255,255,0.05);
        position: relative; overflow: hidden;
    }
    :global(.phone-notch) {
        position: absolute; top: 6px; left: 50%; transform: translateX(-50%);
        width: 80px; height: 16px; background: #111827; border-radius: 0 0 12px 12px; z-index: 10;
    }
    :global(.phone-content) { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; padding: 1rem; }
    :global(.mobile-popup) {
        width: 100%; max-width: 240px; background: #0f172a;
        border-radius: 1rem; overflow: hidden; box-shadow: 0 8px 30px rgba(0,0,0,0.5);
    }
    :global(.popup-img) { position: relative; height: 130px; }
    :global(.popup-img img) { width: 100%; height: 100%; object-fit: cover; }
    :global(.popup-img-fade) {
        position: absolute; inset: 0;
        background: linear-gradient(to top, rgba(15,23,42,0.95), transparent 50%);
        pointer-events: none;
    }
    :global(.popup-logo) {
        position: absolute !important; top: 8px; right: 8px;
        width: 40px; height: 40px; border-radius: 8px; background: white; padding: 4px;
        object-fit: contain !important;
    }
    :global(.close-countdown) {
        position: absolute; top: 8px; left: 8px; width: 28px; height: 28px;
        border-radius: 9999px; background: rgba(0,0,0,0.55); border: 1px solid rgba(255,255,255,0.25);
        color: white; font-size: 12px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
    }
    :global(.popup-body) { padding: 0.85rem; }
    :global(.popup-title) {
        font-size: 1rem; font-weight: 900; line-height: 1.2; margin: 0 0 0.25rem;
    }
    :global(.popup-sub) { color: rgb(209,213,219); font-size: 0.78rem; line-height: 1.35; margin: 0 0 0.65rem; }
    :global(.popup-cta) {
        display: block; width: 100%; padding: 0.55rem; border-radius: 0.6rem;
        color: white; font-weight: 700; font-size: 0.78rem; text-align: center;
        border: none;
    }

    /* ============== DESKTOP PREVIEW (mimics real site) ============== */
    :global(.desktop-mock) {
        width: 100%; max-width: 820px;
        background: #0f172a;
        border-radius: 0.85rem; overflow: hidden;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }

    /* Site header */
    :global(.mock-header) {
        background: linear-gradient(180deg, #0b1224, #0f172a);
        border-bottom: 1px solid rgba(255,255,255,0.07);
    }
    :global(.mock-header-inner) {
        display: flex; align-items: center; justify-content: space-between;
        padding: 0.65rem 1rem;
    }
    :global(.mock-logo) {
        display: flex; align-items: center; gap: 0.55rem;
    }
    :global(.mock-logo-circle) {
        display: flex; align-items: center; justify-content: center;
        width: 32px; height: 32px; border-radius: 9999px;
        background: linear-gradient(135deg, #f59e0b, #d97706);
        font-size: 1rem;
    }
    :global(.mock-site-name) {
        color: white; font-weight: 900; font-size: 0.85rem; line-height: 1.1;
    }
    :global(.mock-site-sub) {
        color: rgb(156,163,175); font-size: 0.65rem; line-height: 1.2;
    }
    :global(.mock-nav) {
        display: flex; align-items: center; gap: 0.65rem;
        color: rgb(209,213,219); font-size: 0.72rem; font-weight: 600;
    }
    :global(.mock-nav .mock-lang) {
        padding: 0.2rem 0.5rem; border-radius: 0.4rem;
        background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
    }
    :global(.mock-nav .mock-user) {
        width: 28px; height: 28px; border-radius: 9999px;
        background: rgba(255,255,255,0.06); display: flex; align-items: center; justify-content: center;
    }
    :global(.mock-ticker) {
        background: rgba(245,158,11,0.08);
        color: rgb(251, 191, 36);
        font-size: 0.65rem; font-weight: 700;
        padding: 0.3rem 1rem;
        border-top: 1px solid rgba(245,158,11,0.15);
        white-space: nowrap; overflow: hidden;
    }

    /* 3-column body */
    :global(.mock-body) {
        display: flex; gap: 0.75rem; padding: 0.85rem;
    }

    /* Right ad column */
    :global(.mock-right-ad) {
        width: 165px; flex-shrink: 0; position: relative;
    }
    :global(.mock-ad-label) {
        font-size: 0.6rem; font-weight: 700; color: #fbbf24;
        text-transform: uppercase; letter-spacing: 0.1em;
        text-align: center; margin: 0 0 0.5rem;
    }
    :global(.mock-here-pointer) {
        margin-top: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.35rem;
        background: linear-gradient(90deg, rgba(245,158,11,0.18), rgba(245,158,11,0.05));
        color: #fbbf24; font-size: 0.7rem; font-weight: 800;
        padding: 0.35rem 0.5rem; border-radius: 0.4rem;
        border: 1px dashed rgba(245,158,11,0.45);
    }
    :global(.mock-here-pointer .arrow) {
        font-size: 1rem;
        animation: pointerNudge 1.4s ease-in-out infinite;
    }
    @keyframes pointerNudge {
        0%, 100% { transform: translateX(0); }
        50%      { transform: translateX(4px); }
    }

    /* Main content column */
    :global(.mock-main) {
        flex: 1; min-width: 0;
    }
    :global(.mock-h1) {
        color: white; font-weight: 900; font-size: 1.05rem; margin-bottom: 0.65rem;
        background: linear-gradient(90deg, #fbbf24, #f59e0b);
        -webkit-background-clip: text; background-clip: text; color: transparent;
    }

    /* Mock map */
    :global(.mock-map) {
        position: relative; height: 180px; border-radius: 0.5rem; overflow: hidden;
        background:
            linear-gradient(135deg, rgba(34,197,94,0.18), rgba(59,130,246,0.18)),
            #0a1020;
        border: 1px solid rgba(255,255,255,0.06);
        margin-bottom: 0.65rem;
    }
    :global(.mock-map-grid) {
        position: absolute; inset: 0;
        background-image:
            linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px);
        background-size: 22px 22px;
    }
    :global(.mock-pin) {
        position: absolute; transform: translate(50%, -50%);
        font-size: 1.1rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        animation: pinDrop 1.5s ease-out;
    }
    @keyframes pinDrop {
        from { transform: translate(50%, -150%); opacity: 0; }
        to   { transform: translate(50%, -50%); opacity: 1; }
    }
    :global(.mock-map-label) {
        position: absolute; top: 0.4rem; right: 0.5rem;
        background: rgba(0,0,0,0.55); color: white;
        font-size: 0.65rem; font-weight: 700;
        padding: 0.15rem 0.5rem; border-radius: 0.3rem;
        border: 1px solid rgba(255,255,255,0.1);
    }
    :global(.mock-cats) {
        display: flex; flex-wrap: wrap; gap: 0.35rem;
    }
    :global(.mock-cat-chip) {
        padding: 0.3rem 0.65rem; border-radius: 9999px;
        background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
        color: rgb(209,213,219); font-size: 0.7rem; font-weight: 600;
    }

    /* Left helper sidebar (other ads) */
    :global(.mock-left-ads) {
        width: 110px; flex-shrink: 0;
    }
    :global(.mock-other-ad) {
        margin-bottom: 0.5rem; border-radius: 0.4rem; overflow: hidden;
        border: 1px solid rgba(255,255,255,0.06);
    }
    :global(.mock-other-img) {
        height: 60px;
        background: rgba(255,255,255,0.04);
        background-image: linear-gradient(135deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 75%, transparent 75%);
        background-size: 12px 12px;
    }
    :global(.mock-other-cta) {
        padding: 0.3rem; text-align: center;
        color: white; font-size: 0.6rem; font-weight: 700;
    }
    :global(.desktop-ad) {
        display: block; border-radius: 0.6rem; overflow: hidden;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3); cursor: pointer;
    }
    :global(.ad-img-wrap) { position: relative; overflow: hidden; }
    :global(.ad-img) {
        width: 100%; height: 100%; object-fit: cover;
        transition: opacity 1500ms ease;
    }
    :global(.ad-logo) {
        position: absolute; top: 6px; right: 6px;
        width: 32px; height: 32px; border-radius: 6px;
        background: white; padding: 3px; object-fit: contain;
        z-index: 5;
    }
    :global(.hover-overlay) {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 0.75rem; text-align: center; transition: opacity 1500ms ease;
        pointer-events: none;
    }
    :global(.hover-title) { color: white; font-weight: 700; font-size: 0.95rem; margin: 0 0 0.4rem; }
    :global(.hover-text)  { color: rgb(229,231,235); font-size: 0.7rem; line-height: 1.4; margin: 0; }
    :global(.ad-cta) { padding: 0.65rem; text-align: center; }
    :global(.ad-cta p) { color: white; font-weight: 700; font-size: 0.72rem; line-height: 1.3; margin: 0; }

    /* ============== PRO AD STYLE — diagonal banner with overlaid title ============== */
    :global(.pro-img-wrap) { position: relative; overflow: hidden; }

    /* Diagonal color band — covers the bottom portion of the image at an angle */
    :global(.pro-diag) {
        position: absolute; inset: 0;
        clip-path: polygon(0 55%, 100% 30%, 100% 100%, 0 100%);
        opacity: 0.96;
        transition: opacity 1500ms ease;
        pointer-events: none;
    }
    /* Subtle white-shine streak across the diagonal */
    :global(.pro-diag::after) {
        content: "";
        position: absolute; inset: 0;
        background: linear-gradient(125deg, transparent 30%, rgba(255,255,255,0.18) 45%, transparent 60%);
        pointer-events: none;
    }
    /* Decorative thin white line right where the diagonal cuts (extra polish) */
    :global(.pro-img-wrap::before) {
        content: "";
        position: absolute; inset: 0;
        background: linear-gradient(to bottom right, transparent 49.5%, rgba(255,255,255,0.6) 49.7%, rgba(255,255,255,0.6) 50%, transparent 50.2%);
        clip-path: polygon(0 53%, 100% 28%, 100% 33%, 0 58%);
        pointer-events: none; z-index: 3;
        opacity: 0.5;
    }

    :global(.pro-title-wrap) {
        position: absolute; left: 0; right: 0; bottom: 0;
        padding: 0.85rem 0.85rem 0.6rem;
        z-index: 4;
        text-align: right;
        transition: opacity 1500ms ease;
    }
    :global(.pro-title-wrap.mobile) {
        padding: 1rem 1rem 0.75rem;
    }
    :global(.pro-title) {
        color: white; font-weight: 900;
        font-size: 0.95rem; line-height: 1.15;
        margin: 0 0 0.2rem;
        text-shadow: 0 2px 8px rgba(0,0,0,0.7), 0 1px 2px rgba(0,0,0,0.9);
        letter-spacing: -0.02em;
    }
    :global(.pro-title-wrap.mobile .pro-title) {
        font-size: 1.15rem;
    }
    :global(.pro-sub) {
        color: rgba(255,255,255,0.95); font-weight: 600;
        font-size: 0.7rem; line-height: 1.3; margin: 0;
        text-shadow: 0 1px 4px rgba(0,0,0,0.6);
    }
    :global(.pro-title-wrap.mobile .pro-sub) {
        font-size: 0.82rem;
    }

    /* ============== LANDING MOCK ============== */
    :global(.landing-mock) {
        width: 100%; max-width: 720px; background: #0f172a;
        border-radius: 0.85rem; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    }
    :global(.landing-hero) {
        position: relative; padding: 2.5rem 1.5rem; text-align: center; min-height: 220px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        overflow: hidden;
    }
    :global(.landing-hero-bg) {
        position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
        opacity: 0.35;
    }
    :global(.landing-hero-overlay) {
        position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,0,0,0.5), rgba(0,0,0,0.2));
    }
    :global(.landing-hero-content) { position: relative; z-index: 2; max-width: 480px; }
    :global(.landing-logo) {
        width: 60px; height: 60px; border-radius: 0.85rem; background: white;
        padding: 6px; object-fit: contain; margin: 0 auto 0.85rem;
    }
    :global(.landing-hero h1) { color: white; font-size: 1.85rem; font-weight: 900; margin: 0 0 0.5rem; }
    :global(.landing-hero p)  { color: rgba(255,255,255,0.92); font-size: 1rem; margin: 0 0 1.25rem; line-height: 1.45; }
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

    /* ============== Checklist ============== */
    :global(.checklist) {
        list-style: none; padding: 0; margin: 0;
        display: grid; grid-template-columns: 1fr; gap: 0.5rem;
    }
    @media (min-width: 640px) {
        :global(.checklist) { grid-template-columns: 1fr 1fr; }
    }
    :global(.checklist li) {
        background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 0.6rem; padding: 0.55rem 0.85rem;
        color: rgb(156,163,175); font-size: 0.875rem;
        display: flex; align-items: center; gap: 0.5rem;
    }
    :global(.checklist li.done) {
        color: rgb(229,231,235);
        background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.25);
    }
</style>

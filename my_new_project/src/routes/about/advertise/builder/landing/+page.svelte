<script lang="ts">
    import { onMount } from "svelte";
    import CameraCapture from "$lib/components/CameraCapture.svelte";
    import { _ } from "svelte-i18n";
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";

    let { data } = $props<{
        data: {
            layoutUser?: { email?: string | null; phone?: string | null; nickname?: string | null } | null;
            isSuperAdmin?: boolean;
        };
    }>();

    // ===== Persistence - same key as the main builder so state shares freely =====
    const LS_KEY = "ad_builder_draft_v1";
    const PAID_KEY = "ad_paid";

    // ===== Access gate (same logic as the main builder) =====
    let accessGranted = $state(false);
    let accessChecked = $state(false);
    let isSuperAdmin = $derived(Boolean(data?.isSuperAdmin));

    type ProductRow = { id: number; name: string; price: string; image: string; description: string };

    // ===== All landing-page fields (editable) =====
    let landingHeadline   = $state<string>("");
    let landingPitch      = $state<string>("");
    let landingExtended   = $state<string>("");
    let landingImage      = $state<string>("");
    let landingAdvantages = $state<[string, string, string]>(["", "", ""]);
    let phone             = $state<string>(data?.layoutUser?.phone ?? "");
    let whatsapp          = $state<string>(data?.layoutUser?.phone ?? "");
    let website           = $state<string>("");
    let email             = $state<string>(data?.layoutUser?.email ?? "");
    let products          = $state<ProductRow[]>([]);
    let uniqueness        = $state<string>("");
    let address           = $state<string>("");
    let hours             = $state<string>("");
    let nextProductId     = 1;

    // ===== Read-only fields used in the preview (filled in earlier steps) =====
    let title       = $state<string>("");
    let subtitle    = $state<string>("");
    let hoverText   = $state<string>("");
    let cta         = $state<string>("הקלק לפרטים והזמנות");
    let mainImage   = $state<string>("");
    let logo        = $state<string>("");
    let logoShape   = $state<"square" | "circle">("square");
    let gradient    = $state<string>("from-amber-500 to-orange-600");

    // ===== Drag state =====
    let isDraggingLandingImage = $state(false);
    let draggingProductId = $state<number | null>(null);

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

    async function processImageFile(file: File | null | undefined, target: "landing" | { kind: "product"; id: number }) {
        if (!file) return;
        if (!file.type.startsWith("image/")) { alert($_("advertise.b_upload_image_file")); return; }
        const MAX_BYTES = 5 * 1024 * 1024;
        const { dataUrl, wasCompressed, originalMB, finalMB } = await compressImageToFit(file, MAX_BYTES);
        if (wasCompressed) showCompressNotice(originalMB, finalMB);
        if (target === "landing") {
            landingImage = dataUrl;
        } else {
            const idx = products.findIndex(p => p.id === target.id);
            if (idx >= 0) {
                products[idx] = { ...products[idx], image: dataUrl };
                products = [...products];
            }
        }
    }
    async function handleLandingImage(e: Event) {
        const f = (e.target as HTMLInputElement).files?.[0];
        await processImageFile(f, "landing");
    }
    async function handleProductImage(e: Event, id: number) {
        const f = (e.target as HTMLInputElement).files?.[0];
        await processImageFile(f, { kind: "product", id });
    }
    function clearLandingImage() { landingImage = ""; }

    function dragOverLanding(e: DragEvent) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault(); e.stopPropagation();
        isDraggingLandingImage = true;
    }
    function dragLeaveLanding(e: DragEvent) {
        e.preventDefault(); e.stopPropagation();
        isDraggingLandingImage = false;
    }
    async function dropLanding(e: DragEvent) {
        e.preventDefault(); e.stopPropagation();
        isDraggingLandingImage = false;
        const f = e.dataTransfer?.files?.[0];
        await processImageFile(f, "landing");
    }
    function dragOverProduct(e: DragEvent, id: number) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault(); e.stopPropagation();
        draggingProductId = id;
    }
    function dragLeaveProduct(e: DragEvent) {
        e.preventDefault(); e.stopPropagation();
        draggingProductId = null;
    }
    async function dropProduct(e: DragEvent, id: number) {
        e.preventDefault(); e.stopPropagation();
        draggingProductId = null;
        const f = e.dataTransfer?.files?.[0];
        await processImageFile(f, { kind: "product", id });
    }

    function addProduct() {
        products = [...products, { id: nextProductId++, name: "", price: "", image: "", description: "" }];
    }
    function removeProduct(id: number) {
        products = products.filter(p => p.id !== id);
    }

    // ===== Load draft from localStorage on mount =====
    function checkAccess() {
        if (!browser) return;
        const paid = localStorage.getItem(PAID_KEY) === "1";
        // פטור מלא עם קוד מבצע ההשקה בדף התשלום מסמן paid - אין מעקף נוסף
        accessGranted = isSuperAdmin || paid;
        accessChecked = true;
    }

    onMount(() => {
        if (!browser) return;
        checkAccess();

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
                landingHeadline = d.landingHeadline ?? "";
                landingPitch    = d.landingPitch    ?? "";
                landingExtended = d.landingExtended ?? "";
                landingImage    = d.landingImage    ?? "";
                if (Array.isArray(d.landingAdvantages)) {
                    landingAdvantages = [
                        d.landingAdvantages[0] ?? "",
                        d.landingAdvantages[1] ?? "",
                        d.landingAdvantages[2] ?? "",
                    ];
                }
                phone     = d.phone    ?? phone;
                whatsapp  = d.whatsapp ?? whatsapp;
                website   = d.website  ?? "";
                email     = d.email    ?? email;
                products  = Array.isArray(d.products) ? d.products : [];
                nextProductId = (products.reduce((m, p) => Math.max(m, p.id), 0) || 0) + 1;
                uniqueness = d.uniqueness ?? "";
                address    = d.address    ?? "";
                hours      = d.hours      ?? "";

                title     = d.title     ?? "";
                subtitle  = d.subtitle  ?? "";
                hoverText = d.hoverText ?? "";
                cta       = d.cta       ?? cta;
                mainImage = d.mainImage ?? "";
                logo      = d.logo      ?? "";
                logoShape = d.logoShape ?? "square";
                gradient  = d.gradient  ?? gradient;
            }
        } catch {}

        return () => {
            window.removeEventListener("dragover", blockOutsideDrop);
            window.removeEventListener("drop", blockOutsideDrop);
        };
    });

    // ===== Persist all editable fields back to the same draft =====
    $effect(() => {
        if (!browser) return;
        try {
            const raw = localStorage.getItem(LS_KEY);
            const cur = raw ? JSON.parse(raw) : {};
            const merged = {
                ...cur,
                landingHeadline, landingPitch, landingExtended, landingImage, landingAdvantages,
                phone, whatsapp, website, email,
                products, uniqueness, address, hours,
            };
            localStorage.setItem(LS_KEY, JSON.stringify(merged));
        } catch {}
    });

    // ===== Validation + submit =====
    let canSubmit = $derived(
        Boolean(mainImage && title && subtitle && hoverText && (phone || website) && (landingHeadline || landingPitch))
    );
    let submitting = $state(false);
    let submitted  = $state(false);

    let submitError = $state<string>("");

    // Extract a user-facing message from a failed server response. Server errors
    // in this project are Hebrew strings inside a JSON body ({ message } from
    // SvelteKit error(), sometimes { error }). Anything else - raw JSON, English
    // text like "Internal Error", or an unparseable body - must never reach the
    // user, so we fall back to a friendly Hebrew message instead.
    async function extractServerError(res: Response): Promise<string> {
        let serverMsg = "";
        try {
            const body = await res.json();
            if (typeof body?.message === "string") serverMsg = body.message;
            else if (typeof body?.error === "string") serverMsg = body.error;
        } catch {}
        serverMsg = serverMsg.trim();
        // Only show it if it looks like a deliberate Hebrew message (contains
        // Hebrew letters); otherwise it's technical/English - use the generic text.
        if (serverMsg && /[\u0590-\u05FF]/.test(serverMsg)) return serverMsg;
        return $_("advertise.l_err_generic");
    }

    async function submitAd() {
        if (!canSubmit || submitting) return;
        submitting = true;
        submitError = "";
        try {
            const payload = {
                title, subtitle, hoverText, cta, gradient,
                logo, mainImage,
                landing: { headline: landingHeadline, pitch: landingPitch, extended: landingExtended, image: landingImage, advantages: landingAdvantages, uniqueness, phone, whatsapp, website, email, address, hours, products },
            };
            const res = await fetch("/api/ads/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                throw new Error(await extractServerError(res));
            }
            submitted = true;
        } catch (e) {
            // fetch rejects with a TypeError ("Failed to fetch") on a network
            // failure - show a Hebrew connectivity message instead of English.
            if (e instanceof TypeError) {
                submitError = $_("advertise.l_err_network");
            } else if (e instanceof Error && e.message) {
                submitError = e.message;
            } else {
                submitError = $_("advertise.l_err_generic");
            }
        } finally {
            submitting = false;
        }
    }

    function goBack() { goto("/about/advertise/builder"); }
</script>

<svelte:head>
    <title>עריכת דף נחיתה - בונה הפרסומות</title>
</svelte:head>

<div class="ad-builder max-w-5xl mx-auto px-4 py-8 md:py-12" dir="rtl">

    {#if accessChecked && !accessGranted}
        <div class="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-6 text-center">
            <h1 class="text-xl font-black text-amber-300 mb-2">{$_("advertise.l_gate_title")}</h1>
            <p class="text-sm text-gray-300 mb-4">{$_("advertise.l_gate_body")}</p>
            <button type="button" onclick={goBack}
                    class="px-5 py-2.5 rounded-xl bg-amber-500 text-black font-bold">
                {$_("advertise.l_back_builder")}
            </button>
        </div>
    {:else if accessGranted}

        {#if compressNotice.visible}
            <div class="compress-toast" role="status" aria-live="polite">
                <button type="button" class="compress-toast-close" onclick={dismissCompressNotice} aria-label={$_("advertise.close")}>✕</button>
                <p class="text-sm text-amber-100 font-bold m-0">
                    {$_("advertise.l_ct_compressed", { values: { a: compressNotice.originalMB.toFixed(1), b: compressNotice.finalMB.toFixed(1) } })}
                </p>
            </div>
        {/if}

        <!-- ===== Page header ===== -->
        <header class="text-center mb-8">
            <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 mb-4">
                <span class="text-amber-300 text-xs font-bold tracking-wider">{$_("advertise.l_badge")}</span>
            </div>
            <h1 class="text-3xl md:text-4xl font-black text-white mb-3">{$_("advertise.l_title")}</h1>
            <p class="text-gray-300 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                {$_("advertise.l_intro")}
            </p>
            <div class="mt-4">
                <button type="button" onclick={goBack}
                        class="text-xs text-gray-400 hover:text-amber-300 transition-colors">
                    {$_("advertise.l_back_edit")}
                </button>
            </div>
        </header>

        {#if !submitted}

        <!-- =================== STEP 1: LANDING LINK / CONTACT =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">1</span>
                <h2>{$_("advertise.l_s1_title")}</h2>
            </div>
            <p class="step-help">{$_("advertise.l_s1_help")}</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label class="field-label">{$_("advertise.l_phone")}</label>
                    <input type="tel" bind:value={phone} placeholder="050-1234567" class="text-input" />
                </div>
                <div>
                    <label class="field-label">{$_("advertise.l_whatsapp")}</label>
                    <input type="tel" bind:value={whatsapp} placeholder="050-1234567" class="text-input" />
                </div>
                <div>
                    <label class="field-label">{$_("advertise.l_website")}</label>
                    <input type="url" bind:value={website} placeholder="https://my-site.co.il" class="text-input" />
                </div>
                <div>
                    <label class="field-label">{$_("advertise.l_email")}</label>
                    <input type="email" bind:value={email} placeholder="me@example.com" class="text-input" />
                </div>

                <div class="md:col-span-2">
                    <label class="field-label">{$_("advertise.l_headline_label")}</label>
                    <input type="text" bind:value={landingHeadline} placeholder={$_("advertise.l_headline_ph")} class="text-input" />
                </div>
                <div class="md:col-span-2">
                    <label class="field-label">{$_("advertise.l_pitch_label")}</label>
                    <textarea bind:value={landingPitch} rows="3" placeholder={$_("advertise.l_pitch_ph")} class="text-input"></textarea>
                </div>
                <div class="md:col-span-2">
                    <label class="field-label">{$_("advertise.l_extended_label")}</label>
                    <p class="text-xs text-gray-400 mb-1.5 leading-relaxed">
                        {$_("advertise.l_extended_help")}
                    </p>
                    <textarea bind:value={landingExtended} rows="8"
                              placeholder={$_("advertise.l_extended_ph")}
                              class="text-input"></textarea>
                </div>

                <div class="md:col-span-2">
                    <label class="field-label">{$_("advertise.l_image_label")}</label>
                    <p class="text-xs text-gray-400 mb-2 leading-relaxed">
                        {$_("advertise.l_image_help")}
                    </p>
                    <label class="upload-zone-sm"
                           class:has-image={!!landingImage}
                           class:dragging={isDraggingLandingImage}
                           ondragover={dragOverLanding}
                           ondragleave={dragLeaveLanding}
                           ondrop={dropLanding}>
                        {#if landingImage}
                            <img src={landingImage} alt={$_("advertise.l_image_alt")} />
                            <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearLandingImage(); }} aria-label={$_("advertise.b_remove_image")}>✕</button>
                        {:else}
                            <div class="text-center">
                                <div class="text-2xl mb-1">{isDraggingLandingImage ? "✨" : "🖼️"}</div>
                                <p class="text-xs font-bold text-gray-300">{isDraggingLandingImage ? $_("advertise.b_release") : $_("advertise.l_upload_image")}</p>
                            </div>
                        {/if}
                        <input type="file" accept="image/*" onchange={handleLandingImage} class="hidden" />
                    </label>
                    <CameraCapture onfiles={(files) => processImageFile(files[0], "landing")} class="mt-2 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-white/15 hover:border-amber-400/60 bg-white/5 hover:bg-amber-500/10 text-gray-200 hover:text-white text-sm font-bold transition-all cursor-pointer" />
                </div>

                <div class="md:col-span-2">
                    <label class="field-label">{$_("advertise.l_adv_label")}</label>
                    <p class="text-xs text-gray-400 mb-2 leading-relaxed">
                        {$_("advertise.l_adv_help_pre")} <strong class="text-amber-300">{$_("advertise.l_adv_help_strong")}</strong> {$_("advertise.l_adv_help_post")}
                    </p>
                    <div class="space-y-2">
                        <input type="text" bind:value={landingAdvantages[0]} maxlength="80"
                               placeholder={$_("advertise.l_adv1_ph")} class="text-input" />
                        <input type="text" bind:value={landingAdvantages[1]} maxlength="80"
                               placeholder={$_("advertise.l_adv2_ph")} class="text-input" />
                        <input type="text" bind:value={landingAdvantages[2]} maxlength="80"
                               placeholder={$_("advertise.l_adv3_ph")} class="text-input" />
                    </div>
                </div>
            </div>
        </section>

        <!-- =================== STEP 2: PRODUCTS =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">2</span>
                <h2>{$_("advertise.l_s2_title")}</h2>
            </div>
            <p class="step-help">{$_("advertise.l_s2_help")}</p>

            <div class="space-y-3">
                {#each products as p, idx (p.id)}
                    <div class="product-row">
                        <label class="upload-zone-sm"
                               class:has-image={!!p.image}
                               class:dragging={draggingProductId === p.id}
                               ondragover={(e) => dragOverProduct(e, p.id)}
                               ondragleave={dragLeaveProduct}
                               ondrop={(e) => dropProduct(e, p.id)}>
                            {#if p.image}
                                <img src={p.image} alt={p.name} />
                            {:else}
                                <div class="text-center text-xs text-gray-400">
                                    {#if draggingProductId === p.id}✨<br/>{$_("advertise.b_release")}{:else}📷<br/>{$_("advertise.l_photo")}{/if}
                                </div>
                            {/if}
                            <input type="file" accept="image/*" onchange={(e) => handleProductImage(e, p.id)} class="hidden" />
                        </label>
                        <CameraCapture onfiles={(files) => processImageFile(files[0], { kind: 'product', id: p.id })} compact class="shrink-0 inline-flex items-center justify-center px-2.5 py-2 rounded-lg border border-white/15 hover:border-amber-400/60 bg-white/5 hover:bg-amber-500/10 text-gray-300 hover:text-white transition-all cursor-pointer" />
                        <div class="grow grid grid-cols-1 md:grid-cols-3 gap-2">
                            <input type="text" bind:value={products[idx].name} placeholder={$_("advertise.l_product_name_ph")} class="text-input small" />
                            <input type="text" bind:value={products[idx].price} placeholder={$_("advertise.l_price_ph")} class="text-input small" />
                            <input type="text" bind:value={products[idx].description} placeholder={$_("advertise.l_desc_ph")} class="text-input small" />
                        </div>
                        <button type="button" onclick={() => removeProduct(p.id)} class="remove-btn" aria-label={$_("advertise.remove")}>✕</button>
                    </div>
                {/each}
            </div>

            {#if products.length < 3}
                <button type="button" onclick={addProduct}
                    class="mt-3 w-full py-3 rounded-xl border-2 border-dashed border-amber-500/40 bg-amber-500/5 text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/70 font-bold text-sm transition-colors">
                    {$_("advertise.l_add_product")}
                </button>
            {/if}
        </section>

        <!-- =================== STEP 3: UNIQUENESS =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">3</span>
                <h2>{$_("advertise.l_s3_title")}</h2>
            </div>
            <p class="step-help">
                🌟 <strong class="text-amber-300">{$_("advertise.l_s3_help_strong")}</strong>
                {$_("advertise.l_s3_help")}
            </p>

            <textarea bind:value={uniqueness} rows="5" maxlength="500"
                      placeholder={$_("advertise.l_uniq_ph")}
                      class="text-input"></textarea>
            <div class="text-xs text-gray-500 mt-1 text-left">{uniqueness.length}/500</div>
        </section>

        <!-- =================== STEP 4: ADDRESS =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">4</span>
                <h2>{$_("advertise.l_s4_title")}</h2>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="md:col-span-2">
                    <label class="field-label">{$_("advertise.l_address_label")}</label>
                    <input type="text" bind:value={address}
                           placeholder={$_("advertise.l_address_ph")} class="text-input" />
                </div>
                <div class="md:col-span-2">
                    <label class="field-label">{$_("advertise.l_hours_label")}</label>
                    <input type="text" bind:value={hours}
                           placeholder={$_("advertise.l_hours_ph")} class="text-input" />
                </div>
            </div>
        </section>

        <!-- =================== LIVE PREVIEW =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">🔍</span>
                <h2>{$_("advertise.l_preview_title")}</h2>
            </div>
            <p class="step-help">{$_("advertise.l_preview_help")}</p>

            <div class="preview-frame landing">
                <div class="landing-mock">
                    <header class="landing-hero bg-gradient-to-br {gradient}">
                        {#if landingImage || mainImage}
                            <img src={landingImage || mainImage} alt={title} class="landing-hero-bg" />
                        {/if}
                        <div class="landing-hero-overlay"></div>
                        {#if logo}
                            <img src={logo} alt={$_("advertise.b_logo_alt")} class="landing-logo {logoShape === 'circle' ? 'landing-logo-circle' : ''}" />
                        {/if}
                        <div class="landing-hero-content">
                            <h1>{landingHeadline || title || $_("advertise.l_ph_headline")}</h1>
                            <p>{landingPitch || subtitle || $_("advertise.l_ph_pitch")}</p>
                            {#if phone}
                                <a href="tel:{phone}" class="landing-cta">📞 {phone}</a>
                            {:else if website}
                                <a href={website} class="landing-cta">{$_("advertise.l_to_site")}</a>
                            {:else}
                                <span class="landing-cta opacity-60">{$_("advertise.l_complete_contact")}</span>
                            {/if}
                        </div>
                    </header>

                    {#if landingAdvantages.some(a => a.trim())}
                        <section class="landing-section landing-advantages">
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
                            <h2>{$_("advertise.l_our_story")}</h2>
                            <p style="white-space: pre-line">{landingExtended}</p>
                        </section>
                    {/if}

                    {#if uniqueness}
                        <section class="landing-section">
                            <h2>{$_("advertise.l_why_us")}</h2>
                            <p style="white-space: pre-line">{uniqueness}</p>
                        </section>
                    {/if}

                    {#if products.length > 0}
                        <section class="landing-section">
                            <h2>{$_("advertise.l_our_products")}</h2>
                            <div class="products-grid">
                                {#each products as p}
                                    <div class="product-card">
                                        {#if p.image}
                                            <img src={p.image} alt={p.name} />
                                        {:else}
                                            <div class="img-placeholder small">{$_("advertise.l_photo")}</div>
                                        {/if}
                                        <div class="product-info">
                                            <p class="product-name">{p.name || $_("advertise.l_ph_product_name")}</p>
                                            {#if p.description}<p class="product-desc">{p.description}</p>{/if}
                                            {#if p.price}<p class="product-price">₪{p.price}</p>{/if}
                                        </div>
                                    </div>
                                {/each}
                            </div>
                        </section>
                    {/if}

                    <section class="landing-section landing-contact">
                        <h2>{$_("advertise.l_contact")}</h2>
                        <ul>
                            {#if phone}<li>📞 <a href="tel:{phone}">{phone}</a></li>{/if}
                            {#if whatsapp}<li>💬 <a href="https://wa.me/{whatsapp.replace(/\D/g,'')}">{$_("advertise.l_wa_label", { values: { phone: whatsapp } })}</a></li>{/if}
                            {#if email}<li>✉️ <a href="mailto:{email}">{email}</a></li>{/if}
                            {#if website}<li>🌐 <a href={website} target="_blank" rel="noopener">{website}</a></li>{/if}
                            {#if address}<li>📍 {address}</li>{/if}
                            {#if hours}<li>🕒 {hours}</li>{/if}
                        </ul>
                    </section>
                </div>
            </div>
        </section>

        <!-- =================== SUBMIT =================== -->
        <section class="step-card">
            <div class="step-head">
                <span class="step-num">✓</span>
                <h2>{$_("advertise.l_final_title")}</h2>
            </div>

            <ul class="checklist">
                <li class:done={!!mainImage}><span>{mainImage ? "✅" : "⬜"}</span> {$_("advertise.b_main_image_alt")}</li>
                <li class:done={!!title}><span>{title ? "✅" : "⬜"}</span> {$_("advertise.b_s3_title")}</li>
                <li class:done={!!subtitle}><span>{subtitle ? "✅" : "⬜"}</span> {$_("advertise.cl_subtitle")}</li>
                <li class:done={!!hoverText}><span>{hoverText ? "✅" : "⬜"}</span> {$_("advertise.cl_hover")}</li>
                <li class:done={!!(phone || website)}><span>{(phone || website) ? "✅" : "⬜"}</span> {$_("advertise.cl_channel")}</li>
                <li class:done={products.length > 0}><span>{products.length > 0 ? "✅" : "⬜"}</span> {$_("advertise.cl_products", { values: { n: products.length } })}</li>
                <li class:done={!!uniqueness}><span>{uniqueness ? "✅" : "⬜"}</span> {$_("advertise.cl_unique")}</li>
                <li class:done={!!address}><span>{address ? "✅" : "⬜"}</span> {$_("advertise.cl_address")}</li>
            </ul>

            {#if !canSubmit}
                <p class="text-amber-300 text-sm mt-3 font-bold">{$_("advertise.l_fill_min")}</p>
            {/if}
            {#if submitError}
                <p class="text-red-300 text-sm mt-3 font-bold">{$_("advertise.l_submit_err", { values: { msg: submitError } })}</p>
            {/if}

            <button type="button" onclick={submitAd} disabled={!canSubmit || submitting}
                class="mt-5 w-full py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-black text-lg shadow-xl shadow-green-500/30 transition-all
                       {canSubmit && !submitting ? 'hover:scale-[1.02] active:scale-95' : 'opacity-50 cursor-not-allowed'}">
                {#if submitting}{$_("advertise.sending")}{:else}{$_("advertise.l_submit")}{/if}
            </button>
        </section>

        {:else}
            <!-- =================== DONE =================== -->
            <section class="step-card success-card">
                <div class="text-center py-6">
                    <div class="text-6xl mb-3">🎉</div>
                    <h2 class="text-2xl md:text-3xl font-black text-green-300 mb-2">{$_("advertise.l_done_title")}</h2>
                    <p class="text-gray-300 max-w-lg mx-auto">
                        {$_("advertise.l_done_body")}
                    </p>
                    <div class="mt-6 flex flex-wrap items-center justify-center gap-3">
                        <a href="/" class="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold transition-colors">
                            {$_("advertise.l_home")}
                        </a>
                        <a href="/profile" class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
                            {$_("advertise.l_my_profile")}
                        </a>
                    </div>
                </div>
            </section>
        {/if}

    {/if}
</div>

<style>
    .ad-builder :global(*) { box-sizing: border-box; }

    /* ============== Compress notice toast ============== */
    :global(.compress-toast) {
        position: fixed;
        top: 5rem; left: 50%;
        transform: translateX(-50%);
        z-index: 60;
        width: calc(100% - 1.5rem); max-width: 32rem;
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
        font-size: 0.75rem; line-height: 1;
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
    :global(.success-card) {
        background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.04));
        border-color: rgba(16,185,129,0.4);
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
    :global(.product-row .upload-zone-sm) {
        width: 100px; height: 100px; min-height: 100px; flex-shrink: 0;
    }
    :global(.remove-btn) {
        width: 2rem; height: 2rem; border-radius: 9999px; background: rgba(255,255,255,0.05);
        color: rgb(156, 163, 175); border: 1px solid rgba(255,255,255,0.08);
        cursor: pointer; align-self: center; flex-shrink: 0;
    }
    :global(.remove-btn:hover) { background: rgba(220,38,38,0.6); color: white; }

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

    :global(.advantages-list) {
        list-style: none; padding: 0; margin: 0;
        display: grid; gap: 0.65rem;
        max-width: 540px; margin-inline: auto;
    }
    :global(.advantage-item) {
        display: flex; align-items: center; gap: 0.85rem;
        padding: 0.4rem 0.2rem;
        background: transparent;
        border: 0;
        border-radius: 0;
        transition: transform 200ms ease;
        text-align: right;
    }
    :global(.advantage-item:hover) {
        transform: translateX(-3px);
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

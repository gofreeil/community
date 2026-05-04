<script lang="ts">
    import { onMount } from "svelte";
    import { browser } from "$app/environment";
    import { goto } from "$app/navigation";

    // ===== Page payload (logged-in user prefill + admin status) =====
    let { data } = $props<{
        data: {
            layoutUser?: { email?: string | null; phone?: string | null; nickname?: string | null } | null;
            isSuperAdmin?: boolean;
        };
    }>();

    // ===== Persistence =====
    const LS_KEY = "ad_builder_draft_v1";
    const PAID_KEY = "ad_paid";
    const PAID_AT_KEY = "ad_paid_at";   // ISO timestamp of payment — used to compute free-edit window

    // ===== Access gate state =====
    let accessGranted = $state(false);
    let accessChecked = $state(false);
    let isSuperAdmin = $derived(Boolean(data?.isSuperAdmin));

    // ===== Free-edit window state =====
    let paidAt = $state<Date | null>(null);
    let now = $state(new Date());
    let freeEditUntil = $derived.by(() => {
        if (!paidAt) return null;
        const d = new Date(paidAt);
        d.setHours(23, 59, 59, 999);
        return d;
    });
    let freeMsRemaining = $derived(freeEditUntil ? Math.max(0, freeEditUntil.getTime() - now.getTime()) : 0);
    let freeEditExpired = $derived(Boolean(freeEditUntil) && freeMsRemaining === 0);
    function fmtCountdown(ms: number) {
        const totalMin = Math.floor(ms / 60000);
        const h = Math.floor(totalMin / 60);
        const m = totalMin % 60;
        return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}`;
    }
    function fmtDateShort(d: Date) {
        return d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
    }

    // ===== Form state =====
    type ProductRow = { id: number; name: string; price: string; image: string; description: string };

    let logo            = $state<string>("");                  // base64 data url — what is rendered (cropped circle or original)
    let logoOriginal    = $state<string>("");                  // base64 data url — raw upload kept as cropping source
    let logoShape       = $state<"square" | "circle">("square");
    let hasCircleCrop   = $state<boolean>(false);              // true once user confirmed a circular crop
    let logoPosition    = $state<"right" | "left">("right");

    // ===== Logo circular crop modal =====
    const CROP_STAGE = 320;
    let cropOpen     = $state(false);
    let cropZoom     = $state(1);
    let cropOffsetX  = $state(0);
    let cropOffsetY  = $state(0);
    let cropDragging = false;
    let cropDragStartX = 0, cropDragStartY = 0;
    let cropBaseOffsetX = 0, cropBaseOffsetY = 0;

    function openCropper() {
        if (!logoOriginal) return;
        if (!hasCircleCrop) { cropZoom = 1; cropOffsetX = 0; cropOffsetY = 0; }
        cropOpen = true;
    }
    function cancelCrop() {
        cropOpen = false;
        if (!hasCircleCrop) {
            logoShape = "square";
            if (logoOriginal) logo = logoOriginal;
        }
    }
    async function confirmCrop() {
        if (!logoOriginal) { cropOpen = false; return; }
        const img = new Image();
        img.src = logoOriginal;
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = () => reject(); });

        const stage = CROP_STAGE;
        const aspectImg = img.width / img.height;
        let drawW: number, drawH: number;
        if (aspectImg > 1) { drawW = stage; drawH = stage / aspectImg; }
        else               { drawH = stage; drawW = stage * aspectImg; }

        const canvas = document.createElement("canvas");
        canvas.width = stage; canvas.height = stage;
        const ctx = canvas.getContext("2d")!;
        ctx.save();
        ctx.beginPath();
        ctx.arc(stage / 2, stage / 2, stage / 2, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(stage / 2 + cropOffsetX, stage / 2 + cropOffsetY);
        ctx.scale(cropZoom, cropZoom);
        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        logo = canvas.toDataURL("image/png");
        hasCircleCrop = true;
        cropOpen = false;
    }
    function chooseSquare() {
        logoShape = "square";
        if (logoOriginal) logo = logoOriginal;
    }
    function chooseCircle() {
        logoShape = "circle";
        if (logoOriginal) openCropper();
    }
    function cropPointerDown(e: PointerEvent) {
        cropDragging = true;
        cropDragStartX = e.clientX; cropDragStartY = e.clientY;
        cropBaseOffsetX = cropOffsetX; cropBaseOffsetY = cropOffsetY;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    function cropPointerMove(e: PointerEvent) {
        if (!cropDragging) return;
        cropOffsetX = cropBaseOffsetX + (e.clientX - cropDragStartX);
        cropOffsetY = cropBaseOffsetY + (e.clientY - cropDragStartY);
    }
    function cropPointerUp(e: PointerEvent) {
        cropDragging = false;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
    }
    function cropWheel(e: WheelEvent) {
        e.preventDefault();
        const delta = -e.deltaY * 0.0015;
        cropZoom = Math.max(0.3, Math.min(4, cropZoom + delta));
    }
    let mainImage       = $state<string>("");                  // base64 data url
    let title           = $state<string>("");
    let subtitle        = $state<string>("");
    let hoverText       = $state<string>("");
    let essenceText     = $state<string>("");                  // brief info about product/business
    let cta             = $state<string>("לפרטים נוספים");
    let gradient        = $state<string>("from-amber-500 to-orange-600");
    let landingHeadline = $state<string>("");
    let landingPitch    = $state<string>("");
    let landingExtended = $state<string>("");
    let landingImage    = $state<string>("");                   // separate hero image for landing page
    let landingAdvantages = $state<[string, string, string]>(["", "", ""]); // 3 product/service advantages
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
        | "image" | "logo" | "title" | "subtitle" | "essence"
        | "preview" | "hover" | "landing-link" | "products" | "uniqueness"
        | "address" | "submit" | "done";

    const stepOrder: Step[] = [
        "image", "logo", "title", "subtitle", "essence",
        "preview", "hover", "landing-link", "products", "uniqueness",
        "address", "submit", "done"
    ];

    let activeStep = $state<Step>("image");

    // step -> {numLight, titleLight} flags (one entry per step)
    const litFlags: Record<Step, { num: boolean; title: boolean }> = $state({
        image:        { num: false, title: false },
        logo:         { num: false, title: false },
        title:        { num: false, title: false },
        subtitle:     { num: false, title: false },
        essence:      { num: false, title: false },
        preview:      { num: false, title: false },
        hover:        { num: false, title: false },
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
        image: null, logo: null, title: null, subtitle: null, essence: null,
        preview: null, hover: null, "landing-link": null, products: null, uniqueness: null,
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

    // ===== Drag-and-drop state (visual highlight per zone) =====
    let isDraggingMain = $state(false);
    let isDraggingLogo = $state(false);
    let isDraggingLandingImage = $state(false);
    let draggingProductId = $state<number | null>(null);

    // ===== Image upload helpers =====
    async function fileToDataUrl(file: File): Promise<string> {
        return new Promise((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(fr.result as string);
            fr.onerror = rej;
            fr.readAsDataURL(file);
        });
    }

    // ===== Auto-compress image to fit under maxBytes =====
    // Iteratively reduces JPEG quality, then dimensions, until size fits.
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

    // ===== Compress notice (toast) =====
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

    async function processImageFile(file: File | null | undefined, target: "main" | "logo" | { kind: "product"; id: number }) {
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            alert("נא להעלות קובץ תמונה");
            return;
        }
        const MAX_BYTES = 5 * 1024 * 1024;
        const { dataUrl: url, wasCompressed, originalMB, finalMB } = await compressImageToFit(file, MAX_BYTES);
        if (wasCompressed) showCompressNotice(originalMB, finalMB);
        if (target === "main") {
            mainImage = url;
            if (activeStep === "image") advance("logo");
        } else if (target === "logo") {
            logoOriginal = url;
            logo = url;
            hasCircleCrop = false;
            if (logoShape === "circle") openCropper();
            if (activeStep === "logo") advance("title");
        } else if (target === "landingImage") {
            landingImage = url;
        } else {
            const idx = products.findIndex(p => p.id === target.id);
            if (idx >= 0) {
                products[idx] = { ...products[idx], image: url };
                products = [...products];
            }
        }
    }

    async function handleImage(e: Event, target: "main" | "logo" | "landingImage") {
        const f = (e.target as HTMLInputElement).files?.[0];
        await processImageFile(f, target);
    }

    function clearImage(target: "main" | "logo" | "landingImage") {
        if (target === "main") mainImage = "";
        else if (target === "landingImage") landingImage = "";
        else { logo = ""; logoOriginal = ""; hasCircleCrop = false; }
    }

    async function handleProductImage(e: Event, id: number) {
        const f = (e.target as HTMLInputElement).files?.[0];
        await processImageFile(f, { kind: "product", id });
    }

    // ===== Drag-and-drop handlers =====
    function dragOver(e: DragEvent, setActive: (v: boolean) => void) {
        if (!e.dataTransfer?.types.includes("Files")) return;
        e.preventDefault();
        e.stopPropagation();
        setActive(true);
    }
    function dragLeave(e: DragEvent, setActive: (v: boolean) => void) {
        e.preventDefault();
        e.stopPropagation();
        setActive(false);
    }
    async function handleDrop(e: DragEvent, target: "main" | "logo" | "landingImage" | { kind: "product"; id: number }, setActive: (v: boolean) => void) {
        e.preventDefault();
        e.stopPropagation();
        setActive(false);
        const f = e.dataTransfer?.files?.[0];
        await processImageFile(f, target);
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
        { id: "amber",    label: "כתום-זהב",    cls: "from-amber-500 to-orange-600" },
        { id: "orange",   label: "כתום בוהק",   cls: "from-orange-500 to-red-500" },
        { id: "yellow",   label: "צהוב-זהב",    cls: "from-yellow-400 to-amber-500" },
        { id: "red",      label: "אדום-ורוד",   cls: "from-red-600 to-pink-600" },
        { id: "rose",     label: "ורוד עז",     cls: "from-rose-500 to-fuchsia-600" },
        { id: "crimson",  label: "בורדו",       cls: "from-rose-700 to-red-900" },
        { id: "fuchsia",  label: "פוקסיה",      cls: "from-fuchsia-500 to-purple-600" },
        { id: "purple",   label: "סגול-ורוד",   cls: "from-purple-600 to-pink-600" },
        { id: "violet",   label: "סגול עמוק",   cls: "from-violet-600 to-indigo-700" },
        { id: "indigo",   label: "אינדיגו",     cls: "from-indigo-600 to-blue-600" },
        { id: "blue",     label: "כחול",        cls: "from-blue-600 to-cyan-600" },
        { id: "sky",      label: "תכלת",        cls: "from-sky-400 to-blue-500" },
        { id: "teal",     label: "טורקיז",      cls: "from-teal-500 to-cyan-600" },
        { id: "emerald",  label: "אזמרגד",      cls: "from-emerald-500 to-teal-700" },
        { id: "green",    label: "ירוק",        cls: "from-green-600 to-emerald-600" },
        { id: "lime",     label: "ליים",        cls: "from-lime-400 to-green-500" },
        { id: "slate",    label: "אפור-כסף",    cls: "from-slate-500 to-gray-700" },
        { id: "dark",     label: "שחור-פלדה",   cls: "from-gray-800 to-slate-900" },
    ];

    // ===== Mobile/Desktop preview toggle =====
    let previewMode = $state<"mobile" | "desktop" | "landing">("mobile");
    let hoverPreview = $state(false);

    // ===== Access gate =====
    // Allow entry when one of:
    //   1. Server marked the user as super_admin → unlimited testing access
    //   2. localStorage[PAID_KEY] is set (real flow — set by payment confirmation)
    function checkAccess() {
        if (!browser) return;
        const paid = localStorage.getItem(PAID_KEY) === "1";

        if (isSuperAdmin || paid) {
            accessGranted = true;
        } else {
            accessGranted = false;
        }
        accessChecked = true;
    }

    // ===== Persistence (autosave) =====
    onMount(() => {
        if (!browser) return;
        checkAccess();

        // Prevent the browser from opening a dropped image in a new tab
        // when the user releases outside an upload zone.
        const blockOutsideDrop = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes("Files")) {
                e.preventDefault();
            }
        };
        window.addEventListener("dragover", blockOutsideDrop);
        window.addEventListener("drop", blockOutsideDrop);

        // Load paid-at timestamp; if missing but access is granted, set it now.
        let storedPaidAt = localStorage.getItem(PAID_AT_KEY);
        if (!storedPaidAt && accessGranted) {
            storedPaidAt = new Date().toISOString();
            try { localStorage.setItem(PAID_AT_KEY, storedPaidAt); } catch {}
        }
        if (storedPaidAt) {
            const d = new Date(storedPaidAt);
            if (!isNaN(d.getTime())) paidAt = d;
        }

        // Tick every minute to update the free-edit countdown.
        const tickId = window.setInterval(() => { now = new Date(); }, 60_000);

        // beforeunload — warn the user that their free editing day is running out
        const beforeUnload = (e: BeforeUnloadEvent) => {
            if (!submitted && !freeEditExpired) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", beforeUnload);

        if (!accessGranted) {
            return () => {
                window.removeEventListener("dragover", blockOutsideDrop);
                window.removeEventListener("drop", blockOutsideDrop);
                window.removeEventListener("beforeunload", beforeUnload);
                window.clearInterval(tickId);
            };
        }
        try {
            const raw = localStorage.getItem(LS_KEY);
            if (raw) {
                const d = JSON.parse(raw);
                logo            = d.logo ?? "";
                logoOriginal    = d.logoOriginal ?? d.logo ?? "";
                logoShape       = d.logoShape ?? "square";
                hasCircleCrop   = Boolean(d.hasCircleCrop);
                logoPosition    = d.logoPosition ?? "right";
                mainImage       = d.mainImage ?? "";
                title           = d.title ?? "";
                subtitle        = d.subtitle ?? "";
                hoverText       = d.hoverText ?? "";
                essenceText     = d.essenceText ?? "";
                cta             = d.cta ?? "לפרטים נוספים";
                gradient        = d.gradient ?? gradient;
                landingHeadline = d.landingHeadline ?? "";
                landingPitch    = d.landingPitch ?? "";
                landingExtended = d.landingExtended ?? "";
                landingImage    = d.landingImage ?? "";
                if (Array.isArray(d.landingAdvantages)) {
                    landingAdvantages = [
                        d.landingAdvantages[0] ?? "",
                        d.landingAdvantages[1] ?? "",
                        d.landingAdvantages[2] ?? "",
                    ];
                }
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

        return () => {
            window.removeEventListener("dragover", blockOutsideDrop);
            window.removeEventListener("drop", blockOutsideDrop);
            window.removeEventListener("beforeunload", beforeUnload);
            window.clearInterval(tickId);
        };
    });

    $effect(() => {
        if (!browser) return;
        const snapshot = {
            logo, logoOriginal, hasCircleCrop, logoShape, logoPosition, mainImage, title, subtitle, hoverText, essenceText, cta, gradient,
            landingHeadline, landingPitch, landingExtended, landingImage, landingAdvantages, uniqueness, phone, whatsapp, website,
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
                landing: { headline: landingHeadline, pitch: landingPitch, extended: landingExtended, image: landingImage, advantages: landingAdvantages, uniqueness, phone, whatsapp, website, email, address, hours, products },
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

        <p class="text-xs text-gray-500 mt-6">
            🛡️ למפתחים: הדף פתוח ללא הגבלה רק למחוברים בתפקיד <code class="text-amber-300">super_admin</code>.
        </p>
    </div>
{:else if !accessChecked}
    <!-- Brief loading state to avoid flicker -->
    <div class="min-h-[40vh]" aria-hidden="true"></div>
{:else}
<div class="ad-builder max-w-5xl mx-auto px-4 py-8 md:py-12" dir="rtl">

    <!-- Floating toast: image was auto-compressed -->
    {#if compressNotice.visible}
        <div class="compress-toast" role="status" aria-live="polite">
            <button type="button" class="compress-toast-close" onclick={dismissCompressNotice} aria-label="סגור הודעה">✕</button>
            <div class="flex items-start gap-3">
                <span class="text-3xl flex-shrink-0">🪄</span>
                <div class="flex-1 min-w-0 text-right">
                    <p class="font-black text-amber-200 text-sm md:text-base mb-1">
                        התאמנו את התמונה אוטומטית
                    </p>
                    <p class="text-gray-100 text-xs md:text-sm leading-relaxed">
                        התמונה בפרסומת מוגבלת ל-<strong class="text-amber-200">5 מגה</strong>.
                        העלית תמונה במשקל <strong class="text-amber-200">{compressNotice.originalMB.toFixed(1)} מגה</strong> —
                        כדי שהפרסומת תיטען מהר אצל הגולשים, הקטנו את האיכות שלה אוטומטית
                        ל-<strong class="text-amber-200">{compressNotice.finalMB.toFixed(1)} מגה</strong>.
                        <br/>
                        התמונה נשמרה ככה — אין צורך לעשות כלום.
                    </p>
                </div>
            </div>
        </div>
    {/if}

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

        <!-- Free-edit countdown banner — only when paidAt is known and not expired yet -->
        {#if paidAt && !freeEditExpired && freeEditUntil}
            <div class="mt-5 mx-auto max-w-2xl rounded-2xl border-2 border-amber-500/50 bg-gradient-to-br from-amber-900/25 to-orange-900/15 px-4 py-3 md:px-5 md:py-4 text-right">
                <div class="flex items-start gap-3">
                    <span class="text-3xl flex-shrink-0">⏰</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-black text-amber-300 text-sm md:text-base mb-1">
                            יום העריכה החינמי שלך — נגמר ב-23:59 הערב!
                        </p>
                        <p class="text-gray-200 text-xs md:text-sm leading-relaxed mb-2">
                            נותרו לך <strong class="text-amber-200 text-base">{fmtCountdown(freeMsRemaining)}</strong>
                            (שעות:דקות) לעריכה ללא תשלום נוסף.
                            כדאי <strong class="text-amber-200">לסיים את העריכה היום</strong> —
                            אחרי חצות, זמן העריכה החינמי מסתיים והפרסומת תרוץ עד כולל {fmtDateShort(new Date(paidAt.getTime() + 30*24*60*60*1000))}.
                        </p>
                    </div>
                </div>
            </div>
        {:else if paidAt && freeEditExpired}
            <div class="mt-5 mx-auto max-w-2xl rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 md:px-5 md:py-4 text-right">
                <div class="flex items-start gap-3">
                    <span class="text-2xl flex-shrink-0">⌛</span>
                    <div class="flex-1 min-w-0">
                        <p class="font-black text-red-300 text-sm md:text-base mb-1">
                            יום העריכה החינמי הסתיים
                        </p>
                        <p class="text-gray-200 text-xs md:text-sm leading-relaxed">
                            הטיוטה עדיין שמורה — אך מעבר לחצות של יום התשלום, הזמן שעובר ללא ניצול הוא בזבוז.
                            השלם את העריכה בהקדם!
                        </p>
                    </div>
                </div>
            </div>
        {/if}

        <!-- Autosave callout — explicit resume-from-profile message -->
        <div class="mt-3 mx-auto max-w-2xl rounded-2xl border border-green-500/40 bg-green-500/8 px-4 py-3 md:px-5 md:py-4 text-right">
            <div class="flex items-start gap-3">
                <span class="text-2xl flex-shrink-0">💾</span>
                <div class="flex-1 min-w-0">
                    <p class="font-black text-green-300 text-sm md:text-base mb-1">
                        הטיוטה שלך נשמרת אוטומטית
                    </p>
                    <p class="text-gray-300 text-xs md:text-sm leading-relaxed">
                        אם תיסגר הכרטיסייה או יקרה משהו — אל דאגה. כל מה שמילאת ישמר בדפדפן ובחשבון שלך.
                        <br/>
                        תמיד תוכל לחזור ולהמשיך מהמקום שעצרת — מתוך
                        <a href="/profile" class="text-amber-400 hover:text-amber-300 font-bold underline underline-offset-2">
                            הפרופיל האישי שלך
                        </a>.
                    </p>
                </div>
            </div>
        </div>

        <div class="mt-3 flex items-center justify-center gap-3 text-xs text-gray-500">
            <button type="button" onclick={resetDraft} class="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                איפוס טיוטה והתחלה מחדש
            </button>
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
        <p class="step-help">תמונה איכותית — מוצר, חזית העסק, אווירת השירות. תופיע גם בנייד וגם בדסקטופ. עד 5 מגה — אם תעלו תמונה גדולה יותר נקטין אותה אוטומטית.</p>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Tips first → on RIGHT in RTL grid -->
            <div class="bg-white/3 rounded-2xl border border-white/10 p-4 md:p-6 text-gray-300">
                <p class="font-bold text-amber-400 mb-3 text-base md:text-xl">💡 טיפים לתמונה מנצחת</p>
                <ul class="space-y-2 md:space-y-3 text-[13px] md:text-lg leading-relaxed">
                    <li>✨ צילום ברור עם תאורה טובה</li>
                    <li>🎯 פוקוס על המוצר/שירות — לא רקע מבולגן</li>
                    <li>📐 יחס מומלץ: 4:3 או 16:9 (אופקי)</li>
                    <li>🚫 בלי טקסט מודבק על התמונה — נכתוב טקסט בנפרד</li>
                </ul>
            </div>

            <!-- Upload zone second → on LEFT in RTL grid -->
            <label class="upload-zone"
                   class:has-image={!!mainImage}
                   class:dragging={isDraggingMain}
                   ondragover={(e) => dragOver(e, v => isDraggingMain = v)}
                   ondragleave={(e) => dragLeave(e, v => isDraggingMain = v)}
                   ondrop={(e) => handleDrop(e, "main", v => isDraggingMain = v)}>
                {#if mainImage}
                    <img src={mainImage} alt="תמונה ראשית" />
                    <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage("main"); }} aria-label="הסר תמונה">✕</button>
                {:else}
                    <div class="upload-empty">
                        <div class="text-4xl mb-2">📸</div>
                        <p class="font-bold text-base text-white">
                            {isDraggingMain ? "✨ שחרר כאן" : "לחץ או גרור תמונה לכאן"}
                        </p>
                        <p class="text-xs text-gray-400 mt-1">כל סוגי התמונה — עד 5 מגה (גדול יותר → נקטין אוטומטית)</p>
                    </div>
                {/if}
                <input type="file" accept="image/*" onchange={(e) => handleImage(e, "main")} class="hidden" />
            </label>
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
        <p class="step-help">העלה לוגו — עדיף עם רקע שקוף (PNG). יוצב <strong class="text-amber-300">קטן בפינה</strong> של הפרסומת. אם אין לוגו — דלג.</p>

        <div class="flex items-center gap-3 flex-wrap">
            <label class="upload-zone-sm"
                   class:has-image={!!logo}
                   class:dragging={isDraggingLogo}
                   ondragover={(e) => dragOver(e, v => isDraggingLogo = v)}
                   ondragleave={(e) => dragLeave(e, v => isDraggingLogo = v)}
                   ondrop={(e) => handleDrop(e, "logo", v => isDraggingLogo = v)}>
                {#if logo}
                    <img src={logo} alt="לוגו" />
                    <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage("logo"); }} aria-label="הסר לוגו">✕</button>
                {:else}
                    <div class="text-center">
                        <div class="text-2xl mb-1">{isDraggingLogo ? "✨" : "🏷️"}</div>
                        <p class="text-xs font-bold text-gray-300">{isDraggingLogo ? "שחרר" : "העלה לוגו"}</p>
                    </div>
                {/if}
                <input type="file" accept="image/*" onchange={(e) => handleImage(e, "logo")} class="hidden" />
            </label>

            {#if logo}
                <!-- Logo shape + position controls — placed side-by-side -->
                <div class="flex flex-row flex-wrap gap-2 self-center">
                    <div>
                        <p class="text-xs font-bold text-gray-400 mb-1">צורת חיתוך:</p>
                        <div class="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
                            <button type="button" onclick={chooseSquare}
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                       {logoShape === 'square' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                ⬛ מרובע
                            </button>
                            <button type="button" onclick={chooseCircle}
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                       {logoShape === 'circle' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                ⚫ עגול
                            </button>
                        </div>
                        {#if logoShape === 'circle' && hasCircleCrop}
                            <button type="button" onclick={openCropper}
                                class="mt-1 text-[10px] text-amber-300 hover:text-amber-200 underline">
                                ✂️ ערוך חיתוך
                            </button>
                        {/if}
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-400 mb-1">יוצג בפינה:</p>
                        <div class="inline-flex rounded-lg border border-white/10 bg-black/20 p-1">
                            <button type="button" onclick={() => logoPosition = "right"}
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                       {logoPosition === 'right' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                ⬆️ ימין
                            </button>
                            <button type="button" onclick={() => logoPosition = "left"}
                                class="px-2.5 py-1 rounded-md text-xs font-bold transition-colors
                                       {logoPosition === 'left' ? 'bg-amber-500 text-black' : 'text-gray-300 hover:text-white'}">
                                ⬆️ שמאל
                            </button>
                        </div>
                    </div>
                </div>
            {/if}

            <button type="button" onclick={() => advance("title")}
                    class="px-4 py-2 rounded-xl text-sm font-bold transition-colors self-center
                           {logo
                               ? 'bg-amber-500 hover:bg-amber-400 text-black border border-amber-400'
                               : 'bg-white/5 border border-white/10 hover:border-amber-500/40 text-gray-300 hover:text-amber-300'}">
                {logo ? "סיימתי, עבור לשלב הבא ←" : "דלג שלב זה →"}
            </button>
        </div>

        <!-- ===== Circular crop modal ===== -->
        {#if cropOpen}
            <div class="crop-modal-bg" role="dialog" aria-modal="true" aria-label="חיתוך לוגו לעיגול">
                <div class="crop-modal">
                    <div class="crop-modal-head">
                        <h3>חיתוך הלוגו לעיגול</h3>
                        <button type="button" class="crop-modal-x" onclick={cancelCrop} aria-label="סגור">✕</button>
                    </div>
                    <p class="crop-help">גרור את התמונה לכל כיוון, וזום פנימה/החוצה. החלק שבתוך העיגול הוא מה שיוצג.</p>
                    <div class="crop-stage"
                         onpointerdown={cropPointerDown}
                         onpointermove={cropPointerMove}
                         onpointerup={cropPointerUp}
                         onpointercancel={cropPointerUp}
                         onwheel={cropWheel}>
                        <img src={logoOriginal} alt="לוגו" class="crop-img" draggable="false"
                             style:transform="translate({cropOffsetX}px, {cropOffsetY}px) scale({cropZoom})" />
                        <div class="crop-circle-mask"></div>
                    </div>
                    <div class="crop-controls">
                        <span class="crop-zoom-label">🔍 זום</span>
                        <input type="range" min="0.3" max="4" step="0.01" bind:value={cropZoom} class="crop-zoom-slider" aria-label="רמת זום" />
                        <span class="crop-zoom-val">{Math.round(cropZoom * 100)}%</span>
                    </div>
                    <div class="crop-actions">
                        <button type="button" class="crop-btn-cancel" onclick={cancelCrop}>ביטול</button>
                        <button type="button" class="crop-btn-confirm" onclick={confirmCrop}>✓ אשר חיתוך</button>
                    </div>
                </div>
            </div>
        {/if}
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
        <div class="flex items-center justify-between gap-2 text-xs text-gray-500 mt-2">
            {#if title}
                <button type="button" onclick={() => commitField("title")}
                    class="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-bold transition-colors">
                    המשך לכותרת משנה ←
                </button>
            {:else}
                <span></span>
            {/if}
            <span>{title.length}/35</span>
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
        <div class="flex items-center justify-between gap-2 text-xs text-gray-500 mt-2">
            {#if subtitle}
                <button type="button" onclick={() => commitField("subtitle")}
                    class="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-bold transition-colors">
                    המשך ←
                </button>
            {:else}
                <span></span>
            {/if}
            <span>{subtitle.length}/70</span>
        </div>
    </section>

    <!-- =================== STEP 5: CALL TO ACTION =================== -->
    <section bind:this={stepRefs.essence} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.essence.title}>
            <span class="step-num" class:step-num-light={litFlags.essence.num}>5</span>
            <h2>📣 קריאה לפעולה — מה תגרום לגולש ללחוץ?</h2>
            {#if activeStep === "essence" && !essenceText}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">
            <strong class="text-amber-300">משפט אחד קצר ופעיל</strong> שמזמין את הגולש ללחוץ —
            לא פרטים טכניים ולא רשימת תכונות, אלא הזמנה לחוות / לגלות / להצטרף.
            <br/>
            <span class="text-gray-500">דוגמאות: "הקלק כדי להכיר את השמפו החדש!" · "גלה את הטעם של פיצה איטלקית אמיתית" · "קליק אחד והגנת טרמפיסטים בכף היד שלך"</span>
        </p>

        <textarea bind:value={essenceText} maxlength="120" rows="2"
                  onfocus={() => activeStep === "essence" || (activeStep = "essence")}
                  onblur={() => essenceText.trim() && commitField("essence")}
                  placeholder="לדוגמה: הקלק כדי להכיר את השמפו החדש!"
                  class="text-input"></textarea>

        <div class="flex items-center justify-between gap-2 text-xs text-gray-500 mt-2">
            {#if essenceText}
                <button type="button" onclick={() => commitField("essence")}
                    class="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-bold transition-colors">
                    המשך לתצוגה מקדימה ←
                </button>
            {:else}
                <span></span>
            {/if}
            <span>{essenceText.length}/120</span>
        </div>
    </section>

    <!-- =================== STEP 6: PREVIEW =================== -->
    <section bind:this={stepRefs.preview} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.preview.title}>
            <span class="step-num" class:step-num-light={litFlags.preview.num}>6</span>
            <h2>תצוגה מקדימה — איך זה יראה לגולשים?</h2>
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

        <div class="preview-with-rail">
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
                                    <img src={logo} alt="לוגו"
                                         class="popup-logo {logoShape === 'circle' ? 'popup-logo-circle' : ''} {logoPosition === 'left' ? 'popup-logo-left' : 'popup-logo-right'}" />
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

        <!-- ===== DESKTOP PREVIEW — real site screenshot with user's ad overlaid on right slot ===== -->
        {#if previewMode === "desktop"}
            <div class="preview-frame desktop">
                <div class="site-shot-frame" dir="rtl">
                    <!-- Inner element holds the screenshot at its natural aspect.
                         The frame above clips overflow so the LEFT ad strip and the
                         BOTTOM map area are hidden — leaving only the central content
                         where the user's ad sits. -->
                    <div class="site-shot-inner">
                        <!-- Real site screenshot as background -->
                        <img src="/images/advertisement-page/יוצאיםלחירות.png"
                             alt="האתר"
                             class="site-shot" />

                        <!-- User's ad — overlaid on the FIRST right ad slot of the screenshot -->
                        <div
                            role="button"
                            tabindex="0"
                            class="site-shot-overlay desktop-ad pro-ad"
                            onmouseenter={() => hoverPreview = true}
                            onmouseleave={() => hoverPreview = false}
                            onfocus={() => hoverPreview = true}
                            onblur={() => hoverPreview = false}
                        >
                        <div class="ad-img-wrap pro-img-wrap site-shot-overlay-img">
                            {#if mainImage}
                                <img src={mainImage} alt={title}
                                     class="ad-img"
                                     style:opacity={hoverPreview ? 0 : 1} />
                            {:else}
                                <div class="img-placeholder">תמונה</div>
                            {/if}

                            <div class="pro-diag bg-gradient-to-br {gradient}"
                                 style:opacity={hoverPreview ? 0 : 1}></div>

                            <div class="pro-title-wrap" style:opacity={hoverPreview ? 0 : 1}>
                                <h3 class="pro-title">{title || "כותרת ראשית"}</h3>
                                <p class="pro-sub">{subtitle || "סלוגן / כותרת משנה"}</p>
                            </div>

                            <div class="hover-overlay" style:opacity={hoverPreview ? 1 : 0}>
                                <h3 class="hover-title">{title || "כותרת"}</h3>
                                <p class="hover-text">{hoverText || "כאן יופיע הטקסט בריחוף"}</p>
                                {#if essenceText}
                                    <div class="hover-essence">{essenceText}</div>
                                {/if}
                            </div>

                            {#if logo}
                                <img src={logo} alt="לוגו"
                                     class="ad-logo {logoShape === 'circle' ? 'ad-logo-circle' : ''} {logoPosition === 'left' ? 'ad-logo-left' : 'ad-logo-right'}" />
                            {/if}
                        </div>
                        <div class="ad-cta bg-gradient-to-r {gradient}">
                            <p>{cta}</p>
                        </div>
                    </div>
                    </div><!-- /.site-shot-inner -->

                    <!-- "Your ad here" pointer arrow — positioned on the cropper, not inner -->
                    <div class="site-shot-pointer">
                        ← הפרסומת שלך כאן
                    </div>
                </div>
                <p class="preview-caption">📌 כך הפרסומת שלך תיראה באתר האמיתי — בצד ימין מתחת להדר. העבר עכבר עליה לראות את הטקסט בריחוף.</p>
            </div>
        {/if}

        <!-- ===== LANDING PAGE PREVIEW — full mini-site ===== -->
        {#if previewMode === "landing"}
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
                <p class="preview-caption">כך ייראה דף הנחיתה המלא — אליו הגולש יגיע בלחיצה על הפרסומת.</p>
            </div>
        {/if}

            <!-- Color rail — vertical round dots on the visual left (RTL flex-row) -->
            <div class="color-rail" aria-label="בחירת צבע פרסומת">
                {#each palettes as p}
                    <button type="button"
                            onclick={() => (gradient = p.cls)}
                            class="color-dot bg-gradient-to-br {p.cls}"
                            class:selected={gradient === p.cls}
                            title={p.label}
                            aria-label={p.label}
                            aria-pressed={gradient === p.cls}>
                    </button>
                {/each}
            </div>
        </div>

        <div class="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button type="button" onclick={() => advance("hover")}
                class="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black transition-colors">
                נראה מעולה — המשך לטקסט בריחוף →
            </button>
            <a href="https://wa.me/972508750632?text=שלום, אני בונה פרסומת באתר ויש לי בעיה — אני צריך עזרה בעיצוב 🎨"
               target="_blank" rel="noopener noreferrer"
               aria-label="פנייה לעזרה בעיצוב בוואטסאפ"
               class="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/50 text-gray-200 hover:text-amber-300 font-bold transition-colors">
                <span>🆘</span>
                <span>יש לי בעיה ואני צריך עזרה בעיצוב</span>
            </a>
        </div>
    </section>

    <!-- =================== STEP 7: HOVER TEXT =================== -->
    <section bind:this={stepRefs.hover} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.hover.title}>
            <span class="step-num" class:step-num-light={litFlags.hover.num}>7</span>
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
        <div class="flex items-center justify-between gap-2 text-xs text-gray-500 mt-2">
            {#if hoverText}
                <button type="button" onclick={() => commitField("hover")}
                    class="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 hover:text-amber-200 font-bold transition-colors">
                    המשך לדף הנחיתה ←
                </button>
            {:else}
                <span></span>
            {/if}
            <span>{hoverText.length}/90</span>
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

    <!-- =================== STEP 8: LANDING LINK / CONTACT =================== -->
    <section bind:this={stepRefs["landing-link"]} class="step-card">
        <div class="step-head" class:step-title-light={litFlags["landing-link"].title}>
            <span class="step-num" class:step-num-light={litFlags["landing-link"].num}>8</span>
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
                       ondragover={(e) => dragOver(e, v => isDraggingLandingImage = v)}
                       ondragleave={(e) => dragLeave(e, v => isDraggingLandingImage = v)}
                       ondrop={(e) => handleDrop(e, "landingImage", v => isDraggingLandingImage = v)}>
                    {#if landingImage}
                        <img src={landingImage} alt="תמונה לדף נחיתה" />
                        <button type="button" class="remove-x" onclick={(e) => { e.preventDefault(); clearImage("landingImage"); }} aria-label="הסר תמונה">✕</button>
                    {:else}
                        <div class="text-center">
                            <div class="text-2xl mb-1">{isDraggingLandingImage ? "✨" : "🖼️"}</div>
                            <p class="text-xs font-bold text-gray-300">{isDraggingLandingImage ? "שחרר" : "העלה תמונה"}</p>
                        </div>
                    {/if}
                    <input type="file" accept="image/*" onchange={(e) => handleImage(e, "landingImage")} class="hidden" />
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

        <div class="mt-4 text-center">
            <button type="button" onclick={() => advance("products")}
                class="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold transition-colors">
                המשך לתמונות מוצרים ←
            </button>
        </div>
    </section>

    <!-- =================== STEP 9: PRODUCTS =================== -->
    <section bind:this={stepRefs.products} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.products.title}>
            <span class="step-num" class:step-num-light={litFlags.products.num}>9</span>
            <h2>תמונות מוצרים / שירותים + מחירים</h2>
            {#if activeStep === "products"}
                <span class="tutorial-finger" aria-hidden="true">👇</span>
            {/if}
        </div>
        <p class="step-help">הוסף 3-6 מוצרים או שירותים. תמונה איכותית ומחיר ברור הם הדבר הכי משכנע.</p>

        <div class="space-y-3">
            {#each products as p, idx (p.id)}
                <div class="product-row">
                    <label class="upload-zone-sm"
                           class:has-image={!!p.image}
                           class:dragging={draggingProductId === p.id}
                           ondragover={(e) => dragOver(e, v => draggingProductId = v ? p.id : null)}
                           ondragleave={(e) => dragLeave(e, v => draggingProductId = v ? p.id : null)}
                           ondrop={(e) => handleDrop(e, { kind: "product", id: p.id }, v => draggingProductId = v ? p.id : null)}>
                        {#if p.image}
                            <img src={p.image} alt={p.name} />
                        {:else}
                            <div class="text-center text-xs text-gray-400">
                                {#if draggingProductId === p.id}✨<br/>שחרר{:else}📷<br/>תמונה{/if}
                            </div>
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

    <!-- =================== STEP 10: UNIQUENESS =================== -->
    <section bind:this={stepRefs.uniqueness} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.uniqueness.title}>
            <span class="step-num" class:step-num-light={litFlags.uniqueness.num}>10</span>
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

    <!-- =================== STEP 11: ADDRESS =================== -->
    <section bind:this={stepRefs.address} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.address.title}>
            <span class="step-num" class:step-num-light={litFlags.address.num}>11</span>
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

    <!-- =================== STEP 12: SUBMIT =================== -->
    <section bind:this={stepRefs.submit} class="step-card">
        <div class="step-head" class:step-title-light={litFlags.submit.title}>
            <span class="step-num" class:step-num-light={litFlags.submit.num}>12</span>
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

    <!-- =================== STEP 13: DONE =================== -->
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

<!-- Super-admin badge: shows whenever the page granted access via super_admin role -->
{#if accessGranted && isSuperAdmin}
    <div class="fixed top-4 left-1/2 -translate-x-1/2 z-[200] rounded-xl border border-purple-500/50 bg-gray-900/95 px-4 py-2 shadow-2xl backdrop-blur" dir="rtl">
        <p class="text-purple-300 text-xs font-bold flex items-center gap-2">
            <span>🛡️</span>
            <span>מצב סופר-אדמין — גישה ללא הגבלה לבדיקות</span>
        </p>
    </div>
{/if}

<style>
    /* ============== Page-level layout ============== */
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
        animation: compressToastIn 280ms cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    :global(.compress-toast-close) {
        position: absolute;
        top: 0.4rem;
        left: 0.5rem;
        width: 1.6rem;
        height: 1.6rem;
        border-radius: 9999px;
        background: rgba(0, 0, 0, 0.35);
        color: rgba(255, 255, 255, 0.9);
        font-size: 0.75rem;
        line-height: 1;
        display: flex; align-items: center; justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.18);
        cursor: pointer;
        transition: background 0.15s;
    }
    :global(.compress-toast-close:hover) { background: rgba(220, 38, 38, 0.85); }
    @keyframes compressToastIn {
        from { opacity: 0; transform: translate(-50%, -8px); }
        to   { opacity: 1; transform: translate(-50%, 0); }
    }

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
    :global(.upload-zone.dragging) {
        border-color: rgb(34, 197, 94);
        background: rgba(34, 197, 94, 0.1);
        box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.18), 0 0 30px rgba(34, 197, 94, 0.25);
        transform: scale(1.01);
    }

    :global(.upload-zone-sm) {
        position: relative; display: flex; align-items: center; justify-content: center;
        width: 100px; height: 100px; flex-shrink: 0;
        border: 2px dashed rgba(245, 158, 11, 0.4); border-radius: 0.75rem;
        background: rgba(245, 158, 11, 0.04); cursor: pointer; overflow: hidden;
    }
    :global(.upload-zone-sm.has-image) { border-style: solid; padding: 0; }
    :global(.upload-zone-sm img) { width: 100%; height: 100%; object-fit: cover; }
    :global(.upload-zone-sm.dragging) {
        border-color: rgb(34, 197, 94);
        background: rgba(34, 197, 94, 0.12);
        box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.25);
        transform: scale(1.04);
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
    :global(.popup-img > img:not(.popup-logo)) { width: 100%; height: 100%; object-fit: cover; }
    :global(.popup-img-fade) {
        position: absolute; inset: 0;
        background: linear-gradient(to top, rgba(15,23,42,0.95), transparent 50%);
        pointer-events: none;
    }
    :global(.popup-logo) {
        position: absolute !important; top: 8px;
        width: 40px !important; height: 40px !important;
        border-radius: 8px; background: white; padding: 4px;
        object-fit: contain !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        z-index: 5;
    }
    :global(.popup-logo-right) { right: 8px; left: auto; }
    :global(.popup-logo-left)  { left: 8px;  right: auto; }
    :global(.popup-logo-circle) { border-radius: 50% !important; }
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

    /* ============== DESKTOP PREVIEW — real site screenshot with overlay ============== */
    /* The frame is a cropper: it has aspect-ratio matching the VISIBLE region (after we
       hide the left ad strip and bottom map area). overflow:hidden clips the rest. */
    :global(.site-shot-frame) {
        position: relative;
        width: 100%; max-width: 920px;
        aspect-ratio: 1357 / 612;          /* visible portion: 92% × 70% of original 1475×875 */
        overflow: hidden;
        border-radius: 0.85rem;
        border: 1px solid rgba(255,255,255,0.08);
        box-shadow: 0 8px 30px rgba(0,0,0,0.4);
        background: #0f172a;
    }
    /* Inner holds the screenshot at its NATURAL aspect (1475:875). It is anchored to
       the cropper's TOP-RIGHT corner and made wider than the cropper, so its left
       portion is clipped. Its bottom also extends beyond the cropper, hiding the map. */
    :global(.site-shot-inner) {
        position: absolute;
        top: 0;
        right: 0;
        width: calc(100% * 1475 / 1357);   /* ≈ 108.7% — restores full image width */
        aspect-ratio: 1475 / 875;           /* explicit height for child % positioning */
    }
    :global(.site-shot) {
        display: block; width: 100%; height: 100%;
    }
    /* Overlay positioned on the FIRST right ad slot. Percentages are relative to
       .site-shot-inner (which mirrors the original image proportions). The chained
       .desktop-ad selector here defeats the .desktop-ad block-display rule below. */
    :global(.site-shot-overlay.desktop-ad) {
        position: absolute;
        top: 9%;
        right: 1.5%;
        width: 5%;
        height: 60%;
        z-index: 5;
        cursor: pointer;
        border-radius: 4px;
        overflow: hidden;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.6), 0 0 20px rgba(245,158,11,0.6);
        animation: overlayPulse 2.5s ease-in-out infinite;
        display: flex;
        flex-direction: column;
    }
    @keyframes overlayPulse {
        0%, 100% { box-shadow: 0 0 0 2px rgba(255,255,255,0.6), 0 0 20px rgba(245,158,11,0.6); }
        50%      { box-shadow: 0 0 0 3px rgba(255,255,255,0.85), 0 0 28px rgba(245,158,11,0.95); }
    }
    :global(.site-shot-overlay-img) {
        flex: 1 1 0;          /* fills remaining vertical space in the flex column */
        width: 100%;
        height: auto;
        aspect-ratio: auto;   /* override pro-img-wrap default */
        min-height: 0;
    }
    :global(.site-shot-overlay .ad-cta) { flex: 0 0 auto; padding: 0.25rem; }
    :global(.site-shot-overlay .ad-cta p) { font-size: 0.45rem; line-height: 1.1; }
    :global(.site-shot-overlay .pro-title) { font-size: 0.5rem; line-height: 1.05; margin-bottom: 0.1rem; }
    :global(.site-shot-overlay .pro-sub)   { font-size: 0.38rem; line-height: 1.15; }
    :global(.site-shot-overlay .pro-title-wrap) { padding: 0.3rem 0.35rem 0.2rem; }
    :global(.site-shot-overlay .ad-logo) {
        width: 14px !important; height: 14px !important; padding: 1px;
        top: 2px;
    }
    :global(.site-shot-overlay .ad-logo-right) { right: 2px; }
    :global(.site-shot-overlay .ad-logo-left)  { left: 2px; }
    :global(.site-shot-overlay .hover-title) { font-size: 0.5rem; margin-bottom: 0.15rem; }
    :global(.site-shot-overlay .hover-text)  { font-size: 0.38rem; line-height: 1.2; }
    :global(.site-shot-overlay .hover-essence) { font-size: 0.32rem; padding-top: 0.15rem; margin-top: 0.15rem; }
    :global(.site-shot-overlay .hover-overlay) { padding: 0.25rem; }

    :global(.site-shot-pointer) {
        position: absolute;
        top: 30%;
        right: 9%;
        z-index: 6;
        background: linear-gradient(90deg, rgba(245,158,11,0.95), rgba(217,119,6,0.95));
        color: #000;
        font-size: 0.7rem; font-weight: 900;
        padding: 0.35rem 0.7rem;
        border-radius: 0.4rem;
        white-space: nowrap;
        box-shadow: 0 4px 14px rgba(0,0,0,0.4);
        animation: pointerNudge 1.4s ease-in-out infinite;
    }

    /* Old desktop-mock kept for any leftover refs (will be unused now) */
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

    /* Right ad column — matches real RightAdBanner (w-36 = 144px, slots 490px tall) */
    :global(.mock-right-ad) {
        width: 144px; flex-shrink: 0; position: relative;
    }
    :global(.mock-fixed-ad) {
        margin-top: 0.6rem;
        border-radius: 0.6rem;
        overflow: hidden;
        border: 1px solid rgba(255,255,255,0.07);
        background: #0a1020;
        box-shadow: 0 4px 14px rgba(0,0,0,0.3);
    }
    :global(.mock-fixed-ad img) {
        width: 100%; height: auto; display: block;
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
        position: absolute; top: 6px;
        width: 36px; height: 36px; border-radius: 6px;
        background: white; padding: 3px; object-fit: contain;
        z-index: 5;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    :global(.ad-logo-right) { right: 6px; left: auto; }
    :global(.ad-logo-left)  { left: 6px;  right: auto; }
    :global(.ad-logo-circle) { border-radius: 50%; }
    :global(.hover-overlay) {
        position: absolute; inset: 0;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        padding: 0.75rem; text-align: center; transition: opacity 1500ms ease;
        pointer-events: none;
    }
    :global(.hover-title) { color: white; font-weight: 700; font-size: 0.95rem; margin: 0 0 0.4rem; }
    :global(.hover-text)  { color: rgb(229,231,235); font-size: 0.7rem; line-height: 1.4; margin: 0 0 0.4rem; font-weight: 700; }
    :global(.hover-essence) {
        color: rgba(255,255,255,0.85); font-size: 0.62rem; line-height: 1.45;
        margin-top: 0.4rem; padding-top: 0.4rem;
        border-top: 1px solid rgba(255,255,255,0.18);
        white-space: pre-line;
    }
    :global(.ad-cta) { padding: 0.65rem; text-align: center; }
    :global(.ad-cta p) { color: white; font-weight: 700; font-size: 0.72rem; line-height: 1.3; margin: 0; }

    /* ============== LOGO CIRCULAR CROP MODAL ============== */
    :global(.crop-modal-bg) {
        position: fixed; inset: 0; z-index: 999;
        background: rgba(0,0,0,0.75);
        display: flex; align-items: center; justify-content: center;
        padding: 1rem;
        backdrop-filter: blur(4px);
    }
    :global(.crop-modal) {
        background: #0f172a;
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 1rem;
        padding: 1.1rem;
        max-width: 95vw;
        width: 380px;
        box-shadow: 0 25px 60px rgba(0,0,0,0.6);
        direction: rtl;
    }
    :global(.crop-modal-head) {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 0.4rem;
    }
    :global(.crop-modal-head h3) {
        color: white; font-weight: 800; font-size: 1.05rem; margin: 0;
    }
    :global(.crop-modal-x) {
        background: transparent; border: none; color: rgba(255,255,255,0.7);
        font-size: 1.1rem; cursor: pointer; padding: 0.25rem 0.5rem;
        line-height: 1;
    }
    :global(.crop-modal-x:hover) { color: white; }
    :global(.crop-help) {
        color: rgba(255,255,255,0.7); font-size: 0.78rem; line-height: 1.4;
        margin: 0 0 0.7rem 0;
    }
    :global(.crop-stage) {
        position: relative;
        width: 100%; aspect-ratio: 1 / 1;
        background: #111;
        border-radius: 0.6rem;
        overflow: hidden;
        cursor: grab;
        touch-action: none;
        user-select: none;
    }
    :global(.crop-stage:active) { cursor: grabbing; }
    :global(.crop-img) {
        position: absolute;
        top: 0; left: 0;
        width: 100%; height: 100%;
        object-fit: contain;
        pointer-events: none;
        user-select: none;
        -webkit-user-drag: none;
        transform-origin: center;
        will-change: transform;
    }
    :global(.crop-circle-mask) {
        position: absolute; inset: 0;
        border-radius: 50%;
        box-shadow: 0 0 0 9999px rgba(0,0,0,0.55);
        pointer-events: none;
        border: 2px dashed rgba(255,255,255,0.55);
    }
    :global(.crop-controls) {
        display: flex; align-items: center; gap: 0.65rem;
        margin: 0.85rem 0 0.6rem 0;
    }
    :global(.crop-zoom-label) { color: rgba(255,255,255,0.85); font-size: 0.85rem; flex-shrink: 0; }
    :global(.crop-zoom-slider) { flex: 1; accent-color: #f59e0b; }
    :global(.crop-zoom-val) { color: rgba(255,255,255,0.7); font-size: 0.78rem; min-width: 3rem; text-align: left; }
    :global(.crop-actions) {
        display: flex; gap: 0.5rem; justify-content: flex-end;
    }
    :global(.crop-btn-cancel) {
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        color: rgba(255,255,255,0.85);
        padding: 0.55rem 1rem; border-radius: 0.65rem;
        font-weight: 700; font-size: 0.85rem; cursor: pointer;
        transition: background 150ms;
    }
    :global(.crop-btn-cancel:hover) { background: rgba(255,255,255,0.12); }
    :global(.crop-btn-confirm) {
        background: linear-gradient(to right, #f59e0b, #ea580c);
        border: none; color: black;
        padding: 0.55rem 1.25rem; border-radius: 0.65rem;
        font-weight: 800; font-size: 0.9rem; cursor: pointer;
        transition: transform 150ms;
    }
    :global(.crop-btn-confirm:hover) { transform: translateY(-1px); }

    /* ============== COLOR RAIL — vertical round palette next to preview ============== */
    :global(.preview-with-rail) {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: center;
        gap: 0.85rem;
        flex-wrap: wrap;
    }
    /* Two-column color picker — small gap between dots, no overlap */
    :global(.color-rail) {
        display: grid;
        grid-template-columns: repeat(2, 28px);
        grid-auto-rows: 28px;
        column-gap: 5px;
        row-gap: 5px;
        padding: 0.55rem;
        background: rgba(0,0,0,0.35);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 0.85rem;
        align-self: center;
        width: max-content;
        position: relative;
    }
    :global(.color-dot) {
        width: 28px; height: 28px;
        border-radius: 9999px;
        border: 2px solid rgba(255,255,255,0.16);
        cursor: pointer;
        position: relative;
        padding: 0;
        transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
    }
    :global(.color-dot:hover) {
        transform: scale(1.18);
        border-color: rgba(255,255,255,0.7);
    }
    :global(.color-dot.selected) {
        transform: scale(1.25);
        border-color: white;
        box-shadow: 0 0 0 3px rgba(255,255,255,0.22), 0 4px 12px rgba(0,0,0,0.45);
    }
    /* On narrow screens — flatten into a 9×2 horizontal strip */
    @media (max-width: 640px) {
        :global(.color-rail) {
            grid-template-columns: repeat(9, 28px);
            grid-auto-rows: 28px;
        }
    }

    /* ============== PRO AD STYLE — diagonal banner with overlaid title ============== */
    :global(.pro-img-wrap) { position: relative; overflow: hidden; }

    /* Diagonal color band — covers the bottom portion of the image at an angle */
    :global(.pro-diag) {
        position: absolute; inset: 0;
        clip-path: polygon(0 75%, 100% 55%, 100% 100%, 0 100%);
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
        clip-path: polygon(0 73%, 100% 53%, 100% 58%, 0 78%);
        pointer-events: none; z-index: 3;
        opacity: 0.5;
    }

    :global(.pro-title-wrap) {
        position: absolute; left: 0; right: 0; bottom: 0;
        padding: 0.55rem 0.7rem 0.45rem;
        z-index: 4;
        text-align: right;
        transition: opacity 1500ms ease;
    }
    :global(.pro-title-wrap.mobile) {
        padding: 0.65rem 0.85rem 0.55rem;
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
        position: relative; padding: 1.6rem 1.4rem; text-align: center; min-height: 160px;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        overflow: hidden;
    }
    /* Image is smaller now — covers hero but with reduced opacity so text reads clearly */
    :global(.landing-hero-bg) {
        position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
        opacity: 0.28;
    }
    :global(.landing-hero-overlay) {
        position: absolute; inset: 0; background: linear-gradient(135deg, rgba(0,0,0,0.55), rgba(0,0,0,0.25));
    }
    :global(.landing-hero-content) { position: relative; z-index: 2; max-width: 480px; }
    /* Logo moved to TOP-RIGHT corner of hero (small) so it doesn't cover the image */
    :global(.landing-logo) {
        position: absolute;
        top: 0.7rem;
        right: 0.7rem;
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

    /* ===== Advantages list — artistic 3-row card with V checkmarks ===== */
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

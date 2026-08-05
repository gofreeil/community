<script lang="ts">
    // מודל מיקום/חיתוך תמונה. עולה פעם אחת ב-+layout.svelte וקורא ל-cropperState הגלובלי.
    // המשתמש גורר להזזה, מגלגל/מחליק להגדלה, ובאישור מקבל dataURL חתוך לפי המסגרת.
    import { cropperState, finishCropper } from '$lib/imageCropper.svelte';

    // מצב פנימי
    let imgEl = $state<HTMLImageElement | null>(null);
    let imgW = $state(0);
    let imgH = $state(0);
    let frameW = $state(300);
    let frameH = $state(300);
    let tx = $state(0);
    let ty = $state(0);
    let zoom = $state(1);
    let ready = $state(false);
    let working = $state(false);

    const MAX_ZOOM = 4;

    // scale = כמה פיקסלי תצוגה לכל פיקסל מקור. baseScale מכסה את כל המסגרת (cover).
    let baseScale = $derived(imgW && imgH ? Math.max(frameW / imgW, frameH / imgH) : 1);
    let scale = $derived(baseScale * zoom);
    let dispW = $derived(imgW * scale);
    let dispH = $derived(imgH * scale);
    let left = $derived(frameW / 2 - dispW / 2 + tx);
    let top = $derived(frameH / 2 - dispH / 2 + ty);

    function clampPan() {
        const maxX = Math.max(0, (dispW - frameW) / 2);
        const maxY = Math.max(0, (dispH - frameH) / 2);
        if (tx > maxX) tx = maxX;
        if (tx < -maxX) tx = -maxX;
        if (ty > maxY) ty = maxY;
        if (ty < -maxY) ty = -maxY;
    }

    // אתחול כשנפתח / מתחלף מקור
    $effect(() => {
        if (!cropperState.open || !cropperState.src) return;
        ready = false;
        const aspect = cropperState.aspect || 1;
        // גודל מסגרת מותאם למסך, שומר על היחס המבוקש
        const vw = typeof window !== 'undefined' ? window.innerWidth : 360;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 640;
        let w = Math.min(vw * 0.82, 340);
        let h = w / aspect;
        const maxH = vh * 0.5;
        if (h > maxH) { h = maxH; w = h * aspect; }
        frameW = Math.round(w);
        frameH = Math.round(h);

        const image = new Image();
        image.onload = () => {
            imgW = image.naturalWidth || image.width;
            imgH = image.naturalHeight || image.height;
            zoom = 1;
            tx = 0;
            ty = 0;
            imgEl = image;
            ready = true;
        };
        image.src = cropperState.src;
    });

    // ---- גרירה + פינץ' ----
    const pointers = new Map<number, { x: number; y: number }>();
    let pinchStartDist = 0;
    let pinchStartZoom = 1;

    function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
        return Math.hypot(a.x - b.x, a.y - b.y);
    }

    function onPointerDown(e: PointerEvent) {
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
            const [a, b] = [...pointers.values()];
            pinchStartDist = dist(a, b);
            pinchStartZoom = zoom;
        }
    }

    function onPointerMove(e: PointerEvent) {
        const prev = pointers.get(e.pointerId);
        if (!prev) return;
        const cur = { x: e.clientX, y: e.clientY };
        pointers.set(e.pointerId, cur);

        if (pointers.size >= 2) {
            const [a, b] = [...pointers.values()];
            const d = dist(a, b);
            if (pinchStartDist > 0) {
                zoom = Math.min(MAX_ZOOM, Math.max(1, pinchStartZoom * (d / pinchStartDist)));
                clampPan();
            }
        } else {
            tx += cur.x - prev.x;
            ty += cur.y - prev.y;
            clampPan();
        }
    }

    function onPointerUp(e: PointerEvent) {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinchStartDist = 0;
    }

    function onWheel(e: WheelEvent) {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
        zoom = Math.min(MAX_ZOOM, Math.max(1, zoom * factor));
        clampPan();
    }

    function onZoomInput(e: Event) {
        zoom = Number((e.currentTarget as HTMLInputElement).value);
        clampPan();
    }

    // ---- אישור: חיתוך לקנבס לפי המסגרת ----
    function confirmCrop() {
        if (!imgEl || !ready) { finishCropper(null); return; }
        working = true;
        try {
            const srcW = frameW / scale;
            const srcH = frameH / scale;
            let sx = -left / scale;
            let sy = -top / scale;
            sx = Math.max(0, Math.min(sx, imgW - srcW));
            sy = Math.max(0, Math.min(sy, imgH - srcH));

            const MAX_OUT = 800;
            const longer = Math.max(srcW, srcH);
            const factor = longer > MAX_OUT ? MAX_OUT / longer : 1;
            const outW = Math.max(1, Math.round(srcW * factor));
            const outH = Math.max(1, Math.round(srcH * factor));

            const canvas = document.createElement('canvas');
            canvas.width = outW;
            canvas.height = outH;
            const ctx = canvas.getContext('2d');
            if (!ctx) { finishCropper(null); return; }
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, outW, outH);
            ctx.drawImage(imgEl, sx, sy, srcW, srcH, 0, 0, outW, outH);
            finishCropper(canvas.toDataURL('image/jpeg', 0.85));
        } catch {
            finishCropper(null);
        } finally {
            working = false;
        }
    }

    function cancel() {
        finishCropper(null);
    }

    function onKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') cancel();
        else if (e.key === 'Enter') confirmCrop();
    }
</script>

<svelte:window onkeydown={cropperState.open ? onKeydown : undefined} />

{#if cropperState.open}
    <div class="cropper-overlay" role="dialog" aria-modal="true" aria-label={cropperState.title}>
        <div class="cropper-box" dir="rtl">
            <h3 class="cropper-title">{cropperState.title}</h3>
            <p class="cropper-hint">{cropperState.hint}</p>

            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <!-- משטח גרירה לחיתוך התמונה. אין לו מקבילת מקלדת ישירה, אבל אותה
                 תוצאה מושגת במחוון ההגדלה ובכפתורי האישור/ביטול שבדיאלוג -->
            <div
                class="cropper-frame"
                class:is-circle={cropperState.shape === 'circle'}
                style="width:{frameW}px;height:{frameH}px;"
                onpointerdown={onPointerDown}
                onpointermove={onPointerMove}
                onpointerup={onPointerUp}
                onpointercancel={onPointerUp}
                onwheel={onWheel}
            >
                {#if ready && imgEl}
                    <img
                        class="cropper-img"
                        src={cropperState.src}
                        alt=""
                        draggable="false"
                        style="left:{left}px;top:{top}px;width:{dispW}px;height:{dispH}px;"
                    />
                {:else}
                    <div class="cropper-loading">טוען…</div>
                {/if}
                <div class="cropper-mask" class:is-circle={cropperState.shape === 'circle'}></div>
            </div>

            <div class="cropper-zoom">
                <span aria-hidden="true">−</span>
                <input
                    type="range"
                    min="1"
                    max={MAX_ZOOM}
                    step="0.01"
                    value={zoom}
                    oninput={onZoomInput}
                    aria-label="הגדלה"
                />
                <span aria-hidden="true">＋</span>
            </div>

            <div class="cropper-actions">
                <button type="button" class="btn-cancel" onclick={cancel} disabled={working}>ביטול</button>
                <button type="button" class="btn-confirm" onclick={confirmCrop} disabled={working || !ready}>
                    {working ? 'שומר…' : 'אישור'}
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .cropper-overlay {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(3, 7, 18, 0.82);
        backdrop-filter: blur(4px);
        padding: 16px;
    }
    .cropper-box {
        width: 100%;
        max-width: 400px;
        background: #0f172a;
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 20px;
        padding: 18px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        text-align: center;
    }
    .cropper-title {
        color: #fff;
        font-size: 16px;
        font-weight: 800;
        margin: 0 0 4px;
    }
    .cropper-hint {
        color: #94a3b8;
        font-size: 12px;
        margin: 0 0 14px;
    }
    .cropper-frame {
        position: relative;
        margin: 0 auto;
        overflow: hidden;
        border-radius: 12px;
        background: #020617;
        touch-action: none;
        cursor: grab;
        user-select: none;
    }
    .cropper-frame:active {
        cursor: grabbing;
    }
    .cropper-frame.is-circle {
        border-radius: 50%;
    }
    .cropper-img {
        position: absolute;
        max-width: none;
        pointer-events: none;
        user-select: none;
    }
    .cropper-loading {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #94a3b8;
        font-size: 13px;
    }
    /* מסגרת מלווה עדינה שממחישה את גבול החיתוך */
    .cropper-mask {
        position: absolute;
        inset: 0;
        pointer-events: none;
        box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.45);
        border-radius: 12px;
    }
    .cropper-mask.is-circle {
        border-radius: 50%;
    }
    .cropper-zoom {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 16px 4px 4px;
        color: #cbd5e1;
        font-weight: 700;
    }
    .cropper-zoom input[type='range'] {
        flex: 1;
        accent-color: #a855f7;
        cursor: pointer;
    }
    .cropper-actions {
        display: flex;
        gap: 10px;
        margin-top: 14px;
    }
    .cropper-actions button {
        flex: 1;
        border-radius: 12px;
        padding: 11px 12px;
        font-weight: 800;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.15s;
        border: 1px solid transparent;
    }
    .btn-cancel {
        background: rgba(148, 163, 184, 0.12);
        color: #cbd5e1;
        border-color: rgba(148, 163, 184, 0.25);
    }
    .btn-cancel:hover {
        background: rgba(148, 163, 184, 0.2);
    }
    .btn-confirm {
        background: linear-gradient(135deg, #7c3aed, #a855f7);
        color: #fff;
    }
    .btn-confirm:hover {
        filter: brightness(1.08);
    }
    .cropper-actions button:disabled {
        opacity: 0.6;
        cursor: default;
    }
</style>

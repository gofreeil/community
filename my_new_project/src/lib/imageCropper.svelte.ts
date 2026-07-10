// ---- מנגנון מיקום/חיתוך תמונה גלובלי ----
// כל טופס שמעלה תמונה יכול לקרוא ל-openCropper(dataUrl, ...) ולקבל בחזרה
// dataUrl ממורכז/מוגדל לפי בחירת המשתמש, או null אם ביטל.
// המודל עצמו (ImageCropper.svelte) עולה פעם אחת ב-+layout.svelte.

export type CropShape = 'circle' | 'rect';

export interface CropOptions {
    /** צורת המסגרת שרואים בזמן המיקום. 'circle' = אווטאר עגול (מפה), 'rect' = מלבן/ריבוע (גלריה). */
    shape?: CropShape;
    /** יחס רוחב/גובה של החיתוך. 1 = ריבוע (ברירת מחדל). */
    aspect?: number;
    title?: string;
    hint?: string;
}

interface CropperState {
    open: boolean;
    src: string;
    shape: CropShape;
    aspect: number;
    title: string;
    hint: string;
}

export const cropperState = $state<CropperState>({
    open: false,
    src: '',
    shape: 'rect',
    aspect: 1,
    title: 'מיקום התמונה',
    hint: 'גררו למיקום הרצוי · הזיזו את המחוון להגדלה',
});

let resolver: ((v: string | null) => void) | null = null;

/**
 * פותח את חלון המיקום עם תמונה נתונה (dataURL).
 * מחזיר Promise עם ה-dataURL הממוקם/החתוך, או null אם המשתמש ביטל.
 */
export function openCropper(src: string, opts: CropOptions = {}): Promise<string | null> {
    // אם כבר פתוח קודם — נסגור אותו עם null כדי לא להשאיר Promise תלוי
    if (resolver) {
        const prev = resolver;
        resolver = null;
        prev(null);
    }
    cropperState.src = src;
    cropperState.shape = opts.shape ?? 'rect';
    cropperState.aspect = opts.aspect ?? 1;
    cropperState.title = opts.title ?? 'מיקום התמונה';
    cropperState.hint = opts.hint ?? 'גררו למיקום הרצוי · הזיזו את המחוון להגדלה';
    cropperState.open = true;
    return new Promise((resolve) => {
        resolver = resolve;
    });
}

/** נקרא ע"י המודל בסיום — אישור (dataURL) או ביטול (null). */
export function finishCropper(result: string | null) {
    cropperState.open = false;
    cropperState.src = '';
    const r = resolver;
    resolver = null;
    if (r) r(result);
}

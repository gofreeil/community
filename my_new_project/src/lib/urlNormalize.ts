// ============================================================
// urlNormalize.ts - נרמול יעדים שהוקלדו ע"י מפרסם
// ============================================================

/**
 * כתובת בלי סכימה ("mysite.co.il") היא כתובת *יחסית* ב-HTML: הדפדפן היה
 * פותח /ads/mysite.co.il על הדומיין שלנו במקום את אתר המפרסם, ומקבל 404.
 * מחזיר '' כשאי אפשר לנרמל - הקורא יציג אז את הטקסט בלי קישור.
 */
export function toExternalUrl(raw: string): string {
    const s = (raw ?? '').trim();
    if (!s) return '';
    if (/^https?:\/\//i.test(s)) return s;
    if (/^(mailto:|tel:)/i.test(s)) return s;
    if (s.startsWith('//')) return 'https:' + s;
    if (/^[\w-]+(\.[\w-]+)+([/?#].*)?$/.test(s)) return 'https://' + s;
    return '';
}

/**
 * מספר ישראלי מקומי (05...) חייב להפוך ל-9725... אחרת wa.me מחזיר
 * "המספר אינו קיים". זהו הנרמול שכבר קיים בכל שאר הלוחות באתר
 * (BabysittersBoard, LostAndFound, ShabbatHostingBoard ועוד).
 */
export function waHref(raw: string): string {
    const digits = (raw ?? '').replace(/\D/g, '').replace(/^0/, '972');
    return digits ? `https://wa.me/${digits}` : '';
}

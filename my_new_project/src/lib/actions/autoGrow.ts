// ============================================================
// autoGrow - תיבת טקסט שגדלה עם התוכן, בלי פס גלילה פנימי.
// ------------------------------------------------------------
// textarea עם rows קבוע מציג טקסט ארוך בחלון קטן עם גלילה - המשתמש לא
// רואה את מה שכתב. הפעולה מתאימה את הגובה ל-scrollHeight בכל שינוי,
// וגם בטעינה (ערכים משוחזרים מטיוטה / עריכה) ובכל עדכון ריאקטיבי של הערך.
// שימוש: <textarea use:autoGrow={value}> - הפרמטר רק כדי שהגובה יתעדכן
// גם כשהערך משתנה מבחוץ, לא רק מהקלדה.
// ============================================================
export function autoGrow(node: HTMLTextAreaElement, _value?: unknown) {
    const fit = () => {
        node.style.height = 'auto';
        node.style.height = `${node.scrollHeight}px`;
    };
    node.style.overflowY = 'hidden';
    node.addEventListener('input', fit);
    // אחרי שהפונט/הפריסה התייצבו (וגם כשהתיבה נפתחת בתוך אזור שהיה מוסתר)
    requestAnimationFrame(fit);
    return {
        update() { requestAnimationFrame(fit); },
        destroy() { node.removeEventListener('input', fit); },
    };
}

import type { ActionReturn } from 'svelte/action';

/**
 * "לחיצה בחוץ" קשורה לאלמנטים עצמם, לא לסלקטור מחרוזתי.
 *
 * למה: כשמרקאפ משוכפל לנייד ולדסקטופ (md:hidden / hidden md:flex), מאזין גלובלי
 * שבודק target.closest(".class") סוגר את התפריט באותה הקשה שפתחה אותו ברגע
 * שוריאנט אחד נשאר מחוץ לסלקטור - והכפתור נראה "מת" (קרה עם כפתור ➕ "עוד" במפה).
 * כאן כל וריאנט מסמן את עצמו כאזור-פנים עם use:, כך שההחרגה נוסעת עם המרקאפ.
 *
 * שימוש:
 *   const menuOutside = createClickOutside(() => (open = false));
 *   <div use:menuOutside>...וריאנט דסקטופ...</div>
 *   <div use:menuOutside>...וריאנט נייד...</div>
 *
 * הקולבק רץ רק כשההקשה מחוץ לכל האזורים הרשומים; המאזין על document חי רק
 * כל עוד רשום לפחות אזור אחד.
 */
export function createClickOutside(onOutside: () => void) {
    const regions = new Set<HTMLElement>();

    function handleDocumentClick(event: MouseEvent) {
        const target = event.target as Node | null;
        if (!target) return;
        for (const region of regions) {
            if (region.contains(target)) return;
        }
        onOutside();
    }

    return function region(node: HTMLElement): ActionReturn {
        if (regions.size === 0) {
            document.addEventListener('click', handleDocumentClick);
        }
        regions.add(node);
        return {
            destroy() {
                regions.delete(node);
                if (regions.size === 0) {
                    document.removeEventListener('click', handleDocumentClick);
                }
            },
        };
    };
}

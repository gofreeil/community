// סטטוס תפעולי של נכס על המפה (נפרד מ-status1 של Strapi שקובע נראות).
// נשמר ב-extra_fields.place_status ולכן לא משפיע על סינון הלוחות - רק תג תצוגה.
export type PlaceStatus = 'active' | 'renovating' | 'moved' | 'closed' | 'opening_soon';

export interface PlaceStatusInfo {
    value: PlaceStatus;
    label: string;
    emoji: string;
    /** classes לתג (border/bg/text) */
    badge: string;
    /** classes לכפתור פעיל בבורר */
    active: string;
}

export const PLACE_STATUSES: PlaceStatusInfo[] = [
    { value: 'active',       label: 'פעיל',        emoji: '🟢', badge: 'bg-green-500/20 text-green-300 border-green-500/30',   active: 'bg-green-500 text-white border-green-400' },
    { value: 'renovating',   label: 'בשיפוצים',    emoji: '🚧', badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',   active: 'bg-amber-500 text-white border-amber-400' },
    { value: 'moved',        label: 'עברנו כתובת', emoji: '📦', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',     active: 'bg-blue-500 text-white border-blue-400' },
    { value: 'closed',       label: 'סגור',        emoji: '⛔', badge: 'bg-red-500/20 text-red-300 border-red-500/30',       active: 'bg-red-500 text-white border-red-400' },
    { value: 'opening_soon', label: 'נפתח בקרוב',  emoji: '🔜', badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30', active: 'bg-purple-500 text-white border-purple-400' },
];

export const PLACE_STATUS_VALUES: PlaceStatus[] = PLACE_STATUSES.map(s => s.value);

export function placeStatusInfo(v: string | null | undefined): PlaceStatusInfo | null {
    return PLACE_STATUSES.find(s => s.value === v) ?? null;
}

// ---- פרוטוקול מחיקה: שחזור אפשרי עד 30 יום ----
export const DELETE_RESTORE_DAYS = 30;

/** כמה ימים נותרו לשחזור (0 = פג התוקף / חסר תאריך) */
export function restoreDaysLeft(deletedAtIso: string | null | undefined): number {
    if (!deletedAtIso) return 0;
    const t = Date.parse(deletedAtIso);
    if (Number.isNaN(t)) return 0;
    const elapsedDays = (Date.now() - t) / 86_400_000;
    return Math.max(0, Math.ceil(DELETE_RESTORE_DAYS - elapsedDays));
}

/** האם ניתן עדיין לשחזר את הנכס (בתוך חלון 30 הימים) */
export function canRestore(deletedAtIso: string | null | undefined): boolean {
    return restoreDaysLeft(deletedAtIso) > 0;
}

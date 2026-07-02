// ============================================================
// auth.ts - פונקציות הרשאה
// ============================================================

import type { Session } from '@auth/core/types';
import { error } from '@sveltejs/kit';

type UserRole = 'user' | 'neighborhood_admin' | 'super_admin';

/** האם המשתמש סופר-אדמין */
export function isSuperAdmin(session: Session | null): boolean {
    return session?.user?.role === 'super_admin';
}

/** האם המשתמש אדמין של שכונה מסוימת */
export function isNeighborhoodAdmin(session: Session | null, neighborhood?: string): boolean {
    if (!session?.user) return false;
    if (session.user.role === 'super_admin') return true;
    if (session.user.role === 'neighborhood_admin') {
        // אם לא צוינה שכונה - מספיק שהוא אדמין
        if (!neighborhood) return true;
        // אחרת - רק אם השכונה שלו תואמת
        return session.user.neighborhood === neighborhood;
    }
    return false;
}

/** האם המשתמש רכז של שכונה מסוימת (לפי coordinator_of על רשומת המשתמש) */
export function isCoordinatorOfArea(
    coordinatorOf: string[] | undefined | null,
    neighborhood?: string | null,
    city?: string | null,
): boolean {
    if (!coordinatorOf?.length || !neighborhood) return false;
    const stripCity = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const parseArea = (entry: string) => {
        const m = entry.match(/^(.*?)\s*\(([^)]*)\)\s*$/);
        return m ? { name: m[1].trim(), city: m[2].trim() } : { name: entry.trim(), city: '' };
    };
    const n = stripCity(neighborhood);
    return coordinatorOf.map(parseArea).some(a => a.name === n && (a.city ? city === a.city : true));
}

/** האם למשתמש יש הרשאות אדמין כלשהן */
export function isAdmin(session: Session | null): boolean {
    return isNeighborhoodAdmin(session) || isSuperAdmin(session);
}

/** דרוש הרשאת אדמין - זורק 403 אם אין */
export function requireAdmin(session: Session | null, neighborhood?: string): void {
    if (!isNeighborhoodAdmin(session, neighborhood)) {
        throw error(403, 'אין לך הרשאה לבצע פעולה זו');
    }
}

/** דרוש סופר-אדמין - זורק 403 אם אין */
export function requireSuperAdmin(session: Session | null): void {
    if (!isSuperAdmin(session)) {
        throw error(403, 'נדרשת הרשאת מנהל ראשי');
    }
}

/** קבלת תפקיד בעברית */
export function getRoleLabel(role: UserRole | string | undefined): string {
    switch (role) {
        case 'super_admin':        return 'מנהל ראשי';
        case 'neighborhood_admin': return 'אדמין שכונתי';
        default:                   return 'משתמש';
    }
}

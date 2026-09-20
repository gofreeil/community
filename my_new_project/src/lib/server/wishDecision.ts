// ============================================================
// wishDecision.ts - אישור/דחיית משאלה לכותל המשאלות
// ------------------------------------------------------------
// הלוגיקה היחידה לעמוד הניהול (/admin "משאלות ממתינות") ולכפתורי אשר/דחה
// על כרטיס ההתראה בפרופיל: סטטוס המשאלה, הודעה למבקש, וסימון התראות
// "משאלה חדשה" של כל הסופר-אדמינים כטופלו.
// ============================================================

import { createItem, getAllSuperAdmins, getDbItemByIdFresh, getMessagesByUserId, updateItem, type DbItem } from './db.js';

export type WishDecision = 'approve' | 'reject';

export async function finalizeWishDecision(wish: DbItem | undefined, decision: WishDecision): Promise<void> {
    if (!wish) return;
    const wishText = wish.description || wish.label;

    // 1. הודעת החלטה למבקש
    if (wish.user_id) {
        try {
            await createItem({
                category: 'message',
                label: decision === 'approve'
                    ? '✅ המשאלה שלך אושרה ומוצגת בכותל המשאלות'
                    : 'לגבי המשאלה ששלחת לכותל המשאלות',
                description: decision === 'approve'
                    ? `המנהל אישר את המשאלה ששלחת:\n\n"${wishText}"\n\nהיא מוצגת עכשיו בכותל המשאלות 🙏\n/community-fund`
                    : `לאחר בדיקה, המשאלה ששלחת:\n\n"${wishText}"\n\nלא אושרה לפרסום בכותל המשאלות כרגע. אפשר לנסח משאלה חדשה או לפנות אלינו דרך "כתוב למערכת" בפרופיל.`,
                icon:    decision === 'approve' ? '✅' : '💬',
                color:   decision === 'approve' ? 'green' : 'red',
                user_id: wish.user_id,
                extra_fields: {
                    type:       'wish_decision',
                    decision,
                    read:       false,
                    link:       '/community-fund',
                    decided_at: new Date().toISOString(),
                },
            });
        } catch (e) {
            console.warn('[wishDecision] notify requester failed:', e instanceof Error ? e.message : e);
        }
    }

    // 2. סימון הודעות "משאלה חדשה" בתיבות הסופר-אדמינים כ"טופל"
    try {
        const admins = await getAllSuperAdmins();
        const decisionWord = decision === 'approve' ? 'אושרה' : 'נדחתה';
        for (const admin of admins) {
            let msgs;
            try { msgs = await getMessagesByUserId(admin.id); } catch { continue; }
            const related = (msgs ?? []).filter((m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { return false; }
                if (ef?.handled) return false;
                if (String(ef?.type ?? '') !== 'wish_request') return false;
                return String(ef?.wish_item_id ?? '') === wish.id ||
                    String(ef?.wish_text ?? '').trim() === wishText.trim();
            });
            await Promise.all(related.map(async (m) => {
                let ef: Record<string, unknown> = {};
                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch {}
                await updateItem(m.id, {
                    label: `${decision === 'approve' ? '✅' : '❌'} טופל (${decisionWord}) · ${(m.label ?? '').replace(/^[✅❌🙏]+\s*(טופל\s*\([^)]*\)\s*·\s*)?/, '')}`,
                    icon:  decision === 'approve' ? '✅' : '❌',
                    color: decision === 'approve' ? 'green' : 'red',
                    extra_fields: { ...ef, handled: true, decision, handled_at: new Date().toISOString() },
                });
            }));
        }
    } catch (e) {
        console.warn('[wishDecision] mark admin messages handled failed:', e instanceof Error ? e.message : e);
    }
}

/** מכריע על משאלה: מחזיר ok=false כשלא נמצאה או שכבר אינה ממתינה. */
export async function decideWish(
    wishId: string,
    decision: WishDecision,
): Promise<{ ok: boolean; alreadyDecided?: boolean; text: string }> {
    const wish = await getDbItemByIdFresh(wishId);
    if (!wish) return { ok: false, text: '' };
    const text = wish.description || wish.label || '';
    if (wish.status !== 'pending') return { ok: false, alreadyDecided: true, text };
    await updateItem(wishId, { status: decision === 'approve' ? 'active' : 'rejected' });
    await finalizeWishDecision(wish, decision);
    return { ok: true, text };
}

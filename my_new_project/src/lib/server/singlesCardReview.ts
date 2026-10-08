// ============================================================
// singlesCardReview.ts - אישור/דחיית כרטיס פנויים (בדיקת צניעות)
// ------------------------------------------------------------
// הלוגיקה היחידה לשני המקומות שמכריעים על כרטיס: דף /admin/singles-review
// וכפתורי "אשר כרטיס"/"דחה" על כרטיס ההתראה בפרופיל. שניהם חייבים לעשות
// בדיוק את אותו הדבר (סטטוס + הודעה לבעל הכרטיס), אחרת מנהל שמאשר מההתראה
// ישאיר את בעל הכרטיס בלי ההודעה שהטופס הבטיח לו.
// ============================================================

import { createItem, getDbItemById, updateItem, type DbItem } from './db.js';

export type SinglesCardDecision = 'approved' | 'rejected';

function parseEf(raw: string | null | undefined): Record<string, unknown> {
    try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

/** הודעה לאזור האישי של בעל/ת הכרטיס על תוצאת בדיקת הצניעות. best-effort:
 *  כשל כאן לא מפיל את האישור/הדחייה עצמם. */
async function notifyCardOwner(card: DbItem, decision: SinglesCardDecision): Promise<void> {
    if (!card.user_id) return;
    const cardId = card.id;
    try {
        await createItem({
            category: 'message',
            label: decision === 'approved'
                ? '✅ הכרטיס שלך נבדק ואושר'
                : '✏️ הכרטיס שלך נבדק - נדרש תיקון',
            description: decision === 'approved'
                ? 'הכרטיס שלך בלוח הפנויים/פנויות עבר את בדיקת הצניעות ואושר. הוא מופיע עכשיו ברשימה הארצית, והשדכניות והשדכנים של המערכת יכולים לחפש עבורך התאמות. לצפייה בכרטיס: /singles/' + cardId
                : 'הכרטיס שלך בלוח הפנויים/פנויות נבדק ולא אושר במתכונתו הנוכחית (לרוב בגלל תמונה או ניסוח שאינם עומדים בכללי הצניעות של הלוח). אפשר לערוך את הכרטיס ולשלוח שוב לבדיקה: /add/singles?edit=' + cardId,
            contact: '',
            user_id: card.user_id,
            icon: decision === 'approved' ? '✅' : '✏️',
            color: 'pink',
            extra_fields: {
                type: 'singles_card_review',
                decision,
                card_id: cardId,
                read: false,
                link: decision === 'approved' ? '/singles/' + cardId : '/add/singles?edit=' + cardId,
            },
        });
    } catch (e) {
        console.warn('[singlesCardReview] notify card owner failed:', e instanceof Error ? e.message : e);
    }
}

/**
 * מכריע על כרטיס: approved → active (מוצג בלוח), rejected → rejected (לא מוצג,
 * לא נמחק - אפשר לערוך ולשלוח שוב). מחזיר ok=false כשהכרטיס לא נמצא או
 * שכבר אינו ממתין (הוכרע במקום אחר).
 */
export async function decideSinglesCard(
    cardId: string,
    decision: SinglesCardDecision,
): Promise<{ ok: boolean; label: string; alreadyDecided?: boolean }> {
    const card = await getDbItemById(cardId);
    if (!card || card.category !== 'singles') return { ok: false, label: '' };
    if (card.status !== 'pending') return { ok: false, label: card.label ?? '', alreadyDecided: true };
    await updateItem(cardId, { status: decision === 'approved' ? 'active' : 'rejected' });
    await notifyCardOwner(card, decision);
    return { ok: true, label: card.label ?? '' };
}

/** סימון עותק התראת "פנוי חדש" של מנהל כטופל - יורד מהתיבה בכל המכשירים. */
export async function markSinglesReviewMessageHandled(msg: DbItem, decision: SinglesCardDecision): Promise<void> {
    const ef = parseEf(msg.extra_fields);
    if (ef.handled) return;
    const prefix = decision === 'approved' ? '✅ אושר · ' : '✖️ נדחה · ';
    const label = (msg.label ?? '').startsWith(prefix) ? (msg.label ?? '') : `${prefix}${msg.label ?? ''}`;
    await updateItem(msg.id, {
        label,
        extra_fields: { ...ef, handled: true, read: true, decision, handled_at: new Date().toISOString() },
    });
}

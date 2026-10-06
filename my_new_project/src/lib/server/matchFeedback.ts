// פידבק שדכנים על ציוני ההתאמה: שמירה, שליפה, ומחיקה.
// דירוג אחד לכל שדכן/ית לכל זוג (דירוג חוזר מעדכן את הקיים). ציון המערכת נחשב כאן מחדש
// מהכרטיסים ונשמר כ"צילום" - לא נלקח מהלקוח, כדי שאי אפשר יהיה לסלף את נתוני הלמידה.

import { createItem, updateItem, deleteItem, getItemsByCategory, getItemsByUserId, getDbItemById, type DbItem } from './db';
import { pairKey } from './singlesMatch';
import { candidateFromItem, scoreMatch } from '../singlesMatching';
import { dbItemToProfile } from '../singlesMap';
import {
    MATCH_FEEDBACK_CATEGORY, MAX_FEEDBACK_NOTE, PART_KEYS, REASON_IDS,
    type MatchFeedback, type Verdict,
} from '../matchFeedbackShared';
import type { QuizActor } from './quizSuggestions';

const VERDICTS: Verdict[] = ['good', 'maybe', 'bad'];

function parseEf(raw: string | null | undefined): Record<string, unknown> {
    try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function toFeedback(it: DbItem): MatchFeedback {
    const ef = parseEf(it.extra_fields);
    const rawParts = (ef.parts && typeof ef.parts === 'object' ? ef.parts : {}) as Record<string, unknown>;
    const parts: MatchFeedback['parts'] = {};
    for (const k of PART_KEYS) {
        const v = rawParts[k];
        parts[k] = typeof v === 'number' ? v : null;
    }
    return {
        id: it.id,
        matchmakerId: it.user_id ?? '',
        matchmakerName: String(ef.matchmaker_name ?? it.contact ?? ''),
        pair: String(ef.pair ?? ''),
        aId: String(ef.a_id ?? ''),
        bId: String(ef.b_id ?? ''),
        aName: String(ef.a_name ?? ''),
        bName: String(ef.b_name ?? ''),
        verdict: (VERDICTS.includes(ef.verdict as Verdict) ? ef.verdict : 'maybe') as Verdict,
        reasons: Array.isArray(ef.reasons) ? ef.reasons.map(String).filter((r) => REASON_IDS.has(r)) : [],
        note: String(it.description ?? ''),
        score: typeof ef.score === 'number' ? ef.score : null,
        partial: ef.partial === true,
        parts,
        dealbreakers: typeof ef.dealbreakers === 'number' ? ef.dealbreakers : 0,
        createdAt: String(ef.created_at ?? it.created_at ?? ''),
        updatedAt: String(ef.updated_at ?? ef.created_at ?? it.created_at ?? ''),
    };
}

/** הדירוגים של שדכן/ית - קריאה טרייה (עוקפת cache), כדי שדירוג שנשמר הרגע יופיע מיד */
export async function getFeedbackByMatchmaker(userId: string): Promise<MatchFeedback[]> {
    const all = await getItemsByUserId(userId);
    return all.filter((i) => i.category === MATCH_FEEDBACK_CATEGORY && i.status !== 'deleted').map(toFeedback);
}

export async function getAllFeedback(): Promise<MatchFeedback[]> {
    const items = await getItemsByCategory(MATCH_FEEDBACK_CATEGORY).catch(() => []);
    return items.map(toFeedback).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export interface FeedbackInput { aId: unknown; bId: unknown; verdict: unknown; reasons: unknown; note: unknown }

export type SaveResult = { ok: true; feedback: MatchFeedback } | { ok: false; message: string; status: number };

export async function saveFeedback(actor: QuizActor, input: FeedbackInput): Promise<SaveResult> {
    const aId = String(input.aId ?? '').trim();
    const bId = String(input.bId ?? '').trim();
    if (!aId || !bId || aId === bId) return { ok: false, message: 'פרמטרים שגויים', status: 400 };
    const verdict = String(input.verdict) as Verdict;
    if (!VERDICTS.includes(verdict)) return { ok: false, message: 'דירוג לא תקין', status: 400 };

    const reasons = [...new Set(Array.isArray(input.reasons) ? input.reasons.map(String) : [])].filter((r) => REASON_IDS.has(r));
    const note = String(input.note ?? '').trim();
    if (note.length > MAX_FEEDBACK_NOTE) return { ok: false, message: `ההערה ארוכה מדי (עד ${MAX_FEEDBACK_NOTE} תווים)`, status: 400 };

    const [a, b] = await Promise.all([getDbItemById(aId), getDbItemById(bId)]);
    if (!a || !b || a.category !== 'singles' || b.category !== 'singles') {
        return { ok: false, message: 'כרטיס לא נמצא', status: 404 };
    }

    // צילום ציון המערכת ברגע הדירוג
    const ca = candidateFromItem(a), cb = candidateFromItem(b);
    const match = ca && cb ? scoreMatch(ca, cb) : null;
    const parts: Record<string, number | null> = {};
    if (match) for (const p of match.parts) parts[p.key] = p.score;

    const key = pairKey(aId, bId);
    const now = new Date().toISOString();
    const existing = (await getFeedbackByMatchmaker(actor.uid)).find((f) => f.pair === key);

    const aName = dbItemToProfile(a).nickname, bName = dbItemToProfile(b).nickname;
    const label = `פידבק התאמה · ${aName} + ${bName}`;
    const extra_fields = {
        pair: key, a_id: aId, b_id: bId,
        a_name: aName, b_name: bName,
        verdict, reasons,
        score: match?.score ?? null,
        partial: match?.partial ?? false,
        parts,
        dealbreakers: match?.dealbreakers.length ?? 0,
        matchmaker_name: actor.name,
        created_at: existing?.createdAt || now,
        updated_at: now,
    };

    let id: string;
    if (existing) {
        await updateItem(existing.id, { label, description: note, extra_fields });
        id = existing.id;
    } else {
        id = (await createItem({
            category: MATCH_FEEDBACK_CATEGORY,
            label,
            description: note,
            contact: actor.name,
            user_id: actor.uid,
            icon: '🧠',
            color: 'pink',
            extra_fields,
        })).id;
    }

    const feedback: MatchFeedback = {
        id,
        matchmakerId: actor.uid,
        matchmakerName: actor.name,
        pair: key, aId, bId,
        aName, bName,
        verdict, reasons, note,
        score: extra_fields.score,
        partial: extra_fields.partial,
        parts: parts as MatchFeedback['parts'],
        dealbreakers: extra_fields.dealbreakers,
        createdAt: extra_fields.created_at,
        updatedAt: now,
    };
    return { ok: true, feedback };
}

/** ביטול דירוג - מוחק את הפריט של השדכן/ית עבור הזוג (אם קיים) */
export async function clearFeedback(actor: QuizActor, aId: string, bId: string): Promise<void> {
    const key = pairKey(aId, bId);
    const existing = (await getFeedbackByMatchmaker(actor.uid)).find((f) => f.pair === key);
    if (existing) await deleteItem(existing.id);
}

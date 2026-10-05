// הצעות שדכנים לשאלון ההתאמה: שמירה, רשימות, הכרעה, והתראה לסופר-אדמינים.
// ההתראה היא פריט message לכל סופר-אדמין (כמו בקשת שדכנות); ה-SMS עצמו יוצא
// אוטומטית מה-lifecycle בבאקאנד על כל message חדש - לא שולחים SMS מכאן.

import {
    createItem, updateItem, getItemsByCategory, getItemsByUserId, getDbItemByIdFresh,
    getAllSuperAdmins, getMessagesByUserId, getUserById, getUserByEmail, type DbItem,
} from './db';
import { getMatchmakerStatus } from './matchmaker';
import { buildSections } from '../singlesQuestionnaireData';
import { fmt } from '../singlesQuestionnaire';
import {
    QUIZ_SUGGESTION_CATEGORY, KIND_LABELS, MAX_SUGGESTION_TEXT,
    type QuizSuggestion, type SuggestionKind, type SuggestionStatus, type SuggestionGender,
} from '../quizSuggestionsShared';

const KINDS: SuggestionKind[] = ['edit', 'remove', 'comment', 'add'];
const MAX_OPEN_PER_USER = 40;

export interface QuizActor { uid: string; name: string; isSuperAdmin: boolean; isMatchmaker: boolean }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function resolveQuizActor(event: any): Promise<QuizActor | null> {
    let session = null;
    try { session = await event.locals.auth(); } catch { /* אורח */ }
    const uid = session?.user?.id as string | undefined;
    if (!uid) return null;

    let isSuperAdmin = session?.user?.role === 'super_admin';
    let name = String(session?.user?.name ?? '');
    try {
        let u = await getUserById(uid);
        if (!u && session?.user?.email) u = await getUserByEmail(session.user.email);
        if (u?.role === 'super_admin') isSuperAdmin = true;
        name = u?.nickname || u?.name || name;
    } catch { /* ממשיכים עם מה שיש בסשן */ }

    const status = await getMatchmakerStatus(uid, isSuperAdmin);
    return { uid, name: name || 'שדכן/ית', isSuperAdmin, isMatchmaker: status === 'approved' };
}

function parseEf(raw: string | null | undefined): Record<string, unknown> {
    try { return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}

export function toSuggestion(it: DbItem): QuizSuggestion {
    const ef = parseEf(it.extra_fields);
    return {
        id: it.id,
        userId: it.user_id ?? '',
        authorName: String(ef.author_name ?? it.contact ?? ''),
        kind: (KINDS.includes(ef.kind as SuggestionKind) ? ef.kind : 'comment') as SuggestionKind,
        gender: (['m', 'f', 'both'].includes(String(ef.gender)) ? ef.gender : 'both') as SuggestionGender,
        qid: String(ef.qid ?? ''),
        sectionId: String(ef.section_id ?? ''),
        sectionTitle: String(ef.section_title ?? ''),
        originalText: String(ef.original_text ?? ''),
        text: String(it.description ?? ''),
        status: (['pending', 'accepted', 'rejected', 'done'].includes(String(ef.status)) ? ef.status : 'pending') as SuggestionStatus,
        adminNote: String(ef.admin_note ?? ''),
        createdAt: String(ef.created_at ?? it.created_at ?? ''),
        decidedAt: String(ef.decided_at ?? ''),
    };
}

/** ההצעות של משתמש - קריאה טרייה (עוקפת cache) כדי שהצעה שנשלחה הרגע תופיע מיד */
export async function getSuggestionsByUser(userId: string): Promise<QuizSuggestion[]> {
    const all = await getItemsByUserId(userId);
    return all.filter((i) => i.category === QUIZ_SUGGESTION_CATEGORY).map(toSuggestion);
}

export async function getAllSuggestions(): Promise<QuizSuggestion[]> {
    const items = await getItemsByCategory(QUIZ_SUGGESTION_CATEGORY).catch(() => []);
    return items.map(toSuggestion).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export interface SuggestionInput { kind: unknown; qid: unknown; gender: unknown; sectionId: unknown; text: unknown }

export type CreateResult = { ok: true; suggestion: QuizSuggestion } | { ok: false; message: string };

export async function createSuggestion(actor: QuizActor, input: SuggestionInput, origin: string): Promise<CreateResult> {
    const kind = String(input.kind) as SuggestionKind;
    if (!KINDS.includes(kind)) return { ok: false, message: 'סוג הצעה לא תקין' };
    const gender = String(input.gender) as SuggestionGender;
    if (!['m', 'f', 'both'].includes(gender)) return { ok: false, message: 'חסר מין' };
    const text = String(input.text ?? '').trim();
    if (text.length < 3) return { ok: false, message: 'כתבו כמה מילים לפחות' };
    if (text.length > MAX_SUGGESTION_TEXT) return { ok: false, message: `ההצעה ארוכה מדי (עד ${MAX_SUGGESTION_TEXT} תווים)` };

    // ההקשר (נוסח השאלה, הפרק) נגזר בשרת מהבנק ולא נלקח מהלקוח
    const qid = String(input.qid ?? '').trim();
    const sectionIdIn = String(input.sectionId ?? '').trim();
    const g = gender === 'both' ? 'm' : gender;
    const sections = buildSections(g);
    let originalText = '';
    let section = sections.find((s) => s.id === sectionIdIn);
    if (kind === 'add') {
        if (!section) return { ok: false, message: 'פרק לא נמצא' };
    } else {
        const found = sections.flatMap((s) => s.questions.map((q) => ({ s, q }))).find((x) => x.q.id === qid);
        if (!found) return { ok: false, message: 'השאלה לא נמצאה' };
        originalText = fmt(found.q.text, g);
        section = found.s;
    }
    const sectionTitle = fmt(section!.title, g);

    // הגבלה: לא יותר מ-40 הצעות ממתינות למשתמש אחד
    const mine = await getSuggestionsByUser(actor.uid).catch(() => []);
    if (mine.filter((s) => s.status === 'pending').length >= MAX_OPEN_PER_USER) {
        return { ok: false, message: 'יש לך כבר הרבה הצעות ממתינות - נחכה להכרעה לפני הצעות נוספות' };
    }

    const item = await createItem({
        category: QUIZ_SUGGESTION_CATEGORY,
        label: `${KIND_LABELS[kind]} · ${sectionTitle}`,
        description: text,
        contact: actor.name,
        user_id: actor.uid,
        icon: '📝',
        color: 'pink',
        extra_fields: {
            kind, gender, qid, status: 'pending', created_at: new Date().toISOString(),
            section_id: section!.id, section_title: sectionTitle,
            original_text: originalText, author_name: actor.name,
        },
    });

    await notifyAdmins(actor, kind, text, item.id, origin);
    return { ok: true, suggestion: toSuggestion(item) };
}

function clip(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

const KIND_PHRASE: Record<SuggestionKind, string> = {
    add: 'הצעה לשאלה חדשה',
    remove: 'הצעה להסרת שאלה',
    edit: 'הצעה לעריכת שאלה',
    comment: 'הערה על שאלה',
};

/** התראה לכל סופר-אדמין (חוץ מהכותב/ת). הטקסט נועד גם להיות גוף ה-SMS: קורא להיכנס ולראות. */
async function notifyAdmins(actor: QuizActor, kind: SuggestionKind, text: string, suggestionId: string, origin: string) {
    try {
        const admins = (await getAllSuperAdmins()).filter((a) => a.id && String(a.id) !== actor.uid);
        const link = `${origin}/admin/quiz-suggestions`;
        await Promise.all(admins.map((a) => createItem({
            category: 'message',
            label: `📝 הצעה חדשה לשאלון ההתאמה מ${actor.name}`,
            description: `${actor.name} כתב/ה ${KIND_PHRASE[kind]}: "${clip(text, 70)}". היכנסו לראות ולהחליט: ${link}`,
            contact: '',
            user_id: a.id,
            icon: '📝',
            color: 'pink',
            extra_fields: {
                type: 'quiz_suggestion',
                read: false,
                link: '/admin/quiz-suggestions',
                suggestion_id: suggestionId,
                requested_by_id: actor.uid,
                requested_by_name: actor.name,
            },
        })));
    } catch (e) {
        console.warn('[quizSuggestions] notify admins failed:', e instanceof Error ? e.message : e);
    }
}

export type DecideResult = { ok: true } | { ok: false; message: string };

export async function decideSuggestion(id: string, status: SuggestionStatus, note: string, adminName: string): Promise<DecideResult> {
    if (!['accepted', 'rejected', 'done', 'pending'].includes(status)) return { ok: false, message: 'החלטה לא תקינה' };
    const it = await getDbItemByIdFresh(id);
    if (!it || it.category !== QUIZ_SUGGESTION_CATEGORY) return { ok: false, message: 'ההצעה לא נמצאה' };
    const ef = parseEf(it.extra_fields);
    await updateItem(id, {
        extra_fields: {
            ...ef, status,
            admin_note: note.trim().slice(0, 600),
            decided_at: new Date().toISOString(),
            decided_by: adminName,
        },
    });
    await markNotificationsHandled(id);
    return { ok: true };
}

/** מסמן את עותקי ההתראה של ההצעה אצל כל הסופר-אדמינים כטופלו (best-effort) */
async function markNotificationsHandled(suggestionId: string) {
    try {
        const admins = await getAllSuperAdmins();
        await Promise.all(admins.filter((a) => a.id).map(async (a) => {
            const msgs = await getMessagesByUserId(String(a.id)).catch(() => []);
            for (const m of msgs) {
                const ef = parseEf(m.extra_fields);
                if (ef.type !== 'quiz_suggestion' || ef.handled || String(ef.suggestion_id) !== suggestionId) continue;
                await updateItem(m.id, { extra_fields: { ...ef, handled: true, read: true } }).catch(() => {});
            }
        }));
    } catch (e) {
        console.warn('[quizSuggestions] mark handled failed:', e instanceof Error ? e.message : e);
    }
}

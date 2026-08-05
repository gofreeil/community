import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserById, getUserByEmail, updateUserProfile, getItemsByUserId, upsertUser, getMessagesByUserId, createItem, updateItem, getAllSuperAdmins, getAllUsers, getItemsByCategory, getItemsByCategoryAndStatus, createNeighborhoodRequest } from '$lib/server/db';
import { finalizeLocationDecision, undoLocationDecision, withdrawOpenLocationRequests } from '$lib/server/locationDecision';
import { getCachedUserById, invalidateCachedUser } from '$lib/server/userCache';
import { citiesData } from '$lib/neighborhoodsData';
import { cityCenters } from '$lib/neighborhoodCoords';
import { categoryConfig } from '$lib/categoryFields';
import { countPending } from '$lib/server/adsStore';

// קטגוריות פרסום אמיתיות (גמ"ח, למסירה, חוגים וכו') - לא קריאות שכונה
const PUBLICATION_CATEGORIES = new Set(Object.keys(categoryConfig));
// קטגוריות קריאות קהילתיות - יוצגו בהודעות
const COMMUNITY_CALL_CATEGORIES = new Set(['raise_hand', 'lost_and_found', 'admin_alert', 'location_request', 'user_feedback']);

export const load: PageServerLoad = async (event) => {
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {
        // cookie פגום - מפנה להתחברות
    }

    // אורח - מאפשרים כניסה לדף אך ללא נתוני משתמש
    if (!session?.user?.id) {
        return {
            user:       null,
            items:      [],
            messages:   [],
            citiesData,
            oauth_image: null,
            pendingAdsCount: 0,
            registeredUsersCount: 0,
            strapiAvailable: true,
            userFromStaleCache: false,
            // כפתור "עם יוצאים לחירות" מזהה רק דרך העוגייה המשותפת gofreeil-auth
            // (SSO לפי דפדפן, לא חוצה-מכשירים). אם היא לא קיימת בדפדפן הזה הכפתור
            // לא יכול להצליח - לכן נציג אותו רק כשהעוגייה נוכחת, אחרת מבוי סתום שקט.
            hasSharedSso: !!event.cookies.get('gofreeil-auth'),
        };
    }

    // משתמש קיים שהגיע מדף ההרשמה עם welcome=1 (ברכת מצטרף חדש) - מפנים
    // לברכת "ברוכים השבים". הדגל isExisting נקבע ב-signIn callback רק כשהמיזוג
    // מצא חשבון קיים בפועל, ולכן מצטרף חדש אמיתי ימשיך לקבל welcome=1 כרגיל.
    if (
        event.url.searchParams.get('welcome') === '1' &&
        (session.user as { isExisting?: boolean }).isExisting
    ) {
        const params = new URLSearchParams(event.url.searchParams);
        params.set('welcome', 'back');
        redirect(303, `/profile?${params.toString()}`);
    }

    let user: Awaited<ReturnType<typeof getUserById>>;
    let items: Awaited<ReturnType<typeof getItemsByUserId>> = [];
    let messages: Awaited<ReturnType<typeof getMessagesByUserId>> = [];
    let strapiAvailable = true;
    let userFromStaleCache = false;

    // שלוש השליפות הראשוניות תלויות רק ב-session.user.id → רצות במקביל (allSettled).
    // בעבר הן רצו בטור, וכש-Strapi איטי/מהבהב הזמן המצטבר (× retries של 6ש') חרג
    // מה-timeout של השרת/שער וכל הדף החזיר 500 למשתמשים מחוברים (בעיקר אדמינים,
    // שמוסיפים עוד קריאות). הרצה במקבילה חותכת את הזמן לזמן הקריאה האיטית בלבד.
    const jwt = event.cookies.get('strapi_jwt');
    const [cachedRes, itemsRes, messagesRes] = await Promise.allSettled([
        getCachedUserById(session.user.id, jwt),
        getItemsByUserId(session.user.id),
        getMessagesByUserId(session.user.id),
    ]);
    if (cachedRes.status === 'fulfilled') {
        user = cachedRes.value.user ?? undefined;
        strapiAvailable = cachedRes.value.strapiAvailable;
        userFromStaleCache = cachedRes.value.stale;
    } else {
        console.warn('[profile] getCachedUserById failed:', cachedRes.reason);
        strapiAvailable = false;
    }
    if (itemsRes.status === 'fulfilled') items = itemsRes.value;
    else console.warn('[profile] getItemsByUserId failed:', itemsRes.reason);
    if (messagesRes.status === 'fulfilled') messages = messagesRes.value;
    else console.warn('[profile] getMessagesByUserId failed:', messagesRes.reason);

    // אם המשתמש לא נמצא לפי ID - נסה לפי אימייל (מיזוג OAuth+credentials)
    if (!user && session.user?.email) {
        try {
            const byEmail = await getUserByEmail(session.user.email);
            if (byEmail) {
                user = byEmail;
                console.log('[profile] merged account by email:', session.user.email, '→', byEmail.id);
            }
        } catch (e) {
            console.warn('[profile] getUserByEmail fallback failed:', e);
        }
    }

    // אם עדיין לא נמצא - צור משתמש חדש מה-session (רק אם אין קיים עם אותו אימייל)
    if (!user && session.user?.id) {
        try {
            const provider = (session.user as { provider?: string }).provider ?? 'google';
            await upsertUser({
                id:         session.user.id,
                name:       session.user.name  ?? null,
                email:      session.user.email ?? null,
                avatar_url: session.user.image ?? null,
                provider,
            });
            const retryJwt = event.cookies.get('strapi_jwt');
            user = await getUserById(session.user.id, retryJwt);
        } catch (e) {
            console.warn('[profile] auto-upsert failed:', e);
        }
    }

    // fallback לתמונת OAuth אם אין avatar_url ב-DB
    const resolvedUser = user
        ? {
            ...user,
            avatar_url: user.avatar_url || session.user?.image || null,
            email:      user.email      || session.user?.email || null,
            name:       user.name       || session.user?.name  || null,
          }
        : {
            id:           session.user.id ?? '',
            name:         session.user?.name  ?? null,
            email:        session.user?.email ?? null,
            avatar_url:   session.user?.image ?? null,
            phone: '', nickname: '', city: '', neighborhood: '',
            business: '', gender: '', family_status: '', birth_date: '',
            notifications: 1, provider: null, password_hash: null, created_at: '',
            // משמר את התפקיד מהסשן כשה-DB לא זמין - אחרת סופר־אדמין יוצג כ"צופה"
            role: ((session.user as { role?: string })?.role ?? 'user') as 'user' | 'neighborhood_admin' | 'super_admin',
            banned: false,
            email_confirmed: true,
            coordinator_of: ((session.user as { coordinator_of?: string[] })?.coordinator_of) ?? [],
            security_question: '', security_answer: '', security_question_2: '', security_answer_2: '', status: 'active',
          };

    // פרסומים אמיתיים - רק קטגוריות מ-categoryConfig
    const publicationItems = (items ?? []).filter(i => PUBLICATION_CATEGORIES.has(i.category));
    // קריאות קהילתיות - יוצגו בהודעות
    const communityRequests = (items ?? []).filter(i => COMMUNITY_CALL_CATEGORIES.has(i.category));

    // ספירת פרסומות ממתינות לאישור - לבאדג' של סופר־אדמין בכותרת לוח הבקרה
    let pendingAdsCount = 0;
    let registeredUsersCount = 0;
    // כרטיסי פנויים שממתינים לאישור - אם 0, התראות "כרטיס פנויים ממתין" מסומנות כטופלו ועוברות להיסטוריה
    let pendingSinglesCount = 0;
    if (resolvedUser?.role === 'super_admin') {
        // שלוש ספירות סופר-אדמין בלתי-תלויות → במקביל (allSettled), כדי לא להוסיף
        // עוד שלושה round-trips סדרתיים לזמן הטעינה. כישלון בכל אחת → נשאר 0 (שקט).
        const [adsRes, usersRes, singlesPendRes] = await Promise.allSettled([
            countPending(),
            getAllUsers(),
            getItemsByCategoryAndStatus('singles', 'pending'),
        ]);
        if (adsRes.status === 'fulfilled') pendingAdsCount = adsRes.value;
        if (usersRes.status === 'fulfilled') registeredUsersCount = usersRes.value.length;
        if (singlesPendRes.status === 'fulfilled') pendingSinglesCount = singlesPendRes.value.length;
    } else if (resolvedUser?.role === 'neighborhood_admin') {
        // אדמין שמונה מאשר פרסומות גם הוא - הבאדג' חייב להופיע גם אצלו
        pendingAdsCount = await countPending().catch(() => 0);
    }

    // ספירת פנויים/פנויות במגדר הנגדי + קבוצת הגיל של המשתמש
    type AgeGroup = 'under30' | '30plus' | 'golden';
    function ageGroupOf(birthDate: string): AgeGroup | null {
        if (!birthDate) return null;
        const d = new Date(birthDate);
        if (isNaN(d.getTime())) return null;
        const now = new Date();
        let age = now.getFullYear() - d.getFullYear();
        const m = now.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
        if (age < 0 || age > 130) return null;
        if (age >= 60) return 'golden';
        if (age >= 30) return '30plus';
        return 'under30';
    }
    function ageGroupLabel(g: AgeGroup): string {
        return g === 'golden' ? 'גיל הזהב' : g === '30plus' ? '30+' : 'עד 30';
    }
    let singlesMatchInfo: { count: number; ageGroupLabel: string; oppositeGenderLabel: string } | null = null;
    const myGender = (resolvedUser?.gender ?? '').toLowerCase();
    const myAgeGroup = ageGroupOf(resolvedUser?.birth_date ?? '');
    if ((myGender === 'male' || myGender === 'female') && myAgeGroup) {
        try {
            const allSingles = await getItemsByCategory('singles');
            const opposite = myGender === 'male' ? 'female' : 'male';
            let count = 0;
            for (const it of allSingles) {
                try {
                    const ef = JSON.parse(it.extra_fields || '{}');
                    // כרטיסים "רק לשדכנים שלנו" אינם ספירה פומבית של פנויים זמינים
                    if (String(ef.visibility ?? '').includes('שדכ')) continue;
                    if ((ef.gender ?? '').toLowerCase() !== opposite) continue;
                    const birth = ef.birth_date || '';
                    if (!birth && ef.age) {
                        const n = Number(ef.age);
                        const g: AgeGroup = n >= 60 ? 'golden' : n >= 30 ? '30plus' : 'under30';
                        if (g === myAgeGroup) count++;
                        continue;
                    }
                    if (ageGroupOf(birth) === myAgeGroup) count++;
                } catch { /* skip */ }
            }
            singlesMatchInfo = {
                count,
                ageGroupLabel: ageGroupLabel(myAgeGroup),
                oppositeGenderLabel: opposite === 'female' ? 'נשים' : 'גברים',
            };
        } catch { /* ignore */ }
    }

    return {
        user: resolvedUser,
        items: publicationItems,
        communityRequests,
        messages,
        citiesData,
        oauth_image: session.user?.image ?? null,
        pendingAdsCount,
        registeredUsersCount,
        pendingSinglesCount,
        strapiAvailable,
        userFromStaleCache,
        singlesMatchInfo,
    };
};

export const actions: Actions = {
    updateProfile: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/profile');

        const strapiJwt = event.cookies.get('strapi_jwt')
            ?? (session.user as { strapiJwt?: string }).strapiJwt
            ?? undefined;

        const formData      = await event.request.formData();
        const name          = formData.get('name')?.toString().trim()          ?? '';
        const email         = formData.get('email')?.toString().trim().toLowerCase() ?? '';
        const nickname      = formData.get('nickname')?.toString().trim()      ?? '';
        const phone         = formData.get('phone')?.toString().trim()         ?? '';
        const city          = formData.get('city')?.toString().trim()          ?? '';
        const neighborhood  = formData.get('neighborhood')?.toString().trim()  ?? '';
        const business      = formData.get('business')?.toString().trim()      ?? '';
        const family_status = formData.get('family_status')?.toString()        ?? '';
        const birth_day    = formData.get('birth_day')?.toString()   ?? '';
        const birth_month  = formData.get('birth_month')?.toString() ?? '';
        const birth_year   = formData.get('birth_year')?.toString()  ?? '';
        const birth_date   = (birth_day && birth_month && birth_year)
            ? `${birth_year}-${birth_month.padStart(2,'0')}-${birth_day.padStart(2,'0')}`
            : '';
        const gender        = formData.get('gender')?.toString()               ?? '';
        const notifications      = formData.get('notifications') === 'true' ? 1 : 0;
        const security_question    = formData.get('security_question')?.toString().trim()    ?? '';
        const security_answer      = formData.get('security_answer')?.toString().trim()      ?? '';
        const security_question_2  = formData.get('security_question_2')?.toString().trim()  ?? '';
        const security_answer_2    = formData.get('security_answer_2')?.toString().trim()    ?? '';
        const status             = formData.get('status')?.toString().trim()             ?? 'active';
        const avatarBase64     = formData.get('avatar_base64')?.toString()     ?? '';
        const avatarRemove     = formData.get('avatar_remove')?.toString()     === '1';
        const customLocation   = formData.get('custom_location')?.toString().trim() ?? '';
        const customLatRaw     = formData.get('custom_lat')?.toString().trim() ?? '';
        const customLngRaw     = formData.get('custom_lng')?.toString().trim() ?? '';
        const customLat        = Number(customLatRaw);
        const customLng        = Number(customLngRaw);
        const hasPin           = !!customLocation && Number.isFinite(customLat) && Number.isFinite(customLng) && customLatRaw !== '' && customLngRaw !== '';

        // שכונה חדשה שהמשתמש הוסיף (custom_location) נשמרת על הפרופיל *מיד* - עוד לפני
        // אישור המנהל - כדי שתופיע לו כברירת מחדל בטפסים אחרים (בעיקר "הצטרפות לצוות הרכזים").
        // בחירת שכונה קיימת מהרשימה גוברת; רק כשלא נבחרה שכונה מהרשימה משתמשים בשם החדש שהוקלד.
        const neighborhoodToSave = neighborhood || customLocation;

        if (!name || name.length < 2) {
            return fail(400, { error: 'שם חייב להכיל לפחות 2 תווים' });
        }

        // מצב השכונה הקודם - כדי לזהות אם המשתמש *עכשיו* קובע/משנה שכונה
        // (ואז בקשת מיקום פתוחה שלו נסגרת אוטומטית), להבדיל מעדכון שדה אחר
        // (טלפון/שם) שאסור לו לגעת בבקשה הפתוחה.
        let prevNeighborhood = '';
        let prevRead = false;
        try {
            let existing = await getUserById(session.user.id, strapiJwt);
            // חשבון ממוזג (OAuth+אימייל) לא נמצא לפי id - בדיוק כמו ב-load נופלים לאימייל.
            // בלי זה prevNeighborhood='' ומסלול ה"פתרון" היה יורה בטעות בכל עריכה של חשבון כזה.
            if (!existing && session.user.email) existing = await getUserByEmail(session.user.email);
            if (existing) { prevNeighborhood = (existing.neighborhood ?? '').trim(); prevRead = true; }
        } catch { /* קריאה נכשלה - prevRead נשאר false ומסלול הפתרון לא יורה */ }

        try {
            await updateUserProfile(session.user.id, {
                name,
                email,
                nickname,
                phone,
                city,
                neighborhood: neighborhoodToSave,
                business,
                family_status,
                birth_date,
                gender,
                notifications,
                ...(avatarBase64 ? { avatar_url: avatarBase64 } : avatarRemove ? { avatar_url: null } : {}),
                ...(security_question ? { security_question, security_answer } : {}),
                ...(security_question_2 ? { security_question_2, security_answer_2 } : {}),
                status,
            }, strapiJwt);

            // סנכרון שכונה: פריט שמפרסמים לפני שהוגדרה שכונה נשמר ב"מרכז הישוב"
            // (ברירת מחדל כשאין שכונה). ברגע שהמשתמש ממלא שכונה אמיתית - נצמיד
            // אליה את פריטיו שנשארו ב"מרכז"/ריק (בעיקר כרטיס הפנויים האישי),
            // אחרת הם לא נספרים ולא מוצגים תחת השכונה הנכונה (ולרכז מראים 0).
            if (neighborhoodToSave && neighborhoodToSave !== 'מרכז') {
                try {
                    const myItems = await getItemsByUserId(session.user.id);
                    await Promise.all((myItems ?? [])
                        .filter((it) => {
                            const n = (it.neighborhood ?? '').trim();
                            return (n === '' || n === 'מרכז')
                                && it.category !== 'message'
                                && it.category !== 'location_request';
                        })
                        .map((it) => updateItem(it.id, { neighborhood: neighborhoodToSave, city })));
                } catch (e) {
                    console.warn('[profile] sync items neighborhood failed:', e);
                }
            }

            // המשתמש בחר שכונה מהרשימה (ולא מבקש הוספת מיקום חדש) → זה *פותר*
            // בקשת מיקום פתוחה שלו: סוגרים אותה כדי שלא תמשיך לתקוע אותו
            // (dedupe "כבר בטיפול") ולא תעמיס על תור המנהל.
            //  • prevRead - רק כשקראנו בוודאות את הערך הקודם (אחרת לא יורים בטעות)
            //  • neighborhood !== prevNeighborhood - רק כששכונה באמת השתנתה בשמירה זו
            //    (עדכון טלפון/שם לבדו לא נוגע בבקשה)
            //  • כולל 'מרכז' - ביישוב חד-שכונתי הוא הבחירה האמיתית, גם הוא פותר בקשה
            if (prevRead && neighborhood && !customLocation && neighborhood !== prevNeighborhood) {
                let resolvedLabel: string | null = null;
                try {
                    resolvedLabel = await withdrawOpenLocationRequests(session.user.id, { city, reason: 'chose_existing' });
                } catch (e) {
                    console.warn('[profile] withdraw on neighborhood pick failed:', e);
                }
                invalidateCachedUser(session.user.id);
                return resolvedLabel
                    ? { success: true, locationResolved: resolvedLabel }
                    : { success: true };
            }

            // אם המשתמש ביקש להוסיף מיקום חדש - שלח בקשה לסופר אדמין
            if (customLocation) {
                const requesterEmail = email || session.user.email || '';
                const requesterName  = name  || session.user.id;

                // נרמול לזיהוי כפילויות - מסיר "שכונת"/"שכונה" מובילה ורווחים כפולים
                // כך ש"שכונת פארק הנחל" ו-"פארק הנחל" נחשבים לאותה בקשה
                const normalizeLoc = (s: string) =>
                    s.trim().replace(/\s+/g, ' ').replace(/^(שכונת|שכונה)\s+/, '').toLowerCase();
                const normalizedNew = normalizeLoc(customLocation);

                // האם למשתמש כבר יש בקשת מיקום פתוחה?
                // כדי לא להציף את האדמין - מותר בקשה פתוחה אחת בכל רגע. אבל היא
                // תמיד ניתנת להחלפה: אם המשתמש שולח *אותה* בקשה שוב → "כבר בטיפול".
                // אם הוא שולח בקשה *שונה* (תיקן את עצמו) → סוגרים את הישנה ומחליפים
                // בחדשה. כך אין הצפה, אבל גם אין חסימה: המשתמש לעולם לא נתקע.
                let openReqLabel = '';
                try {
                    const myItems = await getItemsByUserId(session.user.id);
                    const openReq = (myItems ?? []).find(it =>
                        it.category === 'location_request' &&
                        (it.status ?? 'pending') !== 'handled'
                    );
                    if (openReq) {
                        openReqLabel = (openReq.label ?? '').replace(/^בקשה להוספת מיקום:\s*/, '').trim();
                    }
                } catch (e) {
                    console.warn('[profile] location_request dedupe check failed:', e);
                }

                if (openReqLabel) {
                    if (normalizeLoc(openReqLabel) === normalizedNew) {
                        // אותה בקשה בדיוק כבר ממתינה - מונע כפילות, לא חוסם תיקון
                        invalidateCachedUser(session.user.id);
                        return { success: true, locationAlreadyPending: openReqLabel };
                    }
                    // בקשה *שונה* → המשתמש מתקן את בקשתו: סוגרים את הישנה ומחליפים
                    try {
                        await withdrawOpenLocationRequests(session.user.id, { city, reason: 'superseded' });
                    } catch (e) {
                        console.warn('[profile] supersede old location_request failed:', e);
                    }
                }

                // אם סומן פין מדויק על המפה - צור רשומת שכונה ממתינה (status=pending)
                // לאחר אישור באדמין היא תופיע בבוררים ובמפה לכל המשתמשים, במיקום שסומן.
                if (hasPin) {
                    try {
                        await createNeighborhoodRequest({
                            name: customLocation,
                            city: city || '',
                            lat:  customLat,
                            lng:  customLng,
                            user_id: session.user.id,
                        });
                    } catch (e) {
                        console.warn('[profile] createNeighborhoodRequest failed:', e);
                    }
                }
                try {
                    await createItem({
                        category:    'location_request',
                        label:       `בקשה להוספת מיקום: ${customLocation}`,
                        description: `המשתמש ${requesterName} (${requesterEmail}) ביקש להוסיף את המיקום הבא:\n\n"${customLocation}"`,
                        icon:        '📍',
                        color:       'yellow',
                        user_id:     session.user.id,
                        extra_fields: {
                            requested_by_name:  name  || '',
                            requested_by_email: requesterEmail,
                            requested_by_id:    session.user.id,
                            requested_at:       new Date().toISOString(),
                        },
                    });
                } catch (e) {
                    console.warn('[profile] location_request createItem failed:', e);
                }

                // שלח הודעה אישית לכל סופר־אדמין כדי שהבקשה תופיע מיד בתיבת ההודעות שלו.
                // דדופ פר-אדמין: אם לאדמין כבר יש הודעת בקשת מיקום פתוחה (לא "טופל") לאותו
                // מיקום מאותו מבקש - לא שולחים כפילות. "אל תשלח לי משהו כפול".
                try {
                    const admins = await getAllSuperAdmins();
                    await Promise.all(admins.map(async (admin) => {
                        try {
                            const inbox = await getMessagesByUserId(admin.id);
                            const dup = (inbox ?? []).some((m) => {
                                let ef: Record<string, unknown> = {};
                                try { ef = JSON.parse(m.extra_fields || '{}') ?? {}; } catch { return false; }
                                return String(ef?.type ?? '') === 'location_request' &&
                                    !ef?.handled &&
                                    String(ef?.requested_by_id ?? '') === session.user.id &&
                                    normalizeLoc(String(ef?.requested_location ?? '')) === normalizedNew;
                            });
                            if (dup) return;
                        } catch { /* אם הבדיקה נכשלה - עדיף לשלוח מאשר להחסיר בקשה */ }
                        await createItem({
                            category:    'message',
                            label:       `📍 בקשת מיקום חדש: ${customLocation}`,
                            description:
                                `המשתמש ${requesterName} (${requesterEmail}) ביקש להוסיף מיקום שאינו מופיע ברשימה:\n\n` +
                                `"${customLocation}"${city ? ` (עיר: ${city})` : ''}\n\n` +
                                (hasPin
                                    ? `📍 המיקום סומן על המפה: ${customLat}, ${customLng}\nhttps://www.google.com/maps?q=${customLat},${customLng}\n\nאשר/דחה בעמוד הניהול תחת "שכונות ממתינות".`
                                    : `יש לבחון אם להוסיף לרשימת הערים/השכונות.`),
                            icon:        '📍',
                            color:       'yellow',
                            user_id:     admin.id,
                            extra_fields: {
                                type:               'location_request',
                                requested_location: customLocation,
                                requested_city:     city || '',
                                requested_lat:      hasPin ? customLat : null,
                                requested_lng:      hasPin ? customLng : null,
                                requested_by_name:  name  || '',
                                requested_by_email: requesterEmail,
                                requested_by_id:    session.user.id,
                                requested_at:       new Date().toISOString(),
                            },
                        });
                    }));
                } catch (e) {
                    console.warn('[profile] notify super_admins failed:', e);
                }

                // אישור הקליטה למבקש מוצג כטוסט חולף בפרופיל (locationRequestSent) -
                // בלי הודעה בתיבת ההודעות, כדי לא להציף אותה. לתיבה מגיעה רק הודעת ההחלטה.

                invalidateCachedUser(session.user.id);
                return { success: true, locationRequestSent: customLocation };
            }

            invalidateCachedUser(session.user.id);
            return { success: true };
        } catch {
            return fail(500, { error: 'שגיאה בעדכון הפרופיל' });
        }
    },

    updateStatus: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) return fail(401, { error: 'לא מחובר' });

        const formData = await event.request.formData();
        const status   = formData.get('status')?.toString().trim() ?? 'active';

        try {
            await updateUserProfile(session.user.id, { status });
            invalidateCachedUser(session.user.id);
            return { success: true };
        } catch {
            return fail(500, { error: 'שגיאה בעדכון סטטוס' });
        }
    },

    sendFeedback: async (event) => {
        let session = null;
        try { session = await event.locals.auth(); } catch {}
        if (!session?.user?.id) throw redirect(302, '/login?redirect=/profile');

        const formData = await event.request.formData();
        const text = formData.get('feedback_text')?.toString().trim() ?? '';

        if (!text || text.length < 5) {
            return fail(400, { feedbackError: 'אנא כתוב הודעה של לפחות 5 תווים' });
        }

        try {
            // שמור את הפנייה כפריט מסוג user_feedback
            await createItem({
                category:    'user_feedback',
                label:       `פנייה מ-${session.user.name ?? session.user.id}`,
                description: text,
                user_id:     session.user.id,
                extra_fields: {
                    from_name:  session.user.name  ?? '',
                    from_email: session.user.email ?? '',
                    sent_at:    new Date().toISOString(),
                },
            });
            // שלח הודעת אישור לתיבת ההודעות של המשתמש
            await createItem({
                category:    'message',
                label:       'פנייתך התקבלה',
                description: 'תודה על פנייתך! הצוות של יוצאים לחירות יחזור אליך בהקדם.',
                user_id:     session.user.id,
            });
            return { feedbackSuccess: true };
        } catch {
            return fail(500, { feedbackError: 'שגיאה בשליחת הפנייה, נסה שוב' });
        }
    },

    // אישור בקשת מיקום מתוך כרטיס ההודעה (סופר-אדמין בלבד):
    // יוצר/מאשר רשומת שכונה, מודיע למבקש, ומוחק את ההתראה מה-DB
    approveLocationRequest: (event) => handleLocationRequest(event, 'approve'),

    // דחיית בקשת מיקום מתוך כרטיס ההודעה (סופר-אדמין בלבד)
    rejectLocationRequest: (event) => handleLocationRequest(event, 'reject'),

    // ביטול החלטה על בקשת מיקום ("לחצתי אישור בטעות") - סופר-אדמין בלבד.
    // מחזיר את הבקשה לממתינות, מוחק את הודעת ההחלטה מהמבקש, ומחזיר את
    // הודעת האדמין למצב פעיל עם כפתורי אשר/דחה
    undoLocationRequest: async (event) => {
        const adminId = await requireSuperAdminId(event);
        if (!adminId) return fail(403, { lrError: 'נדרשת הרשאת מנהל ראשי' });

        const form = await event.request.formData();
        const msgId       = form.get('msgId')?.toString() ?? '';
        const location    = form.get('location')?.toString().trim() ?? '';
        const city        = form.get('city')?.toString().trim() ?? '';
        const requesterId = form.get('requesterId')?.toString() ?? '';
        const decision    = form.get('decision')?.toString() === 'reject' ? 'reject' : 'approve';
        if (!location) return fail(400, { lrError: 'חסר שם המיקום בבקשה' });

        try {
            await undoLocationDecision({
                decision,
                location,
                city,
                requesterId: requesterId || undefined,
                adminMsgId:  msgId || undefined,
                undoneBy:    adminId,
            });
            return { lrUndoSuccess: true, lrLocation: location };
        } catch (e) {
            console.warn('[profile] undoLocationRequest failed:', e);
            return fail(500, { lrError: 'שגיאה בביטול ההחלטה, נסה שוב' });
        }
    },
};

/** מוודא שהמשתמש המחובר הוא סופר-אדמין (כולל fallback לפי אימייל למיזוג OAuth+credentials) */
async function requireSuperAdminId(event: Parameters<NonNullable<Actions[string]>>[0]): Promise<string | null> {
    let session = null;
    try { session = await event.locals.auth(); } catch {}
    if (!session?.user?.id) return null;
    let isSuper = session.user.role === 'super_admin';
    if (!isSuper) {
        try {
            let dbUser = await getUserById(session.user.id);
            if (!dbUser && session.user.email) dbUser = await getUserByEmail(session.user.email);
            isSuper = dbUser?.role === 'super_admin';
        } catch { /* ignore */ }
    }
    return isSuper ? session.user.id : null;
}

/** טיפול בבקשת מיקום (אישור/דחייה) מכרטיס ההודעה בפרופיל הסופר-אדמין */
async function handleLocationRequest(event: Parameters<NonNullable<Actions[string]>>[0], decision: 'approve' | 'reject') {
    const adminId = await requireSuperAdminId(event);
    if (!adminId) return fail(403, { lrError: 'נדרשת הרשאת מנהל ראשי' });

    const form = await event.request.formData();
    const msgId       = form.get('msgId')?.toString() ?? '';
    const location    = form.get('location')?.toString().trim() ?? '';
    const city        = form.get('city')?.toString().trim() ?? '';
    const requesterId = form.get('requesterId')?.toString() ?? '';
    const latRaw      = parseFloat(form.get('lat')?.toString() ?? '');
    const lngRaw      = parseFloat(form.get('lng')?.toString() ?? '');
    if (!location) return fail(400, { lrError: 'חסר שם המיקום בבקשה' });

    try {
        if (decision === 'approve') {
            // ודא שקיימת רשומת שכונה (createNeighborhoodRequest מחזיר קיימת אם יש, או יוצר).
            // האישור בפועל נעשה בתוך finalizeLocationDecision כדי שיהיה מסלול אישור יחיד.
            // קואורדינטות: פין אם סומן, אחרת מרכז העיר, אחרת ברירת מחדל ירושלים
            const hasPin = Number.isFinite(latRaw) && Number.isFinite(lngRaw);
            const fallback = cityCenters[city] ?? cityCenters[location] ?? cityCenters['ירושלים'];
            await createNeighborhoodRequest({
                name:    location,
                city:    city || location,
                lat:     hasPin ? latRaw : fallback[0],
                lng:     hasPin ? lngRaw : fallback[1],
                user_id: requesterId || undefined,
            });
        }

        // תוצאה אחידה מכל מסלול אישור/דחייה: הודעת החלטה למבקש, סגירת פריטי הבקשה,
        // סנכרון רשומת השכונה הממתינה (אישור/דחייה), וסימון "טופל" על הודעת האדמין
        await finalizeLocationDecision({
            decision,
            location,
            city,
            requesterId: requesterId || undefined,
            adminMsgId:  msgId || undefined,
        });

        return { lrSuccess: decision, lrLocation: location };
    } catch (e) {
        console.warn('[profile] handleLocationRequest failed:', e);
        return fail(500, { lrError: 'שגיאה בטיפול בבקשה, נסה שוב' });
    }
}

import { redirect, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getUserById, getUserByEmail, updateUserProfile, getItemsByUserId, upsertUser, getMessagesByUserId, createItem, getAllSuperAdmins, getAllUsers, getItemsByCategory, getItemsByCategoryAndStatus, createNeighborhoodRequest } from '$lib/server/db';
import { getCachedUserById, invalidateCachedUser } from '$lib/server/userCache';
import { citiesData } from '$lib/neighborhoodsData';
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
            coordinatorsCount: 0,
            strapiAvailable: true,
            userFromStaleCache: false,
            // כפתור "עם יוצאים לחירות" מזהה רק דרך העוגייה המשותפת gofreeil-auth
            // (SSO לפי דפדפן, לא חוצה-מכשירים). אם היא לא קיימת בדפדפן הזה הכפתור
            // לא יכול להצליח - לכן נציג אותו רק כשהעוגייה נוכחת, אחרת מבוי סתום שקט.
            hasSharedSso: !!event.cookies.get('gofreeil-auth'),
        };
    }

    // העתקת תמונה מגוגל - המשתמש לחץ "העתק מחשבון גוגל" וחזר עם ?copy_photo=1
    const copyPhoto = event.url.searchParams.get('copy_photo') === '1';
    if (copyPhoto && session.user?.image) {
        try {
            const jwt = event.cookies.get('strapi_jwt')
                ?? (session.user as { strapiJwt?: string }).strapiJwt
                ?? undefined;
            await updateUserProfile(session.user.id, { avatar_url: session.user.image }, jwt);
        } catch (e) {
            console.warn('[profile] copy_photo update failed:', e);
        }
        throw redirect(302, '/profile?photo_done=1');
    }

    let user: Awaited<ReturnType<typeof getUserById>>;
    let items: Awaited<ReturnType<typeof getItemsByUserId>> = [];
    let strapiAvailable = true;
    let userFromStaleCache = false;
    try {
        const jwt = event.cookies.get('strapi_jwt');
        const cached = await getCachedUserById(session.user.id, jwt);
        user = cached.user ?? undefined;
        strapiAvailable = cached.strapiAvailable;
        userFromStaleCache = cached.stale;
    } catch (e) {
        console.warn('[profile] getCachedUserById failed:', e);
        strapiAvailable = false;
    }
    try {
        items = await getItemsByUserId(session.user.id);
    } catch (e) {
        console.warn('[profile] getItemsByUserId failed:', e);
        items = [];
    }

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
            coordinator_of: ((session.user as { coordinator_of?: string[] })?.coordinator_of) ?? [],
            security_question: '', security_answer: '', security_question_2: '', security_answer_2: '', status: 'active',
          };

    let messages: Awaited<ReturnType<typeof getMessagesByUserId>> = [];
    try {
        messages = await getMessagesByUserId(session.user.id);
    } catch (e) {
        console.warn('[profile] getMessagesByUserId failed:', e);
    }

    // פרסומים אמיתיים - רק קטגוריות מ-categoryConfig
    const publicationItems = (items ?? []).filter(i => PUBLICATION_CATEGORIES.has(i.category));
    // קריאות קהילתיות - יוצגו בהודעות
    const communityRequests = (items ?? []).filter(i => COMMUNITY_CALL_CATEGORIES.has(i.category));

    // ספירת פרסומות ממתינות לאישור - לבאדג' של סופר־אדמין בכותרת לוח הבקרה
    let pendingAdsCount = 0;
    let coordinatorsCount = 0;
    // כרטיסי פנויים שממתינים לאישור - אם 0, התראות "כרטיס פנויים ממתין" מסומנות כטופלו ועוברות להיסטוריה
    let pendingSinglesCount = 0;
    if (resolvedUser?.role === 'super_admin') {
        try { pendingAdsCount = await countPending(); } catch { /* שקט */ }
        try {
            const allUsers = await getAllUsers();
            coordinatorsCount = allUsers.filter(u => Array.isArray(u.coordinator_of) && u.coordinator_of.length > 0).length;
        } catch { /* שקט */ }
        try { pendingSinglesCount = (await getItemsByCategoryAndStatus('singles', 'pending')).length; } catch { /* שקט */ }
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
        coordinatorsCount,
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
        const customLocation   = formData.get('custom_location')?.toString().trim() ?? '';
        const customLatRaw     = formData.get('custom_lat')?.toString().trim() ?? '';
        const customLngRaw     = formData.get('custom_lng')?.toString().trim() ?? '';
        const customLat        = Number(customLatRaw);
        const customLng        = Number(customLngRaw);
        const hasPin           = !!customLocation && Number.isFinite(customLat) && Number.isFinite(customLng) && customLatRaw !== '' && customLngRaw !== '';

        if (!name || name.length < 2) {
            return fail(400, { error: 'שם חייב להכיל לפחות 2 תווים' });
        }

        try {
            await updateUserProfile(session.user.id, {
                name,
                email,
                nickname,
                phone,
                city,
                neighborhood,
                business,
                family_status,
                birth_date,
                gender,
                notifications,
                ...(avatarBase64 ? { avatar_url: avatarBase64 } : {}),
                ...(security_question ? { security_question, security_answer } : {}),
                ...(security_question_2 ? { security_question_2, security_answer_2 } : {}),
                status,
            }, strapiJwt);

            // אם המשתמש ביקש להוסיף מיקום חדש - שלח בקשה לסופר אדמין
            if (customLocation) {
                const requesterEmail = email || session.user.email || '';
                const requesterName  = name  || session.user.id;

                // נרמול לזיהוי כפילויות - מסיר "שכונת"/"שכונה" מובילה ורווחים כפולים
                // כך ש"שכונת פארק הנחל" ו-"פארק הנחל" נחשבים לאותה בקשה
                const normalizeLoc = (s: string) =>
                    s.trim().replace(/\s+/g, ' ').replace(/^(שכונת|שכונה)\s+/, '').toLowerCase();
                const normalizedNew = normalizeLoc(customLocation);

                // כבר קיימת בקשת מיקום פתוחה מאותו משתמש לאותו מיקום? → אל תיצור כפילות ואל תציף את האדמין
                let alreadyPending = false;
                try {
                    const myItems = await getItemsByUserId(session.user.id);
                    alreadyPending = (myItems ?? []).some(it =>
                        it.category === 'location_request' &&
                        (it.status ?? 'pending') !== 'handled' &&
                        normalizeLoc((it.label ?? '').replace(/^בקשה להוספת מיקום:\s*/, '')) === normalizedNew
                    );
                } catch (e) {
                    console.warn('[profile] location_request dedupe check failed:', e);
                }

                if (alreadyPending) {
                    invalidateCachedUser(session.user.id);
                    return { success: true, locationAlreadyPending: customLocation };
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

                // שלח הודעה אישית לכל סופר־אדמין כדי שהבקשה תופיע מיד בתיבת ההודעות שלו
                try {
                    const admins = await getAllSuperAdmins();
                    await Promise.all(admins.map(admin => createItem({
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
                            requested_lat:      hasPin ? customLat : null,
                            requested_lng:      hasPin ? customLng : null,
                            requested_by_name:  name  || '',
                            requested_by_email: requesterEmail,
                            requested_by_id:    session.user.id,
                            requested_at:       new Date().toISOString(),
                        },
                    })));
                } catch (e) {
                    console.warn('[profile] notify super_admins failed:', e);
                }

                // הודעת אישור לצרכן עצמו - מופיעה מיד ב-/messages ומהווה הוכחה שהבקשה נקלטה.
                // בלי זה המשתמש לא מקבל שום סימן שהבקשה עברה, מניח שנכשל, ושולח שוב ושוב.
                try {
                    await createItem({
                        category:    'message',
                        label:       `📍 בקשתך להוספת "${customLocation}" התקבלה`,
                        description:
                            `קיבלנו את בקשתך להוסיף את "${customLocation}"${city ? ` (${city})` : ''} לרשימת השכונות.\n` +
                            `הבקשה ממתינה לאישור מנהל — נעדכן אותך כאן ברגע שהשכונה תתווסף. אין צורך לשלוח שוב 🙏`,
                        icon:        '📍',
                        color:       'green',
                        user_id:     session.user.id,
                        extra_fields: {
                            type:               'location_request_ack',
                            requested_location: customLocation,
                            requested_at:       new Date().toISOString(),
                        },
                    });
                } catch (e) {
                    console.warn('[profile] user ack message failed:', e);
                }

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
};

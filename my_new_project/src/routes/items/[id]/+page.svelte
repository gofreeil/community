<script lang="ts">
    import { onMount } from "svelte";
    import CameraCapture from "$lib/components/CameraCapture.svelte";
    import { locale, t } from "svelte-i18n";
    import { get } from "svelte/store";
    let _loc = $state(get(locale));
    $effect(() => locale.subscribe(l => (_loc = l)));
    const tFn = (k: string) => { void _loc; return get(t)(k); };
    import { fade, fly, scale } from "svelte/transition";
    import type { PageData } from './$types';
    import JsonLd from "$lib/components/JsonLd.svelte";
    import { productSchema, eventSchema } from "$lib/seo";
    import { formatOpeningHours, formatOpeningHoursLines, DAY_SHORT } from "$lib/openingHours";
    import { gmachTypeLabel } from "$lib/gmachTypes";
    import { trOr, cfCatKey, categoryConfig } from "$lib/categoryFields";
    import { imageDrop } from "$lib/imageDrop";
    import { openCropper } from "$lib/imageCropper.svelte";
    import CategoryDetailsEditor from "$lib/components/CategoryDetailsEditor.svelte";
    import OpeningHoursEditor from "$lib/components/OpeningHoursEditor.svelte";
    import { goto } from "$app/navigation";
    import { PLACE_STATUSES, placeStatusInfo } from "$lib/placeStatus";
    import { logoForService, serviceLabel } from "$lib/serviceTypes";

    let { data }: { data: PageData } = $props();
    const item = $derived(data.item);

    let mounted = $state(false);
    let galleryIndex = $state(0);
    let lightboxOpen = $state(false);

    // ---- תגובות על הפריט ----
    interface ItemComment { id: string; user_id: string; name: string; text: string; at: string; }
    // תגובות מקומיות (נוספות/נמחקות מיידית ללא רענון) - מסונכרן מהשרת לפי מזהה הפריט
    let localComments = $state<ItemComment[]>([]);
    let commentsForId = $state<string | null>(null);
    $effect(() => {
        const id = (item as { id?: string } | null)?.id ?? null;
        if (id === commentsForId) return; // כבר מסונכרן לפריט הזה
        const raw = (item as { extraFields?: { comments?: unknown } } | null)?.extraFields?.comments;
        localComments = Array.isArray(raw)
            ? raw.filter((c): c is ItemComment =>
                !!c && typeof c === 'object' && typeof (c as ItemComment).text === 'string')
            : [];
        commentsForId = id;
    });
    // חדש למעלה, ישן למטה
    const sortedComments = $derived(
        [...localComments].sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    );
    const isLoggedIn = $derived(!!(data as { isLoggedIn?: boolean }).isLoggedIn);
    const viewerId = $derived((data as { viewerId?: string }).viewerId ?? '');
    const canModerateComments = $derived(!!(item as { canEditActivities?: boolean } | null)?.canEditActivities);

    let newComment = $state('');
    let sendingComment = $state(false);
    let commentError = $state('');

    function commentTimeAgo(iso: string): string {
        if (!iso) return '';
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'הרגע';
        if (mins < 60) return `לפני ${mins} דק׳`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `לפני ${hours} שע׳`;
        const days = Math.floor(hours / 24);
        if (days === 1) return 'אתמול';
        if (days < 30) return `לפני ${days} ימים`;
        return new Date(iso).toLocaleDateString('he-IL');
    }

    async function submitComment() {
        const text = newComment.trim();
        if (!text || sendingComment || !item) return;
        sendingComment = true;
        commentError = '';
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'add_comment', text }),
            });
            const result = await res.json().catch(() => ({}));
            if (res.ok && result?.comment) {
                localComments = [...localComments, result.comment as ItemComment];
                newComment = '';
            } else if (res.status === 401) {
                window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
            } else {
                commentError = result?.message || 'שגיאה בשליחת התגובה';
            }
        } catch {
            commentError = 'שגיאה בשליחת התגובה';
        } finally {
            sendingComment = false;
        }
    }

    async function deleteComment(commentId: string) {
        if (!item) return;
        const prev = localComments;
        localComments = localComments.filter(c => c.id !== commentId); // אופטימי
        commentError = '';
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'delete_comment', comment_id: commentId }),
            });
            if (!res.ok) {
                localComments = prev; // כשל - החזרה
                if (res.status === 401) {
                    window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                    return;
                }
                // בלי הודעה - התגובה "קופצת חזרה" ונראית כמו באג
                const result = await res.json().catch(() => ({}));
                commentError = result?.message || 'שגיאה במחיקת התגובה';
            }
        } catch {
            localComments = prev;
            commentError = 'שגיאה במחיקת התגובה';
        }
    }

    // ---- מצב בניית הדף: הבעלים/רכז עורך את הדף בדיוק כפי שהגולש רואה אותו ----
    const canEditPage = $derived(!!(item as { canEditPage?: boolean } | null)?.canEditPage);
    let builderMode = $state(false);
    let isNewItem = $state(false);

    // ערכים שנשמרו הרגע במצב בנייה - מוצגים מיד, בלי רענון דף
    let fieldOverrides = $state<Record<string, string>>({});
    let imagesOverride = $state<string[] | null>(null);
    let activitiesOverride = $state<ScheduleRow[] | null>(null);
    let linksOverride = $state<Array<{ label: string; url: string; desc?: string }> | null>(null);
    // קישורי רשתות חברתיות + אתר שנשמרו הרגע במצב בנייה - מוצגים מיד בלי רענון
    let socialOverride = $state<Record<string, string>>({});

    function openLightbox() { lightboxOpen = true; }
    function closeLightbox() { lightboxOpen = false; }
    function onLightboxKey(e: KeyboardEvent) {
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') nextImage();
        else if (e.key === 'ArrowRight') prevImage();
    }
    $effect(() => {
        if (lightboxOpen) {
            window.addEventListener('keydown', onLightboxKey);
            document.body.style.overflow = 'hidden';
            return () => {
                window.removeEventListener('keydown', onLightboxKey);
                document.body.style.overflow = '';
            };
        }
    });

    const galleryImages = $derived<string[]>(
        imagesOverride ?? (
            Array.isArray((item as { images?: string[] } | null)?.images)
                ? ((item as { images?: string[] }).images ?? [])
                : (item?.image ? [item.image] : [])
        )
    );

    // סמל "שירות ציבורי" לפי service_type - מוצג בכותרת כשאין תמונות אמיתיות
    const serviceLogo = $derived.by<string>(() => {
        const ef = (item as { extraFields?: Record<string, unknown> } | null)?.extraFields;
        return logoForService(ef);
    });
    const serviceTypeLabel = $derived.by<string>(() => {
        const ef = (item as { extraFields?: { service_type?: unknown } } | null)?.extraFields;
        return serviceLabel(typeof ef?.service_type === 'string' ? ef.service_type : '');
    });

    // Strip legacy "פנוי, " / "פנויה, " prefix from titles (user requested twice)
    const displayLabel = $derived.by(() => {
        const raw = String(fieldOverrides.label ?? item?.label ?? '');
        const cleaned = raw.replace(/^\s*פנוי(ה)?\s*,?\s*/, '').trim();
        return cleaned || raw;
    });

    // ערכי תצוגה עם עדיפות לעריכות שנשמרו הרגע במצב בנייה
    const displayDescription = $derived(fieldOverrides.description ?? String(item?.description ?? ''));
    const displayPhone       = $derived(fieldOverrides.phone       ?? String(item?.phone ?? ''));
    const displayContact     = $derived(fieldOverrides.contact     ?? String(item?.contact ?? ''));

    // קישורים מותאמים-אישית (extra_fields.links) - מוצגים ככפתורים בדף
    const customLinks = $derived.by<Array<{ label: string; url: string; desc?: string }>>(() => {
        if (linksOverride) return linksOverride;
        const raw = (item as { extraFields?: { links?: unknown } } | null)?.extraFields?.links;
        if (!Array.isArray(raw)) return [];
        return raw
            .filter((l): l is Record<string, unknown> => !!l && typeof l === 'object')
            .map(l => {
                const desc = String(l.desc ?? '').trim();
                return { label: String(l.label ?? '').trim() || 'קישור', url: String(l.url ?? '').trim(), ...(desc ? { desc } : {}) };
            })
            .filter(l => l.url);
    });
    const hasSocialLinks = $derived.by(() => {
        const ef = (item as { extraFields?: Record<string, unknown> } | null)?.extraFields;
        return ['website', 'whatsapp', 'telegram', 'facebook', 'instagram', 'youtube', 'tiktok']
            .some(k => {
                const v = socialOverride[k] ?? ef?.[k];
                return typeof v === 'string' && v.trim() !== '';
            });
    });

    // ---- ניווט: וייז / גוגל מפות / מוביט (לפי קואורדינטות, ובאין - לפי כתובת) ----
    let navMenuOpen = $state(false);
    const navLat = $derived((item as { lat?: number | null } | null)?.lat ?? null);
    const navLng = $derived((item as { lng?: number | null } | null)?.lng ?? null);
    const navHasCoords = $derived(typeof navLat === 'number' && typeof navLng === 'number');
    const navQuery = $derived.by(() => {
        const addr = (item as { address?: string } | null)?.address ?? '';
        const city = (item as { city?: string } | null)?.city ?? '';
        return [addr, city].map(s => s.trim()).filter(Boolean).join(', ') || displayLabel;
    });
    const canNavigate = $derived(navHasCoords || !!(item as { address?: string } | null)?.address);
    const wazeUrl = $derived(navHasCoords
        ? `https://waze.com/ul?ll=${navLat}%2C${navLng}&navigate=yes`
        : `https://waze.com/ul?q=${encodeURIComponent(navQuery)}&navigate=yes`);
    const googleMapsUrl = $derived(
        `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(navHasCoords ? `${navLat},${navLng}` : navQuery)}`);
    const moovitUrl = $derived(navHasCoords
        ? `https://moovit.com/?to=${encodeURIComponent(displayLabel || navQuery)}&tll=${navLat}_${navLng}&lang=he`
        : `https://moovit.com/?to=${encodeURIComponent(navQuery)}&lang=he`);
    // "אפליקציה אחרת" - קישור geo:/מפה גנרי שמערכת ההפעלה פותחת באפליקציה המועדפת של המשתמש
    const otherAppUrl = $derived(navHasCoords
        ? `geo:${navLat},${navLng}?q=${navLat},${navLng}(${encodeURIComponent(displayLabel || 'יעד')})`
        : `geo:0,0?q=${encodeURIComponent(navQuery)}`);

    const nickname = $derived<string>(
        typeof (item as { extraFields?: { nickname?: unknown } } | null)?.extraFields?.nickname === 'string'
            ? ((item as { extraFields: { nickname: string } }).extraFields.nickname).trim()
            : ''
    );

    const sector = $derived<string>(
        typeof (item as { extraFields?: { sector?: unknown } } | null)?.extraFields?.sector === 'string'
            ? ((item as { extraFields: { sector: string } }).extraFields.sector).trim()
            : ''
    );

    const age = $derived.by<number | null>(() => {
        const ef = (item as { extraFields?: Record<string, unknown> } | null)?.extraFields;
        if (!ef) return null;
        const rawAge = ef.age;
        if (typeof rawAge === 'number' && rawAge > 0 && rawAge < 130) return rawAge;
        if (typeof rawAge === 'string' && /^\d+$/.test(rawAge.trim())) {
            const n = Number(rawAge.trim());
            if (n > 0 && n < 130) return n;
        }
        const bd = ef.birth_date;
        if (typeof bd === 'string' && bd.trim()) {
            const d = new Date(bd);
            if (!isNaN(d.getTime())) {
                const now = new Date();
                let a = now.getFullYear() - d.getFullYear();
                const m = now.getMonth() - d.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
                if (a > 0 && a < 130) return a;
            }
        }
        return null;
    });

    const nicknameWithAge = $derived(
        nickname && age != null ? `${nickname}, ${age}` : (nickname || (age != null ? String(age) : ''))
    );

    // ---- לוח פעילויות ----
    // אפשרויות סוג הפעילות תלויות-קטגוריה: יהדות = תפילה/שיעור/מקווה,
    // שירות ציבורי = קבלת קהל/מענה טלפוני וכו'. שאר הקטגוריות = ברירת מחדל ניטרלית.
    type ScheduleRow = { type: string; time: string; days: string; note: string };
    const ACTIVITY_TYPES_BY_CATEGORY: Record<string, string[]> = {
        minyanim:    ['תפילה / מניין', 'שיעור תורה', 'מקווה', 'שבת', 'אחר'],
        attractions: ['שעות קבלת קהל', 'מענה טלפוני', 'קבלת קהל במחלקה', 'יום / שירות מיוחד', 'אחר'],
    };
    const ACTIVITY_TYPES_DEFAULT = ['שעות פעילות', 'יום פעילות', 'מפגש / אירוע', 'אחר'];
    const activityTypes = $derived<string[]>(
        ACTIVITY_TYPES_BY_CATEGORY[String(item?.category ?? '')] ?? ACTIVITY_TYPES_DEFAULT
    );
    // דוגמה מותאמת-קטגוריה לטקסטים המנחים
    const activityExample = $derived<string>(
        item?.category === 'minyanim'    ? 'שיעור / מקווה / שבת'
        : item?.category === 'attractions' ? 'קבלת קהל / מענה טלפוני'
        : 'שעות פעילות'
    );

    const activities = $derived.by<ScheduleRow[]>(() => {
        if (activitiesOverride) return activitiesOverride;
        const a = (item as { extraFields?: { activities?: unknown } } | null)?.extraFields?.activities;
        if (!Array.isArray(a)) return [];
        return a
            .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object')
            .map(r => ({
                type: String(r.type ?? ''), time: String(r.time ?? ''),
                days: String(r.days ?? ''), note: String(r.note ?? ''),
            }));
    });
    const canEditActivities = $derived(!!(item as { canEditActivities?: boolean } | null)?.canEditActivities);

    // ---- מניינים: זמני תפילות (בקטגוריית יהדות) ----
    // נשמרים באותו מערך activities עם type = שם התפילה, כדי להיות חלק מלוח הפעילויות.
    // תפילות החול: שחרית / מנחה / ערבית. תפילות שבת: רובריקות נפרדות עם type ייחודי
    // (כדי לא להתנגש בחול). לכל תפילה אפשר שעות וגם זמן במילים (וותיקין / לפי שקיעה,
    // שמשתנה כל שבוע) - הטקסט החופשי נשמר בשדה note של השורה.
    const MINYAN_PRAYERS = ['שחרית', 'מנחה', 'ערבית'];
    const SHABBAT_PRAYERS: { key: string; label: string }[] = [
        { key: 'מנחה וקבלת שבת', label: 'מנחה וקבלת שבת' },
        { key: 'שחרית שבת',       label: 'שחרית' },
        { key: 'מנחה שבת',        label: 'מנחה' },
        { key: 'ערבית מוצ״ש',     label: 'ערבית מוצאי שבת' },
    ];
    const SHABBAT_KEYS = SHABBAT_PRAYERS.map(p => p.key);
    const ALL_PRAYER_KEYS = [...MINYAN_PRAYERS, ...SHABBAT_KEYS];
    /** תווית תצוגה לפי type (שבת מקבל תווית מקוצרת תחת הכותרת "שבת") */
    function prayerLabel(type: string): string {
        return SHABBAT_PRAYERS.find(p => p.key === type)?.label ?? type;
    }
    const isMinyanCategory = $derived(item?.category === 'minyanim');
    // הפרדה: שורות התפילה (חול + שבת) מול שאר הפעילויות - כדי לא להציג פעמיים
    const minyanActivities = $derived<ScheduleRow[]>(activities.filter(a => ALL_PRAYER_KEYS.includes(a.type)));
    const weekdayMinyanim  = $derived<ScheduleRow[]>(activities.filter(a => MINYAN_PRAYERS.includes(a.type)));
    const shabbatMinyanim  = $derived<ScheduleRow[]>(activities.filter(a => SHABBAT_KEYS.includes(a.type)));
    const otherActivities  = $derived<ScheduleRow[]>(activities.filter(a => !ALL_PRAYER_KEYS.includes(a.type)));

    // שעות פתיחה (extra_fields.hours) - מוצג תחת "לוח פעילויות ושעות" (לא תחת "פרטים נוספים").
    // כל קבוצת ימים בשורה נפרדת - לקריאות בתצוגה הסופית.
    const openingHoursLines = $derived.by<string[]>(() => {
        const live = liveExtra.hours;
        const raw = typeof live === 'string'
            ? live
            : (item as { extraFields?: { hours?: unknown } } | null)?.extraFields?.hours;
        if (typeof raw !== 'string' || !raw.trim()) return [];
        return formatOpeningHoursLines(raw, {
            days: Array.from({ length: 7 }, (_, i) => trOr(tFn, `labels.day_short_${i}`, DAY_SHORT[i])),
            closed: trOr(tFn, 'labels.oh_closed', 'סגור'),
        });
    });

    let editingMinyan = $state(false);
    let savingMinyan = $state(false);
    let minyanError = $state('');
    // לכל תפילה: רשימת שעות (אפשר כמה מניינים) + סימון "אין מניין" + זמן במילים
    let minyanSlots = $state<Record<string, string[]>>({});
    let minyanSkip = $state<Record<string, boolean>>({});
    let minyanText = $state<Record<string, string>>({});

    function startEditMinyan() {
        const slots: Record<string, string[]> = {};
        const skip: Record<string, boolean> = {};
        const text: Record<string, string> = {};
        for (const p of ALL_PRAYER_KEYS) {
            const row = minyanActivities.find(a => a.type === p);
            const times = row ? row.time.split(',').map(t => t.trim()).filter(Boolean) : [];
            slots[p] = times.length ? times : [''];
            skip[p] = false;
            text[p] = row?.note ?? '';
        }
        minyanSlots = slots;
        minyanSkip = skip;
        minyanText = text;
        minyanError = '';
        editingMinyan = true;
    }
    function addMinyanSlot(p: string) {
        minyanSlots = { ...minyanSlots, [p]: [...(minyanSlots[p] ?? []), ''] };
    }
    function removeMinyanSlot(p: string, i: number) {
        const next = (minyanSlots[p] ?? []).filter((_, idx) => idx !== i);
        minyanSlots = { ...minyanSlots, [p]: next.length ? next : [''] };
    }
    function toggleMinyanSkip(p: string) {
        minyanSkip = { ...minyanSkip, [p]: !minyanSkip[p] };
    }
    async function saveMinyan() {
        if (!item?.id) return;
        savingMinyan = true;
        minyanError = '';
        // בונים שורת תפילה לכל מניין שלא סומן "אין" ויש בו שעה או זמן במילים
        const prayerRows: ScheduleRow[] = ALL_PRAYER_KEYS
            .filter(p => !minyanSkip[p])
            .map(p => ({
                type: p,
                time: (minyanSlots[p] ?? []).map(t => t.trim()).filter(Boolean).join(', '),
                days: '', note: (minyanText[p] ?? '').trim(),
            }))
            .filter(r => r.time || r.note);
        // משמרים את שאר הפעילויות (שיעורים, מקווה...) שלא נערכו כאן
        const full = [...prayerRows, ...otherActivities.map(a => ({ ...a }))];
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_activities', activities: full }),
            });
            const resData = await res.json().catch(() => ({}));
            if (!res.ok || !resData.success) {
                minyanError = resData.message || 'שגיאה בשמירה';
            } else {
                activitiesOverride = Array.isArray(resData.activities) ? resData.activities : full;
                editingMinyan = false;
            }
        } catch {
            minyanError = 'שגיאה ברשת';
        } finally {
            savingMinyan = false;
        }
    }

    let editingSchedule = $state(false);
    let scheduleRows = $state<ScheduleRow[]>([]);
    let savingSchedule = $state(false);
    let scheduleError = $state('');

    function startEditSchedule() {
        // רק פעילויות שאינן מניינים - זמני התפילה נערכים בבלוק המניינים הייעודי
        scheduleRows = otherActivities.length
            ? otherActivities.map(a => ({ ...a }))
            : [{ type: '', time: '', days: '', note: '' }];
        scheduleError = '';
        editingSchedule = true;
    }
    function addScheduleRow() {
        scheduleRows = [...scheduleRows, { type: '', time: '', days: '', note: '' }];
    }
    function removeScheduleRow(i: number) {
        scheduleRows = scheduleRows.filter((_, idx) => idx !== i);
    }
    async function saveSchedule() {
        if (!item?.id) return;
        savingSchedule = true;
        scheduleError = '';
        const clean = scheduleRows
            .map(r => ({ type: r.type.trim(), time: r.time.trim(), days: r.days.trim(), note: r.note.trim() }))
            .filter(r => r.type || r.time || r.days || r.note);
        // משמרים את שורות המניינים (נערכות בבלוק הייעודי) יחד עם הפעילויות הכלליות
        const full = [...minyanActivities.map(a => ({ ...a })), ...clean];
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_activities', activities: full }),
            });
            const resData = await res.json().catch(() => ({}));
            if (!res.ok || !resData.success) {
                scheduleError = resData.message || 'שגיאה בשמירה';
            } else {
                // עדכון מקומי מיידי - הדף נשאר "מול העיניים" בלי רענון
                activitiesOverride = Array.isArray(resData.activities) ? resData.activities : full;
                editingSchedule = false;
            }
        } catch {
            scheduleError = 'שגיאה ברשת';
        } finally {
            savingSchedule = false;
        }
    }

    // ---- שמירה מיידית ממצב בנייה (PATCH update_fields) ----
    let savingTag = $state<string | null>(null);
    let builderError = $state('');

    async function saveFields(fields: Record<string, unknown>, tag: string): Promise<boolean> {
        if (!item?.id) return false;
        savingTag = tag;
        builderError = '';
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'update_fields', fields }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.success) {
                builderError = d.message || 'שגיאה בשמירה - נסו שוב';
                return false;
            }
            return true;
        } catch {
            builderError = 'בעיית תקשורת - נסו שוב';
            return false;
        } finally {
            savingTag = null;
        }
    }

    // ---- שינוי קטגוריה: תיקון סיווג שגוי בלי למחוק ולפרסם מחדש ----
    let changingCategory = $state(false);
    let categoryChangeError = $state('');

    async function changeCategory(newCategory: string) {
        if (!item?.id || !newCategory || newCategory === item.category) return;
        changingCategory = true;
        categoryChangeError = '';
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'change_category', category: newCategory }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.success) {
                categoryChangeError = d.message || 'שגיאה בשינוי הקטגוריה - נסו שוב';
                changingCategory = false;
                return;
            }
            // הגדרות השדות והעורך תלויים בקטגוריה - טעינה מחדש והישארות במצב עריכה
            window.location.href = `/items/${item.id}?builder=1`;
        } catch {
            categoryChangeError = 'בעיית תקשורת - נסו שוב';
            changingCategory = false;
        }
    }

    // ---- חשיפת מספר הטלפון לציבור (ברירת מחדל: מוסתר) ----
    let phonePublicOverride = $state<boolean | null>(null);
    const phonePublic = $derived<boolean>(
        phonePublicOverride ??
        ((item as { extraFields?: { phone_public?: unknown } } | null)?.extraFields?.phone_public === true)
    );
    // canSeePhone שולט רק על הצגת המספר כטקסט בראש הדף (סימון "הצג/אל תציג"); גם לבעלים
    // כדי שהסימון ישפיע מיד. במצב בנייה תמיד מציגים יחד עם המתג.
    // חשוב: כפתורי החיוג/וואטסאפ ("יצירת קשר עם המפרסם") עובדים תמיד עם displayPhone -
    // "אל תציג" מסתיר רק את המספר עצמו כטקסט, לא את הכפתורים.
    const canSeePhone = $derived(phonePublic || builderMode);

    async function setPhonePublic(v: boolean) {
        if (v === phonePublic) return;
        const ok = await saveFields({ phone_public: v }, 'phone_public');
        if (ok) phonePublicOverride = v;
    }

    // ---- חשיפת שעות הפתיחה לציבור (ברירת מחדל: מוצג) ----
    let hoursPublicOverride = $state<boolean | null>(null);
    const hoursPublic = $derived<boolean>(
        hoursPublicOverride ??
        ((item as { extraFields?: { hours_public?: unknown } } | null)?.extraFields?.hours_public !== false)
    );
    // בתצוגה הרגילה מציגים שעות רק אם לא הוסתרו - גם לבעלים; במצב בנייה תמיד (עם מתג "הצג / אל תציג")
    const canSeeHours = $derived(hoursPublic || builderMode);

    async function setHoursPublic(v: boolean) {
        if (v === hoursPublic) return;
        const ok = await saveFields({ hours_public: v }, 'hours_public');
        if (ok) hoursPublicOverride = v;
    }

    // ---- סרטון הגעה (איך מגיעים / איפה הכניסה): העלאה ישירה או קישור YouTube/Facebook/וימאו ----
    const MAX_VIDEO_BYTES = 8 * 1024 * 1024; // 8MB - מעבר לזה: להשתמש בקישור
    let arrivalVideoOverride = $state<string | null>(null);
    const arrivalVideo = $derived<string>(
        arrivalVideoOverride ??
        (typeof (item as { extraFields?: { arrival_video?: unknown } } | null)?.extraFields?.arrival_video === 'string'
            ? ((item as { extraFields: { arrival_video: string } }).extraFields.arrival_video)
            : '')
    );
    let editingVideo = $state(false);
    let videoMode = $state<'link' | 'upload'>('link');
    let videoLinkDraft = $state('');
    let uploadingVideo = $state(false);

    // המרת קישור לנגן משובץ: יוטיוב / וימאו / פייסבוק ב-iframe, קובץ ישיר/הועלה ב-<video>, אחר = קישור
    const videoEmbed = $derived.by<{ kind: 'iframe' | 'video' | 'link'; src: string } | null>(() => {
        const u = arrivalVideo.trim();
        if (!u) return null;
        if (u.startsWith('data:video/')) return { kind: 'video', src: u };
        const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/i);
        if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
        const vm = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
        if (vm) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vm[1]}` };
        if (/facebook\.com|fb\.watch/i.test(u)) return { kind: 'iframe', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u)}&show_text=false` };
        if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(u)) return { kind: 'video', src: u };
        return { kind: 'link', src: u };
    });

    function startEditVideo() {
        videoLinkDraft = /^https?:\/\//i.test(arrivalVideo) ? arrivalVideo : '';
        videoMode = 'link';
        editingVideo = true;
        builderError = '';
    }
    async function saveVideoLink() {
        const raw = videoLinkDraft.trim();
        if (!raw) { builderError = 'הדביקו קישור לסרטון'; return; }
        const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
        const ok = await saveFields({ arrival_video: url }, 'arrival_video');
        if (ok) { arrivalVideoOverride = url; editingVideo = false; }
    }
    async function onVideoPicked(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const file = (input.files ?? [])[0];
        input.value = '';
        if (!file) return;
        if (!file.type.startsWith('video/')) { builderError = 'קובץ וידאו לא נתמך'; return; }
        if (file.size > MAX_VIDEO_BYTES) { builderError = 'הסרטון גדול מדי (מקס׳ 8MB). לסרטון ארוך השתמשו בקישור מיוטיוב/פייסבוק'; return; }
        uploadingVideo = true;
        builderError = '';
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(String(r.result));
                r.onerror = () => reject(new Error('read'));
                r.readAsDataURL(file);
            });
            const ok = await saveFields({ arrival_video: dataUrl }, 'arrival_video');
            if (ok) { arrivalVideoOverride = dataUrl; editingVideo = false; }
        } catch {
            builderError = 'שגיאה בקריאת הסרטון';
        } finally {
            uploadingVideo = false;
        }
    }
    async function removeVideo() {
        const ok = await saveFields({ arrival_video: '' }, 'arrival_video');
        if (ok) { arrivalVideoOverride = ''; editingVideo = false; }
    }

    // עריכת שדה טקסט בודד במקום (כותרת / תיאור / טלפון / איש קשר)
    let editingField = $state('');
    let draftText = $state('');

    function startEditField(field: string, current: string) {
        editingField = field;
        draftText = current;
        builderError = '';
    }
    async function saveTextField() {
        const f = editingField;
        if (!f) return;
        const val = draftText.trim();
        if (f === 'label' && !val) { builderError = 'שם המקום לא יכול להישאר ריק'; return; }
        const ok = await saveFields({ [f]: val }, f);
        if (ok) {
            fieldOverrides = { ...fieldOverrides, [f]: val };
            editingField = '';
        }
    }
    function cancelEditField() {
        editingField = '';
        builderError = '';
    }

    /** פוקוס אוטומטי לשדה עריכה שנפתח במקום */
    function focusOnMount(node: HTMLElement) {
        node.focus();
        if (node instanceof HTMLInputElement) node.select();
    }
    /** Enter שומר (חוץ מ-textarea), Escape מבטל */
    function editorKeys(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.preventDefault();
            cancelEditField();
        } else if (e.key === 'Enter' && (e.currentTarget as HTMLElement).tagName !== 'TEXTAREA') {
            e.preventDefault();
            saveTextField();
        }
    }

    // ---- עורך קישורים (כפתורים בדף: אתר, טופס הרשמה, קבוצת וואטסאפ...) ----
    // desc = מלל תיאור שיוצג מתחת לכפתור; _open = מצב "מגירת" התיאור בעורך (לא נשמר)
    type DraftLink = { label: string; url: string; desc: string; _open: boolean };
    let draftLinks = $state<DraftLink[]>([]);

    function startEditLinks() {
        draftLinks = customLinks.length
            ? customLinks.map(l => ({ label: l.label, url: l.url, desc: l.desc ?? '', _open: !!l.desc }))
            : [{ label: '', url: '', desc: '', _open: false }];
        editingField = 'links';
        builderError = '';
    }
    function addDraftLink() {
        draftLinks = [...draftLinks, { label: '', url: '', desc: '', _open: false }];
    }
    function removeDraftLink(i: number) {
        draftLinks = draftLinks.filter((_, idx) => idx !== i);
    }
    // הזזת שורה מעלה/מטה (חלופה נגישה לגרירה, עובדת גם במגע)
    function moveDraftLink(i: number, dir: -1 | 1) {
        const j = i + dir;
        if (j < 0 || j >= draftLinks.length) return;
        const arr = [...draftLinks];
        [arr[i], arr[j]] = [arr[j], arr[i]];
        draftLinks = arr;
    }
    // ---- גרירה לשינוי סדר הכפתורים ----
    let dragIndex = $state<number | null>(null);
    let dragOverIndex = $state<number | null>(null);
    function onLinkDragStart(i: number) { dragIndex = i; }
    function onLinkDragOver(e: DragEvent, i: number) { e.preventDefault(); dragOverIndex = i; }
    function onLinkDrop(i: number) {
        if (dragIndex !== null && dragIndex !== i) {
            const arr = [...draftLinks];
            const [moved] = arr.splice(dragIndex, 1);
            arr.splice(i, 0, moved);
            draftLinks = arr;
        }
        dragIndex = null;
        dragOverIndex = null;
    }
    function onLinkDragEnd() { dragIndex = null; dragOverIndex = null; }

    async function saveLinks() {
        const clean = draftLinks
            .map(l => ({ label: l.label.trim(), url: l.url.trim(), desc: l.desc.trim() }))
            .filter(l => l.url)
            .map(l => ({ label: l.label, url: l.url, ...(l.desc ? { desc: l.desc } : {}) }));
        const ok = await saveFields({ links: clean }, 'links');
        if (ok) {
            linksOverride = clean.map(l => ({
                label: l.label || 'קישור',
                url: /^https?:\/\//i.test(l.url) ? l.url : `https://${l.url}`,
                ...(l.desc ? { desc: l.desc } : {}),
            }));
            editingField = '';
        }
    }

    // ---- עורך רשתות חברתיות (כל קישור הופך לכפתור מותג עם הסמל של הרשת) ----
    // "אתר אינטרנט" הוסר בכוונה - אתר מוסיפים ככפתור מותאם ב"כפתור מותאם" (לא כפילות)
    const SOCIAL_FIELDS: Array<{ key: string; emoji: string; label: string; placeholder: string }> = [
        { key: 'whatsapp',  emoji: '💬', label: 'וואטסאפ',   placeholder: 'מספר טלפון או קישור לקבוצה' },
        { key: 'telegram',  emoji: '✈️', label: 'טלגרם',     placeholder: '@הקבוצה או https://t.me/...' },
        { key: 'facebook',  emoji: '📘', label: 'פייסבוק',   placeholder: 'https://facebook.com/...' },
        { key: 'instagram', emoji: '📷', label: 'אינסטגרם',  placeholder: 'https://instagram.com/...' },
        { key: 'youtube',   emoji: '▶️', label: 'יוטיוב',    placeholder: 'https://youtube.com/@...' },
        { key: 'tiktok',    emoji: '🎵', label: 'טיקטוק',    placeholder: 'https://tiktok.com/@...' },
    ];

    // נרמול קישורי רשת: וואטסאפ מקבל מספר טלפון (→ wa.me), טלגרם מקבל @שם (→ t.me)
    function normalizeSocialUrl(key: string, raw: string): string {
        let u = raw.trim();
        if (!u) return '';
        if (key === 'whatsapp' && /^[+\d][\d\s()\-]*$/.test(u)) {
            const digits = u.replace(/\D/g, '').replace(/^0/, '972');
            return `https://wa.me/${digits}`;
        }
        if (key === 'telegram') {
            if (u.startsWith('@')) return `https://t.me/${u.slice(1)}`;
            if (/^[A-Za-z0-9_]{4,}$/.test(u)) return `https://t.me/${u}`;
        }
        if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
        return u;
    }
    let draftSocial = $state<Record<string, string>>({});

    function startEditSocial() {
        const ef = (item?.extraFields ?? {}) as Record<string, unknown>;
        const cur: Record<string, string> = {};
        for (const sf of SOCIAL_FIELDS) {
            const v = socialOverride[sf.key] ?? ef[sf.key];
            cur[sf.key] = typeof v === 'string' ? v : '';
        }
        draftSocial = cur;
        editingField = 'social';
        builderError = '';
    }
    async function saveSocial(): Promise<boolean> {
        const clean: Record<string, string> = {};
        for (const sf of SOCIAL_FIELDS) {
            clean[sf.key] = normalizeSocialUrl(sf.key, draftSocial[sf.key] ?? '');
        }
        const ok = await saveFields(clean, 'social');
        if (ok) {
            socialOverride = { ...socialOverride, ...clean };
            editingField = '';
        }
        return ok;
    }
    // "+" מעורך הרשתות: שומר את קישורי הרשת ואז עובר לעורך הקישורים המותאמים עם שורה ריקה חדשה
    async function addCustomLinkFromSocial() {
        const ok = await saveSocial();
        if (!ok) return;
        startEditLinks();
        addDraftLink();
    }

    // עדכונים חיים של שדות הפרטים (CategoryDetailsEditor) - כדי שהתצוגה תתעדכן מיד
    let liveExtra = $state<Record<string, unknown>>({});

    // ---- שעות קבלת קהל / פתיחה (שדה hours מסוג opening_hours) ----
    // עורך "משעה-עד-שעה" + ＋ מוצג ישירות בקטע "לוח פעילויות ושעות" במצב בנייה,
    // בקטגוריות מקום שיש להן שדה כזה (שירות ציבורי/בנק, חנויות, מסעדות).
    const hoursFieldLabel = $derived.by<string>(() => {
        const f = categoryConfig[item?.category ?? '']?.fields.find(x => x.type === 'opening_hours');
        return f ? trOr(tFn, `labels.cf_${item?.category}_${f.key}`, f.label) : 'שעות קבלת קהל';
    });
    const hasHoursField = $derived<boolean>(
        !!categoryConfig[item?.category ?? '']?.fields.some(f => f.type === 'opening_hours')
    );
    const hoursValue = $derived<string>(
        typeof liveExtra.hours === 'string'
            ? (liveExtra.hours as string)
            : (typeof (item as { extraFields?: { hours?: unknown } } | null)?.extraFields?.hours === 'string'
                ? ((item as { extraFields?: { hours?: string } }).extraFields!.hours as string)
                : '')
    );
    let hoursSaved = $state(false);
    let hoursSavedTimer: ReturnType<typeof setTimeout> | null = null;
    async function saveHours(v: string) {
        const ok = await saveFields({ hours: v }, 'hours');
        if (ok) {
            liveExtra = { ...liveExtra, hours: v };
            hoursSaved = true;
            if (hoursSavedTimer) clearTimeout(hoursSavedTimer);
            hoursSavedTimer = setTimeout(() => (hoursSaved = false), 2000);
        }
    }

    // ---- העלאת תמונות במצב בנייה (דחיסה כמו בטופס הפרסום) ----
    const MAX_IMAGES = 5;
    let uploadingImages = $state(false);
    let imageInputEl = $state<HTMLInputElement | null>(null);

    function compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const MAX = 1000;
                    let { width, height } = img;
                    if (width > MAX || height > MAX) {
                        const scale = Math.min(MAX / width, MAX / height);
                        width = Math.round(width * scale);
                        height = Math.round(height * scale);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) { reject(new Error('canvas')); return; }
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = () => reject(new Error('image'));
                img.src = String(reader.result);
            };
            reader.onerror = () => reject(new Error('read'));
            reader.readAsDataURL(file);
        });
    }

    async function processImageFiles(files: File[]) {
        if (!files.length) return;
        uploadingImages = true;
        builderError = '';
        try {
            const current = [...galleryImages];
            for (const f of files) {
                if (current.length >= MAX_IMAGES) { builderError = `אפשר עד ${MAX_IMAGES} תמונות`; break; }
                if (!f.type.startsWith('image/')) continue;
                try { current.push(await compressImage(f)); } catch { builderError = 'קובץ תמונה לא נתמך'; }
            }
            if (current.length !== galleryImages.length) {
                const ok = await saveFields({ images: current }, 'images');
                if (ok) {
                    imagesOverride = current;
                    galleryIndex = current.length - 1;
                }
            }
        } finally {
            uploadingImages = false;
        }
    }
    async function onImagesPicked(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const files = Array.from(input.files ?? []);
        input.value = '';
        await processImageFiles(files);
    }
    // גרירת תמונות לאזור התמונה — רק במצב בנייה
    function handleImageDrop(files: File[]) {
        if (!builderMode) return;
        processImageFiles(files);
    }

    async function removeCurrentImage() {
        if (!galleryImages.length) return;
        const next = galleryImages.filter((_, idx) => idx !== galleryIndex);
        const ok = await saveFields({ images: next }, 'images');
        if (ok) {
            imagesOverride = next;
            galleryIndex = 0;
        }
    }

    // מיקום/חיתוך התמונה הנוכחית — כך שתופיע ממורכזת בכרטיס שבלוח/מפה
    async function repositionCurrentImage() {
        if (!galleryImages.length) return;
        const idx = galleryIndex;
        const cropped = await openCropper(galleryImages[idx], {
            shape: 'rect',
            aspect: 1,
            title: 'מיקום התמונה',
            hint: 'גררו למיקום הרצוי · הזיזו את המחוון להגדלה',
        });
        if (!cropped) return;
        const next = galleryImages.map((s, i) => (i === idx ? cropped : s));
        const ok = await saveFields({ images: next }, 'images');
        if (ok) {
            imagesOverride = next;
            galleryIndex = idx;
        }
    }

    // ---- סטטוס תפעולי של הנכס (פעיל / בשיפוצים / עברנו כתובת / סגור / נפתח בקרוב) ----
    let placeStatusOverride = $state<string | null>(null);
    const placeStatus = $derived<string>(
        placeStatusOverride ??
        (typeof (item as { extraFields?: { place_status?: unknown } } | null)?.extraFields?.place_status === 'string'
            ? (item as { extraFields: { place_status: string } }).extraFields.place_status
            : 'active')
    );
    const placeStatusBadge = $derived(placeStatusInfo(placeStatus));
    let savingStatus = $state(false);
    let statusMenuOpen = $state(false);

    async function changePlaceStatus(v: string) {
        if (!item?.id || v === placeStatus) { statusMenuOpen = false; return; }
        savingStatus = true;
        builderError = '';
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'set_place_status', place_status: v }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.success) builderError = d.message || 'שגיאה בשמירת הסטטוס';
            else placeStatusOverride = v;
        } catch {
            builderError = 'בעיית תקשורת - נסו שוב';
        } finally {
            savingStatus = false;
            statusMenuOpen = false;
        }
    }

    // ---- מחיקה רכה מתוך עריכת הכרטיס (ניתן לשחזר מהפרופיל עד 30 יום) ----
    let deletingItem = $state(false);
    async function softDeleteItem() {
        if (!item?.id) return;
        if (!confirm('למחוק את הכרטיס?\n\nהנכס יורד מהמפה, אך יופיע בפרופיל בסטטוס "מחוק" וניתן יהיה לשחזר אותו תוך 30 יום. לאחר מכן לא ניתן לשחזר - רק ליצור נכס חדש.')) return;
        deletingItem = true;
        builderError = '';
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'soft_delete' }),
            });
            const d = await res.json().catch(() => ({}));
            if (!res.ok || !d.success) {
                builderError = d.message || 'שגיאה במחיקה';
                deletingItem = false;
            } else {
                // המשתמש חוזר למפה (דף הבית), עם הודעה שהנכס עדיין ניתן לשחזור עד 30 יום
                // + קישור לנכסים שלו. ההודעה מוצגת בדף הבית דרך sessionStorage.
                try {
                    const until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                        .toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
                    sessionStorage.setItem('itemDeletedFlash', JSON.stringify({
                        name: displayLabel || 'הנכס',
                        until,
                    }));
                } catch { /* אם sessionStorage לא זמין - פשוט נחזור למפה בלי הודעה */ }
                await goto('/');
            }
        } catch {
            builderError = 'בעיית תקשורת - נסו שוב';
            deletingItem = false;
        }
    }

    // שיתוף בוצע לפחות פעם אחת (שומר תאימות עם פונקציות השיתוף)
    let sharedOnce = $state(false);

    function finishBuilder() {
        builderMode = false;
        isNewItem = false;
        editingField = '';
        editingSchedule = false;
        // מנקה את ?builder/?new מהכתובת כדי שרענון יפתח כתצוגת גולש
        if (item?.id) {
            try { history.replaceState(null, '', `/items/${item.id}`); } catch {}
        }
    }

    onMount(async () => {
        mounted = true;
        // מצב בנייה נפתח אוטומטית כשמגיעים מהטופס (?builder=1) - רק למי שמורשה
        try {
            const sp = new URLSearchParams(window.location.search);
            if (canEditPage && (sp.get('builder') === '1' || sp.get('new') === '1')) {
                builderMode = true;
                isNewItem = sp.get('new') === '1';
            }
        } catch {}
        canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;
        // ספירת צפיות - רק כשצופה שאינו הבעלים (הספירה מוצגת רק לבעלים,
        // ולכן צריכה לשקף צפיות של אחרים ולא רענונים של הבעלים עצמו)
        if (item?.id && !(item as { isOwner?: boolean }).isOwner) {
            try {
                await fetch('/api/items', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: item.id }),
                });
            } catch (e) {
                console.warn('Failed to increment view count:', e);
            }
        }
    });

    function goBack() {
        history.back();
    }

    function nextImage() {
        if (galleryImages.length === 0) return;
        galleryIndex = (galleryIndex + 1) % galleryImages.length;
    }
    function prevImage() {
        if (galleryImages.length === 0) return;
        galleryIndex = (galleryIndex - 1 + galleryImages.length) % galleryImages.length;
    }

    function conditionBadgeClass(c: string): string {
        switch (c) {
            case 'כחדש':           return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
            case 'משומש':          return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
            case 'דורש תיקון קל':  return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
            default:               return 'bg-white/10 text-gray-300 border-white/10';
        }
    }
    function conditionIcon(c: string): string {
        switch (c) {
            case 'כחדש':           return '✨';
            case 'משומש':          return '👍';
            case 'דורש תיקון קל':  return '🔧';
            default:               return '📦';
        }
    }
    const itemCondition = $derived<string>(
        typeof (item as { extraFields?: { condition?: unknown } } | null)?.extraFields?.condition === 'string'
            ? ((item as { extraFields: { condition: string } }).extraFields.condition)
            : ''
    );

    let copied = $state(false);

    // ---- Singles phone-request flow ----
    let singlesState = $state(
        (item as unknown as { singlesStatus?: { state: string; requestItemId?: string } })?.singlesStatus?.state ?? null
    );
    $effect(() => {
        const s = (item as unknown as { singlesStatus?: { state: string } })?.singlesStatus?.state;
        if (s) singlesState = s;
    });
    let singlesError = $state('');
    let singlesSending = $state(false);

    async function requestSinglesPhone() {
        if (!item?.id || singlesSending) return;
        singlesError = '';
        singlesSending = true;
        try {
            const res = await fetch('/api/singles-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_item_id: item.id }),
            });
            const data = await res.json();
            if (!data.success) {
                singlesError = data.message || 'שגיאה';
            } else {
                singlesState = 'pending';
            }
        } catch {
            singlesError = 'בעיית תקשורת - נסה שוב';
        } finally {
            singlesSending = false;
        }
    }

    let approving = $state<string | null>(null);
    let approveError = $state('');
    let incoming = $state(
        ((item as unknown as { incomingRequests?: Array<{ id: string; requester_snapshot: Record<string, unknown>; requested_at: string; status: string }> })?.incomingRequests) ?? []
    );
    $effect(() => {
        const i = (item as unknown as { incomingRequests?: typeof incoming })?.incomingRequests;
        if (Array.isArray(i)) incoming = i;
    });

    async function decideRequest(reqId: string, action: 'approved' | 'rejected') {
        if (approving) return;
        approving = reqId;
        approveError = '';
        try {
            const res = await fetch('/api/singles-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_item_id: reqId, action }),
            });
            const data = await res.json();
            if (!data.success) {
                approveError = data.message || 'שגיאה';
            } else {
                incoming = incoming.filter(r => r.id !== reqId);
            }
        } catch {
            approveError = 'בעיית תקשורת';
        } finally {
            approving = null;
        }
    }

    function shareUrl(): string {
        return typeof window !== 'undefined' ? window.location.href : '';
    }
    // כותרת השיתוף: שם הדף + תת-כותרת קבועה של האתר
    function shareText(): string {
        return item
            ? `${displayLabel} | קהילה בשכונה - כל יתרונות הקהילה תחת קורת גג אחת`
            : 'קהילה בשכונה - כל יתרונות הקהילה תחת קורת גג אחת';
    }
    let canNativeShare = $state(false);
    let shareMenuOpen = $state(false);
    async function shareNative() {
        try {
            await navigator.share({ title: displayLabel, text: shareText(), url: shareUrl() });
            sharedOnce = true;
        } catch {}
    }
    function shareWhatsApp() {
        const url = shareUrl();
        const text = shareText();
        window.open(`https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`, '_blank', 'noopener,noreferrer');
        sharedOnce = true;
    }
    function shareFacebook() {
        const url = shareUrl();
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');
        sharedOnce = true;
    }
    function shareTelegram() {
        const url = shareUrl();
        const text = shareText();
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
        sharedOnce = true;
    }
    async function copyLink() {
        sharedOnce = true;
        const url = shareUrl();
        try {
            await navigator.clipboard.writeText(url);
            copied = true;
            setTimeout(() => (copied = false), 2000);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = url;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand('copy'); copied = true; setTimeout(() => (copied = false), 2000); } catch {}
            document.body.removeChild(ta);
        }
    }

    // ---- Open Graph לקדימוני שיתוף (WhatsApp/FB/Telegram/Twitter) ----
    const origin = $derived(
        (data as unknown as { origin?: string })?.origin
            || (typeof window !== 'undefined' ? window.location.origin : 'https://community.gofreeil.com')
    );
    const canonicalUrl = $derived(item ? `${origin}/items/${item.id}` : origin);

    // המרת DiceBear SVG ל-PNG (וואטסאפ דורש תמונה ראסטרית לקדימון)
    function toRasterImage(url: string): string {
        if (!url) return '';
        if (url.includes('api.dicebear.com') && url.includes('/svg?')) {
            return url.replace('/svg?', '/png?') + (url.includes('size=') ? '' : '&size=512');
        }
        return url;
    }

    const isSingles = $derived(item?.category === 'singles');
    const isFemale = $derived(
        typeof (item as { extraFields?: { gender?: unknown } } | null)?.extraFields?.gender === 'string'
            && (item as { extraFields: { gender: string } }).extraFields.gender === 'female'
    );

    const ogTitle = $derived.by(() => {
        if (!item) return 'קהילה בשכונה';
        if (isSingles) {
            const who = nickname || displayLabel;
            const city = (item as { city?: string }).city;
            const bits = [who];
            if (age != null) bits.push(`גיל ${age}`);
            if (city) bits.push(`מ${city}`);
            const tag = isFemale ? 'פנויה' : 'פנוי';
            return `${bits.join(', ')} | ${tag} מקהילה בשכונה`;
        }
        return `${displayLabel} | קהילה בשכונה`;
    });

    // ה-OG description לא כולל את המשפטים החופשיים (description / looking_for) -
    // רק קריאה לפעולה גנרית. מה שצריך כבר נמצא בכותרת.
    const ogDescription = $derived.by(() => {
        if (!item) return 'קהילה בשכונה - כל יתרונות הקהילה תחת קורת גג אחת';
        if (isSingles) return 'לפרופיל המלא והתחלת שיחה — לדף המלא:';
        // תת-הכותרת של האתר - מופיעה מתחת לכותרת בקדימוני השיתוף ברשתות
        return 'קהילה בשכונה - כל יתרונות הקהילה תחת קורת גג אחת';
    });

    const ogImage = $derived.by(() => {
        const ef = (item as { extraFields?: Record<string, unknown> })?.extraFields ?? {};
        const candidate = (typeof ef.avatar === 'string' && ef.avatar)
            || galleryImages[0]
            || (typeof (item as { image?: string } | null)?.image === 'string' ? (item as { image: string }).image : '')
            || '';
        if (!candidate || !item) return '';
        // data URLs לא נתמכים ע"י סקרפרים - נשלח דרך endpoint שמפענח ומגיש כתמונה
        // סיומת .jpg חשובה - חלק מהסקרפרים (כולל טלגרם) בודקים סיומת בנוסף ל-Content-Type
        if (candidate.startsWith('data:')) return `${origin}/api/items/${item.id}/og.jpg`;
        if (/^https?:\/\//i.test(candidate)) return toRasterImage(candidate);
        if (candidate.startsWith('/')) return `${origin}${candidate}`;
        return `${origin}/api/items/${item.id}/og.jpg`;
    });

    const ogType = $derived(isSingles ? 'profile' : 'website');

    // Structured data לפריט. singles מדולגים (פרטיות). אירועים → Event, השאר → Product.
    const isEvent = $derived(item?.category === 'events' || item?.category === 'event');
    const itemSchema = $derived.by(() => {
        if (!item || isSingles) return null;
        const path = `/items/${item.id}`;
        const description = (item.description && String(item.description).trim()) || displayLabel;
        const ef = (item as { extraFields?: Record<string, unknown> })?.extraFields ?? {};
        const priceRaw = ef.price ?? ef.cost;
        const price = typeof priceRaw === 'number' ? priceRaw : (typeof priceRaw === 'string' ? parseFloat(priceRaw) || 0 : 0);
        if (isEvent) {
            return eventSchema({
                name: displayLabel, description, path,
                location: (item as { city?: string }).city || (item as { neighborhood?: string }).neighborhood,
                image: ogImage || undefined,
            });
        }
        return productSchema({
            name: displayLabel, description, path, price,
            image: ogImage || undefined,
        });
    });
</script>

<svelte:head>
    <title>{item ? displayLabel : tFn("item_not_found")} | קהילה בשכונה</title>
    {#if item}
        <meta name="description" content={ogDescription} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content={ogType} />
        <meta property="og:site_name" content="קהילה בשכונה" />
        <meta property="og:title" content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:locale" content="he_IL" />
        {#if ogImage}
            <meta property="og:image" content={ogImage} />
            <meta property="og:image:secure_url" content={ogImage} />
            <meta property="og:image:alt" content={ogTitle} />
        {/if}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        {#if ogImage}<meta name="twitter:image" content={ogImage} />{/if}
    {/if}
</svelte:head>

{#if itemSchema}<JsonLd schema={itemSchema} />{/if}

<!-- הדרכה צהובה במצב בנייה - מוצמדת לכל אזור שאפשר למלא -->
{#snippet tip(text: string)}
    {#if builderMode}
        <p class="text-[11px] text-amber-200/95 bg-amber-500/10 border border-amber-500/25 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5 leading-snug">
            <span aria-hidden="true">💡</span><span>{text}</span>
        </p>
    {/if}
{/snippet}

<!-- שורת תצוגה לתפילה: שעה (מספרי) ו/או זמן במילים -->
{#snippet prayerRowView(row: ScheduleRow)}
    <li class="flex items-center gap-2 px-3 py-2 bg-[#0f172a] text-xs">
        <span class="font-bold text-sky-200 whitespace-nowrap">{prayerLabel(row.type)}</span>
        {#if row.time}<span class="text-white font-mono" dir="ltr">{row.time}</span>{/if}
        {#if row.note}<span class="text-gray-300 leading-snug">{row.note}</span>{/if}
    </li>
{/snippet}

<!-- בלוק עריכה לתפילה: כמה שעות + זמן במילים + "אין מניין" -->
{#snippet prayerEditBlock(key: string, label: string)}
    <div class="bg-[#0f172a] rounded-lg p-2 border border-white/10">
        <div class="flex items-center justify-between mb-1.5">
            <span class="text-sm font-bold text-sky-200">{label}</span>
            <label class="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
                <input type="checkbox" checked={minyanSkip[key]} onchange={() => toggleMinyanSkip(key)}
                    class="accent-sky-500 w-3.5 h-3.5" />
                אין מניין
            </label>
        </div>
        {#if !minyanSkip[key]}
            <div class="flex flex-wrap items-center gap-1.5">
                {#each minyanSlots[key] ?? [] as _, i}
                    <div class="flex items-center gap-1">
                        <input type="time" bind:value={minyanSlots[key][i]} dir="ltr"
                            class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 w-[95px]" />
                        {#if (minyanSlots[key] ?? []).length > 1}
                            <button type="button" onclick={() => removeMinyanSlot(key, i)} aria-label="הסר שעה"
                                class="text-red-400 hover:text-red-300 px-1 text-base leading-none">×</button>
                        {/if}
                    </div>
                {/each}
                <button type="button" onclick={() => addMinyanSlot(key)}
                    class="text-xs font-bold text-sky-300 hover:text-sky-200 px-1">➕ עוד שעה</button>
            </div>
            <input type="text" bind:value={minyanText[key]}
                placeholder="או זמן במילים: וותיקין / 20 דק׳ לפני השקיעה / זמן ר״ת"
                class="mt-1.5 w-full bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 placeholder:text-gray-500" />
        {:else}
            <p class="text-xs text-gray-500">לא מתקיים מניין בתפילה זו</p>
        {/if}
    </div>
{/snippet}

{#snippet titleBlock()}
    <!-- שם המקום ככותרת הדף (מוצג מעל התמונה בעמודה הימנית) -->
    {#if builderMode && editingField === 'label'}
        <div class="space-y-1.5">
            <input type="text" bind:value={draftText} maxlength="120" use:focusOnMount onkeydown={editorKeys}
                class="w-full bg-[#0a0f1a] border border-amber-500/50 rounded-lg text-white text-lg font-black px-2.5 py-1.5" />
            <div class="flex gap-2">
                <button type="button" onclick={saveTextField} disabled={savingTag === 'label'}
                    class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg px-3 py-1.5">💾 שמור</button>
                <button type="button" onclick={cancelEditField} class="text-xs font-bold text-gray-300 hover:text-white px-2 py-1.5">ביטול</button>
            </div>
        </div>
    {:else}
        <h1 class="text-white text-xl md:text-2xl font-black leading-tight flex items-center justify-center gap-2">
            <span>{displayLabel}</span>
            {#if builderMode}
                <button type="button" onclick={() => startEditField('label', displayLabel)}
                    aria-label="ערוך את שם המקום" title="ערוך את שם המקום"
                    class="text-sm bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg px-1.5 py-0.5 transition-all shrink-0">✏️</button>
            {/if}
        </h1>
    {/if}
{/snippet}

{#snippet shareBlock()}
    <div class="relative">
        <!-- כפתור שיתוף מרובע קטן שפותח תפריט אפשרויות השיתוף -->
        <button type="button" onclick={() => shareMenuOpen = !shareMenuOpen}
            aria-haspopup="menu" aria-expanded={shareMenuOpen} aria-label="שתף" title="שתף"
            class="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-200 transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="w-4 h-4">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
        </button>
        {#if shareMenuOpen}
            <div class="absolute z-30 top-full mt-1.5 end-0 flex gap-1.5 bg-[#0a0f1a] border border-white/15 rounded-xl px-2 py-2 shadow-2xl backdrop-blur-sm" role="menu">
                {#if canNativeShare}
                    <button type="button" onclick={() => { shareNative(); shareMenuOpen = false; }} aria-label="שתף את הדף" title="שתף את הדף"
                        class="bg-gradient-to-l from-blue-600 to-purple-600 hover:opacity-90 hover:scale-110 active:scale-95 w-10 h-10 rounded-lg transition-all flex items-center justify-center text-lg">
                        📤
                    </button>
                {/if}
                <button type="button" onclick={() => { shareWhatsApp(); shareMenuOpen = false; }} aria-label="שתף בוואטסאפ" title="שתף בוואטסאפ"
                    class="bg-green-600/15 hover:bg-green-600/35 hover:scale-110 active:scale-95 w-10 h-10 rounded-lg transition-all flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#25D366" aria-hidden="true" class="w-6 h-6">
                        <path d="M19.05 4.91A10 10 0 0 0 12 2a10 10 0 0 0-8.6 15.04L2 22l5.13-1.34A10 10 0 0 0 12 22a10 10 0 0 0 7.05-17.09zM12 20.27a8.27 8.27 0 0 1-4.22-1.16l-.3-.18-3.05.8.81-2.97-.2-.31A8.27 8.27 0 1 1 20.27 12 8.27 8.27 0 0 1 12 20.27zm4.55-6.2c-.25-.13-1.47-.73-1.7-.81-.23-.08-.4-.13-.56.13-.17.25-.64.81-.79.98-.15.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.39-1.72-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.56-1.36-.77-1.86-.2-.49-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31s-.88.86-.88 2.1.9 2.43 1.03 2.6c.13.17 1.78 2.71 4.3 3.8.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.15-1.18-.06-.11-.23-.17-.48-.3z"/>
                    </svg>
                </button>
                <button type="button" onclick={() => { shareFacebook(); shareMenuOpen = false; }} aria-label="שתף בפייסבוק" title="שתף בפייסבוק"
                    class="bg-blue-600/15 hover:bg-blue-600/35 hover:scale-110 active:scale-95 w-10 h-10 rounded-lg transition-all flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true" class="w-6 h-6">
                        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.34v6.99A10 10 0 0 0 22 12z"/>
                    </svg>
                </button>
                <button type="button" onclick={() => { shareTelegram(); shareMenuOpen = false; }} aria-label="שתף בטלגרם" title="שתף בטלגרם"
                    class="bg-sky-500/15 hover:bg-sky-500/35 hover:scale-110 active:scale-95 w-10 h-10 rounded-lg transition-all flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#229ED9" aria-hidden="true" class="w-6 h-6">
                        <path d="M9.78 15.27 9.6 18.9c.27 0 .39-.12.53-.26l1.27-1.22 2.64 1.93c.48.27.83.13.96-.45l1.74-8.16c.17-.74-.27-1.04-.74-.86L5.5 13.93c-.72.28-.71.69-.12.87l2.94.92 6.83-4.3c.32-.21.61-.09.37.13l-5.74 5.72z"/>
                    </svg>
                </button>
                <button type="button" onclick={copyLink} aria-label="העתק קישור" title={copied ? 'הקישור הועתק' : 'העתק קישור'}
                    class="bg-white/10 hover:bg-white/25 hover:scale-110 active:scale-95 w-10 h-10 rounded-lg transition-all flex items-center justify-center text-white">
                    {#if copied}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="w-6 h-6 text-emerald-400">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                    {:else}
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="w-6 h-6">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                        </svg>
                    {/if}
                </button>
            </div>
        {/if}
    </div>
{/snippet}

{#snippet socialLinksBlock()}
    {@const ef = (item?.isUserSubmitted ? { ...(item?.extraFields ?? {}), ...socialOverride } : null) as Record<string, unknown> | null}
    {@const website   = typeof ef?.website   === 'string' ? ef.website   : ''}
    {@const whatsapp  = typeof ef?.whatsapp  === 'string' ? ef.whatsapp  : ''}
    {@const telegram  = typeof ef?.telegram  === 'string' ? ef.telegram  : ''}
    {@const facebook  = typeof ef?.facebook  === 'string' ? ef.facebook  : ''}
    {@const instagram = typeof ef?.instagram === 'string' ? ef.instagram : ''}
    {@const youtube   = typeof ef?.youtube   === 'string' ? ef.youtube   : ''}
    {@const tiktok    = typeof ef?.tiktok    === 'string' ? ef.tiktok    : ''}
    {@const ensureUrl = (u: string) => (/^https?:\/\//i.test(u) ? u : `https://${u}`)}
    {#if website || whatsapp || telegram || facebook || instagram || youtube || tiktok || customLinks.length > 0 || builderMode}
        <section class="pt-3 pb-1 border-t border-white/10">
            <h2 class="text-base font-bold text-white mb-2 flex items-center gap-1.5">
                <span class="w-1 h-4 bg-indigo-500 rounded-full"></span>קישורים
            </h2>
            {#if builderMode && editingField === 'social'}
                <!-- עורך רשתות חברתיות + אתר: כל קישור הופך לכפתור מותג עם הסמל של הרשת -->
                <div class="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] p-2.5 space-y-2">
                    {@render tip('הדביקו את הקישורים שלכם - כל אחד יהפוך לכפתור מותג עם הסמל של הרשת. השאירו שדה ריק כדי להסיר.')}
                    {#each SOCIAL_FIELDS as sf}
                        <div class="flex items-center gap-1.5 bg-[#0f172a] rounded-lg p-1.5 border border-white/10">
                            <span class="text-base shrink-0 w-6 text-center" aria-hidden="true">{sf.emoji}</span>
                            <span class="text-xs text-gray-300 shrink-0 w-[68px]">{sf.label}</span>
                            <input type="url" bind:value={draftSocial[sf.key]} placeholder={sf.placeholder} dir="ltr" maxlength="300"
                                class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 flex-1 min-w-[120px]" />
                        </div>
                    {/each}
                    <!-- הוספת קישור/כפתור נוסף (מעבר לעורך הכפתורים המותאמים עם תיאור וסדר) -->
                    <button type="button" onclick={addCustomLinkFromSocial} disabled={savingTag === 'social'}
                        class="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-amber-400/40 hover:border-amber-400/70 bg-amber-500/5 hover:bg-amber-500/10 disabled:opacity-50 text-amber-200 font-bold px-3 py-2 rounded-lg transition-all text-xs">
                        <span class="text-base leading-none">＋</span> הוסף קישור/כפתור נוסף
                    </button>
                    {#if builderError}<p class="text-xs text-red-400">{builderError}</p>{/if}
                    <div class="flex items-center gap-2 pt-1">
                        <button type="button" onclick={saveSocial} disabled={savingTag === 'social'}
                            class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-all">
                            {savingTag === 'social' ? 'שומר…' : '💾 שמור'}
                        </button>
                        <button type="button" onclick={cancelEditField} class="text-xs font-bold text-gray-300 hover:text-white px-2 py-1.5">ביטול</button>
                    </div>
                </div>
            {:else if builderMode && editingField === 'links'}
                <!-- עורך קישורים: כל שורה הופכת לכפתור בדף. גרירה משנה סדר, מגירת תיאור מוסיפה מלל -->
                <div class="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-2.5 space-y-2">
                    {@render tip('כל שורה הופכת לכפתור בדף. גררו את הידית ⠿ (או ▲▼) כדי לשנות סדר, ופתחו "תיאור" כדי להוסיף מלל מתחת לכפתור.')}
                    {#each draftLinks as link, i (link)}
                        <div
                            role="group"
                            aria-label={`קישור ${i + 1}`}
                            draggable={draftLinks.length > 1}
                            ondragstart={() => onLinkDragStart(i)}
                            ondragover={(e) => onLinkDragOver(e, i)}
                            ondrop={() => onLinkDrop(i)}
                            ondragend={onLinkDragEnd}
                            class="bg-[#0f172a] rounded-lg p-1.5 border transition-all {dragOverIndex === i && dragIndex !== i ? 'border-amber-400/70 ring-1 ring-amber-400/50' : 'border-white/10'} {dragIndex === i ? 'opacity-50' : ''}">
                            <div class="flex flex-wrap items-center gap-1.5">
                                <!-- ידית גרירה + הזזה מעלה/מטה -->
                                <div class="flex items-center shrink-0">
                                    <span class="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 px-0.5 text-base leading-none select-none" title="גררו לשינוי סדר" aria-hidden="true">⠿</span>
                                    <div class="flex flex-col -my-1">
                                        <button type="button" onclick={() => moveDraftLink(i, -1)} disabled={i === 0} aria-label="העבר למעלה"
                                            class="text-gray-400 hover:text-white disabled:opacity-25 disabled:hover:text-gray-400 leading-none text-[10px] px-0.5">▲</button>
                                        <button type="button" onclick={() => moveDraftLink(i, 1)} disabled={i === draftLinks.length - 1} aria-label="העבר למטה"
                                            class="text-gray-400 hover:text-white disabled:opacity-25 disabled:hover:text-gray-400 leading-none text-[10px] px-0.5">▼</button>
                                    </div>
                                </div>
                                <input type="text" bind:value={link.label} placeholder="שם הכפתור (למשל: קבוצת וואטסאפ)" maxlength="60"
                                    class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 flex-1 min-w-[120px]" />
                                <input type="url" bind:value={link.url} placeholder="https://..." dir="ltr" maxlength="300"
                                    class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 flex-1 min-w-[120px]" />
                                <button type="button" onclick={() => link._open = !link._open} aria-expanded={link._open} title="תיאור מתחת לכפתור"
                                    class="shrink-0 text-[11px] font-bold px-1.5 py-1 rounded-md border transition-all {link._open || link.desc ? 'text-amber-200 border-amber-400/40 bg-amber-500/10' : 'text-gray-400 border-white/15 hover:text-gray-200'}">
                                    תיאור {link._open ? '▲' : '▼'}
                                </button>
                                <button type="button" onclick={() => removeDraftLink(i)} aria-label="הסר קישור"
                                    class="shrink-0 text-red-400 hover:text-red-300 px-1.5 text-lg leading-none">×</button>
                            </div>
                            <!-- מגירת תיאור -->
                            {#if link._open}
                                <textarea bind:value={link.desc} rows="2" maxlength="300" placeholder="מלל תיאור שיוצג מתחת לכפתור (לא חובה)"
                                    class="mt-1.5 w-full bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1.5 resize-y"></textarea>
                            {/if}
                        </div>
                    {/each}
                    <button type="button" onclick={addDraftLink}
                        class="text-xs font-bold text-amber-300 hover:text-amber-200">➕ הוסף קישור</button>
                    <div class="flex items-center gap-2 pt-1">
                        <button type="button" onclick={saveLinks} disabled={savingTag === 'links'}
                            class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-all">
                            {savingTag === 'links' ? 'שומר…' : '💾 שמור'}
                        </button>
                        <button type="button" onclick={cancelEditField} class="text-xs font-bold text-gray-300 hover:text-white px-2 py-1.5">ביטול</button>
                    </div>
                </div>
            {:else}
            <div class="flex flex-wrap gap-2">
                {#each customLinks as link}
                    <div class="flex flex-col gap-1 max-w-full">
                        <a href={ensureUrl(link.url)} target="_blank" rel="noopener noreferrer"
                            class="flex items-center gap-2 bg-white/5 hover:bg-purple-600/20 border border-white/10 hover:border-purple-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                            🔗 {link.label}
                        </a>
                        {#if link.desc}
                            <p class="text-xs text-gray-400 leading-snug px-1 max-w-[260px] whitespace-pre-line">{link.desc}</p>
                        {/if}
                    </div>
                {/each}
                {#if website}
                    <a href={ensureUrl(website)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-indigo-600/20 border border-white/10 hover:border-indigo-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        🌐 אתר אינטרנט
                    </a>
                {/if}
                {#if whatsapp}
                    <a href={ensureUrl(whatsapp)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-green-600/20 border border-white/10 hover:border-green-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        💬 וואטסאפ
                    </a>
                {/if}
                {#if telegram}
                    <a href={ensureUrl(telegram)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-sky-600/20 border border-white/10 hover:border-sky-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        ✈️ טלגרם
                    </a>
                {/if}
                {#if facebook}
                    <a href={ensureUrl(facebook)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-blue-600/20 border border-white/10 hover:border-blue-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        📘 פייסבוק
                    </a>
                {/if}
                {#if instagram}
                    <a href={ensureUrl(instagram)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-pink-600/20 border border-white/10 hover:border-pink-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        📷 אינסטגרם
                    </a>
                {/if}
                {#if youtube}
                    <a href={ensureUrl(youtube)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-red-600/20 border border-white/10 hover:border-red-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        ▶️ יוטיוב
                    </a>
                {/if}
                {#if tiktok}
                    <a href={ensureUrl(tiktok)} target="_blank" rel="noopener noreferrer"
                        class="flex items-center gap-2 bg-white/5 hover:bg-fuchsia-600/20 border border-white/10 hover:border-fuchsia-500/50 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                        🎵 טיקטוק
                    </a>
                {/if}
                {#if builderMode}
                    <button type="button" onclick={startEditSocial}
                        class="flex items-center gap-2 border-2 border-dashed border-indigo-400/40 hover:border-indigo-400/70 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-200 font-bold px-4 py-2.5 rounded-xl transition-all text-sm">
                        📱 {(whatsapp || telegram || facebook || instagram || youtube || tiktok) ? 'ערוך קישורים לרשתות' : 'הוסיפו וואטסאפ, טלגרם וקישורים לרשתות'}
                    </button>
                    <button type="button" onclick={startEditLinks}
                        class="flex items-center gap-2 border-2 border-dashed border-amber-400/40 hover:border-amber-400/70 bg-amber-500/5 hover:bg-amber-500/10 text-amber-200 font-bold px-4 py-2.5 rounded-xl transition-all text-sm">
                        ➕ {customLinks.length ? 'ערוך כפתורים מותאמים' : 'כפתור מותאם (טופס הרשמה, קבוצה, תרומות...)'}
                    </button>
                {/if}
            </div>
            {/if}
        </section>
    {/if}
{/snippet}

<!-- בורר סטטוס המקום (פעיל / בשיפוצים / סגור...) + מחיקה. dropUp=פתיחת התפריט כלפי מעלה -->
{#snippet statusSelector(dropUp: boolean)}
    {#if canEditPage}
        {@const cur = PLACE_STATUSES.find(s => s.value === placeStatus) ?? PLACE_STATUSES[0]}
        <div class="relative">
            <button type="button" onclick={() => (statusMenuOpen = !statusMenuOpen)} disabled={savingStatus}
                class="text-[11px] font-bold rounded-full px-2.5 py-1 border transition-all disabled:opacity-50 flex items-center gap-1 {cur.active}">
                {cur.emoji} {cur.label} <span class="opacity-70">▾</span>
            </button>
            {#if statusMenuOpen}
                <div class="absolute z-40 {dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} end-0 min-w-[170px] rounded-xl border border-white/15 bg-[#0a0f1a] shadow-2xl p-1"
                    in:scale={{ duration: 120, start: 0.95 }}>
                    <p class="text-[10px] text-gray-500 font-bold px-2.5 pt-1 pb-0.5">סטטוס המקום</p>
                    {#each PLACE_STATUSES as s}
                        <button type="button" onclick={() => changePlaceStatus(s.value)} disabled={savingStatus}
                            class="w-full text-right text-xs font-bold rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50 flex items-center gap-2 {placeStatus === s.value ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/10'}">
                            <span aria-hidden="true">{s.emoji}</span><span class="flex-1">{s.label}</span>
                            {#if placeStatus === s.value}<span class="text-emerald-400">✓</span>{/if}
                        </button>
                    {/each}
                    <div class="my-1 border-t border-white/10"></div>
                    <button type="button" onclick={softDeleteItem} disabled={deletingItem}
                        class="w-full text-right text-xs font-bold text-red-300 hover:bg-red-500/15 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50">
                        {deletingItem ? 'מוחק…' : '🗑 מחק את הכרטיס'}
                    </button>
                </div>
            {/if}
        </div>
    {/if}
{/snippet}

<!-- Hidden keys (rendered in dedicated sections, complex types, or internal-only) -->
{#snippet extraFieldsBlock()}
    {@const HIDDEN_KEYS = new Set(['condition', 'category', 'tags', 'images', 'image', 'menu_images', 'map_image', 'service_type', 'price', 'website', 'whatsapp', 'telegram', 'facebook', 'instagram', 'youtube', 'tiktok', 'nickname', 'age', 'birth_date', 'sector', 'gender', 'type', 'activities', 'links', 'gmach_type', 'gmach_types', 'place_status', 'location', 'option_id', 'last_seen', 'hours', 'phone_public', 'hours_public', 'arrival_video'])}
    {@const LABELS_HE: Record<string, string> = {
        nickname: 'שם או כינוי',
        gender: 'מין',
        age: 'גיל',
        birth_date: 'תאריך לידה',
        sector: 'מגזר / רקע',
        marital_status: 'מצב משפחתי',
        unvaccinated: 'חיסון',
        education: 'מקצוע / השכלה',
        interests: 'תחומי עניין',
        description: 'קצת עליי',
        about: 'קצת עליי',
        looking_for_m: 'מחפש',
        looking_for_f: 'מחפשת',
        inspiration: 'משפט מעורר השראה',
        matchmaker: 'שדכן או חבר',
        city: 'עיר',
        neighborhood: 'שכונה',
        address: 'כתובת',
        phone: 'טלפון',
        contact: 'דרך קשר',
        hours: 'שעות פתיחה',
        time: 'שעה עיקרית',
        days: 'ימים',
        headline: 'משפט פתיחה',
        summary: 'תיאור',
        floor: 'קומה',
        apartment: 'מספר דירה',
        arrival_notes: 'הוראות הגעה',
        street: 'רחוב',
        building_num: 'מספר בניין',
    }}
    {@const formatValue = (key: string, val: unknown): string => {
        if (val == null || val === '') return '';
        const s = String(val);
        if (key === 'birth_date') {
            const d = new Date(s);
            if (!isNaN(d.getTime())) {
                const now = new Date();
                let age = now.getFullYear() - d.getFullYear();
                const m = now.getMonth() - d.getMonth();
                if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
                return age > 0 && age < 130 ? `${age} (${d.toLocaleDateString('he-IL')})` : d.toLocaleDateString('he-IL');
            }
        }
        if (key === 'unvaccinated') return (s === '' || s === '0') ? '' : 'לא מחוסן';
        if (key === 'gender') return s === 'male' ? 'גבר' : s === 'female' ? 'אישה' : s;
        if (key === 'hours') return formatOpeningHours(s, {
            days: Array.from({ length: 7 }, (_, i) => trOr(tFn, `labels.day_short_${i}`, DAY_SHORT[i])),
            closed: trOr(tFn, 'labels.oh_closed', 'סגור'),
        });
        return s;
    }}
    {@const mergedExtra = { ...(item?.extraFields ?? {}), ...liveExtra }}
    {@const visibleEntries = item?.isUserSubmitted
        ? Object.entries(mergedExtra).filter(([k, v]) => !HIDDEN_KEYS.has(k) && v != null && v !== '')
        : []}
    {#if visibleEntries.length > 0}
        <section class="pt-3 border-t border-white/10">
            <h2 class="text-base font-bold text-white mb-2 flex items-center gap-1.5">
                <span class="w-1 h-4 bg-green-500 rounded-full"></span>{tFn("more_details")}</h2>
            <dl class="rounded-xl border border-white/10 overflow-hidden grid grid-cols-1 {visibleEntries.length > 1 ? 'sm:grid-cols-2' : ''} gap-px bg-white/10">
                {#each visibleEntries as [key, value]}
                    <div class="grid grid-cols-[auto,1fr] gap-x-3 px-3 py-2 bg-[#0f172a]">
                        <dt class="text-xs text-gray-400 font-semibold whitespace-nowrap">{LABELS_HE[key] ?? key}</dt>
                        <dd class="text-white font-medium text-xs">{formatValue(key, value)}</dd>
                    </div>
                {/each}
            </dl>
        </section>
    {/if}
{/snippet}

<!-- "נראה לאחרונה" - פרטי איתור אחרונים בקריאות אובדן (ילד/כלב) -->
{#snippet lastSeenBlock()}
    {@const ls = (item as { extraFields?: { last_seen?: unknown } } | null)?.extraFields?.last_seen}
    {@const lsObj = ls && typeof ls === 'object' ? ls as { time?: string; place?: string; details?: string } : null}
    {@const rows = lsObj ? [
        { label: 'מתי', value: lsObj.time },
        { label: 'היכן', value: lsObj.place },
        { label: 'לבוש וכיוון', value: lsObj.details },
    ].filter(r => typeof r.value === 'string' && r.value.trim()) : []}
    {#if rows.length > 0}
        <section class="pt-3 border-t border-white/10">
            <h2 class="text-base font-bold text-white mb-2 flex items-center gap-1.5">
                <span class="w-1 h-4 bg-red-500 rounded-full"></span>👁️ נראה לאחרונה</h2>
            <dl class="rounded-xl border border-white/10 overflow-hidden grid grid-cols-1 {rows.length > 1 ? 'sm:grid-cols-2' : ''} gap-px bg-white/10">
                {#each rows as row}
                    <div class="grid grid-cols-[auto,1fr] gap-x-3 px-3 py-2 bg-[#0f172a]">
                        <dt class="text-xs text-gray-400 font-semibold whitespace-nowrap">{row.label}</dt>
                        <dd class="text-white font-medium text-xs">{row.value}</dd>
                    </div>
                {/each}
            </dl>
        </section>
    {/if}
{/snippet}

<!-- Services badges (e.g. a synagogue that also hosts a lesson + mikveh) -->
{#snippet servicesBlock()}
    {@const rawType = (item as { extraFields?: { type?: unknown } } | null)?.extraFields?.type}
    {@const services = typeof rawType === 'string' ? rawType.split(',').map(s => s.trim()).filter(Boolean) : []}
    {#if services.length > 0}
        <section class="pt-3 border-t border-white/10">
            <h2 class="text-base font-bold text-white mb-2 flex items-center gap-1.5">
                <span class="w-1 h-4 bg-blue-500 rounded-full"></span>מה יש במקום</h2>
            <div class="flex flex-wrap gap-2">
                {#each services as s}
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/15 border border-blue-400/40 text-blue-200">{s}</span>
                {/each}
            </div>
        </section>
    {/if}
{/snippet}

<!-- Gmach topics badges (a gmach can serve several topics) -->
{#snippet gmachTopicsBlock()}
    {@const ef = (item as { extraFields?: { gmach_types?: unknown; gmach_type?: unknown } } | null)?.extraFields}
    {@const keys = Array.isArray(ef?.gmach_types)
        ? (ef.gmach_types as unknown[]).filter((k): k is string => typeof k === 'string' && k.length > 0)
        : (typeof ef?.gmach_type === 'string' && ef.gmach_type ? [ef.gmach_type] : [])}
    {#if keys.length > 0}
        <section class="pt-3 border-t border-white/10">
            <h2 class="text-base font-bold text-white mb-2 flex items-center gap-1.5">
                <span class="w-1 h-4 bg-amber-400 rounded-full"></span>נושאי הגמ"ח</h2>
            <div class="flex flex-wrap gap-2">
                {#each keys as k}
                    <span class="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 border border-amber-400/40 text-amber-200">{trOr(tFn, `labels.gmach_${k}`, gmachTypeLabel(k))}</span>
                {/each}
            </div>
        </section>
    {/if}
{/snippet}

<div class="min-h-screen bg-[#070b14] py-2 md:py-3 px-3 md:px-6">
    <div class="max-w-4xl mx-auto">
        <!-- Back button (בתצוגה רגילה; במצב בנייה הניווט נמצא בסרגל העליון) -->
        {#if !builderMode}
            <button
                onclick={goBack}
                aria-label="חזרה לדף הקודם"
                class="mb-2 flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors group text-xs"
            >
                <span
                    class="text-xl group-hover:-translate-x-1 transition-transform"
                    aria-hidden="true"
                    >←</span
                >
                <span class="font-bold">{tFn("back_to_map")}</span>
            </button>
        {/if}

        {#if item}
            <!-- מצב בנייה: שורת ניווט (חזרה לתצוגה / חזרה למפה) + בורר סטטוס, במקום באנר ההדרכה -->
            {#if builderMode}
                <div class="mb-2 rounded-2xl border border-amber-500/40 bg-gradient-to-l from-amber-900/20 to-[#0f172a] p-2.5 shadow-lg"
                    in:fly={{ y: -16, duration: 400 }}>
                    <!-- מעל הסטטוס: חזרה לתצוגה (הדף הקודם) מצד אחד, חזרה למפה מצד שני -->
                    <div class="flex items-center justify-between gap-2 mb-2">
                        <button type="button" onclick={finishBuilder}
                            class="flex items-center gap-1.5 text-xs font-bold text-gray-200 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition-all whitespace-nowrap">
                            <span aria-hidden="true">→</span> חזרה לתצוגה
                        </button>
                        <a href="/"
                            class="flex items-center gap-1.5 text-xs font-bold text-purple-300 hover:text-purple-200 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition-all whitespace-nowrap">
                            🗺 חזרה למפה
                        </a>
                    </div>
                    <!-- כפתור הסטטוס (הועבר לכאן במקום הבאנר) -->
                    {#if canEditPage}
                        <div class="flex justify-center">
                            {@render statusSelector(false)}
                        </div>
                    {/if}
                    {#if isNewItem}
                        <p class="text-emerald-300 font-bold text-xs mt-2 text-center">🎉 מזל טוב - הפריט עלה למפה!</p>
                    {/if}
                    {#if builderError}
                        <p class="text-red-400 text-xs font-bold mt-1.5">⚠️ {builderError}</p>
                    {/if}
                    {#if savingTag}
                        <p class="text-amber-300/80 text-[11px] mt-1.5 text-center">שומר...</p>
                    {/if}
                </div>
            {/if}

            <div
                class="bg-[#0f172a] rounded-3xl shadow-2xl border border-white/10 relative {builderMode ? 'ring-1 ring-amber-500/30' : ''}"
                in:fly={{ y: 50, duration: 800, delay: 200 }}
            >
                <!-- כפתורי בעלים/עורך + בורר סטטוס אוחדו לסרגל בזרימה בראש פאנל הפרטים
                     (למטה) כדי שלא ירחפו מעל התוכן ויתנגשו - ראה "סרגל עורך" -->

                <!-- Top: image side-by-side with description+address -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-0">
                <!-- עמודה ימנית: כותרת מעל התמונה → תמונה → קישורים -->
                <div class="flex flex-col">
                {#if !isSingles && (displayLabel || builderMode)}
                    <div class="px-4 md:px-5 pt-3 pb-1 text-center">
                        {@render titleBlock()}
                    </div>
                {/if}
                <!-- Header / Image gallery -->
                <div use:imageDrop={handleImageDrop} class="relative bg-[#0a0f1a] flex items-center justify-center min-h-[150px]" class:h-[110px]={galleryImages.length === 0} class:md:h-[140px]={galleryImages.length === 0}>
                    {#if galleryImages.length > 0}
                        {#key galleryIndex}
                            <button
                                type="button"
                                onclick={openLightbox}
                                aria-label="הגדל תמונה"
                                title="לחץ להגדלה"
                                class="contents cursor-zoom-in"
                            >
                                <img
                                    src={galleryImages[galleryIndex]}
                                    alt={item.label}
                                    class="max-w-full max-h-[320px] md:max-h-[420px] w-auto h-auto object-contain cursor-zoom-in"
                                    in:fade={{ duration: 200 }}
                                />
                            </button>
                        {/key}
                        {#if galleryImages.length > 1}
                            <!-- Prev/Next -->
                            <button
                                type="button"
                                onclick={prevImage}
                                aria-label="הקודם"
                                class="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white text-xl font-black flex items-center justify-center backdrop-blur-sm transition-colors"
                            >→</button>
                            <button
                                type="button"
                                onclick={nextImage}
                                aria-label="הבא"
                                class="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 text-white text-xl font-black flex items-center justify-center backdrop-blur-sm transition-colors"
                            >←</button>
                            <!-- Counter (בפינה הפנויה - כפתורי הבעלים יושבים ב-end העליון) -->
                            <span class="absolute top-3 start-3 z-20 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-bold">
                                📷 {galleryIndex + 1} / {galleryImages.length}
                            </span>
                            <!-- Dots (במצב בנייה עולים מעל כפתורי הוסף/הסר תמונה) -->
                            <div class="absolute {builderMode ? 'bottom-10' : 'bottom-3'} left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                                {#each galleryImages as _, i}
                                    <button
                                        type="button"
                                        onclick={() => galleryIndex = i}
                                        aria-label={`תמונה ${i + 1}`}
                                        class="w-2 h-2 rounded-full transition-all {i === galleryIndex ? 'bg-white w-6' : 'bg-white/50 hover:bg-white/80'}"
                                    ></button>
                                {/each}
                            </div>
                        {/if}
                    {:else if builderMode}
                        <!-- מצב בנייה בלי תמונות: אזור העלאה מודגש -->
                        <button type="button" onclick={() => imageInputEl?.click()} disabled={uploadingImages}
                            class="w-full h-full min-h-[150px] flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-amber-400/50 bg-amber-500/5 hover:bg-amber-500/10 transition-all rounded-t-3xl md:rounded-t-none md:rounded-r-3xl disabled:opacity-60">
                            <span class="text-4xl" aria-hidden="true">📷</span>
                            <span class="text-amber-200 font-bold text-sm">{uploadingImages ? 'מעלה תמונה...' : 'הוסיפו תמונה של המקום'}</span>
                            <span class="text-[11px] text-amber-300/80 px-4 text-center">דף עם תמונה מושך הרבה יותר גולשים - אפשר עד {MAX_IMAGES} תמונות</span>
                        </button>
                        <div class="absolute bottom-2 right-2 z-20">
                            <CameraCapture onfiles={processImageFiles} class="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-black/70 hover:bg-black/90 border border-amber-400/40 rounded-lg px-2 py-1 backdrop-blur-sm transition-all cursor-pointer" />
                        </div>
                    {:else if serviceLogo}
                        <div class="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center gap-3">
                            <img src={serviceLogo} alt={serviceTypeLabel} class="w-32 h-32 md:w-40 md:h-40 drop-shadow-xl" />
                            {#if serviceTypeLabel}
                                <span class="text-white/90 text-lg font-bold">{serviceTypeLabel}</span>
                            {/if}
                        </div>
                    {:else}
                        <div class="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
                            {#if item.icon?.startsWith('/')}<img src={item.icon} alt="" class="w-40 h-40 md:w-48 md:h-48 object-contain drop-shadow-xl" />{:else}<span class="text-[120px]">{item.icon}</span>{/if}
                        </div>
                    {/if}
                    {#if builderMode && galleryImages.length > 0}
                        <!-- מצב בנייה עם תמונות: הוספה/הסרה מעל התמונה -->
                        <div class="absolute bottom-2 right-2 z-20 flex gap-1.5">
                            {#if galleryImages.length < MAX_IMAGES}
                                <button type="button" onclick={() => imageInputEl?.click()} disabled={uploadingImages}
                                    class="text-[11px] font-bold text-white bg-black/70 hover:bg-black/90 border border-amber-400/40 rounded-lg px-2 py-1 backdrop-blur-sm transition-all disabled:opacity-60">
                                    {uploadingImages ? 'מעלה...' : '📷 הוסף תמונה'}
                                </button>
                                <CameraCapture onfiles={processImageFiles} class="inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-black/70 hover:bg-black/90 border border-amber-400/40 rounded-lg px-2 py-1 backdrop-blur-sm transition-all cursor-pointer" />
                            {/if}
                            <button type="button" onclick={repositionCurrentImage} disabled={savingTag === 'images'}
                                class="text-[11px] font-bold text-white bg-black/70 hover:bg-purple-700 border border-purple-400/40 rounded-lg px-2 py-1 backdrop-blur-sm transition-all disabled:opacity-60">
                                🎯 מקם / חתוך
                            </button>
                            <button type="button" onclick={removeCurrentImage} disabled={savingTag === 'images'}
                                class="text-[11px] font-bold text-red-300 bg-black/70 hover:bg-black/90 border border-red-400/40 rounded-lg px-2 py-1 backdrop-blur-sm transition-all disabled:opacity-60">
                                🗑 הסר תמונה זו
                            </button>
                        </div>
                    {/if}
                    <input bind:this={imageInputEl} type="file" accept="image/*" multiple class="hidden" onchange={onImagesPicked} />
                    <div class="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent pointer-events-none"></div>
                </div>
                    <!-- מקטע הקישורים הועבר לעמודת המידע, מתחת לתיאור והכתובת -->
                </div>

                <!-- Side info: nickname + description + address + contact + extra fields -->
                <div class="px-4 md:px-5 py-3 flex flex-col gap-2">
                    <!-- סרגל העורך (בעלים/רכז) הועבר לתחתית הדף לבקשת המשתמש - ראה מתחת לתוכן -->
                    <!-- הכינוי מוצג ככותרת רק בפנויים; במקומות/עסקים לא מציגים את שם מי שהעלה את הפריט -->
                    {#if nickname && isSingles}
                        <p class="text-white text-xl md:text-2xl font-bold leading-tight">{nickname}</p>
                    {/if}
                    <!-- הכותרת (שם המקום) הועברה לראש העמודה הימנית, מעל התמונה -->
                    <!-- תג סטטוס תפעולי (מוצג לכולם כשהמקום אינו "פעיל") -->
                    {#if placeStatusBadge && placeStatus !== 'active'}
                        <span class="inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-0.5 border w-fit {placeStatusBadge.badge}">
                            {placeStatusBadge.emoji} {placeStatusBadge.label}
                        </span>
                    {/if}
                    {#if age != null || sector}
                        <div class="flex flex-wrap items-center gap-x-4 gap-y-0.5">
                            {#if age != null}
                                <p class="text-gray-300 text-base leading-tight">גיל: {age}</p>
                            {/if}
                            {#if sector}
                                <p class="text-gray-300 text-base leading-tight">{sector}</p>
                            {/if}
                        </div>
                    {/if}

                    <!-- תת-כותרת/תיאור (מרכז) + כפתור שיתוף מרובע קטן בצד שמאל -->
                    <div class="flex items-start gap-2">
                        <!-- ימין (RTL): מרווח לאיזון מרכוז התת-כותרת ברוחב כפתור השיתוף -->
                        <div class="w-9 shrink-0" aria-hidden="true"></div>
                        <!-- מרכז: תיאור / תת-כותרת -->
                        <div class="flex-1 min-w-0">
                            {#if builderMode && editingField === 'description'}
                                <div class="space-y-1.5">
                                    {@render tip('ספרו לגולשים מה מיוחד במקום, למי הוא מתאים ומה כדאי לדעת לפני שמגיעים')}
                                    <textarea bind:value={draftText} rows="4" maxlength="3000" use:focusOnMount onkeydown={editorKeys}
                                        class="w-full bg-[#0a0f1a] border border-amber-500/50 rounded-lg text-white text-sm px-2.5 py-1.5 leading-snug"
                                        placeholder="מידע על המקום, המניין או השיעור..."></textarea>
                                    <div class="flex gap-2">
                                        <button type="button" onclick={saveTextField} disabled={savingTag === 'description'}
                                            class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg px-3 py-1.5">💾 שמור</button>
                                        <button type="button" onclick={cancelEditField} class="text-xs font-bold text-gray-300 hover:text-white px-2 py-1.5">ביטול</button>
                                    </div>
                                </div>
                            {:else if displayDescription.trim()}
                                <p class="text-gray-200 text-base leading-snug whitespace-pre-line text-center">
                                    {displayDescription}
                                    {#if builderMode}
                                        <button type="button" onclick={() => startEditField('description', displayDescription)}
                                            aria-label="ערוך תיאור" title="ערוך תיאור"
                                            class="text-sm bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg px-1.5 py-0.5 transition-all ms-1 align-middle">✏️</button>
                                    {/if}
                                </p>
                            {:else if builderMode}
                                <button type="button" onclick={() => startEditField('description', '')}
                                    class="w-full text-right border-2 border-dashed border-amber-400/40 hover:border-amber-400/70 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl px-3 py-2 text-amber-200 text-sm font-bold transition-all">
                                    📝 הוסיפו תיאור קצר - מה מיוחד במקום? למי הוא מיועד?
                                </button>
                            {/if}
                        </div>
                        <!-- שמאל (RTL last child): כפתור שיתוף מרובע -->
                        <div class="shrink-0">
                            {@render shareBlock()}
                        </div>
                    </div>

                    <!-- טלפון (הכתובת עברה לכותרת תיבת "יצירת קשר עם המפרסם", משמאל מול שם איש הקשר) -->
                    <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                    <!-- Phone (non-singles or singles approved) -->
                    {#if item.category !== 'singles'}
                        {#if builderMode && editingField === 'phone'}
                            <div class="space-y-1.5 basis-full">
                                {@render tip('טלפון ליצירת קשר. בעזרת הכפתור "הצג / אל תציג" קובעים אם המספר יופיע לגולשים')}
                                <input type="tel" dir="ltr" bind:value={draftText} maxlength="40" placeholder="05X-XXXXXXX" use:focusOnMount onkeydown={editorKeys}
                                    class="w-full bg-[#0a0f1a] border border-amber-500/50 rounded-lg text-white text-sm px-2.5 py-1.5" />
                                <div class="flex gap-2">
                                    <button type="button" onclick={saveTextField} disabled={savingTag === 'phone'}
                                        class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg px-3 py-1.5">💾 שמור</button>
                                    <button type="button" onclick={cancelEditField} class="text-xs font-bold text-gray-300 hover:text-white px-2 py-1.5">ביטול</button>
                                </div>
                            </div>
                        {:else if displayPhone && canSeePhone}
                            <p class="text-base text-gray-200 flex flex-wrap items-center gap-1.5">
                                <span class="text-green-400">📞</span>
                                <a href="tel:{displayPhone}" class="hover:text-white">{displayPhone}</a>
                                {#if builderMode}
                                    <button type="button" onclick={() => startEditField('phone', displayPhone)}
                                        aria-label="ערוך טלפון" title="ערוך טלפון"
                                        class="text-sm bg-amber-500/15 hover:bg-amber-500/30 border border-amber-500/40 rounded-lg px-1.5 py-0.5 transition-all">✏️</button>
                                    <!-- הצג / אל תציג את המספר לגולשים (ברירת מחדל: אל תציג) -->
                                    <span class="inline-flex rounded-full border border-white/15 overflow-hidden text-[11px] font-bold ms-1">
                                        <button type="button" onclick={() => setPhonePublic(true)} disabled={savingTag === 'phone_public'}
                                            class="px-2 py-0.5 transition-all {phonePublic ? 'bg-emerald-500/25 text-emerald-200' : 'text-gray-400 hover:text-gray-200'}">הצג</button>
                                        <button type="button" onclick={() => setPhonePublic(false)} disabled={savingTag === 'phone_public'}
                                            class="px-2 py-0.5 transition-all {!phonePublic ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-gray-200'}">אל תציג</button>
                                    </span>
                                {/if}
                            </p>
                            {#if builderMode && !phonePublic}
                                <p class="basis-full text-[11px] text-gray-500 leading-snug -mt-1">🙈 המספר לא יוצג כטקסט לגולשים (כפתורי "התקשר" ו"וואטסאפ" עדיין עובדים). לחצו "הצג" כדי להציג גם את המספר עצמו.</p>
                            {/if}
                        {:else if builderMode}
                            <button type="button" onclick={() => startEditField('phone', '')}
                                class="w-full text-right border-2 border-dashed border-amber-400/40 hover:border-amber-400/70 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl px-3 py-2 text-amber-200 text-sm font-bold transition-all">
                                📞 הוסיפו טלפון ליצירת קשר
                            </button>
                        {/if}
                    {:else if singlesState === 'approved' && item.phone}
                        <p class="text-base text-emerald-200 flex items-center gap-1.5">
                            <span>✅</span>
                            <a href="tel:{item.phone}" class="hover:text-white">{item.phone}</a>
                        </p>
                    {/if}
                    </div>

                    <!-- 🎥 סרטון הגעה: איך מגיעים ואיפה הכניסה (העלאה ישירה או קישור מרשת חברתית) -->
                    {#if arrivalVideo || (builderMode && canEditPage)}
                        <section class="pt-3 border-t border-white/10">
                            <div class="flex items-center justify-between mb-2">
                                <h2 class="text-base font-bold text-white flex items-center gap-1.5">
                                    <span class="w-1 h-4 bg-rose-400 rounded-full"></span>🎥 סרטון הגעה</h2>
                                {#if builderMode && canEditPage && arrivalVideo && !editingVideo}
                                    <div class="flex gap-1.5">
                                        <button type="button" onclick={startEditVideo}
                                            class="text-xs font-bold text-rose-300 hover:text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg px-2.5 py-1 transition-all">✏️ החלף</button>
                                        <button type="button" onclick={removeVideo} disabled={savingTag === 'arrival_video'}
                                            class="text-xs font-bold text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg px-2.5 py-1 transition-all disabled:opacity-50">🗑 הסר</button>
                                    </div>
                                {/if}
                            </div>

                            {#if builderMode && canEditPage && editingVideo}
                                <!-- עורך: בחירה בין העלאה ישירה לבין קישור מרשת חברתית -->
                                <div class="rounded-xl border border-rose-500/20 bg-rose-500/[0.03] p-2.5 space-y-2">
                                    {@render tip('סרטון קצר שמראה איך מגיעים ואיפה הכניסה. אפשר להעלות קובץ (עד 8MB) או להדביק קישור מיוטיוב / פייסבוק / וימאו.')}
                                    <div class="inline-flex rounded-lg border border-white/15 overflow-hidden text-xs font-bold">
                                        <button type="button" onclick={() => (videoMode = 'link')}
                                            class="px-3 py-1.5 transition-all {videoMode === 'link' ? 'bg-rose-500/25 text-rose-100' : 'text-gray-400 hover:text-gray-200'}">🔗 קישור</button>
                                        <button type="button" onclick={() => (videoMode = 'upload')}
                                            class="px-3 py-1.5 transition-all {videoMode === 'upload' ? 'bg-rose-500/25 text-rose-100' : 'text-gray-400 hover:text-gray-200'}">⬆️ העלאה</button>
                                    </div>
                                    {#if videoMode === 'link'}
                                        <input type="url" bind:value={videoLinkDraft} dir="ltr" maxlength="500"
                                            placeholder="https://youtube.com/... · פייסבוק · וימאו"
                                            class="w-full bg-[#0a0f1a] border border-white/15 rounded-md text-sm text-white px-2.5 py-1.5 placeholder:text-gray-500" />
                                        <div class="flex items-center gap-2">
                                            <button type="button" onclick={saveVideoLink} disabled={savingTag === 'arrival_video'}
                                                class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-all">
                                                {savingTag === 'arrival_video' ? 'שומר…' : '💾 שמור'}
                                            </button>
                                            <button type="button" onclick={() => (editingVideo = false)} class="text-xs font-bold text-gray-300 hover:text-white px-2 py-1.5">ביטול</button>
                                        </div>
                                    {:else}
                                        <input type="file" accept="video/*" onchange={onVideoPicked} disabled={uploadingVideo}
                                            class="block w-full text-xs text-gray-300 file:me-2 file:rounded-md file:border-0 file:bg-rose-500/20 file:text-rose-100 file:px-3 file:py-1.5 file:font-bold file:cursor-pointer disabled:opacity-50" />
                                        <p class="text-[11px] text-gray-500">עד 8MB. לסרטון ארוך או כבד — עדיף קישור מיוטיוב/פייסבוק.</p>
                                        {#if uploadingVideo}<p class="text-rose-300/80 text-[11px]">מעלה סרטון…</p>{/if}
                                        <button type="button" onclick={() => (editingVideo = false)} class="text-xs font-bold text-gray-300 hover:text-white px-2 py-1.5">ביטול</button>
                                    {/if}
                                    {#if builderError}<p class="text-xs text-red-400">{builderError}</p>{/if}
                                </div>
                            {:else if videoEmbed}
                                {#if videoEmbed.kind === 'iframe'}
                                    <div class="relative w-full rounded-xl overflow-hidden border border-white/10 bg-black" style="aspect-ratio:16/9">
                                        <iframe src={videoEmbed.src} title="סרטון הגעה"
                                            class="absolute inset-0 w-full h-full" style="border:0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowfullscreen loading="lazy"></iframe>
                                    </div>
                                {:else if videoEmbed.kind === 'video'}
                                    <!-- svelte-ignore a11y_media_has_caption -->
                                    <video src={videoEmbed.src} controls playsinline preload="metadata"
                                        class="w-full rounded-xl border border-white/10 bg-black max-h-[70vh]"></video>
                                {:else}
                                    <a href={videoEmbed.src} target="_blank" rel="noopener noreferrer"
                                        class="inline-flex items-center gap-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-white font-bold px-4 py-2.5 rounded-xl transition-all">
                                        ▶️ צפייה בסרטון ההגעה
                                    </a>
                                {/if}
                            {:else if builderMode && canEditPage}
                                <button type="button" onclick={startEditVideo}
                                    class="w-full text-right border-2 border-dashed border-rose-400/40 hover:border-rose-400/70 bg-rose-500/5 hover:bg-rose-500/10 rounded-xl px-3 py-2 text-rose-200 text-sm font-bold transition-all">
                                    🎥 הוסיפו סרטון הגעה — איך מגיעים ואיפה הכניסה (העלאה או קישור)
                                </button>
                            {/if}
                        </section>
                    {/if}

                    <!-- קישורים: מתחת לתיאור והכתובת (הועבר לכאן מתחת לתמונה, לבקשת המשתמש) -->
                    {@render socialLinksBlock()}

                    <!-- "נראה לאחרונה" - קריאות אובדן -->
                    {@render lastSeenBlock()}

                    <!-- Services badges (synagogue + lesson + mikveh...) -->
                    {@render servicesBlock()}

                    <!-- Gmach topics badges (several topics per gmach) -->
                    {@render gmachTopicsBlock()}

                    <!-- Minyanim: daily prayer times (שחרית / מנחה / ערבית) -->
                    {#if isMinyanCategory && (canEditActivities || minyanActivities.length > 0)}
                        <section class="pt-3 border-t border-white/10">
                            <div class="flex items-center justify-between mb-2">
                                <h2 class="text-base font-bold text-white flex items-center gap-1.5">
                                    <span class="w-1 h-4 bg-sky-400 rounded-full"></span><img src="/icons/menorah.svg" alt="" class="inline-block h-[1.1em] w-auto align-[-0.15em]" /> זמני מניינים</h2>
                                {#if canEditActivities && !editingMinyan}
                                    <button type="button" onclick={startEditMinyan}
                                        class="text-xs font-bold text-sky-300 hover:text-sky-200 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg px-2.5 py-1 transition-all">
                                        ✏️ {minyanActivities.length ? 'ערוך' : 'הוסף זמנים'}
                                    </button>
                                {/if}
                            </div>

                            {#if !editingMinyan}
                                {#if minyanActivities.length === 0 && builderMode && canEditActivities}
                                    <button type="button" onclick={startEditMinyan}
                                        class="w-full text-right border-2 border-dashed border-sky-400/40 hover:border-sky-400/70 bg-sky-500/5 hover:bg-sky-500/10 rounded-xl px-3 py-2 text-sky-200 text-sm font-bold transition-all">
                                        🕒 הוסיפו זמני תפילות חול ושבת - שעה או זמן במילים (וותיקין / לפי שקיעה), או דלגו על תפילה שאין בה מניין
                                    </button>
                                {/if}
                                {#if weekdayMinyanim.length > 0}
                                    <p class="text-xs font-bold text-sky-300/80 mb-1">תפילות החול</p>
                                    <ul class="rounded-xl border border-white/10 divide-y divide-white/10 overflow-hidden mb-2">
                                        {#each MINYAN_PRAYERS as p}
                                            {@const row = weekdayMinyanim.find(a => a.type === p)}
                                            {#if row}{@render prayerRowView(row)}{/if}
                                        {/each}
                                    </ul>
                                {/if}
                                {#if shabbatMinyanim.length > 0}
                                    <p class="text-xs font-bold text-sky-300/80 mb-1">תפילות שבת</p>
                                    <ul class="rounded-xl border border-white/10 divide-y divide-white/10 overflow-hidden">
                                        {#each SHABBAT_PRAYERS as sp}
                                            {@const row = shabbatMinyanim.find(a => a.type === sp.key)}
                                            {#if row}{@render prayerRowView(row)}{/if}
                                        {/each}
                                    </ul>
                                {/if}
                            {:else}
                                <!-- Editor: שורה לכל תפילה (חול + שבת), שעות ו/או זמן במילים או "אין מניין" -->
                                <div class="rounded-xl border border-sky-500/20 bg-sky-500/[0.03] p-2.5 space-y-2">
                                    {@render tip('לכל תפילה אפשר למלא שעה, כמה מניינים, או זמן במילים (וותיקין / לפי שקיעה - שמשתנה כל שבוע). אם אין מניין - סמנו "אין מניין".')}
                                    <p class="text-xs font-bold text-sky-300/80 pt-0.5">תפילות החול</p>
                                    {#each MINYAN_PRAYERS as p}
                                        {@render prayerEditBlock(p, p)}
                                    {/each}
                                    <p class="text-xs font-bold text-sky-300/80 pt-1">תפילות שבת</p>
                                    {#each SHABBAT_PRAYERS as sp}
                                        {@render prayerEditBlock(sp.key, sp.label)}
                                    {/each}

                                    {#if minyanError}
                                        <p class="text-xs text-red-400">{minyanError}</p>
                                    {/if}
                                    <div class="flex items-center gap-2 pt-1">
                                        <button type="button" onclick={saveMinyan} disabled={savingMinyan}
                                            class="text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-all">
                                            {savingMinyan ? 'שומר…' : '💾 שמור'}
                                        </button>
                                        <button type="button" onclick={() => (editingMinyan = false)} disabled={savingMinyan}
                                            class="text-xs font-bold text-gray-300 hover:text-white px-2 py-1.5">ביטול</button>
                                    </div>
                                </div>
                            {/if}
                        </section>
                    {/if}

                    <!-- Activities schedule (each activity has its own time) + opening hours -->
                    {#if otherActivities.length > 0 || (openingHoursLines.length > 0 && canSeeHours) || (canEditActivities && builderMode) || (builderMode && hasHoursField)}
                        <section class="pt-3 border-t border-white/10">
                            <div class="flex items-center justify-between mb-2">
                                <h2 class="text-base font-bold text-white flex items-center gap-1.5">
                                    <span class="w-1 h-4 bg-amber-400 rounded-full"></span>לוח פעילויות ושעות</h2>
                                {#if canEditActivities && !editingSchedule && builderMode}
                                    <button type="button" onclick={startEditSchedule}
                                        class="text-xs font-bold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-lg px-2.5 py-1 transition-all">
                                        ✏️ {otherActivities.length ? 'ערוך' : 'הוסף פעילויות'}
                                    </button>
                                {/if}
                            </div>

                            <!-- שעות קבלת קהל / פתיחה: עורך "משעה-עד-שעה" + ＋ ישירות כאן במצב בנייה -->
                            {#if builderMode && hasHoursField}
                                <div class="mb-3">
                                    <p class="text-[13px] font-bold text-amber-200 mb-1 flex items-center gap-1.5">🕒 {hoursFieldLabel}</p>
                                    <p class="text-[11px] text-gray-400 leading-snug mb-1.5">משעת הפתיחה עד שעת הסגירה. יש קבלת קהל גם בשעות נוספות ביום (בוקר וגם אחה״צ)? הוסיפו מופע נוסף עם ＋.</p>
                                    <OpeningHoursEditor value={hoursValue} onchange={saveHours} />
                                    {#if savingTag === 'hours'}
                                        <p class="text-amber-300 text-xs mt-1">שומר…</p>
                                    {:else if hoursSaved}
                                        <p class="text-green-400 text-xs mt-1">✓ נשמר</p>
                                    {/if}
                                </div>
                            {/if}

                            {#if !editingSchedule}
                                {#if openingHoursLines.length > 0 && canSeeHours}
                                    <div class="rounded-xl border border-white/10 bg-[#0f172a] px-3 py-2 mb-2 flex items-start gap-2 text-xs">
                                        <span class="font-bold text-amber-200 whitespace-nowrap">{hoursFieldLabel}</span>
                                        <span class="text-white leading-snug">
                                            {#each openingHoursLines as line}<span class="block">{line}</span>{/each}
                                        </span>
                                        {#if builderMode}
                                            <!-- הצג / אל תציג את שעות הפתיחה לגולשים (ברירת מחדל: מוצג) -->
                                            <span class="ms-auto shrink-0 inline-flex rounded-full border border-white/15 overflow-hidden text-[11px] font-bold">
                                                <button type="button" onclick={() => setHoursPublic(true)} disabled={savingTag === 'hours_public'}
                                                    class="px-2 py-0.5 transition-all {hoursPublic ? 'bg-emerald-500/25 text-emerald-200' : 'text-gray-400 hover:text-gray-200'}">הצג</button>
                                                <button type="button" onclick={() => setHoursPublic(false)} disabled={savingTag === 'hours_public'}
                                                    class="px-2 py-0.5 transition-all {!hoursPublic ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-gray-200'}">אל תציג</button>
                                            </span>
                                        {/if}
                                    </div>
                                    {#if builderMode && !hoursPublic}
                                        <p class="text-[11px] text-gray-500 leading-snug mb-2 -mt-1">🙈 שעות הפתיחה מוסתרות מהגולשים. לחצו "הצג" כדי שיופיעו בדף.</p>
                                    {/if}
                                {/if}
                                {#if otherActivities.length === 0 && builderMode && canEditActivities}
                                    <button type="button" onclick={startEditSchedule}
                                        class="w-full text-right border-2 border-dashed border-amber-400/40 hover:border-amber-400/70 bg-amber-500/5 hover:bg-amber-500/10 rounded-xl px-3 py-2 text-amber-200 text-sm font-bold transition-all">
                                        🕒 הוסיפו לוח פעילויות - {activityExample}: שורה עם שעה וימים משלה
                                    </button>
                                {/if}
                                {#if otherActivities.length > 0}
                                    <ul class="rounded-xl border border-white/10 divide-y divide-white/10 overflow-hidden">
                                        {#each otherActivities as a}
                                            <li class="flex items-center gap-2 px-3 py-2 bg-[#0f172a] text-xs">
                                                {#if a.type}<span class="font-bold text-amber-200 whitespace-nowrap">{a.type}</span>{/if}
                                                {#if a.time}<span class="text-white font-mono whitespace-nowrap" dir="ltr">{a.time}</span>{/if}
                                                {#if a.days}<span class="text-gray-300 whitespace-nowrap">{a.days}</span>{/if}
                                                {#if a.note}<span class="text-gray-400 truncate">· {a.note}</span>{/if}
                                            </li>
                                        {/each}
                                    </ul>
                                {/if}
                            {:else}
                                <!-- Editor -->
                                <div class="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-2.5 space-y-2">
                                    {@render tip('לכל פעילות שורה משלה: בחרו סוג, שעה וימים - הגולשים יראו לוח מסודר')}
                                    {#each scheduleRows as row, i}
                                        <div class="flex flex-wrap items-center gap-1.5 bg-[#0f172a] rounded-lg p-1.5 border border-white/10">
                                            <select bind:value={row.type}
                                                class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 min-w-[110px]">
                                                <option value="">סוג...</option>
                                                {#each activityTypes as t}<option value={t}>{t}</option>{/each}
                                            </select>
                                            <input type="time" bind:value={row.time} dir="ltr"
                                                class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 w-[95px]" />
                                            <input type="text" bind:value={row.days} placeholder="ימים (א-ה)"
                                                class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 w-[90px]" />
                                            <input type="text" bind:value={row.note} placeholder="הערה"
                                                class="bg-[#0a0f1a] border border-white/15 rounded-md text-xs text-white px-2 py-1 flex-1 min-w-[80px]" />
                                            <button type="button" onclick={() => removeScheduleRow(i)} aria-label="הסר שורה"
                                                class="text-red-400 hover:text-red-300 px-1.5 text-lg leading-none">×</button>
                                        </div>
                                    {/each}
                                    <button type="button" onclick={addScheduleRow}
                                        class="text-xs font-bold text-amber-300 hover:text-amber-200">➕ הוסף פעילות</button>

                                    {#if scheduleError}
                                        <p class="text-xs text-red-400">{scheduleError}</p>
                                    {/if}
                                    <div class="flex items-center gap-2 pt-1">
                                        <button type="button" onclick={saveSchedule} disabled={savingSchedule}
                                            class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg px-3 py-1.5 transition-all">
                                            {savingSchedule ? 'שומר…' : '💾 שמור'}
                                        </button>
                                        <button type="button" onclick={() => (editingSchedule = false)} disabled={savingSchedule}
                                            class="text-xs font-bold text-gray-300 hover:text-white px-2 py-1.5">ביטול</button>
                                    </div>
                                </div>
                            {/if}
                        </section>
                    {/if}

                    <!-- Extra fields: עריכה במצב בנייה (שעות, מחיר, כשרות...) או תצוגה קומפקטית -->
                    {#if builderMode && canEditPage && item?.isUserSubmitted}
                        <!-- שינוי קטגוריה: טעיתם בסיווג? עוברים קטגוריה בלי למחוק ולפרסם מחדש -->
                        <section class="mb-3 rounded-xl border border-amber-400/25 bg-amber-500/5 p-3">
                            <div class="flex flex-wrap items-center gap-2">
                                <label for="category-switch" class="text-sm font-bold text-amber-300 whitespace-nowrap">
                                    📂 קטגוריית הפריט
                                </label>
                                <select
                                    id="category-switch"
                                    value={item.category}
                                    disabled={changingCategory}
                                    onchange={(e) => {
                                        const el = e.currentTarget;
                                        const next = el.value;
                                        if (next === item?.category) return;
                                        const label = trOr(tFn, cfCatKey(next), categoryConfig[next]?.label ?? next);
                                        if (confirm(`להעביר את הפריט לקטגוריה "${label}"?`)) {
                                            changeCategory(next);
                                        } else {
                                            el.value = item?.category ?? '';
                                        }
                                    }}
                                    class="rounded-lg border border-white/15 bg-[#0f172a] px-3 py-1.5 text-sm text-white focus:border-amber-400/60 focus:outline-none disabled:opacity-50"
                                >
                                    {#each Object.entries(categoryConfig) as [catId, cfg] (catId)}
                                        {#if catId !== 'singles'}
                                            <option value={catId}>
                                                {cfg.icon.startsWith('/') ? '' : cfg.icon} {trOr(tFn, cfCatKey(catId), cfg.label)}
                                            </option>
                                        {/if}
                                    {/each}
                                </select>
                                {#if changingCategory}
                                    <span class="text-xs text-gray-400">מעביר קטגוריה...</span>
                                {:else}
                                    <span class="text-xs text-gray-500">טעיתם בסיווג? בחרו קטגוריה נכונה — בלי למחוק ולפרסם מחדש</span>
                                {/if}
                            </div>
                            {#if categoryChangeError}
                                <p class="mt-2 text-xs text-red-400">{categoryChangeError}</p>
                            {/if}
                        </section>
                        <CategoryDetailsEditor
                            itemId={item.id}
                            category={item.category}
                            extraFields={(item.extraFields ?? {}) as Record<string, unknown>}
                            onSaved={(k, v) => (liveExtra = { ...liveExtra, [k]: v })} />
                    {:else}
                        {@render extraFieldsBlock()}
                    {/if}

                    <!-- כפתור השיתוף עבר לצד שמאל של התת-כותרת (כפתור מרובע קטן) -->
                </div>
                </div>

                <!-- Image gallery section (named) -->
                {#if galleryImages.length > 1}
                    <section class="px-4 md:px-5 pt-3 border-t border-white/10">
                        <h2 class="text-base font-bold text-white mb-2 flex items-center gap-1.5">
                            <span class="w-1 h-4 bg-pink-500 rounded-full"></span>
                            גלריית תמונות ({galleryImages.length})
                        </h2>
                        <div class="flex gap-1.5 overflow-x-auto hide-scrollbar">
                            {#each galleryImages as src, i}
                                <button
                                    type="button"
                                    onclick={() => galleryIndex = i}
                                    class="shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-md overflow-hidden border-2 transition-all {i === galleryIndex ? 'border-orange-400 shadow-md shadow-orange-500/30 scale-105' : 'border-white/10 hover:border-white/30 opacity-70 hover:opacity-100'}"
                                    aria-label={`תמונה ${i + 1}`}
                                >
                                    <img src={src} alt="" loading="lazy" decoding="async" class="w-full h-full object-cover" />
                                </button>
                            {/each}
                        </div>
                    </section>
                {/if}

                <!-- Content -->
                <div class="px-4 md:px-5 pt-2 pb-3">
                    <div class="space-y-3">
                        <!-- Main info -->
                        <div class="space-y-3">
                            {#if itemCondition}
                                <section class="flex items-center flex-wrap gap-2 pt-3 border-t border-white/10">
                                    <h2 class="text-base font-bold text-white flex items-center gap-1.5">
                                        <span class="w-1 h-4 bg-orange-500 rounded-full"></span>מצב הפריט
                                    </h2>
                                    <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border {conditionBadgeClass(itemCondition)}">
                                        <span aria-hidden="true">{conditionIcon(itemCondition)}</span>
                                        <span>{itemCondition}</span>
                                    </span>
                                </section>
                            {/if}
                            <!-- מקטע "קישורים" הועבר אל מתחת לתמונה בעמודה הימנית -->
                        </div>

                        <!-- Actions (compact, full width) -->
                        <div class="grid grid-cols-1 gap-1.5">
                            {#if item.category === 'singles'}
                                <!-- Singles: בקשת טלפון / סטטוס / תיבת בעלים -->
                                {#if singlesState === 'owner'}
                                    <div class="bg-gradient-to-br from-rose-600 to-pink-600 p-2 rounded-xl shadow-md">
                                        <div class="flex items-center justify-between gap-2 mb-0.5">
                                            <h3 class="text-white font-bold text-sm flex items-center gap-1">📥 בקשות נכנסות</h3>
                                            <span
                                                class="inline-flex items-center gap-1 text-white/85 text-[11px] bg-white/15 rounded-full px-2 py-0.5 whitespace-nowrap"
                                                title="🔒 הנתון גלוי רק לך, בעל הפריט"
                                            >{item?.viewCount ?? 0} צפיות</span>
                                        </div>
                                        {#if incoming.length === 0}
                                            <p class="text-white/80 text-[11px] bg-white/10 rounded px-2 py-0.5">אין בקשות ממתינות</p>
                                        {:else}
                                            <ul class="space-y-3">
                                                {#each incoming as r (r.id)}
                                                    <li class="bg-white/10 rounded-xl p-3">
                                                        <div class="text-white text-sm font-bold mb-1">
                                                            {r.requester_snapshot.nickname || 'משתמש'}
                                                            {#if r.requester_snapshot.gender}· {r.requester_snapshot.gender}{/if}
                                                            {#if r.requester_snapshot.age}· גיל {r.requester_snapshot.age}{/if}
                                                        </div>
                                                        {#if r.requester_snapshot.neighborhood || r.requester_snapshot.city}
                                                            <div class="text-white/80 text-xs mb-2">
                                                                {[r.requester_snapshot.neighborhood, r.requester_snapshot.city].filter(Boolean).join(', ')}
                                                            </div>
                                                        {/if}
                                                        <div class="flex gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={approving === r.id}
                                                                onclick={() => decideRequest(r.id, 'approved')}
                                                                class="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-bold py-1.5 rounded-lg disabled:opacity-50"
                                                            >✓ אשר ושלח טלפון</button>
                                                            <button
                                                                type="button"
                                                                disabled={approving === r.id}
                                                                onclick={() => decideRequest(r.id, 'rejected')}
                                                                class="flex-1 bg-white/15 hover:bg-white/25 text-white text-sm font-bold py-1.5 rounded-lg disabled:opacity-50"
                                                            >דחה</button>
                                                        </div>
                                                    </li>
                                                {/each}
                                            </ul>
                                            {#if approveError}
                                                <p class="text-red-200 text-xs mt-2">{approveError}</p>
                                            {/if}
                                        {/if}
                                    </div>
                                {:else if singlesState === 'guest'}
                                    <div class="bg-gradient-to-br from-rose-600 to-pink-600 p-2 rounded-xl shadow-md text-center">
                                        <h3 class="text-white font-bold text-base mb-1">🔒 הטלפון מוגן</h3>
                                        <p class="text-white/80 text-xs mb-2">כדי לבקש את הטלפון יש להתחבר. רק לאחר אישור הצד השני - תקבל את מספרו.</p>
                                        <a href="/login?redirect=/items/{item.id}" class="block w-full bg-white text-rose-600 font-bold py-2 rounded-lg text-center shadow-lg hover:scale-[1.02] transition-transform text-sm">התחבר כדי לבקש</a>
                                    </div>
                                {:else if singlesState === 'pending'}
                                    <div class="bg-gradient-to-br from-amber-600 to-orange-600 p-2 rounded-xl shadow-md text-center">
                                        <div class="text-2xl mb-1">⏳</div>
                                        <h3 class="text-white font-bold text-base mb-1">בקשתך נשלחה</h3>
                                        <p class="text-white/85 text-xs">הצד השני יקבל את הפרופיל שלך וייחליט. ברגע שיאשר - הטלפון יופיע כאן.</p>
                                    </div>
                                {:else if singlesState === 'approved'}
                                    <div class="bg-gradient-to-br from-emerald-600 to-green-600 p-2 rounded-xl shadow-md text-center">
                                        <div class="text-2xl mb-1">✅</div>
                                        <h3 class="text-white font-bold text-base mb-1">בקשתך אושרה!</h3>
                                        <p class="text-white/85 text-xs mb-2">הטלפון מוצג למעלה.</p>
                                        {#if item.phone}
                                            <a href="tel:{item.phone}" class="block w-full bg-white text-emerald-600 font-bold py-2 rounded-lg text-center shadow-lg hover:scale-[1.02] transition-transform text-sm">📞 התקשר עכשיו</a>
                                        {/if}
                                    </div>
                                {:else if singlesState === 'rejected'}
                                    <div class="bg-gradient-to-br from-gray-700 to-gray-800 p-2 rounded-xl shadow-md text-center">
                                        <div class="text-2xl mb-1">😕</div>
                                        <h3 class="text-white font-bold text-base mb-1">הבקשה לא אושרה</h3>
                                        <p class="text-white/70 text-xs">הצד השני בחר לא לשתף את הטלפון בשלב הזה.</p>
                                    </div>
                                {:else}
                                    <div class="bg-gradient-to-br from-rose-600 to-pink-600 p-2 rounded-xl shadow-md">
                                        <h3 class="text-white font-bold text-base mb-1">🔒 הטלפון מוגן</h3>
                                        <p class="text-white/85 text-xs mb-2">
                                            לחיצה תשלח לצד השני את הפרופיל שלך (שם, גיל, מגזר, שכונה). הטלפון יישלח אליך רק לאחר אישורו.
                                        </p>
                                        <button
                                            type="button"
                                            disabled={singlesSending}
                                            onclick={requestSinglesPhone}
                                            class="block w-full bg-white text-rose-600 font-black py-2 rounded-lg text-center shadow-lg hover:scale-[1.02] transition-transform disabled:opacity-60 text-sm"
                                        >
                                            {singlesSending ? 'שולח...' : '💌 שלח בקשת טלפון'}
                                        </button>
                                        {#if singlesError}
                                            <p class="text-red-100 text-xs mt-2 bg-red-900/30 rounded-lg px-2.5 py-1.5">{singlesError}</p>
                                        {/if}
                                        <p class="text-white/70 text-[10px] mt-2 text-center">מקס׳ 3 בקשות ב-24 שעות · ההגנה מבוטים</p>
                                    </div>
                                {/if}
                            {:else}
                                {@const waDigits = displayPhone ? String(displayPhone).replace(/\D/g, '').replace(/^0/, '972') : ''}
                                <div class="rounded-xl border border-white/10 bg-gradient-to-br from-purple-600/90 to-blue-600/90 p-3">
                                    <!-- כותרת התיבה = שם איש הקשר (נערך במצב בנייה, במקום הכותרת הגנרית שהוסרה) -->
                                    {#if builderMode && editingField === 'contact'}
                                        <div class="space-y-1.5 mb-2">
                                            {@render tip('שם איש הקשר - יופיע ככותרת תיבת יצירת הקשר')}
                                            <input type="text" bind:value={draftText} maxlength="120" placeholder="הרב ישראל ישראלי" use:focusOnMount onkeydown={editorKeys}
                                                class="w-full bg-[#0a0f1a] border border-amber-500/50 rounded-lg text-white text-sm px-2.5 py-1.5" />
                                            <div class="flex gap-2">
                                                <button type="button" onclick={saveTextField} disabled={savingTag === 'contact'}
                                                    class="text-xs font-bold text-white bg-amber-500 hover:bg-amber-400 disabled:opacity-50 rounded-lg px-3 py-1.5">💾 שמור</button>
                                                <button type="button" onclick={cancelEditField} class="text-xs font-bold text-white/80 hover:text-white px-2 py-1.5">ביטול</button>
                                            </div>
                                        </div>
                                    {:else if displayContact || item.address || builderMode}
                                        <!-- כותרת: שם איש הקשר מימין, כתובת משמאל (מול שם איש הקשר) -->
                                        <div class="flex items-center justify-between gap-2 mb-2">
                                            <div class="min-w-0 flex items-center gap-1.5">
                                                {#if displayContact}
                                                    <h3 class="text-white font-bold text-sm flex items-center gap-1.5 min-w-0">
                                                        <span aria-hidden="true">👤</span>
                                                        <span class="truncate min-w-0">{displayContact}</span>
                                                    </h3>
                                                    {#if builderMode}
                                                        <button type="button" onclick={() => startEditField('contact', displayContact)}
                                                            aria-label="ערוך איש קשר" title="ערוך איש קשר"
                                                            class="text-xs bg-white/15 hover:bg-white/30 rounded-lg px-1.5 py-0.5 transition-all shrink-0">✏️</button>
                                                    {/if}
                                                {:else if builderMode}
                                                    <button type="button" onclick={() => startEditField('contact', '')}
                                                        class="border-2 border-dashed border-white/40 hover:border-white/70 bg-white/5 hover:bg-white/10 rounded-lg px-2.5 py-1 text-white/90 text-xs font-bold transition-all">
                                                        👤 הוסיפו שם איש קשר
                                                    </button>
                                                {/if}
                                            </div>
                                            {#if item.address}
                                                {@const cityOnly = (() => {
                                                    const parts = String(item.address).split(',').map(p => p.trim()).filter(Boolean);
                                                    return parts[parts.length - 1] || item.address;
                                                })()}
                                                {#if builderMode && (item as { isOwner?: boolean } | null)?.isOwner}
                                                    <a href={`/add/${item.category}?edit=${item.id}`}
                                                        class="shrink-0 text-white/90 hover:text-white text-xs flex items-center gap-1 hover:underline underline-offset-2"
                                                        title="שינוי כתובת / מיקום על המפה">
                                                        <span aria-hidden="true">📍</span><span class="truncate max-w-[45vw]">{cityOnly}</span>
                                                    </a>
                                                {:else}
                                                    <span class="shrink-0 text-white/90 text-xs flex items-center gap-1">
                                                        <span aria-hidden="true">📍</span><span class="truncate max-w-[45vw]">{cityOnly}</span>
                                                    </span>
                                                {/if}
                                            {/if}
                                        </div>
                                    {/if}
                                    <div class="space-y-2">
                                        {#if displayPhone}
                                            <div class="grid {canNavigate ? 'grid-cols-3' : 'grid-cols-2'} gap-2">
                                                <a
                                                    href="tel:{displayPhone}"
                                                    aria-label="התקשר עכשיו – {displayPhone}"
                                                    class="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 rounded-lg text-center shadow hover:scale-[1.02] active:scale-95 transition-all text-sm"
                                                >
                                                    📞 התקשר
                                                </a>
                                                <a
                                                    href={`https://wa.me/${waDigits}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label="שלח הודעה בוואטסאפ"
                                                    class="bg-green-500 hover:bg-green-400 text-white font-bold py-2 rounded-lg text-center shadow hover:scale-[1.02] active:scale-95 transition-all text-sm"
                                                >
                                                    💬 וואטסאפ
                                                </a>
                                                {#if canNavigate}
                                                    <button type="button" onclick={() => navMenuOpen = !navMenuOpen}
                                                        aria-haspopup="menu" aria-expanded={navMenuOpen}
                                                        class="bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 rounded-lg text-center shadow hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-1">
                                                        🚗 נווט אל
                                                        <span class="text-[10px] opacity-80">{navMenuOpen ? '▲' : '▼'}</span>
                                                    </button>
                                                {/if}
                                            </div>
                                        {:else if canNavigate}
                                            <button type="button" onclick={() => navMenuOpen = !navMenuOpen}
                                                aria-haspopup="menu" aria-expanded={navMenuOpen}
                                                class="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 rounded-lg text-center shadow hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center justify-center gap-1">
                                                🚗 נווט אל
                                                <span class="text-[10px] opacity-80">{navMenuOpen ? '▲' : '▼'}</span>
                                            </button>
                                        {:else}
                                            <p class="text-white/80 text-xs text-center bg-white/10 rounded-lg py-2 px-2">
                                                פרטי יצירת קשר אינם זמינים לפריט זה.
                                            </p>
                                        {/if}
                                        <!-- תפריט בחירת אפליקציית ניווט - נפתח בלחיצה על "נווט אל" -->
                                        {#if canNavigate && navMenuOpen}
                                            <div class="grid grid-cols-2 gap-1.5" role="menu">
                                                <a href={wazeUrl} target="_blank" rel="noopener noreferrer" role="menuitem" onclick={() => navMenuOpen = false}
                                                    class="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/15 hover:bg-white/30 border border-white/20 text-white text-xs font-bold transition-all">
                                                    <span class="text-base" aria-hidden="true">🚗</span> Waze
                                                </a>
                                                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" role="menuitem" onclick={() => navMenuOpen = false}
                                                    class="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/15 hover:bg-white/30 border border-white/20 text-white text-xs font-bold transition-all">
                                                    <span class="text-base" aria-hidden="true">📍</span> Google Maps
                                                </a>
                                                <a href={moovitUrl} target="_blank" rel="noopener noreferrer" role="menuitem" onclick={() => navMenuOpen = false}
                                                    class="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/15 hover:bg-white/30 border border-white/20 text-white text-xs font-bold transition-all">
                                                    <span class="text-base" aria-hidden="true">🚌</span> Moovit
                                                </a>
                                                <a href={otherAppUrl} role="menuitem" onclick={() => navMenuOpen = false}
                                                    class="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-white/15 hover:bg-white/30 border border-white/20 text-white text-xs font-bold transition-all">
                                                    <span class="text-base" aria-hidden="true">📲</span> אפליקציה אחרת
                                                </a>
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                            {/if}

                        </div>
                    </div>
                </div>
            </div>

            <!-- סרגל עורך (בעלים/רכז) - ממוקם בתחתית הדף לבקשת המשתמש -->
            {#if (item as { isOwner?: boolean } | null)?.isOwner || singlesState === 'owner' || canEditPage}
                <div class="mt-3 rounded-2xl md:rounded-3xl border border-white/10 bg-[#0f172a] shadow-2xl p-2.5 flex flex-wrap items-center gap-1.5">
                    <span class="text-amber-300 text-sm shrink-0 leading-none" aria-hidden="true">✏️</span>
                    {#if canEditPage && !builderMode}
                        <button type="button" onclick={() => (builderMode = true)}
                            class="text-[11px] font-bold rounded-full px-2.5 py-1 border border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/30 transition-all whitespace-nowrap">
                            עריכת כרטיס הפריט
                        </button>
                    {/if}
                    {#if (item as { isOwner?: boolean } | null)?.isOwner || singlesState === 'owner'}
                        <a href={item.category === 'singles' ? `/add/singles?edit=${item.id}` : `/add/${item.category}?edit=${item.id}`}
                            class="text-[11px] font-bold rounded-full px-2.5 py-1 border border-white/20 bg-white/5 text-gray-300 hover:bg-white/15 transition-all whitespace-nowrap">
                            {canEditPage ? 'עריכת הפריט במפה' : 'ערוך פרופיל'}
                        </a>
                    {/if}
                    <!-- בורר הסטטוס בסרגל התחתון רק בתצוגה רגילה; במצב בנייה הוא בסרגל העליון -->
                    {#if canEditPage && !builderMode}
                        <div class="ms-auto">
                            {@render statusSelector(true)}
                        </div>
                    {/if}
                </div>
            {/if}

            <!-- ===== תגובות ===== -->
            <section class="mt-3 bg-[#0f172a] rounded-2xl md:rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
                <div class="bg-gradient-to-r from-blue-600 to-purple-600 px-3 md:px-4 py-2.5 flex items-center gap-2">
                    <span class="text-lg">💬</span>
                    <h2 class="text-white font-bold text-base">תגובות{sortedComments.length ? ` (${sortedComments.length})` : ''}</h2>
                </div>

                <div class="p-3 md:p-4">
                    <!-- טופס כתיבה -->
                    {#if isLoggedIn}
                        <div class="mb-3">
                            <textarea
                                bind:value={newComment}
                                maxlength="1000"
                                rows="2"
                                placeholder="כתוב תגובה..."
                                onkeydown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitComment(); }}
                                class="w-full bg-[#0a0f1a] border border-white/15 focus:border-blue-500/60 rounded-xl text-white text-sm px-3 py-2 resize-none outline-none transition-colors"
                            ></textarea>
                            <div class="flex items-center justify-between mt-1.5">
                                <span class="text-[11px] text-gray-500">{newComment.length}/1000 · Ctrl+Enter לשליחה</span>
                                <button
                                    type="button"
                                    onclick={submitComment}
                                    disabled={sendingComment || !newComment.trim()}
                                    class="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-4 py-1.5 rounded-full transition-colors"
                                >
                                    {sendingComment ? 'שולח...' : 'פרסם תגובה'}
                                </button>
                            </div>
                            {#if commentError}
                                <p class="text-red-300 text-xs mt-1.5 bg-red-900/30 rounded-lg px-2.5 py-1.5">{commentError}</p>
                            {/if}
                        </div>
                    {:else}
                        <a href="/login" class="block mb-3 text-center bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-blue-300 font-bold transition-colors">
                            התחבר כדי להגיב
                        </a>
                    {/if}

                    <!-- רשימת תגובות: חדש למעלה, ישן למטה -->
                    {#if sortedComments.length}
                        <div class="flex flex-col gap-2">
                            {#each sortedComments as c (c.id)}
                                <div class="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                                    <div class="flex items-center justify-between gap-2 mb-0.5">
                                        <span class="text-white font-bold text-[13px] flex items-center gap-1.5">
                                            <span class="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-[11px] flex-shrink-0">{(c.name || '?').charAt(0)}</span>
                                            {c.name || 'תושב/ת'}
                                        </span>
                                        <div class="flex items-center gap-2 flex-shrink-0">
                                            <span class="text-[11px] text-gray-500">{commentTimeAgo(c.at)}</span>
                                            {#if canModerateComments || c.user_id === viewerId}
                                                <button
                                                    type="button"
                                                    onclick={() => deleteComment(c.id)}
                                                    aria-label="מחק תגובה"
                                                    title="מחק תגובה"
                                                    class="text-gray-500 hover:text-red-400 text-xs transition-colors"
                                                >🗑</button>
                                            {/if}
                                        </div>
                                    </div>
                                    <p class="text-gray-200 text-sm leading-snug whitespace-pre-wrap break-words">{c.text}</p>
                                </div>
                            {/each}
                        </div>
                    {:else}
                        <p class="text-center text-gray-500 text-sm py-3">אין עדיין תגובות. היה הראשון להגיב 💬</p>
                    {/if}
                </div>
            </section>
        {:else}
            <!-- Not found state -->
            <div
                class="text-center py-24 bg-[#0f172a] rounded-3xl border border-white/10"
                in:scale={{ duration: 500 }}
            >
                <span class="text-8xl mb-8 block" aria-hidden="true">🔍</span>
                <h2 class="text-4xl font-black text-white mb-4">{tFn("item_not_found")}</h2>
                <p class="text-gray-400 mb-8">
                    נראה שהדף שאתה מחפש הוסר או שמעולם לא היה קיים.
                </p>
                <button
                    onclick={goBack}
                    aria-label="חזרה לדף הקודם"
                    class="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                >{tFn("back_to_map")}</button>
            </div>
        {/if}
    </div>
</div>

{#if lightboxOpen && item && galleryImages.length > 0}
    <div
        role="dialog"
        aria-modal="true"
        aria-label="תצוגת תמונה מוגדלת"
        class="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4"
        onclick={closeLightbox}
    >
        <button
            type="button"
            onclick={closeLightbox}
            aria-label="סגור"
            class="absolute top-4 left-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl font-black flex items-center justify-center backdrop-blur-sm transition-colors z-10"
        >×</button>
        {#if galleryImages.length > 1}
            <button
                type="button"
                onclick={(e) => { e.stopPropagation(); prevImage(); }}
                aria-label="הקודם"
                class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl font-black flex items-center justify-center backdrop-blur-sm transition-colors z-10"
            >→</button>
            <button
                type="button"
                onclick={(e) => { e.stopPropagation(); nextImage(); }}
                aria-label="הבא"
                class="absolute left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl font-black flex items-center justify-center backdrop-blur-sm transition-colors z-10"
            >←</button>
            <span class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-sm font-bold z-10">
                📷 {galleryIndex + 1} / {galleryImages.length}
            </span>
        {/if}
        {#key galleryIndex}
            <img
                src={galleryImages[galleryIndex]}
                alt={item.label}
                onclick={(e) => e.stopPropagation()}
                class="max-w-[95vw] max-h-[90vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
                in:fade={{ duration: 200 }}
            />
        {/key}
    </div>
{/if}

<!-- שגיאת שמירה במצב בנייה - טוסט צף שנמוג אחרי ~4 שניות, כי הבאנר העליון עלול להיות מחוץ למסך בגלילה (דפוס loc-toast מדף הפרופיל) -->
{#if builderError}
    {#key builderError}
        <div class="fixed bottom-6 left-1/2 z-[100] w-max max-w-xs md:max-w-sm pointer-events-none builder-error-toast" role="status" aria-live="polite">
            <div class="rounded-2xl bg-gray-900 border border-red-500/50 shadow-2xl px-5 py-3.5 flex items-center gap-3">
                <span class="text-xl leading-none flex-shrink-0">⚠️</span>
                <p class="flex-1 min-w-0 text-sm text-red-200 font-bold leading-snug">{builderError}</p>
            </div>
        </div>
    {/key}
{/if}

<style>
    :global(body) {
        background-color: #070b14;
    }
    /* טוסט שגיאת שמירה במצב בנייה - עולה מלמטה ונמוג לקראת ההיעלמות (4 שניות) */
    @keyframes builderToastInOut {
        0% {
            opacity: 0;
            transform: translate(-50%, 12px);
        }
        8%, 88% {
            opacity: 1;
            transform: translate(-50%, 0);
        }
        100% {
            opacity: 0;
            transform: translate(-50%, 6px);
        }
    }
    .builder-error-toast {
        animation: builderToastInOut 4s ease-out forwards;
    }
    .hide-scrollbar {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .hide-scrollbar::-webkit-scrollbar {
        display: none;
    }
</style>

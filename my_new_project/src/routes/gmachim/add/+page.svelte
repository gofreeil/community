<script lang="ts">
    import { onMount, tick, untrack } from 'svelte';
    import CameraCapture from '$lib/components/CameraCapture.svelte';
    import NeighborhoodSelect from '$lib/components/NeighborhoodSelect.svelte';
    import { get } from 'svelte/store';
    import { _ } from 'svelte-i18n';
    import { browser } from '$app/environment';
    import { goto, invalidateAll } from '$app/navigation';
    import LevelUpCard from '$lib/components/LevelUpCard.svelte';
    import { citiesAndNeighborhoods, effectiveNeighborhoods, LS_KEY, DEFAULT_NEIGHBORHOOD } from '$lib/neighborhoodsData';
    import { saveDraftBackup, loadDraftBackup, clearDraftBackup } from '$lib/draftBackup';
    import { GMACH_TYPES } from '$lib/gmachTypes';
    import { trOr } from '$lib/categoryFields';
    import { imageDrop } from '$lib/imageDrop';
    import StreetPicker from '$lib/components/StreetPicker.svelte';
    import NeighborhoodPicker from '$lib/components/NeighborhoodPicker.svelte';
    import NeighborhoodFallback from '$lib/components/NeighborhoodFallback.svelte';
    import { submitNeighborhoodRequest } from '$lib/neighborhoodRequest';
    import { revealFieldError } from '$lib/formGuard';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const DRAFT_KEY = 'add_draft_gmach';

    // ---- שלב-המפה בלבד: מה שצריך כדי להעלות את הגמ"ח למפה ----
    // שאר הפרטים (תיאור, שעות, קומה/דירה, הוראות הגעה, תמונות) מושלמים בדף הגמ"ח
    // עצמו במצב בנייה, מיד אחרי הפרסום - כמו בשאר קטגוריות המפה.
    let title       = $state('');
    let street      = $state('');
    let buildingNum = $state('');
    // untrack: ערכי פתיחה מהפרופיל - הטופס בשליטת המשתמש מכאן
    let phone       = $state(untrack(() => data.userPhone) || '');
    let gmachTypes  = $state<string[]>([]);
    let city        = $state(untrack(() => data.userCity) || 'ירושלים');
    // עיר בפרופיל בלי שכונה (יישוב חד-שכונתי) → "מרכז", לא ברירת המחדל הגלובלית
    // (קרית משה) ששייכת לירושלים - כמו ב-/add/[category]
    let neighborhood = $state(untrack(() => data.userNeighborhood || (data.userCity ? 'מרכז' : DEFAULT_NEIGHBORHOOD)));
    let logoBase64  = $state('');
    // סימון מיקום הגמ"ח על המפה (אופציונלי) - נשמר כ-lat/lng ברמה העליונה של הפריט
    let pinLat      = $state<number | null>(null);
    let pinLng      = $state<number | null>(null);
    let showMap     = $state(false);
    // הרחוב נבחר מהרשימה הרשמית של העיר? כשלא (או כשאין מספר בניין) - מציעים מפה
    let streetInList = $state(false);
    let addressResolved = $derived(streetInList && buildingNum.trim() !== '');
    // מיקום מדויק סומן על המפה. זו דרך חלופית מלאה לכתובת: מי שנעץ פין נתן
    // בדיוק את מה שהמפה צריכה, ואין טעם לדרוש ממנו גם רחוב וגם מספר בניין
    // (גמ"ח בלי מספר בית - בחנות, במוסד, בכניסה צדדית - זה מקרה נפוץ לגמרי).
    let hasPin = $derived(pinLat != null && pinLng != null);

    // יישוב בלי רשימת רחובות ובלי שכונות (כמו כפר תפוח): אי אפשר לאמת כתובת ואין
    // שכונות מובחנות - הפין הופך לחובה, אחרת כל הגמ"חים נערמים על מרכז היישוב.
    let cityHasStreetList = $state(false);
    let streetListLoading = $state(true);

    function toggleGmachType(key: string) {
        gmachTypes = gmachTypes.includes(key)
            ? gmachTypes.filter(k => k !== key)
            : [...gmachTypes, key];
    }

    let clientError    = $state('');
    let submitting     = $state(false);
    let redirectingMsg = $state('');

    // ---- רקע: הדף הקודם, מטושטש ----
    // הטופס "צף" כמו מודאל מעל הדף שממנו הגיעו. את אותו-מקור מציגים ממש (iframe
    // בלי סקריפטים - רק תצוגת ה-SSR, בלי תופעות-לוואי ובלי framebusting). דף
    // חוצה-מקור (למשל האתר הארצי) נחסם למסגור, ואז נשארים על טשטוש כהה מעוצב.
    let bgUrl = $state('');
    function goBack() {
        if (!browser) return;
        if (window.history.length > 1) window.history.back();
        else goto('/');
    }

    // ---- לוגו למפה (אופציונלי) ----
    function fileToResizedBase64(file: File, maxDim: number, quality = 0.85): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('read error'));
            reader.onload = (ev) => {
                const src = ev.target?.result as string;
                const img = new Image();
                img.onerror = () => reject(new Error('image error'));
                img.onload = () => {
                    let w = img.naturalWidth;
                    let h = img.naturalHeight;
                    if (w > maxDim || h > maxDim) {
                        const ratio = Math.min(maxDim / w, maxDim / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.src = src;
            };
            reader.readAsDataURL(file);
        });
    }

    async function processLogoFile(files: File[]) {
        const file = files[0];
        if (!file) return;
        try {
            logoBase64 = await fileToResizedBase64(file, 400, 0.85);
        } catch {
            clientError = get(_)('extras.g_logo_error');
        }
    }
    async function handleLogoChange(e: Event) {
        const input = e.target as HTMLInputElement;
        await processLogoFile(Array.from(input.files ?? []));
        input.value = '';
    }
    function removeLogo() { logoBase64 = ''; }

    // חוסם את השמירה האוטומטית עד שהשחזור ב-onMount הסתיים - שטיוטה קיימת
    // לא תידרס בערכים ריקים של טופס שרק נטען.
    let draftRestored = $state(false);
    // המשתמש בחר עיר/שכונה במפורש? רק אז מיקום מטיוטה גובר על הפרופיל בשחזור -
    // שברירת מחדל שגויה (ירושלים) שנשמרה פעם לא תרדוף רכז מבת ים לנצח.
    let locationTouched = $state(false);

    // ---- שחזור טיוטה + שכונה מ-localStorage ----
    onMount(() => {
        if (!browser) return;

        // רקע מטושטש של הדף הקודם - רק כשהוא מאותו-מקור (מסגור חוצה-מקור נחסם),
        // ורק כשאיננו עצמנו (מניעת קינון) וכשאיננו כבר בתוך iframe.
        if (window.self === window.top) {
            try {
                const u = new URL(document.referrer);
                if (u.origin === location.origin && u.pathname !== location.pathname) {
                    bgUrl = u.href;
                }
            } catch { /* אין referrer / כתובת לא תקינה - נשארים על טשטוש כהה */ }
        }

        // שחזור שכונת-הגלישה רק כשאין עיר בפרופיל - הפרופיל גובר, ששכונה שנצפתה
        // פעם באתר (למשל ירושלים) לא תדרוס את המיקום האמיתי של המשתמש.
        if (!data.userCity) {
            try {
                const saved = localStorage.getItem(LS_KEY);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed.neighborhood) neighborhood = parsed.neighborhood;
                    if (parsed.city)         city         = parsed.city;
                }
            } catch {}
        }

        // הטיוטה נשארת שמורה עד פרסום מוצלח (לא נמחקת בשחזור) - יציאה נוספת
        // מהעמוד באמצע מילוי לא תאבד שוב את מה שהוקלד.
        let d: Record<string, any> | null = null;
        try {
            const draft = localStorage.getItem(DRAFT_KEY);
            if (draft) d = JSON.parse(draft);
        } catch {}
        // גיבוי-עוגייה: נכתב רק כששמירת ה-localStorage נכשלה. אם הוא חדש יותר -
        // הוא המצב העדכני (ההקלדות שלא הצליחו להיכנס ל-localStorage) והוא שגובר.
        const backup = loadDraftBackup(DRAFT_KEY) as Record<string, any> | null;
        if (backup && (!d || Number(backup.savedAt ?? 0) > Number(d.savedAt ?? 0))) d = backup;
        if (d) try {
            if (d.title)        title        = d.title;
            if (d.street)       street       = d.street;
            if (d.buildingNum)  buildingNum  = d.buildingNum;
            if (d.phone)        phone        = d.phone;
            if (Array.isArray(d.gmachTypes)) gmachTypes = d.gmachTypes;
            else if (d.gmachType)            gmachTypes = [d.gmachType];
            // מיקום מהטיוטה משוחזר רק אם נבחר במפורש (locationTouched), או בטיוטת
            // legacy שנשמרה לפני ההתחברות (עברה ולידציה - יש בה title, והמיקום בה אמיתי).
            // בשני המקרים המיקום המשוחזר נחשב בחירה מפורשת - שאפקט יישור-הפרופיל לא ידרוס אותו.
            if (d.locationTouched === true || (d.locationTouched === undefined && d.title)) {
                if (d.city)         city         = d.city;
                if (d.neighborhood) neighborhood = d.neighborhood;
                locationTouched = true;
            }
            if (d.logoBase64)   logoBase64   = d.logoBase64;
            if (d.pinLat != null && d.pinLng != null) {
                pinLat = d.pinLat; pinLng = d.pinLng; showMap = true;
            }
        } catch {}

        // מעכשיו מותר לשמור - הטיוטה הקיימת כבר שוחזרה ולא תידרס.
        // ה-baseline מקבע את מצב הטופס אחרי השחזור: טופס שלא השתנה ממנו לא נשמר,
        // כדי שביקור-בעלמא לא ייצור טיוטת-רפאים עם עיר ברירת-מחדל.
        draftBaseline = JSON.stringify(draftPayload());
        draftRestored = true;

        // רשת ביטחון: שמירה גם ברגע עזיבת העמוד (במובייל הדפדפן עשוי להרוג את הטאב בלי flush)
        window.addEventListener('pagehide', saveDraft);
        return () => window.removeEventListener('pagehide', saveDraft);
    });

    // ---- שמירה אוטומטית של טיוטה בכל שינוי (כמו ב-/add/[category]) ----
    // בלעדיה הטיוטה נשמרה רק לפני מעבר להתחברות - ויציאה מהעמוד באמצע מילוי איבדה הכל.
    $effect(() => {
        if (!browser) return;
        void title; void street; void buildingNum; void phone; void gmachTypes;
        void city; void neighborhood; void pinLat; void pinLng; void logoBase64;
        void locationTouched;
        if (!draftRestored) return;
        saveDraft();
    });

    // ---- השלמת פרופיל בשער-הדרגה (LevelUpCard → invalidateAll) מגיעה בלי remount ----
    // מיישרים את העיר/שכונה לפרופיל הטרי, כל עוד המשתמש לא בחר מיקום בעצמו.
    $effect(() => {
        const c = data.userCity;
        if (!c || locationTouched || !draftRestored) return;
        if (city !== c) {
            city         = c;
            // שכונה לא-תואמת מתיישרת אוטומטית ע"י אפקט ההתאמה של neighborhoodsForCity
            neighborhood = data.userNeighborhood || '';
        }
    });

    let neighborhoodsForCity = $derived(effectiveNeighborhoods(city, (data as any).approvedNeighborhoods));

    // "יש שכונות אמיתיות" = מעבר ל'מרכז'/ברירת המחדל הגלובלית
    const cityHasNeighborhoods = $derived(
        neighborhoodsForCity.filter(n => n && n !== 'מרכז' && n !== DEFAULT_NEIGHBORHOOD).length > 0,
    );
    const forceMapPin = $derived(!streetListLoading && !cityHasStreetList && !cityHasNeighborhoods);
    $effect(() => { if (forceMapPin) showMap = true; });

    // אם משתנה עיר - איפוס לשכונה הראשונה אם הקיימת לא תואמת.
    // במסלול "השכונה שלי לא ברשימה" השם החופשי הוא בדיוק שם שאינו ברשימה,
    // ולכן האפקט הזה היה מוחק אותו מיד - מדלגים עליו שם.
    $effect(() => {
        if (nbNotFound) return;
        if (neighborhoodsForCity.length > 0 && !neighborhoodsForCity.includes(neighborhood)) {
            neighborhood = neighborhoodsForCity[0];
        }
    });

    // ---- מוצא: השכונה/האזור לא ברשימה ----
    // בלי זה גמ"ח באזור שאין לו שכונת מגורים ברשימה פשוט לא ניתן לפרסום.
    let nbNotFound = $state(false);
    let customNb   = $state('');
    let customLat  = $state<number | null>(null);
    let customLng  = $state<number | null>(null);
    let pinFromNbFallback = $state(false);

    function openNbFallback() {
        nbNotFound = true;
        locationTouched = true;
        if (customLat == null && pinLat != null && pinLng != null) {
            customLat = pinLat;
            customLng = pinLng;
        }
    }
    function closeNbFallback() {
        nbNotFound = false;
        customNb = '';
        customLat = null;
        customLng = null;
        if (pinFromNbFallback) {
            pinLat = null; pinLng = null; pinFromNbFallback = false;
        }
        if (neighborhoodsForCity.length > 0 && !neighborhoodsForCity.includes(neighborhood)) {
            neighborhood = neighborhoodsForCity[0];
        }
    }
    // עיר חדשה מבטלת מוצא שנפתח לעיר הקודמת
    let lastCityForFallback = '';
    $effect(() => {
        if (city === lastCityForFallback) return;
        lastCityForFallback = city;
        if (nbNotFound) closeNbFallback();
    });
    // השם החופשי הופך לשכונת הגמ"ח, והפין שסומן ממלא את פין הפריט כשאין אחר
    $effect(() => {
        if (!nbNotFound) return;
        const n = customNb.trim();
        if (n && n !== neighborhood) neighborhood = n;
    });
    $effect(() => {
        if (!nbNotFound || customLat == null || customLng == null) return;
        if (pinLat != null && !pinFromNbFallback) return;
        pinLat = customLat;
        pinLng = customLng;
        pinFromNbFallback = true;
    });

    // כל שגיאה מצביעה על השדה המדויק שחסר, כדי שנוכל להאיר ולגלול אליו
    function validate(): { field: string; message: string } | null {
        const t = get(_);
        if (!title.trim())        return { field: 'title',        message: t('extras.g_v_title') };
        // כתובת או פין - אחד מהשניים מספיק (כמו ב-/add/[category]). מי שכבר
        // סימן את המיקום המדויק על המפה לא ייחסם כאן על רחוב/מספר חסרים.
        if (!hasPin) {
            if (!street.trim())      return { field: 'street',      message: t('extras.g_v_street') };
            if (!buildingNum.trim()) return { field: 'buildingNum', message: t('extras.g_v_building') };
        }
        if (!city.trim())         return { field: 'city',         message: t('extras.g_v_city') };
        // מוצא "השכונה שלי לא ברשימה" פתוח אך לא מולא - בלי שם ובלי פין הגמ"ח
        // היה נשמר בשקט עם השכונה הקודמת ולא מופיע במקום הנכון על המפה
        if (nbNotFound) {
            if (!customNb.trim())
                return { field: 'nf-name', message: t('components.nf_need_name') };
            if (customLat == null || customLng == null)
                return { field: 'nf-name', message: t('components.nf_need_pin') };
        }
        if (!neighborhood.trim()) return { field: 'neighborhood', message: t('extras.g_v_neighborhood') };
        if (forceMapPin && !(pinLat != null && pinLng != null)) {
            showMap = true;
            // מפנים אל המפה עצמה ולא אל שדה הרחוב - מה שחסר הוא הפין
            return { field: 'gmach-map', message: t('extras.g_v_map_required') };
        }
        if (!phone.trim())        return { field: 'phone',        message: t('extras.g_v_phone') };
        return null;
    }

    let draftBaseline = ''; // מצב הטופס אחרי השחזור - טופס שלא השתנה ממנו לא נשמר
    function draftPayload() {
        return { title, street, buildingNum, phone, gmachTypes, city, neighborhood, pinLat, pinLng, locationTouched };
    }
    function saveDraft() {
        if (!browser || !draftRestored) return;
        // ביקור-בעלמא (שום קלט ושום בחירת מיקום) - לא שומרים כלל: לא נוצרת
        // טיוטת-רפאים גם אם אפקט התאמת-השכונה שינה ערך אחרי קביעת ה-baseline
        const hasContent = !!(title.trim() || street.trim() || buildingNum.trim()
            || gmachTypes.length || logoBase64 || pinLat != null);
        if (!hasContent && !locationTouched) return;
        const payload = draftPayload();
        // בלי שינוי אמיתי אין מה לשמור - לא דורסים טיוטה/גיבוי של טאב אחר
        if (JSON.stringify(payload) === draftBaseline) return;
        const full = { ...payload, savedAt: Date.now() };
        try {
            localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...full, logoBase64 }));
        } catch {
            // חריגה ממכסת localStorage (לוגו גדול) - שמור בלי הלוגו
            try { localStorage.setItem(DRAFT_KEY, JSON.stringify(full)); }
            // גם זה נכשל (המכסה מלאה מטיוטות אחרות) - הטקסט נשמר בעוגייה
            catch { saveDraftBackup(DRAFT_KEY, full); }
        }
    }

    // ---- שליחה: יוצר את הגמ"ח דרך /api/items ואז ממשיך לדף הגמ"ח (מצב בנייה) ----
    async function handleSubmit(e: Event) {
        e.preventDefault();
        clientError = '';
        const err = validate();
        // שגיאת ולידציה מוצגת ליד הכפתור (שם העיניים ברגע הלחיצה) ובמקביל
        // גוללת ומבליטה את השדה החוסם. tick: showMap עשוי להיפתח כרגע בוולידציה,
        // והמפה צריכה להיות ב-DOM לפני שגוללים אליה.
        if (err) { await tick(); revealFieldError(err.field, err.message); return; }

        // אם לא מחובר - שמור טיוטה והפנה להרשמה
        if (!data.userId) {
            saveDraft();
            redirectingMsg = get(_)('extras.g_draft_saved');
            setTimeout(() => goto('/login?redirect=/gmachim/add'), 2200);
            return;
        }

        submitting = true;

        // נושאי הגמ"ח: gmach_type הראשי לתאימות עם האתר הארצי + gmach_types המלא
        const primary = gmachTypes[0] ?? '';
        const extra: Record<string, unknown> = {};
        if (primary)            extra.gmach_type  = primary;
        if (gmachTypes.length)  extra.gmach_types = gmachTypes;
        if (logoBase64)         extra.map_image   = logoBase64;

        const address = [street, buildingNum].filter(Boolean).join(' ')
            || [neighborhood, city].filter(Boolean).join(', ');

        try {
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category: 'gemachim',
                    label: title,
                    phone,
                    address,
                    city,
                    neighborhood,
                    ...(pinLat != null && pinLng != null ? { lat: pinLat, lng: pinLng } : {}),
                    extra_fields: extra,
                }),
            });
            const result = await res.json().catch(() => ({}));
            if (!result.success || !result.id) {
                clientError = result.message || 'שגיאה בשמירת הגמ"ח, נסו שוב בעוד רגע';
                submitting = false;
                return;
            }
            // האזור החדש נרשם אצל המנהל כדי שיתווסף לרשימה לכולם. best-effort,
            // אחרי שהגמ"ח כבר נשמר - תקלה כאן לא נוגעת בפרסום שהצליח.
            if (nbNotFound && customNb.trim()) {
                await submitNeighborhoodRequest({
                    name: customNb, city, lat: customLat ?? pinLat, lng: customLng ?? pinLng,
                });
            }
            if (browser) {
                try { localStorage.removeItem(DRAFT_KEY); } catch {}
                clearDraftBackup(DRAFT_KEY);
            }
            // זרימה דו-שלבית: הגמ"ח עלה למפה - עוברים לדף המלא במצב בנייה להשלמת הפרטים
            goto(`/items/${result.id}?builder=1&new=1`);
        } catch {
            clientError = 'בעיית תקשורת - נסו שוב';
            submitting = false;
        }
    }
</script>

<svelte:head>
    <title>{$_('extras.g_title')} | קהילה בשכונה</title>
</svelte:head>

{#if clientError}
    <!-- z-[9999] כמו שאר ההתראות באתר: ב-z-50 ההודעה נקברה מתחת להדר
         הדביק (z-[1100]) ולא נראתה כלל - שגיאה שהוצגה ולא הייתה קיימת -->
    <div class="fixed top-20 inset-x-0 z-[9999] flex justify-center px-4 pointer-events-none" dir="rtl">
        <div class="pointer-events-auto flex items-center gap-2 max-w-md w-full rounded-xl bg-red-950/95 border border-red-500/50 shadow-2xl px-4 py-3 text-red-100 text-sm font-medium backdrop-blur">
            <span class="text-lg">⚠️</span>
            <span class="flex-1">{clientError}</span>
            <button type="button" onclick={() => (clientError = '')} aria-label={$_('extras.close')} class="text-red-300 hover:text-white text-lg leading-none">✕</button>
        </div>
    </div>
{/if}

{#if data.needsUpgrade && data.tierUser}
<div class="min-h-screen bg-[#070b14] pt-10 pb-20 px-4" dir="rtl">
    <div class="max-w-2xl mx-auto">
        <LevelUpCard user={data.tierUser} target={data.requiredTier} reason={$_('tiers.reason_publish')} approved={(data as any).approvedNeighborhoods ?? []} onDone={() => invalidateAll()} />
    </div>
</div>
{:else}
<div class="relative min-h-screen" dir="rtl">
    <!-- רקע: הדף הקודם מטושטש (אותו-מקור), אחרת טשטוש כהה מעוצב.
         absolute (לא fixed) - כך הוא כלוא בתוך תיבת-התוכן ולא מכסה את ה-Header/Footer/סרגל של ה-layout -->
    <div class="add-bg" aria-hidden="true">
        {#if bgUrl}
            <iframe class="add-bg__frame" src={bgUrl} title="background" tabindex="-1" scrolling="no" sandbox="allow-same-origin" referrerpolicy="no-referrer"></iframe>
        {/if}
        <div class="add-bg__scrim"></div>
    </div>

    <div class="relative z-10 max-w-2xl mx-auto pt-6 pb-20 px-4">
        <div class="mb-3">
            <button type="button" onclick={goBack}
                class="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-bold text-gray-200 backdrop-blur transition-all hover:border-white/30 hover:bg-white/10">
                <span aria-hidden="true">→</span>{$_('extras.g_back')}
            </button>
        </div>
        <div class="text-center mb-5">
            <span class="text-5xl mb-2 block">🤝</span>
            <h1 class="text-3xl font-black text-white mb-2">{$_('extras.g_title')}</h1>
            <p class="text-gray-400 text-sm max-w-md mx-auto">{$_('extras.g_step2_hint')}</p>
        </div>

        {#if !data.userId}
            <div class="rounded-xl bg-blue-900/20 border border-blue-500/30 p-3 mb-4 text-center text-blue-200 text-sm">
                {$_('extras.g_guest_note')}
            </div>
        {/if}

        {#if redirectingMsg}
            <div class="rounded-2xl border-2 border-blue-500/40 bg-blue-900/20 p-8 text-center">
                <div class="text-4xl mb-4">💾</div>
                {#each redirectingMsg.split('\n') as line}
                    <p class="text-blue-200 font-bold text-base mb-2">{line}</p>
                {/each}
                <div class="mt-4 flex justify-center">
                    <span class="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></span>
                </div>
            </div>
        {:else}
            <form onsubmit={handleSubmit} class="rounded-2xl bg-[#0f172a]/90 backdrop-blur-md border border-white/10 p-6 space-y-4 shadow-2xl shadow-black/50 ring-1 ring-white/5">
                <!-- נושאי הגמ"ח -->
                <div id="gmach_type" role="group" aria-label={$_('extras.g_topics_aria')}>
                    <p class="text-white text-sm font-bold mb-1">{$_('extras.g_topics_label')} <span class="text-gray-400 font-normal text-xs">{$_('extras.g_topics_multi')}</span></p>
                    <div class="flex flex-wrap gap-2">
                        {#each GMACH_TYPES as t}
                            {@const isOn = gmachTypes.includes(t.key)}
                            <button type="button" onclick={() => toggleGmachType(t.key)}
                                class="px-3 py-1.5 rounded-full border-2 text-sm font-bold transition-all {isOn
                                    ? 'bg-amber-600 text-white border-transparent shadow-md'
                                    : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10 hover:border-white/30'}">
                                {isOn ? '✓ ' : ''}{trOr($_, `labels.gmach_${t.key}`, t.label)}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- שם הגמ"ח -->
                <div>
                    <label for="title" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_name_label')}</label>
                    <input id="title" name="title" bind:value={title} required placeholder={$_('extras.g_name_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                </div>

                <!-- מיקום הפרסום: עיר + שכונה -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="city" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_city_label')}</label>
                        <select id="city" name="city" bind:value={city} onchange={() => (locationTouched = true)} required class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white" style="color-scheme: dark;">
                            {#each Object.keys(citiesAndNeighborhoods) as c}
                                <option value={c}>{c}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label for="neighborhood" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_neighborhood_label')}</label>
                        {#if nbNotFound}
                            <!-- שם האזור נשמר כשכונת הגמ"ח; השדה החבוי נשאר כדי
                                 שהערך יישלח בדיוק כמו מהבורר הרגיל -->
                            <input type="hidden" name="neighborhood" value={neighborhood} />
                            <button
                                type="button"
                                onclick={closeNbFallback}
                                class="w-full bg-yellow-500/10 border border-yellow-500/40 rounded-lg px-3 py-2 text-yellow-200 text-right text-sm flex items-center justify-between gap-2 cursor-pointer"
                            >
                                <span class="truncate">{customNb.trim() || $_('components.nf_name_placeholder')}</span>
                                <span class="opacity-60 text-xs">✕</span>
                            </button>
                        {:else}
                            <NeighborhoodSelect
                                id="neighborhood"
                                name="neighborhood"
                                bind:value={neighborhood}
                                neighborhoods={neighborhoodsForCity}
                                onpick={() => (locationTouched = true)}
                                extraOptionLabel={$_('components.nf_not_in_list')}
                                onextra={openNbFallback}
                                buttonClass="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-right flex items-center justify-between gap-2 cursor-pointer"
                            />
                        {/if}
                    </div>
                </div>

                {#if nbNotFound}
                    <NeighborhoodFallback
                        {city}
                        bind:name={customNb}
                        bind:lat={customLat}
                        bind:lng={customLng}
                        onback={closeNbFallback}
                    />
                {/if}

                <!-- כתובת: רחוב + מספר בניין -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="street" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_street_label')}</label>
                        <StreetPicker id="street" {city} value={street} withHouseNumber={false} onValueChange={(v) => (street = v)} onResolvedChange={(v) => (streetInList = v)} onStreetListChange={(info) => { cityHasStreetList = info.hasList || info.unavailable; streetListLoading = info.loading; }} />
                    </div>
                    <div>
                        <label for="buildingNum" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_building_label')}</label>
                        <!-- required רק כשאין פין: פין על המפה הוא כתובת מלאה בפני עצמה -->
                        <input id="buildingNum" name="buildingNum" bind:value={buildingNum} required={!hasPin} placeholder={$_('extras.g_building_ph')} class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                </div>

                <!-- סימון על המפה - מוצג כשהכתובת לא נפתרה, וחובה ביישוב בלי רחובות/שכונות -->
                {#if !addressResolved || forceMapPin}
                    <div id="gmach-map" class="rounded-xl">
                        {#if forceMapPin}
                            <p class="mb-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200 leading-relaxed">
                                {$_('extras.g_map_forced_note')}
                            </p>
                        {:else}
                            <p class="text-white text-sm font-bold mb-1">{$_('extras.g_map_notfound_title')}</p>
                            <p class="text-gray-400 text-xs mb-2">{$_('extras.g_map_notfound_sub')}</p>
                        {/if}
                        {#if !showMap}
                            <button
                                type="button"
                                onclick={() => (showMap = true)}
                                class="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-bold py-3 transition-all"
                            >
                                {$_('extras.g_map_pin_btn')}
                            </button>
                        {:else}
                            <NeighborhoodPicker
                                {city}
                                {neighborhood}
                                restrictToCity
                                bind:lat={pinLat}
                                bind:lng={pinLng}
                                onUserPin={() => (locationTouched = true)}
                            />
                            {#if !forceMapPin}
                                <button
                                    type="button"
                                    onclick={() => { showMap = false; pinLat = null; pinLng = null; }}
                                    class="mt-2 text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors"
                                >
                                    {$_('extras.g_map_hide')}
                                </button>
                            {/if}
                        {/if}
                    </div>
                {/if}

                <!-- טלפון + לוגו אופציונלי -->
                <div class="flex gap-4 items-end flex-wrap">
                    <div class="flex-1 min-w-[160px]">
                        <label for="phone" class="text-white text-sm font-bold mb-1 block">{$_('extras.g_phone_label')}</label>
                        <input id="phone" name="phone" bind:value={phone} type="tel" required placeholder="05X-XXXXXXX" class="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white placeholder-gray-500" />
                    </div>
                    <div>
                        <p class="text-white text-sm font-bold mb-1">{$_('extras.g_logo_label')}</p>
                        {#if logoBase64}
                            <div class="relative inline-block">
                                <img src={logoBase64} alt={$_('extras.g_logo_alt')} class="w-16 h-16 rounded-xl object-cover border border-white/15 bg-black/30" />
                                <button type="button" onclick={removeLogo} aria-label={$_('extras.g_logo_remove')}
                                    class="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-black/70 hover:bg-red-600 text-white text-xs flex items-center justify-center transition-colors">✕</button>
                            </div>
                        {:else}
                            <label use:imageDrop={processLogoFile} class="flex flex-col items-center justify-center gap-0.5 w-24 h-16 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/3 hover:bg-amber-900/10 cursor-pointer transition-all">
                                <span class="text-xl">🎨</span>
                                <span class="text-gray-400 text-[10px] font-bold">{$_('extras.g_logo_upload')}</span>
                                <input type="file" accept="image/*" class="hidden" onchange={handleLogoChange} />
                            </label>
                            <CameraCapture onfiles={processLogoFile} compact class="mt-1.5 flex items-center justify-center w-24 h-9 rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/3 hover:bg-amber-900/10 text-gray-400 hover:text-amber-300 cursor-pointer transition-all" />
                        {/if}
                    </div>
                </div>

                <button type="submit" disabled={submitting} class="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-60 text-white font-bold py-3 rounded-xl shadow-lg transition-all">
                    {#if submitting}
                        <span class="inline-block w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin align-middle"></span>
                    {:else}
                        {data.userId ? $_('extras.g_submit_continue') : $_('extras.g_submit_guest')}
                    {/if}
                </button>

                <p class="text-gray-400 text-sm text-center pt-2 border-t border-white/5">
                    {$_('extras.g_footer_1')} <a href="https://gemach.gofreeil.com/" target="_blank" rel="noopener noreferrer" class="text-amber-400 hover:text-amber-300 underline">{$_('extras.g_footer_link')}</a>
                </p>
            </form>
        {/if}

        <div class="text-center mt-6">
            <a href="https://gemach.gofreeil.com" target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-white transition-colors text-sm">{$_('extras.g_all_gmachim')}</a>
        </div>
    </div>
</div>
{/if}

<style>
    /* ההבהוב האדום על השדה החוסם מוגדר גלובלית ב-app.css (ראו $lib/formGuard.ts) */

    /* ═══ רקע מטושטש של הדף הקודם ═══ */
    /* בסיס: גם כשאין iframe (דף חוצה-מקור) נשאר טשטוש כהה מעוצב עם הילות צבע רכות */
    .add-bg {
        position: absolute;
        inset: 0;
        z-index: 0;
        overflow: hidden;
        background:
            radial-gradient(38rem 38rem at 82% -12%, rgba(245, 158, 11, 0.18), transparent 60%),
            radial-gradient(42rem 42rem at 10% 6%,  rgba(37, 99, 235, 0.20), transparent 60%),
            radial-gradient(50rem 50rem at 50% 120%, rgba(126, 34, 206, 0.16), transparent 60%),
            #070b14;
    }
    /* הדף הקודם עצמו — מטושטש, מוגדל מעט כדי לכסות את שולי-הטשטוש השקופים, לא-אינטראקטיבי */
    .add-bg__frame {
        position: absolute;
        inset: -6%;
        width: 112%;
        height: 112%;
        border: 0;
        filter: blur(10px) saturate(1.05) brightness(0.9);
        transform: scale(1.06);
        transform-origin: center;
        pointer-events: none;
        opacity: 0.9;
    }
    /* צעיף להעמקת הניגודיות של הטופס מעל הרקע + נגיעת טשטוש נוספת */
    .add-bg__scrim {
        position: absolute;
        inset: 0;
        background: radial-gradient(120% 90% at 50% 18%, rgba(7, 11, 20, 0.35), rgba(7, 11, 20, 0.78) 78%);
        -webkit-backdrop-filter: blur(2px);
        backdrop-filter: blur(2px);
    }
</style>

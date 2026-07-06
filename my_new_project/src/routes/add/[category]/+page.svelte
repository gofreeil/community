<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { goto } from '$app/navigation';
    import { LS_KEY, DEFAULT_NEIGHBORHOOD, citiesAndNeighborhoods, effectiveNeighborhoods } from '$lib/neighborhoodsData';
    import { getFormMemory, rememberFields } from '$lib/formMemory';
    import NeighborhoodPicker from '$lib/components/NeighborhoodPicker.svelte';
    import StreetPicker from '$lib/components/StreetPicker.svelte';
    import {
        emptyOpeningHours,
        parseOpeningHours,
        serializeOpeningHours,
        nextRangeAfter,
        DAY_SHORT,
        type OpeningHours,
    } from '$lib/openingHours';
    import { FREE_PROMO, FREE_PROMO_CODE_TEXT } from '$lib/freePromo';
    import { mapStepFields } from '$lib/categoryFields';
    import { MAP_IMAGE_PRICE_YEARLY } from '$lib/mapImage';
    import { imageDrop } from '$lib/imageDrop';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    const { categoryId, config, userId, userProfile, editItem } = data;

    // קטגוריית "מקום": הטופס מצומצם ל"הוספת יתרון במפה" - רק שדות שלב-המפה מוצגים,
    // ושאר הפרטים מושלמים בדף הפריט. activeFields = מה שבאמת מוצג/נשמר בטופס.
    const activeFields = mapStepFields(config);
    const activeKeys = new Set(activeFields.map(f => f.key));

    // ---- לוגו/תמונה שתופיע על המפה (רק בקטגוריות mapFirst) ----
    const initialLogo = (() => {
        if (!config.mapFirst || !editItem) return '';
        const v = (editItem.extra_fields as Record<string, unknown> | undefined)?.map_image;
        return typeof v === 'string' ? v : '';
    })();
    let logoImage = $state(initialLogo);
    let logoUploading = $state(false);

    // קטגוריות בתשלום מפנות לדף התשלום; בזמן מבצע ההשקה הקוד "יוצאים לחירות"
    // בשדה ההנחה שם נותן פטור מלא (freePromo.ts).
    const isPaidFlow = config.priceRow !== null;
    const isEditMode = !!editItem;

    // כותרת הדף: קטגוריות mapFirst = "הוספת יתרון במפה" (טופס מצומצם)
    const pageTitle = config.mapFirst
        ? (isEditMode ? `עריכת היתרון "${config.label}" במפה` : 'הוספת יתרון במפה')
        : (config.addPageTitle ?? `הוסף ${config.label}`);

    // מילוי אוטומטי של שם איש הקשר מותר רק בטפסים שבהם המפרסם הוא בדרך כלל
    // האדם עצמו (מסירה/טרמפ/פנויים/דרושים). בשאר הקטגוריות רכז עלול להעלות
    // נתונים עבור אחרים - ולכן אסור למלא את שמו שלו אוטומטית.
    const NAME_AUTOFILL_CATEGORIES = new Set(['giveaway', 'rides', 'jobs', 'singles']);
    const autofillName = NAME_AUTOFILL_CATEGORIES.has(categoryId);

    const DRAFT_KEY = `add_draft_${categoryId}`;

    // Helper: מחזיר HTML לאיקון - תמונה אם src, אמוגי אם לא
    const iconHtml = (size: 'lg' | 'sm' = 'sm') =>
        config.icon?.startsWith('/')
            ? `<img src="${config.icon}" class="${size === 'lg' ? 'w-20 h-20 md:w-28 md:h-28 mx-auto' : 'w-5 h-5 inline-block align-middle'}" alt="${config.label}" />`
            : config.icon ?? '';

    // ---- Neighborhood - מתמלא מיד מהפרופיל ----
    // אם למשתמש יש עיר אבל אין שכונה (יישוב חד-שכונתי כמו כפר תפוח) - "מרכז",
    // ולא ברירת המחדל הגלובלית (קרית משה) שתשמור את הפריט באזור הלא נכון.
    // במצב עריכה - המיקום של הפריט הקיים גובר על הפרופיל
    let neighborhood = $state(
        editItem?.neighborhood || userProfile?.neighborhood || (userProfile?.city ? 'מרכז' : DEFAULT_NEIGHBORHOOD),
    );
    let city         = $state(editItem?.city || userProfile?.city || 'ירושלים');

    // ערים+שכונות לבורר, כולל שכונות שאושרו ע"י אדמין (מקור-אמת אחד לכל האתר)
    let citiesWithApproved = $derived(
        Object.keys(citiesAndNeighborhoods).map(
            (c) => [c, effectiveNeighborhoods(c, (data as any).approvedNeighborhoods)] as [string, string[]],
        ),
    );

    // ---- בורר מיקום הפרסום (עיר+שכונה) - גלוי למפרסם, לא נלקח בשקט מהפרופיל ----
    // הערך הנוכחי תמיד מופיע ברשימה גם אם אינו בבורר (פרופיל ישן / שכונה מותאמת)
    const cityOptions = $derived.by(() => {
        const names = citiesWithApproved.map(([c]) => c);
        return names.includes(city) ? names : [city, ...names];
    });
    const cityNeighborhoods = $derived.by(() => {
        const list = citiesWithApproved.find(([c]) => c === city)?.[1] ?? [];
        return list.includes(neighborhood) ? list : [neighborhood, ...list].filter(Boolean);
    });
    function onCityChange() {
        const list = citiesWithApproved.find(([c]) => c === city)?.[1] ?? [];
        neighborhood = list.includes('מרכז') || list.length === 0 ? 'מרכז' : list[0];
    }

    // ---- פין מיקום על המפה (שדות מסוג map_pin) ----
    let pinLat = $state<number | null>(editItem?.lat ?? null);
    let pinLng = $state<number | null>(editItem?.lng ?? null);
    // המפה נטענת רק אחרי שהמשתמש בוחר לסמן (או אם כבר יש פין שמור מעריכה)
    let showMap = $state(editItem?.lat != null && editItem?.lng != null);
    // מקור הפין: 'manual' = המשתמש סימן/גרר (מקודש - לא דורסים), 'geo' = זוהה
    // אוטומטית מהכתובת (מותר לעדכן כשהכתובת משתנה), null = אין פין עדיין
    let pinSource = $state<'manual' | 'geo' | null>(editItem?.lat != null ? 'manual' : null);
    // הכתובת "נפתרה" = רחוב מהרשימה הרשמית + מספר בית. אז אין צורך במפה;
    // שדה map_pin מוצג רק כשהכתובת לא נפתרה (רחוב חסר / בלי מספר).
    let addressResolved = $state(false);

    // ---- פין אוטומטי מהכתובת: רחוב+מספר נבחרו → הפין קופץ על המפה לאישור ----
    const hasMapPinField = config.fields.some(f => f.type === 'map_pin');
    let geocodeTimer: ReturnType<typeof setTimeout> | null = null;
    $effect(() => {
        const addr = (formValues['address'] ?? '').trim();
        const c = city;
        void pinSource;
        if (!browser || !hasMapPinField) return;
        // פין ידני של המשתמש לא נדרס; מחכים לכתובת עם מספר בית (אחרת זה ניחוש גס)
        if (pinSource === 'manual' || !addr || !/\d/.test(addr)) return;
        if (geocodeTimer) clearTimeout(geocodeTimer);
        geocodeTimer = setTimeout(async () => {
            try {
                const res = await fetch(`/api/geocode?q=${encodeURIComponent(addr)}&city=${encodeURIComponent(c)}`);
                const data = await res.json();
                // בזמן ההמתנה המשתמש אולי סימן פין בעצמו - הידני גובר
                if (pinSource === 'manual') return;
                if (data?.lat != null && data?.lng != null) {
                    pinLat = data.lat;
                    pinLng = data.lng;
                    pinSource = 'geo';
                    showMap = true;
                }
            } catch { /* אין תצוגה מקדימה - השרת עדיין יאתר בשמירה */ }
        }, 900);
        return () => { if (geocodeTimer) clearTimeout(geocodeTimer); };
    });

    // ---- ערכי ברירת מחדל לשדות מפרופיל המשתמש ----
    // במצב עריכה (?edit=<id>) - מועדף ערך מהפריט הקיים על פני userProfile.
    function profileDefault(key: string, type: string, options?: string[], defaultVal?: string): string {
        // Edit mode: ערכים מהפריט הקיים גוברים על הכל
        if (editItem) {
            const ef = editItem.extra_fields ?? {};
            // קודם בשדה הספציפי של ה-item ואחר כך ב-extra_fields
            const direct = (() => {
                switch (key) {
                    case 'label':       return editItem.label;
                    case 'description': return editItem.description;
                    case 'phone':       return editItem.phone;
                    case 'contact':     return editItem.contact;
                    case 'address':     return editItem.address;
                    default:            return undefined;
                }
            })();
            if (direct !== undefined && direct !== '') return String(direct);
            const fromExtra = ef[key];
            if (fromExtra != null && fromExtra !== '') return String(fromExtra);
            // נשאר לא ממולא - נופלים ל-default רגיל
        }

        if (type === 'toggle' && options) return defaultVal && options.includes(defaultVal) ? defaultVal : options[0];
        if (type === 'opening_hours') return serializeOpeningHours(emptyOpeningHours());
        if (key === 'contact'  && autofillName && userProfile?.nickname) return userProfile.nickname;
        if (key === 'nickname' && autofillName && userProfile?.nickname) return userProfile.nickname;
        if (key === 'phone'    && userProfile?.phone)    return userProfile.phone;
        if (key === 'address' && type === 'neighborhood_select') {
            return userProfile?.neighborhood || (userProfile?.city ? 'מרכז' : DEFAULT_NEIGHBORHOOD);
        }
        if (key === 'address') {
            const parts = [userProfile?.neighborhood, userProfile?.city].filter(Boolean);
            if (parts.length) return parts.join(', ');
        }
        // מצב משפחתי - נלקח מהפרופיל (single_m/single_f → רווק/ה)
        if (key === 'marital_status' && userProfile?.family_status) {
            const fs = userProfile.family_status;
            if (fs === 'single_m' || fs === 'single_f') return 'רווק/ה';
        }
        // מין - אם בפרופיל נשמר ידע על מגדר, מקדים כברירת מחדל
        if (key === 'gender' && userProfile?.family_status) {
            if (userProfile.family_status === 'single_m') return 'גבר';
            if (userProfile.family_status === 'single_f') return 'אישה';
        }
        if (defaultVal) return defaultVal;
        return '';
    }

    // ---- Form state - מתמלא מיד מהפרופיל ללא המתנה ל-onMount ----
    let formValues = $state<Record<string, string>>(
        Object.fromEntries(config.fields.map(f => [f.key, profileDefault(f.key, f.type, f.options, f.default)]))
    );

    // ---- תמחור מסעדות - מסעדה 45 ₪, מזון מהיר 30 ₪ (תלוי בבחירת המשתמש) ----
    const RESTAURANT_PRICING: Record<string, { row: number; price: number }> = {
        'מסעדה':     { row: 7,  price: 45 },
        'מזון מהיר': { row: 10, price: 30 },
    };
    let restaurantPlan = $derived(
        categoryId === 'restaurants'
            ? (RESTAURANT_PRICING[formValues.venue_type] ?? RESTAURANT_PRICING['מסעדה'])
            : null
    );
    let effectivePriceRow = $derived(restaurantPlan ? restaurantPlan.row : config.priceRow);
    let monthlyPrice      = $derived(restaurantPlan ? restaurantPlan.price : 15);

    let submitting      = $state(false);
    let errorMsg        = $state('');
    // כשל בצד השרת (להבדיל משגיאת ולידציה) - מציגים גם קישור לתמיכה
    let serverFailed    = $state(false);
    let submitted       = $state(false);
    let redirectingMsg  = $state(''); // הודעה לפני מעבר להרשמה
    let openHintKey     = $state(''); // איזה hint פתוח כרגע (לחיצה ארוכה / hover במובייל)
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;

    const MAX_IMAGES = 5;

    function compressImage(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const MAX = 1000;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const src = ev.target?.result as string;
                const img = new Image();
                img.onload = () => {
                    let w = img.naturalWidth;
                    let h = img.naturalHeight;
                    if (w > MAX || h > MAX) {
                        const ratio = Math.min(MAX / w, MAX / h);
                        w = Math.round(w * ratio);
                        h = Math.round(h * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width  = w;
                    canvas.height = h;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', 0.82));
                };
                img.onerror = reject;
                img.src = src;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ---- לוגו למפה: העלאה/גרירה/הסרה ----
    async function handleLogoChange(e: Event) {
        const input = e.currentTarget as HTMLInputElement;
        const file = input.files?.[0];
        input.value = '';
        if (!file || !file.type.startsWith('image/')) return;
        logoUploading = true;
        try { logoImage = await compressImage(file); } catch { /* קובץ לא נתמך */ } finally { logoUploading = false; }
    }
    function handleLogoDrop(files: File[]) {
        const file = files.find(f => f.type.startsWith('image/'));
        if (!file) return;
        logoUploading = true;
        compressImage(file).then(d => { logoImage = d; }).catch(() => {}).finally(() => { logoUploading = false; });
    }
    function removeLogo() { logoImage = ''; }

    function getImages(key: string): string[] {
        try { return JSON.parse(getFieldValue(key) || '[]'); } catch { return []; }
    }
    function setImages(key: string, arr: string[]) {
        setFieldValue(key, JSON.stringify(arr));
    }
    async function addFilesToField(key: string, files: File[]) {
        const onlyImages = files.filter((f) => f.type.startsWith('image/'));
        if (!onlyImages.length) return;
        const current = getImages(key);
        const slots = MAX_IMAGES - current.length;
        if (slots <= 0) return;
        const compressed = await Promise.all(onlyImages.slice(0, slots).map(compressImage));
        setImages(key, [...current, ...compressed]);
    }
    async function handleImagesChange(key: string, e: Event) {
        const input = e.target as HTMLInputElement;
        await addFilesToField(key, Array.from(input.files ?? []));
        input.value = '';
    }
    let draggingKey = $state<string | null>(null);
    function onDragOver(key: string, e: DragEvent) {
        e.preventDefault();
        draggingKey = key;
    }
    function onDragLeave(_key: string, e: DragEvent) {
        // נשמור על המסגרת אם הגרירה עברה לאלמנט פנימי
        if (e.currentTarget instanceof Element && e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
        draggingKey = null;
    }
    async function onDrop(key: string, e: DragEvent) {
        e.preventDefault();
        draggingKey = null;
        const files = Array.from(e.dataTransfer?.files ?? []);
        await addFilesToField(key, files);
    }
    function removeImageAt(key: string, idx: number) {
        setImages(key, getImages(key).filter((_, i) => i !== idx));
    }
    function setMainImage(key: string, idx: number) {
        const arr = getImages(key);
        if (idx <= 0 || idx >= arr.length) return;
        const [picked] = arr.splice(idx, 1);
        arr.unshift(picked);
        setImages(key, arr);
    }

    // ---- שעות פתיחה (opening_hours) ----
    function getOpeningHours(key: string): OpeningHours {
        return parseOpeningHours(getFieldValue(key)) ?? emptyOpeningHours();
    }
    function setOpeningHours(key: string, oh: OpeningHours) {
        setFieldValue(key, serializeOpeningHours(oh));
    }
    function toggleDayOpen(key: string, idx: number) {
        const oh = getOpeningHours(key);
        oh.days[idx].open = !oh.days[idx].open;
        setOpeningHours(key, oh);
    }
    function setUniform(key: string, uniform: boolean) {
        const oh = getOpeningHours(key);
        oh.uniform = uniform;
        // מעבר למצב "שעות זהות" - מחיל את שעות היום הפתוח הראשון על כל הימים
        if (uniform) {
            const first = oh.days.find((d) => d.open) ?? oh.days[0];
            for (const d of oh.days) d.ranges = first.ranges.map((r) => ({ ...r }));
        }
        setOpeningHours(key, oh);
    }
    function setUniformTime(key: string, rIdx: number, which: 'from' | 'to', val: string) {
        const oh = getOpeningHours(key);
        for (const d of oh.days) { if (d.ranges[rIdx]) d.ranges[rIdx][which] = val; }
        setOpeningHours(key, oh);
    }
    function addUniformRange(key: string) {
        const oh = getOpeningHours(key);
        const rep = oh.days.find((d) => d.open) ?? oh.days[0];
        const next = nextRangeAfter(rep.ranges[rep.ranges.length - 1]);
        for (const d of oh.days) d.ranges.push({ ...next });
        setOpeningHours(key, oh);
    }
    function removeUniformRange(key: string, rIdx: number) {
        const oh = getOpeningHours(key);
        for (const d of oh.days) { if (d.ranges.length > 1) d.ranges.splice(rIdx, 1); }
        setOpeningHours(key, oh);
    }
    function setDayTime(key: string, idx: number, rIdx: number, which: 'from' | 'to', val: string) {
        const oh = getOpeningHours(key);
        const r = oh.days[idx].ranges[rIdx];
        if (r) r[which] = val;
        setOpeningHours(key, oh);
    }
    function addDayRange(key: string, idx: number) {
        const oh = getOpeningHours(key);
        const ranges = oh.days[idx].ranges;
        ranges.push(nextRangeAfter(ranges[ranges.length - 1]));
        setOpeningHours(key, oh);
    }
    function removeDayRange(key: string, idx: number, rIdx: number) {
        const oh = getOpeningHours(key);
        if (oh.days[idx].ranges.length > 1) oh.days[idx].ranges.splice(rIdx, 1);
        setOpeningHours(key, oh);
    }
    // מעתיק את שעות היום הנבחר לכל שאר הימים הפתוחים - מילוי יום אחד מספיק
    function applyDayToAll(key: string, idx: number) {
        const oh = getOpeningHours(key);
        const src = oh.days[idx];
        for (const d of oh.days) {
            if (d === src || !d.open) continue;
            d.ranges = src.ranges.map((r) => ({ ...r }));
        }
        setOpeningHours(key, oh);
    }

    function startLongPress(key: string) {
        if (longPressTimer) clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => { openHintKey = key; }, 400);
    }
    function cancelLongPress() {
        if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    }

    onMount(() => {
        if (!browser) return;

        // מלא פרטי פרופיל (גיבוי למקרה שה-SSR לא אותחל נכון)
        if (userProfile) {
            if (autofillName && userProfile.nickname && !getFieldValue('contact'))  setFieldValue('contact',  userProfile.nickname);
            if (autofillName && userProfile.nickname && !getFieldValue('nickname')) setFieldValue('nickname', userProfile.nickname);
            if (userProfile.phone       && !getFieldValue('phone'))    setFieldValue('phone',    userProfile.phone);
            if (userProfile.neighborhood && !getFieldValue('address')) {
                const parts = [userProfile.neighborhood, userProfile.city].filter(Boolean);
                setFieldValue('address', parts.join(', '));
            }
        }

        // מלא שדות אישיים שכבר מולאו פעם בטופס אחר (זיכרון חוצה-טפסים בעוגייה),
        // רק אם השדה עדיין ריק - כך לא דורסים ערכי עריכה/פרופיל קיימים.
        try {
            const mem = getFormMemory();
            for (const [k, v] of Object.entries(mem)) {
                // שם איש קשר לא ממולא אוטומטית אלא בקטגוריות המותרות
                if ((k === 'contact' || k === 'nickname') && !autofillName) continue;
                if (v && k in formValues && !getFieldValue(k)) setFieldValue(k, v);
            }
        } catch {}

        // שחזר שכונה מ-localStorage (גובר על פרופיל)
        try {
            const saved = localStorage.getItem(LS_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.neighborhood) neighborhood = parsed.neighborhood;
                if (parsed.city)         city         = parsed.city;
                // מלא שדה address מהשכונה הנבחרה אם עדיין ריק
                if (!getFieldValue('address')) {
                    const parts = [parsed.neighborhood, parsed.city].filter(Boolean);
                    if (parts.length) setFieldValue('address', parts.join(', '));
                }
            }
        } catch {}

        // שחזר טיוטא אם קיימת (גובר על הכל). הטיוטא משמרת את עצמה עד שליחה מוצלחת,
        // כך שרענון/קריסה/באג בפרסום לא מאבדים שום דבר שהוקלד.
        // במצב עריכה מדלגים - הערכים מגיעים מהפריט הקיים ואסור שטיוטת הוספה ישנה תדרוס אותם.
        if (!isEditMode) try {
            const draft = localStorage.getItem(DRAFT_KEY);
            if (draft) {
                const parsed = JSON.parse(draft);
                if (parsed.formValues)   formValues   = { ...formValues, ...parsed.formValues };
                if (parsed.neighborhood) neighborhood = parsed.neighborhood;
                if (parsed.city)         city         = parsed.city;
                if (parsed.pinLat != null && parsed.pinLng != null) {
                    pinLat = parsed.pinLat;
                    pinLng = parsed.pinLng;
                    // פין משוחזר מטיוטא נחשב ידני - שה-geocoding לא יזיז אותו
                    pinSource = 'manual';
                    showMap = true;
                }
            }
        } catch {}
    });

    // ---- שמירה אוטומטית של טיוטא בכל שינוי (נשמר גם אם המשתמש לא שילם) ----
    $effect(() => {
        if (!browser) return;
        void formValues;
        void neighborhood;
        void city;
        void pinLat;
        void pinLng;
        if (!isEditMode) {
            try {
                localStorage.setItem(DRAFT_KEY, JSON.stringify({ formValues, neighborhood, city, pinLat, pinLng }));
            } catch {}
        }
        // שמור את השדות האישיים גם בעוגייה חוצת-טפסים (שם/טלפון/איש קשר/קישורים)
        rememberFields(formValues);
    });

    function getFieldValue(key: string): string {
        return formValues[key] ?? '';
    }
    function setFieldValue(key: string, value: string) {
        formValues = { ...formValues, [key]: value };
    }

    // ---- כשמשתמש בוחר 'מחפש להתארח' - ברירת המחדל של 'משך הפרסום' היא 'לשבת הקרובה בלבד' ----
    let prevOfferType = $state(formValues.offer_type ?? '');
    $effect(() => {
        const ot = formValues.offer_type;
        if (ot !== prevOfferType) {
            prevOfferType = ot;
            if (categoryId === 'realestate' && formValues.posting_type !== undefined) {
                setFieldValue('posting_type', ot === 'מחפש להתארח' ? 'לשבת הקרובה בלבד' : 'קבוע');
            }
        }
    });

    // ---- Visibility (showIf) ----
    function isFieldVisible(field: typeof config.fields[number]): boolean {
        // מפה מוצגת רק כשהכתובת לא נפתרה (רחוב מהרשימה + מספר). אחרת - רק הרשימה הנפתחת.
        if (field.type === 'map_pin' && addressResolved) return false;
        if (!field.showIf) return true;
        return formValues[field.showIf.field] === field.showIf.equals;
    }

    // ---- Validation ----
    function validate(): string | null {
        // בקטגוריות mapFirst בודקים רק את שדות שלב-המפה (השאר נערך בדף הפריט)
        for (const field of activeFields) {
            if (!isFieldVisible(field)) continue;
            if (!field.required) continue;
            if (field.type === 'images') {
                let count = 0;
                try { count = JSON.parse(formValues[field.key] || '[]').length; } catch { count = 0; }
                if (count === 0) return `השדה "${field.label}" הוא חובה`;
            } else if (!formValues[field.key]?.trim()) {
                return `השדה "${field.label}" הוא חובה`;
            }
        }
        // חובה מיקום שאפשר להציב על המפה - אחת משתי הדרכים:
        //   1. כתובת מלאה (בשדות בורר-רחוב: רחוב + מספר בית)
        //   2. נקודה מסומנת על המפה
        // בלי אחת מהן הפריט לא ימוקם נכון - חוסמים ומדריכים מה להשלים.
        const addressField = config.fields.find(f => f.key === 'address' && f.type !== 'neighborhood_select');
        const hasPinField  = config.fields.some(f => f.type === 'map_pin');
        if (addressField || hasPinField) {
            const addr      = (formValues['address'] ?? '').trim();
            const pinPlaced = pinLat != null && pinLng != null;
            if (!pinPlaced) {
                if (!addr) {
                    if (hasPinField) showMap = true; // פותחים את המפה - שהאפשרות השנייה תהיה מול העיניים
                    return '📍 חסר מיקום לפריט: הזינו כתובת מלאה (רחוב + מספר בית), או סמנו את הנקודה על המפה - אחת מהשתיים מספיקה';
                }
                // כתובת מבורר הרחובות בלי מספר בית = חצי כתובת - לא מספיק מדויק למפה
                if (addressField?.type === 'address' && !/\d/.test(addr)) {
                    if (hasPinField) showMap = true;
                    return '📍 הכתובת חסרה מספר בית: השלימו את המספר ליד שם הרחוב, או סמנו את הנקודה המדויקת על המפה';
                }
            }
        }
        if (!neighborhood) return 'נא לבחור שכונה';
        return null;
    }

    // ---- שמירת טיוטא ל-localStorage ----
    function saveDraft() {
        if (!browser) return;
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ formValues, neighborhood, city, pinLat, pinLng }));
    }

    // ---- Submit ----
    async function handleSubmit(e: Event) {
        e.preventDefault();
        errorMsg = '';
        serverFailed = false;
        const err = validate();
        if (err) { errorMsg = err; return; }

        // אם לא מחובר - שמור טיוטא והפנה להרשמה
        if (!userId) {
            saveDraft();
            redirectingMsg = 'הטיוטה שלך נשמרה ✓\nאתה מועבר להרשמה - הפרסום יושלם מיד לאחריה.';
            setTimeout(() => {
                goto(`/login?redirect=/add/${categoryId}`);
            }, 2200);
            return;
        }

        submitting = true;

        const topLevelKeys = ['label', 'description', 'contact', 'phone', 'address'];
        const topLevel: Record<string, string> = {};
        const extra: Record<string, unknown> = {};
        const imageKeys = new Set(config.fields.filter(f => f.type === 'images').map(f => f.key));
        // שדות map_pin אינם ערך טקסט - הם נשמרים כ-lat/lng ברמה העליונה, לא ב-extra_fields
        const mapPinKeys = new Set(config.fields.filter(f => f.type === 'map_pin').map(f => f.key));

        for (const [k, v] of Object.entries(formValues)) {
            // mapFirst: שולחים רק שדות שלב-המפה. שאר הפרטים נשמרים בדף הפריט,
            // וחשוב לא לשלוח אותם כאן כדי לא לדרוס ערכים שנערכו שם (מיזוג בשרת).
            if (config.mapFirst && !activeKeys.has(k)) continue;
            if (mapPinKeys.has(k)) {
                continue;
            } else if (topLevelKeys.includes(k)) {
                topLevel[k] = v;
            } else if (imageKeys.has(k)) {
                try { extra[k] = JSON.parse(v || '[]'); } catch { extra[k] = []; }
            } else {
                extra[k] = v;
            }
        }

        // לוגו/תמונה שתופיע על המפה (mapFirst) - נשמר ב-extra_fields.map_image
        if (config.mapFirst) {
            extra.map_image = logoImage;
        }

        if (!topLevel.label) {
            const labelField = config.fields.find(f => f.key === 'label');
            const fallback = extra[labelField?.key ?? ''];
            topLevel.label = (typeof fallback === 'string' ? fallback : '') || config.label;
        }

        // אירוח לשבת: כותרת הכרטיס מורכבת משם המשפחה (רק למארח)
        const familyName = typeof extra.family_name === 'string' ? extra.family_name.trim() : '';
        if (categoryId === 'realestate' && extra.offer_type === 'מציע לארח' && familyName) {
            topLevel.label = `משפחת ${familyName}`;
        }

        // פנויים/פנויות: כותרת אוטומטית "גיל, עיר" (בלי 'פנוי'/'פנויה')
        if (categoryId === 'singles') {
            const ageRaw = typeof extra.age === 'string' ? extra.age.trim() : '';
            const parts = [ageRaw, city].filter(Boolean);
            topLevel.label = parts.join(', ');
        }

        try {
            const res = await fetch('/api/items', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    category:     categoryId,
                    neighborhood,
                    city,
                    // עריכה מעדכנת את הפריט הקיים - בלי edit_id נוצרת כפילות
                    ...(isEditMode && editItem?.id ? { edit_id: editItem.id } : {}),
                    ...(pinLat != null && pinLng != null ? { lat: pinLat, lng: pinLng } : {}),
                    ...topLevel,
                    extra_fields: extra,
                }),
            });

            const result = await res.json();
            if (!result.success) {
                errorMsg = result.message ?? 'שגיאה בשמירה';
                serverFailed = res.status >= 500;
                submitting = false;
                return;
            }

            submitted = true;

            // הפרסום הצליח - הטיוטא סיימה את תפקידה. בלי זה נתונים ישנים
            // צצים שוב בפעם הבאה שפותחים את הטופס באותה קטגוריה.
            if (browser && !isEditMode) {
                try { localStorage.removeItem(DRAFT_KEY); } catch {}
            }

            if (isPaidFlow) {
                if (browser) {
                    localStorage.setItem('pending_ad', JSON.stringify({
                        priceRow:      effectivePriceRow,
                        categoryLabel: config.label,
                        itemLabel:     topLevel.label,
                        itemId:        result.id,
                    }));
                }
                setTimeout(() => goto('/about/advertise'), 1500);
            } else if (result.id) {
                // זרימה דו-שלבית: הפרטים הראשוניים נשמרו ועלו למפה - עוברים לדף
                // הפריט המלא במצב בנייה, שם משלימים תמונות/שעות/קישורים מול העיניים
                setTimeout(() => goto(`/items/${result.id}${isEditMode ? '' : '?builder=1&new=1'}`), 1600);
            } else {
                setTimeout(() => goto('/'), 2500);
            }

        } catch {
            errorMsg = 'בעיית תקשורת - נסה שוב';
            serverFailed = true;
            submitting = false;
        }
    }

    const colorClasses: Record<string, { border: string; bg: string; text: string; btn: string }> = {
        purple: { border: 'border-purple-500/40', bg: 'bg-purple-900/10', text: 'text-purple-400', btn: 'bg-purple-600 hover:bg-purple-500' },
        orange: { border: 'border-orange-500/40', bg: 'bg-orange-900/10', text: 'text-orange-400', btn: 'bg-orange-600 hover:bg-orange-500' },
        pink:   { border: 'border-pink-500/40',   bg: 'bg-pink-900/10',   text: 'text-pink-400',   btn: 'bg-pink-600 hover:bg-pink-500'   },
        blue:   { border: 'border-blue-500/40',   bg: 'bg-blue-900/10',   text: 'text-blue-400',   btn: 'bg-blue-600 hover:bg-blue-500'   },
        red:    { border: 'border-red-500/40',    bg: 'bg-red-900/10',    text: 'text-red-400',    btn: 'bg-red-600 hover:bg-red-500'     },
        yellow: { border: 'border-yellow-500/40', bg: 'bg-yellow-900/10', text: 'text-yellow-400', btn: 'bg-yellow-600 hover:bg-yellow-500'},
        green:  { border: 'border-green-500/40',  bg: 'bg-green-900/10',  text: 'text-green-400',  btn: 'bg-green-600 hover:bg-green-500' },
        indigo: { border: 'border-indigo-500/40', bg: 'bg-indigo-900/10', text: 'text-indigo-400', btn: 'bg-indigo-600 hover:bg-indigo-500'},
    };
    const colors = colorClasses[config.color] ?? colorClasses['purple'];

    const inputClass = `w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 md:px-4 md:py-3
        text-white placeholder:text-gray-600 text-sm
        focus:outline-none focus:border-amber-500/60 focus:bg-amber-900/10
        transition-all`;
</script>

<svelte:head>
    <title>{pageTitle} | קהילה בשכונה</title>
</svelte:head>

<div class="max-w-2xl mx-auto px-4 py-4 md:py-6" dir="rtl">

    <!-- Header -->
    <div class="text-center mb-3 md:mb-4">
        {#if categoryId !== 'restaurants'}
            <div class="-mb-2">{@html iconHtml('lg')}</div>
        {/if}
        <div class="relative flex items-center justify-center">
            <h1 class="text-2xl md:text-3xl font-black text-white mb-2">
                {pageTitle}
            </h1>
            <button
                type="button"
                onclick={() => history.back()}
                class="absolute right-0 top-0 text-gray-400 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
            >
                ← חזרה
            </button>
        </div>
        {#if config.mapFirst}
            <p class="text-gray-400 text-sm max-w-md mx-auto">
                כאן ממקמים את היתרון על המפה. שאר הפרטים - שעות, מחיר, תיאור, טלפון ותמונות - מוסיפים בקלות בדף היתרון עצמו מיד לאחר מכן.
            </p>
        {/if}
    </div>

    {#if redirectingMsg}
        <!-- הודעת מעבר להרשמה -->
        <div class="rounded-2xl border-2 border-blue-500/40 bg-blue-900/20 p-8 text-center"
             style="animation: fadeIn 0.4s ease-out;">
            <div class="text-4xl mb-4">💾</div>
            {#each redirectingMsg.split('\n') as line}
                <p class="text-blue-200 font-bold text-base mb-2">{line}</p>
            {/each}
            <div class="mt-4 flex justify-center">
                <span class="inline-block w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full"
                      style="animation: spin 0.7s linear infinite;"></span>
            </div>
        </div>

    {:else if submitted}
        <!-- Success -->
        <div class="rounded-2xl border-2 border-green-500/40 bg-green-900/20 p-8 text-center"
             style="animation: fadeIn 0.4s ease-out;">
            <div class="text-4xl mb-3">✅</div>
            <h2 class="text-xl font-black text-green-300 mb-2">המודעה שלך נשמרה</h2>
            {#if isPaidFlow}
                {#if FREE_PROMO}
                    <p class="text-green-300 text-base font-black mb-1">🎉 בתקופה הראשונית הפרסום חינם - עם הקוד "{FREE_PROMO_CODE_TEXT}" בדף הבא</p>
                {:else}
                    <p class="text-amber-200 text-base font-bold mb-1">שלם {monthlyPrice} ש"ח בחודש על מנת להופיע</p>
                {/if}
                <p class="text-gray-400 text-sm">מועבר לדף התשלום...</p>
            {:else if isEditMode}
                <p class="text-gray-400 text-sm">העדכון נשמר. עוברים לדף הפריט...</p>
            {:else}
                <p class="text-green-200 text-base font-bold mb-1">🎉 הפריט עלה למפה!</p>
                <p class="text-gray-400 text-sm">עוברים לדף המלא של הפריט - שם תוכלו להוסיף תמונות, שעות וקישורים בדיוק כפי שהגולשים יראו אותם.</p>
            {/if}
        </div>

    {:else}
        <!-- Form -->
        <form
            onsubmit={handleSubmit}
            class="rounded-2xl border {colors.border} {colors.bg} p-4 md:p-8 grid grid-cols-2 gap-x-3 gap-y-3.5 md:gap-5"
        >
            <!-- מיקום הפרסום - העיר והשכונה שבהן הפריט יופיע בלוחות ועל המפה -->
            <div class="col-span-2 rounded-xl border border-white/15 bg-white/5 p-3 md:p-4">
                <p class="text-[13px] md:text-sm font-bold text-gray-300 mb-2">
                    📍 איפה זה נמצא? <span class="text-red-400">*</span>
                </p>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="pub-city" class="block text-xs text-gray-400 mb-1">עיר / יישוב</label>
                        <select id="pub-city" bind:value={city} onchange={onCityChange} class="{inputClass} cursor-pointer">
                            {#each cityOptions as cty}
                                <option value={cty} style="background:#fff;color:#0f172a;">{cty}</option>
                            {/each}
                        </select>
                    </div>
                    <div>
                        <label for="pub-neighborhood" class="block text-xs text-gray-400 mb-1">שכונה</label>
                        <select id="pub-neighborhood" bind:value={neighborhood} class="{inputClass} cursor-pointer">
                            {#each cityNeighborhoods as nb}
                                <option value={nb} style="background:#fff;color:#0f172a;">{nb}</option>
                            {/each}
                        </select>
                    </div>
                </div>
                <p class="text-gray-400 text-xs mt-1.5">מולא אוטומטית לפי הפרופיל שלך - שנו אם הפרסום נמצא במקום אחר</p>
                <p class="text-gray-500 text-xs mt-1">
                    היישוב או השכונה חסרים ברשימה?
                    <a href="/profile" class="text-amber-300/90 hover:text-amber-200 underline underline-offset-2 transition-colors">אפשר להוסיף אותם דרך הפרופיל</a>
                    - ולאחר אישור הם יופיעו כאן לכולם
                </p>
            </div>

            {#each activeFields as field}
                {#if isFieldVisible(field)}
                <div class="{field.half ? 'col-span-1' : 'col-span-2'}">
                    <label
                        for="field-{field.key}"
                        class="block text-[13px] md:text-sm font-bold text-gray-300 mb-1 md:mb-1.5"
                    >
                        {field.label}
                        {#if field.required}
                            <span class="text-red-400">*</span>
                        {/if}
                    </label>

                    {#if field.type === 'toggle' && field.options}
                        <div class="relative mx-auto w-full max-w-[280px]">
                            <div class="flex p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm gap-1">
                                {#each field.options as opt}
                                    {@const hintTarget = field.hint && opt === (field.default ?? field.options[0])}
                                    <button
                                        type="button"
                                        onclick={() => setFieldValue(field.key, opt)}
                                        onmouseenter={hintTarget ? () => openHintKey = field.key : undefined}
                                        onmouseleave={hintTarget ? () => openHintKey = '' : undefined}
                                        onpointerdown={hintTarget ? () => startLongPress(field.key) : undefined}
                                        onpointerup={hintTarget ? cancelLongPress : undefined}
                                        onpointercancel={hintTarget ? cancelLongPress : undefined}
                                        class="flex-1 px-3 py-2 text-xs font-semibold rounded-full transition-all duration-200 {getFieldValue(field.key) === opt
                                            ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 scale-[1.02]'
                                            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
                                    >
                                        {opt}
                                    </button>
                                {/each}
                            </div>
                            {#if field.hint && openHintKey === field.key}
                                <span
                                    role="tooltip"
                                    class="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-1.5 w-64 max-w-[90vw] p-2.5 rounded-lg bg-slate-900 border border-white/15 shadow-xl text-gray-200 text-xs font-normal leading-relaxed text-center whitespace-normal"
                                >{field.hint}</span>
                            {/if}
                        </div>

                    {:else if field.type === 'textarea'}
                        <textarea
                            id="field-{field.key}"
                            value={getFieldValue(field.key)}
                            oninput={(e) => setFieldValue(field.key, (e.target as HTMLTextAreaElement).value)}
                            placeholder={field.placeholder ?? ''}
                            rows={field.maxLength ? 1 : 3}
                            maxlength={field.maxLength ?? undefined}
                            class="{inputClass} resize-none"
                            required={field.required}
                        ></textarea>
                        {#if field.maxLength}
                            <p class="text-xs text-slate-400 mt-1 text-left" dir="ltr">{(getFieldValue(field.key) || '').length}/{field.maxLength}</p>
                        {/if}

                    {:else if field.type === 'multi_select' && field.options}
                        {@const selected = (getFieldValue(field.key) || '').split(',').filter(Boolean)}
                        <div class="flex flex-wrap gap-1.5 md:gap-2">
                            {#each field.options as opt}
                                {@const isOn = selected.includes(opt)}
                                <button
                                    type="button"
                                    onclick={() => {
                                        const current = (getFieldValue(field.key) || '').split(',').filter(Boolean);
                                        const idx = current.indexOf(opt);
                                        if (idx >= 0) current.splice(idx, 1);
                                        else current.push(opt);
                                        setFieldValue(field.key, current.join(','));
                                    }}
                                    class="px-2.5 py-1.5 md:px-4 md:py-2 rounded-full border md:border-2 text-xs md:text-sm font-bold transition-all {isOn
                                        ? `${colors.btn} text-white border-transparent shadow-md`
                                        : 'bg-white/5 border-white/15 text-gray-300 hover:bg-white/10 hover:border-white/30'}"
                                >
                                    {isOn ? '✓ ' : ''}{opt}
                                </button>
                            {/each}
                        </div>

                    {:else if field.type === 'availability_grid'}
                        {@const grid = (getFieldValue(field.key) || '').split(',').filter(Boolean)}
                        <div class="rounded-xl border border-white/15 bg-white/5 p-3 md:p-4">
                            <div class="grid gap-1.5" style="grid-template-columns: minmax(48px, auto) repeat(7, minmax(0, 1fr));">
                                <div class="text-xs md:text-sm font-bold text-pink-300 text-right pl-1 self-center">ימים</div>
                                {#each ['א','ב','ג','ד','ה','ו','ש'] as d}
                                    <div class="text-center font-bold text-pink-300 text-xs md:text-sm py-1">{d}</div>
                                {/each}
                                {#each ['בוקר','צהריים','ערב'] as slot, sIdx}
                                    <div class="text-gray-300 font-bold text-xs md:text-sm self-center text-right pl-1">{slot}</div>
                                    {#each ['א','ב','ג','ד','ה','ו','ש'] as _d, dIdx}
                                        {@const cellKey = `${dIdx}-${sIdx}`}
                                        {@const isOn = grid.includes(cellKey)}
                                        <button
                                            type="button"
                                            onclick={() => {
                                                const current = (getFieldValue(field.key) || '').split(',').filter(Boolean);
                                                const idx = current.indexOf(cellKey);
                                                if (idx >= 0) current.splice(idx, 1);
                                                else current.push(cellKey);
                                                setFieldValue(field.key, current.join(','));
                                            }}
                                            class="h-7 md:h-8 rounded-md border-2 transition-all flex items-center justify-center text-sm font-bold {isOn
                                                ? 'bg-pink-500/40 border-pink-400 text-white shadow-md shadow-pink-500/20'
                                                : 'bg-white/5 border-white/15 text-gray-600 hover:bg-white/10 hover:border-white/30'}"
                                            aria-label="{slot}"
                                        >
                                            {isOn ? '✓' : ''}
                                        </button>
                                    {/each}
                                {/each}
                            </div>
                            <p class="text-xs text-gray-400 mt-3 text-center">לחצו על המשבצות לסימון השעות שבהן אתם זמינים</p>
                        </div>

                    {:else if field.type === 'opening_hours'}
                        {@const oh = getOpeningHours(field.key)}
                        {@const anyOpen = oh.days.some((d) => d.open)}
                        {@const openDayCount = oh.days.filter((d) => d.open).length}
                        {@const rep = oh.days.find((d) => d.open) ?? oh.days[0]}
                        {@const timeInput = 'rounded-lg border border-white/15 bg-white/10 px-2.5 py-2 text-white text-sm text-center focus:outline-none focus:border-amber-500/60'}
                        <div class="rounded-xl border border-white/15 bg-white/5 p-3 md:p-4 space-y-3">
                            <!-- בחירת ימים פתוחים -->
                            <p class="text-xs text-gray-400">אילו ימים פתוח? <span class="text-gray-500">לחצו על יום כדי לפתוח או לסגור אותו — גם ו׳ ומוצ״ש</span></p>
                            <div class="grid grid-cols-7 gap-1.5">
                                {#each DAY_SHORT as d, dIdx}
                                    {@const isOpen = oh.days[dIdx].open}
                                    <button
                                        type="button"
                                        onclick={() => toggleDayOpen(field.key, dIdx)}
                                        class="h-9 rounded-lg border-2 text-xs font-bold transition-all {isOpen
                                            ? `${colors.btn} text-white border-transparent shadow-md`
                                            : 'bg-white/5 border-dashed border-white/25 text-gray-400 hover:bg-white/10 hover:border-white/50 hover:text-white'}"
                                        aria-pressed={isOpen}
                                        title={isOpen ? `${d} פתוח - לחיצה תסגור` : `${d} סגור - לחיצה תפתח`}
                                    >{d}</button>
                                {/each}
                            </div>

                            {#if anyOpen}
                                <!-- מתג: שעות זהות לכל הימים / שעה לכל יום -->
                                <div class="flex p-1 rounded-full bg-white/5 border border-white/10 gap-1 mx-auto w-full max-w-[300px]">
                                    <button
                                        type="button"
                                        onclick={() => setUniform(field.key, true)}
                                        class="flex-1 px-3 py-1.5 text-xs font-bold rounded-full transition-all {oh.uniform ? `${colors.btn} text-white shadow` : 'text-gray-400 hover:text-white'}"
                                    >אותן שעות בכל הימים</button>
                                    <button
                                        type="button"
                                        onclick={() => setUniform(field.key, false)}
                                        class="flex-1 px-3 py-1.5 text-xs font-bold rounded-full transition-all {!oh.uniform ? `${colors.btn} text-white shadow` : 'text-gray-400 hover:text-white'}"
                                    >שעות שונות לפי יום</button>
                                </div>

                                {#if oh.uniform}
                                    <!-- טווחי שעות משותפים לכל הימים הפתוחים -->
                                    <div class="space-y-2">
                                        {#each rep.ranges as r, rIdx (rIdx)}
                                            <div class="flex items-center justify-center gap-2">
                                                <div class="flex items-center gap-2" dir="ltr">
                                                    <input
                                                        type="time"
                                                        value={r.from}
                                                        onchange={(e) => setUniformTime(field.key, rIdx, 'from', (e.target as HTMLInputElement).value)}
                                                        class={timeInput}
                                                        aria-label="שעת פתיחה - טווח {rIdx + 1}"
                                                    />
                                                    <span class="text-gray-400 font-bold">–</span>
                                                    <input
                                                        type="time"
                                                        value={r.to}
                                                        onchange={(e) => setUniformTime(field.key, rIdx, 'to', (e.target as HTMLInputElement).value)}
                                                        class={timeInput}
                                                        aria-label="שעת סגירה - טווח {rIdx + 1}"
                                                    />
                                                </div>
                                                {#if rep.ranges.length > 1}
                                                    <button
                                                        type="button"
                                                        onclick={() => removeUniformRange(field.key, rIdx)}
                                                        class="w-7 h-7 shrink-0 rounded-full border border-white/15 text-gray-500 text-sm leading-none transition-colors hover:text-red-300 hover:border-red-400/50 hover:bg-red-500/10"
                                                        aria-label="הסרת טווח {rIdx + 1}"
                                                        title="הסרת טווח שעות"
                                                    >✕</button>
                                                {/if}
                                            </div>
                                        {/each}
                                        <div class="flex justify-center">
                                            <button
                                                type="button"
                                                onclick={() => addUniformRange(field.key)}
                                                class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-dashed border-white/25 text-xs font-bold text-gray-300 transition-colors hover:text-white hover:border-white/50 hover:bg-white/5"
                                            ><span class="text-base leading-none">＋</span> הוספת טווח שעות</button>
                                        </div>
                                        <p class="text-[11px] text-gray-500 text-center leading-relaxed">
                                            סגורים בצהריים? לחצו על ＋ והוסיפו טווח נוסף — למשל 9:00–13:00 וגם 16:00–19:00
                                        </p>
                                    </div>
                                {:else}
                                    <!-- טווחי שעות נפרדים לכל יום פתוח -->
                                    <div class="divide-y divide-white/10">
                                        {#each DAY_SHORT as d, dIdx}
                                            {#if oh.days[dIdx].open}
                                                <div class="flex gap-2 py-2 md:justify-center md:gap-3">
                                                    <div class="w-12 shrink-0 flex flex-col items-start gap-0.5 pt-2">
                                                        <span class="text-sm font-bold text-gray-200">{d}</span>
                                                        {#if openDayCount > 1}
                                                            <button
                                                                type="button"
                                                                onclick={() => applyDayToAll(field.key, dIdx)}
                                                                class="text-[10px] font-bold text-gray-500 hover:text-amber-300 underline underline-offset-2 transition-colors whitespace-nowrap"
                                                                title="החלת השעות של יום {d} על כל הימים הפתוחים"
                                                            >⧉ לכולם</button>
                                                        {/if}
                                                    </div>
                                                    <div class="flex flex-col gap-1.5 flex-1 md:flex-none min-w-0">
                                                        {#each oh.days[dIdx].ranges as r, rIdx (rIdx)}
                                                            <div class="flex items-center gap-1.5">
                                                                <div class="flex items-center gap-1.5 flex-1 md:flex-none min-w-0" dir="ltr">
                                                                    <input
                                                                        type="time"
                                                                        value={r.from}
                                                                        onchange={(e) => setDayTime(field.key, dIdx, rIdx, 'from', (e.target as HTMLInputElement).value)}
                                                                        class="{timeInput} flex-1 md:flex-none md:w-28 min-w-0"
                                                                        aria-label="שעת פתיחה {d} - טווח {rIdx + 1}"
                                                                    />
                                                                    <span class="text-gray-400 font-bold shrink-0">–</span>
                                                                    <input
                                                                        type="time"
                                                                        value={r.to}
                                                                        onchange={(e) => setDayTime(field.key, dIdx, rIdx, 'to', (e.target as HTMLInputElement).value)}
                                                                        class="{timeInput} flex-1 md:flex-none md:w-28 min-w-0"
                                                                        aria-label="שעת סגירה {d} - טווח {rIdx + 1}"
                                                                    />
                                                                </div>
                                                                {#if rIdx === oh.days[dIdx].ranges.length - 1}
                                                                    <button
                                                                        type="button"
                                                                        onclick={() => addDayRange(field.key, dIdx)}
                                                                        class="w-7 h-7 shrink-0 rounded-full border border-dashed border-white/25 text-gray-300 text-base leading-none transition-colors hover:text-white hover:border-white/50 hover:bg-white/5"
                                                                        aria-label="הוספת טווח שעות ליום {d}"
                                                                        title="הוספת טווח שעות ליום זה"
                                                                    >＋</button>
                                                                {:else}
                                                                    <span class="w-7 shrink-0"></span>
                                                                {/if}
                                                                {#if oh.days[dIdx].ranges.length > 1}
                                                                    <button
                                                                        type="button"
                                                                        onclick={() => removeDayRange(field.key, dIdx, rIdx)}
                                                                        class="w-7 h-7 shrink-0 rounded-full border border-white/15 text-gray-500 text-sm leading-none transition-colors hover:text-red-300 hover:border-red-400/50 hover:bg-red-500/10"
                                                                        aria-label="הסרת טווח {rIdx + 1} ביום {d}"
                                                                        title="הסרת טווח שעות"
                                                                    >✕</button>
                                                                {:else}
                                                                    <span class="w-7 shrink-0"></span>
                                                                {/if}
                                                            </div>
                                                        {/each}
                                                    </div>
                                                </div>
                                            {/if}
                                        {/each}
                                    </div>
                                    <p class="text-[11px] text-gray-500 text-center leading-relaxed">
                                        מלאו את השעות של יום אחד ולחצו "⧉ לכולם" כדי להעתיק אותן לכל הימים בבת אחת ·
                                        לחיצה על ＋ ליד יום מוסיפה לו טווח שעות נוסף — למשל פתוח בבוקר וגם בערב
                                    </p>
                                {/if}
                            {:else}
                                <p class="text-xs text-gray-500 text-center py-1">לא נבחרו ימים — יוצג ללא שעות פתיחה</p>
                            {/if}
                        </div>

                    {:else if field.type === 'images'}
                        {@const imgs = getImages(field.key)}
                        <p class="text-amber-200/90 text-xs leading-relaxed text-center mb-3">
                            ⚠️ התמונות חייבות להיות <span class="underline">הולמות וצנועות</span> בלבד.{#if categoryId !== 'restaurants'} משתמש שינסה להפר את הכללים - <span class="text-red-300 font-bold">ייחסם לצמיתות</span>.{/if}
                        </p>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-gray-400 text-xs">{imgs.length}/{MAX_IMAGES}</span>
                            {#if imgs.length > 1}
                                <span class="text-amber-300 text-[11px] font-bold">⭐ הראשונה היא התמונה הראשית</span>
                            {/if}
                        </div>
                        {#if imgs.length > 0}
                            <div
                                ondragover={(e) => onDragOver(field.key, e)}
                                ondragleave={(e) => onDragLeave(field.key, e)}
                                ondrop={(e) => onDrop(field.key, e)}
                                class="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2 rounded-xl p-1 transition-all {draggingKey === field.key ? 'bg-amber-500/15 ring-2 ring-amber-400/60' : ''}"
                            >
                                {#each imgs as src, i (i)}
                                    <div class="relative aspect-square rounded-xl overflow-hidden border-2 {i === 0 ? 'border-amber-400 shadow-lg shadow-amber-500/30' : 'border-white/10'}">
                                        <img src={src} alt="" class="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onclick={() => removeImageAt(field.key, i)}
                                            class="absolute top-1 left-1 bg-black/70 hover:bg-red-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold transition-colors"
                                            aria-label="הסר תמונה"
                                        >×</button>
                                        {#if i === 0}
                                            <span class="absolute bottom-1 right-1 bg-amber-400 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">⭐ ראשית</span>
                                        {:else}
                                            <button
                                                type="button"
                                                onclick={() => setMainImage(field.key, i)}
                                                class="absolute bottom-1 right-1 bg-black/70 hover:bg-amber-500 text-white hover:text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors"
                                                aria-label="הפוך לתמונה ראשית"
                                            >סמן כראשית</button>
                                        {/if}
                                    </div>
                                {/each}
                                {#if imgs.length < MAX_IMAGES}
                                    <label class="flex flex-col items-center justify-center gap-1 aspect-square rounded-xl border-2 border-dashed border-white/15 hover:border-amber-500/50 bg-white/5 hover:bg-amber-900/10 cursor-pointer transition-all">
                                        <span class="text-2xl">＋</span>
                                        <span class="text-gray-500 text-[10px]">עוד</span>
                                        <input type="file" accept="image/*" multiple class="hidden" onchange={(e) => handleImagesChange(field.key, e)} />
                                    </label>
                                {/if}
                            </div>
                        {:else}
                            <label
                                ondragover={(e) => onDragOver(field.key, e)}
                                ondragleave={(e) => onDragLeave(field.key, e)}
                                ondrop={(e) => onDrop(field.key, e)}
                                class="flex flex-col items-center justify-center gap-2 w-full h-36 rounded-xl border-2 border-dashed cursor-pointer transition-all {draggingKey === field.key ? 'border-amber-400 bg-amber-500/15 scale-[1.01]' : 'border-white/15 hover:border-amber-500/50 bg-white/5 hover:bg-amber-900/10'}"
                            >
                                <span class="text-3xl">📷</span>
                                <span class="text-gray-200 text-sm font-bold">
                                    {draggingKey === field.key ? 'שחרר כאן להעלאה' : 'לחץ או גרור תמונות לכאן'}
                                </span>
                                <span class="text-gray-500 text-xs">JPG, PNG · עד {MAX_IMAGES}</span>
                                <input type="file" accept="image/*" multiple class="hidden" onchange={(e) => handleImagesChange(field.key, e)} />
                            </label>
                        {/if}

                    {:else if field.type === 'select' && field.options}
                        <select
                            id="field-{field.key}"
                            value={getFieldValue(field.key)}
                            onchange={(e) => setFieldValue(field.key, (e.target as HTMLSelectElement).value)}
                            class="{inputClass} cursor-pointer"
                            required={field.required}
                        >
                            <option value="">-- בחר --</option>
                            {#each field.options as opt}
                                <option value={opt}>{opt}</option>
                            {/each}
                        </select>

                    {:else if field.type === 'neighborhood_select'}
                        <select
                            id="field-{field.key}"
                            value={getFieldValue(field.key)}
                            onchange={(e) => setFieldValue(field.key, (e.target as HTMLSelectElement).value)}
                            class="{inputClass} cursor-pointer"
                            required={field.required}
                        >
                            {#each citiesWithApproved as [cty, neighbs]}
                                <optgroup label={cty}>
                                    {#each neighbs as nb}
                                        <option value={nb} style="background:#fff;color:#0f172a;">{nb}</option>
                                    {/each}
                                </optgroup>
                            {/each}
                        </select>

                    {:else if field.type === 'address'}
                        <StreetPicker
                            {city}
                            value={getFieldValue(field.key)}
                            placeholder={field.placeholder ?? 'שם הרחוב'}
                            onValueChange={(v) => setFieldValue(field.key, v)}
                            onResolvedChange={(v) => (addressResolved = v)}
                        />

                    {:else if field.type === 'map_pin'}
                        {#if !showMap}
                            <button
                                type="button"
                                onclick={() => (showMap = true)}
                                class="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 text-gray-200 text-sm font-bold py-3 transition-all"
                            >
                                📍 סמן מיקום על המפה
                            </button>
                        {:else}
                            <!-- המפה נפתחת ממוקדת על השכונה שנבחרה למעלה, ונעולה לסביבת העיר -->
                            <NeighborhoodPicker
                                {city}
                                {neighborhood}
                                restrictToCity
                                bind:lat={pinLat}
                                bind:lng={pinLng}
                                onUserPin={() => (pinSource = 'manual')}
                            />
                            {#if pinSource === 'geo'}
                                <p class="mt-1.5 text-xs text-cyan-300">
                                    🎯 המיקום זוהה אוטומטית מהכתובת - גררו את הסמן אם צריך לדייק
                                </p>
                            {/if}
                            <button
                                type="button"
                                onclick={() => { showMap = false; pinLat = null; pinLng = null; pinSource = null; }}
                                class="mt-2 text-xs text-gray-400 hover:text-gray-200 underline underline-offset-2 transition-colors"
                            >
                                הסתר מפה והסר סימון
                            </button>
                        {/if}

                    {:else}
                        <input
                            id="field-{field.key}"
                            type={field.type}
                            value={getFieldValue(field.key)}
                            oninput={(e) => setFieldValue(field.key, (e.target as HTMLInputElement).value)}
                            placeholder={field.placeholder ?? ''}
                            class="{inputClass}"
                            required={field.required}
                            dir={field.type === 'tel' || field.type === 'email' ? 'ltr' : 'rtl'}
                        />
                    {/if}

                    {#if field.hint && field.type !== 'toggle'}
                        <p class="text-gray-400 text-xs md:text-sm mt-0.5 md:mt-1">{field.hint}</p>
                    {/if}

                    {#if field.key === 'club_discount' && categoryId === 'restaurants'}
                        <a
                            href="/club-discounts"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-1.5 mt-2 text-pink-300 hover:text-pink-200 text-sm font-bold underline underline-offset-2 transition-colors"
                        >
                            🎟️ כיצד להצטרף למעדון המסעדות של יוצאים לחירות
                        </a>
                    {/if}
                </div>
                {/if}
            {/each}

            <!-- לוגו / תמונה שתופיע על המפה (mapFirst) -->
            {#if config.mapFirst}
                <div class="col-span-2 rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 md:p-4" style="grid-column: 1 / -1;">
                    <p class="text-[13px] md:text-sm font-bold text-purple-100 mb-1 flex items-center gap-1.5">
                        🗺️ לוגו או תמונה שתופיע על המפה
                    </p>
                    <p class="text-purple-300/80 text-xs mb-2.5">
                        במקום האייקון הרגיל, על המפה תופיע התמונה שתעלו כאן · תוספת בתשלום של {MAP_IMAGE_PRICE_YEARLY} ₪ לשנה. אפשר להוסיף או להחליף מאוחר יותר.
                    </p>
                    {#if logoImage}
                        <div class="flex items-center gap-3">
                            <div class="w-16 h-16 rounded-full overflow-hidden border-2 border-purple-400/60 bg-white shrink-0">
                                <img src={logoImage} alt="לוגו למפה" class="w-full h-full object-cover" />
                            </div>
                            <div class="flex flex-col gap-1.5">
                                <label class="text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 rounded-lg px-3 py-1.5 cursor-pointer transition-all text-center">
                                    {logoUploading ? 'מעלה...' : 'החלף תמונה'}
                                    <input type="file" accept="image/*" class="hidden" onchange={handleLogoChange} />
                                </label>
                                <button type="button" onclick={removeLogo}
                                    class="text-xs font-bold text-red-300 hover:text-red-200 px-3 py-1 transition-colors">הסר</button>
                            </div>
                        </div>
                    {:else}
                        <label use:imageDrop={handleLogoDrop}
                            class="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-purple-400/40 hover:border-purple-400/70 bg-purple-500/5 hover:bg-purple-500/10 rounded-xl px-4 py-5 cursor-pointer transition-all text-center">
                            <span class="text-3xl" aria-hidden="true">📷</span>
                            <span class="text-purple-200 font-bold text-sm">{logoUploading ? 'מעלה תמונה...' : 'לחצו או גררו לכאן תמונה'}</span>
                            <span class="text-purple-300/70 text-[11px]">לא חובה - אפשר להשאיר את האייקון הרגיל</span>
                            <input type="file" accept="image/*" class="hidden" onchange={handleLogoChange} />
                        </label>
                    {/if}
                </div>
            {/if}

            <!-- Error -->
            {#if errorMsg}
                <!-- grid-column מפורש - שהתיבה לעולם לא תיצטמצם לעמודה אחת צרה -->
                <div class="col-span-2 w-full rounded-xl border border-red-500/30 bg-red-900/20 px-4 py-3"
                     style="grid-column: 1 / -1;">
                    <p class="text-red-400 text-sm font-bold">{errorMsg}</p>
                    {#if serverFailed}
                        <a href="/profile?tab=feedback"
                           class="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-200 hover:text-white text-xs font-bold transition-colors">
                            💬 לפנייה לתמיכה - "כתוב למערכת" בדף הפרופיל
                        </a>
                    {/if}
                </div>
            {/if}

            <!-- Submit -->
            <div class="col-span-2 flex flex-col gap-2">
                <button
                    type="submit"
                    disabled={submitting}
                    class="w-full rounded-xl px-6 py-3 md:py-4 font-black text-base transition-all shadow-lg
                        {submitting
                            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                            : `${colors.btn} text-white hover:scale-[1.02] shadow-${config.color}-500/20`}"
                >
                    {#if submitting}
                        <span class="inline-block w-5 h-5 border-2 border-gray-500 border-t-white rounded-full mr-2"
                              style="animation: spin 0.7s linear infinite; vertical-align: middle;"></span>
                        שומר...
                    {:else}
                        {#if categoryId !== 'restaurants'}{@html iconHtml()} {/if}פרסם
                    {/if}
                </button>
                <p class="text-gray-300 text-sm text-center">
                    {#if isPaidFlow}
                        {#if FREE_PROMO}
                            <span class="text-green-300 font-black">🎉 בתקופה הראשונית - חינם עם הקוד "{FREE_PROMO_CODE_TEXT}" בשלב הבא</span>
                        {:else}
                            {monthlyPrice} ₪ בחודש · התשלום בשלב הבא
                        {/if}
                    {:else}
                        הפריט יופיע מיד · בשלב הבא תועברו לדף הפריט המלא — שם מוסיפים תמונות ופרטים נוספים
                    {/if}
                </p>
            </div>
        </form>
    {/if}
</div>

<style>
    @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.97); }
        to   { opacity: 1; transform: scale(1); }
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>

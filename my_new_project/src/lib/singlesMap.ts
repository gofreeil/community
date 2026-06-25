// ממיר פריט Strapi (category=singles) למבנה SingleProfile שמוצג בכרטיסים.
// משמש גם את רשת הכרטיסים (/singles) וגם את דף הפרופיל (/singles/[id]),
// כדי שהמיפוי יהיה זהה בשני המקומות.

import type { DbItem } from './server/db';
import type { SingleProfile, Religiosity, Gender } from './singlesMock';
import { avatarUrl } from './singlesMock';

function calcAge(birth: string): string {
    if (!birth) return '';
    const d = new Date(birth);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
    return age > 0 && age < 130 ? String(age) : '';
}

// מגדר נשמר בעברית ב-extra_fields ('גבר' / 'אישה')
function genderFromHe(g: string): Gender {
    const v = String(g || '').trim();
    if (v.includes('אישה') || v.includes('אשה') || v.includes('נקבה') || v === 'female') return 'female';
    return 'male';
}

function religiosityFromSector(sector: string): Religiosity {
    const v = String(sector || '').trim();
    if (!v) return 'general';
    if (v.includes('חרדי')) return 'haredi';
    if (v.includes('לאומי') || v.includes('דתי-לאומי') || v.includes('דתי לאומי')) return 'dl';
    return 'general';
}

// מחלץ מספר טלפון ראשון מתוך טקסט חופשי (שם השדכן עשוי לכלול כמה מספרים)
function extractPhone(text: string): string {
    const m = String(text || '').match(/0\d[\d\-\s]{6,12}\d/);
    return m ? m[0].replace(/[\s-]/g, '') : '';
}

// מסיר קידומת "פנוי"/"פנויה" מתוויות ישנות (לפי העדפת התצוגה)
function stripPanui(label: string): string {
    return String(label || '').replace(/^\s*פנוי[ה]?\s*[,،]?\s*/u, '').trim();
}

export function dbItemToProfile(item: DbItem): SingleProfile {
    let ef: Record<string, unknown> = {};
    try { ef = item.extra_fields ? JSON.parse(item.extra_fields) : {}; } catch { ef = {}; }

    const gender = genderFromHe(String(ef.gender ?? ''));
    const isFemale = gender === 'female';
    const nickname = String(ef.nickname || item.contact || (isFemale ? 'פנויה' : 'פנוי')).trim();
    const age = ef.birth_date ? calcAge(String(ef.birth_date)) : String(ef.age ?? '');
    const city = item.city || String(ef.city ?? '');

    const images = Array.isArray(ef.images)
        ? (ef.images as unknown[]).filter((x): x is string => typeof x === 'string')
        : [];
    const firstImg = images.length > 0 ? images[0] : '';
    const avatar = firstImg || avatarUrl(nickname || String(item.id), isFemale);

    // מה מחפש/ת: לפי המגדר, עם נפילה לשדה השני ואז ל-inspiration
    const lookingFor = String(
        (isFemale ? ef.looking_for_f : ef.looking_for_m) ||
        ef.looking_for_m || ef.looking_for_f || ''
    ).trim();

    const matchmaker = String(ef.matchmaker ?? '').trim();
    const matchmakerPhone = extractPhone(matchmaker) || item.phone || '';

    return {
        id: String(item.id),
        nickname,
        label: stripPanui([age, city].filter(Boolean).join(', ')),
        gender,
        age,
        religiosity: religiosityFromSector(String(ef.sector ?? '')),
        city,
        description: stripPanui(item.description || ''),
        lookingFor,
        inspiration: String(ef.inspiration ?? '').trim(),
        avatar,
        contact: item.contact || '',
        phone: item.phone || '',
        maritalStatus: String(ef.marital_status ?? '').trim(),
        education: String(ef.education ?? '').trim(),
        interests: String(ef.interests ?? '').trim(),
        matchmaker,
        matchmakerPhone,
        images,
        status: 'available',
    };
}

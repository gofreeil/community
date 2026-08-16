import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listApprovedLive, adImageUrl } from '$lib/server/adsStore';

/**
 * הזנת הפרסומות שעל האוויר. התמונות ככתובת ולא כ-base64: נמדד שהנתיב
 * החזיר 1,867KB שכמעט כולם תמונות מוטבעות, וכל פנייה אליו יצאה מהשרת
 * במלואה. הכתובות יחסיות בכוונה - הן נועדו לצריכה מהאתר הזה עצמו.
 */
export const GET: RequestHandler = async () => {
    // רק מה שבאמת על האתר: בלי מושהות ובלי פרסומות שתוקפן פג
    const approved = await listApprovedLive();
    // Return only fields needed by the public sidebar - no submitter PII.
    const slim = approved.map(a => ({
        id: a.id,
        title: a.title,
        subtitle: a.subtitle,
        cta: a.cta,
        hover: a.hoverText,
        gradient: a.gradient,
        logo: adImageUrl(a, 'logo'),
        mainImage: adImageUrl(a, 'main'),
        mainImageFit: a.mainImageFit,
        mobileImage: adImageUrl(a, 'mobile'),
        mobileImageFit: a.mobileImageFit,
        adStyle: a.adStyle,
    }));
    return json(slim);
};

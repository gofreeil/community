import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listApprovedLive } from '$lib/server/adsStore';

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
        logo: a.logo,
        mainImage: a.mainImage,
        mainImageFit: a.mainImageFit,
        mobileImage: a.mobileImage,
        mobileImageFit: a.mobileImageFit,
        adStyle: a.adStyle,
    }));
    return json(slim);
};

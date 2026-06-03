import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listApproved } from '$lib/server/adsStore';

export const GET: RequestHandler = async () => {
    const approved = await listApproved();
    // Return only fields needed by the public sidebar - no submitter PII.
    const slim = approved.map(a => ({
        id: a.id,
        title: a.title,
        subtitle: a.subtitle,
        cta: a.cta,
        hover: a.hoverText,
        gradient: a.gradient,
        mainImage: a.mainImage,
    }));
    return json(slim);
};

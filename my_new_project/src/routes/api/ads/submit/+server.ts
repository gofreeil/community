import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitAd } from '$lib/server/adsStore';

export const POST: RequestHandler = async (event) => {
    const session = await event.locals.auth().catch(() => null);

    let payload: any;
    try {
        payload = await event.request.json();
    } catch {
        throw error(400, 'גוף הבקשה חייב להיות JSON תקין');
    }

    const required = ['title', 'subtitle', 'mainImage', 'gradient'];
    for (const k of required) {
        if (!payload?.[k] || typeof payload[k] !== 'string') {
            throw error(400, `חסר שדה: ${k}`);
        }
    }
    if (!payload.landing || typeof payload.landing !== 'object') {
        throw error(400, 'חסר אובייקט landing');
    }

    const ad = await submitAd({
        submittedBy: session?.user
            ? { id: session.user.id, email: session.user.email ?? undefined, name: session.user.name ?? undefined }
            : undefined,
        title: payload.title,
        subtitle: payload.subtitle,
        hoverText: payload.hoverText ?? '',
        cta: payload.cta ?? '',
        gradient: payload.gradient,
        logo: payload.logo ?? '',
        mainImage: payload.mainImage,
        landing: {
            headline: payload.landing.headline ?? '',
            pitch: payload.landing.pitch ?? '',
            extended: payload.landing.extended ?? '',
            image: payload.landing.image ?? '',
            advantages: [
                payload.landing.advantages?.[0] ?? '',
                payload.landing.advantages?.[1] ?? '',
                payload.landing.advantages?.[2] ?? '',
            ],
            uniqueness: payload.landing.uniqueness ?? '',
            phone: payload.landing.phone ?? '',
            whatsapp: payload.landing.whatsapp ?? '',
            website: payload.landing.website ?? '',
            email: payload.landing.email ?? '',
            address: payload.landing.address ?? '',
            hours: payload.landing.hours ?? '',
            products: Array.isArray(payload.landing.products) ? payload.landing.products : [],
        },
    });

    return json({ ok: true, id: ad.id, status: ad.status });
};

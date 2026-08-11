import { ImageResponse } from '@vercel/og';
import type { RequestHandler } from './$types';
import { getDbItemById } from '$lib/server/db';
import { getDemoItemById } from '$lib/demoUserItems';
import { getItemById as getStaticItemById } from '$lib/itemsData';
import { categoryConfig } from '$lib/categoryFields';
import { satoriRtl, loadLogoBase64 } from '$lib/server/ogCard';

/**
 * GET /api/items/[id]/og.jpg
 *
 * תמונת הקדימון של פריט לשיתוף ברשתות (WhatsApp/Telegram/Facebook):
 * 1. יש לפריט תמונה אמיתית — מגיש אותה (data URL מפוענח, URL רגיל ב-redirect).
 * 2. אין תמונה — מייצר כרטיס ממותג עם שם הפריט, הקטגוריה והשכונה
 *    (בעזרת @vercel/og), כדי שכל שיתוף יראה קדימון ולא לוגו גנרי.
 */
export const GET: RequestHandler = async (event) => {
    const id = event.params.id;
    if (!id) return new Response('Missing id', { status: 400 });

    // אותו סדר חיפוש כמו דף הפריט: DB → פריטי דמו → פריטים סטטיים
    const dbItem = (await getDbItemById(id)) ?? getDemoItemById(id);
    const staticItem = dbItem ? null : getStaticItemById(id);
    if (!dbItem && !staticItem) return new Response('Not found', { status: 404 });

    const extraFields: Record<string, unknown> = (() => {
        try { return JSON.parse(dbItem?.extra_fields ?? '{}'); } catch { return {}; }
    })();

    const candidate: string =
        (typeof extraFields?.avatar === 'string' && extraFields.avatar)
        || (Array.isArray(extraFields?.images) && typeof extraFields.images[0] === 'string' && extraFields.images[0])
        || (typeof extraFields?.image === 'string' && extraFields.image)
        || (typeof staticItem?.image === 'string' && staticItem.image)
        || '';

    if (candidate) {
        // data URL: פענח את ה-base64 והגש כקובץ
        const dataMatch = candidate.match(/^data:([^;,]+)(?:;([^,]*))?,(.*)$/);
        if (dataMatch) {
            const mime = dataMatch[1] || 'image/jpeg';
            const encoding = dataMatch[2] || '';
            const payload = dataMatch[3] || '';
            const bytes = encoding === 'base64'
                ? Buffer.from(payload, 'base64')
                : Buffer.from(decodeURIComponent(payload), 'utf-8');
            return new Response(bytes, {
                headers: {
                    'Content-Type': mime,
                    'Content-Length': String(bytes.length),
                    'Cache-Control': 'public, max-age=3600, s-maxage=86400',
                },
            });
        }

        // URL רגיל: הפנה אליו
        if (/^https?:\/\//i.test(candidate) || candidate.startsWith('/')) {
            return new Response(null, {
                status: 302,
                headers: { location: candidate, 'Cache-Control': 'public, max-age=3600' },
            });
        }
    }

    // ---- אין תמונה: ייצור כרטיס ממותג ----
    const category = dbItem?.category ?? staticItem?.category ?? '';
    const neighborhood = dbItem?.neighborhood ?? '';
    const city = dbItem?.city ?? '';
    const rawLabel = String(dbItem?.label ?? staticItem?.label ?? '');
    // בפנויים ה-label עלול להתחיל ב"פנוי/פנויה," - מנקים כמו בדף הפריט
    const cleanLabel = rawLabel.replace(/^\s*פנוי(ה)?\s*,?\s*/, '').trim() || rawLabel;

    const isSingles = category === 'singles';
    const nickname = typeof extraFields.nickname === 'string' ? extraFields.nickname.trim() : '';
    const age: number | null = (() => {
        const raw = extraFields.age;
        if (typeof raw === 'number' && raw > 0 && raw < 130) return raw;
        if (typeof raw === 'string' && /^\d+$/.test(raw.trim())) {
            const n = Number(raw.trim());
            if (n > 0 && n < 130) return n;
        }
        return null;
    })();
    const isFemale = extraFields.gender === 'female';

    const fullTitle = isSingles ? (nickname || cleanLabel) : cleanLabel;
    // satori לא עוטף שורות אצלנו (ההיפוך הידני שובר עטיפה) - שורה אחת עם קיצוץ
    const title = fullTitle.length > 28 ? fullTitle.slice(0, 27).trimEnd() + '…' : fullTitle;
    const titleSize = title.length <= 12 ? 88 : title.length <= 18 ? 72 : title.length <= 24 ? 58 : 48;

    const metaBits = isSingles
        ? [isFemale ? 'פנויה' : 'פנוי', age != null ? `גיל ${age}` : '', city].filter(Boolean)
        : [categoryConfig[category]?.label ?? '', neighborhood, city !== neighborhood ? city : ''].filter(Boolean);
    const metaLine = metaBits.join(' • ');

    try {
        return new ImageResponse(
            {
                type: 'div',
                props: {
                    style: {
                        width: '1200px',
                        height: '630px',
                        display: 'flex',
                        flexDirection: 'column',
                        background: 'linear-gradient(135deg, #0f172a 0%, #070b14 100%)',
                        fontFamily: 'sans-serif',
                    },
                    children: [
                        {
                            type: 'div',
                            props: {
                                style: {
                                    flexGrow: 1,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '28px',
                                    padding: '40px 60px',
                                },
                                children: [
                                    {
                                        type: 'img',
                                        props: {
                                            src: loadLogoBase64(),
                                            width: 170,
                                            height: 170,
                                            style: {
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                border: '5px solid rgba(255,255,255,0.85)',
                                            },
                                        },
                                    },
                                    {
                                        type: 'div',
                                        props: {
                                            style: {
                                                fontSize: `${titleSize}px`,
                                                fontWeight: '700',
                                                color: '#f1f5f9',
                                                textAlign: 'center',
                                            },
                                            children: satoriRtl(title),
                                        },
                                    },
                                    ...(metaLine
                                        ? [{
                                            type: 'div',
                                            props: {
                                                style: {
                                                    fontSize: '34px',
                                                    fontWeight: '600',
                                                    color: '#94a3b8',
                                                    textAlign: 'center',
                                                },
                                                children: satoriRtl(metaLine),
                                            },
                                        }]
                                        : []),
                                    {
                                        type: 'div',
                                        props: {
                                            style: {
                                                fontSize: '26px',
                                                color: '#cbd5e1',
                                                marginTop: '10px',
                                            },
                                            children: satoriRtl('קהילה בשכונה • community.gofreeil.com'),
                                        },
                                    },
                                ],
                            },
                        },
                        // פס מבטא תחתון בגרדיאנט המותג
                        {
                            type: 'div',
                            props: {
                                style: {
                                    height: '14px',
                                    width: '100%',
                                    background: 'linear-gradient(90deg, #ec4899, #8b5cf6, #3b82f6)',
                                },
                            },
                        },
                    ],
                },
            },
            {
                width: 1200,
                height: 630,
                headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
            },
        );
    } catch (e) {
        console.warn('[og.jpg] card generation failed:', e instanceof Error ? e.message : e);
        return new Response('No image', { status: 404 });
    }
};

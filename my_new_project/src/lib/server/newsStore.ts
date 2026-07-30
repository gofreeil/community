// ============================================================
// newsStore.ts - חדשות הטיקר של דף הבית
// אחסון ב-Strapi (Content Type: post) - אותו אוסף שמוגש כבר דרך
// /api/community-news לאתרים החיצוניים. הניהול נעשה מ-/admin/news.
// ============================================================

import { strapiGetAll, strapiPost, strapiPut, strapiDelete, StrapiContentTypeError } from './strapiClient.js';
import { cached, invalidate } from './cache.js';

const ENDPOINT = '/api/posts';

// הטיקר נטען בכל כניסה לדף הבית - cache קצר חוסך round-trip ל-Strapi.
// כל כתיבה מהפאנל מבטלת אותו מיד, כך שהעדכון נראה בלי המתנה.
const TTL_NEWS = 60_000;
const CACHE_KEY = 'news:all';

export interface NewsPost {
    id: string;            // documentId של Strapi
    title: string;
    summary: string;
    category: string;
    sourceUrl: string;
    archived: boolean;
    imageUrl: string | null;
    publishedAt: string;
}

export interface NewsInput {
    title: string;
    summary?: string;
    category?: string;
    sourceUrl?: string;
    archived?: boolean;
}

interface StrapiPost {
    id: number;
    documentId: string;
    title: string | null;
    summary: string | null;
    category: string | null;
    sourceUrl: string | null;
    archived: boolean | null;
    imageUrl?: { url?: string } | null;
    publishedAt?: string;
    createdAt?: string;
}

function fromStrapi(p: StrapiPost): NewsPost {
    return {
        id:          p.documentId,
        title:       p.title    ?? '',
        summary:     p.summary  ?? '',
        category:    p.category ?? '',
        sourceUrl:   p.sourceUrl ?? '',
        archived:    p.archived === true,
        imageUrl:    p.imageUrl?.url ?? null,
        publishedAt: p.publishedAt ?? p.createdAt ?? '',
    };
}

/** נירמול קלט מהטופס - כותרת חובה, שאר השדות ריקים ולא null */
function toStrapiPayload(input: NewsInput): Record<string, unknown> {
    return {
        title:     input.title.trim(),
        summary:   (input.summary   ?? '').trim(),
        category:  (input.category  ?? '').trim(),
        sourceUrl: (input.sourceUrl ?? '').trim(),
        archived:  Boolean(input.archived),
    };
}

/** כל הידיעות, כולל בארכיון - למסך הניהול. החדשות ביותר קודם. */
export async function listNews(): Promise<NewsPost[]> {
    return cached(CACHE_KEY, TTL_NEWS, async () => {
        try {
            const data = await strapiGetAll<StrapiPost>(ENDPOINT, {
                'sort': 'publishedAt:desc',
                'populate[imageUrl][fields][0]': 'url',
            });
            return data.map(fromStrapi);
        } catch (e) {
            if (e instanceof StrapiContentTypeError) {
                console.warn('[newsStore] content type "post" not registered, returning []');
                return [];
            }
            throw e;
        }
    });
}

/** רק מה שמוצג בטיקר בפועל - לא בארכיון ועם כותרת */
export async function listActiveNews(): Promise<NewsPost[]> {
    const all = await listNews();
    return all.filter((p) => !p.archived && p.title);
}

export async function createNews(input: NewsInput): Promise<NewsPost> {
    const res = await strapiPost<{ data: StrapiPost }>(ENDPOINT, {
        data: {
            ...toStrapiPayload(input),
            // ה-content type מוגדר draftAndPublish - בלי publishedAt הרשומה
            // נוצרת כטיוטה ולא תיראה בטיקר.
            publishedAt: new Date().toISOString(),
        },
    });
    invalidate('news:');
    return fromStrapi(res.data);
}

export async function updateNews(id: string, input: NewsInput): Promise<NewsPost> {
    const res = await strapiPut<{ data: StrapiPost }>(`${ENDPOINT}/${id}`, {
        data: toStrapiPayload(input),
    });
    invalidate('news:');
    return fromStrapi(res.data);
}

/** ארכוב/החזרה מהארכיון בלי לגעת בשאר השדות */
export async function setNewsArchived(id: string, archived: boolean): Promise<void> {
    await strapiPut(`${ENDPOINT}/${id}`, { data: { archived } });
    invalidate('news:');
}

export async function deleteNews(id: string): Promise<void> {
    await strapiDelete(`${ENDPOINT}/${id}`);
    invalidate('news:');
}

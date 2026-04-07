// ============================================================
// /api/community-news — חדשות קהילה עבור אתרים חיצוניים
// מחזיר את הפוסטים האחרונים מ-Strapi עם CORS פתוח
// ============================================================

import { json } from '@sveltejs/kit';

const STRAPI_URL = process.env.STRAPI_URL ?? 'http://localhost:1337';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=120'
};

export async function GET() {
    try {
        const url = new URL(STRAPI_URL + '/api/posts');
        url.searchParams.set('sort[0]', 'publishedAt:desc');
        url.searchParams.set('pagination[limit]', '20');
        url.searchParams.set('filters[archived][$ne]', 'true');
        url.searchParams.set('populate[imageUrl][fields][0]', 'url');

        const res = await fetch(url.toString());
        if (!res.ok) return json({ posts: [] }, { headers: corsHeaders });

        const data = await res.json();

        const posts = (data?.data ?? []).map((p: any) => ({
            documentId: p.documentId,
            title: p.title,
            summary: p.summary || '',
            publishedAt: p.publishedAt,
            category: p.category || '',
            imageUrl: p.imageUrl?.url || null,
            sourceUrl: p.sourceUrl || null
        }));

        return json({ posts }, { headers: corsHeaders });
    } catch (err) {
        console.error('community-news API error:', err);
        return json({ posts: [] }, { status: 200, headers: corsHeaders });
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}

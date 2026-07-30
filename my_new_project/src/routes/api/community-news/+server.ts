// ============================================================
// /api/community-news - חדשות קהילה עבור הטיקר ולאתרים חיצוניים
// מחזיר את הידיעות הפעילות (לא בארכיון) עם CORS פתוח.
// המקור: Content Type "post" ב-Strapi, נערך מ-/admin/news.
// ============================================================

import { json } from '@sveltejs/kit';
import { listActiveNews } from '$lib/server/newsStore';

const MAX_ITEMS = 20;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=120'
};

export async function GET() {
    try {
        const posts = (await listActiveNews()).slice(0, MAX_ITEMS).map((p) => ({
            documentId: p.id,
            title: p.title,
            summary: p.summary,
            publishedAt: p.publishedAt,
            category: p.category,
            imageUrl: p.imageUrl,
            sourceUrl: p.sourceUrl
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

import type { RequestHandler } from './$types';
import { getAllItems } from '$lib/server/db';
import { SITE_URL } from '$lib/seo';

// דפי לוח ציבוריים קבועים - עדיפות גבוהה, מתעדכנים תכופות
const STATIC_PAGES: Array<{ path: string; priority: number; changefreq: string }> = [
    { path: '/',                priority: 1.0, changefreq: 'daily' },
    { path: '/giveaways',       priority: 0.9, changefreq: 'daily' },   // יד שנייה / למסירה
    { path: '/singles',         priority: 0.9, changefreq: 'daily' },   // שידוכים / פנויים ופנויות
    { path: '/chugim',          priority: 0.9, changefreq: 'daily' },   // חוגים
    { path: '/babysitters',     priority: 0.8, changefreq: 'daily' },   // בייבי סיטר
    { path: '/shabbat-hosting', priority: 0.8, changefreq: 'daily' },   // אירוח לשבת / דירות
    { path: '/lost-and-found',  priority: 0.8, changefreq: 'daily' },   // אבדות ומציאות
    { path: '/events',          priority: 0.8, changefreq: 'daily' },   // אירועים
    { path: '/rides',           priority: 0.8, changefreq: 'daily' },   // טרמפים
    { path: '/farm-direct',     priority: 0.7, changefreq: 'weekly' },  // חקלאות ישירה
    { path: '/club-discounts',  priority: 0.7, changefreq: 'weekly' },  // הנחות מועדון
    { path: '/national/jobs',   priority: 0.7, changefreq: 'daily' },   // דרושים
    { path: '/about/charter',   priority: 0.4, changefreq: 'monthly' },
    { path: '/about/advertise', priority: 0.4, changefreq: 'monthly' },
    { path: '/about/legal',     priority: 0.3, changefreq: 'yearly' },
    { path: '/about/accessibility', priority: 0.3, changefreq: 'yearly' },
];

function xmlEscape(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function urlEntry(path: string, opts: { lastmod?: string; priority?: number; changefreq?: string } = {}): string {
    const loc = xmlEscape(SITE_URL + path);
    const parts = [`    <loc>${loc}</loc>`];
    if (opts.lastmod) parts.push(`    <lastmod>${opts.lastmod.slice(0, 10)}</lastmod>`);
    if (opts.changefreq) parts.push(`    <changefreq>${opts.changefreq}</changefreq>`);
    if (opts.priority !== undefined) parts.push(`    <priority>${opts.priority.toFixed(1)}</priority>`);
    return `  <url>\n${parts.join('\n')}\n  </url>`;
}

export const GET: RequestHandler = async ({ setHeaders }) => {
    const urls: string[] = STATIC_PAGES.map((p) => urlEntry(p.path, { priority: p.priority, changefreq: p.changefreq }));

    // פריטים פעילים → דף הפרט הקנוני /items/[id]
    try {
        const items = await getAllItems();
        for (const it of items) {
            if (!it.id) continue;
            urls.push(urlEntry(`/items/${it.id}`, { lastmod: it.created_at, priority: 0.6, changefreq: 'weekly' }));
        }
    } catch { /* אם Strapi נופל - מחזירים לפחות את הדפים הקבועים */ }

    const body =
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
        urls.join('\n') +
        `\n</urlset>\n`;

    setHeaders({
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    });
    return new Response(body);
};

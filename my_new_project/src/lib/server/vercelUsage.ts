// ============================================================
// vercelUsage.ts - צריכת Fluid Active CPU של Vercel ב-30 הימים האחרונים.
// מקור: GET https://api.vercel.com/v1/billing/charges (פורמט FOCUS, JSONL).
// דורש VERCEL_TOKEN (ו-VERCEL_TEAM_ID אם הפרויקט תחת צוות). בלי טוקן -> null
// והמד מציג "לא מוגדר". המכסה (שעות) ב-VERCEL_CPU_LIMIT_HOURS, ברירת מחדל 4 (Hobby).
// ============================================================

import { env } from '$env/dynamic/private';
import { cached } from './cache';
import type { VercelCpuUsage } from '$lib/serverHealthTypes';

const TTL_MS = 10 * 60_000; // חיוב מתעדכן לאט; 10 דק' מספיק ולא מבזבז CPU

async function fetchUsage(): Promise<VercelCpuUsage | null> {
    const token = env.VERCEL_TOKEN;
    if (!token) return null;

    const to = new Date();
    const from = new Date(to.getTime() - 30 * 86_400_000);
    const qs = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
    if (env.VERCEL_TEAM_ID) qs.set('teamId', env.VERCEL_TEAM_ID);

    const res = await fetch(`https://api.vercel.com/v1/billing/charges?${qs}`, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) throw new Error(`vercel billing ${res.status}`);

    // JSONL: שורה לכל יום/SKU. מסכמים כל שורה שמתארת Active CPU.
    let hours = 0;
    for (const line of (await res.text()).split('\n')) {
        if (!line.trim()) continue;
        let row: Record<string, unknown>;
        try { row = JSON.parse(line); } catch { continue; }
        const label = `${row.ServiceName ?? ''} ${row.SkuName ?? ''} ${row.ChargeDescription ?? ''}`;
        if (!/active\s*cpu/i.test(label)) continue;
        const qty = Number(row.ConsumedQuantity ?? row.PricingQuantity ?? 0);
        if (!Number.isFinite(qty)) continue;
        const unit = String(row.ConsumedUnit ?? row.PricingUnit ?? '').toLowerCase();
        hours += unit.startsWith('sec') ? qty / 3600 : unit.startsWith('min') ? qty / 60 : qty;
    }

    const limitHours = Number(env.VERCEL_CPU_LIMIT_HOURS) || 4;
    return { usedHours: Math.round(hours * 100) / 100, limitHours, util: Math.round((hours / limitHours) * 100) };
}

export async function getVercelCpuUsage(): Promise<VercelCpuUsage | null> {
    try {
        return await cached('vercelCpuUsage', TTL_MS, fetchUsage);
    } catch (e) {
        console.warn('[vercelUsage] failed:', e);
        return null;
    }
}

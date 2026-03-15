import { json } from '@sveltejs/kit';
import { addFundDonation, getFundTotal } from '$lib/server/db';

export async function GET() {
    try {
        const totalDonated = await getFundTotal();
        return json({ totalDonated, totalDistributed: 0 });
    } catch (e) {
        console.error('[community-fund GET]', e);
        return json({ totalDonated: 0, totalDistributed: 0 });
    }
}

export async function POST({ request }) {
    const { amount } = await request.json() as { amount: number };
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return json({ error: 'סכום לא תקין' }, { status: 400 });
    }
    const newTotal = await addFundDonation(amount);
    return json({ success: true, newTotal });
}

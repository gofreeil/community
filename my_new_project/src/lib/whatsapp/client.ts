import type { WhatsAppTemplateName } from './templates';

export interface SendWhatsAppArgs {
    /** E.164-ish phone number of the recipient (e.g. "+972501234567" or "0501234567"). */
    to: string;
    template: WhatsAppTemplateName;
    /** Values for the template's paramKeys. Missing keys render as empty strings. */
    params: Record<string, string>;
    /** Deep-link the recipient should tap (item page, profile, etc.). Required. */
    link: string;
}

export interface SendWhatsAppResult {
    ok: boolean;
    /** True while running in mock mode (no real Meta call was made). */
    mocked: boolean;
    /** Provider message id if available. */
    messageId?: string;
    error?: string;
}

/**
 * Browser-side facade. Posts to `/api/whatsapp/send`, which is responsible for
 * the actual Meta call (and is the only place the access token lives).
 */
export async function sendWhatsApp(args: SendWhatsAppArgs): Promise<SendWhatsAppResult> {
    try {
        const res = await fetch('/api/whatsapp/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args),
        });
        const data = (await res.json()) as SendWhatsAppResult;
        return data;
    } catch (e) {
        return { ok: false, mocked: false, error: e instanceof Error ? e.message : String(e) };
    }
}

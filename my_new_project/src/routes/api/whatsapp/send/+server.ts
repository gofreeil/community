import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { TEMPLATES, type WhatsAppTemplateName } from '$lib/whatsapp/templates';

interface SendBody {
    to: string;
    template: WhatsAppTemplateName;
    params: Record<string, string>;
    link: string;
}

/**
 * WhatsApp send endpoint.
 *
 * Mock mode (default): logs the message and returns ok+mocked=true.
 * Live mode: set WHATSAPP_ENABLED=true, WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID,
 * and approve the matching templates in Meta Business Manager.
 *
 * Live mode is intentionally a TODO - wire it once the Meta account is ready.
 */
export const POST: RequestHandler = async ({ request }) => {
    let body: SendBody;
    try {
        body = (await request.json()) as SendBody;
    } catch {
        return json({ ok: false, mocked: false, error: 'invalid json' }, { status: 400 });
    }

    const { to, template, params, link } = body ?? {};
    if (!to || !template || !link) {
        return json(
            { ok: false, mocked: false, error: 'missing to/template/link' },
            { status: 400 },
        );
    }

    const def = TEMPLATES[template];
    if (!def) {
        return json(
            { ok: false, mocked: false, error: `unknown template: ${template}` },
            { status: 400 },
        );
    }

    const enabled = env.WHATSAPP_ENABLED === 'true';
    const preview = def.preview(params ?? {}, link);

    if (!enabled) {
        // Mock mode - useful during development and while Meta approval is pending.
        console.log('[whatsapp:mock]', { to, template, link, preview });
        return json({ ok: true, mocked: true, messageId: `mock_${Date.now()}` });
    }

    // TODO: Meta Cloud API call goes here once the Business account is set up.
    //   POST https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages
    //   Authorization: Bearer ${env.WHATSAPP_TOKEN}
    //   Body: { messaging_product: "whatsapp", to, type: "template",
    //           template: { name: template, language: { code: "he" },
    //             components: [{ type: "body", parameters: def.paramKeys.map(k => ({ type: "text", text: params[k] ?? "" })) },
    //                          { type: "button", sub_type: "url", index: 0,
    //                            parameters: [{ type: "text", text: link }] }] } }
    console.warn('[whatsapp] live mode not yet implemented - falling back to mock');
    console.log('[whatsapp:mock]', { to, template, link, preview });
    return json({ ok: true, mocked: true, messageId: `mock_${Date.now()}` });
};

/**
 * WhatsApp message templates.
 *
 * Each template mirrors a Meta-approved template that will exist in production.
 * `preview` is used in mock mode and as a fallback if Meta is unreachable.
 *
 * To add a new template:
 *   1. Add it to WhatsAppTemplateName
 *   2. Add the definition to TEMPLATES below
 *   3. Submit a matching template to Meta Business for approval
 */

export type WhatsAppTemplateName =
    | 'item_inquiry'
    | 'lost_found_response'
    | 'shabbat_match'
    | 'shabbat_request';

export type WhatsAppLanguage = 'he' | 'en' | 'ru';

export interface WhatsAppTemplate {
    name: WhatsAppTemplateName;
    /** Ordered list of parameter keys this template expects. */
    paramKeys: readonly string[];
    /** Renders the message body for mock/fallback display. */
    preview(params: Record<string, string>, link: string): string;
}

export const TEMPLATES: Record<WhatsAppTemplateName, WhatsAppTemplate> = {
    item_inquiry: {
        name: 'item_inquiry',
        paramKeys: ['senderName', 'itemLabel'],
        preview: (p, link) =>
            `שלום! ${p.senderName} מעוניין/ת בפריט "${p.itemLabel}" שפרסמת.\nפרטים: ${link}`,
    },
    lost_found_response: {
        name: 'lost_found_response',
        paramKeys: ['senderName', 'itemLabel'],
        preview: (p, link) =>
            `${p.senderName} פנה/תה בנוגע לפריט "${p.itemLabel}".\nפרטים: ${link}`,
    },
    shabbat_match: {
        name: 'shabbat_match',
        paramKeys: ['matchLabel'],
        preview: (p, link) =>
            `נמצאה התאמה לאירוח שבת: ${p.matchLabel}.\nפרטים: ${link}`,
    },
    shabbat_request: {
        name: 'shabbat_request',
        paramKeys: ['senderName'],
        preview: (p, link) =>
            `בקשת אירוח חדשה מ-${p.senderName}.\nפרטים: ${link}`,
    },
};

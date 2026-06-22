import type { Core } from '@strapi/strapi';

// כל ה-frontends שמותר להחזיר אליהם access_token אחרי OAuth של Google
const OAUTH_REDIRECT_URIS = [
    'https://chachmim.gofreeil.com/auth/google-callback',
    'https://chachmei-haeda.gofreeil.com/auth/google-callback',
    'https://community.gofreeil.com/auth/google-callback',
    'https://community-il.gofreeil.com/auth/google-callback',
    'http://localhost:5173/auth/google-callback',
    'http://localhost:5174/auth/google-callback',
    'http://localhost:5175/auth/google-callback',
];

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
    graphql: {
        enabled: false,
    },
    cloud: {
        enabled: false,
    },
    'users-permissions': {
        config: {
            providers: {
                google: {
                    enabled: true,
                    redirectUri: OAUTH_REDIRECT_URIS,
                },
            },
        },
    },
    email: {
        config: {
            provider: 'nodemailer',
            providerOptions: {
                host:   'smtp.resend.com',
                port:   465,
                secure: true,
                auth: {
                    user: 'resend',
                    pass: env('RESEND_API_KEY'),
                },
            },
            settings: {
                defaultFrom:    env('EMAIL_FROM', 'noreply@gofreeil.com'),
                defaultReplyTo: env('EMAIL_FROM', 'noreply@gofreeil.com'),
            },
        },
    },
});

export default config;

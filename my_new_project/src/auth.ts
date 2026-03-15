import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import Facebook from '@auth/sveltekit/providers/facebook';
import Credentials from '@auth/sveltekit/providers/credentials';
import { upsertUser, verifyCredentials } from '$lib/server/db';
import {
    AUTH_SECRET,
    AUTH_GOOGLE_ID,
    AUTH_GOOGLE_SECRET,
    AUTH_FACEBOOK_ID,
    AUTH_FACEBOOK_SECRET,
} from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
    secret: AUTH_SECRET,

    providers: [
        Google({
            clientId:     AUTH_GOOGLE_ID,
            clientSecret: AUTH_GOOGLE_SECRET,
        }),
        Facebook({
            clientId:     AUTH_FACEBOOK_ID,
            clientSecret: AUTH_FACEBOOK_SECRET,
        }),
        Credentials({
            id:   'credentials',
            name: 'Email & Password',
            credentials: {
                email:    { label: 'Email',    type: 'email'    },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null;

                const user = await verifyCredentials(
                    credentials.email as string,
                    credentials.password as string,
                );

                if (!user) return null;

                return {
                    id:    user.id,
                    name:  user.name ?? '',
                    email: user.email ?? '',
                };
            },
        }),
    ],

    callbacks: {
        signIn({ user, account }) {
            if (!account || !user) return false;

            // Credentials provider — upsert כבר נעשה ב-authorize
            if (account.provider === 'credentials') return true;

            // מזהה יציב: provider_providerAccountId (ייחודי חוצה-ספקים)
            const stableId = `${account.provider}_${account.providerAccountId}`;

            try {
                upsertUser({
                    id:         stableId,
                    name:       user.name,
                    email:      user.email,
                    avatar_url: user.image,
                    provider:   account.provider,
                });
                // נעביר את ה-stableId לתוך token דרך jwt callback
                user.id = stableId;
                return true;
            } catch (error) {
                console.error('Failed to upsert user:', error);
                return false;
            }
        },

        jwt({ token, user, account }) {
            // user + account מועברים רק ב-sign-in הראשון
            if (user && account) {
                token.dbUserId = account.provider === 'credentials'
                    ? user.id
                    : `${account.provider}_${account.providerAccountId}`;
                token.provider = account.provider;
            }
            // שמור Strapi JWT (רק ב-credentials login)
            if (user && (user as { strapiJwt?: string }).strapiJwt) {
                token.strapiJwt = (user as { strapiJwt?: string }).strapiJwt;
            }
            return token;
        },

        session({ session, token }) {
            if (token.dbUserId) {
                session.user.id = token.dbUserId as string;
            }
            if (token.provider) {
                (session.user as { provider?: string }).provider = token.provider as string;
            }
            if (token.strapiJwt) {
                (session.user as { strapiJwt?: string }).strapiJwt = token.strapiJwt as string;
            }
            return session;
        },
    },

    pages: {
        signIn: '/login',
        error:  '/login',
    },

    trustHost: true,
});

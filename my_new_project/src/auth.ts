import { SvelteKitAuth } from '@auth/sveltekit';
import Google from '@auth/sveltekit/providers/google';
import Facebook from '@auth/sveltekit/providers/facebook';
import Credentials from '@auth/sveltekit/providers/credentials';
import { createHash } from 'crypto';
import { upsertUser, verifyCredentials, getUserByEmail, getUserById } from '$lib/server/db';
import { strapiLogin, strapiRegister } from '$lib/server/strapiClient';

const AUTH_SECRET         = process.env.AUTH_SECRET         ?? '';
const AUTH_GOOGLE_ID      = process.env.AUTH_GOOGLE_ID      ?? '';
const AUTH_GOOGLE_SECRET  = process.env.AUTH_GOOGLE_SECRET  ?? '';
const AUTH_FACEBOOK_ID    = process.env.AUTH_FACEBOOK_ID    ?? '';
const AUTH_FACEBOOK_SECRET= process.env.AUTH_FACEBOOK_SECRET?? '';

// ============================================================
// קבלת JWT של Strapi עבור משתמשי OAuth
// יוצר חשבון Strapi users-permissions דטרמיניסטי לכל OAuth user
// ============================================================
async function getOrCreateStrapiJwt(email: string | null | undefined, stableId: string): Promise<string | null> {
    if (!email) return null;
    // סיסמה דטרמיניסטית — sha256(stableId + AUTH_SECRET), קבועה לכל login
    const password = createHash('sha256').update(stableId + AUTH_SECRET).digest('hex').slice(0, 32);
    const username = stableId.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30);
    try {
        const { jwt } = await strapiLogin(email, password);
        return jwt;
    } catch {
        // משתמש לא קיים — ניצור אותו
        try {
            const { jwt } = await strapiRegister(username, email, password);
            return jwt;
        } catch (err) {
            console.warn('[auth] getOrCreateStrapiJwt failed:', err);
            return null;
        }
    }
}

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
        async signIn({ user, account }) {
            if (!account || !user) return false;

            // Credentials provider — upsert כבר נעשה ב-authorize
            // קבל JWT של Strapi גם עבור credentials user
            if (account.provider === 'credentials') {
                const stableId = user.id ?? `credentials_${user.email}`;
                const strapiJwt = await getOrCreateStrapiJwt(user.email, stableId);
                if (strapiJwt) (user as { strapiJwt?: string }).strapiJwt = strapiJwt;
                return true;
            }

            // בדוק אם קיים משתמש עם אותו אימייל (קישור חשבונות)
            const existingByEmail = user.email ? await getUserByEmail(user.email) : null;

            // אם קיים — השתמש ב-ID שלו (מיזוג חשבונות)
            // אם לא — צור מזהה חדש: provider_providerAccountId
            const stableId = existingByEmail?.id ?? `${account.provider}_${account.providerAccountId}`;

            try {
                await upsertUser({
                    id:         stableId,
                    name:       user.name,
                    email:      user.email,
                    avatar_url: user.image,
                    provider:   account.provider,
                });
                // נעביר את ה-stableId לתוך token דרך jwt callback
                user.id = stableId;
                // קבל JWT של Strapi עבור OAuth user ושמור ב-session
                const strapiJwt = await getOrCreateStrapiJwt(user.email, stableId);
                if (strapiJwt) (user as { strapiJwt?: string }).strapiJwt = strapiJwt;
                return true;
            } catch (error) {
                console.error('Failed to upsert user:', error);
                return false;
            }
        },

        async jwt({ token, user, account }) {
            // user + account מועברים רק ב-sign-in הראשון
            if (user && account) {
                token.dbUserId = account.provider === 'credentials'
                    ? user.id
                    : `${account.provider}_${account.providerAccountId}`;
                token.provider = account.provider;
                if (user.email) token.email = user.email;
            }
            // שמור Strapi JWT (רק ב-credentials login)
            if (user && (user as { strapiJwt?: string }).strapiJwt) {
                token.strapiJwt = (user as { strapiJwt?: string }).strapiJwt;
            }
            // שלוף role, neighborhood, banned מהדאטאבייס (בכל refresh של token)
            if (token.dbUserId) {
                try {
                    const dbUser = await getUserById(token.dbUserId as string);
                    if (dbUser) {
                        token.role = dbUser.role;
                        token.neighborhood = dbUser.neighborhood;
                        token.banned = dbUser.banned;
                    }
                } catch { /* ignore — fallback to 'user' */ }
            }
            return token;
        },

        session({ session, token }) {
            if (token.dbUserId) {
                session.user.id = token.dbUserId as string;
            }
            if (token.email) {
                session.user.email = token.email as string;
            }
            if (token.provider) {
                (session.user as { provider?: string }).provider = token.provider as string;
            }
            if (token.strapiJwt) {
                (session.user as { strapiJwt?: string }).strapiJwt = token.strapiJwt as string;
            }
            // העבר role, neighborhood, banned לסשן
            session.user.role = (token.role as typeof session.user.role) ?? 'user';
            session.user.neighborhood = (token.neighborhood as string) ?? '';
            session.user.banned = (token.banned as boolean) ?? false;
            return session;
        },
    },

    pages: {
        signIn: '/login',
        error:  '/login',
    },

    trustHost: true,
});

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
    // try/catch מונע 500 אם ה-session קוקי פגום / AUTH_SECRET קצר
    let session = null;
    try {
        session = await event.locals.auth();
    } catch {
        // session לא תקין — נמשיך כמשתמש אנונימי
    }
    return { session };
};

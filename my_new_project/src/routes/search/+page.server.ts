import type { PageServerLoad } from './$types';
import { searchItems } from '$lib/server/db';
import { getNearbyCities } from '$lib/data/nearbyCities';

export const load: PageServerLoad = async ({ url, locals }) => {
    const query = url.searchParams.get('q')?.trim() ?? '';
    const session = await locals.auth();
    const user = (session?.user as any) ?? null;
    const userCity         = user?.city         ?? '';
    const userNeighborhood = user?.neighborhood ?? '';

    if (!query) {
        return { query, results: { neighborhood: [], city: [], nearby: [], other: [] }, userCity, userNeighborhood };
    }

    const allItems = await searchItems(query);
    const nearbyCities = getNearbyCities(userCity);

    const neighborhood: typeof allItems = [];
    const city:         typeof allItems = [];
    const nearby:       typeof allItems = [];
    const other:        typeof allItems = [];

    for (const item of allItems) {
        if (userNeighborhood && item.neighborhood === userNeighborhood && item.city === userCity) {
            neighborhood.push(item);
        } else if (userCity && item.city === userCity) {
            city.push(item);
        } else if (nearbyCities.includes(item.city)) {
            nearby.push(item);
        } else {
            other.push(item);
        }
    }

    return {
        query,
        results: { neighborhood, city, nearby, other },
        userCity,
        userNeighborhood,
        nearbyCities,
    };
};

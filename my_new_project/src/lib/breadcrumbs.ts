// מפת הדרכים (breadcrumbs) שמוצגת בראש כל דף: בית › … › הדף הנוכחי.
// כל מקטע בנתיב שיש לו דף משלו הופך לחוליה; מקטע בלי דף (/admin/users, /giveaways/edit,
// /national וכו') מדולג. הטקסטים ב-translations/crumbs.ts (מפתח crumbs.<key>).

export interface Crumb {
	href: string;
	/** מפתח תרגום תחת crumbs.* */
	key: string;
	/** דף עם פרמטר ([id], [city]...) - השם האמיתי נלקח מכותרת הדף, key הוא רק נפילה */
	dynamic?: boolean;
}

/** route id → מפתח תרגום. נתיב שמופיע כאן = יש בו דף שאפשר לחזור אליו */
const LABELS: Record<string, string> = {
	'/about': 'about',
	'/about/accessibility': 'about_accessibility',
	'/about/advertise': 'about_advertise',
	'/about/advertise/builder': 'about_advertise_builder',
	'/about/advertise/builder/landing': 'about_advertise_builder_landing',
	'/about/charter': 'about_charter',
	'/about/legal': 'about_legal',
	'/about/revenue': 'about_revenue',
	'/add/[category]': 'add_category',
	'/admin': 'admin',
	'/admin/2fa-setup': 'two_fa_setup',
	'/admin/ads-review': 'admin_ads_review',
	'/admin/incomplete': 'admin_incomplete',
	'/admin/match-feedback': 'admin_match_feedback',
	'/admin/news': 'admin_news',
	'/admin/quiz-suggestions': 'admin_quiz_suggestions',
	'/admin/shop-ads': 'admin_shop_ads',
	'/admin/singles-review': 'admin_singles_review',
	'/admin/statistics': 'statistics',
	'/admin/users/[id]': 'admin_user',
	'/admin/verify': 'admin_verify',
	'/ads/[id]': 'ad',
	'/babysitters': 'babysitters',
	'/banned': 'banned',
	'/chugim': 'chugim',
	'/club-discounts': 'club_discounts',
	'/community-fund': 'community_fund',
	'/confirm-email': 'confirm_email',
	'/coordinator': 'coordinator',
	'/coordinator/2fa-setup': 'two_fa_setup',
	'/coordinator/apply': 'coordinator_apply',
	'/coordinator/emergency-team': 'emergency_team',
	'/coordinator/polls': 'coordinator_polls',
	'/coordinator/statistics': 'statistics',
	'/coordinator/verify': 'coordinator_verify',
	'/emergency-team': 'emergency_team',
	'/events': 'events',
	'/farm-direct': 'farm_direct',
	'/forgot-password': 'forgot_password',
	'/gatherings': 'gatherings',
	'/gatherings/[id]': 'gathering',
	'/giveaways': 'giveaways',
	'/giveaways/add': 'giveaways_add',
	'/giveaways/edit/[id]': 'giveaways_edit',
	'/giveaways/my': 'giveaways_my',
	'/gmachim/add': 'gmachim_add',
	'/items/[id]': 'details',
	'/jobs/add': 'jobs_add',
	'/login': 'login',
	'/lost-and-found': 'lost_and_found',
	'/lost-and-found/[id]': 'details',
	'/lost-and-found/add': 'lost_and_found_add',
	'/messages': 'messages',
	'/national/[category]': 'national_board',
	'/national/jobs': 'national_jobs',
	'/onboarding/1': 'step_1',
	'/onboarding/2': 'step_2',
	'/onboarding/3': 'step_3',
	'/profile': 'profile',
	'/raise-hand/add': 'raise_hand',
	'/receipts': 'receipts',
	'/register': 'register',
	'/reset-password': 'reset_password',
	'/restaurants/[id]': 'details',
	'/rides': 'rides',
	'/rides/add': 'rides_add',
	'/search': 'search',
	'/shabbat-hosting': 'shabbat_hosting',
	'/shabbat-hosting/[city]': 'shabbat_hosting_city',
	'/singles': 'singles',
	'/singles/[id]': 'singles_card',
	'/singles/add': 'singles_add',
	'/singles/match/[id]': 'singles_match',
	'/singles/matchmaker': 'singles_matchmaker',
	'/singles/matchmaker/join': 'singles_matchmaker_join',
	'/singles/matchmaker/quiz': 'singles_matchmaker_quiz',
};

/** דפים שההורה ההגיוני שלהם לא נמצא בנתיב עצמו (או שלבים קודמים באשף) */
const PARENTS: Record<string, Crumb[]> = {
	'/jobs/add': [{ href: '/national/jobs', key: 'national_jobs' }],
	'/restaurants/[id]': [{ href: '/national/restaurants', key: 'national_restaurants' }],
	'/onboarding/2': [{ href: '/onboarding/1', key: 'step_1' }],
	'/onboarding/3': [
		{ href: '/onboarding/1', key: 'step_1' },
		{ href: '/onboarding/2', key: 'step_2' },
	],
};

/** דפים בלי מפה: דף הבית עצמו, ומסך ביניים שמעביר הלאה מיד */
const HIDDEN = new Set(['/', '/sso-adopt']);

/**
 * החוליות מהבית ועד הדף הנוכחי (כולל). null = לא מציגים מפה בדף הזה
 * (דף הבית, 404, או נתיב שלא מוכר כאן).
 */
export function buildCrumbs(routeId: string | null, pathname: string): Crumb[] | null {
	if (!routeId || HIDDEN.has(routeId) || !LABELS[routeId]) return null;

	const routeSegs = routeId.split('/').filter(Boolean);
	const pathSegs = pathname.split('/').filter(Boolean);
	const crumbs: Crumb[] = [{ href: '/', key: 'home' }];

	if (PARENTS[routeId]) {
		crumbs.push(...PARENTS[routeId]);
	} else {
		for (let i = 1; i < routeSegs.length; i++) {
			const key = LABELS['/' + routeSegs.slice(0, i).join('/')];
			if (key) crumbs.push({ href: '/' + pathSegs.slice(0, i).join('/'), key });
		}
	}

	crumbs.push({ href: pathname, key: LABELS[routeId], dynamic: routeId.includes('[') });
	return crumbs;
}

/** שם הדף מתוך <title>: החלק הראשון, בלי סיומת שם האתר */
export function labelFromTitle(title: string): string {
	const first = title.split(/\s+[|·]\s+/)[0] ?? '';
	return first.replace(/\s+[-–—]\s+קהילה בשכונה$/, '').trim();
}

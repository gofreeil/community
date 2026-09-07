import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';

// Vercel → adapter-auto (ברירת מחדל)
// Arxentra / Node.js → DEPLOY_TARGET=node → adapter-node (מייצר build/index.js)
const useNode = process.env.DEPLOY_TARGET === 'node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: useNode ? adapterNode() : adapterAuto(),
		// דף שנשאר פתוח בזמן דיפלוי מחזיק הפניות ל-chunks שכבר לא קיימים על השרת, וניווט
		// SPA נופל ("Failed to fetch dynamically imported module"). הדגימה של version.json
		// (קובץ סטטי זעיר, פעם ב-5 דק' לכל טאב פתוח) מסמנת updated.current, ו-+layout.svelte
		// מחליף את הניווט הבא בטעינה מלאה מהשרת - לפני שהוא נופל.
		version: { pollInterval: 5 * 60 * 1000 }
	}
};

export default config;

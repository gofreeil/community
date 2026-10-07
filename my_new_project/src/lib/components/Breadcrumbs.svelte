<script lang="ts">
	// מפת דרכים קטנה בראש כל דף (בית › … › הדף הנוכחי) - חוזרים בלחיצה לכל שלב
	// קודם עד דף הבית. החוליות נבנות מהנתיב ב-$lib/breadcrumbs.ts.
	import { _ } from "svelte-i18n";
	import { page } from "$app/state";
	import { browser } from "$app/environment";
	import { buildCrumbs, labelFromTitle } from "$lib/breadcrumbs";

	let crumbs = $derived(buildCrumbs(page.route.id, page.url.pathname));

	// בדף עם פרמטר ([id] / [city]...) השם האמיתי (שם הפריט, העיר) נמצא רק ב-<title>
	// של הדף. עוקבים אחרי ה-head כי הכותרת מתחלפת אחרי שהדף החדש מצויר.
	let docTitle = $state("");
	$effect(() => {
		if (!browser) return;
		const read = () => (docTitle = document.title);
		read();
		const mo = new MutationObserver(read);
		mo.observe(document.head, { childList: true, subtree: true, characterData: true });
		return () => mo.disconnect();
	});
</script>

{#if crumbs}
	<nav class="crumbs" aria-label={$_("crumbs.aria")} dir="rtl">
		<ol>
			{#each crumbs as c, i (c.href)}
				{@const last = i === crumbs.length - 1}
				{@const label = (c.dynamic && labelFromTitle(docTitle)) || $_(`crumbs.${c.key}`)}
				<li class:last>
					{#if last}
						<span aria-current="page" title={label}>{label}</span>
					{:else}
						<a href={c.href}>{label}</a>
						<span class="sep" aria-hidden="true">›</span>
					{/if}
				</li>
			{/each}
		</ol>
	</nav>
{/if}

<style>
	/* קטן ושקט: שורה אחת בפינה הימנית העליונה של אזור התוכן.
	   בדסקטופ יושב בתוך הריפוד העליון של ה-layout, כך שהתוכן כמעט לא זז. */
	.crumbs {
		margin: -1.25rem 0 0.75rem;
		font-size: 0.75rem;
		line-height: 1.2;
		color: #94a3b8;
	}

	ol {
		display: flex;
		align-items: center;
		flex-wrap: nowrap;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
		list-style: none;
		min-width: 0;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
		white-space: nowrap;
	}

	/* שם ארוך (פריט / כרטיס) נחתך בשלוש נקודות ולא שובר את השורה */
	li.last {
		flex-shrink: 1;
		min-width: 0;
	}
	li.last span {
		overflow: hidden;
		text-overflow: ellipsis;
		color: #cbd5e1;
		font-weight: 600;
	}

	a {
		color: #94a3b8;
		text-decoration: none;
		transition: color 0.15s ease;
	}
	a:hover,
	a:focus-visible {
		color: #fff;
		text-decoration: underline;
	}

	/* › הוא תו מראה - ב-RTL הוא מוצג כ-‹, כלומר מצביע לכיוון הדף הנוכחי */
	.sep {
		color: #475569;
	}

	@media (max-width: 1024px) {
		/* בנייד אין ריפוד ל-layout - נותנים לשורה ריפוד משלה */
		.crumbs {
			margin: 0;
			padding: 0.5rem 1rem 0.25rem;
		}
	}
</style>

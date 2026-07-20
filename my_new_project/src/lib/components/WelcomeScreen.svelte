<script lang="ts">
	/**
	 * מסך פתיחה מלא אחרי זיהוי חדש — גלובלי (מוצג ב-+layout), כדי שיופיע בכל
	 * יעד נחיתה ולא רק ב-/profile. מקור-אמת: פרמטר `welcome` ב-URL שנשתל
	 * בזרימות ההרשמה / ההתחברות / ה-SSO:
	 *   welcome=1 | welcome=new  → "ברוכים המצטרפים" (משתמש חדש לאתר)
	 *   welcome=back             → "ברוכים השבים"    (משתמש שהיה מנותק וחזר)
	 *
	 * נסגר אוטומטית אחרי 7 שניות (פס-זמן מתמלא בתחתית) או ידנית ב-✕. עם הסגירה
	 * מוסר הפרמטר מה-URL, כך שרענון או גלישה רגילה לא יציגו שוב — רק זיהוי חדש
	 * (שמוסיף את הפרמטר מחדש) יציג אותו שוב.
	 */
	import { onMount } from "svelte";
	import { page } from "$app/state";
	import { replaceState } from "$app/navigation";
	import { t, locale } from "svelte-i18n";
	import { get } from "svelte/store";
	import { ads } from "$lib/adsData";

	let { userName = "" }: { userName?: string } = $props();

	// tFn: תרגום reactive - $t אסור ב-Svelte 5
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe((l) => (_loc = l)));
	const tFn = (k: string, values?: Record<string, string | number>) => {
		void _loc;
		return values ? get(t)(k, { values }) : get(t)(k);
	};

	const WELCOME_MS = 7000;

	// רק הפרמטר `welcome` נחשב. במפורש *לא* `new=1` — הוא כבר בשימוש אחר לגמרי
	// (פרסום פריט חדש: /items/<id>?builder=1&new=1), והאזנה לו הייתה מקפיצה את
	// מסך הפתיחה לכל מי שמפרסם פריט.
	const _param = page.url.searchParams.get("welcome");
	const _init: "new" | "back" | null =
		_param === "1" || _param === "new" ? "new" : _param === "back" ? "back" : null;

	let kind = $state<"new" | "back" | null>(_init);
	let visible = $state(false);
	let fill = $state(false); // מפעיל את אנימציית מילוי פס-הזמן
	let timer: ReturnType<typeof setTimeout> | undefined;

	function dismiss() {
		if (timer) clearTimeout(timer);
		visible = false;
		try {
			const url = new URL(page.url);
			url.searchParams.delete("welcome");
			replaceState(`${url.pathname}${url.search}${url.hash}`, {});
		} catch {
			/* ignore — נשאר מוסתר גם אם ה-replaceState נכשל */
		}
	}

	onMount(() => {
		if (!kind) return;
		visible = true;
		// מפעילים את המילוי בפריים הבא כדי שה-transition ירוץ מ-0% ל-100%
		requestAnimationFrame(() => (fill = true));
		timer = setTimeout(dismiss, WELCOME_MS);
		return () => {
			if (timer) clearTimeout(timer);
		};
	});
</script>

{#if visible && kind}
	<div
		role="dialog"
		aria-modal="true"
		dir="rtl"
		class="fixed inset-0 z-[100] overflow-y-auto
			{kind === 'new'
			? 'bg-gradient-to-br from-blue-950 via-[#070b14] to-purple-950'
			: 'bg-gradient-to-br from-emerald-950 via-[#070b14] to-blue-950'}"
	>
		<!-- סגירה ידנית -->
		<button
			type="button"
			onclick={dismiss}
			aria-label={tFn("profile.close")}
			class="fixed top-4 left-4 z-[110] flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-gray-200 transition-colors hover:bg-white/20 hover:text-white"
		>
			<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true" focusable="false">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>

		<div class="min-h-full flex items-start md:items-center justify-center px-4 py-14">
			<div class="w-full max-w-md text-center">
				{#if kind === "new"}
					<!-- לוגו עגול (מוקטן) במקום האימוגי -->
					<img
						src="/images/ad_neighborhoods.png"
						alt="יוצאים לחירות"
						class="mx-auto w-20 h-20 rounded-full object-cover ring-2 ring-purple-400/40 shadow-lg mb-4"
					/>
					<h2 class="flex items-center justify-center gap-2 text-white font-black text-2xl mb-3">
						<span class="text-xl" aria-hidden="true">🎉</span>
						<span>{tFn("welcome_joiners_title")}</span>
					</h2>
					<p class="text-gray-200 text-base leading-relaxed max-w-xl mx-auto mb-5">
						{tFn("welcome_joiners_body")}
					</p>

					<!-- סלוגן -->
					<p class="text-purple-200 text-sm md:text-base font-bold tracking-wide mb-4">
						{tFn("welcome_platforms_label")}
					</p>

					<!-- לוגואים של כל האתרים ברשת -->
					<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
						{#each ads as site (site.id)}
							<a
								href={site.href}
								target="_blank"
								rel="noopener noreferrer"
								title={site.title}
								class="group flex flex-col items-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-400/40 p-2 transition-all hover:-translate-y-0.5"
							>
								<div class="w-full aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br {site.color}">
									<img
										src={site.image}
										alt={site.title}
										loading="lazy"
										class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
									/>
								</div>
								<span class="text-[11px] leading-tight font-semibold text-gray-200 line-clamp-2 text-center">{site.title}</span>
							</a>
						{/each}
					</div>
				{:else}
					<div class="text-6xl mb-4">👋</div>
					<h2 class="text-white font-black text-2xl mb-3">
						{tFn("welcome_back_title", { name: userName.trim() || tFn("default_user") })}
					</h2>
					<p class="text-gray-200 text-base leading-relaxed max-w-xl mx-auto">
						{tFn("welcome_back_body")}
					</p>
				{/if}
			</div>
		</div>

		<!-- פס זמן — מתמלא עד סוף המסך (7 שניות) ואז המסך נסגר -->
		<div class="fixed bottom-0 left-0 right-0 h-1.5 bg-white/10 z-[110]">
			<div
				class="h-full {kind === 'new' ? 'bg-purple-400' : 'bg-emerald-400'}"
				style="width: {fill ? '100%' : '0%'}; transition: width {WELCOME_MS}ms linear;"
			></div>
		</div>
	</div>
{/if}

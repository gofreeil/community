<script lang="ts">
	import { onMount } from 'svelte';
	import { _ } from 'svelte-i18n';

	type TabId = 'terms' | 'privacy' | 'regulations' | 'accessibility';

	const tabs: { id: TabId; labelKey: string; icon: string }[] = [
		{ id: 'terms',         labelKey: 'aboutPages.tab_terms',         icon: '📋' },
		{ id: 'privacy',       labelKey: 'aboutPages.tab_privacy',       icon: '🔒' },
		{ id: 'regulations',   labelKey: 'aboutPages.tab_regulations',   icon: '📜' },
		{ id: 'accessibility', labelKey: 'aboutPages.tab_accessibility', icon: '♿' },
	];

	const termsTocKeys = [
		'aboutPages.terms_toc_1',
		'aboutPages.terms_toc_2',
		'aboutPages.terms_toc_3',
		'aboutPages.terms_toc_4',
		'aboutPages.terms_toc_5',
		'aboutPages.terms_toc_6',
		'aboutPages.terms_toc_7',
		'aboutPages.terms_toc_8',
		'aboutPages.terms_toc_9',
		'aboutPages.terms_toc_10',
		'aboutPages.terms_toc_11',
	];

	const forbiddenContentKeys = [
		'aboutPages.terms_s2_3_li1',
		'aboutPages.terms_s2_3_li2',
		'aboutPages.terms_s2_3_li3',
		'aboutPages.terms_s2_3_li4',
		'aboutPages.terms_s2_3_li5',
		'aboutPages.terms_s2_3_li6',
		'aboutPages.terms_s2_3_li7',
		'aboutPages.terms_s2_3_li8',
	];

	let activeTab = $state<TabId>('terms');

	onMount(() => {
		const hash = window.location.hash.slice(1) as TabId;
		if (tabs.find(t => t.id === hash)) activeTab = hash;
	});

	function setTab(id: TabId) {
		activeTab = id;
		history.replaceState(null, '', '#' + id);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>תנאי שימוש ומדיניות – קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen py-10 px-4 page-bg" dir="rtl">
	<div class="max-w-4xl mx-auto">

		<!-- כותרת -->
		<div class="text-center mb-8">
			<h1 class="text-3xl md:text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
				{$_('aboutPages.legal_title')}
			</h1>
			<p class="text-gray-400 text-base">{$_('aboutPages.legal_subtitle')}</p>
		</div>

		<!-- טאבים -->
		<div class="sticky top-0 z-30 tabs-bar pt-2 pb-3 mb-8 border-b border-white/10">
			<div class="flex flex-wrap gap-2 justify-center">
				{#each tabs as tab}
					<button
						onclick={() => setTab(tab.id)}
						class="tab-btn {activeTab === tab.id ? 'tab-active' : 'tab-inactive'}"
					>
						<span>{tab.icon}</span>
						<span>{$_(tab.labelKey)}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- ===== תנאי שימוש ===== -->
		{#if activeTab === 'terms'}
		<div class="doc-card">
			<div class="doc-header">
				<h2 class="doc-title">📋 {$_('aboutPages.terms_title')}</h2>
				<p class="doc-date">{$_('aboutPages.last_updated', { values: { date: '29/3/2026' } })}</p>
			</div>

			<div class="toc">
				<p class="toc-title">{$_('aboutPages.toc_title')}</p>
				<ol class="toc-list">
					{#each termsTocKeys as key}
						<li>{$_(key)}</li>
					{/each}
				</ol>
			</div>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s1_title')}</h3>
				<p>{$_('aboutPages.terms_s1_p1')}</p>
				<p>{$_('aboutPages.terms_s1_p2')}</p>
				<p>{$_('aboutPages.terms_s1_p3')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s2_title')}</h3>
				<p>{$_('aboutPages.terms_s2_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s2_1_title')}</h4>
				<p>{$_('aboutPages.terms_s2_1_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s2_2_title')}</h4>
				<p>{$_('aboutPages.terms_s2_2_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s2_3_title')}</h4>
				<p>{$_('aboutPages.terms_s2_3_p1')}</p>
				<ul class="bullet-list">
					{#each forbiddenContentKeys as key}
						<li>{$_(key)}</li>
					{/each}
				</ul>

				<h4 class="sub-title">{$_('aboutPages.terms_s2_4_title')}</h4>
				<p>{$_('aboutPages.terms_s2_4_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s2_5_title')}</h4>
				<p>{$_('aboutPages.terms_s2_5_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s3_title')}</h3>

				<h4 class="sub-title">{$_('aboutPages.terms_s3_1_title')}</h4>
				<p>{$_('aboutPages.terms_s3_1_p1')}</p>
				<p>{$_('aboutPages.terms_s3_1_p2')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s3_2_title')}</h4>
				<p>{$_('aboutPages.terms_s3_2_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s3_3_title')}</h4>
				<p>{$_('aboutPages.terms_s3_3_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s3_4_title')}</h4>
				<p>{$_('aboutPages.terms_s3_4_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s3_5_title')}</h4>
				<p>{$_('aboutPages.terms_s3_5_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s4_title')}</h3>

				<h4 class="sub-title">{$_('aboutPages.terms_s4_1_title')}</h4>
				<p>{$_('aboutPages.terms_s4_1_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s4_2_title')}</h4>
				<p>{$_('aboutPages.terms_s4_2_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s4_3_title')}</h4>
				<p>{$_('aboutPages.terms_s4_3_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s4_4_title')}</h4>
				<p>{$_('aboutPages.terms_s4_4_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s5_title')}</h3>
				<p>{$_('aboutPages.terms_s5_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s5_1_title')}</h4>
				<p>{$_('aboutPages.terms_s5_1_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s5_2_title')}</h4>
				<p>{$_('aboutPages.terms_s5_2_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s5_3_title')}</h4>
				<p>{$_('aboutPages.terms_s5_3_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s5_4_title')}</h4>
				<p>{$_('aboutPages.terms_s5_4_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s5_5_title')}</h4>
				<p>{$_('aboutPages.terms_s5_5_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s6_title')}</h3>

				<h4 class="sub-title">{$_('aboutPages.terms_s6_1_title')}</h4>
				<p>{$_('aboutPages.terms_s6_1_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s6_2_title')}</h4>
				<p>{$_('aboutPages.terms_s6_2_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s6_3_title')}</h4>
				<p>{$_('aboutPages.terms_s6_3_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s6_4_title')}</h4>
				<p>{$_('aboutPages.terms_s6_4_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s7_title')}</h3>

				<h4 class="sub-title">{$_('aboutPages.terms_s7_1_title')}</h4>
				<p>{$_('aboutPages.terms_s7_1_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s7_2_title')}</h4>
				<p>{$_('aboutPages.terms_s7_2_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s7_3_title')}</h4>
				<p>{$_('aboutPages.terms_s7_3_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s7_4_title')}</h4>
				<p>{$_('aboutPages.terms_s7_4_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s8_title')}</h3>

				<h4 class="sub-title">{$_('aboutPages.terms_s8_1_title')}</h4>
				<p>{$_('aboutPages.terms_s8_1_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s8_2_title')}</h4>
				<p>{$_('aboutPages.terms_s8_2_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.terms_s8_3_title')}</h4>
				<p>{$_('aboutPages.terms_s8_3_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s9_title')}</h3>
				<p>{$_('aboutPages.terms_s9_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s10_title')}</h3>
				<p>{$_('aboutPages.terms_s10_p1')}</p>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">{$_('aboutPages.terms_s11_title')}</h3>
				<p>{$_('aboutPages.terms_s11_p1')}</p>
				<div class="contact-grid">
					<a href="mailto:freedomhasbegun@gmail.com" class="contact-item">
						<span class="contact-icon">✉️</span>
						<span>freedomhasbegun@gmail.com</span>
					</a>
					<a href="tel:0508750632" class="contact-item">
						<span class="contact-icon">📞</span>
						<span dir="ltr">050‑8750632</span>
					</a>
				</div>
			</section>
		</div>
		{/if}

		<!-- ===== מדיניות פרטיות ו-Cookies ===== -->
		{#if activeTab === 'privacy'}
		<div class="doc-card">
			<div class="doc-header">
				<h2 class="doc-title">🔒 {$_('aboutPages.priv_title')}</h2>
				<p class="doc-date">{$_('aboutPages.last_updated', { values: { date: '29/3/2026' } })}</p>
			</div>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s1_title')}</h3>
				<p>{$_('aboutPages.priv_s1_p1')}</p>
				<p>{$_('aboutPages.priv_s1_p2')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s2_title')}</h3>

				<h4 class="sub-title">{$_('aboutPages.priv_s2_1_title')}</h4>
				<ul class="bullet-list">
					<li>{$_('aboutPages.priv_s2_1_li1')}</li>
					<li>{$_('aboutPages.priv_s2_1_li2')}</li>
					<li>{$_('aboutPages.priv_s2_1_li3')}</li>
					<li>{$_('aboutPages.priv_s2_1_li4')}</li>
				</ul>

				<h4 class="sub-title">{$_('aboutPages.priv_s2_2_title')}</h4>
				<ul class="bullet-list">
					<li>{$_('aboutPages.priv_s2_2_li1')}</li>
					<li>{$_('aboutPages.priv_s2_2_li2')}</li>
					<li>{$_('aboutPages.priv_s2_2_li3')}</li>
				</ul>

				<h4 class="sub-title">{$_('aboutPages.priv_s2_3_title')}</h4>
				<p>{$_('aboutPages.priv_s2_3_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.priv_s2_4_title')}</h4>
				<p>{$_('aboutPages.priv_s2_4_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s3_title')}</h3>
				<ul class="bullet-list">
					<li><strong>{$_('aboutPages.priv_s3_i1_t')}</strong> - {$_('aboutPages.priv_s3_i1_d')}</li>
					<li><strong>{$_('aboutPages.priv_s3_i2_t')}</strong> - {$_('aboutPages.priv_s3_i2_d')}</li>
					<li><strong>{$_('aboutPages.priv_s3_i3_t')}</strong> - {$_('aboutPages.priv_s3_i3_d')}</li>
					<li><strong>{$_('aboutPages.priv_s3_i4_t')}</strong> - {$_('aboutPages.priv_s3_i4_d')}</li>
					<li><strong>{$_('aboutPages.priv_s3_i5_t')}</strong> - {$_('aboutPages.priv_s3_i5_d')}</li>
					<li><strong>{$_('aboutPages.priv_s3_i6_t')}</strong> - {$_('aboutPages.priv_s3_i6_d')}</li>
					<li><strong>{$_('aboutPages.priv_s3_i7_t')}</strong> - {$_('aboutPages.priv_s3_i7_d')}</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s4_title')}</h3>
				<p>{$_('aboutPages.priv_s4_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s5_title')}</h3>

				<h4 class="sub-title">{$_('aboutPages.priv_s5_1_title')}</h4>
				<p>{$_('aboutPages.priv_s5_1_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.priv_s5_2_title')}</h4>
				<ul class="bullet-list">
					<li>{$_('aboutPages.priv_s5_2_li1')}</li>
					<li>{$_('aboutPages.priv_s5_2_li2')}</li>
					<li>{$_('aboutPages.priv_s5_2_li3')}</li>
					<li>{$_('aboutPages.priv_s5_2_li4')}</li>
					<li>{$_('aboutPages.priv_s5_2_li5')}</li>
				</ul>

				<h4 class="sub-title">{$_('aboutPages.priv_s5_3_title')}</h4>
				<p>{$_('aboutPages.priv_s5_3_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s6_title')}</h3>
				<p>{$_('aboutPages.priv_s6_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s7_title')}</h3>
				<p>{$_('aboutPages.priv_s7_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s8_title')}</h3>
				<p>{$_('aboutPages.priv_s8_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s9_title')}</h3>
				<p>{$_('aboutPages.priv_s9_p1')}</p>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">{$_('aboutPages.priv_s10_title')}</h3>
				<p>{$_('aboutPages.priv_s10_p1')}</p>
				<div class="contact-grid">
					<a href="mailto:freedomhasbegun@gmail.com" class="contact-item">
						<span class="contact-icon">✉️</span>
						<span>freedomhasbegun@gmail.com</span>
					</a>
					<a href="tel:0508750632" class="contact-item">
						<span class="contact-icon">📞</span>
						<span dir="ltr">050‑8750632</span>
					</a>
				</div>
			</section>
		</div>
		{/if}

		<!-- ===== תקנון האתר ===== -->
		{#if activeTab === 'regulations'}
		<div class="doc-card">
			<div class="doc-header">
				<h2 class="doc-title">📜 {$_('aboutPages.reg_title')}</h2>
			</div>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s1_title')}</h3>
				<p>{$_('aboutPages.reg_s1_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.reg_s1_1_title')}</h4>
				<p>{$_('aboutPages.reg_s1_1_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.reg_s1_2_title')}</h4>
				<p>{$_('aboutPages.reg_s1_2_p1')}</p>

				<h4 class="sub-title">{$_('aboutPages.reg_s1_3_title')}</h4>
				<p>{$_('aboutPages.reg_s1_3_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s2_title')}</h3>
				<p>{$_('aboutPages.reg_s2_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s3_title')}</h3>
				<p><strong>{$_('aboutPages.reg_s3_allowed_l')}</strong> {$_('aboutPages.reg_s3_allowed_d')}</p>
				<p><strong>{$_('aboutPages.reg_s3_forbidden_l')}</strong> {$_('aboutPages.reg_s3_forbidden_d')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s4_title')}</h3>
				<p>{$_('aboutPages.reg_s4_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s5_title')}</h3>
				<p>{$_('aboutPages.reg_s5_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s6_title')}</h3>
				<p>{$_('aboutPages.reg_s6_p1')}
					<button onclick={() => setTab('privacy')} class="inline-link">{$_('aboutPages.reg_s6_link')}</button>
				</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s7_title')}</h3>
				<p>{$_('aboutPages.reg_s7_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s8_title')}</h3>
				<p>{$_('aboutPages.reg_s8_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s9_title')}</h3>
				<p>{$_('aboutPages.reg_s9_p1')}</p>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">{$_('aboutPages.reg_s10_title')}</h3>
				<div class="contact-grid">
					<a href="mailto:freedomhasbegun@gmail.com" class="contact-item">
						<span class="contact-icon">✉️</span>
						<span>freedomhasbegun@gmail.com</span>
					</a>
					<a href="tel:0508750632" class="contact-item">
						<span class="contact-icon">📞</span>
						<span dir="ltr">050‑8750632</span>
					</a>
				</div>
			</section>
		</div>
		{/if}

		<!-- ===== הצהרת נגישות ===== -->
		{#if activeTab === 'accessibility'}
		<div class="doc-card">
			<div class="doc-header">
				<h2 class="doc-title">♿ {$_('aboutPages.tab_accessibility')}</h2>
				<p class="text-gray-400 text-sm mt-1">{$_('aboutPages.acc_updated')}</p>
			</div>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.la_s1_title')}</h3>
				<p>{$_('aboutPages.la_s1_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.la_s2_title')}</h3>
				<p>{$_('aboutPages.la_s2_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.la_s3_title')}</h3>
				<ul class="bullet-list">
					<li><strong>{$_('aboutPages.la_s3_i1_l')}</strong> - {$_('aboutPages.la_s3_i1_d')}</li>
					<li><strong>{$_('aboutPages.la_s3_i2_l')}</strong> - {$_('aboutPages.la_s3_i2_d')}</li>
					<li><strong>{$_('aboutPages.la_s3_i3_l')}</strong> - {$_('aboutPages.la_s3_i3_d')}</li>
					<li><strong>{$_('aboutPages.la_s3_i4_l')}</strong> - {$_('aboutPages.la_s3_i4_d')}</li>
					<li><strong>{$_('aboutPages.la_s3_i5_l')}</strong> - {$_('aboutPages.la_s3_i5_d')}</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.adapt_title')}</h3>
				<ul class="bullet-list">
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i1_pre')}<code lang="en" class="text-blue-300">lang="he" dir="rtl"</code>{$_('aboutPages.adapt_i1_post')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i2')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i3_pre')}<code lang="en" class="text-blue-300">aria-label</code>{$_('aboutPages.adapt_i3_post')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.la_i4')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.la_i5_pre')}<code lang="en" class="text-blue-300">aria-live</code></li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i6_pre')}<code lang="en" class="text-blue-300">aria-haspopup</code>{$_('aboutPages.adapt_i6_mid')}<code lang="en" class="text-blue-300">aria-expanded</code>{$_('aboutPages.adapt_i6_post')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.la_i7_pre')}<code lang="en" class="text-blue-300">prefers-reduced-motion</code></li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i8_pre')}<code lang="en" class="text-blue-300">alt=""</code>{$_('aboutPages.adapt_i8_post')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i9_pre')}<code lang="en" class="text-blue-300">h1 → h2 → h3</code>{$_('aboutPages.adapt_i9_post')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i10')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i11')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i12')}</li>
					<li><strong class="text-green-400">✓</strong> {$_('aboutPages.adapt_i13_pre')}<code lang="en" class="text-blue-300">&lt;label&gt;</code>{$_('aboutPages.adapt_i13_post')}</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.known_limits_title')}</h3>
				<ul class="bullet-list">
					<li><strong class="text-yellow-400">⚠</strong> {$_('aboutPages.lim1')}</li>
					<li><strong class="text-yellow-400">⚠</strong> {$_('aboutPages.lim2')}</li>
					<li><strong class="text-yellow-400">⚠</strong> {$_('aboutPages.la_lim3')}</li>
				</ul>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.la_s6_title')}</h3>
				<p>{$_('aboutPages.la_s6_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.la_s7_title')}</h3>
				<p>{$_('aboutPages.la_s7_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.la_s8_title')}</h3>
				<p>{$_('aboutPages.la_s8_p1')}</p>
			</section>

			<section class="sec">
				<h3 class="sec-title">{$_('aboutPages.la_s9_title')}</h3>
				<ul class="bullet-list">
					<li>{$_('aboutPages.la_s9_li1')}</li>
					<li>{$_('aboutPages.la_s9_li2')}</li>
					<li>{$_('aboutPages.la_s9_li3')}</li>
					<li>{$_('aboutPages.la_s9_li4')}</li>
					<li>{$_('aboutPages.la_s9_li5')}</li>
				</ul>
			</section>

			<section class="sec contact-sec">
				<h3 class="sec-title">{$_('aboutPages.la_s10_title')}</h3>
				<p>{$_('aboutPages.la_s10_p1')}</p>
				<div class="contact-grid">
					<a href="mailto:freedomhasbegun@gmail.com" class="contact-item">
						<span class="contact-icon">✉️</span>
						<span>freedomhasbegun@gmail.com</span>
					</a>
					<a href="tel:0508750632" class="contact-item">
						<span class="contact-icon">📞</span>
						<span dir="ltr">050‑8750632</span>
					</a>
				</div>
			</section>
		</div>
		{/if}

		<!-- חזרה לדף הבית + עלה לראש -->
		<div class="flex items-center justify-center gap-3 mt-10 flex-wrap">
			<a href="/" class="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-all">
				{$_('aboutPages.back_home')}
			</a>
			<button
				onclick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
				class="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-purple-500/30"
			>
				{$_('aboutPages.back_top')}
			</button>
		</div>
	</div>
</div>

<style>
	.page-bg {
		background: linear-gradient(135deg, #0d0b2e 0%, #0f172a 35%, #1a0a3d 65%, #0c1a3a 100%);
	}

	.tabs-bar {
		background: rgba(10, 8, 40, 0.92);
		backdrop-filter: blur(10px);
	}

	.tab-btn {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.55rem 1.1rem;
		border-radius: 9999px;
		font-weight: 800;
		font-size: 0.88rem;
		transition: all 0.2s;
		border: 2px solid transparent;
		cursor: pointer;
	}
	.tab-active {
		background: linear-gradient(135deg, #2563eb, #7c3aed);
		color: #fff;
		border-color: #a78bfa;
		box-shadow: 0 0 18px rgba(124,58,237,0.55), 0 0 6px rgba(37,99,235,0.4);
	}
	.tab-inactive {
		background: rgba(255,255,255,0.08);
		color: #c4b5fd;
		border-color: rgba(167,139,250,0.25);
	}
	.tab-inactive:hover {
		background: rgba(124,58,237,0.2);
		color: #e9d5ff;
		border-color: rgba(167,139,250,0.5);
	}

	.doc-card {
		background: linear-gradient(135deg, rgba(13,11,46,0.97), rgba(30,20,80,0.85));
		border: 1px solid rgba(139,92,246,0.35);
		border-radius: 1.25rem;
		padding: 2rem;
		backdrop-filter: blur(8px);
	}
	@media (max-width: 640px) {
		.doc-card { padding: 1.25rem; }
	}

	.doc-header {
		border-bottom: 1px solid rgba(255,255,255,0.1);
		padding-bottom: 1.25rem;
		margin-bottom: 1.75rem;
	}
	.doc-title {
		font-size: 1.85rem;
		font-weight: 900;
		background: linear-gradient(to left, #60a5fa, #a78bfa, #f472b6);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		margin-bottom: 0.4rem;
	}
	.doc-date {
		color: #6b7280;
		font-size: 0.95rem;
	}

	.toc {
		background: rgba(59,130,246,0.08);
		border: 1px solid rgba(59,130,246,0.2);
		border-radius: 0.75rem;
		padding: 1rem 1.25rem;
		margin-bottom: 1.75rem;
	}
	.toc-title {
		font-weight: 800;
		color: #93c5fd;
		margin-bottom: 0.6rem;
		font-size: 1rem;
	}
	.toc-list {
		list-style: decimal;
		padding-right: 1.2rem;
		color: #9ca3af;
		font-size: 0.95rem;
		line-height: 1.8;
	}

	.sec {
		margin-bottom: 2rem;
		padding-bottom: 1.5rem;
		border-bottom: 1px solid rgba(255,255,255,0.06);
	}
	.sec:last-child {
		border-bottom: none;
		margin-bottom: 0;
	}

	.sec-title {
		font-size: 1.2rem;
		font-weight: 800;
		color: #e2e8f0;
		margin-bottom: 0.75rem;
		padding-right: 0.75rem;
		border-right: 3px solid #8b5cf6;
	}

	.sub-title {
		font-size: 1.05rem;
		font-weight: 700;
		color: #a78bfa;
		margin: 0.9rem 0 0.45rem;
	}

	.sec p {
		color: #cbd5e1;
		font-size: 1rem;
		line-height: 1.9;
		margin-bottom: 0.5rem;
	}

	.bullet-list {
		list-style: none;
		padding: 0;
		margin: 0.5rem 0;
	}
	.bullet-list li {
		color: #cbd5e1;
		font-size: 1rem;
		line-height: 1.85;
		padding-right: 1.1rem;
		position: relative;
	}
	.bullet-list li::before {
		content: '•';
		position: absolute;
		right: 0;
		color: #8b5cf6;
		font-weight: 900;
	}

	.contact-sec { background: rgba(139,92,246,0.06); border-radius: 0.75rem; padding: 1.25rem; }

	.contact-grid {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}
	.contact-item {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(255,255,255,0.06);
		border: 1px solid rgba(255,255,255,0.1);
		border-radius: 0.6rem;
		padding: 0.6rem 1rem;
		color: #e2e8f0;
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		transition: background 0.2s;
	}
	.contact-item:hover { background: rgba(139,92,246,0.2); }
	.contact-icon { font-size: 1.1rem; }

	.inline-link {
		background: none;
		border: none;
		color: #818cf8;
		cursor: pointer;
		font-size: 0.95rem;
		padding: 0;
		text-decoration: underline;
		margin-right: 0.25rem;
	}
	.inline-link:hover { color: #a5b4fc; }
</style>

<script lang="ts">
    import { _ } from 'svelte-i18n';
</script>

<svelte:head>
    <title>הצהרת נגישות | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen py-12 px-4">
    <div class="max-w-3xl mx-auto">

        <!-- כותרת -->
        <div class="mb-10">
            <h2 class="text-4xl font-black bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-3">
                {$_('aboutPages.tab_accessibility')}
            </h2>
            <p class="text-gray-400 text-sm">{$_('aboutPages.acc_updated')}</p>
        </div>

        <!-- תיאור כללי -->
        <section class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6" aria-labelledby="general-heading">
            <h3 id="general-heading" class="text-xl font-bold text-white mb-3">{$_('aboutPages.acc_general_title')}</h3>
            <p class="text-gray-300 leading-relaxed mb-3">
                {$_('aboutPages.acc_general_p1')}
            </p>
            <p class="text-gray-300 leading-relaxed">
                {$_('aboutPages.acc_general_p2')}
            </p>
        </section>

        <!-- ההתאמות שבוצעו -->
        <section class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6" aria-labelledby="adaptations-heading">
            <h3 id="adaptations-heading" class="text-xl font-bold text-white mb-4">{$_('aboutPages.adapt_title')}</h3>
            <ul class="space-y-3 text-gray-300">
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i1_pre')}<code lang="en" class="text-blue-300">lang="he" dir="rtl"</code>{$_('aboutPages.adapt_i1_post')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i2')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i3_pre')}<code lang="en" class="text-blue-300">aria-label</code>{$_('aboutPages.adapt_i3_post')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.acc_i4')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.acc_i5_pre')}<code lang="en" class="text-blue-300">aria-live</code></span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i6_pre')}<code lang="en" class="text-blue-300">aria-haspopup</code>{$_('aboutPages.adapt_i6_mid')}<code lang="en" class="text-blue-300">aria-expanded</code>{$_('aboutPages.adapt_i6_post')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.acc_i7_pre')}<code lang="en" class="text-blue-300">prefers-reduced-motion</code>{$_('aboutPages.acc_i7_post')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i8_pre')}<code lang="en" class="text-blue-300">alt=""</code>{$_('aboutPages.adapt_i8_post')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i9_pre')}<code lang="en" class="text-blue-300">h1 → h2 → h3</code>{$_('aboutPages.adapt_i9_post')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i10')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i11')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i12')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-green-400 font-bold flex-shrink-0" aria-hidden="true">✓</span>
                    <span>{$_('aboutPages.adapt_i13_pre')}<code lang="en" class="text-blue-300">&lt;label&gt;</code>{$_('aboutPages.adapt_i13_post')}</span>
                </li>
            </ul>
        </section>

        <!-- תקלות ידועות -->
        <section class="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6" aria-labelledby="issues-heading">
            <h3 id="issues-heading" class="text-xl font-bold text-white mb-3">{$_('aboutPages.known_limits_title')}</h3>
            <ul class="space-y-2 text-gray-300">
                <li class="flex items-start gap-2">
                    <span class="text-yellow-400 flex-shrink-0" aria-hidden="true">⚠</span>
                    <span>{$_('aboutPages.lim1')}</span>
                </li>
                <li class="flex items-start gap-2">
                    <span class="text-yellow-400 flex-shrink-0" aria-hidden="true">⚠</span>
                    <span>{$_('aboutPages.lim2')}</span>
                </li>
            </ul>
        </section>

        <!-- פרטי קשר -->
        <section class="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-6 mb-6" aria-labelledby="contact-heading">
            <h3 id="contact-heading" class="text-xl font-bold text-white mb-3">{$_('aboutPages.acc_contact_title')}</h3>
            <p class="text-gray-300 mb-4">
                {$_('aboutPages.acc_contact_p1')}
            </p>
            <div class="space-y-2 text-gray-300">
                <p>
                    <strong class="text-white">{$_('aboutPages.acc_email_label')}</strong>
                    <a href="mailto:freedomhasbegun@gmail.com" class="text-blue-400 hover:text-blue-300 underline mr-2">
                        freedomhasbegun@gmail.com
                    </a>
                </p>
                <p class="text-sm text-gray-400">
                    {$_('aboutPages.acc_reply_time')}
                </p>
            </div>
        </section>

        <!-- חזרה לדף הבית -->
        <div class="text-center mt-8">
            <a
                href="/"
                class="inline-block bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-bold transition-all"
                aria-label={$_('aboutPages.back_home_aria')}
            >
                {$_('aboutPages.back_home')}
            </a>
        </div>

    </div>
</div>

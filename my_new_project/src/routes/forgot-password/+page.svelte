<script lang="ts">
    import { enhance } from '$app/forms';
    import { _ } from 'svelte-i18n';
    import type { ActionData, PageData } from './$types';

    let { form, data }: { form: ActionData; data: PageData } = $props();
    let loading = $state(false);

    let isLocked = $derived((data as any)?.locked || (form as any)?.locked);
    let lockedEmail = $derived((data as any)?.email || (form as any)?.email || '');
</script>

<svelte:head>
    <title>שחזור סיסמה | קהילה בשכונה</title>
    <meta name="robots" content="noindex, follow" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-[#070b14] px-4" dir="rtl">
    <div class="max-w-md w-full">
        <div class="bg-[#0f172a] rounded-2xl border border-white/10 p-8">
            <div class="text-center mb-6">
                <div class="text-4xl mb-3">{isLocked ? '🔒' : '🔑'}</div>
                <h1 class="text-2xl font-bold text-white">{isLocked ? $_('account.locked_title') : $_('account.forgot_title')}</h1>
                <p class="text-white/50 text-sm mt-1">
                    {#if isLocked}
                        {$_('account.locked_subtitle')}
                    {:else if (form as any)?.hasQuestion}
                        {$_('account.security_question_subtitle')}
                    {:else}
                        {$_('account.reset_link_subtitle')}
                    {/if}
                </p>
            </div>

            {#if isLocked}
                <!-- חשבון ננעל -->
                <div class="text-center">
                    <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-5 mb-6">
                        <p class="text-red-400 font-semibold mb-2">{$_('account.locked_after_attempts')}</p>
                        <p class="text-white/60 text-sm">{$_('account.locked_coordinator_notified')}</p>
                    </div>
                    <p class="text-white/40 text-xs">{$_('account.locked_email', { values: { email: lockedEmail } })}</p>
                    <a href="/" class="mt-6 block text-purple-400 hover:underline text-sm">{$_('back_home')}</a>
                </div>

            {:else if form?.success}
                <div class="text-center">
                    <div class="text-5xl mb-4">📧</div>
                    <p class="text-green-400 font-semibold mb-2">{$_('account.email_sent_ok')}</p>
                    <p class="text-white/60 text-sm">{$_('account.email_sent_note')}</p>
                    <a href="/login" class="mt-6 block text-purple-400 hover:underline text-sm">{$_('account.back_to_login')}</a>
                </div>

            {:else if form?.hasQuestion}
                <!-- שלב 2: שאלת ביטחון -->
                <form method="POST" action="?/verifyAnswer" use:enhance={() => {
                    loading = true;
                    return async ({ update }) => { await update(); loading = false; };
                }}>
                    <input type="hidden" name="email" value={form.email} />

                    {#if (form as any)?.error}
                        <p class="text-red-400 text-sm mb-4 text-center">{(form as any).error}</p>
                    {/if}

                    <div class="mb-2">
                        <p class="text-white/50 text-xs mb-1">{$_('account.your_security_question')}</p>
                        <p class="text-white font-semibold mb-4 bg-white/5 rounded-xl px-4 py-3">{(form as any).question}</p>
                    </div>

                    <div class="mb-6">
                        <label class="block text-white/70 text-sm mb-1">{$_('account.answer_label')}</label>
                        <input
                            type="text"
                            name="answer"
                            required
                            autofocus
                            placeholder={$_('account.answer_placeholder')}
                            class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? $_('account.checking') : $_('account.verify_and_send')}
                    </button>

                    <div class="text-center mt-4">
                        <a href="/forgot-password" class="text-white/40 hover:text-white/70 text-sm transition">{$_('account.try_another_email')}</a>
                    </div>
                </form>

            {:else}
                <!-- שלב 1: הזנת אימייל -->
                <form method="POST" action="?/checkEmail" use:enhance={() => {
                    loading = true;
                    return async ({ update }) => { await update(); loading = false; };
                }}>
                    {#if form?.error}
                        <p class="text-red-400 text-sm mb-4 text-center">{form.error}</p>
                    {/if}

                    <div class="mb-4">
                        <label class="block text-white/70 text-sm mb-1">{$_('account.email_address_label')}</label>
                        <input
                            type="email"
                            name="email"
                            required
                            placeholder="your@email.com"
                            class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? $_('account.checking') : $_('account.continue_btn')}
                    </button>

                    <div class="text-center mt-4">
                        <a href="/login" class="text-white/40 hover:text-white/70 text-sm transition">{$_('account.back_to_login')}</a>
                    </div>
                </form>
            {/if}
        </div>
    </div>
</div>


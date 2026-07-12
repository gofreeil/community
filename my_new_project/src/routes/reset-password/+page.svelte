<script lang="ts">
    import { enhance } from '$app/forms';
    import { signIn } from '@auth/sveltekit/client';
    import { _ } from 'svelte-i18n';
    import type { ActionData, PageData } from './$types';

    let { form, data }: { form: ActionData; data: PageData } = $props();
    let loading = $state(false);
    let showPassword = $state(false);

    // חיבור אוטומטי אחרי איפוס מוצלח: עוגיית strapi_handoff כבר נשתלה בשרת -
    // signIn בלי פרטים מרים סשן ממנה (handoff). אין צורך בלוגין ידני נוסף.
    let autoLoginStarted = $state(false);
    let autoLoginFailed  = $state(false);
    $effect(() => {
        if (form?.success && form?.autoLogin && !autoLoginStarted) {
            autoLoginStarted = true;
            // לא מאפסים את הדגל בכשל (מונע לולאת signIn אינסופית)
            signIn('credentials', { callbackUrl: '/profile' }).catch(() => {
                autoLoginFailed = true;
            });
        }
    });
</script>

<svelte:head>
    <title>איפוס סיסמה | קהילה בשכונה</title>
    <meta name="robots" content="noindex, follow" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-[#070b14] px-4" dir="rtl">
    <div class="max-w-md w-full">
        <div class="bg-[#0f172a] rounded-2xl border border-white/10 p-8">
            <div class="text-center mb-6">
                <div class="text-4xl mb-3">🔒</div>
                <h1 class="text-2xl font-bold text-white">{$_('account.reset_title')}</h1>
                <p class="text-white/50 text-sm mt-1">{$_('account.reset_subtitle')}</p>
            </div>

            {#if form?.success && form?.autoLogin}
                <div class="text-center">
                    <div class="text-5xl mb-4">✅</div>
                    <p class="text-green-400 font-semibold mb-2">{$_('account.password_updated')}</p>
                    {#if autoLoginFailed}
                        <p class="text-white/60 text-sm mb-4">{$_('account.password_updated_note')}</p>
                        <a href="/login" class="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition">
                            {$_('account.login_to_account')}
                        </a>
                    {:else}
                        <p class="text-white/60 text-sm mb-4">{$_('account.password_updated_connecting')}</p>
                        <span class="inline-block w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    {/if}
                </div>
            {:else if form?.success}
                <div class="text-center">
                    <div class="text-5xl mb-4">✅</div>
                    <p class="text-green-400 font-semibold mb-2">{$_('account.password_updated')}</p>
                    <p class="text-white/60 text-sm mb-6">{$_('account.password_updated_note')}</p>
                    <a href="/login" class="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition">
                        {$_('account.login_to_account')}
                    </a>
                </div>
            {:else if !data.code}
                <div class="text-center">
                    <p class="text-red-400">{$_('account.invalid_link')} <a href="/forgot-password" class="underline">{$_('account.request_new_link')}</a>.</p>
                </div>
            {:else}
                <form method="POST" use:enhance={() => {
                    loading = true;
                    return async ({ update }) => { await update(); loading = false; };
                }}>
                    <input type="hidden" name="code" value={data.code} />

                    {#if form?.error}
                        <p class="text-red-400 text-sm mb-4 text-center">{form.error}</p>
                    {/if}

                    <div class="mb-4">
                        <label class="block text-white/70 text-sm mb-1">{$_('account.new_password_label')}</label>
                        <div class="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                required
                                minlength="6"
                                placeholder={$_('password_min')}
                                class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                            />
                            <button type="button" onclick={() => showPassword = !showPassword}
                                class="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 text-sm">
                                {showPassword ? $_('account.hide_short') : $_('account.show_short')}
                            </button>
                        </div>
                    </div>

                    <div class="mb-6">
                        <label class="block text-white/70 text-sm mb-1">{$_('account.confirm_password')}</label>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            name="passwordConfirm"
                            required
                            placeholder={$_('account.repeat_password_placeholder')}
                            class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        class="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                    >
                        {loading ? $_('account.updating') : $_('account.update_password')}
                    </button>
                </form>
            {/if}
        </div>
    </div>
</div>

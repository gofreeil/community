<script lang="ts">
    import { page } from '$app/stores';
    import { signIn } from '@auth/sveltekit/client';
    import { onMount } from 'svelte';
    import { _ } from 'svelte-i18n';

    // הבאקאנד מאשר את החשבון ומפנה לכאן עם #jwt=<טוקן קצר-מועד> (fragment -
    // לא מגיע לשרתים/לוגים). שולחים אותו ל-/api/auth-handoff שמאמת ושותל עוגייה,
    // ואז signIn('credentials') מרים סשן ממנה - המשתמש מחובר בלי להקליד כלום.
    // אין jwt (מיילים ישנים / כשל) → נשארים עם המסך הסטטי וקישור לכניסה.
    let autoLogin = $state<'trying' | 'failed' | null>(null);

    onMount(async () => {
        const m = window.location.hash.match(/#jwt=([^&]+)/);
        if (!m) return;
        autoLogin = 'trying';
        // מנקים את הטוקן מהכתובת (היסטוריית דפדפן)
        history.replaceState(null, '', window.location.pathname + window.location.search);
        try {
            const res = await fetch('/api/auth-handoff', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ jwt: decodeURIComponent(m[1]) }),
            });
            if (!res.ok) throw new Error('handoff failed');
            await signIn('credentials', { callbackUrl: '/profile?welcome=1' });
            // אם הניווט לא קרה - נציג את הקישור הידני
            setTimeout(() => { if (autoLogin === 'trying') autoLogin = 'failed'; }, 6000);
        } catch {
            autoLogin = 'failed';
        }
    });
</script>

<svelte:head>
    <title>אישור כתובת אימייל | קהילה בשכונה</title>
    <meta name="robots" content="noindex, follow" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-[#070b14] px-4" dir="rtl">
    <div class="max-w-md w-full text-center">
        {#if $page.url.searchParams.get('error')}
            <div class="text-6xl mb-6">❌</div>
            <h1 class="text-2xl font-bold text-white mb-3">{$_('account.verify_failed_title')}</h1>
            <p class="text-white/60 mb-6">{$_('account.verify_failed_desc')}</p>
            <a href="/login" class="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition">
                {$_('account.login_to_account')}
            </a>
        {:else if autoLogin === 'trying'}
            <div class="text-6xl mb-6">✅</div>
            <h1 class="text-2xl font-bold text-white mb-3">{$_('account.email_confirmed_title')}</h1>
            <p class="text-white/60 mb-6">{$_('account.confirming_connecting')}</p>
            <span class="inline-block w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
        {:else}
            <div class="text-6xl mb-6">✅</div>
            <h1 class="text-2xl font-bold text-white mb-3">{$_('account.email_confirmed_title')}</h1>
            <p class="text-white/60 mb-6">{$_('account.email_confirmed_desc')}</p>
            <a href="/login" class="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold hover:opacity-90 transition">
                {$_('account.login_to_account')}
            </a>
        {/if}
    </div>
</div>

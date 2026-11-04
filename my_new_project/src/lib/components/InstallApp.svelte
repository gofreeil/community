<script lang="ts">
    import { onMount } from 'svelte';
    import { t, locale } from 'svelte-i18n';
    import { get } from 'svelte/store';

    // compact = כפתור אייקון בלבד (הדר מובייל, שם אין מקום לטקסט)
    // floating = כפתור עגול צף על המסך (מובייל) עד שהמשתמש לוחץ עליו
    let { compact = false, floating = false }: { compact?: boolean; floating?: boolean } = $props();
    let dismissed = $state(false);
    const KEY = 'install_fab_dismissed';
    $effect(() => {
        if (!floating) return;
        try { dismissed = localStorage.getItem(KEY) === '1'; } catch { /* ignore */ }
    });

    // האירוע של כרום/אדג׳ (אנדרואיד + דסקטופ). בספארי/פיירפוקס אין אותו — שם מציגים הוראות.
    type InstallEvent = Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
    };
    // app.html תופס את האירוע מוקדם (לפני שהרכיב נטען) ושומר אותו כאן
    const win = () => window as unknown as { __bip?: InstallEvent | null };

    // tFn: תרגום reactive - $t אסור ב-Svelte 5 (כמו ב-Header)
    let _loc = $state(get(locale));
    $effect(() => locale.subscribe((l) => (_loc = l)));
    const tFn = (k: string) => { void _loc; return get(t)(k); };

    let deferred = $state<InstallEvent | null>(null);
    let installed = $state(false);
    let kind = $state<'ios' | 'android' | 'desktop'>('desktop');
    let dlg = $state<HTMLDialogElement>();

    onMount(() => {
        installed =
            matchMedia('(display-mode: standalone)').matches ||
            (navigator as unknown as { standalone?: boolean }).standalone === true;

        const ua = navigator.userAgent;
        if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) kind = 'ios';
        else if (/android/i.test(ua)) kind = 'android';

        deferred = win().__bip ?? null;

        const onPrompt = (e: Event) => {
            e.preventDefault();
            deferred = e as InstallEvent;
        };
        const onInstalled = () => {
            installed = true;
            deferred = null;
            win().__bip = null;
        };
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    });

    async function install() {
        if (!deferred) {
            dlg?.showModal(); // אין חלון התקנה אוטומטי בדפדפן הזה — מראים איך מתקינים ידנית
            return;
        }
        const ev = deferred;
        deferred = null; // אפשר לקרוא ל-prompt() פעם אחת בלבד לכל אירוע
        win().__bip = null;
        try {
            await ev.prompt();
            await ev.userChoice;
        } catch {
            dlg?.showModal(); // האירוע כבר נוצל (למשל בעותק השני של הכפתור) — מציגים הוראות ידניות
        }
    }
</script>

{#if !installed}
    {#if !(floating && dismissed)}
    <button
        type="button"
        class="install"
        class:compact
        class:floating
        onclick={() => {
            if (floating) {
                dismissed = true;
                try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ }
            }
            install();
        }}
        aria-label={compact || floating ? tFn('chrome.install_app') : undefined}
        title={tFn('chrome.install_app')}
    >
        {#if compact || floating}
            <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12m0 0l-5-5m5 5l5-5M5 21h14"/></svg>
        {:else}
            <span>{tFn('chrome.install_app')}</span>
        {/if}
    </button>
    {/if}

    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <dialog bind:this={dlg} aria-labelledby="install-title" onclick={(e) => e.target === dlg && dlg?.close()}>
        <div class="box">
            <h2 id="install-title">{tFn('chrome.install_app')}</h2>
            {#if kind === 'ios'}
                <ol>
                    <li>{tFn('chrome.install_ios_1')}</li>
                    <li>{tFn('chrome.install_ios_2')}</li>
                    <li>{tFn('chrome.install_ios_3')}</li>
                </ol>
                <p class="note">{tFn('chrome.install_ios_note')}</p>
            {:else if kind === 'android'}
                <ol>
                    <li>{tFn('chrome.install_android_1')}</li>
                    <li>{tFn('chrome.install_android_2')}</li>
                </ol>
                <p class="note">{tFn('chrome.install_android_note')}</p>
            {:else}
                <ol>
                    <li>{tFn('chrome.install_desktop_1')}</li>
                    <li>{tFn('chrome.install_desktop_2')}</li>
                </ol>
            {/if}
            <button type="button" class="close" onclick={() => dlg?.close()}>{tFn('chrome.install_close')}</button>
        </div>
    </dialog>
{/if}

<style>
    .install {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        font: inherit;
        font-weight: 700;
        font-size: 0.875rem;
        padding: 8px 14px;
        border-radius: 8px;
        white-space: nowrap;
        cursor: pointer;
        color: #d1fae5;
        background: rgba(16, 185, 129, 0.16);
        border: 1px solid rgba(52, 211, 153, 0.55);
        transition: background 0.15s ease, transform 0.15s ease;
    }
    .install:hover { background: rgba(16, 185, 129, 0.3); transform: scale(1.05); }
    .install.compact { width: 32px; height: 32px; padding: 0; font-size: 1rem; }
    .install.floating {
        position: fixed;
        bottom: 5.5rem;
        inset-inline-end: 12px;
        z-index: 90;
        width: 46px;
        height: 46px;
        padding: 0;
        border-radius: 50%;
        color: #fff;
        background: #059669;
        border-color: rgba(255, 255, 255, 0.5);
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.45);
    }
    @media (min-width: 1024px) {
        .install.floating { display: none; }
    }
    /* טלפונים צרים מאוד: אין מקום — כל הרוחב נחוץ לשם המותג בהדר */
    @media (max-width: 339px) {
        .install.compact { display: none; }
    }
    /* כבר מותקנת (פתוחה כאפליקציה) — מסתירים גם לפני שה-JS רץ, בלי הבהוב */
    @media (display-mode: standalone) {
        .install { display: none; }
    }

    dialog {
        margin: auto; /* ה-reset של Tailwind מאפס את margin:auto שמרכז dialog מודאלי */
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 18px;
        padding: 0;
        width: min(92vw, 380px);
        background: #0f172a;
        color: #f1f5f9;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
    }
    dialog::backdrop { background: rgba(0, 0, 0, 0.6); }
    .box { padding: 18px 20px 16px; }
    h2 { margin: 0 0 10px; font-size: 1.1rem; font-weight: 800; }
    ol { margin: 0; padding-inline-start: 1.3rem; line-height: 1.7; font-size: 0.95rem; }
    .note { margin: 8px 0 0; font-size: 0.82rem; color: #94a3b8; }
    .close {
        display: block;
        margin: 14px 0 0;
        margin-inline-start: auto;
        font: inherit;
        font-weight: 700;
        padding: 8px 22px;
        border: 0;
        border-radius: 999px;
        cursor: pointer;
        color: #fff;
        background: linear-gradient(135deg, #2563eb, #7c3aed);
    }
</style>

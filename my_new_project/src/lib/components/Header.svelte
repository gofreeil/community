<script lang="ts">
    import { locale, t } from "svelte-i18n";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";
    import { fade } from "svelte/transition";
    import { ads, type Ad } from "$lib/adsData";
    import FullAdModal from "./FullAdModal.svelte";

    interface Props {
        currentUser?: any;
        onLogout?: () => void;
        onShowAuth?: () => void;
    }

    let { currentUser, onLogout, onShowAuth }: Props = $props();

    let languages = [
        { name: "עברית", code: "he", flag: "il" },
        { name: "English", code: "en", flag: "us" },
        { name: "русский", code: "ru", flag: "ru" },
    ];

    let showLangDropdown = $state(false);
    let onlineUsers = $state(1);

    // Ads Mode Logic
    let showAdsMode = $state(false);
    let currentAdIndex = $state(0);
    let selectedAdForModal = $state<Ad | null>(null);

    function changeLang(language: { name: string; code: string }) {
        locale.set(language.code);
    }

    function updateOnlineUsers() {
        onlineUsers = Math.floor(Math.random() * 15) + 1;
    }

    onMount(() => {
        updateOnlineUsers();
        const usersInterval = setInterval(updateOnlineUsers, 30000);

        // Switch to Ads Mode after 10 seconds
        const adsTimer = setTimeout(() => {
            showAdsMode = true;
        }, 10000);

        // Rotate ads every 5 seconds when in Ads Mode
        const rotateAdsInterval = setInterval(() => {
            if (showAdsMode) {
                currentAdIndex = (currentAdIndex + 1) % ads.length;
            }
        }, 10000);

        document.addEventListener("click", handleClickOutside);
        return () => {
            clearInterval(usersInterval);
            clearInterval(rotateAdsInterval);
            clearTimeout(adsTimer);
            document.removeEventListener("click", handleClickOutside);
        };
    });

    function handleClickOutside(event: MouseEvent) {
        const target = event.target as HTMLElement;
        if (!target.closest(".lang-dropdown-container")) {
            showLangDropdown = false;
        }
    }
</script>

<header
    class="sticky top-0 z-50 border-b-2 md:border-b-4 border-blue-600 shadow-lg backdrop-blur-lg"
    style="background: linear-gradient(to bottom, rgb(17, 24, 39) 0%, rgb(17, 24, 39) 66%, rgba(17, 24, 39, 0.2) 100%);"
>
    <div class="relative mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
        <div class="relative">
            <!-- Mobile Header Area -->
            <div class="md:hidden">
                {#if !showAdsMode}
                    <!-- Original Mobile Header -->
                    <div
                        class="flex items-center justify-between py-3 px-1"
                        transition:fade
                    >
                        <!-- Left: Logo + Title -->
                        <a
                            href="/"
                            class="flex items-center gap-2.5 flex-1 min-w-0"
                        >
                            <div class="relative">
                                <img
                                    src="/images/logos/לוגו2.png"
                                    alt="לוגו"
                                    class="h-10 w-10 object-contain flex-shrink-0"
                                />
                                <div
                                    class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900 shadow-[0_0_8px_rgba(34,197,94,0.6)]"
                                ></div>
                            </div>
                            <div class="min-w-0 flex-1">
                                <h1
                                    class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-[15px] font-black text-transparent leading-tight truncate"
                                >
                                    {$t("welcome")}
                                </h1>
                                <p
                                    class="text-[10px] text-gray-400 leading-tight truncate font-medium"
                                >
                                    {$t("app_description")}
                                </p>
                            </div>
                        </a>

                        <!-- Right Side: Language + User -->
                        <div class="flex items-center gap-2">
                            <div class="lang-dropdown-container relative">
                                <button
                                    class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 border border-white/10 p-1.5 active:scale-95"
                                    onclick={() =>
                                        (showLangDropdown = !showLangDropdown)}
                                >
                                    <span
                                        class="fi fi-{languages.find(
                                            (l) => l.code === $locale,
                                        )?.flag || 'un'}"
                                        style="font-size: 1.2rem;"
                                    ></span>
                                </button>
                                {#if showLangDropdown}
                                    <div
                                        class="absolute left-0 z-[160] mt-2 w-32 rounded-xl bg-slate-900 border border-white/10 shadow-2xl p-1"
                                    >
                                        {#each languages as langOption}
                                            <button
                                                class="flex w-full items-center gap-2 px-3 py-2 text-right hover:bg-white/5 rounded-lg transition-colors"
                                                onclick={() => {
                                                    changeLang(langOption);
                                                    showLangDropdown = false;
                                                }}
                                            >
                                                <span
                                                    class="fi fi-{langOption.flag}"
                                                    style="font-size: 1.1rem;"
                                                ></span>
                                                <span
                                                    class="text-xs text-gray-200"
                                                    >{langOption.name}</span
                                                >
                                            </button>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                            {#if currentUser}
                                <div
                                    class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-blue-500 shadow-lg border border-white/10"
                                >
                                    <span class="font-bold text-white text-xs"
                                        >{currentUser.username?.charAt(0) ||
                                            "U"}</span
                                    >
                                </div>
                            {:else}
                                <button
                                    onclick={onShowAuth}
                                    class="h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-[11px] font-bold text-white shadow-lg active:scale-95"
                                >
                                    {$t("login_register")}
                                </button>
                            {/if}
                        </div>
                    </div>
                {:else}
                    <!-- Advertisement Banner Mode (Mobile Only) -->
                    <div
                        class="flex items-center justify-center h-[72px] w-full px-4 overflow-hidden relative cursor-pointer"
                        transition:fade
                        onclick={() =>
                            (selectedAdForModal = ads[currentAdIndex])}
                    >
                        {#key currentAdIndex}
                            <div
                                in:fade={{ duration: 600, delay: 200 }}
                                out:fade={{ duration: 600 }}
                                class="absolute inset-0 flex flex-col items-center justify-center text-center p-2"
                            >
                                <span
                                    class="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-1 opacity-60"
                                    >הקהילה ממליצה בחום:</span
                                >
                                <h2
                                    class="text-lg font-black bg-gradient-to-r {ads[
                                        currentAdIndex
                                    ]
                                        .color} bg-clip-text text-transparent leading-tight mb-1"
                                >
                                    {ads[currentAdIndex].title}
                                </h2>
                                <p
                                    class="text-xs text-gray-300 font-medium truncate max-w-[95%]"
                                >
                                    {ads[currentAdIndex].description}
                                </p>
                                <div
                                    class="mt-1 text-xs text-gray-500 font-bold flex items-center justify-start w-full gap-2 px-1"
                                >
                                    <span>לחץ לפרטים מלאים</span>
                                    <span>👇</span>
                                </div>
                            </div>
                        {/key}
                    </div>
                {/if}
            </div>

            <!-- Original Desktop Header (Always Visible on Desktop) -->
            <div
                class="hidden md:flex flex-col items-center py-6 md:flex-row md:items-center md:justify-between"
            >
                <div class="flex items-center space-x-4">
                    <a
                        href="/"
                        class="flex h-20 w-20 animate-pulse-slow items-center justify-center rounded-2xl shadow-lg transition-transform hover:scale-105"
                    >
                        <img
                            src="/images/logos/לוגו2.png"
                            alt="מיצוי זכויות מקומיות"
                            class="h-16 w-auto object-contain"
                        />
                    </a>
                    <div>
                        <h1
                            class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent"
                        >
                            {$t("welcome")}
                        </h1>
                        <p class="font-medium text-gray-200 text-base">
                            {$t("app_description")}
                        </p>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <button
                        class="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 font-medium text-white shadow-lg"
                        onclick={() => goto("/about")}>אודות</button
                    >
                    <div
                        class="online-counter flex items-center gap-2 bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-500/30"
                    >
                        <span class="text-green-400 text-xl">●</span>
                        <span class="text-white text-sm font-bold"
                            >{onlineUsers}</span
                        >
                        <span class="text-gray-300 text-sm">מחוברים</span>
                    </div>
                    {#if currentUser}
                        <div class="flex items-center space-x-3">
                            <div
                                class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 shadow-lg"
                            >
                                <span class="font-bold text-white"
                                    >{currentUser.username?.charAt(0) ||
                                        "U"}</span
                                >
                            </div>
                            <button
                                onclick={onLogout}
                                class="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg"
                                >{$t("logout")}</button
                            >
                        </div>
                    {:else}
                        <button
                            onclick={onShowAuth}
                            class="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:-translate-y-0.5"
                            >{$t("login_register")}</button
                        >
                    {/if}
                </div>
            </div>
        </div>
    </div>
</header>

{#if selectedAdForModal}
    <FullAdModal
        ad={selectedAdForModal}
        onClose={() => (selectedAdForModal = null)}
    />
{/if}

<style>
    @keyframes pulse-slow {
        0%,
        100% {
            opacity: 1;
        }
        36% {
            opacity: 0.5;
        }
    }

    :global(.animate-pulse-slow) {
        animation: pulse-slow 11s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes blink-every-2min {
        0%,
        0.83%,
        100% {
            opacity: 1;
        }
        0.415% {
            opacity: 0.3;
        }
    }

    :global(.online-counter) {
        animation: blink-every-2min 120s ease-in-out infinite;
    }
</style>

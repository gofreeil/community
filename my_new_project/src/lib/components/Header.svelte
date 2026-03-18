<script lang="ts">
    import { t, locale } from 'svelte-i18n';
	import { get } from 'svelte/store';
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";

    interface Props {
        currentUser?: any;
        onLogout?: () => void;
        onShowAuth?: () => void;
    }

    import { fade } from "svelte/transition";
    import { ads, type Ad } from "$lib/adsData";
    import FullAdModal from "$lib/components/FullAdModal.svelte";

    let { currentUser, onLogout, onShowAuth }: Props = $props();

    let languages = [
        { name: "עברית", code: "he", flag: "il" },
        { name: "English", code: "en", flag: "us" },
        { name: "русский", code: "ru", flag: "ru" },
    ];

    let showLangDropdown = $state(false);
    let onlineUsers = $state(1);
    let tooltipX = $state(0);
    let tooltipY = $state(0);
    let showProfileTooltip = $state(false);

    function handleProfileMouseMove(e: MouseEvent) {
        tooltipX = e.clientX + 12;
        tooltipY = e.clientY + 18;
    }

    // מעגל מילוי פרופיל בהדר
    const headerRingC = 2 * Math.PI * 30; // r=30, SVG 68×68

    let headerCompletion = $derived(
        currentUser ? Math.round([
            !!currentUser.avatar_url,
            !!currentUser.name,
            !!currentUser.nickname,
            !!currentUser.phone,
            !!currentUser.city,
            !!currentUser.neighborhood,
            !!currentUser.gender,
            !!currentUser.business,
            !!currentUser.family_status,
            !!currentUser.notifications,
        ].filter(Boolean).length / 10 * 100) : 0
    );

    let headerRingColor = $derived(
        headerCompletion < 40 ? '#ef4444' :
        headerCompletion < 70 ? '#eab308' : '#22c55e'
    );

    // Ads Mode Logic (Mobile Only)
    let showAdsMode = $state(false);
    let currentAdIndex = $state(0);
    let adsShownCount = $state(0);
    let nextAdsStartIndex = $state(0);
    let selectedAdForModal = $state<Ad | null>(null);

    function changeLang(language: { name: string; code: string }) {
        locale.set(language.code);
        try { localStorage.setItem('lang', language.code); } catch {}
    }

    function updateOnlineUsers() {
        onlineUsers = Math.floor(Math.random() * 15) + 1;
    }

    onMount(() => {
        // שחזר שפה שמורה
        try {
            const saved = localStorage.getItem('lang');
            if (saved) locale.set(saved);
        } catch {}

        updateOnlineUsers();
        const usersInterval = setInterval(updateOnlineUsers, 30000);

        // Switch to Ads Mode after 10 seconds (Mobile only logic will use this)
        const adsTimer = setTimeout(() => {
            showAdsMode = true;
            currentAdIndex = nextAdsStartIndex;
            adsShownCount = 1;
        }, 10000);

        // Rotate ads every 5 seconds
        const rotateAdsInterval = setInterval(() => {
            if (showAdsMode) {
                if (adsShownCount >= 3) {
                    // After 3 ads, go back to original header
                    showAdsMode = false;
                    adsShownCount = 0;
                    // Advance the start index so the next session continues through all ads
                    nextAdsStartIndex = (nextAdsStartIndex + 3) % ads.length;
                    // Wait 7 seconds then show ads again
                    setTimeout(() => {
                        showAdsMode = true;
                        currentAdIndex = nextAdsStartIndex;
                        adsShownCount = 1;
                    }, 7000);
                } else {
                    currentAdIndex = (currentAdIndex + 1) % ads.length;
                    adsShownCount = adsShownCount + 1;
                }
            }
        }, 5000);

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
	// tFn: תרגום reactive — $t אסור ב-Svelte 5
	let _loc = $state(get(locale));
	$effect(() => locale.subscribe(l => (_loc = l)));
	const tFn = (k: string) => { void _loc; return get(t)(k); };

</script>

<header
    class="sticky top-0 z-50 border-b-2 md:border-b-4 border-blue-600 shadow-lg backdrop-blur-lg"
    style="background: linear-gradient(to bottom, rgba(17, 24, 39, 0.88) 0%, rgba(17, 24, 39, 0.88) 66%, rgba(17, 24, 39, 0.1) 100%);"
>
    <div class="relative mx-auto max-w-7xl px-2 sm:px-4 lg:px-8">
        <!-- Mobile Header Area -->
        <div class="md:hidden h-[80px] relative">
            {#if !showAdsMode}
                <!-- Original Mobile Header (0-10 seconds) -->
                <div
                    in:fade={{ duration: 1000, delay: 400 }}
                    out:fade={{ duration: 800 }}
                    class="flex items-center justify-between h-full px-1 absolute inset-0"
                >
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
                                class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-slate-900 animate-pulse"
                            ></div>
                        </div>
                        <div class="min-w-0 flex-1">
                            <h1
                                class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-xl font-black text-transparent leading-tight truncate"
                            >
                                {tFn("welcome")}
                            </h1>
                            <p class="text-xs text-gray-400 leading-tight truncate">
                                {tFn("app_description")}
                            </p>
                        </div>
                    </a>

                    <div class="flex items-center gap-2">
                        {#if currentUser}
                            <a href="/profile" class="relative group flex-shrink-0">
                                {#if currentUser.avatar_url}
                                    <img
                                        src={currentUser.avatar_url}
                                        alt={currentUser.username ?? "U"}
                                        class="h-9 w-9 rounded-full object-cover border-2 border-purple-500/40 shadow-lg"
                                    />
                                {:else}
                                    <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 shadow-lg border border-white/10">
                                        <span class="font-bold text-white text-xs">{currentUser.username?.charAt(0) || "U"}</span>
                                    </div>
                                {/if}
                            </a>
                        {:else}
                            <button
                                onclick={onShowAuth}
                                class="h-9 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-[11px] font-bold text-white shadow-lg active:scale-95"
                            >
                                {tFn("login_register")}
                            </button>
                        {/if}
                    </div>
                </div>
            {:else}
                <!-- Advertisement Banner Mode -->
                <div
                    in:fade={{ duration: 1000, delay: 400 }}
                    out:fade={{ duration: 800 }}
                    class="flex items-center justify-center h-full w-full px-4 relative cursor-pointer absolute inset-0"
                    onclick={() => selectedAdForModal = ads[currentAdIndex]}
                >
                    {#key currentAdIndex}
                        <div
                            in:fade={{ duration: 1000, delay: 400 }}
                            out:fade={{ duration: 800 }}
                            class="absolute inset-0 flex flex-col items-center justify-center text-center px-2 py-1 pl-16"
                        >
                            <h2
                                class="text-2xl font-black bg-gradient-to-r {ads[
                                    currentAdIndex
                                ]
                                    .color} bg-clip-text text-transparent leading-tight mb-0.5"
                            >
                                {ads[currentAdIndex].title}
                            </h2>
                            <p
                                class="text-sm text-gray-300 font-medium max-w-[95%] line-clamp-2"
                            >
                                {ads[currentAdIndex].description}
                            </p>
                        </div>
                    {/key}
                    <div
                        class="text-sm text-gray-500 font-bold flex flex-col items-center gap-0 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
                    >
                        <span>{tFn("for_details")}</span><span class="text-lg">👇</span>
                    </div>
                </div>
            {/if}
        </div>

        <!-- Desktop Header - Full Layout -->
        <div
            class="hidden md:flex flex-col items-center pt-2 pb-5 md:flex-row md:items-center md:justify-between"
        >
            <div class="flex items-center space-x-4">
                <div class="relative group">
                    <a
                        href="/"
                        class="flex h-16 w-16 animate-pulse-slow items-center justify-center rounded-xl shadow-lg transition-transform hover:scale-105"
                    >
                        <img
                            src="/images/logos/לוגו2.png"
                            alt="מיצוי זכויות מקומיות"
                            class="h-10 w-auto object-contain"
                        />
                    </a>
                    <!-- Tooltip - Below Logo -->
                    <div
                        class="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-[9999]"
                    >
                        <div
                            class="bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-xl whitespace-nowrap"
                        >
                            {tFn("back_home")}
                            <div
                                class="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-gray-900"
                            ></div>
                        </div>
                    </div>
                </div>
                <a href="/" class="group">
                    <h1
                        class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-3xl font-bold text-transparent group-hover:opacity-80 transition-opacity"
                    >
                        {tFn("welcome")}
                    </h1>
                    <p class="text-lg text-gray-100 font-extrabold group-hover:opacity-80 transition-opacity">{tFn("app_description")}</p>
                </a>
            </div>
            <div class="flex items-center gap-2">
                <button
                    class="relative group flex items-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                    onclick={() => goto("/about")}
                >
                    {tFn("about")}
                </button>
                <!-- Language Dropdown -->
                <div class="lang-dropdown-container relative">
                    <button
                        class="flex items-center rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-sm text-white transition-colors"
                        onclick={() => (showLangDropdown = !showLangDropdown)}
                    >
                        <span
                            class="fi fi-{languages.find(
                                (l) => l.code === $locale || $locale?.startsWith(l.code),
                            )?.flag || 'il'} ml-2"
                            style="font-size: 1.5rem; margin-left: 0.75rem;"
                        ></span>
                        {languages.find((l) => l.code === $locale || $locale?.startsWith(l.code))?.name ||
                            'עברית'}
                        <svg
                            class="mr-1 h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M19 9l-7 7-7-7"
                            />
                        </svg>
                    </button>
                    {#if showLangDropdown}
                        <div
                            class="absolute right-0 z-[160] mt-2 w-44 rounded-lg bg-[#0f172a] border border-white/10 shadow-xl"
                        >
                            {#each languages as langOption}
                                <button
                                    class="flex w-full items-center gap-4 px-4 py-2 text-right text-white hover:bg-white/10 transition-colors"
                                    onclick={() => {
                                        changeLang(langOption);
                                        showLangDropdown = false;
                                    }}
                                >
                                    <span class="text-sm"
                                        >{langOption.name}</span
                                    >
                                    <span
                                        class="fi fi-{langOption.flag}"
                                        style="font-size: 1.5rem;"
                                    ></span>
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            </div>
            {#if true}
                <div class="flex items-center gap-4">
                    <!-- מספר גולשים -->
                    <div
                        class="flex items-center gap-2 bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-500/30 online-counter"
                    >
                        <span class="text-green-400 text-xl">●</span>
                        <span class="text-white text-sm font-bold"
                            >{onlineUsers}</span
                        >
                        <span class="text-gray-300 text-sm">{tFn("connected")}</span>
                    </div>

                    {#if currentUser}
                        {@const userName = currentUser.username ?? "U"}
                        <div class="flex items-center gap-3">
                            <!-- תמונת פרופיל עם hover -->
                            <a
                                href="/profile"
                                class="relative flex-shrink-0"
                                onmouseenter={() => showProfileTooltip = true}
                                onmouseleave={() => showProfileTooltip = false}
                                onmousemove={handleProfileMouseMove}
                            >
                                {#if currentUser.avatar_url}
                                    <img
                                        src={currentUser.avatar_url}
                                        alt={userName}
                                        class="h-14 w-14 rounded-full object-cover border-2 border-purple-500/40
                                               shadow-lg hover:border-purple-400 transition-all"
                                    />
                                {:else}
                                    <div class="flex h-14 w-14 items-center justify-center rounded-full
                                                bg-gradient-to-br from-green-400 to-blue-500 shadow-lg
                                                border-2 border-transparent hover:border-purple-400 transition-all">
                                        <span class="font-bold text-white text-sm">{userName.charAt(0)}</span>
                                    </div>
                                {/if}
                            </a>
                        </div>
                    {:else}
                        <button
                            onclick={onShowAuth}
                            class="transform rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                        >
                            {tFn("login_register")}
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</header>

<!-- Cursor-following profile tooltip -->
{#if showProfileTooltip}
    <div
        class="fixed z-[9999] pointer-events-none"
        style="left: {tooltipX}px; top: {tooltipY}px;"
    >
        <div class="bg-gray-900 text-white text-xs rounded-lg px-3 py-1.5 shadow-xl whitespace-nowrap border border-white/10">
            ✏️ ערוך פרופיל
        </div>
    </div>
{/if}

<!-- FullAdModal popup -->
{#if selectedAdForModal}
    <FullAdModal ad={selectedAdForModal} onClose={() => selectedAdForModal = null} />
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

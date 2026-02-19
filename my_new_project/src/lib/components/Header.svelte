<script lang="ts">
    import { locale, t } from "svelte-i18n";
    import { goto } from "$app/navigation";
    import { onMount } from "svelte";

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

    function changeLang(language: { name: string; code: string }) {
        locale.set(language.code);
    }

    onMount(() => {
        document.addEventListener("click", handleClickOutside);
        return () => {
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
        <!-- Mobile Header - Compact Single Row -->
        <div class="flex md:hidden items-center justify-between py-3">
            <!-- Left: Logo + Title -->
            <a href="/" class="flex items-center gap-2 flex-1 min-w-0">
                <img
                    src="/images/logos/לוגו2.png"
                    alt="לוגו"
                    class="h-10 w-10 object-contain flex-shrink-0"
                />
                <div class="min-w-0 flex-1">
                    <h1
                        class="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-base font-bold text-transparent leading-tight truncate"
                    >
                        {$t("welcome")}
                    </h1>
                    <p class="text-xs text-gray-200 leading-tight truncate">
                        {$t("app_description")}
                    </p>
                </div>
            </a>

            <!-- Right Side: Language + User -->
            <div class="flex items-center gap-1.5">
                <!-- Language - Flag Only -->
                <div class="lang-dropdown-container relative">
                    <button
                        class="flex items-center justify-center rounded bg-blue-600 px-3 py-2 text-base font-bold text-white"
                        onclick={() => (showLangDropdown = !showLangDropdown)}
                    >
                        <span
                            class="fi fi-{languages.find(
                                (l) => l.code === $locale,
                            )?.flag || 'un'}"
                            style="font-size: 1.5rem;"
                        ></span>
                    </button>
                    {#if showLangDropdown}
                        <div
                            class="absolute left-0 z-[160] mt-1 w-36 rounded-lg bg-white shadow-xl"
                        >
                            {#each languages as langOption}
                                <button
                                    class="flex w-full items-center gap-3 px-3 py-2 text-right hover:bg-blue-100"
                                    onclick={() => {
                                        changeLang(langOption);
                                        showLangDropdown = false;
                                    }}
                                >
                                    <span
                                        class="fi fi-{langOption.flag}"
                                        style="font-size: 1.5rem;"
                                    ></span>
                                    <span class="text-sm"
                                        >{langOption.name}</span
                                    >
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>

                <!-- User/Auth - Compact -->
                {#if currentUser || onShowAuth}
                    {#if currentUser}
                        {@const userName = currentUser.username ?? "U"}
                        <div class="flex items-center gap-1">
                            <div
                                class="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500"
                            >
                                <span class="font-bold text-white text-xs"
                                    >{userName.charAt(0)}</span
                                >
                            </div>
                            {#if onLogout}
                                <button
                                    onclick={onLogout}
                                    class="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white"
                                >
                                    ✕
                                </button>
                            {/if}
                        </div>
                    {:else if onShowAuth}
                        <button
                            onclick={onShowAuth}
                            class="rounded bg-gradient-to-r from-blue-600 to-purple-600 px-2 py-1 text-xs text-white"
                        >
                            כניסה
                        </button>
                    {/if}
                {/if}
            </div>
        </div>

        <!-- Desktop Header - Full Layout -->
        <div
            class="hidden md:flex flex-col items-center py-6 md:flex-row md:items-center md:justify-between"
        >
            <div class="flex items-center space-x-4">
                <div class="relative group">
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
                    <!-- Tooltip - Below Logo -->
                    <div
                        class="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-[9999]"
                    >
                        <div
                            class="bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-xl whitespace-nowrap"
                        >
                            לדף הבית
                            <div
                                class="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-gray-900"
                            ></div>
                        </div>
                    </div>
                </div>
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
            <div class="flex items-center space-x-2">
                <button
                    class="relative group flex items-center rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 font-medium text-white shadow-lg transition-all duration-200 hover:shadow-xl"
                    onclick={() => goto("/about")}
                >
                    אודות
                    <!-- Tooltip -->
                    <div
                        class="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-[9999]"
                    >
                        <div
                            class="bg-gray-900 text-white text-sm rounded-lg px-4 py-2 shadow-xl whitespace-nowrap"
                        >
                            הבן את חשיבות הפלטפורמה
                            <div
                                class="absolute bottom-full left-1/2 -translate-x-1/2 border-8 border-transparent border-b-gray-900"
                            ></div>
                        </div>
                    </div>
                </button>
                <!-- Language Dropdown -->
                <div class="lang-dropdown-container relative">
                    <button
                        class="flex items-center rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-700 hover:bg-gray-200"
                        onclick={() => (showLangDropdown = !showLangDropdown)}
                    >
                        <span
                            class="fi fi-{languages.find(
                                (l) => l.code === $locale,
                            )?.flag || 'un'} ml-2"
                            style="font-size: 1.5rem; margin-left: 0.75rem;"
                        ></span>
                        {languages.find((l) => l.code === $locale)?.name ||
                            $t("hello")}
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
                            class="absolute right-0 z-[160] mt-2 w-44 rounded-lg bg-white shadow-xl"
                        >
                            {#each languages as langOption}
                                <button
                                    class="flex w-full items-center gap-4 px-4 py-2 text-right hover:bg-blue-100"
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
            {#if currentUser || onShowAuth}
                <div class="flex items-center">
                    {#if currentUser}
                        {@const userName = currentUser.username ?? "U"}
                        <div class="flex items-center space-x-3">
                            <div
                                class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-blue-500 shadow-lg"
                            >
                                <span class="font-bold text-white"
                                    >{userName.charAt(0)}</span
                                >
                            </div>
                            <div class="hidden sm:block">
                                <span class="font-medium text-gray-700 text-sm"
                                    >{$t("greeting")} {userName}</span
                                >
                            </div>
                            {#if onLogout}
                                <button
                                    onclick={onLogout}
                                    class="transform rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-600 hover:shadow-xl"
                                >
                                    {$t("logout")}
                                </button>
                            {/if}
                        </div>
                    {:else if onShowAuth}
                        <button
                            onclick={onShowAuth}
                            class="transform rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl"
                        >
                            {$t("login_register")}
                        </button>
                    {/if}
                </div>
            {/if}
        </div>
    </div>
</header>

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
</style>

<script lang="ts">
    import { locale, t } from "svelte-i18n";
    import { goto } from "$app/navigation";
</script>

<header
    class="header-glow sticky top-0 z-50 border-b border-blue-900/50 bg-[#070b14]/80 backdrop-blur-xl"
>
    <div class="mx-auto max-w-7xl px-4 py-3">
        <div class="flex items-center justify-between">
            <!-- Right Side: Logo & Title (Grouped as in screenshot) -->
            <div class="flex items-center gap-4">
                <a href="/" class="relative">
                    <div
                        class="h-16 w-16 overflow-hidden rounded-full border-2 border-white/10 shadow-2xl"
                    >
                        <img
                            src="/images/logos/לוגו2.png"
                            alt="לוגו"
                            class="h-full w-full object-cover"
                        />
                    </div>
                </a>
                <div class="flex flex-col">
                    <h1 class="text-2xl font-bold">
                        <span class="text-blue-500">מיצוי</span>
                        <span class="text-purple-500"> זכויות התושבים</span>
                    </h1>
                    <p class="text-xs font-medium text-gray-400">
                        מערכת פניות ובקרת תושבים על העיריות
                    </p>
                </div>
            </div>

            <!-- Center-Right: Navigation (As in screenshot) -->
            <div class="flex items-center gap-3">
                <button
                    onclick={() => goto("/about")}
                    class="btn-premium rounded-lg px-6 py-2 text-sm font-bold text-white shadow-lg"
                >
                    אודות
                </button>

                <!-- Language Selector -->
                <div
                    class="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 border border-white/10"
                >
                    <span class="fi fi-il text-xl"></span>
                    <span class="text-sm font-medium text-white">עברית</span>
                    <svg
                        class="h-4 w-4 text-gray-400"
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
                </div>
            </div>

            <!-- Left Side: Auth -->
            <div>
                <button
                    class="btn-premium rounded-xl px-8 py-3 text-sm font-bold text-white shadow-lg shadow-purple-500/20"
                >
                    התחבר / הירשם
                </button>
            </div>
        </div>
    </div>
</header>

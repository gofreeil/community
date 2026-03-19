<script lang="ts">
    import { t, locale } from "svelte-i18n";
    import { get } from "svelte/store";
    let _loc = $state(get(locale));
    $effect(() => locale.subscribe(l => (_loc = l)));
    const tFn = (k: string) => { void _loc; return get(t)(k); };
</script>

<footer class="bg-[#0d1117] border-t border-white/10 py-2 mt-8 md:mt-0">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
            class="flex flex-col md:flex-row items-center justify-between gap-3 md:gap-6"
        >
            <!-- Right: Brand image + text (ימין) -->
            <a
                href="https://www.melecshop.com/"
                target="_blank"
                style="cursor: pointer;"
                class="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
                <img
                    src="/images/יוצאים לחירות תמונה ויקיפדיה.png"
                    alt="יוצאים לחירות"
                    class="h-28 w-28 md:h-32 md:w-32 object-contain rounded-lg hover:scale-105 transition-transform flex-shrink-0"
                />

                <!-- Mobile: horizontal layout -->
                <div
                    class="flex md:hidden flex-col text-right leading-tight text-sm"
                >
                    <p class="text-yellow-400 font-black text-sm">
                        יוצאים לחירות
                    </p>
                    <p class="text-gray-300 font-normal text-xs">
                        לכלל פעילות התנועה החברתית
                    </p>
                </div>

                <!-- Desktop: original layout -->
                <div
                    class="hidden md:flex md:flex-col text-right leading-tight gap-1"
                >
                    <p
                        class="text-base md:text-lg text-gray-300 font-normal"
                    >
                        לכלל פעילות התנועה החברתית
                    </p>
                    <p
                        class="text-lg md:text-xl font-black flex items-center gap-2 justify-end text-yellow-500"
                    >
                        <span>👉</span> יוצאים לחירות
                    </p>
                </div>
            </a>

            <!-- Center: Links -->
            <nav
                class="flex items-center gap-4 text-base md:text-lg text-gray-300 font-bold"
            >
                <a href="/terms" class="hover:text-white transition-colors"
                    >{tFn("terms")}</a
                >
                <span class="text-gray-600 font-black">|</span>
                <a href="/privacy" class="hover:text-white transition-colors"
                    >{tFn("privacy")}</a
                >
                <span class="text-gray-600 font-black">|</span>
                <a
                    href="mailto:freedomhasbegun@gmail.com"
                    class="hover:text-white transition-colors">{tFn("contact_us")}</a
                >
            </nav>

            <!-- Left: Copyright -->
            <p class="text-gray-400 font-bold text-sm md:text-lg text-center md:text-right">
                &copy; {new Date().getFullYear()} {tFn("all_rights_reserved")}
            </p>
        </div>
    </div>
</footer>

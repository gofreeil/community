<script lang="ts">
    import { t } from "svelte-i18n";
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
                    class="h-24 w-24 md:h-32 md:w-32 object-contain rounded-lg hover:scale-105 transition-transform flex-shrink-0"
                />

                <!-- Mobile: horizontal layout -->
                <div
                    class="flex md:hidden flex-col text-right leading-tight text-sm"
                >
                    <p class="text-yellow-400 font-black text-lg">
                        יוצאים לחירות
                    </p>
                    <p class="text-gray-300 font-normal text-base">
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
                    >תנאי שימוש</a
                >
                <span class="text-gray-600 font-black">|</span>
                <a href="/privacy" class="hover:text-white transition-colors"
                    >מדיניות פרטיות</a
                >
                <span class="text-gray-600 font-black">|</span>
                <a
                    href="mailto:freedomhasbegun@gmail.com"
                    class="hover:text-white transition-colors">צור קשר</a
                >
            </nav>

            <!-- Left: Copyright -->
            <p class="text-gray-400 font-bold text-sm md:text-lg text-center md:text-right">
                &copy; {new Date().getFullYear()} כל הזכויות שמורות
            </p>
        </div>
    </div>
</footer>

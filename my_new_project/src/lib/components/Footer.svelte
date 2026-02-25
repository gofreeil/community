<script lang="ts">
    import { t } from "svelte-i18n";
</script>

<footer class="bg-[#0d1117] border-t border-white/10 py-2">
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
                    class="h-20 w-20 md:h-24 md:w-24 object-contain rounded-lg hover:scale-105 transition-transform flex-shrink-0"
                />
                
                <!-- Mobile: horizontal layout -->
                <div class="flex md:hidden flex-col text-right leading-tight text-xs">
                    <p class="text-yellow-400 font-bold">
                        יוצאים לחירות
                    </p>
                    <p class="text-gray-400 font-medium">
                        לכלל פעילות התנועה החברתית
                    </p>
                </div>
                
                <!-- Desktop: original layout -->
                <div class="hidden md:flex md:flex-col text-right leading-tight">
                    <p class="text-sm md:text-base text-gray-400 font-medium">
                        לכלל פעילות התנועה החברתית
                    </p>
                    <p
                        class="text-base md:text-yellow-400 font-bold flex items-center gap-1 justify-end text-yellow-400"
                    >
                        <span>👉</span> יוצאים לחירות
                    </p>
                </div>
            </a>

            <!-- Center: Links -->
            <nav
                class="flex items-center gap-4 text-xs md:text-sm text-gray-400"
            >
                <a href="/terms" class="hover:text-white transition-colors"
                    >תנאי שימוש</a
                >
                <span class="text-gray-700">|</span>
                <a href="/privacy" class="hover:text-white transition-colors"
                    >מדיניות פרטיות</a
                >
                <span class="text-gray-700">|</span>
                <a
                    href="mailto:freedomhasbegun@gmail.com"
                    class="hover:text-white transition-colors">צור קשר</a
                >
            </nav>

            <!-- Left: Copyright -->
            <p class="text-gray-500 text-[10px] md:text-sm">
                &copy; {new Date().getFullYear()} כל הזכויות שמורות
            </p>
        </div>
    </div>
</footer>

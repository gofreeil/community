<script lang="ts">
    import { t } from "svelte-i18n";
</script>

<footer class="bg-[#0d1117] border-t border-white/10 py-2">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div
            class="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-3"
        >
            <!-- Right: Brand image + text (ימין) -->
            <div class="flex flex-col items-center md:items-end gap-2">
                <p class="text-sm md:text-base text-gray-400 font-medium">
                    לכלל פעילות התנועה החברתית
                </p>
                <a
                    href="https://www.melecshop.com/"
                    target="_blank"
                    style="cursor: pointer;"
                    class="flex flex-col md:flex-row items-center gap-3 hover:opacity-80 transition-opacity"
                >
                    <img
                        src="/images/יוצאים לחירות תמונה ויקיפדיה.png"
                        alt="יוצאים לחירות"
                        class="h-16 w-16 md:h-24 md:w-24 object-contain rounded-lg hover:scale-105 transition-transform"
                    />
                    <div class="text-center md:text-right leading-tight">
                        <p
                            class="text-base md:text-yellow-400 font-bold flex items-center gap-1 justify-center md:justify-end text-yellow-400"
                        >
                            <span class="md:hidden">👇</span><span
                                class="hidden md:inline">👉</span
                            > יוצאים לחירות
                        </p>
                    </div>
                </a>
            </div>

            <!-- Center: Links -->
            <nav
                class="flex items-center gap-2 text-xs md:text-sm text-gray-400"
            >
                <a href="/terms" class="hover:text-white transition-colors"
                    >תנאי שימוש</a
                >
                <span class="text-gray-600">|</span>
                <a href="/privacy" class="hover:text-white transition-colors"
                    >מדיניות פרטיות</a
                >
                <span class="text-gray-600">|</span>
                <a
                    href="mailto:freedomhasbegun@gmail.com"
                    class="hover:text-white transition-colors">צור קשר</a
                >
            </nav>

            <!-- Left: Copyright - Hidden on mobile -->
            <p class="hidden md:block text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} כל הזכויות שמורות
            </p>
        </div>
    </div>
</footer>

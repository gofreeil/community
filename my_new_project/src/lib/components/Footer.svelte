<script lang="ts">
    import { t } from "svelte-i18n";
</script>

<footer class="bg-[#0d1117] border-t border-white/10 py-2">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between gap-3">
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
                    class="h-20 w-20 object-contain rounded-lg hover:scale-105 transition-transform"
                />
                <div class="text-right leading-tight">
                    <p class="text-sm text-gray-300">
                        לכלל פעילות התנועה החברתית
                    </p>
                    <p class="text-sm text-yellow-400 font-bold flex items-center gap-1 justify-end">
                        👉 יוצאים לחירות
                    </p>
                </div>
            </a>

            <!-- Center: Links -->
            <nav class="flex items-center gap-2 text-xs text-gray-400">
                <a href="/terms" class="hover:text-white transition-colors">תנאי שימוש</a>
                <span class="text-gray-600">|</span>
                <a href="/privacy" class="hover:text-white transition-colors">מדיניות פרטיות</a>
                <span class="text-gray-600">|</span>
                <a href="mailto:freedomhasbegun@gmail.com" class="hover:text-white transition-colors">צור קשר</a>
            </nav>

            <!-- Left: Copyright -->
            <p class="text-gray-500 text-xs">
                &copy; {new Date().getFullYear()} כל הזכויות שמורות
            </p>
        </div>
    </div>
</footer>

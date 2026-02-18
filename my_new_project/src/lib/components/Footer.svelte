<script lang="ts">
    import { t } from "svelte-i18n";
</script>

<footer class="mt-auto border-t border-white/5 bg-[#070b14] py-4 text-gray-400">
    <div class="mx-auto max-w-7xl px-4">
        <div
            class="flex flex-col items-center justify-between gap-4 md:flex-row-reverse"
        >
            <!-- Logo & Small Desc (Left side in LTR, Right in RTL) -->
            <div class="flex items-center gap-4">
                <div class="flex flex-col text-right">
                    <span class="text-xs font-bold text-gray-300"
                        >לכלל פעילות התנועה החברתית</span
                    >
                    <span class="text-xs font-medium text-orange-400"
                        >יוצאים לחירות 👈</span
                    >
                </div>
                <img
                    src="/images/logos/לוגו2.png"
                    alt="לוגו"
                    class="h-10 w-10 rounded-lg object-contain"
                />
            </div>

            <!-- Links (Center) -->
            <div class="flex items-center gap-4 text-xs font-medium">
                <a href="/terms" class="hover:text-white transition-colors"
                    >תנאי שימוש</a
                >
                <span class="text-white/10">|</span>
                <a href="/privacy" class="hover:text-white transition-colors"
                    >מדיניות פרטיות</a
                >
                <span class="text-white/10">|</span>
                <a href="/contact" class="hover:text-white transition-colors"
                    >צור קשר</a
                >
            </div>

            <!-- Copyright (Right side in LTR, Left in RTL) -->
            <div class="text-xs">
                © {new Date().getFullYear()} כל הזכויות שמורות
            </div>
        </div>
    </div>
</footer>

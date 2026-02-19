<script lang="ts">
    import { locale, t } from "svelte-i18n";
</script>

<footer class="bg-gray-900 text-white py-8 mt-12">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
                <h3 class="text-lg font-bold mb-4">{$t("quick_links")}</h3>
                <ul class="space-y-2 text-sm">
                    <li>
                        <a href="/about" class="text-gray-400 hover:text-white"
                            >{$t("about")}</a
                        >
                    </li>
                    <li>
                        <a href="/terms" class="text-gray-400 hover:text-white"
                            >{$t("terms")}</a
                        >
                    </li>
                    <li>
                        <a
                            href="/privacy"
                            class="text-gray-400 hover:text-white"
                            >{$t("privacy")}</a
                        >
                    </li>
                    <li>
                        <a
                            href="/partners"
                            class="text-gray-400 hover:text-white"
                            >{$t("partners")}</a
                        >
                    </li>
                </ul>
            </div>
            <div>
                <h3 class="text-lg font-bold mb-4">{$t("contact_us")}</h3>
                <p class="text-gray-400 text-sm">
                    {$t("email")}:
                    <a
                        href="mailto:freedomhasbegun@gmail.com"
                        class="hover:text-white">freedomhasbegun@gmail.com</a
                    >
                </p>
            </div>
        </div>
        <div
            class="mt-8 pt-8 border-t border-gray-800 text-center text-gray-400 text-sm"
        >
            <p>&copy; {new Date().getFullYear()} {$t("all_rights_reserved")}</p>
        </div>
    </div>
</footer>

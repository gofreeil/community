<script lang="ts">
    import { page } from "$app/state";
    import { getItemById } from "$lib/itemsData";
    import { onMount } from "svelte";
    import { fade, fly, scale } from "svelte/transition";

    const id = page.params.id as string;
    const item = getItemById(id);

    let mounted = $state(false);

    onMount(() => {
        mounted = true;
    });

    function goBack() {
        history.back();
    }
</script>

<svelte:head>
    <title>{item ? item.label : "לא נמצא"} | קהילה בשכונה</title>
</svelte:head>

<div class="min-h-screen bg-[#070b14] py-12 px-4 md:px-8">
    <div class="max-w-4xl mx-auto">
        <!-- Back button -->
        <button
            onclick={goBack}
            class="mb-8 flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors group"
        >
            <span
                class="text-xl group-hover:-translate-x-1 transition-transform"
                >←</span
            >
            <span class="font-bold">חזרה למפה</span>
        </button>

        {#if item}
            <div
                class="bg-[#0f172a] rounded-3xl overflow-hidden shadow-2xl border border-white/10"
                in:fly={{ y: 50, duration: 800, delay: 200 }}
            >
                <!-- Header / Image -->
                <div class="relative h-[300px] md:h-[450px]">
                    {#if item.image}
                        <img
                            src={item.image}
                            alt={item.label}
                            class="w-full h-full object-cover"
                        />
                    {:else}
                        <div
                            class="w-full h-full bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center"
                        >
                            <span class="text-[120px]">{item.icon}</span>
                        </div>
                    {/if}
                    <div
                        class="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent"
                    ></div>

                    <div class="absolute bottom-8 right-8 text-white">
                        <div class="flex items-center gap-4 mb-4">
                            <span
                                class="text-4xl p-3 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl"
                                >{item.icon}</span
                            >
                            <h1
                                class="text-4xl md:text-6xl font-black tracking-tight drop-shadow-2xl"
                            >
                                {item.label}
                            </h1>
                        </div>
                    </div>
                </div>

                <!-- Content -->
                <div class="p-8 md:p-12">
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-12">
                        <!-- Main info -->
                        <div class="md:col-span-2 space-y-8">
                            <section>
                                <h2
                                    class="text-2xl font-bold text-white mb-4 flex items-center gap-2"
                                >
                                    <span
                                        class="w-1.5 h-8 bg-purple-500 rounded-full"
                                    ></span>
                                    תיאור הפריט
                                </h2>
                                <p
                                    class="text-gray-300 text-lg leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/5"
                                >
                                    {item.description}
                                </p>
                            </section>

                            <section>
                                <h2
                                    class="text-2xl font-bold text-white mb-4 flex items-center gap-2"
                                >
                                    <span
                                        class="w-1.5 h-8 bg-blue-500 rounded-full"
                                    ></span>
                                    מיקום ופרטי קשר
                                </h2>
                                <div
                                    class="grid grid-cols-1 sm:grid-cols-2 gap-4"
                                >
                                    {#if item.address}
                                        <div
                                            class="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4"
                                        >
                                            <span class="text-2xl text-blue-400"
                                                >📍</span
                                            >
                                            <div>
                                                <p
                                                    class="text-xs text-gray-400 uppercase font-bold tracking-wider"
                                                >
                                                    כתובת
                                                </p>
                                                <p
                                                    class="text-white font-medium"
                                                >
                                                    {item.address}
                                                </p>
                                            </div>
                                        </div>
                                    {/if}
                                    {#if item.phone}
                                        <div
                                            class="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4"
                                        >
                                            <span
                                                class="text-2xl text-green-400"
                                                >📞</span
                                            >
                                            <div>
                                                <p
                                                    class="text-xs text-gray-400 uppercase font-bold tracking-wider"
                                                >
                                                    טלפון
                                                </p>
                                                <p
                                                    class="text-white font-medium"
                                                >
                                                    {item.phone}
                                                </p>
                                            </div>
                                        </div>
                                    {/if}
                                    {#if item.contact}
                                        <div
                                            class="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center gap-4"
                                        >
                                            <span
                                                class="text-2xl text-purple-400"
                                                >👤</span
                                            >
                                            <div>
                                                <p
                                                    class="text-xs text-gray-400 uppercase font-bold tracking-wider"
                                                >
                                                    איש קשר
                                                </p>
                                                <p
                                                    class="text-white font-medium"
                                                >
                                                    {item.contact}
                                                </p>
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                            </section>
                        </div>

                        <!-- Sidebar / Actions -->
                        <div class="space-y-6">
                            <div
                                class="bg-gradient-to-br from-purple-600 to-blue-600 p-8 rounded-3xl shadow-xl"
                            >
                                <h3 class="text-white font-bold text-xl mb-4">
                                    זקוק לפרטים נוספים?
                                </h3>
                                <p class="text-white/80 text-sm mb-6">
                                    צור קשר ישירות עם המפרסם לקבלת פרטים נוספים
                                    או תיאום.
                                </p>
                                <a
                                    href="tel:{item.phone}"
                                    class="block w-full bg-white text-purple-600 font-bold py-3 rounded-xl text-center shadow-lg hover:scale-105 transition-transform"
                                >
                                    התקשר עכשיו
                                </a>
                                <button
                                    class="block w-full mt-3 bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-xl text-center transition-all border border-white/20"
                                >
                                    שלח הודעה
                                </button>
                            </div>

                            <div
                                class="bg-white/5 p-6 rounded-3xl border border-white/10 backdrop-blur-sm"
                            >
                                <h4 class="text-white font-bold mb-4">
                                    שתף עם חברים
                                </h4>
                                <div class="flex gap-4">
                                    <button
                                        class="bg-green-600/20 hover:bg-green-600/40 p-3 rounded-xl transition-all"
                                        >🟢</button
                                    >
                                    <button
                                        class="bg-blue-600/20 hover:bg-blue-600/40 p-3 rounded-xl transition-all"
                                        >🔵</button
                                    >
                                    <button
                                        class="bg-white/10 hover:bg-white/20 p-3 rounded-xl transition-all"
                                        >📋</button
                                    >
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        {:else}
            <!-- Not found state -->
            <div
                class="text-center py-24 bg-[#0f172a] rounded-3xl border border-white/10"
                in:scale={{ duration: 500 }}
            >
                <span class="text-8xl mb-8 block">🔍</span>
                <h1 class="text-4xl font-black text-white mb-4">
                    הפריט לא נמצא
                </h1>
                <p class="text-gray-400 mb-8">
                    נראה שהדף שאתה מחפש הוסר או שמעולם לא היה קיים.
                </p>
                <button
                    onclick={goBack}
                    class="bg-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
                >
                    חזרה למפה
                </button>
            </div>
        {/if}
    </div>
</div>

<style>
    :global(body) {
        background-color: #070b14;
    }
</style>

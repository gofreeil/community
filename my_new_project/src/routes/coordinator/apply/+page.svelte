<script lang="ts">
    import { t } from 'svelte-i18n';
    import { citiesData } from '$lib/neighborhoodsData';
    import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();

    let form = $state({
        name: data.user?.name || '',
        phone: data.user?.phone || '',
        neighborhoods: [] as string[],
        experience: '',
        motivation: '',
    });

    let isSubmitting = $state(false);
    let success = $state(false);
    let error = $state('');

    const allNeighborhoods = citiesData.flatMap(({ city, neighborhoods }) =>
        neighborhoods.map(n => ({ name: n, city }))
    );

    function toggleNeighborhood(neighborhood: string) {
        if (form.neighborhoods.includes(neighborhood)) {
            form.neighborhoods = form.neighborhoods.filter(n => n !== neighborhood);
        } else {
            form.neighborhoods = [...form.neighborhoods, neighborhood];
        }
    }

    async function handleSubmit() {
        if (!form.name || !form.phone || form.neighborhoods.length === 0) {
            error = $t('coordinator_error');
            return;
        }

        isSubmitting = true;
        error = '';

        try {
            const res = await fetch('/api/coordinator-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });

            if (!res.ok) {
                error = $t('coordinator_error');
                return;
            }

            success = true;
            form = {
                name: '',
                phone: '',
                neighborhoods: [],
                experience: '',
                motivation: '',
            };
        } catch (e) {
            error = $t('coordinator_error');
        } finally {
            isSubmitting = false;
        }
    }
</script>

<div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4">
    <div class="max-w-2xl mx-auto">
        <!-- Header -->
        <div class="text-center mb-12">
            <h1 class="text-4xl font-bold mb-4">{$t('coordinator_title')}</h1>
            <p class="text-xl text-slate-300">{$t('coordinator_subtitle')}</p>
            <p class="text-slate-400 mt-4">{$t('coordinator_description')}</p>
        </div>

        {#if success}
            <div class="bg-green-900/30 border border-green-500/50 rounded-lg p-8 text-center mb-8">
                <div class="text-5xl mb-4">✅</div>
                <p class="text-lg text-green-300">{$t('coordinator_success')}</p>
                <a href="/" class="mt-6 inline-block text-blue-400 hover:text-blue-300">
                    ← {$t('back_home')}
                </a>
            </div>
        {:else}
            <form on:submit|preventDefault={handleSubmit} class="space-y-6">
                <!-- Name -->
                <div>
                    <label class="block text-sm font-semibold mb-2">
                        {$t('coordinator_name')}
                    </label>
                    <input
                        type="text"
                        bind:value={form.name}
                        placeholder={$t('coordinator_name')}
                        class="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                    />
                </div>

                <!-- Phone -->
                <div>
                    <label class="block text-sm font-semibold mb-2">
                        {$t('coordinator_phone')}
                    </label>
                    <input
                        type="tel"
                        bind:value={form.phone}
                        placeholder={$t('coordinator_phone')}
                        class="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                    />
                </div>

                <!-- Neighborhoods -->
                <div>
                    <label class="block text-sm font-semibold mb-3">
                        {$t('coordinator_neighborhood')}
                    </label>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {#each allNeighborhoods as { name, city } (name)}
                            <label class="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg cursor-pointer transition">
                                <input
                                    type="checkbox"
                                    checked={form.neighborhoods.includes(name)}
                                    on:change={() => toggleNeighborhood(name)}
                                    class="w-4 h-4"
                                />
                                <span class="text-sm">
                                    {name} <span class="text-slate-400">({city})</span>
                                </span>
                            </label>
                        {/each}
                    </div>
                </div>

                <!-- Experience -->
                <div>
                    <label class="block text-sm font-semibold mb-2">
                        {$t('coordinator_experience')}
                    </label>
                    <textarea
                        bind:value={form.experience}
                        placeholder="למשל: 5 שנים בוועדה, ניסיון בארגון אירועים..."
                        rows={4}
                        class="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                    ></textarea>
                </div>

                <!-- Motivation -->
                <div>
                    <label class="block text-sm font-semibold mb-2">
                        {$t('coordinator_motivation')}
                    </label>
                    <textarea
                        bind:value={form.motivation}
                        placeholder="למה זה חשוב לך..."
                        rows={4}
                        class="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg focus:outline-none focus:border-blue-500 text-white"
                    ></textarea>
                </div>

                <!-- Error -->
                {#if error}
                    <div class="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-red-300">
                        {error}
                    </div>
                {/if}

                <!-- Submit -->
                <button
                    type="submit"
                    disabled={isSubmitting}
                    class="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 rounded-lg font-semibold transition"
                >
                    {isSubmitting ? $t('coordinator_submitting') : $t('coordinator_submit')}
                </button>

                <!-- Back link -->
                <div class="text-center">
                    <a href="/" class="text-slate-400 hover:text-slate-300 text-sm">
                        ← {$t('back_home')}
                    </a>
                </div>
            </form>
        {/if}
    </div>
</div>

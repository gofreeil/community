<script lang="ts">
    import { _ } from 'svelte-i18n';
    import citiesData from '$lib/citiesData';

    interface PageData {
        user: { name: string; phone: string } | null;
    }

    let { data }: { data: PageData } = $props();

    let name = $state(data.user?.name || '');
    let phone = $state(data.user?.phone || '');
    let neighborhoods = $state<string[]>([]);
    let experience = $state('');
    let motivation = $state('');
    let isLoading = $state(false);
    let error = $state<string | null>(null);
    let success = $state(false);

    const allNeighborhoods = citiesData.flatMap(({ city, neighborhoods }) =>
        neighborhoods.map((n) => ({ name: n, city }))
    );

    function toggleNeighborhood(neighborhoodName: string) {
        if (neighborhoods.includes(neighborhoodName)) {
            neighborhoods = neighborhoods.filter((n) => n !== neighborhoodName);
        } else {
            neighborhoods = [...neighborhoods, neighborhoodName];
        }
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = null;
        isLoading = true;

        try {
            const response = await fetch('/api/coordinator-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, phone, neighborhoods, experience, motivation }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || $_('coordinator_error'));
            }

            success = true;
            name = '';
            phone = '';
            neighborhoods = [];
            experience = '';
            motivation = '';
        } catch (err) {
            error = err instanceof Error ? err.message : $_('coordinator_error');
        } finally {
            isLoading = false;
        }
    }
</script>

<div class="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-12 px-4">
    <div class="max-w-2xl mx-auto">
        <div class="text-center mb-8">
            <h1 class="text-4xl font-bold mb-4">{$_('coordinator_title')}</h1>
            <p class="text-lg text-slate-300">{$_('coordinator_subtitle')}</p>
        </div>

        {#if success}
            <div class="bg-green-900 border border-green-500 rounded-lg p-6 mb-6">
                <p class="text-green-200 text-center">{$_('coordinator_success')}</p>
            </div>
        {:else}
            <form
                onsubmit={handleSubmit}
                class="bg-slate-800 rounded-lg p-8 border border-slate-700"
            >
                {#if error}
                    <div class="bg-red-900 border border-red-500 rounded-lg p-4 mb-6">
                        <p class="text-red-200">{error}</p>
                    </div>
                {/if}

                <!-- Name -->
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">{$_('coordinator_name')}</label>
                    <input
                        type="text"
                        bind:value={name}
                        required
                        class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <!-- Phone -->
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">{$_('coordinator_phone')}</label>
                    <input
                        type="tel"
                        bind:value={phone}
                        required
                        class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <!-- Neighborhoods -->
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-3"
                        >{$_('coordinator_neighborhood')}</label
                    >
                    <div class="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                        {#each allNeighborhoods as { name: neighborhoodName, city } (neighborhoodName)}
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={neighborhoods.includes(neighborhoodName)}
                                    onchange={() => toggleNeighborhood(neighborhoodName)}
                                    class="w-4 h-4"
                                />
                                <span class="text-sm">
                                    {neighborhoodName}
                                    <span class="text-slate-400">({city})</span>
                                </span>
                            </label>
                        {/each}
                    </div>
                    {#if neighborhoods.length === 0}
                        <p class="text-red-400 text-sm mt-2">חייב לבחור לפחות שכונה אחת</p>
                    {/if}
                </div>

                <!-- Experience -->
                <div class="mb-6">
                    <label class="block text-sm font-medium mb-2">{$_('coordinator_experience')}</label>
                    <textarea
                        bind:value={experience}
                        rows="3"
                        class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder={$_('coordinator_experience')}
                    ></textarea>
                </div>

                <!-- Motivation -->
                <div class="mb-8">
                    <label class="block text-sm font-medium mb-2">{$_('coordinator_motivation')}</label>
                    <textarea
                        bind:value={motivation}
                        rows="3"
                        class="w-full bg-slate-900 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        placeholder={$_('coordinator_motivation')}
                    ></textarea>
                </div>

                <button
                    type="submit"
                    disabled={isLoading || neighborhoods.length === 0}
                    class="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-3 rounded transition-colors"
                >
                    {#if isLoading}
                        {$_('coordinator_submitting')}
                    {:else}
                        {$_('coordinator_submit')}
                    {/if}
                </button>
            </form>
        {/if}

        <div class="text-center mt-8">
            <a href="/" class="text-blue-400 hover:text-blue-300 underline"
                >{$_('back_home')}</a
            >
        </div>
    </div>
</div>

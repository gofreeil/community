<script lang="ts">
    import type { PageData } from './$types';
    import ShabbatHostingBoard from '$lib/components/ShabbatHostingBoard.svelte';

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>אירוח לשבת ב{data.city} - קהילה בשכונה</title>
    <meta name="description" content="לוח אירוח לשבת ב{data.city} - מציעים לארח ומחפשים להתארח" />
</svelte:head>

<ShabbatHostingBoard items={data.items} city={data.city} />

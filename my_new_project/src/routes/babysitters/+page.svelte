<script lang="ts">
    import type { PageData } from './$types';
    import BabysittersBoard from '$lib/components/BabysittersBoard.svelte';
    import JsonLd from "$lib/components/JsonLd.svelte";
    import { breadcrumbSchema, collectionSchema, canonical } from "$lib/seo";

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>בייבי סיטר ושמרטפים בשכונה | קהילה בשכונה</title>
    <meta name="description" content="לוח בייבי סיטר ושמרטפים בשכונה — מצאו שמרטף זמין ואמין קרוב לבית, בקהילה בשכונה." />
    <link rel="canonical" href={canonical('/babysitters')} />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
</svelte:head>
<JsonLd schema={[breadcrumbSchema([{ name: 'בית', path: '/' }, { name: 'בייבי סיטר', path: '/babysitters' }]), collectionSchema({ name: 'בייבי סיטר ושמרטפים', description: 'לוח בייבי סיטר ושמרטפים בשכונה — מצאו שמרטף זמין ואמין קרוב לבית, בקהילה בשכונה.', path: '/babysitters' })]} />

<h1 class="sr-only">בייבי סיטר ושמרטפים בשכונה שלך</h1>

<BabysittersBoard items={data.items} userNeighborhood={data.userNeighborhood} userCity={data.userCity} />

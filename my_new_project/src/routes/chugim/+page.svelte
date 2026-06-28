<script lang="ts">
    import type { PageData } from './$types';
    import ChugimBoard from '$lib/components/ChugimBoard.svelte';
    import JsonLd from "$lib/components/JsonLd.svelte";
    import { breadcrumbSchema, collectionSchema, canonical } from "$lib/seo";

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>חוגים — לוח חוגים ארצי לכל הגילאים | קהילה בשכונה</title>
    <meta name="description" content="לוח חוגים ארצי: ספורט, מוזיקה, אומנות, ריקוד, רובוטיקה, בישול ועוד. סננו לפי גיל, קטגוריה, מחיר ומיקום. שיעור ניסיון חינם — בקהילה בשכונה." />
    <link rel="canonical" href={canonical('/chugim')} />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
</svelte:head>
<JsonLd schema={[breadcrumbSchema([{ name: 'בית', path: '/' }, { name: 'חוגים', path: '/chugim' }]), collectionSchema({ name: 'לוח חוגים ארצי', description: 'לוח חוגים ארצי: ספורט, מוזיקה, אומנות, ריקוד, רובוטיקה, בישול ועוד. סננו לפי גיל, קטגוריה, מחיר ומיקום. שיעור ניסיון חינם — בקהילה בשכונה.', path: '/chugim' })]} />

<h1 class="sr-only">חוגים — לוח חוגים ארצי לכל הגילאים</h1>

<ChugimBoard items={data.items} userNeighborhood={data.userNeighborhood} userCity={data.userCity} />

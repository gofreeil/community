<script lang="ts">
    import type { PageData } from './$types';
    import ShabbatHostingBoard from '$lib/components/ShabbatHostingBoard.svelte';
    import JsonLd from "$lib/components/JsonLd.svelte";
    import { breadcrumbSchema, collectionSchema, canonical } from "$lib/seo";

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>אירוח לשבת, צימרים ודירות | קהילה בשכונה</title>
    <meta name="description" content="לוח אירוח לשבת, צימרים ודירות לאירוח — מצאו מקום לשבת או אירוח קצר בשכונה ובכל הארץ, בקהילה בשכונה." />
    <link rel="canonical" href={canonical('/shabbat-hosting')} />
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
</svelte:head>
<JsonLd schema={[breadcrumbSchema([{ name: 'בית', path: '/' }, { name: 'אירוח לשבת', path: '/shabbat-hosting' }]), collectionSchema({ name: 'אירוח לשבת, צימרים ודירות', description: 'לוח אירוח לשבת, צימרים ודירות לאירוח — מצאו מקום לשבת או אירוח קצר בשכונה ובכל הארץ, בקהילה בשכונה.', path: '/shabbat-hosting' })]} />

<h1 class="sr-only">אירוח לשבת, צימרים ודירות בשכונה ובכל הארץ</h1>

<ShabbatHostingBoard
    items={data.items}
    city={null}
    userNeighborhood={data.userNeighborhood}
    userCity={data.userCity}
    userId={data.userId}
    isBanned={data.isBanned}
    blockedHostUserIds={data.blockedHostUserIds}
    approvedHostItemIds={data.approvedHostItemIds}
    pendingGuestRequestItemIds={data.pendingGuestRequestItemIds}
    rejectedGuestRequestItemIds={data.rejectedGuestRequestItemIds}
    pendingRequestsForHost={data.pendingRequestsForHost}
    approvedGuestPhonesForHost={data.approvedGuestPhonesForHost}
/>

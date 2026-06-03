<script lang="ts">
    import type { PageData } from './$types';
    import ShabbatHostingBoard from '$lib/components/ShabbatHostingBoard.svelte';

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>לוח אירוח לשבת - קהילה בשכונה</title>
    <meta name="description" content="לוח ארצי לאירוח בשבת - מציעים לארח ומחפשים להתארח, לפי שכונה וסגנון אוכל" />
</svelte:head>

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

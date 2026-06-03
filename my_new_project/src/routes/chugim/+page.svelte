<script lang="ts">
    import type { PageData } from './$types';
    import ChugimBoard from '$lib/components/ChugimBoard.svelte';

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>לוח חוגים ארצי - קהילה בשכונה</title>
    <meta name="description" content="לוח חוגים ארצי - ספורט, מוזיקה, אומנות, ריקוד, רובוטיקה, בישול ועוד. סננו לפי גיל, קטגוריה, מחיר ומיקום. כרטיסים מלאים עם דירוג, לוז שיעור ניסיון חינם." />
</svelte:head>

<ChugimBoard items={data.items} userNeighborhood={data.userNeighborhood} userCity={data.userCity} />

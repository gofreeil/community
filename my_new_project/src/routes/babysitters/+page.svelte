<script lang="ts">
    import type { PageData } from './$types';
    import BabysittersBoard from '$lib/components/BabysittersBoard.svelte';

    let { data }: { data: PageData } = $props();
</script>

<svelte:head>
    <title>לוח בייבי סיטר ארצי — קהילה בשכונה</title>
    <meta name="description" content="לוח בייבי סיטר ארצי — מצא בייבי סיטר מומלצת לפי שכונה, גיל ילדים, מחיר וזמינות. כרטיסים מלאים עם דירוג, ניסיון, שפות והסמכות." />
</svelte:head>

<BabysittersBoard items={data.items} />

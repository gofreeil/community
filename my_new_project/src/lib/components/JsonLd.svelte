<script lang="ts">
    // מזריק schema.org structured data כ-<script type="application/ld+json">.
    // ה-{@html} בתוך <svelte:head> מבטיח שה-JSON-LD מגיע ל-SSR (קריא ל-Google ול-AI).
    let { schema }: { schema: object | object[] } = $props();

    // escape של < כדי שלא ניתן יהיה לפרוץ מתוך תגית ה-script
    const json = $derived(JSON.stringify(schema).replace(/</g, '\\u003c'));
</script>

<svelte:head>
    {@html `<script type="application/ld+json">${json}</` + 'script>'}
</svelte:head>

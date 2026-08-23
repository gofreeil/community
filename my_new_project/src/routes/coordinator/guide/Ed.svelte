<script lang="ts">
	// טקסט נערך-במקום למדריך הרכזים: במצב עריכה (סופר-אדמין) האלמנט הופך
	// contenteditable, והערך נכתב חזרה לאובייקט התוכן רק ב-blur - כך הסמן
	// לא קופץ בזמן ההקלדה. מחוץ למצב עריכה - טקסט רגיל.
	let {
		obj,
		k,
		edit = false,
		tag = 'span',
		cls = '',
	}: {
		obj: Record<string, any>;
		k: string;
		edit?: boolean;
		tag?: string;
		cls?: string;
	} = $props();
</script>

{#if edit}
	<svelte:element
		this={tag}
		contenteditable="true"
		class="{cls} ed-active"
		style="white-space:pre-wrap"
		role="textbox"
		tabindex={0}
		onblur={(e: FocusEvent) => {
			obj[k] = ((e.currentTarget as HTMLElement).innerText ?? '').trim();
		}}>{obj[k]}</svelte:element
	>
{:else}
	<svelte:element this={tag} class={cls} style="white-space:pre-wrap">{obj[k]}</svelte:element>
{/if}

<style>
	.ed-active {
		outline: 1.5px dashed rgba(245, 158, 11, 0.55);
		outline-offset: 3px;
		border-radius: 4px;
		cursor: text;
		min-width: 1ch;
		display: inline-block;
	}
	.ed-active:hover {
		outline-color: rgba(245, 158, 11, 0.9);
		background: rgba(245, 158, 11, 0.06);
	}
	.ed-active:focus {
		outline: 2px solid #f59e0b;
		background: rgba(245, 158, 11, 0.08);
	}
</style>

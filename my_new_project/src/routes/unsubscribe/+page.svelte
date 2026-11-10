<script lang="ts">
	import { _ } from 'svelte-i18n';
	import { enhance } from '$app/forms';

	let { data, form } = $props();
	const status = $derived(form?.status ?? (data.valid ? 'ask' : 'invalid'));
</script>

<svelte:head>
	<title>{$_('unsubscribe.title')}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="mx-auto max-w-md px-4 py-8 text-center">
	<h1 class="mb-3 text-xl font-bold">{$_('unsubscribe.title')}</h1>

	{#if status === 'ask'}
		<p class="mb-1 text-gray-200">{$_('unsubscribe.ask')}</p>
		<p class="mb-4 text-sm text-gray-400">{$_('unsubscribe.note')}</p>
		<form method="POST" use:enhance>
			<input type="hidden" name="e" value={data.e} />
			<input type="hidden" name="t" value={data.t} />
			<button type="submit" class="rounded-xl bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500">
				{$_('unsubscribe.confirm')}
			</button>
		</form>
	{:else if status === 'done'}
		<p class="text-green-400" role="status">{$_('unsubscribe.done')}</p>
	{:else if status === 'notFound'}
		<p class="text-gray-300" role="status">{$_('unsubscribe.notFound')}</p>
	{:else}
		<p class="text-red-400" role="alert">{$_('unsubscribe.invalid')}</p>
	{/if}

	<a href="/" class="mt-5 inline-block text-sm text-blue-400 underline">{$_('unsubscribe.back')}</a>
</div>

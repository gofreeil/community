<script lang="ts">
	import "../app.css";
	import "flag-icons/css/flag-icons.min.css";
	import "$lib/i18n";
	import Header from "$lib/components/Header.svelte";
	import AdsSidebar from "$lib/components/AdsSidebar.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import favicon from "$lib/assets/favicon.svg";

	let { children } = $props();
</script>

<svelte:head>
	<title>מיצוי זכויות התושבים</title>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen flex flex-col bg-[#070b14]">
	<Header />

	<div class="layout-container flex-grow">
		<!-- Sidebar moved to the LEFT (start for RTL) as requested -->
		<AdsSidebar />

		<main class="main-content">
			{@render children()}
		</main>
	</div>

	<Footer />
</div>

<style>
	.layout-container {
		max-width: 1400px;
		margin: 0 auto;
		display: flex;
		gap: 3rem;
		padding: 2rem;
		width: 100%;
	}

	.main-content {
		flex: 1;
		min-width: 0;
	}

	@media (max-width: 1024px) {
		.layout-container {
			padding: 1rem;
			flex-direction: column-reverse; /* Put main content above sidebar on mobile */
		}
	}
</style>

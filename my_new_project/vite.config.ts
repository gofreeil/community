import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: { allowedHosts: true },
	preview: { allowedHosts: true },
	optimizeDeps: {
		exclude: ['better-sqlite3'],
	},
	build: {
		rollupOptions: {
			external: ['better-sqlite3'],
		},
	},
});

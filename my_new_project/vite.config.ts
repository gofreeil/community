import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: { allowedHosts: 'all' },
	preview: { allowedHosts: 'all' },
	optimizeDeps: {
		exclude: ['better-sqlite3'],
	},
	build: {
		rollupOptions: {
			external: ['better-sqlite3'],
		},
	},
});

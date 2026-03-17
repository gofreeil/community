import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: { allowedHosts: true, fs: { allow: ['D:/Users/User/Documents/GitHub/community/my_new_project'] } },
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

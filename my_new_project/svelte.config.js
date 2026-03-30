import adapterAuto from '@sveltejs/adapter-auto';
import adapterNode from '@sveltejs/adapter-node';

// Vercel → adapter-auto (ברירת מחדל)
// Arxentra / Node.js → DEPLOY_TARGET=node → adapter-node (מייצר build/index.js)
const useNode = process.env.DEPLOY_TARGET === 'node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: useNode ? adapterNode() : adapterAuto()
	}
};

export default config;

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ platform }) => {
	const env = platform?.env as Env | undefined;

	return json({
		ok: true,
		service: 'fandan',
		runtime: 'sveltekit-cloudflare',
		database: {
			binding: 'DB',
			available: Boolean(env?.DB)
		}
	});
};

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	const env = platform?.env as Env | undefined;
	let queryOk = false;
	let spaces = 0;
	let error: string | undefined;

	if (env?.DB) {
		try {
			const result = await env.DB.prepare('select count(*) as count from spaces').first<{ count: number }>();
			queryOk = true;
			spaces = Number(result?.count ?? 0);
		} catch (cause) {
			error = cause instanceof Error ? cause.message : 'Unknown database error';
		}
	}

	return json({
		ok: true,
		service: 'fandan',
		runtime: 'sveltekit-cloudflare',
		database: {
			binding: 'DB',
			available: Boolean(env?.DB),
			queryOk,
			spaces,
			error
		}
	});
};

import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async (event) => {
	if (event.locals.auth) {
		await event.locals.auth.api.signOut({ headers: event.request.headers });
	}

	return redirect(302, '/login');
};

export const GET: RequestHandler = async () => {
	return redirect(302, '/login');
};

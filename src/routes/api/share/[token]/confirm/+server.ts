import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { getRequestContext } from '$lib/server/context';
import { confirmShare, confirmShareSchema } from '$lib/server/share-links';

const getToken = (token: string | undefined) => {
	if (!token) {
		throw apiError('BAD_REQUEST', 'Share token is required');
	}

	return token;
};

export const POST = apiRoute(async (event) => {
	const context = getRequestContext(event);
	const body = await parseJsonBody(event, confirmShareSchema);
	const result = await confirmShare(context, getToken(event.params.token), body);

	return apiOk(result, { status: 201 });
});

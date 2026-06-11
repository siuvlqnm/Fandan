import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { getRequestContext } from '$lib/server/context';
import { getPublicShare } from '$lib/server/share-links';

const getToken = (token: string | undefined) => {
	if (!token) {
		throw apiError('BAD_REQUEST', 'Share token is required');
	}

	return token;
};

export const GET = apiRoute(async (event) => {
	const context = getRequestContext(event);
	const share = await getPublicShare(context, getToken(event.params.token));

	return apiOk({ share });
});

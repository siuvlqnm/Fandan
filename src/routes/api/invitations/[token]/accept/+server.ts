import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { acceptInvitation } from '$lib/server/invitations';

export const POST = apiRoute(async (event) => {
	if (!event.params.token) throw apiError('BAD_REQUEST', 'Invitation token is required');
	const context = await requireUserSpace(event);
	const result = await acceptInvitation(context, event.params.token);
	return apiOk(result);
});

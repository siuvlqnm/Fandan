import { apiError } from '$lib/server/api/errors';
import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { revokeInvitation } from '$lib/server/invitations';

export const DELETE = apiRoute(async (event) => {
	if (!event.params.id) throw apiError('BAD_REQUEST', 'Invitation id is required');
	const context = await requireUserSpace(event);
	const invitation = await revokeInvitation(context, event.params.id);
	return apiOk({ invitation });
});

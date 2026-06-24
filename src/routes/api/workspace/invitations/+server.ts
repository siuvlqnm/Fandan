import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { createInvitation, createInvitationSchema, listInvitations } from '$lib/server/invitations';

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const invitations = await listInvitations(context);
	return apiOk({ invitations });
});

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, createInvitationSchema);
	const invitation = await createInvitation(context, body);
	return apiOk({ invitation }, { status: 201 });
});

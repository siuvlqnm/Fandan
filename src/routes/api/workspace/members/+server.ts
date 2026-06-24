import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { requireUserSpace } from '$lib/server/context';
import { listWorkspaceMembers } from '$lib/server/workspace-settings';

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const members = await listWorkspaceMembers(context);
	return apiOk({ members });
});

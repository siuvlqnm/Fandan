import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import { updateWorkspace, updateWorkspaceSchema } from '$lib/server/workspace-settings';

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	return apiOk({
		workspace: context.space,
		membership: context.membership
	});
});

export const PATCH = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, updateWorkspaceSchema);
	const workspace = await updateWorkspace(context, body);
	return apiOk({ workspace });
});

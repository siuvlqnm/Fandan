import { apiRoute } from '$lib/server/api/handler';
import { apiOk } from '$lib/server/api/response';
import { parseJsonBody } from '$lib/server/api/validation';
import { requireUserSpace } from '$lib/server/context';
import {
	createWorkspace,
	createWorkspaceSchema,
	listUserWorkspaces
} from '$lib/server/workspace-settings';

export const GET = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	return apiOk({ workspaces: await listUserWorkspaces(context) });
});

export const POST = apiRoute(async (event) => {
	const context = await requireUserSpace(event);
	const body = await parseJsonBody(event, createWorkspaceSchema);
	const { space, membership } = await createWorkspace(context, body);
	return apiOk({ workspace: space, membership }, { status: 201 });
});

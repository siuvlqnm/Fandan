import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { createInvitation, listInvitations, revokeInvitation } from '$lib/server/invitations';
import {
	createWorkspace as createWorkspaceForUser,
	createWorkspaceSchema,
	leaveWorkspace,
	listUserWorkspaces,
	listWorkspaceMembers,
	removeWorkspaceMember,
	switchWorkspace as switchWorkspaceForUser,
	updateWorkspace,
	updateWorkspaceSchema
} from '$lib/server/workspace-settings';
import type { Actions, PageServerLoad } from './$types';

const getContext = async (event: RequestEvent) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}
	return requireUserSpace(event);
};

const actionFailure = (cause: unknown) => {
	if (cause instanceof ApiError) return fail(cause.status, { message: cause.message });
	throw cause;
};

export const load: PageServerLoad = async (event) => {
	const context = await getContext(event);
	const [workspaces, members, invitations] = await Promise.all([
		listUserWorkspaces(context),
		listWorkspaceMembers(context),
		context.membership.role === 'owner' ? listInvitations(context) : Promise.resolve([])
	]);

	return {
		user: {
			id: context.user.id,
			name: context.user.name,
			email: context.user.email
		},
		space: {
			id: context.space.id,
			name: context.space.name,
			role: context.membership.role
		},
		workspaces,
		members,
		invitations: invitations.map((invitation) => ({
			...invitation,
			url: `${event.url.origin}/invite/${invitation.token}`
		})),
		feedback: {
			saved: event.url.searchParams.get('saved') === '1',
			workspaceCreated: event.url.searchParams.get('workspaceCreated') === '1',
			workspaceSwitched: event.url.searchParams.get('workspaceSwitched') === '1',
			created: event.url.searchParams.get('created') === '1',
			revoked: event.url.searchParams.get('revoked') === '1',
			removed: event.url.searchParams.get('removed') === '1',
			left: event.url.searchParams.get('left') === '1'
		}
	};
};

export const actions: Actions = {
	createWorkspace: async (event) => {
		const formData = await event.request.formData();
		const parsed = createWorkspaceSchema.safeParse({ name: formData.get('workspaceName') });
		if (!parsed.success) {
			return fail(422, {
				message: parsed.error.issues[0]?.message ?? '空间名称不正确',
				values: { workspaceName: String(formData.get('workspaceName') ?? '') }
			});
		}

		try {
			await createWorkspaceForUser(await getContext(event), parsed.data);
		} catch (cause) {
			return actionFailure(cause);
		}

		return redirect(303, '/app/settings?workspaceCreated=1');
	},
	switchWorkspace: async (event) => {
		const formData = await event.request.formData();
		const spaceId = String(formData.get('spaceId') ?? '');
		if (!spaceId) return fail(400, { message: '缺少工作区编号' });

		try {
			await switchWorkspaceForUser(await getContext(event), spaceId);
		} catch (cause) {
			return actionFailure(cause);
		}

		return redirect(303, '/app/settings?workspaceSwitched=1');
	},
	rename: async (event) => {
		const formData = await event.request.formData();
		const parsed = updateWorkspaceSchema.safeParse({ name: formData.get('name') });
		if (!parsed.success) {
			return fail(422, {
				message: parsed.error.issues[0]?.message ?? '空间名称不正确',
				values: { name: String(formData.get('name') ?? '') }
			});
		}

		try {
			await updateWorkspace(await getContext(event), parsed.data);
		} catch (cause) {
			return actionFailure(cause);
		}

		return redirect(303, '/app/settings?saved=1');
	},
	createInvitation: async (event) => {
		try {
			await createInvitation(await getContext(event), { expiresInDays: 7 });
		} catch (cause) {
			return actionFailure(cause);
		}

		return redirect(303, '/app/settings?created=1');
	},
	revokeInvitation: async (event) => {
		const formData = await event.request.formData();
		const invitationId = String(formData.get('invitationId') ?? '');
		if (!invitationId) return fail(400, { message: '缺少邀请编号' });

		try {
			await revokeInvitation(await getContext(event), invitationId);
		} catch (cause) {
			return actionFailure(cause);
		}

		return redirect(303, '/app/settings?revoked=1');
	},
	removeMember: async (event) => {
		const formData = await event.request.formData();
		const membershipId = String(formData.get('membershipId') ?? '');
		if (!membershipId) return fail(400, { message: '缺少成员编号' });

		try {
			await removeWorkspaceMember(await getContext(event), membershipId);
		} catch (cause) {
			return actionFailure(cause);
		}

		return redirect(303, '/app/settings?removed=1');
	},
	leave: async (event) => {
		try {
			await leaveWorkspace(await getContext(event));
		} catch (cause) {
			return actionFailure(cause);
		}

		return redirect(303, '/app/settings?left=1');
	}
};

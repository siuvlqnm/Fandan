import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { ApiError, throwApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { createInvitation, listInvitations, revokeInvitation } from '$lib/server/invitations';
import type { Actions, PageServerLoad } from './$types';

const getContext = async (event: RequestEvent) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}
	return requireUserSpace(event);
};

export const load: PageServerLoad = async (event) => {
	const context = await getContext(event);
	const invitations = await listInvitations(context).catch(throwApiError);

	return {
		space: { name: context.space.name },
		invitations: invitations.map((invitation) => ({
			...invitation,
			url: `${event.url.origin}/invite/${invitation.token}`
		})),
		createdNow: event.url.searchParams.get('created') === '1',
		revokedNow: event.url.searchParams.get('revoked') === '1'
	};
};

export const actions: Actions = {
	create: async (event) => {
		try {
			const context = await getContext(event);
			await createInvitation(context, { expiresInDays: 7 });
		} catch (cause) {
			if (cause instanceof ApiError) return fail(cause.status, { message: cause.message });
			throw cause;
		}

		return redirect(303, '/app/invitations?created=1');
	},
	revoke: async (event) => {
		const formData = await event.request.formData();
		const invitationId = String(formData.get('invitationId') ?? '');
		if (!invitationId) return fail(400, { message: '缺少邀请编号' });

		try {
			const context = await getContext(event);
			await revokeInvitation(context, invitationId);
		} catch (cause) {
			if (cause instanceof ApiError) return fail(cause.status, { message: cause.message });
			throw cause;
		}

		return redirect(303, '/app/invitations?revoked=1');
	}
};

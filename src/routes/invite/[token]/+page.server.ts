import { fail, redirect } from '@sveltejs/kit';
import { ApiError } from '$lib/server/api/errors';
import { getRequestContext, requireUserSpace } from '$lib/server/context';
import { acceptInvitation, getInvitationPreview } from '$lib/server/invitations';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	try {
		const preview = await getInvitationPreview(getRequestContext(event), event.params.token, event.locals.user?.id);
		return {
			token: event.params.token,
			...preview,
			signedIn: Boolean(event.locals.user),
			joinedNow: event.url.searchParams.get('joined') === '1'
		};
	} catch (cause) {
		if (cause instanceof ApiError && cause.code === 'NOT_FOUND') {
			return { token: event.params.token, space: null, invitation: null, membership: null, signedIn: Boolean(event.locals.user), joinedNow: false };
		}
		throw cause;
	}
};

export const actions: Actions = {
	accept: async (event) => {
		if (!event.locals.user || !event.locals.session) {
			return redirect(303, `/login?next=${encodeURIComponent(event.url.pathname)}`);
		}

		try {
			const context = await requireUserSpace(event);
			await acceptInvitation(context, event.params.token);
		} catch (cause) {
			if (cause instanceof ApiError) return fail(cause.status, { message: cause.message });
			throw cause;
		}

		return redirect(303, `${event.url.pathname}?joined=1`);
	}
};

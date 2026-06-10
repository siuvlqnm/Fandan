import { fail, redirect } from '@sveltejs/kit';
import { requireUserSpace } from '$lib/server/context';
import { createTarget, targetFormSchema } from '$lib/server/targets';
import type { Actions, PageServerLoad } from './$types';

const emptyValues = {
	name: '',
	type: 'home',
	peopleCount: 1,
	tasteNotes: '',
	dietaryRestrictions: '',
	budgetNotes: '',
	contactNotes: ''
};

const readTargetForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		name: String(formData.get('name') ?? ''),
		type: String(formData.get('type') ?? 'home'),
		peopleCount: String(formData.get('peopleCount') ?? ''),
		tasteNotes: String(formData.get('tasteNotes') ?? ''),
		dietaryRestrictions: String(formData.get('dietaryRestrictions') ?? ''),
		budgetNotes: String(formData.get('budgetNotes') ?? ''),
		contactNotes: String(formData.get('contactNotes') ?? '')
	};
};

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}

	return {
		values: emptyValues
	};
};

export const actions: Actions = {
	default: async (event) => {
		const context = await requireUserSpace(event);
		const values = await readTargetForm(event.request);
		const result = targetFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, {
				values,
				errors: result.error.flatten().fieldErrors
			});
		}

		const target = await createTarget(context, result.data);

		return redirect(303, `/app/targets/${target.id}`);
	}
};

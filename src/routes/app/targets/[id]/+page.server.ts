import { fail, redirect, error as kitError } from '@sveltejs/kit';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { deleteTarget, getTarget, listTargetMealPlans, targetFormSchema, updateTarget } from '$lib/server/targets';
import type { Actions, PageServerLoad } from './$types';

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

const getTargetId = (id: string | undefined) => {
	if (!id) {
		throw kitError(400, '缺少偏好 ID');
	}

	return id;
};

const toPageError = (cause: unknown): never => {
	if (cause instanceof ApiError) {
		throw kitError(cause.status, cause.message);
	}

	throw cause;
};

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}

	const context = await requireUserSpace(event);
	const id = getTargetId(event.params.id);

	try {
		const [target, mealPlans] = await Promise.all([getTarget(context, id), listTargetMealPlans(context, id)]);

		return {
			target,
			values: target,
			mealPlans
		};
	} catch (cause) {
		toPageError(cause);
	}
};

export const actions: Actions = {
	update: async (event) => {
		const context = await requireUserSpace(event);
		const id = getTargetId(event.params.id);
		const values = await readTargetForm(event.request);
		const result = targetFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, {
				values,
				errors: result.error.flatten().fieldErrors
			});
		}

		try {
			const target = await updateTarget(context, id, result.data);

			return {
				values: target,
				message: '已保存偏好'
			};
		} catch (cause) {
			toPageError(cause);
		}
	},

	delete: async (event) => {
		const context = await requireUserSpace(event);
		const id = getTargetId(event.params.id);

		await deleteTarget(context, id);

		return redirect(303, '/app/targets');
	}
};

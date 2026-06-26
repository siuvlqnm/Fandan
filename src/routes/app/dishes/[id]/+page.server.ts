import { fail, redirect, error as kitError } from '@sveltejs/kit';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { deleteDish, dishFormSchema, dishFormToUpdateInput, getDish, updateDish, type DishFormInput } from '$lib/server/dishes';
import { _dishFieldErrors, _readDishForm } from '../new/+page.server';
import type { Actions, PageServerLoad } from './$types';

const getDishId = (id: string | undefined) => {
	if (!id) {
		throw kitError(400, '缺少菜品 ID');
	}

	return id;
};

const toPageError = (cause: unknown): never => {
	if (cause instanceof ApiError) {
		throw kitError(cause.status, cause.message);
	}

	throw cause;
};

const actionError = (cause: unknown, values: Record<string, unknown>) => {
	if (cause instanceof ApiError && cause.code === 'CONFLICT') {
		return fail(cause.status, {
			values,
			errors: {},
			message: cause.message
		});
	}

	return toPageError(cause);
};

export const load: PageServerLoad = async (event) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname)}`);
	}

	const context = await requireUserSpace(event);
	const id = getDishId(event.params.id);

	try {
		const dish = await getDish(context, id);

		return {
			dish,
			values: {
				...dish,
				tagsText: dish.tags.join(', ')
			}
		};
	} catch (cause) {
		toPageError(cause);
	}
};

export const actions: Actions = {
	update: async (event) => {
		const context = await requireUserSpace(event);
		const id = getDishId(event.params.id);
		const values = await _readDishForm(event.request);
		const result = dishFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, {
				values,
				errors: _dishFieldErrors(result.error)
			});
		}

		try {
			const dish = await updateDish(context, id, {
				...dishFormToUpdateInput(result.data as DishFormInput),
				expectedUpdatedAt: values.expectedUpdatedAt
			});

			return {
				values: {
					...dish,
					tagsText: dish.tags.join(', ')
				},
				message: '已保存菜品'
			};
		} catch (cause) {
			return actionError(cause, values);
		}
	},

	delete: async (event) => {
		const context = await requireUserSpace(event);
		const id = getDishId(event.params.id);

		await deleteDish(context, id);

		return redirect(303, '/app/dishes');
	}
};

import { fail, redirect } from '@sveltejs/kit';
import {
	createDish,
	dishFormSchema,
	dishFormToCreateInput,
	parseDishTagsText,
	type DishFormInput
} from '$lib/server/dishes';
import { requireUserSpace } from '$lib/server/context';
import type { Actions, PageServerLoad } from './$types';

const emptyValues = {
	name: '',
	category: '',
	instructions: '',
	tagsText: '',
	visibility: 'space',
	ingredients: []
};

const readList = (formData: FormData, name: string) => formData.getAll(name).map((value) => String(value ?? ''));

export const _readDishForm = async (request: Request) => {
	const formData = await request.formData();
	const names = readList(formData, 'ingredientName');
	const quantities = readList(formData, 'ingredientQuantity');
	const units = readList(formData, 'ingredientUnit');
	const categories = readList(formData, 'ingredientCategory');
	const notes = readList(formData, 'ingredientNotes');
	const sortOrders = readList(formData, 'ingredientSortOrder');

	const ingredients = names
		.map((name, index) => ({
			name,
			quantity: quantities[index] ?? '',
			unit: units[index] ?? '',
			category: categories[index] ?? '',
			notes: notes[index] ?? '',
			sortOrder: Number(sortOrders[index] ?? index)
		}))
		.filter((ingredient) =>
			[ingredient.name, ingredient.quantity, ingredient.unit, ingredient.category, ingredient.notes].some((value) =>
				value.trim()
			)
		);

	return {
		name: String(formData.get('name') ?? ''),
		category: String(formData.get('category') ?? ''),
		instructions: String(formData.get('instructions') ?? ''),
		tagsText: String(formData.get('tagsText') ?? ''),
		tags: parseDishTagsText(String(formData.get('tagsText') ?? '')),
		visibility: String(formData.get('visibility') ?? 'space'),
		ingredients
	};
};

export const _dishFieldErrors = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
	error.issues.reduce<Record<string, string[]>>((errors, issue) => {
		const key = issue.path.join('.') || 'form';
		errors[key] = [...(errors[key] ?? []), issue.message];
		return errors;
	}, {});

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
		const values = await _readDishForm(event.request);
		const result = dishFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, {
				values,
				errors: _dishFieldErrors(result.error)
			});
		}

		const dish = await createDish(context, dishFormToCreateInput(result.data as DishFormInput));

		return redirect(303, `/app/dishes/${dish.id}`);
	}
};

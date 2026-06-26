import { fail, redirect, error as kitError } from '@sveltejs/kit';
import { z } from 'zod';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import {
	INGREDIENT_CATEGORY_OPTIONS,
	INGREDIENT_UNIT_OPTIONS,
	normalizeOptionalOption
} from '$lib/domain/food-options';
import { getMealPlan } from '$lib/server/meal-plans';
import {
	createShoppingListItem,
	deleteShoppingListItem,
	generateShoppingList,
	getShoppingList,
	updateShoppingListItem
} from '$lib/server/shopping-lists';
import type { RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const emptyStringToNull = (value: unknown) => (value === '' ? null : value);
const formNullableTextSchema = (maxLength: number) =>
	z.preprocess(emptyStringToNull, z.string().trim().max(maxLength).nullable().optional());

const itemFormSchema = z.object({
	name: z.string().trim().min(1, '请输入购物项名称').max(120),
	quantity: formNullableTextSchema(80),
	unit: formNullableTextSchema(40),
	category: formNullableTextSchema(80),
	notes: formNullableTextSchema(1000)
});

type FormAction = 'addItem' | 'updateItem' | 'toggleItem' | 'deleteItem' | 'regenerate';
type ShoppingList = Awaited<ReturnType<typeof getShoppingList>>;
type ShoppingListItem = ShoppingList['items'][number];
type ItemFilter = 'pending' | 'checked' | 'all';

const requireContext = async (event: RequestEvent) => {
	if (!event.locals.user || !event.locals.session) {
		return redirect(302, `/login?next=${encodeURIComponent(event.url.pathname + event.url.search)}`);
	}

	return requireUserSpace(event);
};

const toPageError = (cause: unknown): never => {
	if (cause instanceof ApiError) {
		throw kitError(cause.status, cause.message);
	}

	throw cause;
};

const actionError = (action: FormAction, cause: unknown, values: Record<string, unknown> = {}) => {
	if (cause instanceof ApiError) {
		return fail(cause.status, { action, values, errors: {}, message: cause.message });
	}

	throw cause;
};

const fieldErrors = (error: { issues: { path: PropertyKey[]; message: string }[] }) =>
	error.issues.reduce<Record<string, string[]>>((errors, issue) => {
		const key = issue.path.join('.') || 'form';
		errors[key] = [...(errors[key] ?? []), issue.message];
		return errors;
	}, {});

const formString = (formData: FormData, name: string, fallback = '') => String(formData.get(name) ?? fallback);

const readItemForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		itemId: formString(formData, 'itemId'),
		name: formString(formData, 'name'),
		quantity: formString(formData, 'quantity'),
		unit: normalizeOptionalOption(formString(formData, 'unit'), INGREDIENT_UNIT_OPTIONS) ?? '',
		category: normalizeOptionalOption(formString(formData, 'category'), INGREDIENT_CATEGORY_OPTIONS) ?? '',
		notes: formString(formData, 'notes')
	};
};

const readItemId = async (request: Request) => {
	const formData = await request.formData();
	const itemId = formData.get('itemId');

	return typeof itemId === 'string' && itemId ? itemId : null;
};

const readToggleForm = async (request: Request) => {
	const formData = await request.formData();
	const itemId = formData.get('itemId');
	const checked = formData.get('checked');

	return {
		itemId: typeof itemId === 'string' && itemId ? itemId : null,
		checked: checked === 'true'
	};
};

const readExpectedVersions = async (request: Request) => {
	const formData = await request.formData();

	return {
		expectedMealPlanUpdatedAt: formString(formData, 'expectedMealPlanUpdatedAt'),
		expectedShoppingListUpdatedAt: formString(formData, 'expectedShoppingListUpdatedAt')
	};
};

const redirectBack = (event: RequestEvent): never => {
	throw redirect(303, event.url.pathname);
};

const groupItems = (items: ShoppingListItem[]) =>
	Array.from(
		items
			.reduce(
				(map, item) => {
					const category = item.category ?? '其他';
					const group = map.get(category) ?? {
						category,
						items: [] as ShoppingListItem[],
						checkedCount: 0
					};
					group.items.push(item);
					group.checkedCount += item.checked ? 1 : 0;
					map.set(category, group);
					return map;
				},
				new Map<string, { category: string; items: ShoppingListItem[]; checkedCount: number }>()
			)
			.values()
	);

const readItemFilter = (value: string | null): ItemFilter =>
	value === 'checked' || value === 'all' ? value : 'pending';

const filterItems = (items: ShoppingListItem[], filter: ItemFilter) => {
	if (filter === 'checked') {
		return items.filter((item) => item.checked);
	}

	if (filter === 'pending') {
		return items.filter((item) => !item.checked);
	}

	return items;
};

export const load: PageServerLoad = async (event) => {
	const context = await requireContext(event);
	const id = event.params.id;

	if (!id) {
		throw kitError(400, '缺少购物清单 ID');
	}

	try {
		const shoppingList = await getShoppingList(context, id);
		const mealPlan = await getMealPlan(context, shoppingList.mealPlanId);
		const checkedCount = shoppingList.items.filter((item) => item.checked).length;
		const filter = readItemFilter(event.url.searchParams.get('filter'));
		const visibleItems = filterItems(shoppingList.items, filter);

		return {
			shoppingList,
			mealPlan,
			firstUse: event.url.searchParams.get('first') === '1',
			canInvite: context.membership.role === 'owner',
			filter,
			groups: groupItems(visibleItems),
			summary: {
				total: shoppingList.items.length,
				checked: checkedCount,
				pending: shoppingList.items.length - checkedCount
			}
		};
	} catch (cause) {
		return toPageError(cause);
	}
};

export const actions: Actions = {
	addItem: async (event) => {
		const context = await requireContext(event);
		const values = await readItemForm(event.request);
		const result = itemFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, { action: 'addItem', values, errors: fieldErrors(result.error) });
		}

		try {
			await createShoppingListItem(context, event.params.id, { ...result.data, checked: false });

			return {
				action: 'addItem',
				success: true,
				values: {},
				errors: {},
				message: '购物项已添加'
			};
		} catch (cause) {
			return actionError('addItem', cause, values);
		}
	},

	updateItem: async (event) => {
		const context = await requireContext(event);
		const values = await readItemForm(event.request);
		const result = itemFormSchema.safeParse(values);

		if (!values.itemId) {
			return fail(400, { action: 'updateItem', values, errors: {}, message: '缺少购物项 ID' });
		}

		if (!result.success) {
			return fail(400, { action: 'updateItem', values, errors: fieldErrors(result.error) });
		}

		try {
			await updateShoppingListItem(context, event.params.id, values.itemId, result.data);
			redirectBack(event);
		} catch (cause) {
			return actionError('updateItem', cause, values);
		}
	},

	toggleItem: async (event) => {
		const context = await requireContext(event);
		const values = await readToggleForm(event.request);

		if (!values.itemId) {
			return fail(400, { action: 'toggleItem', values, errors: {}, message: '缺少购物项 ID' });
		}

		try {
			await updateShoppingListItem(context, event.params.id, values.itemId, { checked: values.checked });
			redirectBack(event);
		} catch (cause) {
			return actionError('toggleItem', cause, values);
		}
	},

	deleteItem: async (event) => {
		const context = await requireContext(event);
		const itemId = await readItemId(event.request);

		if (!itemId) {
			return fail(400, { action: 'deleteItem', values: {}, errors: {}, message: '缺少购物项 ID' });
		}

		try {
			await deleteShoppingListItem(context, event.params.id, itemId);
			redirectBack(event);
		} catch (cause) {
			return actionError('deleteItem', cause, { itemId });
		}
	},

	regenerate: async (event) => {
		const context = await requireContext(event);
		const values = await readExpectedVersions(event.request);

		try {
			const shoppingList = await getShoppingList(context, event.params.id);
			const nextShoppingList = await generateShoppingList(context, shoppingList.mealPlanId, values);

			return redirect(303, `/app/shopping-lists/${nextShoppingList.id}`);
		} catch (cause) {
			return actionError('regenerate', cause, values);
		}
	}
};

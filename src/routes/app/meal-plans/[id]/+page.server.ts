import { fail, redirect, error as kitError } from '@sveltejs/kit';
import { z } from 'zod';
import { getMealFlowState } from '$lib/domain/meal-flow';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { createDish, createDishSchema, listDishes } from '$lib/server/dishes';
import { emptyItemFeedback, getMealPlanFeedbackSummary } from '$lib/server/feedback';
import { archiveMealPlan, getMealPlan, updateMealPlan } from '$lib/server/meal-plans';
import {
	createMealPlanShareLink,
	createShareLinkSchema,
	listMealPlanShareLinks,
	revokeMealPlanShareLink
} from '$lib/server/share-links';
import { generateShoppingList, getMealPlanShoppingList } from '$lib/server/shopping-lists';
import { listTargets } from '$lib/server/targets';
import type { RequestEvent } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const mealPlanTypeSchema = z.enum(['single_meal', 'day', 'week', 'gathering']);
const mealPlanStatusSchema = z.enum(['draft', 'pending_confirmation', 'confirmed', 'completed', 'archived']);
const emptyStringToNull = (value: unknown) => (value === '' ? null : value);
const formNullableTextSchema = (maxLength: number) =>
	z.preprocess(emptyStringToNull, z.string().trim().max(maxLength).nullable().optional());
const formNullableIdSchema = z.preprocess(emptyStringToNull, z.string().trim().min(1).nullable().optional());

const typeLabels: Record<string, string> = {
	single_meal: '单餐',
	day: '一日',
	week: '一周',
	gathering: '聚餐'
};

const statusLabels: Record<string, string> = {
	draft: '草稿',
	pending_confirmation: '待确认',
	confirmed: '已确认',
	completed: '已完成',
	archived: '已归档'
};

const mealSlotOptions = ['早餐', '午餐', '晚餐', '加餐', '全天'];

const metaFormSchema = z.object({
	title: z.string().trim().min(1, '请输入饭单标题').max(120),
	targetId: formNullableIdSchema,
	type: mealPlanTypeSchema,
	startDate: formNullableTextSchema(20),
	endDate: formNullableTextSchema(20),
	notes: formNullableTextSchema(2000)
});

const addDishFormSchema = z.object({
	dishId: z.string().trim().min(1, '请选择菜品'),
	mealSlot: formNullableTextSchema(40),
	plannedDate: formNullableTextSchema(20),
	servings: z.coerce.number().int().min(1, '份数至少为 1').max(999),
	notes: formNullableTextSchema(1000)
});

const quickDishFormSchema = addDishFormSchema.omit({ dishId: true }).extend({
	name: z.string().trim().min(1, '请输入菜品名称').max(80),
	category: formNullableTextSchema(40)
});

const statusFormSchema = z.object({
	status: mealPlanStatusSchema
});

type MealPlan = Awaited<ReturnType<typeof getMealPlan>>;
type MealPlanItem = MealPlan['items'][number];
type FormAction =
	| 'updateMeta'
	| 'addDish'
	| 'quickAddDish'
	| 'removeItem'
	| 'moveItem'
	| 'setStatus'
	| 'generateShoppingList'
	| 'createShareLink'
	| 'revokeShareLink';

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

const readMetaForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		title: formString(formData, 'title'),
		targetId: formString(formData, 'targetId'),
		type: formString(formData, 'type', 'single_meal'),
		startDate: formString(formData, 'startDate'),
		endDate: formString(formData, 'endDate'),
		notes: formString(formData, 'notes')
	};
};

const readAddDishForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		dishId: formString(formData, 'dishId'),
		mealSlot: formString(formData, 'mealSlot'),
		plannedDate: formString(formData, 'plannedDate'),
		servings: formString(formData, 'servings', '1'),
		notes: formString(formData, 'notes')
	};
};

const readQuickDishForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		name: formString(formData, 'name'),
		category: formString(formData, 'category'),
		mealSlot: formString(formData, 'mealSlot'),
		plannedDate: formString(formData, 'plannedDate'),
		servings: formString(formData, 'servings', '1'),
		notes: formString(formData, 'notes')
	};
};

const getItemId = async (request: Request) => {
	const formData = await request.formData();
	const itemId = formData.get('itemId');

	return typeof itemId === 'string' && itemId ? itemId : null;
};

const readMoveForm = async (request: Request) => {
	const formData = await request.formData();
	const itemId = formData.get('itemId');
	const direction = formData.get('direction');

	return {
		itemId: typeof itemId === 'string' && itemId ? itemId : null,
		direction: direction === 'up' || direction === 'down' ? direction : null
	};
};

const readStatusForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		status: formString(formData, 'status')
	};
};

const toItemInput = (item: MealPlanItem, index: number) => ({
	dishId: item.dishId,
	mealSlot: item.mealSlot,
	plannedDate: item.plannedDate,
	servings: item.servings,
	notes: item.notes,
	sortOrder: index
});

const orderedItems = (mealPlan: MealPlan) =>
	[...mealPlan.items].sort((first, second) => first.sortOrder - second.sortOrder || first.createdAt.localeCompare(second.createdAt));

const redirectBack = (event: RequestEvent): never => {
	throw redirect(303, event.url.pathname);
};

const redirectToPanel = (event: RequestEvent, panel: 'confirm' | 'shopping'): never => {
	throw redirect(303, `${event.url.pathname}?panel=${panel}`);
};

const groupKey = (item: { plannedDate: string | null; mealSlot: string | null }) =>
	`${item.plannedDate ?? 'no-date'}::${item.mealSlot ?? 'no-slot'}`;

export const load: PageServerLoad = async (event) => {
	const context = await requireContext(event);
	const id = event.params.id;

	if (!id) {
		throw kitError(400, '缺少饭单 ID');
	}

	try {
		const [mealPlan, targets, dishes, shoppingList, feedbackSummary, shareLinkList] = await Promise.all([
			getMealPlan(context, id),
			listTargets(context),
			listDishes(context),
			getMealPlanShoppingList(context, id),
			getMealPlanFeedbackSummary(context, id),
			listMealPlanShareLinks(context, id)
		]);
		const targetById = new Map(targets.map((target) => [target.id, target]));
		const dishById = new Map(dishes.map((dish) => [dish.id, dish]));
		const enrichedItems = orderedItems(mealPlan).map((item, index, allItems) => {
			const dish = item.dishId ? dishById.get(item.dishId) : null;

			return {
				...item,
				dishName: dish?.name ?? '未关联菜品',
				dishCategory: dish?.category ?? null,
				dishIngredientCount: dish?.ingredients.length ?? 0,
				feedback: feedbackSummary.byItem[item.id] ?? emptyItemFeedback(item.id),
				feedbackTotal: Object.values((feedbackSummary.byItem[item.id] ?? emptyItemFeedback(item.id)).counts).reduce(
					(total, count) => total + count,
					0
				),
				canMoveUp: index > 0,
				canMoveDown: index < allItems.length - 1
			};
		});
		const groups = Array.from(
			enrichedItems
				.reduce(
					(map, item) => {
						const key = groupKey(item);
						const group = map.get(key) ?? {
							key,
							dateLabel: item.plannedDate ?? '未设置日期',
							slotLabel: item.mealSlot ?? '未设置餐别',
							items: [] as typeof enrichedItems
						};
						group.items.push(item);
						map.set(key, group);
						return map;
					},
					new Map<
						string,
						{ key: string; dateLabel: string; slotLabel: string; items: typeof enrichedItems }
					>()
				)
				.values()
		);
		const activeShare = shareLinkList.some((shareLink) => shareLink.active);

		return {
			mealPlan: {
				...mealPlan,
				typeLabel: typeLabels[mealPlan.type],
				statusLabel: statusLabels[mealPlan.status],
				targetName: mealPlan.targetId ? (targetById.get(mealPlan.targetId)?.name ?? '未知对象') : '当前家庭',
				flow: getMealFlowState({
					status: mealPlan.status,
					itemCount: mealPlan.items.length,
					hasShoppingList: Boolean(shoppingList),
					shoppingItemCount: shoppingList?.items.length ?? 0,
					shareState: activeShare ? 'active' : 'none',
					feedbackCount: feedbackSummary.total
				})
			},
			target: mealPlan.targetId ? (targetById.get(mealPlan.targetId) ?? null) : null,
			targets,
			dishes,
			shoppingList,
			feedbackSummary,
			shareLinks: shareLinkList,
			origin: event.url.origin,
			initialPanel: event.url.searchParams.get('panel') === 'confirm' ? 'confirm' : event.url.searchParams.get('panel') === 'shopping' ? 'shopping' : 'menu',
			groups,
			mealSlotOptions,
			typeOptions: Object.entries(typeLabels).map(([value, label]) => ({ value, label })),
			statusOptions: Object.entries(statusLabels).map(([value, label]) => ({ value, label }))
		};
	} catch (cause) {
		return toPageError(cause);
	}
};

export const actions: Actions = {
	updateMeta: async (event) => {
		const context = await requireContext(event);
		const values = await readMetaForm(event.request);
		const result = metaFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, { action: 'updateMeta', values, errors: fieldErrors(result.error) });
		}

		try {
			await updateMealPlan(context, event.params.id, result.data);
			redirectBack(event);
		} catch (cause) {
			return actionError('updateMeta', cause, values);
		}
	},

	addDish: async (event) => {
		const context = await requireContext(event);
		const values = await readAddDishForm(event.request);
		const result = addDishFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, { action: 'addDish', values, errors: fieldErrors(result.error) });
		}

		try {
			const mealPlan = await getMealPlan(context, event.params.id);
			const items = orderedItems(mealPlan).map(toItemInput);
			items.push({
				dishId: result.data.dishId,
				mealSlot: result.data.mealSlot ?? null,
				plannedDate: result.data.plannedDate ?? null,
				servings: result.data.servings,
				notes: result.data.notes ?? null,
				sortOrder: items.length
			});
			await updateMealPlan(context, event.params.id, { items });
			redirectBack(event);
		} catch (cause) {
			return actionError('addDish', cause, values);
		}
	},

	quickAddDish: async (event) => {
		const context = await requireContext(event);
		const values = await readQuickDishForm(event.request);
		const result = quickDishFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, { action: 'quickAddDish', values, errors: fieldErrors(result.error) });
		}

		try {
			const dish = await createDish(
				context,
				createDishSchema.parse({
					name: result.data.name,
					category: result.data.category
				})
			);
			const mealPlan = await getMealPlan(context, event.params.id);
			const items = orderedItems(mealPlan).map(toItemInput);
			items.push({
				dishId: dish.id,
				mealSlot: result.data.mealSlot ?? null,
				plannedDate: result.data.plannedDate ?? null,
				servings: result.data.servings,
				notes: result.data.notes ?? null,
				sortOrder: items.length
			});
			await updateMealPlan(context, event.params.id, { items });
			redirectBack(event);
		} catch (cause) {
			return actionError('quickAddDish', cause, values);
		}
	},

	removeItem: async (event) => {
		const context = await requireContext(event);
		const itemId = await getItemId(event.request);

		if (!itemId) {
			return fail(400, { action: 'removeItem', values: {}, errors: {}, message: '缺少菜品条目 ID' });
		}

		try {
			const mealPlan = await getMealPlan(context, event.params.id);
			const items = orderedItems(mealPlan)
				.filter((item) => item.id !== itemId)
				.map(toItemInput);
			await updateMealPlan(context, event.params.id, { items });
			redirectBack(event);
		} catch (cause) {
			return actionError('removeItem', cause, { itemId });
		}
	},

	moveItem: async (event) => {
		const context = await requireContext(event);
		const values = await readMoveForm(event.request);

		if (!values.itemId || !values.direction) {
			return fail(400, { action: 'moveItem', values, errors: {}, message: '缺少排序参数' });
		}

		try {
			const mealPlan = await getMealPlan(context, event.params.id);
			const items = orderedItems(mealPlan);
			const index = items.findIndex((item) => item.id === values.itemId);
			const nextIndex = values.direction === 'up' ? index - 1 : index + 1;

			if (index >= 0 && nextIndex >= 0 && nextIndex < items.length) {
				[items[index], items[nextIndex]] = [items[nextIndex], items[index]];
				await updateMealPlan(context, event.params.id, { items: items.map(toItemInput) });
			}

			redirectBack(event);
		} catch (cause) {
			return actionError('moveItem', cause, values);
		}
	},

	setStatus: async (event) => {
		const context = await requireContext(event);
		const values = await readStatusForm(event.request);
		const result = statusFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, { action: 'setStatus', values, errors: fieldErrors(result.error) });
		}

		try {
			if (result.data.status === 'archived') {
				await archiveMealPlan(context, event.params.id);
			} else {
				await updateMealPlan(context, event.params.id, { status: result.data.status });
			}

			redirectToPanel(event, 'confirm');
		} catch (cause) {
			return actionError('setStatus', cause, values);
		}
	},

	generateShoppingList: async (event) => {
		const context = await requireContext(event);

		try {
			const shoppingList = await generateShoppingList(context, event.params.id);

			return redirect(303, `/app/shopping-lists/${shoppingList.id}`);
		} catch (cause) {
			return actionError('generateShoppingList', cause);
		}
	},

	createShareLink: async (event) => {
		const context = await requireContext(event);

		try {
			const mealPlan = await getMealPlan(context, event.params.id);
			if (mealPlan.status === 'confirmed' || mealPlan.status === 'completed') {
				await updateMealPlan(context, event.params.id, { status: 'pending_confirmation' });
			}
			await createMealPlanShareLink(context, event.params.id, createShareLinkSchema.parse({}));
			redirectToPanel(event, 'confirm');
		} catch (cause) {
			return actionError('createShareLink', cause);
		}
	},

	revokeShareLink: async (event) => {
		const context = await requireContext(event);
		const formData = await event.request.formData();
		const shareLinkId = formData.get('shareLinkId');

		if (typeof shareLinkId !== 'string' || !shareLinkId) {
			return fail(400, { action: 'revokeShareLink', values: {}, errors: {}, message: '缺少分享链接 ID' });
		}

		try {
			await revokeMealPlanShareLink(context, event.params.id, shareLinkId);
			redirectToPanel(event, 'confirm');
		} catch (cause) {
			return actionError('revokeShareLink', cause, { shareLinkId });
		}
	}
};

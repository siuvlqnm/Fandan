import { fail, redirect, error as kitError } from '@sveltejs/kit';
import { z } from 'zod';
import { getMealFlowState } from '$lib/domain/meal-flow';
import { ApiError } from '$lib/server/api/errors';
import { requireUserSpace } from '$lib/server/context';
import { spaceMembers } from '$lib/server/db/schema';
import { createDish, createDishSchema, listDishes } from '$lib/server/dishes';
import { emptyItemFeedback, getMealPlanFeedbackSummary } from '$lib/server/feedback';
import { archiveMealPlan, getMealPlan, updateMealPlan, updateMealPlanItemRecommendationRating } from '$lib/server/meal-plans';
import {
	createMealPlanShareLink,
	createShareLinkSchema,
	listMealPlanShareLinks,
	revokeMealPlanShareLink
} from '$lib/server/share-links';
import { generateShoppingList, getMealPlanShoppingList, markShoppingListPurchased, updateShoppingListItem } from '$lib/server/shopping-lists';
import { listTargets } from '$lib/server/targets';
import { and, eq, sql } from 'drizzle-orm';
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
	archived: '已收起'
};

const mealSlotOptions = ['早餐', '午餐', '晚餐', '加餐', '全天'];

const metaFormSchema = z.object({
	title: z.string().trim().min(1, '请输入名称').max(120),
	targetId: formNullableIdSchema,
	type: mealPlanTypeSchema,
	startDate: formNullableTextSchema(20),
	endDate: formNullableTextSchema(20),
	notes: formNullableTextSchema(2000)
});

const addDishFormSchema = z.object({
	dishIds: z.array(z.string().trim().min(1)).min(1, '请选择菜品').max(20, '一次最多添加 20 道菜'),
	mealSlot: formNullableTextSchema(40),
	plannedDate: formNullableTextSchema(20),
	servings: z.coerce.number().int().min(1, '份数至少为 1').max(999),
	recommendationRating: z.preprocess(emptyStringToNull, z.coerce.number().int().min(1).max(5).nullable().optional()),
	notes: formNullableTextSchema(1000)
});

const quickDishFormSchema = addDishFormSchema.omit({ dishIds: true }).extend({
	name: z.string().trim().min(1, '请输入菜品名称').max(80),
	category: formNullableTextSchema(40)
});

const statusFormSchema = z.object({
	status: mealPlanStatusSchema
});

const recommendationRatingFormSchema = z.object({
	itemId: z.string().trim().min(1, '缺少菜品条目 ID'),
	recommendationRating: z.preprocess(emptyStringToNull, z.coerce.number().int().min(1).max(5).nullable().optional())
});

const shareExpiryPresetSchema = z.enum(['never', '24h', '3d', '7d', 'custom']);
const shareLinkFormSchema = z
	.object({
		canFeedback: z.boolean(),
		canConfirm: z.boolean(),
		expiryPreset: shareExpiryPresetSchema,
		customExpiresOn: formNullableTextSchema(10)
	})
	.superRefine((value, context) => {
		if (value.expiryPreset !== 'custom') return;
		if (!value.customExpiresOn) {
			context.addIssue({
				code: 'custom',
				path: ['customExpiresOn'],
				message: '请选择自定义到期日期'
			});
			return;
		}

		const expiresAt = shanghaiDateEndToIso(value.customExpiresOn);
		if (!expiresAt) {
			context.addIssue({
				code: 'custom',
				path: ['customExpiresOn'],
				message: '请选择有效日期'
			});
			return;
		}

		if (Date.parse(expiresAt) <= Date.now()) {
			context.addIssue({
				code: 'custom',
				path: ['customExpiresOn'],
				message: '到期时间必须晚于当前时间'
			});
		}
	});

type MealPlan = Awaited<ReturnType<typeof getMealPlan>>;
type MealPlanItem = MealPlan['items'][number];
type MealPlanShoppingList = NonNullable<Awaited<ReturnType<typeof getMealPlanShoppingList>>>;
type ShoppingListItem = MealPlanShoppingList['items'][number];
type FormAction =
	| 'updateMeta'
	| 'addDish'
	| 'quickAddDish'
	| 'updateRecommendationRating'
	| 'removeItem'
	| 'moveItem'
	| 'setStatus'
	| 'generateShoppingList'
	| 'toggleShoppingItem'
	| 'markAllShoppingPurchased'
	| 'createShareLink'
	| 'revokeShareLink';

const DAY_MS = 24 * 60 * 60 * 1000;
const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const dateKeyPattern = /^\d{4}-\d{2}-\d{2}$/;

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
const expectedUpdatedAtFrom = (formData: FormData) => formString(formData, 'expectedUpdatedAt');

const readMetaForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		expectedUpdatedAt: expectedUpdatedAtFrom(formData),
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
		expectedUpdatedAt: expectedUpdatedAtFrom(formData),
		dishIds: formData.getAll('dishIds').filter((value): value is string => typeof value === 'string' && value.length > 0),
		mealSlot: formString(formData, 'mealSlot'),
		plannedDate: formString(formData, 'plannedDate'),
		servings: formString(formData, 'servings', '1'),
		recommendationRating: formString(formData, 'recommendationRating'),
		notes: formString(formData, 'notes')
	};
};

const readQuickDishForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		expectedUpdatedAt: expectedUpdatedAtFrom(formData),
		name: formString(formData, 'name'),
		category: formString(formData, 'category'),
		mealSlot: formString(formData, 'mealSlot'),
		plannedDate: formString(formData, 'plannedDate'),
		servings: formString(formData, 'servings', '1'),
		recommendationRating: formString(formData, 'recommendationRating'),
		notes: formString(formData, 'notes')
	};
};

const getItemId = async (request: Request) => {
	const formData = await request.formData();
	const itemId = formData.get('itemId');

	return {
		itemId: typeof itemId === 'string' && itemId ? itemId : null,
		expectedUpdatedAt: expectedUpdatedAtFrom(formData)
	};
};

const readMoveForm = async (request: Request) => {
	const formData = await request.formData();
	const itemId = formData.get('itemId');
	const direction = formData.get('direction');

	return {
		expectedUpdatedAt: expectedUpdatedAtFrom(formData),
		itemId: typeof itemId === 'string' && itemId ? itemId : null,
		direction: direction === 'up' || direction === 'down' ? direction : null
	};
};

const readStatusForm = async (request: Request) => {
	const formData = await request.formData();

	return {
		expectedUpdatedAt: expectedUpdatedAtFrom(formData),
		status: formString(formData, 'status')
	};
};

const readExpectedVersions = async (request: Request) => {
	const formData = await request.formData();

	return {
		expectedUpdatedAt: expectedUpdatedAtFrom(formData),
		expectedShoppingListUpdatedAt: formString(formData, 'expectedShoppingListUpdatedAt')
	};
};

const readShoppingToggleForm = async (request: Request) => {
	const formData = await request.formData();
	const shoppingListId = formData.get('shoppingListId');
	const itemId = formData.get('itemId');
	const checked = formData.get('checked');

	return {
		shoppingListId: typeof shoppingListId === 'string' && shoppingListId ? shoppingListId : null,
		itemId: typeof itemId === 'string' && itemId ? itemId : null,
		checked: checked === 'true'
	};
};

const shanghaiDateEndToIso = (dateKey: string | null | undefined) => {
	if (!dateKey || !dateKeyPattern.test(dateKey)) return null;

	const timestamp = Date.parse(`${dateKey}T23:59:59.999+08:00`);
	return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
};

const shareExpiresAtFrom = (value: z.infer<typeof shareLinkFormSchema>) => {
	if (value.expiryPreset === 'never') return null;
	if (value.expiryPreset === 'custom') return shanghaiDateEndToIso(value.customExpiresOn);

	const days = value.expiryPreset === '24h' ? 1 : value.expiryPreset === '3d' ? 3 : 7;
	return new Date(Date.now() + days * DAY_MS).toISOString();
};

const todayInShanghai = () => new Date(Date.now() + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);

const readShareLinkForm = async (request: Request) => {
	const formData = await request.formData();
	const hasShareOptions = formData.has('shareOptionsSubmitted');

	return {
		expectedUpdatedAt: expectedUpdatedAtFrom(formData),
		canFeedback: hasShareOptions ? formData.get('canFeedback') === 'on' : true,
		canConfirm: hasShareOptions ? formData.get('canConfirm') === 'on' : true,
		expiryPreset: formString(formData, 'expiryPreset', 'never'),
		customExpiresOn: formString(formData, 'customExpiresOn', todayInShanghai())
	};
};

const toItemInput = (item: MealPlanItem, index: number) => ({
	dishId: item.dishId,
	mealSlot: item.mealSlot,
	plannedDate: item.plannedDate,
	servings: item.servings,
	recommendationRating: item.recommendationRating,
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

const redirectForStatus = (event: RequestEvent, status: z.infer<typeof mealPlanStatusSchema>): never => {
	if (status === 'confirmed') {
		redirectToPanel(event, 'shopping');
	}

	throw redirect(303, event.url.pathname);
};

const groupKey = (item: { plannedDate: string | null; mealSlot: string | null }) =>
	`${item.plannedDate ?? 'no-date'}::${item.mealSlot ?? 'no-slot'}`;

const groupShoppingItems = (items: ShoppingListItem[]) =>
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
	).map((group) => ({
		...group,
		items: group.items.sort((first, second) => Number(first.checked) - Number(second.checked))
	}));

const syncMealPlanStatusWithShoppingList = async (
	context: Awaited<ReturnType<typeof requireContext>>,
	mealPlanId: string
) => {
	const [mealPlan, shoppingList] = await Promise.all([
		getMealPlan(context, mealPlanId),
		getMealPlanShoppingList(context, mealPlanId)
	]);

	if (!shoppingList) return;

	const allChecked = shoppingList.items.length > 0 && shoppingList.items.every((item) => item.checked);

	if (mealPlan.status !== 'archived' && allChecked && mealPlan.status !== 'completed') {
		await updateMealPlan(context, mealPlan.id, { status: 'completed' });
	} else if (mealPlan.status === 'completed' && !allChecked) {
		await updateMealPlan(context, mealPlan.id, { status: 'confirmed' });
	}
};

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
		const [memberCountRow] = await context.db
			.select({ count: sql<number>`count(*)` })
			.from(spaceMembers)
			.where(and(eq(spaceMembers.spaceId, context.space.id), eq(spaceMembers.status, 'active')));
		const workspaceMemberCount = Number(memberCountRow?.count ?? 1);
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
		const shoppingCheckedCount = shoppingList?.items.filter((item) => item.checked).length ?? 0;
		const shoppingPendingCount = shoppingList ? shoppingList.items.length - shoppingCheckedCount : 0;
		const collaborationMode = workspaceMemberCount > 1 ? 'workspace' : 'share';

		return {
			mealPlan: {
				...mealPlan,
				typeLabel: typeLabels[mealPlan.type],
				statusLabel: statusLabels[mealPlan.status],
				targetName: mealPlan.targetId ? (targetById.get(mealPlan.targetId)?.name ?? '未知偏好') : '当前家庭',
				flow: getMealFlowState({
					status: mealPlan.status,
					itemCount: mealPlan.items.length,
					hasShoppingList: Boolean(shoppingList),
					shoppingItemCount: shoppingList?.items.length ?? 0,
					shoppingPendingCount,
					shareState: activeShare ? 'active' : 'none',
					collaborationMode,
					feedbackCount: feedbackSummary.total
				})
			},
			workspaceMemberCount,
			canConfirmInWorkspace: workspaceMemberCount > 1,
			target: mealPlan.targetId ? (targetById.get(mealPlan.targetId) ?? null) : null,
			targets,
			dishes,
			shoppingList,
			shoppingGroups: shoppingList ? groupShoppingItems(shoppingList.items) : [],
			shoppingSummary: {
				total: shoppingList?.items.length ?? 0,
				checked: shoppingCheckedCount,
				pending: shoppingPendingCount
			},
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
			await updateMealPlan(context, event.params.id, {
				...result.data,
				expectedUpdatedAt: values.expectedUpdatedAt
			});
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
			const existingDishIds = new Set(items.map((item) => item.dishId).filter(Boolean));
			const nextDishIds = Array.from(new Set(result.data.dishIds)).filter((dishId) => !existingDishIds.has(dishId));

			nextDishIds.forEach((dishId) => {
				items.push({
					dishId,
					mealSlot: result.data.mealSlot ?? null,
					plannedDate: result.data.plannedDate ?? null,
					servings: result.data.servings,
					recommendationRating: result.data.recommendationRating ?? null,
					notes: result.data.notes ?? null,
					sortOrder: items.length
				});
			});
			await updateMealPlan(context, event.params.id, { items, expectedUpdatedAt: values.expectedUpdatedAt });
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
				recommendationRating: result.data.recommendationRating ?? null,
				notes: result.data.notes ?? null,
				sortOrder: items.length
			});
			await updateMealPlan(context, event.params.id, { items, expectedUpdatedAt: values.expectedUpdatedAt });
			redirectBack(event);
		} catch (cause) {
			return actionError('quickAddDish', cause, values);
		}
	},

	updateRecommendationRating: async (event) => {
		const context = await requireContext(event);
		const formData = await event.request.formData();
		const values = {
			expectedUpdatedAt: expectedUpdatedAtFrom(formData),
			itemId: formString(formData, 'itemId'),
			recommendationRating: formString(formData, 'recommendationRating')
		};
		const result = recommendationRatingFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, { action: 'updateRecommendationRating', values, errors: fieldErrors(result.error) });
		}

		try {
			await updateMealPlanItemRecommendationRating(
				context,
				event.params.id,
				result.data.itemId,
				result.data.recommendationRating ?? null,
				{ expectedUpdatedAt: values.expectedUpdatedAt }
			);
			redirectBack(event);
		} catch (cause) {
			return actionError('updateRecommendationRating', cause, values);
		}
	},

	removeItem: async (event) => {
		const context = await requireContext(event);
		const values = await getItemId(event.request);

		if (!values.itemId) {
			return fail(400, { action: 'removeItem', values: {}, errors: {}, message: '缺少菜品条目 ID' });
		}

		try {
			const mealPlan = await getMealPlan(context, event.params.id);
			const items = orderedItems(mealPlan)
				.filter((item) => item.id !== values.itemId)
				.map(toItemInput);
			await updateMealPlan(context, event.params.id, { items, expectedUpdatedAt: values.expectedUpdatedAt });
			redirectBack(event);
		} catch (cause) {
			return actionError('removeItem', cause, values);
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
				await updateMealPlan(context, event.params.id, { items: items.map(toItemInput), expectedUpdatedAt: values.expectedUpdatedAt });
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
				await archiveMealPlan(context, event.params.id, { expectedUpdatedAt: values.expectedUpdatedAt });
			} else {
				await updateMealPlan(context, event.params.id, {
					status: result.data.status,
					expectedUpdatedAt: values.expectedUpdatedAt
				});
			}

			redirectForStatus(event, result.data.status);
		} catch (cause) {
			return actionError('setStatus', cause, values);
		}
	},

	generateShoppingList: async (event) => {
		const context = await requireContext(event);
		const values = await readExpectedVersions(event.request);

		try {
			await generateShoppingList(context, event.params.id, {
				expectedMealPlanUpdatedAt: values.expectedUpdatedAt,
				expectedShoppingListUpdatedAt: values.expectedShoppingListUpdatedAt
			});

			redirectToPanel(event, 'shopping');
		} catch (cause) {
			return actionError('generateShoppingList', cause, values);
		}
	},

	toggleShoppingItem: async (event) => {
		const context = await requireContext(event);
		const values = await readShoppingToggleForm(event.request);

		if (!values.shoppingListId || !values.itemId) {
			return fail(400, { action: 'toggleShoppingItem', values, errors: {}, message: '缺少购物项 ID' });
		}

		try {
			await updateShoppingListItem(context, values.shoppingListId, values.itemId, { checked: values.checked });
			await syncMealPlanStatusWithShoppingList(context, event.params.id);
			redirectToPanel(event, 'shopping');
		} catch (cause) {
			return actionError('toggleShoppingItem', cause, values);
		}
	},

	markAllShoppingPurchased: async (event) => {
		const context = await requireContext(event);
		const formData = await event.request.formData();
		const shoppingListId = formData.get('shoppingListId');

		if (typeof shoppingListId !== 'string' || !shoppingListId) {
			return fail(400, { action: 'markAllShoppingPurchased', values: {}, errors: {}, message: '缺少购物清单 ID' });
		}

		try {
			await markShoppingListPurchased(context, shoppingListId);
			await syncMealPlanStatusWithShoppingList(context, event.params.id);
			redirectToPanel(event, 'shopping');
		} catch (cause) {
			return actionError('markAllShoppingPurchased', cause, { shoppingListId });
		}
	},

	createShareLink: async (event) => {
		const context = await requireContext(event);
		const values = await readShareLinkForm(event.request);
		const result = shareLinkFormSchema.safeParse(values);

		if (!result.success) {
			return fail(400, { action: 'createShareLink', values, errors: fieldErrors(result.error) });
		}

		try {
			const mealPlan = await getMealPlan(context, event.params.id);
			if (mealPlan.status === 'confirmed' || mealPlan.status === 'completed') {
				await updateMealPlan(context, event.params.id, {
					status: 'pending_confirmation',
					expectedUpdatedAt: values.expectedUpdatedAt
				});
			}
			await createMealPlanShareLink(
				context,
				event.params.id,
				createShareLinkSchema.parse({
					canFeedback: result.data.canFeedback,
					canConfirm: result.data.canConfirm,
					expiresAt: shareExpiresAtFrom(result.data)
				})
			);
			redirectToPanel(event, 'confirm');
		} catch (cause) {
			return actionError('createShareLink', cause, values);
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

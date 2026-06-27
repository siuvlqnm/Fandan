import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiError } from './api/errors';
import {
	dishIngredients,
	dishes,
	mealPlans,
	shoppingListItems,
	shoppingLists,
	type NewShoppingListItem,
	type ShoppingList,
	type ShoppingListItem
} from './db/schema';
import { getMealPlan } from './meal-plans';
import type { AuthenticatedContext } from './context';
import { assertExpectedUpdatedAt, normalizeExpectedUpdatedAt, staleWriteError, versionedNow } from './optimistic-concurrency';
import { loadUserLabels, userLabelFrom, type UserLabel } from './user-labels';

const shoppingListStatusSchema = z.enum(['draft', 'active', 'completed']);
const shoppingListCenterStatusSchema = z.enum(['current', 'history', 'all']);
const shoppingListCenterDateSchema = z.enum(['all', 'today', 'week']);
const nullableTextSchema = (maxLength: number) => z.string().trim().max(maxLength).nullable().optional();
const nullableIdSchema = z.string().trim().min(1).nullable().optional();

const shoppingListItemFieldsSchema = z.object({
	name: z.string().trim().min(1, '请输入购物项名称').max(120),
	quantity: nullableTextSchema(80),
	unit: nullableTextSchema(40),
	category: nullableTextSchema(80),
	checked: z.boolean().optional(),
	sourceDishId: nullableIdSchema,
	notes: nullableTextSchema(1000),
	sortOrder: z.number().int().min(0).max(9999).optional()
});

export const createShoppingListItemSchema = shoppingListItemFieldsSchema.extend({
	checked: z.boolean().optional().default(false)
});

export const updateShoppingListItemSchema = shoppingListItemFieldsSchema
	.partial()
	.refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

type CreateShoppingListItemInput = z.infer<typeof createShoppingListItemSchema>;
type UpdateShoppingListItemInput = z.infer<typeof updateShoppingListItemSchema>;
type ShoppingListCenterStatus = z.infer<typeof shoppingListCenterStatusSchema>;
type ShoppingListCenterDate = z.infer<typeof shoppingListCenterDateSchema>;
type ListShoppingListsInput = {
	status?: ShoppingListCenterStatus | string | null;
	date?: ShoppingListCenterDate | string | null;
	mealPlanId?: string | null;
	q?: string | null;
	todayKey?: string | null;
};
type GeneratedShoppingItem = Pick<
	NewShoppingListItem,
	'name' | 'quantity' | 'unit' | 'category' | 'checked' | 'sourceDishId' | 'notes' | 'sortOrder'
>;

type SerializedShoppingListItem = ReturnType<typeof serializeShoppingListItem>;
type SerializedShoppingList = ReturnType<typeof serializeShoppingList>;

const serializeShoppingListItem = (
	item: ShoppingListItem,
	actors: { createdBy: UserLabel | null; updatedBy: UserLabel | null; checkedBy: UserLabel | null } = {
		createdBy: null,
		updatedBy: null,
		checkedBy: null
	}
) => ({
	id: item.id,
	shoppingListId: item.shoppingListId,
	name: item.name,
	quantity: item.quantity,
	unit: item.unit,
	category: item.category,
	checked: item.checked,
	sourceDishId: item.sourceDishId,
	notes: item.notes,
	sortOrder: item.sortOrder,
	createdBy: actors.createdBy,
	updatedBy: actors.updatedBy,
	checkedBy: actors.checkedBy,
	checkedAt: item.checkedAt,
	createdAt: item.createdAt,
	updatedAt: item.updatedAt
});

const serializeShoppingList = (shoppingList: ShoppingList, items: SerializedShoppingListItem[] = []) => ({
	id: shoppingList.id,
	mealPlanId: shoppingList.mealPlanId,
	title: shoppingList.title,
	status: shoppingList.status,
	items,
	createdAt: shoppingList.createdAt,
	updatedAt: shoppingList.updatedAt
});

const normalizeKeyPart = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';
const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ');
const normalizeNullable = (value: string | null | undefined) => {
	const next = value?.trim();
	return next ? next : null;
};
const nowText = () => new Date().toISOString();
const toDateKey = (value: string | null | undefined) => value?.slice(0, 10) ?? null;

const addDateKeyDays = (dateKey: string, days: number) => {
	const date = new Date(`${dateKey}T00:00:00+08:00`);
	date.setUTCDate(date.getUTCDate() + days);
	return date.toISOString().slice(0, 10);
};

const startOfShanghaiWeek = (dateKey: string) => {
	const day = new Date(`${dateKey}T00:00:00+08:00`).getUTCDay();
	const daysFromMonday = (day + 6) % 7;
	return addDateKeyDays(dateKey, -daysFromMonday);
};

const currentShanghaiDateKey = () =>
	new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Shanghai',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).format(new Date());

const overlapsDateKey = (startDate: string | null, endDate: string | null, dateKey: string) => {
	const start = startDate ?? endDate;
	const end = endDate ?? startDate;

	return Boolean(start && end && start <= dateKey && end >= dateKey);
};

const overlapsDateRange = (startDate: string | null, endDate: string | null, startKey: string, endKey: string) => {
	const start = startDate ?? endDate;
	const end = endDate ?? startDate;

	return Boolean(start && end && start <= endKey && end >= startKey);
};

const latestText = (...values: Array<string | null | undefined>) =>
	values.filter((value): value is string => Boolean(value)).sort((left, right) => right.localeCompare(left))[0] ?? null;

const touchShoppingList = async (context: AuthenticatedContext, shoppingListId: string) => {
	await context.db
		.update(shoppingLists)
		.set({ updatedAt: versionedNow })
		.where(eq(shoppingLists.id, shoppingListId));
};

const parseQuantity = (value: string | null | undefined) => {
	const normalized = value?.trim();

	if (!normalized || !/^\d+(\.\d+)?$/.test(normalized)) {
		return null;
	}

	return Number(normalized);
};

const formatQuantity = (value: number) => {
	if (Number.isInteger(value)) {
		return String(value);
	}

	return String(Number(value.toFixed(2))).replace(/\.0+$/, '');
};

const loadItems = async (context: AuthenticatedContext, shoppingListIds: string[]) => {
	if (shoppingListIds.length === 0) {
		return new Map<string, SerializedShoppingListItem[]>();
	}

	const rows = await context.db
		.select()
		.from(shoppingListItems)
		.where(inArray(shoppingListItems.shoppingListId, shoppingListIds))
		.orderBy(asc(shoppingListItems.checked), asc(shoppingListItems.category), asc(shoppingListItems.sortOrder), asc(shoppingListItems.createdAt));

	const userLabels = await loadUserLabels(
		context,
		rows.flatMap((item) => [item.createdByUserId, item.updatedByUserId, item.checkedByUserId])
	);

	return rows.reduce((map, item) => {
		const list = map.get(item.shoppingListId) ?? [];
		list.push(
			serializeShoppingListItem(item, {
				createdBy: userLabelFrom(userLabels, item.createdByUserId),
				updatedBy: userLabelFrom(userLabels, item.updatedByUserId),
				checkedBy: userLabelFrom(userLabels, item.checkedByUserId)
			})
		);
		map.set(item.shoppingListId, list);
		return map;
	}, new Map<string, SerializedShoppingListItem[]>());
};

const assertSourceDishInSpace = async (context: AuthenticatedContext, sourceDishId: string | null | undefined) => {
	if (!sourceDishId) {
		return;
	}

	const [dish] = await context.db
		.select({ id: dishes.id })
		.from(dishes)
		.where(and(eq(dishes.id, sourceDishId), eq(dishes.spaceId, context.space.id)))
		.limit(1);

	if (!dish) {
		throw apiError('BAD_REQUEST', 'Source dish does not exist in the current space');
	}
};

const getShoppingListRow = async (context: AuthenticatedContext, id: string) => {
	const [shoppingList] = await context.db
		.select({
			id: shoppingLists.id,
			mealPlanId: shoppingLists.mealPlanId,
			title: shoppingLists.title,
			status: shoppingLists.status,
			createdAt: shoppingLists.createdAt,
			updatedAt: shoppingLists.updatedAt
		})
		.from(shoppingLists)
		.innerJoin(mealPlans, eq(shoppingLists.mealPlanId, mealPlans.id))
		.where(and(eq(shoppingLists.id, id), eq(mealPlans.spaceId, context.space.id)))
		.limit(1);

	if (!shoppingList) {
		throw apiError('NOT_FOUND', 'Shopping list not found');
	}

	return shoppingList;
};

const getShoppingListItemRow = async (context: AuthenticatedContext, shoppingListId: string, itemId: string) => {
	await getShoppingListRow(context, shoppingListId);

	const [item] = await context.db
		.select()
		.from(shoppingListItems)
		.where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.shoppingListId, shoppingListId)))
		.limit(1);

	if (!item) {
		throw apiError('NOT_FOUND', 'Shopping list item not found');
	}

	return item;
};

const itemValues = (shoppingListId: string, items: GeneratedShoppingItem[], actorUserId: string): NewShoppingListItem[] =>
	items.map((item, index) => ({
		id: crypto.randomUUID(),
		shoppingListId,
		name: item.name,
		quantity: item.quantity ?? null,
		unit: item.unit ?? null,
		category: item.category ?? '其他',
		checked: item.checked ?? false,
		sourceDishId: item.sourceDishId ?? null,
		notes: item.notes ?? null,
		sortOrder: item.sortOrder ?? index,
		createdByUserId: actorUserId,
		updatedByUserId: actorUserId,
		checkedByUserId: item.checked ? actorUserId : null,
		checkedAt: item.checked ? nowText() : null
	}));

const buildGeneratedItems = async (context: AuthenticatedContext, mealPlanId: string) => {
	const mealPlan = await getMealPlan(context, mealPlanId);
	const dishIds = Array.from(new Set(mealPlan.items.map((item) => item.dishId).filter((id): id is string => Boolean(id))));

	if (dishIds.length === 0) {
		return [];
	}

	const dishRows = await context.db
		.select({
			id: dishes.id,
			name: dishes.name,
			baseServings: dishes.baseServings,
			servingBasisConfirmed: dishes.servingBasisConfirmed
		})
		.from(dishes)
		.where(and(eq(dishes.spaceId, context.space.id), inArray(dishes.id, dishIds)));
	const dishById = new Map(dishRows.map((dish) => [dish.id, dish]));

	const ingredientRows = await context.db
		.select()
		.from(dishIngredients)
		.where(inArray(dishIngredients.dishId, dishIds))
		.orderBy(asc(dishIngredients.category), asc(dishIngredients.name), asc(dishIngredients.sortOrder));
	const ingredientsByDish = ingredientRows.reduce((map, ingredient) => {
		const list = map.get(ingredient.dishId) ?? [];
		list.push(ingredient);
		map.set(ingredient.dishId, list);
		return map;
	}, new Map<string, typeof ingredientRows>());

	type Aggregate = {
		name: string;
		unit: string | null;
		category: string;
		sourceDishIds: Set<string>;
		calculationLabels: string[];
		warnings: string[];
		numericQuantity: number;
		hasNumericQuantity: boolean;
		textQuantities: string[];
		sortOrder: number;
	};
	const aggregates = new Map<string, Aggregate>();

	for (const mealPlanItem of mealPlan.items) {
		if (!mealPlanItem.dishId) {
			continue;
		}

		const dish = dishById.get(mealPlanItem.dishId);
		const ingredients = ingredientsByDish.get(mealPlanItem.dishId) ?? [];

		for (const ingredient of ingredients) {
			const name = normalizeName(ingredient.name);
			const unit = normalizeNullable(ingredient.unit);
			const category = normalizeNullable(ingredient.category) ?? '其他';
			const key = `${normalizeKeyPart(name)}::${normalizeKeyPart(unit)}`;
			const aggregate =
				aggregates.get(key) ??
				({
					name,
					unit,
					category,
					sourceDishIds: new Set<string>(),
					calculationLabels: [],
					warnings: [],
					numericQuantity: 0,
					hasNumericQuantity: false,
					textQuantities: [],
					sortOrder: aggregates.size
				} satisfies Aggregate);
			const parsedQuantity = parseQuantity(ingredient.quantity);
			const baseServings = dish?.baseServings ?? 1;
			const scale = mealPlanItem.servings / baseServings;
			const dishLabel = dish?.name ?? '未知菜品';
			const basisLabel = `${dishLabel}：饭单 ${mealPlanItem.servings} 份 ÷ 基准 ${baseServings} 份`;

			if (parsedQuantity === null) {
				if (ingredient.quantity) {
					aggregate.textQuantities.push(ingredient.quantity);
					aggregate.warnings.push(`${dishLabel}使用文本数量“${ingredient.quantity}”，未自动缩放`);
				} else {
					aggregate.warnings.push(`${dishLabel}未填写数量`);
				}
			} else {
				aggregate.numericQuantity += parsedQuantity * scale;
				aggregate.hasNumericQuantity = true;
			}
			aggregate.calculationLabels.push(`${basisLabel} = ×${formatQuantity(scale)}`);

			if (dish && !dish.servingBasisConfirmed) {
				aggregate.warnings.push(`${dish.name}沿用旧数据安全默认基准，请确认`);
			}

			aggregate.sourceDishIds.add(mealPlanItem.dishId);
			aggregates.set(key, aggregate);
		}
	}

	const unitsByName = new Map<string, Set<string>>();
	for (const aggregate of aggregates.values()) {
		const key = normalizeKeyPart(aggregate.name);
		const units = unitsByName.get(key) ?? new Set<string>();
		units.add(aggregate.unit ?? '无单位');
		unitsByName.set(key, units);
	}

	return Array.from(aggregates.values()).map((aggregate, index) => ({
		name: aggregate.name,
		quantity: aggregate.hasNumericQuantity
			? [formatQuantity(aggregate.numericQuantity), ...aggregate.textQuantities].join(' + ')
			: aggregate.textQuantities.length > 0
				? aggregate.textQuantities.join(' + ')
				: null,
		unit: aggregate.unit,
		category: aggregate.category,
		checked: false,
		sourceDishId: aggregate.sourceDishIds.size === 1 ? Array.from(aggregate.sourceDishIds)[0] : null,
		notes: [
			`计算：${Array.from(new Set(aggregate.calculationLabels)).join('；')}`,
			...((unitsByName.get(normalizeKeyPart(aggregate.name))?.size ?? 0) > 1
				? ['提醒：同名食材存在不同单位，已分开保留']
				: []),
			...Array.from(new Set(aggregate.warnings)).map((warning) => `提醒：${warning}`)
		].join('；'),
		sortOrder: index
	}));
};

export const getShoppingList = async (context: AuthenticatedContext, id: string) => {
	const shoppingList = await getShoppingListRow(context, id);
	const itemsByList = await loadItems(context, [shoppingList.id]);

	return serializeShoppingList(shoppingList, itemsByList.get(shoppingList.id) ?? []);
};

export const listShoppingLists = async (context: AuthenticatedContext, input: ListShoppingListsInput = {}) => {
	const status = shoppingListCenterStatusSchema.catch('current').parse(input.status ?? 'current');
	const date = shoppingListCenterDateSchema.catch('all').parse(input.date ?? 'all');
	const query = input.q?.trim().toLowerCase() ?? '';
	const mealPlanId = input.mealPlanId?.trim() ?? '';
	const todayKey = input.todayKey?.trim() || currentShanghaiDateKey();
	const weekStartKey = startOfShanghaiWeek(todayKey);
	const weekEndKey = addDateKeyDays(weekStartKey, 6);
	const rows = await context.db
		.select({
			id: shoppingLists.id,
			mealPlanId: shoppingLists.mealPlanId,
			title: shoppingLists.title,
			status: shoppingLists.status,
			createdAt: shoppingLists.createdAt,
			updatedAt: shoppingLists.updatedAt,
			mealPlanTitle: mealPlans.title,
			mealPlanStatus: mealPlans.status,
			mealPlanStartDate: mealPlans.startDate,
			mealPlanEndDate: mealPlans.endDate
		})
		.from(shoppingLists)
		.innerJoin(mealPlans, eq(shoppingLists.mealPlanId, mealPlans.id))
		.where(eq(mealPlans.spaceId, context.space.id))
		.orderBy(desc(shoppingLists.updatedAt), desc(shoppingLists.createdAt));

	const itemsByList = await loadItems(
		context,
		rows.map((row) => row.id)
	);

	const lists = rows.map((row) => {
		const items = itemsByList.get(row.id) ?? [];
		const checkedCount = items.filter((item) => item.checked).length;
		const pendingCount = items.length - checkedCount;
		const completed = row.status === 'completed' || (items.length > 0 && pendingCount === 0);
		const actionCandidates = items.flatMap((item) => [
			...(item.checked && item.checkedBy ? [{ actor: item.checkedBy, action: '标记已买', at: item.checkedAt }] : []),
			...(item.updatedBy ? [{ actor: item.updatedBy, action: '更新', at: item.updatedAt }] : []),
			...(item.createdBy ? [{ actor: item.createdBy, action: '添加', at: item.createdAt }] : [])
		]);
		const recentAction =
			actionCandidates
				.filter((candidate) => candidate.at)
				.sort((left, right) => (right.at ?? '').localeCompare(left.at ?? ''))[0] ?? null;
		const relevantDate = row.mealPlanStartDate ?? row.mealPlanEndDate ?? toDateKey(row.updatedAt);
		const dateStart = row.mealPlanStartDate ?? relevantDate;
		const dateEnd = row.mealPlanEndDate ?? relevantDate;
		const sortAt = latestText(recentAction?.at, row.updatedAt, row.createdAt) ?? '';

		return {
			id: row.id,
			mealPlanId: row.mealPlanId,
			title: row.title,
			status: row.status,
			completed,
			totalCount: items.length,
			checkedCount,
			pendingCount,
			progressPercent: items.length === 0 ? 0 : Math.round((checkedCount / items.length) * 100),
			recentAction,
			mealPlan: {
				id: row.mealPlanId,
				title: row.mealPlanTitle,
				status: row.mealPlanStatus,
				startDate: row.mealPlanStartDate,
				endDate: row.mealPlanEndDate
			},
			dateStart,
			dateEnd,
			createdAt: row.createdAt,
			updatedAt: row.updatedAt,
			sortAt
		};
	});

	const stats = {
		total: lists.length,
		current: lists.filter((list) => !list.completed).length,
		history: lists.filter((list) => list.completed).length
	};
	const mealPlanOptions = Array.from(
		new Map(lists.map((list) => [list.mealPlan.id, { id: list.mealPlan.id, title: list.mealPlan.title }])).values()
	).sort((left, right) => left.title.localeCompare(right.title, 'zh-CN'));
	const filteredLists = lists
		.filter((list) => {
			if (status === 'current' && list.completed) return false;
			if (status === 'history' && !list.completed) return false;
			if (mealPlanId && list.mealPlan.id !== mealPlanId) return false;
			if (query && !`${list.title} ${list.mealPlan.title}`.toLowerCase().includes(query)) return false;
			if (date === 'today' && !overlapsDateKey(list.dateStart, list.dateEnd, todayKey)) return false;
			if (date === 'week' && !overlapsDateRange(list.dateStart, list.dateEnd, weekStartKey, weekEndKey)) return false;
			return true;
		})
		.sort((left, right) => Number(left.completed) - Number(right.completed) || right.sortAt.localeCompare(left.sortAt));

	return {
		lists: filteredLists,
		stats,
		mealPlanOptions,
		filters: {
			status,
			date,
			mealPlanId,
			q: input.q?.trim() ?? '',
			todayKey,
			weekStartKey,
			weekEndKey
		}
	};
};

export const getMealPlanShoppingList = async (context: AuthenticatedContext, mealPlanId: string) => {
	const mealPlan = await getMealPlan(context, mealPlanId);
	const [shoppingList] = await context.db
		.select()
		.from(shoppingLists)
		.where(eq(shoppingLists.mealPlanId, mealPlan.id))
		.orderBy(desc(shoppingLists.updatedAt), desc(shoppingLists.createdAt))
		.limit(1);

	if (!shoppingList) {
		return null;
	}

	return getShoppingList(context, shoppingList.id);
};

export const generateShoppingList = async (
	context: AuthenticatedContext,
	mealPlanId: string,
	options: { expectedMealPlanUpdatedAt?: string | null; expectedShoppingListUpdatedAt?: string | null } = {}
) => {
	const mealPlan = await getMealPlan(context, mealPlanId);
	assertExpectedUpdatedAt(mealPlan.updatedAt, options.expectedMealPlanUpdatedAt);
	const generatedItems = await buildGeneratedItems(context, mealPlanId);
	const [existing] = await context.db
		.select()
		.from(shoppingLists)
		.where(eq(shoppingLists.mealPlanId, mealPlan.id))
		.orderBy(desc(shoppingLists.updatedAt), desc(shoppingLists.createdAt))
		.limit(1);
	const shoppingListId = existing?.id ?? crypto.randomUUID();
	const expectedShoppingListUpdatedAt = normalizeExpectedUpdatedAt(options.expectedShoppingListUpdatedAt);

	if (!existing) {
		await context.db.insert(shoppingLists).values({
			id: shoppingListId,
			mealPlanId: mealPlan.id,
			title: `${mealPlan.title} 购物清单`,
			status: 'active'
		});
	} else {
		const rows = await context.db
			.update(shoppingLists)
			.set({
				title: `${mealPlan.title} 购物清单`,
				status: shoppingListStatusSchema.parse(existing.status) === 'completed' ? 'active' : existing.status,
				updatedAt: versionedNow
			})
			.where(
				and(
					eq(shoppingLists.id, shoppingListId),
					...(expectedShoppingListUpdatedAt ? [eq(shoppingLists.updatedAt, expectedShoppingListUpdatedAt)] : [])
				)
			)
			.returning({ id: shoppingLists.id });

		if (rows.length === 0) {
			throw staleWriteError();
		}

		await context.db.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, shoppingListId));
	}

	const items = itemValues(shoppingListId, generatedItems, context.user.id);

	if (items.length > 0) {
		await context.db.insert(shoppingListItems).values(items);
	}

	return getShoppingList(context, shoppingListId);
};

export const createShoppingListItem = async (
	context: AuthenticatedContext,
	shoppingListId: string,
	input: CreateShoppingListItemInput
) => {
	await getShoppingListRow(context, shoppingListId);
	await assertSourceDishInSpace(context, input.sourceDishId);

	const id = crypto.randomUUID();
	const [lastItem] = await context.db
		.select({ sortOrder: shoppingListItems.sortOrder })
		.from(shoppingListItems)
		.where(eq(shoppingListItems.shoppingListId, shoppingListId))
		.orderBy(desc(shoppingListItems.sortOrder))
		.limit(1);

	await context.db.insert(shoppingListItems).values({
		id,
		shoppingListId,
		name: input.name,
		quantity: input.quantity ?? null,
		unit: input.unit ?? null,
		category: input.category ?? '其他',
		checked: input.checked,
		sourceDishId: input.sourceDishId ?? null,
		notes: input.notes ?? null,
		sortOrder: input.sortOrder ?? (lastItem ? lastItem.sortOrder + 1 : 0),
		createdByUserId: context.user.id,
		updatedByUserId: context.user.id,
		checkedByUserId: input.checked ? context.user.id : null,
		checkedAt: input.checked ? nowText() : null
	});
	await touchShoppingList(context, shoppingListId);

	return getShoppingList(context, shoppingListId);
};

export const updateShoppingListItem = async (
	context: AuthenticatedContext,
	shoppingListId: string,
	itemId: string,
	input: UpdateShoppingListItemInput
) => {
	await getShoppingListItemRow(context, shoppingListId, itemId);
	await assertSourceDishInSpace(context, input.sourceDishId);

	const values = Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined)
	) as Partial<NewShoppingListItem>;
	const nextValues = {
		...values,
		...(input.category === null ? { category: '其他' } : {}),
		updatedByUserId: context.user.id,
		...(input.checked === true ? { checkedByUserId: context.user.id, checkedAt: nowText() } : {}),
		...(input.checked === false ? { checkedByUserId: null, checkedAt: null } : {})
	};

	if (Object.keys(nextValues).length > 0) {
		await context.db
			.update(shoppingListItems)
			.set({
				...nextValues,
				updatedAt: sql`CURRENT_TIMESTAMP`
			})
			.where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.shoppingListId, shoppingListId)));
		await touchShoppingList(context, shoppingListId);
	}

	return getShoppingList(context, shoppingListId);
};

export const deleteShoppingListItem = async (context: AuthenticatedContext, shoppingListId: string, itemId: string) => {
	await getShoppingListItemRow(context, shoppingListId, itemId);

	await context.db
		.delete(shoppingListItems)
		.where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.shoppingListId, shoppingListId)));
	await touchShoppingList(context, shoppingListId);

	return { deleted: true, id: itemId, shoppingListId };
};

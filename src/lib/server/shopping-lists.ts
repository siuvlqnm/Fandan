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

const shoppingListStatusSchema = z.enum(['draft', 'active', 'completed']);
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
type GeneratedShoppingItem = Pick<
	NewShoppingListItem,
	'name' | 'quantity' | 'unit' | 'category' | 'checked' | 'sourceDishId' | 'notes' | 'sortOrder'
>;

type SerializedShoppingListItem = ReturnType<typeof serializeShoppingListItem>;
type SerializedShoppingList = ReturnType<typeof serializeShoppingList>;

const serializeShoppingListItem = (item: ShoppingListItem) => ({
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

	return rows.reduce((map, item) => {
		const list = map.get(item.shoppingListId) ?? [];
		list.push(serializeShoppingListItem(item));
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

const itemValues = (shoppingListId: string, items: GeneratedShoppingItem[]): NewShoppingListItem[] =>
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
		sortOrder: item.sortOrder ?? index
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

export const generateShoppingList = async (context: AuthenticatedContext, mealPlanId: string) => {
	const mealPlan = await getMealPlan(context, mealPlanId);
	const generatedItems = await buildGeneratedItems(context, mealPlanId);
	const [existing] = await context.db
		.select()
		.from(shoppingLists)
		.where(eq(shoppingLists.mealPlanId, mealPlan.id))
		.orderBy(desc(shoppingLists.updatedAt), desc(shoppingLists.createdAt))
		.limit(1);
	const shoppingListId = existing?.id ?? crypto.randomUUID();

	if (!existing) {
		await context.db.insert(shoppingLists).values({
			id: shoppingListId,
			mealPlanId: mealPlan.id,
			title: `${mealPlan.title} 购物清单`,
			status: 'active'
		});
	} else {
		await context.db
			.update(shoppingLists)
			.set({
				title: `${mealPlan.title} 购物清单`,
				status: shoppingListStatusSchema.parse(existing.status) === 'completed' ? 'active' : existing.status,
				updatedAt: sql`CURRENT_TIMESTAMP`
			})
			.where(eq(shoppingLists.id, shoppingListId));
		await context.db.delete(shoppingListItems).where(eq(shoppingListItems.shoppingListId, shoppingListId));
	}

	const items = itemValues(shoppingListId, generatedItems);

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
		sortOrder: input.sortOrder ?? (lastItem ? lastItem.sortOrder + 1 : 0)
	});

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
		...(input.category === null ? { category: '其他' } : {})
	};

	if (Object.keys(nextValues).length > 0) {
		await context.db
			.update(shoppingListItems)
			.set({
				...nextValues,
				updatedAt: sql`CURRENT_TIMESTAMP`
			})
			.where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.shoppingListId, shoppingListId)));
	}

	return getShoppingList(context, shoppingListId);
};

export const deleteShoppingListItem = async (context: AuthenticatedContext, shoppingListId: string, itemId: string) => {
	await getShoppingListItemRow(context, shoppingListId, itemId);

	await context.db
		.delete(shoppingListItems)
		.where(and(eq(shoppingListItems.id, itemId), eq(shoppingListItems.shoppingListId, shoppingListId)));

	return { deleted: true, id: itemId, shoppingListId };
};

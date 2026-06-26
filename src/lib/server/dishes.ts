import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiError } from './api/errors';
import {
	dishIngredients,
	dishes,
	type Dish,
	type DishIngredient,
	type NewDish,
	type NewDishIngredient
} from './db/schema';
import type { AuthenticatedContext } from './context';
import { normalizeDishTags } from '$lib/domain/food-options';
import { loadUserLabels, userLabelFrom, type UserLabel } from './user-labels';

const dishVisibilitySchema = z.enum(['space', 'private']);

const nullableTextSchema = (maxLength: number) => z.string().trim().max(maxLength).nullable().optional();
const emptyStringToNull = (value: unknown) => (value === '' ? null : value);
const formNullableTextSchema = (maxLength: number) =>
	z.preprocess(emptyStringToNull, z.string().trim().max(maxLength).nullable().optional());

const tagsSchema = z
	.array(z.string().trim().min(1).max(24))
	.max(20)
	.transform((tags) => Array.from(new Set(tags)));

const ingredientSchema = z.object({
	name: z.string().trim().min(1, '请输入食材名称').max(80),
	quantity: nullableTextSchema(40),
	unit: nullableTextSchema(24),
	category: nullableTextSchema(40),
	notes: nullableTextSchema(500),
	sortOrder: z.number().int().min(0).max(9999).optional()
});

const dishFieldsSchema = z.object({
	name: z.string().trim().min(1, '请输入菜品名称').max(80),
	category: nullableTextSchema(40),
	instructions: nullableTextSchema(4000),
	baseServings: z.number().int().min(1, '基准份数至少为 1').max(999),
	servingBasisConfirmed: z.boolean().optional(),
	tags: tagsSchema.optional(),
	visibility: dishVisibilitySchema.optional(),
	ingredients: z.array(ingredientSchema).max(100).optional()
});

export const createDishSchema = dishFieldsSchema.extend({
	baseServings: z.number().int().min(1).max(999).optional().default(1),
	servingBasisConfirmed: z.boolean().optional().default(true),
	tags: tagsSchema.optional().default([]),
	visibility: dishVisibilitySchema.optional().default('space'),
	ingredients: z.array(ingredientSchema).max(100).optional().default([])
});

export const updateDishSchema = dishFieldsSchema
	.partial()
	.refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const dishFormSchema = z.object({
	name: z.string().trim().min(1, '请输入菜品名称').max(80),
	category: formNullableTextSchema(40),
	instructions: formNullableTextSchema(4000),
	baseServings: z.coerce.number().int().min(1, '基准份数至少为 1').max(999),
	tagsText: z.string().trim().max(500).optional(),
	visibility: dishVisibilitySchema.default('space'),
	ingredients: z.array(ingredientSchema).max(100).default([])
});

type CreateDishInput = z.infer<typeof createDishSchema>;
type UpdateDishInput = z.infer<typeof updateDishSchema>;
type IngredientInput = z.infer<typeof ingredientSchema>;
export type DishFormInput = z.infer<typeof dishFormSchema>;

type SerializedIngredient = ReturnType<typeof serializeIngredient>;
type SerializedDish = ReturnType<typeof serializeDish>;

const normalizeSearch = (value: string | null | undefined) => value?.trim().toLowerCase() ?? '';

export const parseDishTagsText = (value: string | null | undefined) =>
	normalizeDishTags(
		(value ?? '')
			.split(/[,，]/)
			.map((tag) => tag.trim())
	);

export const dishFormToCreateInput = (input: DishFormInput): CreateDishInput => ({
	name: input.name,
	category: input.category,
	instructions: input.instructions,
	baseServings: input.baseServings,
	servingBasisConfirmed: true,
	tags: parseDishTagsText(input.tagsText),
	visibility: input.visibility,
	ingredients: input.ingredients
});

export const dishFormToUpdateInput = (input: DishFormInput): UpdateDishInput => dishFormToCreateInput(input);

const serializeIngredient = (ingredient: DishIngredient) => ({
	id: ingredient.id,
	name: ingredient.name,
	quantity: ingredient.quantity,
	unit: ingredient.unit,
	category: ingredient.category,
	notes: ingredient.notes,
	sortOrder: ingredient.sortOrder,
	createdAt: ingredient.createdAt,
	updatedAt: ingredient.updatedAt
});

const serializeDish = (
	dish: Dish,
	ingredients: SerializedIngredient[] = [],
	actors: { createdBy: UserLabel | null; updatedBy: UserLabel | null } = { createdBy: null, updatedBy: null }
) => ({
	id: dish.id,
	name: dish.name,
	category: dish.category,
	instructions: dish.instructions,
	baseServings: dish.baseServings,
	servingBasisConfirmed: dish.servingBasisConfirmed,
	tags: Array.isArray(dish.tags) ? dish.tags : [],
	visibility: dish.visibility,
	ingredients,
	createdBy: actors.createdBy,
	updatedBy: actors.updatedBy,
	createdAt: dish.createdAt,
	updatedAt: dish.updatedAt
});

const ingredientValues = (dishId: string, ingredients: IngredientInput[]): NewDishIngredient[] =>
	ingredients.map((ingredient, index) => ({
		id: crypto.randomUUID(),
		dishId,
		name: ingredient.name,
		quantity: ingredient.quantity ?? null,
		unit: ingredient.unit ?? null,
		category: ingredient.category ?? null,
		notes: ingredient.notes ?? null,
		sortOrder: ingredient.sortOrder ?? index
	}));

const loadIngredients = async (context: AuthenticatedContext, dishIds: string[]) => {
	if (dishIds.length === 0) {
		return new Map<string, SerializedIngredient[]>();
	}

	const rows = await context.db
		.select()
		.from(dishIngredients)
		.where(inArray(dishIngredients.dishId, dishIds))
		.orderBy(asc(dishIngredients.sortOrder), asc(dishIngredients.createdAt));

	return rows.reduce((map, ingredient) => {
		const list = map.get(ingredient.dishId) ?? [];
		list.push(serializeIngredient(ingredient));
		map.set(ingredient.dishId, list);
		return map;
	}, new Map<string, SerializedIngredient[]>());
};

const dishMatchesQuery = (dish: SerializedDish, query: string) => {
	if (!query) {
		return true;
	}

	const searchableValues = [
		dish.name,
		dish.category,
		...dish.tags,
		...dish.ingredients.map((ingredient) => ingredient.name)
	].filter((value): value is string => Boolean(value));

	return searchableValues.some((value) => value.toLowerCase().includes(query));
};

export const listDishes = async (context: AuthenticatedContext, options?: { query?: string | null }) => {
	const rows = await context.db
		.select()
		.from(dishes)
		.where(eq(dishes.spaceId, context.space.id))
		.orderBy(desc(dishes.createdAt));

	const ingredientsByDish = await loadIngredients(
		context,
		rows.map((dish) => dish.id)
	);
	const userLabels = await loadUserLabels(context, rows.flatMap((dish) => [dish.createdByUserId, dish.updatedByUserId]));

	const query = normalizeSearch(options?.query);

	return rows
		.map((dish) =>
			serializeDish(dish, ingredientsByDish.get(dish.id) ?? [], {
				createdBy: userLabelFrom(userLabels, dish.createdByUserId),
				updatedBy: userLabelFrom(userLabels, dish.updatedByUserId)
			})
		)
		.filter((dish) => dishMatchesQuery(dish, query));
};

export const getDish = async (context: AuthenticatedContext, id: string) => {
	const [dish] = await context.db
		.select()
		.from(dishes)
		.where(and(eq(dishes.id, id), eq(dishes.spaceId, context.space.id)))
		.limit(1);

	if (!dish) {
		throw apiError('NOT_FOUND', 'Dish not found');
	}

	const ingredientsByDish = await loadIngredients(context, [dish.id]);
	const userLabels = await loadUserLabels(context, [dish.createdByUserId, dish.updatedByUserId]);

	return serializeDish(dish, ingredientsByDish.get(dish.id) ?? [], {
		createdBy: userLabelFrom(userLabels, dish.createdByUserId),
		updatedBy: userLabelFrom(userLabels, dish.updatedByUserId)
	});
};

export const createDish = async (context: AuthenticatedContext, input: CreateDishInput) => {
	const id = crypto.randomUUID();

	await context.db.insert(dishes).values({
		id,
		spaceId: context.space.id,
		name: input.name,
		category: input.category ?? null,
		instructions: input.instructions ?? null,
		baseServings: input.baseServings,
		servingBasisConfirmed: input.servingBasisConfirmed,
		tags: input.tags,
		visibility: input.visibility,
		createdByUserId: context.user.id,
		updatedByUserId: context.user.id
	});

	const ingredients = ingredientValues(id, input.ingredients);

	if (ingredients.length > 0) {
		await context.db.insert(dishIngredients).values(ingredients);
	}

	return getDish(context, id);
};

export const updateDish = async (context: AuthenticatedContext, id: string, input: UpdateDishInput) => {
	await getDish(context, id);

	const { ingredients, ...dishInput } = input;
	const values = Object.fromEntries(
		Object.entries(dishInput).filter(([, value]) => value !== undefined)
	) as Partial<NewDish>;
	if (values.baseServings !== undefined && values.servingBasisConfirmed === undefined) {
		values.servingBasisConfirmed = true;
	}

	if (Object.keys(values).length > 0) {
		await context.db
			.update(dishes)
			.set({
				...values,
				updatedByUserId: context.user.id,
				updatedAt: sql`CURRENT_TIMESTAMP`
			})
			.where(and(eq(dishes.id, id), eq(dishes.spaceId, context.space.id)));
	}

	if (ingredients !== undefined) {
		await context.db.delete(dishIngredients).where(eq(dishIngredients.dishId, id));

		const nextIngredients = ingredientValues(id, ingredients);

		if (nextIngredients.length > 0) {
			await context.db.insert(dishIngredients).values(nextIngredients);
		}

		await context.db
			.update(dishes)
			.set({ updatedByUserId: context.user.id, updatedAt: sql`CURRENT_TIMESTAMP` })
			.where(and(eq(dishes.id, id), eq(dishes.spaceId, context.space.id)));
	}

	return getDish(context, id);
};

export const deleteDish = async (context: AuthenticatedContext, id: string) => {
	await getDish(context, id);

	await context.db.delete(dishes).where(and(eq(dishes.id, id), eq(dishes.spaceId, context.space.id)));

	return { deleted: true, id };
};

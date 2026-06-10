import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { apiError } from './api/errors';
import { mealPlans, mealTargets, type MealTarget, type NewMealTarget } from './db/schema';
import type { AuthenticatedContext } from './context';

const targetTypeSchema = z.enum(['home', 'client', 'gathering', 'other']);

const notesSchema = z.string().trim().max(2000).nullable().optional();
const emptyStringToNull = (value: unknown) => (value === '' ? null : value);
const emptyStringToUndefined = (value: unknown) => (value === '' ? undefined : value);
const formNotesSchema = z.preprocess(emptyStringToNull, notesSchema);

const targetFieldsSchema = z.object({
	name: z.string().trim().min(1, '请输入用餐对象名称').max(80),
	type: targetTypeSchema.optional(),
	peopleCount: z.number().int().min(1).max(999).optional(),
	tasteNotes: notesSchema,
	dietaryRestrictions: notesSchema,
	budgetNotes: notesSchema,
	contactNotes: notesSchema
});

export const createTargetSchema = targetFieldsSchema.extend({
	type: targetTypeSchema.optional().default('home'),
	peopleCount: z.number().int().min(1).max(999).optional().default(1)
});

export const updateTargetSchema = targetFieldsSchema
	.partial()
	.refine((value) => Object.keys(value).length > 0, { message: 'At least one field is required' });

export const targetFormSchema = z.object({
	name: z.string().trim().min(1, '请输入用餐对象名称').max(80),
	type: targetTypeSchema.default('home'),
	peopleCount: z.preprocess(emptyStringToUndefined, z.coerce.number().int().min(1).max(999).default(1)),
	tasteNotes: formNotesSchema,
	dietaryRestrictions: formNotesSchema,
	budgetNotes: formNotesSchema,
	contactNotes: formNotesSchema
});

type CreateTargetInput = z.infer<typeof createTargetSchema>;
type UpdateTargetInput = z.infer<typeof updateTargetSchema>;
export type TargetFormInput = z.infer<typeof targetFormSchema>;

const serializeTarget = (target: MealTarget) => ({
	id: target.id,
	name: target.name,
	type: target.type,
	peopleCount: target.peopleCount,
	tasteNotes: target.tasteNotes,
	dietaryRestrictions: target.dietaryRestrictions,
	budgetNotes: target.budgetNotes,
	contactNotes: target.contactNotes,
	createdAt: target.createdAt,
	updatedAt: target.updatedAt
});

export const listTargets = async ({ db, space }: AuthenticatedContext) => {
	const rows = await db
		.select()
		.from(mealTargets)
		.where(eq(mealTargets.spaceId, space.id))
		.orderBy(desc(mealTargets.createdAt));

	return rows.map(serializeTarget);
};

export const getTarget = async ({ db, space }: AuthenticatedContext, id: string) => {
	const [target] = await db
		.select()
		.from(mealTargets)
		.where(and(eq(mealTargets.id, id), eq(mealTargets.spaceId, space.id)))
		.limit(1);

	if (!target) {
		throw apiError('NOT_FOUND', 'Meal target not found');
	}

	return serializeTarget(target);
};

export const createTarget = async (context: AuthenticatedContext, input: CreateTargetInput) => {
	const { db, space } = context;
	const id = crypto.randomUUID();

	await db.insert(mealTargets).values({
		id,
		spaceId: space.id,
		name: input.name,
		type: input.type,
		peopleCount: input.peopleCount,
		tasteNotes: input.tasteNotes ?? null,
		dietaryRestrictions: input.dietaryRestrictions ?? null,
		budgetNotes: input.budgetNotes ?? null,
		contactNotes: input.contactNotes ?? null
	});

	return getTarget(context, id);
};

export const updateTarget = async (context: AuthenticatedContext, id: string, input: UpdateTargetInput) => {
	await getTarget(context, id);

	const values = Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined)
	) as Partial<NewMealTarget>;

	await context.db
		.update(mealTargets)
		.set({
			...values,
			updatedAt: sql`CURRENT_TIMESTAMP`
		})
		.where(and(eq(mealTargets.id, id), eq(mealTargets.spaceId, context.space.id)));

	return getTarget(context, id);
};

export const deleteTarget = async (context: AuthenticatedContext, id: string) => {
	await getTarget(context, id);

	await context.db.delete(mealTargets).where(and(eq(mealTargets.id, id), eq(mealTargets.spaceId, context.space.id)));

	return { deleted: true, id };
};

export const listTargetMealPlans = async (context: AuthenticatedContext, id: string) => {
	await getTarget(context, id);

	return context.db
		.select({
			id: mealPlans.id,
			title: mealPlans.title,
			type: mealPlans.type,
			status: mealPlans.status,
			startDate: mealPlans.startDate,
			endDate: mealPlans.endDate,
			notes: mealPlans.notes,
			createdAt: mealPlans.createdAt,
			updatedAt: mealPlans.updatedAt
		})
		.from(mealPlans)
		.where(and(eq(mealPlans.spaceId, context.space.id), eq(mealPlans.targetId, id)))
		.orderBy(desc(mealPlans.createdAt));
};

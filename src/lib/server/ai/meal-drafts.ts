import { z } from 'zod';
import {
	DISH_CATEGORY_OPTIONS,
	DISH_TAG_OPTIONS,
	INGREDIENT_CATEGORY_OPTIONS,
	INGREDIENT_UNIT_OPTIONS,
	normalizeDishTags,
	normalizeOption,
	optionListText
} from '$lib/domain/food-options';

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 12_000;
const MAX_OUTPUT_TOKENS = 2_400;

const suggestedDishIngredientSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		quantity: z.string().trim().min(1).max(40),
		unit: z.enum(INGREDIENT_UNIT_OPTIONS),
		category: z.enum(INGREDIENT_CATEGORY_OPTIONS),
		notes: z.string().trim().max(500).nullable()
	})
	.strict();

const suggestedDishSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		reason: z.string().trim().max(160).nullable(),
		category: z.enum(DISH_CATEGORY_OPTIONS),
		tags: z.array(z.enum(DISH_TAG_OPTIONS)).min(1).max(6),
		baseServings: z.number().int().min(1).max(999),
		ingredients: z.array(suggestedDishIngredientSchema).min(2).max(10),
		instructions: z.string().trim().min(8).max(2000),
		uncertainFields: z.array(z.string().trim().min(1).max(120)).max(30)
	})
	.strict();

export const mealDraftSuggestedDishSchema = suggestedDishSchema;

export const mealDraftSchema = z
	.object({
		title: z.string().trim().max(120).nullable(),
		servings: z.number().int().min(1).max(999).nullable(),
		plannedDate: z.string().trim().max(20).nullable(),
		mealSlot: z.string().trim().max(40).nullable(),
		targetId: z.string().trim().max(120).nullable(),
		existingDishIds: z.array(z.string().trim().min(1).max(120)).max(6),
		suggestedDishes: z.array(suggestedDishSchema).max(6),
		notes: z.string().trim().max(2000).nullable(),
		assumptions: z.array(z.string().trim().min(1).max(200)).max(8),
		constraints: z.array(z.string().trim().min(1).max(200)).max(8),
		uncertainFields: z.array(z.string().trim().min(1).max(120)).max(30)
	})
	.strict()
	.refine((draft) => draft.existingDishIds.length > 0 || draft.suggestedDishes.length > 0, {
		message: 'meal draft must contain at least one dish',
		path: ['suggestedDishes']
	});

export type MealDraft = z.infer<typeof mealDraftSchema>;

export type MealDraftDishContext = {
	id: string;
	name: string;
	category: string | null;
	tags: string[];
	baseServings: number;
};

export type MealDraftTargetContext = {
	id: string;
	name: string;
	tasteNotes: string | null;
	dietaryRestrictions: string | null;
};

export type MealDraftProviderInput = {
	prompt: string;
	today: string;
	dishes: MealDraftDishContext[];
	targets: MealDraftTargetContext[];
	mode?: 'draft' | 'replace';
	excludeDishNames?: string[];
};

type MealDraftProviderResult = {
	content: unknown;
	model: string;
	usage?: {
		promptTokens?: number;
		completionTokens?: number;
		totalTokens?: number;
	};
};

export type MealDraftProvider = {
	generate(input: MealDraftProviderInput, signal: AbortSignal): Promise<MealDraftProviderResult>;
};

export class MealDraftError extends Error {
	readonly code: 'unavailable' | 'timeout' | 'invalid_response' | 'provider_error';
	readonly retryable: boolean;

	constructor(
		code: 'unavailable' | 'timeout' | 'invalid_response' | 'provider_error',
		message: string,
		retryable = true
	) {
		super(message);
		this.name = 'MealDraftError';
		this.code = code;
		this.retryable = retryable;
	}
}

const jsonSchema = {
	type: 'object',
	additionalProperties: false,
	required: [
		'title',
		'servings',
		'plannedDate',
		'mealSlot',
		'targetId',
		'existingDishIds',
		'suggestedDishes',
		'notes',
		'assumptions',
		'constraints',
		'uncertainFields'
	],
	properties: {
		title: { type: ['string', 'null'], maxLength: 120 },
		servings: { type: ['integer', 'null'], minimum: 1, maximum: 999 },
		plannedDate: { type: ['string', 'null'], maxLength: 20 },
		mealSlot: { type: ['string', 'null'], maxLength: 40 },
		targetId: { type: ['string', 'null'], maxLength: 120 },
		existingDishIds: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 120 } },
		suggestedDishes: {
			type: 'array',
			maxItems: 6,
			items: {
				type: 'object',
				additionalProperties: false,
				required: [
					'name',
					'reason',
					'category',
					'tags',
					'baseServings',
					'ingredients',
					'instructions',
					'uncertainFields'
				],
				properties: {
					name: { type: 'string', maxLength: 80 },
					reason: { type: ['string', 'null'], maxLength: 160 },
					category: { type: 'string', enum: DISH_CATEGORY_OPTIONS },
					tags: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string', enum: DISH_TAG_OPTIONS } },
					baseServings: { type: 'integer', minimum: 1, maximum: 999 },
					ingredients: {
						type: 'array',
						minItems: 2,
						maxItems: 10,
						items: {
							type: 'object',
							additionalProperties: false,
							required: ['name', 'quantity', 'unit', 'category', 'notes'],
							properties: {
								name: { type: 'string', maxLength: 80 },
								quantity: { type: 'string', minLength: 1, maxLength: 40 },
								unit: { type: 'string', enum: INGREDIENT_UNIT_OPTIONS },
								category: { type: 'string', enum: INGREDIENT_CATEGORY_OPTIONS },
								notes: { type: ['string', 'null'], maxLength: 500 }
							}
						}
					},
					instructions: { type: 'string', minLength: 8, maxLength: 2000 },
					uncertainFields: { type: 'array', maxItems: 30, items: { type: 'string', maxLength: 120 } }
				}
			}
		},
		notes: { type: ['string', 'null'], maxLength: 2000 },
		assumptions: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 200 } },
		constraints: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 200 } },
		uncertainFields: { type: 'array', maxItems: 30, items: { type: 'string', maxLength: 120 } }
	}
} as const;

const systemPrompt = `你是饭单应用的 AI 饭单草稿助手。你只生成可编辑草稿，不保存数据。

可选菜品分类：${optionListText(DISH_CATEGORY_OPTIONS)}
可选标签：${optionListText(DISH_TAG_OPTIONS)}
可选食材分类：${optionListText(INGREDIENT_CATEGORY_OPTIONS)}
可选单位：${optionListText(INGREDIENT_UNIT_OPTIONS)}

规则：
1. 默认给一顿饭 2 到 3 道菜；如果用户明确要求更多或更少，尊重用户。
2. 优先复用 existingDishes 中的菜品，并且 existingDishIds 只能包含输入列表里的 id。
3. 新建议必须放到 suggestedDishes，不能伪装成已保存菜品。每道新建议必须带完整可编辑菜品草稿：category、tags、baseServings、instructions、2 到 6 种 ingredients。
4. 如果用户提到目标对象，targetId 只能选择 targets 输入列表里的 id；无法确认就返回 null。
5. 如果用户提到目标对象或饮食限制，targets 里的 dietaryRestrictions 优先级最高，不要被建议覆盖。
6. 不要推断过敏、疾病、身份或家庭成员信息；不确定内容写到 assumptions 或 uncertainFields。
7. plannedDate 可用今天 today 推断“今晚/明天”等简单日期；不确定就返回 null。
8. category、tags、食材 category、unit 只能从上面的可选项选择，不能创造新选项。
9. suggestedDishes 的每个食材都必须有 name、quantity、unit、category。数量用简短可采购文本，例如 "3"、"250"、"1/2"、"适量"；不要留空。
10. 新建议的 baseServings 默认等于本顿 servings；若 servings 不确定，则按常见家庭用量估算 2 或 3，并在该菜 uncertainFields 写入 "baseServings"。
11. 凡不是用户原话明确给出的菜品分类、标签、做法、食材数量或单位，都写入该菜 uncertainFields，例如 "ingredients.0.quantity"。
12. notes 用简短中文记录口味、时间、限制和需要用户核对的信息。
13. 输出必须严格符合 JSON Schema，不要输出 Markdown。`;

const textOrNull = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const extractContent = (response: Record<string, unknown>) => ('response' in response ? response.response : response);

const parseContent = (content: unknown) => {
	if (typeof content !== 'string') return content;
	const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
	try {
		return JSON.parse(trimmed);
	} catch {
		throw new MealDraftError('invalid_response', 'AI 返回的饭单草稿格式不完整，请重试或继续手动安排。');
	}
};

const normalizeDraftCandidate = (candidate: unknown, input: MealDraftProviderInput) => {
	if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return candidate;
	const value = candidate as Record<string, unknown>;
	const validDishIds = new Set(input.dishes.map((dish) => dish.id));
	const validTargetIds = new Set(input.targets.map((target) => target.id));
	const excludedNames = new Set((input.excludeDishNames ?? []).map((name) => name.trim()).filter(Boolean));
	const servings = typeof value.servings === 'number' && Number.isInteger(value.servings) ? value.servings : null;
	const existingDishIds = Array.isArray(value.existingDishIds)
		? Array.from(new Set(value.existingDishIds.filter((id): id is string => typeof id === 'string' && validDishIds.has(id)))).slice(0, 6)
		: [];
	const suggestedDishes = Array.isArray(value.suggestedDishes)
		? value.suggestedDishes
				.map((dish) => {
					if (!dish || typeof dish !== 'object' || Array.isArray(dish)) return null;
					const item = dish as Record<string, unknown>;
					const name = textOrNull(item.name);
					if (!name || excludedNames.has(name)) return null;

					const ingredients = Array.isArray(item.ingredients)
						? item.ingredients
								.map((ingredient) => {
									if (!ingredient || typeof ingredient !== 'object' || Array.isArray(ingredient)) return null;
									const ingredientItem = ingredient as Record<string, unknown>;
									const ingredientName = textOrNull(ingredientItem.name);
									if (!ingredientName) return null;
									return {
										name: ingredientName,
										quantity: textOrNull(ingredientItem.quantity) ?? '适量',
										unit: normalizeOption(textOrNull(ingredientItem.unit), INGREDIENT_UNIT_OPTIONS, '适量'),
										category: normalizeOption(textOrNull(ingredientItem.category), INGREDIENT_CATEGORY_OPTIONS, '其他'),
										notes: textOrNull(ingredientItem.notes)
									};
								})
								.filter(
									(ingredient): ingredient is {
										name: string;
										quantity: string;
										unit: (typeof INGREDIENT_UNIT_OPTIONS)[number];
										category: (typeof INGREDIENT_CATEGORY_OPTIONS)[number];
										notes: string | null;
									} => Boolean(ingredient)
								)
						: [];
					const tags = normalizeDishTags(
						Array.isArray(item.tags)
							? item.tags.map((tag) => textOrNull(tag)).filter((tag): tag is string => Boolean(tag))
							: []
					).slice(0, 6);
					const uncertainFields = Array.isArray(item.uncertainFields)
						? item.uncertainFields.map((field) => textOrNull(field)).filter((field): field is string => Boolean(field))
						: [];
					const baseServings =
						typeof item.baseServings === 'number' && Number.isInteger(item.baseServings)
							? item.baseServings
							: servings ?? 2;
					if (
						!(typeof item.baseServings === 'number' && Number.isInteger(item.baseServings)) &&
						!uncertainFields.includes('baseServings')
					) {
						uncertainFields.push('baseServings');
					}

					return {
						name,
						reason: textOrNull(item.reason),
						category: normalizeOption(textOrNull(item.category), DISH_CATEGORY_OPTIONS, '家常菜'),
						tags: tags.length > 0 ? tags : ['快手'],
						baseServings,
						ingredients,
						instructions:
							textOrNull(item.instructions) ??
							`${name}按家常做法处理，先备好食材，再按熟成顺序烹调并调味。`,
						uncertainFields
					};
				})
				.filter((dish): dish is z.infer<typeof suggestedDishSchema> => Boolean(dish))
				.slice(0, 6)
		: [];
	const targetId = textOrNull(value.targetId);
	const uncertainFields = Array.isArray(value.uncertainFields)
		? value.uncertainFields.map((field) => textOrNull(field)).filter((field): field is string => Boolean(field))
		: [];
	if (servings === null && !uncertainFields.includes('servings')) uncertainFields.push('servings');

	return {
		title: textOrNull(value.title),
		servings,
		plannedDate: textOrNull(value.plannedDate),
		mealSlot: textOrNull(value.mealSlot),
		targetId: targetId && validTargetIds.has(targetId) ? targetId : null,
		existingDishIds,
		suggestedDishes,
		notes: textOrNull(value.notes),
		assumptions: Array.isArray(value.assumptions)
			? value.assumptions.map((item) => textOrNull(item)).filter((item): item is string => Boolean(item))
			: [],
		constraints: Array.isArray(value.constraints)
			? value.constraints.map((item) => textOrNull(item)).filter((item): item is string => Boolean(item))
			: [],
		uncertainFields
	};
};

export const createWorkersAiMealDraftProvider = (
	ai: Ai | undefined,
	model = DEFAULT_MODEL
): MealDraftProvider | null => {
	if (!ai) return null;

	return {
		async generate(input, signal) {
			const payload = {
				messages: [
					{ role: 'system', content: systemPrompt },
					{
						role: 'user',
						content: JSON.stringify({
							prompt: input.prompt,
							today: input.today,
							mode: input.mode ?? 'draft',
							excludeDishNames: input.excludeDishNames ?? [],
							existingDishes: input.dishes.slice(0, 40),
							targets: input.targets.slice(0, 20)
						})
					}
				],
				temperature: 0.25,
				max_tokens: MAX_OUTPUT_TOKENS
			};
			const run = (withSchema: boolean) =>
				ai.run(
					model,
					withSchema
						? {
								...payload,
								response_format: { type: 'json_schema', json_schema: jsonSchema }
							}
						: payload,
					{ signal, tags: ['fandan', 'meal-draft'] }
				) as Promise<Record<string, unknown>>;
			let response: Record<string, unknown>;

			try {
				response = await run(true);
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') throw error;
				console.warn('ai.meal_draft.schema_mode_failed', {
					model,
					message: error instanceof Error ? error.message : String(error)
				});
				response = await run(false);
			}
			const usage = response.usage as
				| { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
				| undefined;

			return {
				content: extractContent(response),
				model,
				usage: usage
					? {
							promptTokens: usage.prompt_tokens,
							completionTokens: usage.completion_tokens,
							totalTokens: usage.total_tokens
						}
					: undefined
			};
		}
	};
};

const normalizeProviderError = (error: unknown) => {
	if (error instanceof MealDraftError) return error;
	if (error instanceof DOMException && error.name === 'AbortError') {
		return new MealDraftError('timeout', 'AI 饭单草稿等待超时，请重试或继续手动安排。');
	}
	if (error instanceof Error && /abort|timeout/i.test(`${error.name} ${error.message}`)) {
		return new MealDraftError('timeout', 'AI 饭单草稿等待超时，请重试或继续手动安排。');
	}
	return new MealDraftError('provider_error', 'AI 暂时没有生成饭单草稿，请重试或继续手动安排。');
};

export const generateMealDraft = async (provider: MealDraftProvider | null, input: MealDraftProviderInput) => {
	if (!provider) throw new MealDraftError('unavailable', 'AI 饭单草稿暂不可用，你仍可以手动安排。', false);
	const startedAt = Date.now();
	let lastError: MealDraftError | null = null;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const result = await provider.generate(input, controller.signal);
			const parsed = mealDraftSchema.safeParse(normalizeDraftCandidate(parseContent(result.content), input));
			if (!parsed.success) {
				console.warn('ai.meal_draft.invalid_response', {
					attempt,
					issues: parsed.error.issues.slice(0, 8).map((issue) => ({ path: issue.path.join('.'), code: issue.code }))
				});
				throw new MealDraftError('invalid_response', 'AI 返回的饭单草稿缺少必要字段，请重试或继续手动安排。');
			}
			console.info('ai.meal_draft', {
				status: 'success',
				attempts: attempt,
				durationMs: Date.now() - startedAt,
				model: result.model,
				usage: result.usage
			});
			return { draft: parsed.data, attempts: attempt, model: result.model };
		} catch (error) {
			lastError = normalizeProviderError(error);
			if (!lastError.retryable || attempt === MAX_ATTEMPTS) {
				console.warn('ai.meal_draft', { status: lastError.code, attempts: attempt, durationMs: Date.now() - startedAt });
				throw lastError;
			}
		} finally {
			clearTimeout(timeout);
		}
	}

	throw lastError ?? new MealDraftError('provider_error', 'AI 暂时不可用，请继续手动安排。');
};

export const mealDraftLimits = { maxAttempts: MAX_ATTEMPTS, timeoutMs: TIMEOUT_MS, maxOutputTokens: MAX_OUTPUT_TOKENS };

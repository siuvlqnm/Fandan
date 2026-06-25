import { z } from 'zod';

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 12_000;
const MAX_OUTPUT_TOKENS = 1_000;

const suggestedDishSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		reason: z.string().trim().max(160).nullable()
	})
	.strict();

export const mealDraftSchema = z
	.object({
		title: z.string().trim().max(120).nullable(),
		servings: z.number().int().min(1).max(999).nullable(),
		plannedDate: z.string().trim().max(20).nullable(),
		mealSlot: z.string().trim().max(40).nullable(),
		targetId: z.string().trim().max(120).nullable(),
		existingDishIds: z.array(z.string().trim().min(1).max(120)).max(6),
		suggestedDishes: z.array(suggestedDishSchema).min(1).max(6),
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
			minItems: 1,
			maxItems: 6,
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['name', 'reason'],
				properties: {
					name: { type: 'string', maxLength: 80 },
					reason: { type: ['string', 'null'], maxLength: 160 }
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

规则：
1. 默认给一顿饭 2 到 3 道菜；如果用户明确要求更多或更少，尊重用户。
2. 优先复用 existingDishes 中的菜品，并且 existingDishIds 只能包含输入列表里的 id。
3. 新建议必须放到 suggestedDishes，不能伪装成已保存菜品。
4. 如果用户提到目标对象，targetId 只能选择 targets 输入列表里的 id；无法确认就返回 null。
5. 如果用户提到目标对象或饮食限制，targets 里的 dietaryRestrictions 优先级最高，不要被建议覆盖。
6. 不要推断过敏、疾病、身份或家庭成员信息；不确定内容写到 assumptions 或 uncertainFields。
7. plannedDate 可用今天 today 推断“今晚/明天”等简单日期；不确定就返回 null。
8. suggestedDishes 必须至少有一道菜。没有可复用菜品时，必须提供 2 到 3 道具体 suggestedDishes 菜名。
9. notes 用简短中文记录口味、时间、限制和需要用户核对的信息。
10. 输出必须严格符合 JSON Schema，不要输出 Markdown。`;

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
	const existingDishIds = Array.isArray(value.existingDishIds)
		? Array.from(new Set(value.existingDishIds.filter((id): id is string => typeof id === 'string' && validDishIds.has(id)))).slice(0, 6)
		: [];
	const suggestedDishes = Array.isArray(value.suggestedDishes)
		? value.suggestedDishes
				.map((dish) => {
					if (!dish || typeof dish !== 'object' || Array.isArray(dish)) return null;
					const item = dish as Record<string, unknown>;
					const name = textOrNull(item.name);
					return name && !excludedNames.has(name) ? { name, reason: textOrNull(item.reason) } : null;
				})
				.filter((dish): dish is { name: string; reason: string | null } => Boolean(dish))
				.slice(0, 6)
		: [];
	const targetId = textOrNull(value.targetId);
	const servings = typeof value.servings === 'number' && Number.isInteger(value.servings) ? value.servings : null;
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

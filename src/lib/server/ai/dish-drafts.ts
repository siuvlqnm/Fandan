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

const DEFAULT_MODEL = '@cf/meta/llama-3.2-3b-instruct';
const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 12_000;
const MAX_OUTPUT_TOKENS = 1_800;

const dishDraftIngredientSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		quantity: z.string().trim().min(1).max(40),
		unit: z.enum(INGREDIENT_UNIT_OPTIONS),
		category: z.enum(INGREDIENT_CATEGORY_OPTIONS),
		notes: z.string().trim().max(500).nullable()
	})
	.strict();

export const dishDraftSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		category: z.enum(DISH_CATEGORY_OPTIONS),
		tags: z.array(z.enum(DISH_TAG_OPTIONS)).min(1).max(6),
		baseServings: z.number().int().min(1).max(999),
		ingredients: z.array(dishDraftIngredientSchema).min(2).max(12),
		instructions: z.string().trim().min(8).max(4000),
		uncertainFields: z.array(z.string().trim().min(1).max(120)).max(50),
		notes: z.array(z.string().trim().min(1).max(240)).max(8)
	})
	.strict();

export type DishDraft = z.infer<typeof dishDraftSchema>;

type DishDraftProviderResult = {
	content: unknown;
	model: string;
	usage?: {
		promptTokens?: number;
		completionTokens?: number;
		totalTokens?: number;
	};
};

export type DishDraftProvider = {
	generate(prompt: string, signal: AbortSignal): Promise<DishDraftProviderResult>;
};

export class DishDraftError extends Error {
	readonly code: 'unavailable' | 'timeout' | 'invalid_response' | 'provider_error';
	readonly retryable: boolean;

	constructor(
		code: 'unavailable' | 'timeout' | 'invalid_response' | 'provider_error',
		message: string,
		retryable = true
	) {
		super(message);
		this.name = 'DishDraftError';
		this.code = code;
		this.retryable = retryable;
	}
}

const jsonSchema = {
	type: 'object',
	additionalProperties: false,
	required: [
		'name',
		'category',
		'tags',
		'baseServings',
		'ingredients',
		'instructions',
		'uncertainFields',
		'notes'
	],
	properties: {
		name: { type: 'string', maxLength: 80 },
		category: { type: 'string', enum: DISH_CATEGORY_OPTIONS },
		tags: { type: 'array', minItems: 1, maxItems: 6, items: { type: 'string', enum: DISH_TAG_OPTIONS } },
		baseServings: { type: 'integer', minimum: 1, maximum: 999 },
		ingredients: {
			type: 'array',
			minItems: 2,
			maxItems: 12,
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
		instructions: { type: 'string', minLength: 8, maxLength: 4000 },
		uncertainFields: { type: 'array', maxItems: 50, items: { type: 'string', maxLength: 120 } },
		notes: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 240 } }
	}
} as const;

const systemPrompt = `你是饭单应用的菜品草稿助手。把用户的一句话整理为可编辑的结构化菜品草稿。

可选菜品分类：${optionListText(DISH_CATEGORY_OPTIONS)}
可选标签：${optionListText(DISH_TAG_OPTIONS)}
可选食材分类：${optionListText(INGREDIENT_CATEGORY_OPTIONS)}
可选单位：${optionListText(INGREDIENT_UNIT_OPTIONS)}

规则：
1. 只生成草稿，绝不声称已经保存。
2. 不推断过敏、忌口、疾病、身份或家庭成员信息，也不要增加这些字段。
3. 必须生成 category、1 到 6 个 tags、baseServings、instructions，以及 2 到 8 种关键食材。
4. category、tags、食材 category、unit 只能从上面的可选项中选择，不能创造新选项。
5. 用户明确给出人数时作为 baseServings；未给出时按常见家庭用量估算 2 或 3，并在 uncertainFields 写入 "baseServings"。
6. 每个食材必须有 name、quantity、unit、category。数量用简短可采购文本，例如 "3"、"250"、"1/2"、"适量"；不要留空。
7. 凡不是用户原话明确给出的内容，都在 uncertainFields 中写入对应路径，例如 "category"、"ingredients.0.quantity"、"ingredients.0.unit" 或 "instructions"。
8. notes 用简短中文说明最需要用户核对的事项。不要计算购物数量。
9. 输出必须严格符合 JSON Schema，不要输出 Markdown。`;

const extractContent = (response: Record<string, unknown>) => {
	if ('response' in response) {
		return response.response;
	}

	return response;
};

const parseContent = (content: unknown) => {
	if (typeof content !== 'string') {
		return content;
	}

	const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

	try {
		return JSON.parse(trimmed);
	} catch {
		throw new DishDraftError('invalid_response', 'AI 返回的草稿格式不完整，请重试或继续手动填写。');
	}
};

const textOrNull = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

const promptNameFallback = (prompt: string) =>
	prompt
		.split(/[，,。\n]/)[0]
		?.trim()
		.slice(0, 80) || '';

const normalizeDraftCandidate = (candidate: unknown, prompt: string) => {
	if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
		return candidate;
	}

	const value = candidate as Record<string, unknown>;
	const name = textOrNull(value.name) ?? promptNameFallback(prompt);
	const ingredients = Array.isArray(value.ingredients)
		? value.ingredients.map((ingredient) => {
				if (!ingredient || typeof ingredient !== 'object' || Array.isArray(ingredient)) {
					return ingredient;
				}

				const item = ingredient as Record<string, unknown>;
				return {
					name: textOrNull(item.name) ?? '',
					quantity: textOrNull(item.quantity) ?? '适量',
					unit: normalizeOption(textOrNull(item.unit), INGREDIENT_UNIT_OPTIONS, '适量'),
					category: normalizeOption(textOrNull(item.category), INGREDIENT_CATEGORY_OPTIONS, '其他'),
					notes: textOrNull(item.notes)
				};
			})
		: [];
	const baseServings =
		typeof value.baseServings === 'number' && Number.isInteger(value.baseServings)
			? value.baseServings
			: 2;
	const uncertainFields = Array.isArray(value.uncertainFields)
		? value.uncertainFields
				.map((field) => textOrNull(field))
				.filter((field): field is string => Boolean(field))
		: [];

	if (
		!(typeof value.baseServings === 'number' && Number.isInteger(value.baseServings)) &&
		!uncertainFields.includes('baseServings')
	) {
		uncertainFields.push('baseServings');
	}

	const tags = normalizeDishTags(
		Array.isArray(value.tags)
			? value.tags.map((tag) => textOrNull(tag)).filter((tag): tag is string => Boolean(tag))
			: []
	).slice(0, 6);

	return {
		name,
		category: normalizeOption(textOrNull(value.category), DISH_CATEGORY_OPTIONS, '家常菜'),
		tags: tags.length > 0 ? tags : ['快手'],
		baseServings,
		ingredients,
		instructions: textOrNull(value.instructions) ?? `${name}按家常做法处理，先备好食材，再按熟成顺序烹调并调味。`,
		uncertainFields,
		notes: Array.isArray(value.notes)
			? value.notes.map((note) => textOrNull(note)).filter((note): note is string => Boolean(note))
			: []
	};
};

export const createWorkersAiDishDraftProvider = (
	ai: Ai | undefined,
	model = DEFAULT_MODEL
): DishDraftProvider | null => {
	if (!ai) {
		return null;
	}

	return {
		async generate(prompt, signal) {
			const response = (await ai.run(
				model,
				{
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: prompt }
					],
					response_format: { type: 'json_schema', json_schema: jsonSchema },
					temperature: 0.2,
					max_tokens: MAX_OUTPUT_TOKENS
				},
				{ signal, tags: ['fandan', 'dish-draft'] }
			)) as Record<string, unknown>;
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
	if (error instanceof DishDraftError) {
		return error;
	}

	if (error instanceof DOMException && error.name === 'AbortError') {
		return new DishDraftError('timeout', 'AI 补全等待超时，请重试或继续手动填写。');
	}

	if (error instanceof Error && /abort|timeout/i.test(`${error.name} ${error.message}`)) {
		return new DishDraftError('timeout', 'AI 补全等待超时，请重试或继续手动填写。');
	}

	return new DishDraftError('provider_error', 'AI 暂时没有生成草稿，请重试或继续手动填写。');
};

export const generateDishDraft = async (provider: DishDraftProvider | null, prompt: string) => {
	if (!provider) {
		throw new DishDraftError('unavailable', 'AI 补全暂不可用，你仍可以直接手动创建菜品。', false);
	}

	const startedAt = Date.now();
	let lastError: DishDraftError | null = null;

	for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
		const controller = new AbortController();
		const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

		try {
			const result = await provider.generate(prompt, controller.signal);
			const parsed = dishDraftSchema.safeParse(normalizeDraftCandidate(parseContent(result.content), prompt));

			if (!parsed.success) {
				console.warn('ai.dish_draft.invalid_response', {
					attempt,
					issues: parsed.error.issues.slice(0, 8).map((issue) => ({
						path: issue.path.join('.'),
						code: issue.code
					}))
				});
				throw new DishDraftError('invalid_response', 'AI 返回的草稿缺少必要字段，请重试或继续手动填写。');
			}

			console.info('ai.dish_draft', {
				status: 'success',
				attempts: attempt,
				durationMs: Date.now() - startedAt,
				model: result.model,
				usage: result.usage
			});

			return {
				draft: parsed.data,
				attempts: attempt,
				model: result.model
			};
		} catch (error) {
			lastError = normalizeProviderError(error);

			if (!lastError.retryable || attempt === MAX_ATTEMPTS) {
				console.warn('ai.dish_draft', {
					status: lastError.code,
					attempts: attempt,
					durationMs: Date.now() - startedAt
				});
				throw lastError;
			}
		} finally {
			clearTimeout(timeout);
		}
	}

	throw lastError ?? new DishDraftError('provider_error', 'AI 暂时不可用，请继续手动填写。');
};

export const dishDraftLimits = {
	maxAttempts: MAX_ATTEMPTS,
	timeoutMs: TIMEOUT_MS,
	maxOutputTokens: MAX_OUTPUT_TOKENS
};

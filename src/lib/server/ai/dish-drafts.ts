import { z } from 'zod';

const DEFAULT_MODEL = '@cf/meta/llama-3.2-3b-instruct';
const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 12_000;
const MAX_OUTPUT_TOKENS = 1_200;

const dishDraftIngredientSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		quantity: z.string().trim().max(40).nullable(),
		unit: z.string().trim().max(24).nullable(),
		category: z.string().trim().max(40).nullable(),
		notes: z.string().trim().max(500).nullable()
	})
	.strict();

export const dishDraftSchema = z
	.object({
		name: z.string().trim().min(1).max(80),
		category: z.string().trim().max(40).nullable(),
		tags: z.array(z.string().trim().min(1).max(24)).max(12),
		baseServings: z.number().int().min(1).max(999).nullable(),
		ingredients: z.array(dishDraftIngredientSchema).max(12),
		instructions: z.string().trim().max(4000).nullable(),
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
		category: { type: ['string', 'null'], maxLength: 40 },
		tags: { type: 'array', maxItems: 12, items: { type: 'string', maxLength: 24 } },
		baseServings: { type: ['integer', 'null'], minimum: 1, maximum: 999 },
		ingredients: {
			type: 'array',
			maxItems: 12,
			items: {
				type: 'object',
				additionalProperties: false,
				required: ['name', 'quantity', 'unit', 'category', 'notes'],
				properties: {
					name: { type: 'string', maxLength: 80 },
					quantity: { type: ['string', 'null'], maxLength: 40 },
					unit: { type: ['string', 'null'], maxLength: 24 },
					category: { type: ['string', 'null'], maxLength: 40 },
					notes: { type: ['string', 'null'], maxLength: 500 }
				}
			}
		},
		instructions: { type: ['string', 'null'], maxLength: 4000 },
		uncertainFields: { type: 'array', maxItems: 50, items: { type: 'string', maxLength: 120 } },
		notes: { type: 'array', maxItems: 8, items: { type: 'string', maxLength: 240 } }
	}
} as const;

const systemPrompt = `你是饭单应用的菜品草稿助手。把用户的一句话整理为可编辑的结构化菜品草稿。

规则：
1. 只生成草稿，绝不声称已经保存。
2. 不推断过敏、忌口、疾病、身份或家庭成员信息，也不要增加这些字段。
3. 用户明确给出人数时才把它作为 baseServings；未给出时返回 null，并在 uncertainFields 写入 "baseServings"。
4. 可建议 3 到 8 种关键食材和简短做法，但凡不是用户原话明确给出的内容，都在 uncertainFields 中写入对应路径，例如 "category"、"ingredients.0.quantity" 或 "instructions"。
5. 数量必须是简短文本；无法确定就返回 null，不要伪造精确值。
6. notes 用简短中文说明最需要用户核对的事项。不要计算购物数量。
7. 输出必须严格符合 JSON Schema，不要输出 Markdown。`;

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
					quantity: textOrNull(item.quantity),
					unit: textOrNull(item.unit),
					category: textOrNull(item.category),
					notes: textOrNull(item.notes)
				};
			})
		: [];
	const baseServings =
		typeof value.baseServings === 'number' && Number.isInteger(value.baseServings)
			? value.baseServings
			: null;
	const uncertainFields = Array.isArray(value.uncertainFields)
		? value.uncertainFields
				.map((field) => textOrNull(field))
				.filter((field): field is string => Boolean(field))
		: [];

	if (baseServings === null && !uncertainFields.includes('baseServings')) {
		uncertainFields.push('baseServings');
	}

	return {
		name,
		category: textOrNull(value.category),
		tags: Array.isArray(value.tags)
			? value.tags.map((tag) => textOrNull(tag)).filter((tag): tag is string => Boolean(tag))
			: [],
		baseServings,
		ingredients,
		instructions: textOrNull(value.instructions),
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

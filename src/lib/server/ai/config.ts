import { DEFAULT_DISH_DRAFT_MODEL } from './dish-drafts';
import { DEFAULT_MEAL_DRAFT_MODEL } from './meal-drafts';

type WorkerAiEnv = Env & {
	AI?: Ai;
	AI_DISH_MODEL?: string;
	AI_MEAL_MODEL?: string;
	AI_PROVIDER_API_KEY?: string;
};

const normalizeModel = (value: string | undefined, fallback: string) => {
	const normalized = value?.trim();
	return normalized || fallback;
};

const workerEnv = (env: App.Platform['env'] | undefined) => env as WorkerAiEnv | undefined;

export const getWorkersAiBinding = (env: App.Platform['env'] | undefined) => workerEnv(env)?.AI;

export const getDishDraftModel = (env: App.Platform['env'] | undefined) =>
	normalizeModel(workerEnv(env)?.AI_DISH_MODEL, DEFAULT_DISH_DRAFT_MODEL);

export const getMealDraftModel = (env: App.Platform['env'] | undefined) =>
	normalizeModel(workerEnv(env)?.AI_MEAL_MODEL, DEFAULT_MEAL_DRAFT_MODEL);

export const getExternalModelApiKey = (env: App.Platform['env'] | undefined) => workerEnv(env)?.AI_PROVIDER_API_KEY?.trim() || null;

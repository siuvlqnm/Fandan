export const DISH_CATEGORY_OPTIONS = [
	'家常菜',
	'快手菜',
	'主食',
	'汤羹',
	'凉菜',
	'早餐',
	'儿童友好',
	'健身轻食',
	'节日聚餐',
	'甜点',
	'饮品',
	'其他'
] as const;

export const DISH_TAG_OPTIONS = [
	'快手',
	'下饭',
	'清淡',
	'少油',
	'少盐',
	'儿童友好',
	'高蛋白',
	'低脂',
	'素食',
	'适合备餐',
	'聚餐',
	'早餐'
] as const;

export const INGREDIENT_CATEGORY_OPTIONS = [
	'蔬菜',
	'水果',
	'肉禽',
	'水产',
	'蛋奶',
	'豆制品',
	'主食粮油',
	'调味料',
	'干货',
	'罐头速食',
	'酒水饮品',
	'厨房用品',
	'其他'
] as const;

export const INGREDIENT_UNIT_OPTIONS = [
	'个',
	'颗',
	'根',
	'条',
	'只',
	'块',
	'片',
	'把',
	'盒',
	'袋',
	'瓶',
	'罐',
	'杯',
	'碗',
	'勺',
	'克',
	'千克',
	'毫升',
	'升',
	'斤',
	'两',
	'少许',
	'适量'
] as const;

export type DishCategoryOption = (typeof DISH_CATEGORY_OPTIONS)[number];
export type DishTagOption = (typeof DISH_TAG_OPTIONS)[number];
export type IngredientCategoryOption = (typeof INGREDIENT_CATEGORY_OPTIONS)[number];
export type IngredientUnitOption = (typeof INGREDIENT_UNIT_OPTIONS)[number];

const normalize = (value: string | null | undefined) => value?.trim() ?? '';

export const optionListText = (options: readonly string[]) => options.join('、');

export const normalizeOption = (value: string | null | undefined, options: readonly string[], fallback = '其他') => {
	const normalized = normalize(value);
	return options.includes(normalized) ? normalized : fallback;
};

export const normalizeOptionalOption = (value: string | null | undefined, options: readonly string[]) => {
	const normalized = normalize(value);
	return options.includes(normalized) ? normalized : null;
};

export const normalizeDishTags = (tags: readonly (string | null | undefined)[]) =>
	Array.from(
		new Set(
			tags
				.map((tag) => normalize(tag))
				.filter((tag) => DISH_TAG_OPTIONS.includes(tag as DishTagOption))
		)
	);

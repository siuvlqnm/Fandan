import type { z } from 'zod';
import type { createDishSchema } from '$lib/server/dishes';

export const MEAL_QUICK_START_TIME_ZONE = 'Asia/Shanghai';

export type MealQuickStartSlotId = 'breakfast' | 'lunch' | 'dinner' | 'late_night';

type RecommendedDish = z.input<typeof createDishSchema>;

export type MealQuickStartSlot = {
	id: MealQuickStartSlotId;
	label: string;
	mealSlot: string;
	helper: string;
	cutoffHour: number | null;
	recommendations: RecommendedDish[];
};

export const MEAL_QUICK_START_SLOTS: MealQuickStartSlot[] = [
	{
		id: 'breakfast',
		label: '早饭',
		mealSlot: '早餐',
		helper: '清爽一点，先把早上吃什么定下来',
		cutoffHour: 10,
		recommendations: [
			{
				name: '鸡蛋三明治',
				category: '早餐',
				baseServings: 2,
				tags: ['早餐', '快手'],
				instructions: '鸡蛋煎熟，和吐司、生菜、番茄片夹好即可。',
				ingredients: [
					{ name: '吐司', quantity: '4', unit: '片', category: '主食粮油' },
					{ name: '鸡蛋', quantity: '2', unit: '个', category: '蛋奶' },
					{ name: '生菜', quantity: '4', unit: '片', category: '蔬菜' },
					{ name: '番茄', quantity: '1', unit: '个', category: '蔬菜' }
				]
			},
			{
				name: '小米粥',
				category: '早餐',
				baseServings: 2,
				tags: ['早餐', '清淡'],
				instructions: '小米淘洗后加水煮开，转小火煮到软糯。',
				ingredients: [
					{ name: '小米', quantity: '80', unit: '克', category: '主食粮油' },
					{ name: '清水', quantity: '900', unit: '毫升', category: '其他' }
				]
			}
		]
	},
	{
		id: 'lunch',
		label: '午饭',
		mealSlot: '午餐',
		helper: '有菜有主食，适合中午快速安排',
		cutoffHour: 14,
		recommendations: [
			{
				name: '番茄炒蛋',
				category: '家常菜',
				baseServings: 2,
				tags: ['快手', '下饭'],
				instructions: '鸡蛋炒散盛出，番茄炒软后回锅合炒调味。',
				ingredients: [
					{ name: '番茄', quantity: '2', unit: '个', category: '蔬菜' },
					{ name: '鸡蛋', quantity: '3', unit: '个', category: '蛋奶' },
					{ name: '葱', quantity: '1', unit: '根', category: '蔬菜' }
				]
			},
			{
				name: '清炒时蔬',
				category: '快手菜',
				baseServings: 2,
				tags: ['清淡', '素食'],
				instructions: '蔬菜洗净沥干，大火快炒，出锅前调味。',
				ingredients: [
					{ name: '青菜', quantity: '1', unit: '把', category: '蔬菜' },
					{ name: '蒜', quantity: '3', unit: '颗', category: '蔬菜' }
				]
			},
			{
				name: '米饭',
				category: '主食',
				baseServings: 2,
				tags: ['适合备餐'],
				instructions: '大米淘洗后按电饭煲比例加水煮熟。',
				ingredients: [{ name: '大米', quantity: '160', unit: '克', category: '主食粮油' }]
			}
		]
	},
	{
		id: 'dinner',
		label: '晚饭',
		mealSlot: '晚餐',
		helper: '默认家庭晚餐，菜品更完整一点',
		cutoffHour: 21,
		recommendations: [
			{
				name: '清蒸鲈鱼',
				category: '家常菜',
				baseServings: 2,
				tags: ['清淡', '高蛋白'],
				instructions: '鲈鱼处理后加姜片蒸熟，出锅淋蒸鱼豉油和热油。',
				ingredients: [
					{ name: '鲈鱼', quantity: '1', unit: '条', category: '水产' },
					{ name: '姜', quantity: '4', unit: '片', category: '蔬菜' },
					{ name: '葱', quantity: '2', unit: '根', category: '蔬菜' }
				]
			},
			{
				name: '蒜蓉西兰花',
				category: '快手菜',
				baseServings: 2,
				tags: ['清淡', '少油'],
				instructions: '西兰花焯水后和蒜蓉快炒，少量盐调味。',
				ingredients: [
					{ name: '西兰花', quantity: '1', unit: '颗', category: '蔬菜' },
					{ name: '蒜', quantity: '4', unit: '颗', category: '蔬菜' }
				]
			},
			{
				name: '紫菜蛋花汤',
				category: '汤羹',
				baseServings: 2,
				tags: ['快手', '清淡'],
				instructions: '水开后下紫菜，淋入蛋液，调味后撒葱花。',
				ingredients: [
					{ name: '紫菜', quantity: '1', unit: '片', category: '干货' },
					{ name: '鸡蛋', quantity: '1', unit: '个', category: '蛋奶' },
					{ name: '葱', quantity: '1', unit: '根', category: '蔬菜' }
				]
			}
		]
	},
	{
		id: 'late_night',
		label: '宵夜',
		mealSlot: '宵夜',
		helper: '晚上简单吃一点，不做重餐',
		cutoffHour: null,
		recommendations: [
			{
				name: '青菜鸡蛋面',
				category: '主食',
				baseServings: 2,
				tags: ['快手', '清淡'],
				instructions: '面条煮熟，加入青菜和鸡蛋，简单调味即可。',
				ingredients: [
					{ name: '面条', quantity: '200', unit: '克', category: '主食粮油' },
					{ name: '鸡蛋', quantity: '2', unit: '个', category: '蛋奶' },
					{ name: '青菜', quantity: '1', unit: '把', category: '蔬菜' }
				]
			},
			{
				name: '牛奶燕麦',
				category: '早餐',
				baseServings: 2,
				tags: ['快手', '清淡'],
				instructions: '燕麦加牛奶加热，按口味加入水果。',
				ingredients: [
					{ name: '燕麦', quantity: '80', unit: '克', category: '主食粮油' },
					{ name: '牛奶', quantity: '500', unit: '毫升', category: '蛋奶' },
					{ name: '香蕉', quantity: '1', unit: '根', category: '水果' }
				]
			}
		]
	}
];

const datePartFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: MEAL_QUICK_START_TIME_ZONE,
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

const hourFormatter = new Intl.DateTimeFormat('en-US', {
	timeZone: MEAL_QUICK_START_TIME_ZONE,
	hour: '2-digit',
	hourCycle: 'h23'
});

export const toShanghaiDateKey = (date = new Date()) => {
	const parts = Object.fromEntries(datePartFormatter.formatToParts(date).map((part) => [part.type, part.value]));
	return `${parts.year}-${parts.month}-${parts.day}`;
};

export const getShanghaiHour = (date = new Date()) => Number(hourFormatter.format(date));

export const addDateKeyDays = (dateKey: string, days: number) => {
	const base = new Date(`${dateKey}T00:00:00+08:00`);
	base.setUTCDate(base.getUTCDate() + days);
	return toShanghaiDateKey(base);
};

export const isMealSlotAvailable = (slot: MealQuickStartSlot, selectedDate: string, now = new Date()) => {
	const today = toShanghaiDateKey(now);
	if (selectedDate < today) return false;
	if (selectedDate !== today) return true;
	if (slot.cutoffHour === null) return true;

	return getShanghaiHour(now) < slot.cutoffHour;
};

export const getQuickStartDates = (now = new Date()) => {
	const today = toShanghaiDateKey(now);
	return {
		today,
		tomorrow: addDateKeyDays(today, 1),
		currentHour: getShanghaiHour(now)
	};
};

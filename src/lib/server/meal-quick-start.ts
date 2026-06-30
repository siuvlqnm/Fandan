import { z } from 'zod';
import {
	getQuickStartDates,
	isMealSlotAvailable,
	MEAL_QUICK_START_SLOTS,
	type MealQuickStartSlotId
} from '$lib/domain/meal-quick-start';
import { createDish, createDishSchema, listDishes } from '$lib/server/dishes';
import { createMealPlan, findMealPlanByDateAndSlot } from '$lib/server/meal-plans';

type UserSpaceContext = Parameters<typeof listDishes>[0];

export const quickStartMealSchema = z.object({
	quickStartDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, '请选择日期'),
	quickStartSlot: z.enum(['breakfast', 'lunch', 'dinner', 'late_night'])
});

export const getQuickStartViewData = () => {
	const quickStartDates = getQuickStartDates();

	return {
		...quickStartDates,
		slots: MEAL_QUICK_START_SLOTS.map((slot) => ({
			id: slot.id,
			label: slot.label,
			mealSlot: slot.mealSlot,
			helper: slot.helper,
			recommendedNames: slot.recommendations.map((dish) => dish.name),
			disabledToday: !isMealSlotAvailable(slot, quickStartDates.today)
		}))
	};
};

export const createQuickStartMealPlan = async (
	context: UserSpaceContext,
	input: { quickStartDate: string; quickStartSlot: MealQuickStartSlotId }
) => {
	const slot = MEAL_QUICK_START_SLOTS.find((item) => item.id === input.quickStartSlot);
	if (!slot) {
		throw new Error('请选择可用餐别');
	}

	if (!isMealSlotAvailable(slot, input.quickStartDate)) {
		throw new Error(`${slot.label} 已经过了，换一个还来得及的餐别吧。`);
	}

	const existingMealPlan = await findMealPlanByDateAndSlot(context, {
		plannedDate: input.quickStartDate,
		mealSlot: slot.mealSlot
	});

	if (existingMealPlan) {
		return existingMealPlan;
	}

	const dishes = await listDishes(context);
	const existingDishesByName = new Map(dishes.map((dish) => [dish.name.trim(), dish.id]));
	const recommendedDishIds: string[] = [];

	for (const recommendation of slot.recommendations) {
		const existingDishId = existingDishesByName.get(recommendation.name.trim());
		if (existingDishId) {
			recommendedDishIds.push(existingDishId);
			continue;
		}

		const dish = await createDish(context, createDishSchema.parse(recommendation));
		existingDishesByName.set(dish.name.trim(), dish.id);
		recommendedDishIds.push(dish.id);
	}

	return createMealPlan(context, {
		title: `${input.quickStartDate} ${slot.mealSlot}`,
		type: 'single_meal',
		status: 'pending_confirmation',
		startDate: input.quickStartDate,
		endDate: input.quickStartDate,
		notes: `从${slot.label}快捷入口自动推荐：${slot.recommendations.map((dish) => dish.name).join('、')}`,
		items: recommendedDishIds.map((dishId, index) => ({
			dishId,
			mealSlot: slot.mealSlot,
			plannedDate: input.quickStartDate,
			servings: 2,
			recommendationRating: 4,
			sortOrder: index
		}))
	});
};

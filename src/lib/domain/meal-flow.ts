export type MealPlanStatus = 'draft' | 'pending_confirmation' | 'confirmed' | 'completed' | 'archived';

type ShareState = 'none' | 'active' | 'unknown';

type MealFlowInput = {
	status: string;
	itemCount: number;
	hasShoppingList?: boolean;
	shoppingItemCount?: number;
	shoppingPendingCount?: number;
	shareState?: ShareState;
	collaborationMode?: 'share' | 'workspace';
	feedbackCount?: number;
};

export type MealFlowState = {
	label: string;
	summary: string;
	primaryLabel: string;
	tone: 'neutral' | 'attention' | 'success' | 'muted';
	step: 'arrange' | 'confirm' | 'shop' | 'done' | 'archived';
};

export const getMealFlowState = ({
	status,
	itemCount,
	hasShoppingList = false,
	shoppingItemCount = 0,
	shoppingPendingCount,
	shareState = 'unknown',
	collaborationMode = 'share',
	feedbackCount = 0
}: MealFlowInput): MealFlowState => {
	if (status === 'archived') {
		return {
			label: '已归档',
			summary: '这顿饭已收起，仍可查看历史内容。',
			primaryLabel: '查看这顿饭',
			tone: 'muted',
			step: 'archived'
		};
	}

	if (status === 'draft' || itemCount === 0) {
		return {
			label: '继续安排',
			summary: '还需要确定这顿饭吃什么。',
			primaryLabel: '继续安排',
			tone: 'neutral',
			step: 'arrange'
		};
	}

	if (status === 'pending_confirmation') {
		if (shareState === 'unknown') {
			return {
				label: '继续确认',
				summary: '菜单已经列好，下一步确认是否发给家人。',
				primaryLabel: '继续确认',
				tone: 'attention',
				step: 'confirm'
			};
		}

		if (shareState === 'none') {
			if (collaborationMode === 'workspace') {
				return {
					label: '家庭内确认',
					summary: '菜单已经列好，家庭成员可以直接在饭单里查看和确认。',
					primaryLabel: '确认菜单',
					tone: 'attention',
					step: 'confirm'
				};
			}

			return {
				label: '发给家人确认',
				summary: '菜单已经列好，下一步发给家人看一眼。',
				primaryLabel: '发给家人确认',
				tone: 'attention',
				step: 'confirm'
			};
		}

		if (feedbackCount > 0) {
			return {
				label: '查看家人反馈',
				summary: `已收到 ${feedbackCount} 条反馈，确认后就可以去买菜。`,
				primaryLabel: '继续确认',
				tone: 'attention',
				step: 'confirm'
			};
		}

		return {
			label: '等待家人反馈',
			summary: '分享链接已准备好，等家人确认后再去买菜。',
			primaryLabel: '继续确认',
			tone: 'attention',
			step: 'confirm'
		};
	}

	if (status === 'confirmed' || status === 'completed') {
		if (hasShoppingList && (status === 'completed' || (shoppingItemCount > 0 && shoppingPendingCount === 0))) {
			return {
				label: '已买齐',
				summary: '买菜清单已经全部勾完，这顿饭可以收尾了。',
				primaryLabel: '查看这顿饭',
				tone: 'success',
				step: 'done'
			};
		}

		if (hasShoppingList) {
			return {
				label: '可以去买菜',
				summary: shoppingItemCount > 0 ? `购物清单有 ${shoppingItemCount} 项。` : '购物清单已准备好。',
				primaryLabel: '去买菜',
				tone: 'success',
				step: 'shop'
			};
		}

		return {
			label: '生成购物清单',
			summary: '菜单已确认，下一步生成买菜清单。',
			primaryLabel: '生成购物清单',
			tone: 'success',
			step: 'shop'
		};
	}

	return {
		label: '查看这顿饭',
		summary: '打开饭单继续处理菜单、确认和清单。',
		primaryLabel: '查看这顿饭',
		tone: 'neutral',
		step: 'arrange'
	};
};

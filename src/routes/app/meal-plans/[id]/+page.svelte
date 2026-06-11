<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Archive,
		ArrowDown,
		ArrowLeft,
		ArrowUp,
		CalendarDays,
		CheckCircle2,
		ChefHat,
		ClipboardList,
		Plus,
		ShoppingCart,
		Trash2,
		UsersRound
	} from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const isArchived = $derived(data.mealPlan.status === 'archived');
	const defaultDate = $derived(data.mealPlan.startDate ?? '');
	const selectClass =
		'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm';
	const textAreaClass =
		'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-20 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-60 md:text-sm';
</script>

<svelte:head>
	<title>{data.mealPlan.title} / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div class="min-w-0 space-y-2">
			<Button href="/app/meal-plans" variant="ghost" size="sm" class="px-0">
				<ArrowLeft class="size-4" />
				返回饭单列表
			</Button>
			<p class="text-sm text-muted-foreground">饭单详情</p>
			<h1 class="break-words text-3xl font-semibold tracking-normal md:text-4xl">{data.mealPlan.title}</h1>
			<p class="max-w-2xl text-muted-foreground">
				{data.mealPlan.typeLabel} · {data.mealPlan.statusLabel} · {data.mealPlan.targetName}
			</p>
		</div>

		<div class="flex flex-wrap gap-2">
			{#each data.statusOptions as option}
				<form method="post" action="?/setStatus">
					<input type="hidden" name="status" value={option.value} />
					<Button
						type="submit"
						variant={data.mealPlan.status === option.value ? 'secondary' : 'outline'}
						size="sm"
						disabled={isArchived || data.mealPlan.status === option.value}
					>
						{#if option.value === 'archived'}
							<Archive class="size-4" />
						{:else if option.value === 'completed'}
							<CheckCircle2 class="size-4" />
						{:else}
							<ClipboardList class="size-4" />
						{/if}
						{option.label}
					</Button>
				</form>
			{/each}
		</div>
	</section>

	{#if form?.message}
		<p class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	{#if isArchived}
		<p class="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
			这份饭单已归档，当前详情页保持只读。
		</p>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[1fr_340px]">
		<div class="space-y-6">
			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<ClipboardList class="size-5" />
						基础信息
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<form method="post" action="?/updateMeta" class="space-y-5">
						<div class="space-y-2">
							<Label for="meal-plan-title">饭单标题</Label>
							<Input
								id="meal-plan-title"
								name="title"
								value={data.mealPlan.title}
								placeholder="例如：周三晚餐"
								required
								disabled={isArchived}
							/>
							{#if form?.action === 'updateMeta' && errors.title?.[0]}
								<p class="text-sm text-destructive">{errors.title[0]}</p>
							{/if}
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="meal-plan-type">饭单类型</Label>
								<select id="meal-plan-type" name="type" class={selectClass} disabled={isArchived}>
									{#each data.typeOptions as option}
										<option value={option.value} selected={data.mealPlan.type === option.value}>{option.label}</option>
									{/each}
								</select>
							</div>

							<div class="space-y-2">
								<Label for="meal-plan-target">用餐对象</Label>
								<select id="meal-plan-target" name="targetId" class={selectClass} disabled={isArchived}>
									<option value="" selected={!data.mealPlan.targetId}>未选择对象</option>
									{#each data.targets as target}
										<option value={target.id} selected={data.mealPlan.targetId === target.id}>{target.name}</option>
									{/each}
								</select>
								{#if form?.action === 'updateMeta' && errors.targetId?.[0]}
									<p class="text-sm text-destructive">{errors.targetId[0]}</p>
								{/if}
							</div>
						</div>

						<div class="grid gap-4 md:grid-cols-2">
							<div class="space-y-2">
								<Label for="start-date">开始日期</Label>
								<Input id="start-date" name="startDate" type="date" value={data.mealPlan.startDate ?? ''} disabled={isArchived} />
							</div>
							<div class="space-y-2">
								<Label for="end-date">结束日期</Label>
								<Input id="end-date" name="endDate" type="date" value={data.mealPlan.endDate ?? ''} disabled={isArchived} />
							</div>
						</div>

						<div class="space-y-2">
							<Label for="meal-plan-notes">备注</Label>
							<textarea id="meal-plan-notes" name="notes" class={textAreaClass} disabled={isArchived}>{data.mealPlan.notes ?? ''}</textarea>
						</div>

						<div class="flex justify-end">
							<Button type="submit" disabled={isArchived}>
								<CheckCircle2 class="size-4" />
								保存基础信息
							</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg" data-testid="meal-plan-items">
				<Card.Header>
					<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<Card.Title class="flex items-center gap-2">
								<ChefHat class="size-5" />
								菜品安排
							</Card.Title>
							<Card.Description>{data.mealPlan.items.length} 道菜品</Card.Description>
						</div>
					</div>
				</Card.Header>
				<Card.Content class="space-y-5">
					{#if data.groups.length === 0}
						<div class="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
							还没有菜品。可以从右侧添加已有菜品，或快速新建一道菜。
						</div>
					{:else}
						{#each data.groups as group}
							<section class="space-y-3">
								<div class="flex flex-wrap items-center gap-2 text-sm font-medium">
									<span class="inline-flex items-center gap-1.5 rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
										<CalendarDays class="size-4" />
										{group.dateLabel}
									</span>
									<span class="rounded-md border px-2 py-1">{group.slotLabel}</span>
								</div>

								<div class="space-y-3">
									{#each group.items as item}
										<article class="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto] md:items-start" data-testid={`meal-plan-item-${item.id}`}>
											<div class="min-w-0 space-y-2">
												<div class="flex min-w-0 flex-wrap items-center gap-2">
													<h3 class="break-words font-medium">{item.dishName}</h3>
													{#if item.dishCategory}
														<span class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">{item.dishCategory}</span>
													{/if}
												</div>
												<p class="text-sm text-muted-foreground">
													{item.servings} 份 · {item.dishIngredientCount} 种食材
												</p>
												{#if item.notes}
													<p class="break-words rounded-md bg-muted/50 p-2 text-sm">{item.notes}</p>
												{/if}
											</div>

											<div class="flex flex-wrap gap-2 md:justify-end">
												<form method="post" action="?/moveItem">
													<input type="hidden" name="itemId" value={item.id} />
													<input type="hidden" name="direction" value="up" />
													<Button type="submit" variant="outline" size="icon-sm" disabled={isArchived || !item.canMoveUp} aria-label="上移">
														<ArrowUp class="size-4" />
													</Button>
												</form>
												<form method="post" action="?/moveItem">
													<input type="hidden" name="itemId" value={item.id} />
													<input type="hidden" name="direction" value="down" />
													<Button type="submit" variant="outline" size="icon-sm" disabled={isArchived || !item.canMoveDown} aria-label="下移">
														<ArrowDown class="size-4" />
													</Button>
												</form>
												{#if item.dishId}
													<Button href={`/app/dishes/${item.dishId}`} variant="ghost" size="sm">打开菜品</Button>
												{/if}
												<form method="post" action="?/removeItem">
													<input type="hidden" name="itemId" value={item.id} />
													<Button type="submit" variant="destructive" size="icon-sm" disabled={isArchived} aria-label="移除">
														<Trash2 class="size-4" />
													</Button>
												</form>
											</div>
										</article>
									{/each}
								</div>
							</section>
						{/each}
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<aside class="space-y-4">
			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<ShoppingCart class="size-5" />
						购物清单
					</Card.Title>
					<Card.Description>
						{#if data.shoppingList}
							已生成 {data.shoppingList.items.length} 项，可继续勾选和调整。
						{:else}
							根据当前饭单菜品食材生成买菜清单。
						{/if}
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if data.shoppingList}
						<Button href={`/app/shopping-lists/${data.shoppingList.id}`} class="w-full">
							<ShoppingCart class="size-4" />
							打开购物清单
						</Button>
					{/if}
					<form method="post" action="?/generateShoppingList">
						<Button type="submit" variant={data.shoppingList ? 'outline' : 'default'} class="w-full">
							<ShoppingCart class="size-4" />
							{data.shoppingList ? '重新生成清单' : '生成购物清单'}
						</Button>
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<UsersRound class="size-5" />
						对象偏好
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					{#if data.target}
						<p class="rounded-md border p-3">
							<span class="block text-muted-foreground">人数</span>
							{data.target.peopleCount} 人
						</p>
						<p class="rounded-md border p-3">
							<span class="block text-muted-foreground">口味</span>
							{data.target.tasteNotes || '未记录'}
						</p>
						<p class="rounded-md border p-3">
							<span class="block text-muted-foreground">忌口</span>
							{data.target.dietaryRestrictions || '未记录'}
						</p>
						<p class="rounded-md border p-3">
							<span class="block text-muted-foreground">预算备注</span>
							{data.target.budgetNotes || '未记录'}
						</p>
						<Button href={`/app/targets/${data.target.id}`} variant="outline" class="w-full">打开对象</Button>
					{:else}
						<p class="rounded-md border p-3 text-muted-foreground">未选择用餐对象。</p>
					{/if}
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Plus class="size-5" />
						添加已有菜品
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<form method="post" action="?/addDish" class="space-y-4">
						<div class="space-y-2">
							<Label for="dish-id">菜品</Label>
							<select id="dish-id" name="dishId" class={selectClass} disabled={isArchived || data.dishes.length === 0} required>
								<option value="" selected>选择菜品</option>
								{#each data.dishes as dish}
									<option value={dish.id}>{dish.name}</option>
								{/each}
							</select>
							{#if form?.action === 'addDish' && errors.dishId?.[0]}
								<p class="text-sm text-destructive">{errors.dishId[0]}</p>
							{/if}
						</div>

						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
							<div class="space-y-2">
								<Label for="add-planned-date">日期</Label>
								<Input id="add-planned-date" name="plannedDate" type="date" value={defaultDate} disabled={isArchived} />
							</div>
							<div class="space-y-2">
								<Label for="add-meal-slot">餐别</Label>
								<select id="add-meal-slot" name="mealSlot" class={selectClass} disabled={isArchived}>
									<option value="" selected>未设置</option>
									{#each data.mealSlotOptions as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="add-servings">份数</Label>
							<Input id="add-servings" name="servings" type="number" min="1" max="999" value="1" disabled={isArchived} />
							{#if form?.action === 'addDish' && errors.servings?.[0]}
								<p class="text-sm text-destructive">{errors.servings[0]}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="add-notes">条目备注</Label>
							<textarea id="add-notes" name="notes" class={textAreaClass} disabled={isArchived}></textarea>
						</div>

						<Button type="submit" class="w-full" disabled={isArchived || data.dishes.length === 0}>
							<Plus class="size-4" />
							添加菜品
						</Button>
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<ChefHat class="size-5" />
						快速新建菜品
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<form method="post" action="?/quickAddDish" class="space-y-4">
						<div class="space-y-2">
							<Label for="quick-dish-name">菜品名称</Label>
							<Input id="quick-dish-name" name="name" placeholder="例如：番茄炒蛋" disabled={isArchived} required />
							{#if form?.action === 'quickAddDish' && errors.name?.[0]}
								<p class="text-sm text-destructive">{errors.name[0]}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="quick-dish-category">分类</Label>
							<Input id="quick-dish-category" name="category" placeholder="家常菜" disabled={isArchived} />
						</div>

						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
							<div class="space-y-2">
								<Label for="quick-planned-date">日期</Label>
								<Input id="quick-planned-date" name="plannedDate" type="date" value={defaultDate} disabled={isArchived} />
							</div>
							<div class="space-y-2">
								<Label for="quick-meal-slot">餐别</Label>
								<select id="quick-meal-slot" name="mealSlot" class={selectClass} disabled={isArchived}>
									<option value="" selected>未设置</option>
									{#each data.mealSlotOptions as option}
										<option value={option}>{option}</option>
									{/each}
								</select>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="quick-servings">份数</Label>
							<Input id="quick-servings" name="servings" type="number" min="1" max="999" value="1" disabled={isArchived} />
						</div>

						<div class="space-y-2">
							<Label for="quick-notes">条目备注</Label>
							<textarea id="quick-notes" name="notes" class={textAreaClass} disabled={isArchived}></textarea>
						</div>

						<Button type="submit" class="w-full" disabled={isArchived}>
							<Plus class="size-4" />
							新建并加入
						</Button>
					</form>
				</Card.Content>
			</Card.Root>
		</aside>
	</div>
</main>

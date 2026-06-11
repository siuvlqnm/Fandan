<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { ArrowLeft, CalendarDays, ChefHat, Plus, UsersRound } from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const values = $derived(form?.values ?? data.values);
	const errors = $derived(form?.errors ?? {});
	const targets = $derived(form?.targets ?? data.targets);
	const dishes = $derived(form?.dishes ?? data.dishes);

	const typeOptions = [
		{ value: 'single_meal', label: '单餐' },
		{ value: 'day', label: '一日' },
		{ value: 'week', label: '一周' },
		{ value: 'gathering', label: '聚餐' }
	];

	const targetTypeOptions = [
		{ value: 'home', label: '家庭' },
		{ value: 'client', label: '客户' },
		{ value: 'gathering', label: '聚餐' },
		{ value: 'other', label: '其他' }
	];

	const selectClass =
		'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:ring-3 md:text-sm';
	const textAreaClass =
		'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-3 md:text-sm';
</script>

<svelte:head>
	<title>新建饭单 / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div class="space-y-2">
			<Button href="/app/meal-plans" variant="ghost" size="sm" class="px-0">
				<ArrowLeft class="size-4" />
				返回饭单列表
			</Button>
			<p class="text-sm text-muted-foreground">饭单</p>
			<h1 class="text-3xl font-semibold tracking-normal md:text-4xl">新建饭单</h1>
			<p class="max-w-2xl text-muted-foreground">
				先设置对象、类型、日期和第一道菜。创建后进入详情页继续调整饭单内容。
			</p>
		</div>
	</section>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title>基础信息</Card.Title>
				<Card.Description>没有用餐对象时，可以在本流程里快速创建一个。</Card.Description>
			</Card.Header>
			<Card.Content>
				<form method="post" class="space-y-6">
					<div class="space-y-2">
						<Label for="meal-plan-title">饭单标题</Label>
						<Input id="meal-plan-title" name="title" value={values.title ?? ''} placeholder="例如：周三晚餐" required />
						{#if errors.title?.[0]}
							<p class="text-sm text-destructive">{errors.title[0]}</p>
						{/if}
					</div>

					<div class="grid gap-4 md:grid-cols-2">
						<div class="space-y-2">
							<Label for="meal-plan-type">饭单类型</Label>
							<select id="meal-plan-type" name="type" class={selectClass}>
								{#each typeOptions as option}
									<option value={option.value} selected={(values.type ?? 'single_meal') === option.value}>{option.label}</option>
								{/each}
							</select>
							{#if errors.type?.[0]}
								<p class="text-sm text-destructive">{errors.type[0]}</p>
							{/if}
						</div>

						<div class="space-y-2">
							<Label for="meal-plan-target">选择对象</Label>
							<select id="meal-plan-target" name="targetId" class={selectClass}>
								<option value="" selected={!values.targetId}>暂不选择</option>
								{#each targets as target}
									<option value={target.id} selected={values.targetId === target.id}>{target.name}</option>
								{/each}
							</select>
							{#if errors.targetId?.[0]}
								<p class="text-sm text-destructive">{errors.targetId[0]}</p>
							{/if}
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-[1fr_160px]">
						<div class="space-y-2">
							<Label for="quick-target-name">快速新建对象</Label>
							<Input
								id="quick-target-name"
								name="quickTargetName"
								value={values.quickTargetName ?? ''}
								placeholder="例如：张女士家"
							/>
							<p class="text-sm text-muted-foreground">填写后会优先创建并使用这个对象。</p>
							{#if errors.quickTargetName?.[0]}
								<p class="text-sm text-destructive">{errors.quickTargetName[0]}</p>
							{/if}
						</div>
						<div class="space-y-2">
							<Label for="quick-target-type">对象类型</Label>
							<select id="quick-target-type" name="quickTargetType" class={selectClass}>
								{#each targetTypeOptions as option}
									<option value={option.value} selected={(values.quickTargetType ?? 'home') === option.value}>{option.label}</option>
								{/each}
							</select>
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-3">
						<div class="space-y-2">
							<Label for="start-date">开始日期</Label>
							<Input id="start-date" name="startDate" type="date" value={values.startDate ?? ''} />
						</div>
						<div class="space-y-2">
							<Label for="end-date">结束日期</Label>
							<Input id="end-date" name="endDate" type="date" value={values.endDate ?? ''} />
						</div>
						<div class="space-y-2">
							<Label for="meal-slot">餐别</Label>
							<Input id="meal-slot" name="mealSlot" value={values.mealSlot ?? ''} placeholder="晚餐" />
						</div>
					</div>

					<div class="grid gap-4 md:grid-cols-[1fr_140px]">
						<div class="space-y-2">
							<Label for="dish-id">第一道菜</Label>
							<select id="dish-id" name="dishId" class={selectClass}>
								<option value="" selected={!values.dishId}>先不添加菜品</option>
								{#each dishes as dish}
									<option value={dish.id} selected={values.dishId === dish.id}>{dish.name}</option>
								{/each}
							</select>
						</div>
						<div class="space-y-2">
							<Label for="servings">份数</Label>
							<Input id="servings" name="servings" type="number" min="1" max="999" value={values.servings ?? 1} />
						</div>
					</div>

					<div class="space-y-2">
						<Label for="meal-plan-notes">备注</Label>
						<textarea
							id="meal-plan-notes"
							name="notes"
							class={textAreaClass}
							placeholder="例如：少油少盐，孩子不吃辣"
						>{values.notes ?? ''}</textarea>
					</div>

					<div class="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
						<Button href="/app/meal-plans" variant="outline">取消</Button>
						<Button type="submit">
							<Plus class="size-4" />
							创建饭单
						</Button>
					</div>
				</form>
			</Card.Content>
		</Card.Root>

		<div class="space-y-4">
			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<UsersRound class="size-5" />
						对象上下文
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					{#if data.selectedTarget}
						<p class="rounded-md border p-3">
							<span class="block text-muted-foreground">已从入口选择</span>
							{data.selectedTarget.name} · {data.selectedTarget.peopleCount} 人
						</p>
					{:else if targets.length === 0}
						<p class="rounded-md border p-3 text-muted-foreground">当前还没有对象，可以在表单里快速新建。</p>
					{:else}
						<p class="rounded-md border p-3 text-muted-foreground">可以选择已有对象，也可以填写快速新建对象。</p>
					{/if}
					<Button href="/app/targets/new" variant="outline" class="w-full">
						<Plus class="size-4" />
						单独新建对象
					</Button>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<ChefHat class="size-5" />
						菜品上下文
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3 text-sm">
					{#if data.selectedDish}
						<p class="rounded-md border p-3">
							<span class="block text-muted-foreground">已从入口选择</span>
							{data.selectedDish.name} · {data.selectedDish.ingredients.length} 种食材
						</p>
					{:else}
						<p class="rounded-md border p-3 text-muted-foreground">选择第一道菜后，创建时会自动加入饭单。</p>
					{/if}
					<Button href="/app/dishes/new" variant="outline" class="w-full">
						<Plus class="size-4" />
						新建菜品
					</Button>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<CalendarDays class="size-5" />
						创建后
					</Card.Title>
					<Card.Description>创建完成后进入详情工作台继续添加菜品、排序和确认状态。</Card.Description>
				</Card.Header>
			</Card.Root>
		</div>
	</div>
</main>

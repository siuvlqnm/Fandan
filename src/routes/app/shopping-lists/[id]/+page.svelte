<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { enhanceWithFeedback } from '$lib/forms/enhance';
	import {
		ArrowLeft,
		CheckCircle2,
		Circle,
		ClipboardList,
		Plus,
		RefreshCw,
		Save,
		ShoppingCart,
		Trash2
	} from 'lucide-svelte';
	import type { ActionData, PageData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const errors = $derived((form?.errors ?? {}) as Record<string, string[]>);
	const addValues = $derived((form?.action === 'addItem' ? (form.values ?? {}) : {}) as Record<string, unknown>);
	const completionLabel = $derived(`${data.summary.checked}/${data.summary.total}`);
	const textAreaClass =
		'dark:bg-input/30 border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-16 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:ring-3 md:text-sm';
</script>

<svelte:head>
	<title>{data.shoppingList.title} / 饭单</title>
</svelte:head>

<main class="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:py-10">
	<section class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
		<div class="min-w-0 space-y-2">
			<Button href={`/app/meal-plans/${data.mealPlan.id}`} variant="ghost" size="sm" class="px-0">
				<ArrowLeft class="size-4" />
				返回饭单
			</Button>
			<p class="text-sm text-muted-foreground">购物清单</p>
			<h1 class="break-words text-3xl font-semibold tracking-normal md:text-4xl">{data.shoppingList.title}</h1>
			<p class="max-w-2xl text-muted-foreground">
				来自 {data.mealPlan.title} · 待买 {data.summary.pending} 项 · 已买 {completionLabel}
			</p>
		</div>

		<div class="flex flex-col gap-2 sm:flex-row">
			<Button href={`/app/meal-plans/${data.mealPlan.id}`} variant="outline">
				<ClipboardList class="size-4" />
				打开饭单
			</Button>
			<form method="post" action="?/regenerate" use:enhanceWithFeedback>
				<Button
					type="submit"
					variant="outline"
					class="w-full sm:w-auto"
					data-confirm="重新生成会替换当前购物项，确认继续？"
					data-pending-label="重新生成中..."
				>
					<RefreshCw class="size-4" />
					重新生成
				</Button>
			</form>
		</div>
	</section>

	{#if form?.message}
		<p class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{form.message}</p>
	{/if}

	<section class="grid gap-4 md:grid-cols-3">
		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="text-base">待购买</Card.Title>
				<p class="text-3xl font-semibold">{data.summary.pending}</p>
			</Card.Header>
		</Card.Root>
		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="text-base">已购买</Card.Title>
				<p class="text-3xl font-semibold">{data.summary.checked}</p>
			</Card.Header>
		</Card.Root>
		<Card.Root class="rounded-lg">
			<Card.Header>
				<Card.Title class="text-base">完成度</Card.Title>
				<p class="text-3xl font-semibold">{completionLabel}</p>
			</Card.Header>
		</Card.Root>
	</section>

	<div class="grid gap-6 lg:grid-cols-[1fr_340px]">
		<section class="space-y-5" data-testid="shopping-list-items">
			{#if data.groups.length === 0}
				<Card.Root class="rounded-lg">
					<Card.Header>
						<Card.Title class="flex items-center gap-2">
							<ShoppingCart class="size-5" />
							清单还是空的
						</Card.Title>
						<Card.Description>回到饭单添加带食材的菜品，或在右侧先手动补充购物项。</Card.Description>
					</Card.Header>
					<Card.Content class="flex flex-col gap-3 sm:flex-row">
						<Button href={`/app/meal-plans/${data.mealPlan.id}`} variant="outline">打开饭单</Button>
						<form method="post" action="?/regenerate" use:enhanceWithFeedback={{ pendingLabel: '生成中...' }}>
							<Button type="submit" data-pending-label="生成中...">
								<RefreshCw class="size-4" />
								重新生成
							</Button>
						</form>
					</Card.Content>
				</Card.Root>
			{:else}
				{#each data.groups as group}
					<Card.Root class="rounded-lg">
						<Card.Header>
							<div class="flex flex-wrap items-center justify-between gap-2">
								<Card.Title>{group.category}</Card.Title>
								<Card.Description>{group.checkedCount}/{group.items.length} 已买</Card.Description>
							</div>
						</Card.Header>
						<Card.Content class="space-y-3">
							{#each group.items as item}
								<article class="grid gap-3 rounded-md border p-3 md:grid-cols-[52px_1fr] md:items-start" data-testid={`shopping-list-item-${item.id}`}>
										<form method="post" action="?/toggleItem" use:enhanceWithFeedback class="md:pt-1">
										<input type="hidden" name="itemId" value={item.id} />
										<input type="hidden" name="checked" value={item.checked ? 'false' : 'true'} />
										<Button
											type="submit"
											variant={item.checked ? 'secondary' : 'outline'}
											size="icon-lg"
											class="size-12"
											aria-label={item.checked ? '标记未购买' : '标记已购买'}
										>
											{#if item.checked}
												<CheckCircle2 class="size-6" />
											{:else}
												<Circle class="size-6" />
											{/if}
										</Button>
									</form>

									<div class="min-w-0 space-y-3">
										<div>
											<h2 class:line-through={item.checked} class:text-muted-foreground={item.checked} class="break-words text-lg font-medium">
												{item.name}
											</h2>
											<p class="text-sm text-muted-foreground">
												{item.quantity || '未填数量'}{item.unit ? ` ${item.unit}` : ''}{item.notes ? ` · ${item.notes}` : ''}
											</p>
										</div>

										<form method="post" action="?/updateItem" use:enhanceWithFeedback={{ pendingLabel: '保存中...' }} class="space-y-3">
											<input type="hidden" name="itemId" value={item.id} />
											<div class="grid gap-3 md:grid-cols-[1fr_110px_100px_120px]">
												<div class="space-y-2">
													<Label for={`name-${item.id}`}>名称</Label>
													<Input id={`name-${item.id}`} name="name" value={item.name} required />
												</div>
												<div class="space-y-2">
													<Label for={`quantity-${item.id}`}>数量</Label>
													<Input id={`quantity-${item.id}`} name="quantity" value={item.quantity ?? ''} />
												</div>
												<div class="space-y-2">
													<Label for={`unit-${item.id}`}>单位</Label>
													<Input id={`unit-${item.id}`} name="unit" value={item.unit ?? ''} />
												</div>
												<div class="space-y-2">
													<Label for={`category-${item.id}`}>分类</Label>
													<Input id={`category-${item.id}`} name="category" value={item.category ?? '其他'} />
												</div>
											</div>
											<div class="space-y-2">
												<Label for={`notes-${item.id}`}>备注</Label>
												<textarea id={`notes-${item.id}`} name="notes" class={textAreaClass}>{item.notes ?? ''}</textarea>
											</div>
											<div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
													<Button type="submit" variant="outline" data-pending-label="保存中...">
														<Save class="size-4" />
														保存
												</Button>
											</div>
										</form>

										<form method="post" action="?/deleteItem" use:enhanceWithFeedback class="flex justify-end">
											<input type="hidden" name="itemId" value={item.id} />
											<Button
												type="submit"
												variant="destructive"
												size="sm"
												data-confirm={`删除购物项「${item.name}」？`}
												data-pending-label="删除中..."
											>
												<Trash2 class="size-4" />
												删除
											</Button>
										</form>
									</div>
								</article>
							{/each}
						</Card.Content>
					</Card.Root>
				{/each}
			{/if}
		</section>

		<aside class="space-y-4">
			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<Plus class="size-5" />
						添加购物项
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<form method="post" action="?/addItem" use:enhanceWithFeedback={{ pendingLabel: '添加中...' }} class="space-y-4">
						<div class="space-y-2">
							<Label for="new-item-name">名称</Label>
							<Input id="new-item-name" name="name" value={String(addValues.name ?? '')} placeholder="例如：葱" required />
							{#if form?.action === 'addItem' && errors.name?.[0]}
								<p class="text-sm text-destructive">{errors.name[0]}</p>
							{/if}
						</div>

						<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
							<div class="space-y-2">
								<Label for="new-item-quantity">数量</Label>
								<Input id="new-item-quantity" name="quantity" value={String(addValues.quantity ?? '')} placeholder="1" />
							</div>
							<div class="space-y-2">
								<Label for="new-item-unit">单位</Label>
								<Input id="new-item-unit" name="unit" value={String(addValues.unit ?? '')} placeholder="把" />
							</div>
						</div>

						<div class="space-y-2">
							<Label for="new-item-category">分类</Label>
							<Input id="new-item-category" name="category" value={String(addValues.category ?? '')} placeholder="蔬菜" />
						</div>

						<div class="space-y-2">
							<Label for="new-item-notes">备注</Label>
							<textarea id="new-item-notes" name="notes" class={textAreaClass}>{String(addValues.notes ?? '')}</textarea>
						</div>

						<Button type="submit" class="w-full" data-pending-label="添加中...">
							<Plus class="size-4" />
							添加
						</Button>
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root class="rounded-lg">
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<RefreshCw class="size-5" />
						重新生成
					</Card.Title>
					<Card.Description>会按当前饭单食材重新生成，并替换现有购物项。</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="post" action="?/regenerate" use:enhanceWithFeedback>
						<Button
							type="submit"
							variant="outline"
							class="w-full"
							data-confirm="重新生成会替换当前购物项，确认继续？"
							data-pending-label="重新生成中..."
						>
							<RefreshCw class="size-4" />
							重新生成清单
						</Button>
					</form>
				</Card.Content>
			</Card.Root>
		</aside>
	</div>
</main>

import { spawn, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { hashPassword } from 'better-auth/crypto';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const workerPath = resolve(root, '.svelte-kit/cloudflare/_worker.js');
const wranglerPath = resolve(root, 'node_modules/.bin/wrangler');
const getAvailablePort = () =>
	new Promise((resolvePort, reject) => {
		const probe = createServer();
		probe.once('error', reject);
		probe.listen(0, '127.0.0.1', () => {
			const address = probe.address();
			if (!address || typeof address === 'string') {
				probe.close(() => reject(new Error('Could not allocate a local smoke-test port')));
				return;
			}
			probe.close(() => resolvePort(address.port));
		});
	});
const port = await getAvailablePort();
const origin = `http://127.0.0.1:${port}`;
const password = 'Fandan-test-102!';
const legacyUserId = 'smoke-les102-legacy-user';
const legacySpaceId = 'smoke-les102-legacy-space';
const legacyTargetId = 'smoke-les102-legacy-target';
const legacyDishId = 'smoke-les102-legacy-dish';
const legacyMealPlanId = 'smoke-les102-legacy-plan';
const legacyShoppingListId = 'smoke-les102-legacy-list';
const expiredToken = 'smoke-les102-expired-invitation';

const assert = (condition, message) => {
	if (!condition) throw new Error(message);
};

const delay = (milliseconds) => new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));

class Session {
	#cookies = new Map();

	async request(pathname, options = {}) {
		const headers = new Headers(options.headers);
		if (this.#cookies.size > 0) {
			headers.set('cookie', Array.from(this.#cookies.entries()).map(([name, value]) => `${name}=${value}`).join('; '));
		}
		if (options.method && options.method !== 'GET') headers.set('origin', origin);

		let body;
		if (options.json !== undefined) {
			headers.set('content-type', 'application/json');
			body = JSON.stringify(options.json);
		} else if (options.form !== undefined) {
			headers.set('content-type', 'application/x-www-form-urlencoded');
			body = new URLSearchParams(options.form);
		}

		const response = await fetch(new URL(pathname, origin), {
			method: options.method ?? 'GET',
			headers,
			body,
			redirect: options.redirect ?? 'manual'
		});

		const setCookies = response.headers.getSetCookie?.() ?? [response.headers.get('set-cookie')].filter(Boolean);
		for (const setCookie of setCookies) {
			const [pair] = setCookie.split(';');
			const separator = pair.indexOf('=');
			if (separator > 0) this.#cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
		}

		const text = await response.text();
		let data = null;
		if (text) {
			try {
				data = JSON.parse(text);
			} catch {
				data = text;
			}
		}

		const expectedStatus = options.expectedStatus ?? 200;
		const acceptedStatuses = Array.isArray(expectedStatus) ? expectedStatus : [expectedStatus];
		if (!acceptedStatuses.includes(response.status)) {
			throw new Error(`${options.method ?? 'GET'} ${pathname} returned ${response.status}: ${text.slice(0, 500)}`);
		}

		return { response, data };
	}
}

const runWrangler = async (persistPath, args) => {
	const { stdout, stderr } = await execFileAsync(
		wranglerPath,
		['d1', 'execute', 'fandan', '--local', '--persist-to', persistPath, ...args],
		{ cwd: root, env: { ...process.env, NO_COLOR: '1' }, maxBuffer: 10 * 1024 * 1024 }
	);
	return `${stdout}${stderr}`;
};

const applyMigrationFile = (persistPath, filename) =>
	runWrangler(persistPath, [`--file=${resolve(root, 'drizzle', filename)}`]);

const seedLegacyData = async (persistPath) => {
	const passwordHash = await hashPassword(password);
	const now = Date.now();
	const sql = `
INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
VALUES ('${legacyUserId}', '旧账号用户', 'les102-legacy@example.com', 1, ${now}, ${now});
INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
VALUES ('smoke-les102-legacy-account', '${legacyUserId}', 'credential', '${legacyUserId}', '${passwordHash}', ${now}, ${now});
INSERT INTO spaces (id, name, owner_user_id, created_at, updated_at)
VALUES ('${legacySpaceId}', '旧账号家庭空间', '${legacyUserId}', '2026-06-01 08:00:00', '2026-06-01 08:00:00');
INSERT INTO meal_targets (id, space_id, name, type, people_count)
VALUES ('${legacyTargetId}', '${legacySpaceId}', '迁移前家庭对象', 'home', 3);
INSERT INTO dishes (id, space_id, name, category, tags, visibility)
VALUES ('${legacyDishId}', '${legacySpaceId}', '迁移前番茄炒蛋', '家常菜', '["旧数据"]', 'space');
INSERT INTO dish_ingredients (id, dish_id, name, quantity, unit, category, sort_order)
VALUES ('smoke-les102-legacy-ingredient', '${legacyDishId}', '番茄', '3', '个', '蔬菜', 0);
INSERT INTO meal_plans (id, space_id, target_id, title, type, status)
VALUES ('${legacyMealPlanId}', '${legacySpaceId}', '${legacyTargetId}', '迁移前周末晚餐', 'single_meal', 'draft');
INSERT INTO meal_plan_items (id, meal_plan_id, dish_id, meal_slot, servings, sort_order)
VALUES ('smoke-les102-legacy-plan-item', '${legacyMealPlanId}', '${legacyDishId}', '晚餐', 3, 0);
INSERT INTO shopping_lists (id, meal_plan_id, title, status)
VALUES ('${legacyShoppingListId}', '${legacyMealPlanId}', '迁移前采购清单', 'active');
INSERT INTO shopping_list_items (id, shopping_list_id, name, quantity, unit, category, checked, sort_order)
VALUES ('smoke-les102-legacy-list-item', '${legacyShoppingListId}', '番茄', '3', '个', '蔬菜', 0, 0);
`;
	await runWrangler(persistPath, ['--command', sql]);
};

const waitForServer = async (server, getLogs) => {
	for (let attempt = 0; attempt < 80; attempt += 1) {
		if (server.exitCode !== null) throw new Error(`Local worker exited early.\n${getLogs()}`);
		try {
			const response = await fetch(`${origin}/api/health`);
			if (response.ok) return;
		} catch {
			// Worker is still starting.
		}
		await delay(250);
	}
	throw new Error(`Timed out waiting for local worker.\n${getLogs()}`);
};

const stopServer = async (server) => {
	if (server.exitCode !== null) return;
	server.kill('SIGTERM');
	await Promise.race([
		once(server, 'exit'),
		delay(3000).then(() => {
			if (server.exitCode === null) server.kill('SIGKILL');
		})
	]);
};

const signIn = (session, email) =>
	session.request('/login?/signInEmail', {
		method: 'POST',
		form: { next: '/app', email, password }
	});

const signUp = (session, name, email, next = '/app/meal-plans/new') =>
	session.request('/register?/signUpEmail', {
		method: 'POST',
		form: { next, name, email, password }
	});

const verifyCollaboration = async () => {
	const owner = new Session();
	const member = new Session();
	const edgeUser = new Session();
	const loggedOut = new Session();
	const loginPage = String((await loggedOut.request('/login')).data);
	const registerPage = String((await loggedOut.request('/register')).data);
	assert(loginPage.includes('登录饭单') && loginPage.includes('创建账号并安排第一顿饭'), 'Login page does not have a focused registration entry');
	assert(!loginPage.includes('只填写名称、邮箱和密码'), 'Login page still renders the full registration form');
	assert(registerPage.includes('只填写名称、邮箱和密码') && registerPage.includes('创建账号并安排第一顿饭') && registerPage.includes('注册中...'), 'Registration page is missing the focused first-use form or pending feedback');
	assert(!registerPage.includes('回到你的菜单协作工作台'), 'Registration page still renders the sign-in form');
	const invalidRegistration = await loggedOut.request('/register?/signUpEmail', {
		method: 'POST',
		form: { name: '', email: 'not-an-email', password: 'short' }
	});
	assert(invalidRegistration.data?.status === 400 && JSON.stringify(invalidRegistration.data).includes('密码至少 8 位'), 'Registration validation feedback was not returned');
	console.log('✓ split login and registration surfaces');

	await signIn(owner, 'les102-legacy@example.com');
	const ownerWorkspace = (await owner.request('/api/workspace')).data.data;
	assert(ownerWorkspace.workspace.id === legacySpaceId, 'Legacy owner did not retain the original workspace');
	assert(ownerWorkspace.membership.role === 'owner', 'Legacy owner membership was not backfilled');

	const legacyTargets = (await owner.request('/api/targets')).data.data.targets;
	const legacyDishes = (await owner.request('/api/dishes')).data.data.dishes;
	const legacyPlans = (await owner.request('/api/meal-plans')).data.data.mealPlans;
	const legacyList = (await owner.request(`/api/shopping-lists/${legacyShoppingListId}`)).data.data.shoppingList;
	assert(legacyTargets.some((target) => target.id === legacyTargetId), 'Legacy target was lost');
	assert(legacyDishes.some((dish) => dish.id === legacyDishId), 'Legacy dish was lost');
	const legacyDish = legacyDishes.find((dish) => dish.id === legacyDishId);
	assert(legacyDish.baseServings === 1, 'Legacy dish did not receive the safe base-serving default');
	assert(legacyDish.servingBasisConfirmed === false, 'Legacy dish was incorrectly marked as confirmed');
	assert(legacyPlans.some((plan) => plan.id === legacyMealPlanId), 'Legacy meal plan was lost');
	assert(legacyList.items.some((item) => item.name === '番茄'), 'Legacy shopping list was lost');
	console.log('✓ legacy owner login and data migration protection');

	const invitation = (await owner.request('/api/workspace/invitations', {
		method: 'POST',
		json: { expiresInDays: 7 },
		expectedStatus: 201
	})).data.data.invitation;
	const preview = (await new Session().request(`/api/invitations/${invitation.token}`)).data.data;
	assert(preview.space.name === '旧账号家庭空间', 'Invitation preview has the wrong workspace');
	assert(!JSON.stringify(preview).includes('迁移前番茄炒蛋'), 'Invitation preview leaked workspace data');

	const memberSignUpResult = await signUp(member, '协作成员', 'les102-member@example.com', `/invite/${invitation.token}`);
	assert(memberSignUpResult.data?.location === `/invite/${invitation.token}`, 'Invitation registration did not preserve its return path');
	const duplicateRegistration = await new Session().request('/register?/signUpEmail', {
		method: 'POST',
		form: { name: '重复账号', email: 'les102-member@example.com', password }
	});
	assert(duplicateRegistration.data?.status === 400, 'Duplicate registration was not rejected');
	const memberPersonalSpaceId = (await member.request('/api/workspace')).data.data.workspace.id;
	const accepted = (await member.request(`/api/invitations/${invitation.token}/accept`, {
		method: 'POST'
	})).data.data;
	assert(accepted.membership.role === 'member' && accepted.alreadyAccepted === false, 'Member did not join workspace');
	const repeated = (await member.request(`/api/invitations/${invitation.token}/accept`, {
		method: 'POST'
	})).data.data;
	assert(repeated.alreadyAccepted === true, 'Repeated invitation acceptance was not idempotent');
	console.log('✓ invitation preview, join and repeated acceptance');

	const collaborativeDish = (await member.request('/api/dishes', {
		method: 'POST',
		json: {
			name: '成员新增炖鸡',
			category: '家常菜',
			baseServings: 2,
			tags: ['协作'],
			ingredients: [
				{ name: '鸡腿', quantity: '2', unit: '只', category: '肉类' },
				{ name: '盐', quantity: '适量', unit: null, category: '调味' },
				{ name: '姜', quantity: null, unit: '块', category: '调味' },
				{ name: '番茄', quantity: '300', unit: 'g', category: '蔬菜' },
				{ name: '番茄', quantity: '2', unit: '个', category: '蔬菜' }
			]
		},
		expectedStatus: 201
	})).data.data.dish;
	const ownerDishes = (await owner.request('/api/dishes')).data.data.dishes;
	assert(ownerDishes.some((dish) => dish.id === collaborativeDish.id), 'Owner cannot see the member-created dish');

	const collaborativePlan = (await member.request('/api/meal-plans', {
		method: 'POST',
		json: {
			title: '家庭协作晚餐',
			targetId: legacyTargetId,
			type: 'single_meal',
			items: [{ dishId: collaborativeDish.id, mealSlot: '晚餐', servings: 2 }]
		},
		expectedStatus: 201
	})).data.data.mealPlan;
	const generatedList = (await member.request(`/api/meal-plans/${collaborativePlan.id}/shopping-list/generate`, {
		method: 'POST',
		expectedStatus: 201
	})).data.data.shoppingList;
	assert(generatedList.items.length === 5, 'Collaborative shopping list was not generated');
	const chicken = generatedList.items.find((item) => item.name === '鸡腿');
	const salt = generatedList.items.find((item) => item.name === '盐');
	const ginger = generatedList.items.find((item) => item.name === '姜');
	const tomatoes = generatedList.items.filter((item) => item.name === '番茄');
	assert(chicken?.quantity === '2', 'Equal meal and base servings did not preserve ingredient quantity');
	assert(chicken?.notes.includes('饭单 2 份 ÷ 基准 2 份 = ×1'), 'Calculation basis was not exposed');
	assert(salt?.quantity === '适量' && salt.notes.includes('未自动缩放'), 'Text quantity was guessed or lost');
	assert(ginger?.quantity === null && ginger.notes.includes('未填写数量'), 'Missing quantity was guessed');
	assert(tomatoes.length === 2 && tomatoes.every((item) => item.notes.includes('不同单位')), 'Unit conflicts were merged or not explained');
	const regeneratedList = (await member.request(`/api/meal-plans/${collaborativePlan.id}/shopping-list/generate`, {
		method: 'POST',
		expectedStatus: 201
	})).data.data.shoppingList;
	const generatedValues = generatedList.items.map(({ name, quantity, unit, category, notes }) => ({ name, quantity, unit, category, notes }));
	const regeneratedValues = regeneratedList.items.map(({ name, quantity, unit, category, notes }) => ({ name, quantity, unit, category, notes }));
	assert(JSON.stringify(generatedValues) === JSON.stringify(regeneratedValues), 'Regeneration was not repeatable');
	const scaledPlan = (await member.request('/api/meal-plans', {
		method: 'POST',
		json: {
			title: '家庭协作加倍晚餐',
			targetId: legacyTargetId,
			type: 'single_meal',
			items: [{ dishId: collaborativeDish.id, mealSlot: '晚餐', servings: 4 }]
		},
		expectedStatus: 201
	})).data.data.mealPlan;
	const scaledList = (await member.request(`/api/meal-plans/${scaledPlan.id}/shopping-list/generate`, {
		method: 'POST',
		expectedStatus: 201
	})).data.data.shoppingList;
	assert(scaledList.items.find((item) => item.name === '鸡腿')?.quantity === '4', 'Numeric quantity did not scale by meal/base servings');
	const checkedItemId = regeneratedList.items[0].id;
	const checkedList = (await member.request(
		`/api/shopping-lists/${regeneratedList.id}/items/${checkedItemId}`,
		{ method: 'PATCH', json: { checked: true } }
	)).data.data.shoppingList;
	assert(checkedList.items.find((item) => item.id === checkedItemId)?.checked === true, 'Member shopping-list update was not stored');
	const ownerList = (await owner.request(`/api/shopping-lists/${generatedList.id}`)).data.data.shoppingList;
	assert(ownerList.items.some((item) => item.checked === true), 'Owner cannot see the member shopping-list update');
	console.log('✓ shared dish, meal plan and shopping-list collaboration');

	await member.request(`/api/workspaces/${memberPersonalSpaceId}/select`, { method: 'POST' });
	const personalTarget = (await member.request('/api/targets', {
		method: 'POST',
		json: { name: '成员个人空间对象', type: 'home', peopleCount: 1 },
		expectedStatus: 201
	})).data.data.target;
	await member.request(`/api/workspaces/${legacySpaceId}/select`, { method: 'POST' });
	await owner.request(`/api/targets/${personalTarget.id}`, { expectedStatus: 404 });
	await owner.request(`/api/workspaces/${memberPersonalSpaceId}/select`, { method: 'POST', expectedStatus: 403 });
	await member.request('/api/workspace/invitations', {
		method: 'POST',
		json: { expiresInDays: 7 },
		expectedStatus: 403
	});
	console.log('✓ cross-workspace reads, selection and owner-only authorization');

	const revokedInvitation = (await owner.request('/api/workspace/invitations', {
		method: 'POST',
		json: { expiresInDays: 7 },
		expectedStatus: 201
	})).data.data.invitation;
	await owner.request(`/api/workspace/invitations/${revokedInvitation.id}`, { method: 'DELETE' });
	const revokedPreview = (await new Session().request(`/api/invitations/${revokedInvitation.token}`)).data.data;
	assert(revokedPreview.invitation.state === 'revoked', 'Revoked invitation state was not returned');

	const edgeSignUpResult = await signUp(edgeUser, '边界账号', 'les102-edge@example.com');
	assert(edgeSignUpResult.data?.location === '/app/meal-plans/new', 'Direct registration did not continue to the first-meal flow');
	const firstMealPage = String((await edgeUser.request('/app/meal-plans/new')).data);
	assert(firstMealPage.includes('安排一顿饭') && firstMealPage.includes('这顿想吃什么') && !firstMealPage.includes('对象类型'), 'First-meal page still exposes the entity-oriented flow');
	const arrangedMeal = await edgeUser.request('/app/meal-plans/new?/create', {
		method: 'POST',
		form: {
			dishNamesText: '番茄炒蛋、清炒时蔬',
			servings: '3',
			plannedDate: '2026-06-24',
			mealSlot: '晚餐'
		}
	});
	assert(/^\/app\/shopping-lists\/.+\?first=1$/.test(arrangedMeal.data?.location ?? ''), 'First meal did not continue to its shopping list');
	const firstShoppingPage = String((await edgeUser.request(arrangedMeal.data.location)).data);
	assert(firstShoppingPage.includes('这一顿安排好了') && firstShoppingPage.includes('清单还是空的'), 'First-meal completion did not show an editable shopping list');
	const firstMealDishes = (await edgeUser.request('/api/dishes')).data.data.dishes;
	assert(firstMealDishes.length === 2 && firstMealDishes.every((dish) => dish.baseServings === 3), 'Inline dish creation did not preserve the meal serving basis');
	console.log('✓ first meal to editable shopping-list flow');
	await edgeUser.request(`/api/invitations/${revokedInvitation.token}/accept`, {
		method: 'POST',
		expectedStatus: 409
	});
	const expiredPreview = (await edgeUser.request(`/api/invitations/${expiredToken}`)).data.data;
	assert(expiredPreview.invitation.state === 'expired', 'Expired invitation state was not returned');
	await edgeUser.request(`/api/invitations/${expiredToken}/accept`, {
		method: 'POST',
		expectedStatus: 409
	});
	await edgeUser.request(`/api/invitations/${invitation.token}/accept`, {
		method: 'POST',
		expectedStatus: 409
	});
	console.log('✓ revoked, expired and already-consumed invitation rejection');

	const ownerPage = await owner.request('/app');
	const memberSettings = await member.request('/app/settings');
	assert(String(ownerPage.data).includes('旧账号家庭空间'), 'Owner app page did not render the shared workspace');
	assert(String(memberSettings.data).includes('协作成员'), 'Member settings page did not render');
	console.log('✓ two independent authenticated application sessions');
};

if (!existsSync(workerPath)) {
	throw new Error('Missing Cloudflare worker build. Run `npm run build` before this smoke test.');
}

const persistPath = await mkdtemp(join(tmpdir(), 'fandan-family-smoke-'));
let server;
let serverLogs = '';

try {
	console.log('Preparing isolated pre-1.1 database...');
	await applyMigrationFile(persistPath, '0000_panoramic_carnage.sql');
	await applyMigrationFile(persistPath, '0001_groovy_wilson_fisk.sql');
	await seedLegacyData(persistPath);
	await applyMigrationFile(persistPath, '0002_rainy_mindworm.sql');
	await applyMigrationFile(persistPath, '0003_worried_luminals.sql');
	await runWrangler(persistPath, ['--command', `
INSERT INTO space_invitations (id, space_id, token, role, status, invited_by_user_id, expires_at)
VALUES ('smoke-les102-expired-id', '${legacySpaceId}', '${expiredToken}', 'member', 'pending', '${legacyUserId}', '2000-01-01T00:00:00.000Z');
`]);

	server = spawn(
		wranglerPath,
		['dev', workerPath, '--port', String(port), '--persist-to', persistPath],
		{ cwd: root, env: { ...process.env, NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] }
	);
	server.stdout.on('data', (chunk) => {
		serverLogs = `${serverLogs}${chunk}`.slice(-20000);
	});
	server.stderr.on('data', (chunk) => {
		serverLogs = `${serverLogs}${chunk}`.slice(-20000);
	});
	await waitForServer(server, () => serverLogs);
	await verifyCollaboration();
	console.log('Family workspace smoke passed.');
} finally {
	if (server) await stopServer(server);
	await rm(persistPath, { recursive: true, force: true });
}

import { spawn, execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { once } from 'node:events';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const workerPath = resolve(root, '.svelte-kit/cloudflare/_worker.js');
const wranglerPath = resolve(root, 'node_modules/.bin/wrangler');
const migrationFiles = [
	'0000_panoramic_carnage.sql',
	'0001_groovy_wilson_fisk.sql',
	'0002_rainy_mindworm.sql',
	'0003_worried_luminals.sql',
	'0004_simple_ultimatum.sql',
	'0005_sharp_pet_avengers.sql'
];

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
const password = 'Fandan-test-110!';

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

const signUp = (session) =>
	session.request('/register?/signUpEmail', {
		method: 'POST',
		form: {
			next: '/app',
			name: '分享权限测试',
			email: `les110-share-${Date.now()}@example.com`,
			password
		}
	});

const createMealPlan = async (session) => {
	const dish = (await session.request('/api/dishes', {
		method: 'POST',
		json: {
			name: '权限测试番茄炒蛋',
			category: '家常菜',
			baseServings: 2,
			ingredients: [{ name: '番茄', quantity: '2', unit: '个', category: '蔬菜' }]
		},
		expectedStatus: 201
	})).data.data.dish;
	const mealPlan = (await session.request('/api/meal-plans', {
		method: 'POST',
		json: {
			title: 'LES-110 分享权限测试晚餐',
			type: 'single_meal',
			status: 'pending_confirmation',
			items: [{ dishId: dish.id, mealSlot: '晚餐', servings: 2 }]
		},
		expectedStatus: 201
	})).data.data.mealPlan;

	assert(mealPlan.items?.[0]?.id, 'Created meal plan did not return an item id');
	return mealPlan;
};

const createShareLink = async (session, mealPlanId, json) =>
	(await session.request(`/api/meal-plans/${mealPlanId}/share-links`, {
		method: 'POST',
		json,
		expectedStatus: 201
	})).data.data.shareLink;

const verifyShareLinks = async () => {
	const owner = new Session();
	await signUp(owner);
	const mealPlan = await createMealPlan(owner);
	const itemId = mealPlan.items[0].id;

	const viewOnly = await createShareLink(owner, mealPlan.id, {
		canFeedback: false,
		canConfirm: false
	});
	const viewOnlyPage = String((await new Session().request(viewOnly.path)).data);
	assert(viewOnlyPage.includes('没有开放菜品反馈'), 'View-only share page did not explain disabled feedback');
	assert(!viewOnlyPage.includes('提交反馈'), 'View-only share page still rendered feedback submission');
	assert(!viewOnlyPage.includes('确认这份饭单'), 'View-only share page still rendered final confirmation');
	await new Session().request(`/api/share/${viewOnly.token}/feedback`, {
		method: 'POST',
		json: {
			guestName: '访客',
			mealPlanItemId: itemId,
			reaction: 'like',
			note: '保留'
		},
		expectedStatus: 403
	});
	await new Session().request(`/api/share/${viewOnly.token}/confirm`, {
		method: 'POST',
		json: { guestName: '访客', note: '确认' },
		expectedStatus: 403
	});
	console.log('✓ disabled feedback and confirmation match guest UI and API permissions');

	const defaultShare = await createShareLink(owner, mealPlan.id, {});
	assert(defaultShare.canFeedback === true, 'Default share link did not allow feedback');
	assert(defaultShare.canConfirm === true, 'Default share link did not allow confirmation');
	assert(defaultShare.expiresAt === null, 'Default share link should be permanent');
	const defaultPage = String((await new Session().request(defaultShare.path)).data);
	assert(defaultPage.includes('提交反馈') && defaultPage.includes('确认这份饭单'), 'Default share page did not keep one-tap behavior');
	console.log('✓ default share behavior remains feedback, confirmation and permanent');

	const expired = await createShareLink(owner, mealPlan.id, {
		canFeedback: true,
		canConfirm: true,
		expiresAt: '2000-01-01T00:00:00.000Z'
	});
	const expiredPage = String((await new Session().request(expired.path)).data);
	assert(expiredPage.includes('分享链接已过期，请联系创建者重新发起确认'), 'Expired share page did not show the explicit expiry message');
	await new Session().request(`/api/share/${expired.token}`, { expectedStatus: 403 });
	console.log('✓ expired share links are blocked and explain expiry');
};

if (!existsSync(workerPath)) {
	throw new Error('Missing Cloudflare worker build. Run `npm run build` before this smoke test.');
}

const persistPath = await mkdtemp(join(tmpdir(), 'fandan-share-smoke-'));
let server;
let serverLogs = '';

try {
	console.log('Preparing isolated share-link database...');
	for (const migrationFile of migrationFiles) {
		await applyMigrationFile(persistPath, migrationFile);
	}

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
	await verifyShareLinks();
	console.log('Share-link smoke passed.');
} finally {
	if (server) await stopServer(server);
	await rm(persistPath, { recursive: true, force: true });
}

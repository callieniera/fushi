import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('sentence explorer is the root home and the only learning mode in navigation', async ({ page }) => {
  const dictionaryRequests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/dictionaries/kuromoji/')) dictionaryRequests.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Explore a Japanese sentence' })).toBeVisible();
  await expect(page).toHaveTitle('Sentence explorer — Fushi');
  await expect(page.locator('nav').getByRole('link')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Lessons', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Practice', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sentence explorer', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'About Fushi', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'About Fushi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About Fushi', exact: true })).toBeVisible();
  await page.locator('.brand').click();
  await expect(page.getByRole('heading', { name: 'Explore a Japanese sentence' })).toBeVisible();
  expect(dictionaryRequests).toEqual([]);
  const engineChunk = page.locator('script[src*="kuromoji"], link[href*="kuromoji"]');
  await expect(engineChunk).toHaveCount(0);
});

test('lessons and practice routes use the not-found view and link back home', async ({ page }) => {
  for (const hash of ['#/lessons', '#/lessons/sentence-components', '#/drills']) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Return to sentence explorer' })).toHaveAttribute('href', '#/');
  }
  await page.getByRole('link', { name: 'Return to sentence explorer' }).click();
  await expect(page.getByRole('heading', { name: 'Explore a Japanese sentence' })).toBeVisible();
});

test('language toggle localizes the explorer and persists without changing the route', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Switch to Japanese', exact: true }).click();
  await expect(page.getByRole('heading', { name: '日本語の文を調べる' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByRole('link', { name: '文を調べる', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.reload();
  await expect(page.getByRole('heading', { name: '日本語の文を調べる' })).toBeVisible();
  await page.getByRole('button', { name: '英語に切り替える', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Explore a Japanese sentence' })).toBeVisible();
});

test('explorer samples choose new passages without immediate repeats', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto('/');
  const sample = page.getByRole('button', { name: 'Use a random sample' });
  await sample.click();
  await expect(page.getByLabel('Japanese sentence (up to 1,000 characters)')).toHaveValue('私は本を読む');
  await sample.click();
  await expect(page.getByLabel('Japanese sentence (up to 1,000 characters)')).toHaveValue('静かな公園で友達と話しました');
});

test('about page introduces Fushi and includes the project and dictionary licenses', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer')).toContainText('Learn Japanese school grammar with Fushi.');
  await expect(page.locator('footer')).not.toContainText('Curated educational examples');
  await page.locator('footer').getByRole('link', { name: 'About Fushi, project link, and licenses' }).click();
  await expect(page.getByRole('heading', { name: 'About Fushi', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'About Fushi', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Fushi on GitHub', exact: true })).toHaveAttribute('href', 'https://github.com/callieniera/fushi');
  await expect(page.getByText('The GitHub repository is not yet public.', { exact: false })).toBeVisible();
  await page.getByText('Apache License 2.0', { exact: true }).click();
  await expect(page.locator('.legal-notice').first()).toContainText('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION');
  await page.getByText('IPAdic copyright and notices', { exact: true }).click();
  await expect(page.locator('.legal-notice').nth(1)).toContainText('mecab-ipadic-2.7.0-20070801');
  await expect(page.locator('.legal-notice').nth(1)).toContainText('Nara Institute of Science');
  await page.getByRole('button', { name: 'Switch to Japanese', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fushiについて', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHubのFushi', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test('analysis scope routes directly and links from explorer and About without dictionary requests', async ({ page }) => {
  const dictionaryRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().includes('/dictionaries/kuromoji/')) dictionaryRequests.push(request.url()); });
  await page.goto('/#/analysis-scope');
  await expect(page.getByRole('heading', { name: 'What Fushi analyzes', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('What Fushi analyzes — Fushi');
  await expect(page.getByRole('heading', { name: 'Why full sentence grammar is not promised' })).toBeVisible();
  await expect(page.getByText('High-accuracy Japanese sentence analysis is not theoretically impossible.', { exact: false })).toBeVisible();
  await expect(page.locator('nav').getByRole('link', { name: 'What Fushi analyzes' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Return to the sentence explorer' }).click();
  await expect(page.getByRole('heading', { name: 'Explore a Japanese sentence' })).toBeVisible();
  await page.getByRole('link', { name: 'What the sentence explorer can and cannot analyze' }).click();
  await expect(page.getByRole('heading', { name: 'What Fushi analyzes', exact: true })).toBeVisible();
  await page.locator('footer').getByRole('link', { name: 'About Fushi, project link, and licenses' }).click();
  await page.getByRole('link', { name: 'What the sentence explorer can and cannot analyze' }).click();
  await expect(page.getByRole('heading', { name: 'What Fushi analyzes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Switch to Japanese', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fushiが解析するもの', exact: true })).toBeVisible();
  await expect(page).toHaveTitle('Fushiが解析するもの — Fushi');
  await expect(page.getByRole('heading', { name: '文全体の文法解析を保証しない理由' })).toBeVisible();
  await expect(page.getByText('高精度な日本語文解析が理論上不可能というわけではありません。', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Fushiが解析するもの', exact: true })).toBeVisible();
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 320, height: 740 });
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
    await expect(page.getByRole('heading', { name: 'Fushiが解析するもの', exact: true })).toBeVisible();
  }
  expect(dictionaryRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('old classical routes use the not-found view', async ({ page }) => {
  await page.goto('/#/classical');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('automatic light and dark schemes keep the mobile layout within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'Switch to Japanese', exact: true })).toBeVisible();
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
    const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    expect(scheme).toContain(colorScheme);
  }
});

test('narrow viewport has no horizontal document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  await expect(page.getByLabel('Japanese sentence (up to 1,000 characters)')).toBeVisible();
});

test('production initial graph excludes kuromoji and dictionary files are external', async () => {
  const manifest = JSON.parse(await readFile(new URL('../dist/.vite/manifest.json', import.meta.url), 'utf8')) as Record<string, { file: string; imports?: string[]; dynamicImports?: string[] }>;
  const entry = manifest['index.html'];
  expect(entry).toBeDefined();
  const initial = new Set<string>();
  function visit(key: string): void {
    if (initial.has(key)) return;
    initial.add(key);
    for (const dependency of manifest[key]?.imports ?? []) visit(dependency);
  }
  visit('index.html');
  for (const key of initial) expect(manifest[key]?.file).not.toContain('kuromoji');
  expect(entry?.dynamicImports?.some((key) => manifest[key]?.file.includes('kuromoji'))).toBe(true);
  const initialJs = await readFile(new URL(`../dist/${entry?.file}`, import.meta.url), 'utf8');
  expect(initialJs).not.toContain('base.dat.gz');
});

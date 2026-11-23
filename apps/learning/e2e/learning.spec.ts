import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('curated routes load without kuromoji or dictionary requests', async ({ page }) => {
  const dictionaryRequests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/dictionaries/kuromoji/')) dictionaryRequests.push(request.url()); });
  await page.goto('/#/lessons');
  await expect(page.getByRole('heading', { name: 'Learn from phrases to full analysis' })).toBeVisible();
  await expect(page.getByRole('link', { name: /6\. Full grammatical analysis/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Classical Japanese', exact: true })).toHaveCount(0);
  expect(dictionaryRequests).toEqual([]);
  const engineChunk = page.locator('script[src*="kuromoji"], link[href*="kuromoji"]');
  await expect(engineChunk).toHaveCount(0);
});

test('every character boundary is selectable and extra splits are rejected', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto('/#/lessons/bunsetsu-basics');
  const exercise = page.getByRole('region', { name: 'Step 1: Split into phrase segments' });
  const canvas = exercise.getByRole('group', { name: 'Text to split into bunsetsu' });
  await expect(canvas.locator('.boundary')).toHaveCount(await canvas.locator('.character').count());
  await canvas.getByRole('button', { name: 'Boundary after 子 before ど', exact: true }).click();
  await exercise.getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(exercise.getByRole('status')).toContainText('4 expected boundaries are missing and 1 extra boundary is selected');
});

test('keyboard-only lesson splitting, course comparisons, and progress survive reload', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto('/#/lessons/bunsetsu-basics');
  const bunsetsu = page.getByRole('group', { name: 'Text to split into bunsetsu' });
  const first = bunsetsu.getByRole('button', { name: 'Boundary after が before お' });
  await first.focus();
  await page.keyboard.press('Enter');
  await expect(first).toHaveAttribute('aria-pressed', 'true');
  for (const name of ['Boundary after を before 食', 'Boundary after て before い', 'Boundary after る, end of sentence']) {
    await bunsetsu.getByRole('button', { name, exact: true }).focus();
    await page.keyboard.press('Space');
  }
  await page.getByRole('region', { name: 'Step 1: Split into phrase segments' }).getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByText('Correct. All expected boundaries are selected.')).toBeVisible();
  const tango = page.getByRole('group', { name: 'Text to split into tango' });
  await expect(tango).not.toHaveAttribute('aria-disabled', 'true');
  for (const name of ['Boundary after ち before が', 'Boundary after が before お', 'Boundary after 子 before を', 'Boundary after を before 食', 'Boundary after べ before て', 'Boundary after て before い', 'Boundary after る, end of sentence']) {
    await tango.getByRole('button', { name, exact: true }).focus();
    await page.keyboard.press('Enter');
  }
  await page.getByRole('region', { name: 'Step 2: Split into words' }).getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByText(/子どもたち｜が｜お菓子｜を｜食べ｜て｜いる/)).toBeVisible();
  await page.getByRole('button', { name: 'Show comparisons with Japanese-language courses' }).click();
  await expect(page.getByText(/Japanese-for-learners verb ending/)).toBeVisible();
  await page.getByRole('button', { name: 'Mark lesson complete' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Lesson completed ✓' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Hide comparisons with Japanese-language courses' })).toHaveAttribute('aria-pressed', 'true');
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.getByRole('button', { name: 'Mark lesson complete' })).toBeEnabled();
});

test('identification, component, conjugation, and decision-tree interactions work', async ({ page }) => {
  await page.goto('/#/lessons/parts-of-speech');
  await page.getByLabel('連体詞', { exact: true }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText('Correct.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Yes — it can head a phrase segment' }).click();
  await page.getByRole('button', { name: 'No', exact: true }).click();
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await expect(page.getByText('Part of speech: 連体詞')).toBeVisible();
  await page.getByRole('button', { name: 'Back to previous question' }).click();
  await expect(page.getByRole('heading', { name: 'Does it directly modify a following noun, like 大きな or この?' })).toBeVisible();

  await page.goto('/#/lessons/sentence-components');
  await page.getByLabel('主語', { exact: true }).check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByText(/連文節: 本を \+ 読む/)).toBeVisible();
  await page.goto('/#/lessons/conjugation-basics');
  await expect(page.getByText('未然形 → 連用形 → 終止形 → 連体形 → 仮定形 → 命令形')).toBeVisible();
  await expect(page.getByText('話し is the masu stem used in Japanese-language courses; school grammar calls this use 連用形.')).toBeVisible();
});

test('language toggle localizes lesson content and persists without changing the route', async ({ page }) => {
  await page.goto('/#/lessons');
  await page.getByRole('button', { name: 'Switch to Japanese', exact: true }).click();
  await expect(page.getByRole('heading', { name: '文節から品詞分解まで学ぶ' })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByRole('link', { name: 'レッスン', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: '1. 文節と単語', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '文節から品詞分解まで学ぶ' })).toBeVisible();
  await page.getByRole('link', { name: '1. 文節と単語', exact: true }).click();
  await expect(page.getByRole('heading', { name: '1. 文節と単語', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '日本語教育との対応を表示' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'ステップ1: 文節に分けよう' })).toBeVisible();
  await page.getByRole('button', { name: '英語に切り替える', exact: true }).click();
  await expect(page.getByRole('heading', { name: /1\. Phrase segments and words/ })).toBeVisible();
});

test('split lesson chooses new passages without immediate repeats and keeps paired stages', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.goto('/#/lessons/bunsetsu-basics');
  await expect(page.locator('[data-passage-id]')).toHaveAttribute('data-passage-id', 'split');
  await page.getByRole('link', { name: '← All lessons' }).click();
  await page.getByRole('link', { name: /1\. Phrase segments and words/ }).click();
  await expect(page.locator('[data-passage-id]')).toHaveAttribute('data-passage-id', 'practice-01');
  await expect(page.locator('[data-passage-id]')).toHaveCount(1);
  await expect(page.locator('[data-passage-id] .annotated-text')).toHaveCount(1);
  await expect(page.locator('#split-bunsetsu-title ~ .split-canvas .character').allTextContents()).resolves.toEqual(await page.locator('#split-tango-title ~ .split-canvas .character').allTextContents());
  for (const name of ['Boundary after は before 毎', 'Boundary after 朝 before 駅', 'Boundary after で before 歩', 'Boundary after く, end of sentence']) {
    await page.getByRole('region', { name: 'Step 1: Split into phrase segments' }).getByRole('button', { name, exact: true }).click();
  }
  await page.getByRole('region', { name: 'Step 1: Split into phrase segments' }).getByRole('button', { name: 'Check answer', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Step 2: Split into words' }).getByRole('group')).not.toHaveAttribute('aria-disabled', 'true');
  await page.getByRole('link', { name: '← All lessons' }).click();
  await page.getByRole('link', { name: /1\. Phrase segments and words/ }).click();
  await expect(page.locator('[data-passage-id]')).toHaveAttribute('data-passage-id', 'split');
  await page.getByRole('link', { name: 'Sentence explorer', exact: true }).click();
  const sample = page.getByRole('button', { name: 'Use a random sample' });
  await sample.click();
  await expect(page.getByLabel('Japanese sentence (up to 1,000 characters)')).toHaveValue('私は本を読む');
  await sample.click();
  await expect(page.getByLabel('Japanese sentence (up to 1,000 characters)')).toHaveValue('静かな公園で友達と話しました');
});

test('about page introduces Fushi and includes the project and dictionary licenses', async ({ page }) => {
  await page.goto('/#/lessons');
  await expect(page.locator('footer')).toContainText('Learn Japanese school grammar with Fushi.');
  await expect(page.locator('footer')).not.toContainText('Curated educational examples');
  await page.locator('footer').getByRole('link', { name: 'About Fushi, project link, and licenses' }).click();
  await expect(page.getByRole('heading', { name: 'About Fushi', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'About Fushi', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Fushi on GitHub (not yet public)' })).toHaveAttribute('href', 'https://github.com/callieniera/fushi');
  await expect(page.getByText('The GitHub repository is not yet public.', { exact: false })).toBeVisible();
  await page.getByText('Apache License 2.0', { exact: true }).click();
  await expect(page.locator('.legal-notice').first()).toContainText('TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION');
  await page.getByText('IPAdic copyright and notices', { exact: true }).click();
  await expect(page.locator('.legal-notice').nth(1)).toContainText('mecab-ipadic-2.7.0-20070801');
  await expect(page.locator('.legal-notice').nth(1)).toContainText('Nara Institute of Science');
  await page.getByRole('button', { name: 'Switch to Japanese', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fushiについて', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'GitHubのFushi（現在は非公開）' })).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
});

test('old classical routes use the not-found view', async ({ page }) => {
  await page.goto('/#/classical');
  await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
});

test('automatic light and dark schemes keep the mobile layout within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.goto('/#/lessons');
    await expect(page.getByRole('button', { name: 'Switch to Japanese', exact: true })).toBeVisible();
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
    const scheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    expect(scheme).toContain(colorScheme);
  }
});

test('narrow viewport has no horizontal document overflow', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0; });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/lessons/bunsetsu-basics');
  const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  await expect(page.getByRole('group', { name: 'Text to split into bunsetsu' }).getByRole('button', { name: 'Boundary after が before お' })).toBeVisible();
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

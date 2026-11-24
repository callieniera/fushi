import { expect, test } from '@playwright/test';

test('real dictionary loads lazily, annotates modern text, and reuses cache on reload', async ({ page }) => {
  const dictionaryRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().includes('/dictionaries/kuromoji/')) dictionaryRequests.push(request.url()); });
  await page.goto('/#/sandbox');
  expect(dictionaryRequests).toEqual([]);
  await expect(page.getByText('Suggestions may be imperfect')).toBeVisible();
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('私は本を読む');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await expect(page.getByText(/Your sentence has 3 phrase segments/)).toBeVisible({ timeout: 30_000 });
  await expect(page.locator('[data-tango-id]').filter({ hasText: /^読む$/ })).toHaveCount(1);
  const experimental = page.locator('.experimental-analysis');
  await expect(experimental).not.toHaveAttribute('open', '');
  await expect(page.getByRole('heading', { name: 'Words and phrase segments（単語・文節）' })).toBeVisible();
  await experimental.locator('summary').click();
  const analysis = page.getByRole('region', { name: 'Sentence analysis', exact: true });
  const sections = analysis.locator(':scope > .analysis-section');
  await expect(sections).toHaveCount(3);
  await expect(sections.nth(0).locator(':scope > h4')).toHaveText('Sentence components（文の成分）');
  await expect(sections.nth(0).locator('.accuracy-badge')).toHaveCount(0);
  for (const section of [sections.nth(1), sections.nth(2)]) {
    await expect(section).toHaveAttribute('data-accuracy', 'low');
    await expect(section.locator('.accuracy-badge')).toHaveText('Low accuracy');
  }
  await expect(sections.nth(1).locator(':scope > h4')).toContainText('Phrase-segment dependencies（文節の係り受け）');
  await expect(sections.nth(2).locator(':scope > h4')).toContainText('Simple, complex, and compound sentences（単文・複文・重文）');
  await expect(analysis.locator('.component-row')).toHaveCount(3);
  await expect(analysis.locator('[data-bunsetsu-id="modern-bunsetsu-0"]')).toContainText('私は');
  await expect(analysis.locator('[data-bunsetsu-id="modern-bunsetsu-0"]')).toContainText('Subject（主語）');
  await expect(analysis.locator('[data-bunsetsu-id="modern-bunsetsu-1"]')).toContainText('本を');
  await expect(analysis.locator('[data-bunsetsu-id="modern-bunsetsu-1"]')).toContainText('Modifier（修飾語）（adverbial modifier（連用修飾語））');
  await expect(analysis.locator('[data-bunsetsu-id="modern-bunsetsu-2"]')).toContainText('読む');
  await expect(analysis.locator('[data-bunsetsu-id="modern-bunsetsu-2"]')).toContainText('Predicate（述語）');
  await expect(analysis.locator('[data-source-bunsetsu-id="modern-bunsetsu-0"][data-target-bunsetsu-id="modern-bunsetsu-2"]')).toContainText('私は→読む');
  await expect(analysis.locator('[data-source-bunsetsu-id="modern-bunsetsu-1"][data-target-bunsetsu-id="modern-bunsetsu-2"]')).toContainText('本を→読む');
  await expect(analysis.locator('.clause-analysis')).toHaveCount(0);
  await page.getByRole('button', { name: '読む', exact: true }).click();
  await expect(page.getByText('五段', { exact: true })).toBeVisible();
  await expect(page.getByText('終止形', { exact: true })).toBeVisible();
  expect(dictionaryRequests).toHaveLength(12);
  for (const url of dictionaryRequests) {
    expect(url).toContain('/dictionaries/kuromoji/0.1.2/');
    const response = await page.request.get(url);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/gzip');
    expect(response.headers()['content-encoding']).toBeUndefined();
    expect((await response.body()).byteLength).toBeGreaterThan(0);
  }
  dictionaryRequests.length = 0;
  await page.reload();
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('私は本を読む');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await expect(page.getByText(/Your sentence has 3 phrase segments/)).toBeVisible({ timeout: 30_000 });
  expect(dictionaryRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('classifies temporal and purpose modifiers without competing final predicates', async ({ page }) => {
  await page.goto('/#/sandbox');
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('昨日友達と映画を見に行きました');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await page.locator('.experimental-analysis summary').click();
  const analysis = page.getByRole('region', { name: 'Sentence analysis', exact: true });
  await expect(analysis).toBeVisible({ timeout: 30_000 });
  for (const index of [0, 1, 2, 3]) {
    await expect(analysis.locator(`[data-bunsetsu-id="modern-bunsetsu-${index}"]`))
      .toContainText('adverbial modifier（連用修飾語）');
  }
  await expect(analysis.locator('[data-bunsetsu-id="modern-bunsetsu-4"]')).toContainText('Predicate（述語）');
  await expect(analysis.locator('[data-source-bunsetsu-id="modern-bunsetsu-3"][data-target-bunsetsu-id="modern-bunsetsu-4"]')).toContainText('見に→行きました');
  await expect(analysis.locator('.sentence-type')).toContainText('Simple sentence（単文）');
  await expect(analysis.locator('[data-component="unresolved"]')).toHaveCount(0);
  const review = page.getByRole('region', { name: 'Review suggestions', exact: true });
  await expect(review.locator('[data-diagnostic-code="MODERN_COMPONENT_PREDICATE_AMBIGUOUS"]')).toHaveCount(0);
});

test('sentence analysis localizes, explains unresolved subjects, and clears with the result', async ({ page }) => {
  await page.goto('/#/sandbox');
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('本を読む');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await page.locator('.experimental-analysis summary').click();
  const analysis = page.getByRole('region', { name: 'Sentence analysis', exact: true });
  await expect(analysis).toBeVisible({ timeout: 30_000 });
  await expect(analysis.locator('[data-component="unresolved"]')).toHaveCount(0);
  await expect(analysis.locator('.relation-row')).toHaveCount(2);
  const review = page.getByRole('region', { name: 'Review suggestions', exact: true });
  await expect(review.locator('[data-diagnostic-code="MODERN_COMPONENT_SUBJECT_UNRESOLVED"]')).toContainText('Japanese often omits subjects');
  await expect(review.locator('[data-diagnostic-code="MODERN_COMPONENT_SUBJECT_UNRESOLVED"]')).toContainText('Affected text: 読む');
  await page.getByRole('button', { name: 'Switch to Japanese', exact: true }).click();
  await expect(page.getByRole('region', { name: '文の解析', exact: true })).toHaveCount(0);
  await page.getByLabel('日本語の文（1,000文字まで）').fill('本を読む');
  await page.getByRole('button', { name: '文を調べる', exact: true }).click();
  await page.locator('.experimental-analysis summary').click();
  const japaneseAnalysis = page.getByRole('region', { name: '文の解析', exact: true });
  await expect(japaneseAnalysis).toBeVisible({ timeout: 30_000 });
  await expect(japaneseAnalysis.locator('[data-bunsetsu-id="modern-bunsetsu-0"]')).toContainText('修飾語');
  await expect(japaneseAnalysis.locator('[data-bunsetsu-id="modern-bunsetsu-1"]')).toContainText('述語');
  await expect(page.getByRole('region', { name: '結果の確認ポイント', exact: true })).toContainText('日本語では主語の省略がよくあるため、誤りとは限りません');
  await page.getByRole('button', { name: 'クリア', exact: true }).click();
  await expect(page.locator('.sandbox-result')).toBeEmpty();
});

test('multi-clause results show clause membership, predicates, and relationships', async ({ page }) => {
  await page.goto('/#/sandbox');
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('雨が降ったので私は家に帰った');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await page.locator('.experimental-analysis summary').click();
  const analysis = page.getByRole('region', { name: 'Sentence analysis', exact: true });
  await expect(analysis).toBeVisible({ timeout: 30_000 });
  const clauses = analysis.locator('.clause-item');
  await expect(clauses).toHaveCount(2);
  await expect(clauses.nth(0)).toHaveAttribute('data-clause-kind', '接続節');
  await expect(clauses.nth(0).locator('.clause-text')).toHaveText('雨が｜降ったので');
  await expect(clauses.nth(0).locator('.clause-predicate')).toContainText('降ったので');
  await expect(clauses.nth(0).locator('.clause-relations')).toContainText('Related main clause');
  await expect(clauses.nth(1)).toHaveAttribute('data-clause-kind', '主節');
  await expect(clauses.nth(1).locator('.clause-text')).toHaveText('私は｜家に｜帰った');
  await expect(clauses.nth(1).locator('.clause-predicate')).toContainText('帰った');
  await expect(analysis.locator('[data-source-bunsetsu-id="modern-bunsetsu-0"][data-target-bunsetsu-id="modern-bunsetsu-1"]')).toContainText('雨が→降ったので');
  await expect(analysis.locator('[data-source-bunsetsu-id="modern-bunsetsu-2"][data-target-bunsetsu-id="modern-bunsetsu-4"]')).toContainText('私は→帰った');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await page.setViewportSize({ width: 320, height: 740 });
    const widths = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
    expect(widths.content).toBeLessThanOrEqual(widths.viewport);
    await expect(analysis).toBeVisible();
  }
});

test('subsidiary predicates stay grouped in the optional experimental sentence analysis', async ({ page }) => {
  await page.goto('/#/sandbox');
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('雨が降っているので傘を持って行きましょう');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await expect(page.getByText(/Your sentence has 6 phrase segments/)).toBeVisible({ timeout: 30_000 });
  const experimental = page.locator('.experimental-analysis');
  await expect(experimental).not.toHaveAttribute('open', '');
  await expect(page.locator('.annotated-text')).toBeVisible();
  await experimental.locator('summary').click();
  const analysis = page.getByRole('region', { name: 'Sentence analysis', exact: true });
  await expect(analysis.locator('.component-row')).toHaveCount(4);
  await expect(analysis.locator('.component-row[data-renbunsetsu-id="modern-renbunsetsu-0"]')).toContainText('降っているので');
  await expect(analysis.locator('.component-row[data-renbunsetsu-id="modern-renbunsetsu-0"]')).toContainText('Connective（接続語）');
  await expect(analysis.locator('.component-row[data-renbunsetsu-id="modern-renbunsetsu-1"]')).toContainText('持って行きましょう');
  await expect(analysis.locator('.component-row[data-renbunsetsu-id="modern-renbunsetsu-1"]')).toContainText('Predicate（述語）');
  await expect(analysis.locator('[data-bunsetsu-id="modern-bunsetsu-3"]')).toContainText('連用修飾語');
  await expect(analysis.locator('.clause-item')).toHaveCount(2);
  await expect(analysis.locator('.clause-item').nth(0)).toHaveAttribute('data-clause-kind', '接続節');
  await expect(analysis.locator('.clause-item').nth(0).locator('.clause-predicate')).toContainText('降っているので');
  await expect(analysis.locator('.clause-item').nth(1).locator('.clause-predicate')).toContainText('持って行きましょう');
  await expect(analysis.locator('[data-component="unresolved"]')).toHaveCount(0);
  await expect(analysis.locator('.sentence-type')).toContainText('複文');
  await page.getByRole('button', { name: 'Switch to Japanese', exact: true }).click();
  await page.getByLabel('日本語の文（1,000文字まで）').fill('雨が降っているので傘を持って行きましょう');
  await page.getByRole('button', { name: '文を調べる', exact: true }).click();
  await expect(page.locator('.experimental-analysis summary')).toHaveText('試験的な文解析');
  await page.locator('.experimental-analysis summary').click();
  const japanese = page.getByRole('region', { name: '文の解析', exact: true });
  const japaneseSections = japanese.locator(':scope > .analysis-section');
  await expect(japaneseSections).toHaveCount(3);
  await expect(japaneseSections.nth(0).locator(':scope > h4')).toHaveText('文の成分');
  await expect(japaneseSections.nth(1).locator(':scope > h4')).toContainText('文節の係り受け');
  await expect(japaneseSections.nth(2).locator(':scope > h4')).toContainText('単文・複文・重文');
  await expect(japaneseSections.locator('.accuracy-badge')).toHaveText(['精度が低い', '精度が低い']);
  await expect(japaneseSections.nth(2).locator('.clause-item')).toHaveCount(2);
  await expect(japanese.locator('.component-row[data-renbunsetsu-id="modern-renbunsetsu-0"]')).toContainText('接続語');
  await expect(japanese.locator('[data-bunsetsu-id="modern-bunsetsu-3"]')).toContainText('修飾語（連用修飾語）');
  await expect(japanese.locator('.clause-item').nth(0)).toContainText('接続節');
  await expect(japanese.locator('.clause-item').nth(0).locator('.clause-predicate')).toContainText('降っているので');
  await expect(japanese.locator('.clause-item').nth(1).locator('.clause-predicate')).toContainText('持って行きましょう');
});

test('unresolved components and unknown diagnostics have explicit learner-facing fallbacks', async ({ page }) => {
  await page.route('**/assets/kuromoji-*.js', async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes('createKuromojiEngine') || !source.includes('parseModern')) {
      await route.fulfill({ response });
      return;
    }
    await route.fulfill({
      response,
      body: `export function createKuromojiEngine() {
        return { parseModern: async (text) => ({
          mode: 'modern', text,
          bunsetsu: [{ id: 'fixture-b0', start: 0, end: text.length, tango: [{ id: 'fixture-t0', surface: text, hinshi: '名詞', isIndependent: true, start: 0, end: text.length }] }],
          diagnostics: [{ code: 'FIXTURE_UNKNOWN', message: 'Internal details', severity: 'warning', start: 0, end: text.length }],
        }) };
      }`,
    });
  });
  await page.goto('/#/sandbox');
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('未知');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await page.locator('.experimental-analysis summary').click();
  const analysis = page.getByRole('region', { name: 'Sentence analysis', exact: true });
  await expect(analysis.locator('[data-component="unresolved"]')).toContainText('Not determined');
  await expect(analysis).toContainText('does not mean the phrase is ungrammatical');
  await expect(analysis).toContainText('No relationships were determined reliably.');
  const diagnostic = page.locator('[data-diagnostic-code="FIXTURE_UNKNOWN"]');
  await expect(diagnostic).toContainText('The analyzer could not fully support this part.');
  await expect(diagnostic).toContainText('Affected text: 未知');
  await expect(diagnostic).not.toContainText('Internal details');
});

test('dictionary failure supports retry and curated lessons remain available', async ({ page }) => {
  let fail = true;
  await page.route('**/dictionaries/kuromoji/**', async (route) => {
    if (fail) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/#/sandbox');
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('私は本を読む');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Lessons', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Learn from phrases to full analysis' })).toBeVisible();
  fail = false;
  await page.getByRole('link', { name: 'Sentence explorer', exact: true }).click();
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('私は本を読む');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await expect(page.getByText(/Your sentence has 3 phrase segments/)).toBeVisible({ timeout: 30_000 });
});

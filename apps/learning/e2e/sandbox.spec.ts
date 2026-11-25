import { expect, test } from '@playwright/test';

test('real dictionary loads lazily, annotates words and bunsetsu, and reuses cache on reload', async ({ page }) => {
  const dictionaryRequests: string[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().includes('/dictionaries/kuromoji/')) dictionaryRequests.push(request.url()); });
  await page.goto('/#/sandbox');
  expect(dictionaryRequests).toEqual([]);
  await expect(page.getByText('Suggestions may be imperfect')).toBeVisible();
  await expect(page.getByRole('link', { name: 'What the sentence explorer can and cannot analyze' })).toHaveAttribute('href', '#/analysis-scope');
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('私は本を読む');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await expect(page.getByText(/Your sentence has 3 phrase segments/)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Words and phrase segments（単語・文節）' })).toBeVisible();
  await expect(page.locator('.annotated-text [data-bunsetsu-id]')).toHaveCount(3);
  await expect(page.locator('[data-bunsetsu-id="modern-bunsetsu-0"]')).toHaveText('私は');
  await expect(page.locator('[data-bunsetsu-id="modern-bunsetsu-1"]')).toHaveText('本を');
  await expect(page.locator('[data-bunsetsu-id="modern-bunsetsu-2"]')).toHaveText('読む');
  await expect(page.locator('[data-tango-id]').filter({ hasText: /^読む$/ })).toHaveCount(1);
  await expect(page.locator('.experimental-analysis, .sentence-analysis, .component-row, .relation-row, .clause-item, .renbunsetsu-list')).toHaveCount(0);
  await expect(page.locator('[data-diagnostic-code^="MODERN_COMPONENT_"]')).toHaveCount(0);
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

test('word results and diagnostics localize and clear with the result', async ({ page }) => {
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
          bunsetsu: [
            { id: 'fixture-b0', start: 0, end: text.length, tango: [{ id: 'fixture-t0', surface: text, hinshi: '名詞', isIndependent: true, start: 0, end: text.length }] },
            { id: 'fixture-b1', start: text.length, end: text.length, tango: [{ id: 'fixture-t1', surface: '。', hinshi: '記号', isIndependent: true, start: text.length, end: text.length }] },
          ],
          diagnostics: [{ code: 'FIXTURE_UNKNOWN', message: 'Internal details', severity: 'warning', start: 0, end: text.length }],
        }) };
      }`,
    });
  });
  await page.goto('/#/sandbox');
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('未知');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await expect(page.getByText('Your sentence has 1 phrase segments. Review any notes below.')).toBeVisible();
  const diagnostic = page.locator('[data-diagnostic-code="FIXTURE_UNKNOWN"]');
  await expect(diagnostic).toContainText('The analyzer could not fully support this part.');
  await expect(diagnostic).toContainText('Affected text: 未知');
  await expect(diagnostic).not.toContainText('Internal details');
  await expect(page.locator('.experimental-analysis')).toHaveCount(0);
  await page.getByRole('button', { name: 'Switch to Japanese', exact: true }).click();
  await page.getByLabel('日本語の文（1,000文字まで）').fill('未知');
  await page.getByRole('button', { name: '文を調べる', exact: true }).click();
  await expect(page.getByText('文節は1個です。下の注意も確認してください。')).toBeVisible();
  await expect(page.getByRole('region', { name: '結果の確認ポイント', exact: true })).toContainText('対象の表現: 未知');
  await page.getByRole('button', { name: 'クリア', exact: true }).click();
  await expect(page.locator('.sandbox-result')).toBeEmpty();
  await expect(page.getByLabel('日本語の文（1,000文字まで）')).toHaveValue('');
});

test('dictionary failure supports retry after navigating away and back', async ({ page }) => {
  let fail = true;
  await page.route('**/dictionaries/kuromoji/**', async (route) => {
    if (fail) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/#/sandbox');
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('私は本を読む');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await expect(page.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'About Fushi', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'About Fushi', exact: true })).toBeVisible();
  fail = false;
  await page.getByRole('link', { name: 'Sentence explorer', exact: true }).click();
  await page.getByLabel('Japanese sentence (up to 1,000 characters)').fill('私は本を読む');
  await page.getByRole('button', { name: 'Explore sentence' }).click();
  await expect(page.getByText(/Your sentence has 3 phrase segments/)).toBeVisible({ timeout: 30_000 });
});

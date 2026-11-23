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

import { readdir, readFile, stat } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('does not embed dictionary assets in the application bundle', async () => {
  const directory = new URL('./dist/assets/', import.meta.url);
  const files = await readdir(directory);
  expect(files.some((file) => file.endsWith('.dat.gz'))).toBe(false);
  for (const file of files.filter((file) => file.endsWith('.js'))) {
    const { size } = await stat(new URL(file, directory));
    expect(size).toBeLessThan(1_000_000);
    const contents = await readFile(new URL(file, directory), 'utf8');
    expect(contents).toContain('base.dat.gz');
    expect(contents).toContain('/dictionaries/kuromoji/');
  }
});

test('loads external IPAdic assets, parses modern Japanese, and reuses the browser cache', async ({ page }) => {
  const errors: string[] = [];
  const dictionaryRequests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.url().includes('/dictionaries/kuromoji/')) {
      dictionaryRequests.push(response.url());
    }
  });

  await page.goto('/');
  const first = await page.evaluate(() =>
    window.fushiBrowserTest.parseModern('私は本を読む', 'fushi-browser-integration-v1'),
  );

  expect(first.mode).toBe('modern');
  expect(first.text).toBe('私は本を読む');
  expect(first.bunsetsu.map((bunsetsu) => bunsetsu.tango.map((tango) => tango.surface).join(''))).toEqual([
    '私は',
    '本を',
    '読む',
  ]);
  expect(first.bunsetsu[2]?.tango[0]).toMatchObject({
    surface: '読む',
    hinshi: '動詞',
    katsuyouType: '五段',
    katsuyoukei: '終止形',
  });
  expect(first.bunsetsu[2]?.tango[0]?.rawMorphemes?.[0]?.pos).toBe('動詞');
  expect(dictionaryRequests.length).toBeGreaterThan(0);

  dictionaryRequests.length = 0;
  const second = await page.evaluate(() =>
    window.fushiBrowserTest.parseModern('私は本を読む', 'fushi-browser-integration-v1'),
  );
  expect(second.bunsetsu).toEqual(first.bunsetsu);
  expect(dictionaryRequests).toEqual([]);

  const distinctions = await page.evaluate(() =>
    window.fushiBrowserTest.parseModern('行くに行った', 'fushi-browser-integration-v1'),
  );
  const tokens = distinctions.bunsetsu.flatMap((bunsetsu) => bunsetsu.tango);
  expect(tokens.find((token) => token.surface === 'に')).toMatchObject({
    hinshi: '助詞',
    subHinshi: '接続助詞',
  });
  expect(tokens.find((token) => token.surface === '行っ')).toMatchObject({
    hinshi: '動詞',
    katsuyoukei: '連用形',
  });
  expect(errors).toEqual([]);
});

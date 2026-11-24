# Fushi learning app

A static, client-side Modern Japanese School Grammar learning application. It includes complete English and Japanese interface/content localization, automatic OS light/dark themes, randomized curated sentence practice, and a separate on-demand Modern Japanese sandbox. Curated answers are never determined by live kuromoji output. The core library's Classical Japanese APIs are not used by this app.

## Develop

From the repository root:

```bash
npx --yes pnpm@10.28.2 install
npx --yes pnpm@10.28.2 dev:app
```

The root scripts build the private library packages and aggregate `dist` before the app resolves `@callieniera/fushi/core` or `@callieniera/fushi/kuromoji`. The root `build` command remains library-only; `build:app` explicitly builds the library first, then validates content and compiles this app. No source alias bypasses that package boundary.

Open the Vite URL printed by `dev:app`. Hash routes require no server rewrite configuration:

- `#/lessons`
- `#/drills`
- `#/sandbox`
- `#/analysis-scope`
- `#/about`

The About page introduces Fushi, links to the GitHub project and analysis-scope explanation, and embeds the complete Apache 2.0 and IPAdic notices from `public/dictionaries/notices/`. The analysis-scope page is also linked from the explorer but is intentionally absent from the main navigation. It explains the automatic word/文節 pipeline and its limits in English and Japanese without loading kuromoji or requesting dictionary files.

## Content

Edit `src/content/curriculum.json` and `src/content/passages/*.json`. `scripts/check-content.ts` validates modern-only content before every production build. Source offsets are JavaScript UTF-16 offsets, surfaces must match their spans, and every authored title, explanation, and prompt provides English and Japanese text.

The split lesson and sandbox sample button share 13 eligible passages. Selection avoids an immediate repeat whenever alternatives exist; both split stages retain the selected sentence. Accepted boundaries derive directly from the passage's curated word/phrase spans, and localized split explanations live with each passage. Sentence components, `連文節`, and other exercise answers remain separately curated metadata.

The sandbox's full automatic scope is 単語・品詞・活用・文節. It displays annotated words and phrase segments, selectable word details, and word-level diagnostics. It does not generate sentence components, dependencies, clauses, sentence types, or automatic `連文節`. Known diagnostic codes have bilingual learner-facing explanations; unknown codes use a generic fallback rather than exposing internal messages. Curated sentence-grammar lessons and their authored answers remain independent of live parsing.

The former experimental sentence-analysis UI is preserved as reference-only source under `experimental/sentence-analysis/apps/learning/`, alongside the archived core analyzer. It has no production imports, independent build/test setup, or default test discovery.

The top-right language button persists its choice in local progress and translates the complete authored app. Theme colors follow the operating system's light/dark preference automatically; no manual theme preference is stored.

The initial educational examples are original and marked CC0-1.0 in their provenance records. Retain source and license fields when replacing them, and do not copy textbook exercises wholesale.

## Dictionary assets

`dictionary.json` is the single version source. The build copies all required kuromoji IPAdic files from the installed dependency into:

```text
public/dictionaries/kuromoji/<version>/
```

The same version is used in `/dictionaries/kuromoji/<version>/` and the `fushi-ipadic-<version>` Cache API name. To update dictionary bytes, choose a new version rather than replacing an immutable deployed version. Generated dictionary copies are ignored in source control.

Serve `.dat.gz` as raw gzip bytes with `Content-Type: application/gzip` and **without** `Content-Encoding: gzip`. The app relies on browser `DecompressionStream('gzip')`. `public/_headers` configures immutable caching for versioned files and revalidation for HTML. The copy script also distributes kuromoji's Apache license and its upstream IPAdic NOTICE under `dictionaries/notices/`.

The sandbox is loaded only after the user requests analysis. Curated routes neither download the dictionary nor include kuromoji in their initial dependency graph. There is intentionally no service worker in this release.

## Verify

From the repository root:

```bash
npx --yes pnpm@10.28.2 typecheck
npx --yes pnpm@10.28.2 test
npx --yes pnpm@10.28.2 test:app:unit
npx --yes pnpm@10.28.2 exec playwright install chromium
npx --yes pnpm@10.28.2 test:browser
npx --yes pnpm@10.28.2 test:app:e2e
```

`test:browser` retains the Phase 1 package fixture on port 4173. The app E2E suite builds the production app and uses a separate raw-gzip static preview on port 4174; it does not use Vite's development transform pipeline.

The app unit/content suite covers routing, content validation, exercise logic, and sandbox engine lifecycle. The production browser suite covers real-dictionary word/文節 output, word details and diagnostics, localization, retry and clearing, curated lessons, and the bilingual analysis-scope page. The full app browser run retains one unrelated pre-existing About-page failure: it expects a `Fushi on GitHub (not yet public)` link that the current About view does not render.

To inspect the production output manually:

```bash
npx --yes pnpm@10.28.2 preview:app
```

## Cloudflare Pages

`wrangler.jsonc` defines the `fushi-learning` project and a static `dist` output directory. It has no Pages Functions, Workers bindings, account identifiers, or secrets.

For interactive deployment, authenticate with `wrangler login`. CI can use its normal protected Cloudflare credentials. Never commit tokens, `.wrangler`, deployment logs, generated dictionaries, or `dist`.

Configure Cloudflare Pages with:

- **Root directory:** repository root.
- **Build command:** `npx --yes pnpm@10.28.2 build:app`
- **Build output directory:** `apps/learning/dist`
- **Package manager:** pnpm 10.28.2, from the root `packageManager` field.
- **Node:** a current release supported by Vite 7 and Wrangler 4; use the same pinned major version in CI and the Pages environment.

Deploy explicitly after preview verification:

```bash
npx --yes pnpm@10.28.2 deploy:app
```

Before production release, test a Pages preview for every hash route, JavaScript/CSS assets, curated content, all 12 versioned dictionary files, and the Modern Japanese sandbox. Confirm raw-gzip response bytes and headers, immutable versioned caching, HTML revalidation, cold/warm Cache API loading, no console/CORS failures, and continued curated-lesson access when dictionary requests fail. Local verification cannot substitute for that hosted preview check.

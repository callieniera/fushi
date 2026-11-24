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
- `#/about`

The About page introduces Fushi, links to the GitHub project, and embeds the complete Apache 2.0 and IPAdic notices from `public/dictionaries/notices/`.

## Content

Edit `src/content/curriculum.json` and `src/content/passages/*.json`. `scripts/check-content.ts` validates modern-only content before every production build. Source offsets are JavaScript UTF-16 offsets, surfaces must match their spans, and every authored title, explanation, and prompt provides English and Japanese text.

The split lesson and sandbox sample button share 13 eligible passages. Selection avoids an immediate repeat whenever alternatives exist; both split stages retain the selected sentence. Accepted boundaries derive directly from the passage's curated word/phrase spans, and localized split explanations live with each passage. Sentence components, `連文節`, and other exercise answers remain separately curated metadata. Modern sandbox sentence components and dependency labels are best-effort display data, not authoritative answer keys.

The sandbox presents 単語・文節 as its primary result. Its collapsed `試験的な文解析` area is divided into 文の成分, 文節の係り受け, and 単文・複文・重文; the latter two display bilingual low-accuracy badges. Sentence components, explicit subsidiary-verb `連文節`, resolved phrase relationships, clause groups, and supported sentence types appear for selected patterns. Unresolved components are explicitly marked `Not determined` / `未確定`; this does not imply ungrammatical input. Recognizable modifiers retain their component and subtype even when their dependency target is unresolved. Word/文節 diagnostics remain in the primary review area, while sentence-level diagnostics stay with the experimental analysis. Known diagnostic codes have bilingual learner-facing explanations, including a non-error explanation for omitted subjects; unknown codes use a generic fallback rather than exposing internal messages. Curated lesson answers remain independent of this experimental output.

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

The current implementation passes 19 app unit/content tests and all 6 sandbox browser tests, including bilingual subsidiary-predicate grouping and the collapsed experimental view. The core/kuromoji suites and package browser tests also pass. The full app browser run retains one unrelated pre-existing About-page failure: it expects a `Fushi on GitHub (not yet public)` link that the current About view does not render.

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

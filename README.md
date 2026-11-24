# Fushi

Fushi is a client-side TypeScript library for Japanese **school grammar（学校文法）**. It normalizes modern Japanese **morphemes（形態素）** into grammar-aware words and **phrase segments（文節）**, and validates manually authored Classical Japanese annotations.

[Verified test results](./TEST_RESULTS.md)

## Development status

The first two areas are maintained foundations. The remaining three areas are sequential improvement phases: 文の成分 is completed, 文節の係り受け is next, and 単文・複文・重文 is planned.

| School-grammar area | Status | Current scope |
| --- | --- | --- |
| **単語・品詞・活用形** (words, parts of speech, and conjugated forms) | **Maintained** | Supports 10品詞, six modern 活用形, normalization/remapping, and contextual distinctions. Kuromoji/IPAdic and heuristic ambiguity limitations remain. |
| **文節の識別** (phrase-segment identification) | **Maintained** | Supports independent-word grouping and subsidiary-verb 文節 boundaries; this is not a claim of exhaustive tokenization accuracy. |
| **文の成分** (sentence components) | **Completed** | Local 修飾語 component and 連体／連用 subtype labels remain available when targets are unresolved; no dependency target is guessed. |
| **文節の係り受け** (phrase-segment dependencies) | **Next** | Planned work includes broader target resolution, topic-versus-subject interpretation, も, and omitted/shared subjects. |
| **単文・複文・重文** (simple, complex, and compound sentences) | **Planned** | Planned work includes broader sentence-type and clause recognition. |

These statuses do not imply exhaustive grammatical coverage. Existing modern sentence analysis remains best-effort and experimental.

## Grammar terminology

English grammar terms below are paired with their Japanese equivalents. Code identifiers and literal output values retain their original API spelling.

- **Morpheme（形態素）**: The smallest meaningful unit found by a morphological analyzer. For example, `私は本を読む` is split into `私`, `は`, `本`, `を`, and `読む`.
- **Word（単語, `Tango`）**: A school-grammar word produced by Fushi. It can combine several morphemes when they function as one grammatical unit.
- **Phrase segment（文節, `Bunsetsu`）**: A natural sentence chunk consisting of a **main word（自立語）**, such as a noun or verb, and any **supporting words（付属語）**, such as particles or auxiliary verbs, that follow it. For example, `私は本を読む` becomes `私は｜本を｜読む`.
- **Sentence component（文の成分）**: The grammatical role of a phrase segment or combined phrase segment. A **subject（主語）** identifies who or what is being described; a **predicate（述語）** describes an action, state, or property; a **modifier（修飾語）** adds detail to another expression; a **connective（接続語）** links preceding context to following context; and an **independent component（独立語）**, such as a greeting or address, stands apart from the other components. Modifiers can be further described as **adnominal modifiers（連体修飾語）** or **adverbial modifiers（連用修飾語）**. An adverbial modifier describes a predicate; that predicate may be a verb, an adjective, or an adjectival noun. School grammar does not add a separate object（目的語） constituent for `〜を`.
- **Dependency（係り受け）**: A grammatical relationship in which one word or phrase segment modifies or relates to another.
- **Combined phrase segment（連文節）**: Adjacent phrase segments functioning as one constituent. Fushi experimentally recognizes the **subsidiary relation（補助の関係）** in `[verb + て/で] + [subsidiary verb（補助動詞）]`, such as `降って＋いるので` and `持って＋行きましょう`.
- **Clause（節）**: A part of a sentence with its own subject-predicate structure. A **complex sentence（複文）** contains a **main clause（主節）** and a subordinate clause, while a **compound sentence（重文）** joins clauses of equal grammatical status.
- **Connective clause（接続節）**: A clause ending in a conjunctive particle and connecting to a following clause. A **relative clause（連体修飾節）** instead modifies a following noun. A **coordinate clause（並立節）** is joined to another clause in parallel. The broader school-grammar taxonomy also includes **subject clauses（主語節）**, **predicate clauses（述語節）**, and **adverbial modifier clauses（連用修飾節）**, but Fushi does not claim general recognition of those types.
- **Conjugation（活用）**: A change in a word's form that expresses its grammatical function. The **continuative form（連用形）** connects to a following word, as `読み` does in `読みます`; the **attributive form（連体形）** can modify a noun, as `読む` does in `読む本`; and the **realis form（已然形）** is a Classical Japanese form used before particles such as `ば` and required after the binding particle `こそ`.
- **Kakari-musubi（係り結び）**: A Classical Japanese agreement rule in which a binding particle, such as `ぞ` or `こそ`, determines the conjugated form of the predicate.
- **Classical conjugation patterns（古典の活用型）**: The supported adjective patterns are **ku conjugation（ク活用）** and **shiku conjugation（シク活用）**. The supported adjectival-noun patterns are **nari conjugation（ナリ活用）** and **tari conjugation（タリ活用）**. These names distinguish the different sets of word endings.

## Relationship to kuromoji.js

**In short: kuromoji.js performs morphological analysis（形態素解析）—splitting text into its smallest meaningful units—and Fushi adds a Japanese school grammar（学校文法） layer on top of it.**

| Aspect | kuromoji.js | Fushi |
| --- | --- | --- |
| Primary purpose | Japanese tokenization and **morphological analysis（形態素解析）** | Interpretation for Japanese **school grammar（学校文法）** |
| Typical output | **Morphemes（形態素）** with IPAdic features such as part of speech, base form, and conjugation | Grammar-aware **words（単語, `Tango`）**, grouped **phrase segments（文節, `Bunsetsu`）**, source offsets, and structured diagnostics |
| Analysis scope | Modern Japanese morphological analysis | Modern grammar transformation plus Classical Japanese annotation validation |
| Dictionary | Uses IPAdic dictionary data | Uses kuromoji's IPAdic output; does not provide a different segmentation dictionary |
| Extensibility | General-purpose tokenizer | Core can accept morphemes from another analyzer |

The modern processing flow is:

**Text → kuromoji.js/IPAdic → `RawMorpheme[]` → Fushi normalization and conjugation mapping → `Tango` → `Bunsetsu` → best-effort sentence components（文の成分） and basic dependencies（係り受け）**

For example, kuromoji identifies **morphemes（形態素）** such as `私`, `は`, `本`, `を`, and `読む`. Fushi then interprets their grammatical roles and can group them into **phrase segments（文節）** such as `私は`, `本を`, and `読む`.

**TL;DR:** Fushi starts each **phrase segment（文節）** at a main word and attaches the supporting words that follow it. For example, `私は本を読む` becomes `私は｜本を｜読む`. See [How Fushi Creates Bunsetsu](./BUNSETSU.md) for an explanation with zero programming knowledge required.

Fushi adds functionality beyond kuromoji.js:

- Token merging and school-grammar **conjugation（活用）** remapping.
- **Phrase segment（文節）** construction.
- Experimental modern **sentence component（文の成分）** labels—**subject（主語）**, **predicate（述語）**, **modifier（修飾語）**, **connective（接続語）**, and **independent component（独立語）**—plus basic **dependency（係り受け）** relationship IDs.
- Conservative discovery of **complex sentences（複文）**, containing **connective clauses（接続節）** or **relative clauses（連体修飾節）**, and **compound sentences（重文）**, containing **coordinate clauses（並立節）**, with clause-scoped component links.
- Experimental **combined phrase segments（連文節）** for explicit subsidiary-verb relations, predicate-member IDs, modifier detail, and supported **sentence types（単文・重文・複文）**.
- Preservation of original **morphemes（形態素）** and source offsets.
- Best-effort handling with structured warnings for unsupported mappings.
- Classical Japanese schema, **conjugation（活用）**, source-span, and **kakari-musubi（係り結び）** validation.
- Browser dictionary downloading with Cache API support and network fallback.

The architecture keeps these responsibilities separate:

- The [core module](./packages/core/src/modern/pipeline.ts) is dependency-free and performs the grammar transformations.
- The [kuromoji engine module](./packages/engine-kuromoji/src/engine.ts) connects kuromoji.js to that core.
- [`packages/engine-kuromoji/package.json`](./packages/engine-kuromoji/package.json) declares the actual `kuromoji` dependency.

Both modules are combined into the single published `@callieniera/fushi` package. They remain separate in the repository only to keep their responsibilities clear.

Consequently, **Fushi inherits kuromoji's segmentation and disambiguation limitations**. Incorrect tokenization or ambiguous IPAdic analysis can affect Fushi's grammar output. Its modern parsing is therefore documented as best effort, while Classical Japanese currently relies on manually authored annotations rather than automatic kuromoji analysis.

## Features

- Modern Japanese token normalization, **conjugation（活用）** mapping, and **phrase segment（文節）** grouping.
- Best-effort modern **sentence component（文の成分）** labels, clause-scoped **dependency（係り受け）** links, and optional **complex sentence（複文）** and **compound sentence（重文）** metadata.
- Source offsets and original **morphemes（形態素）** preserved through token merges.
- Best-effort parsing with structured diagnostics for unsupported or malformed input.
- Classical Japanese schema, **conjugation（活用）**, source-span, and **kakari-musubi（係り結び）** validation.
- Browser dictionary loading through the Cache API, with network fallback.

## Package

`@callieniera/fushi` exports the dependency-free grammar schema, modern transformation pipeline, Classical Japanese authoring/validation, and kuromoji integration. Import everything from this one package:

```typescript
import {
  createKuromojiEngine,
  parseModernMorphemes,
  validateClassicalPassage,
} from '@callieniera/fushi';
```

The internal `@lib/core` and `@lib/engine-kuromoji` workspace packages are private development modules and are not published separately.

## Installation

Install `@callieniera/fushi` from npm. No custom registry configuration is required:

```bash
npm install @callieniera/fushi
```

## Development

Use the package-manager version declared in `package.json`:

```bash
npx --yes pnpm@10.28.2 install
npx --yes pnpm@10.28.2 build
npx --yes pnpm@10.28.2 typecheck
npx --yes pnpm@10.28.2 test
```

After the unit tests and build pass, run the real Chromium integration tests:

```bash
npx --yes pnpm@10.28.2 exec playwright install chromium
npx --yes pnpm@10.28.2 test:browser
```

## Modern Japanese in the Browser

Host kuromoji's IPAdic `.dat.gz` files on a CDN or static server and provide the directory URL. Dictionary assets are deliberately excluded from both packages. Serve the assets as raw gzip bytes (`Content-Type: application/gzip`) without `Content-Encoding: gzip`; the engine decompresses them after downloading.

```typescript
import { createKuromojiEngine } from '@callieniera/fushi';

const engine = await createKuromojiEngine({
  dictUrl: '/dictionaries/kuromoji/',
  cacheName: 'fushi-ipadic-v1',
});

const result = await engine.parseModern('私は本を読む');
console.log(result.bunsetsu);
console.log(result.diagnostics);
```

The engine uses the browser Cache API for successful dictionary downloads. If that API is unavailable or fails, initialization falls back to normal network requests. Change `cacheName` or the dictionary URL when deploying a new dictionary version.

Modern parsing is best effort. Unsupported or ambiguous IPAdic mappings produce structured diagnostics while preserving the affected source morphemes. Applications should display or log warnings rather than treating every result as authoritative.

## Core-Only Modern Parsing

Applications with an existing morphological analyzer can supply `RawMorpheme[]` directly without loading kuromoji:

```typescript
import { parseModernMorphemes, type RawMorpheme } from '@callieniera/fushi';

const morphemes: RawMorpheme[] = [
  {
    surface: '読む',
    baseForm: '読む',
    reading: 'ヨム',
    pos: '動詞',
    posDetail1: '自立',
    conjugationType: '五段・マ行',
    conjugatedForm: '基本形',
    start: 0,
    end: 2,
  },
];

const result = parseModernMorphemes(morphemes);
console.log(result.bunsetsu[0]?.sentenceComponent); // 述語
```

For a full sentence such as `私は本を読む`, `私は` is the **subject（主語）**, `本を` is a **modifier（修飾語）**, and `読む` is the **predicate（述語）**. Their `sentenceComponent` fields contain the respective literal values `'主語'`, `'修飾語'`, and `'述語'`. `sentenceRelations` links each **phrase segment（文節）** to target IDs:

```typescript
// 私は → 読む
{ kind: '主語', targetBunsetsuId: 'modern-bunsetsu-2' }

// 本を → 読む
{ kind: '修飾先', targetBunsetsuId: 'modern-bunsetsu-2' }

// 読む → 私は and 本を
{ kind: '述語', targetBunsetsuId: 'modern-bunsetsu-0' }
{ kind: '修飾語', targetBunsetsuId: 'modern-bunsetsu-1' }
```

These are basic **dependency（係り受け）** links, not full dependency parsing. kuromoji/IPAdic does not provide dependencies between **phrase segments（文節）**. Explicit `が`/`は` subjects, local noun modifiers, and clear adverbial modifiers are handled conservatively. Omitted subjects and unclear clause boundaries are not guessed. Standalone temporal nouns marked `副詞可能` and a verbal 連用形 followed by `に` and a supported motion predicate (`行く`, `来る`, or `帰る`) are also recognized as adverbial modifiers. The purpose expression is not treated as a competing final predicate. A recognizable modifier retains its `sentenceComponent: '修飾語'` and `modifierKind` even when its target is ambiguous; in that case the relationship is absent and `MODERN_COMPONENT_MODIFIER_UNRESOLVED` is added to `diagnostics`. Applications must not treat an absent label or relationship as a negative grammatical assertion.

### Complex sentences（複文） and compound sentences（重文）

For supported multi-clause structures, `ParseResult.clauses` and `SentenceComponentResult.clauses` contain `ModernClause[]`. Single-clause results do not add `clauses` or `clauseId` fields. The analyzer recognizes:

- **Connective clauses（接続節）**, which connect to a following clause and end in **conjunctive particles（接続助詞）** such as `ので`, `から`, `のに`, and `ながら`.
- **Relative clauses（連体修飾節）**, which modify a following noun and end in a predicate in the **attributive form（連体形）** before an explicit noun called the head.
- **Coordinate clauses（並立節）**, which are joined in parallel and end in forms such as `て`/`で`, `が`, `けれど`, and `けれども`, excluding helper predicates such as `読んでいる`.

Each **clause（節）** has a deterministic `id`, `kind`, ordered `bunsetsuIds`, final predicate-head `predicateBunsetsuId`, and source `start`/`end`. A multi-文節 predicate additionally has ordered `predicateBunsetsuIds`. Optional `relations` point from the dependent/earlier clause to a governing/later clause using the literal values `主節`, `修飾先`, or `並立`. A relative-clause predicate also receives the phrase-segment-level **modification target（修飾先）** relation to the noun it modifies.

`Bunsetsu.clauseId` associates each **phrase segment（文節）** with exactly one discovered **clause（節）**. Clause membership is ordered by source position and need not be contiguous: in `私は子どもが読んだ本を買った`, `私は`, `本を`, and `買った` belong to the **main clause（主節）**, while `子どもが` and `読んだ` belong to the **relative clause（連体修飾節）**. The relative clause's `start`/`end` cover only the relative clause itself.

```typescript
// 雨が降ったので、私は家に帰った (punctuation bunsetsu omitted for brevity)
{
  id: 'modern-clause-0',
  kind: '接続節',
  bunsetsuIds: ['modern-bunsetsu-0', 'modern-bunsetsu-1'],
  predicateBunsetsuId: 'modern-bunsetsu-1',
  start: 0,
  end: 7,
  relations: [{ kind: '主節', targetClauseId: 'modern-clause-1' }],
}
```

Subjects and adverbial modifiers are resolved within their clause, so `雨が → 降ったので` and `私は → 帰った` do not compete for the same predicate. Omitted subjects still produce `MODERN_COMPONENT_SUBJECT_UNRESOLVED`; shared subjects are not inferred. Unsupported nested relative structures and incomplete or overlapping clause assignments fall back to conservative unresolved analysis with `MODERN_COMPONENT_CLAUSE_UNRESOLVED`. Sentence types are emitted only for resolved supported structures.

### Experimental subsidiary-verb 連文節

For `雨が降っているので傘を持って行きましょう`, real IPAdic marks `いる` and `行き` as non-independent dictionary verbs. Fushi maps them to independent school-grammar **subsidiary verbs（補助動詞）**, retaining six 文節:

```text
雨が｜降って｜いるので｜傘を｜持って｜行きましょう
```

It then recognizes two `補助の関係` groups in `ParseResult.renbunsetsu`:

- `降って＋いるので` → `降っているので`, `接続語` at sentence level. Its containing `接続節` has `predicateBunsetsuIds: ['modern-bunsetsu-1', 'modern-bunsetsu-2']` and final head `modern-bunsetsu-2`; the clause-internal predicate remains `述語`.
- `持って＋行きましょう` → `持って行きましょう`, the main-clause `述語`, with predicate members `modern-bunsetsu-4` and `modern-bunsetsu-5`.

`傘を` is `修飾語` with `modifierKind: '連用修飾語'`, linked to the final predicate head. The resolved sentence receives `sentenceType: '複文'`; the main clause still receives an omitted-subject diagnostic. `ModernRenbunsetsu` includes deterministic IDs, ordered member IDs, the relation, sentence-level component, and source span.

Only contiguous `[動詞＋て／で]＋[補助動詞]` relations are recognized. Quotation/complement clauses, general 連文節 construction, general 主語節・述語節・連用修飾節 detection, and unrestricted semantic dependency parsing remain unsupported. Lexical versus subsidiary meaning and non-local modifier targets can remain ambiguous. The browser sandbox therefore presents 文節・単語 first and places this sentence-level analysis in a collapsed experimental section.

Each normalized **word（単語, `Tango`）** retains its source `rawMorphemes`, and all tokens and **phrase segments（文節）** retain source offsets. `analyzeModernSentenceComponents` is also exported for applications that already have modern `Bunsetsu[]`; it does not mutate its input or existing relation arrays.

## Classical Japanese

Classical Japanese uses manually annotated JSON. The validator checks the schema, **conjugation（活用）**, **phrase segment（文節）** structure, source spans, unique identifiers, and declared **kakari-musubi（係り結び）** relationships.

```typescript
import { validateClassicalPassage, buildClassicalPassage } from '@callieniera/fushi';

const validation = validateClassicalPassage(passage);
if (!validation.valid) {
  console.error(validation.diagnostics);
}

// Throws ClassicalPassageValidationError for invalid input.
const result = buildClassicalPassage(passage);
```

A passage contains `text` and ordered `bunsetsu`; each **phrase segment（文節）** contains ordered **words（単語, `tango`）**. Tokens use stable unique IDs and source offsets. Classical **conjugation（活用）** supports the **realis form（已然形）**, the nine classical verb types, and the adjective patterns **ku conjugation（ク活用）** and **shiku conjugation（シク活用）**, plus the adjectival-noun patterns **nari conjugation（ナリ活用）** and **tari conjugation（タリ活用）**. Optional metadata includes `historicalKana`, `modernReading`, `meaningTags`, and `kakarimusubi` links.

Declared **kakari-musubi（係り結び）** links are validated as follows:

- `ぞ`, `なむ`, `や`, and `か` link to a predicate in the **attributive form（連体形）**, which can also modify a noun.
- `こそ` links to a predicate in the **realis form（已然形）**, the Classical Japanese form used in this agreement pattern.

## Static learning app

`apps/learning` contains the static Modern Japanese learning app: six bilingual English/Japanese curriculum areas, accessible randomized split practice, identification/component exercises, a conjugation explorer, decision tree, local progress, and a lazy Modern Japanese sandbox. Light and dark themes follow the operating system automatically. The app does not expose the core library's Classical Japanese bridge.

The sandbox loads kuromoji only on demand:

```typescript
const { createKuromojiEngine } = await import('@callieniera/fushi/kuromoji');
```

The core/kuromoji separation keeps kuromoji out of the initial curated-lesson bundle. The explorer displays best-effort sentence components, resolved phrase relationships, and available clause groups below the annotated sentence. Unresolved labels are marked as not determined, and a separate bilingual review panel explains known diagnostics without treating omitted subjects or other unresolved analysis as grammatical errors. Existing consumers can continue using the root `@callieniera/fushi` export and its Classical Japanese APIs.

Build or develop the app from the repository root:

```bash
npx --yes pnpm@10.28.2 build:app
npx --yes pnpm@10.28.2 dev:app
```

See the [learning app guide](./apps/learning/README.md) for content authoring, versioned dictionary deployment, verification, and Cloudflare Pages/Wrangler instructions. Production hosting is not configured or claimed until a preview deployment passes its smoke checks.

## Browser Integration Fixture

`integration-tests/browser` exercises the built packages in Chromium with externally served IPAdic assets. Its `public/dictionaries` directory contains local IPAdic test assets from kuromoji. Applications should host equivalent assets separately and configure `dictUrl`.

## Test Results

See [TEST_RESULTS.md](./TEST_RESULTS.md) for modern Japanese parsing examples, Classical Japanese annotation results, and **kakari-musubi（係り結び）** validation coverage.

## License

Fushi's original source code is licensed under the [MIT License](./LICENSE). This license does not replace the licenses or attribution requirements of third-party software and data.

The production dependency audit identifies kuromoji as Apache-2.0 and its JavaScript runtime dependencies as MIT. The bundled IPAdic dictionary has separate upstream terms. The learning app preserves kuromoji's Apache license and the complete IPAdic notice under [`apps/learning/public/dictionaries/notices/`](./apps/learning/public/dictionaries/notices/). Original educational examples remain CC0-1.0 as declared in their content provenance records.

---
name: resolve-modern-clause-unresolved
description: Diagnose and fix MODERN_COMPONENT_CLAUSE_UNRESOLVED for a Japanese sentence in the Fushi parser. Use when a user supplies a sentence or parse result with this diagnostic, asks why clause discovery failed, or requests a parser fix and regression coverage.
---

# Resolve MODERN_COMPONENT_CLAUSE_UNRESOLVED

Resolve the clause-structure failure without suppressing the diagnostic or weakening the conservative parser.

## Inputs

Obtain the exact sentence and, when available, its complete `ParseResult`. If the user only wants an explanation, diagnose the result without changing files. If the user asks for a fix, follow the full workflow.

## Workflow

1. Read `packages/core/src/modern/sentence-components.ts`, especially `discoverClauses`, `clauseStructureIsComplete`, `predicateFloor`, and `analyzeDiscoveredClauses`.
2. Reproduce with the real kuromoji/IPAdic path when dictionary assets are installed. Use `ipadicToRawMorphemes` followed by `parseModernMorphemes`; do not infer the failure from the surface sentence alone.
3. Record:
   - Ordered bunsetsu surfaces and indexes.
   - Each bunsetsu's head, final conjunctive particle, effective conjugation form, and subject marker.
   - The diagnostic's `start`, `end`, and `tangoIds`.
   - Proposed clause kinds, predicate indexes, member indexes, and modification targets.
4. Identify which guard rejects the proposal:
   - Overlapping relative clauses.
   - A relative head outside every containing non-relative clause.
   - A relative head after the final predicate.
   - Incomplete or duplicate membership reported by `clauseStructureIsComplete`.
5. Explain that the warning location identifies the rejected predicate, not necessarily an ungrammatical bunsetsu. The warning can be a secondary effect of an earlier boundary or membership error.
6. Add a focused regression test to `packages/core/tests/modern/sentence-components.test.ts` using the helpers in `packages/core/tests/modern/fixtures.ts`. Assert the expected clauses, membership, relations, and absence of this diagnostic. Run it before the fix and confirm that it fails for the intended reason.
7. Make the smallest grammar-aware change in `discoverClauses` or its boundary helpers. Preserve explicit-subject precedence, nested-clause exclusions, supplementary-predicate handling, deterministic IDs, and source offsets.
8. Validate the exact sentence again. Every bunsetsu in a discovered multi-clause result must belong to exactly one clause, each clause must contain its predicate, and every relation target must exist.
9. Run the core typecheck, build, and repository library tests. Report any remaining warnings separately; omitted-subject warnings are not clause failures.

## Diagnostic checklist

For each candidate clause, write an index-based outline such as:

```text
0 新しい   adnominal modifier of 1
1 靴を     case-marked noun
2 履いて   predicate; final 接続助詞 て
3 公園へ   case-marked noun
4 出かけた final predicate
```

Then check the proposed partition:

```text
並立節 [0, 1, 2] -> 並立節 [3, 4]
```

Do not assume that contiguous text implies simple clause membership: relative clauses can leave noncontiguous main-clause membership.

## Common causes and safe responses

- **Adnominal modifier left outside a clause:** Move the selected boundary backward across modifiers whose immediate nominal target is already inside the clause. Keep the modifier and its noun in the same clause.
- **Explicit subject selects an inner boundary:** Preserve the existing subject-aware selection. Check whether an outer prefix belongs to the final containing clause rather than moving the subject into an embedded clause.
- **Chained clauses overlap:** Use the preceding accepted boundary as the next clause floor. Do not assign one bunsetsu to multiple clauses merely to make validation pass.
- **Nested or trailing relative clause is unsupported:** Leave the structure unresolved unless the implementation can represent it completely. Do not invent a main clause or relation target.
- **Supplementary predicate after て/で:** Keep constructions such as `読んでいる` out of parallel-clause discovery.
- **Only the warning location looks wrong:** Improve diagnostic targeting only after fixing or confirming the underlying clause proposal. Never delete the warning solely to make a test pass.

## Commands

Run from the repository root using the package-manager version declared in `package.json`:

```bash
npx --yes pnpm@10.28.2 --filter @lib/core exec vitest run tests/modern/sentence-components.test.ts -t "<regression test name>"
npx --yes pnpm@10.28.2 --filter @lib/core typecheck
npx --yes pnpm@10.28.2 --filter @lib/core build
npx --yes pnpm@10.28.2 test
```

This workspace may contain colocated generated `.js` files beside `.ts` sources. If a test result contradicts direct execution of the current TypeScript, verify which module the runner resolves and refresh generated artifacts through the project's TypeScript tooling. Do not hand-edit generated JavaScript or leave temporary compilation output in the repository.

## Completion criteria

- The original failure is reproduced and its rejected clause proposal is explained.
- The regression test fails before the fix and passes afterward.
- The exact sentence no longer emits `MODERN_COMPONENT_CLAUSE_UNRESOLVED` when a complete structure is supported.
- Existing conservative unresolved cases remain unresolved.
- Typecheck, build, and all core/kuromoji tests pass.
- The response summarizes the grammatical clause structure, code change, tests, and any intentional remaining diagnostics.

# Archived experimental sentence analysis

This directory preserves Fushi's former rule-based modern sentence-analysis experiment for future research. It is **reference-only source**, not a supported library feature.

## Archived files

| Archived path | Original path |
| --- | --- |
| `packages/core/src/modern/sentence-components.ts` | `packages/core/src/modern/sentence-components.ts` |
| `packages/core/tests/modern/sentence-components.test.ts` | `packages/core/tests/modern/sentence-components.test.ts` |
| `packages/core/src/sentence-analysis-types.ts` | Snapshot of declarations formerly in `packages/core/src/types.ts`, plus result-shape aliases |
| `apps/learning/src/components/sentence-analysis.ts` | `apps/learning/src/components/sentence-analysis.ts` |
| `apps/learning/src/sentence-analysis.css` | Sentence-analysis declarations removed from `apps/learning/src/styles.css` |
| `apps/learning/src/sentence-analysis-translations.ts` | Experimental-analysis entries removed from `apps/learning/src/i18n.ts` |

The analyzer and test were moved intact, including uncommitted work present when the experiment was archived. The type snapshot is documentary rather than a drop-in replacement for the reduced core types. The learning-app component, styles, and translations preserve the former experimental UI as reference material; they are not imported or built by the app.

## Status and dependencies

- The supported `parseModernMorphemes` pipeline stops after ordinary 文節 formation.
- Nothing in `src`, `packages`, or `apps` should import this archive.
- The archive has no package manifest, independent build, test configuration, or default test discovery.
- The archived analyzer expects the former extended `Bunsetsu` shape and imports `diagnostic`, `Hinshi`, `Tango`, and the sentence-analysis declarations from core types.
- Its focused test also expects the former pipeline behavior and core test fixtures. Restoring it requires restoring those contracts and adapting imports; copying these files back alone is not a supported migration.

## Why it is archived

The experiment assigns sentence components, basic dependencies, clauses, sentence types, and selected subsidiary-verb 連文節 using local rules. Those rules cannot guarantee broadly accurate analysis of omitted/shared subjects, long-distance or nested modification, clause boundaries, quotations/complements, or context-dependent interpretations.

This is a limitation of the rule-only design and its kuromoji/IPAdic input, not a claim that Japanese sentence analysis is impossible. Learned parsing models and evaluated linguistic resources are alternative approaches outside the current library scope.

Any future restoration should be an explicit research project with representative evaluation data and measured accuracy, not a gradual expansion of unsupported exceptions in the word/文節 pipeline.

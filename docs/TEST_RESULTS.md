# Fushi Test Results

This guide shows what Fushi produces for real Japanese sentences and explains the grammar terms along the way.

## How to read these examples

- **Input** is the original Japanese sentence given to Fushi.
- A **phrase segment (文節)** is a small, meaningful section of a sentence. A vertical bar (`|`) shows where one segment ends and the next begins. For example, `私は | 本を | 読む` has three segments.
- A **base form** is the dictionary form of a word, such as `読む`. A **conjugated form (活用形)** is the form used in that particular sentence, such as the continuative form `読み` in `読みます`.
- A **note or warning** means that Fushi could not decide something confidently. It does not mean that the Japanese sentence is incorrect.

The modern Japanese examples use kuromoji with its real IPAdic dictionary to find word pieces. Fushi then organizes those pieces according to Japanese School Grammar (学校文法). Unless an example says otherwise, Fushi reported no notes about punctuation-only segments or unsupported word types.

## 1. Phrase Segment Results (文節)

Fushi starts a new phrase segment at each main word and attaches the supporting words that follow it. Supporting words include particles (助詞), such as `は` and `を`, and auxiliary verbs (助動詞), such as `ない`.

### 1.1 Basic sentence structure

**Input:** `私は本を読む`

**Result:** `私は | 本を | 読む`

| Phrase segment (文節) | Word piece | Word type (品詞) | Conjugation pattern (活用の種類) | Form used here (活用形) |
| --- | --- | --- | --- | --- |
| `私は` | `私` | Noun (名詞); pronoun (代名詞) | — | — |
| `私は` | `は` | Particle (助詞); binding particle (係助詞) | — | — |
| `本を` | `本` | Noun (名詞) | — | — |
| `本を` | `を` | Particle (助詞); case-marking particle (格助詞) | — | — |
| `読む` | `読む` | Verb (動詞) | Five-grade (五段) | Sentence-ending form (終止形) |

### 1.2 Prefixes, suffixes, and a supporting verb

**Input:** `子どもたちがお菓子を食べている`

**Result:** `子どもたちが | お菓子を | 食べて | いる`

| Phrase segment (文節) | Word pieces | What Fushi found |
| --- | --- | --- |
| `子どもたちが` | `子どもたち` + `が` | `子ども` and the suffix (接尾辞) `たち` become one noun |
| `お菓子を` | `お菓子` + `を` | The prefix (接頭辞) `お` and `菓子` become one noun |
| `食べて` | `食べ` + `て` | A lower-monograde verb (下一段動詞) in the continuative form (連用形), followed by the connecting particle (接続助詞) `て` |
| `いる` | `いる` | A supplementary verb (補助動詞) of the upper-monograde type (上一段), in the sentence-ending form (終止形); it forms its own segment |

### 1.3 A longer sentence with a polite supporting verb

**Input:** `私は毎朝学校へ歩いて行きます`

**Result:** `私は | 毎朝 | 学校へ | 歩いて | 行きます`

| Phrase segment (文節) | Word pieces | Conjugation (活用) |
| --- | --- | --- |
| `私は` | `私` + `は` | — |
| `毎朝` | `毎朝` | — |
| `学校へ` | `学校` + `へ` | — |
| `歩いて` | `歩い` + `て` | `歩く`: five-grade (五段), continuative form (連用形) |
| `行きます` | `行き` + `ます` | `行く`: five-grade (五段), continuative form (連用形); `ます`: special *masu* type (特殊・マス), sentence-ending form (終止形) |

### 1.4 A past-tense modifier and an adjective

**Input:** `読んだ本はとても面白かった`

**Result:** `読んだ | 本は | とても | 面白かった`

| Phrase segment (文節) | Word pieces | Conjugation (活用) |
| --- | --- | --- |
| `読んだ` | `読ん` + `だ` | `読む`: five-grade (五段), continuative form (連用形); `だ`: special *ta* type (特殊・タ), noun-modifying form (連体形) |
| `本は` | `本` + `は` | — |
| `とても` | `とても` | — |
| `面白かった` | `面白かっ` + `た` | `面白い`: adjective (形容詞), continuative form (連用形); `た`: special *ta* type (特殊・タ), sentence-ending form (終止形) |

### 1.5 An adjectival noun and several auxiliary verbs

**Input:** `静かな公園で友達と話しました`

**Result:** `静かな | 公園で | 友達と | 話しました`

| Phrase segment (文節) | Word pieces | What Fushi found |
| --- | --- | --- |
| `静かな` | `静かな` | One adjectival noun (形容動詞); base form `静かだ`; noun-modifying form (連体形) |
| `公園で` | `公園` + `で` | `で` remains a case-marking particle (格助詞) |
| `友達と` | `友達` + `と` | `と` remains a case-marking particle (格助詞) |
| `話しました` | `話し` + `まし` + `た` | `話す`: five-grade (五段), continuative form (連用形); `ます`: special *masu* type (特殊・マス), continuative form (連用形); `た`: special *ta* type (特殊・タ), sentence-ending form (終止形) |

### 1.6 A negative conditional followed by another negative

**Input:** `行かなければならない`

**Result:** `行かなければ | ならない`

| Phrase segment (文節) | Word pieces | Conjugation (活用) |
| --- | --- | --- |
| `行かなければ` | `行か` + `なけれ` + `ば` | `行く`: five-grade (五段), unrealized form (未然形); `ない`: special *nai* type (特殊・ナイ), conditional form (仮定形) |
| `ならない` | `なら` + `ない` | `なる`: five-grade (五段), unrealized form (未然形); `ない`: special *nai* type (特殊・ナイ), sentence-ending form (終止形) |

### 1.7 Words before nouns, an adjective, and a sound change

**Input:** `この大きな犬は小さい猫と遊んでいる`

**Result:** `この | 大きな | 犬は | 小さい | 猫と | 遊んで | いる`

`この` and `大きな` remain separate segments containing prenominal words (連体詞)—words that come before and describe nouns. `小さい` is an adjective (形容詞) in the noun-modifying form (連体形).

In `遊んで`, the pronunciation changes, but Fushi still connects `遊ん` to the base form `遊ぶ`. It identifies a five-grade conjugation (五段) and the continuative form (連用形). The supplementary verb (補助動詞) `いる` forms a separate segment.

### 1.8 Several actions and “try doing”

**Input:** `新しい辞書を使って古文を読んでみた`

**Result:** `新しい | 辞書を | 使って | 古文を | 読んで | みた`

| Phrase segment (文節) | Word pieces | Conjugation (活用) |
| --- | --- | --- |
| `新しい` | `新しい` | Adjective (形容詞), noun-modifying form (連体形) |
| `使って` | `使っ` + `て` | `使う`: five-grade (五段), continuative form (連用形) |
| `読んで` | `読ん` + `で` | `読む`: five-grade (五段), continuative form (連用形) |
| `みた` | `み` + `た` | Supplementary verb (補助動詞) `みる`: lower monograde (下一段), continuative form (連用形); `た`: special *ta* type (特殊・タ), sentence-ending form (終止形) |

### 1.9 An irregular verb and a helper showing likelihood

**Input:** `彼は明日来るだろう`

**Result:** `彼は | 明日 | 来るだろう`

| Word piece | Word type (品詞) | Base form | Conjugation pattern (活用の種類) | Form used here (活用形) |
| --- | --- | --- | --- | --- |
| `来る` | Verb (動詞) | 来る | *K*-irregular (カ変) | Sentence-ending form (終止形) |
| `だろ` | Auxiliary verb (助動詞) showing assertion (断定) | だ | Special *da* type (特殊・ダ) | Unrealized form (未然形) |
| `う` | Auxiliary verb (助動詞) | う | Other type (その他) | Sentence-ending form (終止形) |

### 1.10 An adjective, a noun stand-in, and a request

**Input:** `赤いのを選んでください`

**Result:** `赤い | のを | 選んで | ください`

`赤い` is an adjective (形容詞) in the noun-modifying form (連体形). `の` remains a nominalizing noun (形式名詞): here it stands for the thing being chosen. `を` remains a case-marking particle (格助詞).

`選ん` maps to the base form `選ぶ`, with five-grade conjugation (五段) and the continuative form (連用形). `ください` is a supplementary verb (補助動詞) from `くださる`, in the imperative form (命令形) used for requests or commands.

### 1.11 A separate segment for a supporting adjective

**Input:** `高くない山に登る`

**Result:** `高く | ない | 山に | 登る`

| Phrase segment (文節) | Word pieces | Conjugation (活用) |
| --- | --- | --- |
| `高く` | `高く` | `高い`: adjective (形容詞), continuative form (連用形) |
| `ない` | `ない` | Supplementary adjective (補助形容詞), noun-modifying form (連体形) |
| `山に` | `山` + `に` | — |
| `登る` | `登る` | Five-grade (五段), sentence-ending form (終止形) |

### 1.12 Appearance: `そうだ` meaning “looks like”

**Input:** `雨が降りそうだ`

**Result:** `雨が | 降りそうだ`

`降り` is an upper-monograde verb (上一段動詞) in the continuative form (連用形). Fushi treats `そうだ` as one dependent auxiliary verb (助動詞). Its category is **appearance (様態)**, and its form is the sentence-ending form (終止形).

### 1.13 Hearsay: `そうだ` meaning “I hear that”

**Input:** `雨が降るそうだ`

**Result:** `雨が | 降るそうだ`

`降る` is a five-grade verb (五段動詞) in the noun-modifying form (連体形). This time, Fushi classifies the same visible words `そうだ` as **hearsay (伝聞)**. The surrounding sentence therefore changes the interpretation.

## 2. Scope and diagnostics

The supported modern pipeline stops after ordinary 文節 formation. It does not generate sentence components（文の成分）, dependency targets（係り受け）, clauses（節）, sentence types（単文・複文・重文）, or 連文節 groups.

For example, `雨が降っているので傘を持って行きましょう` produces six ordinary 文節:

> `雨が | 降って | いるので | 傘を | 持って | 行きましょう`

The real-IPAdic regression checks that `いる` and `行き` remain independent school-grammar subsidiary verbs（補助動詞） in their own 文節. It also checks word surfaces, base forms, POS, conjugation, source offsets, and the absence of sentence-level diagnostics. A multi-clause example retains punctuation as its own 文節 and reports the existing `MODERN_POS_UNSUPPORTED` warning for that punctuation.

The former sentence analyzer and its focused tests are preserved under [`experimental/sentence-analysis`](./experimental/sentence-analysis/) as reference-only source. They are not supported exports and are not included in default test discovery.

**Verified library run:** 207 core tests and 24 kuromoji-engine tests passed with Vitest 4.1.12 on November 24, 2026. The library build, core/engine/browser typechecks, and both Chromium package integration tests also passed. Learning-app migration and validation are tracked separately.

## 3. Conjugation Results (活用)

Conjugation means that a word changes its ending to suit its job in a sentence. The tables below focus on the changing word piece while keeping the phrase-segment boundaries visible.

The common forms are:

| Form | Plain-English purpose |
| --- | --- |
| Unrealized form (未然形) | Used before helpers expressing ideas such as negation, intention, or conjecture |
| Continuative form (連用形) | Connects to another word or auxiliary verb |
| Sentence-ending form (終止形) | Ends a predicate |
| Noun-modifying form (連体形) | Comes before and describes a noun |
| Conditional form (仮定形) | Expresses a condition, often with `ば` |
| Imperative form (命令形) | Gives a command |

### 3.1 Six forms of the five-grade verb (五段動詞) `読む`

| Input | Phrase-segment result (文節) | Verb piece checked | Base form | Form used here (活用形) | Related helper |
| --- | --- | --- | --- | --- | --- |
| `本を読まない` | `本を \| 読まない` | `読ま` | 読む | Unrealized form (未然形) | `ない`: sentence-ending form (終止形) |
| `本を読みます` | `本を \| 読みます` | `読み` | 読む | Continuative form (連用形) | `ます`: sentence-ending form (終止形) |
| `本を読む` | `本を \| 読む` | `読む` | 読む | Sentence-ending form (終止形) | — |
| `本を読む人` | `本を \| 読む \| 人` | `読む` | 読む | Noun-modifying form (連体形) | — |
| `本を読めばわかる` | `本を \| 読めば \| わかる` | `読め` | 読む | Conditional form (仮定形) | `ば`: connecting particle (接続助詞) |
| `ここで本を読め` | `ここで \| 本を \| 読め` | `読め` | 読む | Imperative form (命令形) | — |

All six verb pieces have **five-grade conjugation (五段)**.

### 3.2 Irregular and monograde verbs (変格・一段動詞)

| Input | Phrase-segment result (文節) | Verb piece checked | Base form | Conjugation pattern (活用の種類) | Form used here (活用形) |
| --- | --- | --- | --- | --- | --- |
| `本を見る` | `本を \| 見る` | `見る` | 見る | Upper monograde (上一段) | Sentence-ending form (終止形) |
| `ここで本を見ろ` | `ここで \| 本を \| 見ろ` | `見ろ` | 見る | Upper monograde (上一段) | Imperative form (命令形) |
| `ご飯を食べる` | `ご飯を \| 食べる` | `食べる` | 食べる | Lower monograde (下一段) | Sentence-ending form (終止形) |
| `すぐに食べろ` | `すぐに \| 食べろ` | `食べろ` | 食べる | Lower monograde (下一段) | Imperative form (命令形) |
| `毎日勉強する` | `毎日 \| 勉強 \| する` | `する` | する | *S*-irregular (サ変) | Sentence-ending form (終止形) |
| `勉強すれば上達する` | `勉強 \| すれば \| 上達 \| する` | `すれ` | する | *S*-irregular (サ変) | Conditional form (仮定形) |
| `明日ここへ来る` | `明日 \| ここへ \| 来る` | `来る` | 来る | *K*-irregular (カ変) | Sentence-ending form (終止形) |
| `明日ここへ来い` | `明日 \| ここへ \| 来い` | `来い` | 来る | *K*-irregular (カ変) | Imperative form (命令形) |

### 3.3 Adjectives (形容詞)

| Input | Phrase-segment result (文節) | Adjective piece checked | Base form | Form used here (活用形) |
| --- | --- | --- | --- | --- |
| `高い山` | `高い \| 山` | `高い` | 高い | Noun-modifying form (連体形) |
| `山が高かった` | `山が \| 高かった` | `高かっ` | 高い | Continuative form (連用形) |
| `山が高ければ登らない` | `山が \| 高ければ \| 登らない` | `高けれ` | 高い | Conditional form (仮定形) |
| `高くない山に登る` | `高く \| ない \| 山に \| 登る` | `高く` | 高い | Continuative form (連用形) |

All four pieces belong to the **adjective (形容詞)** conjugation type.

### 3.4 Adjectival nouns (形容動詞)

| Input | Phrase-segment result (文節) | Combined word | Base form | Form used here (活用形) |
| --- | --- | --- | --- | --- |
| `静かな町` | `静かな \| 町` | `静かな` | 静かだ | Noun-modifying form (連体形) |
| `町は静かだ` | `町は \| 静かだ` | `静かだ` | 静かだ | Sentence-ending form (終止形) |
| `静かに歩く` | `静かに \| 歩く` | `静かに` | 静かだ | Continuative form (連用形) |

In each case, Fushi combines the descriptive stem and its ending into one adjectival noun (形容動詞).

### 3.5 Auxiliary verbs in context (助動詞)

| Input | Phrase-segment result (文節) | Helper checked | Base form | Conjugation pattern (活用の種類) | Form used here (活用形) |
| --- | --- | --- | --- | --- | --- |
| `本を読みました` | `本を \| 読みました` | `まし` | ます | Special *masu* type (特殊・マス) | Continuative form (連用形) |
| `本を読みたい` | `本を \| 読みたい` | `たい` | たい | Special *tai* type (特殊・タイ) | Sentence-ending form (終止形) |
| `本を読もう` | `本を \| 読もう` | `う` | う | Other type (その他) | Sentence-ending form (終止形) |
| `本を読まない` | `本を \| 読まない` | `ない` | ない | Special *nai* type (特殊・ナイ) | Sentence-ending form (終止形) |
| `行かなければならない` | `行かなければ \| ならない` | `なけれ` | ない | Special *nai* type (特殊・ナイ) | Conditional form (仮定形) |
| `本を読んだ` | `本を \| 読んだ` | `だ` | だ | Special *ta* type (特殊・タ) | Sentence-ending form (終止形) |

These results preserve both the text that appeared in the sentence and each word's base form. They add School Grammar (学校文法) conjugation information and phrase-segment boundaries.

## 4. Classical Japanese Results (古典)

For Classical Japanese, Fushi checks annotations that people have prepared in advance. It does **not** use kuromoji to split or analyze Classical Japanese automatically. Every passage below is a practice example inspired by public-domain classical writing. Fushi accepts it as Classical Japanese with no warnings.

### 4.1 Checked passages

| Input | Phrase-segment result (文節) | Grammatical information checked |
| --- | --- | --- |
| `月をぞ見る` | `月をぞ \| 見る` | `見る`: verb (動詞), upper monograde (上一段), noun-modifying form (連体形); `ぞ` has a particle–predicate agreement link (係り結び) to `見る` |
| `春はあけぼの` | `春は \| あけぼの` | `あけぼの`: noun (名詞); both the historical kana spelling and modern reading are `あけぼの` |
| `心こそ変はれ` | `心こそ \| 変はれ` | `変はれ`: base form `変はる`; four-grade (四段), realis form (已然形); historical kana `かはれ`; modern reading `かわれ`; `こそ` links to `変はれ` |
| `花は移りぬ` | `花は \| 移りぬ` | `移り`: base form `移る`; four-grade (四段), continuative form (連用形); `ぬ`: auxiliary verb (助動詞), *n*-irregular (ナ変), sentence-ending form (終止形), with the meaning “completion” (完了) |
| `声はなり` | `声は \| なり` | `なり`: auxiliary verb (助動詞), *nari* conjugation (ナリ活用), sentence-ending form (終止形), with the meanings “assertion” (断定) and “hearsay or conjecture” (伝聞・推定) |

The checks also confirm that the saved word pieces recreate each original input exactly. Classical Japanese and modern Japanese results use the same result structure.

### 4.2 Particle–predicate agreement (係り結び)

Certain Classical Japanese binding particles (係助詞) require the predicate to use a particular form. Fushi checks that the particle and predicate match.

| Binding particle (係助詞) | Required predicate form | Accepted predicate | Rejected predicate | Error reference for the rejected form |
| --- | --- | --- | --- | --- |
| `ぞ` | Noun-modifying form (連体形) | `見る` | `見れ` — realis form (已然形) | `classical.kakarimusubi-form` |
| `なむ` | Noun-modifying form (連体形) | `見る` | `見れ` — realis form (已然形) | `classical.kakarimusubi-form` |
| `や` | Noun-modifying form (連体形) | `見る` | `見れ` — realis form (已然形) | `classical.kakarimusubi-form` |
| `か` | Noun-modifying form (連体形) | `見る` | `見れ` — realis form (已然形) | `classical.kakarimusubi-form` |
| `こそ` | Realis form (已然形) | `見れ` | `見る` — noun-modifying form (連体形) | `classical.kakarimusubi-form` |

### 4.3 Conjugation and error-checking coverage

Fushi accepted all six Classical Japanese forms—unrealized (未然形), continuative (連用形), sentence-ending (終止形), noun-modifying (連体形), realis (已然形), and imperative (命令形)—for every supported conjugation pattern:

- Four-grade (四段), upper bigrade (上二段), lower bigrade (下二段), upper monograde (上一段), and lower monograde (下一段).
- *K*-irregular (カ変), *s*-irregular (サ変), *n*-irregular (ナ変), and *r*-irregular (ラ変).
- *Ku*-adjective (ク活用), *shiku*-adjective (シク活用), *nari* (ナリ活用), and *tari* (タリ活用) conjugations.

That is **78 combinations** of conjugation pattern and form.

The error checks cover invalid text locations, repeated identification labels, phrase segments that are out of order or leave gaps, modern conjugation details used in a Classical passage, incompatible word types and conjugations, broken particle–predicate agreement links (係り結び), and invalid optional information. The checking tool reports invalid input as an error rather than stopping unexpectedly. The separate passage-building tool uses the named error `ClassicalPassageValidationError` for invalid passages.

**Verified test run:** [classical.test.ts](./packages/core/tests/classical.test.ts) — **1 test file passed, 23 tests passed** (Vitest 4.1.12, November 23, 2026).

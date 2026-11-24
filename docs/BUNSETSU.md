# How Fushi Creates Bunsetsu

## What is a bunsetsu?

A **bunsetsu** (文節) is a small meaningful section of a Japanese sentence.

For example, this sentence:

> 私は本を読む。

can be divided into:

> **私は｜本を｜読む。**

Each section contains a main word. Small words that support it, such as **は** and **を**, stay with that main word.

Fushi creates these sections automatically.

## The basic idea

Imagine placing the words of a sentence into boxes:

1. Open a new box when you find a **main word**.
2. Put the following **supporting words** into the same box.
3. Open another box when the next main word appears.

That is essentially how Fushi creates bunsetsu.

For **私は本を読む**, Fushi treats the words like this:

| Word | Role | What happens |
| --- | --- | --- |
| 私 | Main word | Starts the first section |
| は | Supporting word | Joins 私 |
| 本 | Main word | Starts the second section |
| を | Supporting word | Joins 本 |
| 読む | Main word | Starts the third section |

The result is:

> **私は｜本を｜読む**

## From a sentence to bunsetsu

Fushi does not do everything in one step. It uses several stages:

```mermaid
flowchart LR
    A["Japanese sentence"] --> B["Split into small word pieces"]
    B --> C["Combine pieces that belong together"]
    C --> D["Identify main and supporting words"]
    D --> E["Group them into bunsetsu"]
```

### 1. Split the sentence into word pieces

A language tool called **kuromoji** first divides the sentence into small pieces and supplies information about each piece, such as its part of speech.

For example:

> 私は本を読まない。

may initially be divided into pieces similar to:

> 私｜は｜本｜を｜読ま｜ない

Kuromoji performs this first analysis. Fushi then interprets the pieces using Japanese School Grammar.

### 2. Combine pieces that belong together

Sometimes several small pieces should be treated as one grammatical word.

For example, Fushi can combine:

- An adjectival noun stem and its ending, such as **静か + だ**.
- A prefix or suffix and its main word.
- The parts of **そうだ** when appropriate.

This prevents Fushi from splitting a grammatical word into separate bunsetsu merely because kuromoji originally supplied several pieces.

Fushi also remembers the original pieces and where they appeared in the sentence.

### 3. Identify main and supporting words

Fushi labels each grammatical word as either **independent** or **dependent**.

These terms describe the role of a word when forming bunsetsu:

- An **independent word** can begin a bunsetsu. It is the “main word” in the box analogy.
- A **dependent word** normally follows and supports a main word. It does not begin a new bunsetsu.

Common independent words include:

- Nouns, such as **私** and **本**.
- Verbs, such as **読む**.
- Adjectives.
- Adjectival nouns.
- Adverbs and several other word types.

Common dependent words include:

- Particles, such as **は**, **を**, and **に**.
- Auxiliary verbs, such as **ない** when it attaches to a verb.

A word's role can depend on its context. For example, **ない** can behave differently in different sentences. Fushi checks nearby words before deciding how to treat it.

### 4. Group the words

Fushi reads the grammatical words from left to right:

- When it reaches an independent word, it starts a new bunsetsu.
- When it reaches a dependent word, it adds that word to the current bunsetsu.

For **私は本を読まない**, this produces:

> **私は｜本を｜読まない**

Here, **読ま** begins the final section and **ない** stays with it.

## What happens in unusual cases?

Fushi tries to preserve the input rather than discard words it cannot handle.

If a sentence begins with a dependent word, Fushi keeps it in an initial bunsetsu and records a warning. A warning explains that the result may need attention; it does not mean the word was removed.

Fushi can also record warnings when it encounters an unfamiliar word type or cannot determine a grammatical distinction confidently.

## What Fushi does not do

Fushi's bunsetsu grouping follows clear rules. It does not use artificial intelligence to understand the meaning of the whole sentence.

The supported modern library stops after forming ordinary 文節. It does **not** generate sentence components（文の成分）, dependency targets（係り受け）, clauses（節）, sentence types（単文・複文・重文）, or combined phrase segments（連文節）. For example, it returns `私は｜本を｜読む` without deciding which segment is the subject or which segment modifies another.

This boundary is deliberate. Local word patterns often provide useful 文節 boundaries, but sentence-level decisions can require omitted information, broader context, semantics, and discourse. Kuromoji/IPAdic supplies morphological features rather than a complete dependency tree. Finite exception rules cannot guarantee broadly accurate sentence analysis.

That does not mean Japanese sentence analysis is impossible. Learned parsing models and evaluated linguistic resources are different approaches outside this library's current scope.

The quality of the word and 文節 result still depends on:

1. Kuromoji's initial division of the sentence.
2. Fushi's rules for combining word pieces.
3. Fushi's decisions about which words are independent or dependent.

These results remain best-effort; limiting the scope does not make tokenization or `文節` grouping perfect.

## In one sentence

**Fushi creates a bunsetsu by starting with a main word and attaching the supporting words that follow it, stopping when the next main word appears.**

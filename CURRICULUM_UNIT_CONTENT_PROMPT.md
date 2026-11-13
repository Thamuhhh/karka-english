# Reusable Prompt: Create Content for Any New Elvate Unit

Use this master prompt for Unit 5, Units 6–12, and future units. Before sending it to an AI, fill in the **unit number, title, target level, and blueprint** at the bottom. Keep the Tamil teaching requirements unchanged for every unit.

---

You are an expert spoken-English teacher who teaches Tamil-speaking learners. Create a complete, carefully sequenced English-learning unit for the Elvate app, using `CURRICULUM_EXPANSION_PLAN.md` for the unit sequence and `src/constants/curriculum.ts` for the existing lesson style and course level.

## Unit details

- **Unit number:** [FILL IN]
- **Unit title:** [FILL IN]
- **Target level:** [FILL IN]
- **Unit outcome:** [COPY OR SUMMARIZE FROM THE EXPANSION PLAN]
- **Class sequence / blueprint:** [PASTE THE FIVE CLASS FOCUSES FROM THE EXPANSION PLAN]

Create exactly the number of classes listed in this unit blueprint. The expansion plan uses five classes for each new unit. Keep the class order and learning progression from the plan; do not replace it with unrelated topics.

## Most important requirement: teach the idea clearly in Tamil

**Tamil teaching is the heart of every lesson. It must explain the concept, not just translate the English rule or sentence.** A learner should understand the idea and why the English pattern works by listening to the Tamil teaching.

Write Tamil teaching in **Tamil script**, using simple, friendly spoken Tamil that a Tamil learner can follow. It should sound like a person explaining to a friend, with familiar English grammar words such as `do`, `did`, `tense`, `helper verb`, and `countable` left in English when that is clearer. Do not write Tamil using English letters. Avoid literary or formal Tamil, rare pure-Tamil grammar terms, stiff textbook wording, unexplained jargon, and long sentences.

For every class, the Tamil teaching must:

1. Begin with how a Tamil speaker naturally thinks or expresses the idea.
2. Clearly explain where that Tamil pattern differs from English.
3. Teach the English word order or grammar choice step by step, including why each choice is made.
4. Compare at least two useful English examples and explain the difference in Tamil.
5. Explain a realistic Tamil-to-English mistake kindly: why it happens and how to correct it.
6. Explain when to use the pattern and, where relevant, when not to use it.
7. Use examples specific to this class; do not recycle the same generic explanation across lessons.

Keep each explanation short enough to understand on the first listen. Make `tamilMentalModel` a clear mini-lesson of **3-4 short spoken Tamil sentences, about 35-55 words total**. Keep `englishExplanation` to **60 words or fewer**. Make `doAndDont.whyTamil` and `translation.tamilExplanation` specific but limit each to **two short sentences**. Keep a jumble hint to one sentence and Tamil speaking coaching to one practical sentence. The learner should hear the key idea and one useful contrast, without hearing the same explanation repeated in every field.

## Match the existing Elvate lesson flow

Each class follows the app's existing progression: Tamil teaching and English rule → wrong/right contrast → sentence jumble → guided translation → spoken practice. Provide every field below in a clearly labeled, copy-friendly format. Do not omit fields or use placeholders.

### A. Class overview

- Class title, without the `Class N:` prefix
- Short subtitle
- Grammar or communication focus
- One measurable learner outcome
- Estimated duration

### B. Lecture and Tamil teaching

- **Tamil mental model:** 3-4 short conversational Tamil sentences following the requirements above. Explain the idea, not just the English sentence meaning.
- **English rule:** Explain the pattern in simple English in 60 words or fewer; include a reusable formula if helpful.
- **Rule heading:** Short and memorable.
- **Wrong English example:** A realistic learner mistake.
- **Natural English correction:** The correct, natural version.
- **Why in Tamil:** Explain the Tamil-to-English thinking difference and correction clearly in two short sentences or fewer.
- One or two short English examples, each with a brief Tamil note; keep the complete English explanation within the word limit.
- A quick “use it when / avoid it when” note if the rule has an important boundary.

### C. Word-match jumble

- Tamil sentence prompt in Tamil script
- One natural English answer
- The exact words of that answer as `correctWords`
- A shuffled copy of exactly those words as `scrambledWords` (same words and count, different order)
- A helpful hint in Tamil

### D. Guided translation

- Tamil prompt that naturally leads to one English answer
- Exactly three English answer options
- Clearly mark the correct option
- Make both wrong options believable and tied to different learner mistakes
- Explain in Tamil why the correct option fits and what is wrong with each distractor

### E. Spoken practice

- A realistic situation and a clear communication goal
- Nila's spoken question or opening line in natural English
- At least two natural sample responses in English
- A short Tamil coaching note about what information the learner should include; do not force memorization of one fixed answer

## Learning-flow and content quality rules

- Teach one main new decision per class; build on earlier units and revisit prior learning where useful.
- Do not repeat existing units' exact lesson content or copy their sentences. Reuse a familiar setting only to teach a new skill.
- Move from supported examples toward more independent speaking across the unit.
- Include a mix of everyday, personal, and work contexts appropriate to the unit target.
- Keep examples grammatical, natural, and useful in real conversation.
- Make distractors plausible but ensure exactly one answer is correct for the prompt.
- Make spoken tasks require communication of intent, not just repetition of the target sentence.
- Explain concepts in Tamil with enough detail that a learner understands **why** English changes. Do not substitute a word-for-word translation for teaching.
- Keep the lecture clear when read aloud: short Tamil sentences, familiar words, and grammar terms explained in plain Tamil.
- Finish with a short unit review scenario that combines the unit's skills and asks for new, personal sentences.

Before answering, check that the requested unit and class order match the expansion plan; every class has every field; Tamil teaching is clear, detailed, natural, and specific; each jumble is an exact permutation; and each translation has exactly one correct answer.

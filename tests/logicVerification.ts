import { SUPERNOVA_LEVELS } from '../src/constants/curriculum';
import { SCENARIOS } from '../src/constants/scenarios';
import { STARTER_VOCABULARY } from '../src/api/dictionary';
import {
  localGrammarDiagnosis,
  generateLocalScenarioReply,
  checkLessonTranslation,
  sendLessonRealTalkReply,
} from '../src/api/supernovaAi';
import {
  computeLeagueRankName,
  getRankedLeaderboard,
  getUserLeaderboardRank,
} from '../src/services/leaderboardService';
import { UserStats } from '../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message} (expected ${String(expected)}, got ${String(actual)})`);
  }
}

function makeMockStats(overrides: Partial<UserStats> = {}): UserStats {
  return {
    streakDays: 3,
    lastActiveDate: '2026-11-10',
    stardustXp: 120,
    cosmicRank: 'Bronze League',
    gems: 450,
    hearts: 5,
    maxHearts: 5,
    todayXp: 20,
    todayDate: '2026-11-10',
    dailyGoalXp: 100,
    wordsMastered: 0,
    conversationsDone: 0,
    sentencesChecked: 0,
    completedClasses: ['sn-1-1'],
    masteredWords: [],
    soundEnabled: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------
// 1. Curriculum Integrity Verification (4 Units, 22 Classes)
// ---------------------------------------------------------------
assertEqual(SUPERNOVA_LEVELS.length, 4, 'Expected 4 curriculum units');
const allClasses = SUPERNOVA_LEVELS.flatMap((u) => u.classes);
assertEqual(allClasses.length, 22, 'Expected 22 total curriculum classes');

const seenIds = new Set<string>();
for (const cls of allClasses) {
  assert(!seenIds.has(cls.id), `Duplicate class ID found: ${cls.id}`);
  seenIds.add(cls.id);

  const scrambled = [...cls.jumble.scrambledWords].sort();
  const correct = [...cls.jumble.correctWords].sort();
  assertEqual(
    JSON.stringify(scrambled),
    JSON.stringify(correct),
    `Jumble token mismatch in ${cls.id}`
  );

  assert(
    cls.translation.correctOptionIndex >= 0 &&
      cls.translation.correctOptionIndex < cls.translation.options.length,
    `Invalid translation index in ${cls.id}`
  );
  assert(cls.rule.tamilMentalModel.trim().length > 10, `Missing Tamil model in ${cls.id}`);
  assert(cls.speakingChallenge.suggestedAnswers.length > 0, `Missing suggested answers in ${cls.id}`);
}

// ---------------------------------------------------------------
// 2. Grammar Diagnostic Engine Tests
// ---------------------------------------------------------------
const ruleCases: Array<{ input: string; expectSubstr: string; expectError: boolean }> = [
  { input: "I didn't went to the office yesterday.", expectSubstr: "didn't go", expectError: true },
  { input: "He don't know the meeting schedule.", expectSubstr: "doesn't know", expectError: true },
  { input: 'Myself Vignesh from Chennai.', expectSubstr: 'I am Vignesh', expectError: true },
  { input: 'I am having a doubt in this topic.', expectSubstr: 'I have a question', expectError: true },
  { input: 'Please revert back by evening.', expectSubstr: 'reply', expectError: true },
  { input: 'Let us discuss about the roadmap.', expectSubstr: 'discuss the roadmap', expectError: true },
  { input: 'Yesterday I have completed the sprint task.', expectSubstr: 'completed', expectError: true },
  { input: 'I passed out from Anna University in 2023.', expectSubstr: 'graduated from', expectError: true },
  { input: 'This version is more better than before.', expectSubstr: 'better than before', expectError: true },
  { input: 'She is one of my friend from college.', expectSubstr: 'one of my friends', expectError: true },
  { input: 'I am agree with your decision.', expectSubstr: 'I agree', expectError: true },
  { input: 'I have worked here since 3 years.', expectSubstr: 'for 3 years', expectError: true },
  { input: 'Could I please get an iced latte with oat milk?', expectSubstr: 'Could I please get', expectError: false },
];

for (const tc of ruleCases) {
  const res = localGrammarDiagnosis(tc.input);
  assertEqual(
    res.hasErrors,
    tc.expectError,
    `Expected hasErrors=${tc.expectError} for "${tc.input}"`
  );
  assert(
    res.correctedSentence.toLowerCase().includes(tc.expectSubstr.toLowerCase()),
    `Expected "${res.correctedSentence}" to include "${tc.expectSubstr}"`
  );
  assert(res.tamilExplanation.trim().length > 5, `Missing Tamil explanation for "${tc.input}"`);
}

// ---------------------------------------------------------------
// 3. Roleplay Scenario Replies across ALL 5 Scenarios
// ---------------------------------------------------------------
assertEqual(SCENARIOS.length, 5, 'Expected 5 roleplay scenarios');
for (const scenario of SCENARIOS) {
  const reply = generateLocalScenarioReply('I completed the sprint testing yesterday', scenario, 1);
  assert(reply.trim().length > 10, `Empty reply for scenario ${scenario.id}`);
}

// ---------------------------------------------------------------
// 4. League & Dynamic Leaderboard Ranking Logic
// ---------------------------------------------------------------
assertEqual(computeLeagueRankName(120), 'Bronze League', 'Rank below 350 XP');
assertEqual(computeLeagueRankName(400), 'Silver League', 'Rank 350..799 XP');
assertEqual(computeLeagueRankName(900), 'Gold League', 'Rank 800..1499 XP');
assertEqual(computeLeagueRankName(1600), 'Diamond League', 'Rank >=1500 XP');

const lowStats = makeMockStats({ stardustXp: 120 });
const lowRank = getUserLeaderboardRank(lowStats);
assertEqual(lowRank, 10, 'Expected rank 10 for 120 XP');

const topStats = makeMockStats({ stardustXp: 2600 });
const rankedTop = getRankedLeaderboard(topStats);
assert(rankedTop[0].isCurrentUser === true, 'User with 2600 XP must lead at rank #1');
assertEqual(rankedTop[0].rank, 1, 'Expected rank 1 at top');

// ---------------------------------------------------------------
// 5. Starter Vocabulary Verification
// ---------------------------------------------------------------
assert(STARTER_VOCABULARY.length >= 6, 'Expected at least 6 starter words');
for (const word of STARTER_VOCABULARY) {
  assert(!!word.word && !!word.definition && !!word.tamilMeaning, `Incomplete word entry: ${word.word}`);
}

// ---------------------------------------------------------------
// 6. Active Q&A Translation & Real Talk Lesson Engine
// ---------------------------------------------------------------
async function runAsyncChecks() {
  const firstClass = SUPERNOVA_LEVELS[0].classes[0];
  const exactRes = await checkLessonTranslation(
    firstClass.translation.expectedEnglish,
    firstClass.translation
  );
  assertEqual(exactRes.isCorrect, true, 'Exact translation answer should pass');
  assertEqual(exactRes.score, 100, 'Exact translation answer should score 100');

  const secondClass = SUPERNOVA_LEVELS[0].classes[1];
  const expandedRes = await checkLessonTranslation(
    'He does not know your phone number.',
    secondClass.translation
  );
  assertEqual(expandedRes.isCorrect, true, 'Contraction expansion ("does not" vs "doesn\'t") should pass');

  const badRes = await checkLessonTranslation(
    "He don't know your phone number.",
    secondClass.translation
  );
  assertEqual(badRes.isCorrect, false, 'Common error ("He don\'t") must fail Q&A translation');

  const realTalk = await sendLessonRealTalkReply(
    [{ id: 'u1', role: 'user', content: 'Hi Nila! I am Alex and I work in Chennai.', timestamp: Date.now() }],
    'Hi Nila! I am Alex and I work in Chennai.',
    firstClass
  );
  assert(realTalk.reply.trim().length > 10, 'Real Talk reply should be non-empty');
  assert(realTalk.feedback.fluencyScore >= 70, 'Natural intro should receive high fluency score');

  console.log(
    `ALL CHECKS PASSED: ${allClasses.length} classes, ${ruleCases.length} grammar rules, ${SCENARIOS.length} scenarios, dynamic leaderboard, starter vocabulary, Q&A translation, and Real Talk verified.`
  );
}

runAsyncChecks().catch((err) => {
  console.error(err);
  process.exit(1);
});

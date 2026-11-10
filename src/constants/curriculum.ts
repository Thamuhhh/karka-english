export interface ClassLesson {
  id: string;
  title: string;
  subtitle: string;
  tamilConcept: string;
  duration: string;
  grammarFocus: string;
  dialoguePrompt: string;
  keyPhrases: string[];
  quiz: {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
    tamilExplanation: string;
  };
}

export interface LevelCourse {
  levelNumber: number;
  levelTitle: string;
  cefrTag: string;
  icon: string;
  badge: string;
  description: string;
  classes: ClassLesson[];
}

export const SUPERNOVA_CURRICULUM: LevelCourse[] = [
  {
    levelNumber: 1,
    levelTitle: 'Star Cadet: Foundations & Basics',
    cefrTag: 'A1 - A2',
    icon: 'compass',
    badge: 'Beginner',
    description: 'Master sentence basics, introductions, and eliminate common hesitation.',
    classes: [
      {
        id: 'class-1-1',
        title: 'Class 1: Confident Self-Introduction',
        subtitle: 'Break the hesitation when introducing yourself',
        tamilConcept: 'எப்போதுமே "Myself John" என்று ஆரம்பிக்க கூடாது; "Hi, I am John" அல்லது "My name is John" என்று சொல்ல வேண்டும்.',
        duration: '5 mins',
        grammarFocus: 'Present Simple + Personal Pronouns',
        dialoguePrompt: 'Introduce yourself: your name, where you are from, and what you do.',
        keyPhrases: [
          'Hi, my name is Alex.',
          'I am based in Chennai, India.',
          'I currently work as a software engineer.',
          'In my free time, I love reading and exploring tech.',
        ],
        quiz: {
          question: 'Which is the natural way to introduce yourself?',
          options: ['Myself Alex, coming from Chennai.', 'Hi, I am Alex from Chennai.', 'Me is Alex Chennai.'],
          correctIndex: 1,
          explanation: 'Native speakers avoid "Myself [Name]" because myself is a reflexive pronoun.',
          tamilExplanation: 'ஆங்கிலத்தில் அறிமுகப்படுத்தும்போது "Myself..." என்று தொடங்காமல் "Hi, I am..." என்று சொல்வதே சரியானது.',
        },
      },
      {
        id: 'class-1-2',
        title: 'Class 2: Subject-Verb Agreement',
        subtitle: 'He does vs He do, She has vs She have',
        tamilConcept: 'He, She, It வந்தால் வினைச்சொல்லுடன் "s" அல்லது "es" சேர வேண்டும் (He knows, She works).',
        duration: '6 mins',
        grammarFocus: 'Singular/Plural Verb Agreement',
        dialoguePrompt: 'Describe what your friend or manager does at work every day.',
        keyPhrases: [
          'He doesn\'t know the answer.',
          'She works from home on Fridays.',
          'Everyone likes this new feature.',
          'Does it make sense to you?',
        ],
        quiz: {
          question: 'Choose the correct sentence:',
          options: ['He don\'t know about the meeting.', 'He doesn\'t know about the meeting.', 'He not know about the meeting.'],
          correctIndex: 1,
          explanation: 'He, She, It take "doesn\'t", never "don\'t".',
          tamilExplanation: 'He / She / It வந்தாலே "doesn\'t" தான் வரும்; "don\'t" வரக்கூடாது.',
        },
      },
      {
        id: 'class-1-3',
        title: 'Class 3: Prepositions Master (In, On, At)',
        subtitle: 'Never confuse in Monday vs on Monday again',
        tamilConcept: 'At = குறிப்பிட்ட நேரம்/இடம் (at 5 PM, at home). On = நாட்கள்/மேற்பரப்பு (on Monday, on the table). In = மாதங்கள்/பெரிய இடம் (in Chennai, in July).',
        duration: '6 mins',
        grammarFocus: 'Prepositions of Time & Place',
        dialoguePrompt: 'Tell someone when and where your next meeting will happen.',
        keyPhrases: [
          'The call is scheduled at 4:30 PM.',
          'We have a team demo on Thursday.',
          'I was born in 2002 in Coimbatore.',
          'She is currently at the office.',
        ],
        quiz: {
          question: 'I will submit the assignment ______ Monday.',
          options: ['at', 'in', 'on'],
          correctIndex: 2,
          explanation: 'Use "on" before days of the week (on Monday, on Friday).',
          tamilExplanation: 'நாட்களைக் குறிப்பிடும்போது "on Monday" என்று தான் சொல்ல வேண்டும்.',
        },
      },
      {
        id: 'class-1-4',
        title: 'Class 4: Did + Base Verb Fix',
        subtitle: 'Fixing the "didn\'t went" mistake forever',
        tamilConcept: '"Did" அல்லது "Didn\'t" கடந்த காலத்தை ஏற்கனவே குறிப்பதால், அதற்குப் பின் வரும் வினைச்சொல் முதல் நிலையில் (base verb) மட்டுமே இருக்க வேண்டும்.',
        duration: '7 mins',
        grammarFocus: 'Past Negative & Questions with DID',
        dialoguePrompt: 'Explain why you could not attend an event yesterday.',
        keyPhrases: [
          'I didn\'t see the message yesterday.',
          'Why didn\'t you come to college?',
          'She did not go to the market.',
          'Did you find the document?',
        ],
        quiz: {
          question: 'Find the mistake: "She didn\'t went to the clinic yesterday."',
          options: ['Change "didn\'t went" to "didn\'t go"', 'Change "yesterday" to "today"', 'Sentence has no mistake'],
          correctIndex: 0,
          explanation: 'After "didn\'t", the verb must revert to base form "go".',
          tamilExplanation: '"Didn\'t went" என்பது தவறு; "didn\'t go" என்பதே சரி.',
        },
      },
    ],
  },
  {
    levelNumber: 2,
    levelTitle: 'Solar Voyager: Conversational Fluency',
    cefrTag: 'B1',
    icon: 'chatbubbles',
    badge: 'Intermediate',
    description: 'Speak smoothly in daily social, shopping, travel, and casual encounters.',
    classes: [
      {
        id: 'class-2-1',
        title: 'Class 1: Past Simple vs Present Perfect',
        subtitle: 'Yesterday I saw vs I have seen',
        tamilConcept: 'குறிப்பிட்ட நேரம் (Yesterday, last week) சொன்னால் Simple Past (saw). நேரம் குறிப்பிடாமல் அனுபவத்தை சொன்னால் Present Perfect (have seen).',
        duration: '8 mins',
        grammarFocus: 'Completed Past vs Ongoing Experience',
        dialoguePrompt: 'Talk about a movie you watched last week vs places you have visited in life.',
        keyPhrases: [
          'I saw that movie last Friday.',
          'I have watched that movie three times.',
          'Yesterday, we deployed the code.',
          'Have you ever traveled abroad?',
        ],
        quiz: {
          question: 'Yesterday, I ______ my old school teacher.',
          options: ['have met', 'met', 'had have met'],
          correctIndex: 1,
          explanation: 'Specific past time "Yesterday" requires Simple Past "met".',
          tamilExplanation: '"Yesterday" என்று குறிப்பிட்ட நேரம் வந்ததால் "met" பயன்படுத்த வேண்டும்.',
        },
      },
      {
        id: 'class-2-2',
        title: 'Class 2: Ordering at Cafes & Restaurants',
        subtitle: 'Sound natural without sounding abrupt or rude',
        tamilConcept: '"Give me coffee" என்று கட்டளையாக கேட்காமல், "Could I get a coffee, please?" அல்லது "I\'d like a coffee" என்று பணிவாக கேட்க வேண்டும்.',
        duration: '6 mins',
        grammarFocus: 'Polite Requests (Could I have / Would you mind)',
        dialoguePrompt: 'Order your breakfast and ask if they have dairy-free alternatives.',
        keyPhrases: [
          'Could I get a medium cappuccino, please?',
          'Do you have any oat milk or almond milk options?',
          'Could you make it less sweet?',
          'Can we get the bill, please?',
        ],
        quiz: {
          question: 'Which request sounds the most polite and natural?',
          options: ['Give one cappuccino fast.', 'I would like a cappuccino with oat milk, please.', 'Bring cappuccino.'],
          correctIndex: 1,
          explanation: '"I would like..." or "Could I get..." is standard polite conversational English.',
          tamilExplanation: 'உணவகங்களில் "I would like a..." என்று கேட்பது நாகரீகமான முறை.',
        },
      },
      {
        id: 'class-2-3',
        title: 'Class 3: Airport Check-in & Directions',
        subtitle: 'Confidence while traveling abroad',
        tamilConcept: 'பயணத்தின்போது கேட்கப்படும் கேள்விகளுக்கு சுருக்கமாகவும் தெளிவாகவும் பதிலளிக்கும் முறை.',
        duration: '7 mins',
        grammarFocus: 'Directional verbs & Purpose of Visit clauses',
        dialoguePrompt: 'Tell the immigration officer why you are visiting and where you are staying.',
        keyPhrases: [
          'I am here on a two-week tourist vacation.',
          'I will be staying at the Grand Hotel in Downtown.',
          'Here is my return flight ticket confirmation.',
          'Excuse me, which way is terminal 3?',
        ],
        quiz: {
          question: 'Officer asks: "What is the purpose of your trip?" Best answer:',
          options: ['Why you ask?', 'I am attending a tech conference for 5 days.', 'For moving around.'],
          correctIndex: 1,
          explanation: 'State purpose and duration clearly and politely.',
          tamilExplanation: 'பயணத்தின் நோக்கத்தை தெளிவாக குறிப்பிடுதல்.',
        },
      },
      {
        id: 'class-2-4',
        title: 'Class 4: Polite Disagreements & Giving Opinions',
        subtitle: 'Saying "I see your point, but..." without offending',
        tamilConcept: 'நேரடியாக "You are wrong" என்று சொல்லாமல் "I see what you mean, but from my perspective..." என்று பேச வேண்டும்.',
        duration: '8 mins',
        grammarFocus: 'Diplomatic hedging & Softeners',
        dialoguePrompt: 'Politely disagree with a colleague regarding a deadline.',
        keyPhrases: [
          'I understand where you are coming from, but...',
          'From my perspective, this might take a bit more time.',
          'I\'m not entirely sure that will work because...',
          'How about we test both approaches?',
        ],
        quiz: {
          question: 'How do you politely disagree in a team meeting?',
          options: ['You are totally wrong.', 'I see your point, but we might run into server issues.', 'No way, shut up.'],
          correctIndex: 1,
          explanation: '"I see your point, but..." acknowledges the speaker while offering your viewpoint.',
          tamilExplanation: 'எதிர்கருத்தை மரியாதையாகவும் மென்மையாகவும் தெரிவிக்கும் உத்தி.',
        },
      },
    ],
  },
  {
    levelNumber: 3,
    levelTitle: 'Nebula Master: Workplace & Career English',
    cefrTag: 'B2',
    icon: 'briefcase',
    badge: 'Advanced',
    description: 'Crush tech interviews, lead team meetings, and write crisp professional emails.',
    classes: [
      {
        id: 'class-3-1',
        title: 'Class 1: Tech Job Interview Behavioral Qs',
        subtitle: 'STAR method: Situation, Task, Action, Result',
        tamilConcept: 'இன்டர்வியூவில் "In my last project..." என்று ஆரம்பித்து, என்ன பிரச்சனை, நீங்கள் என்ன தீர்வு தந்தீர்கள் என்பதை தெளிவாக எடுத்துரைப்பது.',
        duration: '10 mins',
        grammarFocus: 'Action Verbs + Impact Metrics',
        dialoguePrompt: 'Explain a difficult bug or challenge you resolved in your code.',
        keyPhrases: [
          'In my previous role, we encountered high database latency.',
          'My responsibility was to optimize the backend API pipelines.',
          'I implemented Redis caching, which reduced load times by 40%.',
          'That experience taught me the importance of proactive monitoring.',
        ],
        quiz: {
          question: 'When asked "Tell me about a challenge", what is best to focus on?',
          options: ['Blame colleagues for mistakes.', 'The problem, the specific action YOU took, and the positive result.', 'Say you never faced any challenges.'],
          correctIndex: 1,
          explanation: 'The STAR framework highlights your competence and problem-solving skills.',
          tamilExplanation: 'பிரச்சனை, நீங்கள் எடுத்த தீர்வு நடவடிக்கை, கிடைத்த வெற்றிகரமான முடிவு என வரிசையாக விளக்குதல்.',
        },
      },
      {
        id: 'class-3-2',
        title: 'Class 2: Professional Email Etiquette',
        subtitle: 'Stop saying "Please do the needful" and sound modern',
        tamilConcept: 'பழைய பிரிட்டிஷ் காலத்து "Please do the needful" என்பதை தவிர்த்து, "Could you please review this when you have a moment?" என்று எழுதுங்கள்.',
        duration: '8 mins',
        grammarFocus: 'Modal Verbs (Would, Could, Should) for Business',
        dialoguePrompt: 'Write a follow-up email asking your manager for code review approval.',
        keyPhrases: [
          'I hope you are having a productive week.',
          'Just following up on the pull request I shared yesterday.',
          'Could you please take a look when you have a moment?',
          'Please let me know if any changes are required.',
        ],
        quiz: {
          question: 'Replace the outdated phrase "Please do the needful":',
          options: ['Do it fast.', 'Could you please assist with this request?', 'Needful is required.'],
          correctIndex: 1,
          explanation: 'Modern corporate communication prefers clear, direct, and polite requests.',
          tamilExplanation: 'நவீன அலுவலக மின்னஞ்சல்களில் "Could you please assist with this?" என எழுதுவது நன்று.',
        },
      },
      {
        id: 'class-3-3',
        title: 'Class 3: Agile Daily Standups & Demos',
        subtitle: 'Yesterday I did, Today I am doing, Blockers',
        tamilConcept: 'டெய்லி ஸ்டாண்ட்-அப்பில் நீளமாக பேசாமல், சுருக்கமாக 3 விஷயங்களை மட்டும் பேசுவது.',
        duration: '7 mins',
        grammarFocus: 'Present Continuous & Future Plans',
        dialoguePrompt: 'Deliver your daily standup update to your engineering team.',
        keyPhrases: [
          'Yesterday, I wrapped up the authentication screens.',
          'Today, I will be integrating the Gemini API service.',
          'I am currently blocked waiting for the API keys approval.',
          'I should be ready for testing by this evening.',
        ],
        quiz: {
          question: 'If you are waiting for someone to unblock you, you say:',
          options: ['I am blocked waiting for backend endpoints.', 'I stopped doing work.', 'Nobody gives me keys.'],
          correctIndex: 0,
          explanation: '"I am blocked on/waiting for..." is standard agile team terminology.',
          tamilExplanation: 'பணியில் தடை ஏற்படும்போது "I am blocked on..." என்று சொல்வது வழக்கம்.',
        },
      },
    ],
  },
  {
    levelNumber: 4,
    levelTitle: 'Supernova Legend: Native Nuances & Mastery',
    cefrTag: 'C1 - C2',
    icon: 'sparkles',
    badge: 'Mastery',
    description: 'Think in English, master idioms, phrasal verbs, and speak like a native.',
    classes: [
      {
        id: 'class-4-1',
        title: 'Class 1: Top 20 Everyday Phrasal Verbs',
        subtitle: 'Figure out, call off, catch up, run into',
        tamilConcept: 'ஆங்கிலேயர்கள் பெரிய வார்த்தைகளை விட "phrasal verbs" (e.g. figure out = understand) அதிகம் பயன்படுத்துவார்கள்.',
        duration: '9 mins',
        grammarFocus: 'Verb + Preposition Idiomatic Combinations',
        dialoguePrompt: 'Use "figure out" and "catch up" in a sentence talking about weekend plans.',
        keyPhrases: [
          'We need to figure out why this error is happening.',
          'Let\'s catch up over coffee this Saturday.',
          'They decided to call off the meeting due to rain.',
          'I ran into an old college friend at the airport.',
        ],
        quiz: {
          question: 'What does "to figure out" mean?',
          options: ['To draw a figure', 'To understand or solve a problem', 'To calculate numbers only'],
          correctIndex: 1,
          explanation: '"Figure out" means to solve, understand, or find a solution.',
          tamilExplanation: '"Figure out" என்றால் ஒரு சிக்கலை புரிந்துகொண்டு தீர்ப்பது.',
        },
      },
      {
        id: 'class-4-2',
        title: 'Class 2: Natural Connected Speech & Reductions',
        subtitle: 'Gonna, wanna, gotta, shoulda in natural rhythm',
        tamilConcept: 'இயல்பாக பேசும்போது வார்த்தைகள் ஒன்றோடு ஒன்று இணைந்து ஒலிக்கும் (Going to -> gonna, want to -> wanna).',
        duration: '8 mins',
        grammarFocus: 'Phonological assimilation & linking words',
        dialoguePrompt: 'Practice saying: "What do you want to do?" naturally as "Whaddya wanna do?"',
        keyPhrases: [
          'I\'m gonna wrap up this feature today.',
          'Do you wanna grab some lunch?',
          'I gotta finish this deployment before 5.',
          'You should\'ve seen his reaction!',
        ],
        quiz: {
          question: 'In conversational spoken English, "going to" often links as:',
          options: ['gonner', 'gonna', 'gone to'],
          correctIndex: 1,
          explanation: '"Gonna" is the casual spoken reduction of "going to".',
          tamilExplanation: 'பேச்சு வழக்கில் "going to" என்பது "gonna" என சுருங்கி ஒலிக்கும்.',
        },
      },
    ],
  },
];

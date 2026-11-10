export interface JumbleExercise {
  tamilSentence: string;
  scrambledWords: string[];
  correctWords: string[];
  hint: string;
}

export interface GuidedTranslation {
  tamilPrompt: string;
  expectedEnglish: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  tamilExplanation: string;
}

export interface FreeSpeakingChallenge {
  prompt: string;
  missNovaQuestion: string;
  suggestedAnswers: string[];
  sampleNativeResponse: string;
}

export interface SupernovaClass {
  id: string;
  levelNumber: number;
  classNumber: number;
  title: string;
  subtitle: string;
  duration: string;
  grammarTopic: string;
  xpReward: number;

  // Step 1: Grammar Pattern & Tamil Mental Model
  rule: {
    heading: string;
    englishExplanation: string;
    tamilMentalModel: string;
    doAndDont: {
      wrong: string;
      right: string;
      whyTamil: string;
    };
  };

  // Step 2: Supernova Sentence Scramble (Jumble)
  jumble: JumbleExercise;

  // Step 3: Guided Translation
  translation: GuidedTranslation;

  // Step 4: Free Speaking with Miss Nova
  speakingChallenge: FreeSpeakingChallenge;
}

export interface SupernovaLevel {
  levelNumber: number;
  levelName: string;
  cefrTag: string;
  badge: string;
  accentColor: string;
  description: string;
  classes: SupernovaClass[];
}

export const SUPERNOVA_LEVELS: SupernovaLevel[] = [
  {
    levelNumber: 1,
    levelName: 'Level 1: Foundation & Basics',
    cefrTag: 'A1 - A2',
    badge: 'Foundation',
    accentColor: '#6366F1',
    description: 'Eliminate hesitation, fix Tamil-English literal translation, and master everyday basics.',
    classes: [
      {
        id: 'sn-1-1',
        levelNumber: 1,
        classNumber: 1,
        title: 'Class 1: Confident Self-Introduction',
        subtitle: 'Stop saying "Myself Alex" — sound polished and natural',
        duration: '6 mins',
        grammarTopic: 'Personal Pronouns + Present Simple',
        xpReward: 100,
        rule: {
          heading: 'Rule: Never Use "Myself" as the Subject',
          englishExplanation: '"Myself" is a reflexive pronoun (referring back to oneself). In introductions, always use "I am [Name]" or "My name is [Name]".',
          tamilMentalModel: 'தமிழில் "என்னோட பேரு..." என்று சொல்வதை ஆங்கிலத்தில் "Myself..." என தவறாக மொழிபெயர்க்கக் கூடாது. எப்போதுமே "Hi, I am..." அல்லது "My name is..." என்று தொடங்குவதே சரியான முறை.',
          doAndDont: {
            wrong: 'Myself Vignesh, coming from Madurai.',
            right: 'Hi, I am Vignesh. I am from Madurai.',
            whyTamil: '"Myself" தவறு; "I am Vignesh" என்பதே நேரடியான, சரியான ஆங்கிலம்.',
          },
        },
        jumble: {
          tamilSentence: 'வணக்கம், என் பெயர் அலெக்ஸ், நான் சென்னையில் வசிக்கிறேன்.',
          scrambledWords: ['in', 'My', 'Chennai', 'name', 'Alex', 'is', 'live', 'I', 'and'],
          correctWords: ['My', 'name', 'is', 'Alex', 'and', 'I', 'live', 'in', 'Chennai'],
          hint: 'Start with "My name is..."',
        },
        translation: {
          tamilPrompt: '"எனக்கு ஐடி துறையில் 3 வருட பணி அனுபவம் உள்ளது."',
          expectedEnglish: 'I have 3 years of experience in the IT sector.',
          options: [
            'I am having 3 years experience in IT.',
            'I have 3 years of experience in the IT sector.',
            'Me have 3 years working in IT.',
          ],
          correctOptionIndex: 1,
          explanation: 'Experience and possession use stative verb "have", not continuous "am having".',
          tamilExplanation: 'அனுபவம் மற்றும் உடைமைகளுக்கு "am having" என்று வராது; "I have" தான் வரும்.',
        },
        speakingChallenge: {
          prompt: 'Introduce yourself in 2 confident sentences: your name, where you live, and what you do.',
          missNovaQuestion: 'Hello! I am Miss Nova, your AI spoken English tutor. Could you tell me your name and what you do?',
          suggestedAnswers: [
            'Hi Miss Nova! I am Alex, and I work as a mobile software engineer in Chennai.',
            'Hello! My name is Alex. I am a tech professional passionate about AI.',
          ],
          sampleNativeResponse: 'Hi Miss Nova! My name is Alex, and I am based in Chennai working in software development.',
        },
      },
      {
        id: 'sn-1-2',
        levelNumber: 1,
        classNumber: 2,
        title: 'Class 2: Third-Person Singular (He/She/It)',
        subtitle: 'Fix "He don\'t know" & "She work" permanently',
        duration: '7 mins',
        grammarTopic: 'Verb Inflection -s/-es + doesn\'t',
        xpReward: 100,
        rule: {
          heading: 'Rule: Singular Subjects Take "Doesn\'t" & Verbs with "-s"',
          englishExplanation: 'He, She, It, and Everyone take "doesn\'t" in negative sentences and add "-s" in affirmative (He knows, She lives).',
          tamilMentalModel: 'தமிழில் "அவன் செய்வான் / அவள் செய்வாள்" என்பது போல, ஆங்கிலத்தில் He / She / It வந்தால் வினைச்சொல்லோடு "s" சேர வேண்டும் (He works). எதிர்மறையில் "doesn\'t" மட்டுமே வர வேண்டும்.',
          doAndDont: {
            wrong: 'He don\'t know the meeting time.',
            right: 'He doesn\'t know the meeting time.',
            whyTamil: 'He / She / It-க்கு "doesn\'t" பயன்படுத்த வேண்டும்; "don\'t" வரக்கூடாது.',
          },
        },
        jumble: {
          tamilSentence: 'அவருக்கு இந்த புதிய ப்ராஜெக்ட் பற்றி தெரியாது.',
          scrambledWords: ['project', 'He', 'know', 'about', 'doesn\'t', 'this', 'new'],
          correctWords: ['He', 'doesn\'t', 'know', 'about', 'this', 'new', 'project'],
          hint: 'Remember: He + doesn\'t + base verb',
        },
        translation: {
          tamilPrompt: '"எங்கள் குழுவில் உள்ள அனைவருக்கும் மடிக்கணினி உள்ளது."',
          expectedEnglish: 'Everyone in our team has a laptop.',
          options: [
            'Everyone in our team have a laptop.',
            'Everyone in our team has a laptop.',
            'Everyone in our team having laptop.',
          ],
          correctOptionIndex: 1,
          explanation: '"Everyone" is grammatically singular and takes the singular verb "has".',
          tamilExplanation: '"Everyone" பலரை குறித்தாலும் ஆங்கிலத்தில் ஒருமை என்பதால் "has" பயன்படுத்த வேண்டும்.',
        },
        speakingChallenge: {
          prompt: 'Describe what your friend or coworker does every morning at work.',
          missNovaQuestion: 'What does your coworker or manager usually do first thing in the morning?',
          suggestedAnswers: [
            'She usually checks her emails and schedules our daily standup meeting.',
            'He reviews the client updates and assigns tasks to the team.',
          ],
          sampleNativeResponse: 'She starts her morning by reviewing our project backlog and checking pull requests.',
        },
      },
      {
        id: 'sn-1-3',
        levelNumber: 1,
        classNumber: 3,
        title: 'Class 3: Did + Base Verb Fix',
        subtitle: 'Banish "didn\'t went" & "did you saw" forever',
        duration: '7 mins',
        grammarTopic: 'Past Auxiliary Inversion (Did + V1)',
        xpReward: 100,
        rule: {
          heading: 'Rule: Never Put Two Past Tense Markers Together',
          englishExplanation: '"Did" already marks the past tense. The main verb that follows MUST stay in base form: Did + go, didn\'t + see.',
          tamilMentalModel: '"Did" என்பது ஏற்கனவே கடந்த காலத்தை சொல்லிவிட்டது. அதனால் அதற்குப் பின் வரும் வினைச்சொல் முதல் நிலை சொல் (go, see, know) மட்டுமே இருக்க வேண்டும்.',
          doAndDont: {
            wrong: 'I didn\'t went to the clinic yesterday.',
            right: 'I didn\'t go to the clinic yesterday.',
            whyTamil: '"Didn\'t went" தவறு; "didn\'t go" என்பதே சரியானது.',
          },
        },
        jumble: {
          tamilSentence: 'நேற்று நான் அந்த செய்தியை பார்க்கவில்லை.',
          scrambledWords: ['yesterday', 'see', 'I', 'message', 'didn\'t', 'the'],
          correctWords: ['I', 'didn\'t', 'see', 'the', 'message', 'yesterday'],
          hint: 'I + didn\'t + see + ...',
        },
        translation: {
          tamilPrompt: '"நேற்று நீங்கள் மேலாளரிடம் பேசினீர்களா?"',
          expectedEnglish: 'Did you speak to the manager yesterday?',
          options: [
            'Did you spoke to the manager yesterday?',
            'Did you speak to the manager yesterday?',
            'Have you spoke to the manager yesterday?',
          ],
          correctOptionIndex: 1,
          explanation: 'Questions starting with "Did" always take the base verb form "speak".',
          tamilExplanation: '"Did" வந்ததால் கடந்த கால "spoke" வரக்கூடாது; "speak" தான் வர வேண்டும்.',
        },
        speakingChallenge: {
          prompt: 'Explain why you could not attend an event or meeting yesterday.',
          missNovaQuestion: 'Oh, I noticed you were away yesterday! What happened?',
          suggestedAnswers: [
            'I didn\'t feel well yesterday, so I rested at home.',
            'I didn\'t receive the calendar invite on time, Miss Nova.',
          ],
          sampleNativeResponse: 'I didn\'t get the notification in time because my internet connection was down.',
        },
      },
    ],
  },
  {
    levelNumber: 2,
    levelName: 'Level 2: Conversational Daily Fluency',
    cefrTag: 'B1',
    badge: 'Intermediate',
    accentColor: '#06B6D4',
    description: 'Speak fluently in cafes, shopping, travel, and social hangouts without hesitation.',
    classes: [
      {
        id: 'sn-2-1',
        levelNumber: 2,
        classNumber: 1,
        title: 'Class 1: Past Simple vs Present Perfect',
        subtitle: 'Understand "Yesterday I saw" vs "I have seen"',
        duration: '8 mins',
        grammarTopic: 'Specific Past Time vs Lifetime Experience',
        xpReward: 100,
        rule: {
          heading: 'Rule: Use Simple Past with Finished Time Words',
          englishExplanation: 'If you mention a specific past time (yesterday, last week, in 2020), use Simple Past. Use Present Perfect (have + V3) when time is unstated.',
          tamilMentalModel: '"நேத்து பார்த்தேன்" (Yesterday) என்று குறிப்பிட்ட நேரம் சொன்னால் Simple Past (saw). நேரம் குறிப்பிடாமல் "பார்த்திருக்கிறேன்" என்று சொன்னால் Present Perfect (have seen).',
          doAndDont: {
            wrong: 'Yesterday only I have sent the project files.',
            right: 'I sent the project files yesterday.',
            whyTamil: 'Yesterday வந்ததால் "have sent" வரக்கூடாது; "sent" தான் வர வேண்டும்.',
          },
        },
        jumble: {
          tamilSentence: 'நான் ஏற்கனவே இந்த புத்தகத்தை மூன்று முறை படித்திருக்கிறேன்.',
          scrambledWords: ['book', 'read', 'this', 'have', 'three', 'already', 'I', 'times'],
          correctWords: ['I', 'have', 'already', 'read', 'this', 'book', 'three', 'times'],
          hint: 'I + have + already + read...',
        },
        translation: {
          tamilPrompt: '"கடந்த வாரம் நாங்கள் புதிய வாடிக்கையாளரை சந்தித்தோம்."',
          expectedEnglish: 'We met the new client last week.',
          options: [
            'We have met the new client last week.',
            'We met the new client last week.',
            'We meeting the new client last week.',
          ],
          correctOptionIndex: 1,
          explanation: '"Last week" is a completed time period, requiring Simple Past "met".',
          tamilExplanation: '"Last week" குறிப்பிட்ட கடந்த காலம் என்பதால் "met" மட்டுமே சரி.',
        },
        speakingChallenge: {
          prompt: 'Tell Miss Nova about a place you have visited in the past vs your general travel dreams.',
          missNovaQuestion: 'Have you ever traveled to another city or state? Where did you go?',
          suggestedAnswers: [
            'Yes, I visited Ooty last summer with my family, and the weather was fantastic.',
            'I went to Bangalore two months ago for a tech conference.',
          ],
          sampleNativeResponse: 'I visited Goa last December with my friends, and we had an unforgettable time exploring the beaches.',
        },
      },
      {
        id: 'sn-2-2',
        levelNumber: 2,
        classNumber: 2,
        title: 'Class 2: Polite Ordering & Requests',
        subtitle: 'Sound polite at cafes & restaurants instead of abrupt',
        duration: '7 mins',
        grammarTopic: 'Polite Modals (Could I get / I would like)',
        xpReward: 100,
        rule: {
          heading: 'Rule: Turn Commands into Polite Requests',
          englishExplanation: 'Instead of saying "Give me coffee", native speakers say "Could I get a coffee, please?" or "I\'d like a coffee".',
          tamilMentalModel: '"காபி குடு" என்று கட்டளையிடாமல், "ஒரு காபி கிடைக்குமா?" என்று பணிவாக கேட்பது போல ஆங்கிலத்தில் "Could I get a coffee, please?" என்று கேட்க வேண்டும்.',
          doAndDont: {
            wrong: 'Give one iced tea fast.',
            right: 'Could I get an iced tea, please?',
            whyTamil: '"Give me" ஆணை இடுவது போல் ஒலிக்கும்; "Could I get..." நாகரிகமானது.',
          },
        },
        jumble: {
          tamilSentence: 'தயவுசெய்து எனக்கு பில் கொண்டு வர முடியுமா?',
          scrambledWords: ['please', 'the', 'get', 'I', 'Could', 'bill'],
          correctWords: ['Could', 'I', 'get', 'the', 'bill', 'please'],
          hint: 'Could + I + get + the bill + please?',
        },
        translation: {
          tamilPrompt: '"எனக்கு ஒரு கப் சர்க்கரை இல்லாத ப்ளாக் காபி வேண்டும்."',
          expectedEnglish: 'I would like a cup of black coffee without sugar, please.',
          options: [
            'Give me black coffee no sugar.',
            'I would like a cup of black coffee without sugar, please.',
            'Bring black coffee sugar free.',
          ],
          correctOptionIndex: 1,
          explanation: '"I would like..." is the standard polite request in restaurants.',
          tamilExplanation: 'உணவகங்களில் "I would like..." என்று கேட்பது நாகரிகமான முறை.',
        },
        speakingChallenge: {
          prompt: 'Roleplay ordering your favorite beverage and snack at a London coffee shop.',
          missNovaQuestion: 'Welcome to Covent Garden Coffee! What can I get started for you today?',
          suggestedAnswers: [
            'Hi! Could I please get an oat milk cappuccino and a warm butter croissant?',
            'Hello! I would like a medium iced latte with light sugar, please.',
          ],
          sampleNativeResponse: 'Good morning! Could I please get a large vanilla latte with oat milk, and a blueberry muffin to go?',
        },
      },
    ],
  },
  {
    levelNumber: 3,
    levelName: 'Level 3: Workplace & Career English',
    cefrTag: 'B2',
    badge: 'Advanced',
    accentColor: '#F59E0B',
    description: 'Ace technical job interviews, write modern business emails, and speak up in meetings.',
    classes: [
      {
        id: 'sn-3-1',
        levelNumber: 3,
        classNumber: 1,
        title: 'Class 1: Tech Job Interview (STAR Method)',
        subtitle: 'Situation, Task, Action, Result framework for high-impact answers',
        duration: '10 mins',
        grammarTopic: 'Action Verbs + Measurable Outcomes',
        xpReward: 150,
        rule: {
          heading: 'Rule: Frame Answers with Action + Metric',
          englishExplanation: 'Structure answers with: What was the problem (Situation), your role (Task), exact steps you executed (Action), and measurable impact (Result).',
          tamilMentalModel: 'இன்டர்வியூவில் "பிரச்சனை இருந்துச்சு, சால்வ் பண்ணிட்டேன்" என்று ஒற்றை வரியில் சொல்லாமல்: என்ன பிரச்சனை, நீங்கள் என்ன செய்தீர்கள், அதன் மூலம் கிடைத்த சதவீதம் அல்லது வெற்றி என்ன என்பதை விளக்குங்கள்.',
          doAndDont: {
            wrong: 'My team had lots of bugs, so we worked hard and solved it.',
            right: 'When API response times exceeded 2 seconds, I implemented Redis caching, which reduced latency by 45%.',
            whyTamil: 'பொதுவான பதிலுக்கு பதிலாக, நீங்கள் எடுத்த குறிப்பிட்ட செயலையும் அதன் சதவீத பயனையும் சொல்லுங்கள்.',
          },
        },
        jumble: {
          tamilSentence: 'நான் தரவுத்தளத்தை மேம்படுத்தி செயல்திறனை நாற்பது சதவீதம் அதிகரித்தேன்.',
          scrambledWords: ['performance', 'database', 'the', 'by', 'optimized', 'I', 'increased', '40%', 'and'],
          correctWords: ['I', 'optimized', 'the', 'database', 'and', 'increased', 'performance', 'by', '40%'],
          hint: 'I + optimized + the database...',
        },
        translation: {
          tamilPrompt: '"இந்த சிக்கலை தீர்க்க நான் குழுவினருடன் இணைந்து பணியாற்றினேன்."',
          expectedEnglish: 'I collaborated closely with the team to resolve this issue.',
          options: [
            'I worked with team to solve problem.',
            'I collaborated closely with the team to resolve this issue.',
            'I did work along with my colleagues.',
          ],
          correctOptionIndex: 1,
          explanation: '"Collaborated closely to resolve" showcases professional leadership vocabulary.',
          tamilExplanation: '"Collaborated" மற்றும் "resolve" போன்ற சொற்கள் உங்களை முதிர்ச்சியான நிபுணராக காட்டும்.',
        },
        speakingChallenge: {
          prompt: 'Answer an interview question: Tell me about a time you handled a tight deadline.',
          missNovaQuestion: 'Could you share an example of how you handle working under tight deadlines?',
          suggestedAnswers: [
            'When our release deadline was moved forward by two weeks, I prioritized core features and coordinated daily check-ins to deliver on time.',
            'I break large tasks into smaller daily deliverables and maintain open communication with my lead.',
          ],
          sampleNativeResponse: 'During our Q4 launch, we faced an unexpected deadline shift. I prioritized MVP features, automated unit tests, and delivered the release ahead of schedule.',
        },
      },
    ],
  },
];

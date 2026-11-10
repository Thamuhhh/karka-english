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
  // =========================================================================
  // UNIT 1: THE FOUNDATION & EVERYDAY BASICS (Classes 1 - 5)
  // =========================================================================
  {
    levelNumber: 1,
    levelName: 'Unit 1: The Foundation & Basics',
    cefrTag: 'CEFR A1',
    badge: 'Foundation',
    accentColor: '#7F43FE',
    description: 'Eliminate hesitation, fix Tamil-English literal translations, and build your core sentence confidence.',
    classes: [
      {
        id: 'sn-1-1',
        levelNumber: 1,
        classNumber: 1,
        title: 'Class 1: Confident Self-Introduction',
        subtitle: 'Stop saying "Myself Alex" — sound natural & professional',
        duration: '6 mins',
        grammarTopic: 'Personal Pronouns + Present Simple',
        xpReward: 100,
        rule: {
          heading: 'Rule: Never Use "Myself" as the Subject',
          englishExplanation: '"Myself" is a reflexive pronoun. In introductions, always use "I am [Name]" or "My name is [Name]".',
          tamilMentalModel: 'தமிழில் "என்னோட பேரு..." என்பதை ஆங்கிலத்தில் "Myself..." என தவறாக சொல்லக் கூடாது. "Hi, I am..." அல்லது "My name is..." என்று தொடங்குவதே சரியான முறை.',
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
          tamilSentence: 'அவள் ஒவ்வொரு நாளும் அலுவலகத்திற்கு சரியான நேரத்தில் வருகிறாள்.',
          scrambledWords: ['office', 'on', 'comes', 'to', 'the', 'She', 'time', 'every', 'day'],
          correctWords: ['She', 'comes', 'to', 'the', 'office', 'on', 'time', 'every', 'day'],
          hint: 'Remember: She + comes (with "s")',
        },
        translation: {
          tamilPrompt: '"அவருக்கு உங்கள் ஃபோன் நம்பர் தெரியாது."',
          expectedEnglish: 'He doesn\'t know your phone number.',
          options: [
            'He don\'t know your phone number.',
            'He doesn\'t know your phone number.',
            'He not knowing your phone number.',
          ],
          correctOptionIndex: 1,
          explanation: 'Third person singular negative requires "does not" (doesn\'t) + base verb.',
          tamilExplanation: 'He-க்கு "doesn\'t know" தான் சரியான வடிவம்.',
        },
        speakingChallenge: {
          prompt: 'Tell Miss Nova what your best friend or colleague does every day.',
          missNovaQuestion: 'Tell me about someone you work or study with. What does that person do daily?',
          suggestedAnswers: [
            'My colleague Ravi writes clean code and attends team standup meetings every morning.',
            'My friend Priya manages product design and speaks with clients regularly.',
          ],
          sampleNativeResponse: 'My teammate Karthik leads our frontend development and coordinates daily with our QA team.',
        },
      },
      {
        id: 'sn-1-3',
        levelNumber: 1,
        classNumber: 3,
        title: 'Class 3: Ordering Food & Drinks at a Cafe',
        subtitle: 'Stop saying "Give me coffee" — use polite native requests',
        duration: '6 mins',
        grammarTopic: 'Modal Verbs: Can I get / Could I have',
        xpReward: 100,
        rule: {
          heading: 'Rule: Use "Can I get..." or "I would like..." for Polite Orders',
          englishExplanation: 'Direct commands like "Give me coffee" sound rude in English. Use polite inquiry structures like "Could I have..." or "Can I get...".',
          tamilMentalModel: 'தமிழில் "எனக்கு ஒரு காபி குடுங்க" என்பதை ஆங்கிலத்தில் "Give me coffee" என்று மொழிபெயர்த்தால் அது கடுமையாக ஒலிக்கும். "Could I please get..." என பணிவாக கேட்க வேண்டும்.',
          doAndDont: {
            wrong: 'Give me one hot coffee with sugar.',
            right: 'Could I please get a hot coffee with extra sugar?',
            whyTamil: '"Give me" ஆணை இடுவது போல இருக்கும்; "Could I please get" பணிவான கோரிக்கை.',
          },
        },
        jumble: {
          tamilSentence: 'எனக்கு சர்க்கரை இல்லாமல் ஒரு கப் பிளாக் காபி கிடைக்குமா?',
          scrambledWords: ['black', 'have', 'Could', 'I', 'a', 'cup', 'of', 'coffee', 'without', 'sugar?'],
          correctWords: ['Could', 'I', 'have', 'a', 'cup', 'of', 'black', 'coffee', 'without', 'sugar?'],
          hint: 'Start with polite modal: "Could I have..."',
        },
        translation: {
          tamilPrompt: '"பில் எவ்வளவு ஆனது என்று சொல்ல முடியுமா?"',
          expectedEnglish: 'Could you please bring us the bill?',
          options: [
            'Give the bill amount now.',
            'Could you please bring us the bill?',
            'What is the bill giving?',
          ],
          correctOptionIndex: 1,
          explanation: '"Could you please..." is the gold-standard polite request at restaurants.',
          tamilExplanation: 'பில் கேட்கும்போது "Could you please bring us the bill?" என்பது உலகளவில் நாகரிகமான வழி.',
        },
        speakingChallenge: {
          prompt: 'Imagine you are at Starbucks. Order your favorite drink and a snack.',
          missNovaQuestion: 'Welcome to Nova Cafe! What can I get started for you today?',
          suggestedAnswers: [
            'Hi! Could I please get a cold brew and a chocolate croissant?',
            'I would like an iced caramel latte with oat milk, please.',
          ],
          sampleNativeResponse: 'Hi there! Could I get a medium cappuccino with oat milk, and a warm croissant please?',
        },
      },
      {
        id: 'sn-1-4',
        levelNumber: 1,
        classNumber: 4,
        title: 'Class 4: Asking for Directions & Navigation',
        subtitle: 'How to ask strangers politely without getting lost',
        duration: '7 mins',
        grammarTopic: 'Indirect Questions: Excuse me, how do I get to...',
        xpReward: 100,
        rule: {
          heading: 'Rule: Always Prepend "Excuse me" and Use Indirect Phrasing',
          englishExplanation: 'Instead of "Where is metro station?", say "Excuse me, could you tell me how to get to the metro station?".',
          tamilMentalModel: 'அந்நியரிடம் வழிகேட்கும்போது "Excuse me" என்று ஆரம்பித்து, "Could you tell me how to get to..." என்று வினவ வேண்டும்.',
          doAndDont: {
            wrong: 'Where is metro? Tell fast.',
            right: 'Excuse me, could you please point me toward the nearest metro station?',
            whyTamil: 'அந்நியர்களிடம் நேரடியாகக் கேட்காமல் பணிவாக "Excuse me..." எனத் தொடங்குங்கள்.',
          },
        },
        jumble: {
          tamilSentence: 'மன்னிக்கவும், அருகிலுள்ள மருந்தகத்திற்கு எப்படி செல்வது என்று கூற முடியுமா?',
          scrambledWords: ['how', 'to', 'Excuse', 'me,', 'could', 'you', 'tell', 'me', 'the', 'pharmacy?', 'get', 'to'],
          correctWords: ['Excuse', 'me,', 'could', 'you', 'tell', 'me', 'how', 'to', 'get', 'to', 'the', 'pharmacy?'],
          hint: 'Start with "Excuse me, could you tell me..."',
        },
        translation: {
          tamilPrompt: '"அது இங்கிருந்து நடந்து செல்லும் தூரமா அல்லது ஆட்டோ பிடிக்க வேண்டுமா?"',
          expectedEnglish: 'Is it within walking distance, or should I take a cab?',
          options: [
            'Is it walk distance or auto going?',
            'Is it within walking distance, or should I take a cab?',
            'Walking possible or cab needed?',
          ],
          correctOptionIndex: 1,
          explanation: '"Within walking distance" is the authentic idiom used by native speakers.',
          tamilExplanation: '"Within walking distance" என்பது நடந்து செல்லக்கூடிய தூரத்தைக் குறிக்கும் சிறந்த ஆங்கில சொல்.',
        },
        speakingChallenge: {
          prompt: 'You just arrived at a new airport. Ask Miss Nova for directions to baggage claim.',
          missNovaQuestion: 'Hello traveler! You look like you need some help. Where are you heading?',
          suggestedAnswers: [
            'Excuse me! Could you tell me where baggage claim terminal 2 is located?',
            'Hi, could you point me toward the exit gate and taxi pickup area?',
          ],
          sampleNativeResponse: 'Excuse me! Could you point me in the direction of international baggage claim?',
        },
      },
      {
        id: 'sn-1-5',
        levelNumber: 1,
        classNumber: 5,
        title: 'Class 5: Shopping & Bargaining Politely',
        subtitle: 'Ask prices, sizes, and discounts like a pro',
        duration: '7 mins',
        grammarTopic: 'Demonstratives + How much does this cost',
        xpReward: 100,
        rule: {
          heading: 'Rule: "How much is this?" vs "How many"',
          englishExplanation: 'Price is uncountable: use "How much does this cost?". Quantity is countable: "How many items?".',
          tamilMentalModel: 'விலையைக் கேட்கும்போது எப்போதுமே "How much is this?" அல்லது "How much does it cost?" என்று மட்டுமே கேட்க வேண்டும்.',
          doAndDont: {
            wrong: 'How many price for this shirt?',
            right: 'How much does this shirt cost, and do you have it in medium?',
            whyTamil: 'விலை எண்ணிக்கையில் வராது, மதிப்பீடு என்பதால் "How much" தான் சரி.',
          },
        },
        jumble: {
          tamilSentence: 'இந்த சட்டையை நான் முயற்சித்துப் பார்க்க முடியுமா?',
          scrambledWords: ['Can', 'try', 'this', 'on', 'shirt', 'I', 'the', 'fitting', 'room?', 'in'],
          correctWords: ['Can', 'I', 'try', 'this', 'shirt', 'on', 'in', 'the', 'fitting', 'room?'],
          hint: 'Phrasal verb: "try this on"',
        },
        translation: {
          tamilPrompt: '"இதற்கு ஏதேனும் தள்ளுபடி அல்லது சலுகை உள்ளதா?"',
          expectedEnglish: 'Are there any ongoing discounts or offers on this product?',
          options: [
            'Any discount giving for this product?',
            'Are there any ongoing discounts or offers on this product?',
            'Is discount coming here?',
          ],
          correctOptionIndex: 1,
          explanation: '"Ongoing discounts or offers" is the standard retail phrase.',
          tamilExplanation: 'தள்ளுபடி இருக்கிறதா என்று கேட்க "Are there any ongoing discounts...?" என்பது மிக நாகரிகமான முறை.',
        },
        speakingChallenge: {
          prompt: 'You are shopping for shoes. Ask the shopkeeper if they have your size in black.',
          missNovaQuestion: 'Can I help you find anything specific in our shoe section today?',
          suggestedAnswers: [
            'Yes please! Do you have this pair in a size 9, preferably in black?',
            'Could you check if you have these sneakers in stock in size 10?',
          ],
          sampleNativeResponse: 'Yes, please! I love this design. Do you happen to carry this in a size 9 in black?',
        },
      },
    ],
  },

  // =========================================================================
  // UNIT 2: REAL-WORLD DAILY CONVERSATIONS (Classes 6 - 10)
  // =========================================================================
  {
    levelNumber: 2,
    levelName: 'Unit 2: Daily Fluency & Workplace Basics',
    cefrTag: 'CEFR A2',
    badge: 'Fluency',
    accentColor: '#0BB35A',
    description: 'Master phone etiquette, past tense storytelling, future commitments, and clear office communication.',
    classes: [
      {
        id: 'sn-2-1',
        levelNumber: 2,
        classNumber: 6,
        title: 'Class 6: Professional Phone Call Etiquette',
        subtitle: 'Never say "Who is talking?" — sound polished on calls',
        duration: '7 mins',
        grammarTopic: 'May I speak with / Who is calling please',
        xpReward: 120,
        rule: {
          heading: 'Rule: Use "May I ask who is calling?" instead of "Who are you?"',
          englishExplanation: 'On calls, "Who are you?" or "Who is this?" sounds aggressive. Use "May I ask who is calling?" or "Could you hold the line?".',
          tamilMentalModel: 'ஃபோன் பேசும்போது "யார் பேசுறது?" என்பதை "Who are you?" என்று கேட்டால் மரியாதைக் குறைவு. "May I ask who is calling, please?" என்று கேளுங்கள்.',
          doAndDont: {
            wrong: 'Who is this? Tell me what you want.',
            right: 'May I know who is speaking, and how I can help you today?',
            whyTamil: 'தொலைபேசியில் "May I know who is speaking..." என்பதே சர்வதேச கார்ப்பரேட் மரபு.',
          },
        },
        jumble: {
          tamilSentence: 'தயவுசெய்து ஒரு நிமிடம் இணைப்பில் இருங்கள், நான் அவரை அழைக்கிறேன்.',
          scrambledWords: ['hold', 'Please', 'the', 'moment,', 'line', 'for', 'a', 'I', 'will', 'transfer', 'you.'],
          correctWords: ['Please', 'hold', 'the', 'line', 'for', 'a', 'moment,', 'I', 'will', 'transfer', 'you.'],
          hint: 'Start with "Please hold the line..."',
        },
        translation: {
          tamilPrompt: '"அவர் தற்போது ஒரு கூட்டத்தில் இருக்கிறார், நீங்கள் ஏதேனும் தகவல் சொல்ல விரும்புகிறீர்களா?"',
          expectedEnglish: 'He is currently in a meeting. Would you like to leave a message?',
          options: [
            'He is meeting now, you want message?',
            'He is currently in a meeting. Would you like to leave a message?',
            'Meeting happening, give message.',
          ],
          correctOptionIndex: 1,
          explanation: '"Would you like to leave a message?" is standard professional secretary/colleague phrasing.',
          tamilExplanation: '"Would you like to leave a message?" என்பது செய்தி ஏதும் விட விரும்புகிறீர்களா என்பதற்கான தொழில்முறை வாக்கியம்.',
        },
        speakingChallenge: {
          prompt: 'Answer an incoming work call from Miss Nova and take a message for your manager.',
          missNovaQuestion: 'Hello! This is Sarah from the engineering team. May I speak with your manager Mr. Raman?',
          suggestedAnswers: [
            'Hi Sarah! Mr. Raman is in an executive meeting right now. Can I take a message for him?',
            'Hello Sarah. He just stepped out for a moment. Would you like him to call you back?',
          ],
          sampleNativeResponse: 'Good morning Sarah! Mr. Raman is currently tied up in a meeting. May I take a message or have him call you back?',
        },
      },
      {
        id: 'sn-2-2',
        levelNumber: 2,
        classNumber: 7,
        title: 'Class 7: Daily Routines & Prepositions (In/On/At)',
        subtitle: 'Master "at 9 AM", "on Monday", and "in the morning"',
        duration: '7 mins',
        grammarTopic: 'Time Prepositions: AT (Specific time), ON (Days), IN (Months/Years)',
        xpReward: 120,
        rule: {
          heading: 'Rule: The Pyramid of Time Prepositions',
          englishExplanation: 'AT = exact precise time (at 9:00, at noon). ON = days & dates (on Monday, on May 4th). IN = wider periods (in the morning, in 2026).',
          tamilMentalModel: 'AT = குறிப்பிட்ட நேரம் (at 9:30 AM). ON = கிழமைகள், தேதிகள் (on Sunday). IN = காலை/மாலை/வருடம் (in the evening, in 2026).',
          doAndDont: {
            wrong: 'I will meet you in Monday at the evening.',
            right: 'I will meet you on Monday in the evening at 6 PM.',
            whyTamil: 'நாட்களுக்கு "on", மாலைக்கு "in", நேரத்திற்கு "at" வர வேண்டும்.',
          },
        },
        jumble: {
          tamilSentence: 'நான் வழக்கமாக காலை 7 மணிக்கு எழுந்து உடற்பயிற்சி செய்கிறேன்.',
          scrambledWords: ['wake', 'usually', 'I', 'at', 'up', '7', 'AM', 'and', 'exercise.'],
          correctWords: ['I', 'usually', 'wake', 'up', 'at', '7', 'AM', 'and', 'exercise.'],
          hint: 'Order: Subject + Frequency Adverb + Verb + Time',
        },
        translation: {
          tamilPrompt: '"எங்கள் குழு ஒவ்வொரு வெள்ளிக்கிழமையும் மாலை 4 மணிக்கு கூடுகிறது."',
          expectedEnglish: 'Our team meets every Friday at 4 PM.',
          options: [
            'Our team meeting in Friday at 4 PM.',
            'Our team meets every Friday at 4 PM.',
            'Our team meet on every Friday in 4 PM.',
          ],
          correctOptionIndex: 1,
          explanation: '"Our team" is singular collective noun, requiring "meets". Specific time uses "at".',
          tamilExplanation: '"Our team meets every Friday at 4 PM" என்பதே இலக்கணப்படி பிழையற்ற வாக்கியம்.',
        },
        speakingChallenge: {
          prompt: 'Describe your typical morning routine from waking up to starting work.',
          missNovaQuestion: 'Walk me through your morning routine! What do you usually do before starting work or study?',
          suggestedAnswers: [
            'I usually wake up at 6:30 AM, drink a warm coffee, read for thirty minutes, and log in by 9 AM.',
            'My morning starts with a brisk walk, followed by breakfast and checking my priority emails.',
          ],
          sampleNativeResponse: 'I typically kick off my day around 6:30 AM, go for a quick jog, have breakfast, and start working by 9 AM.',
        },
      },
      {
        id: 'sn-2-3',
        levelNumber: 2,
        classNumber: 8,
        title: 'Class 8: Describing Past Events & Weekend Recaps',
        subtitle: 'Fix "I didn\'t went" & "Yesterday I seen" forever',
        duration: '8 mins',
        grammarTopic: 'Past Simple + Did + Base Verb',
        xpReward: 120,
        rule: {
          heading: 'Rule: "Did" Absorbs the Past — Always Use Base Verb After "Didn\'t"',
          englishExplanation: '"Did" is already past tense! Never use another past tense verb after it (I didn\'t go, NOT I didn\'t went).',
          tamilMentalModel: '"Didn\'t" வந்தாலே அதற்கு அடுத்து வரும் வினைச்சொல் முதல் வடிவில் (V1 base form) தான் இருக்க வேண்டும். "didn\'t went" தவறு; "didn\'t go" என்பதே சரி.',
          doAndDont: {
            wrong: 'I didn\'t went to the office yesterday because of rain.',
            right: 'I didn\'t go to the office yesterday because of heavy rain.',
            whyTamil: '"Didn\'t" வந்ததால் "go" தான் வர வேண்டும்; "went" வரக்கூடாது.',
          },
        },
        jumble: {
          tamilSentence: 'நாங்கள் கடந்த வாரம் ஒரு புதிய உணவகத்திற்கு சென்று இரவு உணவு சாப்பிட்டோம்.',
          scrambledWords: ['went', 'We', 'new', 'to', 'a', 'restaurant', 'had', 'and', 'dinner', 'last', 'week.'],
          correctWords: ['We', 'went', 'to', 'a', 'new', 'restaurant', 'and', 'had', 'dinner', 'last', 'week.'],
          hint: 'Past tense verbs: went & had',
        },
        translation: {
          tamilPrompt: '"நேற்று நடந்த விவாதத்தில் நீங்கள் ஏன் கலந்துகொள்ளவில்லை?"',
          expectedEnglish: 'Why didn\'t you attend the discussion yesterday?',
          options: [
            'Why you didn\'t came for discussion yesterday?',
            'Why didn\'t you attend the discussion yesterday?',
            'Why didn\'t you attended yesterday discussion?',
          ],
          correctOptionIndex: 1,
          explanation: '"Why didn\'t you attend" uses question inversion + base verb "attend".',
          tamilExplanation: '"Why didn\'t you attend..." என்பதே கேள்வி அமைப்பில் சரியான முறை.',
        },
        speakingChallenge: {
          prompt: 'Tell Miss Nova about something interesting you did last weekend.',
          missNovaQuestion: 'How was your weekend? Did you do anything exciting or relaxing?',
          suggestedAnswers: [
            'Last weekend, I went hiking with my friends in the hills and took lots of photos.',
            'I stayed home, cooked a traditional meal, and watched a great documentary on science.',
          ],
          sampleNativeResponse: 'I had a really refreshing weekend! I caught up on some reading and spent Sunday evening cooking with family.',
        },
      },
      {
        id: 'sn-2-4',
        levelNumber: 2,
        classNumber: 9,
        title: 'Class 9: Future Plans & Intentions (Going to vs Will)',
        subtitle: 'Decide like a native: spontaneous decision vs planned action',
        duration: '7 mins',
        grammarTopic: 'Future: BE GOING TO (Planned) vs WILL (Instant Decision/Offer)',
        xpReward: 120,
        rule: {
          heading: 'Rule: "Going to" for Pre-planned Actions; "Will" for Instant Choices',
          englishExplanation: 'If you already planned it before speaking, use "I am going to...". If you decide right now or make an offer, use "I will...".',
          tamilMentalModel: 'ஏற்கனவே முடிவுசெய்து திட்டமிட்ட காரியங்களுக்கு "I am going to..." பயன்படும். பேசும்போதே திடீரென முடிவெடுத்தால் "I will..." பயன்படும்.',
          doAndDont: {
            wrong: 'I will buy this laptop tomorrow, already booked it.',
            right: 'I am going to buy this laptop tomorrow; I already booked it.',
            whyTamil: 'முன்கூட்டியே திட்டமிட்டதால் "am going to" தான் இயற்கை.',
          },
        },
        jumble: {
          tamilSentence: 'அடுத்த மாதம் நான் ஒரு புதிய மென்பொருள் படிப்பை தொடங்கப் போகிறேன்.',
          scrambledWords: ['going', 'am', 'to', 'I', 'start', 'software', 'a', 'course', 'next', 'month.'],
          correctWords: ['I', 'am', 'going', 'to', 'start', 'a', 'software', 'course', 'next', 'month.'],
          hint: 'Be going to + start',
        },
        translation: {
          tamilPrompt: '"கவலைப்படாதீர்கள், நான் உங்களுக்கு அந்த ஆவணங்களை உடனே அனுப்புகிறேன்."',
          expectedEnglish: 'Don\'t worry, I will email those documents to you right away.',
          options: [
            'Don\'t worry, I will email those documents to you right away.',
            'No worry, I am going to email documents just now.',
            'Don\'t worry, I emailing those documents now.',
          ],
          correctOptionIndex: 0,
          explanation: 'Immediate helpful offer in conversation uses "I will...".',
          tamilExplanation: 'உடனடி உறுதிமொழிக்கு "I will email..." என்பதே பொருத்தமானது.',
        },
        speakingChallenge: {
          prompt: 'Tell Miss Nova what major skill or project you are going to focus on this year.',
          missNovaQuestion: 'What is your primary professional or personal goal for the upcoming months?',
          suggestedAnswers: [
            'I am going to achieve fluent English communication and lead client meetings with total confidence.',
            'I am planning to build my own mobile startup application and launch it on Google Play.',
          ],
          sampleNativeResponse: 'Over the next few months, I am going to master conversational English and take on more client-facing responsibilities.',
        },
      },
      {
        id: 'sn-2-5',
        levelNumber: 2,
        classNumber: 10,
        title: 'Class 10: Expressing Opinions in Workplace Meetings',
        subtitle: 'Share your perspective without sounding blunt or hesitant',
        duration: '8 mins',
        grammarTopic: 'Opinion Frameworks: In my view / From my perspective',
        xpReward: 120,
        rule: {
          heading: 'Rule: Soften Your Statements with Strategic Diplomatic Openers',
          englishExplanation: 'Instead of bluntly saying "This idea is bad", say "From my perspective, this approach might face scalability challenges".',
          tamilMentalModel: 'அலுவலகக் கூட்டங்களில் நேரடியாக "இது தப்பு" என்று சொல்லாமல், "From my perspective..." அல்லது "In my opinion..." என்று மென்மையாகத் தொடங்க வேண்டும்.',
          doAndDont: {
            wrong: 'Your idea will not work at all.',
            right: 'From my perspective, that approach might run into budget constraints.',
            whyTamil: 'கார்ப்பரேட் விவாதங்களில் "From my perspective..." என்பது ராஜதந்திரமான அணுகுமுறை.',
          },
        },
        jumble: {
          tamilSentence: 'என் கருத்துப்படி, நாம் முதலில் வாடிக்கையாளர் பின்னூட்டத்திற்கு முன்னுரிமை அளிக்க வேண்டும்.',
          scrambledWords: ['opinion,', 'In', 'my', 'we', 'should', 'prioritize', 'user', 'feedback', 'first.'],
          correctWords: ['In', 'my', 'opinion,', 'we', 'should', 'prioritize', 'user', 'feedback', 'first.'],
          hint: 'Start with "In my opinion..."',
        },
        translation: {
          tamilPrompt: '"நீங்கள் சொல்வது புரிகிறது, ஆனால் நாம் காலக்கெடுவையும் கவனிக்க வேண்டும்."',
          expectedEnglish: 'I see your point, but we also need to keep the deadline in mind.',
          options: [
            'I see your point, but we also need to keep the deadline in mind.',
            'I understand you, but deadline is there.',
            'Your point is seeing, but time is short.',
          ],
          correctOptionIndex: 0,
          explanation: '"I see your point, but..." is the definitive professional agreement-disagreement bridge.',
          tamilExplanation: '"I see your point, but..." என்பது மற்றவர் கருத்தை மதித்து தன் கருத்தை வைக்கும் முறை.',
        },
        speakingChallenge: {
          prompt: 'In a team meeting, suggest whether remote work or in-office work is better for productivity.',
          missNovaQuestion: 'In your view, does working remotely help team productivity, or do you prefer working in an office?',
          suggestedAnswers: [
            'From my perspective, hybrid work offers the best balance: focus time at home and collaboration in the office.',
            'In my view, remote work saves commuting hours and allows engineers to produce higher quality code.',
          ],
          sampleNativeResponse: 'From my perspective, a hybrid model strikes the perfect balance between deep individual focus and team synergy.',
        },
      },
    ],
  },

  // =========================================================================
  // UNIT 3: CAREER & PROFESSIONAL MASTERY (Classes 11 - 16)
  // =========================================================================
  {
    levelNumber: 3,
    levelName: 'Unit 3: Career & Situational Mastery',
    cefrTag: 'CEFR B1',
    badge: 'Career',
    accentColor: '#12BBF2',
    description: 'Nail job interviews, handle escalations, speak comfortably with doctors, banks, and airports.',
    classes: [
      {
        id: 'sn-3-1',
        levelNumber: 3,
        classNumber: 11,
        title: 'Class 11: Apologizing & Handling Project Delays',
        subtitle: 'Turn mistakes into professional trust using accountability language',
        duration: '8 mins',
        grammarTopic: 'Accountability & Future Prevention: I sincerely apologize for...',
        xpReward: 150,
        rule: {
          heading: 'Rule: The 3-Part Professional Apology Formula',
          englishExplanation: 'Part 1: Own it ("I sincerely apologize for the delay"). Part 2: Give the reason without whining. Part 3: State the resolution.',
          tamilMentalModel: 'வெறுமனே "Sorry" என்று சொல்லாமல், தவறை ஒப்புக்கொண்டு மாற்றுத் தீர்வையும் சேர்த்துச் சொல்வதே தொழில்முறை முதிர்ச்சி.',
          doAndDont: {
            wrong: 'Sorry sir, server problem, not my fault.',
            right: 'I sincerely apologize for the delay. We encountered an unexpected server issue, but it is now resolved.',
            whyTamil: 'தவறை காரணங்கள் சொல்லித் தட்டிக்கழிக்காமல் பொறுப்புடன் தீர்வைக் கூற வேண்டும்.',
          },
        },
        jumble: {
          tamilSentence: 'இந்த தாமதத்தால் ஏற்பட்ட சிரமத்திற்கு நான் மனதார வருந்துகிறேன்.',
          scrambledWords: ['sincerely', 'I', 'apologize', 'for', 'any', 'inconvenience', 'this', 'delay', 'has', 'caused.'],
          correctWords: ['I', 'sincerely', 'apologize', 'for', 'any', 'inconvenience', 'this', 'delay', 'has', 'caused.'],
          hint: 'Start with "I sincerely apologize..."',
        },
        translation: {
          tamilPrompt: '"இன்று மாலை 5 மணிக்குள் முழு அறிக்கையையும் சமர்ப்பிக்கிறேன்."',
          expectedEnglish: 'I will submit the finalized report by 5 PM today.',
          options: [
            'I will submit the finalized report by 5 PM today.',
            'Report is coming by 5 evening.',
            'I submitting full report at 5 PM today.',
          ],
          correctOptionIndex: 0,
          explanation: '"By 5 PM" means at or before 5 PM, which indicates professional precision.',
          tamilExplanation: '"By 5 PM" என்பது குறிப்பிட்ட நேரத்திற்கு முன்னதாகவே முடித்துக் கொடுப்பதைக் குறிக்கும்.',
        },
        speakingChallenge: {
          prompt: 'Your client is upset about a 2-hour delay in report delivery. Calm them down professionally.',
          missNovaQuestion: 'I was expecting this financial report this morning! Why is it delayed?',
          suggestedAnswers: [
            'I sincerely apologize for the inconvenience. We were double-checking the audit numbers, and I am sending it right now.',
            'I completely understand your concern. We had an unexpected verification step, but the final file is on its way.',
          ],
          sampleNativeResponse: 'I sincerely apologize for the delay! We wanted to ensure every figure was thoroughly verified. You will have it in your inbox within 10 minutes.',
        },
      },
      {
        id: 'sn-3-2',
        levelNumber: 3,
        classNumber: 12,
        title: 'Class 12: Doctor Visit & Describing Health Symptoms',
        subtitle: 'Describe pain, duration, and medical history accurately',
        duration: '8 mins',
        grammarTopic: 'Present Perfect Continuous: I have been experiencing...',
        xpReward: 150,
        rule: {
          heading: 'Rule: Use "I have been having..." to Describe Ongoing Symptoms',
          englishExplanation: 'For symptoms that started in the past and continue right now, use "I have been experiencing a mild headache since yesterday".',
          tamilMentalModel: 'நேற்றிலிருந்து தொடர்ந்து இருக்கும் உடல் உபாதைகளுக்கு "I have been feeling / experiencing..." என்று சொல்ல வேண்டும்.',
          doAndDont: {
            wrong: 'From yesterday I am having severe fever.',
            right: 'I have been running a high fever since yesterday evening.',
            whyTamil: '"From yesterday I am having" என்பது தவறான மொழிபெயர்ப்பு; "since yesterday" என்பதுதான் சரி.',
          },
        },
        jumble: {
          tamilSentence: 'எனக்கு கடந்த மூன்று நாட்களாக தொண்டை வலி மற்றும் லேசான இருமல் உள்ளது.',
          scrambledWords: ['had', 'I', 'have', 'a', 'sore', 'throat', 'and', 'mild', 'cough', 'for', 'three', 'days.'],
          correctWords: ['I', 'have', 'had', 'a', 'sore', 'throat', 'and', 'mild', 'cough', 'for', 'three', 'days.'],
          hint: 'Present perfect: I have had...',
        },
        translation: {
          tamilPrompt: '"இந்த மருந்தை உணவு சாப்பிட்ட பிறகு எடுத்துக்கொள்ள வேண்டுமா?"',
          expectedEnglish: 'Should I take this medication before or after meals?',
          options: [
            'Should I take this medication before or after meals?',
            'Food eating after this tablet taking?',
            'Must I eat this medicine with food?',
          ],
          correctOptionIndex: 0,
          explanation: '"Should I take this medication before or after meals?" is exact medical English.',
          tamilExplanation: 'மருத்துவரிடம் மருந்து உட்கொள்ளும் முறையைக் கேட்க இதுவே சரியான வாக்கியம்.',
        },
        speakingChallenge: {
          prompt: 'You are visiting Dr. Nova for a checkup. Explain your symptoms clearly.',
          missNovaQuestion: 'Good morning! What seems to be the problem today? How long have you been feeling unwell?',
          suggestedAnswers: [
            'Good morning doctor. I have been having a persistent migraine and dizziness since Tuesday.',
            'I have had a sharp pain in my lower back since yesterday after lifting heavy boxes.',
          ],
          sampleNativeResponse: 'Good morning Dr. Nova! I have been experiencing a nagging headache and fatigue over the past three days.',
        },
      },
      {
        id: 'sn-3-3',
        levelNumber: 3,
        classNumber: 13,
        title: 'Class 13: Banking & Financial Transactions',
        subtitle: 'Resolve card blocks, transfer issues, and account queries',
        duration: '8 mins',
        grammarTopic: 'Passive Voice: My card has been blocked / A transaction was deducted',
        xpReward: 150,
        rule: {
          heading: 'Rule: Use Passive Voice When the System/Bank Took the Action',
          englishExplanation: 'When money was deducted or a card was blocked automatically, use passive: "An amount of ₹5000 was debited from my account".',
          tamilMentalModel: 'பணம் தானாக கழிக்கப்படும்போது அல்லது கார்டு பிளாக் ஆகும்போது "My card has been blocked" என Passive Voice-ல் கூற வேண்டும்.',
          doAndDont: {
            wrong: 'Bank cut my money two times.',
            right: 'The transaction amount was debited twice from my account.',
            whyTamil: '"Money cut" என்பது கொச்சைத் தமிழ் மொழிபெயர்ப்பு; "amount was debited" என்பதே அதிகாரப்பூர்வ ஆங்கிலம்.',
          },
        },
        jumble: {
          tamilSentence: 'எனது கணக்கிலிருந்து தொகை கழிக்கப்பட்டது, ஆனால் பரிவர்த்தனை தோல்வியடைந்தது.',
          scrambledWords: ['amount', 'The', 'was', 'debited,', 'but', 'the', 'merchant', 'transaction', 'failed.'],
          correctWords: ['The', 'amount', 'was', 'debited,', 'but', 'the', 'merchant', 'transaction', 'failed.'],
          hint: 'Passive structure: The amount was debited...',
        },
        translation: {
          tamilPrompt: '"எனது கிரெடிட் கார்டு தொலைந்துவிட்டது, அதை உடனடியாக முடக்க முடியுமா?"',
          expectedEnglish: 'I have misplaced my credit card. Could you please block it immediately?',
          options: [
            'My card lost, block fast.',
            'I have misplaced my credit card. Could you please block it immediately?',
            'Credit card missing, please to close it.',
          ],
          correctOptionIndex: 1,
          explanation: '"Misplaced my card" sounds refined and responsible.',
          tamilExplanation: 'கார்டு தொலைந்துவிட்டால் "I have misplaced my card" என்று தெரிவிப்பதே நாகரிகம்.',
        },
        speakingChallenge: {
          prompt: 'Call bank customer care (Miss Nova) to report an unauthorized transaction.',
          missNovaQuestion: 'Thank you for calling NovaBank support. How may I assist you today?',
          suggestedAnswers: [
            'Hi! I noticed an unauthorized charge of ₹2,500 on my account this morning. Could you please look into it?',
            'Hello, I just received an OTP for a transaction I never initiated. Please freeze my card immediately.',
          ],
          sampleNativeResponse: 'Hello! I am calling to report an unauthorized debit of ₹2,500 on my card that took place earlier today.',
        },
      },
      {
        id: 'sn-3-4',
        levelNumber: 3,
        classNumber: 14,
        title: 'Class 14: Job Interview: "Tell Me About Yourself"',
        subtitle: 'The Present-Past-Future framework to win any interview',
        duration: '9 mins',
        grammarTopic: 'Present-Past-Future Interview Storytelling Structure',
        xpReward: 150,
        rule: {
          heading: 'Rule: The 3-Beat Interview Framework (Present -> Past -> Future)',
          englishExplanation: '1. Present: Who you are & current role. 2. Past: Key accomplishments & trajectory. 3. Future: Why this specific company excites you.',
          tamilMentalModel: 'நேர்காணலில் "என்னைப்பற்றி" கூறும்போது: தற்போதைய பணி (Present) -> முந்தைய சாதனைகள் (Past) -> இந்நிறுவனத்தில் சேர ஆர்வம் (Future) என்ற 3 அடுக்குகளைப் பயன்படுத்தவும்.',
          doAndDont: {
            wrong: 'I was born in Trichy, my father is teacher, my hobbies cricket.',
            right: 'I am currently a frontend engineer at XYZ Corp where I build high-traffic React Native apps.',
            whyTamil: 'பயோடேட்டாவை ஒப்பித்துக்கொண்டு இருக்காமல், உங்கள் தொழில்முறை திறனை முன்னிலைப்படுத்துங்கள்.',
          },
        },
        jumble: {
          tamilSentence: 'நான் கடந்த மூன்று வருடங்களாக அளவிடக்கூடிய மொபைல் செயலிகளை உருவாக்கி வருகிறேன்.',
          scrambledWords: ['have', 'I', 'been', 'building', 'scalable', 'mobile', 'applications', 'for', 'three', 'years.'],
          correctWords: ['I', 'have', 'been', 'building', 'scalable', 'mobile', 'applications', 'for', 'three', 'years.'],
          hint: 'Present perfect continuous: I have been building...',
        },
        translation: {
          tamilPrompt: '"இந்த வேலைவாய்ப்பு எனது நீண்டகால தொழில்முறை இலக்குகளுடன் முழுமையாக ஒத்துப்போகிறது."',
          expectedEnglish: 'This opportunity aligns perfectly with my long-term career aspirations.',
          options: [
            'This job is matching my future thinking.',
            'This opportunity aligns perfectly with my long-term career aspirations.',
            'This vacancy connects my goals.',
          ],
          correctOptionIndex: 1,
          explanation: '"Aligns perfectly with my career aspirations" is high-impact executive vocabulary.',
          tamilExplanation: '"Aligns perfectly with my aspirations" என்பது நேர்காணலில் அதிக மதிப்பு தரும் உயர்நிலை ஆங்கிலம்.',
        },
        speakingChallenge: {
          prompt: 'Deliver your 60-second elevator pitch to Miss Nova (Hiring Manager).',
          missNovaQuestion: 'Welcome to your interview round! To get started, could you walk me through your background and experience?',
          suggestedAnswers: [
            'Certainly! I am a full-stack engineer with 3 years of experience specializing in high-performance React Native and AI interfaces.',
            'Thank you for having me. Over the past 4 years, I have led software development teams creating seamless customer apps.',
          ],
          sampleNativeResponse: 'Certainly! I am a software engineer with 3 years of experience specializing in React Native and scalable mobile architectures.',
        },
      },
      {
        id: 'sn-3-5',
        levelNumber: 3,
        classNumber: 15,
        title: 'Class 15: Job Interview: Strengths & Weaknesses',
        subtitle: 'Turn weaknesses into positive growth stories effortlessly',
        duration: '9 mins',
        grammarTopic: 'Contrastive Connectors: While I used to... I now actively...',
        xpReward: 150,
        rule: {
          heading: 'Rule: Never State an Unresolved Weakness — Always Pair with Growth',
          englishExplanation: 'Structure your weakness as: Past tendency -> Awareness -> Corrective system you built.',
          tamilMentalModel: '"எனக்கு கோபம் வரும் / சோம்பேறித்தனம் உண்டு" என்று கூறக்கூடாது. "முன்பு பல வேலைகளை ஒரே நேரத்தில் எடுத்துக்கொள்வேன், ஆனால் இப்போது Trello போன்ற கருவிகளால் திட்டமிட்டு முடிக்கிறேன்" என்று வளர்ச்சியைக் காட்ட வேண்டும்.',
          doAndDont: {
            wrong: 'My weakness is that I am a perfectionist and work too hard.',
            right: 'In the past, I found it hard to delegate tasks, but I have now developed frameworks to trust teammates.',
            whyTamil: 'பொய்யான பெருமைகளைத் தவிர்த்து, உண்மையான முன்னேற்றத்தைக் காட்டுங்கள்.',
          },
        },
        jumble: {
          tamilSentence: 'எனது மிகப்பெரிய பலம், சவாலான சூழ்நிலைகளில் அமைதியாக இருந்து தீர்வு காண்பது.',
          scrambledWords: ['My', 'greatest', 'strength', 'is', 'staying', 'composed', 'and', 'finding', 'solutions', 'under', 'pressure.'],
          correctWords: ['My', 'greatest', 'strength', 'is', 'staying', 'composed', 'and', 'finding', 'solutions', 'under', 'pressure.'],
          hint: 'Start with "My greatest strength is staying composed..."',
        },
        translation: {
          tamilPrompt: '"நான் ஆக்கபூர்வமான கருத்துக்களை ஏற்று என்னை மெருகேற்றிக் கொள்ள விரும்புகிறேன்."',
          expectedEnglish: 'I actively welcome constructive feedback to continually refine my skills.',
          options: [
            'I like when people tell my mistakes.',
            'I actively welcome constructive feedback to continually refine my skills.',
            'Give me advice and I will change.',
          ],
          correctOptionIndex: 1,
          explanation: '"Constructive feedback" and "continually refine" demonstrate high emotional intelligence.',
          tamilExplanation: '"Constructive feedback" என்பது ஆக்கபூர்வமான வழிகாட்டுதலைக் குறிக்கும் உன்னத சொல்.',
        },
        speakingChallenge: {
          prompt: 'Answer the classic question: "What is your biggest weakness and how are you addressing it?"',
          missNovaQuestion: 'What would you say is an area you are actively working to improve in your professional work?',
          suggestedAnswers: [
            'Historically, I hesitated to speak in public forums, so I enrolled in speaking clubs and now present monthly webinars.',
            'Early in my career, I struggled with delegation. I now use project management boards to distribute tasks transparently.',
          ],
          sampleNativeResponse: 'In the past, I sometimes took on too much at once. To address this, I now prioritize ruthlessly using agile sprints.',
        },
      },
      {
        id: 'sn-3-6',
        levelNumber: 3,
        classNumber: 16,
        title: 'Class 16: Airport, Boarding & International Travel',
        subtitle: 'Check-in, baggage allowances, customs & gate transfers',
        duration: '8 mins',
        grammarTopic: 'Airport Vocabulary & Inquiries: Which gate is flight departing from?',
        xpReward: 150,
        rule: {
          heading: 'Rule: Master Travel Collocations (Boarding Pass, Overhead Bin, Layover)',
          englishExplanation: 'Learn precise airport terms: "layover" (transit stop), "boarding pass" (flight ticket), "carousel" (baggage belt).',
          tamilMentalModel: 'விமான நிலையங்களில் "Baggage drop", "Boarding gate", "Connecting flight" போன்ற சரியான சொற்களைத் தயக்கமின்றி உபயோகியுங்கள்.',
          doAndDont: {
            wrong: 'Where my airplane standing?',
            right: 'Excuse me, which gate is flight AI-102 currently boarding from?',
            whyTamil: 'விமான நிலையத்தில் "Which gate is flight... boarding from?" என்பது துல்லியமான வினா.',
          },
        },
        jumble: {
          tamilSentence: 'எனக்கு சாளர இருக்கை (Window seat) கிடைக்குமா அல்லது நடு இருக்கை மட்டும்தானா?',
          scrambledWords: ['Is', 'it', 'possible', 'to', 'get', 'a', 'window', 'seat', 'for', 'this', 'flight?'],
          correctWords: ['Is', 'it', 'possible', 'to', 'get', 'a', 'window', 'seat', 'for', 'this', 'flight?'],
          hint: 'Start with "Is it possible to get..."',
        },
        translation: {
          tamilPrompt: '"எனது அடுத்த இணைப்பு விமானத்திற்கு 45 நிமிடங்கள் மட்டுமே உள்ளது."',
          expectedEnglish: 'I only have a 45-minute layover for my connecting flight.',
          options: [
            'My next flight time is 45 minutes only.',
            'I only have a 45-minute layover for my connecting flight.',
            'Connecting flight is 45 minutes fast.',
          ],
          correctOptionIndex: 1,
          explanation: '"Layover for connecting flight" is standard aviation terminology.',
          tamilExplanation: 'இடைப்பட்ட நேரத்திற்கு "layover" என்ற ஆங்கில சொல்லைப் பயன்படுத்தவும்.',
        },
        speakingChallenge: {
          prompt: 'You are at international immigration. Answer Miss Nova\'s (Border Officer) questions.',
          missNovaQuestion: 'Good afternoon. What is the purpose of your visit, and how long do you plan to stay in the country?',
          suggestedAnswers: [
            'Good afternoon officer! I am visiting for a two-week tech conference, and I have a return ticket for the 18th.',
            'I am traveling for leisure with my family. We will be staying in London for ten days.',
          ],
          sampleNativeResponse: 'Good afternoon officer! I am traveling to attend an international AI conference for two weeks, returning on the 24th.',
        },
      },
    ],
  },

  // =========================================================================
  // UNIT 4: ADVANCED FLUENCY & NATIVE SPEAKING (Classes 17 - 22)
  // =========================================================================
  {
    levelNumber: 4,
    levelName: 'Unit 4: Advanced Native Fluency & Debates',
    cefrTag: 'CEFR B2 - C1',
    badge: 'Mastery',
    accentColor: '#F8D46A',
    description: 'Speak spontaneously, debate respectfully, present high-level pitches, and sound like a natural native speaker.',
    classes: [
      {
        id: 'sn-4-1',
        levelNumber: 4,
        classNumber: 17,
        title: 'Class 17: Hotel Check-In & Service Requests',
        subtitle: 'Upgrade rooms, request amenities, and report room issues',
        duration: '8 mins',
        grammarTopic: 'Conditional Politeness: Would it be possible to...',
        xpReward: 200,
        rule: {
          heading: 'Rule: Use Conditional Subjunctive for VIP Hotel Treatment',
          englishExplanation: '"Would it be possible to get a complimentary room upgrade?" is far more effective than "Can you give me bigger room?".',
          tamilMentalModel: 'ஹோட்டல் மேனேஜரிடம் பேசும்போது "Would it be possible to..." என வினவுவது அதிக வரவேற்பைப் பெற்றுத் தரும்.',
          doAndDont: {
            wrong: 'Give me high floor room with sea view.',
            right: 'Would it be possible to get a room on a higher floor with a nice view?',
            whyTamil: 'பணிவான வேண்டுகோள் எப்போதுமே சிறந்த அறையை பெற்றுத் தரும்.',
          },
        },
        jumble: {
          tamilSentence: 'நாளை காலை எனக்கு தாமதமாக செக்-அவுட் செய்ய அனுமதி கிடைக்குமா?',
          scrambledWords: ['Could', 'we', 'possibly', 'request', 'a', 'late', 'check-out', 'tomorrow', 'at', '2', 'PM?'],
          correctWords: ['Could', 'we', 'possibly', 'request', 'a', 'late', 'check-out', 'tomorrow', 'at', '2', 'PM?'],
          hint: 'Start with "Could we possibly request..."',
        },
        translation: {
          tamilPrompt: '"எங்கள் அறையில் ஏர் கண்டிஷனர் சரியாக வேலை செய்யவில்லை."',
          expectedEnglish: 'The air conditioning in our room appears to be malfunctioning.',
          options: [
            'AC not coming cool air.',
            'The air conditioning in our room appears to be malfunctioning.',
            'Room is hot because AC dead.',
          ],
          correctOptionIndex: 1,
          explanation: '"Appears to be malfunctioning" is refined, non-confrontational phrasing.',
          tamilExplanation: '"Malfunctioning" என்பது இயந்திரப் பழுதை நாகரிகமாக சுட்டிக்காட்டும் சொல்.',
        },
        speakingChallenge: {
          prompt: 'You arrive at Hotel Nova at 11 AM before normal check-in (2 PM). Request early check-in.',
          missNovaQuestion: 'Welcome to Hotel Nova! Normal check-in begins at 2 PM. How can I help you today?',
          suggestedAnswers: [
            'Hi! We just arrived on an early flight. Would it be possible to check in early if a room is available?',
            'Good morning! Could we store our bags with the concierge until our room is ready?',
          ],
          sampleNativeResponse: 'Good morning! Our flight landed early. Would it be possible to check in now if a room is already clean and vacant?',
        },
      },
      {
        id: 'sn-4-2',
        levelNumber: 4,
        classNumber: 18,
        title: 'Class 18: Corporate Networking & Small Talk',
        subtitle: 'Break awkward silences with natural icebreaker questions',
        duration: '8 mins',
        grammarTopic: 'Open-Ended Conversational Questions: What brings you to...',
        xpReward: 200,
        rule: {
          heading: 'Rule: Ask Open-Ended "What" and "How" Questions, Not Yes/No Queries',
          englishExplanation: 'Instead of "Do you like the conference?" (Yes/No), ask "What has been the most interesting session for you so far?".',
          tamilMentalModel: 'நெட்வொர்க்கிங்கில் "ஆமாம் / இல்லை" என்று பதில் வரும்படி கேட்காமல், அவர் விரிவாக பேசக்கூடிய திறந்த கேள்விகளைக் கேளுங்கள்.',
          doAndDont: {
            wrong: 'Are you working in IT? Yes or no?',
            right: 'What kind of projects are you currently working on at your firm?',
            whyTamil: 'திறந்த கேள்விகள் உரையாடலை சுவாரஸ்யமாக தொடர வைக்கும்.',
          },
        },
        jumble: {
          tamilSentence: 'இந்த கருத்தரங்கில் நீங்கள் அதிகம் எதிர்பார்த்த தலைப்பு எது?',
          scrambledWords: ['Which', 'session', 'are', 'you', 'most', 'looking', 'forward', 'to', 'today?'],
          correctWords: ['Which', 'session', 'are', 'you', 'most', 'looking', 'forward', 'to', 'today?'],
          hint: 'Looking forward to + noun',
        },
        translation: {
          tamilPrompt: '"உங்களுடன் பேசியதில் மிக்க மகிழ்ச்சி, நாம் லிங்க்ட்இனில் இணைந்திருக்கலாமா?"',
          expectedEnglish: 'It was great chatting with you! Shall we connect on LinkedIn?',
          options: [
            'Talk over, give your LinkedIn.',
            'It was great chatting with you! Shall we connect on LinkedIn?',
            'Very happy speaking, LinkedIn connection doing?',
          ],
          correctOptionIndex: 1,
          explanation: '"Shall we connect on LinkedIn?" is the gold standard for ending a networking conversation.',
          tamilExplanation: 'வணிகத் தொடர்பை நீட்டிக்க "Shall we connect on LinkedIn?" என்பதே உலகளாவிய முறை.',
        },
        speakingChallenge: {
          prompt: 'At a tech mixer, introduce yourself to Miss Nova (Keynote Speaker) and discuss her talk.',
          missNovaQuestion: 'Hi there! Did you get a chance to catch my morning keynote on generative AI?',
          suggestedAnswers: [
            'Yes I did! I found your insights on conversational agents truly inspiring. My name is Alex.',
            'It was fantastic! Your point about bilingual learning models really resonated with my current work.',
          ],
          sampleNativeResponse: 'I did! Your perspective on practical AI agents was incredible. I am Alex, working on mobile NLP solutions.',
        },
      },
      {
        id: 'sn-4-3',
        levelNumber: 4,
        classNumber: 19,
        title: 'Class 19: Agreeing & Disagreeing Politely in Debates',
        subtitle: 'Challenge someone\'s viewpoint with elegance & data',
        duration: '9 mins',
        grammarTopic: 'Concession Clauses: While I agree that... I would argue that...',
        xpReward: 200,
        rule: {
          heading: 'Rule: The "Agree First, Pivot Second" Protocol',
          englishExplanation: 'Acknowledge their merit before pivoting: "I completely understand that perspective, however, we should also examine the latency implications".',
          tamilMentalModel: 'விவாதத்தில் அடுத்தவர் கருத்தை நிராகரிக்கும் முன் "நீங்கள் சொல்வதில் நியாயம் இருக்கிறது, ஆயினும்..." என இணைப்பை ஏற்படுத்துங்கள்.',
          doAndDont: {
            wrong: 'You are totally wrong about this architecture.',
            right: 'You make a valid point about simplicity, but I would argue that microservices offer better fault isolation.',
            whyTamil: 'அடுத்தவர் கருத்தை மட்டந்தட்டாமல் விவாதிப்பதே முதிர்ச்சியான தலைவரின் அடையாளம்.',
          },
        },
        jumble: {
          tamilSentence: 'அந்த அணுகுமுறையின் நன்மைகளை நான் ஒப்புக்கொள்கிறேன், ஆயினும் அபாயங்களை நாம் தவிர்க்க முடியாது.',
          scrambledWords: ['I', 'acknowledge', 'the', 'merits,', 'yet', 'we', 'cannot', 'overlook', 'the', 'associated', 'risks.'],
          correctWords: ['I', 'acknowledge', 'the', 'merits,', 'yet', 'we', 'cannot', 'overlook', 'the', 'associated', 'risks.'],
          hint: 'Concession: I acknowledge the merits, yet...',
        },
        translation: {
          tamilPrompt: '"நாம் இருவரும் ஒரே கருத்தைக் கொண்டிருக்கவில்லை என்றாலும், உங்கள் சிந்தனையை நான் பாராட்டுகிறேன்."',
          expectedEnglish: 'We may agree to disagree on this, but I truly appreciate your thoughtful perspective.',
          options: [
            'We don\'t match thoughts, but your thinking good.',
            'We may agree to disagree on this, but I truly appreciate your thoughtful perspective.',
            'No agree between us, but thank you.',
          ],
          correctOptionIndex: 1,
          explanation: '"Agree to disagree" and "appreciate your thoughtful perspective" are hallmarks of high-level diplomacy.',
          tamilExplanation: '"Agree to disagree" என்பது இருவேறு கருத்துக்கள் இருந்தாலும் பரஸ்பர மரியாதையைக் குறிக்கும் மரபுத்தொடர்.',
        },
        speakingChallenge: {
          prompt: 'Debate with Miss Nova: She thinks AI will replace junior developers within 2 years. Share your counter-argument.',
          missNovaQuestion: 'In my opinion, code generators are so powerful that companies won\'t need to hire junior engineers anymore. What do you think?',
          suggestedAnswers: [
            'I see your point about automation, but junior engineers bring fresh problem-solving perspectives and grow into senior leaders.',
            'While AI writes code quickly, understanding human user requirements and business nuances will always require human developers.',
          ],
          sampleNativeResponse: 'I understand why it might seem that way, but junior engineers learn by debugging AI output. We will always need that pipeline of creative human talent.',
        },
      },
      {
        id: 'sn-4-4',
        levelNumber: 4,
        classNumber: 20,
        title: 'Class 20: Giving Strategic Advice & Guidance',
        subtitle: 'Advise colleagues & friends without sounding bossy',
        duration: '8 mins',
        grammarTopic: 'Advisory Modals: You might want to consider... Have you thought about...',
        xpReward: 200,
        rule: {
          heading: 'Rule: Frame Advice as Options, Not Commands',
          englishExplanation: 'Instead of "You must do this", frame it as an invitation to think: "Have you considered exploring React Native instead?".',
          tamilMentalModel: 'ஆலோசனை தரும்போது "நீ இதை கட்டாயம் செய்" என்று கட்டளையிடாமல், "இப்படி செய்தால் நன்றாக இருக்குமே என்று யோசித்தீர்களா?" என்று பரிந்துரைக்க வேண்டும்.',
          doAndDont: {
            wrong: 'You must change your code right now.',
            right: 'You might want to consider refactoring this module to improve its test coverage.',
            whyTamil: '"You might want to consider..." என்பது கட்டளையாக இல்லாமல் நல்ல பரிந்துரையாக அமையும்.',
          },
        },
        jumble: {
          tamilSentence: 'நீங்கள் இறுதி முடிவெடுப்பதற்கு முன் மூத்த வழிகாட்டியிடம் ஆலோசனை கேட்பது நல்லது.',
          scrambledWords: ['It', 'might', 'be', 'wise', 'to', 'consult', 'a', 'senior', 'mentor', 'before', 'deciding.'],
          correctWords: ['It', 'might', 'be', 'wise', 'to', 'consult', 'a', 'senior', 'mentor', 'before', 'deciding.'],
          hint: 'Advisory pattern: It might be wise to...',
        },
        translation: {
          tamilPrompt: '"உங்கள் விண்ணப்பத்தை அனுப்பும் முன் உங்கள் ரெஸ்யூமை ஒருமுறை சரிபார்த்துக் கொள்வது நல்லது."',
          expectedEnglish: 'It would be beneficial to proofread your resume once more before hitting submit.',
          options: [
            'Good to see resume before clicking submit.',
            'It would be beneficial to proofread your resume once more before hitting submit.',
            'Proofread must needed before submit button.',
          ],
          correctOptionIndex: 1,
          explanation: '"It would be beneficial to proofread..." is refined professional advice.',
          tamilExplanation: '"It would be beneficial to..." என்பது மென்மையான, நன்மையான ஆலோசனையைக் குறிக்கும்.',
        },
        speakingChallenge: {
          prompt: 'Your colleague Miss Nova is feeling burned out by working late every night. Give her gentle, effective advice.',
          missNovaQuestion: 'I have been working 14 hours a day all week, and I am completely exhausted. What should I do?',
          suggestedAnswers: [
            'You might want to speak with your team lead about re-prioritizing deliverables, because your health must come first.',
            'Have you considered taking tomorrow afternoon off to completely unplug and recharge your mind?',
          ],
          sampleNativeResponse: 'I am sorry you are feeling drained! It might be really beneficial to set strict boundaries around work hours and take a full day to recharge.',
        },
      },
      {
        id: 'sn-4-5',
        levelNumber: 4,
        classNumber: 21,
        title: 'Class 21: Expressing Deep Emotions & Hesitations',
        subtitle: 'Articulate stress, relief, gratitude, and empathy fluently',
        duration: '9 mins',
        grammarTopic: 'Nuanced Emotional Idioms: Over the moon, breathing a sigh of relief',
        xpReward: 200,
        rule: {
          heading: 'Rule: Move Beyond Basic "Happy" or "Sad" with Sensory Idioms',
          englishExplanation: 'Instead of "I am very happy", say "I am over the moon". Instead of "I was worried", say "I was on pins and needles".',
          tamilMentalModel: 'உணர்ச்சிகளை விவரிக்கும்போது "happy", "sad" என்று மட்டும் சொல்லாமல், "a huge weight off my shoulders" போன்ற நுணுக்கமான ஆங்கில நடையைப் பயன்படுத்துங்கள்.',
          doAndDont: {
            wrong: 'When exam passed I was very very very happy.',
            right: 'When I cleared the examination, it felt like a massive weight was lifted off my shoulders.',
            whyTamil: 'அனுபவங்களை விவரிக்கும்போது இந்த உயரிய நடைகள் உங்கள் ஆங்கிலப் புலமையை வெளிப்படுத்தும்.',
          },
        },
        jumble: {
          tamilSentence: 'திட்டம் வெற்றிகரமாக முடிந்ததும் நாங்கள் அனைவரும் நிம்மதி பெருமூச்சு விட்டோம்.',
          scrambledWords: ['We', 'all', 'breathed', 'a', 'huge', 'sigh', 'of', 'relief', 'when', 'the', 'launch', 'succeeded.'],
          correctWords: ['We', 'all', 'breathed', 'a', 'huge', 'sigh', 'of', 'relief', 'when', 'the', 'launch', 'succeeded.'],
          hint: 'Idiom: breathed a huge sigh of relief',
        },
        translation: {
          tamilPrompt: '"இந்த கடினமான காலகட்டத்தில் நீங்கள் எனக்கு அளித்த ஆதரவுக்கு நான் என்றும் கடமைப்பட்டுள்ளேன்."',
          expectedEnglish: 'I am immensely grateful for the unwavering support you provided during this difficult period.',
          options: [
            'Thanks for support in bad time.',
            'I am immensely grateful for the unwavering support you provided during this difficult period.',
            'Your support in difficult time I won\'t forget.',
          ],
          correctOptionIndex: 1,
          explanation: '"Immensely grateful" and "unwavering support" convey deep, heartfelt appreciation.',
          tamilExplanation: '"Immensely grateful" என்பது அளப்பரிய நன்றியுணர்வை வெளிப்படுத்தும் அற்புதமான தொடர்.',
        },
        speakingChallenge: {
          prompt: 'Share a personal story with Miss Nova about a time you overcame a tough challenge.',
          missNovaQuestion: 'Can you recall a moment in your life where you felt overwhelmed, but eventually pushed through and succeeded?',
          suggestedAnswers: [
            'During my college final project, our server crashed the night before evaluation, but we worked all night, fixed the database, and scored the top grade.',
            'When I gave my first English presentation to foreign clients, I was nervous, but I practiced diligently and received glowing feedback.',
          ],
          sampleNativeResponse: 'When I gave my first live tech demo to international stakeholders, I was terrified. But pushing through taught me that courage comes from preparation.',
        },
      },
      {
        id: 'sn-4-6',
        levelNumber: 4,
        classNumber: 22,
        title: 'Class 22: Capstone Master Fluency & Elevator Pitch',
        subtitle: 'The ultimate graduation challenge: deliver a complete executive pitch',
        duration: '10 mins',
        grammarTopic: 'Executive Rhetoric: Hook, Problem, Solution, Vision',
        xpReward: 300,
        rule: {
          heading: 'Rule: The Executive 4-Part Pitch Structure',
          englishExplanation: '1. The Hook (surprising fact). 2. The Problem (pain point). 3. The Innovation (your solution). 4. The Call to Action.',
          tamilMentalModel: 'உயர்மட்ட பேச்சுகளில்: கவனத்தை ஈர்க்கும் தொடக்கம் (Hook) -> பிரச்சனை (Problem) -> தீர்வு (Solution) -> எதிர்கால தொலைநோக்கு (Vision) என பேச வேண்டும்.',
          doAndDont: {
            wrong: 'My app is good app please use it thank you.',
            right: 'We empower millions of learners to break language barriers and unlock high-paying global opportunities.',
            whyTamil: 'உங்கள் இலக்கையும் தாக்கத்தையும் உலகத்தரம் வாய்ந்த சொற்களால் வெளிப்படுத்துங்கள்.',
          },
        },
        jumble: {
          tamilSentence: 'எங்கள் நோக்கம் மொழித் தடைகளை உடைத்து அனைவருக்கும் உலகளாவிய வாய்ப்புகளை உருவாக்குவதாகும்.',
          scrambledWords: ['Our', 'mission', 'is', 'to', 'democratize', 'global', 'opportunities', 'by', 'breaking', 'language', 'barriers.'],
          correctWords: ['Our', 'mission', 'is', 'to', 'democratize', 'global', 'opportunities', 'by', 'breaking', 'language', 'barriers.'],
          hint: 'Start with "Our mission is to democratize..."',
        },
        translation: {
          tamilPrompt: '"தொடர்ச்சியான முயற்சியும் சரியான வழிகாட்டுதலும் இருந்தால் எவரும் ஆங்கிலத்தில் சரளமாக பேச முடியும்."',
          expectedEnglish: 'With consistent practice and the right mentorship, anyone can attain effortless English fluency.',
          options: [
            'Daily work and teacher having anyone speaking English.',
            'With consistent practice and the right mentorship, anyone can attain effortless English fluency.',
            'Continuous try gives English speaking freely.',
          ],
          correctOptionIndex: 1,
          explanation: '"Attain effortless English fluency" encapsulates the core philosophy of Supernova English.',
          tamilExplanation: '"Attain effortless English fluency" என்பது அநாயாசமான சரளப் பேச்சை அடையும் நிலையை உணர்த்துகிறது.',
        },
        speakingChallenge: {
          prompt: 'Final Graduation Challenge! Pitch your journey or project to Miss Nova and claim your Master Certificate.',
          missNovaQuestion: 'Congratulations on reaching the final milestone! What does mastering spoken English mean for your future?',
          suggestedAnswers: [
            'Mastering English gives me the power to share my ideas globally, build international businesses, and inspire others in my community.',
            'It represents freedom from hesitation and opens doors to lead global tech teams with absolute confidence.',
          ],
          sampleNativeResponse: 'Mastering spoken English empowers me to communicate without fear, collaborate on a global stage, and turn my biggest dreams into reality!',
        },
      },
    ],
  },
];

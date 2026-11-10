export interface DoAndDont {
  incorrect: string;
  correct: string;
  whyTamil: string;
  whyEnglish: string;
}

export interface DialogueTurn {
  speaker: string;
  avatar: string;
  text: string;
  tamilMeaning: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  tamilExplanation: string;
}

export interface DeepClassLesson {
  id: string;
  levelNumber: number;
  classNumber: number;
  title: string;
  subtitle: string;
  duration: string;
  grammarFocus: string;
  status: 'locked' | 'unlocked' | 'completed';
  
  // 1. Concept Stage
  conceptSummary: string;
  tamilMentalModel: string;
  
  // 2. Do's and Don'ts Stage
  dosAndDonts: DoAndDont[];

  // 3. Dialogue & Shadowing Stage
  dialogue: DialogueTurn[];
  shadowingPhrases: {
    english: string;
    phonetic: string;
    tamilContext: string;
  }[];

  // 4. Multi-question Quiz Stage
  quizQuestions: QuizQuestion[];
}

export interface DeepLevelCourse {
  levelNumber: number;
  levelTitle: string;
  subtitle: string;
  cefrTag: string;
  planetColor: string;
  badge: string;
  classes: DeepClassLesson[];
}

export const DEEP_CURRICULUM: DeepLevelCourse[] = [
  {
    levelNumber: 1,
    levelTitle: 'Planet Origin: Foundations',
    subtitle: 'Break Tamil-to-English hesitation & master daily core rules',
    cefrTag: 'A1 - A2',
    planetColor: '#6366F1',
    badge: 'Beginner',
    classes: [
      {
        id: 'cls-1-1',
        levelNumber: 1,
        classNumber: 1,
        title: 'Class 1: Self-Introduction Without Hesitation',
        subtitle: 'Never say "Myself Alex" again - sound sharp & confident',
        duration: '7 mins',
        grammarFocus: 'Present Simple + Reflexive Pronoun fix',
        status: 'unlocked',
        conceptSummary:
          'When meeting someone or in an interview, the first 10 seconds create 90% of the impression. In Tamil, we often think "Ennodhu peyar..." and accidentally translate it as "Myself John", which sounds ungrammatical in standard English.',
        tamilMentalModel:
          'தமிழில் "என்னோட பேரு..." என்று சொல்வது போல ஆங்கிலத்தில் "Myself..." என்று தொடங்கக் கூடாது. "Myself" என்பது reflexive pronoun (தான்/தன்னை). எனவே எப்போதுமே "Hi, I am..." அல்லது "My name is..." என்று தொடங்குவதே சரியான ஆங்கில முறை.',
        dosAndDonts: [
          {
            incorrect: 'Myself Vignesh, I am coming from Madurai.',
            correct: 'Hi, I am Vignesh. I am from Madurai.',
            whyTamil: '"Myself" தவறு; "coming from" என்பதை விட "I am from" என்பது இயல்பானது.',
            whyEnglish: 'Avoid "myself" as subject. Use "I am from" instead of present continuous "coming from".',
          },
          {
            incorrect: 'I am having 3 years experience in IT.',
            correct: 'I have 3 years of experience in IT.',
            whyTamil: 'அனுபவம் மற்றும் உடைமைகளுக்கு "am having" என்று வராது; "I have" தான் வரும்.',
            whyEnglish: 'Possession and ongoing attributes use stative verb "have", not continuous "am having".',
          },
        ],
        dialogue: [
          {
            speaker: 'Sarah (HR Manager)',
            avatar: '👩‍💼',
            text: 'Good morning! Thanks for joining today. Could you start by introducing yourself?',
            tamilMeaning: 'காலை வணக்கம்! உங்களை சுருக்கமாக அறிமுகப்படுத்த முடியுமா?',
          },
          {
            speaker: 'You (Candidate)',
            avatar: '🧑‍💻',
            text: 'Good morning, Sarah. My name is Alex. I am a software engineer based in Chennai with a passion for web apps.',
            tamilMeaning: 'காலை வணக்கம். என் பெயர் அலெக்ஸ். நான் சென்னையில் உள்ள மென்பொருள் பொறியாளர்.',
          },
          {
            speaker: 'Sarah (HR Manager)',
            avatar: '👩‍💼',
            text: 'Fantastic! That is crystal clear. What do you enjoy working on the most?',
            tamilMeaning: 'அற்புதம்! மிக தெளிவாக சொன்னீர்கள். எதில் வேலை செய்வது உங்களுக்கு மிகவும் பிடிக்கும்?',
          },
        ],
        shadowingPhrases: [
          {
            english: 'Hi, I am Alex. Nice to meet you.',
            phonetic: '/haɪ aɪ æm ˈæl.ɪks naɪs tuː miːt juː/',
            tamilContext: 'அனைத்து அறிமுகங்களுக்கும் ஏற்ற இயல்பான தொடக்கம்.',
          },
          {
            english: 'I am currently based in Chennai.',
            phonetic: '/aɪ æm ˈkʌr.ənt.li beɪst ɪn tʃɛˈnaɪ/',
            tamilContext: 'நீங்கள் வசிக்கும் இடத்தை தொழில்முறையாக குறிப்பிடுதல்.',
          },
          {
            english: 'I have two years of experience in mobile development.',
            phonetic: '/aɪ hæv tuː jɪəz ɒv ɪkˈspɪə.ri.əns/',
            tamilContext: 'உங்களது பணி அனுபவத்தை "have" பயன்படுத்தி சொல்லுதல்.',
          },
        ],
        quizQuestions: [
          {
            question: 'Which of the following is the most natural introduction in an interview?',
            options: [
              'Myself Alex, coming from Bangalore.',
              'Hello, I am Alex, and I am from Bangalore.',
              'Me Alex, living Bangalore.',
            ],
            correctIndex: 1,
            explanation: '"I am [Name]" is direct, grammatically sound, and globally recognized.',
            tamilExplanation: '"Myself" தவிர்த்து "I am Alex..." என்று சொல்வதே நேர்த்தியானது.',
          },
          {
            question: 'How do you describe your work experience correctly?',
            options: [
              'I am having 4 years experience in Python.',
              'I have 4 years of experience in Python.',
              'Experience is 4 years having in Python.',
            ],
            correctIndex: 1,
            explanation: 'Use "I have [X] years of experience", not "am having".',
            tamilExplanation: 'அனுபவத்திற்கு "I have..." பயன்படுத்த வேண்டும்.',
          },
        ],
      },
      {
        id: 'cls-1-2',
        levelNumber: 1,
        classNumber: 2,
        title: 'Class 2: Subject-Verb Agreement Mastery',
        subtitle: 'Fix "He don\'t know" & "She work" permanently',
        duration: '8 mins',
        grammarFocus: 'Third-person singular -s/-es inflection',
        status: 'unlocked',
        conceptSummary:
          'In English, third-person singular subjects (He, She, It, Everyone, Someone) REQUIRE the verb to take an "-s" or "-es" in Present Simple. When negating, you must use "doesn\'t", never "don\'t".',
        tamilMentalModel:
          'தமிழில் "அவன் செய்வான் / அவள் செய்வாள்" என்பது போல, ஆங்கிலத்தில் He / She / It வந்தால் வினைச்சொல்லோடு "s" சேர வேண்டும் (He works, She speaks). எதிர்மறையாக பேசும்போது "doesn\'t" மட்டுமே வர வேண்டும்.',
        dosAndDonts: [
          {
            incorrect: 'He don\'t know how to deploy the code.',
            correct: 'He doesn\'t know how to deploy the code.',
            whyTamil: 'He-க்கு பிறகு "doesn\'t" தான் வரும்; "don\'t" வரக்கூடாது.',
            whyEnglish: 'He/She/It are singular; use auxiliary "does not" / "doesn\'t".',
          },
          {
            incorrect: 'Everyone in our team have a laptop.',
            correct: 'Everyone in our team has a laptop.',
            whyTamil: '"Everyone" என்பது பலரை குறித்தாலும் ஆங்கிலத்தில் ஒருமையாக (singular) கருதப்படும்.',
            whyEnglish: '"Everyone", "everybody", "someone" take singular verbs ("has", "is").',
          },
        ],
        dialogue: [
          {
            speaker: 'Priya (Team Lead)',
            avatar: '👩‍💻',
            text: 'Does John know about the sprint deadline change?',
            tamilMeaning: 'ஸ்ப்ரின்ட் காலக்கெடு மாற்றத்தைப் பற்றி ஜானுக்கு தெரியுமா?',
          },
          {
            speaker: 'You (Teammate)',
            avatar: '🧑‍💻',
            text: 'No, he doesn\'t know yet. I will inform him right away.',
            tamilMeaning: 'இல்லை, அவருக்கு இன்னும் தெரியாது. நான் உடனே சொல்லி விடுகிறேன்.',
          },
          {
            speaker: 'Priya (Team Lead)',
            avatar: '👩‍💻',
            text: 'Great! Make sure everyone stays on the same page.',
            tamilMeaning: 'சிறப்பு! அனைவரும் ஒரே புரிதலில் இருப்பதை உறுதி செய்து கொள்ளுங்கள்.',
          },
        ],
        shadowingPhrases: [
          {
            english: 'He doesn\'t have the latest design file.',
            phonetic: '/hiː ˈdʌz.nt hæv ðə ˈleɪ.tɪst dɪˈzaɪn faɪl/',
            tamilContext: 'அவரிடம் சமீபத்திய ஃபைல் இல்லை என்பதை தெரிவித்தல்.',
          },
          {
            english: 'She always delivers her tasks on time.',
            phonetic: '/ʃiː ˈɔːl.weɪz dɪˈlɪv.əz hɜː tɑːsks ɒn taɪm/',
            tamilContext: 'She வந்ததால் deliver உடன் "s" (delivers) சேர்க்கப்பட்டுள்ளது.',
          },
          {
            english: 'Does anyone have any questions?',
            phonetic: '/dʌz ˈɛn.i.wʌn hæv ˈɛn.i ˈkwɛs.tʃənz/',
            tamilContext: 'கூட்டத்தில் யாரிடமாவது கேள்விகள் உள்ளதா என கேட்டல்.',
          },
        ],
        quizQuestions: [
          {
            question: 'Complete the sentence: "My manager ______ agree with this design."',
            options: ['don\'t', 'doesn\'t', 'is not'],
            correctIndex: 1,
            explanation: '"My manager" is third-person singular (he/she), so use "doesn\'t".',
            tamilExplanation: 'மேலாளர் ஒருமை என்பதால் "doesn\'t" பயன்படுத்த வேண்டும்.',
          },
          {
            question: 'Which sentence is grammatically correct?',
            options: [
              'Everyone want to go home early.',
              'Everyone wants to go home early.',
              'Everyone wanting go home early.',
            ],
            correctIndex: 1,
            explanation: '"Everyone" is grammatically singular and takes the singular verb "wants".',
            tamilExplanation: '"Everyone" ஒருமை என்பதால் "wants" என்பதே சரி.',
          },
        ],
      },
      {
        id: 'cls-1-3',
        levelNumber: 1,
        classNumber: 3,
        title: 'Class 3: Did + Base Verb Rule',
        subtitle: 'Banish "didn\'t went" & "did you saw" forever',
        duration: '7 mins',
        grammarFocus: 'Past tense auxiliary inversion (did + V1)',
        status: 'unlocked',
        conceptSummary:
          'The auxiliary verb "DID" already carries the past tense. Therefore, the main verb that follows MUST stay in its base/infinitive form (V1). Never use two past tense markers together!',
        tamilMentalModel:
          '"Did" என்பது ஏற்கனவே கடந்த காலத்தை தெளிவாக சொல்லிவிடுகிறது. எனவே அதற்குப் பின் வரும் சொல் முதல் நிலை சொல் (go, see, know) தான் வர வேண்டும். "didn\'t went" என்று இரண்டு முறை கடந்த காலம் வரக்கூடாது.',
        dosAndDonts: [
          {
            incorrect: 'I didn\'t went to the meeting yesterday.',
            correct: 'I didn\'t go to the meeting yesterday.',
            whyTamil: 'Didn\'t வந்தவுடன் went வரக்கூடாது; go தான் வர வேண்டும்.',
            whyEnglish: '"Did" already marks the past tense. The lexical verb must be base form "go".',
          },
          {
            incorrect: 'Did you saw the email I forwarded?',
            correct: 'Did you see the email I forwarded?',
            whyTamil: 'Did வந்ததால் saw வரக்கூடாது; see தான் வர வேண்டும்.',
            whyEnglish: 'Questions with "Did" always use base verb "see".',
          },
        ],
        dialogue: [
          {
            speaker: 'Karthik (Manager)',
            avatar: '👨‍💼',
            text: 'Why didn\'t you attend the retrospective yesterday?',
            tamilMeaning: 'நேற்று ஏன் மீட்டிங்கில் கலந்து கொள்ளவில்லை?',
          },
          {
            speaker: 'You (Developer)',
            avatar: '🧑‍💻',
            text: 'I didn\'t get the calendar invite, Karthik. My network was down as well.',
            tamilMeaning: 'எனக்கு கேலெண்டர் அழைப்பு வரவில்லை கார்த்திக். நெட்வொர்க்கும் வேலை செய்யவில்லை.',
          },
          {
            speaker: 'Karthik (Manager)',
            avatar: '👨‍💼',
            text: 'No problem. Did you check the meeting summary notes?',
            tamilMeaning: 'பரவாயில்லை. மீட்டிங் குறிப்புகளை பார்த்தீர்களா?',
          },
        ],
        shadowingPhrases: [
          {
            english: 'I didn\'t know about the updated policy.',
            phonetic: '/aɪ ˈdɪd.nt nəʊ əˈbaʊt ðə ʌpˈdeɪ.tɪd ˈpɒl.ə.si/',
            tamilContext: 'எனக்கு கொள்கை மாற்றம் தெரியாது என்பதை கூறுதல்.',
          },
          {
            english: 'Did you speak to the client this morning?',
            phonetic: '/dɪd juː spiːk tuː ðə ˈklaɪ.ənt ðɪs ˈmɔː.nɪŋ/',
            tamilContext: 'Did வந்ததால் speak (base verb) வந்துள்ளது.',
          },
        ],
        quizQuestions: [
          {
            question: 'Choose the correct question to ask a colleague:',
            options: [
              'Did you completed the task?',
              'Did you complete the task?',
              'Did you completing the task?',
            ],
            correctIndex: 1,
            explanation: '"Did" requires the base form "complete", not past "completed".',
            tamilExplanation: '"Did" வந்ததால் "complete" என்பதே சரியானது.',
          },
        ],
      },
    ],
  },
  {
    levelNumber: 2,
    levelTitle: 'Planet Orbit: Daily Fluency',
    subtitle: 'Everyday conversations, social interactions & dining out',
    cefrTag: 'B1',
    planetColor: '#06B6D4',
    badge: 'Intermediate',
    classes: [
      {
        id: 'cls-2-1',
        levelNumber: 2,
        classNumber: 1,
        title: 'Class 1: Past Simple vs Present Perfect',
        subtitle: 'Understand "Yesterday I saw" vs "I have seen"',
        duration: '9 mins',
        grammarFocus: 'Specific past time vs Lifetime experience',
        status: 'unlocked',
        conceptSummary:
          'This is the single biggest confusion for Tamil speakers. When a SPECIFIC time in the past is mentioned (yesterday, last week, in 2021), use Simple Past. When talking about life experience without a specific past time, use Present Perfect (have + V3).',
        tamilMentalModel:
          '"நேத்து பார்த்தேன்" (Yesterday) என்று குறிப்பிட்ட நேரத்தை சொன்னால் Simple Past (I saw). நேரம் சொல்லாமல் "நான் அந்த படத்தை பார்த்திருக்கிறேன்" என்று அனுபவத்தை சொன்னால் Present Perfect (I have seen).',
        dosAndDonts: [
          {
            incorrect: 'Yesterday only I have sent the quotation.',
            correct: 'I sent the quotation yesterday.',
            whyTamil: 'Yesterday வந்ததால் "have sent" வரக்கூடாது; "sent" தான் வர வேண்டும்.',
            whyEnglish: 'Specific past time marker "yesterday" cannot take Present Perfect.',
          },
          {
            incorrect: 'I saw that movie already many times.',
            correct: 'I have already seen that movie many times.',
            whyTamil: 'பலமுறை பார்த்த அனுபவத்தை குறிக்க "have seen" பயன்படுகிறது.',
            whyEnglish: 'Life experience with "already" and "many times" naturally uses Present Perfect.',
          },
        ],
        dialogue: [
          {
            speaker: 'Elena (Colleague)',
            avatar: '👩‍🦰',
            text: 'Have you ever visited Singapore before?',
            tamilMeaning: 'இதற்கு முன் எப்போதாவது சிங்கப்பூர் சென்றுள்ளீர்களா?',
          },
          {
            speaker: 'You',
            avatar: '🧑‍💻',
            text: 'Yes, I went there in 2022 for a holiday.',
            tamilMeaning: 'ஆம், 2022-ல் விடுமுறைக்காக அங்கு சென்றேன்.',
          },
          {
            speaker: 'Elena (Colleague)',
            avatar: '👩‍🦰',
            text: 'Awesome! Did you try the famous street food there?',
            tamilMeaning: 'அருமை! அங்குள்ள புகழ்பெற்ற தெருவோர உணவுகளை சாப்பிட்டு பார்த்தீர்களா?',
          },
        ],
        shadowingPhrases: [
          {
            english: 'I have already completed the documentation.',
            phonetic: '/aɪ hæv ɔːlˈrɛd.i kəmˈpliː.tɪd ðə ˌdɒk.jʊ.mɛnˈteɪ.ʃən/',
            tamilContext: 'நான் ஏற்கனவே டாக்குமெண்டேஷனை முடித்துவிட்டேன்.',
          },
          {
            english: 'We finished the code review an hour ago.',
            phonetic: '/wiː ˈfɪn.ɪʃt ðə kəʊd rɪˈvjuː ən ˈaʊə əˈɡəʊ/',
            tamilContext: '"an hour ago" குறிப்பிட்ட நேரம் என்பதால் Simple Past (finished).',
          },
        ],
        quizQuestions: [
          {
            question: '"Last month, we ______ a new feature to production."',
            options: ['have deployed', 'deployed', 'deploying'],
            correctIndex: 1,
            explanation: '"Last month" points to a finished past time, so use Simple Past "deployed".',
            tamilExplanation: '"Last month" குறிப்பிட்ட கடந்த காலம் என்பதால் "deployed" மட்டுமே சரி.',
          },
        ],
      },
      {
        id: 'cls-2-2',
        levelNumber: 2,
        classNumber: 2,
        title: 'Class 2: Cafe & Restaurant Ordering Elegance',
        subtitle: 'Sound polite and natural instead of blunt or commanding',
        duration: '7 mins',
        grammarFocus: 'Polite modals (Could I get, Would you have, I\'d like)',
        status: 'unlocked',
        conceptSummary:
          'In English cafes, saying "Give me coffee" sounds very aggressive or rude. Native speakers always cushion requests using polite modal structures like "Could I get...", "I would like...", or "Do you happen to have...".',
        tamilMentalModel:
          '"காபி குடு" என்று நேரடியாக கட்டளையிடாமல், "ஒரு காபி கிடைக்குமா?" என்று பணிவாக கேட்பது போல ஆங்கிலத்தில் "Could I get a coffee, please?" என்று கேட்க வேண்டும்.',
        dosAndDonts: [
          {
            incorrect: 'Give one black coffee fast.',
            correct: 'Could I get a black coffee, please?',
            whyTamil: '"Give me" ஆணை இடுவது போல் ஒலிக்கும்; "Could I get..." நாகரிகமானது.',
            whyEnglish: '"Could I get..." transforms a command into a warm, polite request.',
          },
        ],
        dialogue: [
          {
            speaker: 'Barista',
            avatar: '☕',
            text: 'Welcome! What can I make fresh for you today?',
            tamilMeaning: 'வணக்கம்! இன்று உங்களுக்கு என்ன தயாரித்து தரட்டும்?',
          },
          {
            speaker: 'You',
            avatar: '🧑‍💻',
            text: 'Hi! Could I please get a medium oat milk latte with light ice?',
            tamilMeaning: 'வணக்கம்! ஒரு மீடியம் ஓட் மில்க் லட்டே குறைந்த பனிக்கட்டியுடன் கிடைக்குமா?',
          },
          {
            speaker: 'Barista',
            avatar: '☕',
            text: 'You got it! Would you like any warm pastries to go with that?',
            tamilMeaning: 'நிச்சயமாக! அத்துடன் சாப்பிட சூடான பேஸ்ட்ரி ஏதேனும் விருப்பமா?',
          },
        ],
        shadowingPhrases: [
          {
            english: 'Could I get the bill, please?',
            phonetic: '/kʊd aɪ ɡɛt ðə bɪl pliːz/',
            tamilContext: 'உணவகத்தில் பில் கேட்கும் நாகரிகமான முறை.',
          },
          {
            english: 'Do you have any vegan options on the menu?',
            phonetic: '/duː juː hæv ˈɛn.i ˈviː.ɡən ˈɒp.ʃənz/',
            tamilContext: 'மெனுவில் சிறப்பு உணவுகள் உள்ளதா என கேட்டல்.',
          },
        ],
        quizQuestions: [
          {
            question: 'Which is the most natural way to order breakfast at a cafe?',
            options: [
              'I want sandwich now.',
              'Could I have a grilled cheese sandwich, please?',
              'Bring sandwich to my table.',
            ],
            correctIndex: 1,
            explanation: '"Could I have..., please?" is polite and pleasant.',
            tamilExplanation: '"Could I have... please" என்பது பணிவான அணுகுமுறை.',
          },
        ],
      },
    ],
  },
  {
    levelNumber: 3,
    levelTitle: 'Planet Apex: Workplace & Leadership',
    subtitle: 'Ace tech interviews, lead standups & write executive emails',
    cefrTag: 'B2',
    planetColor: '#F59E0B',
    badge: 'Advanced',
    classes: [
      {
        id: 'cls-3-1',
        levelNumber: 3,
        classNumber: 1,
        title: 'Class 1: Behavioral Tech Interview (STAR Framework)',
        subtitle: 'Structure your answers to impress engineering managers',
        duration: '10 mins',
        grammarFocus: 'Action verbs + Result metrics (STAR Method)',
        status: 'unlocked',
        conceptSummary:
          'Top tech companies (Google, Microsoft, Amazon) evaluate candidates using the STAR framework: Situation, Task, Action, and Result. Avoid vague answers; use concrete action verbs and measurable business impacts.',
        tamilMentalModel:
          'இன்டர்வியூவில் "பிரச்சனை இருந்துச்சு, சால்வ் பண்ணிட்டேன்" என்று ஒற்றை வரியில் சொல்லாமல்: என்ன பிரச்சனை (Situation), உங்கள் பணி என்ன (Task), நீங்கள் என்ன நடவடிக்கை எடுத்தீர்கள் (Action), அதன் மூலம் கிடைத்த சதவீதம் அல்லது வெற்றி என்ன (Result) என்பதை விளக்குங்கள்.',
        dosAndDonts: [
          {
            incorrect: 'My team had bugs, so we fixed it somehow.',
            correct: 'When production latency spiked by 30%, I profiled the database queries and indexed key tables, reducing response times by 45%.',
            whyTamil: 'பொதுவான பதிலுக்கு பதிலாக, நீங்கள் எடுத்த குறிப்பிட்ட செயலையும் அதன் சதவீத பயனையும் சொல்லுங்கள்.',
            whyEnglish: 'Use power verbs (profiled, indexed, reduced) and specific percentage metrics.',
          },
        ],
        dialogue: [
          {
            speaker: 'Interviewer',
            avatar: '👨‍💼',
            text: 'Tell me about a time you handled a critical system outage under tight pressure.',
            tamilMeaning: 'நெருக்கடியான நேரத்தில் சிஸ்டம் செயலிழந்ததை எப்படி கையாண்டீர்கள் என கூறுங்கள்.',
          },
          {
            speaker: 'You (Candidate)',
            avatar: '🧑‍💻',
            text: 'During our Black Friday sale, our payment gateway failed. I immediately rolled back the recent release, communicated status to stakeholders, and identified a memory leak within 20 minutes.',
            tamilMeaning: 'விற்பனை உச்சத்தில் பேமெண்ட் கேட்வே நின்றது. நான் உடனடியாக முந்தைய வெர்ஷனுக்கு ரோல்பேக் செய்து, 20 நிமிடங்களில் காரணத்தை கண்டறிந்தேன்.',
          },
        ],
        shadowingPhrases: [
          {
            english: 'My primary responsibility was to optimize the backend pipeline.',
            phonetic: '/maɪ ˈpraɪ.mə.ri rɪˌspɒn.səˈbɪl.ə.ti wɒz tuː ˈɒp.tɪ.maɪz/',
            tamilContext: 'எனது முதன்மை பொறுப்பு பின்தளத்தை மேம்படுத்துவதாகும்.',
          },
        ],
        quizQuestions: [
          {
            question: 'What does the "R" in the STAR interview technique stand for?',
            options: ['Reason', 'Result', 'Reaction'],
            correctIndex: 1,
            explanation: 'R stands for Result—the measurable positive outcome of your action.',
            tamilExplanation: 'R என்பது Result (அளவிடக்கூடிய சாதகமான முடிவு).',
          },
        ],
      },
    ],
  },
];

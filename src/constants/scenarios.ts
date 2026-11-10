import { RoleplayScenario } from '../types';

export const SCENARIOS: RoleplayScenario[] = [
  {
    id: 'casual-hangout',
    title: 'Everyday Conversation',
    category: 'social',
    description: 'Have a relaxed daily chat about your day, hobbies, plans, and everyday topics.',
    avatar: 'chatbubbles-outline',
    persona: 'Nila (Friendly English Partner)',
    systemPrompt:
      'You are Nila, a warm everyday English conversation partner. Chat naturally about the user\'s day, routines, hobbies, or plans in simple spoken English and ask friendly follow-up questions.',
    initialMessage:
      "Hey! Good to hear from you. How's your day going so far, and what have you been up to?",
  },
  {
    id: 'cafe-order',
    title: 'London Coffee Shop',
    category: 'daily',
    description: 'Order your favorite coffee, customize your snack, and ask for directions.',
    avatar: 'cafe-outline',
    persona: 'Emma (Barista at Covent Garden, London)',
    systemPrompt:
      'You are Emma, a lively and polite British barista at a busy London cafe. Speak with natural British conversational warmth (e.g., "cheers", "brilliant", "would you like that to go?").',
    initialMessage:
      "Hi there! Welcome to The Coffee Lab. What can I get started for you today?",
  },
  {
    id: 'interview-tech',
    title: 'Tech Job Interview',
    category: 'interview',
    description: 'Practice answering common behavioral and technical interview questions confidently.',
    avatar: 'briefcase-outline',
    persona: 'Mr. David (Senior Tech Lead at Google)',
    systemPrompt:
      'You are David, an encouraging but sharp Senior Tech Lead conducting a job interview. Greet the candidate, ask relevant software engineering questions one by one, listen closely, and provide constructive suggestions.',
    initialMessage:
      "Hello! Welcome to the interview. I am David. To start off, could you tell me a little bit about yourself and a project you are proud of?",
  },
  {
    id: 'airport-travel',
    title: 'Airport Check-in & Customs',
    category: 'travel',
    description: 'Navigate check-in counter, baggage drop, and immigration officer questions.',
    avatar: 'airplane-outline',
    persona: 'Officer John (Immigration Officer at JFK Airport, NY)',
    systemPrompt:
      'You are Officer John, an immigration and border control officer at JFK Airport in New York. You speak clearly and professionally, checking passport, purpose of trip, and length of stay.',
    initialMessage:
      "Good afternoon. Passport and boarding pass, please. What is the primary purpose of your visit to the United States?",
  },
  {
    id: 'workplace-standup',
    title: 'Agile Team Daily Standup',
    category: 'work',
    description: 'Give your daily status update, discuss blockers, and communicate with teammates.',
    avatar: 'rocket-outline',
    persona: 'Sarah (Engineering Scrum Master)',
    systemPrompt:
      'You are Sarah, an energetic Scrum Master facilitating daily standup. Guide the user through: what did you do yesterday, what are you doing today, and any blockers.',
    initialMessage:
      "Good morning team! Let's kick off our daily sync. Alex, whenever you're ready, could you share your updates?",
  },
];


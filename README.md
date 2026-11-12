# Elvate English

An AI-powered Tamil-to-English conversational learning app built with **React Native & Expo**, featuring Nila AI tutor feedback, offline Tamil + English lecture audio, and cosmic gamification.

---

## 🌟 Key Features

1. **🎙️ Miss Nova AI Spoken Coach (Conversational Roleplays)**
   - Real-world speaking missions: *Tech Job Interview*, *London Coffee Shop*, *JFK Airport & Immigration*, *Agile Team Daily Standup*, *Casual Roommate Hangout*.
   - Each message receives an instant **Supernova Feedback Chip** with fluency score and corrections.
   - Tap feedback chips to reveal **Tamil mental-model explanations** ("Present Perfect vs Past Simple epdi use pannanum").
   - Native device text-to-speech with natural accents (US 🇺🇸, UK 🇬🇧, AUS 🇦🇺).

2. **⚡ Grammar Nova Diagnostic Engine**
   - Type or paste any phrase to diagnose common Indian-English errors.
   - Highlights wrong tenses (e.g. *"I didn't went"* ➡️ *"I didn't go"*).
   - Generates 3 styled expressions:
     - 👔 **Professional / Email**
     - ☕ **Casual / Friendly**
     - 🗽 **Native Idiomatic**
   - Audio pronunciation for all variations!

3. **📚 Cosmic Vocab Vault (SRS Flashcards)**
   - Spaced Repetition Flashcards with CEFR proficiency levels (A1 to C2).
   - Live Free Dictionary lookup (`api.dictionaryapi.dev`) with authentic `.mp3` native audio.
   - Semantic word web associations via **Datamuse API** (`api.datamuse.com`).
   - Tamil meanings and real-life context sentences.

4. **🏆 Cosmic Gamification**
   - Daily streak tracking 🔥
   - Stardust XP & Fluency ranks (*Star Cadet ➡️ Solar Voyager ➡️ Nebula Master ➡️ Supernova Legend*).
   - 30-Second Grammar Daily Quizzes.

---

## ⚡ 100% Free APIs Integrated

- **Google Gemini 1.5 / 2.0 Flash API (Free Tier):** Live AI conversation coach, grammar diagnosis, and Tamil prompt engineering.
- **Supernova Local Fallback Engine:** Built-in offline linguistic rules so the app works **immediately out-of-the-box even without an API key**!
- **Free Dictionary API (`api.dictionaryapi.dev`):** 100% Free, no API key required. Definitions, phonetics, parts of speech, and native MP3 audio.
- **Datamuse API (`api.datamuse.com`):** 100% Free semantic associations and rhyming vocabulary web.
- **Expo Speech:** Native device offline Text-To-Speech.
- **AsyncStorage:** Local persistence for streaks, XP, mastered words, and settings.

---

## 🚀 How to Run

In the project root `E:\Projects\NovaBreaker`:

```bash
# Start Expo development server (scan QR code with Expo Go app on Android or iOS)
npm start

# Run directly on connected Android device/emulator
npm run android

# Run in web browser preview
npm run web
```

---

## ⚙️ Adding Your Free Gemini API Key (Optional)

1. Open the app and tap **Profile** (bottom navigation).
2. Get your free key from [Google AI Studio](https://aistudio.google.com).
3. Paste it into **Free Google Gemini AI Key** and tap **Save**.
4. The app will immediately unlock live Gemini Flash streaming!

# Daily practice notifications

Learners can enable a daily, device-scheduled practice reminder in **Profile → Settings → Notifications**. They can choose 6, 7, 8, or 9 PM, send a test notification, and tap a reminder to return to the Course tab. The reminder runs locally on Android/iOS and does not require a Supabase push server. Install a newly built app after adding `expo-notifications` so the native notification module and Android notification permission are included.

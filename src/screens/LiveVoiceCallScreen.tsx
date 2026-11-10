import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  TextInput,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { playSoundEffect } from '../services/soundEffectsService';
import { speakText, stopAllAudio } from '../services/ttsService';
import { sendChatMessage } from '../api/supernovaAi';
import { SCENARIOS } from '../constants/scenarios';
import { ChatMessage, GrammarCorrection } from '../types';
import { addXp, incrementMetric } from '../services/storageService';

export const LiveVoiceCallScreen: React.FC = () => {
  const [isCalling, setIsCalling] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: "Hello! I am Miss Nova, your 24/7 personal English speaking partner. How was your day today?",
      timestamp: Date.now(),
    },
  ]);
  const [lastFeedback, setLastFeedback] = useState<GrammarCorrection | null>(null);
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);

  // Pulse Animation for Voice Ripples
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;

  // Timer for call duration
  useEffect(() => {
    let timer: any = null;
    if (isCalling) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCalling]);

  // Animate Pulse when Miss Nova or User speaks
  useEffect(() => {
    if (isAiSpeaking || isUserSpeaking) {
      Animated.loop(
        Animated.stagger(250, [
          Animated.sequence([
            Animated.timing(pulseAnim1, {
              toValue: 1.35,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim1, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim2, {
              toValue: 1.5,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim2, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim3, {
              toValue: 1.65,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim3, {
              toValue: 1,
              duration: 800,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    } else {
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);
      pulseAnim3.setValue(1);
    }
  }, [isAiSpeaking, isUserSpeaking]);

  // Initial greeting playback
  useEffect(() => {
    speakAiMessage(messages[0].content);
  }, []);

  const speakAiMessage = (text: string) => {
    setIsAiSpeaking(true);
    speakText(text, () => {
      setIsAiSpeaking(false);
    });
  };

  const handleSendSpokenText = async (textToSend?: string) => {
    const text = (textToSend || userTranscript).trim();
    if (!text) return;

    setUserTranscript('');
    stopAllAudio();

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsAiSpeaking(true);

    try {
      const scenario = SCENARIOS[activeScenarioIdx] || SCENARIOS[0];
      const { reply, feedback } = await sendChatMessage(newHistory, text, scenario);

      setLastFeedback(feedback);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      setMessages([...newHistory, botMsg]);
      await addXp(20);
      await incrementMetric('conversationsDone', 1);

      speakAiMessage(reply);
    } catch (e) {
      console.warn('Call error:', e);
      setIsAiSpeaking(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleCallState = () => {
    if (isCalling) {
      stopAllAudio();
      setIsCalling(false);
    } else {
      setIsCalling(true);
      playSoundEffect('callRing');
      setTimeout(() => {
        speakAiMessage("Welcome back! What shall we talk about today?");
      }, 1500);
    }
  };

  const activeScenario = SCENARIOS[activeScenarioIdx] || SCENARIOS[0];

  return (
    <View style={styles.container}>
      {/* Top Call Info Bar */}
      <View style={styles.callHeader}>
        <View style={styles.callHeaderLeft}>
          <View style={styles.liveIndicator}>
            <View style={[styles.liveDot, { backgroundColor: isCalling ? THEME.colors.success : THEME.colors.error }]} />
            <Text style={styles.liveTimerText}>{isCalling ? formatTime(callDuration) : 'Call Paused'}</Text>
          </View>
          <Text style={styles.scenarioTitleTag}>{activeScenario.title}</Text>
        </View>

        {/* Persona Switcher Pill */}
        <TouchableOpacity
          style={styles.scenarioPillBtn}
          onPress={() => setActiveScenarioIdx((prev) => (prev + 1) % SCENARIOS.length)}
        >
          <Ionicons name="swap-horizontal" size={14} color={THEME.colors.primaryGlow} style={{ marginRight: 4 }} />
          <Text style={styles.scenarioPillText}>Switch Topic</Text>
        </TouchableOpacity>
      </View>

      {/* Main Avatar with Reactive Audio Waves */}
      <View style={styles.avatarStage}>
        {/* Animated Ripple 3 */}
        <Animated.View
          style={[
            styles.rippleRing,
            { width: 172, height: 172, borderRadius: 86, opacity: 0.14, transform: [{ scale: pulseAnim3 }] },
          ]}
        />
        {/* Animated Ripple 2 */}
        <Animated.View
          style={[
            styles.rippleRing,
            { width: 146, height: 146, borderRadius: 73, opacity: 0.24, transform: [{ scale: pulseAnim2 }] },
          ]}
        />
        {/* Animated Ripple 1 */}
        <Animated.View
          style={[
            styles.rippleRing,
            { width: 120, height: 120, borderRadius: 60, opacity: 0.36, transform: [{ scale: pulseAnim1 }] },
          ]}
        />

        {/* Miss Nova Central Circle with Official Portrait */}
        <View style={styles.missNovaCircle}>
          <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.missNovaAvatarImg} />
        </View>

        <Text style={styles.missNovaName}>Miss Nova</Text>
        <Text style={styles.statusLabel}>
          {isAiSpeaking ? 'Miss Nova is speaking...' : isUserSpeaking ? 'Listening to you...' : 'Tap to speak or type'}
        </Text>
      </View>

      {/* Real-time Subtitle / Transcript Banner */}
      <View style={styles.subtitleBox}>
        <Text style={styles.subtitleText} numberOfLines={3}>
          "{messages[messages.length - 1]?.content}"
        </Text>
      </View>

      {/* Instant Real-Time Grammar Correction Chip */}
      {lastFeedback && (
        <View style={styles.feedbackCard}>
          <View style={styles.feedbackHeader}>
            <Ionicons
              name={lastFeedback.hasErrors ? 'alert-circle' : 'checkmark-circle'}
              size={16}
              color={lastFeedback.hasErrors ? THEME.colors.warning : THEME.colors.success}
            />
            <Text
              style={[
                styles.feedbackScoreText,
                { color: lastFeedback.hasErrors ? THEME.colors.warning : THEME.colors.success },
              ]}
            >
              Fluency Score: {lastFeedback.fluencyScore}/100 {lastFeedback.hasErrors ? '• Correction Available' : '• Perfect!'}
            </Text>
          </View>
          {lastFeedback.hasErrors && (
            <Text style={styles.correctedSentenceText}>"{lastFeedback.correctedSentence}"</Text>
          )}
          <Text style={styles.tamilFeedbackText}>{lastFeedback.tamilExplanation}</Text>
        </View>
      )}

      {/* Quick Prompt Suggestions */}
      <View style={styles.quickPromptsRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          {[
            "Yes, my day was quite productive!",
            "Could you explain this in a simpler way?",
            "How do I express this like a native speaker?",
            "What should I say during a job interview?",
          ].map((prompt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.promptPill}
              onPress={() => handleSendSpokenText(prompt)}
            >
              <Text style={styles.promptPillText}>{prompt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Bottom Speaking & Call Controls */}
      <View style={styles.callControlsContainer}>
        {/* Text Input Option for Quiet Environments */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.voiceTextInput}
            placeholder="Type your response here..."
            placeholderTextColor={THEME.colors.textMuted}
            value={userTranscript}
            onChangeText={setUserTranscript}
            onSubmitEditing={() => handleSendSpokenText()}
          />
          <TouchableOpacity
            style={[styles.sendVoiceBtn, !userTranscript.trim() && { opacity: 0.5 }]}
            onPress={() => handleSendSpokenText()}
            disabled={!userTranscript.trim()}
          >
            <Ionicons name="arrow-up" size={20} color={THEME.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Buttons Bar: End Call & Large Mic Button */}
        <View style={styles.controlButtonsBar}>
          <TouchableOpacity
            style={[styles.callActionBtn, { backgroundColor: isCalling ? THEME.colors.error : THEME.colors.success }]}
            onPress={toggleCallState}
          >
            <Image source={SUPERNOVA_IMAGES.endCall} style={styles.endCallIcon} resizeMode="contain" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bigMicBtn, isUserSpeaking && styles.bigMicBtnActive]}
            activeOpacity={0.8}
            onPressIn={() => setIsUserSpeaking(true)}
            onPressOut={() => {
              setIsUserSpeaking(false);
              // Trigger a sample conversation prompt if empty
              if (!userTranscript) {
                handleSendSpokenText("I had a very busy schedule today, but everything went well.");
              }
            }}
          >
            <Image source={SUPERNOVA_IMAGES.bubbleMic} style={styles.bubbleMicIcon} resizeMode="contain" />
            <Text style={styles.micLabel}>{isUserSpeaking ? 'Release to Send' : 'Hold to Speak'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.callActionBtnSecondary}
            onPress={() => speakAiMessage(messages[messages.length - 1]?.content || '')}
          >
            <Ionicons name="volume-high" size={22} color={THEME.colors.primaryGlow} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  callHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  liveTimerText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    color: THEME.colors.text,
  },
  scenarioTitleTag: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginLeft: 10,
  },
  scenarioPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  scenarioPillText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.primaryGlow,
  },
  avatarStage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    position: 'relative',
  },
  rippleRing: {
    position: 'absolute',
    backgroundColor: THEME.colors.primary,
  },
  missNovaCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(127, 67, 254, 0.25)',
    borderWidth: 2.5,
    borderColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    overflow: 'hidden',
  },
  missNovaAvatarImg: {
    width: 96,
    height: 96,
    transform: [{ scale: 1.04 }],
  },
  endCallIcon: {
    width: 20,
    height: 20,
  },
  bubbleMicIcon: {
    width: 28,
    height: 28,
  },
  missNovaName: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: THEME.colors.text,
    marginTop: 10,
  },
  statusLabel: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: THEME.colors.primaryGlow,
    marginTop: 2,
  },
  subtitleBox: {
    backgroundColor: THEME.colors.surfaceCard,
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  subtitleText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 15,
    color: THEME.colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  feedbackCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedbackScoreText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 12,
    marginLeft: 6,
  },
  correctedSentenceText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.success,
    marginTop: 4,
  },
  tamilFeedbackText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.gold,
    marginTop: 2,
  },
  quickPromptsRow: {
    marginVertical: 12,
  },
  promptPill: {
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  promptPillText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },
  callControlsContainer: {
    marginTop: 'auto',
    backgroundColor: THEME.colors.surface,
    paddingTop: 10,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  voiceTextInput: {
    fontFamily: THEME.fonts.body,
    flex: 1,
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: THEME.colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sendVoiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  controlButtonsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  callActionBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callActionBtnSecondary: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: THEME.colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  bigMicBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: THEME.colors.primaryGlow,
    shadowColor: THEME.colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 6,
  },
  bigMicBtnActive: {
    backgroundColor: THEME.colors.gold,
    borderColor: THEME.colors.goldGlow,
  },
  micLabel: {
    fontFamily: THEME.fonts.bold,
    fontSize: 9,
    color: THEME.colors.text,
    marginTop: 2,
    textTransform: 'uppercase',
  },
});


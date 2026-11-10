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
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { playSoundEffect } from '../services/soundEffectsService';
import { speakText, stopAllAudio } from '../services/ttsService';
import { sendChatMessage } from '../api/supernovaAi';
import { SCENARIOS } from '../constants/scenarios';
import { ChatMessage, GrammarCorrection, UserStats } from '../types';
import { addXp, incrementMetric } from '../services/storageService';

interface LiveVoiceCallScreenProps {
  onStatsUpdate?: (stats: UserStats) => void;
}

const SCENARIO_PROMPTS: Record<string, string[]> = {
  'interview-tech': [
    'I am a software engineer experienced in building mobile and web apps.',
    'In my last project, I reduced API response time by optimizing queries.',
    'I collaborate closely with design and QA during sprint planning.',
  ],
  'cafe-order': [
    'Hi! Could I please get a large iced latte with oat milk?',
    'Could you also warm up a butter croissant for me?',
    'That will be takeaway, please. Can I pay by card?',
  ],
  'airport-travel': [
    'I am here on vacation for ten days to explore the city.',
    'Here is my passport and hotel reservation confirmation.',
    'Yes, my return flight is scheduled for next Sunday.',
  ],
  'workplace-standup': [
    'Yesterday I completed the checkout UI, and today I am writing unit tests.',
    'No major blockers, just waiting on a quick backend PR review.',
    'I will coordinate with QA right after our sync.',
  ],
  'casual-hangout': [
    'My day was pretty productive! How about ordering pepperoni pizza?',
    'I am totally down to catch a movie later tonight.',
    'Let us grab iced coffee before heading home.',
  ],
};

export const LiveVoiceCallScreen: React.FC<LiveVoiceCallScreenProps> = ({ onStatsUpdate }) => {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const activeScenario = SCENARIOS[activeScenarioIdx] || SCENARIOS[0];

  const [isCalling, setIsCalling] = useState(true);
  const [isMutedAudio, setIsMutedAudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [userTranscript, setUserTranscript] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: SCENARIOS[0].initialMessage,
      timestamp: Date.now(),
    },
  ]);
  const [lastFeedback, setLastFeedback] = useState<GrammarCorrection | null>(null);

  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;
  const transcriptScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (isCalling) {
      timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isCalling]);

  useEffect(() => {
    if (isAiSpeaking || isUserSpeaking) {
      const loopAnim = Animated.loop(
        Animated.stagger(250, [
          Animated.sequence([
            Animated.timing(pulseAnim1, {
              toValue: 1.32,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim1, {
              toValue: 1,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim2, {
              toValue: 1.45,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim2, {
              toValue: 1,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim3, {
              toValue: 1.58,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim3, {
              toValue: 1,
              duration: 750,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      loopAnim.start();
      return () => loopAnim.stop();
    } else {
      pulseAnim1.setValue(1);
      pulseAnim2.setValue(1);
      pulseAnim3.setValue(1);
    }
  }, [isAiSpeaking, isUserSpeaking, pulseAnim1, pulseAnim2, pulseAnim3]);

  useEffect(() => {
    speakAiMessage(messages[0].content);
    return () => {
      stopAllAudio();
    };
  }, []);

  const speakAiMessage = (text: string) => {
    if (isMutedAudio) {
      setIsAiSpeaking(false);
      return;
    }
    setIsAiSpeaking(true);
    speakText(text, () => {
      setIsAiSpeaking(false);
    });
  };

  const handleSwitchTopic = () => {
    const nextIdx = (activeScenarioIdx + 1) % SCENARIOS.length;
    const nextScenario = SCENARIOS[nextIdx];
    stopAllAudio();
    playSoundEffect('button');
    setActiveScenarioIdx(nextIdx);
    setLastFeedback(null);
    const introMsg: ChatMessage = {
      id: `init-${nextScenario.id}-${Date.now()}`,
      role: 'assistant',
      content: nextScenario.initialMessage,
      timestamp: Date.now(),
    };
    setMessages([introMsg]);
    speakAiMessage(nextScenario.initialMessage);
  };

  const handleSendSpokenText = async (textToSend?: string) => {
    const text = (textToSend ?? userTranscript).trim();
    if (!text) return;

    if (!isCalling) setIsCalling(true);
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
      const { reply, feedback } = await sendChatMessage(newHistory, text, activeScenario);
      setLastFeedback(feedback);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      setMessages([...newHistory, botMsg]);
      await addXp(10);
      const updated = await incrementMetric('conversationsDone', 1);
      onStatsUpdate?.(updated);

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
      setIsAiSpeaking(false);
      setIsCalling(false);
    } else {
      setIsCalling(true);
      playSoundEffect('callRing');
      setTimeout(() => {
        speakAiMessage('Welcome back! Go ahead whenever you are ready.');
      }, 900);
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMutedAudio;
    setIsMutedAudio(nextMuted);
    if (nextMuted) {
      stopAllAudio();
      setIsAiSpeaking(false);
    }
  };

  const currentQuickPrompts =
    SCENARIO_PROMPTS[activeScenario.id] || SCENARIO_PROMPTS['interview-tech'];

  return (
    <View style={styles.container}>
      {/* Top Call Header */}
      <View style={styles.callHeader}>
        <View style={styles.callHeaderLeft}>
          <View style={styles.liveIndicator}>
            <View
              style={[
                styles.liveDot,
                { backgroundColor: isCalling ? THEME.colors.primaryGlow : THEME.colors.textMuted },
              ]}
            />
            <Text style={styles.liveTimerText}>
              {isCalling ? formatTime(callDuration) : 'Paused'}
            </Text>
          </View>
          <Text style={styles.scenarioTitleTag} numberOfLines={1}>
            {activeScenario.title}
          </Text>
        </View>

        <View style={styles.headerActionsRight}>
          <TouchableOpacity
            style={[styles.iconPillBtn, showTranscript && styles.iconPillBtnActive]}
            onPress={() => setShowTranscript((prev) => !prev)}
          >
            <Ionicons
              name="chatbox-ellipses-outline"
              size={14}
              color={showTranscript ? '#FFFFFF' : THEME.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.scenarioPillBtn} onPress={handleSwitchTopic}>
            <Ionicons
              name="swap-horizontal"
              size={14}
              color={THEME.colors.primaryGlow}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.scenarioPillText}>Switch</Text>
          </TouchableOpacity>
        </View>
      </View>

      {showTranscript ? (
        <ScrollView
          ref={transcriptScrollRef}
          style={styles.transcriptScroll}
          contentContainerStyle={styles.transcriptContent}
          onContentSizeChange={() => transcriptScrollRef.current?.scrollToEnd({ animated: true })}
        >
          <Text style={styles.transcriptRoleHeader}>{activeScenario.persona}</Text>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <View
                key={msg.id}
                style={[styles.chatRow, isUser ? styles.chatRowUser : styles.chatRowBot]}
              >
                <View style={[styles.chatBubble, isUser ? styles.chatBubbleUser : styles.chatBubbleBot]}>
                  <Text style={styles.chatBubbleText}>{msg.content}</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <>
          {/* Avatar Stage */}
          <View style={styles.avatarStage}>
            <Animated.View
              style={[
                styles.rippleRing,
                { width: 172, height: 172, borderRadius: 86, opacity: 0.14, transform: [{ scale: pulseAnim3 }] },
              ]}
            />
            <Animated.View
              style={[
                styles.rippleRing,
                { width: 146, height: 146, borderRadius: 73, opacity: 0.24, transform: [{ scale: pulseAnim2 }] },
              ]}
            />
            <Animated.View
              style={[
                styles.rippleRing,
                { width: 120, height: 120, borderRadius: 60, opacity: 0.36, transform: [{ scale: pulseAnim1 }] },
              ]}
            />

            <View style={styles.missNovaCircle}>
              <Image source={SUPERNOVA_IMAGES.novaAvatar} style={styles.missNovaAvatarImg} />
            </View>

            <Text style={styles.missNovaName}>Miss Nova</Text>
            <Text style={styles.statusLabel}>
              {isMutedAudio
                ? 'Audio muted'
                : isAiSpeaking
                ? 'Speaking...'
                : isUserSpeaking
                ? 'Hold & speak or type below'
                : 'Ready to practice'}
            </Text>
          </View>

          {/* Subtitle Banner */}
          <View style={styles.subtitleBox}>
            <Text style={styles.subtitleText} numberOfLines={3}>
              "{messages[messages.length - 1]?.content}"
            </Text>
          </View>

          {/* Real-Time Grammar Feedback */}
          {lastFeedback && (
            <View style={styles.feedbackCard}>
              <View style={styles.feedbackHeader}>
                <Ionicons
                  name={lastFeedback.hasErrors ? 'alert-circle' : 'checkmark-circle'}
                  size={16}
                  color={lastFeedback.hasErrors ? THEME.colors.gold : THEME.colors.primaryGlow}
                />
                <Text
                  style={[
                    styles.feedbackScoreText,
                    { color: lastFeedback.hasErrors ? THEME.colors.gold : THEME.colors.primaryGlow },
                  ]}
                >
                  Fluency Score: {lastFeedback.fluencyScore}/100{' '}
                  {lastFeedback.hasErrors ? '• Suggestion Ready' : '• Well Said!'}
                </Text>
              </View>
              {lastFeedback.hasErrors && (
                <Text style={styles.correctedSentenceText}>"{lastFeedback.correctedSentence}"</Text>
              )}
              <Text style={styles.tamilFeedbackText}>{lastFeedback.tamilExplanation}</Text>
            </View>
          )}
        </>
      )}

      {/* Contextual Quick Reply Suggestions */}
      <View style={styles.quickPromptsRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
        >
          {currentQuickPrompts.map((prompt, idx) => (
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

        <View style={styles.controlButtonsBar}>
          <TouchableOpacity
            style={[
              styles.callActionBtn,
              {
                backgroundColor: isCalling ? '#28223A' : THEME.colors.primary,
                borderWidth: 1,
                borderColor: isCalling ? '#3D3456' : THEME.colors.primaryGlow,
              },
            ]}
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
              if (userTranscript.trim()) {
                handleSendSpokenText();
              } else {
                handleSendSpokenText(currentQuickPrompts[0]);
              }
            }}
          >
            <Image source={SUPERNOVA_IMAGES.bubbleMic} style={styles.bubbleMicIcon} resizeMode="contain" />
            <Text style={styles.micLabel}>
              {isUserSpeaking ? 'Release' : 'Practice'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.callActionBtnSecondary, isMutedAudio && styles.callActionBtnMuted]}
            onPress={toggleMute}
            onLongPress={() => speakAiMessage(messages[messages.length - 1]?.content || '')}
          >
            <Ionicons
              name={isMutedAudio ? 'volume-mute' : 'volume-high'}
              size={22}
              color={isMutedAudio ? THEME.colors.textMuted : THEME.colors.primaryGlow}
            />
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
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  callHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  callHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
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
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  liveTimerText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: THEME.colors.text,
  },
  scenarioTitleTag: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginLeft: 8,
    flexShrink: 1,
  },
  headerActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconPillBtn: {
    width: 30,
    height: 28,
    borderRadius: 10,
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPillBtnActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primary,
  },
  scenarioPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  scenarioPillText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.primaryGlow,
  },
  transcriptScroll: {
    flex: 1,
  },
  transcriptContent: {
    padding: 14,
    gap: 10,
  },
  transcriptRoleHeader: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11,
    color: THEME.colors.primaryGlow,
    textAlign: 'center',
    marginBottom: 4,
  },
  chatRow: {
    flexDirection: 'row',
  },
  chatRowUser: {
    justifyContent: 'flex-end',
  },
  chatRowBot: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '82%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  chatBubbleUser: {
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 4,
  },
  chatBubbleBot: {
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderBottomLeftRadius: 4,
  },
  chatBubbleText: {
    fontFamily: THEME.fonts.body,
    fontSize: 13.5,
    color: THEME.colors.text,
    lineHeight: 19,
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
    marginHorizontal: 14,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  subtitleText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 14,
    color: THEME.colors.text,
    textAlign: 'center',
    lineHeight: 20,
  },
  feedbackCard: {
    backgroundColor: THEME.colors.surfaceElevated,
    marginHorizontal: 14,
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
    color: '#E9D5FF',
    marginTop: 4,
  },
  tamilFeedbackText: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 12.5,
    color: THEME.colors.gold,
    lineHeight: 21,
    marginTop: 2,
  },
  quickPromptsRow: {
    marginVertical: 10,
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
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  callActionBtnSecondary: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: THEME.colors.surfaceCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  callActionBtnMuted: {
    borderColor: '#484366',
    backgroundColor: '#232036',
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

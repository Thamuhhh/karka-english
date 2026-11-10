import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { THEME } from '../constants/theme';
import { SUPERNOVA_IMAGES } from '../constants/supernovaAssets';
import { playSoundEffect } from '../services/soundEffectsService';
import { speakText, stopAllAudio, warmupVoices } from '../services/ttsService';
import { AnimatedChatBubble, TypingDots, TypewriterText } from '../components/ChatAnimations';
import {
  beginAudioCapture,
  finishAudioCapture,
  abortAudioCapture,
} from '../services/voiceRecorderService';
import { analyzeAndReplySpokenAudio, sendChatMessage } from '../api/supernovaAi';
import { SCENARIOS } from '../constants/scenarios';
import { ChatMessage, GrammarCorrection, UserStats } from '../types';
import { addXp, incrementMetric } from '../services/storageService';

interface LiveVoiceCallScreenProps {
  onStatsUpdate?: (stats: UserStats) => void;
}

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

const SCENARIO_PROMPTS: Record<string, string[]> = {
  'interview-tech': [
    'I build mobile apps with React Native and TypeScript.',
    'In my last project, I optimized API latency cleanly.',
    'I collaborate closely with design and QA teams.',
  ],
  'cafe-order': [
    'Hi! Could I get a large iced oat latte, please?',
    'Could you warm up a butter croissant for me?',
    'Takeaway please. Can I pay by card?',
  ],
  'airport-travel': [
    'I am here on vacation for ten days.',
    'Here is my passport and hotel confirmation.',
    'Yes, my return flight is next Sunday.',
  ],
  'workplace-standup': [
    'Yesterday I finished checkout UI; today writing tests.',
    'No major blockers, waiting on PR review.',
    'I will sync with QA right after standup.',
  ],
  'casual-hangout': [
    'My day is going well! I just finished some work.',
    'I am thinking of relaxing and watching a movie tonight.',
    'Can we talk about daily routines or weekend plans?',
  ],
};

export const LiveVoiceCallScreen: React.FC<LiveVoiceCallScreenProps> = ({ onStatsUpdate }) => {
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const activeScenario = SCENARIOS[activeScenarioIdx] || SCENARIOS[0];

  const [isCalling, setIsCalling] = useState(true);
  const [isMutedAudio, setIsMutedAudio] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showScenarios, setShowScenarios] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isSendingText, setIsSendingText] = useState(false);
  const [animatedBotMsgId, setAnimatedBotMsgId] = useState<string | null>(null);
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

  const recordingRef = useRef<Audio.Recording | null>(null);

  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;
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
      const loopPulse = Animated.loop(
        Animated.stagger(240, [
          Animated.sequence([
            Animated.timing(pulseAnim1, {
              toValue: 1.24,
              duration: 720,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(pulseAnim1, {
              toValue: 1,
              duration: 720,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
          Animated.sequence([
            Animated.timing(pulseAnim2, {
              toValue: 1.4,
              duration: 720,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
            Animated.timing(pulseAnim2, {
              toValue: 1,
              duration: 720,
              easing: Easing.inOut(Easing.ease),
              useNativeDriver: USE_NATIVE_DRIVER,
            }),
          ]),
        ])
      );

      const loopWave = Animated.loop(
        Animated.sequence([
          Animated.timing(waveAnim, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
          Animated.timing(waveAnim, {
            toValue: 0,
            duration: 380,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: USE_NATIVE_DRIVER,
          }),
        ])
      );

      loopPulse.start();
      loopWave.start();
      return () => {
        loopPulse.stop();
        loopWave.stop();
      };
    }

    pulseAnim1.setValue(1);
    pulseAnim2.setValue(1);
    waveAnim.setValue(0);
  }, [isAiSpeaking, isUserSpeaking, pulseAnim1, pulseAnim2, waveAnim]);

  useEffect(() => {
    warmupVoices();
    speakAiMessage(messages[0].content);
    return () => {
      stopAllAudio();
      abortAudioCapture(recordingRef.current);
      recordingRef.current = null;
    };
  }, []);

  const speakAiMessage = (text: string) => {
    if (isMutedAudio || !text.trim()) {
      setIsAiSpeaking(false);
      return;
    }
    setIsAiSpeaking(true);
    speakText(text, () => {
      setIsAiSpeaking(false);
    });
  };

  const handleSelectScenario = (idx: number) => {
    const nextScenario = SCENARIOS[idx];
    if (!nextScenario) return;
    stopAllAudio();
    abortAudioCapture(recordingRef.current);
    recordingRef.current = null;
    setIsUserSpeaking(false);
    playSoundEffect('button');
    setActiveScenarioIdx(idx);
    setShowScenarios(false);
    setAnimatedBotMsgId(null);
    setLastFeedback(null);
    setCallDuration(0);
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
    if (!text || isSendingText || isProcessingAudio) return;

    if (!isCalling) setIsCalling(true);
    setUserTranscript('');
    stopAllAudio();
    setIsAiSpeaking(false);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsSendingText(true);

    try {
      const { reply, feedback } = await sendChatMessage(newHistory, text, activeScenario);
      setLastFeedback(feedback);

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      setAnimatedBotMsgId(botMsg.id);
      setMessages([...newHistory, botMsg]);
      speakAiMessage(reply);
      await addXp(10);
      const updated = await incrementMetric('conversationsDone', 1);
      onStatsUpdate?.(updated);
    } catch (e) {
      console.warn('Call error:', e);
      setIsAiSpeaking(false);
    } finally {
      setIsSendingText(false);
    }
  };

  const handleMicToggle = async () => {
    if (isProcessingAudio) return;

    if (!isUserSpeaking) {
      if (!isCalling) setIsCalling(true);
      setIsAiSpeaking(false);
      const started = await beginAudioCapture();
      if (!started.ok) {
        Alert.alert(
          started.reason === 'denied' ? 'Microphone Permission' : 'Microphone Error',
          started.reason === 'denied'
            ? 'Please allow microphone access so Nila can hear your English pronunciation.'
            : 'Could not start microphone recording on this device.'
        );
        return;
      }
      recordingRef.current = started.recording;
      setIsUserSpeaking(true);
      return;
    }

    const activeRecording = recordingRef.current;
    recordingRef.current = null;
    setIsUserSpeaking(false);
    if (!activeRecording) return;

    setIsProcessingAudio(true);
    try {
      const encoded = await finishAudioCapture(activeRecording);
      if (!encoded) {
        Alert.alert(
          'Too Short',
          'Tap the mic, speak clearly for at least 1 second, then tap again to send.'
        );
        return;
      }

      const result = await analyzeAndReplySpokenAudio(
        encoded.base64,
        encoded.mimeType,
        messages,
        { mode: 'scenario', scenario: activeScenario }
      );

      if (!result.ok) {
        const msg =
          result.reason === 'no_key'
            ? 'Add EXPO_PUBLIC_GEMINI_API_KEY in .env and restart with npx expo start -c.'
            : result.reason === 'unintelligible'
              ? 'Could not hear words clearly. Try speaking closer to your microphone.'
              : result.detail
                ? `Gemini error: ${result.detail}`
                : 'Could not reach Gemini right now. Check your internet connection or API quota.';
        Alert.alert('Voice Check', msg);
        return;
      }

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: result.transcript,
        timestamp: Date.now(),
      };
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: result.reply,
        timestamp: Date.now(),
      };

      setAnimatedBotMsgId(botMsg.id);
      setLastFeedback(result.feedback);
      setMessages((prev) => [...prev, userMsg, botMsg]);
      speakAiMessage(result.reply);
      await addXp(15);
      const updated = await incrementMetric('conversationsDone', 1);
      onStatsUpdate?.(updated);
    } finally {
      setIsProcessingAudio(false);
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
      }, 700);
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

  const isAwaitingReply = isProcessingAudio || isSendingText;
  const currentQuickPrompts =
    SCENARIO_PROMPTS[activeScenario.id] || SCENARIO_PROMPTS['casual-hangout'];
  const latestAiMsg = [...messages].reverse().find((m) => m.role === 'assistant');
  const latestAiText = latestAiMsg?.content || activeScenario.initialMessage;
  const hasTyped = userTranscript.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Minimal Session Utility Bar (Zero Heavy Box) */}
      <View style={styles.sessionBar}>
        <TouchableOpacity
          style={styles.scenarioTrigger}
          onPress={() => setShowScenarios((prev) => !prev)}
          activeOpacity={0.78}
        >
          <View
            style={[
              styles.liveDot,
              {
                backgroundColor: isCalling
                  ? THEME.colors.primaryGlow
                  : THEME.colors.textMuted,
              },
            ]}
          />
          <Text style={styles.timerText}>{isCalling ? formatTime(callDuration) : 'Paused'}</Text>
          <Text style={styles.dotSeparator}>·</Text>
          <Text style={styles.scenarioLabel} numberOfLines={1}>
            {activeScenario.title}
          </Text>
          <Ionicons
            name={showScenarios ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={THEME.colors.textSecondary}
          />
        </TouchableOpacity>

        <View style={styles.utilityActions}>
          <TouchableOpacity
            style={[styles.utilityBtn, showTranscript && styles.utilityBtnActive]}
            onPress={() => setShowTranscript((prev) => !prev)}
            activeOpacity={0.78}
          >
            <Ionicons
              name={showTranscript ? 'chatbubbles' : 'chatbubbles-outline'}
              size={16}
              color={showTranscript ? '#FFFFFF' : THEME.colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.utilityBtn}
            onPress={toggleMute}
            activeOpacity={0.78}
          >
            <Ionicons
              name={isMutedAudio ? 'volume-mute-outline' : 'volume-high-outline'}
              size={17}
              color={isMutedAudio ? THEME.colors.textMuted : THEME.colors.primaryGlow}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Collapsible Horizontal Scenario Selector */}
      {showScenarios && (
        <View style={styles.scenarioDrawer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scenarioDrawerContent}
          >
            {SCENARIOS.map((sc, idx) => {
              const selected = idx === activeScenarioIdx;
              return (
                <TouchableOpacity
                  key={sc.id}
                  style={[styles.scenarioChip, selected && styles.scenarioChipActive]}
                  onPress={() => handleSelectScenario(idx)}
                  activeOpacity={0.82}
                >
                  <Ionicons
                    name={sc.avatar as keyof typeof Ionicons.glyphMap}
                    size={13}
                    color={selected ? '#FFFFFF' : THEME.colors.textSecondary}
                  />
                  <Text
                    style={[styles.scenarioChipText, selected && styles.scenarioChipTextActive]}
                  >
                    {sc.title}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Main Content Stage: Transcript Chat OR Ambient Voice Studio */}
      {showTranscript ? (
        <ScrollView
          ref={transcriptScrollRef}
          style={styles.mainScroll}
          contentContainerStyle={styles.transcriptContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => transcriptScrollRef.current?.scrollToEnd({ animated: true })}
        >
          <Text style={styles.personaEyebrow}>{activeScenario.persona}</Text>
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <AnimatedChatBubble
                key={msg.id}
                style={[styles.chatRow, isUser ? styles.chatRowUser : styles.chatRowBot]}
              >
                <View style={[styles.chatBubble, isUser ? styles.chatBubbleUser : styles.chatBubbleBot]}>
                  <TypewriterText
                    text={msg.content}
                    animate={!isUser && msg.id === animatedBotMsgId}
                    style={styles.chatBubbleText}
                  />
                </View>
              </AnimatedChatBubble>
            );
          })}
          {isAwaitingReply && (
            <AnimatedChatBubble style={[styles.chatRow, styles.chatRowBot]}>
              <View style={[styles.chatBubble, styles.chatBubbleBot]}>
                <TypingDots color="#C4B5FD" />
              </View>
            </AnimatedChatBubble>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.mainScroll}
          contentContainerStyle={styles.studioScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Ambient Voice Orb Stage */}
          <View style={styles.avatarStage}>
            <View style={styles.orbWrap}>
              <Animated.View
                style={[
                  styles.auraRingOuter,
                  {
                    borderColor: isUserSpeaking
                      ? 'rgba(251, 191, 36, 0.28)'
                      : 'rgba(127, 67, 254, 0.24)',
                    transform: [{ scale: pulseAnim2 }],
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.auraRingInner,
                  {
                    backgroundColor: isUserSpeaking
                      ? 'rgba(251, 191, 36, 0.14)'
                      : 'rgba(127, 67, 254, 0.16)',
                    transform: [{ scale: pulseAnim1 }],
                  },
                ]}
              />

              <View
                style={[
                  styles.portraitRing,
                  isAiSpeaking && styles.portraitRingSpeaking,
                  isUserSpeaking && styles.portraitRingListening,
                ]}
              >
                <Image
                  source={SUPERNOVA_IMAGES.novaAvatar}
                  style={styles.portraitImg}
                  resizeMode="cover"
                />
              </View>
            </View>

            <View style={styles.statusRow}>
              <View style={styles.waveBars}>
                {[0.55, 1, 0.72, 0.9, 0.5].map((ratio, barIdx) => {
                  const high = 0.55 + ratio * 0.8;
                  const barScale =
                    isAiSpeaking || isUserSpeaking
                      ? waveAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: barIdx % 2 === 0 ? [0.42, high] : [high, 0.42],
                        })
                      : 0.42;
                  return (
                    <Animated.View
                      key={barIdx}
                      style={[
                        styles.waveBar,
                        {
                          backgroundColor: isUserSpeaking
                            ? THEME.colors.gold
                            : isAiSpeaking
                            ? THEME.colors.primaryGlow
                            : '#4E496B',
                          transform: [{ scaleY: barScale }],
                        },
                      ]}
                    />
                  );
                })}
              </View>
              <Text style={styles.statusLabel}>
                {isMutedAudio
                  ? 'Audio muted'
                  : isProcessingAudio
                  ? 'Checking pronunciation & reply...'
                  : isSendingText
                  ? 'Nila is typing...'
                  : isUserSpeaking
                  ? 'Listening... Tap mic to send'
                  : isAiSpeaking
                  ? 'Speaking...'
                  : isCalling
                  ? 'Tap mic to speak'
                  : 'Session paused'}
              </Text>
            </View>

            <Text style={styles.personaCaption} numberOfLines={1}>
              {activeScenario.persona}
            </Text>
          </View>

          {/* Open Spoken Dialogue Quote (Zero Box Border) */}
          <View style={styles.quoteBlock}>
            {isAwaitingReply ? (
              <TypingDots color={THEME.colors.primaryGlow} label="Nila is replying..." />
            ) : (
              <TypewriterText
                text={latestAiText}
                animate={latestAiMsg?.id === animatedBotMsgId}
                prefix='"'
                suffix='"'
                style={styles.quoteText}
              />
            )}
            <TouchableOpacity
              style={styles.replayChip}
              onPress={() => speakAiMessage(latestAiText)}
              activeOpacity={0.78}
            >
              <Ionicons name="volume-medium-outline" size={14} color={THEME.colors.primaryGlow} />
              <Text style={styles.replayText}>Listen again</Text>
            </TouchableOpacity>
          </View>

          {/* Left-Accented Subtle Coach Feedback Strip */}
          {lastFeedback && (
            <View
              style={[
                styles.coachStrip,
                {
                  borderLeftColor: lastFeedback.hasErrors
                    ? THEME.colors.gold
                    : THEME.colors.primaryGlow,
                },
              ]}
            >
              <View style={styles.coachTopRow}>
                <Text
                  style={[
                    styles.coachScoreText,
                    {
                      color: lastFeedback.hasErrors
                        ? THEME.colors.gold
                        : THEME.colors.primaryGlow,
                    },
                  ]}
                >
                  Fluency {lastFeedback.fluencyScore}/100 ·{' '}
                  {lastFeedback.hasErrors ? 'Natural Polish' : 'Great Phrasing'}
                </Text>
              </View>
              {lastFeedback.hasErrors && (
                <Text style={styles.correctedText}>"{lastFeedback.correctedSentence}"</Text>
              )}
              {lastFeedback.pronunciationTip && (
                <Text style={styles.pronunciationTipText}>
                  Pronunciation: {lastFeedback.pronunciationTip}
                </Text>
              )}
              <Text style={styles.tamilTipText}>{lastFeedback.tamilExplanation}</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Contextual Single-Line Quick Reply Chips */}
      <View style={styles.promptsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.promptsContent}
        >
          {currentQuickPrompts.map((prompt, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.promptChip}
              onPress={() => handleSendSpokenText(prompt)}
              activeOpacity={0.8}
            >
              <Text style={styles.promptChipText} numberOfLines={1}>
                {prompt}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Single Floating Voice Composer Dock */}
      <View style={styles.composerDock}>
        <TouchableOpacity
          style={[styles.pauseCircleBtn, !isCalling && styles.pauseCircleBtnResume]}
          onPress={toggleCallState}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isCalling ? 'pause' : 'play'}
            size={16}
            color={isCalling ? THEME.colors.textSecondary : '#FFFFFF'}
          />
        </TouchableOpacity>

        <TextInput
          style={styles.composerInput}
          placeholder={isUserSpeaking ? 'Listening... tap mic to send' : 'Reply or tap mic to speak...'}
          placeholderTextColor={THEME.colors.textMuted}
          value={userTranscript}
          onChangeText={setUserTranscript}
          onSubmitEditing={() => handleSendSpokenText()}
          returnKeyType="send"
        />

        {hasTyped ? (
          <TouchableOpacity
            onPress={() => handleSendSpokenText()}
            activeOpacity={0.85}
            disabled={isAwaitingReply}
          >
            <LinearGradient
              colors={THEME.gradients.primary}
              style={styles.actionCircleBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {isAwaitingReply ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#FFFFFF" />
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.micCircleBtn, isUserSpeaking && styles.micCircleBtnListening]}
            activeOpacity={0.82}
            disabled={isAwaitingReply}
            onPress={handleMicToggle}
          >
            {isProcessingAudio ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name={isUserSpeaking ? 'stop' : 'mic'}
                size={18}
                color="#FFFFFF"
              />
            )}
          </TouchableOpacity>
        )}
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

  /* SESSION BAR */
  sessionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  scenarioTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    flexShrink: 1,
    marginRight: 10,
    gap: 6,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  timerText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  dotSeparator: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11,
    color: THEME.colors.textMuted,
  },
  scenarioLabel: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
    flexShrink: 1,
  },
  utilityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  utilityBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  utilityBtnActive: {
    backgroundColor: THEME.colors.primary,
  },

  /* COLLAPSIBLE SCENARIO PICKER */
  scenarioDrawer: {
    paddingBottom: 6,
  },
  scenarioDrawerContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  scenarioChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#151422',
    borderWidth: 1,
    borderColor: '#27243D',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  scenarioChipActive: {
    backgroundColor: THEME.colors.primary,
    borderColor: THEME.colors.primaryGlow,
  },
  scenarioChipText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textSecondary,
  },
  scenarioChipTextActive: {
    fontFamily: THEME.fonts.bold,
    color: '#FFFFFF',
  },

  /* MAIN STAGE & TRANSCRIPT */
  mainScroll: {
    flex: 1,
  },
  studioScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  transcriptContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  personaEyebrow: {
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
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 16,
  },
  chatBubbleUser: {
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 4,
  },
  chatBubbleBot: {
    backgroundColor: '#161423',
    borderWidth: 1,
    borderColor: '#252238',
    borderBottomLeftRadius: 4,
  },
  chatBubbleText: {
    fontFamily: THEME.fonts.body,
    fontSize: 13.5,
    color: '#FFFFFF',
    lineHeight: 19,
  },

  /* AMBIENT VOICE ORB STAGE */
  avatarStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  orbWrap: {
    width: 132,
    height: 132,
    justifyContent: 'center',
    alignItems: 'center',
  },
  auraRingOuter: {
    position: 'absolute',
    width: 126,
    height: 126,
    borderRadius: 63,
    borderWidth: 1,
  },
  auraRingInner: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  portraitRing: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: '#161424',
    borderWidth: 2,
    borderColor: 'rgba(167, 139, 250, 0.45)',
    overflow: 'hidden',
  },
  portraitRingSpeaking: {
    borderColor: THEME.colors.primaryGlow,
    shadowColor: '#7F43FE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 14,
    elevation: 10,
  },
  portraitRingListening: {
    borderColor: THEME.colors.gold,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  portraitImg: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.04 }],
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  waveBars: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 14,
  },
  waveBar: {
    width: 2.5,
    height: 12,
    borderRadius: 1.5,
  },
  statusLabel: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12.5,
    color: '#E9D5FF',
  },
  personaCaption: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    marginTop: 3,
  },

  /* OPEN SPOKEN QUOTE */
  quoteBlock: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quoteText: {
    fontFamily: THEME.fonts.bodyMedium,
    fontSize: 15.5,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 23,
  },
  replayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(127, 67, 254, 0.14)',
  },
  replayText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 11.5,
    color: '#C4B5FD',
  },

  /* LEFT-ACCENTED COACH TIP */
  coachStrip: {
    marginTop: 16,
    backgroundColor: 'rgba(24, 22, 38, 0.85)',
    borderLeftWidth: 3,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  coachTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coachScoreText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11.5,
  },
  correctedText: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13,
    color: '#FFFFFF',
    marginTop: 4,
    lineHeight: 19,
  },
  pronunciationTipText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 12,
    color: '#FDE68A',
    marginTop: 4,
    lineHeight: 18,
  },
  tamilTipText: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 20,
    marginTop: 3,
  },

  /* QUICK REPLY CHIPS */
  promptsWrap: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  promptsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  promptChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    maxWidth: 250,
  },
  promptChipText: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
  },

  /* FLOATING COMPOSER PILL DOCK */
  composerDock: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161423',
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.22)',
    borderRadius: 28,
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 7,
    paddingVertical: 6,
    gap: 8,
  },
  pauseCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseCircleBtnResume: {
    backgroundColor: THEME.colors.primary,
  },
  composerInput: {
    flex: 1,
    fontFamily: THEME.fonts.body,
    fontSize: 13.5,
    color: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  actionCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micCircleBtnListening: {
    backgroundColor: THEME.colors.gold,
  },
});

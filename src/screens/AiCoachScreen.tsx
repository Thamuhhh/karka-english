import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import { ChatMessage, RoleplayScenario, GrammarCorrection } from '../types';
import { SCENARIOS } from '../constants/scenarios';
import { sendChatMessage } from '../api/supernovaAi';
import { speakText, stopAllAudio } from '../services/ttsService';
import { incrementMetric } from '../services/storageService';

interface AiCoachProps {
  initialScenarioId?: string;
}

export const AiCoachScreen: React.FC<AiCoachProps> = ({ initialScenarioId }) => {
  const [activeScenario, setActiveScenario] = useState<RoleplayScenario>(() => {
    return SCENARIOS.find((s) => s.id === initialScenarioId) || SCENARIOS[0];
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [expandedFeedbackId, setExpandedFeedbackId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Initialize scenario chat
  useEffect(() => {
    setMessages([
      {
        id: 'msg-init',
        role: 'assistant',
        content: activeScenario.initialMessage,
        timestamp: Date.now(),
      },
    ]);
    stopAllAudio();
  }, [activeScenario]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    setInputText('');
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    try {
      const { reply, feedback } = await sendChatMessage(newHistory, text, activeScenario);

      // Attach feedback to user message
      userMsg.feedback = feedback;

      const botMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
      };

      setMessages([...newHistory, botMsg]);
      await incrementMetric('conversationsDone', 1);

      // Automatically play assistant audio for immersive listening
      speakAssistantMessage(botMsg.id, reply);
    } catch (e) {
      console.warn('Chat error:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const speakAssistantMessage = (msgId: string, text: string) => {
    setPlayingMessageId(msgId);
    speakText(text, () => {
      setPlayingMessageId(null);
    });
  };

  const toggleFeedback = (msgId: string) => {
    setExpandedFeedbackId(expandedFeedbackId === msgId ? null : msgId);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Scenario Pill Selector */}
      <View style={styles.scenarioBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scenarioPills}>
          {SCENARIOS.map((sc) => {
            const isActive = sc.id === activeScenario.id;
            return (
              <TouchableOpacity
                key={sc.id}
                style={[styles.scenarioPill, isActive && styles.scenarioPillActive]}
                onPress={() => setActiveScenario(sc)}
              >
                <Text style={styles.pillAvatar}>{sc.avatar}</Text>
                <Text style={[styles.pillTitle, isActive && styles.pillTitleActive]}>{sc.title}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Persona Header Info */}
      <View style={styles.personaBanner}>
        <View style={styles.avatarCircle}>
          <Text style={{ fontSize: 22 }}>{activeScenario.avatar}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.personaName}>{activeScenario.persona}</Text>
          <Text style={styles.personaDesc} numberOfLines={1}>
            {activeScenario.description}
          </Text>
        </View>
        <View style={styles.liveTag}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Supernova AI</Text>
        </View>
      </View>

      {/* Messages Stream */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatList}
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const isPlaying = playingMessageId === msg.id;
          const isFeedbackOpen = expandedFeedbackId === msg.id;

          return (
            <View key={msg.id} style={[styles.msgWrapper, isUser ? styles.msgWrapperUser : styles.msgWrapperBot]}>
              <View style={[styles.msgBubble, isUser ? styles.userBubble : styles.botBubble]}>
                <Text style={styles.msgText}>{msg.content}</Text>

                {/* Assistant Audio Button */}
                {!isUser && (
                  <TouchableOpacity
                    style={styles.speakerBtn}
                    onPress={() => speakAssistantMessage(msg.id, msg.content)}
                  >
                    <Ionicons
                      name={isPlaying ? 'volume-high' : 'volume-medium-outline'}
                      size={18}
                      color={THEME.colors.primaryGlow}
                    />
                    <Text style={styles.speakerBtnText}>{isPlaying ? 'Listening...' : 'Listen'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Supernova AI Feedback Chip for User Messages */}
              {isUser && msg.feedback && (
                <View style={styles.feedbackContainer}>
                  <TouchableOpacity
                    style={[
                      styles.feedbackChip,
                      msg.feedback.hasErrors ? styles.chipWarning : styles.chipSuccess,
                    ]}
                    onPress={() => toggleFeedback(msg.id)}
                  >
                    <Ionicons
                      name={msg.feedback.hasErrors ? 'bulb-outline' : 'checkmark-circle-outline'}
                      size={14}
                      color={msg.feedback.hasErrors ? THEME.colors.warning : THEME.colors.success}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        { color: msg.feedback.hasErrors ? THEME.colors.warning : THEME.colors.success },
                      ]}
                    >
                      {msg.feedback.hasErrors
                        ? `AI Suggestion (${msg.feedback.fluencyScore}% fluency)`
                        : 'Perfect sentence! 🌟'}
                    </Text>
                    <Ionicons
                      name={isFeedbackOpen ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={THEME.colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Expanded Grammar Analysis Dropdown */}
                  {isFeedbackOpen && (
                    <View style={styles.feedbackDetails}>
                      {msg.feedback.hasErrors && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Better English:</Text>
                          <Text style={styles.detailCorrected}>{msg.feedback.correctedSentence}</Text>
                        </View>
                      )}

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Grammar Tip:</Text>
                        <Text style={styles.detailExplain}>{msg.feedback.explanation}</Text>
                      </View>

                      <View style={styles.detailRowTamil}>
                        <Text style={styles.detailLabelTamil}>தமிழ் விளக்கம்:</Text>
                        <Text style={styles.detailTamilText}>{msg.feedback.tamilExplanation}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Native phrasing:</Text>
                        <Text style={styles.detailNative}>"{msg.feedback.nativeIdiomaticVersion}"</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {isLoading && (
          <View style={[styles.msgWrapper, styles.msgWrapperBot]}>
            <View style={[styles.msgBubble, styles.botBubble, styles.loadingBubble]}>
              <ActivityIndicator size="small" color={THEME.colors.primaryGlow} />
              <Text style={styles.loadingText}>Miss Nova is thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Suggested Quick Replies */}
      <View style={styles.quickRepliesContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
          {activeScenario.id === 'cafe-order' && (
            <>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleSend("I'd like an iced latte with oat milk, please.")}>
                <Text style={styles.quickPillText}>"I'd like an iced latte with oat milk, please."</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleSend("Could I get a warm croissant as well?")}>
                <Text style={styles.quickPillText}>"Could I get a warm croissant as well?"</Text>
              </TouchableOpacity>
            </>
          )}
          {activeScenario.id === 'interview-tech' && (
            <>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleSend("Sure! I am a full-stack developer experienced in building scalable applications.")}>
                <Text style={styles.quickPillText}>"I am a full-stack developer..."</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleSend("In my previous project, we optimized database queries to reduce latency.")}>
                <Text style={styles.quickPillText}>"In my previous project..."</Text>
              </TouchableOpacity>
            </>
          )}
          {activeScenario.id === 'airport-travel' && (
            <>
              <TouchableOpacity style={styles.quickPill} onPress={() => handleSend("I am here for a 2-week vacation to visit tourist spots.")}>
                <Text style={styles.quickPillText}>"I am here for a 2-week vacation."</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Speak or type your English sentence..."
          placeholderTextColor={THEME.colors.textMuted}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={200}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || isLoading) && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons name="arrow-up" size={20} color={THEME.colors.text} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  scenarioBar: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  scenarioPills: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  scenarioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  scenarioPillActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderColor: THEME.colors.primary,
  },
  pillAvatar: {
    fontSize: 16,
    marginRight: 6,
  },
  pillTitle: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  pillTitleActive: {
    color: THEME.colors.primaryGlow,
    fontWeight: '700',
  },
  personaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: THEME.colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  personaName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.text,
  },
  personaDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.success,
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    color: THEME.colors.success,
    fontWeight: '600',
  },
  chatList: {
    flex: 1,
  },
  chatContent: {
    padding: 16,
    paddingBottom: 20,
  },
  msgWrapper: {
    marginBottom: 16,
    maxWidth: '85%',
  },
  msgWrapperUser: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  msgWrapperBot: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  msgBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: THEME.colors.primary,
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: THEME.colors.surfaceCard,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderBottomLeftRadius: 4,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: THEME.colors.textSecondary,
    fontSize: 13,
    marginLeft: 8,
  },
  msgText: {
    fontSize: 15,
    color: THEME.colors.text,
    lineHeight: 22,
  },
  speakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  speakerBtnText: {
    color: THEME.colors.primaryGlow,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  feedbackContainer: {
    marginTop: 6,
    maxWidth: '100%',
  },
  feedbackChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipSuccess: {
    backgroundColor: THEME.colors.successBg,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  chipWarning: {
    backgroundColor: THEME.colors.warningBg,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    marginHorizontal: 4,
  },
  feedbackDetails: {
    backgroundColor: THEME.colors.surfaceCard,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 6,
    gap: 6,
  },
  detailRow: {
    flexDirection: 'column',
  },
  detailLabel: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  detailCorrected: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.success,
    marginTop: 1,
  },
  detailExplain: {
    fontSize: 12,
    color: THEME.colors.text,
    marginTop: 1,
  },
  detailRowTamil: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    padding: 6,
    borderRadius: 6,
  },
  detailLabelTamil: {
    fontSize: 10,
    color: THEME.colors.gold,
    fontWeight: '700',
  },
  detailTamilText: {
    fontSize: 12,
    color: THEME.colors.text,
    marginTop: 1,
  },
  detailNative: {
    fontSize: 12,
    fontStyle: 'italic',
    color: THEME.colors.secondary,
    marginTop: 1,
  },
  quickRepliesContainer: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  quickPill: {
    backgroundColor: THEME.colors.surfaceCard,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginRight: 8,
  },
  quickPillText: {
    fontSize: 12,
    color: THEME.colors.primaryGlow,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: THEME.colors.text,
    fontSize: 14,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: THEME.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: THEME.colors.surfaceElevated,
    opacity: 0.5,
  },
});

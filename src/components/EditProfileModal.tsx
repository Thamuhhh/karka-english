import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import {
  AVATAR_PACK_ITEMS,
  AvatarPackId,
  DEFAULT_AVATAR_ID,
  getAvatarPackItem,
} from '../constants/avatarPack';
import { AuthUser } from '../types';

interface EditProfileModalProps {
  visible: boolean;
  authUser?: AuthUser | null;
  onSave: (updates: { name: string; avatarId: AvatarPackId }) => Promise<void> | void;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  authUser,
  onSave,
  onClose,
}) => {
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarPackId>(
    (authUser?.avatarId as AvatarPackId) || DEFAULT_AVATAR_ID
  );
  const [name, setName] = useState(authUser?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const reelScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      const initialId = (authUser?.avatarId as AvatarPackId) || DEFAULT_AVATAR_ID;
      setSelectedAvatarId(initialId);
      setName(authUser?.name || '');
    }
  }, [visible, authUser]);

  const currentIndex = Math.max(
    0,
    AVATAR_PACK_ITEMS.findIndex((item) => item.id === selectedAvatarId)
  );
  const activeAvatar = getAvatarPackItem(selectedAvatarId);

  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + AVATAR_PACK_ITEMS.length) % AVATAR_PACK_ITEMS.length;
    const nextItem = AVATAR_PACK_ITEMS[nextIdx];
    setSelectedAvatarId(nextItem.id);
    reelScrollRef.current?.scrollTo({ x: Math.max(0, nextIdx * 58 - 80), animated: true });
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % AVATAR_PACK_ITEMS.length;
    const nextItem = AVATAR_PACK_ITEMS[nextIdx];
    setSelectedAvatarId(nextItem.id);
    reelScrollRef.current?.scrollTo({ x: Math.max(0, nextIdx * 58 - 80), animated: true });
  };

  const handleSelect = (id: AvatarPackId, idx: number) => {
    setSelectedAvatarId(id);
    reelScrollRef.current?.scrollTo({ x: Math.max(0, idx * 58 - 80), animated: true });
  };

  const handleSave = async () => {
    if (isSaving) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    try {
      await onSave({
        name: trimmedName,
        avatarId: selectedAvatarId,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.backdrop}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoid}
        >
          <View style={styles.sheetContainer}>
            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerTextGroup}>
                <Text style={styles.superTitle}>ACCOUNT SETTINGS</Text>
                <Text style={styles.mainTitle}>Edit Profile</Text>
                <Text style={styles.subtitle}>Swipe or tap arrows to pick your look</Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close edit profile"
              >
                <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {/* Interactive Hero Stage Carousel */}
              <View style={styles.heroStageContainer}>
                {/* Left Arrow Button */}
                <TouchableOpacity
                  onPress={handlePrev}
                  style={styles.arrowBtn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Previous avatar"
                >
                  <Ionicons name="chevron-back" size={22} color={THEME.colors.textWhite} />
                </TouchableOpacity>

                {/* Center Hero Spotlight */}
                <View style={styles.spotlightWrapper}>
                  <View
                    style={[
                      styles.spotlightAmbientGlow,
                      { backgroundColor: `${THEME.colors.primary}28` },
                    ]}
                  />
                  <View
                    style={[
                      styles.heroRing,
                      { borderColor: THEME.colors.primary },
                    ]}
                  >
                    <Image
                      source={activeAvatar.source}
                      style={styles.heroImage}
                      resizeMode="contain"
                    />
                  </View>
                  <View
                    style={[
                      styles.selectedBadge,
                      { backgroundColor: THEME.colors.primary },
                    ]}
                  >
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  </View>
                </View>

                {/* Right Arrow Button */}
                <TouchableOpacity
                  onPress={handleNext}
                  style={styles.arrowBtn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Next avatar"
                >
                  <Ionicons name="chevron-forward" size={22} color={THEME.colors.textWhite} />
                </TouchableOpacity>
              </View>

              {/* Avatar Indicator Counter */}
              <View style={styles.counterRow}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} of {AVATAR_PACK_ITEMS.length}
                </Text>
              </View>

              {/* Horizontal Thumbnail Reel (Filmstrip) */}
              <ScrollView
                ref={reelScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.reelContent}
                style={styles.reelScroll}
              >
                {AVATAR_PACK_ITEMS.map((item, idx) => {
                  const isSelected = item.id === selectedAvatarId;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleSelect(item.id, idx)}
                      activeOpacity={0.75}
                      style={[
                        styles.reelItem,
                        isSelected && {
                          borderColor: THEME.colors.primary,
                          transform: [{ scale: 1.08 }],
                        },
                      ]}
                    >
                      <Image
                        source={item.source}
                        style={styles.reelImage}
                        resizeMode="contain"
                      />
                      {isSelected && (
                        <View
                          style={[
                            styles.reelIndicatorDot,
                            { backgroundColor: THEME.colors.primary },
                          ]}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Display Name Input */}
              <Text style={styles.sectionHeading}>DISPLAY NAME</Text>
              <View style={styles.inputCard}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={THEME.colors.primaryGlow}
                  style={styles.inputIcon}
                />
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your name"
                  placeholderTextColor={THEME.colors.textMuted}
                  maxLength={30}
                  style={styles.textInput}
                  autoCorrect={false}
                />
                {name.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setName('')}
                    style={styles.clearBtn}
                  >
                    <Ionicons name="close-circle" size={16} color={THEME.colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Account Meta */}
              {!!authUser?.email && (
                <View style={styles.metaRow}>
                  <Ionicons name="mail-outline" size={14} color={THEME.colors.textMuted} />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {authUser.email} ({authUser.provider === 'google' ? 'Google' : 'Email'})
                  </Text>
                </View>
              )}

              {/* Account Info */}
              <View style={styles.contentDivider} />
              <Text style={styles.sectionHeading}>ACCOUNT</Text>
              <View style={styles.accountInfoCard}>
                <View style={styles.accountInfoRow}>
                  <Ionicons name="shield-checkmark-outline" size={15} color={THEME.colors.primaryGlow} />
                  <Text style={styles.accountInfoLabel}>Provider</Text>
                  <Text style={styles.accountInfoValue}>
                    {authUser?.provider === 'google' ? 'Google' : authUser?.provider === 'email' ? 'Email' : 'Guest'}
                  </Text>
                </View>
                <View style={styles.accountInfoDivider} />
                <View style={styles.accountInfoRow}>
                  <Ionicons name="calendar-outline" size={15} color={THEME.colors.primaryGlow} />
                  <Text style={styles.accountInfoLabel}>Joined</Text>
                  <Text style={styles.accountInfoValue}>
                    {authUser?.createdAt
                      ? new Date(authUser.createdAt).toLocaleDateString('en-IN', {
                          month: 'short',
                          year: 'numeric',
                        })
                      : '—'}
                  </Text>
                </View>
                {authUser?.isCloudSession && (
                  <>
                    <View style={styles.accountInfoDivider} />
                    <View style={styles.accountInfoRow}>
                      <Ionicons name="cloud-done-outline" size={15} color="#34D399" />
                      <Text style={styles.accountInfoLabel}>Sync</Text>
                      <Text style={[styles.accountInfoValue, { color: '#34D399' }]}>Cloud Synced</Text>
                    </View>
                  </>
                )}
              </View>
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSaving || !name.trim()}
                activeOpacity={0.85}
                style={[
                  styles.saveBtn,
                  (!name.trim() || isSaving) && styles.saveBtnDisabled,
                ]}
              >
                <Text style={styles.saveBtnText}>
                  {isSaving ? 'Saving Changes...' : 'Save Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 4, 10, 0.88)',
    justifyContent: 'flex-end',
  },
  keyboardAvoid: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    flex: 1,
    maxHeight: '90%',
    backgroundColor: THEME.colors.backgroundSecondary,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    paddingTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  headerTextGroup: {
    flex: 1,
  },
  superTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 10,
    letterSpacing: 1.5,
    color: THEME.colors.primaryGlow,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  mainTitle: {
    fontFamily: THEME.fonts.bold,
    fontSize: 22,
    color: THEME.colors.textWhite,
  },
  subtitle: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: THEME.colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heroStageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 10,
    gap: 20,
  },
  arrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: THEME.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: THEME.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  spotlightWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    width: 114,
    height: 114,
  },
  spotlightAmbientGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  heroRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3.5,
    backgroundColor: THEME.colors.surfaceDark,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    borderRadius: 52,
  },
  selectedBadge: {
    position: 'absolute',
    bottom: -2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: THEME.colors.backgroundSecondary,
  },
  counterRow: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 12,
  },
  counterText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  reelScroll: {
    marginTop: 4,
    marginBottom: 26,
  },
  reelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 12,
    gap: 12,
  },
  reelItem: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: THEME.colors.borderLight,
    backgroundColor: THEME.colors.surfaceDark,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  reelImage: {
    width: '100%',
    height: '100%',
    borderRadius: 25,
  },
  reelIndicatorDot: {
    position: 'absolute',
    bottom: -6,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionHeading: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: THEME.colors.textMuted,
    marginBottom: 10,
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    paddingHorizontal: 14,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontFamily: THEME.fonts.semiBold,
    fontSize: 15,
    color: THEME.colors.textWhite,
  },
  clearBtn: {
    padding: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 4,
  },
  metaText: {
    fontFamily: THEME.fonts.body,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
  },
  contentDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 18,
  },
  accountInfoCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: THEME.colors.border,
    paddingVertical: 4,
    paddingHorizontal: 14,
  },
  accountInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 10,
  },
  accountInfoLabel: {
    fontFamily: THEME.fonts.medium,
    fontSize: 13,
    color: THEME.colors.textSecondary,
    flex: 1,
  },
  accountInfoValue: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 13,
    color: THEME.colors.textWhite,
  },
  accountInfoDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.surfaceDark,
  },
  saveBtn: {
    height: 50,
    borderRadius: 14,
    backgroundColor: THEME.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

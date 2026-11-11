import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';
import {
  AVATAR_PACK_ITEMS,
  AvatarPackId,
  DEFAULT_AVATAR_ID,
  getAvatarPackItem,
} from '../constants/avatarPack';

interface AvatarPickerModalProps {
  visible: boolean;
  currentAvatarId?: string;
  onSelectAvatar: (avatarId: AvatarPackId) => void | Promise<void>;
  onClose?: () => void;
  isOnboarding?: boolean;
}

export const AvatarPickerModal: React.FC<AvatarPickerModalProps> = ({
  visible,
  currentAvatarId,
  onSelectAvatar,
  onClose,
  isOnboarding = false,
}) => {
  const [selectedId, setSelectedId] = useState<AvatarPackId>(
    (currentAvatarId as AvatarPackId) || DEFAULT_AVATAR_ID
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reelScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      setSelectedId((currentAvatarId as AvatarPackId) || DEFAULT_AVATAR_ID);
    }
  }, [visible, currentAvatarId]);

  const currentIndex = Math.max(
    0,
    AVATAR_PACK_ITEMS.findIndex((item) => item.id === selectedId)
  );
  const activeAvatar = getAvatarPackItem(selectedId);

  const handlePrev = () => {
    const nextIdx = (currentIndex - 1 + AVATAR_PACK_ITEMS.length) % AVATAR_PACK_ITEMS.length;
    const nextItem = AVATAR_PACK_ITEMS[nextIdx];
    setSelectedId(nextItem.id);
    reelScrollRef.current?.scrollTo({ x: Math.max(0, nextIdx * 58 - 80), animated: true });
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % AVATAR_PACK_ITEMS.length;
    const nextItem = AVATAR_PACK_ITEMS[nextIdx];
    setSelectedId(nextItem.id);
    reelScrollRef.current?.scrollTo({ x: Math.max(0, nextIdx * 58 - 80), animated: true });
  };

  const handleSelect = (id: AvatarPackId, idx: number) => {
    setSelectedId(id);
    reelScrollRef.current?.scrollTo({ x: Math.max(0, idx * 58 - 80), animated: true });
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onSelectAvatar(selectedId);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={() => {
        if (!isOnboarding && onClose) {
          onClose();
        }
      }}
    >
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.superTitle}>
                {isOnboarding ? 'WELCOME TO ELVATE' : 'PROFILE IMAGE'}
              </Text>
              <Text style={styles.mainTitle}>Choose Your Look</Text>
              <Text style={styles.subtitle}>
                Swipe or tap arrows to pick your learner avatar
              </Text>
            </View>
            {!isOnboarding && onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Interactive Hero Stage Carousel */}
            <View style={styles.heroStageContainer}>
              <TouchableOpacity
                onPress={handlePrev}
                style={styles.arrowBtn}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Previous avatar"
              >
                <Ionicons name="chevron-back" size={22} color={THEME.colors.textWhite} />
              </TouchableOpacity>

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

            {/* Counter */}
            <View style={styles.counterRow}>
              <Text style={styles.counterText}>
                {currentIndex + 1} of {AVATAR_PACK_ITEMS.length}
              </Text>
            </View>

            {/* Horizontal Filmstrip Reel */}
            <ScrollView
              ref={reelScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.reelContent}
              style={styles.reelScroll}
            >
              {AVATAR_PACK_ITEMS.map((item, idx) => {
                const isSelected = item.id === selectedId;
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
          </ScrollView>

          {/* Bottom Confirmation Action */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isSubmitting}
              activeOpacity={0.88}
              style={[
                styles.confirmBtn,
                { backgroundColor: THEME.colors.primary },
              ]}
            >
              <Text style={styles.confirmBtnText}>
                {isSubmitting
                  ? 'Saving...'
                  : isOnboarding
                  ? 'Continue'
                  : 'Confirm'}
              </Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
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
  sheetContainer: {
    flex: 1,
    maxHeight: '85%',
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
    marginVertical: 14,
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
    marginBottom: 16,
  },
  counterText: {
    fontFamily: THEME.fonts.medium,
    fontSize: 11.5,
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  reelScroll: {
    marginBottom: 16,
  },
  reelContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    gap: 10,
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
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.surfaceDark,
  },
  confirmBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  confirmBtnText: {
    fontFamily: THEME.fonts.bold,
    fontSize: 15,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});

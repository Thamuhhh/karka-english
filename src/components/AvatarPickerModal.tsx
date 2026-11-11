import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  SafeAreaView,
  Dimensions,
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 64) / 4;

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

  useEffect(() => {
    if (visible) {
      setSelectedId((currentAvatarId as AvatarPackId) || DEFAULT_AVATAR_ID);
    }
  }, [visible, currentAvatarId]);

  const activeAvatar = getAvatarPackItem(selectedId);

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
                {isOnboarding ? 'WELCOME TO ELVATE' : 'CHARACTER ROSTER'}
              </Text>
              <Text style={styles.mainTitle}>
                {isOnboarding ? 'Choose Your Avatar' : 'Switch Your Avatar'}
              </Text>
              <Text style={styles.tamilSubtitle}>
                {isOnboarding
                  ? 'உங்கள் கற்றல் அடையாளத்தைத் தேர்ந்தெடுக்கவும்'
                  : 'புதிய அவதாரைத் தேர்வு செய்யவும்'}
              </Text>
            </View>
            {!isOnboarding && onClose && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                accessibilityRole="button"
                accessibilityLabel="Close avatar picker"
              >
                <Ionicons name="close" size={22} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Active Avatar Spotlight Card */}
            <View
              style={[
                styles.spotlightCard,
                { borderColor: `${activeAvatar.accentColor}55` },
              ]}
            >
              <View
                style={[
                  styles.spotlightAvatarGlow,
                  { backgroundColor: `${activeAvatar.accentColor}22` },
                ]}
              >
                <View
                  style={[
                    styles.spotlightRing,
                    { borderColor: activeAvatar.accentColor },
                  ]}
                >
                  <Image
                    source={activeAvatar.source}
                    style={styles.spotlightImage}
                    resizeMode="contain"
                  />
                </View>
              </View>

              <View style={styles.spotlightInfo}>
                <View style={styles.nameRow}>
                  <Text style={styles.spotlightName}>{activeAvatar.name}</Text>
                  <View
                    style={[
                      styles.accentBadge,
                      { backgroundColor: `${activeAvatar.accentColor}25` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.accentBadgeText,
                        { color: activeAvatar.accentColor },
                      ]}
                    >
                      {activeAvatar.tamilName}
                    </Text>
                  </View>
                </View>
                <Text style={styles.spotlightTagline}>{activeAvatar.tagline}</Text>
                <Text style={styles.spotlightDesc}>{activeAvatar.description}</Text>
              </View>
            </View>

            {/* Avatar Grid */}
            <Text style={styles.sectionHeading}>
              SELECT YOUR IDENTITY ({AVATAR_PACK_ITEMS.length})
            </Text>
            <View style={styles.avatarGrid}>
              {AVATAR_PACK_ITEMS.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedId(item.id)}
                    activeOpacity={0.8}
                    style={[
                      styles.gridItem,
                      isSelected && {
                        borderColor: item.accentColor,
                        backgroundColor: `${item.accentColor}18`,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.gridImageContainer,
                        isSelected && { borderColor: item.accentColor },
                      ]}
                    >
                      <Image
                        source={item.source}
                        style={styles.gridImage}
                        resizeMode="contain"
                      />
                      {isSelected && (
                        <View
                          style={[
                            styles.checkmarkBadge,
                            { backgroundColor: item.accentColor },
                          ]}
                        >
                          <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.gridNameText,
                        isSelected && { color: item.accentColor },
                      ]}
                      numberOfLines={1}
                    >
                      {item.tamilName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Bottom Confirmation Action */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isSubmitting}
              activeOpacity={0.88}
              style={[
                styles.confirmBtn,
                { backgroundColor: activeAvatar.accentColor },
              ]}
            >
              <Text style={styles.confirmBtnText}>
                {isSubmitting
                  ? 'Saving...'
                  : isOnboarding
                  ? 'Confirm & Start Learning • தொடங்கு'
                  : 'Save Avatar • சேமி'}
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
    maxHeight: '92%',
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
  tamilSubtitle: {
    fontFamily: THEME.fonts.tamilMedium,
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
    paddingBottom: 24,
  },
  spotlightCard: {
    backgroundColor: THEME.colors.surfaceCard,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  spotlightAvatarGlow: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spotlightRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    overflow: 'hidden',
    backgroundColor: THEME.colors.surfaceDark,
  },
  spotlightImage: {
    width: '100%',
    height: '100%',
  },
  spotlightInfo: {
    flex: 1,
    marginLeft: 16,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  spotlightName: {
    fontFamily: THEME.fonts.bold,
    fontSize: 18,
    color: THEME.colors.textWhite,
  },
  accentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  accentBadgeText: {
    fontFamily: THEME.fonts.tamilBold,
    fontSize: 11,
  },
  spotlightTagline: {
    fontFamily: THEME.fonts.semiBold,
    fontSize: 12,
    color: THEME.colors.gold,
    marginTop: 3,
  },
  spotlightDesc: {
    fontFamily: THEME.fonts.body,
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
    marginTop: 4,
  },
  sectionHeading: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: THEME.colors.textMuted,
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceDark,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  gridImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: THEME.colors.borderLight,
    position: 'relative',
    overflow: 'visible',
    backgroundColor: THEME.colors.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 30,
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.surfaceDark,
  },
  gridNameText: {
    fontFamily: THEME.fonts.tamilMedium,
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    backgroundColor: THEME.colors.surfaceDark,
  },
  confirmBtn: {
    height: 52,
    borderRadius: 16,
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


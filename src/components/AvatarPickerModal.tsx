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
                {isOnboarding ? 'WELCOME TO ELVATE' : 'PROFILE IMAGE'}
              </Text>
              <Text style={styles.mainTitle}>Choose Profile Picture</Text>
              <Text style={styles.subtitle}>
                Select an avatar for your Elvate learning journey
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
            {/* Active Preview */}
            <View style={styles.previewContainer}>
              <View
                style={[
                  styles.previewRing,
                  { borderColor: activeAvatar.accentColor },
                ]}
              >
                <Image
                  source={activeAvatar.source}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>
            </View>

            {/* Avatar Grid - Pure images, no text/meaning */}
            <Text style={styles.sectionHeading}>SELECT AVATAR</Text>
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
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </View>
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
                  ? 'Continue • தொடரவும்'
                  : 'Confirm • உறுதிசெய்'}
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
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  previewRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    backgroundColor: THEME.colors.surfaceDark,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 45,
  },
  sectionHeading: {
    fontFamily: THEME.fonts.bold,
    fontSize: 11,
    letterSpacing: 1.2,
    color: THEME.colors.textMuted,
    marginBottom: 10,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: GRID_ITEM_SIZE,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 16,
    backgroundColor: THEME.colors.surfaceDark,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  gridImageContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: THEME.colors.borderLight,
    position: 'relative',
    backgroundColor: THEME.colors.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
  },
  checkmarkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.colors.surfaceDark,
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

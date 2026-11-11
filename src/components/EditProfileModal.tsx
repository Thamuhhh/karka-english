import React, { useState, useEffect } from 'react';
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
import { AuthUser } from '../types';

interface EditProfileModalProps {
  visible: boolean;
  authUser?: AuthUser | null;
  onSave: (updates: { name: string; avatarId: AvatarPackId }) => Promise<void> | void;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_SIZE = (SCREEN_WIDTH - 64) / 4;

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

  useEffect(() => {
    if (visible) {
      setSelectedAvatarId((authUser?.avatarId as AvatarPackId) || DEFAULT_AVATAR_ID);
      setName(authUser?.name || '');
    }
  }, [visible, authUser]);

  const activeAvatar = getAvatarPackItem(selectedAvatarId);

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
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.backdrop}>
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
                <Text style={styles.subtitle}>Update your profile image and name</Text>
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
              {/* Selected Avatar Preview */}
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
                  <View
                    style={[
                      styles.cameraBadge,
                      { backgroundColor: activeAvatar.accentColor },
                    ]}
                  >
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  </View>
                </View>
              </View>

              {/* Profile Image Grid - Pure images, zero meaning/tagline clutter */}
              <Text style={styles.sectionHeading}>CHOOSE PROFILE IMAGE</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_PACK_ITEMS.map((item) => {
                  const isSelected = item.id === selectedAvatarId;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSelectedAvatarId(item.id)}
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

              {/* Display Name Input */}
              <Text style={[styles.sectionHeading, { marginTop: 22 }]}>DISPLAY NAME</Text>
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
                  {isSaving ? 'Saving Changes...' : 'Save Profile • சேமி'}
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
  previewContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  previewRing: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 3,
    backgroundColor: THEME.colors.surfaceDark,
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: 43,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: THEME.colors.backgroundSecondary,
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


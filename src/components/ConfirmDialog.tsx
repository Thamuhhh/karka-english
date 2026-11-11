import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  icon = 'help-circle-outline',
  destructive = false,
  onConfirm,
  onCancel,
}) => (
  <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
    <View style={styles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />
      <View style={styles.card}>
        <View style={[styles.iconWrap, destructive && styles.iconWrapDanger]}>
          <Ionicons name={icon} size={23} color={THEME.colors.primaryGlow} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.cancelText}>{cancelLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmButton, destructive && styles.confirmButtonDanger]}
            onPress={onConfirm}
            activeOpacity={0.85}
          >
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
    backgroundColor: 'rgba(5, 4, 10, 0.72)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 22,
    borderRadius: 22,
    alignItems: 'center',
    backgroundColor: '#191722',
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.22)',
  },
  iconWrap: {
    width: 50,
    height: 50,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(127,67,254,0.15)',
    marginBottom: 14,
  },
  iconWrapDanger: { backgroundColor: 'rgba(127,67,254,0.15)' },
  title: {
    fontFamily: THEME.fonts.bold,
    color: THEME.colors.textWhite,
    fontSize: 18,
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    fontFamily: THEME.fonts.body,
    color: THEME.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  actions: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 22 },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelText: { fontFamily: THEME.fonts.semiBold, color: THEME.colors.textSecondary, fontSize: 13 },
  confirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primary,
  },
  confirmButtonDanger: { backgroundColor: THEME.colors.primary },
  confirmText: { fontFamily: THEME.fonts.bold, color: '#FFFFFF', fontSize: 13 },
});

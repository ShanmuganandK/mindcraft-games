/**
 * Confirmation Dialog Component - Accessible confirmation dialog for destructive actions
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  AccessibilityInfo,
  BackHandler,
} from 'react-native';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonColor?: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  accessibilityLabel?: string;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonColor = '#ff6b6b',
  onConfirm,
  onCancel,
  destructive = false,
  accessibilityLabel,
}) => {
  useEffect(() => {
    if (visible) {
      // Announce dialog to screen readers
      AccessibilityInfo.announceForAccessibility(
        `${title}. ${message}. Dialog opened.`
      );

      // Handle hardware back button on Android
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        onCancel();
        return true;
      });

      return () => backHandler.remove();
    }
  }, [visible, title, message, onCancel]);

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay}>
        <View
          style={styles.dialog}
          accessible={true}
          accessibilityRole="alertdialog"
          accessibilityLabel={accessibilityLabel || `${title} confirmation dialog`}
        >
          {/* Dialog Header */}
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
          </View>

          {/* Dialog Content */}
          <View style={styles.content}>
            <Text style={styles.message}>
              {message}
            </Text>
          </View>

          {/* Dialog Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel={`${cancelText} button`}
              accessibilityHint="Cancel this action and close the dialog"
            >
              <Text style={styles.cancelButtonText}>
                {cancelText}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                destructive && styles.destructiveButton,
                { backgroundColor: confirmButtonColor },
              ]}
              onPress={onConfirm}
              accessibilityRole="button"
              accessibilityLabel={`${confirmText} button`}
              accessibilityHint={
                destructive
                  ? 'Confirm this destructive action. This cannot be undone.'
                  : 'Confirm this action'
              }
            >
              <Text style={styles.confirmButtonText}>
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    minWidth: 280,
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 22,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderRightWidth: 1,
    borderRightColor: '#e0e0e0',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
  },
  destructiveButton: {
    backgroundColor: '#ff6b6b',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666666',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});
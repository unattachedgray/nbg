import React from 'react';
import {View, Text, StyleSheet, Pressable, Animated} from 'react-native';

export interface Toast {
  id: string;
  message: string;
  type: 'error' | 'info' | 'success' | 'warning';
}

interface ToastNotificationProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}

export function ToastNotification({
  toasts,
  onDismiss,
  onDismissAll,
}: ToastNotificationProps): React.JSX.Element {
  if (toasts.length === 0) {
    return <></>;
  }

  const getToastColor = (type: Toast['type']) => {
    switch (type) {
      case 'error':
        return '#F44336';
      case 'success':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'info':
      default:
        return '#2196F3';
    }
  };

  return (
    <View style={styles.container}>
      {toasts.length > 1 && (
        <Pressable style={styles.dismissAllButton} onPress={onDismissAll}>
          <Text style={styles.dismissAllText}>Dismiss All</Text>
        </Pressable>
      )}
      {toasts.map(toast => (
        <View
          key={toast.id}
          style={[
            styles.toast,
            {backgroundColor: getToastColor(toast.type)},
          ]}>
          <Text style={styles.message}>{toast.message}</Text>
          <Pressable
            style={styles.dismissButton}
            onPress={() => onDismiss(toast.id)}>
            <Text style={styles.dismissText}>✕</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    gap: 10,
    zIndex: 1000,
    alignItems: 'stretch',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  message: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
  },
  dismissButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dismissText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dismissAllButton: {
    backgroundColor: '#555555',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
    marginBottom: 8,
  },
  dismissAllText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});

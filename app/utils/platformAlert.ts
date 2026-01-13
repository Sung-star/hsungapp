// utils/platformAlert.ts - ✅ CROSS-PLATFORM ALERTS
import { Alert, Platform } from 'react-native';

/**
 * Hiển thị confirm dialog - hoạt động trên cả web và mobile
 */
export const showConfirmDialog = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void
) => {
  if (Platform.OS === 'web') {
    const confirmed = window.confirm(`${title}\n\n${message}`);
    if (confirmed) {
      onConfirm();
    } else if (onCancel) {
      onCancel();
    }
  } else {
    Alert.alert(title, message, [
      { text: 'Hủy', style: 'cancel', onPress: onCancel },
      { text: 'Xác nhận', style: 'destructive', onPress: onConfirm },
    ]);
  }
};

/**
 * Hiển thị alert thông báo - hoạt động trên cả web và mobile
 */
export const showAlert = (title: string, message: string, onOk?: () => void) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
    if (onOk) onOk();
  } else {
    Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
  }
};

/**
 * Hiển thị alert với nhiều options
 */
export const showAlertWithOptions = (
  title: string,
  message: string,
  options: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>
) => {
  if (Platform.OS === 'web') {
    const buttonTexts = options.map(o => o.text).join(' / ');
    const result = window.confirm(`${title}\n\n${message}\n\n[${buttonTexts}]`);
    
    const confirmOption = options.find(o => o.style === 'destructive' || o.style === 'default');
    const cancelOption = options.find(o => o.style === 'cancel');
    
    if (result && confirmOption?.onPress) {
      confirmOption.onPress();
    } else if (!result && cancelOption?.onPress) {
      cancelOption.onPress();
    }
  } else {
    Alert.alert(title, message, options);
  }
};
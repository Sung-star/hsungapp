// services/userSettingsService.ts - User Settings Service

import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { NotificationSettings } from '@/types/notification';

const USER_SETTINGS_COLLECTION = 'userSettings';

const defaultSettings: NotificationSettings = {
  notifications: true,
  emailNotifications: true,
  orderUpdates: true,
  promotions: false,
};

/**
 * Get user notification settings
 */
export const getUserSettings = async (userId: string): Promise<NotificationSettings> => {
  try {
    const docRef = doc(db, USER_SETTINGS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { ...defaultSettings, ...docSnap.data() } as NotificationSettings;
    }

    // Create default settings if not exists
    await setDoc(docRef, defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error('Error getting user settings:', error);
    return defaultSettings;
  }
};

/**
 * Update user notification settings
 */
export const updateUserSettings = async (
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<boolean> => {
  try {
    const docRef = doc(db, USER_SETTINGS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, settings);
    } else {
      await setDoc(docRef, { ...defaultSettings, ...settings });
    }

    return true;
  } catch (error) {
    console.error('Error updating user settings:', error);
    return false;
  }
};

/**
 * Check if user wants notification of specific type
 */
export const shouldSendNotification = async (
  userId: string,
  type: 'order' | 'promotion' | 'system'
): Promise<boolean> => {
  try {
    const settings = await getUserSettings(userId);

    // Master toggle off = no notifications
    if (!settings.notifications) return false;

    // Check specific type
    switch (type) {
      case 'order':
        return settings.orderUpdates;
      case 'promotion':
        return settings.promotions;
      case 'system':
        return true; // System notifications always show (unless master off)
      default:
        return true;
    }
  } catch (error) {
    console.error('Error checking notification settings:', error);
    return true; // Default to sending
  }
};

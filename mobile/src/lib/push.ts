import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { supabase } from './supabase';

const TOKEN_KEY = 'vybe.pushToken';

/** The meetup chat currently on screen — its messages shouldn't ping while you're reading them. */
let activeChatId: string | null = null;
export function setActiveChat(availabilityId: string | null) {
  activeChatId = availabilityId;
}

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data as { type?: string; availabilityId?: string } | undefined;
    const quiet = data?.type === 'message' && !!data.availabilityId && data.availabilityId === activeChatId;
    return {
      shouldShowBanner: !quiet,
      shouldShowList: !quiet,
      shouldPlaySound: !quiet,
      shouldSetBadge: true,
    };
  },
});

/**
 * Android notification channels. Each has its own sound (Android 8+ ties sound to the channel),
 * and the push Edge Function picks the channel. Sound files are bundled by the expo-notifications plugin.
 */
async function ensureAndroidChannels() {
  await Promise.all([
    Notifications.setNotificationChannelAsync('free', {
      name: 'Friends who are free',
      importance: AndroidImportance.HIGH,
      sound: 'vybe_free.wav',
      vibrationPattern: [0, 120, 80, 120],
    }),
    Notifications.setNotificationChannelAsync('messages', {
      name: 'Chat messages',
      importance: AndroidImportance.HIGH,
      sound: 'vybe_message.wav',
      vibrationPattern: [0, 80],
    }),
    Notifications.setNotificationChannelAsync('default', {
      name: 'Friend requests & other',
      importance: AndroidImportance.DEFAULT,
      sound: 'vybe_free.wav',
    }),
  ]);
}

/** App icon badge (iOS home screen / Android launchers that support it). */
export async function setAppBadge(count: number) {
  try {
    await Notifications.setBadgeCountAsync(Math.max(0, count));
  } catch {
    // Not supported on this device / launcher — ignore.
  }
}

function projectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

/**
 * Asks for permission (once) and registers this device's Expo push token with the server.
 * Returns null — without throwing — when push isn't possible: simulator, permission denied,
 * no EAS project linked yet, or Expo Go on Android (no remote push there).
 */
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) return null;
  // Expo Go can't receive this app's remote pushes (and on Android doesn't support them at all).
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return null;
  const id = projectId();
  if (!id) return null;

  if (Platform.OS === 'android') await ensureAndroidChannels();

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return null;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId: id })).data;
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  if (error) throw error;
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  return token;
}

/** Called before sign-out so a shared phone stops receiving the previous user's notifications. */
export async function unregisterPush() {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return;
  await supabase.rpc('unregister_push_token', { p_token: token });
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

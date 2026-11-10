import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { supabase } from './supabase';

const TOKEN_KEY = 'vybe.pushToken';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

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

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Friends & plans',
      importance: AndroidImportance.HIGH,
    });
  }

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

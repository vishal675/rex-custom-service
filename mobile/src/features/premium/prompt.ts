import { router } from 'expo-router';
import { Alert } from 'react-native';

import { FREE_GROUP_LIMIT } from './model';

export const GROUP_LIMIT_MESSAGE = `The free plan includes ${FREE_GROUP_LIMIT} groups. Premium unlocks unlimited groups.`;

/** "That needs Premium" with a way to see the plans. */
export function promptPremium(message: string = GROUP_LIMIT_MESSAGE) {
  Alert.alert('VYBE Premium', message, [
    { text: 'Not now', style: 'cancel' },
    { text: 'See Premium', onPress: () => router.push('/premium') },
  ]);
}

import { router } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { displayNameError, normalizeUsername, usernameError } from '@/features/auth/model';
import { useProfile, useSession } from '@/features/auth/session';
import { pickAndUploadAvatar, removeAvatar, updateProfile } from '@/features/profile/api';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/theme/tokens';
import { useTheme } from '@/theme/use-theme';

export default function EditProfileScreen() {
  const { colors } = useTheme();
  const { userId } = useSession();
  const profile = useProfile();
  const [name, setName] = useState(profile.data?.displayName ?? '');
  const [username, setUsername] = useState(profile.data?.username ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const avatarPath = profile.data?.avatarPath ?? null;
  // Android lays the screen out below the header, so the keyboard offset includes it.
  const headerHeight = useHeaderHeight();

  const errors = {
    name: displayNameError(name),
    username: usernameError(username),
  };

  const changePhoto = async () => {
    if (!userId) return;
    setUploading(true);
    try {
      await pickAndUploadAvatar(userId, avatarPath);
    } catch (e) {
      Alert.alert("Couldn't update photo", errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const photoOptions = () => {
    if (!avatarPath) return changePhoto();
    Alert.alert('Profile photo', undefined, [
      { text: 'Choose new photo', onPress: changePhoto },
      {
        text: 'Remove photo',
        style: 'destructive',
        onPress: () => removeAvatar(userId!, avatarPath).catch((e) => Alert.alert("Couldn't remove", errorMessage(e))),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const save = async () => {
    if (!userId || errors.name || errors.username) return;
    setSaving(true);
    setError(null);
    try {
      await updateProfile(userId, {
        displayName: name,
        username: normalizeUsername(username),
      });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior="padding"
      keyboardVerticalOffset={Platform.OS === 'android' ? headerHeight : 0}>
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled">
        <View style={styles.photo}>
          <Avatar name={name || '?'} path={avatarPath} size={96} />
          <Button
            variant="secondary"
            size="sm"
            label={avatarPath ? 'Change photo' : 'Add photo'}
            loading={uploading}
            onPress={photoOptions}
          />
        </View>
        <TextField label="NAME" value={name} onChangeText={setName} maxLength={50} error={errors.name} />
        <TextField
          label="USERNAME"
          value={username}
          onChangeText={(t) => {
            setUsername(t.toLowerCase().replace(/\s/g, ''));
            setError(null);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={21}
          error={errors.username ?? error}
          hint="Friends use this to find you."
        />
        <Button label="Save" onPress={save} loading={saving} disabled={!!errors.name || !!errors.username} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.xl, gap: spacing.xl },
  photo: { alignItems: 'center', gap: spacing.md },
});

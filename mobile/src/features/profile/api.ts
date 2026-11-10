import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { signOut } from '@/features/auth/session';
import { queryClient, queryKeys } from '@/lib/query';
import { supabase } from '@/lib/supabase';

const randomId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Lets the user pick a photo, crops/resizes it to 512 px JPEG, uploads it to their own folder
 * and points their profile at it. Returns false if they cancelled.
 */
export async function pickAndUploadAvatar(userId: string, oldPath: string | null): Promise<boolean> {
  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (picked.canceled || !picked.assets[0]) return false;

  const context = ImageManipulator.manipulate(picked.assets[0].uri);
  context.resize({ width: 512 });
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
  const bytes = await new File(result.uri).arrayBuffer();

  const path = `${userId}/${randomId()}.jpg`;
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, bytes, { contentType: 'image/jpeg', upsert: false });
  if (uploadError) throw uploadError;

  const { error: updateError } = await supabase.from('profiles').update({ avatar_path: path }).eq('id', userId);
  if (updateError) {
    await supabase.storage.from('avatars').remove([path]);
    throw updateError;
  }
  if (oldPath) await supabase.storage.from('avatars').remove([oldPath]); // best effort

  await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
  return true;
}

export async function removeAvatar(userId: string, path: string) {
  const { error } = await supabase.from('profiles').update({ avatar_path: null }).eq('id', userId);
  if (error) throw error;
  await supabase.storage.from('avatars').remove([path]);
  await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
}

export async function updateProfile(userId: string, fields: { displayName: string; username: string }) {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: fields.displayName.trim(), username: fields.username })
    .eq('id', userId);
  if (error) throw error;
  await queryClient.invalidateQueries({ queryKey: queryKeys.profile });
}

/** Permanently deletes the account on the server (Edge Function `delete-account`), then signs out locally. */
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
  if (error) throw error;
  await signOut();
}

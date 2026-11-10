const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;

/** Public URL of a profile photo. Paths are random (`<user id>/<random>.jpg`), so URLs can't be guessed. */
export function avatarUrl(path: string | null | undefined): string | undefined {
  return path ? `${BASE_URL}/storage/v1/object/public/avatars/${path}` : undefined;
}

import * as SecureStore from 'expo-secure-store';

/**
 * Supabase session storage backed by the OS keychain/keystore.
 * SecureStore values are size-limited (~2 KB on some devices) and a session can be larger,
 * so values are split into chunks: `<key>.n` holds the chunk count, `<key>.<i>` the chunks.
 */
const CHUNK_SIZE = 1800;

async function chunkCount(key: string): Promise<number> {
  const n = await SecureStore.getItemAsync(`${key}.n`);
  return n === null ? 0 : Number(n) || 0;
}

export const chunkedSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const n = await chunkCount(key);
    if (n === 0) return null;
    const parts = await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)));
    return parts.some((p) => p === null) ? null : parts.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    await chunkedSecureStore.removeItem(key);
    const n = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
    for (let i = 0; i < n; i++) {
      await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE));
    }
    // Written last, so a crash mid-write reads as "no session" rather than a corrupt one.
    await SecureStore.setItemAsync(`${key}.n`, String(n));
  },

  async removeItem(key: string): Promise<void> {
    const n = await chunkCount(key);
    await SecureStore.deleteItemAsync(`${key}.n`);
    await Promise.all(Array.from({ length: n }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)));
  },
};

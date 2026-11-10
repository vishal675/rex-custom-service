// Deletes the calling user's account and all their data.
// Auth: the user's own access token (verify_jwt = true). The user id comes from the verified token,
// never from the request body, so nobody can delete someone else's account.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'not_authenticated' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const user = userData?.user;
  if (userError || !user) return json(401, { error: 'not_authenticated' });

  // 1. Profile photos (storage objects are not removed by the database cascade).
  const { data: files, error: listError } = await admin.storage.from('avatars').list(user.id, { limit: 1000 });
  if (listError) {
    console.error('list avatars failed', listError.message);
    return json(500, { error: 'delete_failed' });
  }
  if (files && files.length > 0) {
    const { error: removeError } = await admin.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));
    if (removeError) {
      console.error('remove avatars failed', removeError.message);
      return json(500, { error: 'delete_failed' });
    }
  }

  // 2. The auth user. Cascades to profile, settings, friendships, availabilities, messages, tokens, entitlements.
  //    Reports are kept (detached) for moderation.
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error('delete user failed', deleteError.message);
    return json(500, { error: 'delete_failed' });
  }

  console.log('account deleted', user.id);
  return json(200, { deleted: true });
});

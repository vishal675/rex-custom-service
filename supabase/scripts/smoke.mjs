// UAT end-to-end smoke test through the real API (PostgREST + Auth), exactly as the app calls it.
// Creates two throwaway users, runs the core flow, then deletes them.
//   node supabase/scripts/smoke.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../mobile/package.json', import.meta.url));
const { createClient } = require('@supabase/supabase-js');

const env = Object.fromEntries(
  readFileSync(new URL('../../mobile/.env.local', import.meta.url), 'utf8')
    .split('\n').filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]),
);
const URL_ = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const codeScript = new URL('./dev-login-code.sh', import.meta.url).pathname;

const stamp = Date.now().toString(36);
const users = ['a', 'b'].map((s) => ({ email: `smoke-${s}-${stamp}@test.vybe.invalid`, username: `smoke_${s}_${stamp}`.slice(0, 20) }));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? '✓' : '✗'} ${name}${cond ? '' : ` ${extra}`}`);
  if (!cond) failures++;
};
const must = ({ data, error }, what) => {
  if (error) throw new Error(`${what}: ${error.code ?? ''} ${error.message}`);
  return data;
};

async function signIn(u) {
  const client = createClient(URL_, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const code = execFileSync(codeScript, [u.email], { encoding: 'utf8' }).trim();
  const { data, error } = await client.auth.verifyOtp({ email: u.email, token: code, type: 'email' });
  if (error) throw new Error(`verifyOtp ${u.email}: ${error.message}`);
  return { client, id: data.user.id };
}

const created = [];
try {
  const [A, B] = await Promise.all(users.map(signIn));
  created.push(A, B);
  check('sign in with email code', !!A.id && !!B.id);

  const st0 = must(await A.client.rpc('my_status'), 'my_status');
  check('new user is not onboarded', st0.onboarded === false);

  const under18 = await A.client.rpc('complete_onboarding', { p_username: users[0].username, p_display_name: 'Smoke A', p_date_of_birth: '2015-01-01', p_timezone: 'Asia/Kolkata' });
  check('under-18 rejected', under18.error?.message === 'under_18', JSON.stringify(under18.error));

  for (const [i, X] of [A, B].entries()) {
    must(await X.client.rpc('complete_onboarding', { p_username: users[i].username, p_display_name: `Smoke ${'AB'[i]}`, p_date_of_birth: '1995-06-15', p_timezone: i ? 'Europe/London' : 'Asia/Kolkata' }), 'onboard');
  }
  check('onboarding completes', must(await A.client.rpc('my_status'), 'status').onboarded === true);

  const found = must(await A.client.rpc('find_user', { p_username: users[1].username }), 'find_user');
  check('find user by exact username', found.length === 1 && found[0].id === B.id);
  check('stranger cannot read profile row', must(await A.client.from('profiles').select('id').eq('id', B.id), 'profiles').length === 0);

  check('send request → pending', must(await A.client.rpc('send_friend_request', { p_target: B.id }), 'send') === 'pending');
  const bf = must(await B.client.rpc('my_friends'), 'my_friends');
  check('B sees incoming request', bf[0]?.status === 'incoming');
  must(await B.client.rpc('respond_friend_request', { p_requester: A.id, p_accept: true }), 'accept');
  check('friends after accept', must(await A.client.rpc('my_friends'), 'friends')[0]?.status === 'friend');

  const gf = must(await A.client.rpc('go_free', { p_activity: 'coffee', p_duration: '1h', p_audience_all: true, p_circle_ids: [] }), 'go_free');
  check('go_free notifies 1 friend', gf.recipient_count === 1, JSON.stringify(gf));
  const skew = Math.abs(Date.parse(gf.expires_at) - Date.parse(gf.server_now) - 3600_000);
  check('expiry = server time + 1h', skew < 1000);

  const fn = must(await B.client.rpc('free_now'), 'free_now');
  check('B sees A free now', fn.length === 1 && fn[0].activity === 'coffee');
  must(await B.client.rpc('join_availability', { p_availability_id: fn[0].availability_id }), 'join');
  const stA = must(await A.client.rpc('my_status'), 'status');
  check("A sees B is in", stA.availability?.join_count === 1);

  must(await B.client.from('meetup_messages').insert({ availability_id: fn[0].availability_id, body: 'On my way' }), 'message');
  check('A reads meetup chat', must(await A.client.from('meetup_messages').select('body'), 'msgs').length === 1);
  const meetupsA = must(await A.client.rpc('my_meetups'), 'my_meetups');
  check('meetup listed for owner', meetupsA.length === 1 && meetupsA[0].is_live && meetupsA[0].participant_count === 2);
  const thread = must(await A.client.rpc('meetup_thread', { p_availability_id: fn[0].availability_id }), 'thread');
  check('thread returns message with sender name', thread[0]?.body === 'On my way' && thread[0]?.sender_name === 'Smoke B');
  const parts = must(await B.client.rpc('meetup_participants', { p_availability_id: fn[0].availability_id }), 'participants');
  check('participants listed', parts.length === 2);

  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1, 0xff, 0xd9]);
  const own = await A.client.storage.from('avatars').upload(`${A.id}/smoke.jpg`, jpeg, { contentType: 'image/jpeg' });
  check('upload photo to own folder', !own.error, JSON.stringify(own.error));
  const other = await A.client.storage.from('avatars').upload(`${B.id}/evil.jpg`, jpeg, { contentType: 'image/jpeg' });
  check("cannot upload into someone else's folder", !!other.error);
  const setPath = await A.client.from('profiles').update({ avatar_path: `${A.id}/smoke.jpg` }).eq('id', A.id);
  check('profile points at photo', !setPath.error, JSON.stringify(setPath.error));
  const badPath = await A.client.from('profiles').update({ avatar_path: `${B.id}/x.jpg` }).eq('id', A.id);
  check("profile can't point at another user's file", !!badPath.error);

  const c1 = must(await A.client.from('circles').insert({ name: 'One', emoji: '🎓' }).select('id').single(), 'circle1');
  must(await A.client.from('circles').insert({ name: 'Two' }).select('id').single(), 'circle2');
  const c3 = await A.client.from('circles').insert({ name: 'Three' }).select('id').single();
  check('3rd group needs Premium', c3.error?.message === 'premium_required', JSON.stringify(c3.error));
  must(await A.client.from('circle_members').insert({ circle_id: c1.id, member_id: B.id }), 'member');
  const gc = must(await A.client.rpc('go_free', { p_activity: null, p_duration: 'tonight', p_audience_all: false, p_circle_ids: [c1.id] }), 'go_free circle');
  check('go_free to a group', gc.recipient_count === 1);

  const ent = await A.client.from('entitlements').insert({ user_id: A.id, expires_at: '2099-01-01' });
  check('cannot grant self Premium', !!ent.error);

  must(await A.client.from('reports').insert({ reported_user_id: B.id, reason: 'spam', details: 'smoke test' }), 'report');
  check('report submitted', true);

  must(await B.client.rpc('block_user', { p_target: A.id }), 'block');
  check('block hides free status', must(await B.client.rpc('free_now'), 'free_now').length === 0);
  check('block removes friendship', must(await A.client.rpc('my_friends'), 'friends').length === 0);
  check('blocked user cannot find blocker', must(await A.client.rpc('find_user', { p_username: users[1].username }), 'find').length === 0);

  const anon = createClient(URL_, KEY, { auth: { persistSession: false } });
  const an = await anon.rpc('free_now');
  check('signed-out access denied', !!an.error);
} catch (e) {
  failures++;
  console.error('✗ aborted:', e.message);
} finally {
  // Clean up: delete the throwaway users (cascades to all their rows).
  const secret = execFileSync('bash', ['-c', `cd "$(dirname "${codeScript}")/../.." && set -a && source .env && curl -fsS -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" "https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_REF/api-keys?reveal=true"`], { encoding: 'utf8' });
  const key = JSON.parse(secret).find((k) => k.type === 'secret').api_key;
  const admin = createClient(URL_, key, { auth: { persistSession: false } });
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const doomed = (data?.users ?? []).filter((u) => u.email?.endsWith('@test.vybe.invalid'));
  for (const u of doomed) {
    const { data: files } = await admin.storage.from('avatars').list(u.id);
    if (files?.length) await admin.storage.from('avatars').remove(files.map((f) => `${u.id}/${f.name}`));
    await admin.auth.admin.deleteUser(u.id);
  }
  console.log(`cleaned up ${doomed.length} test user(s)`);
}

console.log(failures ? `\n${failures} FAILED` : '\nSMOKE TEST PASSED');
process.exit(failures ? 1 : 0);

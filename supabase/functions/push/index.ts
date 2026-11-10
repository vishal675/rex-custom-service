// Sends push notifications for database events (called by pg_net from DB triggers, never by clients).
//   kind = 'free'    → a friend is free: notify the recipients of that availability
//   kind = 'join'    → someone said "I'm in": notify the owner
//   kind = 'message' → new meetup chat message: notify the other participants
//   kind = 'friend_request' → someone sent a friend request: notify the target
// Each kind has its own sound (iOS: bundled file name; Android: channel, which owns the sound),
// and message / request pushes carry the recipient's app-icon badge count.
// Respects each recipient's notifications_enabled + quiet hours (in their own timezone),
// and removes device tokens Expo reports as no longer registered.
import { createClient } from 'npm:@supabase/supabase-js@2.119.0';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const ACTIVITIES: Record<string, string> = {
  coffee: '☕ Coffee',
  food: '🍔 Food',
  badminton: '🏸 Badminton',
  sports: '⚽ Sports',
  gaming: '🎮 Gaming',
  out: '🎉 Going out',
  talk: '💬 Just talking',
  other: '✨ Something',
};

const DURATIONS: Record<string, string> = {
  '30m': 'for 30 min',
  '1h': 'for 1 hr',
  '2h': 'for 2 hrs',
  tonight: 'till tonight',
};

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, string>;
  sound: string;
  channelId: string;
  priority: 'high' | 'default';
  badge?: number;
};

/** Sound files are bundled in the app (mobile/assets/sounds) and Android channels created by the app. */
const STYLE = {
  free: { sound: 'vybe_free.wav', channelId: 'free', priority: 'high' },
  join: { sound: 'vybe_free.wav', channelId: 'free', priority: 'high' },
  message: { sound: 'vybe_message.wav', channelId: 'messages', priority: 'high' },
  friend_request: { sound: 'vybe_free.wav', channelId: 'default', priority: 'default' },
} as const;

async function badgeFor(userId: string): Promise<number | undefined> {
  const { data, error } = await admin.rpc('badge_count_for', { p_user: userId });
  return error ? undefined : (data as number);
}
type Ticket = { status: 'ok' | 'error'; id?: string; message?: string; details?: { error?: string } };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** "HH:MM:SS" → minutes since midnight. */
const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

/** True if `now` falls inside quiet hours in the user's timezone (ranges may cross midnight). */
export function inQuietHours(now: Date, tz: string, start: string | null, end: string | null): boolean {
  if (!start || !end) return false;
  let local: number;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(now);
    local =
      Number(parts.find((p) => p.type === 'hour')?.value) * 60 + Number(parts.find((p) => p.type === 'minute')?.value);
  } catch {
    return false;
  }
  const s = minutes(start);
  const e = minutes(end);
  return s <= e ? local >= s && local < e : local >= s || local < e;
}

/** Device tokens for users who want this notification right now. */
async function tokensFor(userIds: string[]): Promise<{ userId: string; token: string }[]> {
  if (userIds.length === 0) return [];
  const [{ data: settings }, { data: tokens }] = await Promise.all([
    admin
      .from('user_settings')
      .select('user_id, timezone, notifications_enabled, quiet_hours_start, quiet_hours_end')
      .in('user_id', userIds),
    admin.from('push_tokens').select('user_id, token').in('user_id', userIds),
  ]);
  const now = new Date();
  const allowed = new Set(
    (settings ?? [])
      .filter((s) => s.notifications_enabled && !inQuietHours(now, s.timezone, s.quiet_hours_start, s.quiet_hours_end))
      .map((s) => s.user_id),
  );
  return (tokens ?? []).filter((t) => allowed.has(t.user_id)).map((t) => ({ userId: t.user_id, token: t.token }));
}

async function send(messages: PushMessage[]): Promise<number> {
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.error('expo push http error', res.status, await res.text());
      continue;
    }
    const { data } = (await res.json()) as { data: Ticket[] };
    const dead: string[] = [];
    data.forEach((ticket, idx) => {
      if (ticket.status === 'ok') sent++;
      else if (ticket.details?.error === 'DeviceNotRegistered') dead.push(batch[idx].to);
      else console.warn('push ticket error', ticket.message);
    });
    if (dead.length) await admin.from('push_tokens').delete().in('token', dead);
  }
  return sent;
}

const nameOf = async (userId: string) => {
  const { data } = await admin.from('profiles').select('display_name, username').eq('id', userId).single();
  return (data?.display_name || data?.username || 'A friend').split(' ')[0];
};

async function handleFree(availabilityId: string) {
  const { data: a } = await admin
    .from('availabilities')
    .select('id, user_id, activity, duration, ended_at, expires_at')
    .eq('id', availabilityId)
    .single();
  if (!a || a.ended_at || new Date(a.expires_at) <= new Date()) return 0;

  const { data: recipients } = await admin
    .from('availability_recipients')
    .select('user_id')
    .eq('availability_id', availabilityId)
    .is('notified_at', null);
  const ids = (recipients ?? []).map((r) => r.user_id);
  const name = await nameOf(a.user_id);
  const what = a.activity ? (ACTIVITIES[a.activity] ?? 'Free') : 'Free to hang';
  const targets = await tokensFor(ids);
  const sent = await send(
    targets.map((t) => ({
      to: t.token,
      title: `${name} is free`,
      body: `${what} · ${DURATIONS[a.duration] ?? ''}`.trim(),
      data: { type: 'free', availabilityId },
      ...STYLE.free,
    })),
  );
  if (ids.length) {
    await admin
      .from('availability_recipients')
      .update({ notified_at: new Date().toISOString() })
      .eq('availability_id', availabilityId)
      .in('user_id', ids);
  }
  return sent;
}

async function handleJoin(availabilityId: string, joinerId: string) {
  const { data: a } = await admin.from('availabilities').select('user_id, activity').eq('id', availabilityId).single();
  if (!a) return 0;
  const name = await nameOf(joinerId);
  const targets = await tokensFor([a.user_id]);
  return send(
    targets.map((t) => ({
      to: t.token,
      title: `${name} is in! 🙌`,
      body: a.activity ? `For ${ACTIVITIES[a.activity] ?? 'your plan'}. Say hi in the chat.` : 'Say hi in the chat.',
      data: { type: 'join', availabilityId },
      ...STYLE.join,
    })),
  );
}

async function handleMessage(messageId: string) {
  const { data: m } = await admin
    .from('meetup_messages')
    .select('availability_id, sender_id, body')
    .eq('id', messageId)
    .single();
  if (!m) return 0;
  const [{ data: a }, { data: joins }] = await Promise.all([
    admin.from('availabilities').select('user_id').eq('id', m.availability_id).single(),
    admin.from('availability_joins').select('user_id').eq('availability_id', m.availability_id),
  ]);
  const participants = new Set<string>(
    [a?.user_id, ...(joins ?? []).map((j) => j.user_id)].filter(Boolean) as string[],
  );
  participants.delete(m.sender_id);
  const name = await nameOf(m.sender_id);
  const targets = await tokensFor([...participants]);
  const badges = new Map(
    await Promise.all([...new Set(targets.map((t) => t.userId))].map(async (u) => [u, await badgeFor(u)] as const)),
  );
  return send(
    targets.map((t) => ({
      to: t.token,
      title: name,
      body: m.body.length > 140 ? `${m.body.slice(0, 137)}…` : m.body,
      data: { type: 'message', availabilityId: m.availability_id },
      ...STYLE.message,
      badge: badges.get(t.userId),
    })),
  );
}

async function handleFriendRequest(requesterId: string, targetId: string) {
  const name = await nameOf(requesterId);
  const targets = await tokensFor([targetId]);
  const badge = await badgeFor(targetId);
  return send(
    targets.map((t) => ({
      to: t.token,
      title: `${name} wants to be friends`,
      body: 'Accept to see when each other is free.',
      data: { type: 'friend_request', userId: requesterId },
      ...STYLE.friend_request,
      badge,
    })),
  );
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_DISPATCH_SECRET');
  if (!secret || req.headers.get('x-push-secret') !== secret) return json(401, { error: 'unauthorized' });

  try {
    const body = await req.json();
    let sent = 0;
    if (body.kind === 'free') sent = await handleFree(body.availability_id);
    else if (body.kind === 'join') sent = await handleJoin(body.availability_id, body.user_id);
    else if (body.kind === 'message') sent = await handleMessage(body.message_id);
    else if (body.kind === 'friend_request') sent = await handleFriendRequest(body.requester_id, body.target_id);
    else return json(400, { error: 'unknown_kind' });
    return json(200, { sent });
  } catch (e) {
    console.error('push failed', e instanceof Error ? e.message : e);
    return json(500, { error: 'push_failed' });
  }
});

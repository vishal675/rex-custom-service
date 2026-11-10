import { ACTIVITIES, DURATIONS, type ActivityId, type DurationId } from './model';

/** Shapes returned by the `my_status` and `free_now` RPCs, parsed defensively (they arrive as untyped JSON). */

export type ServerAvailability = {
  id: string;
  activity: ActivityId | null;
  duration: DurationId;
  audienceAll: boolean;
  startedAt: number;
  expiresAt: number;
  recipientCount: number;
  joinCount: number;
};

export type MyStatus = {
  serverNow: string;
  isPremium: boolean;
  onboarded: boolean;
  availability: ServerAvailability | null;
};

export type FreeNowItem = {
  availabilityId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarPath: string | null;
  activity: ActivityId | null;
  startedAt: number;
  expiresAt: number;
  joined: boolean;
  joinCount: number;
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);
const time = (v: unknown) => Date.parse(str(v)) || 0;

export function toActivity(v: unknown): ActivityId | null {
  return ACTIVITIES.find((a) => a.id === v)?.id ?? null;
}

function toDuration(v: unknown): DurationId {
  return DURATIONS.find((d) => d.id === v)?.id ?? '1h';
}

export function parseAvailability(v: unknown): ServerAvailability | null {
  if (!isObj(v) || !v.id) return null;
  return {
    id: str(v.id),
    activity: toActivity(v.activity),
    duration: toDuration(v.duration),
    audienceAll: v.audience_all === true,
    startedAt: time(v.starts_at),
    expiresAt: time(v.expires_at),
    recipientCount: num(v.recipient_count),
    joinCount: num(v.join_count),
  };
}

export function parseStatus(v: unknown): MyStatus {
  const o = isObj(v) ? v : {};
  return {
    serverNow: str(o.server_now),
    isPremium: o.is_premium === true,
    onboarded: o.onboarded === true,
    availability: parseAvailability(o.availability),
  };
}

export function parseFreeNowRow(r: {
  availability_id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  activity: string | null;
  starts_at: string;
  expires_at: string;
  joined: boolean;
  join_count: number;
}): FreeNowItem {
  return {
    availabilityId: r.availability_id,
    userId: r.user_id,
    username: r.username ?? '',
    displayName: r.display_name || r.username || 'Friend',
    avatarPath: r.avatar_path,
    activity: toActivity(r.activity),
    startedAt: time(r.starts_at),
    expiresAt: time(r.expires_at),
    joined: r.joined,
    joinCount: r.join_count,
  };
}

-- =============================================================================
-- VYBE core schema
--
-- Security model
--   * Row Level Security on every table. anon gets nothing.
--   * Clients get SELECT plus a few column-level writes. Everything that needs
--     rules (friend requests, blocking, going free, joining) goes through
--     SECURITY DEFINER RPCs that validate input and use the server clock.
--   * Helper functions live in the `private` schema, which the API never exposes.
--   * Premium is read from `entitlements`, which only the server (RevenueCat
--     webhook, service role) can write.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique,
  display_name text,
  avatar_path  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  -- 3–20 chars, lowercase letters/digits/./_, starts and ends alphanumeric, no "..", "__", "._"
  constraint username_format check (
    username ~ '^[a-z0-9][a-z0-9._]{1,18}[a-z0-9]$' and username !~ '[._]{2}'
  ),
  constraint display_name_length check (char_length(btrim(display_name)) between 1 and 50),
  constraint avatar_path_in_own_folder check (avatar_path is null or avatar_path like id::text || '/%')
);
comment on table public.profiles is 'Public-to-friends profile. One row per auth user, created by trigger at sign-up.';

create table public.user_settings (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  timezone              text not null default 'Asia/Kolkata',
  -- Date of birth is checked (18+) and discarded; only the confirmation time is stored.
  age_confirmed_at      timestamptz,
  notifications_enabled boolean not null default true,
  quiet_hours_start     time,
  quiet_hours_end       time,
  updated_at            timestamptz not null default now()
);
comment on table public.user_settings is 'Private per-user settings. Only the owner can read them.';

create table public.friendships (
  user_low     uuid not null references public.profiles (id) on delete cascade,
  user_high    uuid not null references public.profiles (id) on delete cascade,
  requested_by uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  accepted_at  timestamptz,
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requested_by in (user_low, user_high))
);
create index friendships_user_high_idx on public.friendships (user_high);
create index friendships_requested_by_idx on public.friendships (requested_by, created_at);

create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index blocks_blocked_idx on public.blocks (blocked_id);

create table public.circles (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  emoji      text check (char_length(emoji) <= 16),
  created_at timestamptz not null default now()
);
create index circles_owner_idx on public.circles (owner_id, created_at);

create table public.circle_members (
  circle_id  uuid not null references public.circles (id) on delete cascade,
  member_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (circle_id, member_id)
);
create index circle_members_member_idx on public.circle_members (member_id);

create table public.availabilities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  activity     text check (activity in ('coffee', 'food', 'badminton', 'sports', 'gaming', 'out', 'talk', 'other')),
  duration     text not null check (duration in ('30m', '1h', '2h', 'tonight')),
  audience_all boolean not null,
  starts_at    timestamptz not null,
  expires_at   timestamptz not null,
  ended_at     timestamptz,
  created_at   timestamptz not null default now(),
  check (expires_at > starts_at)
);
comment on column public.availabilities.expires_at is 'Set by go_free() from the server clock. Active = ended_at is null and expires_at > now().';
create index availabilities_user_idx on public.availabilities (user_id, created_at desc);
create index availabilities_active_idx on public.availabilities (expires_at) where ended_at is null;

create table public.availability_recipients (
  availability_id uuid not null references public.availabilities (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  notified_at     timestamptz,
  primary key (availability_id, user_id)
);
create index availability_recipients_user_idx on public.availability_recipients (user_id);

create table public.availability_joins (
  availability_id uuid not null references public.availabilities (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  joined_at       timestamptz not null default now(),
  primary key (availability_id, user_id)
);
create index availability_joins_user_idx on public.availability_joins (user_id);

create table public.meetup_messages (
  id              uuid primary key default gen_random_uuid(),
  availability_id uuid not null references public.availabilities (id) on delete cascade,
  sender_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body            text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at      timestamptz not null default now()
);
create index meetup_messages_thread_idx on public.meetup_messages (availability_id, created_at, id);

create table public.push_tokens (
  token      text primary key check (char_length(token) between 10 and 512),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  platform   text not null check (platform in ('ios', 'android')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index push_tokens_user_idx on public.push_tokens (user_id);

create table public.reports (
  id               uuid primary key default gen_random_uuid(),
  reporter_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_user_id uuid not null references public.profiles (id) on delete cascade,
  message_id       uuid references public.meetup_messages (id) on delete set null,
  availability_id  uuid references public.availabilities (id) on delete set null,
  reason           text not null check (reason in ('spam', 'harassment', 'inappropriate', 'fake_account', 'underage', 'other')),
  details          text check (char_length(details) <= 1000),
  status           text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at       timestamptz not null default now(),
  check (reporter_id <> reported_user_id)
);
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_open_idx on public.reports (created_at) where status = 'open';

-- Premium status. Written only by the server (RevenueCat webhook via service role).
create table public.entitlements (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  entitlement text not null default 'premium',
  product_id  text,
  store       text check (store in ('app_store', 'play_store', 'stripe', 'promotional')),
  period_type text check (period_type in ('trial', 'intro', 'normal')),
  expires_at  timestamptz,
  will_renew  boolean,
  updated_at  timestamptz not null default now()
);

-- Raw webhook log, for idempotency and audit. No client access.
create table public.subscription_events (
  id           uuid primary key default gen_random_uuid(),
  provider     text not null default 'revenuecat',
  event_id     text not null,
  user_id      uuid references public.profiles (id) on delete set null,
  event_type   text not null,
  payload      jsonb not null,
  received_at  timestamptz not null default now(),
  unique (provider, event_id)
);

-- -----------------------------------------------------------------------------
-- Private helpers (not exposed through the API)
-- -----------------------------------------------------------------------------

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create function private.valid_timezone(tz text) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from pg_catalog.pg_timezone_names where name = tz)
$$;

create function private.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.friendships f
    where f.user_low = least(a, b) and f.user_high = greatest(a, b) and f.status = 'accepted'
  )
$$;

create function private.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a)
  )
$$;

create function private.is_premium(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entitlements
    where user_id = u and entitlement = 'premium' and expires_at > now()
  )
$$;

create function private.is_onboarded(u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    join public.user_settings s on s.user_id = p.id
    where p.id = u and p.username is not null and p.display_name is not null and s.age_confirmed_at is not null
  )
$$;

create function private.owns_availability(av uuid, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.availabilities where id = av and user_id = u)
$$;

-- Owner, or a recipient who isn't blocked by/blocking the owner.
create function private.can_view_availability(av uuid, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.availabilities a
    where a.id = av
      and (
        a.user_id = u
        or (
          exists (select 1 from public.availability_recipients r where r.availability_id = a.id and r.user_id = u)
          and not private.is_blocked(a.user_id, u)
        )
      )
  )
$$;

-- Meetup chat members: the owner plus everyone who joined.
create function private.is_meetup_participant(av uuid, u uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.availabilities where id = av and user_id = u)
      or exists (select 1 from public.availability_joins where availability_id = av and user_id = u)
$$;

-- You can see a profile if it's yours, or you're connected (friend / pending request /
-- shared meetup) and neither side has blocked the other.
create function private.can_view_profile(viewer uuid, target uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select viewer = target or (
    not private.is_blocked(viewer, target)
    and (
      exists (
        select 1 from public.friendships f
        where f.user_low = least(viewer, target) and f.user_high = greatest(viewer, target)
      )
      or exists (
        select 1 from public.availability_joins j1
        join public.availability_joins j2 on j2.availability_id = j1.availability_id
        where j1.user_id = viewer and j2.user_id = target
      )
      or exists (
        select 1 from public.availabilities a
        join public.availability_joins j on j.availability_id = a.id
        where (a.user_id = viewer and j.user_id = target) or (a.user_id = target and j.user_id = viewer)
      )
    )
  )
$$;

create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;

create function private.validate_user_settings() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not private.valid_timezone(new.timezone) then
    raise exception 'invalid_timezone' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- Free users: max 2 circles. Premium: unlimited.
create function private.enforce_circle_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('circles:' || new.owner_id::text));
  if not private.is_premium(new.owner_id)
     and (select count(*) from public.circles where owner_id = new.owner_id) >= 2 then
    raise exception 'premium_required' using errcode = 'P0001', detail = 'circle_limit';
  end if;
  return new;
end $$;

create function private.enforce_circle_member_limit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.circle_members where circle_id = new.circle_id) >= 200 then
    raise exception 'circle_full' using errcode = 'P0001';
  end if;
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

-- Supabase Auth inserts users as supabase_auth_admin.
grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_user() to supabase_auth_admin;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger user_settings_updated_at before update on public.user_settings
  for each row execute function private.set_updated_at();
create trigger user_settings_validate before insert or update on public.user_settings
  for each row execute function private.validate_user_settings();
create trigger push_tokens_updated_at before update on public.push_tokens
  for each row execute function private.set_updated_at();
create trigger entitlements_updated_at before update on public.entitlements
  for each row execute function private.set_updated_at();
create trigger circles_limit before insert on public.circles
  for each row execute function private.enforce_circle_limit();
create trigger circle_members_limit before insert on public.circle_members
  for each row execute function private.enforce_circle_member_limit();

-- -----------------------------------------------------------------------------
-- RPCs (the app's write API)
-- -----------------------------------------------------------------------------

create function public.complete_onboarding(
  p_username text, p_display_name text, p_date_of_birth date, p_timezone text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_date_of_birth is null or p_date_of_birth < date '1900-01-01' or p_date_of_birth > current_date then
    raise exception 'invalid_date_of_birth' using errcode = 'P0001';
  end if;
  if p_date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'under_18' using errcode = 'P0001';
  end if;
  if p_timezone is null or not private.valid_timezone(p_timezone) then
    raise exception 'invalid_timezone' using errcode = 'P0001';
  end if;

  update public.profiles
     set username = lower(btrim(p_username)), display_name = btrim(p_display_name)
   where id = uid;
  update public.user_settings
     set timezone = p_timezone, age_confirmed_at = coalesce(age_confirmed_at, now())
   where user_id = uid;
end $$;

-- Exact username lookup (no partial search → no user enumeration).
create function public.find_user(p_username text)
returns table (id uuid, username text, display_name text, avatar_path text)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_path
  from public.profiles p
  where p.username = lower(btrim(p_username))
    and p.id <> auth.uid()
    and not private.is_blocked(auth.uid(), p.id)
$$;

-- Returns 'pending' or 'accepted' (if they had already requested you).
create function public.send_friend_request(p_target uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  lo uuid;
  hi uuid;
  existing public.friendships;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_target is null or p_target = uid then raise exception 'invalid_target' using errcode = 'P0001'; end if;
  if not private.is_onboarded(uid) then raise exception 'onboarding_required' using errcode = 'P0001'; end if;
  -- Blocked users look like they don't exist.
  if private.is_blocked(uid, p_target) or not private.is_onboarded(p_target) then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  lo := least(uid, p_target);
  hi := greatest(uid, p_target);
  select * into existing from public.friendships where user_low = lo and user_high = hi for update;

  if found then
    if existing.status = 'accepted' then return 'accepted'; end if;
    if existing.requested_by = uid then return 'pending'; end if;
    update public.friendships set status = 'accepted', accepted_at = now()
     where user_low = lo and user_high = hi;
    return 'accepted';
  end if;

  if (select count(*) from public.friendships
      where requested_by = uid and created_at > now() - interval '1 day') >= 100 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  insert into public.friendships (user_low, user_high, requested_by, status) values (lo, hi, uid, 'pending');
  return 'pending';
end $$;

create function public.respond_friend_request(p_requester uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_accept then
    update public.friendships set status = 'accepted', accepted_at = now()
     where user_low = least(uid, p_requester) and user_high = greatest(uid, p_requester)
       and requested_by = p_requester and status = 'pending';
  else
    delete from public.friendships
     where user_low = least(uid, p_requester) and user_high = greatest(uid, p_requester)
       and requested_by = p_requester and status = 'pending';
  end if;
  if not found then raise exception 'request_not_found' using errcode = 'P0001'; end if;
end $$;

-- Unfriend, or cancel/decline a pending request. Also removes each other from circles.
create function public.remove_friend(p_other uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  delete from public.friendships where user_low = least(uid, p_other) and user_high = greatest(uid, p_other);
  delete from public.circle_members m using public.circles c
   where m.circle_id = c.id
     and ((c.owner_id = uid and m.member_id = p_other) or (c.owner_id = p_other and m.member_id = uid));
end $$;

create function public.block_user(p_target uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_target is null or p_target = uid then raise exception 'invalid_target' using errcode = 'P0001'; end if;
  insert into public.blocks (blocker_id, blocked_id) values (uid, p_target) on conflict do nothing;
  perform public.remove_friend(p_target);
  -- Withdraw any live availability either of them can currently see from the other.
  delete from public.availability_recipients r using public.availabilities a
   where r.availability_id = a.id and a.ended_at is null and a.expires_at > now()
     and ((a.user_id = uid and r.user_id = p_target) or (a.user_id = p_target and r.user_id = uid));
  delete from public.availability_joins j using public.availabilities a
   where j.availability_id = a.id and a.ended_at is null and a.expires_at > now()
     and ((a.user_id = uid and j.user_id = p_target) or (a.user_id = p_target and j.user_id = uid));
end $$;

create function public.unblock_user(p_target uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_target
$$;

-- Friends, incoming and outgoing requests, with profile info.
create function public.my_friends()
returns table (user_id uuid, username text, display_name text, avatar_path text, status text, since timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_path,
         case when f.status = 'accepted' then 'friend'
              when f.requested_by = auth.uid() then 'outgoing'
              else 'incoming' end,
         coalesce(f.accepted_at, f.created_at)
  from public.friendships f
  join public.profiles p on p.id = case when f.user_low = auth.uid() then f.user_high else f.user_low end
  where auth.uid() in (f.user_low, f.user_high)
  order by p.display_name
$$;

-- I'M FREE. Expiry is computed here from the server clock and the user's timezone.
-- Audience is resolved server-side: only accepted, unblocked friends are ever notified.
create function public.go_free(
  p_activity text,
  p_duration text,
  p_audience_all boolean,
  p_circle_ids uuid[] default '{}',
  p_friend_ids uuid[] default '{}'
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_now timestamptz := now();
  v_tz text;
  v_expires timestamptz;
  v_row public.availabilities;
  v_count int;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not private.is_onboarded(uid) then raise exception 'onboarding_required' using errcode = 'P0001'; end if;

  p_audience_all := coalesce(p_audience_all, false);
  p_circle_ids := coalesce(p_circle_ids, '{}');
  p_friend_ids := coalesce(p_friend_ids, '{}');

  if not p_audience_all and cardinality(p_circle_ids) = 0 and cardinality(p_friend_ids) = 0 then
    raise exception 'empty_audience' using errcode = 'P0001';
  end if;
  if cardinality(p_circle_ids) > 50 or cardinality(p_friend_ids) > 1000 then
    raise exception 'audience_too_large' using errcode = 'P0001';
  end if;
  if exists (select unnest(p_circle_ids) except select id from public.circles where owner_id = uid) then
    raise exception 'invalid_circle' using errcode = 'P0001';
  end if;
  -- After Premium lapses, only the 2 oldest circles remain usable.
  if not private.is_premium(uid) and exists (
    select unnest(p_circle_ids)
    except (select id from public.circles where owner_id = uid order by created_at, id limit 2)
  ) then
    raise exception 'premium_required' using errcode = 'P0001', detail = 'circle_limit';
  end if;

  if (select count(*) from public.availabilities
      where user_id = uid and created_at > v_now - interval '1 day') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  select timezone into v_tz from public.user_settings where user_id = uid;
  v_tz := coalesce(v_tz, 'UTC');

  v_expires := case p_duration
    when '30m' then v_now + interval '30 minutes'
    when '1h'  then v_now + interval '1 hour'
    when '2h'  then v_now + interval '2 hours'
    -- 11:59 pm in the user's own timezone, but never less than 1 hour away.
    when 'tonight' then greatest(
      (date_trunc('day', v_now at time zone v_tz) + interval '23 hours 59 minutes') at time zone v_tz,
      v_now + interval '1 hour'
    )
  end;
  if v_expires is null then raise exception 'invalid_duration' using errcode = 'P0001'; end if;

  -- One live availability per user: going free again replaces the previous one.
  update public.availabilities set ended_at = v_now
   where user_id = uid and ended_at is null and expires_at > v_now;

  insert into public.availabilities (user_id, activity, duration, audience_all, starts_at, expires_at)
  values (uid, p_activity, p_duration, p_audience_all, v_now, v_expires)
  returning * into v_row;

  insert into public.availability_recipients (availability_id, user_id)
  select v_row.id, f.friend_id
  from (
    select case when user_low = uid then user_high else user_low end as friend_id
    from public.friendships
    where status = 'accepted' and uid in (user_low, user_high)
  ) f
  where not private.is_blocked(uid, f.friend_id)
    and (
      p_audience_all
      or f.friend_id = any (p_friend_ids)
      or exists (
        select 1 from public.circle_members m
        where m.circle_id = any (p_circle_ids) and m.member_id = f.friend_id
      )
    );
  get diagnostics v_count = row_count;

  return jsonb_build_object(
    'id', v_row.id,
    'activity', v_row.activity,
    'duration', v_row.duration,
    'starts_at', v_row.starts_at,
    'expires_at', v_row.expires_at,
    'recipient_count', v_count,
    'server_now', v_now
  );
end $$;

create function public.end_availability() returns void
language sql security definer set search_path = '' as $$
  update public.availabilities set ended_at = now()
   where user_id = auth.uid() and ended_at is null and expires_at > now()
$$;

-- My live availability (or null) plus the server clock, so the app can correct device clock drift.
create function public.my_status() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'server_now', now(),
    'is_premium', private.is_premium(auth.uid()),
    'onboarded', private.is_onboarded(auth.uid()),
    'availability', (
      select jsonb_build_object(
        'id', a.id, 'activity', a.activity, 'duration', a.duration, 'audience_all', a.audience_all,
        'starts_at', a.starts_at, 'expires_at', a.expires_at,
        'recipient_count', (select count(*) from public.availability_recipients r where r.availability_id = a.id),
        'join_count', (select count(*) from public.availability_joins j where j.availability_id = a.id)
      )
      from public.availabilities a
      where a.user_id = auth.uid() and a.ended_at is null and a.expires_at > now()
      order by a.created_at desc
      limit 1
    )
  )
$$;

-- Friends who are free right now and chose to tell me.
create function public.free_now()
returns table (
  availability_id uuid, user_id uuid, username text, display_name text, avatar_path text,
  activity text, starts_at timestamptz, expires_at timestamptz, joined boolean, join_count int
)
language sql stable security definer set search_path = '' as $$
  select a.id, a.user_id, p.username, p.display_name, p.avatar_path, a.activity, a.starts_at, a.expires_at,
         exists (select 1 from public.availability_joins j where j.availability_id = a.id and j.user_id = auth.uid()),
         (select count(*)::int from public.availability_joins j where j.availability_id = a.id)
  from public.availability_recipients r
  join public.availabilities a on a.id = r.availability_id
  join public.profiles p on p.id = a.user_id
  where r.user_id = auth.uid()
    and a.ended_at is null
    and a.expires_at > now()
    and not private.is_blocked(a.user_id, auth.uid())
  order by a.starts_at desc
  limit 200
$$;

create function public.join_availability(p_availability_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not exists (
    select 1 from public.availabilities a
    join public.availability_recipients r on r.availability_id = a.id and r.user_id = uid
    where a.id = p_availability_id and a.ended_at is null and a.expires_at > now()
      and not private.is_blocked(a.user_id, uid)
  ) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  insert into public.availability_joins (availability_id, user_id) values (p_availability_id, uid)
  on conflict do nothing;
end $$;

create function public.leave_availability(p_availability_id uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.availability_joins where availability_id = p_availability_id and user_id = auth.uid()
$$;

-- A device token belongs to whoever registered it last (handles account switching on one phone).
create function public.register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  insert into public.push_tokens (token, user_id, platform) values (p_token, uid, p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;

create function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = '' as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid()
$$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

alter table public.profiles                enable row level security;
alter table public.user_settings           enable row level security;
alter table public.friendships             enable row level security;
alter table public.blocks                  enable row level security;
alter table public.circles                 enable row level security;
alter table public.circle_members          enable row level security;
alter table public.availabilities          enable row level security;
alter table public.availability_recipients enable row level security;
alter table public.availability_joins      enable row level security;
alter table public.meetup_messages         enable row level security;
alter table public.push_tokens             enable row level security;
alter table public.reports                 enable row level security;
alter table public.entitlements            enable row level security;
alter table public.subscription_events     enable row level security;

create policy "profiles: visible to self and connections" on public.profiles
  for select to authenticated using (private.can_view_profile((select auth.uid()), id));
create policy "profiles: owner updates" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "settings: owner reads" on public.user_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "settings: owner updates" on public.user_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "friendships: parties read" on public.friendships
  for select to authenticated using ((select auth.uid()) in (user_low, user_high));

create policy "blocks: blocker reads" on public.blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
create policy "blocks: blocker deletes" on public.blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

create policy "circles: owner reads" on public.circles
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "circles: owner creates" on public.circles
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "circles: owner updates" on public.circles
  for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "circles: owner deletes" on public.circles
  for delete to authenticated using (owner_id = (select auth.uid()));

create policy "circle members: owner reads" on public.circle_members
  for select to authenticated using (
    exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = (select auth.uid()))
  );
create policy "circle members: owner adds friends only" on public.circle_members
  for insert to authenticated with check (
    exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = (select auth.uid()))
    and private.are_friends((select auth.uid()), member_id)
  );
create policy "circle members: owner removes" on public.circle_members
  for delete to authenticated using (
    exists (select 1 from public.circles c where c.id = circle_id and c.owner_id = (select auth.uid()))
  );

create policy "availabilities: owner and recipients read" on public.availabilities
  for select to authenticated using (private.can_view_availability(id, (select auth.uid())));

create policy "recipients: self or owner reads" on public.availability_recipients
  for select to authenticated using (
    user_id = (select auth.uid()) or private.owns_availability(availability_id, (select auth.uid()))
  );

create policy "joins: visible to those who can see the availability" on public.availability_joins
  for select to authenticated using (private.can_view_availability(availability_id, (select auth.uid())));

create policy "messages: participants read" on public.meetup_messages
  for select to authenticated using (private.is_meetup_participant(availability_id, (select auth.uid())));
create policy "messages: participants send while live" on public.meetup_messages
  for insert to authenticated with check (
    sender_id = (select auth.uid())
    and private.is_meetup_participant(availability_id, (select auth.uid()))
    and exists (
      select 1 from public.availabilities a
      where a.id = availability_id and a.ended_at is null and a.expires_at > now()
    )
  );

create policy "push tokens: owner reads" on public.push_tokens
  for select to authenticated using (user_id = (select auth.uid()));

create policy "reports: reporter creates" on public.reports
  for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "reports: reporter reads own" on public.reports
  for select to authenticated using (reporter_id = (select auth.uid()));

create policy "entitlements: owner reads" on public.entitlements
  for select to authenticated using (user_id = (select auth.uid()));

-- subscription_events: no policies → no client access.

-- -----------------------------------------------------------------------------
-- Privileges (least privilege; Supabase's defaults grant everything, so reset them)
-- -----------------------------------------------------------------------------

revoke all on all tables in schema public from anon, authenticated;

grant select on
  public.profiles, public.user_settings, public.friendships, public.blocks, public.circles,
  public.circle_members, public.availabilities, public.availability_recipients,
  public.availability_joins, public.meetup_messages, public.push_tokens, public.reports,
  public.entitlements
to authenticated;

grant update (username, display_name, avatar_path) on public.profiles to authenticated;
grant update (timezone, notifications_enabled, quiet_hours_start, quiet_hours_end) on public.user_settings to authenticated;
grant delete on public.blocks to authenticated;
grant insert (name, emoji), update (name, emoji), delete on public.circles to authenticated;
grant insert (circle_id, member_id), delete on public.circle_members to authenticated;
grant insert (availability_id, body) on public.meetup_messages to authenticated;
grant insert (reported_user_id, message_id, availability_id, reason, details) on public.reports to authenticated;

revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on all functions in schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Realtime (postgres_changes respects the RLS policies above)
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table
  public.availabilities, public.availability_recipients, public.availability_joins, public.meetup_messages;

-- -----------------------------------------------------------------------------
-- Storage: avatars (public read via unguessable path, owner-only writes)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "avatars: owner reads own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner uploads to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner updates own folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner deletes own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- =============================================================================
-- Meetup chat RPCs, push dispatch, account deletion safety
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Reports must survive account deletion (moderation evidence), so detach instead of cascade.
-- -----------------------------------------------------------------------------
alter table public.reports alter column reporter_id drop not null;
alter table public.reports alter column reported_user_id drop not null;
alter table public.reports drop constraint reports_reporter_id_fkey;
alter table public.reports drop constraint reports_reported_user_id_fkey;
alter table public.reports
  add constraint reports_reporter_id_fkey foreign key (reporter_id) references public.profiles (id) on delete set null,
  add constraint reports_reported_user_id_fkey foreign key (reported_user_id) references public.profiles (id) on delete set null;
-- Insert policy still requires reporter_id = auth.uid(), so new reports always have a reporter.

-- -----------------------------------------------------------------------------
-- Chat: rate limit (30 messages / minute / user)
-- -----------------------------------------------------------------------------
create function private.enforce_message_rate() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.meetup_messages
      where sender_id = new.sender_id and created_at > now() - interval '1 minute') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;

create trigger meetup_messages_rate before insert on public.meetup_messages
  for each row execute function private.enforce_message_rate();

-- -----------------------------------------------------------------------------
-- Chat: list my meetups (live ones, plus ones that ended in the last 24 h as read-only history)
-- -----------------------------------------------------------------------------
create function public.my_meetups()
returns table (
  availability_id uuid, owner_id uuid, owner_name text, owner_avatar_path text, activity text,
  starts_at timestamptz, ends_at timestamptz, is_live boolean, participant_count int,
  last_message text, last_message_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select a.* from public.availabilities a
    where (a.user_id = auth.uid()
           or exists (select 1 from public.availability_joins j where j.availability_id = a.id and j.user_id = auth.uid()))
      -- a meetup only exists once at least one friend has joined
      and exists (select 1 from public.availability_joins j where j.availability_id = a.id)
      and least(a.expires_at, coalesce(a.ended_at, a.expires_at)) > now() - interval '24 hours'
  )
  select m.id, m.user_id, coalesce(p.display_name, p.username), p.avatar_path, m.activity, m.starts_at,
         least(m.expires_at, coalesce(m.ended_at, m.expires_at)),
         m.ended_at is null and m.expires_at > now(),
         1 + (select count(*)::int from public.availability_joins j where j.availability_id = m.id),
         lm.body, lm.created_at
  from mine m
  join public.profiles p on p.id = m.user_id
  left join lateral (
    select body, created_at from public.meetup_messages mm
    where mm.availability_id = m.id order by created_at desc, id desc limit 1
  ) lm on true
  order by (m.ended_at is null and m.expires_at > now()) desc, coalesce(lm.created_at, m.starts_at) desc
  limit 100
$$;

-- Messages newest-first, keyset-paginated by (created_at, id).
create function public.meetup_thread(
  p_availability_id uuid, p_before_created_at timestamptz default null, p_before_id uuid default null, p_limit int default 50
)
returns table (id uuid, sender_id uuid, sender_name text, sender_avatar_path text, body text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_meetup_participant(p_availability_id, auth.uid()) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  return query
    select m.id, m.sender_id, coalesce(p.display_name, p.username), p.avatar_path, m.body, m.created_at
    from public.meetup_messages m
    join public.profiles p on p.id = m.sender_id
    where m.availability_id = p_availability_id
      and (p_before_created_at is null or (m.created_at, m.id) < (p_before_created_at, p_before_id))
    order by m.created_at desc, m.id desc
    limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $$;

-- Participants of a meetup (for the chat header).
create function public.meetup_participants(p_availability_id uuid)
returns table (user_id uuid, display_name text, avatar_path text, is_owner boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_meetup_participant(p_availability_id, auth.uid()) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  return query
    select p.id, coalesce(p.display_name, p.username), p.avatar_path, true
    from public.availabilities a join public.profiles p on p.id = a.user_id
    where a.id = p_availability_id
    union all
    select p.id, coalesce(p.display_name, p.username), p.avatar_path, false
    from public.availability_joins j join public.profiles p on p.id = j.user_id
    where j.availability_id = p_availability_id;
end $$;

-- -----------------------------------------------------------------------------
-- Push dispatch
--   DB events → pg_net HTTP call (sent only after the transaction commits) → Edge Function `push`
--   → Expo Push Service → APNs / FCM.
--   The URL and shared secret live in Supabase Vault (never in git). If they are missing,
--   dispatch is a silent no-op, so nothing breaks before push is configured.
-- -----------------------------------------------------------------------------
create extension if not exists pg_net with schema extensions;

create function private.dispatch_push(p_kind text, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_dispatch_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_dispatch_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('kind', p_kind) || p_payload,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 10000
  );
exception when others then
  -- Push must never block the user's action.
  raise warning 'dispatch_push(%) failed: %', p_kind, sqlerrm;
end $$;

-- One call per go_free (recipients are inserted in a single statement).
create function private.on_recipients_inserted() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  for v_id in select distinct availability_id from inserted loop
    perform private.dispatch_push('free', jsonb_build_object('availability_id', v_id));
  end loop;
  return null;
end $$;

create trigger availability_recipients_push
  after insert on public.availability_recipients
  referencing new table as inserted
  for each statement execute function private.on_recipients_inserted();

create function private.on_join_inserted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.dispatch_push('join', jsonb_build_object('availability_id', new.availability_id, 'user_id', new.user_id));
  return null;
end $$;

create trigger availability_joins_push
  after insert on public.availability_joins
  for each row execute function private.on_join_inserted();

create function private.on_message_inserted() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.dispatch_push('message', jsonb_build_object('message_id', new.id));
  return null;
end $$;

create trigger meetup_messages_push
  after insert on public.meetup_messages
  for each row execute function private.on_message_inserted();

-- -----------------------------------------------------------------------------
-- Privileges for the new functions
-- -----------------------------------------------------------------------------
revoke all on function public.my_meetups() from public, anon;
revoke all on function public.meetup_thread(uuid, timestamptz, uuid, int) from public, anon;
revoke all on function public.meetup_participants(uuid) from public, anon;
grant execute on function public.my_meetups() to authenticated;
grant execute on function public.meetup_thread(uuid, timestamptz, uuid, int) to authenticated;
grant execute on function public.meetup_participants(uuid) to authenticated;

revoke all on function private.enforce_message_rate() from public, anon;
revoke all on function private.dispatch_push(text, jsonb) from public, anon, authenticated;
revoke all on function private.on_recipients_inserted() from public, anon, authenticated;
revoke all on function private.on_join_inserted() from public, anon, authenticated;
revoke all on function private.on_message_inserted() from public, anon, authenticated;

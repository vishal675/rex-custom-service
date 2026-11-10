-- =============================================================================
-- Unread chat tracking + badge counts + friend-request push
-- =============================================================================

create table public.meetup_reads (
  availability_id uuid not null references public.availabilities (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (availability_id, user_id)
);
create index meetup_reads_user_idx on public.meetup_reads (user_id);

alter table public.meetup_reads enable row level security;
create policy "reads: owner reads" on public.meetup_reads
  for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.meetup_reads from anon, authenticated;
grant select on public.meetup_reads to authenticated;

-- Mark a meetup chat as read up to now (only participants).
create function public.mark_meetup_read(p_availability_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if not private.is_meetup_participant(p_availability_id, uid) then
    raise exception 'not_available' using errcode = 'P0001';
  end if;
  insert into public.meetup_reads (availability_id, user_id, last_read_at)
  values (p_availability_id, uid, now())
  on conflict (availability_id, user_id) do update set last_read_at = excluded.last_read_at;
end $$;

-- Unread messages for a user in one meetup (messages from others after their last read).
create function private.unread_in(p_availability_id uuid, p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select count(*)::int
  from public.meetup_messages m
  where m.availability_id = p_availability_id
    and m.sender_id <> p_user
    and m.created_at > coalesce(
      (select r.last_read_at from public.meetup_reads r where r.availability_id = p_availability_id and r.user_id = p_user),
      '-infinity'::timestamptz)
$$;

-- my_meetups gains unread_count (return type changes → drop + recreate).
drop function public.my_meetups();
create function public.my_meetups()
returns table (
  availability_id uuid, owner_id uuid, owner_name text, owner_avatar_path text, activity text,
  starts_at timestamptz, ends_at timestamptz, is_live boolean, participant_count int,
  last_message text, last_message_at timestamptz, unread_count int
)
language sql stable security definer set search_path = '' as $$
  with mine as (
    select a.* from public.availabilities a
    where (a.user_id = auth.uid()
           or exists (select 1 from public.availability_joins j where j.availability_id = a.id and j.user_id = auth.uid()))
      and exists (select 1 from public.availability_joins j where j.availability_id = a.id)
      and least(a.expires_at, coalesce(a.ended_at, a.expires_at)) > now() - interval '24 hours'
  )
  select m.id, m.user_id, coalesce(p.display_name, p.username), p.avatar_path, m.activity, m.starts_at,
         least(m.expires_at, coalesce(m.ended_at, m.expires_at)),
         m.ended_at is null and m.expires_at > now(),
         1 + (select count(*)::int from public.availability_joins j where j.availability_id = m.id),
         lm.body, lm.created_at,
         private.unread_in(m.id, auth.uid())
  from mine m
  join public.profiles p on p.id = m.user_id
  left join lateral (
    select body, created_at from public.meetup_messages mm
    where mm.availability_id = m.id order by created_at desc, id desc limit 1
  ) lm on true
  order by (m.ended_at is null and m.expires_at > now()) desc, coalesce(lm.created_at, m.starts_at) desc
  limit 100
$$;

-- App icon badge = unread chat messages (meetups from the last 24 h) + incoming friend requests.
-- Server-only: used by the push Edge Function (service role).
create function public.badge_count_for(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select
    coalesce((
      select sum(private.unread_in(a.id, p_user))::int
      from public.availabilities a
      where (a.user_id = p_user
             or exists (select 1 from public.availability_joins j where j.availability_id = a.id and j.user_id = p_user))
        and least(a.expires_at, coalesce(a.ended_at, a.expires_at)) > now() - interval '24 hours'
    ), 0)
    + (select count(*)::int from public.friendships f
       where f.status = 'pending' and f.requested_by <> p_user and p_user in (f.user_low, f.user_high))
$$;

-- Push: "X wants to be friends" when a request is created.
create function private.on_friend_request() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'pending' then
    perform private.dispatch_push('friend_request', jsonb_build_object(
      'requester_id', new.requested_by,
      'target_id', case when new.requested_by = new.user_low then new.user_high else new.user_low end));
  end if;
  return null;
end $$;

create trigger friendships_request_push
  after insert on public.friendships
  for each row execute function private.on_friend_request();

-- Privileges
revoke all on function public.my_meetups() from public, anon;
grant execute on function public.my_meetups() to authenticated;
revoke all on function public.mark_meetup_read(uuid) from public, anon;
grant execute on function public.mark_meetup_read(uuid) to authenticated;
revoke all on function public.badge_count_for(uuid) from public, anon, authenticated;
grant execute on function public.badge_count_for(uuid) to service_role;
revoke all on function private.unread_in(uuid, uuid) from public, anon;
grant execute on function private.unread_in(uuid, uuid) to authenticated;
revoke all on function private.on_friend_request() from public, anon, authenticated;

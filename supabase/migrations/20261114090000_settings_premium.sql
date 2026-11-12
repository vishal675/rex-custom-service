-- Settings screens + Premium.
--
-- 1. my_blocked(): the people I've blocked, with name/photo. Blocked profiles are hidden by RLS
--    (can_view_profile excludes blocks), so the blocker can't read them through the table.
-- 2. Entitlements are written only by Edge Functions (service role) from RevenueCat's server API —
--    never by the app. No client grants change here.

create function public.my_blocked()
returns table (user_id uuid, username text, display_name text, avatar_path text, blocked_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.username, p.display_name, p.avatar_path, b.created_at
  from public.blocks b
  join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc
$$;

revoke all on function public.my_blocked() from public, anon;
grant execute on function public.my_blocked() to authenticated;

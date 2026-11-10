-- =============================================================================
-- Security & behaviour tests for the core schema.
-- Everything runs inside one transaction and is ROLLED BACK — no data is left behind.
-- Run:  ./supabase/scripts/test-db.sh   (see that script for details)
-- Any failure raises an exception whose message starts with "FAIL".
-- =============================================================================

-- Test users: alice, bob, carol (friends), dave (stranger), erin (minor, never onboards)
insert into auth.users (id, instance_id, aud, role, email, created_at, updated_at) values
  ('a0000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'alice@test.vybe.invalid', now(), now()),
  ('a0000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'bob@test.vybe.invalid',   now(), now()),
  ('a0000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'carol@test.vybe.invalid', now(), now()),
  ('a0000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dave@test.vybe.invalid',  now(), now()),
  ('a0000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'erin@test.vybe.invalid',  now(), now());

-- T1: sign-up trigger creates profile + settings
do $$ begin
  if (select count(*) from public.profiles where id::text like 'a0000000-%') <> 5 then raise exception 'FAIL T1: profiles not created'; end if;
  if (select count(*) from public.user_settings where user_id::text like 'a0000000-%') <> 5 then raise exception 'FAIL T1: settings not created'; end if;
end $$;

-- T2: onboarding rules (as erin)
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
do $$ begin
  perform public.complete_onboarding('erin', 'Erin', (current_date - interval '17 years')::date, 'Asia/Kolkata');
  raise exception 'FAIL T2a: under-18 accepted';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  if sqlerrm <> 'under_18' then raise exception 'FAIL T2a: wrong error: %', sqlerrm; end if;
end $$;
do $$ begin
  perform public.complete_onboarding('erin', 'Erin', '1995-01-01', 'Mars/Olympus');
  raise exception 'FAIL T2b: bad timezone accepted';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  if sqlerrm <> 'invalid_timezone' then raise exception 'FAIL T2b: wrong error: %', sqlerrm; end if;
end $$;
do $$ begin
  perform public.complete_onboarding('Bad Name!', 'Erin', '1995-01-01', 'Asia/Kolkata');
  raise exception 'FAIL T2c: bad username accepted';
exception when check_violation then null;
end $$;
do $$ begin
  update public.user_settings set age_confirmed_at = now();
  raise exception 'FAIL T2d: user could set age_confirmed_at directly';
exception when insufficient_privilege then null;
end $$;

-- Onboard alice, bob, carol, dave
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select public.complete_onboarding('alice', 'Alice', '1998-03-04', 'Asia/Kolkata');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.complete_onboarding('bob', 'Bob', '1997-05-06', 'Europe/London');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
select public.complete_onboarding('carol', 'Carol', '1999-07-08', 'America/New_York');
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
select public.complete_onboarding('dave', 'Dave', '1990-01-01', 'Asia/Kolkata');

-- T3: username uniqueness
do $$ begin
  perform public.complete_onboarding('alice', 'Fake Alice', '1990-01-01', 'Asia/Kolkata');
  raise exception 'FAIL T3: duplicate username accepted';
exception when unique_violation then null;
end $$;

-- T4: friend requests (alice → bob, bob accepts; alice → carol, carol → alice auto-accepts)
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  if public.send_friend_request('a0000000-0000-4000-8000-000000000002') <> 'pending' then raise exception 'FAIL T4a'; end if;
  if public.send_friend_request('a0000000-0000-4000-8000-000000000003') <> 'pending' then raise exception 'FAIL T4b'; end if;
end $$;
do $$ begin
  insert into public.friendships (user_low, user_high, requested_by) values
    ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001');
  raise exception 'FAIL T4c: direct friendship insert allowed';
exception when insufficient_privilege then null;
end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  if (select status from public.my_friends() where username = 'alice') <> 'incoming' then raise exception 'FAIL T4d: bob does not see incoming request'; end if;
  perform public.respond_friend_request('a0000000-0000-4000-8000-000000000001', true);
  if (select status from public.my_friends() where username = 'alice') <> 'friend' then raise exception 'FAIL T4e: accept failed'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin
  if public.send_friend_request('a0000000-0000-4000-8000-000000000001') <> 'accepted' then raise exception 'FAIL T4f: reciprocal request not auto-accepted'; end if;
end $$;

-- T5: privacy — a stranger can look up an exact username but cannot read the profile row
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.find_user('alice')) <> 1 then raise exception 'FAIL T5a: exact lookup failed'; end if;
  if (select count(*) from public.find_user('ali')) <> 0 then raise exception 'FAIL T5b: partial lookup leaked'; end if;
  if (select count(*) from public.profiles where username = 'alice') <> 0 then raise exception 'FAIL T5c: stranger can read profile'; end if;
  if (select count(*) from public.user_settings) <> 1 then raise exception 'FAIL T5d: can read other users settings'; end if;
end $$;

-- T6: I'M FREE — server-computed expiry, audience = accepted friends only
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$
declare r jsonb;
begin
  r := public.go_free('coffee', '1h', true);
  if (r->>'recipient_count')::int <> 2 then raise exception 'FAIL T6a: expected 2 recipients, got %', r->>'recipient_count'; end if;
  if abs(extract(epoch from ((r->>'expires_at')::timestamptz - now())) - 3600) > 1 then raise exception 'FAIL T6b: expiry not now()+1h'; end if;
end $$;
do $$ begin
  insert into public.availabilities (user_id, duration, audience_all, starts_at, expires_at)
  values ('a0000000-0000-4000-8000-000000000001', '1h', true, now(), now() + interval '99 days');
  raise exception 'FAIL T6c: direct availability insert allowed';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.go_free('coffee', '5h', true);
  raise exception 'FAIL T6d: invalid duration accepted';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- T7: "till tonight" = 23:59 in the user's timezone (or ≥ 1h from now)
do $$
declare r jsonb; v_exp timestamptz; v_expected timestamptz;
begin
  r := public.go_free(null, 'tonight', true);
  v_exp := (r->>'expires_at')::timestamptz;
  v_expected := greatest(
    (date_trunc('day', now() at time zone 'Asia/Kolkata') + interval '23 hours 59 minutes') at time zone 'Asia/Kolkata',
    now() + interval '1 hour');
  if v_exp <> v_expected then raise exception 'FAIL T7: tonight = %, expected %', v_exp, v_expected; end if;
  if (select count(*) from public.availabilities where user_id = auth.uid() and ended_at is null) <> 1 then
    raise exception 'FAIL T7b: previous availability not replaced';
  end if;
end $$;

-- T8: who can see it
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.free_now() where username = 'alice') <> 1 then raise exception 'FAIL T8a: bob cannot see alice free'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.free_now()) <> 0 then raise exception 'FAIL T8b: stranger sees free friends'; end if;
  if (select count(*) from public.availabilities) <> 0 then raise exception 'FAIL T8c: stranger can read availabilities'; end if;
end $$;

-- T9: join + meetup chat
-- dave can't read availability ids, so look one up as the table owner
reset role;
create temp table t_av as
  select id from public.availabilities
  where user_id = 'a0000000-0000-4000-8000-000000000001' and ended_at is null;
grant select on t_av to authenticated;
set local role authenticated;
do $$ begin
  perform public.join_availability((select id from t_av));
  raise exception 'FAIL T9a: stranger joined';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  if sqlerrm <> 'not_available' then raise exception 'FAIL T9a: wrong error %', sqlerrm; end if;
end $$;
do $$ begin
  insert into public.meetup_messages (availability_id, body) values ((select id from t_av), 'hi');
  raise exception 'FAIL T9b: stranger posted in meetup chat';
exception when insufficient_privilege then null;
end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
do $$ begin
  perform public.join_availability((select id from t_av));
  insert into public.meetup_messages (availability_id, body) values ((select id from t_av), 'On my way');
  if (select count(*) from public.meetup_messages where availability_id = (select id from t_av)) <> 1 then
    raise exception 'FAIL T9c: participant cannot read chat';
  end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.meetup_messages) <> 0 then raise exception 'FAIL T9d: non-joined friend reads chat'; end if;
end $$;

-- T10: circles — free limit 2, Premium unlimited, members must be friends, lapse enforcement
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
insert into public.circles (name, emoji) values ('One', '1️⃣');
insert into public.circles (name, emoji) values ('Two', '2️⃣');
do $$ begin
  insert into public.circles (name) values ('Three');
  raise exception 'FAIL T10a: 3rd circle allowed on free';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  if sqlerrm <> 'premium_required' then raise exception 'FAIL T10a: wrong error %', sqlerrm; end if;
end $$;
do $$ begin
  insert into public.circle_members (circle_id, member_id)
  values ((select id from public.circles where name = 'One'), 'a0000000-0000-4000-8000-000000000004');
  raise exception 'FAIL T10b: non-friend added to circle';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  insert into public.entitlements (user_id, expires_at) values (auth.uid(), now() + interval '30 days');
  raise exception 'FAIL T10c: user granted themselves Premium';
exception when insufficient_privilege then null;
end $$;
reset role;
insert into public.entitlements (user_id, store, period_type, expires_at)
values ('a0000000-0000-4000-8000-000000000001', 'app_store', 'normal', now() + interval '30 days');
set local role authenticated;
insert into public.circles (name) values ('Three');
insert into public.circle_members (circle_id, member_id)
  values ((select id from public.circles where name = 'Three'), 'a0000000-0000-4000-8000-000000000002');
do $$
declare r jsonb;
begin
  r := public.go_free('food', '30m', false, array[(select id from public.circles where name = 'Three')]);
  if (r->>'recipient_count')::int <> 1 then raise exception 'FAIL T10d: circle audience wrong: %', r->>'recipient_count'; end if;
  if (public.my_status()->>'is_premium')::boolean is not true then raise exception 'FAIL T10e: my_status premium'; end if;
end $$;
reset role;
update public.entitlements set expires_at = now() - interval '1 minute' where user_id = 'a0000000-0000-4000-8000-000000000001';
-- all rows share now() inside one transaction; make 'Three' unambiguously the newest
update public.circles set created_at = created_at + interval '1 second' where name = 'Three';
set local role authenticated;
do $$ begin
  perform public.go_free('food', '30m', false, array[(select id from public.circles where name = 'Three')]);
  raise exception 'FAIL T10f: lapsed user used 3rd circle';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  if sqlerrm <> 'premium_required' then raise exception 'FAIL T10f: wrong error %', sqlerrm; end if;
end $$;

-- T11: blocking hides everything both ways
select public.go_free('gaming', '2h', true);
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
select public.block_user('a0000000-0000-4000-8000-000000000001');
do $$ begin
  if (select count(*) from public.free_now()) <> 0 then raise exception 'FAIL T11a: blocked user still visible as free'; end if;
  if (select count(*) from public.my_friends()) <> 0 then raise exception 'FAIL T11b: friendship survived block'; end if;
  if (select count(*) from public.profiles where username = 'alice') <> 0 then raise exception 'FAIL T11c: blocked profile visible'; end if;
end $$;
select set_config('request.jwt.claims', '{"sub":"a0000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
do $$ begin
  if (select count(*) from public.find_user('bob')) <> 0 then raise exception 'FAIL T11d: blocker discoverable by blocked user'; end if;
  perform public.send_friend_request('a0000000-0000-4000-8000-000000000002');
  raise exception 'FAIL T11e: blocked user could send request';
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
end $$;

-- T12: anon has no access at all
reset role;
set local role anon;
do $$ begin
  perform 1 from public.profiles limit 1;
  raise exception 'FAIL T12: anon can read profiles';
exception when insufficient_privilege then null;
end $$;
do $$ begin
  perform public.free_now();
  raise exception 'FAIL T12b: anon can call RPC';
exception when insufficient_privilege then null;
end $$;

reset role;
select 'ALL TESTS PASSED' as result;

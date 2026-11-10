-- Live friend requests / accepts.
-- RLS ("friendships: parties read") limits INSERT/UPDATE events to the two people involved.
-- Clients must NOT subscribe to DELETE events: Realtime can't filter or RLS-check them.
alter publication supabase_realtime add table public.friendships;

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (Founders)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SESSIONS (Pitch Sessions)
create table public.sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) not null,
  transcript jsonb default '[]'::jsonb, -- Stores the full conversation
  interruption_log jsonb default '[]'::jsonb, -- Stores specific interruption events
  report_card jsonb, -- The final O1-Mini output
  scores jsonb, -- Extracted numeric scores { market: 80, tech: 50, etc }
  duration_seconds integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Security)
alter table public.profiles enable row level security;
alter table public.sessions enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own sessions" on public.sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can view own sessions" on public.sessions
  for select using (auth.uid() = user_id);

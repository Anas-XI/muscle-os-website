-- Muscle OS Mobile — Supabase Schema

-- 1. Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('client', 'coach')),
  name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Coaches can read their clients profiles"
  on profiles for select using (
    auth.uid() in (
      select coach_id from coach_clients where client_id = profiles.id
    )
  );

-- 2. Client profiles (intake / onboarding data)
create table client_profiles (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade unique,
  -- Goals & context
  goal text,
  situation text,
  experience text,
  -- Body metrics
  weight numeric,
  height numeric,
  age int,
  -- Training
  training_days int,
  session_length int,
  current_split text,
  injuries text,
  -- Lifestyle
  gut_health text,
  sleep text,
  stress text,
  steps text,
  caffeine text,
  supplements text,
  medical_conditions text,
  -- Screening
  ed_screening jsonb,
  -- Health
  hydration text,
  alcohol_weekly text,
  work_schedule text,
  mobility text,
  bloodwork text,
  mental_health text,
  -- Metadata
  completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table client_profiles enable row level security;

create policy "Users can read own client profile"
  on client_profiles for select using (auth.uid() = user_id);

create policy "Users can insert own client profile"
  on client_profiles for insert with check (auth.uid() = user_id);

create policy "Users can update own client profile"
  on client_profiles for update using (auth.uid() = user_id);

create policy "Coaches can read their clients profiles"
  on client_profiles for select using (
    auth.uid() in (
      select coach_id from coach_clients where client_id = client_profiles.user_id
    )
  );

-- 3. Programs
create table programs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  title text,
  content text not null,
  active boolean default false,
  version int default 1,
  created_at timestamptz default now()
);

alter table programs enable row level security;

create policy "Users can read own programs"
  on programs for select using (auth.uid() = user_id);

create policy "Coaches can read clients programs"
  on programs for select using (
    auth.uid() in (
      select coach_id from coach_clients where client_id = programs.user_id
    )
  );

-- 4. Messages (chat history)
create table messages (
  id bigint generated always as identity primary key,
  user_id uuid references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_messages_user_id on messages(user_id);
create index idx_messages_created_at on messages(created_at);

alter table messages enable row level security;

create policy "Users can read own messages"
  on messages for select using (auth.uid() = user_id);

create policy "Users can insert own messages"
  on messages for insert with check (auth.uid() = user_id);

create policy "Coaches can read clients messages"
  on messages for select using (
    auth.uid() in (
      select coach_id from coach_clients where client_id = messages.user_id
    )
  );

-- 5. Check-ins
create table checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  checkin_number int not null,
  weight numeric,
  sleep_hours numeric,
  sleep_quality int,
  readiness int,
  adherence int,
  soreness int,
  notes text,
  created_at timestamptz default now()
);

alter table checkins enable row level security;

create policy "Users can read own checkins"
  on checkins for select using (auth.uid() = user_id);

create policy "Users can insert own checkins"
  on checkins for insert with check (auth.uid() = user_id);

create policy "Coaches can read clients checkins"
  on checkins for select using (
    auth.uid() in (
      select coach_id from coach_clients where client_id = checkins.user_id
    )
  );

-- 6. Coach-client relationships
create table coach_clients (
  id uuid default gen_random_uuid() primary key,
  coach_id uuid references profiles(id) on delete cascade,
  client_id uuid references profiles(id) on delete cascade,
  status text default 'active' check (status in ('active', 'pending', 'inactive')),
  created_at timestamptz default now(),
  unique(coach_id, client_id)
);

alter table coach_clients enable row level security;

create policy "Coaches can read own relationships"
  on coach_clients for select using (auth.uid() = coach_id);

create policy "Coaches can insert relationships"
  on coach_clients for insert with check (auth.uid() = coach_id);

create policy "Clients can read own relationships"
  on coach_clients for select using (auth.uid() = client_id);

-- 7. Workout logs (for future tracker feature)
create table workout_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade,
  exercise text not null,
  sets int,
  reps int,
  weight numeric,
  rpe numeric,
  notes text,
  logged_at timestamptz default now()
);

alter table workout_logs enable row level security;

create policy "Users can read own workout logs"
  on workout_logs for select using (auth.uid() = user_id);

create policy "Users can insert own workout logs"
  on workout_logs for insert with check (auth.uid() = user_id);

create policy "Coaches can read clients workout logs"
  on workout_logs for select using (
    auth.uid() in (
      select coach_id from coach_clients where client_id = workout_logs.user_id
    )
  );

-- Helper function: get user context for AI
create or replace function get_user_context(p_user_id uuid)
returns jsonb
language plpgsql
security definer
as $$
declare
  result jsonb;
begin
  select jsonb_build_object(
    'profile', row_to_json(cp.*)::jsonb,
    'programs', (select jsonb_agg(row_to_json(p.*)::jsonb) from programs p where p.user_id = p_user_id and p.active = true),
    'recent_checkins', (select jsonb_agg(row_to_json(c.*)::jsonb order by c.created_at desc limit 4) from checkins c where c.user_id = p_user_id)
  ) into result
  from client_profiles cp
  where cp.user_id = p_user_id;
  return result;
end;
$$;

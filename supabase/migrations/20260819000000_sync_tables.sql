-- Migration: Cross-Channel Sync Tables
-- Phase 5 — Unified State
-- Date: 2026-08-19

-- 1. User Profiles (unified intake blob from web + bot)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  intake jsonb NOT NULL DEFAULT '{}'::jsonb,
  goal text,
  experience text,
  bodyweight_kg numeric,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own user_profile"
  ON public.user_profiles FOR ALL USING (auth.uid() = id);

-- 2. Workout Sessions (daily training log from web training tool)
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_date date NOT NULL,
  log jsonb NOT NULL DEFAULT '{}'::jsonb,         -- full day log (exercises, sets, reps, rpe)
  load_history jsonb NOT NULL DEFAULT '{}'::jsonb, -- per-exercise history snapshot
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id, session_date)
);
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workout_sessions"
  ON public.workout_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_workout_sessions_user_date ON public.workout_sessions(user_id, session_date DESC);

-- 3. Deload Tracker (current deload state from web training tool)
CREATE TABLE IF NOT EXISTS public.deload_tracker (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now() NOT NULL
);
ALTER TABLE public.deload_tracker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own deload_tracker"
  ON public.deload_tracker FOR ALL USING (auth.uid() = id);

-- 4. Telegram Link (identity bridge: telegram_id → supabase user_id)
CREATE TABLE IF NOT EXISTS public.telegram_links (
  telegram_id bigint PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (user_id)
);
ALTER TABLE public.telegram_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own telegram_link"
  ON public.telegram_links FOR SELECT USING (auth.uid() = user_id);
-- Inserts/updates done only via service role (worker), no user-level INSERT policy

-- 5. Triggers for updated_at on new tables
CREATE TRIGGER set_timestamp_user_profiles
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_workout_sessions
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_deload_tracker
  BEFORE UPDATE ON public.deload_tracker
  FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

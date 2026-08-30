-- === 20260808000000_mos_tracking_tables.sql ===
-- Migration: Create MOS tracking tables
-- Date: 2026-08-08

-- 1. Measurements
CREATE TABLE IF NOT EXISTS public.mos_measurements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL,
    weight numeric NOT NULL,
    body_fat numeric,
    chest numeric,
    waist numeric,
    hips numeric,
    arms numeric,
    thighs numeric,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    UNIQUE (user_id, id)
);

CREATE INDEX idx_mos_measurements_user_id ON public.mos_measurements(user_id);
CREATE INDEX idx_mos_measurements_date ON public.mos_measurements(date);

-- 2. Meals
CREATE TABLE IF NOT EXISTS public.mos_meals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL,
    meal_type text NOT NULL, -- breakfast, lunch, dinner, snack
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    UNIQUE (user_id, id)
);

CREATE INDEX idx_mos_meals_user_id ON public.mos_meals(user_id);
CREATE INDEX idx_mos_meals_date ON public.mos_meals(date);

-- 3. Gut Health
CREATE TABLE IF NOT EXISTS public.mos_gut_health (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL,
    comfort_level smallint NOT NULL CHECK (comfort_level >= 1 AND comfort_level <= 5),
    bloating boolean NOT NULL DEFAULT false,
    pre_workout_meal text,
    time_since_meal_minutes integer,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    UNIQUE (user_id, id)
);

CREATE INDEX idx_mos_gut_health_user_id ON public.mos_gut_health(user_id);

-- 4. Muscle Overlap Logs
CREATE TABLE IF NOT EXISTS public.mos_muscle_activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    muscle_group text NOT NULL,
    trained_at timestamp with time zone NOT NULL,
    intensity text NOT NULL, -- high, moderate, light
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    UNIQUE (user_id, id)
);

CREATE INDEX idx_mos_muscle_activity_user_id ON public.mos_muscle_activity(user_id);

-- Enable RLS
ALTER TABLE public.mos_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mos_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mos_gut_health ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mos_muscle_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can manage their own measurements" ON public.mos_measurements
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own meals" ON public.mos_meals
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own gut health logs" ON public.mos_gut_health
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own muscle activity logs" ON public.mos_muscle_activity
    FOR ALL USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_mos_measurements
BEFORE UPDATE ON public.mos_measurements
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_mos_meals
BEFORE UPDATE ON public.mos_meals
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_mos_gut_health
BEFORE UPDATE ON public.mos_gut_health
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_mos_muscle_activity
BEFORE UPDATE ON public.mos_muscle_activity
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


-- === 20260818000000_core_tables.sql ===
-- Migration: Core Tables (Profiles, Orders) with Strict RLS
-- Date: 2026-08-18

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email text UNIQUE NOT NULL,
    full_name text,
    role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own profile
CREATE POLICY "Users can view own profile" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id);

-- Policy: Users can update their own profile (blocking field tampering on 'role')
-- Note: 'role' is omitted from the SET clause in the application, but to be strictly safe,
-- we could create a function, but RLS restricts which rows they can touch. To prevent updating 'role',
-- we can use a trigger.
CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Field tampering detected: Cannot update role';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE protect_profile_role();

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);


-- 2. Orders Table (Migrating from CF KV)
CREATE TABLE IF NOT EXISTS public.orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    product text NOT NULL,
    customer_name text NOT NULL,
    whatsapp_number text,
    email text,
    payment_ref text,
    payment_method text,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on Orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "Users can view own orders" 
    ON public.orders FOR SELECT 
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own orders
CREATE POLICY "Users can insert own orders" 
    ON public.orders FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users CANNOT update or delete orders (immutable by user, only admin/worker can update status)
-- No UPDATE or DELETE policies for regular users.

-- 3. Encryption (Task 5)
-- Note: Supabase provides encryption at rest by default via AWS KMS / libsodium.
-- If specific column encryption is needed later, pgcrypto is available:
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 4. Triggers for updated_at
CREATE TRIGGER set_timestamp_profiles
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();


-- === 20260818000001_storage_security.sql ===
-- Migration: Storage Security and Restrictions (Task 16)
-- Date: 2026-08-18

-- Ensure the storage schema exists
CREATE SCHEMA IF NOT EXISTS storage;

-- 1. Create a secure bucket for user uploads (e.g., profile pictures, intake forms)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user_uploads', 'user_uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 2. Restrict File Uploads (Task 16)
-- Policy: Users can only upload files to their own folder (auth.uid() = folder name)
-- AND restrict file type to images (jpeg, png, webp) or pdfs
-- AND restrict file size to under 5MB.
CREATE POLICY "Users can upload their own secure files" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'user_uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1] AND
  (LOWER(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'pdf')) AND
  (COALESCE(file_size, 0) < 5242880) -- 5 MB
);

-- Policy: Users can read their own files
CREATE POLICY "Users can read their own secure files" 
ON storage.objects FOR SELECT 
USING (
  bucket_id = 'user_uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update their own secure files" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'user_uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete their own secure files" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'user_uploads' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);


-- === 20260819000000_sync_tables.sql ===
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



-- Remove auth.users constraints and change id types to text to support Google Auth 'sub' strings
-- Drop all RLS policies since the Worker uses service_role
DROP POLICY IF EXISTS "Users manage own user_profile" ON public.user_profiles;
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
ALTER TABLE public.user_profiles ALTER COLUMN id TYPE text USING id::text;

DROP POLICY IF EXISTS "Users manage own workout_sessions" ON public.workout_sessions;
ALTER TABLE public.workout_sessions DROP CONSTRAINT IF EXISTS workout_sessions_user_id_fkey;
ALTER TABLE public.workout_sessions ALTER COLUMN user_id TYPE text USING user_id::text;

DROP POLICY IF EXISTS "Users manage own deload_tracker" ON public.deload_tracker;
ALTER TABLE public.deload_tracker DROP CONSTRAINT IF EXISTS deload_tracker_id_fkey;
ALTER TABLE public.deload_tracker ALTER COLUMN id TYPE text USING id::text;

DROP POLICY IF EXISTS "Users view own telegram_link" ON public.telegram_links;
ALTER TABLE public.telegram_links DROP CONSTRAINT IF EXISTS telegram_links_user_id_fkey;
ALTER TABLE public.telegram_links ALTER COLUMN user_id TYPE text USING user_id::text;

-- mos_tracking_tables
DROP POLICY IF EXISTS "Users can manage their own measurements" ON public.mos_measurements;
ALTER TABLE public.mos_measurements DROP CONSTRAINT IF EXISTS mos_measurements_user_id_fkey;
ALTER TABLE public.mos_measurements ALTER COLUMN user_id TYPE text USING user_id::text;

DROP POLICY IF EXISTS "Users can manage their own meals" ON public.mos_meals;
ALTER TABLE public.mos_meals DROP CONSTRAINT IF EXISTS mos_meals_user_id_fkey;
ALTER TABLE public.mos_meals ALTER COLUMN user_id TYPE text USING user_id::text;

DROP POLICY IF EXISTS "Users can manage their own gut health logs" ON public.mos_gut_health;
ALTER TABLE public.mos_gut_health DROP CONSTRAINT IF EXISTS mos_gut_health_user_id_fkey;
ALTER TABLE public.mos_gut_health ALTER COLUMN user_id TYPE text USING user_id::text;

DROP POLICY IF EXISTS "Users can manage their own muscle activity logs" ON public.mos_muscle_activity;
ALTER TABLE public.mos_muscle_activity DROP CONSTRAINT IF EXISTS mos_muscle_activity_user_id_fkey;
ALTER TABLE public.mos_muscle_activity ALTER COLUMN user_id TYPE text USING user_id::text;

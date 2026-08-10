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

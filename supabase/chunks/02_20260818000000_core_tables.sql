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
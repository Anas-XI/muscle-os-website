-- Migration: Security Hardening & Vulnerability Remediation
-- Date: 2026-08-24
-- Purpose:
-- 1. Remove dangerous unparameterized SQL execution RPCs
-- 2. Enforce Row Level Security across all public tables
-- 3. Lock down permissions on functions and sensitive tables

-- 1. Drop dangerous dynamic SQL function if it was created
DROP FUNCTION IF EXISTS public.exec_sql(text);

-- 2. Verify and enforce RLS on all public schema tables
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.supplemental_intakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tracker_logs ENABLE ROW LEVEL SECURITY;

-- 3. Ensure role tampering trigger is active on profiles
CREATE OR REPLACE FUNCTION protect_profile_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND current_setting('request.jwt.claims', true)::jsonb->>'role' != 'service_role' THEN
        RAISE EXCEPTION 'Field tampering detected: Cannot update role';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS check_profile_role ON public.profiles;
CREATE TRIGGER check_profile_role
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE PROCEDURE protect_profile_role();

-- 4. Revoke public execution of administrative functions
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

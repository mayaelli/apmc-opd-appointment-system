-- APMC OPD Staff-Side Schema
-- Run this in the Supabase SQL editor.

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS offices (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text        UNIQUE NOT NULL,
  username      text        UNIQUE NOT NULL,
  password_hash text        NOT NULL,
  slot_capacity integer     NOT NULL DEFAULT 2,
  is_active     boolean     NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS holidays (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  date       date        UNIQUE NOT NULL,
  label      text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add status column to existing appointments table
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE offices  ENABLE ROW LEVEL SECURITY;
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- offices: anyone can read active offices (for booking form)
DROP POLICY IF EXISTS "offices_select_public" ON offices;
CREATE POLICY "offices_select_public"
  ON offices FOR SELECT
  TO anon, authenticated
  USING (true);

-- holidays: anyone can read (for booking form calendar)
DROP POLICY IF EXISTS "holidays_select_public" ON holidays;
CREATE POLICY "holidays_select_public"
  ON holidays FOR SELECT
  TO anon, authenticated
  USING (true);

-- appointments: authenticated (service role) can update status
DROP POLICY IF EXISTS "appointments_update_authenticated" ON appointments;
CREATE POLICY "appointments_update_authenticated"
  ON appointments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Helper RPC Functions
-- ============================================================

-- Verify an office login password
CREATE OR REPLACE FUNCTION verify_office_password(p_username text, p_password text)
RETURNS TABLE(id uuid, name text, is_active boolean)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id, name, is_active
  FROM   offices
  WHERE  username      = p_username
    AND  crypt(p_password, password_hash) = password_hash
    AND  is_active = true;
$$;

-- Create an office with a bcrypt-hashed password
CREATE OR REPLACE FUNCTION create_office_with_password(
  p_name          text,
  p_username      text,
  p_password      text,
  p_slot_capacity integer
) RETURNS offices
LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO offices (name, username, password_hash, slot_capacity)
  VALUES (p_name, p_username, crypt(p_password, gen_salt('bf')), p_slot_capacity)
  RETURNING *;
$$;

-- Hash a plain-text password (used by admin create-office flow)
CREATE OR REPLACE FUNCTION hash_password(p_plain text)
RETURNS text
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT crypt(p_plain, gen_salt('bf'));
$$;

-- Reset an office password
CREATE OR REPLACE FUNCTION reset_office_password(p_office_id uuid, p_new_password text)
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE offices
  SET    password_hash = crypt(p_new_password, gen_salt('bf'))
  WHERE  id = p_office_id;
$$;

-- ============================================================
-- RPC Security: restrict all SECURITY DEFINER RPCs to the
-- service role only.  Supabase grants EXECUTE to PUBLIC by
-- default for SECURITY DEFINER functions, which would allow a
-- browser holding the public anon key to call them directly
-- and brute-force office passwords.
-- ============================================================

-- Revoke from PUBLIC first (covers all roles including anon and authenticated)
REVOKE EXECUTE ON FUNCTION verify_office_password(text, text)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION create_office_with_password(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION hash_password(text)                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION reset_office_password(uuid, text)         FROM PUBLIC, anon, authenticated;

-- ============================================================
-- Seed: Offices
-- ============================================================

INSERT INTO offices (name, username, password_hash, slot_capacity) VALUES
  ('Obstetrics & Gynecology (OB-GYNE)',       'ob-gyne',         crypt('Welcome@123', gen_salt('bf')), 2),
  ('Pediatrics (Pedia)',                       'pediatrics',      crypt('Welcome@123', gen_salt('bf')), 2),
  ('General Surgery',                          'general-surgery', crypt('Welcome@123', gen_salt('bf')), 2),
  ('Orthopedics (Ortho)',                      'orthopedics',     crypt('Welcome@123', gen_salt('bf')), 2),
  ('Family Medicine',                          'family-medicine', crypt('Welcome@123', gen_salt('bf')), 2),
  ('Adult Medicine / Internal Medicine',       'internal-medicine',crypt('Welcome@123', gen_salt('bf')), 2),
  ('Dermatology (Derma)',                      'dermatology',     crypt('Welcome@123', gen_salt('bf')), 2),
  ('Ophthalmology (Optha / Eye Clinic)',       'ophthalmology',   crypt('Welcome@123', gen_salt('bf')), 2),
  ('ENT (Ear, Nose, Throat)',                  'ent',             crypt('Welcome@123', gen_salt('bf')), 2),
  ('PhilHealth Yakap Clinic',                  'philhealth-yakap',crypt('Welcome@123', gen_salt('bf')), 2)
ON CONFLICT (username) DO NOTHING;

-- ============================================================
-- Seed: Philippine National Holidays 2025 + 2026
-- ============================================================

INSERT INTO holidays (date, label) VALUES
  -- 2025
  ('2025-01-01', 'New Year''s Day'),
  ('2025-01-29', 'Chinese New Year'),
  ('2025-02-25', 'EDSA People Power Revolution'),
  ('2025-04-09', 'Araw ng Kagitingan'),
  ('2025-04-17', 'Maundy Thursday'),
  ('2025-04-18', 'Good Friday'),
  ('2025-04-19', 'Black Saturday (Special)'),
  ('2025-05-01', 'Labor Day'),
  ('2025-06-12', 'Independence Day'),
  ('2025-08-21', 'Ninoy Aquino Day'),
  ('2025-08-25', 'National Heroes Day'),
  ('2025-11-01', 'All Saints Day'),
  ('2025-11-02', 'All Souls Day (Special)'),
  ('2025-11-30', 'Bonifacio Day'),
  ('2025-12-08', 'Immaculate Conception'),
  ('2025-12-24', 'Christmas Eve (Special)'),
  ('2025-12-25', 'Christmas Day'),
  ('2025-12-30', 'Rizal Day'),
  ('2025-12-31', 'New Year''s Eve (Special)'),
  -- 2026
  ('2026-01-01', 'New Year''s Day'),
  ('2026-02-17', 'Chinese New Year'),
  ('2026-02-25', 'EDSA People Power Revolution'),
  ('2026-04-02', 'Maundy Thursday'),
  ('2026-04-03', 'Good Friday'),
  ('2026-04-04', 'Black Saturday (Special)'),
  ('2026-04-09', 'Araw ng Kagitingan'),
  ('2026-05-01', 'Labor Day'),
  ('2026-06-12', 'Independence Day'),
  ('2026-08-21', 'Ninoy Aquino Day'),
  ('2026-08-31', 'National Heroes Day'),
  ('2026-11-01', 'All Saints Day'),
  ('2026-11-02', 'All Souls Day (Special)'),
  ('2026-11-30', 'Bonifacio Day'),
  ('2026-12-08', 'Immaculate Conception'),
  ('2026-12-24', 'Christmas Eve (Special)'),
  ('2026-12-25', 'Christmas Day'),
  ('2026-12-30', 'Rizal Day'),
  ('2026-12-31', 'New Year''s Eve (Special)')
ON CONFLICT (date) DO NOTHING;

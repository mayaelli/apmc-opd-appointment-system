-- IMPORTANT: Run this migration once in the Supabase SQL editor before deploying.
-- Migration: add password_plain column and update RPCs to store it

-- 1. Add the column (nullable so existing rows are unaffected)
ALTER TABLE offices ADD COLUMN IF NOT EXISTS password_plain text;

-- 2. Update create_office_with_password to also store plaintext
CREATE OR REPLACE FUNCTION create_office_with_password(
  p_name          text,
  p_username      text,
  p_password      text,
  p_slot_capacity integer
) RETURNS offices
LANGUAGE sql SECURITY DEFINER AS $$
  INSERT INTO offices (name, username, password_hash, password_plain, slot_capacity)
  VALUES (p_name, p_username, crypt(p_password, gen_salt('bf')), p_password, p_slot_capacity)
  RETURNING *;
$$;

-- 3. Update reset_office_password to also store plaintext
CREATE OR REPLACE FUNCTION reset_office_password(p_office_id bigint, p_new_password text)
RETURNS void
LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE offices
  SET    password_hash  = crypt(p_new_password, gen_salt('bf')),
         password_plain = p_new_password
  WHERE  id = p_office_id;
$$;

-- 4. Keep RPC permissions locked down (service role only)
REVOKE EXECUTE ON FUNCTION create_office_with_password(text, text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION reset_office_password(bigint, text) FROM PUBLIC, anon, authenticated;

-- 5. Pre-existing offices are left with password_plain = NULL intentionally.
--    The admin credentials modal shows a "Generate New Password" prompt for NULL rows.
--    Do NOT backfill with a hardcoded value — existing passwords are unknown.

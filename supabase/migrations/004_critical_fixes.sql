-- ============================================
-- GREEN LOFT - CRITICAL DATA FIXES + NEW FEATURES
-- ============================================
-- Run this once. It's written to be safe even if some parts don't apply
-- to your data (uses IF EXISTS / conditional loops throughout).


-- ============================================
-- 1. FIX: public.users.id not matching auth.users.id
-- ============================================
-- This is why the admin account routing/reports/chat all looked broken:
-- when a `public.users` row is created any way other than the normal
-- /auth/register flow (e.g. typed directly into Table Editor), its `id`
-- can end up different from the real Supabase Auth user id. Every role
-- check in the app looks up `public.users` by the AUTH id, so a mismatched
-- row is invisible to those checks — it just silently looks like "no
-- profile", and the app falls back to treating you as a logged-out/plain
-- tenant.
--
-- This loop finds any public.users row whose id doesn't match the
-- auth.users row with the same email, and fixes it. It'll print a NOTICE
-- for each one it fixes so you can see exactly what changed.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT pu.email, pu.id AS old_id, au.id AS new_id
    FROM public.users pu
    JOIN auth.users au ON au.email = pu.email
    WHERE pu.id != au.id
  LOOP
    UPDATE public.users SET id = rec.new_id WHERE id = rec.old_id;
    RAISE NOTICE 'Fixed id mismatch for %: % -> %', rec.email, rec.old_id, rec.new_id;
  END LOOP;
END $$;

-- Prevent this from ever happening again: enforce that public.users.id
-- must reference a real auth.users.id. If this specific statement fails,
-- it means some row still doesn't match any auth.users email — check for
-- typos in that account's email between Supabase Auth and the users table.
DO $$
BEGIN
  ALTER TABLE public.users
    ADD CONSTRAINT users_id_matches_auth FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- 2. FIX: duplicate room rows from re-running the old seed migration
-- ============================================
-- Re-running a DELETE + INSERT seed migration more than once left extra
-- rows behind with drifted ids (Postgres doesn't reuse ids after DELETE).
-- For each room `number`, keep exactly one row: the one an existing
-- booking references if there is one, otherwise the lowest id. Delete the
-- rest. Bookings are never touched.
WITH keep AS (
  SELECT DISTINCT ON (number) id
  FROM rooms
  ORDER BY number, (id IN (SELECT room_id FROM bookings)) DESC, id ASC
)
DELETE FROM rooms WHERE id NOT IN (SELECT id FROM keep);

-- ============================================
-- 3. Deposit lifecycle: pending -> held -> returned
-- ============================================
-- Previously a fresh booking was marked deposit_status = 'held' right
-- away, even before payment was actually confirmed. Correct that to
-- 'pending' (not yet received) until an admin verifies the payment, at
-- which point the app now flips it to 'held'. This corrects any existing
-- test bookings that were marked 'held' while still unpaid.
UPDATE bookings
SET deposit_status = 'pending'
WHERE deposit_required = TRUE
  AND deposit_status = 'held'
  AND payment_status != 'paid';

-- ============================================
-- 4. Let tenants cancel their own still-pending bookings
-- ============================================
-- (There was no DELETE policy on bookings at all before this.)
DROP POLICY IF EXISTS "Users can cancel own pending bookings" ON bookings;
CREATE POLICY "Users can cancel own pending bookings" ON bookings
  FOR DELETE USING (user_id = auth.uid() AND payment_status = 'pending');

-- ============================================
-- 5. Contract-expiry reminder tracking
-- ============================================
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_7_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_3_sent BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_1_sent BOOLEAN NOT NULL DEFAULT FALSE;


-- ============================================
-- Sanity check — run this after and eyeball the results:
-- ============================================
-- SELECT id, number, type, status FROM rooms ORDER BY number;
-- SELECT email, role, id FROM users;
-- SELECT id, room_id, user_id, payment_status, deposit_required, deposit_status FROM bookings ORDER BY created_at DESC;

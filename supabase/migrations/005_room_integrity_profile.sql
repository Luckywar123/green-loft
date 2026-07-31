-- ============================================
-- GREEN LOFT - ROOM INTEGRITY + PROFILE (AVATAR/KTP)
-- ============================================
-- NOTE: deliberately NOT wrapped in BEGIN/COMMIT this time. Run it
-- top to bottom in the SQL Editor. If one statement errors, everything
-- above it has already been saved — just fix the issue and re-run from
-- the failing statement onward instead of starting over from scratch.

-- ============================================
-- STEP 1: Clean up any room with more than one 'paid' booking
-- ============================================
-- Run this by itself first. It keeps the most recent 'paid' booking per
-- room and demotes any older duplicate(s) to 'refunded'. Safe to run
-- more than once — once there's no duplicate left, it does nothing.
WITH ranked AS (
  SELECT id, room_id,
         ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY created_at DESC) AS rn
  FROM bookings
  WHERE payment_status = 'paid'
)
UPDATE bookings
SET payment_status = 'refunded'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Verify it worked — this MUST return zero rows before continuing:
SELECT room_id, COUNT(*)
FROM bookings
WHERE payment_status = 'paid'
GROUP BY room_id
HAVING COUNT(*) > 1;

-- ============================================
-- STEP 2: Track exactly which booking currently occupies a room
-- ============================================
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS current_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

UPDATE rooms r
SET current_booking_id = sub.booking_id
FROM (
  SELECT DISTINCT ON (room_id) room_id, id AS booking_id
  FROM bookings
  WHERE payment_status = 'paid'
  ORDER BY room_id, created_at DESC
) sub
WHERE r.id = sub.room_id AND r.status = 'occupied' AND r.current_booking_id IS NULL;

-- ============================================
-- STEP 3: Prevent this from ever happening again (DB-level safety net)
-- ============================================
-- If STEP 1's verification query above returned any rows, fix those
-- first — this will fail with the exact same "duplicate key" error
-- otherwise, and that's the correct, expected behavior (it's telling you
-- step 1 isn't done yet).
DROP INDEX IF EXISTS one_paid_booking_per_room;
CREATE UNIQUE INDEX one_paid_booking_per_room ON bookings(room_id) WHERE payment_status = 'paid';

-- ============================================
-- STEP 4: Profile fields (avatar + KTP)
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ktp_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ktp_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================
-- STEP 5: Storage buckets — this is what was missing, causing
-- "no bucket found" on upload (it never got created because the earlier
-- version of this file rolled back everything when STEP 3 failed)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
CREATE POLICY "Anyone can view avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

INSERT INTO storage.buckets (id, name, public)
VALUES ('ktp-documents', 'ktp-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Users can upload own ktp" ON storage.objects;
CREATE POLICY "Users can upload own ktp" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ktp-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can view own ktp, admin can view all" ON storage.objects;
CREATE POLICY "Users can view own ktp, admin can view all" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'ktp-documents' AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
    )
  );

-- ============================================
-- Also fix the payment-proofs bucket, in case migration 003 hit the same
-- kind of transaction-rollback problem — this is safe to re-run
-- regardless (ON CONFLICT DO NOTHING / DROP POLICY IF EXISTS throughout).
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can upload payment proofs" ON storage.objects;
CREATE POLICY "Authenticated users can upload payment proofs" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

DROP POLICY IF EXISTS "Anyone can view payment proofs" ON storage.objects;
CREATE POLICY "Anyone can view payment proofs" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-proofs');

-- ============================================
-- Final check — run this and confirm you see avatars, ktp-documents,
-- and payment-proofs all listed:
-- ============================================
SELECT id, public FROM storage.buckets;

-- ============================================
-- GREEN LOFT - ROOM INTEGRITY + PROFILE (AVATAR/KTP)
-- ============================================

BEGIN;

-- ============================================
-- 1. Track exactly which booking currently occupies a room
-- ============================================
-- Previously "who's the current tenant" was guessed by finding the most
-- recent 'paid' booking for a room — which breaks the moment a room has
-- more than one paid booking in its history (e.g. a previous tenant, or
-- the double-booking bug below). This makes it explicit instead of guessed.
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS current_booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;

-- Best-effort backfill: for rooms already marked occupied, point
-- current_booking_id at their most recent paid booking.
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
-- 2. Prevent the same room from ever having two simultaneously-paid
--    bookings at the database level (not just app-side checks)
-- ============================================
-- First, clean up any existing case of this (which is exactly the bug
-- this index prevents going forward): if a room somehow already has more
-- than one 'paid' booking, keep only the most recent as 'paid' and demote
-- the older one(s) to 'refunded', since they're stale/incorrect duplicates.
WITH ranked AS (
  SELECT id, room_id,
         ROW_NUMBER() OVER (PARTITION BY room_id ORDER BY created_at DESC) AS rn
  FROM bookings
  WHERE payment_status = 'paid'
)
UPDATE bookings
SET payment_status = 'refunded'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

DROP INDEX IF EXISTS one_paid_booking_per_room;
CREATE UNIQUE INDEX one_paid_booking_per_room ON bookings(room_id) WHERE payment_status = 'paid';

-- ============================================
-- 3. Profile: avatar + KTP (ID card) upload
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ktp_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ktp_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Avatars: public bucket, fine for profile pictures.
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

-- KTP: PRIVATE bucket — this is a government ID, not public like avatars
-- or payment proofs. Only the owner and admins can read it.
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

COMMIT;

-- Sanity checks to run after:
-- SELECT id, number, status, current_booking_id FROM rooms ORDER BY number;

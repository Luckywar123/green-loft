-- ============================================
-- GREEN LOFT - UPDATE ROOM TIERS
-- Replaces (standard / premium / suite) with two tiers:
--   - premium      : Rp 1.750.000 / bulan, TANPA water heater
--   - presidential : Rp 1.850.000 / bulan, DENGAN water heater
-- ============================================
-- NOTE: This migration reseeds the `rooms` table. It assumes this is
-- run on a dev/staging database. If you have live bookings tied to
-- existing room ids, back them up before running this, since old
-- room_type values ('standard' and 'suite') are removed entirely.

BEGIN;

-- 1. Drop the column that depends on the old enum, then the enum itself
ALTER TABLE rooms DROP COLUMN IF EXISTS type;
DROP TYPE IF EXISTS room_type;

-- 2. Recreate the enum with just the two tiers
CREATE TYPE room_type AS ENUM ('premium', 'presidential');

-- 3. Add the column back
ALTER TABLE rooms ADD COLUMN type room_type NOT NULL DEFAULT 'premium';

-- 4. Reseed rooms with the new tiers / pricing
DELETE FROM rooms;

INSERT INTO rooms (number, type, price_per_month, price_per_year, floor, status, amenities, description) VALUES
  ('Room 01', 'premium',      1750000, 17850000, 1, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium nyaman'),
  ('Room 02', 'premium',      1750000, 17850000, 1, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium dekat parkiran'),
  ('Room 03', 'premium',      1750000, 17850000, 1, 'occupied',         ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium luas'),
  ('Room 04', 'premium',      1750000, 17850000, 2, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium lantai 2'),
  ('Room 05', 'premium',      1750000, 17850000, 2, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium corner'),
  ('Room 06', 'premium',      1750000, 17850000, 1, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium workspace'),
  ('Room 07', 'premium',      1750000, 17850000, 1, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium dekat gym'),
  ('Room 08', 'premium',      1750000, 17850000, 2, 'occupied',         ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium lantai 2'),
  ('Room 09', 'premium',      1750000, 17850000, 2, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium balcony'),
  ('Room 10', 'premium',      1750000, 17850000, 2, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium view kolam'),
  ('Room 11', 'premium',      1750000, 17850000, 2, 'pending_booking',  ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium reserved'),
  ('Room 12', 'presidential', 1850000, 18870000, 2, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Water Heater', 'Kitchen', 'Living Area'], 'Presidential luas dengan water heater'),
  ('Room 13', 'presidential', 1850000, 18870000, 2, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Water Heater', 'Kitchen', 'Living Area'], 'Presidential corner view terbaik'),
  ('Room 14', 'presidential', 1850000, 18870000, 2, 'pending_checkout', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Water Heater', 'Kitchen', 'Living Area'], 'Presidential checkout'),
  ('Room 15', 'presidential', 1850000, 18870000, 2, 'vacant',           ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Water Heater', 'Kitchen', 'Living Area'], 'Presidential extra space');

-- 5. Update config description to reflect the new pricing tiers (value itself
--    is the yearly discount %, unchanged at 15%)
UPDATE configuration
SET description = 'Diskon persentase untuk pembayaran tahunan (Premium Rp1.750.000/bln, Presidential Rp1.850.000/bln)'
WHERE key = 'yearly_discount';

-- 6. Bug fix: the original schema enabled RLS on `bookings` but only ever
--    added SELECT policies, so no logged-in user could actually create a
--    booking. Add the missing INSERT policy so the booking flow works.
DROP POLICY IF EXISTS "Users can create own bookings" ON bookings;
CREATE POLICY "Users can create own bookings" ON bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

COMMIT;


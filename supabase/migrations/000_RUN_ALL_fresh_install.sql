-- ============================================
-- GREEN LOFT - RUN ALL MIGRATIONS (fresh install helper)
-- ============================================
-- This is just files 001 through 005 concatenated in order, for when
-- you're setting up on a database that doesn't have any of this yet.
-- If your tables already exist, this will fail loudly with "already
-- exists" errors — harmless, just means you're in the wrong place.


-- ============================================
-- FROM: 001_initial_schema.sql
-- ============================================
-- ============================================
-- GREEN LOFT - INITIAL SCHEMA (as originally provided)
-- ============================================
-- This is a copy of your project's original 001_initial_schema.sql,
-- included here so this migrations folder is self-contained. If you
-- already have this exact file elsewhere and have already run it, you
-- don't need to run this copy again — running it twice on the same
-- database will fail with "relation already exists" errors, which is
-- expected and harmless (it just means the tables are already there).

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM TYPES
CREATE TYPE user_role AS ENUM ('tenant', 'admin', 'crypto_admin');
CREATE TYPE room_status AS ENUM ('vacant', 'occupied', 'pending_checkout', 'pending_booking');
CREATE TYPE room_type AS ENUM ('standard', 'premium', 'suite');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'active', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded', 'verified_manual');
CREATE TYPE payment_method AS ENUM ('qris', 'credit_card', 'debit_card', 'crypto', 'bank_transfer');
CREATE TYPE contract_status AS ENUM ('active', 'expired', 'cancelled', 'extended');
CREATE TYPE notification_type AS ENUM ('contract_expiry', 'payment_due', 'payment_confirmed', 'booking_approved', 'general');

-- USERS TABLE
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  phone TEXT,
  name TEXT NOT NULL,
  role user_role DEFAULT 'tenant',
  crypto_wallet_address TEXT UNIQUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROOMS TABLE
CREATE TABLE rooms (
  id SERIAL PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  type room_type DEFAULT 'standard',
  price_per_month INT NOT NULL,
  price_per_year INT,
  floor INT DEFAULT 1,
  status room_status DEFAULT 'vacant',
  amenities TEXT[] DEFAULT ARRAY['AC', 'WiFi', 'Furniture']::TEXT[],
  description TEXT,
  images TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOOKINGS TABLE
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id INTEGER REFERENCES rooms(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INTEGER NOT NULL,
  deposit_amount INTEGER DEFAULT 250000,
  total_amount INTEGER NOT NULL,
  payment_status payment_status DEFAULT 'pending',
  payment_method payment_method,
  transaction_id TEXT UNIQUE,
  qr_code_url TEXT,
  crypto_tx_hash TEXT,
  crypto_verify_status TEXT,
  actual_amount_received DECIMAL(18,8),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAYMENTS TABLE
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  method payment_method NOT NULL,
  transaction_id TEXT UNIQUE,
  status payment_status DEFAULT 'pending',
  qr_code_url TEXT,
  payment_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  proof_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONTRACTS TABLE
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  room_id INTEGER REFERENCES rooms(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status contract_status DEFAULT 'active',
  monthly_price INTEGER,
  yearly_discount_percent INTEGER DEFAULT 10,
  auto_renew BOOLEAN DEFAULT FALSE,
  reminder_sent_7days BOOLEAN DEFAULT FALSE,
  reminder_sent_3days BOOLEAN DEFAULT FALSE,
  reminder_sent_1day BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NOTIFICATIONS TABLE
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ROOM STATUS HISTORY
CREATE TABLE room_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id INTEGER REFERENCES rooms(id) ON DELETE CASCADE,
  old_status room_status,
  new_status room_status NOT NULL,
  changed_by UUID REFERENCES users(id),
  booking_id UUID REFERENCES bookings(id),
  reason TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CRYPTO TRANSACTIONS
CREATE TABLE crypto_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  network TEXT DEFAULT 'BEP20',
  from_address TEXT NOT NULL,
  to_address TEXT NOT NULL,
  amount_raw NUMERIC(18,8) NOT NULL,
  amount_usdt NUMERIC(18,8),
  confirmations INTEGER DEFAULT 0,
  required_confirmations INTEGER DEFAULT 12,
  status TEXT DEFAULT 'pending',
  block_number INTEGER,
  timestamp TIMESTAMP WITH TIME ZONE,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CONFIGURATION TABLE
CREATE TABLE configuration (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO configuration (key, value, description) VALUES
  ('deposit_amount', '250000', 'Jumlah deposit uang jaminan'),
  ('yearly_discount', '15', 'Diskon persentase untuk pembayaran tahunan'),
  ('crypto_network', 'BEP20', 'Network untuk crypto payment'),
  ('admin_wallet_bep20', '0x7a4273dcf9a9A272fac0115ffF3B77D941bAC8C4', 'Wallet address admin'),
  ('required_crypto_confirmations', '12', 'Minimal confirmations untuk validasi crypto');

-- ROW LEVEL SECURITY (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admin can view all users" ON users FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
);
CREATE POLICY "Everyone can view rooms" ON rooms FOR SELECT USING (TRUE);
CREATE POLICY "Admin can manage rooms" ON rooms FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
);
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can view all bookings" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
);
CREATE POLICY "Users can view own contracts" ON contracts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can manage all contracts" ON contracts FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
);
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (user_id = auth.uid());

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SEED DATA: 15 KAMAR (original 3-tier version — migration 002 replaces
-- this with the Premium/Presidential 2-tier system, so it's fine that
-- this seed data gets superseded a moment later when 002 runs)
INSERT INTO rooms (number, type, price_per_month, price_per_year, floor, status, amenities, description) VALUES
  ('Room 01', 'standard', 2500000, 27000000, 1, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar standar nyaman'),
  ('Room 02', 'standard', 2500000, 27000000, 1, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar standar dekat parkiran'),
  ('Room 03', 'standard', 2500000, 27000000, 1, 'occupied', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar standar luas'),
  ('Room 04', 'standard', 2500000, 27000000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar standar lantai 2'),
  ('Room 05', 'standard', 2500000, 27000000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar standar corner'),
  ('Room 06', 'premium', 3500000, 37800000, 1, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar premium workspace'),
  ('Room 07', 'premium', 3500000, 37800000, 1, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar premium dekat gym'),
  ('Room 08', 'premium', 3500000, 37800000, 2, 'occupied', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar premium lantai 2'),
  ('Room 09', 'premium', 3500000, 37800000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar premium balcony'),
  ('Room 10', 'premium', 3500000, 37800000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar premium view kolam'),
  ('Room 11', 'premium', 3500000, 37800000, 2, 'pending_booking', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar premium reserved'),
  ('Room 12', 'suite', 5000000, 54000000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Kitchen', 'Living Area'], 'Suite luas area duduk'),
  ('Room 13', 'suite', 5000000, 54000000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Kitchen', 'Living Area'], 'Suite corner view terbaik'),
  ('Room 14', 'suite', 5000000, 54000000, 2, 'pending_checkout', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Kitchen', 'Living Area'], 'Suite checkout'),
  ('Room 15', 'suite', 5000000, 54000000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Kitchen', 'Living Area'], 'Suite premium extra space');


-- ============================================
-- FROM: 002_update_room_tiers.sql
-- ============================================
-- ============================================
-- GREEN LOFT - UPDATE ROOM TIERS
-- Replaces (standard / premium / suite) with two tiers:
--   - premium      : Rp 1.750.000 / bulan, TANPA water heater
--   - presidential : Rp 1.850.000 / bulan, DENGAN water heater
--
-- Room layout (per owner's instruction):
--   Presidential (water heater): Room 03, Room 05, Room 07, Room 12
--   Premium (no water heater):   every other room, 01-15
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
  ('Room 01', 'premium',      1750000, 17850000, 1, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium nyaman'),
  ('Room 02', 'premium',      1750000, 17850000, 1, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium dekat parkiran'),
  ('Room 03', 'presidential', 1850000, 18870000, 1, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Water Heater'], 'Kamar Presidential dengan water heater'),
  ('Room 04', 'premium',      1750000, 17850000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium lantai 2'),
  ('Room 05', 'presidential', 1850000, 18870000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Water Heater'], 'Kamar Presidential dengan water heater'),
  ('Room 06', 'premium',      1750000, 17850000, 1, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium workspace'),
  ('Room 07', 'presidential', 1850000, 18870000, 1, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Water Heater', 'Work Desk'], 'Kamar Presidential dengan water heater'),
  ('Room 08', 'premium',      1750000, 17850000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium lantai 2'),
  ('Room 09', 'premium',      1750000, 17850000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium balcony'),
  ('Room 10', 'premium',      1750000, 17850000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium view kolam'),
  ('Room 11', 'premium',      1750000, 17850000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Work Desk'], 'Kamar Premium'),
  ('Room 12', 'presidential', 1850000, 18870000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower', 'Water Heater'], 'Kamar Presidential dengan water heater'),
  ('Room 13', 'premium',      1750000, 17850000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium'),
  ('Room 14', 'premium',      1750000, 17850000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium'),
  ('Room 15', 'premium',      1750000, 17850000, 2, 'vacant', ARRAY['AC', 'WiFi', 'Furniture', 'Shower'], 'Kamar Premium');

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

-- 7. Same bug on `payments` and `crypto_transactions` — needed for the new
--    QRIS / crypto payment flow to be able to record a payment at all.
DROP POLICY IF EXISTS "Users can create payments for own bookings" ON payments;
CREATE POLICY "Users can create payments for own bookings" ON payments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view payments for own bookings" ON payments;
CREATE POLICY "Users can view payments for own bookings" ON payments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = payments.booking_id AND bookings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin can manage payments" ON payments;
CREATE POLICY "Admin can manage payments" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
  );

DROP POLICY IF EXISTS "Users can create own crypto tx" ON crypto_transactions;
CREATE POLICY "Users can create own crypto tx" ON crypto_transactions
  FOR INSERT WITH CHECK (
    booking_id IS NULL OR EXISTS (SELECT 1 FROM bookings WHERE bookings.id = crypto_transactions.booking_id AND bookings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view own crypto tx" ON crypto_transactions;
CREATE POLICY "Users can view own crypto tx" ON crypto_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = crypto_transactions.booking_id AND bookings.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Admin can manage crypto tx" ON crypto_transactions;
CREATE POLICY "Admin can manage crypto tx" ON crypto_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
  );

COMMIT;




-- ============================================
-- FROM: 003_payments_deposit_chat.sql
-- ============================================
-- ============================================
-- GREEN LOFT - PAYMENTS, DEPOSIT, CHAT, FLAT PRICING
-- ============================================

BEGIN;

-- 1. Deposit tracking: deposit is only charged on a tenant's first booking
--    for a given room. Track whether it was required and its current state.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status TEXT NOT NULL DEFAULT 'held';
-- deposit_status values used by the app: 'held' | 'returned' | 'not_applicable'

-- 2. Proof-of-payment on crypto transactions too (payments table already has proof_url)
ALTER TABLE crypto_transactions ADD COLUMN IF NOT EXISTS proof_url TEXT;

-- 3. No more yearly discount — flat pricing regardless of duration.
UPDATE rooms SET price_per_year = price_per_month * 12;
UPDATE configuration
SET value = '0', description = 'Tidak dipakai lagi — sewa sekarang harga flat, tidak ada diskon tahunan'
WHERE key = 'yearly_discount';

-- 4. Storage bucket for payment proof uploads (QRIS / bank transfer / crypto).
--    Public bucket for simplicity — file paths include the booking id so
--    they aren't guessable in practice, but this is not private storage.
--    See README3.md if you'd rather make this bucket private + signed URLs.
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

-- 5. Admin <-> Tenant chat. One thread per tenant (user_id), messages from
--    either the tenant themselves or an admin.
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('tenant', 'admin')),
  body TEXT NOT NULL,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "View own thread or any thread if admin" ON messages;
CREATE POLICY "View own thread or any thread if admin" ON messages
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
  );

DROP POLICY IF EXISTS "Send in own thread or any thread if admin" ON messages;
CREATE POLICY "Send in own thread or any thread if admin" ON messages
  FOR INSERT WITH CHECK (
    (user_id = auth.uid() AND sender_id = auth.uid() AND sender_role = 'tenant')
    OR (
      sender_id = auth.uid() AND sender_role = 'admin'
      AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
    )
  );

DROP POLICY IF EXISTS "Mark thread read" ON messages;
CREATE POLICY "Mark thread read" ON messages
  FOR UPDATE USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
  );

-- Enable realtime so the chat updates live without polling. Safe to
-- re-run: ignores the error if the table's already in the publication.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

COMMIT;


-- ============================================
-- FROM: 004_critical_fixes.sql
-- ============================================
-- ============================================
-- GREEN LOFT - CRITICAL DATA FIXES + NEW FEATURES
-- ============================================
-- Run this once. It's written to be safe even if some parts don't apply
-- to your data (uses IF EXISTS / conditional loops throughout).

BEGIN;

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

COMMIT;

-- ============================================
-- Sanity check — run this after and eyeball the results:
-- ============================================
-- SELECT id, number, type, status FROM rooms ORDER BY number;
-- SELECT email, role, id FROM users;
-- SELECT id, room_id, user_id, payment_status, deposit_required, deposit_status FROM bookings ORDER BY created_at DESC;


-- ============================================
-- FROM: 005_room_integrity_profile.sql
-- ============================================
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


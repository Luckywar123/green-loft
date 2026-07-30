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

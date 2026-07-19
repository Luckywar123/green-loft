-- ============================================
-- GREEN LOFT - FIXED DATABASE SCHEMA
-- ============================================

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

-- BOOKINGS TABLE (FIXED: duration_months is NOT generated anymore)
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id INTEGER REFERENCES rooms(id) ON DELETE RESTRICT,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_months INTEGER NOT NULL,  -- Changed from GENERATED to regular column
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

-- SEED DATA: 15 KAMAR
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
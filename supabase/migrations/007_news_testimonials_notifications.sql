-- ============================================
-- GREEN LOFT - NEWS, TESTIMONIALS, NOTIFICATIONS
-- ============================================
-- Not wrapped in a transaction — same reasoning as 005/006, every
-- statement commits on its own so a failure partway through doesn't
-- undo everything before it.

-- ============================================
-- 1. Announcements (Berita/Update)
-- ============================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published announcements" ON announcements;
CREATE POLICY "Anyone can view published announcements" ON announcements
  FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS "Admin can manage announcements" ON announcements;
CREATE POLICY "Admin can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
  );

-- ============================================
-- 2. Testimonials
-- ============================================
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT FALSE, -- admin approves before it goes public
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view published testimonials" ON testimonials;
CREATE POLICY "Anyone can view published testimonials" ON testimonials
  FOR SELECT USING (is_published = TRUE);

DROP POLICY IF EXISTS "Tenant can submit own testimonial" ON testimonials;
CREATE POLICY "Tenant can submit own testimonial" ON testimonials
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Tenant can view own testimonial" ON testimonials;
CREATE POLICY "Tenant can view own testimonial" ON testimonials
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin can manage testimonials" ON testimonials;
CREATE POLICY "Admin can manage testimonials" ON testimonials
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
  );

-- ============================================
-- 3. Notifications — table already existed since migration 001, but only
--    ever had a SELECT policy. Admin couldn't create one for a tenant,
--    and tenants couldn't mark their own as read. Adding both now so the
--    announcement-notification bell can actually work.
-- ============================================
DROP POLICY IF EXISTS "Admin can create notifications" ON notifications;
CREATE POLICY "Admin can create notifications" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
  );

DROP POLICY IF EXISTS "Users can mark own notifications read" ON notifications;
CREATE POLICY "Users can mark own notifications read" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Enable realtime so the notification bell updates live.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================
-- 4. Storage bucket for announcement images (public, like the gallery)
-- ============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-images', 'announcement-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Admin can upload announcement images" ON storage.objects;
CREATE POLICY "Admin can upload announcement images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-images'
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
  );

DROP POLICY IF EXISTS "Anyone can view announcement images" ON storage.objects;
CREATE POLICY "Anyone can view announcement images" ON storage.objects
  FOR SELECT USING (bucket_id = 'announcement-images');

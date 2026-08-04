-- ============================================
-- GREEN LOFT - PAYMENT REJECTION + MONTHLY REPORT ARCHIVE
-- ============================================
-- Not wrapped in a transaction (same reasoning as migration 005) — every
-- statement commits on its own.

-- ============================================
-- 1. Let admin record WHY a payment/crypto submission was rejected
-- ============================================
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE crypto_transactions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================
-- 2. Monthly report archive — a record of each month's snapshot, plus
--    (optionally) the Google Sheet it was pushed to
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  month DATE NOT NULL, -- always the 1st of the month, e.g. 2026-08-01
  total_bookings INTEGER NOT NULL DEFAULT 0,
  total_revenue BIGINT NOT NULL DEFAULT 0,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  sheet_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin can manage monthly reports" ON monthly_reports;
CREATE POLICY "Admin can manage monthly reports" ON monthly_reports
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'crypto_admin'))
  );

-- One archive per month, so re-running the monthly job doesn't duplicate.
DROP INDEX IF EXISTS one_report_per_month;
CREATE UNIQUE INDEX one_report_per_month ON monthly_reports(month);

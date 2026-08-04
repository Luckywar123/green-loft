# Green Loft — Update Package #7

## 1. "Laporan kosong" — added proper error surfacing

Comparing your two screenshots: Kelola Kamar showed Room 02 genuinely
occupied by Andre Test, but Laporan showed "Tidak ada booking" at the same
time. The reports page's queries never checked for errors — if a query
failed for any reason, it silently showed an empty table instead of
telling you why. That's fixed now: if the `bookings` query fails, you'll
see a red banner with the **actual database error message** plus a "Coba
lagi" button, instead of a silent, confusing empty state.

Also fixed a real syntax bug while auditing this: `/admin/rooms`'s query
had a stray extra `)` in the embedded select. It didn't seem to be
breaking anything for you in practice, but it was technically malformed —
cleaned up regardless.

**If it's still empty after this update**: open browser DevTools (F12) →
Console tab, reload `/admin/reports`, and you should now see either the
red error banner on the page itself, or a `[admin/reports] ... failed`
line in the console with the exact reason — send me that and I can fix the
specific cause instead of guessing.

The **Deposit column** you mentioned wasn't actually a separate bug — it's
part of the same table, so once real booking rows show up (see above),
deposit status will show right alongside them.

## 2. The `resend` module warnings

That's expected, not a bug — it just means the `resend` npm package isn't
installed yet, which you need for the email notification features to
work. Run:
```bash
npm install resend
```
Same story with a new warning you'll see for `googleapis` (needed for
Google Sheets export, below) — run `npm install googleapis` too when
you're ready to set that up. Both are optional: without them installed,
those specific features just quietly skip sending/exporting instead of
breaking the rest of the app (that's intentional).

## 3. Reject button in the verification queue

Both the QRIS/Bank and Crypto pending queues now have a **"Tolak"** button
next to "Verify & Approve." Clicking it asks for a short reason (e.g.
"bukti transfer tidak valid"), then:
- Marks that specific payment/crypto submission as rejected (stored with
  the reason, visible for your own record-keeping).
- Resets the booking back to `pending` so the tenant can submit a new,
  valid proof through the same payment page — it doesn't dead-end them.
- Emails the tenant the reason, so they know to try again instead of
  wondering why nothing happened.

## 4. Booking count now resets monthly + new Analytics page

The dashboard's "Total Booking" card is now **"Booking Bulan Ini"** —
counts only this calendar month, naturally resetting when the month
changes (no manual reset needed, it's just scoped by date).

New page: **`/admin/analytics`** — a bar chart + table of bookings and
revenue for the last 12 months, plus an archive of saved monthly reports.

## 5. Monthly report archive + Google Sheets export

Click **"Simpan / Export Bulan Ini"** on the Analytics page to snapshot
the current month (bookings + revenue) into a new `monthly_reports` table
— this is your "save otomatis perbulan" record, viewable anytime even
after the live data changes.

**Google Sheets** is genuinely optional and needs your own Google Cloud
setup (I can't create this for you — it needs your credentials):
1. Go to [Google Cloud Console](https://console.cloud.google.com) → create
   a project (or use an existing one) → enable the **Google Sheets API**.
2. Create a **Service Account** → generate a JSON key for it.
3. Open the JSON key: copy the `client_email` and `private_key` values.
4. Create (or open) the Google Sheet you want reports pushed to, and
   **share it** with that `client_email` address (Editor access) — this
   step is easy to miss and is the #1 reason this silently fails.
5. Copy the Sheet's ID from its URL:
   `docs.google.com/spreadsheets/d/`**`THIS_PART`**`/edit`
6. Add to `.env.local`:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEET_ID=the_id_from_step_5
   ```
   (Keep the `\n` characters literal in the .env value — the code converts
   them back to real newlines.)
7. `npm install googleapis`, restart `npm run dev`.

Once set up, "Simpan / Export Bulan Ini" appends a summary row (month,
booking count, revenue, timestamp) to your sheet automatically. Without
it configured, the button still works — it just saves to the database
archive only, and tells you Sheets isn't set up yet.

**For fully automatic monthly saving** (not just clicking the button):
same idea as the contract-reminder cron from before — point an external
scheduler (cron-job.org, Vercel Cron) at
`/api/cron/monthly-report` once a month with header
`Authorization: Bearer <CRON_SECRET>`.

## New migration

```
supabase/migrations/006_reject_and_monthly_reports.sql
```
Adds the rejection-reason columns and the `monthly_reports` table. Not
wrapped in a transaction, same reasoning as migration 005 — run it top to
bottom, each line saves independently.

## A few suggestions, since you asked

Didn't build these (wanted to check with you first), but worth
considering:
- **Audit log** of admin actions (who verified/rejected what, and when) —
  useful if more than one admin account ends up using this.
- **Bulk actions** on the reports table (e.g. select multiple rows to
  export or update at once) once you have enough bookings that one-by-one
  gets tedious.
- **Revenue chart with a target/goal line** on Analytics, if you have a
  monthly revenue target you want to track against.
- Making the KTP storage bucket's signed URLs longer-lived or
  regenerate-on-demand if admins need to review old KTPs after the
  1-hour link expires.

Let me know if any of these are worth building next, or if something
else comes up first.

## Checklist

1. `npm install resend googleapis`
2. Copy everything under `public/` and `src/` into your project.
3. Run `supabase/migrations/006_reject_and_monthly_reports.sql`.
4. Restart `npm run dev`.
5. Reload `/admin/reports` — if still empty, check the new red error
   banner / browser console and send me what it says.
6. (Optional) Set up Google Sheets per section 5 above.

Build verified clean across all 23 routes before sending this.

# Green Loft — Update Package #5

Thanks for sending the CSV exports — that made it possible to actually
find the real bugs instead of guessing. Two data problems were behind
almost everything you reported.

## Root cause A: your admin account's id didn't match its real login id

Checked `users_rows.csv`: `admin@greenloft.com` has `id =
15dfba89-3ea8-43ca-8002-3c97836ccb66` in the `users` table. But your own
screenshot of that account's dashboard showed `ID:
1adf1deb-6bce-4573-8794-c88caaa791b8` — a **different id**. That second one
is the real Supabase Auth id (what `auth.uid()` returns when you're logged
in). Every admin check in the app looks up `users` by that real id — since
the row in `users` has a different id, the lookup finds nothing, and the
app quietly treats you as a plain logged-in user. That's the actual reason
admin routing, reports, room management, and chat all looked "empty/same
as user" — the app was never rejecting you, it just couldn't find your
profile.

This almost always happens when a profile row is typed directly into the
Table Editor instead of created by the normal sign-up flow. **Going
forward, the reliable way to make an admin account**: sign up normally
through `/auth/register` (this makes the ids match automatically), then
just flip that account's `role` to `admin` in Table Editor. Don't
hand-create the `users` row from scratch.

**Fix for your existing account**: migration `004_critical_fixes.sql`
(below) finds and repairs any mismatched id automatically, and adds a
foreign key constraint so this can't silently happen again.

## Root cause B: the deposit bug — abandoned drafts were counting as "already ordered"

Checked `bookings_rows.csv`: the `dasarloe28@gmail.com` account has **4**
booking rows for room 17, all still `payment_status = pending` (never
actually paid). The deposit-check logic was counting *any* booking row —
including ones nobody ever paid for — as proof you'd "ordered before." So
after your first couple of test bookings (even unpaid ones), later booking
attempts stopped charging the deposit, even though nothing had actually
been paid yet.

**Fixed**: the check now only counts bookings with `payment_status =
'paid'`. Deposit is charged until you've actually completed one real paid
booking for that room — not just started one.

Related: your test room is `room_id = 17`, which is outside the 1–15 range
because the old room-seed migration got run more than once (Postgres
doesn't reuse ids after a `DELETE`, so a second run started at 16, not 1).
That's why "sudah pesen kamar masih kosong" also showed odd room numbers —
migration 004 cleans up the leftover duplicate room rows too (safely —
never touches a room a real booking already points to).

## What migration 004 does (run this now)

```
supabase/migrations/004_critical_fixes.sql
```
1. Finds & fixes any `public.users` row whose id doesn't match its real
   Supabase Auth id (prints a NOTICE for each one it fixes).
2. Adds a foreign key so that mismatch can't happen silently again.
3. Removes duplicate room rows left over from re-running the old seed
   migration (keeps whichever copy has real bookings, if any).
4. Corrects existing bookings' `deposit_status` that were marked "held"
   while still unpaid, back to "pending" (see next section).
5. Adds a policy so tenants can cancel their own still-pending bookings.
6. Adds columns for the contract-reminder emails (see below).

At the bottom of the file are three `SELECT` queries — uncomment and run
them after, to eyeball that everything looks right.

## Deposit now has 3 real states, admin controls all of them

- **Belum Diterima** (pending) — booking created, deposit not confirmed
  received yet. This is the starting state now (previously it incorrectly
  started as "held").
- **Ditahan** (held) — admin verified the payment (deposit included),
  now holding it. The app flips pending → held automatically the moment
  you approve a payment.
- **Dikembalikan** (returned) — you manually set this once the tenant
  moves out and you've handed the deposit back.

Full dropdown control is in `/admin/reports` now (was a single button
before).

## Everything new in the admin dashboard

Per your priority list:
- **Laporan** (`/admin/reports`): editable **start AND end date** now (not
  just start), full deposit dropdown, a search box (name/email/room), and
  an **Export CSV** button.
- **Validasi pembayaran** (`/admin/payments`): unchanged from before, now
  also correctly flips deposit pending → held on approve.
- **Chat ke user** (`/admin/messages`): unchanged code-wise — this should
  just work now that the id-mismatch is fixed and you can actually reach
  the page.
- **Ubah status kamar**: `/admin/rooms` now has editable **price** and
  **type** (Premium/Presidential) per room, in addition to the
  vacant/occupied/pending status dropdown from before.
- **Admin Dashboard homepage** (`/admin`): unchanged from last batch —
  overview stats + links to everything, with live badges for pending
  items. Worth re-reading since you may not have reached it before due to
  the id bug.

## Everything new for tenants

- **`/dashboard`** now shows, for an active (paid) booking: a countdown
  badge ("X hari lagi sampai kontrak berakhir" — turns yellow under 30
  days, red under 7 or if already expired) and the current deposit status.
- Tenants can now **cancel** their own still-pending (unpaid) bookings
  right from the dashboard — this also gives you a way to clean up those 4
  stray test bookings without touching SQL.
- Navbar now shows **which account/role is logged in** (email + an ADMIN
  tag if applicable) at all times, so it's never ambiguous which session
  you're in — this was the "session login dan bedain" part.
- Visual polish pass: dashboard and admin pages now use the same
  display font / color language as the homepage instead of plain default
  styling.

## New: contract-expiry reminder emails

Dashboard countdown (above) covers the "how many days left" display. For
actual reminder **emails**, new route:
```
src/app/api/cron/send-reminders/route.ts
```
Checks every paid booking daily and emails the tenant at 7, 3, and 1
day(s) before their contract ends (each threshold only fires once, tracked
by new columns on `bookings`).

**This needs two things you don't have yet to actually fire:**
1. `SUPABASE_SERVICE_ROLE_KEY` in `.env.local` — get it from Supabase
   Dashboard → Settings → API (the "service_role" key, not "anon"). This
   route reads across all tenants, which needs to bypass RLS.
2. Something to trigger it **once a day** — Next.js has no built-in
   scheduler. Cheapest options: [cron-job.org](https://cron-job.org) (free,
   just hits your URL daily) or Vercel Cron if you deploy there. Point it at
   `https://yourdomain.com/api/cron/send-reminders` with header
   `Authorization: Bearer <CRON_SECRET>` (set `CRON_SECRET` in
   `.env.local` too, any random string, so randoms can't trigger it).

Without those two things set up, this route just sits there unused — it
won't break anything, it just won't fire.

## Checklist

1. Copy everything under `public/` and `src/` into your project.
2. Run `supabase/migrations/004_critical_fixes.sql` in the SQL Editor —
   read the NOTICE messages it prints.
3. Run the 3 sanity-check `SELECT`s at the bottom of that file.
4. Restart `npm run dev`, log out, log back in as admin — should land on
   `/admin` and everything under it should now actually work.
5. (Optional) set up `SUPABASE_SERVICE_ROLE_KEY` + `CRON_SECRET` +
   an external daily trigger if you want the reminder emails live.

Build verified clean across all 18 routes before sending this.

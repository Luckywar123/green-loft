# Green Loft — Update Package #4

Two separate root causes were tangled together, both fixed now:

## Root cause #1: migration 003 was never actually run

The `deposit_required` error means exactly that — that column (and
`deposit_status`, the `messages` table, the `payment-proofs` bucket) simply
doesn't exist in your database yet. Nothing in the code is broken; the SQL
file just hasn't been executed against your Supabase project.

**Do this now, in the Supabase SQL Editor**, and watch for a green success
message (not a red error) before moving on:

1. Open your Supabase project → **SQL Editor** → **New query**.
2. **First, check what you actually have** — paste and run this:
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings';
   ```
   If `deposit_required` is NOT in that list, migration 003 hasn't run.
3. Open `supabase/migrations/003_payments_deposit_chat.sql` from the zip,
   copy the **entire file**, paste it into a new SQL Editor query, and hit
   **Run**. Confirm it says success.
4. Re-run the check query from step 2 — `deposit_required` should now
   appear.

If you're not sure whether 001/002 ran either, run the same kind of check:
```sql
SELECT type, price_per_month FROM rooms LIMIT 3;
```
If this errors or returns nothing, go back and run `001_initial_schema.sql`
then `002_update_room_tiers.sql` first, in that order, before 003.

## Root cause #2: login never checked admin role — that's why "admin dashboard" looked like the tenant one

This was a real bug in the code, not a setup issue. `src/app/auth/login/page.tsx`
always sent every account to `/dashboard` (the tenant view), no matter their
role. So `admin@greenloft.com` logging in landed on the plain tenant
Dashboard — which is exactly what your screenshot showed. It wasn't
"missing admin features," it was just never routing you to the admin
pages at all.

**Fixed**: login now checks `users.role` after signing in and sends
`admin`/`crypto_admin` accounts to `/admin`, everyone else to `/dashboard`
(unless there's an explicit `redirect=` param already in the URL, e.g. from
the booking flow, which still takes priority).

## What's actually at `/admin` now

Previously `/admin/page.tsx` was — I'll be straight with you — a leftover
duplicate of the public room-browsing page from early scaffolding, not an
actual admin dashboard. That's the other reason it looked "the same as
user." It's now a real, role-gated **Admin Dashboard**:

- Quick stats: total rooms, vacant, occupied, total bookings.
- Cards linking to everything else, with live badges showing how many
  things need attention (pending payments/crypto, unread messages):
  - **Kelola Kamar** (`/admin/rooms` — new): every room in a table, current
    tenant if occupied, and a dropdown to manually set
    vacant/occupied/pending — this is the "acc kamar mana yang udah isi"
    control you asked for, independent of the booking/payment flow.
  - **Laporan Transaksi** (`/admin/reports`): the full table from last
    batch — status changes, deposit return tracking, proof links, editable
    move-in date.
  - **Antrean Verifikasi** (`/admin/payments`): quick pending-only approval
    queue.
  - **Pesan Tenant** (`/admin/messages`): chat threads.

There's also now an **"Admin Panel"** link in the navbar itself (only
visible to admin accounts) so you don't have to type the URL by hand.

## Deposit: charged upfront, admin marks it returned when a tenant moves out

To confirm this matches what you described: deposit is charged as part of
the **first** booking's total (already built last round), held (`deposit_status
= 'held'`), and admin flips it to **"Dikembalikan"** (returned) from
`/admin/reports` whenever the tenant actually moves out and you've given
the deposit back. This doesn't move any real money automatically — it's a
tracking flag so you know at a glance which deposits are still owed back.

## Checklist to actually see all of this working

1. Copy every file under `public/` and `src/` from this zip into your
   project (overwrite).
2. Run the three migrations in order in Supabase SQL Editor: `001`, `002`,
   `003` — confirming each succeeds (see verification queries above).
3. In Supabase **Table Editor → users**, find your account and make sure
   `role` is set to `admin` (or `crypto_admin`).
4. Restart `npm run dev`.
5. Log out and log back in with that admin account — you should land on
   `/admin` automatically now, with the dashboard described above.
6. Try a fresh booking end to end as a *different* (tenant) account —
   book → pay (any method, with proof upload) → check `/admin/payments` or
   `/admin/reports` → verify → confirm the room flips to occupied in
   `/admin/rooms` and the booking shows PAID on the tenant's `/dashboard`.

I ran `npm run build` again after all of this — clean across all 17 routes.

# Green Loft — Update Package #3

## 0. The crash you hit ("amount_raw... violates not-null constraint")

Fixed. The crypto payment insert was missing `amount_raw`, which your DB
schema requires. `src/app/payment/[bookingId]/page.tsx` now sends it — same
value as `amount_usdt` since we're only dealing in USDT here.

## 1. New setup steps for this batch

```bash
npm install resend
```

Then run the new migration in the Supabase SQL Editor:
```
supabase/migrations/003_payments_deposit_chat.sql
```
This adds deposit tracking columns, a `messages` table for chat, a
`payment-proofs` storage bucket + policies, and flattens yearly pricing.

New env vars (optional — the app works without them, see section 6):
```
RESEND_API_KEY=...
ADMIN_NOTIFY_EMAIL=your-email@example.com
```

**Edit your real bank details** in
`src/app/payment/[bookingId]/page.tsx` — search for `BANK_ACCOUNT` near the
top of the file and replace the placeholder bank name / account number /
account holder with your real ones.

## 2. Bank Transfer payment option

Added as a third tab next to QRIS and Crypto on the payment page. Same
manual-verification pattern: tenant sees your account details, uploads a
proof screenshot, submits — shows up in the admin queue/report like the
others (`payments.method = 'bank_transfer'`).

## 3. Proof-of-payment upload, all 3 methods

QRIS, Bank Transfer, and Crypto all now require an image upload before the
"submit" button works. Files go to a Supabase Storage bucket called
`payment-proofs` (created by the new migration), and the resulting URL is
saved to `payments.proof_url` (QRIS/bank) or `crypto_transactions.proof_url`
(crypto). Admin can open the file straight from the reports/queue pages.

⚠️ **Privacy note**: I made this bucket public for simplicity — anyone with
the exact file URL can view it (URLs aren't guessable, but they also aren't
access-controlled). If these often contain sensitive info (full account
numbers, etc.), consider switching to a private bucket + signed URLs later;
happy to do that swap if you want it.

## 4. Live chat with admin (separate from the FAQ bot)

The floating chat widget (bottom-right) now has two tabs:
- **FAQ** — the same rule-based bot as before.
- **Chat Admin** — real one-on-one chat with the admin, only usable when
  logged in. Messages live in a new `messages` table and update in real
  time via Supabase Realtime (no page refresh needed on either side).

**Admin side**: new page `src/app/admin/messages/page.tsx` — lists every
tenant who's messaged, click one to see the thread and reply.

## 5. Admin Reports page (`src/app/admin/reports/page.tsx`)

A full table of every booking: tenant, room, **editable move-in date**,
total, payment method, **link to proof of payment**, a **status dropdown**
(pending/paid/failed/refunded/verified_manual), and deposit status with a
"Tandai Dikembalikan" (mark deposit returned) button.

Changing the status dropdown to **paid** automatically sets that room's
status to `occupied` — so filled rooms disappear from the public booking
list. Setting it to `failed`/`refunded` frees the room back to `vacant`.
(This is best-effort — if a room somehow has two overlapping bookings,
double check manually; the sync doesn't try to resolve conflicts.)

The existing `/admin/payments` page still works as a focused "pending
only" queue for quick approvals — I updated it to also flip the room to
`occupied` on verify (it didn't do that before) and show the proof link.
Both pages link to each other now.

## 6. Email notification on every payment submission

New route: `src/app/api/notify/payment-submitted/route.ts`, called
automatically right after a tenant submits QRIS/bank/crypto payment. Sends
you an email like "Pembayaran Baru - Room 5 - Mohon Dicek" with the amount
and method.

**Without `RESEND_API_KEY`/`ADMIN_NOTIFY_EMAIL` set, it just logs to the
server console instead of sending** — so nothing breaks if you haven't set
up email yet. To actually get emails:
1. Sign up at [resend.com](https://resend.com) (free tier is fine to start).
2. Get an API key, put it in `.env.local` as `RESEND_API_KEY`.
3. Set `ADMIN_NOTIFY_EMAIL` to where you want notifications sent.
4. For real production sending you'll eventually want to verify your own
   domain in Resend and set `RESEND_FROM_EMAIL` — until then it sends from
   Resend's shared test address, which is fine for getting started.

## 7. QRIS +0.7% fee, crypto fee-free

QRIS tab now shows the 0.7% fee added on top of the booking total, and
that's the number actually recorded/asked for. Crypto tab shows a
"Gratis Biaya Admin" badge. Bank transfer has no added fee.

## 8. Deposit: first booking only

`bookings` now has `deposit_required` and `deposit_status` columns. On the
booking page, before showing the price, we check whether you (the logged-in
tenant) already have any prior booking for that exact room — if yes, it's
treated as a renewal and the Rp250.000 deposit line disappears from the
total. First-timers still see and pay it.

Admin can mark a deposit "Dikembalikan" (returned) from the Reports page —
this doesn't refund anything automatically, it's just a status flag so you
can track which deposits are still being held vs. already given back.

## 9. Flat pricing — no more 15% yearly discount

Removed everywhere: the booking page, the price calculation, the dropdown
label, and the old stray duplicate `admin/bookings` page (see below).
Total is now always `price_per_month × months`, no matter the duration.

## 10. Cleanup: `admin/bookings` was a dead duplicate

That route was a leftover copy of the real booking flow, and it would've
silently gone out of sync with the real one (still had the old discount
logic, no deposit handling, no payment page redirect, etc.) I turned it
into a redirect to the real `/booking` page instead of maintaining two
copies. If nothing in your app links to `/admin/bookings`, you can delete
this file entirely.

## 11. Honesty checks on scope

- **Wallet "connect"** on the crypto tab is still the same manual prompt-for-
  address pattern as before, not a real MetaMask/WalletConnect integration
  (that needs a library like `wagmi` plus a project ID, not currently in
  your `package.json`). Say the word if you want that wired in for real.
- The **FAQ bot is still keyword-matching, not an AI model.** A real AI bot
  needs an LLM API key and ongoing usage cost — I didn't add that without
  you asking for it directly, since that's a billing decision that's yours
  to make.
- **Payment/crypto verification is still manual by design** (per your
  earlier instruction) — the email notification is there so you find out
  quickly, but a human still clicks "Verify."

## Applying this

1. `npm install resend`
2. Copy everything under `public/` and `src/` here into your project.
3. Run `supabase/migrations/003_payments_deposit_chat.sql` in the Supabase
   SQL Editor.
4. Edit `BANK_ACCOUNT` in the payment page with your real bank details.
5. (Optional) Set `RESEND_API_KEY` / `ADMIN_NOTIFY_EMAIL` for email alerts.
6. `npm run build` to confirm — verified clean on my end (Turbopack,
   TypeScript, all 16 routes) before sending this to you.

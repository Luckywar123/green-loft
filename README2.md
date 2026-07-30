# Green Loft — Update Package #2

Second batch of changes on top of the first update package: correct room
layout, a working payment flow (QRIS static + crypto USDT/BNB, both
manually verified), a FAQ chatbot, and — importantly — the steps to actually
get your local dev server talking to Supabase, since that's why rooms were
empty and login was failing.

## 0. Fix your "Failed to fetch" login error first

That error means the browser couldn't reach Supabase at all — it's not a
bug in the booking code, it's a connection problem. Check these in order:

1. **Open `.env.local` in your project root.** If `NEXT_PUBLIC_SUPABASE_URL`
   or `NEXT_PUBLIC_SUPABASE_ANON_KEY` are still placeholder text (like
   `PASTE_YOUR_...`) or pointing at a project that doesn't exist, every
   Supabase call — including login — will fail with exactly this error.
2. Get the real values from **Supabase Dashboard → your project → Settings
   → API**: copy "Project URL" into `NEXT_PUBLIC_SUPABASE_URL`, and the
   `anon` `public` key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. **Restart `npm run dev`** after editing `.env.local` — Next.js only
   reads env vars at server start, it won't pick up changes on hot reload.
4. If your Supabase project has been inactive for a while, free-tier
   projects **auto-pause**. Open the dashboard — if it says paused, click
   resume and wait a minute before trying again.
5. Open DevTools → Network tab, try logging in again, and look at the
   failed request's URL. If it's calling `https://undefined/...` or
   `https://your-project.supabase.co` (literally unreplaced), that
   confirms it's the env var issue above.
6. Less likely, but worth a check: a browser extension (ad blocker /
   privacy extension) can block Supabase's `*.supabase.co` calls. Try in
   an incognito window with extensions off.

## 1. Full run steps (once `.env.local` is correct)

```bash
npm install
npm run dev
```

Then, **in the Supabase SQL Editor** (Dashboard → SQL Editor → New query),
run, in order:
1. `supabase/migrations/001_initial_schema.sql` (if you haven't already)
2. `supabase/migrations/002_update_room_tiers.sql` (updated in this batch —
   see below)

This is why your rooms page showed "Tidak ada kamar untuk filter ini" —
the `rooms` table was empty because migration 002 was never actually run
against your database. Running it seeds all 15 rooms as `vacant`.

## 2. Corrected room layout

Per your instructions, I fixed the tier assignment in
`supabase/migrations/002_update_room_tiers.sql`:

- **Presidential (water heater): Room 03, 05, 07, 12** — Rp 1.850.000/bln
- **Premium (no water heater): every other room, 01–15** — Rp 1.750.000/bln

The migration now does a clean `DELETE` + reseed of all 15 rooms with this
exact mapping, all set to `vacant`. Re-run it (safe to run again — it's
idempotent) and the rooms/booking pages will populate immediately.

## 3. Payment flow: QRIS (static) + Crypto (USDT/BNB)

**New page:** `src/app/payment/[bookingId]/page.tsx`. After a booking is
created, `src/app/booking/page.tsx` now redirects here instead of straight
to the dashboard.

- **QRIS tab** shows your static QR code image (`public/images/payment/qris-static.png`,
  from the file you sent) with the exact amount to transfer. A "Saya Sudah
  Transfer" button records a `payments` row with `status: 'pending'`.
- **Crypto tab** requires connecting/entering a wallet address first (this
  is a manual "type your address" step for now — see note below on real
  wallet connect), then shows the USDT/BNB (BEP20) admin address and asks
  for the TX hash, which is recorded in `crypto_transactions`.
- Both show a "menunggu verifikasi admin" screen after submitting.
- **`src/app/dashboard/page.tsx`**: pending bookings now show a "Lanjut
  Bayar" button linking back to that booking's payment page, so a tenant
  who didn't finish paying can come back to it.
- **`src/app/admin/payments/page.tsx`** (rewritten): now lists *both*
  pending QRIS payments and pending crypto transactions, side by side, each
  with a "Verify & Approve" button. Verifying updates that payment/tx row
  **and** flips `bookings.payment_status` to `paid` in one action — this
  closes the loop that was broken before (the old admin page tried to join
  a `users` relation that didn't actually exist on the `payments` table, so
  it would have errored at runtime).

### Can this be automatic? (your question)

Short answer: **not with a static QR code — that's a hard limit, not a
missing feature.** A static QRIS/bank QR just encodes your account details;
scanning it doesn't create any record your app can check. There's no event
to listen for.

Two real options if you want automatic confirmation later:
1. **Keep it manual** (what's implemented now) — admin checks their
   bank/QRIS app and clicks "Verify & Approve." Simple, free, no extra
   integration, small delay.
2. **Switch to a payment gateway's *dynamic* QRIS** (Midtrans, Xendit,
   etc.) — each order gets its own generated QR tied to an order ID, and
   the gateway calls your `/api/midtrans/webhook` route automatically when
   it's paid. Your project actually already has the Midtrans plumbing for
   this (`src/lib/midtrans.ts`, `src/app/api/midtrans/...`) — the webhook
   route just needs real signature verification and a status-update query
   added, and you'd need real (non-sandbox) Midtrans merchant keys. Happy
   to wire that up if/when you're ready to sign up with a gateway.

Crypto is the same story — real automatic verification means a background
job polling BSC for confirmations on your admin wallet, matching amounts to
pending transactions. You said manual is fine for crypto for now, so I kept
it manual/admin-verified, matching option 1 above.

**Note on "wallet login":** I didn't wire up a real MetaMask/WalletConnect
button — `connectWallet()` in the payment page just prompts for an address,
matching the mock pattern already in your `src/lib/crypto.ts`. A real
wallet connect needs a library like `wagmi` or `@web3modal/wagmi` (not in
your `package.json` yet) and a public RPC/project ID. Let me know if you
want that wired in for real.

## 4. FAQ chatbot (`src/components/ChatBot.tsx`)

A floating chat button (bottom-right, on every page) that answers common
questions — pricing, Premium vs Presidential, facilities, how to book, how
to pay — by matching keywords against a small FAQ list in the file. No API
key, no cost, works immediately.

This is **not** an AI model — it's simple keyword matching, so it'll only
answer what's in the `FAQ` array at the top of the file. To add more
answers, add more `{ keywords: [...], answer: '...' }` entries.

If you want a real AI-powered bot later (understands anything, not just
keyword matches), that needs an LLM API key (e.g. Anthropic's Claude) and a
small server route to call it — that's a bigger change involving billing on
your end, so I didn't wire it up without you asking for it directly, but
it's a straightforward next step if you want it.

## 5. RLS policy fixes (also in `002_update_room_tiers.sql`)

Same bug pattern as the missing `bookings` INSERT policy from before: your
`payments` and `crypto_transactions` tables had RLS enabled but no INSERT/
SELECT policies for regular users, and no admin `UPDATE` path that actually
worked end-to-end. Added:
- Users can insert/view payments and crypto tx **for their own bookings only**.
- Admins (`admin` / `crypto_admin` role) can manage all of both.

## Applying this batch

1. Copy everything under `public/` and `src/` here into your project
   (same paths, overwrite).
2. Re-run `supabase/migrations/002_update_room_tiers.sql` in the Supabase
   SQL Editor (safe to re-run).
3. Fix `.env.local` per section 0 if you haven't already, restart
   `npm run dev`.
4. To become an admin (so `/admin/payments` works for you): in Supabase
   Table Editor, open `users`, find your row, set `role` to `admin`.

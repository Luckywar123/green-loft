# Green Loft — Update Package #6

## 1. Navbar/session redesign

What looked like "jadi admin session" was the old cramped inline chip
(email + ADMIN tag jammed next to the nav links) — confusing, not an
actual bug in who was logged in as what. Replaced with a proper account
dropdown: avatar circle (shows your uploaded photo once you set one, else
your initial), ADMIN tag only for actual admins, click it open for
Profil / Dashboard / (Admin Panel if applicable) / Logout. Same on mobile.

Also fixed a real bug while I was in there: after logging in, the navbar
updated *who* you were but never re-fetched your role/avatar until a full
page refresh — so the ADMIN tag could lag behind reality for a moment.
Fixed to refresh your profile immediately on every auth state change, so
it's accurate on every page, every time (the "session ada di semua page"
part).

## 2. Fixed: booking an already-occupied room, and the tenant display flipping

Two bugs, one root cause — nothing was checking room status before letting
someone book.

- **`/booking?room=X`** now checks the room's status before showing the
  form at all. If it's not `vacant`, you get a clear "sudah tidak
  tersedia" screen instead of a booking form. There's also a re-check
  right before the final submit (in case someone else books it in the few
  seconds between you loading the page and confirming).
- **`/rooms`** now shows a disabled "Sudah Terisi" button instead of a
  working booking link for anything that isn't vacant.
- **The "tenant data changes" bug**: previously "who's the current tenant"
  was *guessed* by finding the most recent paid booking for that room —
  which breaks the instant a room has more than one paid booking in its
  history (exactly what double-booking would cause). Added a
  `rooms.current_booking_id` column that's set explicitly the moment a
  booking is confirmed paid, and cleared explicitly on checkout. No more
  guessing — `/admin/rooms` now shows the *actual* linked tenant, with a
  proper **"Checkout"** button to clear it when someone moves out.
- **Belt-and-suspenders**: added a database-level constraint (a unique
  index) so the same room can never have two `paid` bookings
  simultaneously, even if some future bug tried to allow it again.

All of this is in `supabase/migrations/005_room_integrity_profile.sql` —
**run this one, it's required** for the above to work (and for profile/KTP
below).

## 3. Background music

Added your track as a small floating player, bottom-left, on every page.

Real unmuted autoplay is blocked by literally every modern browser until
you've interacted with the page at least once — there's no code trick that
bypasses that, it's a hard browser policy. What's implemented: the track
starts muted immediately (browsers do allow muted autoplay), then
un-mutes itself the instant you click or press any key anywhere on the
site, so it feels like "it just started" without violating the policy. The
🎵/🔊 button also lets anyone pause/resume manually anytime.

**One honest heads-up**: your original file was ~86MB / ~60 minutes long.
I compressed it to 96kbps (still stereo, still the full hour) which
brought it down to ~43MB — better, but that's still a big file to ship in
a website's public folder. It'll stream fine (the browser only pulls
chunks as it plays, not the whole thing upfront), but it'll bloat your git
repo over time. If you want, trimming it to a 3–5 minute loop would cut
that to a few MB with zero perceptible difference for background ambience
— let me know if you want that done.

## 4. Crypto payment — real wallet send, no manual TX hash

Rebuilt per your request. The old flow made someone type in a wallet
address and manually paste a TX hash after sending elsewhere. Now:

1. "Connect Wallet" pops up MetaMask/Trust Wallet for real (via the
   browser's injected wallet — `window.ethereum`).
2. Clicking "Kirim X USDT" builds and sends an actual BEP20 USDT transfer
   straight to your treasury wallet address, switching their wallet to BSC
   network automatically if needed.
3. The transaction hash comes back **directly from the wallet's own
   response** — nothing to copy-paste. It's saved to `crypto_transactions`
   automatically the moment the transaction is confirmed on-chain.
4. Success notification shown immediately, admin gets an email, and the
   tenant gets a confirmation email once admin verifies.

This uses `ethers` (already in your `package.json`, no new install
needed) talking to whatever wallet extension the visitor has installed —
it only works if they actually have MetaMask/Trust Wallet/etc. in their
browser. No wallet extension = clear error message, not a silent failure.

## 5. Profile page + KTP upload + admin verification

New page: `/profile` (linked from the navbar dropdown). Lets any logged-in
tenant:
- Upload/change a profile picture.
- Edit name & phone.
- Upload their **KTP** — stored in a **private** bucket (not public like
  the payment-proof bucket — this is a government ID). Only that tenant
  and admins can view it.

**Admin side**: `/admin/reports` now has a **KTP column** — "Lihat KTP"
opens it (via a temporary signed link, since the bucket's private), plus a
toggle to mark it "Terverifikasi" once you've actually checked it matches
who's staying. This is the "mastiin siapa yang nginep" piece.

## 6. Registration → "check your email" popup

Register now shows a proper modal ("Registrasi Berhasil! Silakan cek
email...") instead of a jarring browser `alert()`, then sends them to
login with a matching banner there too if they land on it directly.

## 7. Email notifications, both directions

Already had admin-gets-notified-on-submission. Added the other half:
tenant gets a confirmation email the moment admin marks their payment
verified/paid (`/api/notify/payment-confirmed`) — covers "setiap ada
transaksi... langsung masuk email." Same graceful behavior as before: if
`RESEND_API_KEY` isn't set, it just skips sending instead of breaking
anything.

## 8. Gallery photo captions

Added hover captions on the homepage gallery (Kolam Renang, Gym & Fitness,
etc.) — a small thing, but it makes the existing photos read like a
curated gallery instead of raw phone snapshots. If specific photos still
feel off to you, happy to swap in whichever ones you'd rather feature —
just wasn't sure which ones you meant by "cringe" since none were flagged
individually.

## Checklist

1. Copy everything under `public/` and `src/` into your project.
2. Run `supabase/migrations/005_room_integrity_profile.sql` in the SQL
   Editor — this one's required for the room-tracking fix, profile
   avatars, and KTP uploads to work at all.
3. Restart `npm run dev`.
4. Test the crypto flow with an actual wallet extension installed (it'll
   just show a clear error without one — that's expected, not a bug).
5. Try uploading a profile picture + KTP at `/profile`, then check
   `/admin/reports` to confirm the KTP shows up there for admin to review.

Build verified clean across all 20 routes before sending this.

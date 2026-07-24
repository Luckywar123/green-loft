# Green Loft — Update Package

Drop these files into your existing project (same paths), then run the SQL
migration on your Supabase project. Everything here was test-built against
your current `package.json` (Next.js 16, Tailwind 4) — it compiles and
prerenders cleanly.

## What changed

**1. Fancier homepage (`src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`)**
- Full-bleed photo hero (your pool-at-dusk photo) with the Green Loft logo,
  a serif display font (Fraunces) paired with your existing Inter, and a
  gold/forest-green luxury accent palette.
- A real photo gallery section using your uploaded photos (pool day/night,
  gym, room interior, common area, balcony).
- A two-card Premium vs. Presidential comparison section with pricing.
- A signature "leaf" divider between sections, echoing the logo's leaf mark.
- Navbar now shows the logo image too.

**2. Two room tiers instead of three (`supabase/migrations/002_update_room_tiers.sql`)**
- `room_type` enum is now just `premium` / `presidential`.
- Premium: **Rp 1.750.000/bulan**, no water heater.
- Presidential: **Rp 1.850.000/bulan**, includes water heater (via the
  `amenities` array — there's no separate boolean column, "Water Heater" is
  just an amenity tag on presidential rooms).
- Reseeds all 15 rooms (11 premium, 4 presidential) with the new pricing.
- **Assumption**: I read "1750 / 1850" as Rp 1.750.000 / Rp 1.850.000 per
  month (standard Indonesian shorthand). Adjust the migration if you meant
  something else.
- ⚠️ This migration deletes and reseeds the `rooms` table — fine for
  dev/staging, but back up first if you have real data tied to room ids.

**3. Booking without login (`src/app/booking/page.tsx`)**
- Anyone can now open `/booking?room=X`, pick a start date and duration, and
  see the price breakdown — no login required.
- Login is only requested at the final "Lanjut ke Payment" step. If someone
  isn't logged in yet, their in-progress selection is saved and they're sent
  to `/auth/login?redirect=/booking?room=X`; after logging in they're
  dropped right back with their date/duration already restored.
- `src/app/rooms/page.tsx` and `src/app/admin/page.tsx` were updated to
  filter by `premium`/`presidential` instead of the old three-tier system,
  and now show your real room photos instead of placeholder boxes. The
  homepage's tier cards link to `/rooms?type=premium` / `?type=presidential`.

**4. Three pre-existing bugs I fixed along the way (found while test-building)**
- `bookings` table had Row Level Security enabled but no `INSERT` policy —
  nobody could actually create a booking. Added the missing policy in the
  migration.
- `src/app/auth/login/page.tsx` and `src/app/admin/bookings/page.tsx` both
  called `useSearchParams()` without a Suspense boundary, which makes
  `next build` fail outright on this Next.js version. Wrapped both in
  `<Suspense>`.
- `midtrans-client` has no type declarations, which fails `next build`'s
  type-check step. Added `src/types/midtrans-client.d.ts` to fix it.
- Note: `src/app/admin/bookings/page.tsx` looks like a stray duplicate of the
  customer booking flow living under `/admin/bookings` — I patched it so the
  build doesn't break, but you may want to remove or repurpose it.

## Applying this

1. Copy `public/images/**` and every file under `src/**` into your project
   at the matching paths (overwriting the old versions).
2. Run `supabase/migrations/002_update_room_tiers.sql` against your database
   (via the Supabase SQL editor or CLI).
3. `npm run build` to confirm everything's green — should match what I ran
   here (only difference: this sandbox couldn't reach fonts.googleapis.com,
   so the font-loading lines were stubbed out just for that one test run;
   your real environment will fetch Fraunces/Inter normally).

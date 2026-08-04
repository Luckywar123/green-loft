# Green Loft — Update Package #8

## 1. Fixed: "Kamar" and "Booking" showing the same page

`Booking` in the navbar now goes somewhere actually useful based on your
situation instead of always dumping you on `/rooms` (which just duplicated
"Kamar"):
- Belum ada booking → `/rooms` (pick a room, same as before)
- Ada booking belum dibayar → langsung ke halaman payment-nya
- Ada booking aktif (paid) → `/dashboard`

## 2. Berita/Update (News) — your idea, built out fully

- **Admin**: `/admin/announcements` — write a title + body, optional
  image, publish. Checkbox "Kirim notifikasi ke semua tenant" — when
  checked, every tenant gets a notification the moment you publish.
- **Public**: `/news` — full list, newest first. Homepage shows the
  latest 3 with a "Lihat Semua" link.
- **Nav**: added a "Berita" link (genuinely distinct content this time,
  not another duplicate).

## 3. Notification bell (the "notif announcement" part)

New 🔔 icon in the navbar (logged-in users only) with an unread-count
badge. Click it to see recent notifications, click one to mark it read and
jump to the linked page. Updates live (no refresh needed) via Supabase
Realtime — this reuses the `notifications` table that was already in your
schema since the very first migration but never actually had working
INSERT/UPDATE policies until now.

## 4. Counter "kamar tersisa" (urgency banner)

Right under the hero buttons on the homepage: live count of vacant rooms.
Turns red/urgent when 3 or fewer are left, shows a "fully booked, hubungi
kami" message if zero are vacant.

## 5. Peta lokasi (Google Maps)

Added a "Lokasi" section with an embedded map. I used a search-by-name
embed (`D' Green Loft Kost`, from your QRIS image) rather than a made-up
address, since guessing coordinates would just show the wrong place. If
that name doesn't resolve to your actual pin on Google Maps, replace the
`src` URL in `src/app/page.tsx` (search for "LOCATION") with either:
- Your real address as a search query, or
- Exact coordinates: `https://www.google.com/maps?q=LAT,LNG&output=embed`

## 6. Testimoni tenant

- **Tenant side**: on `/dashboard`, anyone with an active paid booking who
  hasn't submitted one yet sees a "Tulis Testimoni" form (star rating +
  text).
- **Admin side**: `/admin/testimonials` — nothing goes public
  automatically; you approve/hide/delete each one first (keeps fake or
  spam reviews out).
- **Public**: approved testimonials show in a new section on the
  homepage.

## New migration

```
supabase/migrations/007_news_testimonials_notifications.sql
```
Adds the `announcements` and `testimonials` tables, the missing
notification INSERT/UPDATE policies, realtime for notifications, and a
storage bucket for announcement images. Not wrapped in a transaction, same
as recent migrations — safe to run top to bottom.

## Checklist

1. Copy `public/`, `src/`, and `supabase/migrations/` into your project
   at the right paths (see `START_HERE.md` if you're not 100% sure where
   things go this time — same PowerShell commands as last time work).
2. Run `007_news_testimonials_notifications.sql`.
3. Restart `npm run dev`, hard refresh.
4. Post a test announcement from `/admin/announcements` with the notify
   checkbox on, then check a tenant account's bell icon lights up.

Build verified clean across all 26 routes before sending this.

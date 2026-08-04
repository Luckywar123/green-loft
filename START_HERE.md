# START_HERE.md — cara pasang yang benar (baca ini duluan)

Semua fitur di bawah ini **sudah selesai dibangun dan ada di dalam zip
ini**. Yang kemarin salah cuma soal file-nya taruh di lokasi yang salah
(nyasar ke dalam `supabase/src/...` dan `supabase/supabase/...`), jadi
Next.js masih baca kode lama. Ini bukan "belum jadi" — ini "sudah jadi,
tinggal ditaruh di tempat yang benar."

## Fitur yang ada di dalam zip ini (semua sudah dites build, clean)

- ✅ Chat tenant ↔ admin (real-time)
- ✅ Halaman Profil + upload foto + upload KTP (privat)
- ✅ Tombol Tolak di antrean verifikasi pembayaran
- ✅ Halaman Analitik bulanan + export Google Sheets
- ✅ Musik latar + autoplay
- ✅ Crypto wallet asli (connect wallet, kirim USDT langsung ke treasury)
- ✅ Admin Dashboard, Kelola Kamar, Laporan lengkap
- ✅ Semua bug fix sampai sesi terakhir (relationship ambiguity, deposit,
  room double-booking, dll)

## Langkah pasang (PowerShell, di E:\Green-Loft)

**Step 1 — Bersihkan dulu file yang nyasar dari percobaan sebelumnya:**
```powershell
cd E:\Green-Loft
Remove-Item -Recurse -Force supabase\src -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force supabase\supabase -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force supabase\public -ErrorAction SilentlyContinue
Remove-Item supabase\README*.md -ErrorAction SilentlyContinue
```

**Step 2 — Extract zip ini ke folder sementara** (misal Downloads), lalu
masuk ke folder hasil extract-nya:
```powershell
cd $HOME\Downloads\green-loft-updates
```
(sesuaikan path kalau extract-nya di tempat lain — yang penting sekarang
posisi kamu ada DI DALAM folder `green-loft-updates` hasil extract, bukan
di dalam zip-nya)

**Step 3 — Copy tiap bagian ke tempat yang BENAR di project kamu:**
```powershell
Copy-Item -Recurse -Force src\* E:\Green-Loft\src\
Copy-Item -Recurse -Force public\* E:\Green-Loft\public\
Copy-Item -Recurse -Force supabase\migrations\* E:\Green-Loft\supabase\migrations\
```

**Step 4 — Balik ke project, restart dev server:**
```powershell
cd E:\Green-Loft
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
npm run dev
```

## Cara mastiin beneran aktif (cek satu-satu)

Buka browser, hard refresh (`Ctrl+Shift+R`) tiap halaman ini, dan cek:

| URL | Yang harus keliatan |
|---|---|
| `/` | Logo + galeri foto + counter "kamar tersisa" + berita terbaru + testimoni + peta lokasi |
| `/news` | List berita/update |
| `/admin` | Kartu ringkasan + menu Kelola Kamar/Berita/Testimoni/Laporan/Antrean/Pesan |
| `/admin/announcements` | Form tulis berita + checkbox notif tenant |
| `/admin/testimonials` | List testimoni masuk, tombol approve/hide |
| `/admin/rooms` | Tabel kamar, ada dropdown tipe & harga bisa diedit |
| `/admin/reports` | Tabel booking dengan kolom KTP, Deposit (dropdown), tanggal bisa diedit |
| `/admin/payments` | Ada tombol **"Tolak"** di samping "Verify & Approve" |
| `/admin/analytics` | Grafik bar + tombol "Simpan/Export Bulan Ini" |
| `/admin/messages` | List chat tenant |
| `/profile` (login dulu) | Form upload foto profil + upload KTP |
| `/dashboard` (login, ada booking aktif) | Form "Tulis Testimoni" |
| Navbar, semua halaman | Link "Booking" beda tujuan tergantung status kamu; 🔔 bel notifikasi kalau login |
| Pojok kanan bawah, semua halaman | Tombol musik 🎵 |
| Pojok kanan bawah, semua halaman | Tombol chat 💬 dengan tab "FAQ" / "Chat Admin" |

Kalau salah satu dari ini masih nunjukin tampilan LAMA setelah hard
refresh, berarti file spesifik itu belum ke-copy dengan benar — screenshot
halaman itu dan kabarin aku persis yang mana.

## Kalau masih pusing pindah-pindah file manual

Kasih tau kalau project ini sudah/belum pakai Git (ada folder `.git` di
`E:\Green-Loft`?). Kalau sudah ada dan sudah terhubung ke GitHub, aku bisa
kerja langsung ke repo-nya lewat Claude Code/Cowork ke depannya — jadi gak
perlu lagi acara extract-zip-terus-copy-manual yang rawan salah taruh
kayak kemarin.

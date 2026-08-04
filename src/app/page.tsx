import Link from 'next/link'
import Image from 'next/image'
import AvailabilityBanner from '@/components/AvailabilityBanner'
import NewsPreview from '@/components/NewsPreview'
import TestimonialsSection from '@/components/TestimonialsSection'

const facilities = [
  { icon: '🏊', name: 'Kolam Renang', desc: 'Khusus penghuni' },
  { icon: '💪', name: 'Gym', desc: 'Fasilitas lengkap' },
  { icon: '🅿️', name: 'Parkir Basement', desc: 'Luas & aman' },
  { icon: '👮', name: 'Security 24 Jam', desc: 'Keamanan maksimal' },
  { icon: '🍳', name: 'Dapur Umum', desc: 'Masak sendiri' },
  { icon: '📶', name: 'WiFi High Speed', desc: 'Internet cepat' },
  { icon: '❄️', name: 'AC Split', desc: 'Setiap kamar' },
  { icon: '💧', name: 'Dispenser', desc: 'Panas & dingin' },
]

const gallery = [
  { src: '/images/gallery/pool-day.jpg', alt: 'Kolam renang Green Loft di siang hari', caption: 'Kolam Renang' },
  { src: '/images/gallery/pool-dusk.jpg', alt: 'Kolam renang Green Loft saat senja', caption: 'Kolam Renang — Senja' },
  { src: '/images/gallery/gym.jpg', alt: 'Gym Green Loft dengan pemandangan kota', caption: 'Gym & Fitness' },
  { src: '/images/gallery/room-interior.jpg', alt: 'Interior kamar Green Loft', caption: 'Interior Kamar' },
  { src: '/images/gallery/common-area.jpg', alt: 'Ruang bersama Green Loft', caption: 'Ruang Bersama' },
  { src: '/images/gallery/hallway.jpg', alt: 'Koridor kamar Green Loft', caption: 'Koridor Kamar' },
]

const tiers = [
  {
    key: 'premium',
    name: 'Premium',
    price: 1750000,
    featured: false,
    image: '/images/rooms/premium.jpg',
    tagline: 'Kenyamanan penuh dengan harga bersahabat',
    amenities: ['AC Split', 'WiFi High Speed', 'Furniture Lengkap', 'Kamar Mandi Dalam', 'Akses Kolam & Gym'],
    missing: 'Tanpa water heater',
  },
  {
    key: 'presidential',
    name: 'Presidential',
    price: 1850000,
    featured: true,
    image: '/images/rooms/presidential.jpg',
    tagline: 'Level tertinggi kenyamanan Green Loft',
    amenities: ['AC Split', 'WiFi High Speed', 'Furniture Lengkap', 'Kamar Mandi Dalam + Water Heater', 'Akses Kolam & Gym', 'Ruang Lebih Luas'],
    missing: null,
  },
]

function LeafDivider() {
  return (
    <svg viewBox="0 0 400 40" className="leaf-divider" preserveAspectRatio="none" aria-hidden="true">
      <line x1="0" y1="20" x2="160" y2="20" stroke="#b8935f" strokeWidth="1" opacity="0.5" />
      <line x1="240" y1="20" x2="400" y2="20" stroke="#b8935f" strokeWidth="1" opacity="0.5" />
      <path
        d="M200 8 C 210 8, 218 16, 218 24 C 218 30, 212 34, 200 34 C 188 34, 182 30, 182 24 C 182 16, 190 8, 200 8 Z"
        fill="none"
        stroke="#4CAF50"
        strokeWidth="1.5"
      />
      <line x1="200" y1="10" x2="200" y2="32" stroke="#4CAF50" strokeWidth="1.5" />
    </svg>
  )
}

export default function Home() {
  return (
    <div>
      {/* HERO */}
      <section className="relative h-[92vh] min-h-[640px] flex items-center justify-center overflow-hidden">
        <Image
          src="/images/gallery/pool-dusk.jpg"
          alt="Green Loft di waktu senja"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a2016]/80 via-[#0a2016]/70 to-[#0a2016]/95" />

        <div className="relative z-10 text-center text-white px-4 max-w-3xl mx-auto flex flex-col items-center">
          <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-white shadow-2xl p-2 mb-6 ring-2 ring-[#b8935f]/60">
            <Image
              src="/images/logo.jpg"
              alt="Logo Green Loft"
              width={112}
              height={112}
              className="w-full h-full object-contain rounded-full"
              priority
            />
          </div>

          <span className="uppercase tracking-[0.3em] text-xs md:text-sm text-[#d9bd8f] mb-4 font-medium">
            Premium Boarding House
          </span>

          <h1 className="font-display text-5xl md:text-7xl font-medium mb-6 leading-tight">
            <span className="text-[#7fd88a]">Green</span> Loft
          </h1>

          <p className="text-lg md:text-xl mb-10 text-white/90 max-w-xl">
            Hunian premium dengan kolam renang pribadi, gym, dan taman asri —
            dua pilihan kamar untuk gaya hidup yang kamu inginkan.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
            <Link href="/booking" className="btn-gold text-lg px-8 py-4 rounded-full font-semibold">
              Booking Sekarang
            </Link>
            <Link href="/rooms" className="btn-glass text-lg px-8 py-4 rounded-full font-semibold text-white">
              Lihat Kamar
            </Link>
          </div>

          <AvailabilityBanner />
        </div>

        {/* Trust bar */}
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-black/40 backdrop-blur-sm border-t border-white/10">
          <div className="max-w-5xl mx-auto px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-white">
            <div>
              <div className="font-display text-2xl font-semibold text-[#d9bd8f]">15</div>
              <div className="text-xs md:text-sm text-white/70">Kamar Tersedia</div>
            </div>
            <div>
              <div className="font-display text-2xl font-semibold text-[#d9bd8f]">2</div>
              <div className="text-xs md:text-sm text-white/70">Tipe Kamar</div>
            </div>
            <div>
              <div className="font-display text-2xl font-semibold text-[#d9bd8f]">Rp1.75Jt</div>
              <div className="text-xs md:text-sm text-white/70">Mulai per Bulan</div>
            </div>
            <div>
              <div className="font-display text-2xl font-semibold text-[#d9bd8f]">24/7</div>
              <div className="text-xs md:text-sm text-white/70">Security</div>
            </div>
          </div>
        </div>
      </section>

      <div className="bg-[#FAFAF5]">
        <LeafDivider />
      </div>

      {/* GALLERY */}
      <section className="py-16 md:py-20 bg-[#FAFAF5]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="uppercase tracking-[0.25em] text-xs text-[#b8935f] font-semibold">Galeri</span>
            <h2 className="font-display text-3xl md:text-4xl font-medium mt-2 text-[#0f2e1f]">
              Sekilas Suasana <span className="text-[#4CAF50]">Green Loft</span>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            {gallery.map((g, i) => (
              <div
                key={i}
                className={`gallery-frame relative h-48 md:h-64 group ${i === 0 ? 'col-span-2 h-56 md:h-80' : ''}`}
              >
                <Image
                  src={g.src}
                  alt={g.alt}
                  fill
                  sizes={i === 0 ? '(max-width: 768px) 100vw, 66vw' : '(max-width: 768px) 50vw, 33vw'}
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f2e1f]/60 via-[#0f2e1f]/10 to-transparent" />
                <span className="absolute bottom-3 left-4 text-white font-display text-sm md:text-base tracking-wide">
                  {g.caption}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-white">
        <LeafDivider />
      </div>

      <NewsPreview />

      {/* ROOM TIERS */}
      <section className="py-16 md:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="uppercase tracking-[0.25em] text-xs text-[#b8935f] font-semibold">Pilihan Kamar</span>
            <h2 className="font-display text-3xl md:text-4xl font-medium mt-2 text-[#0f2e1f]">
              Premium <span className="text-[#4CAF50]">&amp;</span> Presidential
            </h2>
            <p className="text-gray-600 mt-3 max-w-xl mx-auto">
              Dua tingkatan kenyamanan. Perbedaan utamanya: kamar Presidential dilengkapi water heater, kamar Premium tidak.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {tiers.map((tier) => (
              <div key={tier.key} className={`card-luxury overflow-hidden ${tier.featured ? 'featured relative' : ''}`}>
                {tier.featured && (
                  <div className="absolute top-5 right-5 z-10 bg-[#b8935f] text-white text-xs font-bold uppercase tracking-wide px-4 py-1.5 rounded-full shadow-lg">
                    Direkomendasikan
                  </div>
                )}
                <div className="relative h-56">
                  <Image src={tier.image} alt={`Kamar tipe ${tier.name}`} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
                </div>
                <div className="p-8">
                  <h3 className="font-display text-2xl font-semibold text-[#0f2e1f] mb-1">{tier.name}</h3>
                  <p className="text-gray-500 text-sm mb-4">{tier.tagline}</p>

                  <div className="mb-6">
                    <span className="font-display text-3xl font-semibold text-[#4CAF50]">
                      Rp {tier.price.toLocaleString('id-ID')}
                    </span>
                    <span className="text-gray-500"> / bulan</span>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {tier.amenities.map((a, i) => (
                      <li key={i} className="flex items-center gap-2 text-gray-700 text-sm">
                        <span className="text-[#4CAF50] font-bold">✓</span> {a}
                      </li>
                    ))}
                    {tier.missing && (
                      <li className="flex items-center gap-2 text-gray-400 text-sm">
                        <span className="font-bold">✕</span> {tier.missing}
                      </li>
                    )}
                  </ul>

                  <Link
                    href={`/rooms?type=${tier.key}`}
                    className={`block w-full text-center py-3 rounded-xl font-semibold ${
                      tier.featured ? 'btn-gold' : 'bg-[#4CAF50] text-white hover:bg-[#45a049]'
                    }`}
                  >
                    Lihat Kamar {tier.name}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-[#FAFAF5]">
        <LeafDivider />
      </div>

      {/* FACILITIES */}
      <section className="py-16 md:py-20 bg-[#FAFAF5]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <span className="uppercase tracking-[0.25em] text-xs text-[#b8935f] font-semibold">Fasilitas</span>
            <h2 className="font-display text-3xl md:text-4xl font-medium mt-2 text-[#0f2e1f]">
              Fasilitas <span className="text-[#4CAF50]">Premium</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {facilities.map((f, i) => (
              <div key={i} className="card-premium p-6 text-center hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-1">{f.name}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TestimonialsSection />

      {/* LOCATION */}
      <section className="py-16 md:py-20 bg-[#FAFAF5]">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <span className="uppercase tracking-[0.25em] text-xs text-[#b8935f] font-semibold">Lokasi</span>
            <h2 className="font-display text-3xl md:text-4xl font-medium mt-2 text-[#0f2e1f]">
              Temukan <span className="text-[#4CAF50]">Green Loft</span>
            </h2>
            <p className="text-gray-600 mt-3">
              Alamat lengkap & petunjuk arah tersedia lewat chat admin di pojok kanan bawah.
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-lg border border-[#b8935f]/20" style={{ height: 400 }}>
            <iframe
              title="Lokasi Green Loft"
              src="https://www.google.com/maps?q=D%27+Green+Loft+Kost&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 bg-[#0f2e1f] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <Image src="/images/gallery/pool-dusk.jpg" alt="" fill sizes="100vw" className="object-cover" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="font-display text-3xl md:text-4xl font-medium mb-4">Siap untuk Tinggal?</h2>
          <p className="text-white/70 mb-8">
            Cek kamar yang tersedia dan booking sekarang — tidak perlu login sampai kamu siap membayar.
          </p>
          <Link href="/booking" className="inline-block btn-gold px-10 py-4 rounded-full font-bold text-lg">
            Booking Sekarang
          </Link>
        </div>
      </section>
    </div>
  )
}

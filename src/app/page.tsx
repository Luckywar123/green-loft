import Link from 'next/link'

export default function Home() {
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

  return (
    <div>
      <section className="relative h-[600px] flex items-center justify-center bg-gradient-to-r from-green-800 to-green-600">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-[#4CAF50]">Green</span> Loft
          </h1>
          <p className="text-xl md:text-2xl mb-8">Premium Kost dengan Kolam Renang & Gym</p>
          <div className="flex gap-4 justify-center">
            <Link href="/booking" className="bg-[#4CAF50] text-white px-8 py-4 rounded-lg font-semibold hover:bg-[#45a049]">Booking Sekarang</Link>
            <Link href="/rooms" className="bg-white text-[#333333] px-8 py-4 rounded-lg font-semibold hover:bg-gray-100">Lihat Kamar</Link>
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#FAFAF5]">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-4xl font-bold text-center mb-12">Fasilitas <span className="text-[#4CAF50]">Premium</span></h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {facilities.map((f, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-lg mb-2">{f.name}</h3>
                <p className="text-gray-600 text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-[#4CAF50] to-[#45a049]">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">Siap untuk Tinggal?</h2>
          <Link href="/booking" className="inline-block bg-white text-[#4CAF50] px-10 py-4 rounded-lg font-bold text-lg hover:bg-gray-100">Booking Sekarang</Link>
        </div>
      </section>
    </div>
  )
}
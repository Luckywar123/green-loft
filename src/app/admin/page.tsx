'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Rooms() {
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'standard' | 'premium' | 'suite'>('all')

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    const { data, error } = await supabase.from('rooms').select('*').order('id')
    if (error) {
      console.error('Error fetching rooms:', error)
      alert('Error: ' + error.message)
    }
    setRooms(data || [])
    setLoading(false)
  }

  const filteredRooms = filter === 'all' ? rooms : rooms.filter(r => r.type === filter)

  // Placeholder image generator
  const getRoomImage = (type: string, index: number) => {
    const colors = {
      standard: '252525',
      premium: '4CAF50',
      suite: 'FF9800'
    }
    return `https://placehold.co/600x400/${colors[type as keyof typeof colors]}/ffffff?text=Room+${index + 1}`
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-[#4CAF50]"></div>
    </div>
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-[#4CAF50] to-green-700 bg-clip-text text-transparent">
          Pilih <span className="text-gray-800">Kamar</span>
        </h1>
        <p className="text-xl text-gray-600">Pilih kamar impianmu sekarang!</p>
      </div>
      
      <div className="flex justify-center gap-4 mb-12 flex-wrap">
        {(['all', 'standard', 'premium', 'suite'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-8 py-3 rounded-full font-bold text-lg transition-all ${
              filter === type 
                ? 'bg-[#4CAF50] text-white shadow-lg scale-110' 
                : 'bg-white text-gray-700 border-2 border-gray-300 hover:border-[#4CAF50] hover:text-[#4CAF50]'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {filteredRooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow">
          <div className="text-6xl mb-4">🏠</div>
          <h3 className="text-2xl font-bold mb-2">Tidak ada kamar tersedia</h3>
          <p className="text-gray-600">Silakan cek kembali nanti atau hubungi admin</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredRooms.map((room, index) => (
            <div key={room.id} className="card-premium overflow-hidden group">
              {/* Image section */}
              <div className="relative h-56 overflow-hidden">
                <img 
                  src={getRoomImage(room.type, index)}
                  alt={`Room ${room.number}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-4 right-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-lg ${
                    room.status === 'vacant' ? 'bg-green-500 text-white' :
                    room.status === 'occupied' ? 'bg-blue-500 text-white' :
                    'bg-yellow-500 text-white'
                  }`}>
                    {room.status === 'vacant' ? '✓ Tersedia' : 
                     room.status === 'occupied' ? 'Terisi' : 'Reserved'}
                  </span>
                </div>
                <div className="absolute bottom-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg font-bold">
                  Floor {room.floor}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-3xl font-bold text-gray-800">Room {room.number}</h3>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[#4CAF50]">Rp {room.price_per_month.toLocaleString('id-ID')}</div>
                    <div className="text-sm text-gray-500">per bulan</div>
                  </div>
                </div>

                <div className="mb-4 pb-4 border-b">
                  <div className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Amenities</div>
                  <div className="flex flex-wrap gap-2">
                    {(room.amenities || []).slice(0, 5).map((amenity: string, i: number) => (
                      <span key={i} className="text-xs bg-green-50 text-[#4CAF50] px-3 py-1.5 rounded-full font-medium">
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>

                <Link 
                  href={`/booking?room=${room.id}`}
                  className="block w-full btn-glow text-white py-4 rounded-xl font-bold text-lg text-center"
                >
                  Booking Sekarang ✨
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
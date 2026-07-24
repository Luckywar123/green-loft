'use client'
import { useEffect, useState } from 'react'
import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type RoomType = 'all' | 'premium' | 'presidential'

const roomImages: Record<'premium' | 'presidential', string> = {
  premium: '/images/rooms/premium.jpg',
  presidential: '/images/rooms/presidential.jpg',
}

function RoomsContent() {
  const searchParams = useSearchParams()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<RoomType>('all')

  useEffect(() => {
    fetchRooms()
    const typeParam = searchParams.get('type')
    if (typeParam === 'premium' || typeParam === 'presidential') {
      setFilter(typeParam)
    }
  }, [searchParams])

  const fetchRooms = async () => {
    const { data } = await supabase.from('rooms').select('*').order('id')
    setRooms(data || [])
    setLoading(false)
  }

  const filteredRooms = filter === 'all' ? rooms : rooms.filter(r => r.type === filter)

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-medium mb-8 text-center text-[#0f2e1f]">
        Pilih <span className="text-[#4CAF50]">Kamar</span>
      </h1>

      <div className="flex justify-center gap-4 mb-8">
        {(['all', 'premium', 'presidential'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-6 py-2 rounded-lg font-semibold capitalize ${
              filter === type
                ? 'bg-[#4CAF50] text-white'
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            {type === 'all' ? 'Semua' : type}
          </button>
        ))}
      </div>

      {filteredRooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow">
          <p className="text-gray-600">Tidak ada kamar untuk filter ini.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map(room => (
            <div key={room.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
              <div
                className="h-48 bg-cover bg-center relative"
                style={{ backgroundImage: `url(${roomImages[room.type as 'premium' | 'presidential'] || roomImages.premium})` }}
              >
                <div className="absolute inset-0 bg-black/25" />
                <span className="absolute top-3 left-3 bg-[#b8935f] text-white text-xs font-bold uppercase tracking-wide px-3 py-1 rounded-full">
                  {room.type}
                </span>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold">Room {room.number}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    room.status === 'vacant' ? 'bg-green-100 text-green-700' :
                    room.status === 'occupied' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {room.status}
                  </span>
                </div>
                <div className="mb-4">
                  <div className="text-2xl font-bold text-[#4CAF50]">Rp {room.price_per_month.toLocaleString('id-ID')}</div>
                  <div className="text-sm text-gray-500">per bulan</div>
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(room.amenities || []).slice(0, 4).map((amenity: string, i: number) => (
                    <span key={i} className="text-xs bg-gray-100 px-3 py-1 rounded-full">{amenity}</span>
                  ))}
                </div>
                <Link href={`/booking?room=${room.id}`} className="block w-full text-center bg-[#4CAF50] text-white py-3 rounded-lg font-semibold hover:bg-[#45a049]">Booking Sekarang</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Rooms() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <RoomsContent />
    </Suspense>
  )
}

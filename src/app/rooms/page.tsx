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
    const { data } = await supabase.from('rooms').select('*').order('id')
    setRooms(data || [])
    setLoading(false)
  }

  const filteredRooms = filter === 'all' ? rooms : rooms.filter(r => r.type === filter)

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8 text-center">Pilih <span className="text-[#4CAF50]">Kamar</span></h1>
      
      <div className="flex justify-center gap-4 mb-8">
        {(['all', 'standard', 'premium', 'suite'] as const).map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-6 py-2 rounded-lg font-semibold ${
              filter === type 
                ? 'bg-[#4CAF50] text-white' 
                : 'bg-white text-gray-700 border hover:bg-gray-50'
            }`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.map(room => (
          <div key={room.id} className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden">
            <div className={`h-48 ${room.status === 'vacant' ? 'bg-gradient-to-br from-green-400 to-green-600' : room.status === 'occupied' ? 'bg-gradient-to-br from-blue-400 to-blue-600' : 'bg-gradient-to-br from-yellow-400 to-yellow-600'} flex items-center justify-center`}>
              <span className="text-white text-6xl">🏠</span>
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
    </div>
  )
}
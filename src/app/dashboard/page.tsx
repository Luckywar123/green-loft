'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }
    setUser(user)
    fetchBookings()
  }

  const fetchBookings = async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*, rooms(number, type)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Dashboard</h1>
      
      <div className="bg-white p-6 rounded-xl shadow mb-8">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        <div className="space-y-2">
          <div><strong>Email:</strong> {user?.email}</div>
          <div><strong>ID:</strong> {user?.id}</div>
        </div>
      </div>

      <h2 className="text-2xl font-semibold mb-4">Booking Anda</h2>
      
      {bookings.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <p className="text-gray-600 mb-4">Belum ada booking</p>
          <a href="/rooms" className="inline-block bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#45a049]">Lihat Kamar</a>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div key={booking.id} className="bg-white p-6 rounded-xl shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">Room {booking.rooms?.number}</h3>
                  <p className="text-sm text-gray-600">{booking.start_date} - {booking.end_date}</p>
                  <p className="text-sm">Rp {booking.total_amount.toLocaleString('id-ID')}</p>
                </div>
                <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                  booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {booking.payment_status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
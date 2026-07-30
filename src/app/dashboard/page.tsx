'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const DEPOSIT_LABEL: Record<string, { text: string; style: string }> = {
  pending: { text: 'Deposit: Belum Diterima', style: 'bg-gray-100 text-gray-600' },
  held: { text: 'Deposit: Ditahan', style: 'bg-yellow-100 text-yellow-700' },
  returned: { text: 'Deposit: Sudah Dikembalikan', style: 'bg-blue-100 text-blue-700' },
  not_applicable: { text: '', style: '' },
}

function daysRemaining(endDate: string) {
  const end = new Date(endDate)
  const today = new Date()
  end.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function CountdownBadge({ endDate }: { endDate: string }) {
  const days = daysRemaining(endDate)
  let style = 'bg-green-100 text-green-700'
  let text = `${days} hari lagi sampai kontrak berakhir`
  if (days < 0) {
    style = 'bg-red-100 text-red-700'
    text = `Kontrak sudah berakhir ${Math.abs(days)} hari lalu`
  } else if (days <= 7) {
    style = 'bg-red-100 text-red-700'
    text = days === 0 ? 'Kontrak berakhir hari ini' : `${days} hari lagi — segera perpanjang!`
  } else if (days <= 30) {
    style = 'bg-yellow-100 text-yellow-700'
  }
  return <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${style}`}>{text}</span>
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

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
    fetchBookings(user.id)
  }

  const fetchBookings = async (userId: string) => {
    const { data } = await supabase
      .from('bookings')
      .select('*, rooms(number, type)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setBookings(data || [])
    setLoading(false)
  }

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Batalkan booking ini? Tindakan ini tidak bisa dibatalkan.')) return
    setCancellingId(bookingId)
    const { error } = await supabase.from('bookings').delete().eq('id', bookingId)
    setCancellingId(null)
    if (error) {
      alert('Gagal membatalkan: ' + error.message)
      return
    }
    if (user) fetchBookings(user.id)
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  const activeBooking = bookings.find((b) => b.payment_status === 'paid')
  const otherBookings = bookings.filter((b) => b !== activeBooking)

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-medium mb-2 text-[#0f2e1f]">Dashboard</h1>
      <p className="text-gray-500 mb-8">{user?.email}</p>

      {activeBooking && (
        <div className="card-luxury featured p-6 mb-8">
          <div className="flex justify-between items-start flex-wrap gap-3 mb-3">
            <div>
              <h2 className="text-xl font-semibold">Room {activeBooking.rooms?.number}</h2>
              <p className="text-sm text-gray-500 capitalize">{activeBooking.rooms?.type} · {activeBooking.start_date} s/d {activeBooking.end_date}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">PAID</span>
          </div>
          <CountdownBadge endDate={activeBooking.end_date} />
          {activeBooking.deposit_required && DEPOSIT_LABEL[activeBooking.deposit_status]?.text && (
            <span className={`ml-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${DEPOSIT_LABEL[activeBooking.deposit_status].style}`}>
              {DEPOSIT_LABEL[activeBooking.deposit_status].text}
            </span>
          )}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">
        {activeBooking ? 'Riwayat & Booking Lain' : 'Booking Anda'}
      </h2>

      {bookings.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow text-center">
          <p className="text-gray-600 mb-4">Belum ada booking</p>
          <a href="/rooms" className="inline-block bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#45a049]">Lihat Kamar</a>
        </div>
      ) : otherBookings.length === 0 && activeBooking ? (
        <p className="text-sm text-gray-500">Tidak ada booking lain.</p>
      ) : (
        <div className="space-y-4">
          {otherBookings.map(booking => (
            <div key={booking.id} className="bg-white p-6 rounded-xl shadow">
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold text-lg">Room {booking.rooms?.number}</h3>
                  <p className="text-sm text-gray-600">{booking.start_date} - {booking.end_date}</p>
                  <p className="text-sm">Rp {booking.total_amount.toLocaleString('id-ID')}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                    booking.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                    booking.payment_status === 'failed' ? 'bg-red-100 text-red-700' :
                    booking.payment_status === 'refunded' ? 'bg-gray-100 text-gray-600' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {booking.payment_status.toUpperCase()}
                  </span>
                  {booking.payment_status === 'pending' && (
                    <div className="flex gap-2">
                      <a
                        href={`/payment/${booking.id}`}
                        className="text-sm bg-[#4CAF50] text-white px-4 py-1.5 rounded-lg font-semibold hover:bg-[#45a049]"
                      >
                        Lanjut Bayar
                      </a>
                      <button
                        onClick={() => cancelBooking(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="text-sm border border-red-300 text-red-600 px-4 py-1.5 rounded-lg font-semibold hover:bg-red-50 disabled:opacity-50"
                      >
                        {cancellingId === booking.id ? 'Membatalkan...' : 'Batalkan'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

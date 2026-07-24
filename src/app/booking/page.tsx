'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, useUser } from '@/lib/supabase'

const PENDING_BOOKING_KEY = 'greenloft_pending_booking'

function BookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()

  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [durationMonths, setDurationMonths] = useState(1)
  const [price, setPrice] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [total, setTotal] = useState(0)
  const [deposit] = useState(250000)
  const [submitting, setSubmitting] = useState(false)
  const [restoredNotice, setRestoredNotice] = useState(false)

  const roomId = searchParams.get('room')

  // Fetch the room — no auth required, browsing is open to everyone.
  useEffect(() => {
    if (!roomId) {
      router.push('/rooms')
      return
    }
    fetchRoom(parseInt(roomId))
  }, [roomId])

  // Once we know whether someone is logged in, restore any booking they
  // started before being asked to log in to pay.
  useEffect(() => {
    if (userLoading || !user || !selectedRoom) return

    const raw = sessionStorage.getItem(PENDING_BOOKING_KEY)
    if (!raw) return

    try {
      const pending = JSON.parse(raw)
      if (pending.roomId === selectedRoom.id) {
        setStartDate(pending.startDate || '')
        setDurationMonths(pending.durationMonths || 1)
        calculatePrice(selectedRoom, pending.durationMonths || 1)
        setRestoredNotice(true)
      }
      sessionStorage.removeItem(PENDING_BOOKING_KEY)
    } catch {
      sessionStorage.removeItem(PENDING_BOOKING_KEY)
    }
  }, [userLoading, user, selectedRoom])

  const fetchRoom = async (id: number) => {
    const { data } = await supabase.from('rooms').select('*').eq('id', id).single()
    setSelectedRoom(data)
    if (data) calculatePrice(data, durationMonths)
    setRoomLoading(false)
  }

  const calculatePrice = (room: any, months: number) => {
    if (!room) return
    let calculatedPrice = room.price_per_month * months
    let discountAmount = 0

    if (months >= 12) {
      discountAmount = Math.floor(calculatedPrice * 0.15)
      calculatedPrice -= discountAmount
    }

    setPrice(calculatedPrice)
    setDiscount(discountAmount)
    setTotal(calculatedPrice + deposit)
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const months = parseInt(e.target.value)
    setDurationMonths(months)
    calculatePrice(selectedRoom, months)
  }

  const handleConfirm = async () => {
    if (!selectedRoom || !startDate) return

    // Booking details only require login at this final step — save them
    // and send the person to log in / register, then bring them right back.
    if (!user) {
      sessionStorage.setItem(
        PENDING_BOOKING_KEY,
        JSON.stringify({ roomId: selectedRoom.id, startDate, durationMonths })
      )
      const returnTo = `/booking?room=${selectedRoom.id}`
      router.push(`/auth/login?redirect=${encodeURIComponent(returnTo)}`)
      return
    }

    setSubmitting(true)

    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + durationMonths)

    const { error } = await supabase.from('bookings').insert([
      {
        room_id: selectedRoom.id,
        user_id: user.id,
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        duration_months: durationMonths,
        total_amount: total,
        payment_status: 'pending',
      },
    ])

    if (error) {
      alert('Error: ' + error.message)
      setSubmitting(false)
    } else {
      router.push('/dashboard')
    }
  }

  if (roomLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!selectedRoom) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">Kamar tidak ditemukan.</p>
        <Link href="/rooms" className="bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold">
          Lihat Kamar Lain
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-medium mb-2 text-[#0f2e1f]">
        Booking <span className="text-[#4CAF50]">{selectedRoom.number}</span>
      </h1>
      <p className="text-gray-500 mb-8 capitalize">Tipe {selectedRoom.type}</p>

      {restoredNotice && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
          Selamat datang kembali! Data booking kamu sudah dilanjutkan — cek detail di bawah lalu konfirmasi.
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Detail Kamar</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><strong>Tipe:</strong> <span className="capitalize">{selectedRoom.type}</span></div>
          <div><strong>Harga/Bulan:</strong> Rp {selectedRoom.price_per_month.toLocaleString('id-ID')}</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Pilihan</h2>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Tanggal Mulai</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg"
            min={new Date().toISOString().split('T')[0]}
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2">Durasi</label>
          <select
            value={durationMonths}
            onChange={handleDurationChange}
            className="w-full px-4 py-3 border rounded-lg"
          >
            {[1, 3, 6, 12, 24].map(m => (
              <option key={m} value={m}>{m} bulan {m >= 12 ? '(15% DISKON!)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between mb-2">
            <span>Subtotal ({durationMonths} bulan)</span>
            <span>Rp {price.toLocaleString('id-ID')}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600 mb-2">
              <span>Diskon (15%)</span>
              <span>- Rp {discount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between mb-2">
            <span>Deposit</span>
            <span>Rp {deposit.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between font-bold text-xl pt-4 border-t">
            <span>Total</span>
            <span className="text-[#4CAF50]">Rp {total.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>

      {!userLoading && !user && (
        <p className="text-sm text-gray-500 mb-3 text-center">
          Kamu bisa isi tanggal & durasi tanpa login. Login hanya diminta saat kamu siap membayar.
        </p>
      )}

      <button
        onClick={handleConfirm}
        disabled={!startDate || submitting}
        className="w-full bg-[#4CAF50] text-white py-4 rounded-lg font-semibold hover:bg-[#45a049] disabled:opacity-50"
      >
        {submitting
          ? 'Processing...'
          : !startDate
          ? 'Pilih tanggal dulu'
          : !user
          ? 'Login untuk Lanjut ke Payment'
          : 'Lanjut ke Payment'}
      </button>
    </div>
  )
}

export default function Booking() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <BookingContent />
    </Suspense>
  )
}

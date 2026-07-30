'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase, useUser } from '@/lib/supabase'

const PENDING_BOOKING_KEY = 'greenloft_pending_booking'
const DEPOSIT_AMOUNT = 250000

function BookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: userLoading } = useUser()

  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [roomLoading, setRoomLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [durationMonths, setDurationMonths] = useState(1)
  const [price, setPrice] = useState(0)
  const [depositRequired, setDepositRequired] = useState(true)
  const [depositChecked, setDepositChecked] = useState(false)
  const [total, setTotal] = useState(0)
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

  // Once logged in, check whether this tenant already has a previous
  // booking for this exact room — if so, this is a renewal, no deposit.
  useEffect(() => {
    if (userLoading || !selectedRoom) return
    if (!user) {
      setDepositRequired(true)
      setDepositChecked(true)
      calculatePrice(selectedRoom, durationMonths, true)
      return
    }
    checkDeposit(selectedRoom.id, user.id)
  }, [userLoading, user, selectedRoom])

  // Restore an in-progress booking someone started before logging in to pay.
  useEffect(() => {
    if (userLoading || !user || !selectedRoom) return

    const raw = sessionStorage.getItem(PENDING_BOOKING_KEY)
    if (!raw) return

    try {
      const pending = JSON.parse(raw)
      if (pending.roomId === selectedRoom.id) {
        setStartDate(pending.startDate || '')
        setDurationMonths(pending.durationMonths || 1)
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
    if (data) calculatePrice(data, durationMonths, true)
    setRoomLoading(false)
  }

  const checkDeposit = async (roomId: number, userId: string) => {
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .eq('payment_status', 'paid')

    const isFirstTime = !count || count === 0
    setDepositRequired(isFirstTime)
    setDepositChecked(true)
    calculatePrice(selectedRoom, durationMonths, isFirstTime)
  }

  // Flat pricing — no discount regardless of duration.
  const calculatePrice = (room: any, months: number, needsDeposit: boolean) => {
    if (!room) return
    const calculatedPrice = room.price_per_month * months
    setPrice(calculatedPrice)
    setTotal(calculatedPrice + (needsDeposit ? DEPOSIT_AMOUNT : 0))
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const months = parseInt(e.target.value)
    setDurationMonths(months)
    calculatePrice(selectedRoom, months, depositRequired)
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

    // Re-check the room is still vacant right before booking — it may have
    // been taken by someone else since this page first loaded.
    const { data: freshRoom } = await supabase.from('rooms').select('status').eq('id', selectedRoom.id).single()
    if (freshRoom && freshRoom.status !== 'vacant') {
      alert('Maaf, kamar ini baru saja terisi oleh orang lain. Silakan pilih kamar lain.')
      setSubmitting(false)
      router.push('/rooms')
      return
    }

    const endDate = new Date(startDate)
    endDate.setMonth(endDate.getMonth() + durationMonths)

    const { data, error } = await supabase
      .from('bookings')
      .insert([
        {
          room_id: selectedRoom.id,
          user_id: user.id,
          start_date: startDate,
          end_date: endDate.toISOString().split('T')[0],
          duration_months: durationMonths,
          total_amount: total,
          payment_status: 'pending',
          deposit_required: depositRequired,
          deposit_amount: depositRequired ? DEPOSIT_AMOUNT : 0,
          deposit_status: depositRequired ? 'pending' : 'not_applicable',
        },
      ])
      .select('id')
      .single()

    if (error) {
      alert('Error: ' + error.message)
      setSubmitting(false)
    } else {
      router.push(`/payment/${data.id}`)
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

  if (selectedRoom.status !== 'vacant') {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="bg-white rounded-xl shadow p-8">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="font-display text-2xl font-medium mb-2 text-[#0f2e1f]">
            Room {selectedRoom.number} Sudah Tidak Tersedia
          </h1>
          <p className="text-gray-600 mb-6 capitalize">Status kamar saat ini: {selectedRoom.status.replace('_', ' ')}</p>
          <Link href="/rooms" className="inline-block bg-[#4CAF50] text-white px-6 py-3 rounded-lg font-semibold">
            Lihat Kamar Lain
          </Link>
        </div>
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
              <option key={m} value={m}>{m} bulan</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Harga flat per bulan, tidak ada diskon durasi.</p>
        </div>

        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between mb-2">
            <span>Subtotal ({durationMonths} bulan)</span>
            <span>Rp {price.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span>
              Deposit
              {!depositRequired && depositChecked && (
                <span className="text-green-600 text-xs ml-2">(tidak dikenakan — perpanjangan)</span>
              )}
            </span>
            <span>Rp {(depositRequired ? DEPOSIT_AMOUNT : 0).toLocaleString('id-ID')}</span>
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

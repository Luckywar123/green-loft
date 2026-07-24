'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function BookingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [startDate, setStartDate] = useState('')
  const [durationMonths, setDurationMonths] = useState(1)
  const [price, setPrice] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [total, setTotal] = useState(0)
  const [deposit] = useState(250000)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/auth/login?redirect=/booking')
          return
        }
        setUser(user)

        const roomId = searchParams.get('room')
        if (!roomId) {
          router.push('/rooms')
          return
        }

        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', parseInt(roomId))
          .single()

        if (error) throw error

        if (!data) {
          alert('Kamar tidak ditemukan!')
          router.push('/rooms')
          return
        }

        setSelectedRoom(data)
        calculatePrice(data, durationMonths)
        setLoading(false)
      } catch (err: any) {
        setError(err.message || 'Something went wrong')
        setLoading(false)
      }
    }

    init()
  }, [searchParams, router])

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

  const handleSubmit = async () => {
    if (!selectedRoom || !user || !startDate) {
      setError('Mohon lengkapi semua data!')
      return
    }

    setLoading(true)
    setError('')
    
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
      }
    ])

    if (error) {
      setError('Error: ' + error.message)
      setLoading(false)
    } else {
      alert('✅ Booking berhasil! Check dashboard Anda.')
      router.push('/dashboard')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-xl">Loading... 🔄</div>
    </div>
  )

  if (error) return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="bg-red-100 border border-red-400 text-red-700 p-6 rounded-xl">
        <h2 className="text-2xl font-bold mb-4">❌ Error</h2>
        <p>{error}</p>
        <button onClick={() => router.push('/rooms')} className="mt-4 bg-[#4CAF50] text-white px-6 py-3 rounded-lg">Back to Rooms</button>
      </div>
    </div>
  )

  if (!selectedRoom) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-[#4CAF50] to-green-700 bg-clip-text text-transparent">
          Booking <span className="text-gray-800">{selectedRoom.number}</span>
        </h1>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
        <h2 className="text-2xl font-bold mb-6">📦 Detail Kamar</h2>
        <div className="grid grid-cols-2 gap-6 text-lg">
          <div><span className="text-gray-600">Tipe:</span> <span className="font-bold capitalize">{selectedRoom.type}</span></div>
          <div><span className="text-gray-600">Floor:</span> <span className="font-bold">{selectedRoom.floor}</span></div>
          <div><span className="text-gray-600">Harga/Bulan:</span> <span className="font-bold text-[#4CAF50]">Rp {selectedRoom.price_per_month.toLocaleString('id-ID')}</span></div>
          <div><span className="text-gray-600">Amenities:</span> <span className="font-bold">{selectedRoom.amenities?.length || 0} items</span></div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-xl shadow-lg mb-8">
        <h2 className="text-2xl font-bold mb-6">⚙️ Pilihan Kamu</h2>
        
        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-3">Tanggal Mulai</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#4CAF50] focus:outline-none text-lg"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold text-gray-700 mb-3">Durasi Sewa</label>
          <select
            value={durationMonths}
            onChange={handleDurationChange}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-[#4CAF50] focus:outline-none text-lg"
          >
            {[1, 3, 6, 12, 24].map(m => (
              <option key={m} value={m}>{m} Bulan {m >= 12 ? '(🎉 15% DISKON!)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border-2 border-gray-200">
          <div className="space-y-3 text-lg">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal ({durationMonths} bulan)</span>
              <span className="font-bold">Rp {price.toLocaleString('id-ID')}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>✨ Diskon (15%)</span>
                <span className="font-bold">- Rp {discount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Deposit</span>
              <span className="font-bold">Rp {deposit.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between text-2xl font-bold pt-4 border-t-2 border-gray-300">
              <span>Total</span>
              <span className="text-[#4CAF50]">Rp {total.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={!startDate}
        className="w-full bg-[#4CAF50] text-white py-5 rounded-xl font-bold text-xl hover:bg-[#45a049] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {!startDate ? 'Pilih tanggal dulu!' : '✅ Confirm & Continue'}
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

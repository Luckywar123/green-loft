'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Booking() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [startDate, setStartDate] = useState('')
  const [durationMonths, setDurationMonths] = useState(1)
  const [price, setPrice] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [total, setTotal] = useState(0)
  const [deposit, setDeposit] = useState(250000)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    checkAuth()
    if (searchParams.get('room')) {
      fetchRoom(parseInt(searchParams.get('room')!))
    }
  }, [searchParams])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login?redirect=/booking')
      return
    }
    setUser(user)
  }

  const fetchRoom = async (roomId: number) => {
    const { data } = await supabase.from('rooms').select('*').eq('id', roomId).single()
    setSelectedRoom(data)
    calculatePrice(data, durationMonths)
  }

  const calculatePrice = (room: any, months: number) => {
    if (!room) return
    let price = room.price_per_month * months
    let discountAmount = 0
    
    if (months >= 12) {
      discountAmount = Math.floor(price * 0.15)
      price -= discountAmount
    }

    setPrice(price)
    setDiscount(discountAmount)
    setTotal(price + deposit)
  }

  const handleDurationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const months = parseInt(e.target.value)
    setDurationMonths(months)
    calculatePrice(selectedRoom, months)
  }

  const handleSubmit = async () => {
    setLoading(true)
    
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
      alert(error.message)
    } else {
      router.push('/dashboard')
    }
    
    setLoading(false)
  }

  if (!selectedRoom) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Booking <span className="text-[#4CAF50]">{selectedRoom.number}</span></h1>

      <div className="bg-white p-6 rounded-xl shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Detail Kamar</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><strong>Tipe:</strong> {selectedRoom.type}</div>
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

      <button
        onClick={handleSubmit}
        disabled={!startDate || loading}
        className="w-full bg-[#4CAF50] text-white py-4 rounded-lg font-semibold hover:bg-[#45a049] disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Lanjut ke Payment'}
      </button>
    </div>
  )
}
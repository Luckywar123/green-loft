'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const STATUS_OPTIONS = ['vacant', 'occupied', 'pending_booking', 'pending_checkout']
const TYPE_OPTIONS = ['premium', 'presidential']

const STATUS_STYLE: Record<string, string> = {
  vacant: 'bg-green-100 text-green-700',
  occupied: 'bg-blue-100 text-blue-700',
  pending_booking: 'bg-yellow-100 text-yellow-700',
  pending_checkout: 'bg-orange-100 text-orange-700',
}

export default function AdminRooms() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'premium' | 'presidential'>('all')
  const [editingPrice, setEditingPrice] = useState<Record<number, string>>({})

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login?redirect=/admin/rooms'); return }
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin' && userData?.role !== 'crypto_admin') { router.push('/'); return }
    setChecking(false)
    fetchRooms()
  }

  const fetchRooms = async () => {
    setLoading(true)
    // current_booking_id is the single source of truth for "who's actually
    // staying here right now" — not a guess based on payment history.
    const { data: roomsData } = await supabase
      .from('rooms')
      .select('*, current_booking:current_booking_id(id, start_date, end_date, users(name, email)))')
      .order('number')

    setRooms(roomsData || [])
    setLoading(false)
  }

  const changeStatus = async (roomId: number, status: string) => {
    const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId)
    if (error) { alert('Gagal update status: ' + error.message); return }
    fetchRooms()
  }

  const changeType = async (roomId: number, type: string) => {
    const { error } = await supabase.from('rooms').update({ type }).eq('id', roomId)
    if (error) { alert('Gagal update tipe: ' + error.message); return }
    fetchRooms()
  }

  const savePrice = async (roomId: number) => {
    const raw = editingPrice[roomId]
    if (raw === undefined) return
    const price = parseInt(raw.replace(/\D/g, ''), 10)
    if (!price || price <= 0) { alert('Harga tidak valid'); return }
    const { error } = await supabase
      .from('rooms')
      .update({ price_per_month: price, price_per_year: price * 12 })
      .eq('id', roomId)
    if (error) { alert('Gagal update harga: ' + error.message); return }
    setEditingPrice((prev) => { const next = { ...prev }; delete next[roomId]; return next })
    fetchRooms()
  }

  const checkoutTenant = async (room: any) => {
    if (!confirm(`Checkout tenant dari Room ${room.number}? Kamar akan ditandai vacant.`)) return

    const { error: roomErr } = await supabase
      .from('rooms')
      .update({ status: 'vacant', current_booking_id: null })
      .eq('id', room.id)
    if (roomErr) { alert('Gagal checkout: ' + roomErr.message); return }

    // Reflect it on the old booking too, so it stops showing as an active
    // paid booking on the tenant's dashboard.
    if (room.current_booking?.id) {
      await supabase.from('bookings').update({ payment_status: 'refunded' }).eq('id', room.current_booking.id)
    }
    fetchRooms()
  }

  const filteredRooms = filter === 'all' ? rooms : rooms.filter((r) => r.type === filter)

  if (checking || loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h1 className="font-display text-3xl font-medium text-[#0f2e1f]">Kelola Kamar</h1>
        <div className="flex gap-3 text-sm">
          <a href="/admin" className="text-[#4CAF50] hover:underline">Dashboard</a>
          <a href="/admin/reports" className="text-[#4CAF50] hover:underline">Laporan</a>
        </div>
      </div>

      <div className="flex gap-3 mb-6">
        {(['all', 'premium', 'presidential'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${filter === t ? 'bg-[#4CAF50] text-white' : 'bg-white border'}`}
          >
            {t === 'all' ? 'Semua' : t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-4 py-3">Kamar</th>
              <th className="px-4 py-3">Tipe</th>
              <th className="px-4 py-3">Harga/Bulan</th>
              <th className="px-4 py-3">Tenant Saat Ini</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredRooms.map((room) => (
              <tr key={room.id} className="border-t">
                <td className="px-4 py-3 font-medium">{room.number}</td>
                <td className="px-4 py-3">
                  <select
                    value={room.type}
                    onChange={(e) => changeType(room.id, e.target.value)}
                    className="border rounded px-2 py-1 text-xs capitalize"
                  >
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={editingPrice[room.id] ?? room.price_per_month.toLocaleString('id-ID')}
                      onChange={(e) => setEditingPrice((prev) => ({ ...prev, [room.id]: e.target.value }))}
                      className="border rounded px-2 py-1 text-xs w-28"
                    />
                    {editingPrice[room.id] !== undefined && (
                      <button onClick={() => savePrice(room.id)} className="text-xs text-[#4CAF50] font-semibold">
                        Simpan
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {room.current_booking ? (
                    <div>
                      <div>{room.current_booking.users?.name}</div>
                      <div className="text-xs text-gray-500">{room.current_booking.users?.email}</div>
                      <div className="text-xs text-gray-400">s/d {room.current_booking.end_date}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={room.status}
                    onChange={(e) => changeStatus(room.id, e.target.value)}
                    className={`border rounded px-2 py-1 text-xs font-semibold ${STATUS_STYLE[room.status] || ''}`}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  {room.current_booking && (
                    <button onClick={() => checkoutTenant(room)} className="text-xs text-red-600 font-semibold underline">
                      Checkout
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRooms.length === 0 && <p className="p-6 text-center text-gray-500">Tidak ada kamar.</p>}
      </div>
    </div>
  )
}

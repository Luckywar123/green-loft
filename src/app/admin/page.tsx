'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [stats, setStats] = useState({
    totalRooms: 0,
    vacantRooms: 0,
    occupiedRooms: 0,
    pendingPayments: 0,
    pendingCrypto: 0,
    unreadMessages: 0,
    totalBookings: 0,
  })

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login?redirect=/admin'); return }

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin' && userData?.role !== 'crypto_admin') {
      router.push('/')
      return
    }

    setChecking(false)
    fetchStats()
  }

  const fetchStats = async () => {
    const { data: rooms } = await supabase.from('rooms').select('status')
    const totalRooms = rooms?.length || 0
    const vacantRooms = rooms?.filter((r) => r.status === 'vacant').length || 0
    const occupiedRooms = rooms?.filter((r) => r.status === 'occupied').length || 0

    const { count: pendingPayments } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: pendingCrypto } = await supabase
      .from('crypto_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')

    const { count: unreadMessages } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('sender_role', 'tenant')
      .is('read_at', null)

    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })

    setStats({
      totalRooms,
      vacantRooms,
      occupiedRooms,
      pendingPayments: pendingPayments || 0,
      pendingCrypto: pendingCrypto || 0,
      unreadMessages: unreadMessages || 0,
      totalBookings: totalBookings || 0,
    })
  }

  if (checking) return <div className="flex items-center justify-center h-screen">Loading...</div>

  const pendingTotal = stats.pendingPayments + stats.pendingCrypto

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-medium mb-2 text-[#0f2e1f]">Admin Dashboard</h1>
      <p className="text-gray-500 mb-10">Ringkasan Green Loft</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Kamar" value={stats.totalRooms} />
        <StatCard label="Kamar Vacant" value={stats.vacantRooms} accent="text-green-600" />
        <StatCard label="Kamar Occupied" value={stats.occupiedRooms} accent="text-blue-600" />
        <StatCard label="Total Booking" value={stats.totalBookings} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/admin/rooms" className="card-luxury p-6 hover:-translate-y-1 transition-transform">
          <div className="text-3xl mb-3">🏠</div>
          <h3 className="font-semibold text-lg mb-1">Kelola Kamar</h3>
          <p className="text-sm text-gray-500">Lihat & ubah status vacant/occupied tiap kamar secara manual.</p>
        </Link>

        <Link href="/admin/reports" className="card-luxury p-6 hover:-translate-y-1 transition-transform">
          <div className="text-3xl mb-3">📊</div>
          <h3 className="font-semibold text-lg mb-1">Laporan Transaksi</h3>
          <p className="text-sm text-gray-500">Tabel semua booking, bukti pembayaran, status, dan deposit.</p>
        </Link>

        <Link href="/admin/payments" className="card-luxury p-6 hover:-translate-y-1 transition-transform relative">
          {pendingTotal > 0 && (
            <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {pendingTotal}
            </span>
          )}
          <div className="text-3xl mb-3">🕓</div>
          <h3 className="font-semibold text-lg mb-1">Antrean Verifikasi</h3>
          <p className="text-sm text-gray-500">Payment & crypto yang menunggu di-approve.</p>
        </Link>

        <Link href="/admin/messages" className="card-luxury p-6 hover:-translate-y-1 transition-transform relative">
          {stats.unreadMessages > 0 && (
            <span className="absolute top-4 right-4 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
              {stats.unreadMessages}
            </span>
          )}
          <div className="text-3xl mb-3">💬</div>
          <h3 className="font-semibold text-lg mb-1">Pesan Tenant</h3>
          <p className="text-sm text-gray-500">Chat masuk dari tenant yang perlu dibalas.</p>
        </Link>

        <Link href="/rooms" className="card-luxury p-6 hover:-translate-y-1 transition-transform">
          <div className="text-3xl mb-3">👁️</div>
          <h3 className="font-semibold text-lg mb-1">Lihat Situs Publik</h3>
          <p className="text-sm text-gray-500">Buka halaman kamar seperti yang dilihat calon tenant.</p>
        </Link>
      </div>
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-5 text-center">
      <div className={`text-3xl font-bold ${accent || 'text-[#0f2e1f]'}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  )
}

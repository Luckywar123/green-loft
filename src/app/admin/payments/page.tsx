'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPayments() {
  const router = useRouter()
  const [adminId, setAdminId] = useState<string | null>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [cryptoTxs, setCryptoTxs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    if (userData?.role !== 'admin' && userData?.role !== 'crypto_admin') {
      router.push('/')
      return
    }

    setAdminId(user.id)
    fetchPending()
  }

  const fetchPending = async () => {
    const { data: paymentData } = await supabase
      .from('payments')
      .select('*, bookings(id, room_id, total_amount, start_date, end_date, deposit_required, deposit_status, rooms(number, type), users(name, email))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPayments(paymentData || [])

    const { data: cryptoData } = await supabase
      .from('crypto_transactions')
      .select('*, bookings(id, room_id, total_amount, start_date, end_date, deposit_required, deposit_status, rooms(number, type), users(name, email))')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setCryptoTxs(cryptoData || [])

    setLoading(false)
  }

  const verifyPayment = async (payment: any) => {
    if (!adminId) return
    const { error: payErr } = await supabase
      .from('payments')
      .update({ status: 'verified_manual', verified_by: adminId, verified_at: new Date().toISOString(), paid_at: new Date().toISOString() })
      .eq('id', payment.id)

    if (payErr) { alert('Gagal verifikasi: ' + payErr.message); return }

    if (payment.booking_id) {
      const bookingUpdates: Record<string, any> = { payment_status: 'paid' }
      if (payment.bookings?.deposit_required && payment.bookings?.deposit_status === 'pending') {
        bookingUpdates.deposit_status = 'held'
      }
      await supabase.from('bookings').update(bookingUpdates).eq('id', payment.booking_id)
      if (payment.bookings?.room_id) {
        await supabase.from('rooms').update({ status: 'occupied', current_booking_id: payment.booking_id }).eq('id', payment.bookings.room_id)
      }
    }

    alert('Payment terverifikasi! Kamar ditandai occupied.')
    if (payment.bookings?.users?.email) {
      fetch('/api/notify/payment-confirmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantEmail: payment.bookings.users.email,
          tenantName: payment.bookings.users.name,
          roomNumber: payment.bookings.rooms?.number,
          amount: payment.amount,
        }),
      }).catch(() => {})
    }
    fetchPending()
  }

  const verifyCrypto = async (tx: any) => {
    if (!adminId) return
    const { error: txErr } = await supabase
      .from('crypto_transactions')
      .update({ status: 'verified', verified_by: adminId, verified_at: new Date().toISOString() })
      .eq('id', tx.id)

    if (txErr) { alert('Gagal verifikasi: ' + txErr.message); return }

    if (tx.booking_id) {
      const bookingUpdates: Record<string, any> = { payment_status: 'paid' }
      if (tx.bookings?.deposit_required && tx.bookings?.deposit_status === 'pending') {
        bookingUpdates.deposit_status = 'held'
      }
      await supabase.from('bookings').update(bookingUpdates).eq('id', tx.booking_id)
      if (tx.bookings?.room_id) {
        await supabase.from('rooms').update({ status: 'occupied', current_booking_id: tx.booking_id }).eq('id', tx.bookings.room_id)
      }
    }

    alert('Transaksi crypto terverifikasi! Kamar ditandai occupied.')
    if (tx.bookings?.users?.email) {
      fetch('/api/notify/payment-confirmed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantEmail: tx.bookings.users.email,
          tenantName: tx.bookings.users.name,
          roomNumber: tx.bookings.rooms?.number,
          amount: tx.bookings.total_amount,
        }),
      }).catch(() => {})
    }
    fetchPending()
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h1 className="font-display text-3xl font-medium text-[#0f2e1f]">Antrean Verifikasi</h1>
        <div className="flex gap-3 text-sm">
          <a href="/admin" className="text-[#4CAF50] hover:underline">Dashboard</a>
          <a href="/admin/reports" className="text-[#4CAF50] hover:underline">Laporan Lengkap</a>
          <a href="/admin/messages" className="text-[#4CAF50] hover:underline">Pesan</a>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">QRIS &amp; Transfer Bank — Menunggu Verifikasi</h2>
      {payments.length === 0 ? (
        <div className="card text-center py-8 mb-10">
          <p className="text-gray-600">Tidak ada payment pending</p>
        </div>
      ) : (
        <div className="space-y-4 mb-10">
          {payments.map((payment) => (
            <div key={payment.id} className="card">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <div className="font-semibold text-lg">Rp {payment.amount.toLocaleString('id-ID')}</div>
                  <div className="text-sm text-gray-600">{payment.bookings?.users?.name} · {payment.bookings?.users?.email}</div>
                  <div className="text-sm text-gray-600">
                    Room {payment.bookings?.rooms?.number} · <span className="capitalize">{payment.bookings?.rooms?.type}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">Metode: {payment.method?.toUpperCase()}</div>
                  {payment.proof_url && (
                    <a href={payment.proof_url} target="_blank" rel="noreferrer" className="text-sm text-[#4CAF50] underline">
                      Lihat bukti transfer
                    </a>
                  )}
                </div>
                <button onClick={() => verifyPayment(payment)} className="btn-primary">Verify & Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-4">Crypto (USDT BNB) — Menunggu Verifikasi</h2>
      {cryptoTxs.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-600">Tidak ada transaksi crypto pending</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cryptoTxs.map((tx) => (
            <div key={tx.id} className="card">
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                  <div className="font-semibold text-lg">{tx.amount_usdt} USDT</div>
                  <div className="text-sm text-gray-600">{tx.bookings?.users?.name} · {tx.bookings?.users?.email}</div>
                  <div className="text-sm text-gray-600">
                    Room {tx.bookings?.rooms?.number} · <span className="capitalize">{tx.bookings?.rooms?.type}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1 break-all">TX Hash: {tx.tx_hash}</div>
                  <div className="text-sm text-gray-600 break-all">Dari: {tx.from_address}</div>
                  {tx.proof_url && (
                    <a href={tx.proof_url} target="_blank" rel="noreferrer" className="text-sm text-[#4CAF50] underline">
                      Lihat bukti transaksi
                    </a>
                  )}
                </div>
                <button onClick={() => verifyCrypto(tx)} className="btn-primary">Verify & Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

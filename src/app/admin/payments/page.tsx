'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminPayments() {
  const router = useRouter()
  const [payments, setPayments] = useState<any[]>([])
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
    
    fetchPayments()
  }

  const fetchPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*, bookings(total_amount, transaction_id, payment_method), users(name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setPayments(data || [])
    setLoading(false)
  }

  const verifyPayment = async (paymentId: string) => {
    await supabase.from('payments').update({ status: 'paid', verified_at: new Date().toISOString() }).eq('id', paymentId)
    fetchPayments()
    alert('Payment verified!')
  }

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Verifikasi Payment</h1>
        <a href="/admin" className="btn-secondary">← Dashboard</a>
      </div>

      {payments.length === 0 ? (
        <div className="card text-center py-8">
          <p className="text-gray-600">Tidak ada payment pending</p>
        </div>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <div key={payment.id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold">Rp {payment.amount.toLocaleString('id-ID')}</div>
                  <div className="text-sm text-gray-600">{payment.users?.name}</div>
                  <div className="text-sm text-gray-600">{payment.method.toUpperCase()}</div>
                  <div className="text-sm text-gray-600 mt-2">TX ID: {payment.transaction_id}</div>
                </div>
                <button onClick={() => verifyPayment(payment.id)} className="btn-primary">Verify & Approve</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
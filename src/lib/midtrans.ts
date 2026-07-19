'use client'

declare global {
  interface Window {
    snap: any
  }
}

export function loadSnap() {
  if (typeof window === 'undefined') return null
  if (!window.snap) {
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '')
    document.body.appendChild(script)
  }
  return window.snap
}

export async function createTransaction(orderId: string, amount: number, paymentType: string = 'qris') {
  const res = await fetch('/api/midtrans/create-transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_id: orderId, gross_amount: amount, payment_type: paymentType })
  })
  if (!res.ok) throw new Error('Failed to create transaction')
  return res.json()
}
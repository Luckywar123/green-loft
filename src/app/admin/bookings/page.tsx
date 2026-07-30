'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// This route was a stray duplicate of the real customer booking flow
// (src/app/booking/page.tsx), left over from an early draft. Keeping two
// separate booking implementations in sync (flat pricing, deposit logic,
// payment redirect, etc.) is a maintenance trap, so this just forwards to
// the real one instead of re-implementing it. Safe to delete this route
// entirely if nothing links to /admin/bookings anymore.
function RedirectToBooking() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const room = searchParams.get('room')
    router.replace(room ? `/booking?room=${room}` : '/booking')
  }, [searchParams, router])

  return <div className="flex items-center justify-center h-screen">Mengalihkan ke halaman booking...</div>
}

export default function Booking() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <RedirectToBooking />
    </Suspense>
  )
}

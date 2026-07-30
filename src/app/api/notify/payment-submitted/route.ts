import { NextRequest, NextResponse } from 'next/server'

// Sends an email to the admin whenever a tenant submits a payment (QRIS,
// bank transfer, or crypto) so it can be checked and verified.
//
// Requires two env vars to actually send anything:
//   RESEND_API_KEY      — from resend.com (npm install resend first)
//   ADMIN_NOTIFY_EMAIL   — where the notification should go
//
// If either is missing, this just logs and returns success=false/sent=false
// instead of crashing — so the payment flow keeps working even before you
// set email up.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, roomNumber, method, amount } = body

    const apiKey = process.env.RESEND_API_KEY
    const adminEmail = process.env.ADMIN_NOTIFY_EMAIL

    if (!apiKey || !adminEmail) {
      console.warn(
        '[notify] RESEND_API_KEY / ADMIN_NOTIFY_EMAIL belum di-set — email tidak dikirim. Payload:',
        body
      )
      return NextResponse.json({ success: true, sent: false, reason: 'not_configured' })
    }

    // Imported dynamically so the route doesn't fail to build/run if the
    // `resend` package hasn't been installed yet.
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Green Loft <onboarding@resend.dev>',
      to: adminEmail,
      subject: `Pembayaran Baru - Room ${roomNumber ?? '?'} - Mohon Dicek`,
      html: `
        <p>Ada pembayaran baru yang perlu dicek:</p>
        <ul>
          <li><strong>Room:</strong> ${roomNumber ?? '-'}</li>
          <li><strong>Metode:</strong> ${method ?? '-'}</li>
          <li><strong>Jumlah:</strong> Rp ${Number(amount || 0).toLocaleString('id-ID')}</li>
          <li><strong>Booking ID:</strong> ${bookingId ?? '-'}</li>
        </ul>
        <p>Silakan cek dan verifikasi transaksi ini di halaman admin (Verifikasi Payment / Laporan).</p>
      `,
    })

    return NextResponse.json({ success: true, sent: true })
  } catch (error: any) {
    console.error('[notify] Failed to send email:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

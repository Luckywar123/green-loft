import { NextRequest, NextResponse } from 'next/server'

// Emails a tenant when admin rejects their payment submission (e.g. fake
// or invalid proof), so they know to resubmit instead of just waiting.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantEmail, tenantName, roomNumber, bookingId, reason } = body

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey || !tenantEmail) {
      console.warn('[notify] payment-rejected: RESEND_API_KEY missing or no tenant email — skipping. Payload:', body)
      return NextResponse.json({ success: true, sent: false, reason: 'not_configured' })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Green Loft <onboarding@resend.dev>',
      to: tenantEmail,
      subject: `Pembayaran Room ${roomNumber ?? ''} Ditolak — Mohon Kirim Ulang`,
      html: `
        <p>Halo ${tenantName || ''},</p>
        <p>Konfirmasi pembayaran kamu untuk Room ${roomNumber ?? ''} <strong>ditolak</strong> oleh admin.</p>
        <p><strong>Alasan:</strong> ${reason || '-'}</p>
        <p>Silakan kirim ulang bukti pembayaran yang valid lewat halaman payment booking kamu.</p>
      `,
    })

    return NextResponse.json({ success: true, sent: true })
  } catch (error: any) {
    console.error('[notify] Failed to send rejection email:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

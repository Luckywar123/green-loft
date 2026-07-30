import { NextRequest, NextResponse } from 'next/server'

// Emails the TENANT when an admin verifies their payment as paid — the
// counterpart to /api/notify/payment-submitted, which emails the admin.
// Same graceful-degrade behavior if RESEND_API_KEY isn't set.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenantEmail, tenantName, roomNumber, amount } = body

    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey || !tenantEmail) {
      console.warn('[notify] Skipping tenant confirmation email (not configured or no email). Payload:', body)
      return NextResponse.json({ success: true, sent: false })
    }

    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Green Loft <onboarding@resend.dev>',
      to: tenantEmail,
      subject: `Pembayaran Room ${roomNumber ?? ''} Terkonfirmasi`,
      html: `
        <p>Halo ${tenantName || ''},</p>
        <p>Pembayaran kamu untuk Room ${roomNumber ?? '-'} sebesar
        Rp ${Number(amount || 0).toLocaleString('id-ID')} sudah dikonfirmasi. Selamat tinggal di Green Loft!</p>
        <p>Cek detail booking kamu di dashboard.</p>
      `,
    })

    return NextResponse.json({ success: true, sent: true })
  } catch (error: any) {
    console.error('[notify] Failed to send tenant confirmation email:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

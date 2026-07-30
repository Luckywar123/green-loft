import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Checks every paid booking for contracts ending in 7 / 3 / 1 day(s) and
// emails the tenant a reminder, once per threshold (tracked by
// reminder_7_sent / reminder_3_sent / reminder_1_sent on the booking).
//
// This route does nothing on its own — Next.js has no built-in scheduler.
// You need to trigger it once a day from somewhere external, e.g.:
//   - Vercel Cron (vercel.json: a "crons" entry hitting this path daily), or
//   - a free service like cron-job.org hitting this URL daily, or
//   - a GitHub Actions scheduled workflow.
//
// Protected by CRON_SECRET — set that env var, then call with:
//   Authorization: Bearer <CRON_SECRET>
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = request.headers.get('authorization')
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY not set — required to read all bookings from a server route.' },
      { status: 500 }
    )
  }
  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, end_date, reminder_7_sent, reminder_3_sent, reminder_1_sent, rooms(number), users(name, email)')
    .eq('payment_status', 'paid')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const apiKey = process.env.RESEND_API_KEY
  let sent = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (const b of bookings || []) {
    const end = new Date(b.end_date as string)
    end.setHours(0, 0, 0, 0)
    const daysLeft = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    let threshold: 7 | 3 | 1 | null = null
    if (daysLeft === 7 && !b.reminder_7_sent) threshold = 7
    else if (daysLeft === 3 && !b.reminder_3_sent) threshold = 3
    else if (daysLeft === 1 && !b.reminder_1_sent) threshold = 1
    if (!threshold) continue

    const tenant: any = b.users
    const room: any = b.rooms

    if (apiKey && tenant?.email) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(apiKey)
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'Green Loft <onboarding@resend.dev>',
          to: tenant.email,
          subject: `Kontrak Room ${room?.number} berakhir ${threshold} hari lagi`,
          html: `<p>Halo ${tenant.name || ''},</p>
                 <p>Kontrak sewa kamu di Room ${room?.number} akan berakhir dalam <strong>${threshold} hari</strong> (${b.end_date}).</p>
                 <p>Kalau mau perpanjang, silakan booking lagi lewat website Green Loft.</p>`,
        })
        sent++
      } catch (e) {
        console.error('[reminders] Failed to email', tenant.email, e)
      }
    }

    const field = threshold === 7 ? 'reminder_7_sent' : threshold === 3 ? 'reminder_3_sent' : 'reminder_1_sent'
    await supabase.from('bookings').update({ [field]: true }).eq('id', b.id)
  }

  return NextResponse.json({ success: true, checked: bookings?.length || 0, sent })
}

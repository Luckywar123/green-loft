import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Generates (and archives) this month's booking report, and — if Google
// Sheets is configured — appends a summary row there too.
//
// Two ways to call this:
//   1. Manually from /admin/analytics ("Simpan / Export Bulan Ini" button)
//      — the browser sends the admin's own session token; RLS makes sure
//      only a real admin/crypto_admin can actually pull this data.
//   2. On a schedule (cron-job.org, Vercel Cron, etc.) hitting this URL
//      with `Authorization: Bearer <CRON_SECRET>` once a month.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const cronSecret = process.env.CRON_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let supabase
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    if (!serviceKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY not set — required for scheduled (cron) calls.' }, { status: 500 })
    }
    supabase = createClient(supabaseUrl, serviceKey)
  } else if (authHeader.startsWith('Bearer ')) {
    // A logged-in admin triggered this from the UI — use their own token so
    // normal RLS applies (only admin/crypto_admin can actually read across
    // all bookings or write to monthly_reports).
    const token = authHeader.replace('Bearer ', '')
    supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
  } else {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  const monthLabel = monthStart.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })

  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, created_at, total_amount, payment_status, rooms!room_id(number, type), users(name, email)')
    .gte('created_at', monthStart.toISOString())
    .lt('created_at', monthEnd.toISOString())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const totalBookings = bookings?.length || 0
  const totalRevenue = (bookings || [])
    .filter((b: any) => b.payment_status === 'paid')
    .reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0)

  const snapshot = (bookings || []).map((b: any) => ({
    id: b.id,
    tenant: b.users?.name,
    email: b.users?.email,
    room: b.rooms?.number,
    type: b.rooms?.type,
    amount: b.total_amount,
    status: b.payment_status,
    created_at: b.created_at,
  }))

  // Try Google Sheets, but never let it block saving the archive locally.
  let sheetUrl: string | null = null
  let sheetsConfigured = false
  const sheetId = process.env.GOOGLE_SHEET_ID
  const gEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const gKey = process.env.GOOGLE_PRIVATE_KEY

  if (sheetId && gEmail && gKey) {
    sheetsConfigured = true
    try {
      const { google } = await import('googleapis')
      const auth = new google.auth.JWT(gEmail, undefined, gKey.replace(/\\n/g, '\n'), [
        'https://www.googleapis.com/auth/spreadsheets',
      ])
      const sheets = google.sheets({ version: 'v4', auth })

      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId,
        range: 'Sheet1!A:E',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[monthLabel, totalBookings, totalRevenue, new Date().toISOString(), '']],
        },
      })
      sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}`
    } catch (e: any) {
      console.error('[monthly-report] Google Sheets push failed:', e)
      // fall through — still save the local archive below
    }
  }

  const { error: upsertErr } = await supabase
    .from('monthly_reports')
    .upsert(
      {
        month: monthStart.toISOString().split('T')[0],
        total_bookings: totalBookings,
        total_revenue: totalRevenue,
        snapshot,
        sheet_url: sheetUrl,
        generated_at: new Date().toISOString(),
      },
      { onConflict: 'month' }
    )

  if (upsertErr) {
    return NextResponse.json({ error: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    month: monthLabel,
    totalBookings,
    totalRevenue,
    sheetUrl,
    sheetsConfigured,
  })
}

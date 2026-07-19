import { NextRequest, NextResponse } from 'next/server'
import Snap from 'midtrans-client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { order_id, gross_amount, payment_type, customer_details, item_details } = body

    const snap = new Snap.Snap({
      isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
      serverKey: process.env.MIDTRANS_SERVER_KEY
    })

    const params = {
      transaction_details: {
        order_id,
        gross_amount: Number(gross_amount),
      },
      customer_details: customer_details || {
        email: 'guest@greenloft.com',
        first_name: 'Guest'
      },
      item_details: item_details || [{
        id: 'ROOM',
        price: Number(gross_amount),
        quantity: 1,
        name: 'Kost Green Loft'
      }],
      payment_type: payment_type || 'qris',
      credit_card: {
        secure: true
      }
    }

    const response = await snap.createTransaction(params)

    return NextResponse.json({
      order_id,
      token: response.token,
      qr_code_url: response.qr_code_url,
      redirect_url: response.redirect_url,
      success: true
    })
  } catch (error: any) {
    console.error('Midtrans error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
export const ADMIN_WALLET = '0x7a4273dcf9a9A272fac0115ffF3B77D941bAC8C4'
export const REQUIRED_CONFIRMATIONS = 12

export function idrToUsdt(amount: number): number {
  return amount / 15000
}

export function getCryptoPaymentInfo(usdtAmount: number) {
  return {
    network: 'BEP20 (BNB Smart Chain)',
    adminWallet: ADMIN_WALLET,
    amount: usdtAmount.toFixed(2),
    instructions: [
      '1. Buka wallet crypto Anda',
      '2. Pilih USDT on BNB Chain (BEP20)',
      '3. Kirim ke: ' + ADMIN_WALLET,
      '4. Amount: ' + usdtAmount.toFixed(2) + ' USDT',
      '5. Simpan TX Hash',
      '6. Upload di dashboard'
    ]
  }
}
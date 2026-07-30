'use client'
import { BrowserProvider, Contract, parseUnits } from 'ethers'
import { ADMIN_WALLET } from '@/lib/crypto'

// BEP20 USDT on BNB Smart Chain
export const USDT_BEP20_ADDRESS = '0x55d398326f99059fF775485246999027B3197955'
export const BSC_CHAIN_ID_HEX = '0x38' // 56 in decimal

const ERC20_ABI = ['function transfer(address to, uint256 amount) returns (bool)']

declare global {
  interface Window {
    ethereum?: any
  }
}

export function hasWallet(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum
}

export async function connectWallet(): Promise<string> {
  if (!hasWallet()) {
    throw new Error('Wallet crypto tidak terdeteksi. Install MetaMask atau Trust Wallet dulu.')
  }
  const provider = new BrowserProvider(window.ethereum)
  const accounts: string[] = await provider.send('eth_requestAccounts', [])
  if (!accounts?.[0]) throw new Error('Tidak ada wallet yang terhubung.')
  return accounts[0]
}

async function ensureBscNetwork(provider: BrowserProvider) {
  try {
    await provider.send('wallet_switchEthereumChain', [{ chainId: BSC_CHAIN_ID_HEX }])
  } catch (switchError: any) {
    // 4902 = chain not added to the wallet yet
    if (switchError?.code === 4902) {
      await provider.send('wallet_addEthereumChain', [
        {
          chainId: BSC_CHAIN_ID_HEX,
          chainName: 'BNB Smart Chain',
          nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
          rpcUrls: ['https://bsc-dataseed.binance.org/'],
          blockExplorerUrls: ['https://bscscan.com'],
        },
      ])
    } else {
      throw switchError
    }
  }
}

/**
 * Sends USDT (BEP20) straight to the treasury wallet via the visitor's own
 * connected wallet (MetaMask/Trust Wallet popup to approve). Returns the
 * on-chain transaction hash directly from the wallet response — nothing
 * for the tenant to copy-paste.
 */
export async function sendUsdtToTreasury(
  usdtAmount: number,
  onPhase?: (phase: 'confirming' | 'mining') => void
): Promise<string> {
  if (!hasWallet()) {
    throw new Error('Wallet crypto tidak terdeteksi. Install MetaMask atau Trust Wallet dulu.')
  }
  const provider = new BrowserProvider(window.ethereum)
  await provider.send('eth_requestAccounts', [])
  await ensureBscNetwork(provider)

  const signer = await provider.getSigner()
  const usdt = new Contract(USDT_BEP20_ADDRESS, ERC20_ABI, signer)

  // BEP20 USDT uses 18 decimals (unlike ERC20 USDT on Ethereum, which uses 6).
  const amount = parseUnits(usdtAmount.toFixed(6), 18)

  onPhase?.('confirming')
  const tx = await usdt.transfer(ADMIN_WALLET, amount)
  onPhase?.('mining')
  await tx.wait(1) // wait for 1 confirmation before treating it as sent
  return tx.hash
}

import { createAppKit } from '@reown/appkit/react'
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { QueryClient } from '@tanstack/react-query'
import { defineChain } from '@reown/appkit/networks'

// 0. QueryClient
export const queryClient = new QueryClient()

// 1. Project ID
const projectId = '0ea4f8b558928f4d34be87e231f906d8'

// 2. Metadata
const metadata = {
  name: 'MantleMind',
  description: 'The First Autonomous AI Agent Economy on Mantle',
  url: 'http://localhost:5173',
  icons: ['https://avatars.githubusercontent.com/u/179229932']
}

// 3. Custom Mantle Networks
export const mantleTestnet = defineChain({
  id: 5003,
  name: 'Mantle Testnet',
  nativeCurrency: { decimals: 18, name: 'MNT', symbol: 'MNT' },
  rpcUrls: {
    default: { http: ['https://rpc.sepolia.mantle.xyz'] }
  },
  blockExplorers: {
    default: { name: 'Mantle Explorer', url: 'https://explorer.sepolia.mantle.xyz' }
  },
  testnet: true
})

export const mantleMainnet = defineChain({
  id: 5000,
  name: 'Mantle Network',
  nativeCurrency: { decimals: 18, name: 'MNT', symbol: 'MNT' },
  rpcUrls: {
    default: { http: ['https://rpc.mantle.xyz'] }
  },
  blockExplorers: {
    default: { name: 'Mantle Explorer', url: 'https://explorer.mantle.xyz' }
  },
})

// 4. Networks array
const networks = [mantleTestnet, mantleMainnet]

// 5. Wagmi Adapter
export const wagmiAdapter = new WagmiAdapter({
  networks,
  projectId,
  ssr: false
})

// 6. Create AppKit modal
createAppKit({
  adapters: [wagmiAdapter],
  networks,
  projectId,
  metadata,
  features: {
    analytics: false,
    email: false,
    socials: false,
  },
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#ffffff',
    '--w3m-border-radius-master': '8px',
  }
})
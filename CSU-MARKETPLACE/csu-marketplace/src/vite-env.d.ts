/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTRACT_ADDRESS: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly SUPABASE_SERVICE_ROLE_KEY: string
  readonly ALCHEMY_API_KEY: string
  readonly SEPOLIA_RPC_URL: string
  readonly SEPOLIA_PRIVATE_KEY: string
  readonly ETHERSCAN_API_KEY: string
  readonly REPORT_GAS: string
  readonly NODE_ENV: string
  readonly FRONTEND_URL: string
  readonly API_BASE_URL: string
  readonly ADMIN_EMAIL: string
  readonly ADMIN_USERNAME: string
  readonly ADMIN_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}
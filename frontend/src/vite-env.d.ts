/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_PUBLIC_URL?: string
  readonly VITE_FREE_SHIPPING_THRESHOLD?: string
  readonly VITE_FLAT_SHIPPING_COST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

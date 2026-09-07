const numberFromEnv = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback
}

export const FREE_SHIPPING_THRESHOLD = numberFromEnv(import.meta.env.VITE_FREE_SHIPPING_THRESHOLD, 500_000)
export const FLAT_SHIPPING_COST = numberFromEnv(import.meta.env.VITE_FLAT_SHIPPING_COST, 30_000)

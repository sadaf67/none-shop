import { useSiteSettings } from './useSiteSettings'
import { FLAT_SHIPPING_COST, FREE_SHIPPING_THRESHOLD } from '@/config/store'

/**
 * هزینه ارسال دقیقاً از تنظیمات پنل مدیر خوانده می‌شود تا با محاسبه بک‌اند
 * (orders/views.py) یکی باشد. مقادیر env فقط تا زمان رسیدن تنظیمات جانشین‌اند.
 */
export function useShipping(subtotal: number) {
  const { settings } = useSiteSettings()

  const threshold = Number(settings?.free_shipping_threshold ?? FREE_SHIPPING_THRESHOLD)
  const flatCost = Number(settings?.flat_shipping_cost ?? FLAT_SHIPPING_COST)
  const cost = subtotal >= threshold ? 0 : flatCost

  return {
    /** هزینه ارسال این سبد */
    cost,
    /** سقف ارسال رایگان */
    threshold,
    /** مبلغ باقی‌مانده تا رایگان‌شدن ارسال (۰ یعنی رایگان شده) */
    remainingForFree: Math.max(0, threshold - subtotal),
    isFree: cost === 0,
    note: settings?.shipping_note || '',
  }
}

export default useShipping

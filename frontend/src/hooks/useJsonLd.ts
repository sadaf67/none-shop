import { useEffect } from 'react'

/**
 * یک بلوک داده ساختاریافته (JSON-LD) به <head> اضافه می‌کند و هنگام خروج
 * از صفحه پاکش می‌کند.
 *
 * `key` باید در هر صفحه یکتا باشد تا اگر دو بلوک همزمان روی صفحه باشند
 * (مثلاً Breadcrumb و ItemList) یکدیگر را پاک نکنند.
 */
export function useJsonLd(key: string, data: unknown | null | undefined) {
  // با سریال‌سازی، افکت فقط وقتی محتوا واقعاً عوض شود دوباره اجرا می‌شود؛
  // در غیر این‌صورت هر رندر یک شیء تازه می‌سازد و حلقه ایجاد می‌کند.
  const payload = data ? JSON.stringify(data) : null

  useEffect(() => {
    if (!payload) return
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.jsonld = key
    script.textContent = payload
    document.head.appendChild(script)
    return () => { script.remove() }
  }, [key, payload])
}

export default useJsonLd

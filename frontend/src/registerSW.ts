/**
 * ثبت سرویس‌ورکر فقط در بیلد پروداکشن.
 * در حالت توسعه، هر سرویس‌ورکر باقی‌مانده حذف می‌شود تا کش قدیمی مزاحم نشود.
 */
export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  if (!import.meta.env.PROD) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => void registration.unregister())
    })
    return
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        // در صورت انتشار نسخه‌ی جدید، نسخه‌ی تازه بلافاصله فعال می‌شود
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage('SKIP_WAITING')
            }
          })
        })
      })
      .catch(() => {
        /* نبود سرویس‌ورکر نباید مانع کار سایت شود */
      })

    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
  })
}

/* سرویس‌ورکر فروشگاه ن وان */
const VERSION = 'n-one-v1'
const SHELL_CACHE = `${VERSION}-shell`
const ASSET_CACHE = `${VERSION}-assets`
const OFFLINE_URL = '/offline.html'

const SHELL_FILES = [
  OFFLINE_URL,
  '/favicon.svg',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // آیکون maskable هنگام «افزودن به صفحه اصلی» توسط سیستم‌عامل خوانده می‌شود؛
  // با کش‌شدن، نصب روی اینترنت ضعیف هم آیکون درست را نشان می‌دهد.
  '/icons/icon-maskable-512.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting()
})

function isImmutableAsset(url) {
  return url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/icons/')
    || /\.(?:woff2?|png|jpe?g|svg|webp|avif)$/.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // درخواست‌های API، مدیا و ادمین جنگو هرگز کش نمی‌شوند
  if (url.origin !== self.location.origin
    || url.pathname.startsWith('/api/')
    || url.pathname.startsWith('/media/')
    || url.pathname.startsWith('/admin/')) {
    return
  }

  // پیمایش صفحات: ابتدا شبکه، در نبود اینترنت صفحه‌ی آفلاین
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL)),
    )
    return
  }

  // فایل‌های ثابتِ هش‌دار: ابتدا کش
  if (isImmutableAsset(url)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached
        return fetch(request).then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone()
            caches.open(ASSET_CACHE).then((cache) => cache.put(request, copy))
          }
          return response
        })
      }),
    )
  }
})

import { useEffect } from 'react'
import { useSiteSettings } from '@/hooks/useSiteSettings'

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  if (!content) return
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

/**
 * تنظیمات پنل مدیر را روی سند اعمال می‌کند: عنوان، متا، رنگ اصلی، فاوآیکون و آنالیتیکس.
 */
export default function SiteHead() {
  const { settings } = useSiteSettings()

  useEffect(() => {
    if (!settings) return

    const title = settings.meta_title || `${settings.site_name} | ${settings.tagline}`.trim()
    document.title = title
    upsertMeta('meta[name="description"]', 'name', 'description', settings.meta_description)
    upsertMeta('meta[name="keywords"]', 'name', 'keywords', settings.meta_keywords)
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', settings.meta_description)
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', settings.site_name)
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', settings.meta_description)
    if (settings.og_image) {
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', settings.og_image)
      upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', settings.og_image)
    }
    if (settings.google_site_verification) {
      upsertMeta('meta[name="google-site-verification"]', 'name', 'google-site-verification',
        settings.google_site_verification)
    }

    if (settings.favicon) {
      const icon = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]')
      if (icon) icon.href = settings.favicon
    }
  }, [settings])

  useEffect(() => {
    if (!settings?.primary_color) return
    document.documentElement.style.setProperty('--primary', settings.primary_color)
    const themeColor = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    if (themeColor) themeColor.content = settings.primary_color
  }, [settings?.primary_color])

  useEffect(() => {
    const id = settings?.google_analytics_id
    if (!id || document.getElementById('ga-script')) return

    const loader = document.createElement('script')
    loader.id = 'ga-script'
    loader.async = true
    loader.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(loader)

    const inline = document.createElement('script')
    inline.id = 'ga-inline'
    inline.textContent =
      `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
      `gtag('js',new Date());gtag('config',${JSON.stringify(id)});`
    document.head.appendChild(inline)
  }, [settings?.google_analytics_id])

  return null
}

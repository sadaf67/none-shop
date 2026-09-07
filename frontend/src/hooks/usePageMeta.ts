import { useEffect } from 'react'
import { useSiteSettings } from './useSiteSettings'

function setMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector)
  if (!tag) {
    tag = document.createElement('meta')
    tag.setAttribute(attr, key)
    document.head.appendChild(tag)
  }
  tag.setAttribute('content', content)
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  link.href = url
}

interface PageMeta {
  title?: string
  description?: string
  /** با noindex صفحه از نتایج جست‌وجو کنار گذاشته می‌شود (مثلاً سبد خرید). */
  noindex?: boolean
  /** با false نام سایت به عنوان اضافه نمی‌شود (وقتی عنوان خودش کامل است). */
  titleTemplate?: boolean
}

/**
 * عنوان و توضیحات متای هر صفحه را تنظیم می‌کند.
 * تنظیمات عمومی سایت در SiteHead اعمال می‌شود؛ این هوک فقط لایه صفحه است.
 */
export function usePageMeta({ title, description, noindex, titleTemplate = true }: PageMeta) {
  const { settings } = useSiteSettings()
  const siteName = settings?.site_name || 'ن وان'

  useEffect(() => {
    if (title) {
      const full = titleTemplate ? `${title} | ${siteName}` : title
      document.title = full
      setMeta('meta[property="og:title"]', 'property', 'og:title', full)
    }
    if (description) {
      setMeta('meta[name="description"]', 'name', 'description', description)
      setMeta('meta[property="og:description"]', 'property', 'og:description', description)
    }
    setCanonical(window.location.origin + window.location.pathname)
    setMeta(
      'meta[name="robots"]',
      'name',
      'robots',
      noindex ? 'noindex, nofollow' : 'index, follow',
    )
  }, [title, description, noindex, siteName, titleTemplate])
}

export default usePageMeta

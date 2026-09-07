import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { Banner } from '@/types/settings'
import { formatPrice } from '@/utils/format'

const ROTATE_MS = 6000

interface HeroStageProps {
  /** بنرهای جایگاه «اسلایدر اصلی» به‌ترتیبی که مدیر تعیین کرده است. */
  banners: Banner[]
  /** محصول جایگزین وقتی هیچ بنری ساخته نشده باشد. */
  fallbackProduct?: any
  siteName: string
  tagline: string
}

/**
 * صحنهٔ تصویر صفحهٔ اول.
 *
 * مدیر می‌تواند چند بنر با جایگاه «اسلایدر اصلی» بسازد؛ اینجا بین آن‌ها
 * می‌چرخد. اگر هیچ بنری نباشد به تصویر محصول منتخب برمی‌گردد تا صفحهٔ اول
 * هیچ‌وقت خالی نماند.
 */
export default function HeroStage({ banners, fallbackProduct, siteName, tagline }: HeroStageProps) {
  const [index, setIndex] = useState(0)
  const count = banners.length

  // چرخش خودکار فقط وقتی بیش از یک بنر هست و کاربر انیمیشن را محدود نکرده.
  useEffect(() => {
    if (count < 2) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % count), ROTATE_MS)
    return () => window.clearInterval(timer)
  }, [count])

  // اگر مدیر بنری را حذف کند، اندیس فعلی ممکن است از محدوده بیرون بزند.
  useEffect(() => {
    if (index >= count && count > 0) setIndex(0)
  }, [index, count])

  const banner = banners[Math.min(index, Math.max(count - 1, 0))]
  const productImage = fallbackProduct?.main_image?.image

  const image = banner?.image || productImage || '/og.png'
  const mobileImage = banner?.mobile_image || null
  const alt = banner?.title || fallbackProduct?.main_image?.alt_text || fallbackProduct?.name || siteName
  const isCampaignFallback = !banner?.image && !productImage

  const caption = banner
    ? banner.subtitle || banner.title
    : fallbackProduct
      ? `${fallbackProduct.name} · ${formatPrice(fallbackProduct.price)}`
      : `${siteName}؛ ${tagline}`

  const topNote = banner?.badge || 'منتخب فروشگاه / ۰۱'

  return (
    <div className="hero-stage">
      <span className="floating-note floating-note--top">{topNote}</span>

      <div className="hero-product-shell">
        <AnimatePresence mode="wait">
          <motion.picture
            key={banner?.id ?? 'fallback'}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* نسخهٔ موبایل فقط وقتی مدیر آپلودش کرده باشد؛ وگرنه همان تصویر دسکتاپ. */}
            {mobileImage && <source media="(max-width: 767px)" srcSet={mobileImage} />}
            <img
              src={image}
              alt={alt}
              loading="eager"
              // LCP صفحهٔ اول همین تصویر است؛ مرورگر باید زودتر شروع کند.
              fetchPriority="high"
              decoding="async"
              className={isCampaignFallback ? 'hero-campaign-image' : undefined}
            />
          </motion.picture>
        </AnimatePresence>
      </div>

      <span className="floating-note floating-note--bottom">{caption}</span>

      {count > 1 && (
        <div className="hero-dots" role="tablist" aria-label="اسلایدهای صفحه اصلی">
          {banners.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={item.title}
              className={`hero-dot${i === index ? ' is-active' : ''}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      )}

      <span className="display-number" aria-hidden="true">
        {String(count > 1 ? index + 1 : 1).padStart(2, '0')}
      </span>
    </div>
  )
}

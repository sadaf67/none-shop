import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowUpLeft,
  BadgeCheck,
  Box,
  Headphones,
  PackageCheck,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
} from 'lucide-react'
import { getBestSellers, getCategories, getFeatured, getNewArrivals, getOnSale } from '@/api/products'
import ProductCard from '@/components/product/ProductCard'
import HeroStage from '@/components/home/HeroStage'
import PageTransition from '@/components/ui/PageTransition'
import { formatPrice } from '@/utils/format'
import { useBanners, useSiteSettings } from '@/hooks/useSiteSettings'
import useShipping from '@/hooks/useShipping'
import usePageMeta from '@/hooks/usePageMeta'
import useJsonLd from '@/hooks/useJsonLd'

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] as const },
})

/** پالت رنگی کارت دسته‌بندی‌ها؛ به‌ترتیب روی دسته‌های واقعی پنل مدیر می‌نشیند. */
const CATEGORY_ACCENTS = ['#ff8260', '#dfff69', '#7d8cff', '#ffd166', '#c9b8ff', '#70d6c8']

const DEFAULT_MARQUEE = [
  'ارسال به سراسر کشور',
  'پرداخت امن آنلاین',
  'ضمانت اصالت کالا',
  'پشتیبانی پاسخ‌گو',
  'تحویل سریع سفارش',
]

export default function Home() {
  const { data: featured } = useQuery({ queryKey: ['featured'], queryFn: getFeatured })
  const { data: newArrivals } = useQuery({ queryKey: ['newArrivals'], queryFn: getNewArrivals })
  const { data: bestSellers } = useQuery({ queryKey: ['bestSellers'], queryFn: getBestSellers })
  const { data: onSale } = useQuery({ queryKey: ['onSale'], queryFn: getOnSale })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories })

  const { settings } = useSiteSettings()
  const heroBanners = useBanners('hero')
  const stripBanners = useBanners('strip')
  const shipping = useShipping(0)

  const siteName = settings?.site_name || 'ن وان'
  const tagline = settings?.tagline || 'فروشگاه اینترنتی محصولات اصل'

  usePageMeta({
    title: settings?.meta_title || `${siteName} | ${tagline}`,
    description: settings?.meta_description || `خرید آنلاین از ${siteName} با ضمانت اصالت کالا، پرداخت امن و ارسال به سراسر کشور.`,
    titleTemplate: false,
  })

  // متنِ سمت راست از اولین بنر می‌آید؛ تصویر و چرخش اسلایدها را HeroStage اداره می‌کند.
  const hero = heroBanners[0]
  const heroProduct = featured?.[0] || newArrivals?.[0]

  const categoryItems = (categories ?? []).slice(0, 6).map((category: any, index: number) => ({
    ...category,
    accent: CATEGORY_ACCENTS[index % CATEGORY_ACCENTS.length],
    to: `/products?category=${category.id}`,
  }))

  const marqueeItems = stripBanners.length
    ? stripBanners.map((banner) => banner.title).filter(Boolean)
    : DEFAULT_MARQUEE

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // Organization: گوگل از این برای نمایش نام، لوگو و شبکه‌های اجتماعی فروشگاه
  // در پنل دانش (Knowledge Panel) استفاده می‌کند.
  useJsonLd('organization', {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: siteName,
    alternateName: settings?.site_name_en || undefined,
    url: origin,
    description: settings?.meta_description || tagline,
    ...(settings?.logo ? { logo: settings.logo } : {}),
    ...(settings?.phone
      ? {
          contactPoint: {
            '@type': 'ContactPoint',
            telephone: settings.phone,
            contactType: 'customer service',
            areaServed: 'IR',
            availableLanguage: 'Persian',
          },
        }
      : {}),
    sameAs: [settings?.instagram, settings?.telegram, settings?.twitter, settings?.linkedin, settings?.aparat]
      .filter(Boolean),
  })

  // WebSite + SearchAction: جعبهٔ جست‌وجوی سایت را زیر نتیجهٔ گوگل فعال می‌کند.
  useJsonLd('website', {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: siteName,
    url: origin,
    inLanguage: 'fa-IR',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  })

  return (
    <PageTransition>
      <main className="pt-24 md:pt-28">
        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">
          <div className="grid lg:grid-cols-[.92fr_1.08fr] gap-8 lg:gap-14 items-center">
            <div className="order-2 lg:order-1 lg:pr-6">
              <motion.div {...fadeUp(.05)} className="editorial-kicker mb-7">
                {hero?.badge || tagline}
              </motion.div>

              <motion.h1 {...fadeUp(.12)} className="text-[clamp(3.15rem,8vw,7.1rem)] font-black leading-[.98] tracking-[-.055em] mb-7">
                {hero?.title ? (
                  hero.title
                ) : (
                  <>
                    خرید مطمئن؛
                    <span className="block text-gradient">انتخاب توست.</span>
                  </>
                )}
              </motion.h1>

              <motion.p {...fadeUp(.2)} className="max-w-xl text-base md:text-lg leading-8 mb-9" style={{ color: 'var(--text3)' }}>
                {hero?.subtitle
                  || `در ${siteName} محصولات را با مشخصات کامل، قیمت شفاف و ضمانت اصالت مقایسه کنید و با خیال راحت سفارش دهید.`}
              </motion.p>

              <motion.div {...fadeUp(.28)} className="flex flex-wrap gap-3 mb-11">
                <Link to={hero?.link || '/products'} className="btn-primary group">
                  {hero?.button_text || 'مشاهده محصولات'}
                  <ArrowUpLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" />
                </Link>
                <Link to="/products?has_discount=true" className="btn-ghost">
                  پیشنهادهای شگفت‌انگیز
                  <Zap className="w-4 h-4" />
                </Link>
              </motion.div>

              <motion.div {...fadeUp(.36)} className="grid grid-cols-3 max-w-xl border-y py-5" style={{ borderColor: 'var(--border)' }}>
                {[
                  { icon: ShieldCheck, title: 'ضمانت اصالت', text: 'کالای اصل و تضمین‌شده' },
                  { icon: Truck, title: 'ارسال سریع', text: `رایگان از ${formatPrice(shipping.threshold)}` },
                  { icon: Headphones, title: 'پشتیبانی', text: 'همراه انتخاب شما' },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex flex-col sm:flex-row items-center sm:items-start gap-2.5 px-2 sm:px-4 first:pr-0 border-l last:border-l-0" style={{ borderColor: 'var(--border)' }}>
                    <Icon className="w-5 h-5 shrink-0" style={{ color: 'var(--primary)' }} />
                    <div className="text-center sm:text-right">
                      <div className="text-xs sm:text-sm font-extrabold">{title}</div>
                      <div className="hidden sm:block text-[11px] mt-1" style={{ color: 'var(--text3)' }}>{text}</div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            <motion.div {...fadeUp(.08)} className="order-1 lg:order-2">
              <HeroStage
                banners={heroBanners}
                fallbackProduct={heroProduct}
                siteName={siteName}
                tagline={tagline}
              />
            </motion.div>
          </div>
        </section>

        {marqueeItems.length > 0 && (
          <div className="marquee-strip" aria-hidden="true">
            <div className="marquee-track">
              {[...Array(2)].flatMap((_, group) => marqueeItems.map((item) => (
                <span className="marquee-item" key={`${group}-${item}`}>
                  <span className="marquee-dot" />{item}
                </span>
              )))}
            </div>
          </div>
        )}

        {categoryItems.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
            <SectionHeader eyebrow="دسته‌بندی‌ها" title="از کجا شروع کنیم؟" link="/products" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mt-9">
              {categoryItems.map((category: any, index: number) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * .05 }}
                >
                  <Link
                    to={category.to}
                    className="shoe-category-card group"
                    style={{ '--category-accent': category.accent } as React.CSSProperties}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-xs font-bold" style={{ color: 'var(--text3)' }}>
                        {(index + 1).toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false })}
                      </span>
                      <span className="category-icon"><Box className="w-5 h-5" /></span>
                    </div>
                    {category.image ? <img src={category.image} alt="" className="category-image" /> : null}
                    <div className="relative mt-12">
                      <span className="block text-lg font-black">{category.name}</span>
                      <span className="mt-1 block text-[11px]" style={{ color: 'var(--text3)' }}>
                        {category.description || `${(category.products_count ?? 0).toLocaleString('fa-IR')} محصول`}
                      </span>
                    </div>
                    <div className="relative mt-5 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold" style={{ color: 'var(--text3)' }}>مشاهده محصولات</span>
                      <ArrowUpLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" style={{ color: 'var(--primary)' }} />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {featured?.length > 0 && (
          <ProductSection eyebrow={`انتخاب ${siteName}`} title="محصولات ویژه" products={featured} link="/products?is_featured=true" />
        )}

        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="grid lg:grid-cols-[.8fr_1.2fr] gap-10 lg:gap-20 items-start">
            <div className="lg:sticky lg:top-32">
              <div className="editorial-kicker mb-5">چرا {siteName}؟</div>
              <h2 className="text-4xl md:text-6xl font-black leading-[1.08] tracking-[-.04em] mb-5">
                خریدی که جای حدس‌زدن ندارد.
              </h2>
              <p className="leading-8" style={{ color: 'var(--text3)' }}>
                مشخصات فنی، قیمت واقعی و وضعیت موجودی هر کالا شفاف نمایش داده می‌شود تا با اطمینان تصمیم بگیرید.
              </p>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {[
                { no: '01', icon: BadgeCheck, title: 'اصالت کالا تضمین‌شده', text: 'همه محصولات از تأمین‌کننده‌های معتبر تهیه می‌شوند و مشخصات هر کالا کامل ثبت شده است.' },
                { no: '02', icon: Sparkles, title: 'قیمت شفاف، بدون هزینه پنهان', text: 'قیمت، تخفیف و هزینه ارسال پیش از پرداخت به‌صورت کامل نمایش داده می‌شود.' },
                { no: '03', icon: PackageCheck, title: 'از سفارش تا تحویل', text: 'وضعیت سفارش را در پنل کاربری دنبال کنید و از مراحل ارسال باخبر باشید.' },
              ].map(({ no, icon: Icon, title, text }) => (
                <motion.article
                  key={no}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  className="grid grid-cols-[auto_minmax(0,1fr)] md:grid-cols-[auto_minmax(0,1fr)_auto] gap-4 md:gap-7 items-start py-7 first:pt-0"
                >
                  <span className="text-xs font-black pt-1" style={{ color: 'var(--primary)' }}>{no}</span>
                  <div>
                    <h3 className="text-xl md:text-2xl font-black mb-2">{title}</h3>
                    <p className="text-sm md:text-base leading-7 max-w-xl" style={{ color: 'var(--text3)' }}>{text}</p>
                  </div>
                  <Icon className="hidden md:block w-7 h-7 stroke-[1.4]" style={{ color: 'var(--text3)' }} />
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-20">
          <div className="size-guide-panel">
            <div className="size-guide-intro">
              <div className="editorial-kicker mb-5">خرید بدون دغدغه</div>
              <h2 className="text-4xl md:text-6xl font-black leading-[1.08] tracking-[-.04em]">
                سفارش را<br /><span className="text-gradient">امن و ساده</span> ثبت کن.
              </h2>
              <p className="mt-5 max-w-lg text-sm md:text-base leading-8" style={{ color: 'var(--text3)' }}>
                {shipping.note
                  || `سفارش‌های بالای ${formatPrice(shipping.threshold)} با ارسال رایگان به سراسر کشور ارسال می‌شود.`}
              </p>
              <Link to="/products" className="btn-primary mt-7">شروع خرید <ArrowUpLeft className="w-4 h-4" /></Link>
            </div>

            <div className="size-guide-steps">
              {[
                { no: '۱', title: 'محصول را انتخاب کنید', text: 'با فیلتر دسته‌بندی، برند و محدوده قیمت، سریع به کالای مورد نظر برسید.' },
                { no: '۲', title: 'سبد خرید را نهایی کنید', text: 'کد تخفیف را اعمال کنید و مبلغ نهایی همراه هزینه ارسال را ببینید.' },
                { no: '۳', title: 'پرداخت امن و پیگیری', text: 'پرداخت از طریق درگاه بانکی انجام می‌شود و وضعیت سفارش قابل پیگیری است.' },
              ].map((step) => (
                <article key={step.no} className="size-step">
                  <span>{step.no}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                  </div>
                </article>
              ))}
              <div className="size-guide-note">
                <RefreshCcw className="w-5 h-5" />
                <span>در صورت مغایرت کالا با مشخصات درج‌شده، امکان بازگشت طبق قوانین فروشگاه وجود دارد.</span>
              </div>
            </div>
          </div>
        </section>

        {newArrivals?.length > 0 && (
          <ProductSection eyebrow="تازه رسیده" title="جدیدترین‌ها" products={newArrivals} link="/products" />
        )}

        {onSale?.length > 0 && (
          <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-14">
            <div className="relative overflow-hidden px-6 py-12 md:px-12 md:py-16" style={{ background: 'var(--primary)', color: '#1b110e', borderRadius: '34px 34px 10px 34px' }}>
              <div className="absolute -left-8 -bottom-24 text-[14rem] font-black leading-none opacity-10" aria-hidden="true">%</div>
              <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black tracking-[.15em] mb-4"><Zap className="w-4 h-4" /> فرصت محدود</div>
                  <h2 className="text-4xl md:text-6xl font-black leading-tight tracking-[-.04em] max-w-3xl">همان کالا، با قیمت بهتر.</h2>
                  <p className="mt-4 opacity-70">محصولات تخفیف‌دار {siteName} را یک‌جا ببینید و دقیق‌تر مقایسه کنید.</p>
                </div>
                <Link to="/products?has_discount=true" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#17120f] text-white px-6 py-3.5 font-bold shrink-0 transition-transform hover:-translate-y-1">
                  مشاهده پیشنهادها <ArrowLeft className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}

        {onSale?.length > 0 && (
          <ProductSection eyebrow="قیمت تازه" title="پیشنهادهای امروز" products={onSale} link="/products?has_discount=true" />
        )}

        {bestSellers?.length > 0 && (
          <ProductSection eyebrow="انتخاب مشتریان" title="پرفروش‌ترین‌ها" products={bestSellers} link="/products?ordering=-sold_count" />
        )}
      </main>
    </PageTransition>
  )
}

function SectionHeader({ eyebrow, title, link }: { eyebrow: string; title: string; link: string }) {
  return (
    <div className="flex items-end justify-between gap-5">
      <div>
        <div className="editorial-kicker mb-4">{eyebrow}</div>
        <h2 className="text-3xl md:text-5xl font-black tracking-[-.035em]">{title}</h2>
      </div>
      <Link to={link} className="hidden sm:flex items-center gap-2 text-sm font-bold group" style={{ color: 'var(--text3)' }}>
        مشاهده همه
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
      </Link>
    </div>
  )
}

function ProductSection({ eyebrow, title, products, link }: { eyebrow: string; title: string; products: any[]; link: string }) {
  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
      <SectionHeader eyebrow={eyebrow} title={title} link={link} />
      <div className="product-grid-responsive grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5 mt-9">
        {products.slice(0, 4).map((product: any, index: number) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: index * .06, duration: .45 }}
          >
            <ProductCard product={product} />
          </motion.div>
        ))}
      </div>
      <Link to={link} className="sm:hidden btn-ghost w-full mt-5">مشاهده همه <ArrowLeft className="w-4 h-4" /></Link>
    </section>
  )
}

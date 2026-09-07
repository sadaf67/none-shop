import { Link } from 'react-router-dom'
import {
  ArrowUpLeft, Clock, FileCheck2, Heart, Mail, MapPin, PackageSearch, Phone, ShieldCheck,
} from 'lucide-react'
import LogoMark from '@/components/brand/LogoMark'
import { SOCIAL_CHANNELS } from '@/components/brand/SocialIcons'
import NewsletterForm from '@/components/common/NewsletterForm'
import TrustBadges from '@/components/common/TrustBadges'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { formatPrice } from '@/utils/format'

const footerLinks = [
  { to: '/', label: 'صفحه اصلی' },
  { to: '/products', label: 'همه محصولات' },
  { to: '/products?is_featured=true', label: 'منتخب‌ها' },
  { to: '/products?has_discount=true', label: 'پیشنهادها' },
  { to: '/wishlist', label: 'علاقه‌مندی‌ها' },
  { to: '/orders', label: 'پیگیری سفارش‌ها' },
  { to: '/cart', label: 'سبد خرید' },
  { to: '/faq', label: 'سوالات متداول' },
  { to: '/contact', label: 'تماس با ما' },
]

export default function Footer() {
  const { settings, footerPages } = useSiteSettings()
  const siteName = settings?.site_name || 'ن وان'
  const year = new Date().toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric' })

  const socialLinks = SOCIAL_CHANNELS
    .map(({ key, label, Icon }) => ({ label, Icon, href: settings?.[key] || '' }))
    .filter((item) => item.href)

  return (
    <footer className="mt-24 border-t" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div
          className="grid md:grid-cols-[1.2fr_.8fr] gap-10 md:gap-16 pb-12 md:pb-16 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <div>
            <span className="editorial-kicker mb-5">از تخفیف‌ها باخبر شوید</span>
            <h2 className="text-3xl md:text-5xl font-black leading-tight tracking-[-.04em] max-w-3xl">
              تازه‌ترین محصولات و پیشنهادهای ویژه، در ایمیل شما.
            </h2>
          </div>
          <div className="flex flex-col justify-end gap-5">
            <p className="text-sm leading-7" style={{ color: 'var(--text3)' }}>
              ایمیل خود را ثبت کنید تا از محصولات جدید و تخفیف‌های {siteName} زودتر از بقیه باخبر شوید.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.4fr] gap-12 py-12 md:py-16">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 mb-5">
              {settings?.logo ? (
                <img src={settings.logo} alt={siteName} width={44} height={44}
                     className="w-11 h-11 rounded-xl object-contain" />
              ) : (
                <LogoMark size={44} />
              )}
              <span>
                <span className="block text-xl font-black">{siteName}</span>
                <span className="block text-[9px] tracking-[.2em] mt-1" style={{ color: 'var(--text3)' }}>
                  {settings?.site_name_en || 'N ONE'}
                </span>
              </span>
            </Link>
            <p className="max-w-md text-sm leading-7" style={{ color: 'var(--text3)' }}>
              {settings?.tagline || 'خرید آنلاین با ضمانت اصالت کالا، ارسال سریع و پرداخت امن.'}
            </p>

            <div className="mt-6 grid gap-3 text-sm" style={{ color: 'var(--text3)' }}>
              {settings?.phone && (
                <a href={`tel:${settings.phone}`} className="flex items-center gap-3 hover:text-[var(--primary)]">
                  <Phone className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                  <span dir="ltr">{settings.phone}</span>
                </a>
              )}
              {settings?.email && (
                <a href={`mailto:${settings.email}`} className="flex items-center gap-3 hover:text-[var(--primary)]">
                  <Mail className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                  <span dir="ltr">{settings.email}</span>
                </a>
              )}
              {settings?.address && (
                <span className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 shrink-0 mt-1" style={{ color: 'var(--primary)' }} />
                  {settings.address}
                </span>
              )}
              {settings?.working_hours && (
                <span className="flex items-center gap-3">
                  <Clock className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                  {settings.working_hours}
                </span>
              )}
            </div>

            {socialLinks.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2.5">
                {socialLinks.map(({ label, href, Icon }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    aria-label={label}
                    title={label}
                    className="grid w-10 h-10 place-items-center rounded-xl border transition-colors hover:text-[var(--primary)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-10">
            <div>
              <h3 className="text-sm font-black mb-5">دسترسی سریع</h3>
              <div className="grid gap-3">
                {footerLinks.map(({ to, label }) => (
                  <Link
                    key={`${to}-${label}`}
                    to={to}
                    className="text-sm transition-colors hover:text-[var(--primary)]"
                    style={{ color: 'var(--text3)' }}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black mb-5">راهنما</h3>
              <div className="grid gap-3">
                {footerPages.map((page) => (
                  <Link
                    key={page.slug}
                    to={`/page/${page.slug}`}
                    className="text-sm transition-colors hover:text-[var(--primary)]"
                    style={{ color: 'var(--text3)' }}
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-black mb-5">خدمات {siteName}</h3>
              <div className="grid gap-3">
                {[
                  { icon: ShieldCheck, text: 'ضمانت اصالت و سلامت کالا' },
                  { icon: FileCheck2, text: 'نمایش شفاف قیمت و موجودی' },
                  {
                    icon: PackageSearch,
                    text: settings
                      ? `ارسال رایگان از ${formatPrice(settings.free_shipping_threshold)}`
                      : 'پیگیری سفارش در حساب کاربری',
                  },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text3)' }}>
                    <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
                    {text}
                  </div>
                ))}
                <Link to="/#size-guide" className="mt-2 inline-flex items-center gap-1.5 text-sm font-bold"
                      style={{ color: 'var(--primary)' }}>
                  راهنمای انتخاب سایز <ArrowUpLeft className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        <TrustBadges />

        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t text-xs"
          style={{ borderColor: 'var(--border)', color: 'var(--text3)' }}
        >
          <span>
            © {year} {siteName} — تمام حقوق محفوظ است.
            {settings?.legal_owner && ` | ${settings.legal_owner}`}
          </span>
          <span className="flex items-center gap-1.5">
            ساخته‌شده برای یک خرید بهتر
            <Heart className="w-3.5 h-3.5 fill-[var(--primary)] text-[var(--primary)]" />
          </span>
        </div>
      </div>
    </footer>
  )
}

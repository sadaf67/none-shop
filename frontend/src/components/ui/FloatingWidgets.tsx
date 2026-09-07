import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronUp, Clock, Headphones, HelpCircle, Mail, PackageSearch, Phone, Search, ShoppingBag, X } from 'lucide-react'
import { useSiteSettings } from '@/hooks/useSiteSettings'

/** لینک‌های داخلی همیشگی؛ راه‌های تماس از تنظیمات پنل مدیر می‌آید. */
const QUICK_LINKS = [
  { icon: Search, label: 'جست‌وجوی محصول', detail: 'بر اساس برند یا دسته‌بندی', to: '/products' },
  { icon: ShoppingBag, label: 'سبد خرید', detail: 'ادامه مسیر سفارش', to: '/cart' },
  { icon: PackageSearch, label: 'پیگیری سفارش', detail: 'وضعیت سفارش‌های شما', to: '/orders' },
  { icon: HelpCircle, label: 'سؤالات متداول', detail: 'پاسخ پرسش‌های رایج', to: '/faq' },
]

function SupportWidget() {
  const [open, setOpen] = useState(false)
  const { settings } = useSiteSettings()

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open])

  const phone = settings?.phone?.trim()
  const email = settings?.email?.trim()
  const workingHours = settings?.working_hours?.trim()

  return (
    <div className="flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: .92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .94, y: 10 }}
            transition={{ type: 'spring', stiffness: 390, damping: 30 }}
            className="w-[min(300px,calc(100vw-2rem))] overflow-hidden rounded-[24px] border shadow-2xl backdrop-blur-2xl"
            style={{ background: 'var(--glass-bg)', borderColor: 'var(--border-accent)' }}
            role="dialog"
            aria-label="راهنما و پشتیبانی"
          >
            <div
              className="flex items-start justify-between gap-4 px-4 py-4 border-b"
              style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--primary) 8%, transparent)' }}
            >
              <div>
                <p className="text-sm font-black">راهنما و پشتیبانی</p>
                <p className="mt-1 text-[11px]" style={{ color: 'var(--text3)' }}>
                  {workingHours || 'همراه شما در مسیر خرید'}
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="icon-surface !w-8 !h-8" aria-label="بستن راهنما">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-2">
              {QUICK_LINKS.map(({ icon: Icon, label, detail, to }) => (
                <Link key={to} to={to} onClick={() => setOpen(false)} className="group flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-[var(--glass-bg2)]">
                  <span className="grid w-10 h-10 shrink-0 place-items-center rounded-[13px] bg-[var(--primary)] text-white"><Icon className="w-4 h-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-black">{label}</span>
                    <span className="mt-1 block text-[10px]" style={{ color: 'var(--text3)' }}>{detail}</span>
                  </span>
                  <span className="text-xs transition-transform group-hover:-translate-x-1" style={{ color: 'var(--primary)' }}>←</span>
                </Link>
              ))}
            </div>

            {(phone || email) && (
              <div className="border-t px-4 py-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
                {phone && (
                  <a href={`tel:${phone}`} className="flex items-center gap-2 text-[11px] font-bold" style={{ color: 'var(--text2)' }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    <span dir="ltr">{phone}</span>
                  </a>
                )}
                {email && (
                  <a href={`mailto:${email}`} className="flex items-center gap-2 text-[11px] font-bold" style={{ color: 'var(--text2)' }}>
                    <Mail className="w-3.5 h-3.5" style={{ color: 'var(--primary)' }} />
                    <span dir="ltr">{email}</span>
                  </a>
                )}
                {workingHours && (
                  <p className="flex items-center gap-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-3.5 h-3.5" />
                    {workingHours}
                  </p>
                )}
              </div>
            )}

            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="block border-t px-4 py-3 text-center text-[11px] font-black"
              style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
            >
              ارسال پیام به پشتیبانی
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((value) => !value)}
        whileTap={{ scale: .94 }}
        className="relative grid w-12 h-12 place-items-center rounded-[17px] text-white shadow-[0_12px_34px_rgba(255,107,61,.32)]"
        style={{ background: 'linear-gradient(145deg, var(--primary-light), var(--primary-dark))' }}
        aria-label={open ? 'بستن راهنمای خرید' : 'باز کردن راهنمای خرید'}
        aria-expanded={open}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open
            ? <motion.span key="close" initial={{ rotate: -70, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 70, opacity: 0 }}><ChevronUp className="w-5 h-5" /></motion.span>
            : <motion.span key="guide" initial={{ rotate: 70, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -70, opacity: 0 }}><Headphones className="w-5 h-5" /></motion.span>}
        </AnimatePresence>
      </motion.button>
    </div>
  )
}

export default function FloatingWidgets() {
  return (
    <div className="fixed bottom-4 left-4 md:bottom-6 md:left-5 z-50 flex flex-col items-end gap-3" style={{ direction: 'rtl' }}>
      <SupportWidget />
    </div>
  )
}

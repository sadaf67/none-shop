import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, HelpCircle, MessageCircle, Search } from 'lucide-react'
import { settingsApi } from '@/api/settings'
import PageTransition from '@/components/ui/PageTransition'
import Loader from '@/components/brand/Loader'
import usePageMeta from '@/hooks/usePageMeta'
import useJsonLd from '@/hooks/useJsonLd'
import type { Faq as FaqItem } from '@/types/settings'

export default function Faq() {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<number | null>(null)

  usePageMeta({
    title: 'پرسش‌های متداول',
    description: 'پاسخ پرسش‌های رایج درباره سفارش، ارسال، پرداخت و مرجوعی کالا.',
  })

  const { data = [], isLoading } = useQuery({
    queryKey: ['faqs'],
    queryFn: settingsApi.getFaqs,
    staleTime: 1000 * 60 * 10,
  })

  // FAQPage باعث می‌شود پرسش‌ها به‌صورت آکاردئون زیر نتیجهٔ گوگل دیده شوند.
  // پاسخ‌ها HTML هستند (در بک‌اند هنگام ذخیره پاک‌سازی می‌شوند)؛ اینجا تگ‌ها
  // حذف می‌شوند چون گوگل در acceptedAnswer متن ساده می‌خواهد.
  useJsonLd(
    'faq',
    data.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: data.map((item: FaqItem) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: String(item.answer || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
            },
          })),
        }
      : null,
  )

  const groups = useMemo(() => {
    const term = query.trim().toLowerCase()
    const filtered = term
      ? data.filter(
          (item) =>
            item.question.toLowerCase().includes(term) || item.answer.toLowerCase().includes(term),
        )
      : data
    const map = new Map<string, FaqItem[]>()
    for (const item of filtered) {
      const key = item.group || 'عمومی'
      const bucket = map.get(key)
      if (bucket) bucket.push(item)
      else map.set(key, [item])
    }
    return [...map.entries()]
  }, [data, query])

  return (
    <PageTransition>
      <div className="pt-20 min-h-screen">
        <header className="border-b py-10 px-4" style={{ borderColor: 'var(--border)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center"
                style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
              >
                <HelpCircle className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text1)' }}>
                پرسش‌های متداول
              </h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              پاسخ سریع پرسش‌های رایج درباره خرید، ارسال و پشتیبانی
            </p>

            <div className="relative mt-6">
              <Search
                className="absolute top-1/2 -translate-y-1/2 right-4 w-4 h-4 pointer-events-none"
                style={{ color: 'var(--text4)' }}
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="جست‌وجو در پرسش‌ها…"
                aria-label="جست‌وجو در پرسش‌های متداول"
                className="input-field w-full !pr-11"
              />
            </div>
          </div>
        </header>

        <div className="max-w-3xl mx-auto px-4 py-8">
          {isLoading ? (
            <div className="py-16 flex justify-center">
              <Loader label="در حال دریافت پرسش‌ها" />
            </div>
          ) : groups.length === 0 ? (
            <EmptyState hasQuery={!!query.trim()} />
          ) : (
            <div className="space-y-8">
              {groups.map(([group, items]) => (
                <section key={group}>
                  <h2
                    className="text-sm font-bold mb-3 px-1"
                    style={{ color: 'var(--primary)' }}
                  >
                    {group}
                  </h2>
                  <div className="space-y-3">
                    {items.map((item) => (
                      <FaqRow
                        key={item.id}
                        item={item}
                        isOpen={openId === item.id}
                        onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}

          <div
            className="glass rounded-2xl border p-6 mt-10 text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <MessageCircle className="w-7 h-7 mx-auto mb-3" style={{ color: 'var(--primary)' }} />
            <h3 className="font-bold mb-1" style={{ color: 'var(--text1)' }}>
              پاسخ خود را پیدا نکردید؟
            </h3>
            <p className="text-sm mb-5" style={{ color: 'var(--text3)' }}>
              پیام بگذارید؛ کارشناسان ما در اولین فرصت پاسخ می‌دهند.
            </p>
            <Link to="/contact" className="btn-primary inline-flex">
              تماس با ما
            </Link>
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

function FaqRow({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem
  isOpen: boolean
  onToggle: () => void
}) {
  const panelId = `faq-panel-${item.id}`
  const buttonId = `faq-button-${item.id}`

  return (
    <div className="glass rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <h3>
        <button
          type="button"
          id={buttonId}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={onToggle}
          className="w-full flex items-center justify-between gap-3 p-4 text-right"
        >
          <span className="font-semibold text-sm leading-relaxed" style={{ color: 'var(--text1)' }}>
            {item.question}
          </span>
          <ChevronDown
            className={`w-4 h-4 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--primary)' }}
            aria-hidden
          />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={panelId}
            role="region"
            aria-labelledby={buttonId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div
              className="cms-content px-4 pb-4 text-sm leading-loose"
              style={{ color: 'var(--text3)' }}
              // پاسخ‌ها در بک‌اند پاک‌سازی می‌شوند (core/sanitizers.py)
              dangerouslySetInnerHTML={{ __html: item.answer }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EmptyState({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="py-20 text-center">
      <HelpCircle className="w-12 h-12 mx-auto mb-4 opacity-30" style={{ color: 'var(--text3)' }} />
      <p style={{ color: 'var(--text3)' }}>
        {hasQuery ? 'پرسشی با این عبارت پیدا نشد.' : 'هنوز پرسشی ثبت نشده است.'}
      </p>
    </div>
  )
}

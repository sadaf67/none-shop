import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, ImageOff, PackageSearch, RefreshCw } from 'lucide-react'

import { getOrders } from '@/api/cart'
import PageTransition from '@/components/ui/PageTransition'
import { formatDate, formatPrice } from '@/utils/format'

const STATUS_STYLES: Record<string, { label: string; color: string; background: string }> = {
  pending: { label: 'در انتظار پرداخت', color: '#f59e0b', background: 'rgba(245,158,11,.12)' },
  paid: { label: 'پرداخت‌شده', color: '#10b981', background: 'rgba(16,185,129,.12)' },
  processing: { label: 'در حال آماده‌سازی', color: '#38bdf8', background: 'rgba(56,189,248,.12)' },
  shipped: { label: 'ارسال‌شده', color: '#818cf8', background: 'rgba(129,140,248,.12)' },
  delivered: { label: 'تحویل‌شده', color: '#22c55e', background: 'rgba(34,197,94,.12)' },
  cancelled: { label: 'لغوشده', color: '#ef4444', background: 'rgba(239,68,68,.12)' },
  refunded: { label: 'وجه بازگشت داده شده', color: '#a78bfa', background: 'rgba(167,139,250,.12)' },
}

export default function Orders() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['orders', page],
    queryFn: () => getOrders(page),
  })
  const orders = Array.isArray(data) ? data : data?.results || []

  return (
    <PageTransition>
      <main className="pt-24 min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <span className="editorial-kicker">حساب کاربری</span>
              <h1 className="mt-3 text-3xl md:text-4xl font-black">سفارش‌های من</h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--text3)' }}>وضعیت ثبت، پرداخت و ارسال سفارش‌ها را اینجا ببینید.</p>
            </div>
            <button type="button" onClick={() => refetch()} className="icon-surface" aria-label="به‌روزرسانی سفارش‌ها">
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="grid gap-4" role="status">
              {[1, 2, 3].map(item => <div key={item} className="h-44 rounded-3xl skeleton" />)}
            </div>
          ) : isError ? (
            <div className="glass rounded-3xl p-10 text-center border" style={{ borderColor: 'var(--border)' }}>
              <p className="font-bold">دریافت سفارش‌ها انجام نشد.</p>
              <button type="button" onClick={() => refetch()} className="btn-primary mt-5">تلاش دوباره</button>
            </div>
          ) : orders.length === 0 ? (
            <div className="glass rounded-3xl p-10 md:p-16 text-center border" style={{ borderColor: 'var(--border)' }}>
              <PackageSearch className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
              <h2 className="text-xl font-black">هنوز سفارشی ثبت نشده است</h2>
              <p className="mt-2 text-sm" style={{ color: 'var(--text3)' }}>پس از ثبت سفارش، وضعیت آن در این صفحه نمایش داده می‌شود.</p>
              <Link to="/products" className="btn-primary inline-flex mt-6">دیدن محصولات</Link>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order: any) => {
                const status = STATUS_STYLES[order.status] || {
                  label: order.status_display || order.status,
                  color: 'var(--text2)',
                  background: 'var(--glass-bg2)',
                }
                return (
                  <article key={order.id} className="glass rounded-3xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
                    <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--text3)' }}>شماره سفارش</p>
                        <p className="mt-1 font-black tracking-wider">{order.order_number}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs" style={{ color: 'var(--text3)' }}>{formatDate(order.created_at)}</span>
                        <span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ color: status.color, background: status.background }}>
                          {status.label}
                        </span>
                      </div>
                    </header>

                    <div className="p-5">
                      <div className="flex flex-wrap gap-3">
                        {order.items?.map((item: any) => (
                          <div key={item.id} className="flex min-w-0 flex-1 basis-64 gap-3 rounded-2xl p-3" style={{ background: 'var(--glass-bg2)' }}>
                            <div className="w-14 h-14 shrink-0 rounded-xl overflow-hidden" style={{ background: 'var(--surface3)' }}>
                              {item.product_image
                                ? <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                                : <span className="grid w-full h-full place-items-center"><ImageOff className="w-5 h-5" /></span>}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold">{item.product_name}</p>
                              {item.variant_label && <p className="mt-1 text-xs" style={{ color: 'var(--text3)' }}>{item.variant_label}</p>}
                              <p className="mt-1 text-xs" style={{ color: 'var(--text3)' }}>{item.quantity} عدد · {formatPrice(item.total_price)}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                        <div className="text-sm" style={{ color: 'var(--text3)' }}>
                          {order.tracking_code ? <>کد رهگیری: <strong style={{ color: 'var(--text1)' }}>{order.tracking_code}</strong></> : 'کد رهگیری پس از ارسال ثبت می‌شود.'}
                        </div>
                        <div className="font-black">مبلغ کل: <span style={{ color: 'var(--primary)' }}>{formatPrice(order.total)}</span></div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}

          {!Array.isArray(data) && orders.length > 0 && (data?.previous || data?.next) && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button type="button" disabled={!data.previous} onClick={() => setPage(value => Math.max(1, value - 1))} className="btn-ghost disabled:opacity-35">
                <ChevronRight className="w-4 h-4" /> قبلی
              </button>
              <span className="text-sm" style={{ color: 'var(--text3)' }}>صفحه {page.toLocaleString('fa-IR')}</span>
              <button type="button" disabled={!data.next} onClick={() => setPage(value => value + 1)} className="btn-ghost disabled:opacity-35">
                بعدی <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </PageTransition>
  )
}

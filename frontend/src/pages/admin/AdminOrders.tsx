import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminOrders, updateOrderStatus } from '@/api/admin'
import { formatPrice } from '@/utils/format'
import { motion } from 'framer-motion'
import { ChevronDown, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_OPTS = [
  { value: '', label: 'همه وضعیت‌ها' },
  { value: 'pending',    label: 'در انتظار پرداخت' },
  { value: 'paid',       label: 'پرداخت شده' },
  { value: 'processing', label: 'در پردازش' },
  { value: 'shipped',    label: 'ارسال شده' },
  { value: 'delivered',  label: 'تحویل داده شده' },
  { value: 'cancelled',  label: 'لغو شده' },
  { value: 'refunded',   label: 'بازگشت وجه' },
]

const STATUS_COLOR: Record<string, string> = {
  pending:    'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  paid:       'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  shipped:    'text-violet-400 bg-violet-400/10 border-violet-400/20',
  delivered:  'text-teal-400 bg-teal-400/10 border-teal-400/20',
  cancelled:  'text-red-400 bg-red-400/10 border-red-400/20',
  refunded:   'text-orange-400 bg-orange-400/10 border-orange-400/20',
}

const NEXT_STATUSES: Record<string, string[]> = {
  pending: ['cancelled'],
  paid: ['processing', 'refunded'],
  processing: ['shipped', 'refunded'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
}

export default function AdminOrders() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [trackingCodes, setTrackingCodes] = useState<Record<string, string>>({})

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-orders', statusFilter, page],
    queryFn: () => getAdminOrders(statusFilter || undefined, page),
  })
  const orders = Array.isArray(data) ? data : data?.results || []

  const statusMutation = useMutation({
    mutationFn: ({ id, status, trackingCode }: { id: string; status: string; trackingCode?: string }) => updateOrderStatus(
      id,
      status,
      {
        tracking_code: trackingCode,
        refund_confirmed: status === 'refunded' ? true : undefined,
      },
    ),
    onSuccess: () => {
      toast.success('وضعیت سفارش بروز شد')
      qc.invalidateQueries({ queryKey: ['admin-orders'] })
      qc.invalidateQueries({ queryKey: ['sales-report'] })
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'خطا در بروزرسانی'),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">مدیریت سفارشات</h1>
          <p className="text-gray-600 text-sm">{orders.length} سفارش</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              className="input-field !w-auto !py-2 pr-4 pl-8 text-sm cursor-pointer appearance-none">
              {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
          </div>
          <button onClick={() => refetch()}
            className="btn-ghost !py-2 !px-4 flex items-center gap-2 text-sm">
            <RefreshCw className="w-3.5 h-3.5" />
            بروزرسانی
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass rounded-2xl h-20 animate-pulse border border-white/6" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass rounded-2xl py-20 text-center border border-white/6">
          <p className="text-gray-600">سفارشی یافت نشد</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <motion.div key={order.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="glass rounded-2xl border border-white/6 overflow-hidden">
              {/* Row */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-white/3 transition-colors flex-wrap"
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}>
                <div className="font-mono text-xs text-gray-500 w-28 flex-shrink-0">#{order.order_number}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-200">{order.receiver_name}</div>
                  <div className="text-xs text-gray-600">{order.receiver_phone}</div>
                </div>
                <div className="font-black text-emerald-400 text-sm whitespace-nowrap">{formatPrice(order.total)}</div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-xl border whitespace-nowrap ${STATUS_COLOR[order.status] || 'text-gray-400 bg-white/5 border-white/10'}`}>
                  {STATUS_OPTS.find(s => s.value === order.status)?.label || order.status}
                </span>
                <div className="text-xs text-gray-700 whitespace-nowrap hidden sm:block">
                  {new Date(order.created_at).toLocaleDateString('fa-IR')}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform flex-shrink-0 ${expandedId === order.id ? 'rotate-180' : ''}`} />
              </div>

              {/* Expanded */}
              {expandedId === order.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/6 px-5 py-5 space-y-5">

                  <div className="grid sm:grid-cols-2 gap-5">
                    {/* آدرس */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">آدرس تحویل</h4>
                      <div className="text-sm text-gray-400 space-y-0.5">
                        <div>{order.province}، {order.city}</div>
                        <div>{order.street}</div>
                        <div className="text-gray-600">کد پستی: {order.postal_code}</div>
                      </div>
                    </div>

                    {/* تغییر وضعیت */}
                    <div>
                      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">تغییر وضعیت</h4>
                      {order.status === 'processing' && (
                        <input
                          value={trackingCodes[order.id] || ''}
                          onChange={event => setTrackingCodes(current => ({ ...current, [order.id]: event.target.value }))}
                          placeholder="کد رهگیری ارسال"
                          className="input-field !py-2 text-sm mb-2"
                        />
                      )}
                      <div className="relative">
                        <select
                          value={order.status}
                          onChange={event => {
                            const nextStatus = event.target.value
                            const trackingCode = trackingCodes[order.id]?.trim()
                            if (nextStatus === 'shipped' && !trackingCode) {
                              toast.error('ابتدا کد رهگیری ارسال را وارد کنید')
                              return
                            }
                            if (nextStatus === 'refunded' && !window.confirm('بازگشت وجه را در درگاه انجام داده‌اید؟ این تأیید فقط وضعیت داخلی سفارش را تغییر می‌دهد.')) return
                            statusMutation.mutate({ id: order.id, status: nextStatus, trackingCode })
                          }}
                          disabled={statusMutation.isPending || !(NEXT_STATUSES[order.status]?.length)}
                          className="input-field !py-2 pr-4 pl-8 text-sm cursor-pointer appearance-none disabled:opacity-50">
                          {STATUS_OPTS.filter(o => o.value === order.status || NEXT_STATUSES[order.status]?.includes(o.value)).map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* آیتم‌های سفارش */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">محصولات</h4>
                    <div className="space-y-2">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-3 bg-white/3 rounded-xl px-4 py-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-gray-300 truncate">{item.product_name}</div>
                            <div className="text-xs text-gray-600">{item.variant_label || item.product_sku}</div>
                          </div>
                          <div className="text-xs text-gray-500">×{item.quantity}</div>
                          <div className="text-sm font-bold text-emerald-400 whitespace-nowrap">{formatPrice(item.total_price)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* خلاصه قیمت */}
                  <div className="glass rounded-xl px-5 py-4 border border-white/5 text-sm space-y-2">
                    <div className="flex justify-between text-gray-500">
                      <span>جمع کالاها</span><span>{formatPrice(order.subtotal)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex justify-between text-emerald-400">
                        <span>تخفیف</span><span>- {formatPrice(order.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-500">
                      <span>هزینه ارسال</span>
                      <span>{order.shipping_cost > 0 ? formatPrice(order.shipping_cost) : 'رایگان'}</span>
                    </div>
                    <div className="flex justify-between font-black text-base pt-2 border-t border-white/8">
                      <span className="text-gray-200">مبلغ نهایی</span>
                      <span className="text-emerald-400">{formatPrice(order.total)}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {!Array.isArray(data) && (data?.previous || data?.next) && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button type="button" disabled={!data.previous} onClick={() => setPage(value => Math.max(1, value - 1))} className="btn-ghost text-xs disabled:opacity-35">صفحه قبل</button>
          <span className="text-xs text-gray-500">صفحه {page.toLocaleString('fa-IR')}</span>
          <button type="button" disabled={!data.next} onClick={() => setPage(value => value + 1)} className="btn-ghost text-xs disabled:opacity-35">صفحه بعد</button>
        </div>
      )}
    </div>
  )
}

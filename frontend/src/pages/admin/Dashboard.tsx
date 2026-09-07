import type { ComponentType } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle, CheckCircle, Clock, MessageSquare, Package, Plus,
  Settings, ShoppingBag, Star, TrendingUp, Truck, Users, XCircle,
} from 'lucide-react'
import { AdminPage, AdminSection, DataTable, ErrorBlock, LoadingBlock, StatCard } from '@/components/admin/AdminUI'
import { getCatalogStats, getCustomerStats, getReviewStats, getSalesReport } from '@/api/admin'
import { formatPrice } from '@/utils/format'

const STATUS_LABEL: Record<string, string> = {
  pending: 'در انتظار پرداخت',
  paid: 'پرداخت شده',
  processing: 'در پردازش',
  shipped: 'ارسال شده',
  delivered: 'تحویل داده شده',
  cancelled: 'لغو شده',
  refunded: 'بازگشت وجه',
}

const STATUS_ICON: Record<string, ComponentType<any>> = {
  pending: Clock, paid: CheckCircle, processing: Package,
  shipped: Truck, delivered: CheckCircle, cancelled: XCircle, refunded: XCircle,
}

const QUICK_LINKS = [
  { to: '/admin/products', icon: Plus, label: 'افزودن محصول' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'سفارش‌های امروز' },
  { to: '/admin/reviews', icon: Star, label: 'بررسی نظرات' },
  { to: '/admin/messages', icon: MessageSquare, label: 'پیام‌های مشتریان' },
  { to: '/admin/settings', icon: Settings, label: 'تنظیمات سایت' },
]

const faNumber = (value: any) => Number(value ?? 0).toLocaleString('fa-IR')

export default function Dashboard() {
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['sales-report'], queryFn: getSalesReport })
  const { data: catalog } = useQuery({ queryKey: ['admin-catalog-stats'], queryFn: getCatalogStats })
  const { data: reviews } = useQuery({ queryKey: ['admin-review-stats'], queryFn: getReviewStats })
  const { data: customers } = useQuery({ queryKey: ['admin-customer-stats'], queryFn: getCustomerStats })

  if (isLoading) return <AdminPage title="داشبورد"><LoadingBlock /></AdminPage>
  if (isError || !data) return <AdminPage title="داشبورد"><ErrorBlock onRetry={() => refetch()} /></AdminPage>

  const summary = data.summary ?? {}
  const dailyRevenue: any[] = data.daily_revenue ?? []
  const topProducts: any[] = data.top_products ?? []
  const recentOrders: any[] = data.recent_orders ?? []
  const statusBreakdown: any[] = data.status_breakdown ?? []
  const maxRevenue = Math.max(...dailyRevenue.map((item) => Number(item.revenue)), 1)

  // نکته‌هایی که مدیر باید همین حالا ببیند.
  const alerts = [
    reviews?.pending > 0 && { to: '/admin/reviews', text: `${faNumber(reviews.pending)} نظر در انتظار تأیید است.` },
    catalog?.out_of_stock > 0 && { to: '/admin/products?stock_state=out', text: `${faNumber(catalog.out_of_stock)} محصول ناموجود است.` },
    catalog?.low_stock > 0 && { to: '/admin/products?stock_state=low', text: `${faNumber(catalog.low_stock)} محصول رو به اتمام است.` },
    summary.pending_orders > 0 && { to: '/admin/orders', text: `${faNumber(summary.pending_orders)} سفارش در انتظار پرداخت است.` },
  ].filter(Boolean) as { to: string; text: string }[]

  return (
    <AdminPage
      title="داشبورد"
      description="نمای کلی فروش، کاتالوگ و مشتریان فروشگاه."
      actions={
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.slice(0, 2).map(({ to, icon: Icon, label }) => (
            <Link key={to} to={to} className="btn-ghost !min-h-9 !py-1.5 !px-3 !text-xs">
              <Icon className="w-3.5 h-3.5" /> {label}
            </Link>
          ))}
        </div>
      }
    >
      {alerts.length > 0 && (
        <div className="admin-bulkbar">
          <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: '#f0a92a' }} aria-hidden />
          <strong>نیازمند توجه شما</strong>
          {alerts.map((alert) => (
            <Link key={alert.to + alert.text} to={alert.to} className="btn-ghost !min-h-8 !py-1 !px-3 !text-[11px]">
              {alert.text}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="درآمد کل" value={formatPrice(summary.total_revenue ?? 0)} hint="از ابتدا تا کنون" tone="success" />
        <StatCard label="درآمد ۳۰ روز اخیر" value={formatPrice(summary.revenue_30d ?? 0)} hint={`${faNumber(summary.orders_30d)} سفارش`} />
        <StatCard label="سفارش‌ها" value={faNumber(summary.total_orders)} hint={`${faNumber(summary.paid_orders)} پرداخت‌شده`} />
        <StatCard label="مشتریان" value={faNumber(summary.total_customers ?? customers?.total)} hint={`${faNumber(summary.new_customers_30d ?? customers?.new_last_30_days)} نفر در ۳۰ روز اخیر`} />
        <StatCard label="محصولات فعال" value={faNumber(catalog?.active ?? catalog?.total)} hint={`از ${faNumber(catalog?.total)} محصول`} />
        <StatCard label="ناموجود" value={faNumber(catalog?.out_of_stock)} tone={catalog?.out_of_stock ? 'danger' : 'default'} />
        <StatCard label="نظرهای در انتظار" value={faNumber(reviews?.pending)} tone={reviews?.pending ? 'warning' : 'default'} />
        <StatCard label="سفارش‌های لغوشده" value={faNumber(summary.cancelled_orders)} tone={summary.cancelled_orders ? 'danger' : 'default'} />
      </div>

      <AdminSection icon={<TrendingUp />} title="درآمد روزانه" description="سی روز گذشته؛ برای دیدن مبلغ دقیق روی هر ستون بایستید.">
        {dailyRevenue.length === 0 ? (
          <p className="form-hint">هنوز فروشی ثبت نشده است.</p>
        ) : (
          <div className="admin-chart" role="img" aria-label="نمودار درآمد روزانه سی روز گذشته">
            {dailyRevenue.map((item, index) => (
              <div key={index} className="admin-chart__col" title={`${formatPrice(item.revenue)} — ${faNumber(item.count)} سفارش`}>
                <span className="admin-chart__bar" style={{ height: `${Math.max((Number(item.revenue) / maxRevenue) * 100, 2)}%` }} />
                <span className="admin-chart__label">{String(item.day ?? '').slice(5)}</span>
              </div>
            ))}
          </div>
        )}
      </AdminSection>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSection icon={<Package />} title="پرفروش‌ترین محصولات" description="بر اساس تعداد فروش در همه سفارش‌های پرداخت‌شده.">
          {topProducts.length === 0 ? (
            <p className="form-hint">داده‌ای برای نمایش وجود ندارد.</p>
          ) : (
            <ol className="flex flex-col gap-3">
              {topProducts.map((item, index) => (
                <li key={index} className="flex items-center gap-3">
                  <span className="admin-rank">{faNumber(index + 1)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold truncate" style={{ color: 'var(--text1)' }}>{item.product_name}</div>
                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{faNumber(item.total_qty)} عدد فروخته شده</div>
                  </div>
                  <strong className="text-xs whitespace-nowrap" style={{ color: '#34c77b' }}>{formatPrice(item.total_revenue)}</strong>
                </li>
              ))}
            </ol>
          )}
        </AdminSection>

        <AdminSection icon={<ShoppingBag />} title="وضعیت سفارش‌ها" description="توزیع سفارش‌ها بر اساس مرحله فعلی.">
          {statusBreakdown.length === 0 ? (
            <p className="form-hint">سفارشی ثبت نشده است.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {statusBreakdown.map((item) => {
                const Icon = STATUS_ICON[item.status] ?? Clock
                const total = Number(summary.total_orders ?? 0)
                const percent = total > 0 ? Math.round((item.count / total) * 100) : 0
                return (
                  <li key={item.status} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} aria-hidden />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1 text-[11px] font-bold">
                        <span style={{ color: 'var(--text2)' }}>{STATUS_LABEL[item.status] ?? item.status}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{faNumber(item.count)} ({faNumber(percent)}٪)</span>
                      </div>
                      <div className="admin-progress"><span style={{ width: `${percent}%` }} /></div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </AdminSection>
      </div>

      <AdminSection icon={<Clock />} title="آخرین سفارش‌ها" description="برای تغییر وضعیت به صفحه سفارش‌ها بروید.">
        {recentOrders.length === 0 ? (
          <p className="form-hint">سفارشی ثبت نشده است.</p>
        ) : (
          <DataTable headers={['شماره سفارش', 'مشتری', 'مبلغ', 'وضعیت', 'تاریخ']}>
            {recentOrders.map((order: any) => (
              <tr key={order.id}>
                <td dir="ltr" style={{ fontFamily: 'monospace', fontSize: '.72rem' }}>{order.order_number}</td>
                <td>{order.receiver_name}</td>
                <td style={{ fontWeight: 800, color: '#34c77b', whiteSpace: 'nowrap' }}>{formatPrice(order.total)}</td>
                <td>{STATUS_LABEL[order.status] ?? order.status}</td>
                <td>{new Date(order.created_at).toLocaleDateString('fa-IR')}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </AdminSection>

      <nav className="admin-quicklinks" aria-label="میان‌برهای پنل">
        {QUICK_LINKS.map(({ to, icon: Icon, label }) => (
          <Link key={to} to={to} className="admin-quicklink">
            <Icon className="w-4 h-4" aria-hidden />
            {label}
          </Link>
        ))}
      </nav>
    </AdminPage>
  )
}

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Power, Search, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  AdminPage, Badge, DataTable, EmptyState, ErrorBlock, LoadingBlock, Modal, StatCard,
} from '@/components/admin/AdminUI'
import { adminCustomers, asList, getCustomerStats, toggleCustomerActive } from '@/api/admin'

const SEGMENTS = [
  { value: '', label: 'همه مشتریان' },
  { value: 'buyers', label: 'خریدار (حداقل یک سفارش)' },
  { value: 'loyal', label: 'وفادار (۳ سفارش یا بیشتر)' },
  { value: 'leads', label: 'بدون خرید' },
]

const formatToman = (value: any) => `${Number(value ?? 0).toLocaleString('fa-IR')} تومان`

export default function AdminCustomers() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState('')
  const [page, setPage] = useState(1)
  const [detailId, setDetailId] = useState<number | null>(null)

  const params = { search: search || undefined, segment: segment || undefined, page }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-customers', params],
    queryFn: () => adminCustomers.list(params),
  })
  const { data: stats } = useQuery({ queryKey: ['admin-customer-stats'], queryFn: getCustomerStats })
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-customer', detailId],
    queryFn: () => adminCustomers.get(detailId as number),
    enabled: detailId !== null,
  })

  const rows = asList<any>(data)
  const hasNext = !Array.isArray(data) && !!data?.next

  const toggleMutation = useMutation({
    mutationFn: (id: number) => toggleCustomerActive(id),
    onSuccess: (result: any) => {
      toast.success(result?.is_active ? 'حساب فعال شد.' : 'حساب غیرفعال شد.')
      queryClient.invalidateQueries({ queryKey: ['admin-customers'] })
      queryClient.invalidateQueries({ queryKey: ['admin-customer-stats'] })
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'تغییر وضعیت انجام نشد.'),
  })

  return (
    <AdminPage title="مشتریان" description="فهرست کاربران فروشگاه به همراه سابقه خرید و ارزش هر مشتری.">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="کل مشتریان" value={Number(stats?.total ?? 0).toLocaleString('fa-IR')} />
        <StatCard label="خریدار" value={Number(stats?.buyers ?? 0).toLocaleString('fa-IR')} tone="success" />
        <StatCard label="تأیید موبایل" value={Number(stats?.verified ?? 0).toLocaleString('fa-IR')} />
        <StatCard label="ثبت‌نام ۳۰ روز اخیر" value={Number(stats?.new_last_30_days ?? 0).toLocaleString('fa-IR')} tone="success" />
      </div>

      <div className="admin-toolbar">
        <label className="admin-search">
          <Search aria-hidden />
          <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            placeholder="جست‌وجو با نام، موبایل یا ایمیل…" aria-label="جست‌وجوی مشتری" />
        </label>
        <select className="admin-filter-select" aria-label="دسته مشتری" value={segment}
          onChange={(event) => { setSegment(event.target.value); setPage(1) }}>
          {SEGMENTS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingBlock />
        : isError ? <ErrorBlock onRetry={() => refetch()} />
        : rows.length === 0 ? <EmptyState title="مشتری یافت نشد" description="با تغییر جست‌وجو یا فیلتر دوباره تلاش کنید." />
        : (
          <>
            <DataTable headers={['نام', 'موبایل', 'ایمیل', 'سفارش‌ها', 'مبلغ خرید', 'آخرین سفارش', 'وضعیت', 'عملیات']}>
              {rows.map((row: any) => (
                <tr key={row.id}>
                  <td>
                    <button type="button" onClick={() => setDetailId(row.id)}
                      style={{ color: 'var(--text1)', fontWeight: 800 }}>
                      {row.full_name || row.username}
                    </button>
                  </td>
                  <td dir="ltr">{row.phone || '—'}</td>
                  <td dir="ltr">{row.email || '—'}</td>
                  <td>
                    {Number(row.paid_orders_count ?? 0).toLocaleString('fa-IR')}
                    <span style={{ color: 'var(--text-muted)' }}> / {Number(row.orders_count ?? 0).toLocaleString('fa-IR')}</span>
                  </td>
                  <td>{formatToman(row.total_spent)}</td>
                  <td>{row.last_order_at ? new Date(row.last_order_at).toLocaleDateString('fa-IR') : '—'}</td>
                  <td>
                    {row.is_active
                      ? <Badge tone="success">فعال</Badge>
                      : <Badge tone="danger">غیرفعال</Badge>}
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <button type="button" className="admin-icon-btn" aria-label="مشاهده پروفایل"
                        onClick={() => setDetailId(row.id)}>
                        <UserRound className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" className="admin-icon-btn is-danger"
                        aria-label={row.is_active ? 'غیرفعال کردن' : 'فعال کردن'}
                        title={row.is_active ? 'غیرفعال کردن حساب' : 'فعال کردن حساب'}
                        disabled={toggleMutation.isPending}
                        onClick={() => toggleMutation.mutate(row.id)}>
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>

            <div className="catalog-pagination">
              <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>صفحه قبل</button>
              <span>صفحه {page.toLocaleString('fa-IR')}</span>
              <button type="button" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>صفحه بعد</button>
            </div>
          </>
        )}

      <Modal open={detailId !== null} title={detail?.full_name || 'پروفایل مشتری'} onClose={() => setDetailId(null)} wide>
        {detailLoading || !detail ? <LoadingBlock /> : (
          <div className="flex flex-col gap-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="سفارش‌های پرداخت‌شده" value={Number(detail.paid_orders_count ?? 0).toLocaleString('fa-IR')} />
              <StatCard label="مجموع خرید" value={formatToman(detail.total_spent)} tone="success" />
              <StatCard label="عضویت" value={new Date(detail.date_joined).toLocaleDateString('fa-IR')} />
            </div>

            <section>
              <h3 className="text-sm font-black mb-2">نشانی‌ها</h3>
              {(detail.addresses ?? []).length === 0 ? (
                <p className="form-hint">نشانی ثبت نشده است.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {detail.addresses.map((address: any) => (
                    <li key={address.id} className="text-xs leading-7" style={{ color: 'var(--text2)' }}>
                      <strong>{address.title}</strong> — {address.receiver_name} · {address.phone}
                      <br />
                      {address.province}، {address.city}، {address.street} (کد پستی {address.postal_code})
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="text-sm font-black mb-2">سفارش‌های اخیر</h3>
              {(detail.recent_orders ?? []).length === 0 ? (
                <p className="form-hint">این مشتری هنوز سفارشی ثبت نکرده است.</p>
              ) : (
                <DataTable headers={['شماره سفارش', 'وضعیت', 'مبلغ', 'تاریخ']}>
                  {detail.recent_orders.map((order: any) => (
                    <tr key={order.id}>
                      <td dir="ltr">{order.order_number}</td>
                      <td><Badge tone="info">{order.status_label}</Badge></td>
                      <td>{formatToman(order.total)}</td>
                      <td>{new Date(order.created_at).toLocaleDateString('fa-IR')}</td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </section>
          </div>
        )}
      </Modal>
    </AdminPage>
  )
}

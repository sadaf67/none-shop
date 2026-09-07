import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Search, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  AdminPage, AdminSection, Badge, DataTable, EmptyState, ErrorBlock, LoadingBlock, StatCard,
} from '@/components/admin/AdminUI'
import { FormField, FormTextarea } from '@/components/ui/FormField'
import { asList, getSmsLogs, getSmsStats, sendSms } from '@/api/admin'

const STATUS_TONE: Record<string, 'success' | 'danger' | 'warning'> = {
  sent: 'success', failed: 'danger', skipped: 'warning',
}

/** ارقام فارسی و عربی را به لاتین تبدیل می‌کند تا اعتبارسنجی موبایل درست کار کند. */
function normalizeDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
}

export default function AdminSms() {
  const queryClient = useQueryClient()
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [errors, setErrors] = useState<{ phone?: string; message?: string }>({})
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const params = { search: search || undefined, status: status || undefined }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-sms-logs', params],
    queryFn: () => getSmsLogs(params),
  })
  const { data: stats } = useQuery({ queryKey: ['admin-sms-stats'], queryFn: getSmsStats })

  const rows = asList<any>(data)

  const sendMutation = useMutation({
    mutationFn: () => sendSms(normalizeDigits(phone).trim(), message.trim()),
    onSuccess: () => {
      toast.success('پیامک ارسال شد.')
      setMessage('')
      queryClient.invalidateQueries({ queryKey: ['admin-sms-logs'] })
      queryClient.invalidateQueries({ queryKey: ['admin-sms-stats'] })
    },
    onError: (error: any) => {
      const data = error?.response?.data
      if (data?.phone) setErrors({ phone: Array.isArray(data.phone) ? data.phone[0] : String(data.phone) })
      else if (data?.message) setErrors({ message: Array.isArray(data.message) ? data.message[0] : String(data.message) })
      else toast.error(data?.error || 'ارسال پیامک انجام نشد. تنظیمات پنل پیامکی را بررسی کنید.')
    },
  })

  const submit = () => {
    const cleanPhone = normalizeDigits(phone).trim()
    const next: typeof errors = {}
    if (!/^09\d{9}$/.test(cleanPhone)) next.phone = 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.'
    if (message.trim().length < 3) next.message = 'متن پیامک را وارد کنید.'
    setErrors(next)
    if (Object.keys(next).length === 0) sendMutation.mutate()
  }

  return (
    <AdminPage
      title="پنل پیامکی"
      description="ارسال پیامک دستی و گزارش کامل پیامک‌های ارسال‌شده. سرویس‌دهنده و کلید API را از «تنظیمات سایت ← پنل پیامکی» انتخاب کنید."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="کل پیامک‌ها" value={Number(stats?.total ?? 0).toLocaleString('fa-IR')} />
        <StatCard label="ارسال موفق" value={Number(stats?.sent ?? 0).toLocaleString('fa-IR')} tone="success" />
        <StatCard label="ناموفق" value={Number(stats?.failed ?? 0).toLocaleString('fa-IR')} tone="danger" />
        <StatCard label="رد شده" value={Number(stats?.skipped ?? 0).toLocaleString('fa-IR')} tone="warning"
          hint="وقتی پیامک غیرفعال است یا شماره نامعتبر بوده." />
      </div>

      <AdminSection
        icon={<Send />}
        title="ارسال پیامک دستی"
        description="برای پیگیری سفارش یا اطلاع‌رسانی به یک مشتری خاص."
      >
        <div className="admin-form-grid">
          <FormField
            label="شماره موبایل"
            required
            dir="ltr"
            inputMode="numeric"
            placeholder="09121234567"
            error={errors.phone}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
          <FormTextarea
            className="admin-form-grid__full"
            label="متن پیامک"
            required
            rows={4}
            error={errors.message}
            hint={`${message.trim().length.toLocaleString('fa-IR')} نویسه — هر ۷۰ نویسه فارسی یک پیامک حساب می‌شود.`}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <div className="admin-form-grid__full flex justify-end">
            <button type="button" className="btn-primary !min-h-10 !py-2" onClick={submit} disabled={sendMutation.isPending}>
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              ارسال پیامک
            </button>
          </div>
        </div>
      </AdminSection>

      <div className="admin-toolbar">
        <label className="admin-search">
          <Search aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجو در شماره یا متن پیامک…" aria-label="جست‌وجوی پیامک" />
        </label>
        <select className="admin-filter-select" aria-label="وضعیت ارسال" value={status}
          onChange={(event) => setStatus(event.target.value)}>
          <option value="">همه وضعیت‌ها</option>
          <option value="sent">ارسال موفق</option>
          <option value="failed">ناموفق</option>
          <option value="skipped">رد شده</option>
        </select>
      </div>

      {isLoading ? <LoadingBlock />
        : isError ? <ErrorBlock onRetry={() => refetch()} />
        : rows.length === 0 ? <EmptyState title="پیامکی ثبت نشده است" description="پس از اولین ارسال، گزارش کامل اینجا نمایش داده می‌شود." />
        : (
          <DataTable headers={['شماره', 'نوع', 'متن', 'وضعیت', 'خطا', 'تاریخ']}>
            {rows.map((row: any) => (
              <tr key={row.id}>
                <td dir="ltr">{row.phone}</td>
                <td>{row.kind_display || row.kind}</td>
                <td><span className="admin-cell-clamp" title={row.message}>{row.message}</span></td>
                <td><Badge tone={STATUS_TONE[row.status] ?? 'default'}>{row.status_display || row.status}</Badge></td>
                <td><span className="admin-cell-clamp" title={row.error}>{row.error || '—'}</span></td>
                <td>{row.created_at ? new Date(row.created_at).toLocaleString('fa-IR') : '—'}</td>
              </tr>
            ))}
          </DataTable>
        )}
    </AdminPage>
  )
}

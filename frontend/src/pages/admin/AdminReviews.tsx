import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search, Star, Trash2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  AdminPage, Badge, ConfirmDialog, DataTable, EmptyState, ErrorBlock, LoadingBlock, StatCard,
} from '@/components/admin/AdminUI'
import { adminReviews, asList, bulkApproveReviews, getReviewStats } from '@/api/admin'

export default function AdminReviews() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [approved, setApproved] = useState('')
  const [selected, setSelected] = useState<number[]>([])
  const [deleting, setDeleting] = useState<any | null>(null)

  const params = { search: search || undefined, is_approved: approved || undefined }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-reviews', params],
    queryFn: () => adminReviews.list(params),
  })
  const { data: stats } = useQuery({ queryKey: ['admin-review-stats'], queryFn: getReviewStats })

  const rows = asList<any>(data)
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })
    queryClient.invalidateQueries({ queryKey: ['admin-review-stats'] })
  }

  const approveMutation = useMutation({
    mutationFn: ({ ids, approve }: { ids: number[]; approve: boolean }) => bulkApproveReviews(ids, approve),
    onSuccess: (_result, variables) => {
      toast.success(variables.approve ? 'نظر(ها) تأیید شد.' : 'تأیید نظر(ها) لغو شد.')
      setSelected([])
      invalidate()
    },
    onError: () => toast.error('عملیات انجام نشد.'),
  })

  const removeMutation = useMutation({
    mutationFn: (row: any) => adminReviews.remove(row.id),
    onSuccess: () => { toast.success('نظر حذف شد.'); setDeleting(null); invalidate() },
    onError: () => { toast.error('حذف انجام نشد.'); setDeleting(null) },
  })

  const allSelected = rows.length > 0 && selected.length === rows.length
  const toggleOne = (id: number) =>
    setSelected((c) => c.includes(id) ? c.filter((item) => item !== id) : [...c, id])

  return (
    <AdminPage
      title="نظرات مشتریان"
      description="نظرها پس از تأیید شما در صفحه محصول نمایش داده می‌شوند."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="کل نظرها" value={Number(stats?.total ?? 0).toLocaleString('fa-IR')} />
        <StatCard label="تأییدشده" value={Number(stats?.approved ?? 0).toLocaleString('fa-IR')} tone="success" />
        <StatCard label="در انتظار بررسی" value={Number(stats?.pending ?? 0).toLocaleString('fa-IR')} tone="warning" />
      </div>

      <div className="admin-toolbar">
        <label className="admin-search">
          <Search aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجو در متن نظر یا نام محصول…" aria-label="جست‌وجوی نظر" />
        </label>
        <select className="admin-filter-select" aria-label="وضعیت تأیید" value={approved}
          onChange={(event) => setApproved(event.target.value)}>
          <option value="">همه نظرها</option>
          <option value="false">در انتظار تأیید</option>
          <option value="true">تأییدشده</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div className="admin-bulkbar">
          <strong>{Number(selected.length).toLocaleString('fa-IR')} نظر انتخاب شده</strong>
          <button type="button" className="btn-primary !min-h-9 !py-1.5 !px-3 !text-xs"
            disabled={approveMutation.isPending}
            onClick={() => approveMutation.mutate({ ids: selected, approve: true })}>
            تأیید همه
          </button>
          <button type="button" className="btn-ghost !min-h-9 !py-1.5 !px-3 !text-xs"
            disabled={approveMutation.isPending}
            onClick={() => approveMutation.mutate({ ids: selected, approve: false })}>
            لغو تأیید
          </button>
          <button type="button" className="btn-ghost !min-h-9 !py-1.5 !px-3 !text-xs" onClick={() => setSelected([])}>
            لغو انتخاب
          </button>
        </div>
      )}

      {isLoading ? <LoadingBlock />
        : isError ? <ErrorBlock onRetry={() => refetch()} />
        : rows.length === 0 ? <EmptyState title="نظری یافت نشد" description="با تغییر فیلترها دوباره تلاش کنید." />
        : (
          <DataTable headers={[
            <input key="all" type="checkbox" className="admin-check" checked={allSelected}
              onChange={() => setSelected(allSelected ? [] : rows.map((row: any) => row.id))} aria-label="انتخاب همه" />,
            'محصول', 'کاربر', 'امتیاز', 'متن نظر', 'وضعیت', 'تاریخ', 'عملیات',
          ]}>
            {rows.map((row: any) => (
              <tr key={row.id}>
                <td>
                  <input type="checkbox" className="admin-check" checked={selected.includes(row.id)}
                    onChange={() => toggleOne(row.id)} aria-label={`انتخاب نظر ${row.id}`} />
                </td>
                <td><span className="admin-cell-clamp">{row.product_name}</span></td>
                <td>
                  {row.user_label || '—'}
                  {row.is_verified_purchase && (
                    <span style={{ display: 'block', fontSize: '.62rem', color: '#34c77b' }}>خرید تأییدشده</span>
                  )}
                </td>
                <td>
                  <span className="flex items-center gap-1" title={`${row.rating} از ۵`}>
                    <Star className="w-3.5 h-3.5" fill="currentColor" style={{ color: '#f0a92a' }} />
                    {Number(row.rating).toLocaleString('fa-IR')}
                  </span>
                </td>
                <td>
                  {row.title && <strong style={{ display: 'block', color: 'var(--text1)' }}>{row.title}</strong>}
                  <span className="admin-cell-clamp" title={row.body}>{row.body}</span>
                </td>
                <td>
                  {row.is_approved
                    ? <Badge tone="success">تأییدشده</Badge>
                    : <Badge tone="warning">در انتظار</Badge>}
                </td>
                <td>{new Date(row.created_at).toLocaleDateString('fa-IR')}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button type="button" className="admin-icon-btn" aria-label={row.is_approved ? 'لغو تأیید' : 'تأیید نظر'}
                      title={row.is_approved ? 'لغو تأیید' : 'تأیید نظر'}
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate({ ids: [row.id], approve: !row.is_approved })}>
                      {row.is_approved ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button type="button" className="admin-icon-btn is-danger" aria-label="حذف نظر"
                      onClick={() => setDeleting(row)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}

      <ConfirmDialog
        open={!!deleting}
        title="حذف نظر"
        message="این نظر برای همیشه حذف می‌شود. اگر فقط نمی‌خواهید نمایش داده شود، تأیید آن را لغو کنید."
        busy={removeMutation.isPending}
        onConfirm={() => deleting && removeMutation.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </AdminPage>
  )
}

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  AdminPage, Badge, ConfirmDialog, DataTable, EmptyState, ErrorBlock, LoadingBlock,
} from '@/components/admin/AdminUI'
import ProductEditor from '@/components/admin/ProductEditor'
import {
  adminBrands, adminCategoriesCrud, adminProducts, asList,
  bulkProductPrice, bulkProductStatus, duplicateProduct,
} from '@/api/admin'

const STATUS_TONE: Record<string, 'success' | 'warning' | 'default'> = {
  active: 'success', draft: 'warning', archived: 'default',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'فعال', draft: 'پیش‌نویس', archived: 'آرشیو',
}

const formatToman = (value: any) =>
  value === null || value === undefined || value === '' ? '—' : `${Number(value).toLocaleString('fa-IR')} تومان`

export default function AdminProducts() {
  const queryClient = useQueryClient()
  // داشبورد با لینک ?stock_state=out|low به این صفحه می‌آید؛ فیلتر باید از همان مقدار شروع شود.
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(() => searchParams.get('status') ?? '')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [stockState, setStockState] = useState(() => searchParams.get('stock_state') ?? '')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [deleting, setDeleting] = useState<any | null>(null)

  // فیلترهای قابل اشتراک‌گذاری در آدرس صفحه نگه داشته می‌شوند.
  const syncParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next, { replace: true })
  }

  const params = {
    search: search || undefined,
    status: status || undefined,
    category: category || undefined,
    brand: brand || undefined,
    stock_state: stockState || undefined,
    page,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-products', params],
    queryFn: () => adminProducts.list(params),
  })

  const { data: categories } = useQuery({
    queryKey: ['admin-categories-options'],
    queryFn: () => adminCategoriesCrud.listAll({ page_size: 200 }),
  })
  const { data: brands } = useQuery({
    queryKey: ['admin-brands-options'],
    queryFn: () => adminBrands.listAll({ page_size: 200 }),
  })

  const rows = asList<any>(data)
  const count = Array.isArray(data) ? data.length : (data?.count ?? rows.length)
  const hasNext = !Array.isArray(data) && !!data?.next
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-products'] })

  const removeMutation = useMutation({
    mutationFn: (row: any) => adminProducts.remove(row.id),
    onSuccess: () => { toast.success('محصول حذف شد.'); setDeleting(null); invalidate() },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.response?.data?.detail || 'حذف انجام نشد.')
      setDeleting(null)
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => duplicateProduct(id),
    onSuccess: () => { toast.success('نسخه کپی به‌صورت پیش‌نویس ساخته شد.'); invalidate() },
    onError: () => toast.error('کپی محصول انجام نشد.'),
  })

  const bulkStatusMutation = useMutation({
    mutationFn: (next: string) => bulkProductStatus(selected, next),
    onSuccess: (result: any) => {
      toast.success(`${Number(result?.updated ?? 0).toLocaleString('fa-IR')} محصول به‌روزرسانی شد.`)
      setSelected([])
      invalidate()
    },
    onError: () => toast.error('تغییر گروهی وضعیت انجام نشد.'),
  })

  const bulkPriceMutation = useMutation({
    mutationFn: (percent: number) => bulkProductPrice(selected, percent),
    onSuccess: () => { toast.success('قیمت‌ها به‌روزرسانی شد.'); setSelected([]); invalidate() },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'تغییر گروهی قیمت انجام نشد.'),
  })

  const allSelected = rows.length > 0 && selected.length === rows.length
  const toggleAll = () => setSelected(allSelected ? [] : rows.map((row: any) => row.id))
  const toggleOne = (id: string) =>
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id])

  const askPercent = () => {
    const raw = window.prompt('درصد تغییر قیمت را وارد کنید. مثلاً ۱۰ برای افزایش ۱۰٪ و ‎-۱۰ برای کاهش ۱۰٪.')
    if (raw === null) return
    const percent = Number(raw.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))))
    if (Number.isNaN(percent) || percent < -90 || percent > 900) {
      toast.error('درصد باید عددی بین ‎-۹۰ و ۹۰۰ باشد.')
      return
    }
    bulkPriceMutation.mutate(percent)
  }

  const options = useMemo(
    () => ({
      categories: (categories ?? []).map((item: any) => ({ value: String(item.id), label: item.name })),
      brands: (brands ?? []).map((item: any) => ({ value: String(item.id), label: item.name })),
    }),
    [categories, brands],
  )

  const openEditor = (row: any | null) => { setEditing(row); setEditorOpen(true) }

  return (
    <AdminPage
      title="محصولات"
      description={`مدیریت کامل کاتالوگ فروشگاه — ${Number(count).toLocaleString('fa-IR')} محصول ثبت شده است.`}
      actions={
        <button type="button" onClick={() => openEditor(null)} className="btn-primary !min-h-10 !py-2 !px-4 text-sm">
          <Plus className="w-4 h-4" /> محصول جدید
        </button>
      }
    >
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search aria-hidden />
          <input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            placeholder="جست‌وجو در نام، کد کالا یا بارکد…"
            aria-label="جست‌وجوی محصول"
          />
        </label>
        <select className="admin-filter-select" aria-label="وضعیت" value={status}
          onChange={(event) => { setStatus(event.target.value); syncParam('status', event.target.value); setPage(1) }}>
          <option value="">همه وضعیت‌ها</option>
          <option value="active">فعال</option>
          <option value="draft">پیش‌نویس</option>
          <option value="archived">آرشیو</option>
        </select>
        <select className="admin-filter-select" aria-label="دسته‌بندی" value={category}
          onChange={(event) => { setCategory(event.target.value); setPage(1) }}>
          <option value="">همه دسته‌ها</option>
          {options.categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select className="admin-filter-select" aria-label="برند" value={brand}
          onChange={(event) => { setBrand(event.target.value); setPage(1) }}>
          <option value="">همه برندها</option>
          {options.brands.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <select className="admin-filter-select" aria-label="موجودی" value={stockState}
          onChange={(event) => { setStockState(event.target.value); syncParam('stock_state', event.target.value); setPage(1) }}>
          <option value="">همه موجودی‌ها</option>
          <option value="low">رو به اتمام</option>
          <option value="out">ناموجود</option>
        </select>
      </div>

      {selected.length > 0 && (
        <div className="admin-bulkbar">
          <strong>{Number(selected.length).toLocaleString('fa-IR')} محصول انتخاب شده</strong>
          <button type="button" className="btn-ghost !min-h-9 !py-1.5 !px-3 !text-xs"
            disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate('active')}>
            انتشار
          </button>
          <button type="button" className="btn-ghost !min-h-9 !py-1.5 !px-3 !text-xs"
            disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate('draft')}>
            پیش‌نویس
          </button>
          <button type="button" className="btn-ghost !min-h-9 !py-1.5 !px-3 !text-xs"
            disabled={bulkStatusMutation.isPending} onClick={() => bulkStatusMutation.mutate('archived')}>
            آرشیو
          </button>
          <button type="button" className="btn-primary !min-h-9 !py-1.5 !px-3 !text-xs"
            disabled={bulkPriceMutation.isPending} onClick={askPercent}>
            تغییر درصدی قیمت
          </button>
          <button type="button" className="btn-ghost !min-h-9 !py-1.5 !px-3 !text-xs" onClick={() => setSelected([])}>
            لغو انتخاب
          </button>
        </div>
      )}

      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="محصولی یافت نشد"
          description="یا هنوز محصولی ثبت نشده یا فیلترهای فعلی نتیجه‌ای ندارند."
          action={<button type="button" className="btn-primary" onClick={() => openEditor(null)}>افزودن محصول</button>}
        />
      ) : (
        <>
          <DataTable headers={[
            <input key="all" type="checkbox" className="admin-check" checked={allSelected}
              onChange={toggleAll} aria-label="انتخاب همه" />,
            'تصویر', 'نام محصول', 'دسته', 'قیمت', 'موجودی', 'وضعیت', 'فروش', 'عملیات',
          ]}>
            {rows.map((row: any) => (
              <tr key={row.id}>
                <td>
                  <input type="checkbox" className="admin-check" checked={selected.includes(row.id)}
                    onChange={() => toggleOne(row.id)} aria-label={`انتخاب ${row.name}`} />
                </td>
                <td>
                  {row.main_image?.image
                    ? <img src={row.main_image.image} alt="" className="admin-thumb" loading="lazy" />
                    : <span className="admin-thumb" aria-hidden />}
                </td>
                <td>
                  <span className="admin-cell-clamp" title={row.name}>{row.name}</span>
                  <span style={{ display: 'block', fontSize: '.65rem', color: 'var(--text-muted)', direction: 'ltr' }}>
                    {row.sku}
                  </span>
                </td>
                <td>{row.category_name || '—'}</td>
                <td>
                  {formatToman(row.price)}
                  {row.discount_percent > 0 && (
                    <span style={{ display: 'block', fontSize: '.65rem', color: '#34c77b' }}>
                      {Number(row.discount_percent).toLocaleString('fa-IR')}٪ تخفیف
                    </span>
                  )}
                </td>
                <td>
                  {Number(row.available_stock ?? row.stock ?? 0) === 0
                    ? <Badge tone="danger">ناموجود</Badge>
                    : Number(row.available_stock ?? row.stock) <= 5
                      ? <Badge tone="warning">{Number(row.available_stock ?? row.stock).toLocaleString('fa-IR')} عدد</Badge>
                      : Number(row.available_stock ?? row.stock).toLocaleString('fa-IR')}
                </td>
                <td><Badge tone={STATUS_TONE[row.status] ?? 'default'}>{STATUS_LABEL[row.status] ?? row.status}</Badge></td>
                <td>{Number(row.sold_count ?? 0).toLocaleString('fa-IR')}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button type="button" className="admin-icon-btn" aria-label={`ویرایش ${row.name}`}
                      onClick={() => openEditor(row)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className="admin-icon-btn" aria-label={`کپی ${row.name}`}
                      disabled={duplicateMutation.isPending} onClick={() => duplicateMutation.mutate(row.id)}>
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className="admin-icon-btn is-danger" aria-label={`حذف ${row.name}`}
                      onClick={() => setDeleting(row)}>
                      <Trash2 className="w-3.5 h-3.5" />
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

      <ProductEditor
        open={editorOpen}
        product={editing}
        onClose={() => { setEditorOpen(false); setEditing(null) }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="حذف محصول"
        message={`آیا از حذف «${deleting?.name ?? ''}» مطمئن هستید؟ اگر این محصول در سفارشی ثبت شده باشد، بهتر است به‌جای حذف، آن را آرشیو کنید.`}
        busy={removeMutation.isPending}
        onConfirm={() => deleting && removeMutation.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </AdminPage>
  )
}

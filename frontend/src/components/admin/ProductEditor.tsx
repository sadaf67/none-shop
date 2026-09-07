import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Star, Trash2, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { Modal } from './AdminUI'
import { FormField, FormSelect, FormSwitch, FormTextarea } from '@/components/ui/FormField'
import {
  adminProductImages, adminProducts, adminProductVariants,
  adminBrands, adminCategoriesCrud, adminTags,
} from '@/api/admin'

const STATUSES = [
  { value: 'active', label: 'فعال' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'archived', label: 'آرشیو' },
]

const TABS = [
  { id: 'main', label: 'اطلاعات اصلی' },
  { id: 'price', label: 'قیمت و انبار' },
  { id: 'media', label: 'تصاویر' },
  { id: 'variants', label: 'تنوع' },
  { id: 'seo', label: 'سئو و فید' },
]

interface AttributePair { name: string; value: string }

const EMPTY = {
  name: '', slug: '', sku: '', category: '', brand: '', tags: [] as number[],
  short_description: '', description: '',
  price: '', compare_price: '', cost_price: '', stock: '0', weight: '',
  status: 'draft', is_featured: false, is_digital: false,
  guarantee: '', barcode: '', video_url: '',
  meta_title: '', meta_description: '', include_in_feeds: true, display_order: '0',
}

type FormState = typeof EMPTY

function toForm(product: any): FormState {
  if (!product) return { ...EMPTY }
  return {
    name: product.name ?? '',
    slug: product.slug ?? '',
    sku: product.sku ?? '',
    category: product.category ?? '',
    brand: product.brand ?? '',
    tags: product.tags ?? [],
    short_description: product.short_description ?? '',
    description: product.description ?? '',
    price: product.price ?? '',
    compare_price: product.compare_price ?? '',
    cost_price: product.cost_price ?? '',
    stock: String(product.stock ?? 0),
    weight: product.weight ?? '',
    status: product.status ?? 'draft',
    is_featured: !!product.is_featured,
    is_digital: !!product.is_digital,
    guarantee: product.guarantee ?? '',
    barcode: product.barcode ?? '',
    video_url: product.video_url ?? '',
    meta_title: product.meta_title ?? '',
    meta_description: product.meta_description ?? '',
    include_in_feeds: product.include_in_feeds !== false,
    display_order: String(product.display_order ?? 0),
  }
}

/** پنجره ویرایش کامل محصول: اطلاعات، قیمت، تصاویر، تنوع و سئو. */
export default function ProductEditor({ open, product, onClose }: {
  open: boolean
  product: any | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState('main')
  const [form, setForm] = useState<FormState>({ ...EMPTY })
  const [attributes, setAttributes] = useState<AttributePair[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const productId = product?.id ?? null

  const { data: categories } = useQuery({
    queryKey: ['admin-categories-options'],
    queryFn: () => adminCategoriesCrud.listAll({ page_size: 200 }),
    enabled: open,
  })
  const { data: brands } = useQuery({
    queryKey: ['admin-brands-options'],
    queryFn: () => adminBrands.listAll({ page_size: 200 }),
    enabled: open,
  })
  const { data: tags } = useQuery({
    queryKey: ['admin-tags-options'],
    queryFn: () => adminTags.listAll({ page_size: 300 }),
    enabled: open,
  })

  // نسخه تازه محصول را می‌گیریم تا تصاویر و تنوع‌ها به‌روز باشند.
  const { data: full } = useQuery({
    queryKey: ['admin-product', productId],
    queryFn: () => adminProducts.get(productId as string),
    enabled: open && !!productId,
  })

  const current = full ?? product

  useEffect(() => {
    if (!open) return
    setTab('main')
    setErrors({})
    setForm(toForm(current))
    setAttributes((current?.attributes_list ?? []).map((item: any) => ({ name: item.name, value: item.value })))
    // فقط هنگام باز شدن یا تعویض محصول مقداردهی می‌شود.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, productId, full])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-products'] })
    if (productId) queryClient.invalidateQueries({ queryKey: ['admin-product', productId] })
  }

  const save = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      (productId ? adminProducts.update(productId, payload) : adminProducts.create(payload)),
    onSuccess: () => {
      toast.success(productId ? 'محصول به‌روزرسانی شد.' : 'محصول ثبت شد.')
      invalidate()
      onClose()
    },
    onError: (error: any) => {
      const data = error?.response?.data
      if (data && typeof data === 'object') {
        const fieldErrors: Record<string, string> = {}
        for (const [key, value] of Object.entries(data)) {
          fieldErrors[key] = Array.isArray(value) ? String(value[0]) : String(value)
        }
        setErrors(fieldErrors)
        toast.error('ذخیره انجام نشد؛ فیلدهای قرمز را بررسی کنید.')
      } else {
        toast.error('ذخیره محصول انجام نشد.')
      }
    },
  })

  const set = (key: keyof FormState, value: any) => setForm((c) => ({ ...c, [key]: value }))

  const submit = () => {
    const payload: Record<string, any> = {
      ...form,
      category: form.category === '' ? null : form.category,
      brand: form.brand === '' ? null : form.brand,
      price: form.price === '' ? null : Number(form.price),
      compare_price: form.compare_price === '' ? null : Number(form.compare_price),
      cost_price: form.cost_price === '' ? null : Number(form.cost_price),
      stock: Number(form.stock || 0),
      weight: form.weight === '' ? null : Number(form.weight),
      display_order: Number(form.display_order || 0),
      attribute_pairs: attributes.filter((item) => item.name.trim() && item.value.trim()),
    }
    save.mutate(payload)
  }

  const options = (list: any[] | undefined) => (list ?? []).map((item) => ({ value: item.id, label: item.name }))

  return (
    <Modal
      open={open}
      title={productId ? `ویرایش ${product?.name ?? 'محصول'}` : 'محصول جدید'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-ghost">بستن</button>
          <button type="button" onClick={submit} disabled={save.isPending} className="btn-primary">
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            ذخیره محصول
          </button>
        </>
      }
    >
      <nav className="admin-tabs mb-5" aria-label="بخش‌های محصول">
        {TABS.map((item) => {
          // تصاویر و تنوع فقط پس از ذخیره اولیه معنا دارند.
          const locked = !productId && (item.id === 'media' || item.id === 'variants')
          return (
            <button
              key={item.id}
              type="button"
              disabled={locked}
              title={locked ? 'ابتدا محصول را ذخیره کنید.' : undefined}
              onClick={() => setTab(item.id)}
              className={tab === item.id ? 'is-active' : ''}
              style={locked ? { opacity: .4, cursor: 'not-allowed' } : undefined}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      {tab === 'main' && (
        <div className="admin-form-grid">
          <FormField className="admin-form-grid__full" label="نام محصول" required error={errors.name}
            value={form.name} onChange={(e) => set('name', e.target.value)} />
          <FormField label="نشانی (اسلاگ)" hint="خالی بگذارید تا خودکار ساخته شود." error={errors.slug}
            value={form.slug} onChange={(e) => set('slug', e.target.value)} />
          <FormField label="کد کالا (SKU)" hint="خالی بگذارید تا خودکار تولید شود." error={errors.sku} dir="ltr"
            value={form.sku} onChange={(e) => set('sku', e.target.value)} />
          <FormSelect label="دسته‌بندی" placeholder="— انتخاب کنید —" options={options(categories)} error={errors.category}
            value={form.category} onChange={(e) => set('category', e.target.value)} />
          <FormSelect label="برند" placeholder="— بدون برند —" options={options(brands)} error={errors.brand}
            value={form.brand} onChange={(e) => set('brand', e.target.value)} />
          <FormSelect label="وضعیت انتشار" options={STATUSES} error={errors.status}
            value={form.status} onChange={(e) => set('status', e.target.value)} />
          <FormField label="گارانتی" placeholder="گارانتی اصالت کالا" error={errors.guarantee}
            value={form.guarantee} onChange={(e) => set('guarantee', e.target.value)} />
          <FormTextarea className="admin-form-grid__full" label="توضیح کوتاه" rows={2} error={errors.short_description}
            hint="در کارت محصول و توضیحات فید ترب استفاده می‌شود."
            value={form.short_description} onChange={(e) => set('short_description', e.target.value)} />
          <FormTextarea className="admin-form-grid__full" label="توضیح کامل" rows={7} error={errors.description}
            value={form.description} onChange={(e) => set('description', e.target.value)} />

          <div className="admin-form-grid__full">
            <span className="form-label">برچسب‌ها</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {(tags ?? []).map((tag: any) => {
                const active = form.tags.includes(tag.id)
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => set('tags', active ? form.tags.filter((id) => id !== tag.id) : [...form.tags, tag.id])}
                    className={`admin-chip ${active ? 'is-active' : ''}`}
                    aria-pressed={active}
                  >
                    {tag.name}
                  </button>
                )
              })}
              {(tags ?? []).length === 0 && <p className="form-hint">هنوز برچسبی ثبت نشده است.</p>}
            </div>
          </div>

          <div className="admin-form-grid__full">
            <FormSwitch label="محصول ویژه (نمایش در صفحه اصلی)" checked={form.is_featured} onChange={(v) => set('is_featured', v)} />
          </div>
          <div className="admin-form-grid__full">
            <FormSwitch label="محصول دیجیتال (بدون ارسال فیزیکی)" checked={form.is_digital} onChange={(v) => set('is_digital', v)} />
          </div>
        </div>
      )}

      {tab === 'price' && (
        <div className="admin-form-grid">
          <FormField label="قیمت فروش (تومان)" required type="number" inputMode="numeric" error={errors.price}
            value={form.price} onChange={(e) => set('price', e.target.value)} />
          <FormField label="قیمت پیش از تخفیف (تومان)" type="number" inputMode="numeric" error={errors.compare_price}
            hint="اگر بیشتر از قیمت فروش باشد، درصد تخفیف نمایش داده می‌شود."
            value={form.compare_price} onChange={(e) => set('compare_price', e.target.value)} />
          <FormField label="قیمت خرید (تومان)" type="number" inputMode="numeric" error={errors.cost_price}
            hint="فقط برای گزارش سود؛ به مشتری نمایش داده نمی‌شود."
            value={form.cost_price} onChange={(e) => set('cost_price', e.target.value)} />
          <FormField label="موجودی انبار" type="number" inputMode="numeric" error={errors.stock}
            value={form.stock} onChange={(e) => set('stock', e.target.value)} />
          <FormField label="وزن (گرم)" type="number" inputMode="numeric" error={errors.weight}
            value={form.weight} onChange={(e) => set('weight', e.target.value)} />
          <FormField label="ترتیب نمایش" type="number" inputMode="numeric" error={errors.display_order}
            value={form.display_order} onChange={(e) => set('display_order', e.target.value)} />
          <FormField label="بارکد / EAN" dir="ltr" error={errors.barcode}
            value={form.barcode} onChange={(e) => set('barcode', e.target.value)} />
          <FormField label="ویدیو معرفی" dir="ltr" type="url" error={errors.video_url}
            value={form.video_url} onChange={(e) => set('video_url', e.target.value)} />

          <div className="admin-form-grid__full">
            <span className="form-label">ویژگی‌های فنی</span>
            <div className="flex flex-col gap-2 mt-2">
              {attributes.map((pair, index) => (
                <div key={index} className="flex gap-2">
                  <input className="input-field" placeholder="نام ویژگی" value={pair.name}
                    onChange={(e) => setAttributes((c) => c.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} />
                  <input className="input-field" placeholder="مقدار" value={pair.value}
                    onChange={(e) => setAttributes((c) => c.map((item, i) => i === index ? { ...item, value: e.target.value } : item))} />
                  <button type="button" className="admin-icon-btn is-danger shrink-0" aria-label="حذف ویژگی"
                    onClick={() => setAttributes((c) => c.filter((_, i) => i !== index))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button type="button" className="btn-ghost !min-h-9 !py-1.5 !text-xs self-start"
                onClick={() => setAttributes((c) => [...c, { name: '', value: '' }])}>
                <Plus className="w-3.5 h-3.5" /> افزودن ویژگی
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'media' && productId && <ImageManager productId={productId} images={current?.images ?? []} onChanged={invalidate} />}
      {tab === 'variants' && productId && <VariantManager productId={productId} variants={current?.variants ?? []} onChanged={invalidate} />}

      {tab === 'seo' && (
        <div className="admin-form-grid">
          <FormField className="admin-form-grid__full" label="عنوان سئو" error={errors.meta_title}
            hint="اگر خالی بماند، نام محصول استفاده می‌شود."
            value={form.meta_title} onChange={(e) => set('meta_title', e.target.value)} />
          <FormTextarea className="admin-form-grid__full" label="توضیحات سئو" rows={3} error={errors.meta_description}
            hint="حدود ۱۵۰ نویسه بهترین نتیجه را در گوگل می‌دهد."
            value={form.meta_description} onChange={(e) => set('meta_description', e.target.value)} />
          <div className="admin-form-grid__full">
            <FormSwitch
              label="نمایش در فید ترب و ایمالز"
              hint="محصولات پیش‌نویس و بدون قیمت در هر حال به فید نمی‌روند."
              checked={form.include_in_feeds}
              onChange={(v) => set('include_in_feeds', v)}
            />
          </div>
        </div>
      )}
    </Modal>
  )
}

/** مدیریت گالری تصاویر محصول. */
function ImageManager({ productId, images, onChanged }: { productId: string; images: any[]; onChanged: () => void }) {
  const [busy, setBusy] = useState(false)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(true)
    try {
      for (const file of Array.from(files)) {
        await adminProductImages.create({ product: productId, image: file, is_main: images.length === 0 })
      }
      toast.success('تصویر افزوده شد.')
      onChanged()
    } catch {
      toast.error('بارگذاری تصویر انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  const act = async (fn: () => Promise<any>, message: string) => {
    setBusy(true)
    try {
      await fn()
      toast.success(message)
      onChanged()
    } catch {
      toast.error('عملیات انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="form-field">
        <span className="form-label">افزودن تصویر</span>
        <input type="file" accept="image/*" multiple className="input-field is-file" disabled={busy}
          onChange={(event) => { upload(event.target.files); event.target.value = '' }} />
        <span className="form-hint">
          {busy ? 'در حال بارگذاری…' : 'می‌توانید چند تصویر را هم‌زمان انتخاب کنید. اولین تصویر به‌صورت خودکار تصویر اصلی می‌شود.'}
        </span>
      </label>

      {images.length === 0 ? (
        <p className="form-hint">هنوز تصویری برای این محصول ثبت نشده است.</p>
      ) : (
        <div className="admin-gallery">
          {images.map((image: any) => (
            <figure key={image.id} className={`admin-gallery__item ${image.is_main ? 'is-main' : ''}`}>
              <img src={image.image} alt={image.alt_text || ''} loading="lazy" />
              <figcaption>
                <button type="button" className="admin-icon-btn" disabled={busy || image.is_main}
                  title="تصویر اصلی شود" aria-label="تصویر اصلی شود"
                  onClick={() => act(() => adminProductImages.update(image.id, { is_main: true }), 'تصویر اصلی تغییر کرد.')}>
                  <Star className="w-3.5 h-3.5" fill={image.is_main ? 'currentColor' : 'none'} />
                </button>
                <button type="button" className="admin-icon-btn is-danger" disabled={busy}
                  title="حذف تصویر" aria-label="حذف تصویر"
                  onClick={() => act(() => adminProductImages.remove(image.id), 'تصویر حذف شد.')}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  )
}

/** مدیریت تنوع (سایز/رنگ) محصول. */
function VariantManager({ productId, variants, onChanged }: { productId: string; variants: any[]; onChanged: () => void }) {
  const [draft, setDraft] = useState({ size: '', color: '', stock: '0' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const add = async () => {
    if (!draft.size.trim() && !draft.color.trim()) {
      setError('دست‌کم سایز یا رنگ را وارد کنید.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await adminProductVariants.create({
        product: productId, size: draft.size.trim(), color: draft.color.trim(), stock: Number(draft.stock || 0),
      })
      setDraft({ size: '', color: '', stock: '0' })
      toast.success('تنوع افزوده شد.')
      onChanged()
    } catch (err: any) {
      const data = err?.response?.data
      setError(data?.size?.[0] || data?.detail || 'ثبت تنوع انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  const patch = async (id: number, payload: Record<string, any>) => {
    setBusy(true)
    try {
      await adminProductVariants.update(id, payload)
      onChanged()
    } catch {
      toast.error('به‌روزرسانی انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: number) => {
    setBusy(true)
    try {
      await adminProductVariants.remove(id)
      toast.success('تنوع حذف شد.')
      onChanged()
    } catch {
      toast.error('حذف انجام نشد.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="admin-form-grid">
        <FormField label="سایز" value={draft.size} onChange={(e) => setDraft((c) => ({ ...c, size: e.target.value }))} />
        <FormField label="رنگ" value={draft.color} onChange={(e) => setDraft((c) => ({ ...c, color: e.target.value }))} />
        <FormField label="موجودی" type="number" inputMode="numeric" error={error}
          value={draft.stock} onChange={(e) => setDraft((c) => ({ ...c, stock: e.target.value }))} />
        <div className="flex items-end">
          <button type="button" className="btn-primary !min-h-10 !py-2 w-full" onClick={add} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            افزودن تنوع
          </button>
        </div>
      </div>

      {variants.length === 0 ? (
        <p className="form-hint">این محصول تنوع ندارد و موجودی کلی آن ملاک است.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table" style={{ minWidth: 480 }}>
            <thead>
              <tr><th>سایز</th><th>رنگ</th><th>موجودی</th><th>فعال</th><th>عملیات</th></tr>
            </thead>
            <tbody>
              {variants.map((variant: any) => (
                <tr key={variant.id}>
                  <td>{variant.size || '—'}</td>
                  <td>{variant.color || '—'}</td>
                  <td>
                    <input
                      type="number"
                      className="admin-inline-input"
                      defaultValue={variant.stock}
                      aria-label={`موجودی ${variant.label ?? ''}`}
                      onBlur={(event) => {
                        const value = Number(event.target.value || 0)
                        if (value !== variant.stock) patch(variant.id, { stock: value })
                      }}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!variant.is_active}
                      aria-label="فعال بودن تنوع"
                      className={`filter-switch ${variant.is_active ? 'is-active' : ''}`}
                      onClick={() => patch(variant.id, { is_active: !variant.is_active })}
                    >
                      <span />
                    </button>
                  </td>
                  <td>
                    <button type="button" className="admin-icon-btn is-danger" disabled={busy}
                      aria-label="حذف تنوع" onClick={() => remove(variant.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

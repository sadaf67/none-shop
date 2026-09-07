import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { FormField, FormSelect, FormSwitch, FormTextarea } from '@/components/ui/FormField'
import { asList, type Paginated, type QueryParams } from '@/api/admin'
import {
  AdminPage,
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  Modal,
} from './AdminUI'

export type FieldType =
  | 'text' | 'textarea' | 'number' | 'select' | 'switch'
  | 'image' | 'datetime' | 'color' | 'html' | 'url' | 'email'

export interface FieldDef {
  name: string
  label: string
  type?: FieldType
  options?: { value: string | number; label: string }[]
  required?: boolean
  hint?: string
  placeholder?: string
  /** فیلد در فرم تمام عرض شود. */
  full?: boolean
  /** فقط در فرم؛ در جدول نمایش داده نشود. */
  hideInTable?: boolean
  /** فقط در جدول؛ در فرم ویرایش نشود. */
  readOnly?: boolean
  /** مقدار پیش‌فرض هنگام ایجاد رکورد جدید. */
  defaultValue?: any
  /** نمایش سفارشی سلول جدول. */
  cell?: (row: any) => ReactNode
}

interface Resource {
  list: (params?: QueryParams) => Promise<Paginated<any> | any[]>
  create: (payload: Record<string, any>) => Promise<any>
  update: (id: string | number, payload: Record<string, any>) => Promise<any>
  remove: (id: string | number) => Promise<any>
}

interface Props {
  title: string
  description?: string
  queryKey: string
  resource: Resource
  fields: FieldDef[]
  /** ستون‌های جدول؛ پیش‌فرض همه فیلدهای بدون hideInTable. */
  columns?: string[]
  searchable?: boolean
  /** فیلترهای بالای جدول. */
  filters?: { name: string; label: string; options: { value: string; label: string }[] }[]
  idKey?: string
  labelKey?: string
  /** ستون‌های اضافه که از داده مشتق می‌شوند. */
  extraColumns?: { label: string; cell: (row: any) => ReactNode }[]
  canCreate?: boolean
  canDelete?: boolean
  emptyHint?: string
}

function initialValues(fields: FieldDef[], row?: any) {
  const values: Record<string, any> = {}
  for (const field of fields) {
    if (field.readOnly) continue
    const raw = row?.[field.name]
    if (field.type === 'switch') {
      values[field.name] = row ? Boolean(raw) : Boolean(field.defaultValue ?? false)
    } else if (field.type === 'image') {
      values[field.name] = undefined // فایل جدید فقط هنگام انتخاب کاربر ارسال می‌شود.
    } else if (field.type === 'datetime') {
      // ورودی datetime-local فرمت YYYY-MM-DDTHH:mm می‌خواهد.
      values[field.name] = raw ? String(raw).slice(0, 16) : (field.defaultValue ?? '')
    } else {
      values[field.name] = raw ?? field.defaultValue ?? ''
    }
  }
  return values
}

/** پیام خطای DRF را روی فیلدها می‌نشاند و بقیه را به‌صورت toast نشان می‌دهد. */
function applyServerErrors(error: any, setErrors: (value: Record<string, string>) => void, fields: FieldDef[]) {
  const data = error?.response?.data
  if (!data || typeof data !== 'object') {
    toast.error('ذخیره انجام نشد. دوباره تلاش کنید.')
    return
  }
  const names = new Set(fields.map((field) => field.name))
  const fieldErrors: Record<string, string> = {}
  for (const [key, value] of Object.entries(data)) {
    const message = Array.isArray(value) ? String(value[0]) : String(value)
    if (names.has(key)) fieldErrors[key] = message
    else toast.error(message)
  }
  setErrors(fieldErrors)
  if (Object.keys(fieldErrors).length) toast.error('برخی فیلدها نیاز به اصلاح دارند.')
}

export default function ResourceManager({
  title, description, queryKey, resource, fields,
  columns, searchable = true, filters = [], idKey = 'id', labelKey = 'name',
  extraColumns = [], canCreate = true, canDelete = true, emptyHint,
}: Props) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [values, setValues] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deleting, setDeleting] = useState<any | null>(null)

  const params: QueryParams = { search: search || undefined, ...activeFilters }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [queryKey, params],
    queryFn: () => resource.list(params),
  })

  const rows = asList<any>(data)
  const tableFields = useMemo(
    () => (columns
      ? columns.map((name) => fields.find((field) => field.name === name)).filter(Boolean) as FieldDef[]
      : fields.filter((field) => !field.hideInTable)),
    [columns, fields],
  )

  const invalidate = () => queryClient.invalidateQueries({ queryKey: [queryKey] })

  const saveMutation = useMutation({
    mutationFn: (payload: Record<string, any>) =>
      (editing ? resource.update(editing[idKey], payload) : resource.create(payload)),
    onSuccess: () => {
      toast.success(editing ? 'تغییرات ذخیره شد.' : 'رکورد جدید ثبت شد.')
      closeForm()
      invalidate()
    },
    onError: (error) => applyServerErrors(error, setErrors, fields),
  })

  const deleteMutation = useMutation({
    mutationFn: (row: any) => resource.remove(row[idKey]),
    onSuccess: () => {
      toast.success('رکورد حذف شد.')
      setDeleting(null)
      invalidate()
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || error?.response?.data?.detail || 'حذف انجام نشد.')
      setDeleting(null)
    },
  })

  const openCreate = () => {
    setEditing(null)
    setValues(initialValues(fields))
    setErrors({})
    setCreating(true)
  }

  const openEdit = (row: any) => {
    setEditing(row)
    setValues(initialValues(fields, row))
    setErrors({})
    setCreating(true)
  }

  const closeForm = () => {
    setCreating(false)
    setEditing(null)
    setErrors({})
  }

  const setValue = (name: string, value: any) => setValues((current) => ({ ...current, [name]: value }))

  const submit = () => {
    const payload: Record<string, any> = {}
    for (const field of fields) {
      if (field.readOnly) continue
      const value = values[field.name]
      if (field.type === 'image') {
        // فقط وقتی کاربر فایل تازه انتخاب کرده ارسال می‌کنیم؛ وگرنه تصویر فعلی حفظ می‌شود.
        if (value instanceof File) payload[field.name] = value
        continue
      }
      if (field.type === 'number') {
        payload[field.name] = value === '' || value === null ? null : Number(value)
        continue
      }
      if (field.type === 'select' && value === '') {
        payload[field.name] = null
        continue
      }
      payload[field.name] = value
    }
    saveMutation.mutate(payload)
  }

  return (
    <AdminPage
      title={title}
      description={description}
      actions={canCreate && (
        <button type="button" onClick={openCreate} className="btn-primary !min-h-10 !py-2 !px-4 text-sm">
          <Plus className="w-4 h-4" /> افزودن
        </button>
      )}
    >
      {(searchable || filters.length > 0) && (
        <div className="admin-toolbar">
          {searchable && (
            <label className="admin-search">
              <Search className="w-4 h-4 shrink-0" aria-hidden />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="جست‌وجو…"
                aria-label="جست‌وجو"
              />
            </label>
          )}
          {filters.map((filter) => (
            <select
              key={filter.name}
              className="admin-filter-select"
              aria-label={filter.label}
              value={activeFilters[filter.name] ?? ''}
              onChange={(event) => setActiveFilters((current) => ({ ...current, [filter.name]: event.target.value }))}
            >
              <option value="">{filter.label}</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          ))}
        </div>
      )}

      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock onRetry={() => refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="رکوردی ثبت نشده است"
          description={emptyHint}
          action={canCreate && <button type="button" onClick={openCreate} className="btn-primary">افزودن اولین رکورد</button>}
        />
      ) : (
        <DataTable headers={[
          ...tableFields.map((field) => field.label),
          ...extraColumns.map((column) => column.label),
          'عملیات',
        ]}>
          {rows.map((row: any) => (
            <tr key={row[idKey]}>
              {tableFields.map((field) => (
                <td key={field.name}>{renderCell(field, row)}</td>
              ))}
              {extraColumns.map((column, index) => (
                <td key={index}>{column.cell(row)}</td>
              ))}
              <td>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => openEdit(row)}
                    className="admin-icon-btn"
                    aria-label={`ویرایش ${row[labelKey] ?? ''}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleting(row)}
                      className="admin-icon-btn is-danger"
                      aria-label={`حذف ${row[labelKey] ?? ''}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      <Modal
        open={creating}
        title={editing ? `ویرایش ${editing[labelKey] ?? title}` : `افزودن به ${title}`}
        onClose={closeForm}
        wide
        footer={
          <>
            <button type="button" onClick={closeForm} className="btn-ghost">انصراف</button>
            <button type="button" onClick={submit} disabled={saveMutation.isPending} className="btn-primary">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              ذخیره
            </button>
          </>
        }
      >
        <div className="admin-form-grid">
          {fields.filter((field) => !field.readOnly).map((field) => (
            <FieldInput
              key={field.name}
              field={field}
              value={values[field.name]}
              error={errors[field.name]}
              onChange={(value) => setValue(field.name, value)}
            />
          ))}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="حذف رکورد"
        message={`آیا از حذف «${deleting?.[labelKey] ?? deleting?.[idKey]}» مطمئن هستید؟ این کار قابل بازگشت نیست.`}
        busy={deleteMutation.isPending}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </AdminPage>
  )
}

function renderCell(field: FieldDef, row: any) {
  if (field.cell) return field.cell(row)
  const value = row[field.name]
  if (field.type === 'switch') {
    return <span className={`admin-dot ${value ? 'is-on' : ''}`} title={value ? 'فعال' : 'غیرفعال'} />
  }
  if (field.type === 'image') {
    return value
      ? <img src={value} alt="" className="admin-thumb" loading="lazy" />
      : <span style={{ color: 'var(--text-muted)' }}>—</span>
  }
  if (field.type === 'select') {
    const option = field.options?.find((item) => String(item.value) === String(value))
    return option?.label ?? (value ? String(value) : '—')
  }
  if (field.type === 'number') {
    return value === null || value === undefined || value === '' ? '—' : Number(value).toLocaleString('fa-IR')
  }
  if (field.type === 'datetime') {
    return value ? new Date(value).toLocaleString('fa-IR') : '—'
  }
  if (value === null || value === undefined || value === '') return '—'
  const text = String(value)
  return <span className="admin-cell-clamp" title={text}>{text}</span>
}

function FieldInput({ field, value, error, onChange }: {
  field: FieldDef
  value: any
  error?: string
  onChange: (value: any) => void
}) {
  const className = field.full || field.type === 'textarea' || field.type === 'html' ? 'admin-form-grid__full' : ''

  if (field.type === 'switch') {
    return (
      <div className={className || 'admin-form-grid__full'}>
        <FormSwitch label={field.label} hint={field.hint} checked={!!value} onChange={onChange} />
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <FormSelect
        className={className}
        label={field.label}
        required={field.required}
        hint={field.hint}
        error={error}
        placeholder={field.placeholder ?? '— انتخاب کنید —'}
        options={field.options ?? []}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.type === 'textarea' || field.type === 'html') {
    return (
      <FormTextarea
        className={className}
        label={field.label}
        required={field.required}
        hint={field.hint ?? (field.type === 'html' ? 'تگ‌های HTML مجاز پشتیبانی می‌شود و پیش از ذخیره پاک‌سازی می‌شود.' : undefined)}
        error={error}
        placeholder={field.placeholder}
        rows={field.type === 'html' ? 10 : 4}
        dir={field.type === 'html' ? 'ltr' : undefined}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.type === 'image') {
    return (
      <div className={`form-field ${className}`}>
        <span className="form-label">{field.label}</span>
        <input
          type="file"
          accept="image/*"
          className="input-field is-file"
          aria-label={field.label}
          onChange={(event) => onChange(event.target.files?.[0])}
        />
        {value instanceof File
          ? <p className="form-hint">فایل انتخاب‌شده: {value.name}</p>
          : field.hint && <p className="form-hint">{field.hint}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    )
  }

  const inputType = field.type === 'number' ? 'number'
    : field.type === 'datetime' ? 'datetime-local'
    : field.type === 'color' ? 'color'
    : field.type === 'email' ? 'email'
    : field.type === 'url' ? 'url'
    : 'text'

  return (
    <FormField
      className={className}
      label={field.label}
      required={field.required}
      hint={field.hint}
      error={error}
      placeholder={field.placeholder}
      type={inputType}
      dir={field.type === 'url' || field.type === 'email' ? 'ltr' : undefined}
      inputMode={field.type === 'number' ? 'numeric' : undefined}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, Inbox, Loader2, X } from 'lucide-react'

/** پوسته هر صفحه پنل مدیر: عنوان، توضیح و دکمه‌های عملیات. */
export function AdminPage({ title, description, actions, children }: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="admin-page">
      <header className="admin-page__header">
        <div className="min-w-0">
          <h1 className="admin-page__title">{title}</h1>
          {description && <p className="admin-page__desc">{description}</p>}
        </div>
        {actions && <div className="admin-page__actions">{actions}</div>}
      </header>
      {children}
    </div>
  )
}

/** یک بخش عنوان‌دار درون صفحه‌های تنظیمات. */
export function AdminSection({ icon, title, description, children }: {
  icon?: ReactNode
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="admin-section">
      <div className="admin-section__head">
        {icon}
        <div className="min-w-0">
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}

export function StatCard({ label, value, hint, tone = 'default' }: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  return (
    <div className={`admin-stat admin-stat--${tone}`}>
      <span className="admin-stat__label">{label}</span>
      <strong className="admin-stat__value">{value}</strong>
      {hint && <span className="admin-stat__hint">{hint}</span>}
    </div>
  )
}

export function Badge({ children, tone = 'default' }: {
  children: ReactNode
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  return <span className={`admin-badge admin-badge--${tone}`}>{children}</span>
}

export function EmptyState({ title, description, action }: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="admin-empty">
      <Inbox className="w-9 h-9" aria-hidden />
      <p className="font-black mt-3">{title}</p>
      {description && <p className="text-xs mt-2" style={{ color: 'var(--text3)' }}>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingBlock({ label = 'در حال بارگذاری…' }: { label?: string }) {
  return (
    <div className="admin-loading" role="status">
      <Loader2 className="w-6 h-6 animate-spin" aria-hidden />
      <span className="text-xs">{label}</span>
    </div>
  )
}

export function ErrorBlock({ message = 'دریافت اطلاعات انجام نشد.', onRetry }: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="admin-empty" role="alert">
      <AlertTriangle className="w-9 h-9" style={{ color: '#f87171' }} aria-hidden />
      <p className="font-black mt-3">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-primary mt-5">تلاش دوباره</button>}
    </div>
  )
}

/** پنجره‌ای برای فرم‌های ایجاد و ویرایش. */
export function Modal({ open, title, onClose, children, footer, wide = false }: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKeyDown)
    // جلوگیری از اسکرول پس‌زمینه هنگام باز بودن پنجره.
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" className="admin-modal__backdrop" onClick={onClose} aria-label="بستن" />
      <div className={`admin-modal__panel ${wide ? 'is-wide' : ''}`}>
        <header className="admin-modal__header">
          <h2>{title}</h2>
          <button type="button" onClick={onClose} className="icon-surface !w-8 !h-8" aria-label="بستن">
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="admin-modal__body">{children}</div>
        {footer && <footer className="admin-modal__footer">{footer}</footer>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'حذف', busy, onConfirm, onCancel }: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel} className="btn-ghost">انصراف</button>
          <button type="button" onClick={onConfirm} disabled={busy} className="btn-danger">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-7" style={{ color: 'var(--text2)' }}>{message}</p>
    </Modal>
  )
}

/** جدول ساده و ریسپانسیو (در موبایل افقی اسکرول می‌شود). */
export function DataTable({ headers, children }: { headers: ReactNode[]; children: ReactNode }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>{headers.map((header, index) => <th key={index}>{header}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Loader2, Mail, MailOpen, Search, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  AdminPage, Badge, ConfirmDialog, DataTable, EmptyState, ErrorBlock, LoadingBlock, Modal,
} from '@/components/admin/AdminUI'
import { FormTextarea } from '@/components/ui/FormField'
import { adminMessages, asList, getNewsletterSubscribers } from '@/api/admin'

export default function AdminMessages() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [read, setRead] = useState('')
  const [active, setActive] = useState<any | null>(null)
  const [note, setNote] = useState('')
  const [deleting, setDeleting] = useState<any | null>(null)
  const [showNewsletter, setShowNewsletter] = useState(false)

  const params = { search: search || undefined, is_read: read || undefined }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-messages', params],
    queryFn: () => adminMessages.list(params),
  })

  const { data: subscribers, isLoading: subscribersLoading } = useQuery({
    queryKey: ['admin-newsletter'],
    queryFn: getNewsletterSubscribers,
    enabled: showNewsletter,
  })

  const rows = asList<any>(data)
  const subscriberRows = asList<any>(subscribers)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-messages'] })

  useEffect(() => { setNote(active?.admin_note ?? '') }, [active])

  const patchMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, any> }) => adminMessages.update(id, payload),
    onSuccess: () => { invalidate() },
    onError: () => toast.error('به‌روزرسانی انجام نشد.'),
  })

  const saveNote = useMutation({
    mutationFn: () => adminMessages.update(active.id, { admin_note: note, is_read: true }),
    onSuccess: () => { toast.success('یادداشت ذخیره شد.'); setActive(null); invalidate() },
    onError: () => toast.error('ذخیره یادداشت انجام نشد.'),
  })

  const removeMutation = useMutation({
    mutationFn: (row: any) => adminMessages.remove(row.id),
    onSuccess: () => { toast.success('پیام حذف شد.'); setDeleting(null); invalidate() },
    onError: () => { toast.error('حذف انجام نشد.'); setDeleting(null) },
  })

  const openMessage = (row: any) => {
    setActive(row)
    if (!row.is_read) patchMutation.mutate({ id: row.id, payload: { is_read: true } })
  }

  const exportEmails = () => {
    const emails = subscriberRows.map((item: any) => item.email).join('\n')
    const blob = new Blob([emails], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'newsletter-emails.txt'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminPage
      title="پیام‌ها و خبرنامه"
      description="پیام‌های فرم تماس و فهرست اعضای خبرنامه."
      actions={
        <button type="button" className="btn-ghost !min-h-10 !py-2 !px-4 text-sm" onClick={() => setShowNewsletter(true)}>
          <Mail className="w-4 h-4" /> اعضای خبرنامه
        </button>
      }
    >
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search aria-hidden />
          <input value={search} onChange={(event) => setSearch(event.target.value)}
            placeholder="جست‌وجو در نام، موضوع یا متن پیام…" aria-label="جست‌وجوی پیام" />
        </label>
        <select className="admin-filter-select" aria-label="وضعیت خواندن" value={read}
          onChange={(event) => setRead(event.target.value)}>
          <option value="">همه پیام‌ها</option>
          <option value="false">خوانده‌نشده</option>
          <option value="true">خوانده‌شده</option>
        </select>
      </div>

      {isLoading ? <LoadingBlock />
        : isError ? <ErrorBlock onRetry={() => refetch()} />
        : rows.length === 0 ? <EmptyState title="پیامی وجود ندارد" description="پیام‌های فرم «تماس با ما» اینجا نمایش داده می‌شوند." />
        : (
          <DataTable headers={['فرستنده', 'موضوع', 'خلاصه پیام', 'تاریخ', 'وضعیت', 'عملیات']}>
            {rows.map((row: any) => (
              <tr key={row.id} style={row.is_read ? undefined : { fontWeight: 700 }}>
                <td>
                  <button type="button" onClick={() => openMessage(row)} style={{ color: 'var(--text1)', fontWeight: 800 }}>
                    {row.name}
                  </button>
                  <span style={{ display: 'block', fontSize: '.65rem', color: 'var(--text-muted)', direction: 'ltr' }}>
                    {row.phone}
                  </span>
                </td>
                <td>{row.subject || '—'}</td>
                <td><span className="admin-cell-clamp" title={row.message}>{row.message}</span></td>
                <td>{new Date(row.created_at).toLocaleDateString('fa-IR')}</td>
                <td>{row.is_read ? <Badge tone="default">خوانده‌شده</Badge> : <Badge tone="warning">جدید</Badge>}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <button type="button" className="admin-icon-btn" aria-label="مشاهده پیام" onClick={() => openMessage(row)}>
                      <MailOpen className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" className="admin-icon-btn is-danger" aria-label="حذف پیام" onClick={() => setDeleting(row)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}

      <Modal
        open={!!active}
        title={active?.subject || 'پیام مشتری'}
        onClose={() => setActive(null)}
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setActive(null)}>بستن</button>
            <button type="button" className="btn-primary" onClick={() => saveNote.mutate()} disabled={saveNote.isPending}>
              {saveNote.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              ذخیره یادداشت
            </button>
          </>
        }
      >
        {active && (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-3 text-xs" style={{ color: 'var(--text2)' }}>
              <div><dt style={{ color: 'var(--text3)' }}>نام</dt><dd className="font-black mt-1">{active.name}</dd></div>
              <div><dt style={{ color: 'var(--text3)' }}>موبایل</dt><dd className="font-black mt-1" dir="ltr">{active.phone}</dd></div>
              <div><dt style={{ color: 'var(--text3)' }}>ایمیل</dt><dd className="font-black mt-1" dir="ltr">{active.email || '—'}</dd></div>
              <div><dt style={{ color: 'var(--text3)' }}>تاریخ</dt><dd className="font-black mt-1">{new Date(active.created_at).toLocaleString('fa-IR')}</dd></div>
            </dl>
            <p className="text-sm leading-8 whitespace-pre-wrap" style={{ color: 'var(--text1)' }}>{active.message}</p>
            <FormTextarea
              label="یادداشت داخلی"
              hint="فقط برای مدیران قابل مشاهده است."
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={showNewsletter}
        title="اعضای خبرنامه"
        onClose={() => setShowNewsletter(false)}
        wide
        footer={
          <>
            <button type="button" className="btn-ghost" onClick={() => setShowNewsletter(false)}>بستن</button>
            <button type="button" className="btn-primary" onClick={exportEmails} disabled={subscriberRows.length === 0}>
              <Download className="w-4 h-4" /> دریافت فهرست ایمیل‌ها
            </button>
          </>
        }
      >
        {subscribersLoading ? <LoadingBlock />
          : subscriberRows.length === 0 ? <EmptyState title="عضوی ثبت نشده است" description="فرم خبرنامه در فوتر سایت نمایش داده می‌شود." />
          : (
            <DataTable headers={['ایمیل', 'وضعیت', 'تاریخ عضویت']}>
              {subscriberRows.map((row: any) => (
                <tr key={row.id ?? row.email}>
                  <td dir="ltr">{row.email}</td>
                  <td>{row.is_active === false ? <Badge tone="default">لغو شده</Badge> : <Badge tone="success">فعال</Badge>}</td>
                  <td>{row.created_at ? new Date(row.created_at).toLocaleDateString('fa-IR') : '—'}</td>
                </tr>
              ))}
            </DataTable>
          )}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="حذف پیام"
        message={`پیام «${deleting?.name ?? ''}» برای همیشه حذف می‌شود.`}
        busy={removeMutation.isPending}
        onConfirm={() => deleting && removeMutation.mutate(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </AdminPage>
  )
}

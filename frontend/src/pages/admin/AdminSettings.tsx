import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  BadgeCheck, Bell, CreditCard, Globe, Loader2, MessageSquare,
  Palette, Phone, Save, Search, Share2, Truck,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { AdminPage, AdminSection, ErrorBlock, LoadingBlock } from '@/components/admin/AdminUI'
import { FormField, FormSelect, FormSwitch, FormTextarea } from '@/components/ui/FormField'
import { getAdminSettings, updateAdminSettings } from '@/api/admin'

type Kind = 'text' | 'textarea' | 'html' | 'number' | 'switch' | 'select' | 'image' | 'color' | 'email' | 'url' | 'tel' | 'secret'

interface Field {
  name: string
  label: string
  kind?: Kind
  hint?: string
  placeholder?: string
  options?: { value: string; label: string }[]
  full?: boolean
}

interface Group {
  id: string
  label: string
  icon: ReactNode
  title: string
  description: string
  fields: Field[]
}

const GATEWAYS = [
  { value: 'zarinpal', label: 'زرین‌پال' },
  { value: 'zibal', label: 'زیبال' },
  { value: 'idpay', label: 'آیدی‌پی' },
  { value: 'nextpay', label: 'نکست‌پی' },
]

const SMS_PROVIDERS = [
  { value: 'kavenegar', label: 'کاوه‌نگار' },
  { value: 'smsir', label: 'اس‌ام‌اس دات آی‌آر' },
  { value: 'melipayamak', label: 'ملی پیامک' },
  { value: 'console', label: 'فقط ثبت در لاگ (تست)' },
]

const GROUPS: Group[] = [
  {
    id: 'brand',
    label: 'برند',
    icon: <Palette />,
    title: 'هویت برند',
    description: 'نام، شعار و تصاویر فروشگاه. این مقادیر در هدر، فوتر، عنوان صفحه‌ها و اشتراک‌گذاری شبکه‌های اجتماعی استفاده می‌شوند.',
    fields: [
      { name: 'site_name', label: 'نام سایت (فارسی)', placeholder: 'ن وان' },
      { name: 'site_name_en', label: 'نام سایت (انگلیسی)', kind: 'url', placeholder: 'N ONE' },
      { name: 'tagline', label: 'شعار کوتاه', full: true, placeholder: 'فروشگاه اینترنتی محصولات اصل' },
      { name: 'description', label: 'معرفی فروشگاه', kind: 'textarea', full: true, hint: 'در فوتر و توضیحات پیش‌فرض سئو استفاده می‌شود.' },
      { name: 'primary_color', label: 'رنگ اصلی', kind: 'color', hint: 'فرمت هگز مانند ‎#ff6b3d' },
      { name: 'logo', label: 'لوگو (پس‌زمینه تیره)', kind: 'image' },
      { name: 'logo_light', label: 'لوگو (پس‌زمینه روشن)', kind: 'image' },
      { name: 'favicon', label: 'فاوآیکون', kind: 'image', hint: 'ترجیحاً ۵۱۲×۵۱۲ پیکسل.' },
      { name: 'og_image', label: 'تصویر اشتراک‌گذاری', kind: 'image', hint: 'ابعاد پیشنهادی ۱۲۰۰×۶۳۰ پیکسل.' },
    ],
  },
  {
    id: 'contact',
    label: 'تماس',
    icon: <Phone />,
    title: 'اطلاعات تماس',
    description: 'در صفحه تماس، فوتر و ویجت پشتیبانی نمایش داده می‌شود.',
    fields: [
      { name: 'phone', label: 'تلفن اصلی', kind: 'tel', placeholder: '021-12345678' },
      { name: 'phone_secondary', label: 'تلفن دوم', kind: 'tel' },
      { name: 'email', label: 'ایمیل', kind: 'email' },
      { name: 'working_hours', label: 'ساعات کاری', placeholder: 'شنبه تا چهارشنبه، ۹ تا ۱۸' },
      { name: 'postal_code', label: 'کد پستی' },
      { name: 'business_license', label: 'شماره پروانه کسب' },
      { name: 'address', label: 'نشانی', kind: 'textarea', full: true },
      { name: 'map_lat', label: 'عرض جغرافیایی', kind: 'number' },
      { name: 'map_lng', label: 'طول جغرافیایی', kind: 'number' },
      { name: 'legal_owner', label: 'مالک حقوقی', full: true, hint: 'نام ثبت‌شده کسب‌وکار؛ در فوتر و صفحه قوانین می‌آید.' },
    ],
  },
  {
    id: 'social',
    label: 'شبکه‌های اجتماعی',
    icon: <Share2 />,
    title: 'شبکه‌های اجتماعی',
    description: 'هر آدرسی که خالی بماند، آیکون آن در سایت نمایش داده نمی‌شود.',
    fields: [
      { name: 'instagram', label: 'اینستاگرام', kind: 'url' },
      { name: 'telegram', label: 'تلگرام', kind: 'url' },
      { name: 'whatsapp', label: 'واتس‌اپ', kind: 'text', hint: 'شماره با کد کشور، مثلاً ۹۸۹۱۲۰۰۰۰۰۰۰' },
      { name: 'twitter', label: 'ایکس (توییتر)', kind: 'url' },
      { name: 'linkedin', label: 'لینکدین', kind: 'url' },
      { name: 'aparat', label: 'آپارات', kind: 'url' },
      { name: 'youtube', label: 'یوتیوب', kind: 'url' },
    ],
  },
  {
    id: 'trust',
    label: 'نمادهای اعتماد',
    icon: <BadgeCheck />,
    title: 'نماد اعتماد و ساماندهی',
    description: 'کد رسمی نماد را از پنل اینماد/ساماندهی کپی کنید. کد پیش از ذخیره پاک‌سازی می‌شود و فقط تگ‌های امن باقی می‌ماند.',
    fields: [
      { name: 'enamad_html', label: 'کد نماد اعتماد الکترونیکی', kind: 'html', full: true },
      { name: 'samandehi_html', label: 'کد نشان ساماندهی', kind: 'html', full: true },
    ],
  },
  {
    id: 'shipping',
    label: 'ارسال و مالی',
    icon: <Truck />,
    title: 'ارسال و محاسبات مالی',
    description: 'این مقادیر هم در سبد خرید و تسویه نمایش داده می‌شوند و هم مبنای محاسبه نهایی سفارش در سرور هستند.',
    fields: [
      { name: 'free_shipping_threshold', label: 'سقف ارسال رایگان (تومان)', kind: 'number', hint: 'خرید بالاتر از این مبلغ، ارسال رایگان می‌شود. صفر یعنی همیشه رایگان.' },
      { name: 'flat_shipping_cost', label: 'هزینه ثابت ارسال (تومان)', kind: 'number' },
      { name: 'tax_percent', label: 'درصد مالیات بر ارزش افزوده', kind: 'number' },
      { name: 'currency_label', label: 'واحد پول', placeholder: 'تومان' },
      { name: 'shipping_note', label: 'یادداشت ارسال', full: true, placeholder: 'ارسال به سراسر کشور با پست پیشتاز' },
    ],
  },
  {
    id: 'payment',
    label: 'درگاه پرداخت',
    icon: <CreditCard />,
    title: 'درگاه پرداخت',
    description: 'اطلاعات درگاه فقط روی سرور ذخیره می‌شود و هرگز به کاربران عادی نمایش داده نمی‌شود.',
    fields: [
      { name: 'payment_gateway', label: 'درگاه فعال', kind: 'select', options: GATEWAYS },
      { name: 'gateway_merchant_id', label: 'مرچنت‌کد / کلید درگاه', kind: 'secret', hint: 'مرچنت‌کد زرین‌پال باید دقیقاً ۳۶ نویسه باشد. خالی بگذارید تا تغییری نکند.' },
      { name: 'online_payment_enabled', label: 'پرداخت آنلاین فعال باشد', kind: 'switch' },
      { name: 'gateway_sandbox', label: 'حالت آزمایشی (Sandbox)', kind: 'switch', hint: 'برای تحویل نهایی حتماً خاموش شود.' },
      { name: 'cod_enabled', label: 'پرداخت در محل فعال باشد', kind: 'switch' },
    ],
  },
  {
    id: 'sms',
    label: 'پنل پیامکی',
    icon: <MessageSquare />,
    title: 'پنل پیامکی و ورود با کد یک‌بارمصرف',
    description: 'کلید و رمز سرویس‌دهنده فقط نوشتنی هستند؛ اگر خالی بمانند مقدار قبلی حفظ می‌شود.',
    fields: [
      { name: 'sms_enabled', label: 'ارسال پیامک فعال باشد', kind: 'switch' },
      { name: 'otp_login_enabled', label: 'ورود با کد پیامکی فعال باشد', kind: 'switch' },
      { name: 'sms_provider', label: 'سرویس‌دهنده', kind: 'select', options: SMS_PROVIDERS },
      { name: 'sms_sender', label: 'شماره فرستنده', kind: 'text' },
      { name: 'sms_api_key', label: 'کلید API', kind: 'secret' },
      { name: 'sms_username', label: 'نام کاربری', kind: 'text', hint: 'برای ملی پیامک لازم است.' },
      { name: 'sms_password', label: 'رمز عبور', kind: 'secret', hint: 'برای ملی پیامک لازم است.' },
      { name: 'sms_otp_template', label: 'نام پترن کد تأیید', kind: 'text' },
      { name: 'sms_admin_phone', label: 'موبایل مدیر', kind: 'tel', hint: 'اعلان سفارش جدید به این شماره می‌رود.' },
      { name: 'sms_on_order_created', label: 'پیامک هنگام ثبت سفارش', kind: 'switch' },
      { name: 'sms_on_order_paid', label: 'پیامک هنگام پرداخت موفق', kind: 'switch' },
      { name: 'sms_on_order_shipped', label: 'پیامک هنگام ارسال سفارش', kind: 'switch' },
      { name: 'sms_on_order_delivered', label: 'پیامک هنگام تحویل سفارش', kind: 'switch' },
      { name: 'sms_notify_admin_on_order', label: 'اعلان سفارش جدید به مدیر', kind: 'switch' },
    ],
  },
  {
    id: 'seo',
    label: 'سئو و فیدها',
    icon: <Search />,
    title: 'سئو و فید فروشگاه‌ها',
    description: 'فیدها روی ‎/feeds/torob.xml، ‎/feeds/emalls.xml و ‎/feeds/google.xml منتشر می‌شوند.',
    fields: [
      { name: 'meta_title', label: 'عنوان پیش‌فرض صفحه', full: true },
      { name: 'meta_description', label: 'توضیحات متا', kind: 'textarea', full: true, hint: 'حدود ۱۵۰ نویسه بهترین نتیجه را در گوگل می‌دهد.' },
      { name: 'meta_keywords', label: 'کلیدواژه‌ها', full: true, placeholder: 'با ویرگول جدا کنید' },
      { name: 'google_analytics_id', label: 'شناسه گوگل آنالیتیکس', kind: 'url', placeholder: 'G-XXXXXXXXXX' },
      { name: 'google_site_verification', label: 'کد تأیید سرچ کنسول', kind: 'url' },
      { name: 'torob_feed_enabled', label: 'فید ترب فعال باشد', kind: 'switch' },
      { name: 'emalls_feed_enabled', label: 'فید ایمالز فعال باشد', kind: 'switch' },
      { name: 'google_feed_enabled', label: 'فید گوگل/عمومی فعال باشد', kind: 'switch' },
      { name: 'feed_default_guarantee', label: 'گارانتی پیش‌فرض در فید', placeholder: 'گارانتی اصالت کالا' },
      { name: 'feed_shipping_days', label: 'روزهای ارسال در فید', kind: 'number' },
    ],
  },
  {
    id: 'notice',
    label: 'اعلان و تعمیر',
    icon: <Bell />,
    title: 'نوار اعلان و حالت تعمیر',
    description: 'نوار اعلان بالای همه صفحه‌ها دیده می‌شود. حالت تعمیر، فروشگاه را موقتاً از دسترس بازدیدکنندگان خارج می‌کند.',
    fields: [
      { name: 'announcement_enabled', label: 'نوار اعلان فعال باشد', kind: 'switch' },
      { name: 'maintenance_mode', label: 'حالت تعمیر فعال باشد', kind: 'switch', hint: 'با فعال شدن، فقط مدیران به سایت دسترسی دارند.' },
      { name: 'announcement_text', label: 'متن اعلان', full: true },
      { name: 'announcement_link', label: 'لینک اعلان', kind: 'url', full: true, placeholder: '/products?sale=1' },
      { name: 'maintenance_message', label: 'پیام حالت تعمیر', kind: 'textarea', full: true },
    ],
  },
]

const ALL_FIELDS = GROUPS.flatMap((group) => group.fields)

/** پاسخ سرور را به مقادیر قابل ویرایش فرم تبدیل می‌کند. */
function toFormState(data: Record<string, any>) {
  const values: Record<string, any> = {}
  for (const field of ALL_FIELDS) {
    if (field.kind === 'image') continue // تصویر فقط هنگام انتخاب فایل تازه ارسال می‌شود.
    if (field.kind === 'secret') { values[field.name] = ''; continue }
    const raw = data?.[field.name]
    values[field.name] = field.kind === 'switch' ? Boolean(raw) : (raw ?? '')
  }
  return values
}

export default function AdminSettings() {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState(GROUPS[0].id)
  const [values, setValues] = useState<Record<string, any>>({})
  const [files, setFiles] = useState<Record<string, File>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [dirty, setDirty] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: getAdminSettings,
  })

  useEffect(() => {
    if (data) {
      setValues(toFormState(data))
      setFiles({})
      setDirty(false)
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: (payload: Record<string, any>) => updateAdminSettings(payload),
    onSuccess: (updated) => {
      toast.success('تنظیمات ذخیره شد.')
      setErrors({})
      setFiles({})
      setDirty(false)
      queryClient.setQueryData(['admin-settings'], updated)
      // تنظیمات عمومی سایت هم باید تازه شود تا هدر و فوتر بلافاصله به‌روز شوند.
      queryClient.invalidateQueries({ queryKey: ['site-settings'] })
    },
    onError: (error: any) => {
      const payload = error?.response?.data
      if (payload && typeof payload === 'object') {
        const known = new Set(ALL_FIELDS.map((field) => field.name))
        const fieldErrors: Record<string, string> = {}
        for (const [key, value] of Object.entries(payload)) {
          const message = Array.isArray(value) ? String(value[0]) : String(value)
          if (known.has(key)) fieldErrors[key] = message
          else toast.error(message)
        }
        setErrors(fieldErrors)
        // کاربر باید ببیند خطا در کدام زبانه است.
        const firstBad = GROUPS.find((group) => group.fields.some((field) => fieldErrors[field.name]))
        if (firstBad) {
          setTab(firstBad.id)
          toast.error('برخی فیلدها نیاز به اصلاح دارند.')
        }
      } else {
        toast.error('ذخیره تنظیمات انجام نشد.')
      }
    },
  })

  const setValue = (name: string, value: any) => {
    setValues((current) => ({ ...current, [name]: value }))
    setDirty(true)
  }

  const setFile = (name: string, file?: File) => {
    setFiles((current) => {
      const next = { ...current }
      if (file) next[name] = file
      else delete next[name]
      return next
    })
    setDirty(true)
  }

  const submit = () => {
    const payload: Record<string, any> = {}
    for (const field of ALL_FIELDS) {
      if (field.kind === 'image') continue
      const value = values[field.name]
      // فیلدهای محرمانه فقط وقتی پر شده‌اند ارسال می‌شوند؛ خالی یعنی «تغییر نکند».
      if (field.kind === 'secret' && !String(value ?? '').trim()) continue
      if (field.kind === 'number') {
        payload[field.name] = value === '' || value === null || value === undefined ? null : Number(value)
        continue
      }
      payload[field.name] = value ?? ''
    }
    for (const [name, file] of Object.entries(files)) payload[name] = file
    mutation.mutate(payload)
  }

  const activeGroup = useMemo(() => GROUPS.find((group) => group.id === tab) ?? GROUPS[0], [tab])
  const errorGroups = useMemo(
    () => new Set(GROUPS.filter((group) => group.fields.some((field) => errors[field.name])).map((group) => group.id)),
    [errors],
  )

  if (isLoading) return <AdminPage title="تنظیمات سایت"><LoadingBlock /></AdminPage>
  if (isError) return <AdminPage title="تنظیمات سایت"><ErrorBlock onRetry={() => refetch()} /></AdminPage>

  return (
    <AdminPage
      title="تنظیمات سایت"
      description="همه چیز از همین‌جا کنترل می‌شود: برند، تماس، ارسال، درگاه پرداخت، پنل پیامکی، سئو و فیدهای ترب و ایمالز."
    >
      <nav className="admin-tabs" aria-label="بخش‌های تنظیمات">
        {GROUPS.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setTab(group.id)}
            className={tab === group.id ? 'is-active' : ''}
            aria-current={tab === group.id ? 'page' : undefined}
          >
            {group.label}
            {errorGroups.has(group.id) && <span style={{ color: '#e5484d' }} aria-label="دارای خطا">●</span>}
          </button>
        ))}
      </nav>

      <AdminSection icon={activeGroup.icon} title={activeGroup.title} description={activeGroup.description}>
        <div className="admin-form-grid">
          {activeGroup.fields.map((field) => (
            <SettingInput
              key={field.name}
              field={field}
              value={values[field.name]}
              current={data?.[field.name]}
              hasSecret={field.name === 'sms_api_key' ? data?.has_sms_api_key
                : field.name === 'gateway_merchant_id' ? data?.has_gateway_merchant_id
                : undefined}
              file={files[field.name]}
              error={errors[field.name]}
              onChange={(value) => setValue(field.name, value)}
              onFile={(file) => setFile(field.name, file)}
            />
          ))}
        </div>
      </AdminSection>

      <div className="admin-sticky-actions">
        <span>{dirty ? 'تغییرات ذخیره‌نشده دارید.' : 'همه تغییرات ذخیره شده است.'}</span>
        <button
          type="button"
          className="btn-ghost !min-h-10 !py-2"
          onClick={() => { refetch(); setErrors({}) }}
          disabled={mutation.isPending}
        >
          بازگردانی
        </button>
        <button type="button" className="btn-primary !min-h-10 !py-2" onClick={submit} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          ذخیره تنظیمات
        </button>
      </div>
    </AdminPage>
  )
}

function SettingInput({ field, value, current, hasSecret, file, error, onChange, onFile }: {
  field: Field
  value: any
  current?: any
  hasSecret?: boolean
  file?: File
  error?: string
  onChange: (value: any) => void
  onFile: (file?: File) => void
}) {
  const className = field.full || field.kind === 'textarea' || field.kind === 'html' ? 'admin-form-grid__full' : ''

  if (field.kind === 'switch') {
    return (
      <div className={className}>
        <FormSwitch label={field.label} hint={field.hint} checked={!!value} onChange={onChange} />
      </div>
    )
  }

  if (field.kind === 'select') {
    return (
      <FormSelect
        className={className}
        label={field.label}
        hint={field.hint}
        error={error}
        options={field.options ?? []}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.kind === 'textarea' || field.kind === 'html') {
    return (
      <FormTextarea
        className={className}
        label={field.label}
        hint={field.hint ?? (field.kind === 'html' ? 'کد را مستقیم از پنل مرجع کپی کنید؛ تگ‌های ناامن حذف می‌شوند.' : undefined)}
        error={error}
        placeholder={field.placeholder}
        rows={field.kind === 'html' ? 6 : 4}
        dir={field.kind === 'html' ? 'ltr' : undefined}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  if (field.kind === 'image') {
    const preview = file ? URL.createObjectURL(file) : (typeof current === 'string' ? current : '')
    return (
      <div className={`form-field ${className}`}>
        <span className="form-label">{field.label}</span>
        <div className="flex items-center gap-3">
          {preview
            ? <img src={preview} alt="" className="admin-thumb" />
            : <span className="admin-thumb" aria-hidden />}
          <input
            type="file"
            accept="image/*"
            className="input-field is-file"
            aria-label={field.label}
            onChange={(event) => onFile(event.target.files?.[0])}
          />
        </div>
        {file
          ? <p className="form-hint">فایل جدید: {file.name}</p>
          : field.hint && <p className="form-hint">{field.hint}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    )
  }

  if (field.kind === 'secret') {
    return (
      <FormField
        className={className}
        label={field.label}
        error={error}
        type="password"
        dir="ltr"
        autoComplete="new-password"
        placeholder={hasSecret ? '•••••••• (ذخیره شده)' : 'وارد کنید'}
        hint={field.hint ?? (hasSecret ? 'برای حفظ مقدار فعلی، این فیلد را خالی بگذارید.' : undefined)}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }

  const type = field.kind === 'number' ? 'number'
    : field.kind === 'email' ? 'email'
    : field.kind === 'color' ? 'text'
    : field.kind === 'tel' ? 'tel'
    : 'text'

  return (
    <FormField
      className={className}
      label={field.label}
      hint={field.hint}
      error={error}
      placeholder={field.placeholder}
      type={type}
      dir={field.kind === 'url' || field.kind === 'email' || field.kind === 'color' ? 'ltr' : undefined}
      inputMode={field.kind === 'number' ? 'decimal' : undefined}
      prefix={field.kind === 'color' && value
        ? <span style={{ width: 14, height: 14, borderRadius: 4, background: String(value), display: 'block' }} />
        : field.kind === 'url' ? <Globe className="w-4 h-4" /> : undefined}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

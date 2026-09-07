import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, MessageSquare, Smartphone, User } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { login, requestOtp, verifyOtp } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import usePageMeta from '@/hooks/usePageMeta'
import ThemeToggle from '@/components/ui/ThemeToggle'
import PageTransition from '@/components/ui/PageTransition'
import LogoMark from '@/components/brand/LogoMark'
import { FormField } from '@/components/ui/FormField'
import { mobileSchema, otpSchema, toEnglishDigits } from '@/utils/validation'

const passwordFormSchema = z.object({
  username: z.string().trim().min(1, 'نام کاربری الزامی است.'),
  password: z.string().min(1, 'رمز عبور الزامی است.'),
})
type PasswordValues = z.infer<typeof passwordFormSchema>

const phoneFormSchema = z.object({ phone: mobileSchema })
type PhoneValues = z.infer<typeof phoneFormSchema>

const codeFormSchema = z.object({ code: otpSchema })
type CodeValues = z.infer<typeof codeFormSchema>

/** مسیر بازگشت را فقط اگر داخلی باشد می‌پذیریم (جلوگیری از open redirect). */
function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/'
  return value
}

export default function Login() {
  const [mode, setMode] = useState<'password' | 'otp'>('password')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setAuth } = useAuthStore()
  const { settings } = useSiteSettings()
  const siteName = settings?.site_name || 'ن وان'
  const otpEnabled = !!settings?.otp_login_enabled

  usePageMeta({ title: 'ورود به حساب', noindex: true })

  useEffect(() => {
    if (!otpEnabled && mode === 'otp') setMode('password')
  }, [otpEnabled, mode])

  const finish = (res: any, greeting?: string) => {
    setAuth(res.user, res.tokens)
    toast.success(greeting || `خوش آمدید ${res.user.full_name || res.user.username}!`)
    navigate(safeNextPath(searchParams.get('next')))
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex">
        {/* ستون تزئینی — فقط دسکتاپ */}
        <div
          className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--surface2) 0%, var(--surface3) 50%, var(--surface) 100%)' }}
        >
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-[80px]"
               style={{ background: 'color-mix(in srgb, var(--primary) 25%, transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full blur-[60px]"
               style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)' }} />

          <div className="relative flex items-center gap-3">
            <LogoMark size={40} />
            <span className="text-xl font-black">{siteName}</span>
          </div>

          <div className="relative">
            <div className="section-label mb-6">به {siteName} خوش آمدید</div>
            <h2 className="text-4xl font-black leading-tight mb-4" style={{ color: 'var(--text1)' }}>
              ادامه‌ی یک<br />
              <span className="text-gradient">انتخاب خوب</span>
            </h2>
            <p className="leading-relaxed max-w-xs" style={{ color: 'var(--text3)' }}>
              وارد حساب خود شوید تا سبد خرید و علاقه‌مندی‌هایتان در دسترس باشد.
            </p>

            <div className="mt-10 glass rounded-2xl p-5 max-w-xs">
              <p className="text-sm font-bold mb-2">همه‌چیز سر جای خودش</p>
              <p className="text-xs leading-6" style={{ color: 'var(--text3)' }}>
                محصولات ذخیره‌شده و سبد خرید شما بعد از ورود آماده است.
              </p>
            </div>
          </div>

          <p className="relative text-xs" style={{ color: 'var(--text4)' }}>
            © {new Date().toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric' })} {siteName}
          </p>
        </div>

        {/* ستون فرم */}
        <div className="flex-1 lg:max-w-md flex items-center justify-center px-6 py-12" style={{ background: 'var(--surface)' }}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm"
          >
            <div className="lg:hidden flex items-center justify-between gap-2 mb-8">
              <Link to="/" className="flex items-center gap-2">
                <LogoMark size={36} />
                <span className="font-black text-lg">{siteName}</span>
              </Link>
              <ThemeToggle compact />
            </div>

            <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--text1)' }}>ورود</h1>
            <p className="text-sm mb-7" style={{ color: 'var(--text3)' }}>
              به حساب کاربری خود وارد شوید
            </p>

            {otpEnabled && (
              <div
                className="flex p-1 rounded-2xl border mb-6"
                style={{ borderColor: 'var(--border)', background: 'var(--glass-bg2)' }}
                role="tablist"
              >
                <TabButton active={mode === 'password'} onClick={() => setMode('password')} icon={Lock}>
                  رمز عبور
                </TabButton>
                <TabButton active={mode === 'otp'} onClick={() => setMode('otp')} icon={MessageSquare}>
                  کد پیامکی
                </TabButton>
              </div>
            )}

            {mode === 'password' ? <PasswordForm onSuccess={finish} /> : <OtpForm onSuccess={finish} />}

            <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text3)' }}>
                حساب کاربری ندارید؟{' '}
                <Link to="/register" className="font-bold" style={{ color: 'var(--primary)' }}>
                  ثبت‌نام کنید
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: typeof Lock
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors"
      style={
        active
          ? { background: 'var(--primary)', color: '#fff' }
          : { color: 'var(--text3)' }
      }
    >
      <Icon className="w-4 h-4" aria-hidden />
      {children}
    </button>
  )
}

/* ——— ورود با نام کاربری و رمز ——— */

function PasswordForm({ onSuccess }: { onSuccess: (res: any) => void }) {
  const [showPass, setShowPass] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = async (values: PasswordValues) => {
    try {
      onSuccess(await login(values))
    } catch (err: any) {
      const data = err?.response?.data
      const message = data?.non_field_errors?.[0] || data?.detail
      if (message) setError('password', { message: String(message) })
      else toast.error('ورود ناموفق بود. دوباره تلاش کنید.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <FormField
        label="نام کاربری"
        required
        autoComplete="username"
        placeholder="نام کاربری یا شماره موبایل"
        error={errors.username?.message}
        prefix={<User className="w-4 h-4" aria-hidden />}
        {...register('username')}
      />

      <FormField
        label="رمز عبور"
        required
        type={showPass ? 'text' : 'password'}
        autoComplete="current-password"
        placeholder="رمز عبور"
        error={errors.password?.message}
        prefix={<Lock className="w-4 h-4" aria-hidden />}
        suffix={
          <button
            type="button"
            onClick={() => setShowPass((value) => !value)}
            aria-label={showPass ? 'پنهان کردن رمز' : 'نمایش رمز'}
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        {...register('password')}
      />

      <p className="text-xs text-left" style={{ color: 'var(--text-muted)' }}>
        بازیابی رمز از طریق پشتیبانی
      </p>

      <button type="submit" disabled={isSubmitting} className="btn-primary w-full !py-4 text-base mt-2">
        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <ArrowRight className="w-4 h-4" aria-hidden />}
        {isSubmitting ? 'در حال ورود…' : 'ورود به حساب'}
      </button>
    </form>
  )
}

/* ——— ورود با کد پیامکی ——— */

function OtpForm({ onSuccess }: { onSuccess: (res: any, greeting?: string) => void }) {
  const [phone, setPhone] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const startCooldown = (seconds: number) => {
    setCooldown(seconds)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setCooldown((value) => {
        if (value <= 1 && timerRef.current) clearInterval(timerRef.current)
        return Math.max(0, value - 1)
      })
    }, 1000)
  }

  const phoneForm = useForm<PhoneValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
  })
  const codeForm = useForm<CodeValues>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: { code: '' },
  })

  const sendCode = async (values: PhoneValues) => {
    try {
      const res = await requestOtp(values.phone)
      setPhone(values.phone)
      startCooldown(res.resend_after || 60)
      toast.success('کد تأیید پیامک شد.')
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.response?.data?.phone?.[0]
      phoneForm.setError('phone', { message: String(message || 'ارسال کد انجام نشد.') })
    }
  }

  const confirmCode = async (values: CodeValues) => {
    try {
      const res = await verifyOtp(phone, values.code)
      onSuccess(res, res.is_new_user ? 'حساب شما ساخته شد. خوش آمدید!' : undefined)
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.response?.data?.code?.[0]
      codeForm.setError('code', { message: String(message || 'کد تأیید نادرست است.') })
    }
  }

  if (!phone) {
    return (
      <form onSubmit={phoneForm.handleSubmit(sendCode)} noValidate className="space-y-4">
        <FormField
          label="شماره موبایل"
          required
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="09xxxxxxxxx"
          hint="کد ۵ رقمی تأیید به این شماره پیامک می‌شود."
          error={phoneForm.formState.errors.phone?.message}
          suffix={<Smartphone className="w-4 h-4" aria-hidden />}
          {...phoneForm.register('phone')}
        />

        <button type="submit" disabled={phoneForm.formState.isSubmitting} className="btn-primary w-full !py-4 text-base mt-2">
          {phoneForm.formState.isSubmitting
            ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            : <MessageSquare className="w-4 h-4" aria-hidden />}
          دریافت کد تأیید
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={codeForm.handleSubmit(confirmCode)} noValidate className="space-y-4">
      <p className="text-sm" style={{ color: 'var(--text3)' }}>
        کد تأیید به <span dir="ltr" className="font-bold" style={{ color: 'var(--text1)' }}>{phone}</span> ارسال شد.
      </p>

      <FormField
        label="کد تأیید"
        required
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={5}
        placeholder="•••••"
        code
        error={codeForm.formState.errors.code?.message}
        {...codeForm.register('code', {
          onChange: (event) => {
            // ارقام فارسی را همان لحظه به انگلیسی تبدیل می‌کنیم
            event.target.value = toEnglishDigits(event.target.value).replace(/\D/g, '').slice(0, 5)
          },
        })}
      />

      <button type="submit" disabled={codeForm.formState.isSubmitting} className="btn-primary w-full !py-4 text-base">
        {codeForm.formState.isSubmitting
          ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
          : <ArrowRight className="w-4 h-4" aria-hidden />}
        تأیید و ورود
      </button>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={() => {
            setPhone('')
            codeForm.reset()
          }}
          style={{ color: 'var(--text3)' }}
        >
          تغییر شماره
        </button>
        <button
          type="button"
          disabled={cooldown > 0}
          onClick={() => sendCode({ phone })}
          className="font-bold disabled:opacity-50"
          style={{ color: 'var(--primary)' }}
        >
          {cooldown > 0 ? `ارسال دوباره تا ${cooldown} ثانیه` : 'ارسال دوباره کد'}
        </button>
      </div>
    </form>
  )
}

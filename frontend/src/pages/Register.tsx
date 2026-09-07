import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, Phone, User } from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { register as registerApi } from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import usePageMeta from '@/hooks/usePageMeta'
import PageTransition from '@/components/ui/PageTransition'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LogoMark from '@/components/brand/LogoMark'
import { FormField } from '@/components/ui/FormField'
import {
  emailSchema,
  optionalMobileSchema,
  passwordSchema,
  passwordStrength,
  personNameSchema,
  usernameSchema,
} from '@/utils/validation'

const schema = z
  .object({
    first_name: personNameSchema,
    last_name: personNameSchema,
    username: usernameSchema,
    email: emailSchema,
    phone: optionalMobileSchema,
    password: passwordSchema,
    password2: z.string().min(1, 'تکرار رمز عبور الزامی است.'),
  })
  .refine((values) => values.password === values.password2, {
    message: 'رمز عبور و تکرار آن یکسان نیستند.',
    path: ['password2'],
  })

type FormValues = z.input<typeof schema>

const BENEFITS = [
  'دسترسی به تخفیف‌های اختصاصی',
  'پیگیری آنلاین سفارش‌ها',
  'لیست علاقه‌مندی‌ها',
]

export default function Register() {
  const [showPass, setShowPass] = useState(false)
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { settings } = useSiteSettings()
  const siteName = settings?.site_name || 'ن وان'

  usePageMeta({ title: 'ساخت حساب کاربری', noindex: true })

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: {
      first_name: '',
      last_name: '',
      username: '',
      email: '',
      phone: '',
      password: '',
      password2: '',
    },
  })

  const password = watch('password') || ''
  const strength = passwordStrength(password)

  const onSubmit = async (values: FormValues) => {
    try {
      const res = await registerApi(values)
      setAuth(res.user, res.tokens)
      toast.success(`خوش آمدید ${res.user.full_name || res.user.username}!`)
      navigate('/')
    } catch (err: any) {
      // خطاهای اعتبارسنجی جنگو را روی همان فیلد می‌نشانیم تا کاربر بداند کجا را اصلاح کند.
      const data = err?.response?.data
      let handled = false
      if (data && typeof data === 'object') {
        for (const [field, messages] of Object.entries(data)) {
          const message = Array.isArray(messages) ? String(messages[0]) : String(messages)
          if (FIELDS.includes(field as keyof FormValues)) {
            setError(field as keyof FormValues, { message })
          } else {
            toast.error(message)
          }
          handled = true
        }
      }
      if (!handled) toast.error('ثبت‌نام انجام نشد. دوباره تلاش کنید.')
    }
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex">
        {/* ستون تزئینی — فقط دسکتاپ */}
        <div
          className="hidden lg:flex flex-1 flex-col justify-between p-12 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, var(--surface) 0%, var(--surface2) 50%, var(--surface3) 100%)' }}
        >
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-[80px]"
               style={{ background: 'color-mix(in srgb, var(--primary) 20%, transparent)' }} />
          <div className="absolute bottom-1/4 right-1/4 w-56 h-56 rounded-full blur-[60px]"
               style={{ background: 'color-mix(in srgb, var(--primary) 14%, transparent)' }} />

          <div className="relative flex items-center gap-3">
            <LogoMark size={40} />
            <span className="text-xl font-black">{siteName}</span>
          </div>

          <div className="relative">
            <div className="section-label mb-6">عضویت رایگان</div>
            <h2 className="text-4xl font-black leading-tight mb-4" style={{ color: 'var(--text1)' }}>
              همین حالا<br />
              <span className="text-gradient">عضو شوید</span>
            </h2>
            <p className="leading-relaxed max-w-xs" style={{ color: 'var(--text3)' }}>
              با ساخت حساب، سبد خرید و علاقه‌مندی‌هایتان را نگه دارید و سفارش‌ها را منظم‌تر دنبال کنید.
            </p>

            <div className="mt-10 space-y-3">
              {BENEFITS.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm" style={{ color: 'var(--text2)' }}>
                  <span
                    className="w-5 h-5 rounded-full grid place-items-center shrink-0"
                    style={{ background: 'color-mix(in srgb, var(--primary) 20%, transparent)' }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: 'var(--primary)' }} />
                  </span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-xs" style={{ color: 'var(--text4)' }}>
            © {new Date().toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric' })} {siteName}
          </p>
        </div>

        {/* ستون فرم */}
        <div className="flex-1 lg:max-w-lg flex items-center justify-center px-6 py-12" style={{ background: 'var(--surface)' }}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-md"
          >
            <div className="lg:hidden flex items-center justify-between gap-2 mb-8">
              <Link to="/" className="flex items-center gap-2">
                <LogoMark size={36} />
                <span className="font-black text-lg">{siteName}</span>
              </Link>
              <ThemeToggle compact />
            </div>

            <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--text1)' }}>ثبت‌نام</h1>
            <p className="text-sm mb-7" style={{ color: 'var(--text3)' }}>حساب کاربری جدید بسازید</p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="نام"
                  required
                  autoComplete="given-name"
                  placeholder="نام"
                  error={errors.first_name?.message}
                  prefix={<User className="w-4 h-4" aria-hidden />}
                  {...register('first_name')}
                />
                <FormField
                  label="نام خانوادگی"
                  required
                  autoComplete="family-name"
                  placeholder="نام خانوادگی"
                  error={errors.last_name?.message}
                  prefix={<User className="w-4 h-4" aria-hidden />}
                  {...register('last_name')}
                />
              </div>

              <FormField
                label="نام کاربری"
                required
                dir="ltr"
                autoComplete="username"
                placeholder="username"
                hint="حروف انگلیسی، رقم و نویسه‌های . _ @ + -"
                error={errors.username?.message}
                prefix={<User className="w-4 h-4" aria-hidden />}
                {...register('username')}
              />

              <FormField
                label="ایمیل"
                required
                type="email"
                dir="ltr"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                error={errors.email?.message}
                prefix={<Mail className="w-4 h-4" aria-hidden />}
                {...register('email')}
              />

              <FormField
                label="شماره موبایل (اختیاری)"
                dir="ltr"
                inputMode="tel"
                autoComplete="tel"
                placeholder="09xxxxxxxxx"
                error={errors.phone?.message}
                prefix={<Phone className="w-4 h-4" aria-hidden />}
                {...register('phone')}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <FormField
                    label="رمز عبور"
                    required
                    type={showPass ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="حداقل ۱۰ نویسه"
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
                  {password.length > 0 && (
                    <div className="mt-2">
                      <div className="pw-meter" aria-hidden>
                        {[1, 2, 3, 4].map((step) => (
                          <span
                            key={step}
                            className={`pw-meter__bar ${strength.score >= step ? `is-on-${strength.score}` : ''}`}
                          />
                        ))}
                      </div>
                      <p className="form-hint mt-1" aria-live="polite">
                        قدرت رمز: {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                <FormField
                  label="تکرار رمز عبور"
                  required
                  type="password"
                  autoComplete="new-password"
                  placeholder="تکرار رمز عبور"
                  error={errors.password2?.message}
                  prefix={<Lock className="w-4 h-4" aria-hidden />}
                  {...register('password2')}
                />
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full !py-4 text-base mt-2">
                {isSubmitting
                  ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  : <ArrowRight className="w-4 h-4" aria-hidden />}
                {isSubmitting ? 'در حال ثبت‌نام…' : 'ایجاد حساب کاربری'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm" style={{ color: 'var(--text3)' }}>
                قبلاً ثبت‌نام کرده‌اید؟{' '}
                <Link to="/login" className="font-bold" style={{ color: 'var(--primary)' }}>
                  وارد شوید
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  )
}

const FIELDS: (keyof FormValues)[] = [
  'first_name', 'last_name', 'username', 'email', 'phone', 'password', 'password2',
]

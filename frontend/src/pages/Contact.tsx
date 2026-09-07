import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Loader2, Mail, MapPin, Phone, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi } from '@/api/settings'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import usePageMeta from '@/hooks/usePageMeta'
import PageTransition from '@/components/ui/PageTransition'
import { FormField, FormTextarea } from '@/components/ui/FormField'
import { mobileSchema, optionalEmailSchema, personNameSchema } from '@/utils/validation'

const schema = z.object({
  name: personNameSchema,
  phone: mobileSchema,
  email: optionalEmailSchema,
  subject: z.string().trim().max(150, 'موضوع نباید بیش از ۱۵۰ نویسه باشد.'),
  message: z
    .string()
    .trim()
    .min(10, 'متن پیام باید حداقل ۱۰ نویسه باشد.')
    .max(2000, 'متن پیام نباید بیش از ۲۰۰۰ نویسه باشد.'),
})

type FormValues = z.input<typeof schema>

export default function Contact() {
  const [sent, setSent] = useState(false)
  const { settings } = useSiteSettings()

  usePageMeta({
    title: 'تماس با ما',
    description: 'راه‌های ارتباط با پشتیبانی فروشگاه؛ تلفن، ایمیل، آدرس و فرم ارسال پیام.',
  })

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: { name: '', phone: '', email: '', subject: '', message: '' },
  })

  const onSubmit = async (values: FormValues) => {
    try {
      // zodResolver مقادیر را پیش از رسیدن به اینجا نرمال‌سازی کرده است.
      await settingsApi.sendContact({
        name: values.name,
        phone: values.phone,
        email: values.email || undefined,
        subject: values.subject || undefined,
        message: values.message,
      })
      setSent(true)
      reset()
      toast.success('پیام شما ثبت شد.')
    } catch (error: any) {
      const data = error?.response?.data
      if (data && typeof data === 'object') {
        // خطاهای اعتبارسنجی سمت سرور را روی همان فیلد نشان می‌دهیم
        let matched = false
        for (const [field, messages] of Object.entries(data)) {
          if (field in schema.shape) {
            setError(field as keyof FormValues, {
              message: Array.isArray(messages) ? String(messages[0]) : String(messages),
            })
            matched = true
          }
        }
        if (matched) return
      }
      toast.error('ارسال پیام انجام نشد. دوباره تلاش کنید.')
    }
  }

  const channels = [
    settings?.phone && { icon: Phone, label: 'تلفن تماس', value: settings.phone, href: `tel:${settings.phone}`, ltr: true },
    settings?.email && { icon: Mail, label: 'ایمیل', value: settings.email, href: `mailto:${settings.email}`, ltr: true },
    settings?.address && { icon: MapPin, label: 'نشانی', value: settings.address, href: '', ltr: false },
    settings?.working_hours && { icon: Clock, label: 'ساعات پاسخ‌گویی', value: settings.working_hours, href: '', ltr: false },
  ].filter(Boolean) as {
    icon: typeof Phone
    label: string
    value: string
    href: string
    ltr: boolean
  }[]

  return (
    <PageTransition>
      <div className="pt-20 min-h-screen">
        <header className="border-b py-10 px-4" style={{ borderColor: 'var(--border)' }}>
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-black mb-2" style={{ color: 'var(--text1)' }}>
              تماس با ما
            </h1>
            <p className="text-sm" style={{ color: 'var(--text3)' }}>
              پیشنهاد، انتقاد یا پرسشی دارید؟ خوشحال می‌شویم بشنویم.
            </p>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          {/* راه‌های ارتباطی */}
          <aside className="space-y-3">
            {channels.map((channel) => (
              <div
                key={channel.label}
                className="glass rounded-2xl border p-4 flex items-start gap-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'color-mix(in srgb, var(--primary) 15%, transparent)' }}
                >
                  <channel.icon className="w-4 h-4" style={{ color: 'var(--primary)' }} aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="text-xs mb-1" style={{ color: 'var(--text4)' }}>
                    {channel.label}
                  </div>
                  {channel.href ? (
                    <a
                      href={channel.href}
                      dir={channel.ltr ? 'ltr' : undefined}
                      className="text-sm font-bold break-words hover:opacity-80 transition-opacity inline-block"
                      style={{ color: 'var(--text1)' }}
                    >
                      {channel.value}
                    </a>
                  ) : (
                    <p className="text-sm font-bold leading-relaxed break-words" style={{ color: 'var(--text1)' }}>
                      {channel.value}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {settings?.map_lat && settings?.map_lng && (
              <a
                href={`https://www.google.com/maps?q=${settings.map_lat},${settings.map_lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="glass rounded-2xl border p-4 flex items-center justify-center text-sm font-bold hover:opacity-80 transition-opacity"
                style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}
              >
                مشاهده روی نقشه
              </a>
            )}
          </aside>

          {/* فرم */}
          <div className="glass rounded-2xl border p-5 sm:p-6" style={{ borderColor: 'var(--border)' }}>
            {sent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-14 text-center"
              >
                <CheckCircle2 className="w-14 h-14 mx-auto mb-4" style={{ color: 'var(--primary)' }} />
                <h2 className="text-lg font-black mb-2" style={{ color: 'var(--text1)' }}>
                  پیام شما ثبت شد
                </h2>
                <p className="text-sm mb-6" style={{ color: 'var(--text3)' }}>
                  کارشناسان ما در اولین فرصت با شما تماس می‌گیرند.
                </p>
                <button type="button" onClick={() => setSent(false)} className="btn-ghost">
                  ارسال پیام دیگر
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="نام و نام خانوادگی"
                    required
                    autoComplete="name"
                    placeholder="مثلاً سارا محمدی"
                    error={errors.name?.message}
                    {...register('name')}
                  />
                  <FormField
                    label="شماره موبایل"
                    required
                    dir="ltr"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="09xxxxxxxxx"
                    error={errors.phone?.message}
                    {...register('phone')}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    label="ایمیل (اختیاری)"
                    type="email"
                    dir="ltr"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    error={errors.email?.message}
                    {...register('email')}
                  />
                  <FormField
                    label="موضوع (اختیاری)"
                    placeholder="مثلاً پیگیری سفارش"
                    error={errors.subject?.message}
                    {...register('subject')}
                  />
                </div>

                <FormTextarea
                  label="متن پیام"
                  required
                  rows={6}
                  placeholder="پیام خود را بنویسید…"
                  hint="حداقل ۱۰ نویسه"
                  error={errors.message?.message}
                  {...register('message')}
                />

                <button type="submit" className="btn-primary w-full" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  ) : (
                    <Send className="w-4 h-4" aria-hidden />
                  )}
                  ارسال پیام
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageTransition>
  )
}

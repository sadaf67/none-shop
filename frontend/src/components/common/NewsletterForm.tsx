import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, Loader2, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { settingsApi } from '@/api/settings'
import { emailSchema } from '@/utils/validation'

const schema = z.object({ email: emailSchema })
type FormValues = z.infer<typeof schema>

export default function NewsletterForm() {
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onBlur' })

  const onSubmit = async (values: FormValues) => {
    try {
      await settingsApi.subscribeNewsletter(values.email)
      setDone(true)
      reset()
      toast.success('ایمیل شما ثبت شد.')
    } catch {
      toast.error('ثبت ایمیل انجام نشد. دوباره تلاش کنید.')
    }
  }

  if (done) {
    return (
      <p className="flex items-center gap-2 text-sm font-bold" style={{ color: 'var(--primary)' }}>
        <Check className="w-4 h-4" /> ایمیل شما با موفقیت ثبت شد.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="w-full">
      <div className="flex gap-2">
        <input
          type="email"
          dir="ltr"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          aria-label="ایمیل"
          aria-invalid={!!errors.email}
          className={`input-field flex-1 ${errors.email ? 'is-invalid' : ''}`}
          {...register('email')}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          ثبت
        </button>
      </div>
      {errors.email && (
        <p role="alert" className="mt-2 text-xs font-bold" style={{ color: '#ff6b6b' }}>
          {errors.email.message}
        </p>
      )}
    </form>
  )
}

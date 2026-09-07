import { z } from 'zod'

/** تبدیل ارقام فارسی و عربی به انگلیسی */
export function toEnglishDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
}

/** نرمال‌سازی شماره موبایل ایران به قالب 09xxxxxxxxx */
export function normalizeMobile(value: string): string {
  let digits = toEnglishDigits(value).replace(/[\s\-()]/g, '')
  if (digits.startsWith('+98')) digits = `0${digits.slice(3)}`
  else if (digits.startsWith('0098')) digits = `0${digits.slice(4)}`
  else if (digits.startsWith('98') && digits.length === 12) digits = `0${digits.slice(2)}`
  else if (digits.startsWith('9') && digits.length === 10) digits = `0${digits}`
  return digits
}

const MOBILE_MESSAGE = 'شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود.'

export const mobileSchema = z
  .string()
  .trim()
  .min(1, 'شماره موبایل الزامی است.')
  .transform(normalizeMobile)
  .refine((value) => /^09\d{9}$/.test(value), MOBILE_MESSAGE)

export const optionalMobileSchema = z
  .string()
  .trim()
  .transform((value) => (value ? normalizeMobile(value) : ''))
  .refine((value) => !value || /^09\d{9}$/.test(value), MOBILE_MESSAGE)

export const postalCodeSchema = z
  .string()
  .trim()
  .min(1, 'کد پستی الزامی است.')
  .transform((value) => toEnglishDigits(value).replace(/[\s-]/g, ''))
  .refine((value) => /^\d{10}$/.test(value), 'کد پستی باید ۱۰ رقم باشد.')
  .refine((value) => !/^(\d)\1{9}$/.test(value), 'کد پستی وارد شده معتبر نیست.')

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'ایمیل الزامی است.')
  .email('قالب ایمیل صحیح نیست.')

export const optionalEmailSchema = z
  .string()
  .trim()
  .refine((value) => !value || z.string().email().safeParse(value).success, 'قالب ایمیل صحیح نیست.')

export const personNameSchema = z
  .string()
  .trim()
  .min(3, 'نام باید حداقل ۳ نویسه باشد.')
  .max(80, 'نام نباید بیش از ۸۰ نویسه باشد.')
  .refine((value) => /^[؀-ۿ\s‌ a-zA-Z'-]+$/.test(value), 'نام فقط می‌تواند شامل حروف باشد.')

export const otpSchema = z
  .string()
  .trim()
  .transform(toEnglishDigits)
  .refine((value) => /^\d{5}$/.test(value), 'کد تأیید باید ۵ رقم باشد.')

/** رمز عبور: حداقل ۱۰ نویسه، شامل حرف و رقم — هم‌راستا با اعتبارسنجی جنگو */
export const passwordSchema = z
  .string()
  .min(10, 'رمز عبور باید حداقل ۱۰ نویسه باشد.')
  .max(128, 'رمز عبور بیش از حد طولانی است.')
  .refine((value) => /[a-zA-Z؀-ۿ]/.test(value), 'رمز عبور باید حداقل یک حرف داشته باشد.')
  .refine((value) => /\d/.test(value), 'رمز عبور باید حداقل یک رقم داشته باشد.')
  .refine((value) => !/^\d+$/.test(value), 'رمز عبور نمی‌تواند فقط عدد باشد.')

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'نام کاربری باید حداقل ۳ نویسه باشد.')
  .max(150, 'نام کاربری بیش از حد طولانی است.')
  .refine((value) => /^[\w.@+-]+$/.test(value), 'نام کاربری فقط می‌تواند شامل حروف انگلیسی، رقم و . _ @ + - باشد.')

/** سنجش قدرت رمز عبور برای نمایش به کاربر */
export function passwordStrength(value: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0
  if (value.length >= 10) score++
  if (value.length >= 14) score++
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score++
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score++
  const labels = ['خیلی ضعیف', 'ضعیف', 'متوسط', 'خوب', 'عالی'] as const
  const clamped = Math.min(score, 4) as 0 | 1 | 2 | 3 | 4
  return { score: clamped, label: labels[clamped] }
}

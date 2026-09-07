import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeft, CreditCard, Loader2, MapPin, PackageCheck, Plus, ShieldCheck } from 'lucide-react'
import { createAddress, getAddresses } from '@/api/auth'
import { createOrder, requestPayment } from '@/api/cart'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/utils/format'
import PageTransition from '@/components/ui/PageTransition'
import toast from 'react-hot-toast'
import useShipping from '@/hooks/useShipping'
import usePageMeta from '@/hooks/usePageMeta'
import { FormField, FormTextarea } from '@/components/ui/FormField'
import { mobileSchema, personNameSchema, postalCodeSchema, toEnglishDigits } from '@/utils/validation'

const addressSchema = z.object({
  title: z.string().trim().min(1, 'عنوان نشانی الزامی است.').max(50, 'عنوان بیش از حد طولانی است.'),
  receiver_name: personNameSchema,
  phone: mobileSchema,
  province: z.string().trim().min(2, 'استان الزامی است.').max(50),
  city: z.string().trim().min(2, 'شهر الزامی است.').max(50),
  postal_code: postalCodeSchema,
  street: z
    .string()
    .trim()
    .min(10, 'نشانی کامل باید حداقل ۱۰ نویسه باشد.')
    .max(400, 'نشانی بیش از حد طولانی است.'),
})

type AddressValues = z.input<typeof addressSchema>

const EMPTY_ADDRESS: AddressValues = {
  title: 'خانه',
  receiver_name: '',
  phone: '',
  province: '',
  city: '',
  postal_code: '',
  street: '',
}

export default function Checkout() {
  const location = useLocation()
  const { items, total, fetchCart } = useCartStore()
  const { data: addresses = [], isLoading: addressesLoading, refetch } = useQuery({ queryKey: ['addresses'], queryFn: getAddresses })
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null)
  const [showNewAddress, setShowNewAddress] = useState(false)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [completedOrder, setCompletedOrder] = useState<any>(null)
  const [gatewayPending, setGatewayPending] = useState(false)
  const [retryingPayment, setRetryingPayment] = useState(false)
  const checkoutState = location.state as { couponCode?: string; discountAmount?: number } | null
  const couponCode = checkoutState?.couponCode || ''
  const discountAmount = Number(checkoutState?.discountAmount || 0)

  usePageMeta({ title: 'تکمیل خرید', noindex: true })

  const addressForm = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    mode: 'onBlur',
    defaultValues: EMPTY_ADDRESS,
  })
  // ثبت سفارش بعد از ذخیره موفق نشانی ادامه پیدا می‌کند.
  const pendingSubmit = useRef(false)

  useEffect(() => {
    if (!addresses.length) return
    const preferred = addresses.find((address: any) => address.is_default) || addresses[0]
    setSelectedAddress((current) => current ?? preferred.id)
  }, [addresses])

  useEffect(() => {
    if (!addressesLoading && addresses.length === 0) setShowNewAddress(true)
  }, [addressesLoading, addresses.length])

  const shipping = useShipping(total)
  const payableTotal = Math.max(0, total - discountAmount) + shipping.cost

  const saveAddress = async (values: AddressValues): Promise<number | null> => {
    try {
      const address = await createAddress({ ...values, is_default: addresses.length === 0 })
      await refetch()
      setSelectedAddress(address.id)
      setShowNewAddress(false)
      return address.id as number
    } catch (error: any) {
      const data = error?.response?.data
      if (data && typeof data === 'object') {
        for (const [field, messages] of Object.entries(data)) {
          const message = Array.isArray(messages) ? String(messages[0]) : String(messages)
          if (field in EMPTY_ADDRESS) addressForm.setError(field as keyof AddressValues, { message })
          else toast.error(message)
        }
      } else {
        toast.error('ذخیره نشانی انجام نشد.')
      }
      return null
    }
  }

  const placeOrder = async (addressId: number) => {
    setSubmitting(true)
    try {
      const order = await createOrder({ address_id: addressId, coupon_code: couponCode, notes })
      setCompletedOrder(order)
      await fetchCart()

      try {
        const payment = await requestPayment(order.id)
        if (payment.payment_url) {
          window.location.assign(payment.payment_url)
          return
        }
      } catch {
        setGatewayPending(true)
      }
    } catch (error: any) {
      const payload = error?.response?.data
      const message = payload?.error
        || payload?.cart?.[0]
        || payload?.coupon_code?.[0]
        || payload?.detail
        || 'ثبت سفارش انجام نشد؛ اطلاعات را دوباره بررسی کنید.'
      toast.error(message)
    } finally {
      setSubmitting(false)
      pendingSubmit.current = false
    }
  }

  /** نشانی جدید را (در صورت نیاز) اعتبارسنجی و ذخیره می‌کند، سپس سفارش را ثبت می‌کند. */
  const submitOrder = async () => {
    if (!items.length || submitting || pendingSubmit.current) return

    if (showNewAddress) {
      pendingSubmit.current = true
      await addressForm.handleSubmit(
        async (values) => {
          const addressId = await saveAddress(values)
          if (addressId) await placeOrder(addressId)
          else pendingSubmit.current = false
        },
        () => {
          pendingSubmit.current = false
          toast.error('اطلاعات نشانی را کامل و درست وارد کنید.')
        },
      )()
      return
    }

    if (!selectedAddress) {
      toast.error('یک نشانی برای دریافت سفارش انتخاب کنید.')
      return
    }
    await placeOrder(selectedAddress)
  }

  const retryPayment = async () => {
    if (!completedOrder?.id) return
    setRetryingPayment(true)
    try {
      const payment = await requestPayment(completedOrder.id)
      if (!payment.payment_url) throw new Error('Missing payment URL')
      window.location.assign(payment.payment_url)
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'درگاه پرداخت در دسترس نیست؛ کمی بعد دوباره تلاش کنید.')
    } finally {
      setRetryingPayment(false)
    }
  }

  if (completedOrder) {
    return (
      <PageTransition>
        <main className="min-h-screen pt-28 px-4 flex items-center justify-center">
          <section className="checkout-result">
            <span className="checkout-result__icon"><PackageCheck className="w-8 h-8" /></span>
            <div className="editorial-kicker justify-center mb-4">سفارش ثبت شد</div>
            <h1 className="text-3xl md:text-5xl font-black">شماره سفارش {completedOrder.order_number}</h1>
            <p className="mt-4 text-sm leading-7" style={{ color: 'var(--text3)' }}>
              {gatewayPending
                ? 'سفارش با وضعیت «در انتظار پرداخت» ذخیره شد، اما درگاه پرداخت در دسترس نیست یا تنظیمات آن کامل نشده است.'
                : 'در حال انتقال امن به صفحه پرداخت هستید.'}
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {gatewayPending && (
                <button type="button" onClick={retryPayment} disabled={retryingPayment} className="btn-primary disabled:opacity-50">
                  {retryingPayment ? <><Loader2 className="w-4 h-4 animate-spin" /> در حال اتصال</> : 'تلاش دوباره برای پرداخت'}
                </button>
              )}
              <Link to="/products" className="btn-primary">بازگشت به فروشگاه</Link>
              <Link to="/orders" className="btn-ghost">سفارش‌های من</Link>
              <Link to="/" className="btn-ghost">صفحه اصلی</Link>
            </div>
          </section>
        </main>
      </PageTransition>
    )
  }

  if (!items.length) {
    return (
      <PageTransition>
        <main className="min-h-screen pt-28 px-4 flex items-center justify-center text-center">
          <div>
            <PackageCheck className="w-12 h-12 mx-auto mb-5" style={{ color: 'var(--primary)' }} />
            <h1 className="text-2xl font-black">سبد شما برای ثبت سفارش خالی است.</h1>
            <Link to="/products" className="btn-primary mt-6">مشاهده محصولات</Link>
          </div>
        </main>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <main className="min-h-screen pt-24 md:pt-28">
        <section className="max-w-[1180px] mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="editorial-kicker mb-4">مرحله نهایی خرید</div>
          <h1 className="text-4xl md:text-6xl font-black">نشانی و پرداخت</h1>
          <p className="mt-4 text-sm leading-7" style={{ color: 'var(--text3)' }}>پیش از ثبت سفارش، نشانی دریافت و خلاصه مبلغ را یک‌بار بررسی کنید.</p>

          <div className="mt-10 grid lg:grid-cols-[minmax(0,1fr)_360px] gap-7 items-start">
            <div className="space-y-6">
              <section className="checkout-card">
                <div className="checkout-card__header">
                  <div><h2>نشانی دریافت</h2><p>سفارش به این نشانی ارسال می‌شود.</p></div>
                  <MapPin className="w-5 h-5" />
                </div>

                {addressesLoading ? (
                  <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--primary)' }} /></div>
                ) : (
                  <div className="grid gap-3">
                    {addresses.map((address: any) => (
                      <label key={address.id} className={`address-option ${selectedAddress === address.id && !showNewAddress ? 'is-selected' : ''}`}>
                        <input type="radio" name="address" checked={selectedAddress === address.id && !showNewAddress} onChange={() => { setSelectedAddress(address.id); setShowNewAddress(false) }} />
                        <span className="flex-1">
                          <span className="flex items-center gap-2 font-black text-sm">{address.title}{address.is_default && <small>پیش‌فرض</small>}</span>
                          <span className="block mt-2 text-xs leading-6" style={{ color: 'var(--text3)' }}>{address.province}، {address.city}، {address.street}</span>
                          <span className="block mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>{address.receiver_name} · {address.phone}</span>
                        </span>
                      </label>
                    ))}

                    {!showNewAddress && (
                      <button type="button" onClick={() => setShowNewAddress(true)} className="add-address-button"><Plus className="w-4 h-4" /> افزودن نشانی جدید</button>
                    )}
                  </div>
                )}

                {showNewAddress && (
                  <div className="mt-5 pt-5 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        label="عنوان نشانی"
                        required
                        placeholder="خانه، محل کار…"
                        error={addressForm.formState.errors.title?.message}
                        {...addressForm.register('title')}
                      />
                      <FormField
                        label="نام تحویل‌گیرنده"
                        required
                        autoComplete="name"
                        error={addressForm.formState.errors.receiver_name?.message}
                        {...addressForm.register('receiver_name')}
                      />
                      <FormField
                        label="شماره تماس"
                        required
                        dir="ltr"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="09xxxxxxxxx"
                        error={addressForm.formState.errors.phone?.message}
                        {...addressForm.register('phone')}
                      />
                      <FormField
                        label="استان"
                        required
                        autoComplete="address-level1"
                        error={addressForm.formState.errors.province?.message}
                        {...addressForm.register('province')}
                      />
                      <FormField
                        label="شهر"
                        required
                        autoComplete="address-level2"
                        error={addressForm.formState.errors.city?.message}
                        {...addressForm.register('city')}
                      />
                      <FormField
                        label="کد پستی"
                        required
                        dir="ltr"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={10}
                        placeholder="۱۰ رقم"
                        error={addressForm.formState.errors.postal_code?.message}
                        {...addressForm.register('postal_code', {
                          onChange: (event) => {
                            event.target.value = toEnglishDigits(event.target.value).replace(/\D/g, '').slice(0, 10)
                          },
                        })}
                      />
                    </div>
                    <FormTextarea
                      label="نشانی کامل"
                      required
                      rows={3}
                      className="mt-4"
                      placeholder="خیابان، کوچه، پلاک و واحد"
                      error={addressForm.formState.errors.street?.message}
                      {...addressForm.register('street')}
                    />
                    {addresses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => { setShowNewAddress(false); addressForm.reset(EMPTY_ADDRESS) }}
                        className="mt-3 text-xs"
                        style={{ color: 'var(--text3)' }}
                      >
                        انصراف
                      </button>
                    )}
                  </div>
                )}
              </section>

              <section className="checkout-card">
                <div className="checkout-card__header">
                  <div><h2>یادداشت سفارش</h2><p>اختیاری؛ برای توضیحات مربوط به تحویل.</p></div>
                </div>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value.slice(0, 500))}
                  maxLength={500}
                  aria-label="یادداشت سفارش"
                  className="input-field min-h-24 resize-y"
                  placeholder="توضیحات ضروری برای تحویل سفارش..."
                />
              </section>
            </div>

            <aside className="checkout-card lg:sticky lg:top-28">
              <div className="checkout-card__header">
                <div><h2>خلاصه پرداخت</h2><p>{items.length.toLocaleString('fa-IR')} قلم در سبد</p></div>
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-3 text-sm">
                <PriceRow label="جمع محصولات" value={formatPrice(total)} />
                <PriceRow label="هزینه ارسال" value={shipping.isFree ? 'رایگان' : formatPrice(shipping.cost)} />
                {!shipping.isFree && shipping.remainingForFree > 0 && (
                  <p className="text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>
                    با {formatPrice(shipping.remainingForFree)} خرید بیشتر، ارسال رایگان می‌شود.
                  </p>
                )}
                {couponCode && <PriceRow label={`تخفیف (${couponCode})`} value={`− ${formatPrice(discountAmount)}`} accent />}
                <div className="my-4 h-px bg-[var(--border)]" />
                <div className="flex items-end justify-between gap-3"><span className="font-black">مبلغ قابل پرداخت</span><strong className="text-xl" style={{ color: 'var(--primary)' }}>{formatPrice(payableTotal)}</strong></div>
              </div>
              <button type="button" onClick={submitOrder} disabled={submitting} className="btn-primary w-full mt-6">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> در حال ثبت سفارش</> : <>ثبت و ادامه پرداخت <ArrowLeft className="w-4 h-4" /></>}
              </button>
              <div className="mt-4 flex items-start gap-2 text-[10px] leading-5" style={{ color: 'var(--text-muted)' }}><ShieldCheck className="w-4 h-4 shrink-0" /> پرداخت پس از ثبت سفارش و از طریق درگاه تنظیم‌شده انجام می‌شود.</div>
            </aside>
          </div>
        </section>
      </main>
    </PageTransition>
  )
}

function PriceRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div className="flex justify-between gap-3" style={{ color: accent ? 'var(--primary)' : 'var(--text3)' }}><span>{label}</span><span className="font-bold" style={{ color: accent ? 'var(--primary)' : 'var(--text2)' }}>{value}</span></div>
}

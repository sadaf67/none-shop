import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus, ShoppingCart, Tag, ArrowLeft, ImageOff } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { validateCoupon } from '@/api/cart'
import { formatPrice } from '@/utils/format'
import toast from 'react-hot-toast'
import PageTransition from '@/components/ui/PageTransition'
import useShipping from '@/hooks/useShipping'
import usePageMeta from '@/hooks/usePageMeta'

export default function Cart() {
  const { items, total, updateItem, removeItem } = useCartStore()
  const { isAuthenticated } = useAuthStore()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState('')
  const [couponData, setCouponData] = useState<any>(null)
  const [couponLoading, setCouponLoading] = useState(false)

  usePageMeta({ title: 'سبد خرید', noindex: true })

  const applyCoupon = async () => {
    const code = couponCode.trim()
    if (!code || couponLoading) return
    setCouponLoading(true)
    try {
      const data = await validateCoupon(code, total)
      setCouponData(data)
      toast.success(`کد تخفیف اعمال شد — ${formatPrice(data.discount_amount)} تخفیف`)
    } catch (error: any) {
      setCouponData(null)
      toast.error(error?.response?.data?.error || error?.response?.data?.detail || 'کد تخفیف نامعتبر است')
    } finally {
      setCouponLoading(false)
    }
  }

  const finalTotal = couponData ? couponData.final_amount : total
  const shipping = useShipping(total)

  if (items.length === 0) return (
    <PageTransition>
      <div className="pt-24 min-h-screen flex flex-col items-center justify-center text-center px-4">
      <div className="w-24 h-24 glass rounded-3xl flex items-center justify-center mx-auto mb-6">
        <ShoppingCart className="w-11 h-11" style={{ color: 'var(--text-muted)' }} />
      </div>
      <h2 className="text-2xl font-bold mb-2">سبد خرید شما خالی است</h2>
      <p className="mb-8" style={{ color: 'var(--text3)' }}>برای شروع خرید، محصولات فروشگاه را ببینید.</p>
      <Link to="/products" className="btn-primary">مشاهده محصولات</Link>
    </div>
    </PageTransition>
  )

  return (
    <PageTransition>
      <div className="pt-20 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-black mb-8 flex items-center gap-3">
          <div className="w-9 h-9 glass rounded-xl flex items-center justify-center">
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          سبد خرید
          <span className="text-sm font-normal" style={{ color: 'var(--text3)' }}>({items.length.toLocaleString('fa-IR')} قلم)</span>
        </h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Items */}
          <div className="md:col-span-2 space-y-3">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  className="glass rounded-2xl p-4 flex gap-4 border transition-all"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <Link to={`/products/${item.product.slug}`} className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-white/5">
                      {item.product.main_image?.image ? (
                        <img src={item.product.main_image.image} alt={item.product.name}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                          <ImageOff className="w-7 h-7" />
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${item.product.slug}`}
                      className="font-medium line-clamp-2 text-sm transition-colors hover:text-[var(--primary)]">
                      {item.product.name}
                    </Link>
                    <div className="font-black mt-1 text-sm" style={{ color: 'var(--primary)' }}>{formatPrice(item.product.price)}</div>
                    {item.variant && (
                      <div className="mt-1 text-xs" style={{ color: 'var(--text3)' }}>
                        {item.variant.label}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center glass rounded-xl overflow-hidden border border-white/8">
                        <button type="button" onClick={() => updateItem(item.id, item.quantity - 1)} aria-label={`کم کردن تعداد ${item.product.name}`}
                          className="px-3 py-2 hover:bg-[var(--glass-bg2)] transition-colors" style={{ color: 'var(--text3)' }}>
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="px-4 py-2 text-sm font-bold">{item.quantity}</span>
                        <button type="button" onClick={() => updateItem(item.id, item.quantity + 1)} aria-label={`افزایش تعداد ${item.product.name}`}
                          className="px-3 py-2 hover:bg-[var(--glass-bg2)] transition-colors" style={{ color: 'var(--text3)' }}>
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-sm">{formatPrice(item.total_price)}</span>
                        <button type="button" onClick={() => removeItem(item.id)} aria-label={`حذف ${item.product.name} از سبد`}
                          className="transition-colors p-1.5 glass rounded-lg hover:text-red-400" style={{ color: 'var(--text3)' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div className="space-y-4">
            {/* Coupon */}
            <div className="glass rounded-2xl p-5 border border-white/6">
              <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" style={{ color: 'var(--primary)' }} /> کد تخفیف
              </h3>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyCoupon()}
                  placeholder="کد تخفیف..."
                  className="input-field flex-1 !py-2 text-sm"
                />
                <button
                  onClick={applyCoupon}
                  disabled={couponLoading}
                  className="btn-primary !min-h-10 !px-4 !py-2 rounded-xl text-sm disabled:opacity-50">
                  اعمال
                </button>
              </div>
              {couponData && (
                <div className="mt-2 text-sm text-emerald-400 flex items-center gap-1">
                  ✓ تخفیف {formatPrice(couponData.discount_amount)} اعمال شد
                </div>
              )}
            </div>

            {/* Total */}
            <div className="glass rounded-2xl p-5 border border-white/6">
              <h3 className="font-bold text-sm mb-4">خلاصه سفارش</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between" style={{ color: 'var(--text3)' }}>
                  <span>جمع محصولات</span>
                  <span style={{ color: 'var(--text2)' }}>{formatPrice(total)}</span>
                </div>
                {couponData && (
                  <div className="flex justify-between text-emerald-400">
                    <span>تخفیف کد</span>
                    <span>- {formatPrice(couponData.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between" style={{ color: 'var(--text3)' }}>
                  <span>هزینه ارسال</span>
                  <span className={shipping.isFree ? 'text-emerald-400 font-medium' : ''} style={shipping.isFree ? undefined : { color: 'var(--text2)' }}>
                    {shipping.isFree ? 'رایگان' : formatPrice(shipping.cost)}
                  </span>
                </div>
                {!shipping.isFree && shipping.remainingForFree > 0 && (
                  <p className="text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>
                    با {formatPrice(shipping.remainingForFree)} خرید بیشتر، ارسال رایگان می‌شود.
                  </p>
                )}
                {shipping.note && (
                  <p className="text-[11px] leading-5" style={{ color: 'var(--text-muted)' }}>{shipping.note}</p>
                )}
                <div className="divider-glow my-1" />
                <div className="flex justify-between font-black text-base">
                  <span>مبلغ نهایی</span>
                  <span style={{ color: 'var(--primary)' }}>{formatPrice(finalTotal + shipping.cost)}</span>
                </div>
              </div>
              <button
                onClick={() => isAuthenticated
                  ? navigate('/checkout', { state: {
                      couponCode: couponData?.code || couponCode.trim(),
                      discountAmount: couponData?.discount_amount || 0,
                    } })
                  : navigate('/login?next=/checkout')}
                className="btn-primary w-full mt-5 flex items-center justify-center gap-2">
                ادامه خرید
                <ArrowLeft className="w-4 h-4" />
              </button>
              {!isAuthenticated && (
                <p className="text-xs text-center mt-2" style={{ color: 'var(--text-muted)' }}>برای ادامه ابتدا وارد شوید</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </PageTransition>
  )
}

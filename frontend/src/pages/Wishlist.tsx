import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, ShoppingCart, Trash2, ArrowLeft, Sparkles } from 'lucide-react'
import { useWishlistStore } from '@/store/wishlistStore'
import { useCartStore } from '@/store/cartStore'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/utils/format'
import PageTransition from '@/components/ui/PageTransition'
import toast from 'react-hot-toast'

export default function Wishlist() {
  const { items, loading, fetchWishlist, toggle } = useWishlistStore()
  const { addItem } = useCartStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) fetchWishlist()
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <PageTransition>
        <div className="pt-24 min-h-screen flex flex-col items-center justify-center text-center px-4">
          <div className="w-24 h-24 glass rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Heart className="w-11 h-11 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-300 mb-2">ابتدا وارد شوید</h2>
          <p className="text-gray-600 mb-8">برای مشاهده علاقه‌مندی‌ها باید وارد حساب کاربری شوید</p>
          <Link to="/login?next=/wishlist" className="btn-primary">ورود به حساب</Link>
        </div>
      </PageTransition>
    )
  }

  return (
    <PageTransition>
      <div className="pt-20 min-h-screen">
        {/* Header */}
        <div className="relative border-b py-10 px-4" style={{ borderColor: 'var(--border)' }}>
          <div className="absolute inset-0 bg-gradient-to-b from-red-900/5 to-transparent" />
          <div className="max-w-6xl mx-auto relative">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-500/20 flex items-center justify-center">
                <Heart className="w-5 h-5 text-red-400 fill-red-400" />
              </div>
              <h1 className="text-3xl font-black" style={{ color: 'var(--text1)' }}>
                علاقه‌مندی‌ها
              </h1>
            </div>
            <p style={{ color: 'var(--text3)' }} className="text-sm mr-13">
              {items.length.toLocaleString('fa-IR')} محصول ذخیره‌شده
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-video bg-white/5" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-4 bg-white/5 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="relative mb-8">
                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-500/10 to-pink-500/10 border border-red-500/20 flex items-center justify-center">
                  <Heart className="w-14 h-14 text-red-400/40" />
                </div>
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                  className="absolute -top-2 -right-2"
                >
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </motion.div>
              </div>
              <h3 className="text-2xl font-black mb-3" style={{ color: 'var(--text1)' }}>
                لیست خالی است
              </h3>
              <p className="mb-8 max-w-sm leading-relaxed" style={{ color: 'var(--text3)' }}>
                هنوز محصولی ذخیره نکرده‌اید. روی آیکون قلب هر محصول کلیک کنید تا اینجا ذخیره شود.
              </p>
              <Link to="/products" className="btn-primary flex items-center gap-2">
                مشاهده محصولات
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </motion.div>
          ) : (
            <>
              {/* Clear all */}
              <div className="flex justify-between items-center mb-6">
                <p className="text-sm" style={{ color: 'var(--text3)' }}>
                  {items.length} مورد
                </p>
                <button
                  onClick={async () => {
                    for (const item of items) await toggle(item.product)
                    toast.success('لیست علاقه‌مندی‌ها پاک شد')
                  }}
                  className="text-xs text-red-400/70 hover:text-red-400 flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  پاک کردن همه
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <AnimatePresence>
                  {items.map((item, idx) => (
                    <WishlistCard
                      key={item.id}
                      item={item}
                      index={idx}
                      onRemove={() => toggle(item.product)}
                      onAddToCart={() => {
                        addItem(item.product.id)
                        toast.success('به سبد خرید اضافه شد')
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </PageTransition>
  )
}

function WishlistCard({ item, index, onRemove, onAddToCart }: {
  item: any
  index: number
  onRemove: () => void
  onAddToCart: () => void
}) {
  const { product } = item

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: -10 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="glass rounded-2xl overflow-hidden border hover:border-red-500/20 transition-all duration-300 group"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-white/5 to-white/2">
        <Link to={`/products/${product.slug}`}>
          {product.main_image ? (
            <img
              src={product.main_image.image}
              alt={product.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-700">
              <Heart className="w-10 h-10 opacity-20" />
            </div>
          )}
        </Link>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Badges */}
        {product.discount_percent > 0 && (
          <span className="absolute top-3 right-3 badge-discount">{product.discount_percent}٪</span>
        )}

        {/* Remove button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={onRemove}
          className="absolute top-3 left-3 w-8 h-8 glass rounded-xl flex items-center justify-center text-red-400 border border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)] hover:bg-red-500/20 transition-colors"
        >
          <Heart className="w-3.5 h-3.5 fill-red-400" />
        </motion.button>
      </div>

      {/* Info */}
      <div className="p-4">
        {product.brand_name && (
          <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">{product.brand_name}</span>
        )}
        <Link to={`/products/${product.slug}`}>
          <h3 className="font-semibold text-sm mt-1 mb-3 line-clamp-2 leading-relaxed hover:text-orange-400 transition-colors"
            style={{ color: 'var(--text2)' }}>
            {product.name}
          </h3>
        </Link>

        <div className="divider-glow my-3" />

        <div className="flex items-center justify-between gap-2">
          <div>
            {product.compare_price && product.compare_price > product.price && (
              <div className="text-xs line-through mb-0.5" style={{ color: 'var(--text4)' }}>
                {formatPrice(product.compare_price)}
              </div>
            )}
            <div className="font-black text-base" style={{ color: 'var(--text1)' }}>
              {formatPrice(product.price)}
            </div>
          </div>

          {product.is_in_stock ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onAddToCart}
              className="btn-primary !py-2 !px-4 text-xs flex items-center gap-1.5 flex-shrink-0"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              افزودن به سبد
            </motion.button>
          ) : (
            <span className="text-xs px-3 py-1.5 rounded-xl border text-gray-500"
              style={{ borderColor: 'var(--border)' }}>
              ناموجود
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

import { Link } from 'react-router-dom'
import { ArrowUpLeft, Eye, Heart, ImageOff, Star } from 'lucide-react'
import { motion } from 'framer-motion'
import { useWishlistStore } from '@/store/wishlistStore'
import { useAuthStore } from '@/store/authStore'
import { formatPrice } from '@/utils/format'
import toast from 'react-hot-toast'

export default function ProductCard({ product }: { product: any }) {
  const { toggle, isInWishlist } = useWishlistStore()
  const { isAuthenticated } = useAuthStore()
  const inWishlist = isInWishlist(product.id)

  const handleWishlist = async (event: React.MouseEvent) => {
    event.preventDefault()
    if (!isAuthenticated) {
      toast.error('برای ذخیره محصول ابتدا وارد شوید')
      return
    }
    await toggle(product)
    toast.success(inWishlist ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد')
  }

  return (
    <motion.article className="product-card group" whileTap={{ scale: .99 }}>
      <div className="product-card__media">
        <Link to={`/products/${product.slug}`} aria-label={`مشاهده ${product.name}`}>
          {product.main_image?.image ? (
            <img src={product.main_image.image} alt={product.main_image.alt_text || product.name} loading="lazy" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3" style={{ color: 'var(--text-muted)' }}>
              <ImageOff className="w-10 h-10 stroke-[1.25]" />
              <span className="text-[11px] font-medium">بدون تصویر</span>
            </div>
          )}
        </Link>

        <div className="absolute top-3 right-3 z-10 flex flex-col items-start gap-2">
          {product.discount_percent > 0 && <span className="badge-discount">٪{product.discount_percent}</span>}
          {!product.is_in_stock && (
            <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ color: 'var(--text2)', background: 'var(--glass-bg)' }}>ناموجود</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={inWishlist ? `حذف ${product.name} از علاقه‌مندی‌ها` : `افزودن ${product.name} به علاقه‌مندی‌ها`}
          className="absolute top-3 left-3 z-10 grid w-10 h-10 place-items-center rounded-full border transition-transform hover:scale-105"
          style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}
        >
          <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} style={inWishlist ? undefined : { color: 'var(--text2)' }} />
        </button>

        {product.is_in_stock && (
          <Link
            to={`/products/${product.slug}`}
            className="product-card__action absolute left-3 right-3 bottom-3 z-10 flex items-center justify-center gap-2 rounded-full px-4 py-3 text-xs font-black translate-y-16 group-hover:translate-y-0 focus:translate-y-0 transition-transform duration-300"
            aria-label={`مشاهده جزئیات و انتخاب ${product.name}`}
          >
            <Eye className="w-4 h-4" />
            مشاهده و انتخاب
          </Link>
        )}
      </div>

      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[10px] font-black uppercase tracking-[.14em]" style={{ color: 'var(--primary)' }}>
            {product.brand_name || product.category_name || 'منتخب فروشگاه'}
          </span>
          {product.reviews_count > 0 && (
            <span className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text3)' }}>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {product.average_rating}
            </span>
          )}
        </div>

        <Link to={`/products/${product.slug}`} className="block">
          <h3 className="min-h-12 line-clamp-2 text-sm md:text-base font-bold leading-6 transition-colors group-hover:text-[var(--primary)]">
            {product.name}
          </h3>
        </Link>

        <div className="mt-5 pt-4 flex items-end justify-between gap-3 border-t" style={{ borderColor: 'var(--border)' }}>
          <div>
            {product.compare_price && product.compare_price > product.price && (
              <div className="text-[10px] line-through mb-1" style={{ color: 'var(--text-muted)' }}>{formatPrice(product.compare_price)}</div>
            )}
            <div className="font-black text-sm md:text-base">{formatPrice(product.price)}</div>
          </div>
          <Link
            to={`/products/${product.slug}`}
            aria-label={`جزئیات ${product.name}`}
            className="grid w-9 h-9 place-items-center rounded-full border transition-colors group-hover:bg-[var(--primary)] group-hover:text-white"
            style={{ borderColor: 'var(--border)' }}
          >
            <ArrowUpLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </motion.article>
  )
}

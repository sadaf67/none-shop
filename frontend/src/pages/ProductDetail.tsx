import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShoppingCart, Heart, Star, FileText, ListChecks, ChevronRight, Minus, Plus, Package, PackageSearch } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getProduct, getRelated, getProductReviews } from '@/api/products'
import { ZoomableImageGallery } from '@/components/ui/ImageZoom'
import { ProductDetailSkeleton } from '@/components/ui/Skeleton'
import ProductCard from '@/components/product/ProductCard'
import PageTransition from '@/components/ui/PageTransition'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { useAuthStore } from '@/store/authStore'
import { formatPrice, formatDate } from '@/utils/format'
import usePageMeta from '@/hooks/usePageMeta'
import useJsonLd from '@/hooks/useJsonLd'
import toast from 'react-hot-toast'

export default function ProductDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [qty, setQty] = useState(1)
  const [activeImg, setActiveImg] = useState(0)
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews'>('desc')
  const [addedAnim, setAddedAnim] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null)
  const { addItem } = useCartStore()
  const { toggle, isInWishlist } = useWishlistStore()
  const { isAuthenticated } = useAuthStore()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => getProduct(slug!),
  })
  const { data: related } = useQuery({
    queryKey: ['related', slug],
    queryFn: () => getRelated(slug!),
    enabled: !!slug,
  })
  const { data: reviews } = useQuery({
    queryKey: ['reviews', slug],
    queryFn: () => getProductReviews(slug!),
    enabled: !!slug,
  })

  const variants = (product?.variants || []).filter((variant: any) => variant.is_active)
  const selectedVariant = variants.find((variant: any) => variant.id === selectedVariantId)
  const availableStock = selectedVariant?.stock ?? (variants.length ? 0 : product?.stock || 0)

  usePageMeta({
    title: product?.meta_title || product?.name,
    description: product?.meta_description
      || product?.short_description
      || (product?.name ? `خرید ${product.name} با قیمت ${formatPrice(product.price)} و ارسال سریع.` : undefined),
  })

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  // داده ساختاریافته Product برای گوگل و موتورهای مقایسه قیمت (ترب/ایمالز).
  useJsonLd(
    'product',
    product?.name
      ? {
          '@context': 'https://schema.org',
          '@type': 'Product',
          name: product.name,
          description: product.short_description || product.meta_description || product.name,
          sku: product.sku || String(product.id),
          ...(product.barcode ? { gtin13: product.barcode } : {}),
          image: (product.images || []).map((image: any) => image.image).filter(Boolean),
          ...(product.brand_name ? { brand: { '@type': 'Brand', name: product.brand_name } } : {}),
          ...(product.rating
            ? {
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: product.rating,
                  reviewCount: product.reviews_count || 1,
                },
              }
            : {}),
          offers: {
            '@type': 'Offer',
            url: `${origin}/products/${product.slug}`,
            priceCurrency: 'IRR',
            price: Number(product.price) * 10, // قیمت‌ها در پنل تومان ذخیره می‌شوند.
            // بدون این، گوگل آگهی را «قیمت منقضی» می‌داند و رد می‌کند.
            priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
              .toISOString()
              .slice(0, 10),
            itemCondition: 'https://schema.org/NewCondition',
            availability: product.is_in_stock
              ? 'https://schema.org/InStock'
              : 'https://schema.org/OutOfStock',
            ...(product.brand_name
              ? { seller: { '@type': 'Organization', name: product.brand_name } }
              : {}),
          },
        }
      : null,
  )

  useJsonLd(
    'breadcrumb',
    product?.name
      ? {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'خانه', item: origin },
            { '@type': 'ListItem', position: 2, name: 'محصولات', item: `${origin}/products` },
            ...(product.category_name
              ? [{
                  '@type': 'ListItem',
                  position: 3,
                  name: product.category_name,
                  item: `${origin}/products?category=${product.category}`,
                }]
              : []),
            {
              '@type': 'ListItem',
              position: product.category_name ? 4 : 3,
              name: product.name,
              item: `${origin}/products/${product.slug}`,
            },
          ],
        }
      : null,
  )

  if (isLoading) return <ProductDetailSkeleton />

  if (!product) return (
    <div className="pt-24 min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Package className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text3)' }} />
        <p style={{ color: 'var(--text3)' }}>محصول یافت نشد</p>
      </div>
    </div>
  )

  const images = product.images?.length > 0 ? product.images : []
  const inWishlist = isInWishlist(product.id)

  const handleAddToCart = async () => {
    if (variants.length && !selectedVariant) {
      toast.error('ابتدا تنوع کالا را انتخاب کنید')
      return
    }
    const added = await addItem(product.id, qty, selectedVariant?.id)
    if (added) {
      setAddedAnim(true)
      setTimeout(() => setAddedAnim(false), 1800)
    }
  }

  const handleWishlist = async () => {
    if (!isAuthenticated) {
      toast.error('برای ذخیره محصول ابتدا وارد شوید')
      return
    }
    await toggle(product)
    toast.success(inWishlist ? 'از علاقه‌مندی‌ها حذف شد' : 'به علاقه‌مندی‌ها اضافه شد')
  }

  return (
    <PageTransition>
      <div className="pt-20 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* ── Breadcrumb ── */}
          <nav className="flex items-center gap-2 text-sm mb-8 flex-wrap">
            {[
              { to: '/', label: 'خانه' },
              { to: '/products', label: 'محصولات' },
              ...(product.category ? [{ to: `/products?category=${product.category.id}`, label: product.category.name }] : []),
            ].map((item, i, arr) => (
              <span key={item.to} className="flex items-center gap-2">
                <Link to={item.to} className="transition-colors hover:text-orange-400" style={{ color: 'var(--text3)' }}>
                  {item.label}
                </Link>
                {i < arr.length - 1 && <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text3)' }} />}
              </span>
            ))}
            <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text3)' }} />
            <span className="line-clamp-1 text-xs" style={{ color: 'var(--text3)' }}>{product.name}</span>
          </nav>

          <div className="grid md:grid-cols-2 gap-10 lg:gap-16">

            {/* ── Image Gallery with Zoom ── */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
              <ZoomableImageGallery images={images} activeIdx={activeImg} onSelect={setActiveImg} />
            </motion.div>

            {/* ── Product Info ── */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>

              {product.brand && (
                <Link to={`/products?brand=${product.brand.id}`}
                  className="text-xs font-bold uppercase tracking-wider hover:underline"
                  style={{ color: 'var(--primary)' }}>
                  {product.brand.name}
                </Link>
              )}

              <h1 className="text-2xl font-black mt-2 mb-3 leading-snug" style={{ color: 'var(--text1)' }}>
                {product.name}
              </h1>

              {/* Rating row */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                {product.reviews_count > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-4 h-4 ${s <= product.average_rating ? 'fill-amber-400 text-amber-400' : ''}`}
                          style={s > product.average_rating ? { color: 'var(--text3)' } : {}} />
                      ))}
                    </div>
                    <span className="text-sm font-bold" style={{ color: 'var(--primary-light)' }}>
                      {product.average_rating}
                    </span>
                    <span className="text-sm" style={{ color: 'var(--text3)' }}>
                      ({product.reviews_count} نظر)
                    </span>
                  </div>
                )}
                {product.sold_count > 0 && (
                  <span className="text-xs px-2 py-1 rounded-lg" style={{ background: 'var(--surface3)', color: 'var(--text3)' }}>
                    {product.sold_count} فروش
                  </span>
                )}
                {product.is_featured && (
                  <span className="text-xs px-2 py-1 rounded-lg border"
                    style={{ background: 'rgba(251,191,36,0.1)', color: '#FBBF24', borderColor: 'rgba(251,191,36,0.2)' }}>
                    ⭐ ویژه
                  </span>
                )}
              </div>

              {/* Price card */}
              <div className="rounded-2xl p-5 mb-5 border"
                style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                <div className="flex items-end gap-3">
                  <span className="text-3xl font-black" style={{ color: 'var(--text1)' }}>
                    {formatPrice(product.price)}
                  </span>
                  {product.compare_price && product.compare_price > product.price && (
                    <span className="text-lg line-through mb-0.5" style={{ color: 'var(--text3)' }}>
                      {formatPrice(product.compare_price)}
                    </span>
                  )}
                </div>
                {product.discount_percent > 0 && (
                  <div className="flex items-center gap-3 mt-3">
                    <span className="badge-discount">{product.discount_percent}٪ تخفیف</span>
                    <span className="text-sm" style={{ color: 'var(--text3)' }}>
                      {formatPrice(product.compare_price - product.price)} تومان سود شما
                    </span>
                  </div>
                )}
              </div>

              {product.short_description && (
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text3)' }}>
                  {product.short_description}
                </p>
              )}

              {/* Stock */}
              {product.is_in_stock ? (
                <>
                  {variants.length > 0 && (
                    <div className="mb-5">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <span className="text-sm font-bold">انتخاب تنوع کالا</span>
                      </div>
                      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="انتخاب تنوع کالا">
                        {variants.map((variant: any) => {
                          const selected = selectedVariantId === variant.id
                          const unavailable = !variant.is_in_stock
                          return (
                            <button
                              key={variant.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              disabled={unavailable}
                              onClick={() => { setSelectedVariantId(variant.id); setQty(1) }}
                              className="min-w-14 rounded-xl border px-3 py-2.5 text-sm font-bold transition-all disabled:cursor-not-allowed disabled:opacity-35"
                              style={selected
                                ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }
                                : { background: 'var(--glass-bg)', borderColor: 'var(--border)', color: 'var(--text2)' }}
                              title={unavailable ? 'ناموجود' : `${variant.stock} عدد موجود`}
                            >
                              <span className="block">{variant.size}</span>
                              {variant.color && <span className="block mt-0.5 text-[10px] font-medium opacity-75">{variant.color}</span>}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                    <span className="text-sm font-semibold" style={{ color: 'var(--primary-light)' }}>
                      {variants.length && !selectedVariant
                        ? 'برای مشاهده موجودی، تنوع کالا را انتخاب کنید'
                        : `موجود در انبار — ${availableStock} عدد`}
                    </span>
                  </div>

                  {/* Qty + Cart */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex items-center rounded-xl overflow-hidden border"
                      style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                      <button type="button" onClick={() => setQty(Math.max(1, qty - 1))}
                        aria-label="کم کردن تعداد"
                        className="px-4 py-3 transition-colors hover:text-orange-400"
                        style={{ color: 'var(--text3)' }}>
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-6 py-3 font-black text-lg" style={{ color: 'var(--text1)' }}>{qty}</span>
                      <button type="button" onClick={() => setQty(Math.min(Math.max(availableStock, 1), qty + 1))}
                        aria-label="افزایش تعداد"
                        className="px-4 py-3 transition-colors hover:text-orange-400"
                        style={{ color: 'var(--text3)' }}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleAddToCart}
                      className="flex-1 btn-primary flex items-center justify-center gap-2 relative overflow-hidden"
                    >
                      <AnimatePresence mode="wait">
                        {addedAnim ? (
                          <motion.span key="done"
                            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }}
                            className="flex items-center gap-2">
                            ✓ اضافه شد!
                          </motion.span>
                        ) : (
                          <motion.span key="add"
                            initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                            className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5" />
                            افزودن به سبد
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>

                    <button type="button" onClick={handleWishlist}
                      aria-label={inWishlist ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
                      className="p-3.5 rounded-xl border transition-all hover:border-red-500/40 hover:text-red-400"
                      style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)', color: 'var(--text3)' }}>
                      <Heart className={`w-5 h-5 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
                    </button>
                  </div>
                </>
              ) : (
                <div className="rounded-xl py-4 text-center mb-5 border text-sm font-medium"
                  style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)', color: 'var(--text3)' }}>
                  این محصول موجود نیست
                </div>
              )}

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                {[
                  { icon: ListChecks, label: 'ضمانت اصالت' },
                  { icon: FileText, label: 'مشخصات کامل' },
                  { icon: PackageSearch, label: 'پیگیری سفارش' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 border text-center"
                    style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                    <Icon className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                    <span className="text-xs font-medium" style={{ color: 'var(--text3)' }}>{label}</span>
                  </div>
                ))}
              </div>

              {/* Quick Specs preview */}
              {product.attributes?.length > 0 && (
                <div className="rounded-2xl p-4 border"
                  style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                  <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text3)' }}>
                    مشخصات اصلی
                  </p>
                  <div className="grid grid-cols-2 gap-2.5 text-sm">
                    {product.attributes.slice(0, 6).map((attr: any) => (
                      <div key={attr.id} className="flex justify-between gap-2">
                        <span style={{ color: 'var(--text3)' }}>{attr.attribute_name}</span>
                        <span className="font-medium text-left" style={{ color: 'var(--text1)' }}>{attr.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* ── Tabs ── */}
          <motion.div className="mt-16"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>

            <div className="flex gap-1 mb-8 p-1 rounded-2xl w-fit border"
              style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
              {([
                ['desc', 'توضیحات'],
                ['specs', 'مشخصات فنی'],
                [`reviews`, `نظرات (${reviews?.count || 0})`],
              ] as const).map(([key, label]) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                    activeTab === key
                      ? 'text-white shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : 'hover:opacity-80'
                  }`}
                  style={activeTab === key
                    ? { background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: '#fff' }
                    : { color: 'var(--text3)' }
                  }>
                  {label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={activeTab}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}>

                {activeTab === 'desc' && (
                  <div className="rounded-2xl p-6 border text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)', color: 'var(--text3)' }}>
                    {product.description || 'توضیحاتی ثبت نشده است.'}
                  </div>
                )}

                {activeTab === 'specs' && (
                  <div className="rounded-2xl overflow-hidden border"
                    style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                    {product.attributes?.length ? (
                      product.attributes.map((attr: any, i: number) => (
                        <div key={attr.id}
                          className="flex justify-between items-center px-6 py-4 text-sm border-b last:border-b-0"
                          style={{
                            background: i % 2 === 0 ? 'rgba(16,185,129,0.03)' : 'transparent',
                            borderColor: 'var(--border)',
                          }}>
                          <span className="font-medium" style={{ color: 'var(--text3)' }}>{attr.attribute_name}</span>
                          <span style={{ color: 'var(--text1)' }}>{attr.value}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-center py-10 text-sm" style={{ color: 'var(--text3)' }}>
                        مشخصاتی ثبت نشده است
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-4">
                    {!reviews?.results?.length ? (
                      <div className="rounded-2xl p-10 border text-center"
                        style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                        <Star className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text3)' }} />
                        <p className="text-sm" style={{ color: 'var(--text3)' }}>هنوز نظری ثبت نشده</p>
                      </div>
                    ) : reviews.results.map((r: any, i: number) => (
                      <motion.div key={r.id}
                        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="rounded-2xl p-5 border"
                        style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                              {r.user_name?.[0] || 'ک'}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm" style={{ color: 'var(--text1)' }}>
                                  {r.user_name}
                                </span>
                                {r.is_verified_purchase && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border"
                                    style={{ background: 'rgba(16,185,129,0.1)', color: 'var(--primary-light)', borderColor: 'rgba(16,185,129,0.2)' }}>
                                    ✓ خریدار تأییدشده
                                  </span>
                                )}
                              </div>
                              <span className="text-xs" style={{ color: 'var(--text3)' }}>
                                {formatDate(r.created_at)}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-0.5 flex-shrink-0">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-400 text-amber-400' : ''}`}
                                style={s > r.rating ? { color: 'var(--text3)' } : {}} />
                            ))}
                          </div>
                        </div>
                        {r.title && (
                          <h4 className="font-bold text-sm mb-1" style={{ color: 'var(--text1)' }}>{r.title}</h4>
                        )}
                        <p className="text-sm leading-relaxed" style={{ color: 'var(--text3)' }}>{r.body}</p>
                        {(r.pros || r.cons) && (
                          <div className="mt-3 space-y-1">
                            {r.pros && <p className="text-sm text-emerald-400">✓ {r.pros}</p>}
                            {r.cons && <p className="text-sm text-red-400">✗ {r.cons}</p>}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>

          {/* ── Related Products ── */}
          {related?.length > 0 && (
            <motion.div className="mt-20"
              initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              <h2 className="text-xl font-black mb-6" style={{ color: 'var(--text1)' }}>
                محصولات مشابه
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {related.map((p: any, i: number) => (
                  <motion.div key={p.id}
                    initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </PageTransition>
  )
}

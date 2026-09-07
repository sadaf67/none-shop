import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, PackageSearch, SearchX, SlidersHorizontal, Sparkles, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { getBrands, getCategories, getProducts } from '@/api/products'
import ProductCard from '@/components/product/ProductCard'
import PageTransition from '@/components/ui/PageTransition'
import usePageMeta from '@/hooks/usePageMeta'
import useJsonLd from '@/hooks/useJsonLd'
import { useSiteSettings } from '@/hooks/useSiteSettings'

/**
 * نقشهٔ سایت لینک‌ها را با اسلاگ می‌سازد (برای سئو خواناتر است) و رابط کاربری
 * با شناسهٔ عددی؛ هر دو باید به یک دسته/برند اشاره کنند.
 */
const matchesParam = (value: string | undefined, item: any) =>
  value != null && (value === String(item.id) || value === item.slug)

const ORDERING_OPTIONS = [
  { value: '-created_at', label: 'جدیدترین' },
  { value: 'price', label: 'ارزان‌ترین' },
  { value: '-price', label: 'گران‌ترین' },
  { value: '-sold_count', label: 'پرفروش‌ترین' },
  { value: '-views_count', label: 'پربازدیدترین' },
]

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterOpen, setFilterOpen] = useState(false)
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => { params[key] = value })

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['products', params],
    queryFn: () => getProducts(params),
  })
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: getCategories })
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: getBrands })

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (value === null || value === '') next.delete(key)
    else next.set(key, value)
    next.delete('page')
    setSearchParams(next)
  }

  const clearFilters = () => setSearchParams({})
  const filterKeys = Object.keys(params).filter((key) => !['ordering', 'page'].includes(key))
  const activeFiltersCount = filterKeys.length

  const { settings } = useSiteSettings()
  const siteName = settings?.site_name || 'ن وان'

  const activeCategory = categories?.find((item: any) => matchesParam(params.category, item))
  const activeBrand = brands?.find((item: any) => matchesParam(params.brand, item))

  // صفحهٔ یک دسته یا یک برند، صفحهٔ فرودِ باارزشی برای جست‌وجوست و در نقشهٔ
  // سایت هم آمده؛ پس باید ایندکس شود. فقط ترکیبِ چند فیلتر یا فیلترهای
  // غیرمعنایی (قیمت، موجودی، جست‌وجو) محتوای تکراری می‌سازند.
  const indexableFacet = filterKeys.length === 1 && ['category', 'brand'].includes(filterKeys[0])
  const noindex = activeFiltersCount > 0 && !indexableFacet

  const facetName = activeCategory?.name || activeBrand?.name
  const pageTitle = params.search
    ? `نتیجه برای «${params.search}»`
    : facetName || 'همه محصولات فروشگاه'

  usePageMeta({
    title: params.search
      ? `جست‌وجوی «${params.search}»`
      : facetName
        ? `خرید ${facetName}`
        : 'فروشگاه محصولات',
    description: facetName
      ? `خرید آنلاین ${facetName} از ${siteName} با قیمت شفاف، ضمانت اصالت کالا و ارسال سریع به سراسر کشور.`
      : `مقایسه و خرید آنلاین محصولات ${siteName} بر اساس دسته‌بندی، برند، قیمت و موجودی.`,
    noindex,
  })

  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  useJsonLd('breadcrumb', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'خانه', item: origin },
      { '@type': 'ListItem', position: 2, name: 'محصولات', item: `${origin}/products` },
      ...(facetName
        ? [{ '@type': 'ListItem', position: 3, name: facetName, item: origin + window.location.pathname + window.location.search }]
        : []),
    ],
  })

  // فهرست محصولاتِ همین صفحه؛ به گوگل کمک می‌کند ترتیب و لینک کالاها را بفهمد.
  useJsonLd(
    'itemlist',
    data?.results?.length
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          numberOfItems: data.count ?? data.results.length,
          itemListElement: data.results.slice(0, 24).map((product: any, i: number) => ({
            '@type': 'ListItem',
            position: i + 1,
            url: `${origin}/products/${product.slug}`,
            name: product.name,
          })),
        }
      : null,
  )

  const filterContentProps = { params, categories, brands, setParam }

  return (
    <PageTransition>
      <main className="min-h-screen pt-24 md:pt-28">
        <section className="catalog-hero">
          <div className="catalog-hero__glow" aria-hidden="true" />
          <div className="relative max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
            <div className="max-w-4xl">
              <div className="editorial-kicker mb-5">ویترین {siteName}</div>
              <h1 className="text-4xl sm:text-5xl md:text-7xl font-black leading-[1.04]">
                {pageTitle}
              </h1>
              <p className="mt-5 max-w-2xl text-sm md:text-base leading-8" style={{ color: 'var(--text3)' }}>
                محصولات را بر اساس دسته‌بندی، برند، قیمت و موجودی مقایسه کنید؛ مشخصات کامل هر کالا در صفحه آن آمده است.
              </p>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <span className="catalog-count">
                <PackageSearch className="w-4 h-4" />
                {isLoading ? 'در حال آماده‌سازی ویترین' : `${(data?.count ?? 0).toLocaleString('fa-IR')} محصول`}
              </span>
              {params.has_discount === 'true' && <span className="catalog-chip"><Sparkles className="w-3.5 h-3.5" /> فقط پیشنهادها</span>}
              {params.in_stock === 'true' && <span className="catalog-chip">فقط موجودها</span>}
            </div>
          </div>
        </section>

        <section className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="catalog-toolbar">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilterOpen(true)}
                className="btn-ghost md:hidden !min-h-11 !px-4 !py-2.5 text-sm"
                aria-label="باز کردن فیلترهای محصولات"
              >
                <SlidersHorizontal className="w-4 h-4" /> فیلترها
                {activeFiltersCount > 0 && <span className="filter-count">{activeFiltersCount.toLocaleString('fa-IR')}</span>}
              </button>

              {activeFiltersCount > 0 && (
                <button type="button" onClick={clearFilters} className="clear-filter-button">
                  <X className="w-3.5 h-3.5" /> حذف فیلترها
                </button>
              )}
            </div>

            <label className="catalog-sort">
              <span className="hidden sm:inline">مرتب‌سازی:</span>
              <select value={params.ordering || '-created_at'} onChange={(event) => setParam('ordering', event.target.value)} aria-label="مرتب‌سازی محصولات">
                {ORDERING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <ChevronDown className="w-4 h-4" aria-hidden="true" />
            </label>
          </div>

          <div className="mt-7 grid md:grid-cols-[250px_minmax(0,1fr)] gap-7 lg:gap-9 items-start">
            <aside className="hidden md:block sticky top-28 catalog-filter-panel" aria-label="فیلترهای محصولات">
              <div className="flex items-center justify-between gap-3 pb-5 border-b" style={{ borderColor: 'var(--border)' }}>
                <div>
                  <span className="block text-sm font-black">فیلتر انتخاب</span>
                  <span className="block text-[11px] mt-1" style={{ color: 'var(--text3)' }}>نتیجه را دقیق‌تر کنید</span>
                </div>
                <SlidersHorizontal className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              </div>
              <FilterContent {...filterContentProps} />
            </aside>

            <div className="min-w-0">
              {isLoading ? (
                <ProductGridSkeleton />
              ) : isError ? (
                <CatalogError onRetry={() => refetch()} />
              ) : data?.results?.length ? (
                <div className="product-grid-responsive grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5">
                  <AnimatePresence mode="popLayout">
                    {data.results.map((product: any, index: number) => (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: .96 }}
                        transition={{ delay: Math.min(index * .035, .2), duration: .35 }}
                      >
                        <ProductCard product={product} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyCatalog hasFilters={activeFiltersCount > 0} onClear={clearFilters} />
              )}

              {data && (data.next || data.previous) && (
                <nav className="catalog-pagination" aria-label="صفحه‌بندی محصولات">
                  <button
                    type="button"
                    disabled={!data.previous}
                    onClick={() => setParam('page', String(Math.max(1, Number(params.page || '1') - 1)))}
                    className="btn-ghost !min-h-11 !py-2.5"
                  >
                    قبلی
                  </button>
                  <span>صفحه {(params.page || '1').toLocaleString()}</span>
                  <button
                    type="button"
                    disabled={!data.next}
                    onClick={() => setParam('page', String(Number(params.page || '1') + 1))}
                    className="btn-primary !min-h-11 !py-2.5"
                  >
                    بعدی <ArrowLeft className="w-4 h-4" />
                  </button>
                </nav>
              )}
            </div>
          </div>
        </section>

        <AnimatePresence>
          {filterOpen && (
            <motion.div className="fixed inset-0 z-[90] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setFilterOpen(false)} aria-label="بستن فیلترها" />
              <motion.aside
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                className="absolute inset-x-0 bottom-0 max-h-[86vh] overflow-y-auto rounded-t-[30px] p-5"
                style={{ background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}
                aria-label="فیلترهای محصولات"
              >
                <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border)' }}>
                  <div>
                    <h2 className="font-black">فیلتر محصولات</h2>
                    <p className="text-xs mt-1" style={{ color: 'var(--text3)' }}>انتخاب‌های نمایش‌داده‌شده را محدود کنید</p>
                  </div>
                  <button type="button" onClick={() => setFilterOpen(false)} className="icon-surface" aria-label="بستن"><X className="w-5 h-5" /></button>
                </div>
                <FilterContent {...filterContentProps} />
                <button type="button" onClick={() => setFilterOpen(false)} className="btn-primary w-full mt-6">نمایش نتیجه‌ها</button>
              </motion.aside>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </PageTransition>
  )
}

function FilterContent({ params, categories, brands, setParam }: {
  params: Record<string, string>
  categories: any[] | undefined
  brands: any[] | undefined
  setParam: (key: string, value: string | null) => void
}) {
  const matches = matchesParam

  return (
    <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
      {categories?.length ? (
        <FilterSection title="دسته‌بندی">
          {categories.map((category: any) => (
            <label key={category.id} className="filter-option">
              <input
                type="radio"
                name="category"
                checked={matches(params.category, category)}
                onChange={() => setParam('category', String(category.id))}
              />
              <span className="flex-1">{category.name}</span>
              <span className="filter-option__count">{category.products_count?.toLocaleString('fa-IR') ?? '۰'}</span>
            </label>
          ))}
        </FilterSection>
      ) : null}

      {brands?.length ? (
        <FilterSection title="برند">
          {brands.slice(0, 8).map((brand: any) => (
            <label key={brand.id} className="filter-option">
              <input
                type="radio"
                name="brand"
                checked={matches(params.brand, brand)}
                onChange={() => setParam('brand', matches(params.brand, brand) ? null : String(brand.id))}
              />
              <span>{brand.name}</span>
            </label>
          ))}
        </FilterSection>
      ) : null}

      <FilterSection title="محدوده قیمت">
        <div className="grid grid-cols-2 gap-2">
          <label className="price-field">
            <span>از</span>
            <input type="number" inputMode="numeric" placeholder="حداقل" value={params.min_price || ''} onChange={(event) => setParam('min_price', event.target.value)} />
          </label>
          <label className="price-field">
            <span>تا</span>
            <input type="number" inputMode="numeric" placeholder="حداکثر" value={params.max_price || ''} onChange={(event) => setParam('max_price', event.target.value)} />
          </label>
        </div>
        <p className="mt-2 text-[10px]" style={{ color: 'var(--text-muted)' }}>مبلغ به تومان وارد شود.</p>
      </FilterSection>

      <FilterSection title="وضعیت">
        <ToggleFilter label="فقط کالاهای موجود" checked={params.in_stock === 'true'} onChange={(value) => setParam('in_stock', value ? 'true' : null)} />
        <ToggleFilter label="فقط کالاهای تخفیف‌دار" checked={params.has_discount === 'true'} onChange={(value) => setParam('has_discount', value ? 'true' : null)} />
      </FilterSection>
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-5 first:pt-5 last:pb-0">
      <h3 className="mb-3 text-[11px] font-black tracking-[.08em]" style={{ color: 'var(--text3)' }}>{title}</h3>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

function ToggleFilter({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-sm" style={{ color: 'var(--text2)' }}>{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`filter-switch ${checked ? 'is-active' : ''}`}>
        <span />
      </button>
    </div>
  )
}

function ProductGridSkeleton() {
  return (
    <div className="product-grid-responsive grid grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-5" aria-label="در حال بارگذاری محصولات">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[26px] border animate-pulse" style={{ borderColor: 'var(--border)', background: 'var(--surface2)' }}>
          <div className="aspect-square" style={{ background: 'var(--surface3)' }} />
          <div className="p-4 space-y-3"><div className="h-3 w-1/3 rounded-full bg-[var(--surface3)]" /><div className="h-4 rounded-full bg-[var(--surface3)]" /><div className="h-4 w-2/3 rounded-full bg-[var(--surface3)]" /></div>
        </div>
      ))}
    </div>
  )
}

function EmptyCatalog({ hasFilters, onClear }: { hasFilters: boolean; onClear: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="empty-catalog">
      <span className="empty-catalog__icon">{hasFilters ? <SearchX className="w-8 h-8" /> : <PackageSearch className="w-8 h-8" />}</span>
      <div className="editorial-kicker justify-center mb-4">{hasFilters ? 'انتخاب دیگری امتحان کنید' : 'ویترین در حال آماده‌سازی است'}</div>
      <h2 className="text-2xl md:text-4xl font-black">{hasFilters ? 'محصولی با این مشخصات پیدا نشد.' : 'هنوز محصولی در فروشگاه ثبت نشده.'}</h2>
      <p className="mt-4 max-w-lg mx-auto text-sm leading-7" style={{ color: 'var(--text3)' }}>
        {hasFilters ? 'فیلترها را سبک‌تر کنید یا همه‌ی محصولات را دوباره ببینید.' : 'به‌محض ثبت محصولات، قیمت، موجودی و تصاویر همین‌جا نمایش داده می‌شوند.'}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {hasFilters
          ? <button type="button" onClick={onClear} className="btn-primary">حذف همه فیلترها</button>
          : <Link to="/" className="btn-primary">بازگشت به صفحه اصلی</Link>}
        <Link to="/contact" className="btn-ghost">تماس با پشتیبانی</Link>
      </div>
    </motion.div>
  )
}

function CatalogError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="empty-catalog" role="alert">
      <span className="empty-catalog__icon"><SearchX className="w-8 h-8" /></span>
      <div className="editorial-kicker justify-center mb-4">ارتباط با فروشگاه برقرار نشد</div>
      <h2 className="text-2xl md:text-4xl font-black">ویترین فعلاً در دسترس نیست.</h2>
      <p className="mt-4 max-w-lg text-sm leading-7" style={{ color: 'var(--text3)' }}>این وضعیت با خالی بودن فروشگاه فرق دارد؛ اتصال سرویس محصولات را بررسی کنید و دوباره تلاش کنید.</p>
      <button type="button" onClick={onRetry} className="btn-primary mt-7">تلاش دوباره</button>
    </div>
  )
}

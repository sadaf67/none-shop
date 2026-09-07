import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, Heart, ImageOff, LayoutDashboard, Loader2, LogOut, Menu, PackageSearch, Search, ShoppingBag, User, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useCartStore } from '@/store/cartStore'
import { useWishlistStore } from '@/store/wishlistStore'
import { useDebounce } from '@/hooks/useDebounce'
import { getProducts } from '@/api/products'
import { formatPrice } from '@/utils/format'
import ThemeToggle from '@/components/ui/ThemeToggle'
import LogoMark from '@/components/brand/LogoMark'
import { useSiteSettings } from '@/hooks/useSiteSettings'

const NAV_LINKS = [
  { to: '/', label: 'خانه' },
  { to: '/products', label: 'محصولات' },
  { to: '/products?is_featured=true', label: 'منتخب‌ها' },
  { to: '/products?has_discount=true', label: 'پیشنهادها' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, user, logout } = useAuthStore()
  const { items_count, fetchCart } = useCartStore()
  const { items: wishlistItems, fetchWishlist, clear: clearWishlist } = useWishlistStore()
  const wishlistCount = wishlistItems.length
  const debouncedQuery = useDebounce(query, 320)
  const { settings } = useSiteSettings()
  const siteName = settings?.site_name || 'ن وان'

  const { data: searchResults, isFetching: searching } = useQuery({
    queryKey: ['navbar-search', debouncedQuery],
    queryFn: () => getProducts({ search: debouncedQuery, page_size: 5 }),
    enabled: debouncedQuery.trim().length >= 2,
    staleTime: 20_000,
  })

  useEffect(() => {
    fetchCart()
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [fetchCart])

  useEffect(() => {
    if (isAuthenticated) fetchWishlist()
    else clearWishlist()
  }, [isAuthenticated, fetchWishlist, clearWishlist])

  useEffect(() => {
    setMobileOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!searchOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [searchOpen])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    navigate(`/products?search=${encodeURIComponent(query.trim())}`)
    setSearchOpen(false)
    setQuery('')
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setQuery('')
  }

  const isActive = (to: string) => {
    if (to === '/') return location.pathname === '/'
    const [targetPath, targetQuery = ''] = to.split('?')
    if (location.pathname !== targetPath) return false
    if (!targetQuery) return !location.search
    const targetParams = new URLSearchParams(targetQuery)
    const currentParams = new URLSearchParams(location.search)
    return [...targetParams.entries()].every(([key, value]) => currentParams.get(key) === value)
  }

  return (
    <>
      <header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'var(--nav-bg)' : 'color-mix(in srgb, var(--surface) 72%, transparent)',
          borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
          backdropFilter: 'blur(18px)',
        }}
      >
        <div className="h-7 flex items-center justify-center overflow-hidden px-4 text-[10px] sm:text-[11px] font-bold tracking-[.04em] sm:tracking-[.08em] whitespace-nowrap bg-[var(--text1)] text-[var(--surface)]">
          راهنمای انتخاب سایز برای خرید مطمئن‌تر
          <span className="hidden sm:inline mx-2 opacity-30">•</span>
          <span className="hidden sm:inline">قیمت، موجودی و مشخصات شفاف هر مدل</span>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-[68px] flex items-center justify-between gap-4">
            <Link
              to="/"
              className="flex items-center gap-2.5 shrink-0 group"
              aria-label={`صفحه اصلی ${siteName}`}
            >
              {settings?.logo ? (
                <img src={settings.logo} alt={siteName} width={40} height={40}
                     className="w-10 h-10 rounded-xl object-contain" />
              ) : (
                <LogoMark size={40} className="transition-transform group-hover:rotate-[-8deg]" />
              )}
              <span className="hidden min-[360px]:block">
                <span className="block text-base font-black leading-none">{siteName}</span>
                <span className="block text-[8px] tracking-[.2em] mt-1.5" style={{ color: 'var(--text3)' }}>
                  {settings?.site_name_en || 'N ONE'}
                </span>
              </span>
            </Link>

            <nav className="hidden lg:flex items-center gap-1" aria-label="منوی اصلی">
              {NAV_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="relative px-4 py-2.5 text-sm font-bold rounded-full transition-colors"
                  style={{ color: isActive(to) ? 'var(--text1)' : 'var(--text3)', background: isActive(to) ? 'var(--glass-bg2)' : 'transparent' }}
                >
                  {label}
                  {isActive(to) && <motion.span layoutId="nav-dot" className="absolute left-1/2 -bottom-0.5 w-1 h-1 rounded-full bg-[var(--primary)]" />}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <ThemeToggle compact />
              <IconButton label="جستجو" onClick={() => setSearchOpen(true)}><Search className="w-[18px] h-[18px]" /></IconButton>
              <Link to="/wishlist" className="hidden sm:grid relative w-10 h-10 place-items-center rounded-full transition-colors hover:bg-[var(--glass-bg2)]" aria-label="علاقه‌مندی‌ها">
                <Heart className={`w-[18px] h-[18px] ${wishlistCount ? 'fill-red-500 text-red-500' : ''}`} />
                {wishlistCount > 0 && <CountBadge value={wishlistCount} />}
              </Link>
              <Link to="/cart" className="grid relative w-10 h-10 place-items-center rounded-full transition-colors hover:bg-[var(--glass-bg2)]" aria-label="سبد خرید">
                <ShoppingBag className="w-[18px] h-[18px]" />
                {items_count > 0 && <CountBadge value={items_count} />}
              </Link>

              {isAuthenticated ? (
                <div className="relative hidden md:block">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="flex items-center gap-2 h-10 px-3 rounded-full border"
                    style={{ borderColor: 'var(--border)', background: 'var(--glass-bg2)' }}
                    aria-expanded={userMenuOpen}
                  >
                    <span className="grid w-6 h-6 place-items-center rounded-full bg-[var(--primary)] text-white text-[10px] font-black">
                      {(user?.full_name || user?.username || 'ک')[0]}
                    </span>
                    <span className="max-w-24 truncate text-xs font-bold">{user?.full_name || user?.username}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: .97 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: .97 }}
                        className="absolute left-0 top-full mt-2 w-52 overflow-hidden rounded-2xl glass p-1.5"
                      >
                        {user?.is_staff && <MenuLink to="/admin" icon={<LayoutDashboard className="w-4 h-4" />} label="پنل مدیریت" />}
                        <MenuLink to="/orders" icon={<PackageSearch className="w-4 h-4" />} label="سفارش‌های من" />
                        <MenuLink to="/wishlist" icon={<Heart className="w-4 h-4" />} label="علاقه‌مندی‌ها" />
                        <button
                          type="button"
                          onClick={() => { logout(); navigate('/') }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10"
                        >
                          <LogOut className="w-4 h-4" /> خروج از حساب
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <Link to="/login" className="hidden md:inline-flex items-center gap-2 h-10 px-4 rounded-full bg-[var(--text1)] text-[var(--surface)] text-xs font-black">
                  <User className="w-4 h-4" /> ورود
                </Link>
              )}

              <IconButton label={mobileOpen ? 'بستن منو' : 'باز کردن منو'} onClick={() => setMobileOpen((open) => !open)} className="lg:hidden">
                {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </IconButton>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="lg:hidden overflow-hidden border-t" style={{ borderColor: 'var(--border)', background: 'var(--nav-bg)' }}>
              <nav className="px-4 py-4 grid gap-1" aria-label="منوی موبایل">
                {NAV_LINKS.map(({ to, label }, index) => (
                  <Link key={to} to={to} className="flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold hover:bg-[var(--glass-bg2)]">
                    {label}<span className="text-[10px]" style={{ color: 'var(--text3)' }}>{(index + 1).toLocaleString('fa-IR', { minimumIntegerDigits: 2, useGrouping: false })}</span>
                  </Link>
                ))}
                <div className="mt-2 pt-3 flex gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
                  {isAuthenticated && <Link to="/orders" className="btn-ghost flex-1 text-xs">سفارش‌ها</Link>}
                  <Link to="/wishlist" className="btn-ghost flex-1 text-xs">علاقه‌مندی‌ها</Link>
                  {isAuthenticated ? (
                    <button type="button" onClick={() => { logout(); clearWishlist(); navigate('/') }} className="btn-ghost flex-1 text-xs text-red-400">خروج</button>
                  ) : (
                    <Link to="/login" className="btn-primary flex-1 text-xs">ورود / ثبت‌نام</Link>
                  )}
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] px-4 pt-20 sm:pt-28" role="dialog" aria-modal="true" aria-label="جستجوی محصولات">
            <button type="button" aria-label="بستن جستجو" className="absolute inset-0 w-full h-full bg-black/70 backdrop-blur-md" onClick={closeSearch} />
            <motion.div initial={{ y: -18, scale: .98 }} animate={{ y: 0, scale: 1 }} exit={{ y: -18, scale: .98 }} className="relative max-w-2xl mx-auto">
              <form onSubmit={handleSearch} className="glass flex items-center gap-3 p-3 pl-4 rounded-[24px]">
                <div className="grid w-11 h-11 shrink-0 place-items-center rounded-full bg-[var(--primary)] text-white">
                  {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </div>
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="نام محصول، برند یا دسته‌بندی را جست‌وجو کنید..."
                  className="min-w-0 flex-1 bg-transparent outline-none text-sm sm:text-base"
                  aria-label="عبارت جستجو"
                />
                {query && <button type="button" onClick={() => setQuery('')} className="grid w-9 h-9 place-items-center" aria-label="پاک کردن"><X className="w-4 h-4" /></button>}
              </form>

              {debouncedQuery.length >= 2 && (
                <div className="glass mt-2 rounded-[24px] overflow-hidden p-2">
                  {searchResults?.results?.length ? (
                    <>
                      {searchResults.results.map((product: any) => (
                        <Link key={product.id} to={`/products/${product.slug}`} onClick={closeSearch} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-[var(--glass-bg2)] group">
                          <span className="w-14 h-14 rounded-xl overflow-hidden shrink-0" style={{ background: 'var(--surface3)' }}>
                            {product.main_image?.image ? <img src={product.main_image.image} alt="" className="w-full h-full object-cover" /> : <span className="grid w-full h-full place-items-center"><ImageOff className="w-5 h-5" /></span>}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-bold">{product.name}</span>
                            <span className="block mt-1 text-xs" style={{ color: 'var(--text3)' }}>{formatPrice(product.price)}</span>
                          </span>
                          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        </Link>
                      ))}
                      <button type="submit" onClick={handleSearch as any} className="w-full flex items-center justify-center gap-2 p-3 mt-1 text-sm font-bold rounded-xl bg-[var(--glass-bg2)]">همه نتایج <ArrowLeft className="w-4 h-4" /></button>
                    </>
                  ) : !searching ? (
                    <p className="py-8 text-center text-sm" style={{ color: 'var(--text3)' }}>نتیجه‌ای برای «{debouncedQuery}» پیدا نشد.</p>
                  ) : null}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function IconButton({ label, onClick, className = '', children }: { label: string; onClick: () => void; className?: string; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} className={`grid w-10 h-10 place-items-center rounded-full transition-colors hover:bg-[var(--glass-bg2)] ${className}`}>{children}</button>
}

function CountBadge({ value }: { value: number }) {
  return <span className="absolute -top-0.5 -right-0.5 grid min-w-[17px] h-[17px] place-items-center px-1 rounded-full bg-[var(--primary)] text-white text-[9px] font-black">{value > 9 ? '۹+' : value}</span>
}

function MenuLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return <Link to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-[var(--glass-bg2)]">{icon}{label}</Link>
}

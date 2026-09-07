import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BadgePercent, BarChart3, FileText, GripVertical, Images, LayoutDashboard, LogOut,
  Menu, MessageCircleQuestion, Inbox, Package, Send, Settings, ShoppingBag,
  Star, Store, Tags, Bookmark, Users, UserCog, X,
} from 'lucide-react'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { useAuthStore } from '@/store/authStore'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import LogoMark from '@/components/brand/LogoMark'

const navGroups = [
  {
    label: 'مرور کلی',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'داشبورد', end: true },
      { to: '/admin/orders', icon: ShoppingBag, label: 'سفارش‌ها' },
      { to: '/admin/customers', icon: Users, label: 'مشتریان' },
    ],
  },
  {
    label: 'کاتالوگ',
    items: [
      { to: '/admin/products', icon: Package, label: 'محصولات' },
      { to: '/admin/categories', icon: Tags, label: 'دسته‌بندی‌ها' },
      { to: '/admin/brands', icon: Store, label: 'برندها' },
      { to: '/admin/tags', icon: Bookmark, label: 'برچسب‌ها' },
      { to: '/admin/sort', icon: GripVertical, label: 'اولویت نمایش' },
    ],
  },
  {
    label: 'فروش و محتوا',
    items: [
      { to: '/admin/coupons', icon: BadgePercent, label: 'کدهای تخفیف' },
      { to: '/admin/banners', icon: Images, label: 'بنرها' },
      { to: '/admin/pages', icon: FileText, label: 'صفحات ثابت' },
      { to: '/admin/faqs', icon: MessageCircleQuestion, label: 'پرسش‌های متداول' },
      { to: '/admin/reviews', icon: Star, label: 'نظرات' },
    ],
  },
  {
    label: 'ارتباطات و پیکربندی',
    items: [
      { to: '/admin/messages', icon: Inbox, label: 'پیام‌ها و خبرنامه' },
      { to: '/admin/sms', icon: Send, label: 'پنل پیامکی' },
      { to: '/admin/users', icon: UserCog, label: 'مدیران' },
      { to: '/admin/settings', icon: Settings, label: 'تنظیمات سایت' },
    ],
  },
]

export default function AdminLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sideOpen, setSideOpen] = useState(false)
  const { settings } = useSiteSettings()
  const siteName = settings?.site_name || 'ن وان'

  // با تغییر مسیر، منوی موبایل بسته می‌شود.
  useEffect(() => { setSideOpen(false) }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex" dir="rtl" style={{ background: 'var(--surface)' }}>
      <aside
        className={`fixed inset-y-0 right-0 z-40 w-64 flex flex-col border-l transition-transform duration-300
          ${sideOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static lg:flex`}
        style={{ background: 'var(--surface2)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
          <LogoMark size={34} />
          <div className="min-w-0">
            <div className="text-sm font-black text-gradient leading-none truncate">{siteName}</div>
            <div className="text-[9px] tracking-widest mt-1" style={{ color: 'var(--primary)' }}>ADMIN PANEL</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-black tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map(({ to, icon: Icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="px-4 py-4 border-t shrink-0" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))' }}>
              {user?.username?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate" style={{ color: 'var(--text2)' }}>{user?.username}</div>
              <div className="text-[10px]" style={{ color: 'var(--primary)' }}>
                {user?.is_superuser ? 'سوپر ادمین' : 'ادمین'}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="admin-nav-link w-full is-logout">
            <LogOut className="w-3.5 h-3.5" />
            خروج از حساب
          </button>
        </div>
      </aside>

      {sideOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSideOpen(false)} aria-hidden />
      )}

      <main className="flex-1 min-w-0 flex flex-col">
        <header
          className="sticky top-0 z-20 flex items-center gap-3 px-5 py-3 border-b"
          style={{ background: 'var(--nav-bg)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}
        >
          <button onClick={() => setSideOpen(!sideOpen)} className="lg:hidden icon-surface !w-9 !h-9"
            aria-label={sideOpen ? 'بستن منو' : 'باز کردن منو'}>
            {sideOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-4 h-4 shrink-0" style={{ color: 'var(--primary)' }} />
            <span className="text-sm font-semibold truncate" style={{ color: 'var(--text2)' }}>پنل مدیریت</span>
          </div>
          <div className="mr-auto flex items-center gap-2">
            <ThemeToggle />
            <NavLink to="/" className="text-xs font-bold hover:underline" style={{ color: 'var(--text3)' }}>
              بازگشت به سایت
            </NavLink>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-5 lg:p-7 min-w-0">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

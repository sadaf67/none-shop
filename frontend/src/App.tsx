import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, Link } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useThemeStore } from '@/store/themeStore'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import FloatingWidgets from '@/components/ui/FloatingWidgets'
import SiteHead from '@/components/common/SiteHead'
import InstallPrompt from '@/components/common/InstallPrompt'
import Loader from '@/components/brand/Loader'
import { useAuthStore } from '@/store/authStore'

const Home = lazy(() => import('@/pages/Home'))
const Products = lazy(() => import('@/pages/Products'))
const ProductDetail = lazy(() => import('@/pages/ProductDetail'))
const Cart = lazy(() => import('@/pages/Cart'))
const Login = lazy(() => import('@/pages/Login'))
const Register = lazy(() => import('@/pages/Register'))
const Wishlist = lazy(() => import('@/pages/Wishlist'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const Orders = lazy(() => import('@/pages/Orders'))
const PaymentVerify = lazy(() => import('@/pages/PaymentVerify'))
const Faq = lazy(() => import('@/pages/Faq'))
const Contact = lazy(() => import('@/pages/Contact'))
const CmsPage = lazy(() => import('@/pages/CmsPage'))
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'))
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'))
const AdminOrders = lazy(() => import('@/pages/admin/AdminOrders'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminSort = lazy(() => import('@/pages/admin/AdminSort'))
const AdminProducts = lazy(() => import('@/pages/admin/AdminProducts'))
const AdminCategories = lazy(() => import('@/pages/admin/AdminCategories'))
const AdminBrands = lazy(() => import('@/pages/admin/AdminBrands'))
const AdminTags = lazy(() => import('@/pages/admin/AdminTags'))
const AdminBanners = lazy(() => import('@/pages/admin/AdminBanners'))
const AdminPages = lazy(() => import('@/pages/admin/AdminPages'))
const AdminFaqs = lazy(() => import('@/pages/admin/AdminFaqs'))
const AdminCoupons = lazy(() => import('@/pages/admin/AdminCoupons'))
const AdminReviews = lazy(() => import('@/pages/admin/AdminReviews'))
const AdminCustomers = lazy(() => import('@/pages/admin/AdminCustomers'))
const AdminMessages = lazy(() => import('@/pages/admin/AdminMessages'))
const AdminSms = lazy(() => import('@/pages/admin/AdminSms'))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings'))

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  const location = useLocation()
  const next = `${location.pathname}${location.search}`
  return isAuthenticated ? <>{children}</> : <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.is_staff) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppShell() {
  const location = useLocation()
  const noLayout = ['/login', '/register'].includes(location.pathname)
  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <>
      <a href="#main-content" className="skip-link">پرش به محتوای اصلی</a>
      {!noLayout && !isAdmin && <Navbar />}

      <div id="main-content" tabIndex={-1}>
        <AnimatePresence mode="wait">
          <Suspense fallback={<RouteLoader />}>
            <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:slug" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/checkout" element={<PrivateRoute><Checkout /></PrivateRoute>} />
          <Route path="/orders" element={<PrivateRoute><Orders /></PrivateRoute>} />
          <Route path="/payment/verify" element={<PaymentVerify />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* صفحات عمومی محتوایی */}
          <Route path="/faq" element={<Faq />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/page/:slug" element={<CmsPage />} />

          {/* Admin panel */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="brands" element={<AdminBrands />} />
            <Route path="tags" element={<AdminTags />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="pages" element={<AdminPages />} />
            <Route path="faqs" element={<AdminFaqs />} />
            <Route path="coupons" element={<AdminCoupons />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="messages" element={<AdminMessages />} />
            <Route path="sms" element={<AdminSms />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="sort" element={<AdminSort />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>

          <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AnimatePresence>
      </div>

      {!noLayout && !isAdmin && <Footer />}
    </>
  )
}

export default function App() {
  const { theme } = useThemeStore()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <>
      <SiteHead />
      <AppShell />
      <FloatingWidgets />
      <InstallPrompt />
    </>
  )
}

function NotFound() {
  return (
    <div className="pt-24 min-h-screen flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-6xl font-black mb-4" style={{ color: 'var(--primary)' }}>۴۰۴</h1>
        <p className="text-xl mb-8" style={{ color: 'var(--text3)' }}>صفحه مورد نظر یافت نشد</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-primary">برگشت به خانه</Link>
          <Link to="/products" className="btn-ghost">مشاهده محصولات</Link>
        </div>
      </div>
    </div>
  )
}

function RouteLoader() {
  return (
    <div className="min-h-[55vh] pt-28 flex items-center justify-center">
      <Loader label="در حال آماده‌سازی صفحه" />
    </div>
  )
}

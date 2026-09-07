import axios from './axios'

/** پاسخ صفحه‌بندی‌شده استاندارد DRF. */
export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type QueryParams = Record<string, string | number | boolean | undefined | null>

/** ورودی‌های خالی را حذف می‌کند تا در URL ظاهر نشوند. */
function cleanParams(params: QueryParams = {}) {
  const output: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    output[key] = String(value)
  }
  return output
}

/**
 * برخی ویوست‌های ادمین `pagination_class = None` دارند و آرایه خام برمی‌گردانند.
 * این تابع هر دو شکل را به آرایه تبدیل می‌کند.
 */
export function asList<T>(data: Paginated<T> | T[] | undefined): T[] {
  if (Array.isArray(data)) return data
  return data?.results ?? []
}

/** وقتی فایل در payload باشد باید multipart بفرستیم، نه JSON. */
function hasFile(payload: Record<string, any>) {
  return Object.values(payload).some((value) => value instanceof File || value instanceof Blob)
}

function toFormData(payload: Record<string, any>) {
  const form = new FormData()
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      // فیلدهای چندمقداری مثل tags باید تکرار شوند.
      value.forEach((item) => form.append(key, String(item)))
    } else if (typeof value === 'boolean') {
      form.append(key, value ? 'true' : 'false')
    } else {
      form.append(key, value as string | Blob)
    }
  }
  return form
}

function serialize(payload: Record<string, any>) {
  return hasFile(payload)
    ? { data: toFormData(payload), headers: { 'Content-Type': 'multipart/form-data' } }
    : { data: payload, headers: undefined }
}

/** سازنده کلاینت CRUD برای هر ViewSet ادمین. */
export function createResource<T = any>(basePath: string) {
  const path = basePath.replace(/\/$/, '')
  return {
    list: (params?: QueryParams) =>
      axios.get<Paginated<T> | T[]>(`${path}/`, { params: cleanParams(params) }).then((r) => r.data),
    listAll: (params?: QueryParams) =>
      axios.get<Paginated<T> | T[]>(`${path}/`, { params: cleanParams(params) }).then((r) => asList(r.data)),
    get: (id: string | number) => axios.get<T>(`${path}/${id}/`).then((r) => r.data),
    create: (payload: Record<string, any>) => {
      const { data, headers } = serialize(payload)
      return axios.post<T>(`${path}/`, data, { headers }).then((r) => r.data)
    },
    update: (id: string | number, payload: Record<string, any>) => {
      const { data, headers } = serialize(payload)
      return axios.patch<T>(`${path}/${id}/`, data, { headers }).then((r) => r.data)
    },
    remove: (id: string | number) => axios.delete(`${path}/${id}/`).then((r) => r.data),
  }
}

// ─── منابع CRUD ────────────────────────────────────────────────────────────
export const adminProducts = createResource('/products/admin/products')
export const adminCategoriesCrud = createResource('/products/admin/categories-crud')
export const adminBrands = createResource('/products/admin/brands')
export const adminTags = createResource('/products/admin/tags')
export const adminProductImages = createResource('/products/admin/images')
export const adminProductVariants = createResource('/products/admin/variants')
export const adminBanners = createResource('/core/admin/banners')
export const adminPages = createResource('/core/admin/pages')
export const adminFaqs = createResource('/core/admin/faqs')
export const adminMessages = createResource('/core/admin/messages')
export const adminCoupons = createResource('/discounts/admin/coupons')
export const adminReviews = createResource('/reviews/admin/reviews')
export const adminCustomers = createResource('/auth/admin/customers')

// ─── تنظیمات سایت ──────────────────────────────────────────────────────────
export const getAdminSettings = () => axios.get('/core/admin/settings/').then((r) => r.data)

export const updateAdminSettings = (payload: Record<string, any>) => {
  const { data, headers } = serialize(payload)
  return axios.patch('/core/admin/settings/', data, { headers }).then((r) => r.data)
}

// ─── آمار ─────────────────────────────────────────────────────────────────
export const getCatalogStats = () => axios.get('/products/admin/stats/').then((r) => r.data)
export const getReviewStats = () => axios.get('/reviews/admin/stats/').then((r) => r.data)
export const getCustomerStats = () => axios.get('/auth/admin/customers/stats/').then((r) => r.data)
export const getSmsStats = () => axios.get('/sms/admin/stats/').then((r) => r.data)
export const getSalesReport = () => axios.get('/orders/admin/report/').then((r) => r.data)

// ─── اکشن‌های گروهی ────────────────────────────────────────────────────────
export const bulkProductStatus = (ids: string[], status: string) =>
  axios.post('/products/admin/products/bulk_status/', { ids, status }).then((r) => r.data)

export const bulkProductPrice = (ids: string[], percent: number) =>
  axios.post('/products/admin/products/bulk_price/', { ids, percent }).then((r) => r.data)

export const duplicateProduct = (id: string) =>
  axios.post(`/products/admin/products/${id}/duplicate/`).then((r) => r.data)

export const bulkApproveReviews = (ids: number[], approve: boolean) =>
  axios.post('/reviews/admin/reviews/bulk_approve/', { ids, approve }).then((r) => r.data)

export const toggleCustomerActive = (id: number) =>
  axios.post(`/auth/admin/customers/${id}/toggle_active/`).then((r) => r.data)

export const getCouponUsages = (id: number) =>
  axios.get(`/discounts/admin/coupons/${id}/usages/`).then((r) => r.data)

// ─── پنل پیامکی ────────────────────────────────────────────────────────────
export const getSmsLogs = (params?: QueryParams) =>
  axios.get('/sms/admin/logs/', { params: cleanParams(params) }).then((r) => r.data)

export const sendSms = (phone: string, message: string) =>
  axios.post('/sms/admin/send/', { phone, message }).then((r) => r.data)

// ─── خبرنامه ───────────────────────────────────────────────────────────────
export const getNewsletterSubscribers = () => axios.get('/core/admin/newsletter/').then((r) => r.data)

// ─── سفارش‌ها و کاربران مدیر (سازگاری با صفحات موجود) ──────────────────────
export const getAdminProducts = () => axios.get('/products/admin/all/').then((r) => r.data)
export const getAdminCategories = () => axios.get('/products/admin/categories/').then((r) => r.data)

export const reorderProducts = (ids: string[]) =>
  axios.post('/products/admin/reorder-products/', { ids }).then((r) => r.data)

export const reorderCategories = (ids: number[]) =>
  axios.post('/products/admin/reorder-categories/', { ids }).then((r) => r.data)

export const getAdminOrders = (status?: string, page: number = 1) =>
  axios.get('/orders/admin/all/', { params: { ...(status ? { status } : {}), page } }).then((r) => r.data)

export const updateOrderStatus = (
  orderId: string,
  status: string,
  options?: { tracking_code?: string; refund_confirmed?: boolean },
) => axios.patch(`/orders/admin/${orderId}/status/`, { status, ...options }).then((r) => r.data)

export const getAdminUsers = () => axios.get('/auth/admins/').then((r) => r.data?.results ?? r.data)

export const createAdminUser = (data: {
  username: string
  password: string
  email?: string
  first_name?: string
  last_name?: string
  is_superuser?: boolean
}) => axios.post('/auth/admins/create/', data).then((r) => r.data)

export const deleteAdminUser = (userId: number) =>
  axios.delete(`/auth/admins/${userId}/delete/`).then((r) => r.data)

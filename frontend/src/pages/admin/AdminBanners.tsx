import ResourceManager, { type FieldDef } from '@/components/admin/ResourceManager'
import { Badge } from '@/components/admin/AdminUI'
import { adminBanners } from '@/api/admin'

const POSITIONS = [
  { value: 'hero', label: 'اسلایدر اصلی' },
  { value: 'strip', label: 'بنر نواری' },
  { value: 'category', label: 'بنر دسته‌بندی' },
  { value: 'sidebar', label: 'بنر کناری' },
  { value: 'popup', label: 'پاپ‌آپ' },
]

const fields: FieldDef[] = [
  { name: 'title', label: 'عنوان', required: true },
  { name: 'position', label: 'جایگاه', type: 'select', options: POSITIONS, defaultValue: 'hero', required: true },
  { name: 'subtitle', label: 'زیرعنوان', hideInTable: true },
  { name: 'badge', label: 'برچسب کوچک', hideInTable: true, placeholder: 'مثلاً پیشنهاد ویژه' },
  { name: 'image', label: 'تصویر (دسکتاپ)', type: 'image', required: true },
  { name: 'mobile_image', label: 'تصویر (موبایل)', type: 'image', hideInTable: true },
  { name: 'link', label: 'لینک مقصد', type: 'url', hideInTable: true, placeholder: '/products?category=۱' },
  { name: 'button_text', label: 'متن دکمه', hideInTable: true },
  { name: 'starts_at', label: 'شروع نمایش', type: 'datetime', hideInTable: true },
  { name: 'ends_at', label: 'پایان نمایش', type: 'datetime', hideInTable: true },
  { name: 'order', label: 'ترتیب', type: 'number', defaultValue: 0 },
  { name: 'is_active', label: 'فعال', type: 'switch', defaultValue: true },
]

export default function AdminBanners() {
  return (
    <ResourceManager
      title="بنرها"
      description="محتوای بصری صفحه اصلی. اسلایدر اصلی، نوار متحرک و بنرهای کناری همه از همین‌جا تغذیه می‌شوند."
      queryKey="admin-banners"
      resource={adminBanners}
      fields={fields}
      labelKey="title"
      filters={[{ name: 'position', label: 'همه جایگاه‌ها', options: POSITIONS }]}
      extraColumns={[{
        label: 'وضعیت نمایش',
        cell: (row) => row.is_live
          ? <Badge tone="success">در حال نمایش</Badge>
          : <Badge tone="default">خارج از بازه</Badge>,
      }]}
      emptyHint="اولین بنر «اسلایدر اصلی» را بسازید تا صفحه نخست فروشگاه شخصی‌سازی شود."
    />
  )
}

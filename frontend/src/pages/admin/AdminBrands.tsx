import ResourceManager, { type FieldDef } from '@/components/admin/ResourceManager'
import { adminBrands } from '@/api/admin'

const fields: FieldDef[] = [
  { name: 'name', label: 'نام برند', required: true },
  { name: 'slug', label: 'نشانی (اسلاگ)', hint: 'خالی بگذارید تا خودکار ساخته شود.', hideInTable: true },
  { name: 'logo', label: 'لوگو', type: 'image' },
  { name: 'description', label: 'توضیح', type: 'textarea', hideInTable: true },
  { name: 'is_active', label: 'فعال باشد', type: 'switch', defaultValue: true },
]

export default function AdminBrands() {
  return (
    <ResourceManager
      title="برندها"
      description="برندها در فیلترهای فروشگاه و فید ترب و ایمالز استفاده می‌شوند."
      queryKey="admin-brands"
      resource={adminBrands}
      fields={fields}
      extraColumns={[{ label: 'تعداد محصول', cell: (row) => Number(row.products_count ?? 0).toLocaleString('fa-IR') }]}
      emptyHint="برند محصولات را اینجا ثبت کنید تا در فیلترها و فیدهای مقایسه قیمت دیده شود."
    />
  )
}

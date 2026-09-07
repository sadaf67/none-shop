import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import ResourceManager, { type FieldDef } from '@/components/admin/ResourceManager'
import { adminCategoriesCrud } from '@/api/admin'

export default function AdminCategories() {
  // برای انتخاب «دسته والد» به فهرست کامل دسته‌ها نیاز داریم.
  const { data: all } = useQuery({
    queryKey: ['admin-categories-options'],
    queryFn: () => adminCategoriesCrud.listAll({ page_size: 200 }),
  })

  const fields = useMemo<FieldDef[]>(() => [
    { name: 'name', label: 'نام دسته‌بندی', required: true },
    { name: 'slug', label: 'نشانی (اسلاگ)', hint: 'خالی بگذارید تا خودکار از نام ساخته شود.', hideInTable: true },
    {
      name: 'parent',
      label: 'دسته والد',
      type: 'select',
      options: (all ?? []).map((item: any) => ({ value: item.id, label: item.name })),
      hint: 'برای دسته‌های اصلی خالی بگذارید.',
      cell: (row) => row.parent_name || '—',
    },
    { name: 'image', label: 'تصویر دسته', type: 'image' },
    { name: 'description', label: 'توضیح کوتاه', type: 'textarea', hideInTable: true },
    { name: 'order', label: 'ترتیب نمایش', type: 'number', defaultValue: 0 },
    { name: 'is_active', label: 'فعال باشد', type: 'switch', defaultValue: true },
  ], [all])

  return (
    <ResourceManager
      title="دسته‌بندی‌ها"
      description="ساختار درختی فروشگاه. هر دسته می‌تواند زیرمجموعه یک دسته دیگر باشد."
      queryKey="admin-categories"
      resource={adminCategoriesCrud}
      fields={fields}
      extraColumns={[{ label: 'تعداد محصول', cell: (row) => Number(row.products_count ?? 0).toLocaleString('fa-IR') }]}
      emptyHint="با ساخت اولین دسته‌بندی، منوی فروشگاه و صفحه محصولات پر می‌شود."
    />
  )
}

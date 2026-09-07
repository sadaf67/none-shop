import ResourceManager, { type FieldDef } from '@/components/admin/ResourceManager'
import { adminTags } from '@/api/admin'

const fields: FieldDef[] = [
  { name: 'name', label: 'نام برچسب', required: true },
  { name: 'slug', label: 'نشانی (اسلاگ)', hint: 'خالی بگذارید تا خودکار ساخته شود.' },
]

export default function AdminTags() {
  return (
    <ResourceManager
      title="برچسب‌ها"
      description="برچسب‌ها برای گروه‌بندی آزاد محصولات به کار می‌روند؛ مثلاً «پرفروش» یا «تخفیف‌دار»."
      queryKey="admin-tags"
      resource={adminTags}
      fields={fields}
      emptyHint="برچسب‌ها هنگام ویرایش هر محصول قابل انتخاب هستند."
    />
  )
}

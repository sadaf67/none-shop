import ResourceManager, { type FieldDef } from '@/components/admin/ResourceManager'
import { adminFaqs } from '@/api/admin'

const fields: FieldDef[] = [
  { name: 'question', label: 'پرسش', required: true, full: true },
  { name: 'answer', label: 'پاسخ', type: 'html', required: true, hideInTable: true },
  { name: 'group', label: 'گروه', defaultValue: 'عمومی', hint: 'پرسش‌ها بر اساس گروه دسته‌بندی می‌شوند.' },
  { name: 'order', label: 'ترتیب', type: 'number', defaultValue: 0 },
  { name: 'is_active', label: 'فعال', type: 'switch', defaultValue: true },
]

export default function AdminFaqs() {
  return (
    <ResourceManager
      title="پرسش‌های متداول"
      description="محتوای صفحه پرسش‌های متداول. پاسخ‌های خوب، تماس‌های پشتیبانی را کم می‌کنند."
      queryKey="admin-faqs"
      resource={adminFaqs}
      fields={fields}
      labelKey="question"
      emptyHint="پرسش‌های رایج درباره ارسال، بازگشت کالا و گارانتی را اینجا اضافه کنید."
    />
  )
}

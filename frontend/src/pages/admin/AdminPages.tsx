import ResourceManager, { type FieldDef } from '@/components/admin/ResourceManager'
import { adminPages } from '@/api/admin'

const fields: FieldDef[] = [
  { name: 'title', label: 'عنوان صفحه', required: true },
  { name: 'slug', label: 'نشانی (اسلاگ)', hint: 'خالی بگذارید تا از عنوان ساخته شود. آدرس نهایی: /page/<اسلاگ>' },
  { name: 'content', label: 'محتوای صفحه', type: 'html', required: true, hideInTable: true, hint: 'HTML ساده؛ تگ‌های ناامن پیش از ذخیره حذف می‌شوند.' },
  { name: 'meta_title', label: 'عنوان سئو', hideInTable: true },
  { name: 'meta_description', label: 'توضیحات سئو', type: 'textarea', hideInTable: true },
  { name: 'order', label: 'ترتیب', type: 'number', defaultValue: 0 },
  { name: 'show_in_footer', label: 'نمایش در فوتر', type: 'switch', defaultValue: true },
  { name: 'is_active', label: 'فعال', type: 'switch', defaultValue: true },
]

export default function AdminPages() {
  return (
    <ResourceManager
      title="صفحات ثابت"
      description="درباره ما، تماس با ما، قوانین، حریم خصوصی و هر صفحه دیگری که لازم دارید — بدون نیاز به برنامه‌نویس."
      queryKey="admin-pages"
      resource={adminPages}
      fields={fields}
      labelKey="title"
      extraColumns={[{
        label: 'پیش‌نمایش',
        cell: (row) => (
          <a href={`/page/${row.slug}`} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)', fontWeight: 800 }}>
            مشاهده
          </a>
        ),
      }]}
      emptyHint="صفحه‌های «درباره ما» و «قوانین» برای دریافت نماد اعتماد الکترونیکی لازم هستند."
    />
  )
}

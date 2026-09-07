import ResourceManager, { type FieldDef } from '@/components/admin/ResourceManager'
import { Badge } from '@/components/admin/AdminUI'
import { adminCoupons } from '@/api/admin'

const DISCOUNT_TYPES = [
  { value: 'percent', label: 'درصدی' },
  { value: 'fixed', label: 'مبلغ ثابت (تومان)' },
]

const fields: FieldDef[] = [
  { name: 'code', label: 'کد تخفیف', required: true, hint: 'خودکار به حروف بزرگ تبدیل می‌شود.' },
  { name: 'discount_type', label: 'نوع تخفیف', type: 'select', options: DISCOUNT_TYPES, defaultValue: 'percent', required: true },
  { name: 'value', label: 'مقدار تخفیف', type: 'number', required: true, hint: 'برای نوع درصدی حداکثر ۱۰۰.' },
  { name: 'max_discount', label: 'سقف تخفیف (تومان)', type: 'number', hint: 'فقط برای تخفیف درصدی.' },
  { name: 'min_order_amount', label: 'حداقل مبلغ سفارش (تومان)', type: 'number', defaultValue: 0 },
  { name: 'usage_limit', label: 'سقف کل استفاده', type: 'number', hint: 'خالی یعنی نامحدود.' },
  { name: 'per_user_limit', label: 'سقف استفاده هر کاربر', type: 'number', defaultValue: 1 },
  { name: 'valid_from', label: 'شروع اعتبار', type: 'datetime', required: true },
  { name: 'valid_until', label: 'پایان اعتبار', type: 'datetime', required: true },
  { name: 'is_active', label: 'فعال', type: 'switch', defaultValue: true },
]

export default function AdminCoupons() {
  return (
    <ResourceManager
      title="کدهای تخفیف"
      description="کوپن‌ها هنگام تسویه اعتبارسنجی می‌شوند؛ سقف استفاده و بازه زمانی روی سرور کنترل می‌شود."
      queryKey="admin-coupons"
      resource={adminCoupons}
      fields={fields}
      labelKey="code"
      filters={[{
        name: 'state',
        label: 'همه وضعیت‌ها',
        options: [
          { value: 'active', label: 'در حال اجرا' },
          { value: 'scheduled', label: 'زمان‌بندی‌شده' },
          { value: 'expired', label: 'منقضی‌شده' },
        ],
      }]}
      extraColumns={[
        {
          label: 'مصرف',
          cell: (row) => {
            const used = Number(row.used_count ?? 0).toLocaleString('fa-IR')
            return row.usage_limit ? `${used} از ${Number(row.usage_limit).toLocaleString('fa-IR')}` : `${used} (نامحدود)`
          },
        },
        {
          label: 'وضعیت',
          cell: (row) => row.is_valid
            ? <Badge tone="success">معتبر</Badge>
            : <Badge tone="danger">غیرقابل استفاده</Badge>,
        },
      ]}
      emptyHint="یک کد تخفیف خوش‌آمدگویی بسازید تا نرخ تبدیل اولین خرید بالا برود."
    />
  )
}

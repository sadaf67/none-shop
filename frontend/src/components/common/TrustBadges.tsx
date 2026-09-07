import { useSiteSettings } from '@/hooks/useSiteSettings'

/**
 * نمادهای اعتماد (اینماد و ساماندهی).
 * کد HTML این نمادها از پنل مدیر وارد می‌شود؛ اگر خالی باشد چیزی نمایش داده نمی‌شود.
 */
export default function TrustBadges() {
  const { settings } = useSiteSettings()
  const badges = [settings?.enamad_html, settings?.samandehi_html].filter(Boolean) as string[]

  if (badges.length === 0 && !settings?.business_license) return null

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-4 py-8 border-t"
      style={{ borderColor: 'var(--border)' }}
    >
      {badges.map((html, index) => (
        <div
          key={index}
          className="trust-badge"
          // محتوای این نماد توسط مدیر فروشگاه از پنل وارد می‌شود
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ))}
      {settings?.business_license && (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          شماره ثبت: <span dir="ltr">{settings.business_license}</span>
        </span>
      )}
    </div>
  )
}

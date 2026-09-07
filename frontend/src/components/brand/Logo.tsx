import { Link } from 'react-router-dom'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import LogoMark from './LogoMark'

interface LogoProps {
  size?: number
  /** متن کنار نشان نمایش داده شود */
  withText?: boolean
  /** زیرنویس انگلیسی زیر نام سایت */
  subtitle?: string
  to?: string | null
  className?: string
}

export default function Logo({
  size = 40,
  withText = true,
  subtitle,
  to = '/',
  className = '',
}: LogoProps) {
  const { settings } = useSiteSettings()
  const siteName = settings?.site_name || 'ن وان'
  const siteNameEn = settings?.site_name_en || 'N ONE'
  const caption = subtitle ?? siteNameEn

  const content = (
    <span className={`flex items-center gap-2.5 ${className}`}>
      {settings?.logo ? (
        <img
          src={settings.logo}
          alt={siteName}
          width={size}
          height={size}
          className="rounded-xl object-contain"
          style={{ width: size, height: size }}
        />
      ) : (
        <LogoMark size={size} />
      )}
      {withText && (
        <span className="flex flex-col leading-none">
          <span className="text-lg font-black tracking-tight" style={{ color: 'var(--text1)' }}>
            {siteName}
          </span>
          {caption && (
            <span
              className="mt-1 text-[10px] font-bold tracking-[0.28em]"
              style={{ color: 'var(--text3)' }}
            >
              {caption}
            </span>
          )}
        </span>
      )}
    </span>
  )

  if (!to) return content
  return (
    <Link to={to} aria-label={siteName} className="inline-flex">
      {content}
    </Link>
  )
}

interface LogoMarkProps {
  size?: number
  className?: string
  /** برای انیمیشن لودر — مسیر حرف «ن» کشیده می‌شود */
  animated?: boolean
  title?: string
}

/**
 * نشان «ن وان» — حرف نون فارسی که هم‌زمان حرف N انگلیسی را تداعی می‌کند.
 */
export default function LogoMark({ size = 40, className, animated = false, title }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id="none-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary-light, #ff916f)" />
          <stop offset="55%" stopColor="var(--primary, #ff6b3d)" />
          <stop offset="100%" stopColor="var(--primary-dark, #de4320)" />
        </linearGradient>
      </defs>

      <rect x="1.5" y="1.5" width="45" height="45" rx="14" fill="url(#none-mark-bg)" />
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="14"
        fill="none"
        stroke="rgba(255,255,255,.28)"
        strokeWidth="1.5"
      />

      {/* کاسه‌ی حرف «ن» */}
      <path
        d="M13 16 L13 22 A11 11 0 0 0 35 22 L35 16"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
        className={animated ? 'logo-mark__stroke' : undefined}
      />
      {/* نقطه‌ی حرف «ن» */}
      <circle cx="24" cy="13" r="2.9" fill="#fff" className={animated ? 'logo-mark__dot' : undefined} />
    </svg>
  )
}

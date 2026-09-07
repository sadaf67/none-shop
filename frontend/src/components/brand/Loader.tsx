import LogoMark from './LogoMark'

interface LoaderProps {
  /** تمام‌صفحه (اسپلش) یا درون‌خطی */
  fullscreen?: boolean
  label?: string
  size?: number
  className?: string
}

export function Loader({ fullscreen = false, label = 'در حال بارگذاری…', size = 64, className = '' }: LoaderProps) {
  const body = (
    <div className={`none-loader ${className}`} role="status" aria-live="polite">
      <div className="none-loader__mark" style={{ width: size, height: size }}>
        <span className="none-loader__ring" />
        <LogoMark size={size * 0.72} animated />
      </div>
      {label && <p className="none-loader__label">{label}</p>}
      <span className="sr-only">{label}</span>
    </div>
  )

  if (!fullscreen) return body
  return <div className="none-loader__screen">{body}</div>
}

export default Loader

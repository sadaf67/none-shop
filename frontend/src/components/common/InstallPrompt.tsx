import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import LogoMark from '@/components/brand/LogoMark'
import { useSiteSettings } from '@/hooks/useSiteSettings'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = 'pwa-install-dismissed-at'
const DISMISS_DAYS = 14

/** نوار پیشنهاد نصب اپلیکیشن (PWA) */
export default function InstallPrompt() {
  const { settings } = useSiteSettings()
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0)
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DAYS * 86_400_000) return
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const onPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const onInstalled = () => setVisible(false)
    window.addEventListener('appinstalled', onInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setVisible(false)
  }

  const install = async () => {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    setVisible(false)
  }

  if (!visible || !deferred) return null

  return (
    <div className="install-prompt" role="dialog" aria-label="نصب اپلیکیشن">
      <LogoMark size={42} />
      <div className="install-prompt__body">
        <strong>نصب اپلیکیشن {settings?.site_name || 'ن وان'}</strong>
        <span>دسترسی سریع‌تر، بدون نیاز به مرورگر</span>
      </div>
      <button type="button" className="install-prompt__cta" onClick={install}>
        <Download size={16} aria-hidden />
        نصب
      </button>
      <button type="button" className="install-prompt__close" onClick={dismiss} aria-label="بستن">
        <X size={18} aria-hidden />
      </button>
    </div>
  )
}

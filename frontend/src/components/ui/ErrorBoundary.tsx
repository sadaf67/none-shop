import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled storefront error', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <main className="min-h-screen px-4 flex items-center justify-center" style={{ background: 'var(--surface)', color: 'var(--text1)' }}>
        <section className="glass max-w-lg w-full rounded-3xl border p-8 text-center" style={{ borderColor: 'var(--border)' }}>
          <AlertTriangle className="w-12 h-12 mx-auto" style={{ color: 'var(--primary)' }} />
          <h1 className="mt-5 text-2xl font-black">نمایش این صفحه با خطا روبه‌رو شد</h1>
          <p className="mt-3 text-sm leading-7" style={{ color: 'var(--text3)' }}>
            اطلاعات شما حذف نشده است. صفحه را تازه کنید؛ اگر خطا تکرار شد، مدیر سایت باید گزارش سرور را بررسی کند.
          </p>
          <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6 inline-flex">
            <RefreshCw className="w-4 h-4" /> بارگذاری دوباره
          </button>
        </section>
      </main>
    )
  }
}

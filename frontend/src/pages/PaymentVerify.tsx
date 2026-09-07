import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { verifyPayment } from '@/api/cart'
import PageTransition from '@/components/ui/PageTransition'

type VerifyState = { status: 'loading' | 'success' | 'failed'; message?: string; refId?: string; orderNumber?: string }

export default function PaymentVerify() {
  const [params] = useSearchParams()
  const [state, setState] = useState<VerifyState>({ status: 'loading' })

  useEffect(() => {
    const authority = params.get('Authority') || params.get('authority')
    const status = params.get('Status') || params.get('status')
    if (!authority) {
      setState({ status: 'failed', message: 'شناسه تراکنش در پاسخ درگاه وجود ندارد.' })
      return
    }
    verifyPayment({ authority, status })
      .then((result) => setState(result.success
        ? { status: 'success', refId: result.ref_id, orderNumber: result.order_number }
        : { status: 'failed', message: result.message || 'پرداخت تأیید نشد.' }))
      .catch((error) => setState({
        status: 'failed',
        message: error?.response?.data?.message
          || error?.response?.data?.error
          || 'ارتباط با درگاه برای تأیید پرداخت انجام نشد.',
        refId: error?.response?.data?.ref_id,
        orderNumber: error?.response?.data?.order_number,
      }))
  }, [params])

  return (
    <PageTransition>
      <main className="min-h-screen pt-28 px-4 flex items-center justify-center">
        <section className="checkout-result">
          {state.status === 'loading' ? (
            <><Loader2 className="w-10 h-10 mx-auto animate-spin" style={{ color: 'var(--primary)' }} /><h1 className="mt-6 text-2xl font-black">در حال بررسی پرداخت</h1><p className="mt-3 text-sm" style={{ color: 'var(--text3)' }}>لطفاً این صفحه را نبندید.</p></>
          ) : state.status === 'success' ? (
            <><span className="checkout-result__icon"><CheckCircle2 className="w-8 h-8" /></span><h1 className="text-3xl md:text-5xl font-black">پرداخت موفق بود.</h1><p className="mt-4 text-sm" style={{ color: 'var(--text3)' }}>سفارش {state.orderNumber} ثبت شد. کد پیگیری پرداخت: {state.refId}</p></>
          ) : (
            <><span className="checkout-result__icon is-error"><XCircle className="w-8 h-8" /></span><h1 className="text-3xl md:text-5xl font-black">پرداخت تأیید نشد.</h1><p className="mt-4 text-sm leading-7" style={{ color: 'var(--text3)' }}>{state.message}</p></>
          )}
          {state.status !== 'loading' && <div className="mt-7 flex flex-wrap justify-center gap-3"><Link to="/products" className="btn-primary">بازگشت به فروشگاه</Link><Link to="/orders" className="btn-ghost">سفارش‌های من</Link><Link to="/" className="btn-ghost">صفحه اصلی</Link></div>}
        </section>
      </main>
    </PageTransition>
  )
}

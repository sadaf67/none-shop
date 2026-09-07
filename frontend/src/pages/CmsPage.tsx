import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileQuestion } from 'lucide-react'
import { settingsApi } from '@/api/settings'
import PageTransition from '@/components/ui/PageTransition'
import Loader from '@/components/brand/Loader'
import usePageMeta from '@/hooks/usePageMeta'

export default function CmsPage() {
  const { slug = '' } = useParams<{ slug: string }>()

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cms-page', slug],
    queryFn: () => settingsApi.getPage(slug),
    enabled: !!slug,
    retry: false,
    staleTime: 1000 * 60 * 10,
  })

  usePageMeta({
    title: data?.meta_title || data?.title,
    description: data?.meta_description,
    noindex: isError,
  })

  return (
    <PageTransition>
      <div className="pt-20 min-h-screen">
        {isLoading ? (
          <div className="py-32 flex justify-center">
            <Loader label="در حال دریافت صفحه" />
          </div>
        ) : isError || !data ? (
          <NotFound />
        ) : (
          <>
            <header className="border-b py-10 px-4" style={{ borderColor: 'var(--border)' }}>
              <div className="max-w-3xl mx-auto">
                <h1 className="text-2xl sm:text-3xl font-black" style={{ color: 'var(--text1)' }}>
                  {data.title}
                </h1>
                {data.updated_at && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text4)' }}>
                    آخرین به‌روزرسانی:{' '}
                    {new Date(data.updated_at).toLocaleDateString('fa-IR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                )}
              </div>
            </header>

            <article className="max-w-3xl mx-auto px-4 py-8">
              <div
                className="cms-content"
                // محتوای صفحات در بک‌اند پاک‌سازی می‌شود (core/sanitizers.py)
                dangerouslySetInnerHTML={{ __html: data.content }}
              />
            </article>
          </>
        )}
      </div>
    </PageTransition>
  )
}

function NotFound() {
  return (
    <div className="py-32 px-4 text-center">
      <FileQuestion className="w-14 h-14 mx-auto mb-5 opacity-30" style={{ color: 'var(--text3)' }} />
      <h1 className="text-xl font-black mb-2" style={{ color: 'var(--text1)' }}>
        این صفحه پیدا نشد
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text3)' }}>
        ممکن است نشانی تغییر کرده یا صفحه حذف شده باشد.
      </p>
      <Link to="/" className="btn-primary inline-flex">
        برگشت به خانه
      </Link>
    </div>
  )
}

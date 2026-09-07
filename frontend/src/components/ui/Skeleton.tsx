import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'
}

export function Skeleton({ className, rounded = 'xl' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse',
        `rounded-${rounded}`,
        className
      )}
      style={{ background: 'var(--glass-bg)', border: '1px solid var(--border)' }}
    />
  )
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border"
      style={{ background: 'var(--glass-bg)', borderColor: 'var(--border)' }}>
      <Skeleton className="aspect-square w-full" rounded="sm" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <div className="h-px w-full" style={{ background: 'var(--border)' }} />
        <div className="flex justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-12" />
        </div>
      </div>
    </div>
  )
}

export function ProductDetailSkeleton() {
  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* breadcrumb */}
        <div className="flex gap-3 mb-8">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-4" rounded="full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" rounded="full" />
          <Skeleton className="h-4 w-32" />
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* image */}
          <div>
            <Skeleton className="aspect-square w-full rounded-2xl mb-3" />
            <div className="flex gap-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="w-16 h-16 rounded-xl flex-shrink-0" />)}
            </div>
          </div>

          {/* info */}
          <div className="space-y-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-8 w-full" />
            <div className="flex gap-1">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="w-4 h-4" rounded="full" />)}
              <Skeleton className="h-4 w-16 mr-2" />
            </div>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-14 w-36 rounded-xl" />
              <Skeleton className="h-14 flex-1 rounded-xl" />
              <Skeleton className="h-14 w-14 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <Skeleton className="h-56 rounded-2xl" />
      <div className="grid lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </div>
  )
}

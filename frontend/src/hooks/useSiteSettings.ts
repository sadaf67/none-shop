import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/api/settings'
import type { Banner } from '@/types/settings'

export const SITE_SETTINGS_KEY = ['site-settings'] as const

/**
 * تنظیمات فروشگاه از پنل مدیر. یک بار گرفته و در کل برنامه به اشتراک گذاشته می‌شود.
 */
export function useSiteSettings() {
  const query = useQuery({
    queryKey: SITE_SETTINGS_KEY,
    queryFn: settingsApi.getPublic,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  })

  return {
    settings: query.data?.settings,
    banners: query.data?.banners ?? [],
    footerPages: query.data?.footer_pages ?? [],
    isLoading: query.isLoading,
  }
}

export function useBanners(position: Banner['position']) {
  const { banners } = useSiteSettings()
  return banners.filter((banner) => banner.position === position).sort((a, b) => a.order - b.order)
}

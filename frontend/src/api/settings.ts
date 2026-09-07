import api from './axios'
import type { CmsPage, Faq, PublicSettingsResponse } from '@/types/settings'

export const settingsApi = {
  getPublic: () => api.get<PublicSettingsResponse>('/core/settings/').then((r) => r.data),
  getPage: (slug: string) => api.get<CmsPage>(`/core/pages/${encodeURIComponent(slug)}/`).then((r) => r.data),
  getFaqs: () => api.get<Faq[]>('/core/faqs/').then((r) => r.data),
  sendContact: (payload: { name: string; phone: string; email?: string; subject?: string; message: string }) =>
    api.post('/core/contact/', payload).then((r) => r.data),
  subscribeNewsletter: (email: string) =>
    api.post('/core/newsletter/', { email }).then((r) => r.data),
}

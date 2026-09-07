export interface SiteSettings {
  site_name: string
  site_name_en: string
  tagline: string
  logo: string | null
  logo_light: string | null
  favicon: string | null
  og_image: string | null
  primary_color: string

  phone: string
  phone_secondary: string
  email: string
  address: string
  postal_code: string
  working_hours: string
  map_lat: string | null
  map_lng: string | null

  instagram: string
  telegram: string
  whatsapp: string
  twitter: string
  linkedin: string
  aparat: string
  youtube: string

  enamad_html: string
  samandehi_html: string
  business_license: string
  legal_owner: string

  free_shipping_threshold: number
  flat_shipping_cost: number
  shipping_note: string
  tax_percent: number
  currency_label: string

  payment_gateway: string
  gateway_sandbox: boolean
  cod_enabled: boolean
  online_payment_enabled: boolean

  sms_enabled: boolean
  otp_login_enabled: boolean

  meta_title: string
  meta_description: string
  meta_keywords: string
  google_analytics_id: string
  google_site_verification: string

  announcement_text: string
  announcement_link: string
  announcement_enabled: boolean
  maintenance_mode: boolean
  maintenance_message: string
}

export interface Banner {
  id: number
  title: string
  subtitle: string
  badge: string
  image: string | null
  mobile_image: string | null
  link: string
  button_text: string
  position: 'hero' | 'strip' | 'category' | 'sidebar' | 'popup'
  order: number
}

export interface FooterPage {
  slug: string
  title: string
}

export interface PublicSettingsResponse {
  settings: SiteSettings
  banners: Banner[]
  footer_pages: FooterPage[]
}

export interface CmsPage {
  slug: string
  title: string
  content: string
  meta_title: string
  meta_description: string
  updated_at: string
}

export interface Faq {
  id: number
  question: string
  answer: string
  group: string
}

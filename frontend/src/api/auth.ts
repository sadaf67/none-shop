import api from './axios'

export const register = (data: any) =>
  api.post('/auth/register/', data).then(r => r.data)

export const login = (data: any) =>
  api.post('/auth/login/', data).then(r => r.data)

export const logout = (refresh: string) =>
  api.post('/auth/logout/', { refresh }).then(r => r.data)

export const getProfile = () =>
  api.get('/auth/profile/').then(r => r.data)

export const updateProfile = (data: any) =>
  api.patch('/auth/profile/', data).then(r => r.data)

export const getAddresses = () =>
  api.get('/auth/addresses/').then(r => Array.isArray(r.data) ? r.data : (r.data.results ?? []))

export const createAddress = (data: any) =>
  api.post('/auth/addresses/', data).then(r => r.data)

export const updateAddress = (id: number, data: any) =>
  api.patch(`/auth/addresses/${id}/`, data).then(r => r.data)

export const deleteAddress = (id: number) =>
  api.delete(`/auth/addresses/${id}/`).then(r => r.data)

export const changePassword = (data: any) =>
  api.post('/auth/change-password/', data).then(r => r.data)

/** درخواست کد یک‌بارمصرف برای ورود با شماره موبایل */
export const requestOtp = (phone: string) =>
  api.post<{ message: string; expires_in: number; resend_after: number }>(
    '/auth/otp/request/', { phone },
  ).then(r => r.data)

/** تأیید کد و ورود؛ اگر کاربر تازه باشد is_new_user برمی‌گردد */
export const verifyOtp = (phone: string, code: string) =>
  api.post('/auth/otp/verify/', { phone, code }).then(r => r.data)

import api from './axios'

export const getCart = () =>
  api.get('/orders/cart/').then(r => r.data)

export const addToCart = (product_id: string, quantity: number = 1, variant_id?: number) =>
  api.post('/orders/cart/add/', { product_id, quantity, variant_id }).then(r => r.data)

export const updateCartItem = (item_id: number, quantity: number) =>
  api.patch(`/orders/cart/items/${item_id}/`, { quantity }).then(r => r.data)

export const removeCartItem = (item_id: number) =>
  api.delete(`/orders/cart/items/${item_id}/remove/`).then(r => r.data)

export const clearCart = () =>
  api.delete('/orders/cart/clear/').then(r => r.data)

export const validateCoupon = (code: string, order_amount: number) =>
  api.post('/discounts/validate/', { code, order_amount }).then(r => r.data)

export const getOrders = (page: number = 1) =>
  api.get('/orders/', { params: { page } }).then(r => r.data)

export const getOrder = (id: string) =>
  api.get(`/orders/${id}/`).then(r => r.data)

export const createOrder = (data: any) =>
  api.post('/orders/create/', data).then(r => r.data)

export const requestPayment = (order_id: string) =>
  api.post(`/payments/${order_id}/request/`).then(r => r.data)

export const verifyPayment = (data: any) =>
  api.post('/payments/verify/', data).then(r => r.data)

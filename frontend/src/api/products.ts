import api from './axios'

export const getProducts = (params?: Record<string, any>) =>
  api.get('/products/', { params }).then(r => r.data)

export const getProduct = (slug: string) =>
  api.get(`/products/${slug}/`).then(r => r.data)

export const getCategories = () =>
  api.get('/products/categories/').then(r => Array.isArray(r.data) ? r.data : (r.data.results ?? []))

export const getBrands = () =>
  api.get('/products/brands/').then(r => Array.isArray(r.data) ? r.data : (r.data.results ?? []))

export const getFeatured = () =>
  api.get('/products/featured/').then(r => r.data)

export const getNewArrivals = () =>
  api.get('/products/new_arrivals/').then(r => r.data)

export const getBestSellers = () =>
  api.get('/products/best_sellers/').then(r => r.data)

export const getOnSale = () =>
  api.get('/products/on_sale/').then(r => r.data)

export const getRelated = (slug: string) =>
  api.get(`/products/${slug}/related/`).then(r => r.data)

export const getProductReviews = (slug: string) =>
  api.get(`/reviews/products/${slug}/reviews/`).then(r => r.data)

export const addReview = (data: any) =>
  api.post('/reviews/create/', data).then(r => r.data)

export const getWishlist = () =>
  api.get('/products/wishlist/').then(r => r.data)

export const addToWishlist = (product_id: string) =>
  api.post('/products/wishlist/', { product_id }).then(r => r.data)

export const removeFromWishlist = (id: number) =>
  api.delete(`/products/wishlist/${id}/`).then(r => r.data)

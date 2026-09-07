import { create } from 'zustand'
import { getCart, addToCart, updateCartItem, removeCartItem, clearCart } from '@/api/cart'
import toast from 'react-hot-toast'

interface CartItem {
  id: number
  product: any
  variant?: {
    id: number
    size: string
    color?: string
    sku: string
    stock: number
    label: string
  } | null
  quantity: number
  total_price: number
}

interface CartState {
  items: CartItem[]
  total: number
  items_count: number
  isLoading: boolean
  fetchCart: () => Promise<void>
  addItem: (product_id: string, quantity?: number, variant_id?: number) => Promise<boolean>
  updateItem: (item_id: number, quantity: number) => Promise<void>
  removeItem: (item_id: number) => Promise<void>
  clearItems: () => Promise<void>
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  items_count: 0,
  isLoading: false,

  fetchCart: async () => {
    try {
      set({ isLoading: true })
      const data = await getCart()
      set({ items: data.items, total: data.total, items_count: data.items_count })
    } catch {
    } finally {
      set({ isLoading: false })
    }
  },

  addItem: async (product_id, quantity = 1, variant_id) => {
    try {
      const data = await addToCart(product_id, quantity, variant_id)
      set({ items: data.items, total: data.total, items_count: data.items_count })
      toast.success('محصول به سبد خرید اضافه شد')
      return true
    } catch (error: any) {
      const message = error?.response?.data?.variant_id?.[0]
        || error?.response?.data?.quantity?.[0]
        || error?.response?.data?.detail
        || 'افزودن به سبد انجام نشد'
      toast.error(message)
      return false
    }
  },

  updateItem: async (item_id, quantity) => {
    try {
      const data = await updateCartItem(item_id, quantity)
      set({ items: data.items, total: data.total, items_count: data.items_count })
    } catch {
      toast.error('خطا در بروزرسانی')
    }
  },

  removeItem: async (item_id) => {
    try {
      const data = await removeCartItem(item_id)
      set({ items: data.items, total: data.total, items_count: data.items_count })
      toast.success('محصول از سبد حذف شد')
    } catch {
      toast.error('خطا در حذف')
    }
  },

  clearItems: async () => {
    try {
      await clearCart()
      set({ items: [], total: 0, items_count: 0 })
    } catch {}
  },
}))

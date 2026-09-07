import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getWishlist, addToWishlist, removeFromWishlist } from '@/api/products'

interface WishlistItem {
  id: number
  product: any
  added_at: string
}

interface WishlistState {
  items: WishlistItem[]
  loading: boolean
  // Sync from server
  fetchWishlist: () => Promise<void>
  // Toggle: if product in wishlist → remove, else → add
  toggle: (product: any) => Promise<void>
  // Check if product is in wishlist by product id
  isInWishlist: (productId: string) => boolean
  // Clear on logout
  clear: () => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      loading: false,

      fetchWishlist: async () => {
        set({ loading: true })
        try {
          const data = await getWishlist()
          set({ items: data.results ?? data })
        } catch {
          // Not authenticated — clear
          set({ items: [] })
        } finally {
          set({ loading: false })
        }
      },

      toggle: async (product: any) => {
        const existing = get().items.find(i => i.product.id === product.id)
        if (existing) {
          // Optimistic remove
          set(s => ({ items: s.items.filter(i => i.id !== existing.id) }))
          try {
            await removeFromWishlist(existing.id)
          } catch {
            // Revert
            set(s => ({ items: [...s.items, existing] }))
          }
        } else {
          // Optimistic add
          const temp: WishlistItem = { id: Date.now(), product, added_at: new Date().toISOString() }
          set(s => ({ items: [...s.items, temp] }))
          try {
            const created = await addToWishlist(product.id)
            // Replace temp with real item
            set(s => ({ items: s.items.map(i => i.id === temp.id ? created : i) }))
          } catch {
            // Revert
            set(s => ({ items: s.items.filter(i => i.id !== temp.id) }))
          }
        }
      },

      isInWishlist: (productId: string) => {
        return get().items.some(i => i.product.id === productId)
      },

      clear: () => set({ items: [] }),
    }),
    {
      name: 'wishlist-store',
      partialize: (state) => ({ items: state.items }),
    }
  )
)

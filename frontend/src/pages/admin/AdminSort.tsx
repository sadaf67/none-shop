import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragOverlay,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { getAdminProducts, getAdminCategories, reorderProducts, reorderCategories } from '@/api/admin'
import { GripVertical, Package, FolderOpen, Save, ImageOff, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

// ─── Sortable Item ───────────────────────────────────────────────────────────

function SortableItem({ id, children }: { id: string | number; children: (props: { isDragging: boolean }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${isDragging ? 'z-50 opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3 border border-white/6 hover:border-emerald-500/25 transition-all group">
        <button
          {...attributes}
          {...listeners}
          className="text-gray-700 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none p-1 -m-1 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        {children({ isDragging })}
      </div>
    </div>
  )
}

// ─── Ghost overlay while dragging ────────────────────────────────────────────
function DragGhost({ label, image }: { label: string; image?: string }) {
  return (
    <div className="flex items-center gap-3 glass rounded-2xl px-4 py-3 border border-emerald-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.6)] bg-[#0D1F17]">
      <GripVertical className="w-4 h-4 text-emerald-400" />
      {image ? (
        <img src={image} alt={label} className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <FolderOpen className="w-4 h-4 text-emerald-400" />
        </div>
      )}
      <span className="text-sm font-semibold text-emerald-300 truncate max-w-[200px]">{label}</span>
    </div>
  )
}

// ─── Categories Panel ─────────────────────────────────────────────────────────
function CategoriesPanel() {
  const qc = useQueryClient()
  const { data: raw = [], isLoading } = useQuery({ queryKey: ['admin-categories-sort'], queryFn: getAdminCategories })
  const [items, setItems] = useState<any[]>([])
  const [dirty, setDirty] = useState(false)
  const [activeId, setActiveId] = useState<number | null>(null)

  // sync when data arrives
  useState(() => { if (raw.length) setItems(raw) })
  if (!items.length && raw.length) setItems(raw)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const saveMutation = useMutation({
    mutationFn: () => reorderCategories(items.map(c => c.id)),
    onSuccess: () => {
      toast.success('ترتیب دسته‌بندی‌ها ذخیره شد')
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: () => toast.error('خطا در ذخیره'),
  })

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as number)

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.findIndex(i => i.id === active.id)
        const newIdx = prev.findIndex(i => i.id === over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
      setDirty(true)
    }
  }

  const activeItem = items.find(i => i.id === activeId)

  return (
    <div className="glass rounded-2xl border border-white/6 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/6">
        <div className="flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-emerald-400" />
          <h2 className="font-bold text-gray-200 text-sm">دسته‌بندی‌ها</h2>
          <span className="text-xs text-gray-600">({items.length})</span>
        </div>
        <AnimatePresence>
          {dirty && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60"
            >
              {saveMutation.isPending
                ? <><Loader2 className="w-3 h-3 animate-spin" /> ذخیره...</>
                : <><Save className="w-3 h-3" /> ذخیره ترتیب</>
              }
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">دسته‌بندی‌ای یافت نشد</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map((cat, idx) => (
                  <SortableItem key={cat.id} id={cat.id}>
                    {() => (
                      <>
                        <span className="w-6 h-6 rounded-lg bg-white/5 text-[11px] font-bold text-gray-600 flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center flex-shrink-0">
                          {cat.image
                            ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" />
                            : <FolderOpen className="w-4 h-4 text-gray-600" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-200 truncate">{cat.name}</div>
                          <div className="text-xs text-gray-600">{cat.products_count ?? 0} محصول</div>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cat.is_active ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-gray-500 bg-white/5 border-white/10'}`}>
                          {cat.is_active ? 'فعال' : 'غیرفعال'}
                        </span>
                      </>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeItem && <DragGhost label={activeItem.name} image={activeItem.image} />}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {dirty && (
        <div className="px-4 pb-4">
          <p className="text-xs text-amber-400/80 text-center">ترتیب تغییر کرده — برای اعمال، ذخیره کنید</p>
        </div>
      )}
    </div>
  )
}

// ─── Products Panel ────────────────────────────────────────────────────────────
function ProductsPanel() {
  const qc = useQueryClient()
  const { data: raw = [], isLoading } = useQuery({ queryKey: ['admin-products-sort'], queryFn: getAdminProducts })
  const [items, setItems] = useState<any[]>([])
  const [dirty, setDirty] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  if (!items.length && raw.length) setItems(raw)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const saveMutation = useMutation({
    mutationFn: () => reorderProducts(items.map(p => p.id)),
    onSuccess: () => {
      toast.success('ترتیب محصولات ذخیره شد')
      setDirty(false)
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: () => toast.error('خطا در ذخیره'),
  })

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string)

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (over && active.id !== over.id) {
      setItems(prev => {
        const oldIdx = prev.findIndex(i => i.id === active.id)
        const newIdx = prev.findIndex(i => i.id === over.id)
        return arrayMove(prev, oldIdx, newIdx)
      })
      setDirty(true)
    }
  }

  const activeItem = items.find(i => i.id === activeId)

  const filtered = search
    ? items.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.category_name?.toLowerCase().includes(search.toLowerCase()))
    : items

  return (
    <div className="glass rounded-2xl border border-white/6 overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/6 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-violet-400" />
          <h2 className="font-bold text-gray-200 text-sm">محصولات</h2>
          <span className="text-xs text-gray-600">({items.length})</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="جستجو..."
            className="input-field !py-1.5 !text-sm w-40"
          />
          <AnimatePresence>
            {dirty && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors disabled:opacity-60 whitespace-nowrap"
              >
                {saveMutation.isPending
                  ? <><Loader2 className="w-3 h-3 animate-spin" /> ذخیره...</>
                  : <><Save className="w-3 h-3" /> ذخیره ترتیب</>
                }
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {search && (
        <div className="px-5 py-2 border-b border-white/5 bg-amber-500/5">
          <p className="text-xs text-amber-400">
            جستجو فقط برای پیدا کردن است — برای drag باید جستجو را پاک کنید
          </p>
        </div>
      )}

      <div className="p-4 max-h-[70vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <p className="text-gray-600 text-sm text-center py-10">محصولی یافت نشد</p>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={search ? [] : items.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {(search ? filtered : items).map((product, idx) => (
                  <SortableItem key={product.id} id={product.id}>
                    {({ isDragging }) => (
                      <>
                        <span className="w-7 h-7 rounded-lg bg-white/5 text-[11px] font-bold text-gray-600 flex items-center justify-center flex-shrink-0 tabular-nums">
                          {search ? items.findIndex(i => i.id === product.id) + 1 : idx + 1}
                        </span>
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center flex-shrink-0">
                          {product.main_image?.image
                            ? <img src={product.main_image.image} alt={product.name} className="w-full h-full object-cover" />
                            : <ImageOff className="w-4 h-4 text-gray-700" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-gray-200 truncate">{product.name}</div>
                          <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5">
                            {product.category_name && <span>{product.category_name}</span>}
                            {product.brand_name && <><span>·</span><span>{product.brand_name}</span></>}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-bold text-emerald-400 whitespace-nowrap">
                            {Number(product.price).toLocaleString('fa-IR')} ت
                          </div>
                          <div className={`text-[10px] mt-0.5 ${product.is_in_stock ? 'text-emerald-500' : 'text-red-400'}`}>
                            {product.is_in_stock ? 'موجود' : 'ناموجود'}
                          </div>
                        </div>
                        {product.is_featured && (
                          <span className="text-[9px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-lg flex-shrink-0">ویژه</span>
                        )}
                      </>
                    )}
                  </SortableItem>
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeItem && (
                <DragGhost
                  label={activeItem.name}
                  image={activeItem.main_image?.image}
                />
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {dirty && !search && (
        <div className="px-4 pb-4">
          <p className="text-xs text-amber-400/80 text-center">ترتیب تغییر کرده — برای اعمال، ذخیره کنید</p>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminSort() {
  const [tab, setTab] = useState<'categories' | 'products'>('categories')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white mb-1">اولویت نمایش</h1>
        <p className="text-gray-600 text-sm">برای تغییر ترتیب، آیتم‌ها را بکشید و رها کنید</p>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 glass rounded-2xl px-5 py-4 border border-emerald-500/20 bg-emerald-500/5">
        <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-gray-400 space-y-1">
          <p>آیتم <span className="text-emerald-300 font-semibold">اول</span> در صفحه اول نمایش داده می‌شود.</p>
          <p>بعد از تغییر، حتماً دکمه <span className="text-emerald-300 font-semibold">ذخیره ترتیب</span> را بزنید تا تغییرات اعمال شود.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 glass rounded-2xl p-1 border border-white/6 w-fit">
        {([['categories', 'دسته‌بندی‌ها', FolderOpen], ['products', 'محصولات', Package]] as const).map(([key, label, Icon]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl transition-all ${
              tab === key
                ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                : 'text-gray-500 hover:text-gray-300'
            }`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {tab === 'categories' ? <CategoriesPanel /> : <ProductsPanel />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

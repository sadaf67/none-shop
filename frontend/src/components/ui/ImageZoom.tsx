import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ZoomIn, ZoomOut, ChevronRight, ChevronLeft } from 'lucide-react'

interface ImageZoomProps {
  images: { image: string; alt_text?: string }[]
  initial?: number
  onClose: () => void
}

export function ImageLightbox({ images, initial = 0, onClose }: ImageZoomProps) {
  const [idx, setIdx] = useState(initial)
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })

  const resetZoom = () => { setScale(1); setPos({ x: 0, y: 0 }) }

  const prev = () => { setIdx(i => (i - 1 + images.length) % images.length); resetZoom() }
  const next = () => { setIdx(i => (i + 1) % images.length); resetZoom() }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScale(s => Math.min(4, Math.max(1, s - e.deltaY * 0.003)))
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale === 1) return
    dragging.current = true
    dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y })
  }
  const handleMouseUp = () => { dragging.current = false }

  // keyboard
  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    if (e.key === 'ArrowRight') prev()
    if (e.key === 'ArrowLeft') next()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 backdrop-blur-md"
      onClick={onClose}
      onKeyDown={handleKey}
      tabIndex={0}
    >
      {/* Controls */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
        <div className="flex gap-2 pointer-events-auto">
          <button onClick={e => { e.stopPropagation(); setScale(s => Math.min(4, s + 0.5)) }}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button onClick={e => { e.stopPropagation(); scale > 1 ? setScale(s => Math.max(1, s - 0.5)) : null }}
            className="w-9 h-9 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-30"
            disabled={scale <= 1}>
            <ZoomOut className="w-4 h-4" />
          </button>
          {scale > 1 && (
            <button onClick={e => { e.stopPropagation(); resetZoom() }}
              className="h-9 px-3 glass rounded-xl text-xs text-gray-400 hover:text-white transition-colors pointer-events-auto">
              ریست
            </button>
          )}
        </div>
        <button onClick={onClose}
          className="pointer-events-auto w-9 h-9 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Image */}
      <motion.div
        key={idx}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.22 }}
        className="relative max-w-5xl max-h-[80vh] w-full flex items-center justify-center px-16"
        onClick={e => e.stopPropagation()}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: scale > 1 ? 'grab' : 'default' }}
      >
        <img
          src={images[idx].image}
          alt={images[idx].alt_text || ''}
          className="max-w-full max-h-[80vh] object-contain rounded-xl select-none"
          style={{
            transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`,
            transition: dragging.current ? 'none' : 'transform 0.2s',
          }}
          draggable={false}
        />
      </motion.div>

      {/* Navigation */}
      {images.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); prev() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors z-10">
            <ChevronRight className="w-5 h-5" />
          </button>
          <button onClick={e => { e.stopPropagation(); next() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-colors z-10">
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <button key={i} onClick={e => { e.stopPropagation(); setIdx(i); resetZoom() }}
                className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-emerald-400' : 'w-1.5 bg-white/30 hover:bg-white/50'}`} />
            ))}
          </div>
        </>
      )}

      {/* Counter */}
      <div className="absolute bottom-4 right-4 text-xs text-gray-500 glass px-3 py-1.5 rounded-lg">
        {idx + 1} / {images.length}
      </div>
    </motion.div>
  )
}

// ─── Zoomable Image Card ──────────────────────────────────────────────────────
interface ZoomableImageProps {
  images: { image: string; alt_text?: string }[]
  activeIdx: number
  onSelect: (i: number) => void
}

export function ZoomableImageGallery({ images, activeIdx, onSelect }: ZoomableImageProps) {
  const [lightbox, setLightbox] = useState(false)
  const [hoverPos, setHoverPos] = useState({ x: 50, y: 50 })
  const [hovering, setHovering] = useState(false)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setHoverPos({ x, y })
  }

  const main = images[activeIdx]

  return (
    <>
      <div>
        {/* Main Image */}
        <div
          className="relative glass rounded-2xl overflow-hidden aspect-square mb-4 border cursor-zoom-in"
          style={{ borderColor: 'var(--border)' }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={() => setHovering(false)}
          onClick={() => setLightbox(true)}
        >
          {main ? (
            <>
              <img
                src={main.image}
                alt={main.alt_text || ''}
                className="w-full h-full object-contain p-6 select-none"
                style={{
                  transformOrigin: `${hoverPos.x}% ${hoverPos.y}%`,
                  transform: hovering ? 'scale(1.4)' : 'scale(1)',
                  transition: 'transform 0.4s cubic-bezier(0.4,0,0.2,1)',
                }}
                draggable={false}
              />
              {/* Zoom hint */}
              <AnimatePresence>
                {!hovering && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute bottom-3 left-3 flex items-center gap-1.5 glass rounded-lg px-2.5 py-1.5 text-[10px] text-gray-500 pointer-events-none">
                    <ZoomIn className="w-3 h-3" />
                    برای زوم کلیک کنید
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text3)' }}>
              <ZoomIn className="w-16 h-16" />
            </div>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {images.map((img, i) => (
              <motion.button
                key={i}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelect(i)}
                className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
                style={{
                  borderColor: i === activeIdx ? 'var(--primary)' : 'var(--border)',
                  boxShadow: i === activeIdx ? '0 0 12px rgba(16,185,129,0.35)' : 'none',
                }}
              >
                <img src={img.image} alt="" className="w-full h-full object-cover" />
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <ImageLightbox
            images={images}
            initial={activeIdx}
            onClose={() => setLightbox(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

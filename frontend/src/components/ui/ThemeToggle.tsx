import { AnimatePresence, motion } from 'framer-motion'
import { Moon, Sun } from 'lucide-react'
import { useThemeStore } from '@/store/themeStore'

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useThemeStore()
  const isLight = theme === 'light'

  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: .9 }}
      aria-label={isLight ? 'فعال کردن حالت تاریک' : 'فعال کردن حالت روشن'}
      title={isLight ? 'حالت تاریک' : 'حالت روشن'}
      className={`flex items-center justify-center gap-2 rounded-full border transition-colors hover:bg-[var(--glass-bg2)] ${compact ? 'w-10 h-10' : 'h-10 px-3'}`}
      style={{ borderColor: 'var(--border)' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isLight ? (
          <motion.span key="sun" initial={{ rotate: -60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 60, opacity: 0 }}>
            <Sun className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          </motion.span>
        ) : (
          <motion.span key="moon" initial={{ rotate: 60, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -60, opacity: 0 }}>
            <Moon className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          </motion.span>
        )}
      </AnimatePresence>
      {!compact && <span className="text-xs font-bold">{isLight ? 'روشن' : 'تاریک'}</span>}
    </motion.button>
  )
}

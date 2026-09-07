import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAdminUsers, createAdminUser, deleteAdminUser } from '@/api/admin'
import { useAuthStore } from '@/store/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, Trash2, Shield, ShieldCheck, Eye, EyeOff, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const schema = z.object({
  username:    z.string().min(3, 'حداقل ۳ کاراکتر'),
  password:    z.string().min(10, 'حداقل ۱۰ کاراکتر'),
  email:       z.string().email('ایمیل نامعتبر').optional().or(z.literal('')),
  first_name:  z.string().optional(),
  last_name:   z.string().optional(),
  is_superuser: z.boolean().optional(),
})

export default function AdminUsers() {
  const { user: me } = useAuthStore()
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)

  const { data: admins = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getAdminUsers,
  })

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { is_superuser: false },
  })

  const createMutation = useMutation({
    mutationFn: createAdminUser,
    onSuccess: () => {
      toast.success('ادمین جدید ساخته شد')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      reset()
      setShowForm(false)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || err.response?.data?.password?.[0] || 'خطا در ساخت ادمین')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      toast.success('ادمین حذف شد')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setConfirmDelete(null)
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'خطا در حذف')
    },
  })

  const onSubmit = (data: any) => createMutation.mutate(data)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white mb-1">مدیریت ادمین‌ها</h1>
          <p className="text-gray-600 text-sm">افزودن و حذف کاربران مدیریتی</p>
        </div>
        {me?.is_superuser && (
          <button onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2 !py-2.5 !px-5">
            <UserPlus className="w-4 h-4" />
            ادمین جدید
          </button>
        )}
      </div>

      {/* ─── فرم افزودن ادمین ─── */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="glass rounded-2xl p-6 border border-emerald-500/30"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-200 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                افزودن ادمین جدید
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">نام کاربری *</label>
                  <input {...register('username')} className="input-field" placeholder="username" />
                  {errors.username && <p className="text-red-400 text-xs">{String(errors.username.message)}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">رمز عبور *</label>
                  <div className="relative">
                    <input {...register('password')} type={showPass ? 'text' : 'password'}
                      className="input-field pl-10" placeholder="حداقل ۱۰ کاراکتر" />
                    <button type="button" onClick={() => setShowPass(!showPass)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 hover:text-gray-400">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-400 text-xs">{String(errors.password.message)}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">نام</label>
                  <input {...register('first_name')} className="input-field" placeholder="نام" />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">نام خانوادگی</label>
                  <input {...register('last_name')} className="input-field" placeholder="نام خانوادگی" />
                </div>

                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ایمیل</label>
                  <input {...register('email')} type="email" className="input-field" placeholder="example@mail.com" />
                  {errors.email && <p className="text-red-400 text-xs">{String(errors.email.message)}</p>}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group py-2">
                <input {...register('is_superuser')} type="checkbox"
                  className="w-4 h-4 rounded accent-emerald-500" />
                <div>
                  <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-semibold">سوپر ادمین</span>
                  <p className="text-xs text-gray-600 mt-0.5">دسترسی کامل به همه بخش‌ها شامل ساخت ادمین جدید</p>
                </div>
              </label>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={createMutation.isPending}
                  className="btn-primary !py-2.5 !px-6 disabled:opacity-50">
                  {createMutation.isPending ? 'در حال ساخت...' : 'ساخت ادمین'}
                </button>
                <button type="button" onClick={() => { setShowForm(false); reset() }}
                  className="btn-ghost !py-2.5 !px-6">
                  انصراف
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── لیست ادمین‌ها ─── */}
      <div className="glass rounded-2xl border border-white/6 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/6">
          <h2 className="font-bold text-gray-200 text-sm">لیست مدیران ({admins.length})</h2>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : admins.length === 0 ? (
          <div className="py-16 text-center text-gray-600">
            <Shield className="w-10 h-10 mx-auto mb-3 text-gray-700" />
            <p>ادمینی یافت نشد</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {admins.map((admin: any) => (
              <div key={admin.id} className="flex items-center gap-4 px-6 py-4 hover:bg-white/3 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-black text-white flex-shrink-0">
                  {admin.username?.[0]?.toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-200 text-sm">{admin.username}</span>
                    {admin.is_superuser ? (
                      <span className="flex items-center gap-1 text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3" /> سوپر ادمین
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <Shield className="w-3 h-3" /> ادمین
                      </span>
                    )}
                    {admin.id === me?.id && (
                      <span className="text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">شما</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">
                    {[admin.first_name, admin.last_name].filter(Boolean).join(' ') || '—'}
                    {admin.email && <> · {admin.email}</>}
                  </div>
                </div>

                <div className="text-xs text-gray-700 whitespace-nowrap hidden md:block">
                  {new Date(admin.date_joined).toLocaleDateString('fa-IR')}
                </div>

                {me?.is_superuser && admin.id !== me?.id && (
                  <button
                    onClick={() => setConfirmDelete(admin.id)}
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Confirm Delete Modal ─── */}
      <AnimatePresence>
        {confirmDelete !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className="glass rounded-2xl p-6 border border-red-500/30 max-w-sm w-full"
            >
              <div className="w-12 h-12 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-black text-white text-center mb-2">حذف ادمین</h3>
              <p className="text-gray-500 text-sm text-center mb-6">آیا مطمئن هستید؟ این عملیات قابل بازگشت نیست.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteMutation.mutate(confirmDelete!)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50">
                  {deleteMutation.isPending ? 'در حال حذف...' : 'حذف'}
                </button>
                <button onClick={() => setConfirmDelete(null)}
                  className="flex-1 btn-ghost !py-2.5">
                  انصراف
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const formatPrice = (price: number | string): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price
  return new Intl.NumberFormat('fa-IR').format(num) + ' تومان'
}

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('fa-IR', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

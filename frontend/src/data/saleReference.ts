import type { CompletedSale } from './paymentHistory'

// This display reference does not replace the sale's database identifier.
export function saleReference(sale: Pick<CompletedSale, 'id' | 'customerName' | 'completedAt' | 'lines'>): string {
  const part = (value: string, fallback: string) => value.normalize('NFKD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || fallback
  const customer = part(sale.customerName, 'CUS')
  const item = part(sale.lines[0]?.name || '', 'ITM')
  const date = new Date(sale.completedAt)
  const parts = Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Colombo', year: '2-digit', month: '2-digit', day: '2-digit' }).formatToParts(date) : []
  const field = (type: string) => parts.find(value => value.type === type)?.value || '00'
  const suffix = sale.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase() || 'UNKNOWN'
  return `${customer}-${item}-${field('year')}${field('month')}${field('day')}-${suffix}`
}

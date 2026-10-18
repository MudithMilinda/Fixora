import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../Components/Sidebar'
import Pagination from '../Components/Pagination'
import AppSelect from '../Components/AppSelect'
import api, { getApiError } from '../api/axios'
import type { AuthUser } from '../types/auth'

type Props = { user: AuthUser; onGoDashboard: () => void; onOpenRepairs: () => void; onOpenHistory: () => void; onOpenProfile: () => void; onSignOut: () => void }
type Order = { id: string; orderNumber: string; supplierName: string; currency: string; receivedAt: string | null; items: { itemName: string; sku: string | null; quantity: number; unitPriceCents: number }[] }
const money = (cents: number) => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const input = 'h-11 w-full rounded-xl border border-[#e2e3e8] bg-white px-3 text-sm font-normal outline-none focus:border-[#171719]'

export default function SupplierPurchasesPage(props: Props) {
  const [orders, setOrders] = useState<Order[]>([]), [total, setTotal] = useState(0), [page, setPage] = useState(1)
  const [item, setItem] = useState(''), [supplier, setSupplier] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState('')
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [suppliers, setSuppliers] = useState<{id:string; name:string}[]>([]), [supplierError, setSupplierError] = useState(''), [suppliersLoading, setSuppliersLoading] = useState(true)
  useEffect(() => { let cancelled = false; api.get('/reports/supplier-purchase-suppliers').then(({data}) => { if (!cancelled) setSuppliers(data.suppliers) }).catch(err => { if (!cancelled) setSupplierError(getApiError(err, 'Unable to load suppliers.')) }).finally(() => { if (!cancelled) setSuppliersLoading(false) }); return () => { cancelled = true } }, [])
  const dates = useMemo(() => {
    if (from && to && from > to) return null
    const start = from ? new Date(`${from}T00:00:00`) : null, end = to ? new Date(`${to}T00:00:00`) : null
    if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime()))) return null
    if (end) end.setDate(end.getDate() + 1)
    return { ...(start ? { start: start.toISOString() } : {}), ...(end ? { end: end.toISOString() } : {}) }
  }, [from, to])
  useEffect(() => {
    if (!dates) { setError('Select a valid date range.'); setOrders([]); setLoading(false); return }
    let cancelled = false; setLoading(true); setError('')
    const timer = window.setTimeout(() => {
      api.get('/reports/supplier-purchases', { params: { ...dates, page, item: item.trim(), supplierId: supplier } }).then(({ data }) => {
        if (cancelled) return
        const last = Math.max(1, Math.ceil(data.total / data.pageSize))
        if (page > last) { setPage(last); return }
        setOrders(data.orders); setTotal(data.total)
      }).catch(err => { if (!cancelled) { setOrders([]); setTotal(0); setError(getApiError(err, 'Unable to load purchase history.')) } }).finally(() => { if (!cancelled) setLoading(false) })
    }, item ? 250 : 0)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [page, item, supplier, dates])
  return <div className="flex h-dvh overflow-hidden bg-[#f5f5f7] font-sans text-[#262b3a] max-[1100px]:h-auto max-[1100px]:flex-col"><Sidebar {...props} activePage="supplierPurchases" /><main className="min-w-0 flex-1 overflow-y-auto p-7 max-sm:p-[18px]">
    <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Reports</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Supplier purchase history</h1><p className="mt-1.5 text-sm text-[#747a89]">Compare the purchase prices recorded for received orders in this branch.</p>
    <section aria-label="Filter purchase history" className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><label className="min-w-[180px] flex-1 text-xs font-semibold text-[#596170]">Item or SKU<input className={`${input} mt-2`} value={item} onChange={e => { setPage(1); setItem(e.target.value) }} placeholder="Search item or SKU…" /></label><div className="min-w-[180px] flex-1 text-xs font-semibold text-[#596170]"><span id="supplier-filter-label">Supplier</span><AppSelect className="mt-2" aria-label="Filter by supplier" searchable searchPlaceholder="Search suppliers…" value={supplier} disabled={suppliersLoading || !!supplierError} onChange={e => { setPage(1); setSupplier(e.target.value) }}><option value="">All suppliers</option>{suppliers.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</AppSelect>{supplierError && <p role="alert" className="mt-1 font-normal text-red-700">{supplierError}</p>}</div><label className="text-xs font-semibold text-[#596170]">From<input type="date" className={`${input} mt-2`} value={from} max={to || undefined} onChange={e => { setPage(1); setFrom(e.target.value) }} /></label><label className="text-xs font-semibold text-[#596170]">To<input type="date" className={`${input} mt-2`} value={to} min={from || undefined} onChange={e => { setPage(1); setTo(e.target.value) }} /></label><button type="button" className="h-11 rounded-xl border border-[#e2e3e8] px-4 text-xs font-semibold text-[#596170] hover:bg-[#f7f7f9]" onClick={() => { setPage(1); setItem(''); setSupplier(''); setFrom(''); setTo('') }}>Clear filters</button><p className="w-full text-xs text-[#747a89]">Dates use your device’s local time and include both selected days. Orders without a receipt date are excluded when filtering by date.</p></section>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    <section className="mt-5 rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><h2 className="text-base font-semibold">Received orders</h2><p className="mt-1 text-xs text-[#747a89]">{total} matching orders · up to 10 orders per page</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm"><thead className="text-xs uppercase text-[#777e8e]"><tr><th className="pb-3">Received date</th><th className="pb-3">Supplier / order</th><th className="pb-3">Item / SKU</th><th className="pb-3 text-right">Quantity</th><th className="pb-3 text-right">Purchase price / unit</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="py-12 text-center text-[#747a89]">Loading purchase history…</td></tr> : orders.length ? orders.flatMap(order => order.items.map((line, index) => <tr key={`${order.id}-${index}`} className="border-t border-[#eef0f3]"><td className="py-4 text-[#596170]">{order.receivedAt ? new Date(order.receivedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'Date not recorded'}</td><td className="py-4"><span className="font-semibold">{order.supplierName}</span><span className="block text-xs text-[#747a89]">{order.orderNumber}</span></td><td className="py-4"><span className="font-semibold">{line.itemName}</span><span className="block text-xs text-[#747a89]">{line.sku || 'No SKU'}</span></td><td className="py-4 text-right tabular-nums">{line.quantity}</td><td className="py-4 text-right font-semibold tabular-nums">{order.currency} {money(line.unitPriceCents)}</td></tr>)) : <tr><td colSpan={5} className="py-12 text-center text-[#747a89]">No matching received orders found.</td></tr>}</tbody></table></div><Pagination page={page} total={total} disabled={loading} onPageChange={setPage} /></section>
  </main></div>
}

import AppDatePicker from '../Components/AppDatePicker'
import { useEffect, useMemo, useRef, useState } from 'react'
import Sidebar from '../Components/Sidebar'
import Pagination from '../Components/Pagination'
import AppSelect from '../Components/AppSelect'
import api, { getApiError } from '../api/axios'
import type { AuthUser } from '../types/auth'

type Props = { user: AuthUser; onGoDashboard: () => void; onOpenRepairs: () => void; onOpenHistory: () => void; onOpenProfile: () => void; onSignOut: () => void }
type Movement = { id: string; stockId: string; itemName: string; sku: string | null; kind: 'manual_add' | 'purchase' | 'sale' | 'repair' | 'delete' | 'adjustment' | 'sale_return'; adjustmentReason: string | null; adjustmentNote: string | null; createdByName: string | null; quantityChange: number; balanceAfter: number; unitCost: string; costCurrency: string | null; unitSellingPrice: string; referenceId: string | null; referenceLabel: string | null; createdAt: string }
const labels: Record<Movement['kind'], string> = { manual_add: 'Manual stock added', purchase: 'Purchase received', sale: 'Sale', repair: 'Repair part', delete: 'Stock removed', adjustment: 'Stock adjustment', sale_return: 'Sales return' }
const adjustmentReasons: Record<string, string> = { damaged: 'Damaged', lost: 'Lost', count_correction: 'Stock count correction', other: 'Other' }
const amount = (value: string) => Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const historyDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
export default function StockMovementPage(props: Props) {
  const [visible, setVisible] = useState<{latest: Movement; count: number}[]>([])
  const [page, setPage] = useState(1), [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [kind, setKind] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Movement | null>(null)
  const [priceHistory, setPriceHistory] = useState<Movement[]>([])
  const [historyMatch, setHistoryMatch] = useState<'sku' | 'batch'>('batch')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const dateParams = useMemo(() => {
    if (from && to && from > to) return null
    const start = from ? new Date(`${from}T00:00:00`) : null
    const end = to ? new Date(`${to}T00:00:00`) : null
    if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime()))) return null
    if (end) end.setDate(end.getDate() + 1)
    return { ...(start ? { start: start.toISOString() } : {}), ...(end ? { end: end.toISOString() } : {}) }
  }, [from, to])
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const closeRef = useRef<HTMLButtonElement | null>(null)
  useEffect(() => {
    if (!selected) return
    closeRef.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelected(null); triggerRef.current?.focus() }
      if (event.key === 'Tab') {
        const dialog = closeRef.current?.closest('[role=dialog]')
        const buttons = dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]')
        if (!buttons?.length) return
        const first = buttons[0], last = buttons[buttons.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [selected])
  useEffect(() => {
    if (!selected || !dateParams) return
    let cancelled = false
    setPriceHistory([]); setHistoryError(''); setHistoryLoading(true)
    api.get(`/stock-movements/${selected.id}/history`, { params: dateParams }).then(({ data }) => { if (!cancelled) { setPriceHistory(data.movements); setHistoryMatch(data.match) } }).catch(error => { if (!cancelled) setHistoryError(getApiError(error, 'Unable to load price history.')) }).finally(() => { if (!cancelled) setHistoryLoading(false) })
    return () => { cancelled = true }
  }, [selected, dateParams])
  const distinctPrices = useMemo(() => {
    const seen = new Set<string>()
    return priceHistory.filter(row => {
      const key = `${row.costCurrency || 'unknown'}:${Number(row.unitCost).toFixed(2)}:${Number(row.unitSellingPrice).toFixed(2)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [priceHistory])
  function closeDetails() { setSelected(null); triggerRef.current?.focus() }
  useEffect(() => {
    if (!dateParams) { setVisible([]); setLoading(false); setError('Select a valid date range.'); return }
    let cancelled = false
    setLoading(true); setError('')
    const timer = window.setTimeout(() => {
      api.get('/stock-movements', { params: { ...dateParams, page, search: search.trim(), kind } }).then(({ data }) => { if (cancelled) return; const last = Math.max(1, Math.ceil(data.total / data.pageSize)); if (page > last) { setPage(last); return } setVisible(data.groups); setTotal(data.total) }).catch(e => { if (!cancelled) setError(getApiError(e, 'Unable to load stock movements.')) }).finally(() => { if (!cancelled) setLoading(false) })
    }, search ? 250 : 0)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [dateParams, page, search, kind])
  return <div className="flex h-dvh overflow-hidden bg-[#f5f5f7] font-sans text-[#262b3a] max-[1100px]:h-auto max-[1100px]:flex-col"><Sidebar {...props} activePage="stockMovements" /><main className="min-w-0 flex-1 overflow-y-auto p-7 max-sm:p-[18px]">
    <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Inventory</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Stock movements</h1><p className="mt-1.5 text-sm text-[#747a89]">Track quantity and price snapshots for this branch.</p>
    <p className="mt-5 rounded-xl bg-[#fff7e8] p-4 text-sm leading-6 text-[#795b21]">Movements are recorded from this feature onward. Earlier stock changes are not reconstructed. Selling prices are per-unit prices before any sale-level discount.</p>
    <section className="mt-5 flex flex-wrap items-end gap-4 rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm" aria-label="Filter stock movements"><AppDatePicker label="From" value={from} max={to || undefined} onChange={value => { setPage(1); setFrom(value) }} /><AppDatePicker label="To" value={to} min={from || undefined} onChange={value => { setPage(1); setTo(value) }} /><button type="button" className="h-10 rounded-xl border border-[#e2e3e8] px-4 text-xs font-semibold text-[#596170] hover:bg-[#f7f7f9]" onClick={() => { setPage(1); setFrom(''); setTo('') }}>Clear dates</button><div className="flex flex-wrap gap-2"><input className="h-11 w-64 rounded-xl border border-[#e2e3e8] px-3 text-sm outline-none focus:border-[#171719]" value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} placeholder="Search item, SKU or reference…" aria-label="Search stock movements" /><div className="w-48"><AppSelect aria-label="Filter movement type" value={kind} onChange={e => { setPage(1); setKind(e.target.value) }}><option value="all">All movements</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</AppSelect></div></div><p className="w-full text-xs text-[#747a89]">Dates use your device’s local time; both dates are included.</p></section>
    <section className="mt-5 rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-base font-semibold">Movement history</h2><p className="mt-1 text-xs text-[#747a89]">{total} matching items · grouped by SKU or batch in the selected dates</p></div></div>
    {error ? <p role="alert" className="py-10 text-sm text-red-700">{error}</p> : loading ? <p className="py-10 text-sm text-[#747a89]">Loading movements…</p> : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead className="text-xs uppercase text-[#777e8e]"><tr><th className="pb-3">Item</th><th className="pb-3">Latest movement</th><th className="pb-3">Latest date</th><th className="pb-3 text-right">Movements</th><th className="pb-3 text-right">Details</th></tr></thead><tbody>{visible.length ? visible.map(({ latest: m, count }) => <tr key={m.sku ? `sku:${m.sku.toLowerCase()}` : `batch:${m.stockId}`} className="border-t border-[#eef0f3]"><td className="py-4"><span className="font-semibold">{m.itemName}</span><span className="block text-xs text-[#747a89]">{m.sku || `Batch ${m.stockId.slice(0, 8)}`}</span></td><td>{labels[m.kind]}</td><td className="text-xs text-[#747a89]">{historyDate(m.createdAt)}</td><td className="text-right">{count}</td><td className="text-right"><button type="button" aria-label={`View ${m.itemName} history`} title="View history" className="inline-grid h-8 w-8 place-items-center rounded-[9px] border border-[#dfe2e7] bg-white text-[#667080] shadow-[0_1px_1px_#10101206] transition hover:border-[#cbd0d8] hover:bg-[#f6f7f8] hover:text-[#262b3a]" onClick={event => { triggerRef.current = event.currentTarget; setSelected(m) }}><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M2.8 12s3.3-5.7 9.2-5.7 9.2 5.7 9.2 5.7-3.3 5.7-9.2 5.7S2.8 12 2.8 12Z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.6" /></svg></button></td></tr>) : <tr><td colSpan={5} className="py-12 text-center text-[#747a89]">No matching items found.</td></tr>}</tbody></table></div>}<Pagination page={page} total={total} disabled={loading} onPageChange={setPage} /></section>
  </main>{selected && <div className="fixed inset-0 z-50 grid place-items-center bg-[#101012]/45 p-4" onMouseDown={event => { if (event.target === event.currentTarget) closeDetails() }}><section role="dialog" aria-modal="true" aria-labelledby="movement-details-title" className="max-h-[calc(100dvh-2rem)] w-full max-w-xl overflow-y-auto rounded-[20px] border border-[#e7e7e9] bg-white p-6 shadow-[0_28px_80px_#0003]"><header className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7a8090]">Stock movement</p><h2 id="movement-details-title" className="mt-2 text-xl font-bold">{selected.itemName}</h2><p className="mt-1 text-sm text-[#747a89]">{labels[selected.kind]} · {new Date(selected.createdAt).toLocaleString()}</p></div><button ref={closeRef} type="button" aria-label="Close movement details" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xl text-[#747a89] hover:bg-[#f2f3f5]" onClick={closeDetails}>×</button></header>
    <div className="mt-5 grid gap-3 sm:grid-cols-2"><Detail label="SKU" value={selected.sku || 'Not provided'} /><Detail label="Batch ID" value={selected.stockId} /><Detail label="Quantity change" value={`${selected.quantityChange > 0 ? '+' : ''}${selected.quantityChange}`} /><Detail label="Balance after movement" value={String(selected.balanceAfter)} /></div>
    <section className="mt-5"><h3 className="text-sm font-semibold">Price history</h3><p className="mt-1 text-xs leading-5 text-[#747a89]">{historyMatch === 'sku' ? 'Movements with the same SKU in this branch; check batch IDs because SKUs can be shared.' : 'Movements for this batch; no SKU was recorded.'} Latest date shown for each distinct cost and selling price combination in the selected dates, up to 500 movements. Selling prices are before sale-level discounts. Older movements may not have been recorded.</p>
    {historyLoading ? <p className="py-5 text-sm text-[#747a89]">Loading price history…</p> : historyError ? <p role="alert" className="py-5 text-sm text-red-700">{historyError}</p> : priceHistory.length ? <div className="mt-3 overflow-x-auto rounded-xl border border-[#eceef2]"><table className="w-full min-w-[490px] text-left text-xs"><thead className="bg-[#fafafb] text-[#747a89]"><tr><th className="px-3 py-3">Latest date</th><th className="px-3 py-3">Batch</th><th className="px-3 py-3 text-right">Cost / unit</th><th className="px-3 py-3 text-right">Sell / unit</th></tr></thead><tbody>{distinctPrices.map(row => <tr key={row.id} className="border-t border-[#eceef2]"><td className="px-3 py-3">{historyDate(row.createdAt)}</td><td className="px-3 py-3">{row.stockId.slice(0, 8)}</td><td className="px-3 py-3 text-right tabular-nums">{row.costCurrency || 'Unknown'} {amount(row.unitCost)}</td><td className="px-3 py-3 text-right tabular-nums">LKR {amount(row.unitSellingPrice)}</td></tr>)}</tbody></table></div> : <p className="py-5 text-sm text-[#747a89]">No price history found.</p>}</section>
    <section className="mt-5"><h3 className="text-sm font-semibold">Movement history</h3><p className="mt-1 text-xs text-[#747a89]">{historyMatch === 'sku' ? 'Movements with the same SKU in this branch.' : 'Movements for this batch.'} Up to 500 records in the selected dates.</p>{historyLoading ? <p className="py-4 text-sm text-[#747a89]">Loading movements…</p> : historyError ? <p className="py-4 text-sm text-red-700">{historyError}</p> : <div className="mt-3 max-h-56 overflow-auto rounded-xl border border-[#eceef2]"><table className="w-full min-w-[400px] text-left text-xs"><thead className="bg-[#fafafb] text-[#747a89]"><tr><th className="px-3 py-3">Date</th><th className="px-3 py-3">Movement</th><th className="px-3 py-3 text-right">Change</th><th className="px-3 py-3 text-right">Batch balance</th></tr></thead><tbody>{priceHistory.map(row => <tr key={row.id} className="border-t border-[#eceef2]"><td className="px-3 py-3">{historyDate(row.createdAt)}</td><td className="px-3 py-3">{labels[row.kind]}<span className="block text-[#747a89]">Batch {row.stockId.slice(0, 8)}</span>{row.kind === 'adjustment' && <span className="block text-[#747a89]">{adjustmentReasons[row.adjustmentReason || ''] || 'Adjustment'}{row.createdByName ? ` · ${row.createdByName}` : ''}{row.adjustmentNote && <span className="block whitespace-pre-wrap break-words">{row.adjustmentNote}</span>}</span>}</td><td className="px-3 py-3 text-right">{row.quantityChange > 0 ? '+' : ''}{row.quantityChange}</td><td className="px-3 py-3 text-right">{row.balanceAfter}</td></tr>)}</tbody></table></div>}<Pagination page={page} total={total} disabled={loading} onPageChange={setPage} /></section>
    <div className="mt-5 rounded-xl border border-[#eceef2] bg-[#fafafb] p-4"><p className="text-xs font-semibold text-[#747a89]">Latest movement reference</p>{selected.referenceId && selected.kind === 'repair' ? <a className="mt-2 inline-block text-sm font-semibold text-[#8b5d40] underline" href={`/repair-jobs/${selected.referenceId}`}>{selected.referenceLabel || 'View repair job'}</a> : selected.referenceId && selected.kind === 'purchase' ? <a className="mt-2 inline-block text-sm font-semibold text-[#8b5d40] underline" href="/purchase-orders">{selected.referenceLabel || 'View purchase orders'}</a> : selected.referenceId && selected.kind === 'sale_return' ? <a className="mt-2 inline-block text-sm font-semibold text-[#8b5d40] underline" href="/sales-returns">View sales returns</a> : selected.referenceId && selected.kind === 'sale' ? <a className="mt-2 inline-block text-sm font-semibold text-[#8b5d40] underline" href="/payment-history">Sale {selected.referenceId.slice(0, 8)} · Payment history</a> : <p className="mt-2 text-sm text-[#596170]">No linked document</p>}</div>
    <div className="mt-5 flex justify-end"><button className="rounded-xl bg-[#171719] px-4 py-2.5 text-sm font-semibold text-white" type="button" onClick={closeDetails}>Done</button></div></section></div>}</div>
}
function Detail({ label, value }: { label: string; value: string }) { return <div className="min-w-0 rounded-xl border border-[#eceef2] p-3"><p className="text-xs text-[#747a89]">{label}</p><p className="mt-1 break-all text-sm font-semibold text-[#303540]">{value}</p></div> }

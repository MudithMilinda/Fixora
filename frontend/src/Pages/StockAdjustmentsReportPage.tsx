import AppDatePicker from '../Components/AppDatePicker'
import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../Components/Sidebar'
import Pagination from '../Components/Pagination'
import AppSelect from '../Components/AppSelect'
import api, { getApiError } from '../api/axios'
import type { AuthUser } from '../types/auth'

type Props = { user: AuthUser; onGoDashboard: () => void; onOpenRepairs: () => void; onOpenHistory: () => void; onOpenProfile: () => void; onSignOut: () => void }
type Row = { id: string; createdAt: string; itemName: string; sku: string | null; quantityChange: number; balanceAfter: number; adjustmentReason: string | null; adjustmentNote: string | null; createdByName: string | null; unitCost: string; costCurrency: string | null }
type Summary = { damagedUnits: number; lostUnits: number; lossCostCents: number; excludedLosses: number }
const reasons: Record<string, string> = { damaged:'Damaged', lost:'Lost', count_correction:'Stock count correction', other:'Other' }
const money = (cents: number) => (cents / 100).toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })

export default function StockAdjustmentsReportPage(props: Props) {
  const [rows, setRows] = useState<Row[]>([]), [summary, setSummary] = useState<Summary | null>(null), [total, setTotal] = useState(0), [page, setPage] = useState(1)
  const [item, setItem] = useState(''), [items, setItems] = useState<{ itemName: string; sku: string | null }[]>([]), [itemsLoading, setItemsLoading] = useState(true), [itemsError, setItemsError] = useState('')
  useEffect(() => { let cancelled = false; api.get('/reports/stock-adjustment-items').then(({ data }) => { if (!cancelled) setItems(data.items) }).catch(err => { if (!cancelled) setItemsError(getApiError(err, 'Unable to load adjusted items.')) }).finally(() => { if (!cancelled) setItemsLoading(false) }); return () => { cancelled = true } }, [])
  const  [reason, setReason] = useState('all'), [from, setFrom] = useState(''), [to, setTo] = useState('')
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const dates = useMemo(() => {
    if (from && to && from > to) return null
    const start = from ? new Date(`${from}T00:00:00`) : null, end = to ? new Date(`${to}T00:00:00`) : null
    if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime()))) return null
    if (end) end.setDate(end.getDate() + 1)
    return { ...(start ? { start:start.toISOString() } : {}), ...(end ? { end:end.toISOString() } : {}) }
  }, [from,to])
  useEffect(() => {
    if (!dates) { setError('Select a valid date range.'); setRows([]); setSummary(null); setTotal(0); setLoading(false); return }
    let cancelled = false; setLoading(true); setError('')
    const timer = window.setTimeout(() => {
      const selectedItem = item ? JSON.parse(item) as [string, string | null] : null
      api.get('/reports/stock-adjustments', { params: { ...dates, page, ...(selectedItem ? { itemName: selectedItem[0], ...(selectedItem[1] ? { itemSku: selectedItem[1] } : {}) } : {}), reason } }).then(({data}) => {
        if (cancelled) return
        const last = Math.max(1, Math.ceil(data.total / data.pageSize)); if (page > last) { setPage(last); return }
        setRows(data.rows); setTotal(data.total); setSummary(data.summary)
      }).catch(err => { if (!cancelled) { setRows([]); setTotal(0); setSummary(null); setError(getApiError(err, 'Unable to load adjustments.')) } }).finally(() => { if (!cancelled) setLoading(false) })
    }, 0)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [dates,page,item,reason])
  return <div className="flex h-dvh overflow-hidden bg-[#f5f5f7] font-sans text-[#262b3a] max-[1100px]:h-auto max-[1100px]:flex-col"><Sidebar {...props} activePage="stockAdjustmentsReport" /><main className="min-w-0 flex-1 overflow-y-auto p-7 max-sm:p-[18px]">
    <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Reports</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Stock adjustments</h1><p className="mt-1.5 text-sm text-[#747a89]">Review stock adjustments and recorded losses for this branch.</p>
    <section aria-label="Filter stock adjustments" className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><div className="w-full max-w-[320px] min-w-[180px] text-xs font-semibold text-[#596170]"><span>Item or SKU</span><AppSelect className="mt-2" aria-label="Filter adjusted item" searchable searchPlaceholder="Search item or SKU…" value={item} disabled={itemsLoading || !!itemsError} onChange={e => { setPage(1); setItem(e.target.value) }}><option value="">All items</option>{items.map(option => <option key={JSON.stringify([option.itemName, option.sku || null])} value={JSON.stringify([option.itemName, option.sku || null])}>{option.itemName}{option.sku ? ` · ${option.sku}` : ''}</option>)}</AppSelect>{itemsError && <p role="alert" className="mt-1 font-normal text-red-700">{itemsError}</p>}</div><div className="min-w-[190px] text-xs font-semibold text-[#596170]">Reason<AppSelect className="mt-2" aria-label="Filter adjustment reason" value={reason} onChange={e => { setPage(1); setReason(e.target.value) }}><option value="all">All reasons</option>{Object.entries(reasons).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</AppSelect></div><AppDatePicker label="From" value={from} max={to || undefined} onChange={value => { setPage(1); setFrom(value) }} /><AppDatePicker label="To" value={to} min={from || undefined} onChange={value => { setPage(1); setTo(value) }} /><button type="button" className="h-11 rounded-xl border border-[#e2e3e8] px-4 text-xs font-semibold text-[#596170] hover:bg-[#f7f7f9]" onClick={() => { setPage(1); setItem(''); setReason('all'); setFrom(''); setTo('') }}>Clear filters</button><p className="w-full text-xs text-[#747a89]">Dates use your device’s local time and include both selected days.</p></section>
    {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {summary && <><div className="mt-5 grid grid-cols-3 gap-4 max-sm:grid-cols-1"><Card label="Damaged units" value={summary.damagedUnits.toLocaleString()} detail="Stock reductions" /><Card label="Lost units" value={summary.lostUnits.toLocaleString()} detail="Stock reductions" /><Card label="Recorded loss cost" value={`LKR ${money(summary.lossCostCents)}`} detail={summary.excludedLosses ? 'Known LKR costs only' : 'Damaged and lost stock at recorded cost'} /></div>{summary.excludedLosses > 0 && <p className="mt-4 rounded-xl bg-[#fff7e8] p-4 text-sm leading-6 text-[#795b21]">{summary.excludedLosses} damaged or lost adjustments have an unknown or non-LKR cost currency and are excluded from the LKR loss cost.</p>}</>}
    <section className="mt-5 rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><h2 className="text-base font-semibold">Adjustment history</h2><p className="mt-1 text-xs text-[#747a89]">{total} matching adjustments · totals include all matching records</p><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="text-xs uppercase text-[#777e8e]"><tr><th className="pb-3">Date</th><th className="pb-3">Item / SKU</th><th className="pb-3">Reason / note</th><th className="pb-3">User</th><th className="pb-3 text-right">Change</th><th className="pb-3 text-right">Balance</th><th className="pb-3 text-right">Cost / unit</th></tr></thead><tbody>{loading ? <tr><td colSpan={7} className="py-12 text-center text-[#747a89]">Loading adjustments…</td></tr> : rows.length ? rows.map(row => <tr key={row.id} className="border-t border-[#eef0f3]"><td className="py-4">{new Date(row.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}</td><td className="py-4"><span className="font-semibold">{row.itemName}</span><span className="block text-xs text-[#747a89]">{row.sku || 'No SKU'}</span></td><td className="py-4"><span>{reasons[row.adjustmentReason || ''] || 'Not recorded'}</span>{row.adjustmentNote && <span className="block max-w-64 whitespace-pre-wrap break-words text-xs text-[#747a89]">{row.adjustmentNote}</span>}</td><td className="py-4">{row.createdByName || 'Not recorded'}</td><td className={`py-4 text-right font-semibold tabular-nums ${row.quantityChange < 0 ? 'text-[#bd4940]' : 'text-[#247545]'}`}>{row.quantityChange > 0 ? '+' : ''}{row.quantityChange}</td><td className="py-4 text-right tabular-nums">{row.balanceAfter}</td><td className="py-4 text-right tabular-nums">{row.costCurrency || 'Unknown'} {money(Math.round(Number(row.unitCost) * 100))}</td></tr>) : <tr><td colSpan={7} className="py-12 text-center text-[#747a89]">No matching adjustments found.</td></tr>}</tbody></table></div><Pagination page={page} total={total} disabled={loading} onPageChange={setPage} /></section>
    <p className="mt-4 text-xs leading-5 text-[#747a89]">Loss cost includes stock reductions marked damaged or lost, valued at the cost recorded when adjusted. Stock increases and count corrections are excluded. This report reflects recorded adjustments only.</p>
  </main></div>
}
function Card({label,value,detail}:{label:string;value:string;detail:string}) { return <div className="rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-[#747a89]">{label}</p><p className="mt-3 text-2xl font-bold tabular-nums">{value}</p><p className="mt-2 text-xs text-[#747a89]">{detail}</p></div> }

import { useEffect, useState } from 'react'
import Sidebar from '../Components/Sidebar'
import api, { getApiError } from '../api/axios'
import type { AuthUser } from '../types/auth'

type Props = { user: AuthUser; onGoDashboard: () => void; onOpenRepairs: () => void; onOpenHistory: () => void; onOpenProfile: () => void; onSignOut: () => void }
type Row = { id: string; name: string; sku: string | null; quantity: number; costPrice: number; costCurrency: string | null; sellingPrice: number; costValueCents: number | null }
type Report = { rows: Row[]; totalCostCents: number; sellingValueCents: number; excludedBatches: number; totalUnits: number; totalBatches: number; total: number; page: number; pageSize: number }
const money = (amount: number) => amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function StockValuationPage(props: Props) {
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setLoading(true); setError('')
    const timer = window.setTimeout(() => {
      api.get('/reports/stock-valuation', { params: { page, search: search.trim() } }).then(({ data }) => {
        if (cancelled) return
        const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize))
        if (page > lastPage) { setPage(lastPage); return }
        setReport(data)
      }).catch(err => { if (!cancelled) setError(getApiError(err, 'Unable to load stock valuation.')) }).finally(() => { if (!cancelled) setLoading(false) })
    }, search ? 250 : 0)
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [page, search])
  const rows = report?.rows || []
  const sellingValueCents = report?.sellingValueCents || 0
  return <div className="flex h-dvh overflow-hidden bg-[#f5f5f7] font-sans text-[#262b3a] max-[1100px]:h-auto max-[1100px]:flex-col">
    <Sidebar {...props} activePage="stockValuation" />
    <main className="min-w-0 flex-1 overflow-y-auto p-7 max-sm:p-[18px]">
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Reports</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Stock valuation</h1><p className="mt-1.5 text-sm text-[#747a89]">Current stock value at purchase cost for this branch.</p>
      {error && <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}{!report && !error && <p className="mt-6 text-sm text-[#747a89]">Loading report…</p>}{report && <>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><div className="rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-[#747a89]">Stock value</p><p className="mt-3 text-2xl font-bold tabular-nums">LKR {money(report.totalCostCents / 100)}</p><p className="mt-2 text-xs text-[#747a89]">{report.excludedBatches ? 'Known LKR costs only' : 'Total at purchase cost'}</p></div><div className="rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-[#747a89]">Selling value</p><p className="mt-3 text-2xl font-bold tabular-nums">LKR {money(sellingValueCents / 100)}</p><p className="mt-2 text-xs text-[#747a89]">Current stock at listed selling prices</p></div><div className="rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-[#747a89]">Estimated gross profit</p><p className="mt-3 text-2xl font-bold tabular-nums text-[#247545]">{report.excludedBatches ? 'Unavailable' : `LKR ${money((sellingValueCents - report.totalCostCents) / 100)}`}</p><p className="mt-2 text-xs text-[#747a89]">{report.excludedBatches ? 'Some stock costs are unknown or non-LKR' : 'Selling value minus stock cost'}</p></div><div className="rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><p className="text-sm font-semibold text-[#747a89]">Units in stock</p><p className="mt-3 text-2xl font-bold tabular-nums">{report.totalUnits.toLocaleString()}</p><p className="mt-2 text-xs text-[#747a89]">Across {report.totalBatches} stock batches</p></div></div>
        {report.excludedBatches > 0 && <p className="mt-5 rounded-xl bg-[#fff7e8] p-4 text-sm leading-6 text-[#795b21]">{report.excludedBatches} stock batches have an unknown or non-LKR cost currency and are excluded from the LKR stock value. No exchange rate has been applied.</p>}
        <section className="mt-5 rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Stock by item and price</h2><p className="mt-1 text-xs text-[#747a89]">{report.total} matching batches · summary includes all current stock</p></div><input className="h-11 w-full max-w-72 rounded-xl border border-[#e2e3e8] px-3 text-sm outline-none focus:border-[#171719]" placeholder="Search item or SKU…" aria-label="Search stock valuation" value={search} onChange={e => { setPage(1); setSearch(e.target.value) }} /></div>
          <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead className="text-xs uppercase text-[#777e8e]"><tr><th className="pb-3">Item / SKU</th><th className="pb-3 text-right">Quantity</th><th className="pb-3 text-right">Cost / unit</th><th className="pb-3 text-right">Selling / unit</th><th className="pb-3 text-right">Cost value</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="py-12 text-center text-[#747a89]">Loading stock…</td></tr> : rows.length ? rows.map(row => <tr key={row.id} className="border-t border-[#eef0f3]"><td className="py-4"><span className="font-semibold">{row.name}</span><span className="block text-xs text-[#747a89]">{row.sku || 'No SKU'} · Batch {row.id.slice(0, 8)}</span></td><td className="py-4 text-right tabular-nums">{row.quantity}</td><td className="py-4 text-right tabular-nums">{row.costCurrency || 'Unknown'} {money(row.costPrice)}</td><td className="py-4 text-right tabular-nums">LKR {money(row.sellingPrice)}</td><td className="py-4 text-right font-semibold tabular-nums">{row.costValueCents === null ? 'Excluded' : `LKR ${money(row.costValueCents / 100)}`}</td></tr>) : <tr><td colSpan={5} className="py-12 text-center text-[#747a89]">No matching stock found.</td></tr>}</tbody></table></div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#eef0f3] pt-4"><p className="text-xs text-[#747a89]">Page {report.page} of {Math.max(1, Math.ceil(report.total / report.pageSize))} · {report.total} batches</p><div className="flex gap-2"><button type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border border-[#dfe1e6] px-3 py-2 text-xs font-semibold text-[#596170] hover:bg-[#f7f7f9] disabled:opacity-40">Previous</button><button type="button" disabled={loading || page >= Math.ceil(report.total / report.pageSize)} onClick={() => setPage(value => value + 1)} className="rounded-lg border border-[#dfe1e6] px-3 py-2 text-xs font-semibold text-[#596170] hover:bg-[#f7f7f9] disabled:opacity-40">Next</button></div></div>
        </section><p className="mt-4 text-xs leading-5 text-[#747a89]">This is a current snapshot. Cost value is quantity multiplied by unit cost; archived and zero-quantity batches are excluded. Estimated gross profit assumes all current stock sells at the listed prices, before discounts and expenses.</p>
      </>}
    </main>
  </div>
}

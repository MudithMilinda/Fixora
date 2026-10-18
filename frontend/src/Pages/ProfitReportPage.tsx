import { useEffect, useState } from 'react'
import Sidebar from '../Components/Sidebar'
import ResolveReportData from '../Components/ResolveReportData'
import ProfitReportDetails, { type DetailKind, type ReportDetails } from '../Components/ProfitReportDetails'
import api, { getApiError } from '../api/axios'
import type { AuthUser } from '../types/auth'

type Props = { user: AuthUser; onGoDashboard: () => void; onOpenRepairs: () => void; onOpenHistory: () => void; onOpenProfile: () => void; onSignOut: () => void }
type Report = { revenueCents: number; knownCostCents: number; grossProfitCents: number | null; unknownCostLines: number; saleCount: number; purchaseCents: number; purchaseCount: number; excludedCurrencyOrders: number; stockValueCents: number; unknownStockBatches: number; undatedOrders: number }
const dateValue = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const money = (cents: number) => `LKR ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function ProfitReportPage(props: Props) {
  const [from, setFrom] = useState(() => { const date = new Date(); date.setDate(1); return dateValue(date) })
  const [to, setTo] = useState(() => dateValue(new Date()))
  const [report, setReport] = useState<Report | null>(null)
  const [missing, setMissing] = useState<{ canResolve: boolean; missingSales: Parameters<typeof ResolveReportData>[0]['sales']; missingStocks: Parameters<typeof ResolveReportData>[0]['stocks']; missingOrders: Parameters<typeof ResolveReportData>[0]['orders'] } | null>(null)
  const [revision, setRevision] = useState(0)
  const [details, setDetails] = useState<ReportDetails | null>(null)
  const [selected, setSelected] = useState<DetailKind | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!from || !to || from > to) { setReport(null); setError('Select a valid date range.'); return }
    const start = new Date(`${from}T00:00:00`), end = new Date(`${to}T00:00:00`)
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) { setReport(null); setError('Select a valid date range.'); return }
    end.setDate(end.getDate() + 1)
    let cancelled = false
    setLoading(true); setError(''); setReport(null)
    api.get('/reports/profit', { params: { start: start.toISOString(), end: end.toISOString() } }).then(({ data }) => { if (!cancelled) { setReport(data.report); setMissing(data); setDetails(data.details) } }).catch(error => { if (!cancelled) setError(getApiError(error, 'Unable to load profit report.')) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [from, to, revision])
  const cards = report ? [
    { kind: 'purchases' as const, label: 'Stock purchases', value: money(report.purchaseCents), detail: `${report.purchaseCount} received purchase orders`, color: 'text-[#262b3a]' },
    { kind: 'revenue' as const, label: 'Sales revenue', value: money(report.revenueCents), detail: `${report.saleCount} completed sales after discounts`, color: 'text-[#262b3a]' },
    { kind: 'cost' as const, label: 'Cost of sold items', value: money(report.knownCostCents), detail: report.unknownCostLines ? 'Known costs only' : 'Recorded cost of sold items', color: 'text-[#262b3a]' },
    { kind: 'profit' as const, label: 'Gross profit', value: report.grossProfitCents === null ? 'Unavailable' : money(report.grossProfitCents), detail: report.grossProfitCents === null ? 'Some item costs are missing' : 'Sales revenue minus cost of sold items', color: 'text-[#247545]' },
    { kind: 'stock' as const, label: 'Remaining stock value', value: money(report.stockValueCents), detail: report.unknownStockBatches ? 'Known LKR costs only' : 'Current stock at purchase cost', color: 'text-[#262b3a]' },
  ] : []
  return <div className="flex h-dvh overflow-hidden bg-[#f5f5f7] font-sans text-[#262b3a] max-[1100px]:h-auto max-[1100px]:flex-col">
    <Sidebar {...props} activePage="profitReport" />
    <main className="min-w-0 flex-1 overflow-y-auto p-7 max-sm:p-[18px]">
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Reports</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight">Profit report</h1>
      <p className="mt-1.5 text-sm text-[#747a89]">Review sales, stock costs and gross profit for your current branch.</p>
      <section className="mt-6 flex flex-wrap items-end gap-4 rounded-2xl border border-[#eceaf2] bg-white p-5 shadow-sm">
        <label className="text-xs font-semibold text-[#596170]">From<input className="mt-2 block h-10 rounded-xl border border-[#e2e3e8] bg-white px-3 text-sm font-normal" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label>
        <label className="text-xs font-semibold text-[#596170]">To<input className="mt-2 block h-10 rounded-xl border border-[#e2e3e8] bg-white px-3 text-sm font-normal" type="date" value={to} onChange={e => setTo(e.target.value)} /></label>
        <p className="pb-2 text-xs text-[#747a89]">Dates use your device’s local time.</p>
      </section>
      {loading && <p className="mt-6 text-sm text-[#747a89]">Loading report…</p>}
      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700" role="alert">{error}</p>}
      {report && <>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(card => card.kind === 'stock' ? <a key={card.kind} href="/stock-valuation" className="rounded-2xl border border-[#eceaf2] bg-white p-5 text-left shadow-sm transition hover:border-[#bfc4cd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad6338]"><span className="block text-sm font-semibold text-[#747a89]">{card.label}</span><span className={`mt-3 block text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</span><span className="mt-2 block text-xs leading-5 text-[#747a89]">{card.detail}</span><span className="mt-3 block text-xs font-semibold text-[#8b5d40]">View stock valuation →</span></a> : <button type="button" key={card.kind} aria-expanded={selected === card.kind} aria-controls="profit-report-details" onClick={() => setSelected(value => value === card.kind ? null : card.kind)} className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:border-[#bfc4cd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ad6338] ${selected === card.kind ? 'border-[#ad6338] ring-2 ring-[#ad6338]/10' : 'border-[#eceaf2]'}`}><span className="block text-sm font-semibold text-[#747a89]">{card.label}</span><span className={`mt-3 block text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</span><span className="mt-2 block text-xs leading-5 text-[#747a89]">{card.detail}</span><span className="mt-3 block text-xs font-semibold text-[#8b5d40]">{selected === card.kind ? 'Hide details ↑' : 'View details →'}</span></button>)}</div>
        {selected && details && <ProfitReportDetails kind={selected} details={details} onClose={() => setSelected(null)} />}
        {report.unknownCostLines > 0 && <p className="mt-5 rounded-xl bg-[#fff7e8] p-4 text-sm leading-6 text-[#795b21]">{report.unknownCostLines} sold item {report.unknownCostLines === 1 ? 'line has' : 'lines have'} no recorded cost. Older sales, older repair parts and custom items may be missing costs. Gross profit is unavailable until all costs are known.</p>}
        {report.unknownStockBatches > 0 && <p className="mt-4 rounded-xl bg-[#fff7e8] p-4 text-sm leading-6 text-[#795b21]">{report.unknownStockBatches} stock batches have an unknown or non-LKR cost currency and are excluded from remaining stock value. Older stock may not have a recorded currency.</p>}
        {(report.undatedOrders > 0 || report.excludedCurrencyOrders > 0) && <p className="mt-4 rounded-xl bg-[#fff7e8] p-4 text-sm leading-6 text-[#795b21]">{report.undatedOrders > 0 && `${report.undatedOrders} older received orders have no recorded receipt date and are excluded from purchases. `}{report.excludedCurrencyOrders > 0 && `${report.excludedCurrencyOrders} received orders in other currencies are excluded; no exchange rate has been applied.`}</p>}
        {missing?.canResolve && <ResolveReportData sales={missing.missingSales} stocks={missing.missingStocks} orders={missing.missingOrders} onSaved={() => setRevision(value => value + 1)} />}
        <div className="mt-5 rounded-2xl border border-[#eceaf2] bg-white p-5 text-sm leading-6 text-[#747a89]"><p>Stock purchases include LKR purchase orders received within the selected dates. Manually added stock is excluded because its purchase event is not recorded.</p><p className="mt-2">Remaining stock value is current, regardless of the date range. Gross profit excludes expenses such as salaries and rent; it is not net profit. Older sales stored only in a browser are excluded.</p></div>
      </>}
    </main>
  </div>
}

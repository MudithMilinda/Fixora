import { useState, type FormEvent } from 'react'
import api, { getApiError } from '../api/axios'

type MissingSale = { saleId: string; lineIndex: number; name: string; quantity: number; customerName: string; completedAt: string }
type MissingStock = { id: string; name: string; sku: string | null; quantity: number; costPrice: number }
type MissingOrder = { id: string; orderNumber: string; supplierName: string; currency: string; totalCents: number; createdAt: string }
const inputStyle = 'h-10 rounded-xl border border-[#dfe2e8] bg-white px-3 text-sm outline-none focus:border-[#171719]'
const buttonStyle = 'h-10 rounded-xl bg-[#171719] px-4 text-xs font-semibold text-white disabled:opacity-50'

export default function ResolveReportData({ sales, stocks, orders, onSaved }: { sales: MissingSale[]; stocks: MissingStock[]; orders: MissingOrder[]; onSaved: () => void }) {
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function save(key: string, endpoint: string, payload: object) {
    setBusy(key); setError(''); setNotice('')
    try { await api.patch(`/reports/${endpoint}`, payload); setNotice('Saved. The report has been updated.'); onSaved() }
    catch (e) { setError(getApiError(e, 'Unable to save the missing information.')) }
    finally { setBusy('') }
  }
  function saleCost(event: FormEvent<HTMLFormElement>, sale: MissingSale) {
    event.preventDefault()
    const cost = String(new FormData(event.currentTarget).get('unitCost') || '').trim()
    if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(cost)) { setError('Enter a valid cost per unit with up to two decimal places.'); return }
    void save(`sale-${sale.saleId}-${sale.lineIndex}`, 'missing-sale-cost', { saleId: sale.saleId, lineIndex: sale.lineIndex, unitCost: cost })
  }
  function receiptDate(event: FormEvent<HTMLFormElement>, order: MissingOrder) {
    event.preventDefault()
    const date = String(new FormData(event.currentTarget).get('receivedDate') || '')
    const localDate = new Date(`${date}T00:00:00`)
    if (!date || !Number.isFinite(localDate.getTime()) || localDate > new Date()) { setError('Select a valid receipt date that is not in the future.'); return }
    void save(`order-${order.id}`, 'missing-receipt-date', { orderId: order.id, receivedAt: localDate.toISOString() })
  }
  if (!sales.length && !stocks.length && !orders.length && !notice) return null
  return <section className="mt-6 rounded-2xl border border-[#e8e9ed] bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold">Complete missing information</h2>
    <p className="mt-1 text-sm leading-6 text-[#747a89]">Enter verified values only. These changes affect financial reports for this branch.</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {notice && <p role="status" className="mt-4 rounded-xl bg-green-50 p-3 text-sm text-green-700">{notice}</p>}
    {sales.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">Sold item costs</h3><p className="mt-1 text-xs leading-5 text-[#747a89]">Sales within the selected date range. Enter the cost for one unit; use 0 only if the item or service had no direct cost.</p><div className="mt-3 divide-y divide-[#eef0f3]">{sales.map(sale => <form key={`${sale.saleId}-${sale.lineIndex}`} onSubmit={event => saleCost(event, sale)} className="flex flex-wrap items-end justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{sale.name} <span className="font-normal text-[#747a89]">× {sale.quantity}</span></p><p className="mt-1 text-xs text-[#747a89]">{sale.customerName || 'Walk-in customer'} · {new Date(sale.completedAt).toLocaleDateString()} · Sale {sale.saleId.slice(0, 8)}</p></div><div className="flex items-end gap-2"><label className="text-xs text-[#596170]">Cost per unit (LKR)<input className={`${inputStyle} mt-1 block w-32`} type="number" name="unitCost" min="0" max="99999999.99" step="0.01" required placeholder="0.00" /></label><button className={buttonStyle} disabled={!!busy}>{busy === `sale-${sale.saleId}-${sale.lineIndex}` ? 'Saving…' : 'Save cost'}</button></div></form>)}</div></div>}
    {stocks.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">Stock cost currency</h3><p className="mt-1 text-xs leading-5 text-[#747a89]">Confirm LKR only when the recorded cost price is in Sri Lankan rupees. Other currencies remain excluded.</p><div className="mt-3 divide-y divide-[#eef0f3]">{stocks.map(stock => <div key={stock.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{stock.name}</p><p className="mt-1 text-xs text-[#747a89]">{stock.sku || 'No SKU'} · {stock.quantity} remaining · Recorded cost {stock.costPrice.toFixed(2)} per unit</p></div><button type="button" className={buttonStyle} disabled={!!busy} onClick={() => void save(`stock-${stock.id}`, 'missing-stock-currency', { stockId: stock.id, currency: 'LKR' })}>{busy === `stock-${stock.id}` ? 'Saving…' : 'Confirm cost is LKR'}</button></div>)}</div></div>}
    {orders.length > 0 && <div className="mt-5"><h3 className="text-sm font-semibold">Purchase receipt dates</h3><p className="mt-1 text-xs leading-5 text-[#747a89]">Enter the actual date goods were received. It will determine which reporting period includes this purchase.</p><div className="mt-3 divide-y divide-[#eef0f3]">{orders.map(order => <form key={order.id} onSubmit={event => receiptDate(event, order)} className="flex flex-wrap items-end justify-between gap-3 py-3"><div><p className="text-sm font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-[#747a89]">{order.supplierName} · {order.currency} {(order.totalCents / 100).toFixed(2)} · Ordered {new Date(order.createdAt).toLocaleDateString()}</p></div><div className="flex items-end gap-2"><label className="text-xs text-[#596170]">Received on<input className={`${inputStyle} mt-1 block`} type="date" name="receivedDate" required /></label><button className={buttonStyle} disabled={!!busy}>{busy === `order-${order.id}` ? 'Saving…' : 'Save date'}</button></div></form>)}</div></div>}
  </section>
}

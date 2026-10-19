import { saleReference } from "../data/saleReference";
import { useEffect, useState } from "react";
import SaleReturnModal from "../Components/SaleReturnModal";
import Sidebar from "../Components/Sidebar";
import Pagination from "../Components/Pagination";
import SaleInvoiceModal from "../Components/SaleInvoiceModal";
import type { AuthUser } from "../types/auth";
import api, { getApiError } from "../api/axios";
import { getCompletedSales, type CompletedSale } from "../data/paymentHistory";

const money = (value: number) =>
  `LKR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PaymentHistoryPage(props: {
  user: AuthUser;
  onGoDashboard: () => void;
  onOpenRepairs: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}) {
  const [sales, setSales] = useState<CompletedSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [legacySales] = useState(getCompletedSales);
  const [showLegacy, setShowLegacy] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1), [total, setTotal] = useState(0);
  const [returningSale, setReturningSale] = useState<CompletedSale | null>(null);
  const [returnNotice, setReturnNotice] = useState("");
  const [viewingSale, setViewingSale] = useState<CompletedSale | null>(null);
  useEffect(() => { let cancelled = false; setLoading(true); setError(''); const timer = window.setTimeout(() => { api.get('/sales', {params:{page,search:search.trim()}}).then(({data}) => { if(cancelled)return; const last=Math.max(1,Math.ceil(data.total/data.pageSize)); if(page>last){setPage(last);return} setSales(data.sales); setTotal(data.total) }).catch(error => {if(!cancelled)setError(getApiError(error,'Unable to load payment history.'))}).finally(()=>{if(!cancelled)setLoading(false)}) }, search ? 250 : 0); return () => {cancelled=true;window.clearTimeout(timer)} }, [page, search]);
  const filtered = sales;
  const totalAmount = filtered.reduce((sum, sale) => sum + sale.total, 0);
  const totalItems = filtered.reduce(
    (sum, sale) => sum + sale.lines.reduce((lineTotal, line) => lineTotal + line.quantity, 0),
    0,
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-[#f5f5f7] font-sans text-[#262b3a] max-[1100px]:h-auto max-[1100px]:flex-col">
      <Sidebar {...props} activePage="paymentHistory" />
      <main className="min-w-0 flex-1 overflow-y-auto p-7 max-sm:p-[18px]">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Sales &amp; billing</p>
            <h1 className="mt-2 text-[30px] font-bold tracking-[-.03em]">Payment history</h1>
            <p className="mt-1.5 text-sm text-[#747a89]">Review completed sales and the payments collected from customers.</p>
          </div>
          <button
            type="button"
            onClick={() => { window.location.href = "/payments"; }}
            className="h-10 rounded-[10px] bg-[#171719] px-4 text-xs font-semibold text-white transition hover:bg-[#2a2a2e]"
          >
            + New sale
          </button>
        </header>

        {legacySales.length > 0 && <section className="mt-5 rounded-xl bg-[#fff7e8] p-3 text-sm text-[#795b21]"><p>This browser has {legacySales.length} older locally saved sales. They have not been assigned to a branch or moved to the database.</p><button type="button" className="mt-2 font-semibold underline" onClick={() => setShowLegacy(value => !value)}>{showLegacy ? 'Hide' : 'View'} older sales</button>{showLegacy && <ul className="mt-2 space-y-2">{legacySales.map(sale => <li key={sale.id} className="flex items-center justify-between gap-3"><span>{sale.id} · {sale.customerName || 'Walk-in customer'} · {money(sale.total)}</span><button type="button" className="font-semibold underline" onClick={() => setViewingSale(sale)}>View invoice</button></li>)}</ul>}</section>}
        {returnNotice && <p role="status" className="mt-5 rounded-xl bg-green-50 p-3 text-sm text-green-700">{returnNotice} <a className="font-semibold underline" href="/sales-returns">View sales returns</a></p>}
        {error && <p role="alert" className="mt-5 text-sm text-red-700">{error}</p>}
        <section className="mt-6 rounded-[18px] border border-[#eceaf2] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Completed sales</h2>
              <p className="mt-1 text-xs text-[#747a89]">{total} {total === 1 ? "sale" : "sales"} found</p>
            </div>
            <label className="relative block w-full max-w-[340px]">
              <span className="sr-only">Search payment history</span>
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89909d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
              <input value={search} onChange={(event) => { setPage(1); setSearch(event.target.value) }} className="h-10 w-full rounded-[10px] border border-[#e1e3e8] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#9ca0aa] focus:border-[#171719]" placeholder="Search customer, item or sale reference…" />
            </label>
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-[13px]">
              <thead className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#777e8e]">
                <tr><th className="pb-3">Sale</th><th className="pb-3">Customer</th><th className="pb-3">Items</th><th className="pb-3">Payment</th><th className="pb-3">Completed</th><th className="pb-3 pr-5 text-right">Amount</th><th className="w-[76px] pb-3 text-center">Actions</th></tr>
              </thead>
              <tbody>
                {filtered.length ? filtered.map((sale) => (
                  <tr className="border-t border-[#f0f1f4]" key={sale.id}>
                    <td className="py-4"><strong className="block font-semibold">{saleReference(sale)}</strong>{sale.repair && <small className="mt-0.5 block text-xs text-[#69717f]">Repair: {sale.repair.jobNumber}</small>}</td>
                    <td className="py-4"><strong className="block font-semibold">{sale.customerName || "Walk-in customer"}</strong><small className="mt-0.5 block text-xs text-[#7a8090]">{sale.customerPhone || "No phone number"}</small></td>
                    <td className="py-4"><strong>{sale.lines.reduce((sum, line) => sum + line.quantity, 0)}</strong><small className="mt-0.5 block max-w-[220px] truncate text-xs text-[#7a8090]">{sale.lines.map((line) => line.name).join(", ")}</small></td>
                    <td className="py-4 text-[#596170]">{sale.payments.map((payment) => payment.method).join(", ")}</td>
                    <td className="py-4 text-[#596170]">{new Date(sale.completedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="whitespace-nowrap py-4 pr-5 text-right font-semibold tabular-nums">{money(sale.total)}</td>
                    <td className="py-4 text-center"><div className="flex items-center justify-center gap-2"><button type="button" onClick={() => setViewingSale(sale)} aria-label={`View invoice ${sale.id}`} title="View invoice" className="mx-auto grid h-8 w-8 place-items-center rounded-[9px] border border-[#dfe2e7] bg-white text-[#667080] shadow-[0_1px_1px_#10101206] transition hover:border-[#cbd0d8] hover:bg-[#f6f7f8] hover:text-[#262b3a]"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M2.8 12s3.3-5.7 9.2-5.7 9.2 5.7 9.2 5.7-3.3 5.7-9.2 5.7S2.8 12 2.8 12Z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.6" /></svg></button><button type="button" onClick={() => setReturningSale(sale)} aria-label={`Return items for sale ${sale.id}`} title="Return items" className="grid h-8 w-8 place-items-center rounded-[9px] border border-[#dfe2e7] bg-white text-[#667080] shadow-[0_1px_1px_#10101206] transition hover:border-[#cbd0d8] hover:bg-[#f6f7f8] hover:text-[#262b3a]"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 5 10l4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-3"/></svg></button></div></td>
                  </tr>
                )) : <tr><td colSpan={7} className="py-14 text-center text-sm text-[#747a89]">{loading ? "Loading sales…" : error ? "Payment history could not be loaded." : sales.length ? "No matching payment records." : "Completed sales will appear here."}</td></tr>}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <footer className="mt-4 flex flex-wrap justify-end gap-x-7 gap-y-2 border-t border-[#eceef1] pt-4 text-sm">
              <span className="text-[#747a89]">Page items <strong className="ml-2 text-[#262b3a]">{totalItems}</strong></span>
              <span className="text-[#747a89]">Page amount <strong className="ml-2 tabular-nums text-[#262b3a]">{money(totalAmount)}</strong></span>
            </footer>
          )}
          <Pagination page={page} total={total} disabled={loading} onPageChange={setPage} />
        </section>
      </main>
      {returningSale && <SaleReturnModal sale={returningSale} onClose={() => setReturningSale(null)} onSaved={() => { setReturningSale(null); setReturnNotice("Return recorded successfully.") }} />}
      {viewingSale && <SaleInvoiceModal sale={viewingSale} closeLabel="Close invoice" onClose={() => setViewingSale(null)} />}
    </div>
  );
}

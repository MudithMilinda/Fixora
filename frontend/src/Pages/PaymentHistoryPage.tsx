import { useMemo, useState } from "react";
import Sidebar from "../Components/Sidebar";
import SaleInvoiceModal from "../Components/SaleInvoiceModal";
import type { AuthUser } from "../types/auth";
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
  const [sales] = useState<CompletedSale[]>(getCompletedSales);
  const [search, setSearch] = useState("");
  const [viewingSale, setViewingSale] = useState<CompletedSale | null>(null);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sales;
    return sales.filter((sale) =>
      `${sale.id} ${sale.customerName} ${sale.customerPhone} ${sale.lines.map((line) => line.name).join(" ")}`
        .toLowerCase()
        .includes(term),
    );
  }, [sales, search]);
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

        <section className="mt-6 rounded-[18px] border border-[#eceaf2] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Completed sales</h2>
              <p className="mt-1 text-xs text-[#747a89]">{filtered.length} {filtered.length === 1 ? "sale" : "sales"} shown</p>
            </div>
            <label className="relative block w-full max-w-[340px]">
              <span className="sr-only">Search payment history</span>
              <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89909d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" strokeLinecap="round" /></svg>
              <input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-[10px] border border-[#e1e3e8] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#9ca0aa] focus:border-[#171719]" placeholder="Search customer or sale…" />
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
                    <td className="py-4"><strong className="block font-semibold">{sale.id}</strong>{sale.repair && <small className="mt-0.5 block text-xs text-[#69717f]">Repair: {sale.repair.jobNumber}</small>}</td>
                    <td className="py-4"><strong className="block font-semibold">{sale.customerName || "Walk-in customer"}</strong><small className="mt-0.5 block text-xs text-[#7a8090]">{sale.customerPhone || "No phone number"}</small></td>
                    <td className="py-4"><strong>{sale.lines.reduce((sum, line) => sum + line.quantity, 0)}</strong><small className="mt-0.5 block max-w-[220px] truncate text-xs text-[#7a8090]">{sale.lines.map((line) => line.name).join(", ")}</small></td>
                    <td className="py-4 text-[#596170]">{sale.payments.map((payment) => payment.method).join(", ")}</td>
                    <td className="py-4 text-[#596170]">{new Date(sale.completedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="whitespace-nowrap py-4 pr-5 text-right font-semibold tabular-nums">{money(sale.total)}</td>
                    <td className="py-4 text-center"><button type="button" onClick={() => setViewingSale(sale)} aria-label={`View invoice ${sale.id}`} title="View invoice" className="mx-auto grid h-8 w-8 place-items-center rounded-[9px] border border-[#dfe2e7] bg-white text-[#667080] shadow-[0_1px_1px_#10101206] transition hover:border-[#cbd0d8] hover:bg-[#f6f7f8] hover:text-[#262b3a]"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true"><path d="M2.8 12s3.3-5.7 9.2-5.7 9.2 5.7 9.2 5.7-3.3 5.7-9.2 5.7S2.8 12 2.8 12Z" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="2.6" /></svg></button></td>
                  </tr>
                )) : <tr><td colSpan={7} className="py-14 text-center text-sm text-[#747a89]">{sales.length ? "No matching payment records." : "Completed sales will appear here."}</td></tr>}
              </tbody>
            </table>
          </div>

          {filtered.length > 0 && (
            <footer className="mt-4 flex flex-wrap justify-end gap-x-7 gap-y-2 border-t border-[#eceef1] pt-4 text-sm">
              <span className="text-[#747a89]">Total items <strong className="ml-2 text-[#262b3a]">{totalItems}</strong></span>
              <span className="text-[#747a89]">Total amount <strong className="ml-2 tabular-nums text-[#262b3a]">{money(totalAmount)}</strong></span>
            </footer>
          )}
        </section>
      </main>
      {viewingSale && <SaleInvoiceModal sale={viewingSale} closeLabel="Close invoice" onClose={() => setViewingSale(null)} />}
    </div>
  );
}

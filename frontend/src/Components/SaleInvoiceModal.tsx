import { saleReference } from "../data/saleReference";
import type { CompletedSale } from "../data/paymentHistory";
import { useCompanyBranding } from "../CompanyBrandingContext";

const money = (value: number) =>
  `LKR ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const warrantyDate = (date: string) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default function SaleInvoiceModal({
  sale,
  onClose,
  closeLabel = "Payment history",
}: {
  sale: CompletedSale;
  onClose: () => void;
  closeLabel?: string;
}) {
  const customer = sale.customerName || "Walk-in customer";
  const { company } = useCompanyBranding();
  const showBranding = company?.reportBranding !== false;
  const companyName = company?.name?.trim() || "Fixora";
  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-[#101012]/45 p-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #sale-invoice-print, #sale-invoice-print * { visibility: visible !important; }
          #sale-invoice-print { position: absolute !important; inset: 0 auto auto 0 !important; width: 100% !important; max-width: none !important; max-height: none !important; overflow: visible !important; box-shadow: none !important; border: 0 !important; }
          [data-invoice-body] { max-height: none !important; overflow: visible !important; }
          [data-invoice-actions] { display: none !important; }
        }
      `}</style>
      <section
        id="sale-invoice-print"
        className="w-full overflow-hidden rounded-[20px] border border-[#e7e7e9] bg-white shadow-[0_28px_80px_#0003]"
        style={{ width: "min(680px, calc(100vw - 32px))", maxHeight: "calc(100dvh - 32px)" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-invoice-title"
      >
        <header className="flex items-start justify-between gap-6 border-b border-[#eceef2] px-7 py-6">
          {showBranding && (
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-[52px] w-[52px] shrink-0 place-items-center overflow-hidden rounded-[11px] border border-[#e0e3e8] bg-white text-sm font-bold text-[#171719] shadow-[0_1px_2px_#10101208]">
                {company?.logo ? <img src={company.logo} alt={`${companyName} logo`} className="h-full w-full object-contain" /> : initials}
              </span>
              <div className="min-w-0 pt-0.5">
                <strong className="block truncate pt-0.5 text-base text-[#262b3a]">{companyName}</strong>
                {company?.address && <p className="mt-1 max-w-[270px] whitespace-pre-line text-[11px] leading-4 text-[#747a89]">{company.address}</p>}
                {company?.phone && <p className="mt-0.5 text-[11px] text-[#747a89]">{company.phone}</p>}
              </div>
            </div>
          )}
          <div className={showBranding ? "ml-auto shrink-0 text-right" : ""}>
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Sales &amp; billing</p>
            <h2 id="sale-invoice-title" className="mt-2 text-2xl font-bold tracking-[-.025em]">Sale invoice</h2>
            <p className="mt-1 text-xs text-[#747a89]">{saleReference(sale)}</p>
          </div>
          <button type="button" onClick={onClose} data-invoice-actions aria-label="Close invoice" className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-xl leading-none text-[#747a89] transition hover:bg-[#f2f3f5]">×</button>
        </header>

        <div data-invoice-body className="max-h-[calc(100dvh-230px)] overflow-y-auto px-7 py-6">
          <div className="flex flex-wrap justify-between gap-5 rounded-[12px] border border-[#e4e6eb] bg-[#fafafb] p-4 text-sm">
            <div><p className="text-[10px] font-semibold uppercase tracking-[.09em] text-[#7a8090]">Customer</p><strong className="mt-1 block">{customer}</strong>{sale.customerPhone && <p className="mt-1 text-xs text-[#747a89]">{sale.customerPhone}</p>}</div>
            <div className="text-left sm:text-right"><p className="text-[10px] font-semibold uppercase tracking-[.09em] text-[#7a8090]">Completed</p><strong className="mt-1 block">{new Date(sale.completedAt).toLocaleDateString("en-GB")}</strong><p className="mt-1 text-xs text-[#747a89]">{new Date(sale.completedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p></div>
          </div>

          {sale.repair && (
            <div className="mt-4 rounded-[10px] border border-[#e2e6ed] bg-[#f7f9fc] px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[.09em] text-[#66758d]">Repair job</p>
              <p className="mt-1 text-sm font-semibold text-[#303b4e]">{sale.repair.jobNumber} · {sale.repair.assetName}</p>
              {sale.repair.assetIdentifier && <p className="mt-1 text-xs text-[#6f7888]">{sale.repair.assetIdentifier}</p>}
              {sale.repair.issue && <p className="mt-1 text-xs text-[#6f7888]">{sale.repair.issue}</p>}
            </div>
          )}

          <table className="mt-6 w-full border-collapse border-y border-[#dfe2e7] text-left text-[13px]">
            <thead className="border-b border-[#dfe2e7] text-[10px] font-semibold uppercase tracking-[.08em] text-[#4e5562]"><tr><th className="py-3 pr-3">Item</th><th className="px-3 py-3 text-right">Price</th><th className="px-3 py-3 text-right">Qty.</th><th className="py-3 pl-3 text-right">Subtotal</th></tr></thead>
            <tbody>{sale.lines.map((line, index) => <tr className="border-b border-[#e9ebee] last:border-b-0" key={`${line.name}-${index}`}><td className="py-3.5 pr-3"><strong className="block text-[#262b3a]">{line.name}</strong>{line.sku && <small className="mt-1 block text-xs text-[#69717f]">{line.sku}</small>}{line.warranty && <div className="mt-2 text-xs leading-5 text-[#69717f]"><p>{line.warranty.count > 0 && line.warranty.end ? `Warranty: ${line.warranty.count} ${line.warranty.unit} · Until ${warrantyDate(line.warranty.end)}` : 'No warranty'}</p>{line.warranty.numbers.length > 0 && <p className="break-all">Serial / warranty number: {line.warranty.numbers.join(', ')}</p>}</div>}</td><td className="px-3 py-3.5 text-right tabular-nums text-[#353b48]">{money(line.unitPrice)}</td><td className="px-3 py-3.5 text-right tabular-nums text-[#353b48]">{line.quantity}</td><td className="py-3.5 pl-3 text-right font-semibold tabular-nums text-[#262b3a]">{money(line.unitPrice * line.quantity)}</td></tr>)}</tbody>
          </table>

          <dl className="ml-auto mt-5 w-full max-w-[290px] text-[13px]">
            <div className="flex justify-between border-b border-[#edf0f3] py-2"><dt className="text-[#747a89]">Subtotal</dt><dd>{money(sale.subtotal)}</dd></div>
            <div className="flex justify-between border-b border-[#edf0f3] py-2"><dt className="text-[#747a89]">Discount</dt><dd>− {money(sale.discount)}</dd></div>
            <div className="flex justify-between py-3 text-[15px]"><dt className="font-semibold">Total paid</dt><dd className="font-bold tabular-nums">{money(sale.total)}</dd></div>
          </dl>
          <p className="mt-5 border-t border-[#eceef1] pt-4 text-xs text-[#747a89]">Paid by {sale.payments.map((payment) => payment.method).join(", ") || "payment"}.</p>
        </div>

        <footer data-invoice-actions className="flex flex-wrap justify-end gap-3 border-t border-[#eceef2] bg-[#fcfcfd] px-7 py-4">
          <button type="button" onClick={() => window.print()} className="h-10 rounded-[10px] border border-[#dfe2e7] bg-white px-4 text-xs font-semibold text-[#565d6c] transition hover:bg-[#f6f7f8]">Print invoice</button>
          <button type="button" onClick={onClose} className="h-10 rounded-[10px] bg-[#171719] px-4 text-xs font-semibold text-white transition hover:bg-[#2a2a2e]">{closeLabel}</button>
        </footer>
      </section>
    </div>
  );
}

import type { CompanyProfile } from '../types/company';
import { companyDocumentHeader, escapeDocumentText } from './documentBranding';

type PrintedQuotation = {
  quotationNumber: string;
  supplierName: string;
  quotationDate: string;
  currency: string;
  totalCents: number;
  items: {
    itemName: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
  }[];
};

export function quotationPrintHtml({ company, quotations, preparedBy, filterLabel, date = new Date() }: {
  company: CompanyProfile;
  quotations: PrintedQuotation[];
  preparedBy: string;
  filterLabel?: string;
  date?: Date;
}) {
  const escape = escapeDocumentText;
  const formatDate = (value: string | Date) => new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(typeof value === 'string' ? new Date(`${value}T00:00:00`) : value);
  const money = (cents: number, currency: string) => `${currency} ${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const totalItems = quotations.reduce((total, quotation) => total + quotation.items.length, 0);
  const totalQuantity = quotations.reduce((total, quotation) => total + quotation.items.reduce((quantity, item) => quantity + item.quantity, 0), 0);
  const amounts = [...quotations.reduce((totals, quotation) => {
    totals.set(quotation.currency, (totals.get(quotation.currency) || 0) + quotation.totalCents);
    return totals;
  }, new Map<string, number>()).entries()].sort(([first], [second]) => first.localeCompare(second));
  const rows = quotations.flatMap((quotation) => quotation.items.map((item) => ({ quotation, item })))
    .map(({ quotation, item }, index) => `<tr>
      <td>${index + 1}</td><td><strong>${escape(quotation.quotationNumber)}</strong></td>
      <td>${escape(quotation.supplierName)}</td><td>${formatDate(quotation.quotationDate)}</td>
      <td>${escape(item.itemName)}</td><td class="number">${item.quantity}</td>
      <td class="number">${money(item.unitPriceCents, quotation.currency)}</td>
      <td class="number">${money(item.lineTotalCents, quotation.currency)}</td>
    </tr>`).join('');
  const amountSummary = amounts.map(([currency, amount]) => `<span>${money(amount, currency)}</span>`).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Supplier quotations report</title><style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; } body { margin: 0; color: #202633; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.45; }
    .sheet { min-height: 100%; } h1 { margin: 0; font-size: 19pt; letter-spacing: -.02em; } .eyebrow { margin: 0 0 3mm; color: #6b7280; font-size: 8pt; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; }
    .intro { display: flex; justify-content: space-between; gap: 18px; align-items: end; margin: 0 0 8mm; break-inside: avoid; } .intro p { margin: 2mm 0 0; color: #697181; }
    .metadata { color: #697181; font-size: 9pt; text-align: right; } .metadata strong { color: #202633; } .filter { margin: 0 0 6mm; padding: 3mm 4mm; border: 1px solid #dfe2e8; background: #f8f8fa; color: #515867; font-size: 9pt; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; } th { padding: 9px 10px; border: 1px solid #d9dce2; background: #f1f2f4; color: #515867; font-size: 8pt; text-align: left; text-transform: uppercase; letter-spacing: .04em; } td { padding: 10px; border: 1px solid #d9dce2; vertical-align: top; overflow-wrap: anywhere; } .number { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .summary { display: flex; justify-content: flex-end; gap: 0; margin-top: 7mm; break-inside: avoid; } .summary div { min-width: 34mm; padding: 8px 10px; border: 1px solid #d9dce2; border-left: 0; } .summary div:first-child { border-left: 1px solid #d9dce2; } .summary span { display: block; color: #697181; font-size: 8pt; text-transform: uppercase; } .summary strong { display: block; margin-top: 3px; font-size: 10pt; } .amounts strong span { display: block; }
    footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #e4e6ea; color: #7a8090; font-size: 8pt; } thead { display: table-header-group; } tr { break-inside: avoid; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style></head><body><main class="sheet">
    ${companyDocumentHeader(company)}
    <div class="intro"><div><p class="eyebrow">Procurement</p><h1>Supplier quotations report</h1><p>Recorded supplier quotations for purchase requests.</p></div><div class="metadata">Prepared by: <strong>${escape(preparedBy)}</strong><br />Generated: <strong>${formatDate(date)}</strong></div></div>
    ${filterLabel ? `<p class="filter"><strong>Filter:</strong> ${escape(filterLabel)}</p>` : ''}
    <table aria-label="Supplier quotations"><colgroup><col style="width:5%" /><col style="width:13%" /><col style="width:17%" /><col style="width:11%" /><col style="width:19%" /><col style="width:8%" /><col style="width:13%" /><col style="width:14%" /></colgroup><thead><tr><th>No.</th><th>Quotation</th><th>Supplier</th><th>Date</th><th>Item</th><th class="number">Quantity</th><th class="number">Unit cost</th><th class="number">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <section class="summary" aria-label="Quotation totals"><div><span>Total quotations</span><strong>${quotations.length}</strong></div><div><span>Total items</span><strong>${totalItems}</strong></div><div><span>Total quantity</span><strong>${totalQuantity}</strong></div><div class="amounts"><span>Total amount</span><strong>${amountSummary}</strong></div></section>
    <footer>Supplier quotations report · ${formatDate(date)}</footer>
  </main></body></html>`;
}

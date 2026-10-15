import type { CompanyProfile } from '../types/company';
import { escapeDocumentText } from './documentBranding.ts';

type RequestLine = {
  itemName: string;
  quantity: number;
};

export function purchaseRequestPrintHtml({ company, requests, preparedBy, date = new Date() }: {
  company: CompanyProfile;
  requests: RequestLine[];
  preparedBy: string;
  date?: Date;
}) {
  const escape = escapeDocumentText;
  const formatDate = (value: Date) => new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(value);
  const dateKey = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const reference = `PR-${dateKey}`;
  const logo = company.reportBranding && company.logo && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(company.logo)
    ? `<img class="company-logo" src="${company.logo}" alt="${escape(company.name)} logo" />`
    : '';
  const companyBlock = company.reportBranding ? `
    <header class="company-header">
      ${logo}
      <div class="company-contact">
        <div class="company-name">${escape(company.name)}</div>
        ${company.address ? `<div class="company-address">${escape(company.address)}</div>` : ''}
        ${company.phone ? `<div class="company-phone">Telephone: ${escape(company.phone)}</div>` : ''}
      </div>
    </header>` : '';
  const rows = requests.map((request, index) => `<tr>
    <td class="row-number">${index + 1}</td>
    <td><span class="item-name">${escape(request.itemName)}</span></td>
    <td class="numeric">${request.quantity}</td>
  </tr>`).join('');
  const totalQuantity = requests.reduce((total, request) => total + request.quantity, 0);

  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>Request for Quotation ${reference}</title><style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.45; }
    .sheet { border: 1px solid #999; padding: 14mm 12mm 10mm; }
    .company-header { display: flex; align-items: flex-start; gap: 6mm; margin-bottom: 12mm; break-inside: avoid; }
    h1 { margin: 0 0 3mm; font-size: 15pt; font-weight: 400; letter-spacing: .02em; line-height: 1.25; }
    .company-logo { display: block; max-width: 26mm; max-height: 26mm; width: auto; height: auto; object-fit: contain; flex-shrink: 0; }
    .company-contact { min-width: 0; color: #606060; font-size: 9pt; overflow-wrap: anywhere; }
    .company-name { color: #111; font-size: 19pt; font-weight: 700; line-height: 1.25; margin-bottom: 3mm; }
    .company-address { white-space: pre-line; }
    .company-phone { margin-top: 4px; }
    .document-info { display: flex; justify-content: space-between; gap: 24px; margin-bottom: 9mm; break-inside: avoid; }
    .prepared { flex: 1; min-width: 0; overflow-wrap: anywhere; }
    .prepared strong { display: block; margin-bottom: 3px; font-size: 9pt; }
    .prepared p { margin: 0; }
    .document-meta { width: 62mm; flex-shrink: 0; margin-top: 12px; border-collapse: collapse; }
    .document-meta th { text-align: left; font-weight: 400; padding: 1px 12px 1px 0; }
    .document-meta td { text-align: right; font-weight: 700; white-space: nowrap; }
    .items { border-collapse: collapse; width: 100%; table-layout: fixed; border: 1px solid #d4d4d4; }
    .items th { padding: 10px; background: #f1f1f1; font-size: 9pt; font-weight: 700; text-align: left; text-transform: uppercase; border: 1px solid #d4d4d4; }
    .items td { padding: 10px; border: 1px solid #d4d4d4; vertical-align: top; overflow-wrap: anywhere; }
    .items .numeric { text-align: right; font-variant-numeric: tabular-nums; }
    .item-name { display: block; }
    .row-number { font-variant-numeric: tabular-nums; }
    .quotation-intro { break-inside: avoid; break-after: avoid; }
    .quotation-note { margin: 0 0 5mm; color: #606060; font-size: 9pt; }
    .summary { width: 52%; margin: 8px 0 0 auto; border: 1px solid #d4d4d4; border-collapse: collapse; break-inside: avoid; }
    .summary th, .summary td { padding: 9px 12px; font-size: 9pt; border: 1px solid #d4d4d4; }
    .summary th { text-align: left; text-transform: uppercase; font-weight: 700; }
    .summary td { text-align: right; font-variant-numeric: tabular-nums; }
    .summary .total { background: #111; color: #fff; }
    footer { margin-top: 10mm; padding-top: 4mm; border-top: 1px solid #e5e5e5; font-size: 8pt; color: #777; }
    thead { display: table-header-group; }
    tr { break-inside: avoid; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style></head><body><main class="sheet">
    ${companyBlock}
    <div class="document-info">
      <div class="prepared"><strong>PREPARED BY</strong><p>${escape(preparedBy)}</p><p>Procurement</p></div>
      <table class="document-meta" aria-label="Document details"><tbody><tr><th>Reference no.:</th><td>${reference}</td></tr><tr><th>Issue date:</th><td>${formatDate(date)}</td></tr></tbody></table>
    </div>
    <div class="quotation-intro">
      <h1>REQUEST FOR QUOTATION</h1>
      <p class="quotation-note">Please provide your quotation for the following items and quantities.</p>
    </div>
    <table class="items" aria-label="Items for quotation">
      <colgroup><col style="width:10%" /><col style="width:70%" /><col style="width:20%" /></colgroup>
      <thead><tr><th scope="col">No.</th><th scope="col">Item name</th><th scope="col" class="numeric">Quantity</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <table class="summary" aria-label="Request totals"><tbody><tr><th scope="row">Total items</th><td>${requests.length}</td></tr><tr class="total"><th scope="row">Total quantity</th><td>${totalQuantity}</td></tr></tbody></table>
    <footer>Request for quotation · ${reference} · ${formatDate(date)}</footer>
  </main></body></html>`;
}

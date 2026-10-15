import { useEffect, useState } from 'react';
import api, { getApiError } from '../api/axios';
import type { RepairJob } from '../Pages/RepairJobsPage';
import type { CompanyProfile } from '../types/company';
import { companyDocumentHeader, escapeDocumentText, waitForDocumentImages } from '../utils/documentBranding';

export default function RepairReceiptModal({ job, onClose }: { job: RepairJob; onClose: () => void }) {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [error, setError] = useState('');
  const [printing, setPrinting] = useState(false);
  const parts = job.parts || [];
  const total = parts.reduce((sum, part) => sum + part.total, 0);

  useEffect(() => {
    const controller = new AbortController();
    api.get<{ company: CompanyProfile }>('/company-settings', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setCompany(data.company); })
      .catch((err) => { if (!controller.signal.aborted) setError(getApiError(err, 'Unable to load company details. Try Print receipt to retry.')); });
    return () => controller.abort();
  }, []);

  async function printReceipt() {
    if (printing) return;
    const receiptWindow = window.open('', '_blank', 'width=900,height=720');
    if (!receiptWindow) { setError('Allow pop-ups to print this receipt.'); return; }
    setPrinting(true);
    setError('');
    try {
      // Read the saved setting again so printed documents never use a stale toggle.
      const { data } = await api.get<{ company: CompanyProfile }>('/company-settings');
      setCompany(data.company);
      if (receiptWindow.closed) return;
      const rows = parts.map((part) => `<tr><td>${escapeDocumentText(part.name)}</td><td class="numeric">${part.quantity}</td><td class="numeric">Rs. ${part.total.toFixed(2)}</td></tr>`).join('');
      receiptWindow.document.write(`<!doctype html><html><head><title>Repair receipt ${escapeDocumentText(job.jobNumber)}</title><style>
        body{max-width:900px;margin:36px auto;padding:0 24px;font-family:Arial,sans-serif;color:#273548;font-size:14px}
        h1{font-size:28px;margin-bottom:8px}.details{line-height:1.7;margin:16px 0 24px}table{width:100%;border-collapse:collapse}th,td{padding:12px;border-bottom:1px solid #e5e7eb;text-align:left}th{background:#f5f6f8}.numeric{text-align:right}tfoot{font-weight:bold}footer{margin-top:24px;font-size:11px;color:#747a89}tr{break-inside:avoid}@media print{body{margin:0;padding:0}thead{display:table-header-group}}
        </style></head><body>${companyDocumentHeader(data.company)}<h1>Repair receipt</h1><strong>${escapeDocumentText(job.jobNumber)}</strong><div class="details">Customer: ${escapeDocumentText(job.customerName)}<br>Asset: ${escapeDocumentText(job.assetName)}</div><table><thead><tr><th>Assigned part</th><th class="numeric">Quantity</th><th class="numeric">Amount</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No parts assigned.</td></tr>'}</tbody><tfoot><tr><td colspan="2">Parts total</td><td class="numeric">Rs. ${total.toFixed(2)}</td></tr></tfoot></table><footer>Generated ${escapeDocumentText(new Date().toLocaleString())}</footer></body></html>`);
      receiptWindow.document.close();
      await waitForDocumentImages(receiptWindow.document);
      if (!receiptWindow.closed) { receiptWindow.focus(); receiptWindow.print(); }
    } catch (err) {
      receiptWindow.close();
      setError(getApiError(err, 'Unable to prepare the receipt. Please try again.'));
    } finally { setPrinting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#101012]/45 p-4">
      <section className="w-full max-w-lg rounded-[22px] border border-[#e7e7e9] bg-[#fbfbfc] p-6 shadow-2xl" style={{ maxHeight: 'calc(100dvh - 32px)', overflowY: 'auto' }} role="dialog" aria-modal="true" aria-labelledby="repair-receipt-title">
        {company && <div dangerouslySetInnerHTML={{ __html: companyDocumentHeader(company) }} />}
        <div className="flex items-start justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#777e8e]">Repair receipt</p><h2 id="repair-receipt-title" className="mt-2 text-xl font-bold text-[#252932]">{job.jobNumber}</h2><p className="mt-1 text-sm text-[#747a89]">{job.customerName} · {job.assetName}</p></div>
          <button className="grid h-8 w-8 place-items-center rounded-lg text-[#767c89] hover:bg-[#eeeeef]" type="button" onClick={onClose} aria-label="Close receipt">×</button>
        </div>
        <div className="mt-6 rounded-xl border border-[#e7e7e9] bg-white p-4">
          <p className="text-xs font-semibold text-[#555b68]">Assigned parts</p>
          {parts.length ? <div className="mt-3 divide-y divide-[#f0f1f4]">{parts.map((part) => <div className="flex justify-between py-2 text-sm" key={part.stockId}><span>{part.name} × {part.quantity}</span><span className="font-semibold">Rs. {part.total.toFixed(2)}</span></div>)}</div> : <p className="mt-3 text-sm text-[#7a8090]">No parts assigned.</p>}
          <div className="mt-3 flex justify-between border-t border-[#eceef1] pt-3 text-sm font-bold"><span>Parts total</span><span>Rs. {total.toFixed(2)}</span></div>
        </div>
        {error && <p role="alert" style={{ marginTop: 16, color: '#a03b34', fontSize: 13 }}>{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="rounded-xl px-4 py-2.5 text-xs font-semibold text-[#555b68] hover:bg-[#f0f0f2]" type="button" onClick={onClose}>Close</button>
          <button className="rounded-xl bg-[#171719] px-4 py-2.5 text-xs font-semibold text-white" type="button" disabled={printing} onClick={() => void printReceipt()}>{printing ? 'Preparing receipt…' : 'Print receipt'}</button>
        </div>
      </section>
    </div>
  );
}

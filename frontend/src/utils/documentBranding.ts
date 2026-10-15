import type { CompanyProfile } from '../types/company';

export function escapeDocumentText(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

// Only escaped text and restricted raster data URLs enter printable HTML.
export function companyDocumentHeader(company: CompanyProfile): string {
  if (!company.reportBranding) return '';
  const logo = company.logo && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(company.logo)
    ? `<img src="${company.logo}" alt="${escapeDocumentText(company.name)} logo" style="width:72px;height:72px;object-fit:contain;flex-shrink:0" />`
    : '';
  return `<header data-company-branding style="display:flex;align-items:center;gap:18px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #e5e7eb;break-inside:avoid;color:#273548">
    ${logo}<div style="min-width:0;overflow-wrap:anywhere">
      <strong style="display:block;font-size:22px;line-height:1.3">${escapeDocumentText(company.name)}</strong>
      ${company.address ? `<p style="margin:7px 0 0;font-size:13px;line-height:1.5;white-space:pre-line">${escapeDocumentText(company.address)}</p>` : ''}
      ${company.phone ? `<p style="margin:6px 0 0;font-size:13px">Telephone: ${escapeDocumentText(company.phone)}</p>` : ''}
    </div>
  </header>`;
}

export async function waitForDocumentImages(document: Document) {
  await Promise.all(Array.from(document.images).map((image) => image.decode().catch(() => undefined)));
}

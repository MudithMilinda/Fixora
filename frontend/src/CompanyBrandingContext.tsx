import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import api from './api/axios';
import type { CompanyProfile } from './types/company';

const CompanyBrandingContext = createContext<{
  company: CompanyProfile | null;
  updateCompany: (company: CompanyProfile) => void;
} | null>(null);

export function CompanyBrandingProvider({ companyId, children }: { companyId?: string | null; children: ReactNode }) {
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const revision = useRef(0);

  const updateCompany = useCallback((saved: CompanyProfile) => {
    if (saved.id !== companyId) return;
    revision.current++;
    setCompany(saved);
  }, [companyId]);

  useEffect(() => {
    if (!companyId) return;
    const controller = new AbortController();
    const startedAt = revision.current;
    api.get<{ company: CompanyProfile }>('/company-settings', { signal: controller.signal })
      .then(({ data }) => {
        // A settings save takes precedence over an older initial request.
        if (!controller.signal.aborted && revision.current === startedAt && data.company.id === companyId) {
          setCompany(data.company);
        }
      })
      .catch(() => { /* Keep the default brand if company settings cannot be loaded. */ });
    return () => controller.abort();
  }, [companyId]);

  useEffect(() => {
    // Keep the browser tab identity in sync with the saved company logo.
    // The logo is stored as a validated image data URL, which browsers can
    // also use directly as a favicon.
    let favicon = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.append(favicon);
    }
    const logo = company?.logo;
    favicon.href = logo || '/favicon.svg';
    favicon.type = logo?.startsWith('data:image/png') ? 'image/png'
      : logo?.startsWith('data:image/jpeg') ? 'image/jpeg'
        : logo?.startsWith('data:image/webp') ? 'image/webp'
          : 'image/svg+xml';
  }, [company?.logo]);

  useEffect(() => {
    const name = company?.name?.trim() || 'Fixora';
    const description = 'Repair & Inventory Management';
    document.title = `${name} | ${description}`;
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
      'content',
      `${name} ${description.toLowerCase()} system`,
    );
  }, [company?.name]);

  return <CompanyBrandingContext.Provider value={{ company: company?.id === companyId ? company : null, updateCompany }}>{children}</CompanyBrandingContext.Provider>;
}

export function useCompanyBranding() {
  const context = useContext(CompanyBrandingContext);
  if (!context) throw new Error('Company branding requires an authenticated company provider.');
  return context;
}

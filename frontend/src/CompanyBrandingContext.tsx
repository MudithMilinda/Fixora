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

  return <CompanyBrandingContext.Provider value={{ company: company?.id === companyId ? company : null, updateCompany }}>{children}</CompanyBrandingContext.Provider>;
}

export function useCompanyBranding() {
  const context = useContext(CompanyBrandingContext);
  if (!context) throw new Error('Company branding requires an authenticated company provider.');
  return context;
}

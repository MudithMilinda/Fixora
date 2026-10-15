import { useEffect, useRef, useState, type FormEvent } from 'react';
import Sidebar from '../Components/Sidebar';
import Toast from '../Components/Toast';
import api, { getApiError } from '../api/axios';
import type { AuthUser } from '../types/auth';
import type { CompanyProfile } from '../types/company';
import { useCompanyBranding } from '../CompanyBrandingContext';
import './CompanySettingsPage.css';

export default function CompanySettingsPage(props: {
  user: AuthUser;
  onGoDashboard: () => void;
  onOpenRepairs: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}) {
  const { updateCompany } = useCompanyBranding();
  const [saved, setSaved] = useState<CompanyProfile | null>(null);
  const [draft, setDraft] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const uploadVersion = useRef(0);
  const saveInFlight = useRef(false);
  const dirty = !!draft && JSON.stringify(draft) !== JSON.stringify(saved);
  const busy = saving || uploading;

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const { data } = await api.get<{ company: CompanyProfile }>('/company-settings');
      setSaved(data.company);
      setDraft(data.company);
      updateCompany(data.company);
    } catch (error) { setLoadError(getApiError(error, 'Unable to load company settings. Please try again.')); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); return () => { uploadVersion.current++; }; }, []);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function update<K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : current);
  }

  async function uploadLogo(file?: File) {
    if (!file || busy) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
      setToast({ message: 'Choose a PNG, JPEG, or WebP image up to 1 MB.', tone: 'error' });
      return;
    }
    const version = ++uploadVersion.current;
    setUploading(true);
    try {
      const logo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read image.'));
        reader.readAsDataURL(file);
      });
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => img.width && img.height ? resolve() : reject(new Error('Invalid image.'));
        img.onerror = () => reject(new Error('Invalid image.'));
        img.src = logo;
      });
      if (version === uploadVersion.current) update('logo', logo);
    } catch {
      if (version === uploadVersion.current) setToast({ message: 'This image could not be read. Choose another logo.', tone: 'error' });
    } finally { if (version === uploadVersion.current) setUploading(false); }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !dirty || busy || saveInFlight.current) return;
    saveInFlight.current = true;
    setSaving(true);
    try {
      const { data } = await api.put<{ company: CompanyProfile }>('/company-settings', draft);
      setSaved(data.company);
      setDraft(data.company);
      updateCompany(data.company);
      setToast({ message: 'Company settings saved.', tone: 'success' });
    } catch (error) { setToast({ message: getApiError(error, 'Unable to save company settings. Please try again.'), tone: 'error' }); }
    finally { setSaving(false); saveInFlight.current = false; }
  }

  return (
    <div className="company-settings-shell">
      {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
      <Sidebar {...props} activePage="companySettings" />
      <main className="company-settings-main">
        <div className="company-settings-page-heading">
          <p className="company-settings-eyebrow">Settings</p>
          <h1>Company settings</h1>
          <p>Manage your company identity, contact details, and document branding.</p>
        </div>
        {loading ? <div className="company-settings-state" role="status">Loading company settings…</div>
          : loadError ? <div className="company-settings-state" role="alert"><p>{loadError}</p><button type="button" onClick={() => void load()}>Try again</button></div>
          : draft && (
            <div className="company-settings-card">
              <div className="company-settings-cover" aria-hidden="true"><span>YOUR COMPANY · YOUR IDENTITY</span></div>
              <div className="company-settings-identity">
                <CompanyLogo company={draft} large />
                <div><h2>{draft.name || 'Your company'}</h2><p>{draft.website || 'Company profile'} <span className="company-settings-code">{draft.code}</span></p></div>
              </div>
              <form className="company-settings-form" onSubmit={save}>
                <div className="company-settings-form-heading">
                  <div><h2>Company profile</h2><p>Update your company photo and details here.</p></div>
                </div>
                <fieldset disabled={busy}>
                  <div className="company-settings-row">
                    <div className="company-settings-row-label"><h3>Company details</h3><p>Your company name and website.</p></div>
                    <div className="company-settings-fields">
                      <label>Company name<input value={draft.name} maxLength={160} required onChange={(event) => update('name', event.target.value)} autoComplete="organization" /></label>
                      <label>Website <span>(optional)</span><input type="url" value={draft.website} maxLength={500} onChange={(event) => update('website', event.target.value)} placeholder="https://yourcompany.com" autoComplete="url" /></label>
                    </div>
                  </div>
                  <div className="company-settings-row">
                    <div className="company-settings-row-label"><h3>Company logo</h3><p>Upload your logo for your company profile and reports.</p></div>
                    <div className="company-settings-logo-controls">
                      <div><CompanyLogo company={draft} />{draft.logo && <button type="button" className="company-settings-remove" onClick={() => update('logo', null)}>Remove logo</button>}</div>
                      <div className={`company-settings-upload ${dragging ? 'is-dragging' : ''}`}
                        onDragOver={(event) => { event.preventDefault(); if (!busy) setDragging(true); }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={(event) => { event.preventDefault(); setDragging(false); void uploadLogo(event.dataTransfer.files[0]); }}>
                        <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { void uploadLogo(event.target.files?.[0]); event.target.value = ''; }} />
                        <button type="button" onClick={() => fileInput.current?.click()} disabled={busy}>
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M7 17H5a4 4 0 0 1-1-7.9A7 7 0 0 1 18 8a4.5 4.5 0 0 1 1 9h-2M12 21V11m-4 4 4-4 4 4" /></svg>
                          <span>{uploading ? 'Reading image…' : <><strong>Click to upload</strong> or drag and drop</>}</span>
                          <small>PNG, JPG or WebP · Up to 1 MB</small>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="company-settings-row">
                    <div className="company-settings-row-label"><h3>Contact information</h3><p>How customers can reach your company.</p></div>
                    <div className="company-settings-fields">
                      <div className="company-settings-contact-grid">
                        <label>Email<input type="email" value={draft.email} maxLength={254} onChange={(event) => update('email', event.target.value)} placeholder="hello@company.com" autoComplete="email" /></label>
                        <label>Phone<input type="tel" value={draft.phone} maxLength={40} onChange={(event) => update('phone', event.target.value)} placeholder="+94 …" autoComplete="tel" /></label>
                      </div>
                      <label>Address<textarea value={draft.address} maxLength={1000} rows={3} onChange={(event) => update('address', event.target.value)} placeholder="Company address" autoComplete="street-address" /></label>
                    </div>
                  </div>
                  <div className="company-settings-row">
                    <div className="company-settings-row-label"><h3>Branding</h3><p>Add your company identity to printed documents.</p></div>
                    <label className="company-settings-check"><input type="checkbox" checked={draft.reportBranding} onChange={(event) => update('reportBranding', event.target.checked)} /><span><strong>Reports &amp; invoices</strong><small>Include the company name, logo, address, and telephone number on reports, invoices, and receipts.</small></span></label>
                  </div>
                </fieldset>
                <div className="company-settings-bottom"><span>{dirty ? 'You have unsaved changes.' : 'Company settings are up to date.'}</span><button className="company-settings-primary" type="submit" disabled={!dirty || busy}>{saving ? 'Saving…' : 'Save changes'}</button></div>
              </form>
            </div>
          )}
      </main>
    </div>
  );
}

function CompanyLogo({ company, large = false }: { company: CompanyProfile; large?: boolean }) {
  return <div className={`company-settings-logo ${large ? 'is-large' : ''}`}>{company.logo ? <img src={company.logo} alt={`${company.name} logo`} /> : <span>{company.name.trim().split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'CO'}</span>}</div>;
}


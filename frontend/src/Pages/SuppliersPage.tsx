import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import Sidebar from '../Components/Sidebar'
import Toast from '../Components/Toast'
import type { AuthUser } from '../types/auth'
import api, { getApiError } from '../api/axios'

type Supplier = { id: string; name: string; phones: string[]; email: string | null; address: string | null }

export default function SuppliersPage({ user, onGoDashboard, onOpenRepairs, onOpenHistory, onOpenProfile, onSignOut }: { user: AuthUser; onGoDashboard: () => void; onOpenRepairs: () => void; onOpenHistory: () => void; onOpenProfile: () => void; onSignOut: () => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [deleting, setDeleting] = useState<Supplier | null>(null)
  const [phoneInputs, setPhoneInputs] = useState<string[]>([''])
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  async function load() {
    setIsLoading(true)
    try { const { data } = await api.get('/suppliers'); setSuppliers(data.suppliers) } catch (error) { setToast({ message: getApiError(error, 'Unable to load suppliers.'), tone: 'error' }) } finally { setIsLoading(false) }
  }
  useEffect(() => { void load() }, [])

  function openCreate() { setPhoneInputs(['']); setEditing(null); setIsCreateOpen(true) }
  function openEdit(supplier: Supplier) { setPhoneInputs(supplier.phones.length ? [...supplier.phones] : ['']); setIsCreateOpen(false); setEditing(supplier) }
  function closeForm() { setIsCreateOpen(false); setEditing(null); setPhoneInputs(['']) }

  async function saveSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = { name: form.get('name'), phones: phoneInputs, email: form.get('email'), address: form.get('address') }
    try {
      if (editing) await api.patch(`/suppliers/${editing.id}`, payload)
      else await api.post('/suppliers', payload)
      const wasEditing = Boolean(editing)
      closeForm()
      setToast({ message: wasEditing ? 'Supplier updated.' : 'Supplier created.', tone: 'success' })
      await load()
    } catch (error) { setToast({ message: getApiError(error, 'Unable to save supplier.'), tone: 'error' }) }
  }

  async function deleteSupplier() {
    if (!deleting) return
    try { await api.delete(`/suppliers/${deleting.id}`); setDeleting(null); setToast({ message: 'Supplier deleted.', tone: 'success' }); await load() } catch (error) { setToast({ message: getApiError(error, 'Unable to delete supplier.'), tone: 'error' }) }
  }

  const filtered = suppliers.filter((supplier) => `${supplier.name} ${supplier.phones.join(' ')} ${supplier.email || ''}`.toLowerCase().includes(search.toLowerCase()))
  const modalSupplier = editing

  return <div className="flex h-dvh w-screen overflow-hidden bg-[#f4f4f5] font-sans text-[#262b3a]">
    {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    <Sidebar user={user} activePage="suppliers" onGoDashboard={onGoDashboard} onOpenRepairs={onOpenRepairs} onOpenHistory={onOpenHistory} onOpenProfile={onOpenProfile} onSignOut={onSignOut} />
    <main className="flex-1 overflow-y-auto bg-[#f5f5f7] p-6"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#7a8090]">Management</p><h1 className="mt-2 text-3xl font-bold">Suppliers</h1><p className="mt-1 text-sm text-[#747a89]">Manage suppliers available for purchase requests and procurement.</p></div><button className="h-11 rounded-xl bg-[#171719] px-4 text-sm font-semibold text-white" type="button" onClick={openCreate}>+ Add supplier</button></header><form className="mt-5 flex max-w-md items-center gap-2.5 rounded-xl border border-[#e9e9ee] bg-white px-3.5 py-2.5 text-sm text-[#878c99] shadow-sm" onSubmit={(event) => event.preventDefault()}><span aria-hidden="true">⌕</span><input className="min-w-0 flex-1 bg-transparent font-normal outline-none placeholder:text-[#9ca0aa]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search supplier or phone…" aria-label="Search suppliers" /></form><section className="mt-6 rounded-[18px] border border-[#eceaf2] bg-white p-5 shadow-sm"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-[11px] uppercase text-[#777e8e]"><tr><th className="pb-3">Supplier</th><th className="pb-3">Phone numbers</th><th className="pb-3">Email</th><th className="pb-3 text-right">Actions</th></tr></thead><tbody>{isLoading ? <tr><td colSpan={4} className="py-12 text-center text-[#747a89]">Loading suppliers…</td></tr> : filtered.length ? filtered.map((supplier) => <tr className="border-t border-[#f0f1f4]" key={supplier.id}><td className="py-4 font-semibold">{supplier.name}{supplier.address && <p className="mt-1 max-w-[260px] truncate text-xs font-normal text-[#7a8090]">{supplier.address}</p>}</td><td className="py-4 text-[#747a89]">{supplier.phones.length ? supplier.phones.map((phone) => <p key={phone}>{phone}</p>) : '—'}</td><td className="py-4 text-[#747a89]">{supplier.email || '—'}</td><td className="py-4 text-right"><div className="flex justify-end gap-1.5"><IconButton label={`Edit ${supplier.name}`} onClick={() => openEdit(supplier)}><path d="m15.5 5.5 3 3M4 20l4.5-1L19.3 8.2a2.12 2.12 0 0 0-3-3L5.5 16z" /></IconButton><IconButton label={`Delete ${supplier.name}`} onClick={() => setDeleting(supplier)}><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3" /></IconButton></div></td></tr>) : <tr><td colSpan={4} className="py-12 text-center text-[#747a89]">No suppliers found.</td></tr>}</tbody></table></section></main>
    {(isCreateOpen || modalSupplier) && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form className="max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded-[20px] bg-white p-6 shadow-2xl" onSubmit={saveSupplier}><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7a8090]">Management</p><h2 className="mt-2 text-xl font-bold">{modalSupplier ? 'Edit supplier' : 'Add supplier'}</h2></div><button className="text-lg text-[#747a89]" type="button" aria-label="Close" onClick={closeForm}>×</button></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Supplier name" name="name" defaultValue={modalSupplier?.name} required /><Field label="Email" name="email" type="email" defaultValue={modalSupplier?.email || ''} /><div className="sm:col-span-2"><p className="text-xs font-normal text-[#4b5260]">Phone numbers <span className="text-[#8a8f9b]">(optional)</span></p><div className="mt-2 grid gap-2">{phoneInputs.map((phone, index) => <div className="flex gap-2" key={`${index}-${phone}`}><input className="h-11 min-w-0 flex-1 rounded-xl border border-[#e2e3e7] px-3 text-sm font-normal outline-none focus:border-[#171719]" value={phone} onChange={(event) => setPhoneInputs((current) => current.map((value, inputIndex) => inputIndex === index ? event.target.value : value))} placeholder="Phone number" inputMode="tel" />{phoneInputs.length > 1 && <button className="h-11 rounded-xl border border-[#e2e3e7] px-3 text-sm text-[#646b7a]" type="button" onClick={() => setPhoneInputs((current) => current.filter((_, inputIndex) => inputIndex !== index))}>Remove</button>}</div>)}</div><button className="mt-3 text-xs font-semibold text-[#515664]" type="button" onClick={() => setPhoneInputs((current) => [...current, ''])}>+ Add another number</button></div><label className="text-xs font-normal text-[#4b5260] sm:col-span-2">Address <span className="text-[#8a8f9b]">(optional)</span><textarea className="mt-2 min-h-24 w-full rounded-xl border border-[#e2e3e7] p-3 text-sm font-normal outline-none focus:border-[#171719]" name="address" defaultValue={modalSupplier?.address || ''} /></label></div><div className="mt-6 flex justify-end gap-3"><button className="px-2 text-sm text-[#515664]" type="button" onClick={closeForm}>Cancel</button><button className="rounded-xl bg-[#171719] px-4 py-2.5 text-sm font-semibold text-white">{modalSupplier ? 'Save changes' : 'Create supplier'}</button></div></form></div>}
    {deleting && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><section className="w-full max-w-sm rounded-[20px] border border-[#e7e7e9] bg-white p-6 shadow-2xl"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#bb4941]">Delete supplier</p><h2 className="mt-2 text-xl font-bold">Delete {deleting.name}?</h2><p className="mt-2 text-sm text-[#747a89]">This supplier will be permanently removed.</p><div className="mt-6 flex justify-end gap-3"><button className="px-4 py-2.5 text-xs font-semibold" type="button" onClick={() => setDeleting(null)}>Cancel</button><button className="rounded-xl bg-[#bd4940] px-4 py-2.5 text-xs font-semibold text-white" type="button" onClick={() => void deleteSupplier()}>Delete supplier</button></div></section></div>}
  </div>
}

function Field({ label, name, defaultValue, type = 'text', required = false }: { label: string; name: string; defaultValue?: string; type?: string; required?: boolean }) { return <label className="text-xs font-normal text-[#4b5260]">{label}<input className="mt-2 h-11 w-full rounded-xl border border-[#e2e3e7] px-3 text-sm font-normal outline-none focus:border-[#171719]" name={name} type={type} defaultValue={defaultValue} required={required} /></label> }
function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) { return <button type="button" aria-label={label} title={label} onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#dfe1e6] bg-white text-[#646b7a] transition hover:border-[#bfc4cd] hover:bg-[#f7f7f8] hover:text-[#262b3a]"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true">{children}</svg></button> }

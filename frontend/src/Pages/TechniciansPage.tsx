import { useEffect, useState, type FormEvent } from 'react';
import Sidebar from '../Components/Sidebar';
import Toast from '../Components/Toast';
import TechnicianModal, { type Technician } from '../Components/TechnicianModal';
import type { AuthUser } from '../types/auth';
import api, { getApiError } from '../api/axios';

type ToastState = { message: string; tone: 'success' | 'error' };

export default function TechniciansPage(props: { user: AuthUser; onGoDashboard: () => void; onOpenRepairs: () => void; onOpenHistory: () => void; onOpenProfile: () => void; onSignOut: () => void }) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Technician | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Technician | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  async function load() { setLoading(true); try { const { data } = await api.get('/technicians'); setTechnicians(data.technicians); } catch (error) { setToast({ message: getApiError(error, 'Unable to load technicians.'), tone: 'error' }); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  const visible = technicians.filter((technician) => `${technician.name} ${technician.phone || ''} ${technician.specialization || ''} ${technician.address || ''}`.toLowerCase().includes(search.toLowerCase()));
  const closeForm = () => { setCreating(false); setEditing(null); };

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const payload = { name: form.get('name'), phone: form.get('phone'), specialization: form.get('specialization'), address: form.get('address'), isActive: form.get('isActive') === 'on' };
    try { if (editing) await api.patch(`/technicians/${editing.id}`, payload); else await api.post('/technicians', payload); const wasEditing = !!editing; closeForm(); setToast({ message: wasEditing ? 'Technician updated.' : 'Technician added.', tone: 'success' }); await load(); } catch (error) { setToast({ message: getApiError(error, 'Unable to save technician.'), tone: 'error' }); }
  }
  async function remove() { if (!deleting) return; try { await api.delete(`/technicians/${deleting.id}`); setDeleting(null); setToast({ message: 'Technician deleted.', tone: 'success' }); await load(); } catch (error) { setToast({ message: getApiError(error, 'Unable to delete technician.'), tone: 'error' }); } }

  return <div className="flex h-dvh overflow-hidden bg-[#f5f5f7] font-sans text-[#262b3a] max-[1100px]:h-auto max-[1100px]:flex-col">
    <Sidebar {...props} activePage="technicians" />
    {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    <main className="min-w-0 flex-1 overflow-y-auto p-7 max-sm:p-[18px]"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#7a8090]">Management</p><h1 className="mt-2 text-[30px] font-bold tracking-[-.03em]">Technicians</h1><p className="mt-1.5 text-sm text-[#747a89]">Manage technicians available for assigning repair jobs.</p></div><button type="button" onClick={() => { setEditing(null); setCreating(true); }} className="h-10 rounded-[10px] bg-[#171719] px-4 text-xs font-semibold text-white transition hover:bg-[#2a2a2e]">+ Add technician</button></header>
      <section className="mt-6 rounded-[18px] border border-[#eceaf2] bg-white p-5 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold">Technician list</h2><p className="mt-1 text-xs text-[#747a89]">{visible.length} {visible.length === 1 ? 'technician' : 'technicians'} shown</p></div><label className="relative w-full max-w-[330px]"><span className="sr-only">Search technicians</span><svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89909d]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5" strokeLinecap="round"/></svg><input value={search} onChange={(event) => setSearch(event.target.value)} className="h-10 w-full rounded-[10px] border border-[#e1e3e8] bg-white pl-9 pr-3 text-sm outline-none placeholder:text-[#9ca0aa] focus:border-[#171719]" placeholder="Search technician…" /></label></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left text-[13px]"><thead className="text-[10px] font-semibold uppercase tracking-[.06em] text-[#777e8e]"><tr><th className="pb-3">Technician</th><th className="pb-3">Specialization</th><th className="pb-3">Phone</th><th className="pb-3">Status</th><th className="pb-3 text-right">Actions</th></tr></thead><tbody>{loading ? <tr><td colSpan={5} className="py-14 text-center text-[#747a89]">Loading technicians…</td></tr> : visible.length ? visible.map((technician) => <tr key={technician.id} className="border-t border-[#f0f1f4]"><td className="py-4"><strong className="block font-semibold">{technician.name}</strong>{technician.address && <small className="mt-0.5 block max-w-[250px] truncate text-xs font-normal text-[#7a8090]">{technician.address}</small>}</td><td className="py-4 text-[#596170]">{technician.specialization || '—'}</td><td className="py-4 text-[#596170]">{technician.phone || '—'}</td><td className="py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${technician.isActive ? 'bg-[#eaf8ef] text-[#247545]' : 'bg-[#f0f1f3] text-[#69717f]'}`}>{technician.isActive ? 'Active' : 'Inactive'}</span></td><td className="py-4 text-right"><div className="flex justify-end gap-2"><IconButton label={`Edit ${technician.name}`} onClick={() => { setCreating(false); setEditing(technician); }}><path d="m15.5 5.5 3 3M4 20l4.5-1L19.3 8.2a2.12 2.12 0 0 0-3-3L5.5 16z"/></IconButton><IconButton label={`Delete ${technician.name}`} onClick={() => setDeleting(technician)}><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3"/></IconButton></div></td></tr>) : <tr><td colSpan={5} className="py-14 text-center text-[#747a89]">{technicians.length ? 'No matching technicians.' : 'Add your first technician to begin.'}</td></tr>}</tbody></table></div></section>
    </main>
    {(creating || editing) && <TechnicianModal technician={editing} onClose={closeForm} onSubmit={save} />}
    {deleting && <div className="fixed inset-0 z-50 grid place-items-center bg-[#101012]/45 p-4"><section className="w-full max-w-sm rounded-[20px] border border-[#e7e7e9] bg-white p-6 shadow-2xl"><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#bb4941]">Delete technician</p><h2 className="mt-2 text-xl font-bold">Delete {deleting.name}?</h2><p className="mt-2 text-sm text-[#747a89]">This technician will no longer be available for assignment.</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setDeleting(null)} className="h-10 px-3 text-xs font-semibold text-[#565d6c]">Cancel</button><button type="button" onClick={() => void remove()} className="h-10 rounded-[10px] bg-[#bd4940] px-4 text-xs font-semibold text-white">Delete</button></div></section></div>}
  </div>;
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) { return <button type="button" aria-label={label} title={label} onClick={onClick} className="grid h-9 w-9 place-items-center rounded-[10px] border border-[#dfe1e6] bg-white text-[#646b7a] transition hover:bg-[#f7f7f8]"><svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg></button>; }

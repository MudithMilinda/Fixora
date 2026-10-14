import { useEffect, useState, type FormEvent } from 'react'
import Sidebar from '../Components/Sidebar'
import Toast from '../Components/Toast'
import type { AuthUser } from '../types/auth'
import api, { getApiError } from '../api/axios'

type Branch = { id: string; name: string; code: string; isActive: boolean; hasAccess: boolean; isCurrent: boolean }

export default function BranchesPage({ user, onGoDashboard, onOpenRepairs, onOpenHistory, onOpenProfile, onSignOut }: { user: AuthUser; onGoDashboard: () => void; onOpenRepairs: () => void; onOpenHistory: () => void; onOpenProfile: () => void; onSignOut: () => void }) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)

  const load = async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get('/branches')
      setBranches(data.branches)
    } catch (error) {
      setToast({ message: getApiError(error, 'Unable to load branches.'), tone: 'error' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setIsSaving(true)
    try {
      const { data } = await api.post('/branches', { name: form.get('name'), code: form.get('code') })
      await api.patch('/auth/active-branch', { branchId: data.branch.id })
      window.location.reload()
    } catch (error) {
      setToast({ message: getApiError(error, 'Unable to create the branch.'), tone: 'error' })
    } finally {
      setIsSaving(false)
    }
  }

  async function switchBranch(branch: Branch) {
    try {
      await api.patch('/auth/active-branch', { branchId: branch.id })
      window.location.reload()
    } catch (error) {
      setToast({ message: getApiError(error, 'Unable to switch branch.'), tone: 'error' })
    }
  }

  return <div className="flex h-dvh w-screen overflow-hidden bg-[#f4f4f5] font-sans text-[#262b3a]">
    {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    <Sidebar user={user} activePage="branches" onGoDashboard={onGoDashboard} onOpenRepairs={onOpenRepairs} onOpenHistory={onOpenHistory} onOpenProfile={onOpenProfile} onSignOut={onSignOut} />
    <main className="flex-1 overflow-y-auto bg-[#f5f5f7] p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#7a8090]">Management</p>
          <h1 className="mt-2 text-3xl font-bold">Branches</h1>
          <p className="mt-1 text-sm text-[#747a89]">Create and manage each location separately.</p>
        </div>
        <button className="h-11 rounded-xl bg-[#171719] px-4 text-sm font-semibold text-white" type="button" onClick={() => setIsModalOpen(true)}>+ Create branch</button>
      </header>

      <section className="mt-6 rounded-[18px] border border-[#eceaf2] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4"><div><h2 className="text-base font-semibold">All branches</h2><p className="mt-1 text-xs text-[#747a89]">Stock, requests and repair jobs are kept separately for every branch.</p></div><span className="rounded-full bg-[#f1f1f3] px-3 py-1 text-xs text-[#626875]">{branches.length} total</span></div>
        {isLoading ? <p className="py-12 text-center text-sm text-[#747a89]">Loading branches…</p> : branches.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{branches.map(branch => <article className="rounded-2xl border border-[#e8e9ed] bg-[#fcfcfd] p-4" key={branch.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-sm font-semibold">{branch.name}</h3><p className="mt-1 text-xs text-[#747a89]">Code: {branch.code}</p></div>{branch.isCurrent ? <span className="shrink-0 rounded-full bg-[#e9f6ee] px-2.5 py-1 text-[10px] font-semibold text-[#28724a]">Current</span> : <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${branch.isActive ? 'bg-[#f1f1f3] text-[#626875]' : 'bg-[#f9ebeb] text-[#a54a4a]'}`}>{branch.isActive ? 'Active' : 'Inactive'}</span>}</div><div className="mt-5">{branch.isCurrent ? <p className="text-xs text-[#747a89]">You are working in this branch.</p> : branch.hasAccess && branch.isActive ? <button className="rounded-lg border border-[#dfe1e6] bg-white px-3 py-2 text-xs font-semibold text-[#454a55] transition hover:border-[#bfc4cd]" type="button" onClick={() => void switchBranch(branch)}>Switch to branch</button> : <p className="text-xs text-[#747a89]">You do not have access to this branch.</p>}</div></article>)}</div> : <p className="py-12 text-center text-sm text-[#747a89]">No branches created yet.</p>}
      </section>
    </main>
    {isModalOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"><form className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-2xl" onSubmit={createBranch}><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#7a8090]">Management</p><h2 className="mt-2 text-xl font-bold">Create branch</h2><p className="mt-1 text-sm text-[#747a89]">A new, separate stock store and repair workspace will be ready for this location.</p></div><button className="text-lg text-[#747a89]" type="button" aria-label="Close" onClick={() => setIsModalOpen(false)}>×</button></div><div className="mt-5 grid gap-4"><label className="text-xs font-normal text-[#4b5260]">Branch name<input className="mt-2 h-11 w-full rounded-xl border border-[#e2e3e7] px-3 text-sm font-normal outline-none focus:border-[#171719]" name="name" placeholder="Kandy branch" required autoFocus /></label><label className="text-xs font-normal text-[#4b5260]">Branch code <span className="text-[#8a8f9b]">(optional)</span><input className="mt-2 h-11 w-full rounded-xl border border-[#e2e3e7] px-3 text-sm font-normal uppercase outline-none focus:border-[#171719]" name="code" placeholder="KDY" maxLength={32} /></label></div><div className="mt-6 flex justify-end gap-3"><button className="px-2 text-sm text-[#515664]" type="button" onClick={() => setIsModalOpen(false)}>Cancel</button><button className="rounded-xl bg-[#171719] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" disabled={isSaving}>{isSaving ? 'Creating…' : 'Create branch'}</button></div></form></div>}
  </div>
}

import { useEffect, useState, type FormEvent } from 'react'
import Sidebar from '../Components/Sidebar'
import AppSelect from '../Components/AppSelect'
import Toast from '../Components/Toast'
import api, { getApiError } from '../api/axios'
import type { AuthUser } from '../types/auth'

type Role = { id: string; name: string }
type Branch = { id: string; name: string; code: string }
type User = { id: string; fullName: string; email: string; role: string; customRoleId: string | null; branchIds: string[]; isActive: boolean }
type Props = { user: AuthUser; onGoDashboard: () => void; onOpenRepairs: () => void; onOpenHistory: () => void; onOpenProfile: () => void; onSignOut: () => void }
const input = 'mt-2 h-11 w-full rounded-xl border border-[#e2e3e7] bg-white px-3 text-sm outline-none focus:border-[#171719]'
const button = 'rounded-xl bg-[#171719] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50'

export default function UsersRolesPage(props: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranches, setSelectedBranches] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; tone: 'success' | 'error' } | null>(null)
  async function load() {
    try { const { data } = await api.get('/users'); setUsers(data.users); setRoles(data.roles); setBranches(data.branches) }
    catch (error) { setToast({ message: getApiError(error, 'Unable to load users and roles.'), tone: 'error' }) }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  async function createRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; setSaving(true)
    try { await api.post('/users/roles', { name: new FormData(form).get('name') }); form.reset(); await load(); setToast({ message: 'Role created.', tone: 'success' }) }
    catch (error) { setToast({ message: getApiError(error, 'Unable to create role.'), tone: 'error' }) }
    finally { setSaving(false) }
  }
  async function createUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = event.currentTarget; const values = new FormData(form); setSaving(true)
    try { await api.post('/users', { fullName: values.get('fullName'), email: values.get('email'), password: values.get('password'), roleId: values.get('roleId'), branchIds: selectedBranches }); form.reset(); setSelectedBranches([]); await load(); setToast({ message: 'User created.', tone: 'success' }) }
    catch (error) { setToast({ message: getApiError(error, 'Unable to create user.'), tone: 'error' }) }
    finally { setSaving(false) }
  }
  return <div className="flex h-dvh w-screen overflow-hidden bg-[#f4f4f5] font-sans text-[#262b3a]">
    {toast && <Toast {...toast} onDismiss={() => setToast(null)} />}
    <Sidebar {...props} activePage="usersRoles" />
    <main className="flex-1 overflow-y-auto bg-[#f5f5f7] p-6">
      <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#7a8090]">Management</p>
      <h1 className="mt-2 text-3xl font-bold">Users &amp; Roles</h1>
      <p className="mt-1 text-sm text-[#747a89]">Create roles and assign your team to branches.</p>
      <p className="mt-4 rounded-xl bg-[#fff7e8] p-3 text-sm text-[#795b21]">Roles identify team members. Role-based permissions are not configured yet.</p>
      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#e8e9ed] bg-white p-5"><h2 className="text-lg font-semibold">Create role</h2><form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={createRole}><label className="min-w-48 flex-1 text-xs text-[#4b5260]">Role name<input className={input} name="name" placeholder="Branch manager" minLength={2} maxLength={120} required /></label><button className={button} disabled={saving}>Create role</button></form><div className="mt-5 flex flex-wrap gap-2">{roles.map(role => <span key={role.id} className="rounded-full bg-[#f1f1f3] px-3 py-1 text-xs">{role.name}</span>)}{!roles.length && <p className="text-sm text-[#747a89]">No custom roles yet.</p>}</div></section>
        <section className="rounded-2xl border border-[#e8e9ed] bg-white p-5"><h2 className="text-lg font-semibold">Create user</h2><form className="mt-4 grid gap-4" onSubmit={createUser}>
          <label className="text-xs text-[#4b5260]">Full name<input className={input} name="fullName" minLength={2} maxLength={120} required /></label>
          <label className="text-xs text-[#4b5260]">Email<input className={input} name="email" type="email" maxLength={254} required /></label>
          <label className="text-xs text-[#4b5260]">Password <span className="text-[#747a89]">(12+ characters, uppercase, lowercase and number)</span><input className={input} name="password" type="password" minLength={12} maxLength={1024} autoComplete="new-password" required /></label>
          <label className="text-xs text-[#4b5260]">Role<AppSelect className="mt-2" aria-label="Role" name="roleId" defaultValue="" required><option value="" disabled>Select a role</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</AppSelect></label>
          <fieldset><legend className="text-xs text-[#4b5260]">Branch access</legend><div className="mt-2 flex flex-wrap gap-3">{branches.map(branch => <label key={branch.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selectedBranches.includes(branch.id)} onChange={e => setSelectedBranches(e.target.checked ? [...selectedBranches, branch.id] : selectedBranches.filter(id => id !== branch.id))} />{branch.name} ({branch.code})</label>)}</div><p className="mt-2 text-xs text-[#747a89]">The first selected branch is the user's starting branch.</p></fieldset>
          <div><button className={button} disabled={saving || !roles.length || !selectedBranches.length}>Create user</button></div>
        </form></section>
      </div>
      <section className="mt-5 rounded-2xl border border-[#e8e9ed] bg-white p-5"><h2 className="text-lg font-semibold">Team members</h2>{loading ? <p className="mt-4 text-sm text-[#747a89]">Loading…</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs text-[#747a89]"><tr><th className="pb-3">Name</th><th className="pb-3">Email</th><th className="pb-3">Role</th><th className="pb-3">Branches</th></tr></thead><tbody>{users.map(member => <tr key={member.id} className="border-t border-[#eee]"><td className="py-3">{member.fullName}</td><td>{member.email}</td><td>{member.customRoleId ? roles.find(role => role.id === member.customRoleId)?.name || 'Unknown role' : member.role === 'super_admin' ? 'Super Admin' : 'Administrator'}</td><td>{member.branchIds.map(id => branches.find(branch => branch.id === id)?.name).filter(Boolean).join(', ') || 'None'}</td></tr>)}</tbody></table></div>}</section>
    </main>
  </div>
}

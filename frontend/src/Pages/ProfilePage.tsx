import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import Sidebar from '../Components/Sidebar'
import Toast from '../Components/Toast'
import type { AuthUser } from '../types/auth'
import api, { getApiError } from '../api/axios'

function ProfilePage({ user, onGoDashboard, onOpenRepairs, onOpenHistory, onProfileUpdated, onSignOut }: { user: AuthUser, onGoDashboard: () => void, onOpenRepairs: () => void, onOpenHistory: () => void, onProfileUpdated: (user: AuthUser) => void, onSignOut: () => void }) {
    const [avatarUrl, setAvatarUrl] = useState('')
    const [toast, setToast] = useState<{ message: string, tone: 'success' | 'error' } | null>(null)
    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const avatarInput = useRef<HTMLInputElement>(null)
    const [firstName, ...remainingName] = user.fullName.trim().split(/\s+/)
    const lastName = remainingName.join(' ')
    const initials = user.fullName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'
    const roleLabel = user.customRoleId ? 'Team member' : user.role === 'super_admin' ? 'Super Admin' : 'Administrator'

    function showToast(message: string, tone: 'success' | 'error') {
        setToast({ message, tone })
    }

    useEffect(() => {
        if (!toast) return
        const timeout = window.setTimeout(() => setToast(null), 4000)
        return () => window.clearTimeout(timeout)
    }, [toast])

    function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0]
        if (!file) return
        if (!file.type.startsWith('image/')) {
            showToast('Please choose an image file.', 'error')
            return
        }
        setAvatarUrl(URL.createObjectURL(file))
        setToast(null)
    }

    async function saveProfile(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const form = new FormData(event.currentTarget)
        const fullName = `${String(form.get('firstName') || '').trim()} ${String(form.get('lastName') || '').trim()}`.trim()
        setToast(null)

        try {
            const { data } = await api.patch('/auth/profile', { fullName })
            onProfileUpdated(data.user)
            showToast('Profile saved successfully.', 'success')
        } catch (error) {
            showToast(getApiError(error, 'Unable to reach Fixora. Please try again shortly.'), 'error')
        }
    }

    async function changePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const formElement = event.currentTarget
        const form = new FormData(formElement)
        const currentPassword = String(form.get('currentPassword') || '')
        const newPassword = String(form.get('newPassword') || '')
        const confirmPassword = String(form.get('confirmPassword') || '')

        if (newPassword !== confirmPassword) {
            showToast('New password and confirmation do not match.', 'error')
            return
        }

        setIsChangingPassword(true)
        setToast(null)
        try {
            const { data } = await api.post('/auth/change-password', { currentPassword, newPassword })
            showToast(data.message || 'Your password has been updated.', 'success')
            formElement.reset()
        } catch (error) {
            showToast(getApiError(error, 'Unable to reach Fixora. Please try again shortly.'), 'error')
        } finally {
            setIsChangingPassword(false)
        }
    }

    return (
        <div className="flex h-dvh w-screen overflow-hidden bg-[#f4f4f5] font-sans text-[#262b3a] max-[1100px]:flex-col">
            {toast && <Toast message={toast.message} tone={toast.tone} onDismiss={() => setToast(null)} />}
        <Sidebar user={user} activePage="profile" onGoDashboard={onGoDashboard} onOpenRepairs={onOpenRepairs} onOpenHistory={onOpenHistory} onOpenProfile={() => undefined} onSignOut={onSignOut} />
            <main className="min-h-full flex-1 overflow-y-auto bg-[#f5f5f7] p-[20px_20px_32px_22px] max-[1100px]:p-4">
                <header className="mb-6 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-[clamp(1.8rem,2vw,2.25rem)] font-bold tracking-[-0.035em] text-[#22262d]">Profile settings</h1>
                        <p className="mt-1 text-sm text-[#747a89]">Manage your account details and security preferences.</p>
                    </div>
                </header>

                <form className="mx-auto max-w-[900px] space-y-5" onSubmit={saveProfile}>
                    <section className="rounded-[18px] border border-[#eceaf2] bg-white/75 p-5 shadow-sm sm:p-6">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <h2 className="text-base font-semibold text-[#242832]">Profile information</h2>
                                <p className="mt-1 text-xs text-[#747a89]">Update your personal details and profile photo.</p>
                            </div>
                            <button className="rounded-xl bg-[#171719] px-4 py-2.5 text-xs font-semibold text-white shadow-[0_10px_20px_rgba(23,23,25,0.12)] transition hover:bg-[#303034]" type="submit">Save changes</button>
                        </div>

                        <div className="mt-7 flex items-center gap-4 border-b border-[#eff0f3] pb-6">
                            <button className="relative h-16 w-16 shrink-0 rounded-full text-lg font-bold text-white focus:outline-none focus:ring-2 focus:ring-[#171719]/30 focus:ring-offset-2" type="button" onClick={() => avatarInput.current?.click()} aria-label="Change profile photo">
                                <span className="grid h-full w-full place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#d8c4aa] via-[#9d775c] to-[#40312c] ring-4 ring-[#f5f5f7]">
                                    {avatarUrl ? <img className="h-full w-full object-cover" src={avatarUrl} alt="Profile preview" /> : initials}
                                </span>
                                <span className="absolute -bottom-1 -right-1 z-10 grid h-6 w-6 place-items-center rounded-full bg-[#171719] text-white ring-2 ring-white">
                                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></svg>
                                </span>
                            </button>
                            <input ref={avatarInput} className="hidden" type="file" accept="image/*" onChange={handleAvatarChange} />
                            <div>
                                <p className="text-sm font-semibold text-[#252934]">{user.fullName}</p>
                                <p className="mt-0.5 text-xs text-[#747a89]">{roleLabel}</p>
                                <button className="mt-2 text-xs font-semibold text-[#55565d] underline decoration-[#bfc1c8] underline-offset-4 transition hover:text-[#171719]" type="button" onClick={() => avatarInput.current?.click()}>Change photo</button>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <Field label="First name" name="firstName" defaultValue={firstName} />
                            <Field label="Last name" name="lastName" defaultValue={lastName} />
                            <div className="sm:col-span-2"><Field label="Account email" name="email" type="email" defaultValue={user.email} readOnly /></div>
                            <div><label className="mb-2 block text-[11px] font-semibold text-[#4b5260]">Role</label><div className="flex h-11 items-center rounded-[10px] border border-[#e7e7e9] bg-[#f6f6f7] px-3 text-xs text-[#777b87]">{roleLabel}</div></div>
                        </div>
                    </section>
                </form>

                <form className="mx-auto mt-5 max-w-[900px] rounded-[18px] border border-[#eceaf2] bg-white/75 p-5 shadow-sm sm:p-6" onSubmit={changePassword}>
                    <h2 className="text-base font-semibold text-[#242832]">Change password</h2>
                    <p className="mt-1 text-xs text-[#747a89]">Use a strong, unique password to secure your account.</p>
                    <div className="mt-6 grid gap-4">
                        <Field label="Current password" name="currentPassword" type="password" placeholder="Enter current password" required />
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="New password" name="newPassword" type="password" placeholder="Enter new password" required />
                            <Field label="Confirm new password" name="confirmPassword" type="password" placeholder="Confirm new password" required />
                        </div>
                    </div>
                    <div className="mt-5 flex items-center justify-between gap-4">
                        <p className="text-xs text-[#747a89]">Use at least 12 characters with a mix of letters, numbers, and symbols.</p>
                        <button className="shrink-0 rounded-xl border border-[#dedfe3] bg-white px-4 py-2.5 text-xs font-semibold text-[#353840] transition hover:border-[#bfc1c8] disabled:cursor-not-allowed disabled:opacity-60" type="submit" disabled={isChangingPassword}>{isChangingPassword ? 'Updating…' : 'Update password'}</button>
                    </div>
                </form>
            </main>
        </div>
    )
}

function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
    return <label className="block text-[11px] font-semibold text-[#4b5260]">{label}<input className="mt-2 h-11 w-full rounded-[10px] border border-[#e7e7e9] bg-white px-3 text-xs font-normal text-[#252934] outline-none transition placeholder:text-[#a0a2aa] focus:border-[#171719] focus:ring-2 focus:ring-[#171719]/10" {...props} /></label>
}

export default ProfilePage

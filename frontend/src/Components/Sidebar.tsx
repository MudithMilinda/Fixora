import type { AuthUser } from '../types/auth'

function Sidebar({ user, activePage, onGoDashboard, onOpenProfile, onSignOut }: { user: AuthUser, activePage: 'dashboard' | 'profile', onGoDashboard: () => void, onOpenProfile: () => void, onSignOut: () => void }) {
    const initials = user.fullName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'
    const roleLabel = user.role === 'super_admin' ? 'Super Admin' : 'Administrator'
    return (
        <aside className="flex h-dvh w-[250px] shrink-0 flex-col border-r border-white/10 bg-[#101012] p-5 text-[#f5f5f5] max-[1100px]:h-auto max-[1100px]:w-full max-[1100px]:border-b max-[1100px]:border-r-0">
            <div className="mb-10 flex items-center gap-3 px-1 py-2">
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white text-sm font-bold text-[#171719]">F</span>
                <span className="text-[1.05rem] font-bold tracking-tight">Fixora</span>
            </div>

            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77777c]">Workspace</p>
            <nav aria-label="Main navigation">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === 'dashboard' ? 'bg-[#29292c] text-white ring-1 ring-inset ring-white/[0.06]' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={onGoDashboard} aria-current={activePage === 'dashboard' ? 'page' : undefined}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3.5 10.5 12 3.8l8.5 6.7" />
                        <path d="M5.5 9.5v10h13v-10M9 19.5v-6h6v6" />
                    </svg>
                    Dashboard
                </button>
            </nav>

            <div className="mt-auto flex items-center gap-1 border-t border-white/[0.08] pt-4">
                <button className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-white/30 ${activePage === 'profile' ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'}`} type="button" onClick={onOpenProfile} aria-label="Open profile" aria-current={activePage === 'profile' ? 'page' : undefined}>
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#d8c4aa] via-[#9d775c] to-[#40312c] text-[11px] font-bold text-white shadow-inner">{initials}</div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-white">{user.fullName}</p>
                        <p className="mt-0.5 text-[10px] text-[#929298]">{roleLabel}</p>
                    </div>
                </button>
                <button
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#9d9da3] transition hover:bg-white/[0.08] hover:text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                    type="button"
                    onClick={onSignOut}
                    aria-label="Sign out"
                    title="Sign out"
                >
                    <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" />
                        <path d="m14 8 4 4-4 4M18 12H9" />
                    </svg>
                </button>
            </div>
        </aside>
    )
}

export default Sidebar

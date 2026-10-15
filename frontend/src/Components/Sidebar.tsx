import type { AuthUser } from '../types/auth'
import { useCompanyBranding } from '../CompanyBrandingContext'

function Sidebar({ user, activePage, onGoDashboard, onOpenRepairs, onOpenHistory, onOpenInventory = () => { window.location.href = '/inventory' }, onOpenProfile, onSignOut }: { user: AuthUser, activePage: 'dashboard' | 'repairs' | 'history' | 'inventory' | 'items' | 'purchaseRequests' | 'suppliers' | 'branches' | 'profile' | 'companySettings', onGoDashboard: () => void, onOpenRepairs: () => void, onOpenHistory: () => void, onOpenInventory?: () => void, onOpenProfile: () => void, onSignOut: () => void }) {
    const initials = user.fullName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'
    const roleLabel = user.role === 'super_admin' ? 'Super Admin' : 'Administrator'
    const { company } = useCompanyBranding()
    const companyName = company?.name || 'Fixora'
    const companyInitials = companyName.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'F'
    return (
        <aside className="flex h-dvh w-[250px] shrink-0 flex-col overflow-y-auto border-r border-white/10 bg-[#101012] p-5 text-[#f5f5f5] max-[1100px]:h-auto max-[1100px]:w-full max-[1100px]:border-b max-[1100px]:border-r-0">
            <div className="mb-10 flex items-center gap-3 px-1 py-2" style={{ minWidth: 0 }}>
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white text-sm font-bold text-[#171719]" style={{ flexShrink: 0, overflow: 'hidden' }}>
                    {company?.logo
                        ? <img src={company.logo} alt={`${companyName} logo`} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
                        : companyInitials}
                </span>
                <span className="text-[1.05rem] font-bold tracking-tight" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{companyName}</span>
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

            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77777c]">Repair management</p>
            <nav aria-label="Repair management">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === 'repairs' ? 'bg-[#29292c] text-white ring-1 ring-inset ring-white/[0.06]' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={onOpenRepairs} aria-current={activePage === 'repairs' ? 'page' : undefined}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M7 3.5h7l3 3V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 20V5a1.5 1.5 0 0 1 1.5-1.5H7Z" />
                        <path d="M14 3.5V7h3M8 12h8M8 16h5" />
                    </svg>
                    Repair jobs
                </button>
                <button className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === 'history' ? 'bg-[#29292c] text-white ring-1 ring-inset ring-white/[0.06]' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={onOpenHistory} aria-current={activePage === 'history' ? 'page' : undefined}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.1-5.6" /><path d="M3.5 4.5v4h4M12 7.5V12l3 1.8" /></svg>
                    Repair history
                </button>
            </nav>
            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77777c]">Inventory</p>
            <nav aria-label="Inventory">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === 'items' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/items' }}>□ Items</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === 'inventory' ? 'bg-[#29292c] text-white ring-1 ring-inset ring-white/[0.06]' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={onOpenInventory} aria-current={activePage === 'inventory' ? 'page' : undefined}>▦ Stock store</button>
            </nav>
            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77777c]">Procurement</p>
            <nav aria-label="Procurement"><button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === 'purchaseRequests' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/purchase-requests' }}>▤ Purchase requests</button></nav>
            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77777c]">Management</p>
            <nav aria-label="Management">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === 'suppliers' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/suppliers' }}>♙ Suppliers</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === 'branches' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/branches' }}>⌘ Create branch</button>
            </nav>

            <p className="mb-3 mt-7 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77777c]">Settings</p>
            <nav aria-label="Settings" className="mb-5">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${activePage === 'companySettings' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/company-settings' }} aria-current={activePage === 'companySettings' ? 'page' : undefined}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 21V5l8-3v19M12 8h8v13M2 21h20M7 7h2M7 11h2M7 15h2M15 12h2M15 16h2" /></svg>
                    Company settings
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

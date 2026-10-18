import { useEffect, useState, type ReactNode } from 'react'
import type { AuthUser } from '../types/auth'
import { useCompanyBranding } from '../CompanyBrandingContext'

function SidebarSection({ title, icon, active, children }: { title: string; icon: ReactNode; active: boolean; children: ReactNode }) {
    const [open, setOpen] = useState(active)
    useEffect(() => { if (active) setOpen(true) }, [active])
    const menuId = `sidebar-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`
    return <>
        <button className={`mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${open ? 'text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(value => !value)}>
            <span className="grid h-[18px] w-[18px] shrink-0 place-items-center" aria-hidden="true">{icon}</span>
            <span className="min-w-0 flex-1 whitespace-nowrap">{title}</span>
            <svg className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <nav id={menuId} aria-label={title} hidden={!open} className="ml-[21px] border-l border-white/10 pl-3">{children}</nav>
    </>
}

function Sidebar({ user, activePage, onGoDashboard, onOpenRepairs, onOpenHistory, onOpenInventory = () => { window.location.href = '/inventory' }, onOpenProfile, onSignOut }: { user: AuthUser, activePage: 'dashboard' | 'repairs' | 'history' | 'inventory' | 'items' | 'purchaseRequests' | 'quotations' | 'payments' | 'paymentHistory' | 'purchaseOrders' | 'suppliers' | 'technicians' | 'branches' | 'profile' | 'companySettings' | 'usersRoles' | 'profitReport' | 'stockMovements' | 'stockValuation' | 'supplierPurchases', onGoDashboard: () => void, onOpenRepairs: () => void, onOpenHistory: () => void, onOpenInventory?: () => void, onOpenProfile: () => void, onSignOut: () => void }) {
    const initials = user.fullName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'U'
    const roleLabel = user.customRoleId ? 'Team member' : user.role === 'super_admin' ? 'Super Admin' : 'Administrator'
    const { company } = useCompanyBranding()
    const companyName = company?.name || 'Fixora'
    const companyInitials = companyName.trim().split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'F'
    return (
        <aside className="flex h-dvh w-[250px] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-[#101012] p-5 text-[#f5f5f5] max-[1100px]:h-auto max-[1100px]:w-full max-[1100px]:overflow-visible max-[1100px]:border-b max-[1100px]:border-r-0">
            <div className="mb-10 flex items-center gap-3 px-1 py-2" style={{ minWidth: 0 }}>
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white text-sm font-bold text-[#171719]" style={{ flexShrink: 0, overflow: 'hidden' }}>
                    {company?.logo
                        ? <img src={company.logo} alt={`${companyName} logo`} style={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }} />
                        : companyInitials}
                </span>
                <span className="text-[1.05rem] font-bold tracking-tight" style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{companyName}</span>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[1100px]:overflow-visible">
            <nav aria-label="Main navigation">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${activePage === 'dashboard' ? 'bg-[#29292c] text-white ring-1 ring-inset ring-white/[0.06]' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={onGoDashboard} aria-current={activePage === 'dashboard' ? 'page' : undefined}>
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3.5 10.5 12 3.8l8.5 6.7" />
                        <path d="M5.5 9.5v10h13v-10M9 19.5v-6h6v6" />
                    </svg>
                    Dashboard
                </button>
            </nav>

            <SidebarSection title="Repair management" active={activePage === 'repairs' || activePage === 'history'} icon={<svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a4 4 0 0 0-5.5 5.5L3.8 17.2a2.1 2.1 0 0 0 3 3l5.4-5.4a4 4 0 0 0 5.5-5.5l-2.5 2.5-3-3z" /></svg>}>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'repairs' ? 'bg-[#29292c] text-white ring-1 ring-inset ring-white/[0.06]' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={onOpenRepairs} aria-current={activePage === 'repairs' ? 'page' : undefined}>
                    Repair jobs
                </button>
                <button className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'history' ? 'bg-[#29292c] text-white ring-1 ring-inset ring-white/[0.06]' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={onOpenHistory} aria-current={activePage === 'history' ? 'page' : undefined}>
                    Repair history
                </button>
            </SidebarSection>
            <SidebarSection title="Inventory" active={activePage === 'items' || activePage === 'inventory' || activePage === 'stockMovements'} icon="▦">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'items' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/items' }}>Items</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'inventory' ? 'bg-[#29292c] text-white ring-1 ring-inset ring-white/[0.06]' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={onOpenInventory} aria-current={activePage === 'inventory' ? 'page' : undefined}>Stock store</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'stockMovements' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" aria-current={activePage === 'stockMovements' ? 'page' : undefined} onClick={() => { window.location.href = '/stock-movements' }}>Stock movements</button>
            </SidebarSection>
            <SidebarSection title="Procurement" active={activePage === 'purchaseRequests' || activePage === 'purchaseOrders'} icon="▤"><button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'purchaseRequests' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/purchase-requests' }}>Purchase requests</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'purchaseOrders' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" aria-current={activePage === 'purchaseOrders' ? 'page' : undefined} onClick={() => { window.location.href = '/purchase-orders' }}>Purchase orders</button>
            </SidebarSection>
            <SidebarSection title="Sales & billing" active={activePage === 'quotations' || activePage === 'payments' || activePage === 'paymentHistory'} icon="▧">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'quotations' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" aria-current={activePage === 'quotations' ? 'page' : undefined} onClick={() => { window.location.href = '/quotations' }}>Quotations</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'payments' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" aria-current={activePage === 'payments' ? 'page' : undefined} onClick={() => { window.location.href = '/payments' }}>Payments</button>
                <button className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'paymentHistory' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" aria-current={activePage === 'paymentHistory' ? 'page' : undefined} onClick={() => { window.location.href = '/payment-history' }}>Payment history</button>
            </SidebarSection>
            <SidebarSection title="Reports" active={activePage === 'profitReport' || activePage === 'stockValuation' || activePage === 'supplierPurchases'} icon={<svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 20h14M7 16v-4m5 4V5m5 11V9" /></svg>}>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'profitReport' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" aria-current={activePage === 'profitReport' ? 'page' : undefined} onClick={() => { window.location.href = '/profit-report' }}>Profit report</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'stockValuation' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" aria-current={activePage === 'stockValuation' ? 'page' : undefined} onClick={() => { window.location.href = '/stock-valuation' }}>Stock valuation</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'supplierPurchases' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" aria-current={activePage === 'supplierPurchases' ? 'page' : undefined} onClick={() => { window.location.href = '/supplier-purchases' }}>Supplier purchase history</button>
            </SidebarSection>
            <SidebarSection title="Management" active={activePage === 'suppliers' || activePage === 'technicians' || activePage === 'branches' || activePage === 'usersRoles'} icon="♙">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'suppliers' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/suppliers' }}>Suppliers</button>
                <button className={`mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'technicians' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/technicians' }}>Technicians</button>
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'branches' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/branches' }}>Create branch</button>
                {!user.customRoleId && <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal ${activePage === 'usersRoles' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/users-roles' }}>Users &amp; Roles</button>}
            </SidebarSection>

            <SidebarSection title="Settings" active={activePage === 'companySettings'} icon="⚙">
                <button className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-normal transition ${activePage === 'companySettings' ? 'bg-[#29292c] text-white' : 'text-[#b5b5ba] hover:bg-white/[0.06] hover:text-white'}`} type="button" onClick={() => { window.location.href = '/company-settings' }} aria-current={activePage === 'companySettings' ? 'page' : undefined}>
                    Company settings
                </button>
            </SidebarSection>
            </div>
            <div className="flex shrink-0 items-center gap-1 border-t border-white/[0.08] pt-4">
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

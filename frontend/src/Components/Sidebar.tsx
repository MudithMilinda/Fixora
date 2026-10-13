type NavItem = {
    label: string
    active?: boolean
    icon: 'dashboard' | 'projects' | 'calendar' | 'management' | 'settings' | 'notifications' | 'help' | 'performance' | 'payroll' | 'invoices' | 'employees' | 'recruitment' | 'salary' | 'compensation' | 'projectData' | 'announcements'
}

const mainNav: NavItem[] = [
    { label: 'Dashboard', active: true, icon: 'dashboard' },
    { label: 'Projects', icon: 'projects' },
    { label: 'Calendar', icon: 'calendar' },
    { label: 'Leave Management', icon: 'management' },
    { label: 'Settings', icon: 'settings' },
    { label: 'Notification', icon: 'notifications' },
    { label: 'Help & Center', icon: 'help' },
]

const managementNav: NavItem[] = [
    { label: 'Performance', icon: 'performance' },
    { label: 'Payroll', icon: 'payroll' },
    { label: 'Invoices', icon: 'invoices' },
    { label: 'Employees', icon: 'employees' },
    { label: 'Recruitment & Hiring', icon: 'recruitment' },
]

const listNav: NavItem[] = [
    { label: 'Salary Information', icon: 'salary' },
    { label: 'Compensation Breakdown', icon: 'compensation' },
    { label: 'Project-specific Data', icon: 'projectData' },
]

const navIcon = (icon: NavItem['icon']) => {
    const common = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

    switch (icon) {
        case 'dashboard':
            return <svg {...common}><path d="M4 13.5h7V20H4zm9-9h7v8h-7zm0 11h7V20h-7zm-9-6h7V4H4z" /></svg>
        case 'projects':
            return <svg {...common}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><path d="M8 9h8M8 13h8" /></svg>
        case 'calendar':
            return <svg {...common}><rect x="3.5" y="5" width="17" height="15" rx="2" /><path d="M8 3.5v3M16 3.5v3M3.5 9.5h17" /></svg>
        case 'management':
            return <svg {...common}><path d="M7 18V8m5 10V5m5 13v-7" /><path d="M3 18h18" /></svg>
        case 'settings':
            return <svg {...common}><circle cx="12" cy="12" r="3.5" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a1.5 1.5 0 1 1-2.1 2.1l-.1-.1A1 1 0 0 0 16.3 19a1 1 0 0 0-.6.9V20a1.5 1.5 0 1 1-3 0v-.1A1 1 0 0 0 12 19a1 1 0 0 0-1 .8l-.1.1a1.5 1.5 0 1 1-2.1-2.1l.1-.1A1 1 0 0 0 9.8 16a1 1 0 0 0-.9-.6H8.8a1.5 1.5 0 1 1 0-3h.1A1 1 0 0 0 9.8 12a1 1 0 0 0-.8-1l-.1-.1a1.5 1.5 0 1 1 2.1-2.1l.1.1A1 1 0 0 0 12 8.7a1 1 0 0 0 .6-.9V7.7a1.5 1.5 0 1 1 3 0v.1A1 1 0 0 0 16 8.7a1 1 0 0 0 1-.8l.1-.1a1.5 1.5 0 1 1 2.1 2.1l-.1.1A1 1 0 0 0 18.2 12c.2.3.5.6.6.9v.1A1.5 1.5 0 1 1 16.9 16.2l-.1-.1A1 1 0 0 0 16 15z" /></svg>
        case 'notifications':
            return <svg {...common}><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
        case 'help':
            return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 1 1 5.8 1c-.7 1.4-2.1 2-2.8 3.1-.3.4-.5.7-.5 1.9" /><path d="M12 17h.01" /></svg>
        case 'performance':
            return <svg {...common}><path d="M5 18V9m7 9V5m7 13v-7" /></svg>
        case 'payroll':
            return <svg {...common}><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" /><path d="M8 9.5h8M8 14.5h8" /></svg>
        case 'invoices':
            return <svg {...common}><path d="M7 4.5h7l4 4v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" /><path d="M14 4.5v4h4M8 12h8M8 16h8" /></svg>
        case 'employees':
            return <svg {...common}><path d="M16 19v-1a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v1" /><circle cx="10" cy="7" r="3" /><path d="M20 19v-1a4 4 0 0 0-3-3.87M15.5 4.5a3 3 0 0 1 0 5.8" /></svg>
        case 'recruitment':
            return <svg {...common}><circle cx="9" cy="8" r="3" /><path d="M4 18v-1a5 5 0 0 1 5-5h.5" /><path d="M17 19v-1a4 4 0 0 0-3-3.87M18 4.5a3 3 0 0 1 0 5.8" /></svg>
        case 'salary':
            return <svg {...common}><path d="M12 3v18M17 7.5A3.5 3.5 0 0 0 12 5a3.5 3.5 0 0 0 0 7 3.5 3.5 0 0 1 0 7 3.5 3.5 0 0 1-5-2.5" /></svg>
        case 'compensation':
            return <svg {...common}><path d="M4 18.5V7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v11" /><path d="M8 9h8M8 13h8M8 17h5" /></svg>
        case 'projectData':
            return <svg {...common}><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v13A2.5 2.5 0 0 1 17.5 21h-11A2.5 2.5 0 0 1 4 18.5z" /><path d="M8 7.5h8M8 12h8M8 16.5h5" /></svg>
        default:
            return null
    }
}

function Sidebar() {
    return (
        <aside className="w-[250px] shrink-0 bg-[#f7f7f8] border-r border-[#eceaf2] p-[18px_18px_14px] flex flex-col max-[1100px]:w-full max-[1100px]:border-r-0 max-[1100px]:border-b">
            <div className="flex items-center gap-3 mb-5 px-1 py-2">
                <div className="w-7 h-7 rounded-lg bg-[#171719] text-white grid place-items-center text-sm font-bold">F</div>
                <div className="flex-1 text-[1.05rem] font-bold text-[#1f1f24]">Fixora</div>
                <button className="w-8 h-8 rounded-full bg-[#e4e4e6] text-[#4a4a4a] grid place-items-center text-[11px] font-bold" aria-label="user profile">
                    <span>J</span>
                </button>
            </div>

            <nav className="flex flex-col gap-1.5">
                {mainNav.map((item) => (
                    <button
                        key={item.label}
                        className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[#5d6576] text-[0.96rem] transition hover:bg-[#eeeeef] hover:text-[#171719] ${item.active ? 'bg-[#e9e9eb] text-[#171719] font-semibold shadow-[inset_0_0_0_1px_rgba(23,23,25,0.08)]' : ''}`}
                    >
                        <span className="w-[18px] h-[18px] flex items-center justify-center text-current">{navIcon(item.icon)}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-5 mb-2 ml-2 text-[0.68rem] tracking-[0.12rem] text-[#8b8f9d] uppercase">TEAM MANAGEMENT</div>
            <nav className="flex flex-col gap-1.5">
                {managementNav.map((item) => (
                    <button key={item.label} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[#5d6576] text-[0.96rem] transition hover:bg-[#eeeeef] hover:text-[#171719]">
                        <span className="w-[18px] h-[18px] flex items-center justify-center text-current">{navIcon(item.icon)}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-5 mb-2 ml-2 text-[0.68rem] tracking-[0.12rem] text-[#8b8f9d] uppercase">LIST</div>
            <nav className="flex flex-col gap-1.5">
                {listNav.map((item) => (
                    <button key={item.label} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[#5d6576] text-[0.96rem] transition hover:bg-[#eeeeef] hover:text-[#171719]">
                        <span className="w-[18px] h-[18px] flex items-center justify-center text-current">{navIcon(item.icon)}</span>
                        <span>{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="mt-auto bg-gradient-to-b from-[#f6f6f7] to-[#ededee] border border-[#e3e3e5] rounded-[18px] p-4 flex flex-col gap-3">
                <div className="w-[38px] h-[38px] rounded-[12px] bg-[#e5e5e7] grid place-items-center text-lg">📣</div>
                <div>
                    <div className="text-[0.92rem] font-bold text-[#1f1f28] mb-1">Announcements</div>
                    <div className="text-[0.74rem] text-[#6d7380]">Stay updated with Fixora</div>
                </div>
                <button className="bg-white border border-[#e4e3ef] rounded-xl px-3 py-2.5 text-[#4d4d5d] font-semibold">Create Now</button>
                <div className="flex items-center justify-between text-[0.72rem] text-[#676f7d]">
                    <span>Read by:</span>
                    <div className="flex items-center">
                        <span className="w-[22px] h-[22px] rounded-full border-2 border-[#f8f8f9] -ml-1 first:ml-0 grid place-items-center text-[9px] font-bold text-white bg-gradient-to-br from-[#555559] to-[#252528]">R</span>
                        <span className="w-[22px] h-[22px] rounded-full border-2 border-[#f8f8f9] -ml-1 grid place-items-center text-[9px] font-bold text-[#45454a] bg-gradient-to-br from-[#e2e2e4] to-[#c7c7ca]">J</span>
                        <span className="w-[22px] h-[22px] rounded-full border-2 border-[#f8f8f9] -ml-1 grid place-items-center text-[9px] font-bold text-[#45454a] bg-gradient-to-br from-[#e2e2e4] to-[#c7c7ca]">+10</span>
                    </div>
                </div>
            </div>
        </aside>
    )
}

export default Sidebar

function Sidebar() {
    return (
        <aside className="flex h-dvh w-[250px] shrink-0 flex-col border-r border-white/10 bg-[#101012] p-5 text-[#f5f5f5] max-[1100px]:h-auto max-[1100px]:w-full max-[1100px]:border-b max-[1100px]:border-r-0">
            <div className="mb-10 flex items-center gap-3 px-1 py-2">
                <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-white text-sm font-bold text-[#171719]">F</span>
                <span className="text-[1.05rem] font-bold tracking-tight">Fixora</span>
            </div>

            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#77777c]">Workspace</p>
            <nav aria-label="Main navigation">
                <button className="flex w-full items-center gap-3 rounded-xl bg-[#29292c] px-3 py-3 text-left text-sm font-semibold text-white ring-1 ring-inset ring-white/[0.06]" type="button" aria-current="page">
                    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M3.5 10.5 12 3.8l8.5 6.7" />
                        <path d="M5.5 9.5v10h13v-10M9 19.5v-6h6v6" />
                    </svg>
                    Dashboard
                </button>
            </nav>
        </aside>
    )
}

export default Sidebar

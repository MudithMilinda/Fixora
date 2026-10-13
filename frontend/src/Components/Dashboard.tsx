const stats = [
    { title: 'Total Employees', value: '150', secondary: '50', accent: '#171719', label: 'Full Time Employees', total: '50', tone: 'neutral' },
    { title: 'Attendance Overview', value: '90%', secondary: '2%', accent: '#77777c', label: 'This month', total: '50', tone: 'neutral' },
    { title: 'Today Used Devices', value: '100%', secondary: '13', accent: '#3d3d41', label: 'Overall', total: '80', tone: 'neutral' },
]

const performance = [
    { name: 'Ahsan Tapadar', value: 98, color: '#171719' },
    { name: 'Koyes Ahmed', value: 92, color: '#3d3d41' },
    { name: 'Wash Bin M.', value: 90, color: '#5f5f64' },
    { name: 'Mir Muhsin', value: 88, color: '#818186' },
    { name: 'Turja Sen Das', value: 85, color: '#a5a5a9' },
]

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const employees = [
    { id: 'TUR671219', name: 'Ahsan Tapadar', email: 'ahsan.tur@mail.com', role: 'Sr UI/UX Designer', department: 'Team Projects', status: 'Full-time', color: 'green' },
    { id: 'TUR185103', name: 'Wash Bin M.', email: 'washi.tur@mail.com', role: 'Lead Product Designer', department: 'Head of Projects', status: 'Full-time', color: 'green' },
    { id: 'TUR15481', name: 'Koyes Ahmed', email: 'koyes.tur@mail.com', role: 'Sr UX Designer', department: 'Client & Team Work', status: 'Full-time', color: 'green' },
    { id: 'TUR061481', name: 'Turja Sen Das', email: 'turja.tur@mail.com', role: 'Mid UI Designer', department: 'Case Study', status: 'Freelance', color: 'yellow' },
]

function Dashboard() {
    return (
        <main className="flex-1 min-h-full bg-[#f5f5f7] p-[20px_20px_20px_22px]">
            <header className="flex items-center justify-between gap-4 mb-3.5">
                <div className="flex-1 max-w-[480px] h-[42px] bg-white/70 border border-[#eceaf3] rounded-xl flex items-center gap-2.5 px-3.5 text-[#7b8190] text-[0.9rem] shadow-sm">
                    <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 4a7 7 0 1 1 0 14a7 7 0 0 1 0-14zm9 20l-5.2-5.2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    <span>Quick Search...</span>
                </div>

                <div className="ml-auto flex items-center gap-3">
                    <button className="w-9 h-9 rounded-xl bg-white/75 border border-[#ecedf3] text-[#6a6f7b] grid place-items-center" aria-label="Messages">
                        <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24"><path d="M5 7.5A2.5 2.5 0 0 1 7.5 5h9A2.5 2.5 0 0 1 19 7.5v7A2.5 2.5 0 0 1 16.5 17H9l-4 3v-3.5A2.5 2.5 0 0 1 5 14.5z" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <button className="w-9 h-9 rounded-xl bg-white/75 border border-[#ecedf3] text-[#6a6f7b] grid place-items-center" aria-label="Notifications">
                        <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M10 20a2 2 0 0 0 4 0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                    <div className="flex items-center gap-2.5 bg-white/75 border border-[#ecedf3] rounded-xl px-2.5 py-1.5">
                        <div className="flex items-center">
                            <span className="w-6 h-6 rounded-full grid place-items-center text-[9px] font-bold text-[#343438] border-2 border-[#f5f5f7] bg-gradient-to-br from-[#e2e2e4] to-[#c4c4c8]">A</span>
                            <span className="w-6 h-6 rounded-full grid place-items-center text-[9px] font-bold text-white border-2 border-[#f5f5f7] -ml-1.5 bg-gradient-to-br from-[#555559] to-[#252528]">T</span>
                        </div>
                        <div className="text-[0.9rem] font-semibold text-[#3c3d45]">Turja</div>
                    </div>
                </div>
            </header>

            <section className="flex items-center justify-between gap-4 my-4">
                <h1 className="m-0 text-[clamp(1.8rem,2vw,2.3rem)] leading-tight font-bold text-[#22262d]">Good Morning, Turja Sen</h1>
                <div className="ml-auto px-3 py-2 rounded-xl bg-white/60 border border-[#ebedf3] text-[#7b8190] text-[0.8rem]">01Sep - 15 Sep 2024</div>
                <button className="bg-[#171719] hover:bg-[#303034] text-white rounded-xl px-4 py-2.5 font-semibold shadow-[0_12px_24px_rgba(23,23,25,0.14)]">Export Data</button>
            </section>

            <section className="grid grid-cols-3 gap-4 mb-4 max-[1100px]:grid-cols-1">
                {stats.map((stat) => (
                    <article key={stat.title} className="bg-white/70 border border-[#eceaf2] rounded-[18px] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h3 className="m-0 text-[1.02rem] text-[#222833] font-semibold">{stat.title}</h3>
                            <button className="w-7 h-7 rounded-lg text-[#71788a] text-[1.2rem] grid place-items-center" aria-label="More options">⋮</button>
                        </div>

                        {stat.title === 'Total Employees' ? (
                            <div className="mt-5 flex items-center justify-between gap-4">
                                <div className="text-[2.4rem] font-bold text-[#20232b] leading-none">150</div>
                                <div className="flex flex-col items-end gap-2 text-[0.74rem]">
                                    <span className="px-2 py-1.5 rounded-full bg-[#e9e9eb] text-[#252528] font-bold">50</span>
                                    <span className="px-2 py-1.5 rounded-full bg-[#f0f4f9] text-[#697489] font-bold">10</span>
                                </div>
                            </div>
                        ) : stat.title === 'Attendance Overview' ? (
                            <div className="mt-5 flex items-center justify-between gap-4">
                                <div className="w-[88px] h-[88px] rounded-full bg-[conic-gradient(#171719_0_90%,#e6e6e8_90%_100%)] grid place-items-center">
                                    <div className="w-[58px] h-[58px] rounded-full bg-white grid place-items-center text-[0.9rem] font-bold text-[#272d38]">90%</div>
                                </div>
                                <div className="flex flex-col gap-2 text-[0.73rem] text-[#606b7e]">
                                    <span><i className="inline-block w-2 h-2 rounded-full bg-[#252528] mr-1.5 align-middle" /> Sick Leave</span>
                                    <span><i className="inline-block w-2 h-2 rounded-full bg-[#77777c] mr-1.5 align-middle" /> Day Off</span>
                                    <span><i className="inline-block w-2 h-2 rounded-full bg-[#b5b5b9] mr-1.5 align-middle" /> On Time</span>
                                </div>
                            </div>
                        ) : (
                            <div className="mt-5 flex items-center justify-between gap-4">
                                <div className="w-[88px] h-[88px] rounded-full bg-[conic-gradient(#171719_0_100%,#e6e6e8_100%)] grid place-items-center">
                                    <div className="w-[58px] h-[58px] rounded-full bg-white grid place-items-center text-[0.9rem] font-bold text-[#272d38]">100%</div>
                                </div>
                                <div className="flex flex-col gap-2 text-[0.73rem] text-[#606b7e]">
                                    <div><span className="inline-block min-w-[24px] text-[#1d2333] font-bold">80</span> Macbook</div>
                                    <div><span className="inline-block min-w-[24px] text-[#1d2333] font-bold">13</span> Keyboard</div>
                                    <div><span className="inline-block min-w-[24px] text-[#1d2333] font-bold">7</span> Headphones</div>
                                </div>
                            </div>
                        )}
                    </article>
                ))}
            </section>

            <section className="grid grid-cols-[1.15fr_1.2fr] gap-4 mb-4 max-[1100px]:grid-cols-1">
                <article className="bg-white/70 border border-[#eceaf2] rounded-[18px] p-4 min-h-[290px]">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="m-0 text-[1.02rem] text-[#222833] font-semibold">Employee Performance Ratings</h2>
                        <button className="w-7 h-7 rounded-lg text-[#71788a] text-[1.2rem] grid place-items-center" aria-label="More options">⋮</button>
                    </div>

                    <div className="mt-5 flex items-center gap-3.5">
                        <div className="text-[2.3rem] font-bold text-[#1d2330]">98%</div>
                        <p className="m-0 text-[0.8rem] text-[#6a7281] leading-5">"At Fixora, every repair job deserves consistent, quality work."</p>
                    </div>

                    <div className="mt-5 flex flex-col gap-3.5">
                        {performance.map((person) => (
                            <div key={person.name} className="grid grid-cols-[1.2fr_2fr_0.4fr] items-center gap-3">
                                <span className="text-[0.8rem] text-[#424c5d]">{person.name}</span>
                                <div className="h-3 rounded-full bg-[#eff2f7] overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${person.value}%`, background: person.color }} />
                                </div>
                                <span className="text-[0.76rem] text-[#59657a] text-right">{person.value}%</span>
                            </div>
                        ))}
                    </div>
                </article>

                <article className="bg-white/70 border border-[#eceaf2] rounded-[18px] p-4 min-h-[290px]">
                    <div className="flex items-center justify-between gap-3">
                        <h2 className="m-0 text-[1.02rem] text-[#222833] font-semibold">Income Statistics</h2>
                        <button className="w-7 h-7 rounded-lg text-[#71788a] text-[1.2rem] grid place-items-center" aria-label="More options">⋮</button>
                    </div>

                    <div className="mt-5">
                        <div className="flex justify-end gap-4 mb-4 text-[0.73rem] text-[#606b7e]">
                            <span><i className="inline-block w-2 h-2 rounded-full bg-[#171719] mr-1.5 align-middle" /> Income</span>
                            <span><i className="inline-block w-2 h-2 rounded-full bg-[#9a9a9e] mr-1.5 align-middle" /> Expense</span>
                        </div>

                        <div className="h-[210px] flex items-end gap-2.5 pt-4 border-b border-[#eef1f6]">
                            {months.map((month, index) => (
                                <div key={month} className="flex-1 flex flex-col items-center justify-end gap-3 h-full">
                                    <div className="flex items-end gap-1.5 h-[160px]">
                                        <div className="w-[14px] rounded-t-[8px] bg-gradient-to-b from-[#555559] to-[#171719]" style={{ height: `${52 + index * 3}%` }} />
                                        <div className="w-[14px] rounded-t-[8px] bg-gradient-to-b from-[#c6c6c9] to-[#929297]" style={{ height: `${35 + index * 4}%` }} />
                                    </div>
                                    <span className="text-[0.72rem] text-[#6d7587]">{month}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </article>
            </section>

            <section className="bg-white/70 border border-[#eceaf2] rounded-[18px] p-4 pb-2">
                <div className="flex items-center justify-between gap-3">
                    <h2 className="m-0 text-[1.02rem] text-[#222833] font-semibold">All Employees</h2>
                    <div className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2 min-w-[190px] h-9 px-3 bg-white border border-[#eceaf3] rounded-xl text-[#7a8191] text-[0.8rem]">
                            <svg className="w-4 h-4 stroke-current fill-none" viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1 0 14a7 7 0 0 1 0-14zm9 20l-5.2-5.2" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                            <span>Search Employee</span>
                        </div>
                        <button className="px-3.5 py-2 rounded-xl bg-white border border-[#eceaf3] text-[#3f4755] text-[0.82rem]">All Status</button>
                        <button className="px-3.5 py-2 rounded-xl bg-white border border-[#eceaf3] text-[#3f4755] text-[0.82rem]">All Role</button>
                        <button className="bg-white border border-[#eceaf3] rounded-xl px-3.5 py-2 text-[#4d4c59] font-medium">Export</button>
                    </div>
                </div>

                <table className="w-full border-separate border-spacing-0 mt-4">
                    <thead>
                        <tr>
                            <th className="w-[34px] text-left px-2.5 py-3.5 text-[#666f82] font-semibold"><input type="checkbox" className="w-3.5 h-3.5 accent-[#171719]" /></th>
                            <th className="text-left px-2.5 py-3.5 text-[#666f82] font-semibold">Employee ID</th>
                            <th className="text-left px-2.5 py-3.5 text-[#666f82] font-semibold">Employee name</th>
                            <th className="text-left px-2.5 py-3.5 text-[#666f82] font-semibold">Email</th>
                            <th className="text-left px-2.5 py-3.5 text-[#666f82] font-semibold">Role</th>
                            <th className="text-left px-2.5 py-3.5 text-[#666f82] font-semibold">Departments</th>
                            <th className="text-left px-2.5 py-3.5 text-[#666f82] font-semibold">Status</th>
                            <th className="text-center px-2.5 py-3.5 text-[#666f82] font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map((employee) => (
                            <tr key={employee.id} className="border-b border-[#eef1f6]">
                                <td className="px-2.5 py-3.5 align-middle"><input type="checkbox" className="w-3.5 h-3.5 accent-[#171719]" /></td>
                                <td className="px-2.5 py-3.5 text-[#4f5868]">{employee.id}</td>
                                <td className="px-2.5 py-3.5">
                                    <div className="flex items-center gap-2.5 whitespace-nowrap">
                                        <div className="w-7 h-7 rounded-full grid place-items-center text-[0.7rem] font-bold text-white bg-gradient-to-br from-[#555559] to-[#252528]">{employee.name.charAt(0)}</div>
                                        <span className="text-[#4f5868]">{employee.name}</span>
                                    </div>
                                </td>
                                <td className="px-2.5 py-3.5 text-[#4f5868]">{employee.email}</td>
                                <td className="px-2.5 py-3.5 text-[#4f5868]">{employee.role}</td>
                                <td className="px-2.5 py-3.5 text-[#4f5868]">{employee.department}</td>
                                <td className="px-2.5 py-3.5">
                                    <span className={`inline-flex items-center justify-center min-w-[86px] px-2.5 py-1.5 rounded-full text-[0.72rem] font-semibold ${employee.color === 'green' ? 'bg-[#eafaf1] text-[#2da56a]' : 'bg-[#fff5d8] text-[#b97d00]'}`}>
                                        {employee.status}
                                    </span>
                                </td>
                                <td className="px-2.5 py-3.5 text-center">
                                    <button className="w-7 h-7 rounded-lg bg-white border border-[#eceaf3] text-[#667084] text-[1.1rem]" aria-label="Open employee actions">⋮</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        </main>
    )
}

export default Dashboard

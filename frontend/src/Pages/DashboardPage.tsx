import Sidebar from '../Components/Sidebar'
import Dashboard from '../Components/Dashboard'

function DashboardPage() {
    return (
        <div className="flex h-screen w-screen overflow-hidden bg-[#f4f4f5] font-sans text-[#262b3a] max-[1100px]:flex-col">
            <Sidebar />
            <Dashboard />
        </div>
    )
}

export default DashboardPage

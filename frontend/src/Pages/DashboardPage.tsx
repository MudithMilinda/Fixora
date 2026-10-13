import Sidebar from "../Components/Sidebar";
import Dashboard from "../Components/Dashboard";
import type { AuthUser } from "../types/auth";

function DashboardPage({
  user,
  onGoDashboard,
  onOpenRepairs,
  onOpenHistory,
  onOpenProfile,
  onSignOut,
}: {
  user: AuthUser;
  onGoDashboard: () => void;
  onOpenRepairs: () => void;
  onOpenHistory: () => void;
  onOpenProfile: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-dvh w-screen overflow-hidden bg-[#f4f4f5] font-sans text-[#262b3a] max-[1100px]:flex-col">
      <Sidebar
        user={user}
        activePage="dashboard"
        onGoDashboard={onGoDashboard}
        onOpenRepairs={onOpenRepairs}
        onOpenHistory={onOpenHistory}
        onOpenProfile={onOpenProfile}
        onSignOut={onSignOut}
      />
      <Dashboard />
    </div>
  );
}

export default DashboardPage;

import { useEffect, useState } from 'react'
import AdminLoginPage from './Pages/LoginPage'
import DashboardPage from './Pages/DashboardPage'
import ProfilePage from './Pages/ProfilePage'
import RepairJobsPage from './Pages/RepairJobsPage'
import RepairHistoryPage from './Pages/RepairHistoryPage'
import InventoryPage from './Pages/InventoryPage'
import ItemsPage from './Pages/ItemsPage'
import BranchesPage from './Pages/BranchesPage'
import PurchaseRequestsPage from './Pages/PurchaseRequestsPage'
import SuppliersPage from './Pages/SuppliersPage'
import type { AuthUser } from './types/auth'
import api from './api/axios'

type AppPage = 'dashboard' | 'repairs' | 'history' | 'inventory' | 'items' | 'purchaseRequests' | 'suppliers' | 'branches' | 'profile'

function pageFromPath(pathname: string): AppPage {
  if (/^\/repair-jobs\/[^/]+$/.test(pathname)) return 'repairs'
  if (pathname === '/repair-jobs') return 'repairs'
  if (pathname === '/repair-history') return 'history'
  if (pathname === '/inventory') return 'inventory'
  if (pathname === '/items') return 'items'
  if (pathname === '/purchase-requests') return 'purchaseRequests'
  if (pathname === '/suppliers') return 'suppliers'
  if (pathname === '/branches') return 'branches'
  if (pathname === '/profile') return 'profile'
  return 'dashboard'
}

function pathForPage(page: AppPage) {
  return page === 'repairs' ? '/repair-jobs' : page === 'history' ? '/repair-history' : page === 'inventory' ? '/inventory' : page === 'items' ? '/items' : page === 'purchaseRequests' ? '/purchase-requests' : page === 'suppliers' ? '/suppliers' : page === 'branches' ? '/branches' : page === 'profile' ? '/profile' : '/dashboard'
}

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [currentPage, setCurrentPage] = useState<AppPage>(() => pageFromPath(window.location.pathname))
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user)
        setIsSignedIn(true)
      })
      .catch(() => setIsSignedIn(false))
      .finally(() => setIsCheckingSession(false))
  }, [])

  useEffect(() => {
    function handleBrowserNavigation() {
      setCurrentPage(pageFromPath(window.location.pathname))
    }
    window.addEventListener('popstate', handleBrowserNavigation)
    return () => window.removeEventListener('popstate', handleBrowserNavigation)
  }, [])

  function navigate(page: AppPage) {
    const path = pathForPage(page)
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path)
    }
    setCurrentPage(page)
  }

  if (isCheckingSession) {
    return <main className="grid min-h-screen place-items-center bg-[#f3f3f4] text-sm font-medium text-[#55565d]">Checking your secure session…</main>
  }

  async function handleSignOut() {
    try {
      await api.post('/auth/logout')
    } finally {
      setIsSignedIn(false)
      setUser(null)
      navigate('dashboard')
    }
  }

  if (isSignedIn && user) {
    if (currentPage === 'profile') {
      return <ProfilePage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onProfileUpdated={setUser} onSignOut={handleSignOut} />
    }
    if (currentPage === 'repairs') {
      return <RepairJobsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    }
    if (currentPage === 'history') {
      return <RepairHistoryPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    }
    if (currentPage === 'inventory') return <InventoryPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'items') return <ItemsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'purchaseRequests') return <PurchaseRequestsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'suppliers') return <SuppliersPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'branches') return <BranchesPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    return <DashboardPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
  }

  return <AdminLoginPage onSignIn={(signedInUser) => { setUser(signedInUser); setIsSignedIn(true); navigate('dashboard') }} />
}

export default App

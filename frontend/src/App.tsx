import { useEffect, useState } from 'react'
import AdminLoginPage from './Pages/LoginPage'
import DashboardPage from './Pages/DashboardPage'
import Sidebar from './Components/Sidebar'
import ProfilePage from './Pages/ProfilePage'
import RepairJobsPage from './Pages/RepairJobsPage'
import RepairHistoryPage from './Pages/RepairHistoryPage'
import StockMovementPage from './Pages/StockMovementPage'
import InventoryPage from './Pages/InventoryPage'
import ItemsPage from './Pages/ItemsPage'
import UsersRolesPage from './Pages/UsersRolesPage'
import ProfitReportPage from './Pages/ProfitReportPage'
import StockValuationPage from './Pages/StockValuationPage'
import StockAdjustmentsReportPage from './Pages/StockAdjustmentsReportPage'
import SupplierPurchasesPage from './Pages/SupplierPurchasesPage'
import BranchesPage from './Pages/BranchesPage'
import PurchaseRequestsPage from './Pages/PurchaseRequestsPage'
import SuppliersPage from './Pages/SuppliersPage'
import QuotationsPage from './Pages/QuotationsPage'
import CompanySettingsPage from './Pages/CompanySettingsPage'
import PurchaseOrdersPage from './Pages/PurchaseOrdersPage'
import PaymentsPage from './Pages/PaymentsPage'
import SalesReturnsPage from './Pages/SalesReturnsPage'
import PaymentHistoryPage from './Pages/PaymentHistoryPage'
import WarrantyClaimsPage from './Pages/WarrantyClaimsPage'
import PermissionsPage from './Pages/PermissionsPage'
import SupplierReturnsPage from './Pages/SupplierReturnsPage'
import TechniciansPage from './Pages/TechniciansPage'
import type { AuthUser } from './types/auth'
import api from './api/axios'
import { CompanyBrandingProvider } from './CompanyBrandingContext'

type AppPage = 'permissions' | 'supplierReturns' | 'warrantyClaims' | 'salesReturns' | 'dashboard' | 'repairs' | 'history' | 'inventory' | 'items' | 'purchaseRequests' | 'quotations' | 'payments' | 'paymentHistory' | 'purchaseOrders' | 'suppliers' | 'technicians' | 'branches' | 'profile' | 'companySettings' | 'usersRoles' | 'profitReport' | 'stockMovements' | 'stockValuation' | 'supplierPurchases' | 'stockAdjustmentsReport'

function pageFromPath(pathname: string): AppPage {
  if (pathname === '/permissions') return 'permissions'
  if (pathname === '/supplier-returns') return 'supplierReturns'
  if (pathname === '/warranty-claims') return 'warrantyClaims'
  if (pathname === '/stock-adjustments-report') return 'stockAdjustmentsReport'
  if (pathname === '/supplier-purchases') return 'supplierPurchases'
  if (pathname === '/stock-valuation') return 'stockValuation'
  if (pathname === '/stock-movements') return 'stockMovements'
  if (pathname === '/profit-report') return 'profitReport'
  if (pathname === '/users-roles') return 'usersRoles'
  if (pathname === '/quotations') return 'quotations'
  if (pathname === '/payments') return 'payments'
  if (pathname === '/sales-returns') return 'salesReturns'
  if (pathname === '/payment-history') return 'paymentHistory'
  if (pathname === '/technicians') return 'technicians'
  if (pathname === '/purchase-orders') return 'purchaseOrders'
  if (pathname === '/company-settings') return 'companySettings'
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
  if (page === 'permissions') return '/permissions'
  if (page === 'supplierReturns') return '/supplier-returns'
  if (page === 'warrantyClaims') return '/warranty-claims'
  if (page === 'stockAdjustmentsReport') return '/stock-adjustments-report'
  if (page === 'supplierPurchases') return '/supplier-purchases'
  if (page === 'stockValuation') return '/stock-valuation'
  if (page === 'stockMovements') return '/stock-movements'
  if (page === 'profitReport') return '/profit-report'
  if (page === 'usersRoles') return '/users-roles'
  if (page === 'quotations') return '/quotations'
  if (page === 'payments') return '/payments'
  if (page === 'salesReturns') return '/sales-returns'
  if (page === 'paymentHistory') return '/payment-history'
  if (page === 'technicians') return '/technicians'
  if (page === 'purchaseOrders') return '/purchase-orders'
  if (page === 'companySettings') return '/company-settings'
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
    const renderPage = () => {
    if (currentPage === 'dashboard' && !user.permissions?.includes('dashboard.view')) return <div className="flex h-dvh bg-[#f5f5f7] max-[1100px]:h-auto max-[1100px]:flex-col"><Sidebar user={user} activePage="dashboard" onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} /><main className="p-7"><h1 className="text-2xl font-bold">Access denied</h1><p className="mt-2 text-sm text-[#747a89]">You do not have permission to view the dashboard.</p></main></div>
    if (currentPage === 'permissions') return <PermissionsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'supplierReturns') return <SupplierReturnsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'warrantyClaims') return <WarrantyClaimsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'stockAdjustmentsReport') return <StockAdjustmentsReportPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'supplierPurchases') return <SupplierPurchasesPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'stockValuation') return <StockValuationPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'stockMovements') return <StockMovementPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'profitReport') return <ProfitReportPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'usersRoles') return <UsersRolesPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'quotations') return <QuotationsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'payments') return <PaymentsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'salesReturns') return <SalesReturnsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'paymentHistory') return <PaymentHistoryPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'technicians') return <TechniciansPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'purchaseOrders') return <PurchaseOrdersPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
    if (currentPage === 'companySettings') return <CompanySettingsPage user={user} onGoDashboard={() => navigate('dashboard')} onOpenRepairs={() => navigate('repairs')} onOpenHistory={() => navigate('history')} onOpenProfile={() => navigate('profile')} onSignOut={handleSignOut} />
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
    // Each page owns the shared sidebar. Animating a keyed wrapper here made
    // the entire layout fade in on every navigation, which looked like the
    // sidebar was blinking. Keep the application shell stable between pages.
    return <CompanyBrandingProvider key={`${user.id}:${user.companyId || ''}`} companyId={user.companyId}>{renderPage()}</CompanyBrandingProvider>
  }

  return <AdminLoginPage onSignIn={(signedInUser) => { setUser(signedInUser); setIsSignedIn(true); navigate('dashboard') }} />
}

export default App

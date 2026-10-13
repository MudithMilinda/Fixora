import { useEffect, useState } from 'react'
import AdminLoginPage from './Pages/LoginPage'
import DashboardPage from './Pages/DashboardPage'
import ProfilePage from './Pages/ProfilePage'
import type { AuthUser } from './types/auth'

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'profile'>('dashboard')
  const [user, setUser] = useState<AuthUser | null>(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) {
          setIsSignedIn(false)
          return
        }
        const data = await response.json()
        setUser(data.user)
        setIsSignedIn(true)
      })
      .catch(() => setIsSignedIn(false))
      .finally(() => setIsCheckingSession(false))
  }, [])

  if (isCheckingSession) {
    return <main className="grid min-h-screen place-items-center bg-[#f3f3f4] text-sm font-medium text-[#55565d]">Checking your secure session…</main>
  }

  async function handleSignOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    } finally {
      setIsSignedIn(false)
      setUser(null)
      setCurrentPage('dashboard')
    }
  }

  if (isSignedIn && user) {
    if (currentPage === 'profile') {
      return <ProfilePage user={user} onGoDashboard={() => setCurrentPage('dashboard')} onProfileUpdated={setUser} onSignOut={handleSignOut} />
    }
    return <DashboardPage user={user} onGoDashboard={() => setCurrentPage('dashboard')} onOpenProfile={() => setCurrentPage('profile')} onSignOut={handleSignOut} />
  }

  return <AdminLoginPage onSignIn={(signedInUser) => { setUser(signedInUser); setIsSignedIn(true) }} />
}

export default App

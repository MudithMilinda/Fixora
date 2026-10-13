import { useState } from 'react'
import AdminLoginPage from './Pages/AdminLoginPage'
import DashboardPage from './Pages/DashboardPage'

function App() {
  const [isSignedIn, setIsSignedIn] = useState(false)

  if (isSignedIn) {
    return <DashboardPage />
  }

  return <AdminLoginPage onSignIn={() => setIsSignedIn(true)} />
}

export default App

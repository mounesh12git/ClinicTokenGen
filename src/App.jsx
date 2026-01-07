import { useState, useEffect } from 'react'
import './App.css'
import LoginPage from './components/LoginPage'
import TokenDashboard from './components/TokenDashboard'
import PatientRequest from './components/PatientRequest'
import ClinicAdminPanel from './components/ClinicAdminPanel'
import AdminPanel from './components/AdminPanel'
import PatientDashboard from './components/PatientDashboard'
import Pharmacy from './components/Pharmacy'
import RoleSelection from './components/RoleSelection'
import PharmaOwnerPanel from './components/PharmaOwnerPanel'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [userInfo, setUserInfo] = useState(null)
  const [currentView, setCurrentView] = useState('dashboard')
  const [tokenRequests, setTokenRequests] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [clinicData, setClinicData] = useState({
    availableTokens: 10,
    maxTokens: 10,
    totalRequests: 0,
    beingServed: 0
  })

  // Check for saved session on app load (Persistent Login)
  useEffect(() => {
    const savedSession = localStorage.getItem('userSession')
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession)
        setIsLoggedIn(true)
        setUserInfo(session.userInfo)
        setUserRole(session.userRole)
      } catch (error) {
        console.error('Failed to restore session:', error)
        localStorage.removeItem('userSession')
      }
    }
    setIsLoading(false)
  }, [])

  const handleRoleSelection = (role) => {
    setUserRole(role)
  }

  const handleLogin = (email, mobile, userData) => {
    setIsLoggedIn(true)
    const userInfoData = { email, mobile, ...userData }
    setUserInfo(userInfoData)
    
    // Set role based on user data from database
    let role = 'patient'
    if (userData.role === 'admin') {
      role = 'admin'
    } else if (userData.role === 'doctor') {
      role = 'clinic-admin'
    } else if (userData.role === 'pharmaowner' || userData.role === 'pharma-owner') {
      role = 'pharma-owner'
    }
    
    setUserRole(role)
    
    // Save session to localStorage for persistent login
    localStorage.setItem('userSession', JSON.stringify({
      userInfo: userInfoData,
      userRole: role
    }))
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserRole(null)
    setUserInfo(null)
    setCurrentView('dashboard')
    // Clear session from localStorage
    localStorage.removeItem('userSession')
  }

  const handleTokenRequested = (newToken) => {
    setTokenRequests([...tokenRequests, newToken])
    setClinicData(prev => ({
      ...prev,
      availableTokens: prev.availableTokens - 1,
      totalRequests: prev.totalRequests + 1
    }))
  }

  if (isLoading) {
    return (
      <div className="app-container">
        <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px', color: '#667eea' }}>
          Loading...
        </div>
      </div>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="app-container">
        {!userRole ? (
          <RoleSelection onRoleSelect={handleRoleSelection} />
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </div>
    )
  }

  // Render based on user role
  if (userRole === 'admin') {
    return (
      <div className="app-container">
        <AdminPanel adminUser={userInfo} />
        <button 
          className="logout-btn"
          onClick={handleLogout}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            zIndex: 999
          }}
        >
          🚪 Logout
        </button>
      </div>
    )
  }

  if (userRole === 'pharma-owner') {
    return (
      <div className="app-container">
        <PharmaOwnerPanel userInfo={userInfo} onLogout={handleLogout} />
      </div>
    )
  }

  if (userRole === 'patient') {
    if (currentView === 'pharmacy') {
      return (
        <Pharmacy 
          userInfo={userInfo}
          onLogout={handleLogout}
          onBack={() => setCurrentView('dashboard')}
        />
      )
    }

    return (
      <div className="app-container">
        <PatientDashboard 
          userInfo={userInfo}
          onLogout={handleLogout}
          onPharmacyClick={() => setCurrentView('pharmacy')}
        />
        <button 
          className="logout-btn"
          onClick={handleLogout}
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            padding: '10px 20px',
            background: '#667eea',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            zIndex: 1000
          }}
        >
          🚪 Logout
        </button>
      </div>
    )
  }

  if (userRole === 'clinic-admin') {
    return (
      <ClinicAdminPanel 
        tokenRequests={tokenRequests}
        userInfo={userInfo}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <div className="app-container">
      <TokenDashboard userInfo={userInfo} onLogout={handleLogout} />
    </div>
  )
}

export default App

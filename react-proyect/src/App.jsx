import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import AdminDashboard from './components/admin/AdminDashboard'
import ClientDashboard from './components/client/ClientDashboard'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check session from localStorage
    const savedUser = localStorage.getItem('financiaunt_user')
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
  }, [])

  const handleLogin = (userData) => {
    setUser(userData)
    localStorage.setItem('financiaunt_user', JSON.stringify(userData))
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('financiaunt_user')
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  if (user.rol === 'admin') {
    return (
      <Routes>
        <Route path="/admin/*" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/client/*" element={<ClientDashboard user={user} onLogout={handleLogout} />} />
      <Route path="*" element={<Navigate to="/client" replace />} />
    </Routes>
  )
}

export default App

import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Users from './Users'
import Statistics from './Statistics'
import StatisticalTests from './StatisticalTests'
import AiStats from './AiStats'
import Profile from '../Profile'
import Navbar from '../Navbar'
import './Admin.css'

const AdminDashboard = ({ user: initialUser, onLogout }) => {
  const [user, setUser] = useState(initialUser)

  const handleUserUpdate = (updatedUser) => {
    setUser(updatedUser)
    localStorage.setItem('financiaunt_user', JSON.stringify(updatedUser))
  }

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="page-container">
        <Routes>
          <Route path="/" element={<Statistics />} />
          <Route path="/ai-stats" element={<AiStats user={user} />} />
          <Route path="/users" element={<Users />} />
          <Route path="/statistical-tests" element={<StatisticalTests />} />
          <Route path="/profile" element={<Profile user={user} onUserUpdate={handleUserUpdate} />} />
        </Routes>
      </div>
    </>
  )
}

export default AdminDashboard

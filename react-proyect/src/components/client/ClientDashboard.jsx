import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Dashboard from './Dashboard'
import Transactions from './Transactions'
import Budgets from './Budgets'
import Goals from './Goals'
import Profile from '../Profile'
import Navbar from '../Navbar'
import './Client.css'

const ClientDashboard = ({ user: initialUser, onLogout }) => {
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
          <Route path="/" element={<Dashboard userId={user.id} userName={user.nombre} />} />
          <Route path="/transactions" element={<Transactions userId={user.id} />} />
          <Route path="/budgets" element={<Budgets userId={user.id} />} />
          <Route path="/goals" element={<Goals userId={user.id} />} />
          <Route path="/profile" element={<Profile user={user} onUserUpdate={handleUserUpdate} />} />
        </Routes>
      </div>
    </>
  )
}

export default ClientDashboard

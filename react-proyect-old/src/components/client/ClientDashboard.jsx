
import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Dashboard from './Dashboard'
import Transactions from './Transactions'
import Budgets from './Budgets'
import Goals from './Goals'
import AIRecommendations from './AIRecommendations'
import Notifications from './Notifications'
import HelpCenter from './HelpCenter'
import Billing from './Billing'
import Chatbot from './Chatbot'
import Profile from '../Profile'
import Plans from './Plans'
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
          <Route path="/" element={<Dashboard user={user} userId={user.id} userName={user.nombre} />} />
          <Route path="/transactions" element={<Transactions userId={user.id} />} />
          <Route path="/budgets" element={<Budgets userId={user.id} />} />
          <Route path="/goals" element={<Goals userId={user.id} />} />
          <Route path="/ai-recommendations" element={<AIRecommendations user={user} />} />
          <Route path="/notifications" element={<Notifications user={user} />} />
          <Route path="/help-center" element={<HelpCenter user={user} />} />
          <Route path="/billing" element={<Billing user={user} />} />
          <Route path="/chatbot" element={<Chatbot user={user} />} />
          <Route path="/profile" element={<Profile user={user} onUserUpdate={handleUserUpdate} />} />
          <Route path="/plans" element={<Plans user={user} onUserUpdate={handleUserUpdate} />} />
        </Routes>
      </div>
    </>
  )
}

export default ClientDashboard

import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, MessageSquare, User, LogOut } from 'lucide-react'

const Navbar = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const location = useLocation()
  const isAdmin = user.rol === 'admin'

  const navLinks = isAdmin
    ? [
        { to: '/admin', label: 'Estadísticas' },
        { to: '/admin/users', label: 'Usuarios' }
      ]
    : [
        { to: '/client', label: 'Dashboard' },
        { to: '/client/transactions', label: 'Transacciones' },
        { to: '/client/budgets', label: 'Presupuestos' },
        { to: '/client/goals', label: 'Metas' }
      ]

  const isActive = (to) => location.pathname === to

  return (
    <>
      <nav className="navbar">
        <div className="navbar-container">
          <Link to={isAdmin ? '/admin' : '/client'} className="navbar-logo">
            💰 FinanciaUNT
          </Link>

          {/* Desktop Navigation */}
          <div className="navbar-links">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar-link ${isActive(link.to) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="navbar-actions">
            <button
              className="navbar-icon-button"
              onClick={() => setIsChatOpen(true)}
              title="Chat Financiero"
            >
              <MessageSquare size={20} />
            </button>
            <Link
              to={isAdmin ? '/admin/profile' : '/client/profile'}
              className="navbar-icon-button"
              title="Mi Perfil"
            >
              <User size={20} />
            </Link>
            <button
              className="navbar-logout-button"
              onClick={onLogout}
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="navbar-mobile-button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="navbar-mobile-menu">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar-mobile-link ${isActive(link.to) ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="navbar-mobile-divider" />
            <button
              className="navbar-mobile-link"
              onClick={() => {
                setIsChatOpen(true)
                setIsMobileMenuOpen(false)
              }}
            >
              <MessageSquare size={16} />
              Chat Financiero
            </button>
            <button
              className="navbar-mobile-link"
              onClick={onLogout}
            >
              <LogOut size={16} />
              Cerrar Sesión
            </button>
          </div>
        )}
      </nav>

      {/* Chat Offcanvas */}
      {isChatOpen && (
        <div className="offcanvas-overlay" onClick={() => setIsChatOpen(false)}>
          <div className="offcanvas" onClick={(e) => e.stopPropagation()}>
            <div className="offcanvas-header">
              <h3 className="offcanvas-title">💬 Chat Financiero</h3>
              <button
                className="offcanvas-close"
                onClick={() => setIsChatOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <div className="offcanvas-body">
              <div className="chat-messages">
                <div className="chat-message assistant">
                  ¡Hola! 👋 Soy tu asistente financiero de FinanciaUNT. ¿En qué puedo ayudarte hoy?
                </div>
              </div>
              <div className="chat-input-container">
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Escribe tu mensaje aquí..."
                />
                <button className="chat-send-button">
                  ➤
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar

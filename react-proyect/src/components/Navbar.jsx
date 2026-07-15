import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, MessageSquare, User, LogOut } from 'lucide-react'
import { getFinancialAdvisorReply } from '../lib/openaiService'

const Navbar = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      sender: 'assistant',
      text: '¡Hola! 👋 Soy tu asistente financiero de FinanciaUNT. ¿En qué puedo ayudarte hoy?'
    }
  ])
  const [draft, setDraft] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const location = useLocation()
  const isAdmin = user.rol === 'admin'
  const hasAiAccess = ['premium', 'enterprise'].includes(user.plan_suscripcion || '')

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

  const handleOpenChat = () => {
    if (!hasAiAccess) {
      setMessages([
        {
          sender: 'assistant',
          text: 'Este chat con IA está disponible solo para usuarios con plan Premium o Enterprise. Actualiza tu plan para activar esta función.'
        }
      ])
      setDraft('')
      setIsChatOpen(true)
      return
    }

    setMessages([
      {
        sender: 'assistant',
        text: '¡Hola! 👋 Soy tu asistente financiero de FinanciaUNT. ¿En qué puedo ayudarte hoy?'
      }
    ])
    setDraft('')
    setIsChatOpen(true)
  }

  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!draft.trim()) return

    const userMessage = draft.trim()
    setMessages(prev => [...prev, { sender: 'user', text: userMessage }])
    setDraft('')
    setIsThinking(true)

    try {
      // Prepare user preferences from profile (if available)
      const storage = JSON.parse(localStorage.getItem('financiaunt_local_data') || '{}')
      const reply = await getFinancialAdvisorReply({
        message: userMessage,
        transactions: storage.transacciones || [],
        budgets: storage.presupuestos || [],
        goals: storage.metas_financieras || [],
        userName: user.nombre || 'usuario',
        userPreferences: user.configuracion || {}
      })

      setMessages(prev => [...prev, { sender: 'assistant', text: reply }])
    } catch (error) {
      setMessages(prev => [...prev, { sender: 'assistant', text: 'No pude responder en este momento. Inténtalo otra vez.' }])
    } finally {
      setIsThinking(false)
    }
  }

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
              onClick={handleOpenChat}
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
                handleOpenChat()
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
                {messages.map((message, index) => (
                  <div key={index} className={`chat-message ${message.sender}`}>
                    {message.text}
                  </div>
                ))}
                {isThinking && hasAiAccess && (
                  <div className="chat-message assistant">Estoy pensando una respuesta...</div>
                )}
              </div>
              {hasAiAccess ? (
                <form className="chat-input-container" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="chat-input"
                  placeholder="Escribe tu mensaje aquí..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                  <button className="chat-send-button" type="submit">
                    ➤
                  </button>
                </form>
              ) : (
                <div className="chat-message assistant" style={{ marginTop: '8px' }}>
                  Actualiza tu plan para desbloquear el asistente financiero con IA.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Navbar

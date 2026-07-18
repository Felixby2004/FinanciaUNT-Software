
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, MessageSquare, User, LogOut, Sun, Moon, Globe } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'

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
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  const navLinks = isAdmin
    ? [
        { to: '/admin', label: t('statistics') },
        { to: '/admin/ai-stats', label: 'AI Stats' },
        { to: '/admin/users', label: t('users') }
      ]
    : [
        { to: '/client', label: t('dashboard') },
        { to: '/client/ai-recommendations', label: 'IA' },
        { to: '/client/transactions', label: t('transactions') },
        { to: '/client/budgets', label: t('budgets') },
        { to: '/client/goals', label: t('goals') },
        { to: '/client/plans', label: t('plans') }
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
      // Mock response for now
      setMessages(prev => [...prev, { sender: 'assistant', text: '¡Gracias por tu mensaje! Estoy procesando tu solicitud.' }])
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
            <img
              src="https://res.cloudinary.com/dfoiispgm/image/upload/v1784387381/logo_unt_wsghnl.png"
              alt="Universidad Logo"
            />
            FinanciaUNT
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
            {/* Theme Toggle */}
            <button
              className="navbar-icon-button"
              onClick={() => toggleTheme()}
              title={t('theme')}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Language Toggle */}
            <button
              className="navbar-icon-button"
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              title={t('language')}
            >
              <Globe size={20} />
              <span style={{ fontSize: '10px', fontWeight: 700 }}>
                {language.toUpperCase()}
              </span>
            </button>

            <Link
              to={isAdmin ? '/admin/profile' : '/client/profile'}
              className="navbar-icon-button"
              title={t('profile')}
            >
              <User size={20} />
            </Link>
            <button
              className="navbar-logout-button"
              onClick={onLogout}
            >
              <LogOut size={16} />
              {t('logout')}
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
              {t('chat')}
            </button>
            <button
              className="navbar-mobile-link"
              onClick={onLogout}
            >
              <LogOut size={16} />
              {t('logout')}
            </button>
          </div>
        )}
      </nav>

      {/* Floating Chat Button */}
      <button
        className="floating-chat-button"
        onClick={handleOpenChat}
        title={t('chat')}
      >
        <MessageSquare size={28} />
      </button>

      {/* Chat Widget */}
      {isChatOpen && (
        <div className="chat-widget">
          <div className="chat-widget-header">
            <div className="chat-widget-title">
              <MessageSquare size={18} />
              {t('chat')}
            </div>
            <button
              className="chat-widget-close"
              onClick={() => setIsChatOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <div className="chat-widget-body">
            <div className="chat-widget-messages">
              {messages.map((message, index) => (
                <div key={index} className={`chat-message ${message.sender}`}>
                  {message.text}
                </div>
              ))}
              {isThinking && hasAiAccess && (
                <div className="chat-message assistant">{t('loading')}</div>
              )}
            </div>
            {hasAiAccess ? (
              <form className="chat-widget-input-container" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={language === 'es' ? 'Escribe tu mensaje...' : 'Type your message...'}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <button type="submit" className="primary-button" style={{ padding: '0 20px' }}>
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
      )}
    </>
  )
}

export default Navbar


import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, verifyPassword } from '../lib/supabase'
import { Sun, Moon, Globe, Mail, Lock, LogIn, Loader2 } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { useLanguage } from '../contexts/LanguageContext'
import './Auth.css'

const Login = ({ onLogin }) => {
  const { t } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: dbError } = await supabase
        .from('usuarios')
        .select('*')
        .eq('email', email)
        .single()

      if (dbError || !data) {
        throw new Error(t('credentialsIncorrect'))
      }

      const passwordMatch = await verifyPassword(password, data.access_token_plaid)
      if (!passwordMatch) {
        throw new Error(t('credentialsIncorrect'))
      }

      onLogin(data)
    } catch (err) {
      setError(err.message || t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      {/* Background Image */}
      <div className="auth-background">
        <img
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Financial background"
          className="auth-background-image"
        />
        <div className="auth-background-overlay"></div>
      </div>

      {/* Header Controls */}
      <div className="auth-header-controls">
        <button
          className="auth-toggle-button"
          onClick={() => toggleTheme()}
          title={t('theme')}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          className="auth-toggle-button"
          onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
          title={t('language')}
        >
          <Globe size={18} />
          <span style={{ marginLeft: 6, fontWeight: 600, fontSize: 13 }}>
            {language.toUpperCase()}
          </span>
        </button>
      </div>

      {/* Login Card */}
      <div className="auth-card login-card">
        <div className="auth-header">
          <div className="auth-logo-container">
            <img
              src="https://res.cloudinary.com/dfoiispgm/image/upload/v1784387381/logo_unt_wsghnl.png"
              alt="Universidad Logo"
              className="university-logo"
            />
            <h1 className="auth-logo">
              FinanciaUNT
            </h1>
          </div>
          <h2 className="auth-title">{t('login')}</h2>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <Mail size={16} />
              {t('email')}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('yourEmail')}
              className="form-input"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} />
              {t('password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="form-input"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="auth-button primary-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="spinner" />
                {t('loading')}
              </>
            ) : (
              <>
                <LogIn size={18} />
                {t('login')}
              </>
            )}
          </button>
        </form>

        <p className="auth-footer">
          {t('noAccount')}{' '}
          <Link to="/register" className="auth-link">
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login

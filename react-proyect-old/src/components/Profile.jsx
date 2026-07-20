
import { useState } from 'react'
import { supabase, hashPassword, verifyPassword } from '../lib/supabase'
import { User, Mail, Key, Shield } from 'lucide-react'
import { useLanguage } from '../contexts/LanguageContext'

const Profile = ({ user, onUserUpdate }) => {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    nombre: user.nombre,
    email: user.email,
    monthlyIncome: user.configuracion?.monthlyIncome || '',
    riskProfile: user.configuracion?.riskProfile || 'moderado',
    advisorTone: user.configuracion?.advisorTone || 'amable',
    currency: user.configuracion?.currency || 'PEN',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setMessageType('')

    try {
      let updateData = {
        nombre: formData.nombre,
        email: formData.email
      }

      // If changing password
      if (formData.newPassword) {
        if (formData.newPassword !== formData.confirmPassword) {
          throw new Error('Las nuevas contraseñas no coinciden')
        }

        // Verify current password
        const { data: userData } = await supabase
          .from('usuarios')
          .select('access_token_plaid')
          .eq('id', user.id)
          .single()

        const passwordMatch = await verifyPassword(formData.currentPassword, userData.access_token_plaid)
        if (!passwordMatch) {
          throw new Error('La contraseña actual es incorrecta')
        }

        // Hash new password
        const hashedPassword = await hashPassword(formData.newPassword)
        updateData.access_token_plaid = hashedPassword
      }

      // Update user
      // Add configuracion object
      updateData.configuracion = {
        ...(user.configuracion || {}),
        monthlyIncome: formData.monthlyIncome,
        riskProfile: formData.riskProfile,
        advisorTone: formData.advisorTone,
        currency: formData.currency
      }

      const { error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', user.id)

      if (error) throw error

      setMessage('¡Perfil actualizado con éxito!')
      setMessageType('success')

      // Update local user data
      onUserUpdate({ ...user, ...updateData, configuracion: updateData.configuracion })

      // Reset password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
    } catch (err) {
      setMessage(err.message || 'Error al actualizar el perfil')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="profile-page">
      {message && (
        <div className={`message message-${messageType}`}>
          {message}
        </div>
      )}

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            <User size={40} />
          </div>
          <div>
            <h2 className="profile-name">{user.nombre}</h2>
            <div className="profile-badges">
              <span className={`plan-badge plan-${user.plan_suscripcion}`}>
                {t(user.plan_suscripcion)}
              </span>
              <span className={`role-badge role-${user.rol}`}>
                {t(user.rol === 'admin' ? 'adminRole' : user.rol)}
              </span>
            </div>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={16} />
              {t('name')}
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Mail size={16} />
              {t('email')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="section-divider">
            <span>{t('preferences')}</span>
          </div>

          <div className="form-group">
            <label className="form-label">{t('monthlyIncome')}</label>
            <input
              type="number"
              name="monthlyIncome"
              value={formData.monthlyIncome}
              onChange={handleChange}
              className="form-input"
              placeholder="Ej. 2500"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('riskProfile')}</label>
            <select name="riskProfile" value={formData.riskProfile} onChange={handleChange} className="form-input">
              <option value="conservador">Conservador</option>
              <option value="moderado">Moderado</option>
              <option value="agresivo">Agresivo</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('advisorTone')}</label>
            <select name="advisorTone" value={formData.advisorTone} onChange={handleChange} className="form-input">
              <option value="amable">Amable</option>
              <option value="directo">Directo</option>
              <option value="analitico">Analítico</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('currency')}</label>
            <select name="currency" value={formData.currency} onChange={handleChange} className="form-input">
              <option value="PEN">PEN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="MXN">MXN</option>
            </select>
          </div>

          <div className="section-divider">
            <span>{t('changePassword')}</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Key size={16} />
              {t('currentPassword')}
            </label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="form-input"
              placeholder={t('currentPassword')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Key size={16} />
              {t('newPassword')}
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="form-input"
              placeholder={t('newPassword')}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Key size={16} />
              {t('confirmPassword')}
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder={t('confirmPassword')}
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? t('loading') : t('save')}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Profile

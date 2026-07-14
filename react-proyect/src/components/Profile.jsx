import { useState } from 'react'
import { supabase, hashPassword, verifyPassword } from '../lib/supabase'
import { User, Mail, Key, Shield } from 'lucide-react'

const Profile = ({ user, onUserUpdate }) => {
  const [formData, setFormData] = useState({
    nombre: user.nombre,
    email: user.email,
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
      const { error } = await supabase
        .from('usuarios')
        .update(updateData)
        .eq('id', user.id)

      if (error) throw error

      setMessage('¡Perfil actualizado con éxito!')
      setMessageType('success')

      // Update local user data
      onUserUpdate({ ...user, ...updateData })

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
      <h1 className="page-title">Mi Perfil</h1>

      {message && (
        <div className={`message message-${messageType}`}>
          {message}
        </div>
      )}

      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">
            <User size={48} />
          </div>
          <div>
            <h2 className="profile-name">{user.nombre}</h2>
            <div className="profile-badges">
              <span className={`plan-badge plan-${user.plan_suscripcion}`}>
                {user.plan_suscripcion}
              </span>
              <span className={`role-badge role-${user.rol}`}>
                {user.rol}
              </span>
            </div>
          </div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={16} />
              Nombre
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
              Email
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
            <span>Cambiar Contraseña</span>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Key size={16} />
              Contraseña Actual
            </label>
            <input
              type="password"
              name="currentPassword"
              value={formData.currentPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Ingresa tu contraseña actual"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Key size={16} />
              Nueva Contraseña
            </label>
            <input
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Ingresa tu nueva contraseña"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Key size={16} />
              Confirmar Nueva Contraseña
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Confirma tu nueva contraseña"
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Profile

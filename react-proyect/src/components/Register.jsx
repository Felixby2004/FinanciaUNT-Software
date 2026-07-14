import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase, hashPassword } from '../lib/supabase'
import './Auth.css'

const plans = [
  {
    id: 'basico',
    name: 'Básico',
    price: '$0',
    period: '/mes',
    features: ['Gastos e ingresos', '1 presupuesto', '1 meta']
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$9.99',
    period: '/mes',
    features: ['Todo Básico', 'Presupuestos ilimitados', 'Metas ilimitadas']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: '$29.99',
    period: '/mes',
    features: ['Todo Premium', 'Soporte prioritario', 'Análisis avanzado']
  }
]

const Register = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    plan: 'basico'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePlanSelect = (planId) => {
    setFormData(prev => ({ ...prev, plan: planId }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      // Hash the password before saving
      const hashedPassword = await hashPassword(formData.password)

      const { error } = await supabase
        .from('usuarios')
        .insert({
          nombre: formData.nombre,
          email: formData.email,
          access_token_plaid: hashedPassword,
          plan_suscripcion: formData.plan,
          rol: 'cliente',
          configuracion: {}
        })

      if (error) throw error

      navigate('/login')
    } catch (err) {
      setError(err.message || 'Error al crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">FinanciaUNT</h1>
        <h2 className="auth-subtitle">Crear Cuenta</h2>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nombre</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ingrese su nombre"
              required
            />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Ingrese su email"
              required
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Ingrese su contraseña"
              required
            />
          </div>

          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirme su contraseña"
              required
            />
          </div>

          <div className="form-group">
            <label>Selecciona tu Plan</label>
            <div className="plans-container">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className={`plan-card ${formData.plan === plan.id ? 'selected' : ''}`}
                  onClick={() => handlePlanSelect(plan.id)}
                >
                  <div className="plan-name">{plan.name}</div>
                  <div className="plan-price">
                    {plan.price}<span>{plan.period}</span>
                  </div>
                  <div className="plan-features">
                    {plan.features.map((feature, i) => (
                      <div key={i}>{feature}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
          >
            {loading ? 'Creando...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Ingresa aquí</Link>
        </p>
      </div>
    </div>
  )
}

export default Register

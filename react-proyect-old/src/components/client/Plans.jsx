
import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import { supabase } from '../../lib/supabase'

const Plans = ({ user, onUserUpdate }) => {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('')

  const plans = [
    {
      id: 'basic',
      name: t('basic'),
      price: 0,
      features: [
        { name: t('features.theme'), available: true },
        { name: t('features.language'), available: true },
        { name: t('features.basicCurrency'), available: true },
        { name: t('features.basicAccounts'), available: true },
        { name: t('features.basicCategories'), available: true },
        { name: t('features.basicRecurring'), available: true },
        { name: t('features.basicManual'), available: true },
        { name: t('features.basicExport'), available: true },
        { name: t('features.basicAI'), available: true },
        { name: t('features.basicChat'), available: true }
      ]
    },
    {
      id: 'premium',
      name: t('premium'),
      price: 9.99,
      features: [
        { name: t('features.theme'), available: true },
        { name: t('features.language'), available: true },
        { name: t('features.premiumCurrency'), available: true },
        { name: t('features.premiumAccounts'), available: true },
        { name: t('features.premiumCategories'), available: true },
        { name: t('features.premiumRecurring'), available: true },
        { name: t('features.premiumManual'), available: true },
        { name: t('features.premiumExport'), available: true },
        { name: t('features.premiumAI'), available: true },
        { name: t('features.premiumChat'), available: true }
      ],
      featured: true
    },
    {
      id: 'enterprise',
      name: t('enterprise'),
      price: 29.99,
      features: [
        { name: t('features.theme'), available: true },
        { name: t('features.language'), available: true },
        { name: t('features.enterpriseCurrency'), available: true },
        { name: t('features.enterpriseAccounts'), available: true },
        { name: t('features.enterpriseCategories'), available: true },
        { name: t('features.enterpriseRecurring'), available: true },
        { name: t('features.enterpriseManual'), available: true },
        { name: t('features.enterpriseExport'), available: true },
        { name: t('features.enterpriseAI'), available: true },
        { name: t('features.enterpriseChat'), available: true }
      ]
    }
  ]

  const handleChangePlan = async (planId) => {
    if (planId === user.plan_suscripcion) return

    setLoading(planId)
    setMessage('')
    setMessageType('')

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ plan_suscripcion: planId })
        .eq('id', user.id)

      if (error) throw error

      const updatedUser = { ...user, plan_suscripcion: planId }
      onUserUpdate(updatedUser)
      localStorage.setItem('financiaunt_user', JSON.stringify(updatedUser))

      setMessage(`${t('success')}! ${t('plan')} cambiado a ${plans.find(p => p.id === planId).name}.`)
      setMessageType('success')
    } catch (err) {
      setMessage(err.message || t('error'))
      setMessageType('error')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="plans-page">
      <h1 className="page-title">{t('plans')}</h1>

      {message && (
        <div className={`message message-${messageType}`} style={{ marginBottom: '24px' }}>
          {message}
        </div>
      )}

      <div className="plans-container">
        {plans.map((plan) => {
          const isCurrentPlan = user.plan_suscripcion === plan.id
          return (
            <div
              key={plan.id}
              className={`plan-card ${plan.featured ? 'plan-card-featured' : ''}`}
            >
              {plan.featured && <div className="plan-badge">Más Popular</div>}
              <h2 className="plan-name">{plan.name}</h2>
              <div className="plan-price">
                <span className="plan-price-amount">${plan.price}</span>
                <span className="plan-price-period">/mes</span>
              </div>
              <p className="plan-description">
                {t('manageFinances')}
              </p>
              <ul className="plan-features">
                {plan.features.map((feature, index) => (
                  <li key={index} className="plan-feature">
                    <span className={`plan-feature-icon ${feature.available ? 'available' : 'unavailable'}`}>
                      {feature.available ? <Check size={16} /> : <X size={16} />}
                    </span>
                    <span className="plan-feature-text">{feature.name}</span>
                  </li>
                ))}
              </ul>
              <button
                className={`plan-button ${isCurrentPlan ? 'plan-button-active' : ''}`}
                onClick={() => handleChangePlan(plan.id)}
                disabled={loading === plan.id || isCurrentPlan}
              >
                {loading === plan.id ? t('loading') :
                 isCurrentPlan ? t('alreadyHave') :
                 t('choosePlan')}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Plans

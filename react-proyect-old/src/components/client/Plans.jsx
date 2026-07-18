
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import EmailVerificationModal from './EmailVerificationModal';

const Plans = ({ user, onUserUpdate }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });

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
  ];

  const handleChangePlan = async (planId) => {
    if (planId === user.plan_suscripcion) return;

    if (planId !== 'basic') {
      if (!user.is_verified) {
        setPendingPlan(planId);
        setShowVerificationModal(true);
        return;
      }
      setPendingPlan(planId);
      setShowPayment(true);
      return;
    }

    setLoading(planId);
    setMessage('');
    setMessageType('');

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ plan_suscripcion: planId })
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, plan_suscripcion: planId };
      onUserUpdate(updatedUser);
      localStorage.setItem('financiaunt_user', JSON.stringify(updatedUser));

      setMessage(`${t('success')}! ${t('plan')} cambiado a ${plans.find(p => p.id === planId).name}.`);
      setMessageType('success');
    } catch (err) {
      setMessage(err.message || t('error'));
      setMessageType('error');
    } finally {
      setLoading(null);
    }
  };

  const handleVerified = async () => {
    setShowVerificationModal(false);
    const updatedUser = { ...user, is_verified: true };
    onUserUpdate(updatedUser);
    localStorage.setItem('financiaunt_user', JSON.stringify(updatedUser));
    
    if (pendingPlan !== 'basic') {
      setShowPayment(true);
    } else {
      await handleChangePlan(pendingPlan);
    }
  };

  const handlePayment = async () => {
    setLoading(pendingPlan);
    setMessage('');
    setMessageType('');

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ 
          plan_suscripcion: pendingPlan,
          cardholder_name: paymentDetails.cardholderName,
          card_number_preview: '****' + paymentDetails.cardNumber.slice(-4),
          card_expiry: paymentDetails.expiry,
        })
        .eq('id', user.id);

      if (error) throw error;

      const updatedUser = { ...user, plan_suscripcion: pendingPlan, is_verified: true };
      onUserUpdate(updatedUser);
      localStorage.setItem('financiaunt_user', JSON.stringify(updatedUser));

      setMessage(`${t('success')}! ${t('plan')} cambiado a ${plans.find(p => p.id === pendingPlan).name}.`);
      setMessageType('success');
      setShowPayment(false);
      setPendingPlan(null);
    } catch (err) {
      setMessage(err.message || t('error'));
      setMessageType('error');
    } finally {
      setLoading(null);
    }
  };

  const pageStyle = {
    padding: '1.5rem',
    backgroundColor: isDark ? '#1a1a2e' : '#f8fafc',
    color: isDark ? '#e0e0e0' : '#1e293b',
    minHeight: '100vh',
  };

  const planCardStyle = (featured) => ({
    backgroundColor: isDark ? '#16213e' : '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
    border: featured ? '2px solid #667eea' : isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    position: 'relative',
  });

  const buttonStyle = (active) => ({
    backgroundColor: active ? (isDark ? '#2a3a5e' : '#e5e7eb') : '#667eea',
    color: active ? (isDark ? '#e0e0e0' : '#1e293b') : 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    width: '100%',
  });

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    backdropFilter: 'blur(8px)',
  };

  const modalStyle = {
    backgroundColor: isDark ? '#16213e' : '#ffffff',
    border: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    marginBottom: '1rem',
    backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
    color: isDark ? '#e0e0e0' : '#1e293b',
    outline: 'none',
  };

  return (
    <div style={pageStyle}>
      <h1 className="page-title">{t('plans')}</h1>

      {message && (
        <div style={{ 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          backgroundColor: messageType === 'success' ? (isDark ? '#166534' : '#dcfce7') : (isDark ? '#7f1d1d' : '#fee2e2'),
          color: messageType === 'success' ? (isDark ? '#86efac' : '#166534') : (isDark ? '#fca5a5' : '#7f1d1d')
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {plans.map((plan) => {
          const isCurrentPlan = user.plan_suscripcion === plan.id;
          return (
            <div
              key={plan.id}
              style={planCardStyle(plan.featured)}
            >
              {plan.featured && (
                <div style={{
                  position: 'absolute',
                  top: '-10px',
                  right: '20px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '9999px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                }}>
                  {t('mostPopular')}
                </div>
              )}
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{plan.name}</h2>
              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>${plan.price}</span>
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{t('perMonth')}</span>
              </div>
              <p style={{ marginBottom: '1.5rem', color: isDark ? '#94a3b8' : '#64748b' }}>
                {t('manageFinances')}
              </p>
              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem' }}>
                {plan.features.map((feature, index) => (
                  <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: feature.available ? '#22c55e' : '#ef4444' }}>
                      {feature.available ? <Check size={20} /> : <X size={20} />}
                    </span>
                    <span style={{ color: isDark ? '#e0e0e0' : '#1e293b' }}>{feature.name}</span>
                  </li>
                ))}
              </ul>
              <button
                style={buttonStyle(isCurrentPlan)}
                onClick={() => handleChangePlan(plan.id)}
                disabled={loading === plan.id || isCurrentPlan}
              >
                {loading === plan.id ? t('loading') :
                 isCurrentPlan ? t('alreadyHave') :
                 t('choosePlan')}
              </button>
            </div>
          );
        })}
      </div>

      {showVerificationModal && (
        <EmailVerificationModal 
          user={user} 
          onVerified={handleVerified} 
          onClose={() => {
            setShowVerificationModal(false);
            setPendingPlan(null);
          }} 
        />
      )}

      {showPayment && (
        <div style={modalOverlayStyle} onClick={() => setShowPayment(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
              {t('payment')} - {plans.find(p => p.id === pendingPlan)?.name}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              {t('enterPaymentDetails') || 'Enter your payment details below.'}
            </p>
            
            <input 
              type="text" 
              value={paymentDetails.cardholderName}
              onChange={(e) => setPaymentDetails({ ...paymentDetails, cardholderName: e.target.value })}
              placeholder={t('cardholderName')}
              style={inputStyle}
            />
            <input 
              type="text" 
              value={paymentDetails.cardNumber}
              onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}
              placeholder={t('cardNumber')}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input 
                type="text" 
                value={paymentDetails.expiry}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                placeholder={t('expiry')}
                style={{ ...inputStyle, flex: 1 }}
              />
              <input 
                type="text" 
                value={paymentDetails.cvv}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                placeholder={t('cvv')}
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
            <button 
              style={{ ...buttonStyle(false), marginTop: '1rem' }} 
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? t('loading') : t('payment')}
            </button>
            <button 
              style={{ ...buttonStyle(true), marginTop: '0.5rem' }} 
              onClick={() => {
                setShowPayment(false);
                setPendingPlan(null);
              }}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Plans;

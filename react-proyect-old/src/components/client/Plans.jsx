// src/pages/Plans.jsx (versión con verificación y pago integrados)
import { useState } from 'react';
import { Check, X, CreditCard } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { requestVerificationCode, verifyCode } from '../../lib/emailUtils';

const Plans = ({ user, onUserUpdate, onLogout }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [showDowngradeModal, setShowDowngradeModal] = useState(false);
  const [downgradeTarget, setDowngradeTarget] = useState(null);

  const plans = [
    {
      id: 'basic',
      name: t('basic'),
      price: 0,
      features: [
        { name: t('features.theme'), available: true },
        { name: t('features.language'), available: true },
        { name: t('features.basicPanel'), available: true },
        { name: t('features.basicCurrency'), available: true },
        { name: t('features.basicAI'), available: true },
        { name: t('features.basicComparator'), available: true },
        { name: t('features.basicTransactions'), available: true },
        { name: t('features.basicCategories'), available: true },
        { name: t('features.basicChat'), available: true },
        { name: t('features.basicProfile'), available: true },
      ],
      summary: t('basicSummary'),
    },
    {
      id: 'premium',
      name: t('premium'),
      price: 9.99,
      features: [
        { name: t('features.theme'), available: true },
        { name: t('features.language'), available: true },
        { name: t('features.basicPanel'), available: true },
        { name: t('features.premiumCurrency'), available: true },
        { name: t('features.basicAI'), available: true },
        { name: t('features.premiumComparator'), available: true },
        { name: t('features.premiumStats'), available: true },
        { name: t('features.premiumCategories'), available: true },
        { name: t('features.premiumChat'), available: true },
        { name: t('features.basicProfile'), available: true },
      ],
      summary: t('premiumSummary'),
      featured: true,
    },
    {
      id: 'enterprise',
      name: t('enterprise'),
      price: 29.99,
      features: [
        { name: t('features.theme'), available: true },
        { name: t('features.language'), available: true },
        { name: t('features.basicPanel'), available: true },
        { name: t('features.enterpriseCurrency'), available: true },
        { name: t('features.basicAI'), available: true },
        { name: t('features.premiumComparator'), available: true },
        { name: t('features.premiumStats'), available: true },
        { name: t('features.enterpriseCategories'), available: true },
        { name: t('features.premiumChat'), available: true },
        { name: t('features.basicProfile'), available: true },
      ],
      summary: t('enterpriseSummary'),
    },
  ];

  // ===== DETERMINAR SI ES DOWNGRADE =====
  const isDowngrade = (targetPlanId) => {
    const currentPlan = user.plan_suscripcion;
    const planOrder = ['basic', 'premium', 'enterprise'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const targetIndex = planOrder.indexOf(targetPlanId);
    return targetIndex < currentIndex;
  };

  // ===== FUNCIÓN PARA REALIZAR LOGOUT DESPUÉS DE CAMBIO =====
  const performLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('financiaunt_user');
      localStorage.removeItem('financiaunt_session');
      window.location.href = '/login';
    }
  };

  // ===== ACTUALIZAR PLAN Y LUEGO HACER LOGOUT =====
  const updatePlanAndLogout = async (newPlanId) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ plan_suscripcion: newPlanId })
        .eq('id', user.id);

      if (error) throw error;

      setMessage(`✅ ${t('planChangedTo')} ${plans.find((p) => p.id === newPlanId).name}. ${t('redirecting')}`);
      setMessageType('success');

      setTimeout(() => {
        performLogout();
      }, 1500);
    } catch (err) {
      console.error('Error al cambiar plan:', err);
      setMessage(err.message || t('error'));
      setMessageType('error');
      setLoading(null);
    }
  };

  // ===== MANEJAR CAMBIO DE PLAN =====
  const handleChangePlan = async (planId) => {
    if (planId === user.plan_suscripcion) return;

    if (isDowngrade(planId)) {
      setDowngradeTarget(planId);
      setShowDowngradeModal(true);
      return;
    }

    if (planId !== 'basic') {
      if (!user.is_verified) {
        setPendingPlan(planId);
        // Generar código antes de mostrar el modal
        try {
          await requestVerificationCode(user.email);
          setShowVerificationModal(true);
        } catch (err) {
          setMessage(err.message || 'Error al enviar el código');
          setMessageType('error');
        }
        return;
      }
      setPendingPlan(planId);
      setShowPaymentModal(true);
      return;
    }
  };

  // ===== CONFIRMAR DOWNGRADE =====
  const confirmDowngrade = async () => {
    if (!downgradeTarget) return;

    setLoading(downgradeTarget);
    setMessage('');
    setMessageType('');
    setShowDowngradeModal(false);

    await updatePlanAndLogout(downgradeTarget);
  };

  // ===== VERIFICAR CÓDIGO =====
  const handleVerifyCode = async () => {
    setVerificationError('');
    try {
      const isValid = await verifyCode(user.email, verificationCode);
      if (!isValid) {
        setVerificationError(t('invalidCode'));
        return;
      }
      // Código correcto: marcar como verificado y abrir pago
      setShowVerificationModal(false);
      setVerificationCode('');
      // Actualizar usuario en estado local
      const updatedUser = { ...user, is_verified: true };
      onUserUpdate(updatedUser);
      localStorage.setItem('financiaunt_user', JSON.stringify(updatedUser));
      // Abrir modal de pago
      setShowPaymentModal(true);
    } catch (err) {
      setVerificationError(err.message || t('errorVerifying'));
    }
  };

  // ===== CONFIRMAR PAGO =====
  const handlePayment = async () => {
    setLoading(pendingPlan);
    setMessage('');
    setMessageType('');

    try {
      // Actualizar plan y datos de pago en Supabase
      const { error } = await supabase
        .from('usuarios')
        .update({
          plan_suscripcion: pendingPlan,
          cardholder_name: paymentDetails.cardholderName,
          card_number_preview: '****' + paymentDetails.cardNumber.slice(-4),
          card_expiry: paymentDetails.expiry,
          is_verified: true, // aseguramos que esté verificado
        })
        .eq('id', user.id);

      if (error) throw error;

      setShowPaymentModal(false);
      setPendingPlan(null);

      // Logout después del upgrade
      await updatePlanAndLogout(pendingPlan);
    } catch (err) {
      setMessage(err.message || t('error'));
      setMessageType('error');
      setLoading(null);
    }
  };

  // ===== ESTILOS (igual que antes) =====
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
    display: 'flex',
    flexDirection: 'column',
  });

  const buttonStyle = (active, disabled = false) => ({
    backgroundColor: active ? (isDark ? '#2a3a5e' : '#e5e7eb') : '#667eea',
    color: active ? (isDark ? '#e0e0e0' : '#1e293b') : 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    width: '100%',
    opacity: disabled ? 0.5 : 1,
    transition: 'background-color 0.2s',
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

  // ===== RENDER =====
  return (
    <div style={pageStyle}>
      <h1 className="page-title">{t('plans')}</h1>

      {message && (
        <div
          style={{
            padding: '1rem',
            borderRadius: '8px',
            marginBottom: '1.5rem',
            backgroundColor:
              messageType === 'success'
                ? isDark
                  ? '#166534'
                  : '#dcfce7'
                : isDark
                ? '#7f1d1d'
                : '#fee2e2',
            color:
              messageType === 'success'
                ? isDark
                  ? '#86efac'
                  : '#166534'
                : isDark
                ? '#fca5a5'
                : '#7f1d1d',
          }}
        >
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {plans.map((plan) => {
          const isCurrentPlan = user.plan_suscripcion === plan.id;

          return (
            <div key={plan.id} style={planCardStyle(plan.featured)}>
              {plan.featured && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '20px',
                    backgroundColor: '#667eea',
                    color: 'white',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                  }}
                >
                  {t('mostPopular')}
                </div>
              )}
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>{plan.name}</h2>
              <div style={{ marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>${plan.price}</span>
                <span style={{ color: isDark ? '#94a3b8' : '#64748b' }}> {t('perMonth')}</span>
              </div>

              <p style={{ marginBottom: '1.5rem', color: isDark ? '#94a3b8' : '#64748b', fontSize: '0.95rem' }}>
                {plan.summary}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, marginBottom: '1.5rem', flex: 1 }}>
                {plan.features.map((feature, index) => (
                  <li key={index} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <span style={{ color: feature.available ? '#22c55e' : '#ef4444', flexShrink: 0 }}>
                      {feature.available ? <Check size={18} /> : <X size={18} />}
                    </span>
                    <span style={{ color: isDark ? '#e0e0e0' : '#1e293b', fontSize: '0.9rem' }}>{feature.name}</span>
                  </li>
                ))}
              </ul>
              <button
                style={buttonStyle(isCurrentPlan)}
                onClick={() => handleChangePlan(plan.id)}
                disabled={loading === plan.id || isCurrentPlan}
              >
                {loading === plan.id
                  ? t('loading')
                  : isCurrentPlan
                  ? t('alreadyHave')
                  : t('choosePlan')}
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal de Downgrade (sin cambios) */}
      {showDowngradeModal && (
        <div
          style={modalOverlayStyle}
          onClick={() => {
            setShowDowngradeModal(false);
            setDowngradeTarget(null);
          }}
        >
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>
              ⚠️ {t('downgradeWarning')}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              {t('downgradeMessage')}
            </p>
            <ul style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem', color: isDark ? '#e0e0e0' : '#1e293b' }}>
              <li>🔒 {t('downgradeFeature1')}</li>
              <li>💳 {t('downgradeFeature2')}</li>
              <li>📉 {t('downgradeFeature3')}</li>
            </ul>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                style={{ ...buttonStyle(false), flex: 1 }}
                onClick={() => {
                  setShowDowngradeModal(false);
                  setDowngradeTarget(null);
                }}
              >
                {t('cancel')}
              </button>
              <button
                style={{ ...buttonStyle(false), flex: 1, backgroundColor: '#ef4444' }}
                onClick={confirmDowngrade}
                disabled={loading === downgradeTarget}
              >
                {loading === downgradeTarget ? t('loading') : t('confirmDowngrade')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Verificación de Email */}
      {showVerificationModal && (
        <div style={modalOverlayStyle} onClick={() => setShowVerificationModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
              📧 {t('verifyEmail')}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              {t('enterCodeSentTo')} <strong>{user.email}</strong>
            </p>
            {verificationError && (
              <div style={{ color: '#ef4444', marginBottom: '1rem' }}>{verificationError}</div>
            )}
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="••••••"
              style={inputStyle}
              maxLength={6}
            />
            <button
              style={{
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
              }}
              onClick={handleVerifyCode}
            >
              {t('verify')}
            </button>
            <button
              style={{
                marginTop: '0.5rem',
                background: 'transparent',
                border: 'none',
                color: isDark ? '#94a3b8' : '#64748b',
                cursor: 'pointer',
                width: '100%',
                padding: '0.5rem',
              }}
              onClick={() => {
                setShowVerificationModal(false);
                setVerificationCode('');
                setVerificationError('');
                setPendingPlan(null);
              }}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Modal de Pago */}
      {showPaymentModal && (
        <div style={modalOverlayStyle} onClick={() => setShowPaymentModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
              💳 {t('payment')} - {plans.find((p) => p.id === pendingPlan)?.name}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: isDark ? '#94a3b8' : '#64748b' }}>
              {t('enterPaymentDetails')}
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
              maxLength={19}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <input
                type="text"
                value={paymentDetails.expiry}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                placeholder={t('expiry')}
                style={{ ...inputStyle, flex: 1 }}
                maxLength={5}
              />
              <input
                type="text"
                value={paymentDetails.cvv}
                onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                placeholder={t('cvv')}
                style={{ ...inputStyle, flex: 1 }}
                maxLength={4}
              />
            </div>

            <button
              style={{
                backgroundColor: '#667eea',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                marginTop: '1rem',
              }}
              onClick={handlePayment}
              disabled={loading}
            >
              {loading ? t('processing') : t('confirmPayment')}
            </button>
            <button
              style={{
                marginTop: '0.5rem',
                background: 'transparent',
                border: 'none',
                color: isDark ? '#94a3b8' : '#64748b',
                cursor: 'pointer',
                width: '100%',
                padding: '0.5rem',
              }}
              onClick={() => {
                setShowPaymentModal(false);
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
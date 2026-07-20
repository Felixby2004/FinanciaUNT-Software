import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, hashPassword } from '../lib/supabase.js';
import { Sun, Moon, Globe, User, Mail, Lock, Check, Loader2 } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { requestVerificationCode, verifyCode } from '../lib/emailUtils.js';
import './Auth.css';

const Register = () => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: '',
    email: '',
    password: '',
    confirmPassword: '',
    plan: 'basico',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState({
    cardholderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [isSendingCode, setIsSendingCode] = useState(false);

  const plans = [
    {
      id: 'basico',
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
        { name: t('features.basicChat'), available: true },
      ],
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
        { name: t('features.premiumChat'), available: true },
      ],
      featured: true,
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
        { name: t('features.enterpriseChat'), available: true },
      ],
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlanSelect = (planId) => {
    setFormData((prev) => ({ ...prev, plan: planId }));
  };

  // ===== REGISTRAR USUARIO (con o sin datos de pago) =====
  const registerUser = async (plan, payment = null) => {
    const hashedPassword = await hashPassword(formData.password);
    const userData = {
      nombre: formData.nombre,
      email: formData.email,
      access_token_plaid: hashedPassword,
      plan_suscripcion: plan,
      rol: 'cliente',
      configuracion: {},
      is_verified: plan === 'basico', // básico ya verificado
    };

    if (payment) {
      userData.cardholder_name = payment.cardholderName;
      userData.card_number_preview = '****' + payment.cardNumber.slice(-4);
      userData.card_expiry = payment.expiry;
    }

    const { error: dbError } = await supabase.from('usuarios').insert(userData);
    if (dbError) throw dbError;
  };

  // ===== ENVÍO DEL FORMULARIO =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('passwordMismatch'));
      setLoading(false);
      return;
    }

    // Si el plan es básico, registrar directamente
    if (formData.plan === 'basico') {
      try {
        await registerUser('basico');
        navigate('/login');
      } catch (err) {
        setError(err.message || t('errorCreating'));
        setLoading(false);
      }
      return;
    }

    // Plan pago: solicitar verificación de email
    try {
      setIsSendingCode(true);
      await requestVerificationCode(formData.email);
      setPendingPlan(formData.plan);
      setShowVerificationModal(true);
      setLoading(false);
      setIsSendingCode(false);
    } catch (err) {
      setError(err.message || t('errorSendingCode'));
      setLoading(false);
      setIsSendingCode(false);
    }
  };

  // ===== VERIFICAR CÓDIGO =====
  const handleVerifyCode = async () => {
    setVerificationError('');
    try {
      const isValid = await verifyCode(formData.email, verificationCode);
      if (!isValid) {
        setVerificationError(t('invalidCode'));
        return;
      }
      // Código correcto: cerrar modal y abrir pago
      setShowVerificationModal(false);
      setVerificationCode('');
      setShowPaymentModal(true);
    } catch (err) {
      setVerificationError(err.message || t('errorVerifying'));
    }
  };

  // ===== CONFIRMAR PAGO =====
  const handlePaymentConfirm = async () => {
    setLoading(true);
    try {
      await registerUser(pendingPlan, paymentDetails);
      navigate('/login');
    } catch (err) {
      setError(err.message || t('errorCreating'));
      setLoading(false);
      setShowPaymentModal(false);
    }
  };

  // ===== ESTILOS MODALES =====
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
    backgroundColor: theme === 'dark' ? '#16213e' : '#ffffff',
    border: theme === 'dark' ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '500px',
    width: '90%',
    boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: theme === 'dark' ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    marginBottom: '1rem',
    backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
    color: theme === 'dark' ? '#e0e0e0' : '#1e293b',
    outline: 'none',
  };

  // ===== RENDER =====
  return (
    <div className="auth-container">
      <div className="auth-background">
        <img
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80"
          alt="Financial background"
          className="auth-background-image"
        />
        <div className="auth-background-overlay"></div>
      </div>

      <div className="auth-header-controls">
        <button className="auth-toggle-button" onClick={toggleTheme} title={t('theme')}>
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

      <div className="auth-card register-card">
        <div className="auth-header">
          <div className="auth-logo-container">
            <img
              src="https://res.cloudinary.com/dfoiispgm/image/upload/v1784387381/logo_unt_wsghnl.png"
              alt="Universidad Logo"
              className="university-logo"
            />
            <h1 className="auth-logo">FinanciaUNT</h1>
          </div>
          <h2 className="auth-title">{t('createAccount')}</h2>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              <User size={16} /> {t('name')}
            </label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder={t('yourName')}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Mail size={16} /> {t('email')}
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder={t('yourEmail')}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} /> {t('password')}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              <Lock size={16} /> {t('confirmPassword')}
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="••••••••"
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('selectPlan')}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '12px' }}>
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => handlePlanSelect(plan.id)}
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    border: `2px solid ${
                      formData.plan === plan.id ? 'var(--accent-blue)' : 'var(--border-color)'
                    }`,
                    background: formData.plan === plan.id ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {formData.plan === plan.id && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--accent-gradient)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                      }}
                    >
                      <Check size={14} />
                    </div>
                  )}
                  <div
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: '700',
                      marginBottom: '4px',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {plan.name}
                  </div>
                  <div
                    style={{
                      fontSize: '1.5rem',
                      fontWeight: '800',
                      marginBottom: '12px',
                      color: 'var(--accent-green)',
                    }}
                  >
                    ${plan.price}{' '}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '400' }}>
                      /mes
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.825rem',
                      flex: 1,
                    }}
                  >
                    {plan.features.slice(0, 5).map((feature, i) => (
                      <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--accent-green)', marginTop: '1px' }}>
                          <Check size={14} />
                        </span>
                        <span>{feature.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="primary-button auth-button" disabled={loading || isSendingCode}>
            {loading || isSendingCode ? (
              <>
                <Loader2 size={18} className="spinner" /> {isSendingCode ? t('sendingCode') : t('creating')}
              </>
            ) : (
              t('createAccount')
            )}
          </button>
        </form>

        <p className="auth-footer">
          {t('haveAccount')}{' '}
          <Link to="/login" className="auth-link">
            {t('signIn')}
          </Link>
        </p>
      </div>

      {/* === MODAL DE VERIFICACIÓN === */}
      {showVerificationModal && (
        <div style={modalOverlayStyle} onClick={() => setShowVerificationModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
              📧 {t('verifyEmail')}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
              {t('enterCodeSentTo')} <strong>{formData.email}</strong>
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
                color: theme === 'dark' ? '#94a3b8' : '#64748b',
                cursor: 'pointer',
                width: '100%',
                padding: '0.5rem',
              }}
              onClick={() => {
                setShowVerificationModal(false);
                setVerificationCode('');
                setVerificationError('');
              }}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* === MODAL DE PAGO === */}
      {showPaymentModal && (
        <div style={modalOverlayStyle} onClick={() => setShowPaymentModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
              💳 {t('payment')} - {plans.find((p) => p.id === pendingPlan)?.name}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
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
              onClick={handlePaymentConfirm}
              disabled={loading}
            >
              {loading ? t('processing') : t('confirmPayment')}
            </button>
            <button
              style={{
                marginTop: '0.5rem',
                background: 'transparent',
                border: 'none',
                color: theme === 'dark' ? '#94a3b8' : '#64748b',
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

export default Register;
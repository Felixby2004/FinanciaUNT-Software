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
  const [paymentErrors, setPaymentErrors] = useState({
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

  // ===== MANEJADORES DE FORMULARIO =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlanSelect = (planId) => {
    setFormData((prev) => ({ ...prev, plan: planId }));
  };

  // ===== VALIDACIONES DE TARJETA (solo simulación) =====
  const validateCardNumber = (value) => {
    const clean = value.replace(/\s/g, '');
    if (!/^\d*$/.test(clean)) return 'Solo números';
    if (clean.length > 16) return 'Máximo 16 dígitos';
    return '';
  };

  const validateExpiry = (value) => {
    const clean = value.replace('/', '');
    if (!/^\d*$/.test(clean)) return 'Solo números';
    if (clean.length > 4) return 'Formato MM/AA';
    if (clean.length === 4) {
      const month = parseInt(clean.substring(0, 2));
      const year = parseInt(clean.substring(2, 4));
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      if (month < 1 || month > 12) return 'Mes inválido (1-12)';
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return 'Tarjeta expirada';
      }
    }
    return '';
  };

  const validateCVV = (value) => {
    if (!/^\d*$/.test(value)) return 'Solo números';
    if (value.length > 4) return 'Máximo 4 dígitos';
    if (value.length < 3) return 'Mínimo 3 dígitos';
    return '';
  };

  const formatCardNumber = (value) => {
    const clean = value.replace(/\s/g, '');
    const groups = clean.match(/.{1,4}/g);
    return groups ? groups.join(' ') : clean;
  };

  const formatExpiry = (value) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length >= 2) {
      return clean.substring(0, 2) + '/' + clean.substring(2, 4);
    }
    return clean;
  };

  const handlePaymentChange = (field, value) => {
    let formatted = value;
    let error = '';

    switch (field) {
      case 'cardNumber':
        formatted = formatCardNumber(value);
        error = validateCardNumber(value);
        break;
      case 'expiry':
        formatted = formatExpiry(value);
        error = validateExpiry(value);
        break;
      case 'cvv':
        formatted = value.replace(/\D/g, '');
        error = validateCVV(formatted);
        break;
      case 'cardholderName':
        formatted = value;
        error = value.trim().length < 3 ? 'Nombre completo requerido' : '';
        break;
      default:
        formatted = value;
    }

    setPaymentDetails((prev) => ({ ...prev, [field]: formatted }));
    setPaymentErrors((prev) => ({ ...prev, [field]: error }));
  };

  const isPaymentValid = () => {
    return (
      paymentDetails.cardholderName.trim().length >= 3 &&
      !paymentErrors.cardNumber &&
      !paymentErrors.expiry &&
      !paymentErrors.cvv &&
      paymentDetails.cardNumber.replace(/\s/g, '').length === 16 &&
      paymentDetails.expiry.replace('/', '').length === 4 &&
      paymentDetails.cvv.length >= 3
    );
  };

  // ===== REGISTRAR USUARIO (SIN GUARDAR DATOS BANCARIOS) =====
  const registerUser = async (plan, isVerified = false) => {
    const hashedPassword = await hashPassword(formData.password);
    const userData = {
      nombre: formData.nombre,
      email: formData.email,
      access_token_plaid: hashedPassword,
      plan_suscripcion: plan,
      rol: 'cliente',
      configuracion: {},
      is_verified: isVerified,
    };

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

    // Plan básico: registro directo
    if (formData.plan === 'basico') {
      try {
        await registerUser('basico', false);
        navigate('/login');
      } catch (err) {
        setError(err.message || t('errorCreating'));
        setLoading(false);
      }
      return;
    }

    // Plan de pago: enviar código de verificación
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
      setShowVerificationModal(false);
      setVerificationCode('');
      setShowPaymentModal(true);
    } catch (err) {
      setVerificationError(err.message || t('errorVerifying'));
    }
  };

  // ===== CONFIRMAR PAGO =====
  const handlePaymentConfirm = async () => {
    if (!isPaymentValid()) {
      setError('Por favor, completa todos los campos de pago correctamente.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await registerUser(pendingPlan, true);
      navigate('/login');
    } catch (err) {
      setError(err.message || t('errorCreating'));
      setLoading(false);
      setShowPaymentModal(false);
    }
  };

  // ===== ESTILOS =====
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
    maxHeight: '90vh',
    overflowY: 'auto',
  };

  const inputStyle = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: theme === 'dark' ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '1rem',
    marginBottom: '0.25rem',
    backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff',
    color: theme === 'dark' ? '#e0e0e0' : '#1e293b',
    outline: 'none',
    transition: 'border-color 0.2s',
  };

  const inputErrorStyle = {
    ...inputStyle,
    borderColor: '#ef4444',
  };

  const errorTextStyle = {
    color: '#ef4444',
    fontSize: '0.8rem',
    marginBottom: '0.75rem',
    display: 'block',
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
                <Loader2 size={18} className="spinner" /> {isSendingCode ? 'Enviando código...' : t('creating')}
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

      {/* ===== MODAL DE VERIFICACIÓN ===== */}
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
                marginTop: '0.5rem',
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
                setPendingPlan(null);
              }}
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ===== MODAL DE PAGO ===== */}
      {showPaymentModal && (
        <div style={modalOverlayStyle} onClick={() => setShowPaymentModal(false)}>
          <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
              💳 {t('payment')} - {plans.find((p) => p.id === pendingPlan)?.name}
            </h2>
            <p style={{ marginBottom: '1.5rem', color: theme === 'dark' ? '#94a3b8' : '#64748b' }}>
              {t('enterPaymentDetails')}
            </p>

            {/* Titular de la tarjeta */}
            <input
              type="text"
              value={paymentDetails.cardholderName}
              onChange={(e) => handlePaymentChange('cardholderName', e.target.value)}
              placeholder={t('cardholderName')}
              style={paymentErrors.cardholderName ? inputErrorStyle : inputStyle}
              maxLength={50}
            />
            {paymentErrors.cardholderName && (
              <span style={errorTextStyle}>{paymentErrors.cardholderName}</span>
            )}

            {/* Número de tarjeta */}
            <input
              type="text"
              value={paymentDetails.cardNumber}
              onChange={(e) => handlePaymentChange('cardNumber', e.target.value)}
              placeholder={t('cardNumber')}
              style={paymentErrors.cardNumber ? inputErrorStyle : inputStyle}
              maxLength={19}
            />
            {paymentErrors.cardNumber && (
              <span style={errorTextStyle}>{paymentErrors.cardNumber}</span>
            )}

            {/* Expiración y CVV */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={paymentDetails.expiry}
                  onChange={(e) => handlePaymentChange('expiry', e.target.value)}
                  placeholder={t('expiry')}
                  style={paymentErrors.expiry ? inputErrorStyle : inputStyle}
                  maxLength={5}
                />
                {paymentErrors.expiry && (
                  <span style={errorTextStyle}>{paymentErrors.expiry}</span>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="text"
                  value={paymentDetails.cvv}
                  onChange={(e) => handlePaymentChange('cvv', e.target.value)}
                  placeholder={t('cvv')}
                  style={paymentErrors.cvv ? inputErrorStyle : inputStyle}
                  maxLength={4}
                />
                {paymentErrors.cvv && (
                  <span style={errorTextStyle}>{paymentErrors.cvv}</span>
                )}
              </div>
            </div>

            <button
              style={{
                backgroundColor: isPaymentValid() ? '#667eea' : '#94a3b8',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: isPaymentValid() ? 'pointer' : 'not-allowed',
                width: '100%',
                marginTop: '1rem',
                opacity: isPaymentValid() ? 1 : 0.6,
              }}
              onClick={handlePaymentConfirm}
              disabled={!isPaymentValid() || loading}
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
                setPaymentDetails({
                  cardholderName: '',
                  cardNumber: '',
                  expiry: '',
                  cvv: '',
                });
                setPaymentErrors({
                  cardholderName: '',
                  cardNumber: '',
                  expiry: '',
                  cvv: '',
                });
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
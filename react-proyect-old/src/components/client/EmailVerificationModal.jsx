import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

// Función para hashear un texto usando SHA-256
const hashText = async (text) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const EmailVerificationModal = ({ user, onVerified, onClose }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const generateRandomCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  // Enviar correo mediante Edge Function de Supabase
  const sendVerificationEmail = async (email, code) => {
    const { error } = await supabase.functions.invoke('send-verification-email', {
      body: { email, code },
    });
    if (error) throw new Error(error.message || 'Error al enviar el correo');
  };

  const handleSendCode = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const verificationCode = generateRandomCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

      // Hashear el código antes de guardarlo
      const hashedCode = await hashText(verificationCode);

      // Guardar el hash en la base de datos
      const { error } = await supabase
        .from('usuarios')
        .update({
          verification_code: hashedCode,
          verification_code_expires_at: expiresAt.toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      // Enviar el código por correo (sin hash)
      await sendVerificationEmail(user.email, verificationCode);

      setMessage(t('weSentCode') || 'Código enviado a tu correo');
      setMessageType('success');
    } catch (err) {
      console.error('Error al enviar código:', err);
      setMessage(err.message || t('error'));
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      // Obtener el hash almacenado y la expiración
      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('verification_code, verification_code_expires_at')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      // Verificar expiración
      if (new Date(userData.verification_code_expires_at) < new Date()) {
        setMessage(t('codeExpired') || 'El código ha expirado');
        setMessageType('error');
        return;
      }

      // Hashear el código ingresado
      const hashedInput = await hashText(code);

      // Comparar hashes
      if (userData.verification_code !== hashedInput) {
        setMessage(t('invalidCode') || 'Código incorrecto');
        setMessageType('error');
        return;
      }

      // Marcar como verificado
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({
          is_verified: true,
          verification_code: null,
          verification_code_expires_at: null,
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      onVerified();
    } catch (err) {
      setMessage(err.message || t('error'));
      setMessageType('error');
    } finally {
      setLoading(false);
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

  const buttonStyle = {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    width: '100%',
    marginBottom: '0.5rem',
    opacity: loading ? 0.6 : 1,
    pointerEvents: loading ? 'none' : 'auto',
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: isDark ? '#2a3a5e' : '#e5e7eb',
    color: isDark ? '#e0e0e0' : '#1e293b',
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>
          {t('verifyYourEmail') || 'Verifica tu correo'}
        </h2>
        <p style={{ marginBottom: '1.5rem', color: isDark ? '#94a3b8' : '#64748b' }}>
          {t('weSentCode') || 'Ingresa el código que enviamos a tu correo'}
        </p>

        {message && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              backgroundColor:
                messageType === 'success'
                  ? isDark ? '#166534' : '#dcfce7'
                  : isDark ? '#7f1d1d' : '#fee2e2',
              color:
                messageType === 'success'
                  ? isDark ? '#86efac' : '#166534'
                  : isDark ? '#fca5a5' : '#7f1d1d',
            }}
          >
            {message}
          </div>
        )}

        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('verificationCode') || 'Código de verificación'}
          style={inputStyle}
          maxLength={6}
        />

        <button style={buttonStyle} onClick={handleVerify} disabled={loading}>
          {loading ? t('loading') || 'Cargando...' : t('verify') || 'Verificar'}
        </button>

        <button style={secondaryButtonStyle} onClick={handleSendCode} disabled={loading}>
          {loading ? t('loading') || 'Cargando...' : t('resendCode') || 'Reenviar código'}
        </button>
      </div>
    </div>
  );
};

export default EmailVerificationModal;
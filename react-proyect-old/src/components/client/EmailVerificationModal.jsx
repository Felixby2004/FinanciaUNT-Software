
import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';

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

  const handleSendCode = async () => {
    setLoading(true);
    setMessage('');
    setMessageType('');
    
    try {
      const verificationCode = generateRandomCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const { error } = await supabase
        .from('usuarios')
        .update({ verification_code: verificationCode, verification_code_expires_at: expiresAt })
        .eq('id', user.id);

      if (error) throw error;

      // In a real app, you'd send the email using an email service
      console.log('Verification code:', verificationCode);
      
      setMessage(t('weSentCode'));
      setMessageType('success');
    } catch (err) {
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
      const { data: userData, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (new Date(userData.verification_code_expires_at) < new Date()) {
        setMessage(t('codeExpired'));
        setMessageType('error');
        return;
      }

      if (userData.verification_code !== code) {
        setMessage(t('invalidCode'));
        setMessageType('error');
        return;
      }

      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ is_verified: true, verification_code: null, verification_code_expires_at: null })
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
  };

  const secondaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: isDark ? '#2a3a5e' : '#e5e7eb',
    color: isDark ? '#e0e0e0' : '#1e293b',
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 700 }}>{t('verifyYourEmail')}</h2>
        <p style={{ marginBottom: '1.5rem', color: isDark ? '#94a3b8' : '#64748b' }}>{t('weSentCode')}</p>
        
        {message && (
          <div style={{ 
            padding: '0.75rem 1rem', 
            borderRadius: '8px', 
            marginBottom: '1rem', 
            backgroundColor: messageType === 'success' ? (isDark ? '#166534' : '#dcfce7') : (isDark ? '#7f1d1d' : '#fee2e2'),
            color: messageType === 'success' ? (isDark ? '#86efac' : '#166534') : (isDark ? '#fca5a5' : '#7f1d1d')
          }}>
            {message}
          </div>
        )}
        
        <input 
          type="text" 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={t('verificationCode')}
          style={inputStyle}
        />
        <button style={buttonStyle} onClick={handleVerify} disabled={loading}>
          {loading ? t('loading') : t('verify')}
        </button>
        <button style={secondaryButtonStyle} onClick={handleSendCode} disabled={loading}>
          {loading ? t('loading') : t('resendCode')}
        </button>
      </div>
    </div>
  );
};

export default EmailVerificationModal;

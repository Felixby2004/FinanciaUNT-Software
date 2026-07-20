import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, MessageSquare, User, LogOut, Sun, Moon, Globe, Mic, Send, Lock } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { getFinancialAdvisorReply } from '../lib/openaiService';

const Navbar = ({ user, onLogout }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // === LÍMITE DE MENSAJES PARA BÁSICO ===
  const [dailyCount, setDailyCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const DAILY_LIMIT = 10;

  const location = useLocation();
  const isAdmin = user.rol === 'admin';
  const plan = user.plan_suscripcion || 'basic';
  const isPremium = plan === 'premium' || plan === 'enterprise';
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  // ===== CONTADOR DE MENSAJES (Básico) =====
  const getTodayKey = () => {
    const today = new Date().toISOString().split('T')[0];
    return `chat_messages_${user?.id || 'guest'}_${today}`;
  };

  useEffect(() => {
    if (plan === 'basic') {
      const key = getTodayKey();
      const stored = parseInt(localStorage.getItem(key) || '0', 10);
      setDailyCount(stored);
      setLimitReached(stored >= DAILY_LIMIT);
    }
  }, [plan, user?.id]);

  const incrementDailyCount = () => {
    if (plan === 'basic') {
      const key = getTodayKey();
      const newCount = dailyCount + 1;
      setDailyCount(newCount);
      localStorage.setItem(key, String(newCount));
      if (newCount >= DAILY_LIMIT) {
        setLimitReached(true);
      }
    }
  };

  // ===== ACTUALIZAR MENSAJE DE BIENVENIDA AL CAMBIAR IDIOMA =====
  useEffect(() => {
    if (isChatOpen && messages.length === 1 && messages[0]?.role === 'assistant') {
      setMessages((prev) => [
        {
          ...prev[0],
          content: t('chatWelcome') || '¡Hola! Soy tu asistente financiero. ¿En qué puedo ayudarte?',
        },
      ]);
    }
  }, [language, isChatOpen, t]);

  // ===== OBTENER DATOS FINANCIEROS DEL USUARIO =====
  const fetchUserFinancialData = async () => {
    try {
      const [txRes, budRes, goalRes] = await Promise.all([
        supabase.from('transacciones').select('*').eq('usuario_id', user.id).order('fecha', { ascending: false }).limit(50),
        supabase.from('presupuestos').select('*').eq('usuario_id', user.id),
        supabase.from('metas_financieras').select('*').eq('usuario_id', user.id),
      ]);
      return {
        transactions: txRes.data || [],
        budgets: budRes.data || [],
        goals: goalRes.data || [],
        userName: user?.name || 'Usuario',
        userPreferences: { language, plan },
      };
    } catch (error) {
      console.error('Error fetching financial data:', error);
      return { transactions: [], budgets: [], goals: [], userName: 'Usuario', userPreferences: { language, plan } };
    }
  };

  // ===== ABRIR CHAT (SIN BLOQUEO PARA BÁSICO) =====
  const handleOpenChat = () => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: t('chatWelcome') || '¡Hola! Soy tu asistente financiero. ¿En qué puedo ayudarte?',
        },
      ]);
    }
    setDraft('');
    setIsChatOpen(true);
  };

  // ===== ENVIAR MENSAJE =====
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!draft.trim()) return;

    // Verificar límite para Básico
    if (plan === 'basic' && limitReached) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⛔ ${t('dailyLimitReached') || 'Has alcanzado el límite de 10 mensajes por día. Vuelve mañana.'}`,
        },
      ]);
      setDraft('');
      return;
    }

    const userMessage = draft.trim();

    // Agregar mensaje del usuario
    const updatedMessages = [
      ...messages,
      { role: 'user', content: userMessage },
    ];
    setMessages(updatedMessages);
    setDraft('');
    setIsThinking(true);

    // Incrementar contador (Básico)
    if (plan === 'basic') {
      incrementDailyCount();
    }

    try {
      const financialData = await fetchUserFinancialData();
      const reply = await getFinancialAdvisorReply({
        message: userMessage,
        transactions: financialData.transactions,
        budgets: financialData.budgets,
        goals: financialData.goals,
        userName: financialData.userName,
        userPreferences: financialData.userPreferences,
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply },
      ]);
    } catch (error) {
      console.error('Error al llamar a OpenAI:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Lo siento, ocurrió un error al procesar tu mensaje. Intenta de nuevo.',
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // ===== MICRÓFONO (solo Premium/Enterprise) =====
  const handleMicClick = () => {
    if (!isPremium) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `🔒 ${t('voiceInputPremium') || 'Micrófono disponible en Premium y Enterprise.'}`,
        },
      ]);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Tu navegador no soporta reconocimiento de voz.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = language === 'es' ? 'es-ES' : 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;

    setIsRecording(true);
    recognition.start();

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setDraft(transcript);
      setIsRecording(false);
      setTimeout(() => {
        if (draft.trim()) {
          handleSendMessage({ preventDefault: () => {} });
        }
      }, 100);
    };

    recognition.onerror = (event) => {
      console.error('Error de reconocimiento:', event.error);
      setIsRecording(false);
      alert('Error al reconocer voz: ' + event.error);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };
  };

  // ===== CERRAR CHAT AL CAMBIAR DE RUTA =====
  useEffect(() => {
    setIsChatOpen(false);
  }, [location.pathname]);

  // ===== ESTILOS PARA EL CHAT =====
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#16213e' : '#ffffff';
  const borderColor = isDark ? '#2a3a5e' : '#e5e7eb';
  const textColor = isDark ? '#e0e0e0' : '#1e293b';
  const hoverBg = isDark ? '#1e2a4a' : '#f1f5f9';

  const navLinks = isAdmin
    ? [
        { to: '/admin', label: t('statistics') },
        { to: '/admin/ai-stats', label: 'AI Stats' },
        { to: '/admin/users', label: t('users') },
      ]
    : [
        { to: '/client', label: t('dashboard') },
        { to: '/client/ai-recommendations', label: 'IA' },
        { to: '/client/transactions', label: t('transactions') },
        { to: '/client/budgets', label: t('budgets') },
        { to: '/client/goals', label: t('goals') },
        { to: '/client/plans', label: t('plans') },
      ];

  const isActive = (to) => location.pathname === to;

  return (
    <>
      <nav className={`navbar ${isDark ? 'dark' : ''}`}>
        <div className="navbar-container">
          <Link to={isAdmin ? '/admin' : '/client'} className="navbar-logo">
            <img
              src="https://res.cloudinary.com/dfoiispgm/image/upload/v1784387381/logo_unt_wsghnl.png"
              alt="Universidad Logo"
            />
            FinanciaUNT
          </Link>

          <div className="navbar-links">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar-link ${isActive(link.to) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="navbar-actions">
            <button
              className="navbar-icon-button"
              onClick={() => toggleTheme()}
              title={t('theme')}
            >
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button
              className="navbar-icon-button"
              onClick={() => setLanguage(language === 'es' ? 'en' : 'es')}
              title={t('language')}
            >
              <Globe size={20} />
              <span style={{ fontSize: '10px', fontWeight: 700 }}>
                {language.toUpperCase()}
              </span>
            </button>
            <Link
              to={isAdmin ? '/admin/profile' : '/client/profile'}
              className="navbar-icon-button"
              title={t('profile')}
            >
              <User size={20} />
            </Link>
            <button className="navbar-logout-button" onClick={onLogout}>
              <LogOut size={16} />
              {t('logout')}
            </button>
          </div>

          <button
            className="navbar-mobile-button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menú"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="navbar-mobile-menu">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`navbar-mobile-link ${isActive(link.to) ? 'active' : ''}`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="navbar-mobile-divider" />
            <button
              className="navbar-mobile-link"
              onClick={() => {
                setLanguage(language === 'es' ? 'en' : 'es');
                setIsMobileMenuOpen(false);
              }}
            >
              <Globe size={18} />
              {language.toUpperCase()}
            </button>
            <button className="navbar-mobile-link logout" onClick={onLogout}>
              <LogOut size={18} />
              {t('logout')}
            </button>
          </div>
        )}
      </nav>

      {/* Floating Chat Button (siempre visible) */}
      <button
        className="floating-chat-button"
        onClick={handleOpenChat}
        title={t('chat')}
      >
        <MessageSquare size={28} />
      </button>

      {/* Chat Widget (siempre accesible) */}
      {isChatOpen && (
        <div
          className="chat-widget"
          style={{
            position: 'fixed',
            bottom: '6rem',
            right: '2rem',
            width: '360px',
            maxWidth: '90vw',
            maxHeight: '480px',
            background: bgColor,
            border: `1px solid ${borderColor}`,
            borderRadius: '16px',
            boxShadow: isDark ? '0 20px 60px rgba(0,0,0,0.4)' : '0 20px 60px rgba(0,0,0,0.15)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.6rem 1rem',
              borderBottom: `1px solid ${borderColor}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: textColor }}>
              <MessageSquare size={18} /> {t('chat')}
              {plan === 'basic' && (
                <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                  ({DAILY_LIMIT - dailyCount} {t('remaining') || 'restantes'})
                </span>
              )}
              {isPremium && (
                <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>♾️</span>
              )}
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              style={{ background: 'transparent', border: 'none', color: textColor, cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: '0.8rem 1rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              maxHeight: '340px',
            }}
          >
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={idx}
                  style={{
                    padding: '0.4rem 0.7rem',
                    borderRadius: '12px',
                    maxWidth: '85%',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    background: isUser ? '#667eea' : hoverBg,
                    color: isUser ? 'white' : textColor,
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  {msg.content}
                </div>
              );
            })}
            {isThinking && (
              <div
                style={{
                  padding: '0.4rem 0.7rem',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: hoverBg,
                  color: textColor,
                  alignSelf: 'flex-start',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <span className="dot-flashing">•</span>
                  {t('thinking') || 'Pensando...'}
                </span>
              </div>
            )}
          </div>

          {/* Input (siempre visible, con condiciones según plan) */}
          <form
            onSubmit={handleSendMessage}
            style={{
              display: 'flex',
              gap: '0.5rem',
              padding: '0.5rem 0.75rem',
              borderTop: `1px solid ${borderColor}`,
              alignItems: 'center',
            }}
          >
            {/* MICRÓFONO: visible solo para Premium/Enterprise */}
            {isPremium ? (
              <button
                type="button"
                onClick={handleMicClick}
                style={{
                  background: isRecording ? '#ef4444' : 'transparent',
                  color: isRecording ? 'white' : textColor,
                  border: 'none',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                  position: 'relative',
                }}
                title={t('voiceInput') || 'Entrada por voz'}
              >
                <Mic size={18} />
                {isRecording && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-2px',
                      right: '-2px',
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#22c55e',
                      borderRadius: '50%',
                      animation: 'pulse 1s infinite',
                    }}
                  />
                )}
              </button>
            ) : (
              /* Para Básico: icono de candado (sin micrófono) */
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                }}
                title={t('voiceInputPremium') || 'Micrófono disponible en Premium y Enterprise'}
              >
                <Lock size={16} />
              </div>
            )}

            {/* Input de texto */}
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('chatPlaceholder') || 'Escribe tu mensaje...'}
              style={{
                flex: 1,
                padding: '0.4rem 0.7rem',
                border: `1px solid ${borderColor}`,
                borderRadius: '20px',
                background: bgColor,
                color: textColor,
                outline: 'none',
              }}
              disabled={plan === 'basic' && limitReached}
            />

            {/* Botón enviar */}
            <button
              type="submit"
              style={{
                background: '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              disabled={isThinking || (plan === 'basic' && limitReached)}
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default Navbar;
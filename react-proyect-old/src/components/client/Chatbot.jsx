import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Bot, User, Lock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import { generatePDFReport } from '../../lib/pdfGenerator';
import './ClientPages.css';

const Chatbot = ({ user }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [dailyCount, setDailyCount] = useState(0);
  const [limitReached, setLimitReached] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const messagesEndRef = useRef(null);

  const plan = user?.plan_suscripcion || user?.plan || 'basic';
  const isPremium = plan === 'premium' || plan === 'enterprise';
  const isEnterprise = plan === 'enterprise';
  const DAILY_LIMIT = 10;

  // ===== MENSAJE DE BIENVENIDA =====
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 1,
          text: t('initialBotMessage') || '¡Hola! Soy tu asistente financiero de FinanciaUNT. ¿En qué puedo ayudarte hoy?',
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
    }
  }, [t]);

  // ===== CONTADOR DE MENSAJES (solo Básico) =====
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
    } else {
      // Premium/Enterprise: sin límite
      setDailyCount(0);
      setLimitReached(false);
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

  // ===== RESPUESTAS NATURALES =====
  const getNaturalResponse = (userMessage) => {
    const responses = t('botResponses') || [
      'Entiendo. ¿Puedes darme más detalles sobre tu situación financiera?',
      'Buena pregunta. Revisa tus gastos del último mes para identificar patrones.',
      'Excelente. ¿Has considerado crear un presupuesto para esa categoría?',
      'Interesante. ¿Cuál es tu meta financiera principal?',
      'Perfecto. Recuerda que el ahorro constante es la clave del éxito financiero.',
      'Claro. ¿Te gustaría que te ayude a crear un plan de ahorro?',
      'Entendido. ¿Has registrado todos tus ingresos y gastos mensuales?',
      'Muy bien. ¿Qué porcentaje de tus ingresos estás ahorrando actualmente?',
      'Genial. Te recomiendo revisar tus suscripciones mensuales para optimizar gastos.',
      'Buen punto. ¿Quieres que te muestre cómo crear una meta financiera?',
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  // ===== COMANDOS CRUD (Premium/Enterprise) =====
  const processCommand = async (text) => {
    const lower = text.toLowerCase();

    // 1. Crear transacción
    if (lower.includes('crear transacción') || lower.includes('nuevo gasto') || lower.includes('nuevo ingreso')) {
      const isIncome = lower.includes('ingreso') || lower.includes('ingresos');
      const amountMatch = text.match(/(\d+\.?\d*)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
      if (amount === 0) {
        return 'No pude identificar el monto. Ejemplo: "Crear gasto de 50 en Alimentación"';
      }
      const category = text.match(/en\s+([a-zA-Záéíóúñ\s]+)/)?.[1]?.trim() || 'Otros';
      const description = text.replace(/crear\s+transacci[oó]n|nuevo\s+gasto|nuevo\s+ingreso/gi, '').trim();

      const { error } = await supabase
        .from('transacciones')
        .insert({
          usuario_id: user.id,
          monto: amount,
          tipo: isIncome ? 'ingreso' : 'gasto',
          categoria: category,
          descripcion: description || `${isIncome ? 'Ingreso' : 'Gasto'} automático`,
          fecha: new Date().toISOString().split('T')[0],
          cuenta: 'Cuenta Principal',
        });

      if (error) {
        console.error('Error al crear transacción:', error);
        return '❌ No pude crear la transacción. Verifica los datos e intenta de nuevo.';
      }
      return `✅ ${isIncome ? 'Ingreso' : 'Gasto'} de ${amount} en ${category} creado correctamente.`;
    }

    // 2. Crear presupuesto
    if (lower.includes('crear presupuesto') || lower.includes('nuevo presupuesto')) {
      const amountMatch = text.match(/(\d+\.?\d*)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
      if (amount === 0) {
        return 'No pude identificar el monto del presupuesto. Ejemplo: "Crear presupuesto de 500 en Alimentación"';
      }
      const category = text.match(/en\s+([a-zA-Záéíóúñ\s]+)/)?.[1]?.trim() || 'Otros';

      const { error } = await supabase
        .from('presupuestos')
        .insert({
          usuario_id: user.id,
          categoria: category,
          monto_maximo: amount,
          periodo: 'mensual',
        });

      if (error) {
        console.error('Error al crear presupuesto:', error);
        return '❌ No pude crear el presupuesto. Intenta de nuevo.';
      }
      return `✅ Presupuesto de ${amount} en ${category} creado correctamente.`;
    }

    // 3. Crear meta
    if (lower.includes('crear meta') || lower.includes('nueva meta')) {
      const amountMatch = text.match(/(\d+\.?\d*)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
      if (amount === 0) {
        return 'No pude identificar el monto de la meta. Ejemplo: "Crear meta de 1000 para viaje"';
      }
      const name = text.match(/para\s+([a-zA-Záéíóúñ\s]+)/)?.[1]?.trim() || 'Meta';
      const { error } = await supabase
        .from('metas_financieras')
        .insert({
          usuario_id: user.id,
          nombre: name,
          monto_objetivo: amount,
          monto_actual: 0,
          fecha_limite: null,
          estado: 'activo',
        });

      if (error) {
        console.error('Error al crear meta:', error);
        return '❌ No pude crear la meta. Intenta de nuevo.';
      }
      return `✅ Meta de ${amount} para "${name}" creada correctamente.`;
    }

    // 4. Generar reporte (Enterprise)
    if (isEnterprise && (lower.includes('reporte') || lower.includes('resumen') || lower.includes('pdf'))) {
      try {
        const { data: transactions } = await supabase
          .from('transacciones')
          .select('*')
          .eq('usuario_id', user.id)
          .order('fecha', { ascending: false });

        const { data: budgets } = await supabase
          .from('presupuestos')
          .select('*')
          .eq('usuario_id', user.id);

        const { data: goals } = await supabase
          .from('metas_financieras')
          .select('*')
          .eq('usuario_id', user.id);

        generatePDFReport({
          userName: user?.nombre || 'Usuario',
          transactions: transactions || [],
          budgets: budgets || [],
          goals: goals || [],
          plan: plan,
          baseCurrency: 'PEN',
          recommendations: [],
          prediction: null,
        });

        return '✅ Reporte PDF generado y descargado correctamente. Revisa tu carpeta de descargas.';
      } catch (err) {
        console.error('Error generando reporte:', err);
        return '❌ No pude generar el reporte. Asegúrate de tener datos suficientes.';
      }
    }

    return null; // No se detectó ningún comando
  };

  // ===== ENVIAR MENSAJE =====
  const handleSend = async () => {
    if (!inputText.trim()) return;

    // Verificar límite para Básico
    if (plan === 'basic' && limitReached) {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: `⛔ ${t('dailyLimitReached') || 'Has alcanzado el límite de 10 mensajes por día. Vuelve mañana.'}`,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
      setInputText('');
      return;
    }

    const userMessage = inputText.trim();
    setMessages((prev) => [
      ...prev,
      { id: prev.length + 1, text: userMessage, sender: 'user', timestamp: new Date() },
    ]);
    setInputText('');
    setIsThinking(true);

    // Incrementar contador (Básico)
    if (plan === 'basic') {
      incrementDailyCount();
    }

    // Procesar comandos (Premium / Enterprise)
    let botResponse = null;
    let isCommand = false;

    if (isPremium) {
      const commandResult = await processCommand(userMessage);
      if (commandResult) {
        botResponse = commandResult;
        isCommand = true;
      }
    }

    if (!isCommand) {
      botResponse = getNaturalResponse(userMessage);
    }

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: botResponse,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
      setIsThinking(false);
    }, 600 + Math.random() * 400);
  };

  // ===== MICRÓFONO (solo Premium/Enterprise) =====
  const handleMicClick = () => {
    if (!isPremium) {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          text: `🔒 ${t('voiceInputPremium') || 'La entrada por voz está disponible en planes Premium y Enterprise. Actualiza tu plan para usar esta función.'}`,
          sender: 'bot',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('El reconocimiento de voz no está soportado en tu navegador.');
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
      setInputText(transcript);
      setIsRecording(false);
      setTimeout(() => handleSend(), 100);
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

  // ===== SCROLL =====
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ===== ESTILOS (sin cambios) =====
  const chatbotStyle = {
    padding: '1.5rem',
    height: 'calc(100vh - 140px)',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: isDark ? '#1a1a2e' : '#f8fafc',
    color: isDark ? '#e0e0e0' : '#1e293b',
  };

  const chatContainerStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    border: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '16px',
    backgroundColor: isDark ? '#16213e' : '#ffffff',
    overflow: 'hidden',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
  };

  const messagesStyle = {
    flex: 1,
    padding: '1.5rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  };

  const messageStyle = {
    display: 'flex',
    gap: '0.75rem',
    maxWidth: '80%',
  };

  const userMessageStyle = {
    ...messageStyle,
    marginLeft: 'auto',
    flexDirection: 'row-reverse',
  };

  const botMessageStyle = {
    ...messageStyle,
    marginRight: 'auto',
  };

  const messageBubbleStyle = {
    padding: '0.75rem 1rem',
    borderRadius: '16px',
    maxWidth: '100%',
  };

  const botBubbleStyle = {
    ...messageBubbleStyle,
    backgroundColor: isDark ? '#2a3a5e' : '#f3f4f6',
    color: isDark ? '#e0e0e0' : '#1e293b',
    borderBottomLeftRadius: '4px',
  };

  const userBubbleStyle = {
    ...messageBubbleStyle,
    backgroundColor: '#667eea',
    color: 'white',
    borderBottomRightRadius: '4px',
  };

  const inputContainerStyle = {
    padding: '1rem',
    borderTop: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
  };

  const inputStyle = {
    flex: 1,
    padding: '0.75rem 1rem',
    border: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '9999px',
    outline: 'none',
    backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
    color: isDark ? '#e0e0e0' : '#1e293b',
  };

  const buttonStyle = {
    backgroundColor: '#667eea',
    color: 'white',
    border: 'none',
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  };

  const micButtonStyle = {
    ...buttonStyle,
    backgroundColor: isRecording ? '#ef4444' : (isPremium ? '#667eea' : '#64748b'),
    opacity: isPremium ? 1 : 0.5,
    cursor: isPremium ? 'pointer' : 'not-allowed',
    position: 'relative',
  };

  const limitInfoStyle = {
    fontSize: '0.8rem',
    color: isDark ? '#94a3b8' : '#64748b',
    padding: '0.25rem 1rem',
    borderTop: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const thinkingStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '16px',
    backgroundColor: isDark ? '#2a3a5e' : '#f3f4f6',
    color: isDark ? '#e0e0e0' : '#1e293b',
    alignSelf: 'flex-start',
    maxWidth: '80%',
  };

  // ===== Cálculo de mensajes restantes (solo Basic) =====
  const remainingMessages = plan === 'basic' ? Math.max(0, DAILY_LIMIT - dailyCount) : Infinity;
  const showLimit = plan === 'basic';

  // ===== MICRÓFONO VISIBLE SOLO PARA PREMIUM/ENTERPRISE =====
  const showMic = isPremium;

  return (
    <div style={chatbotStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontWeight: 700, fontSize: '1.5rem' }}>
          {t('financialAssistant')}
        </h2>
        <span style={{ fontSize: '0.8rem', color: isDark ? '#94a3b8' : '#64748b' }}>
          {plan === 'basic' ? (
            <>
              💬 {remainingMessages} {t('messagesRemaining') || 'mensajes restantes'}
            </>
          ) : (
            <span style={{ color: '#22c55e' }}>♾️ {t('unlimited') || 'Ilimitado'}</span>
          )}
        </span>
      </div>

      <div style={chatContainerStyle}>
        <div style={messagesStyle}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={msg.sender === 'user' ? userMessageStyle : botMessageStyle}
            >
              {msg.sender === 'bot' && <Bot size={24} color="#667eea" />}
              {msg.sender === 'user' && <User size={24} color="#667eea" />}
              <div style={msg.sender === 'user' ? userBubbleStyle : botBubbleStyle}>
                <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    marginTop: '0.25rem',
                    opacity: 0.7,
                  }}
                >
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          {isThinking && (
            <div style={thinkingStyle}>
              <span className="dot-flashing">•</span>
              <span>✍️ {t('thinking') || 'Pensando...'}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {showLimit && (
          <div style={limitInfoStyle}>
            <span>📊 {t('dailyMessages') || 'Mensajes usados hoy'}: {dailyCount}/{DAILY_LIMIT}</span>
            {limitReached && (
              <span style={{ color: '#ef4444', fontWeight: 600 }}>⛔ {t('limitReached') || 'Límite alcanzado'}</span>
            )}
          </div>
        )}

        <div style={inputContainerStyle}>
          {showMic && (
            <button
              style={micButtonStyle}
              onClick={handleMicClick}
              disabled={!isPremium || (limitReached && plan === 'basic')}
              title={isPremium ? t('voiceInput') || 'Entrada por voz' : t('voiceInputPremium') || 'Disponible en Premium y Enterprise'}
            >
              <Mic size={20} />
              {isRecording && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    backgroundColor: '#22c55e',
                    borderRadius: '50%',
                    width: '12px',
                    height: '12px',
                    animation: 'pulse 1s infinite',
                  }}
                />
              )}
            </button>
          )}
          {!showMic && (
            <div style={{ ...micButtonStyle, width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={16} />
            </div>
          )}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('typeMessage')}
            style={inputStyle}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={limitReached && plan === 'basic'}
          />
          <button onClick={handleSend} style={buttonStyle} disabled={limitReached && plan === 'basic'}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;
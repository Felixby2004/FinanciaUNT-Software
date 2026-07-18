
import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Bot, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import './ClientPages.css';

const Chatbot = ({ user }) => {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  
  const [messages, setMessages] = useState([
    { id: 1, text: language === 'es' ? '¡Hola! Soy tu asistente financiero personal. ¿En qué puedo ayudarte hoy?' : 'Hello! I am your personal financial assistant. How can I help you today?', sender: 'bot', timestamp: new Date() }
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg = { id: messages.length + 1, text: inputText, sender: 'user', timestamp: new Date() };
    setMessages([...messages, userMsg]);
    setInputText('');

    setTimeout(() => {
      const botResponses = t('botResponses');
      const randomRes = botResponses[Math.floor(Math.random() * botResponses.length)];
      setMessages(prev => [...prev, { id: prev.length + 1, text: randomRes, sender: 'bot', timestamp: new Date() }]);
    }, 1000);
  };

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

  return (
    <div style={chatbotStyle}>
      <h2 style={{ marginBottom: '1rem', fontWeight: 700, fontSize: '1.5rem' }}>{t('financialAssistant')}</h2>
      <div style={chatContainerStyle}>
        <div style={messagesStyle}>
          {messages.map(msg => (
            <div key={msg.id} style={msg.sender === 'user' ? userMessageStyle : botMessageStyle}>
              {msg.sender === 'bot' && <Bot size={24} color="#667eea" />}
              {msg.sender === 'user' && <User size={24} color="#667eea" />}
              <div style={msg.sender === 'user' ? userBubbleStyle : botBubbleStyle}>
                <p style={{ margin: 0, lineHeight: 1.5 }}>{msg.text}</p>
                <span style={{ display: 'block', fontSize: '0.75rem', marginTop: '0.25rem', opacity: 0.7 }}>
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div style={inputContainerStyle}>
          <button style={buttonStyle}>
            <Mic size={20} />
          </button>
          <input 
            type="text" 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('typeMessage')}
            style={inputStyle}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} style={buttonStyle}>
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

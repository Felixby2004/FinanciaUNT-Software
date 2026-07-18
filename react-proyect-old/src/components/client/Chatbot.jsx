
import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Bot } from 'lucide-react';
import './ClientPages.css';

const Chatbot = ({ user }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: '¡Hola! Soy tu asistente financiero personal. ¿En qué puedo ayudarte hoy?', sender: 'bot', timestamp: new Date() }
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

    // Respuesta simulada del bot
    setTimeout(() => {
      const botResponses = [
        'Claro, déjame revisar tu estado financiero.',
        '¡Excelente pregunta! Aquí tienes la información que necesitas.',
        'He analizado tus gastos y tengo algunas recomendaciones para ti.',
        '¿Te gustaría que genere un reporte ejecutivo con tus datos?'
      ];
      const randomRes = botResponses[Math.floor(Math.random() * botResponses.length)];
      setMessages(prev => [...prev, { id: prev.length + 1, text: randomRes, sender: 'bot', timestamp: new Date() }]);
    }, 1000);
  };

  return (
    <div className="chatbot">
      <h2>Asistente Financiero</h2>
      <div className="chat-container">
        <div className="messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.sender}`}>
              {msg.sender === 'bot' && <Bot size={20} />}
              <div className="message-bubble">
                <p>{msg.text}</p>
                <span className="message-time">{msg.timestamp.toLocaleTimeString()}</span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="input-container">
          <button className="mic-btn">
            <Mic size={20} />
          </button>
          <input 
            type="text" 
            value={inputText} 
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Escribe tu mensaje..."
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button onClick={handleSend} className="send-btn">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;

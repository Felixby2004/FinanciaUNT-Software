
import { useState } from 'react';
import { Bell, Check, X } from 'lucide-react';
import './ClientPages.css';

const Notifications = ({ user }) => {
  const [notifications, setNotifications] = useState([
    { id: 1, type: 'in_app', title: 'Presupuesto al límite', content: 'Tu presupuesto de Alimentación ha alcanzado el 90%', isRead: false, sentAt: new Date(Date.now() - 3600000) },
    { id: 2, type: 'in_app', title: 'Transacción recurrente', content: 'Se ha registrado tu transacción recurrente de Renta', isRead: true, sentAt: new Date(Date.now() - 86400000) },
    { id: 3, type: 'in_app', title: 'Nueva recomendación', content: 'La IA tiene una nueva recomendación para ti', isRead: false, sentAt: new Date(Date.now() - 172800000) },
  ]);

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  return (
    <div className="notifications">
      <h2>Centro de Notificaciones</h2>
      <div className="notifications-list">
        {notifications.map(n => (
          <div key={n.id} className={`notification-card ${n.isRead ? 'read' : 'unread'}`}>
            <div className="notif-icon">
              <Bell />
            </div>
            <div className="notif-content">
              <div className="notif-header">
                <h4>{n.title}</h4>
                <span className="notif-time">{n.sentAt.toLocaleString()}</span>
              </div>
              <p>{n.content}</p>
            </div>
            <div className="notif-actions">
              {!n.isRead && (
                <button onClick={() => markAsRead(n.id)} className="icon-btn" title="Marcar como leída">
                  <Check size={16} />
                </button>
              )}
              <button onClick={() => deleteNotification(n.id)} className="icon-btn delete" title="Eliminar">
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Notifications;

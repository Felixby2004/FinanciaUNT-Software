import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Trash2, AlertCircle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import './AdminPages.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('usuarios')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Error al cargar usuarios');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm(t('confirmDeleteUser') || '¿Estás seguro de eliminar este usuario?')) {
      try {
        await supabase.from('usuarios').delete().eq('id', userId);
        await fetchUsers();
      } catch (err) {
        console.error('Error deleting user:', err);
        alert(err.message || 'Error al eliminar usuario');
      }
    }
  };

  // Estilos dinámicos para el contenedor principal y la tarjeta
  const containerStyle = {
    backgroundColor: isDark ? '#1a1a2e' : '#f8fafc',
    color: isDark ? '#e0e0e0' : '#1e293b',
    minHeight: '100vh',
    padding: '32px',
    maxWidth: '1400px',
    margin: '0 auto',
    transition: 'background-color 0.3s, color 0.3s',
  };

  const cardStyle = {
    backgroundColor: isDark ? '#16213e' : '#ffffff',
    border: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
    transition: 'background-color 0.3s, border-color 0.3s',
  };

  const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '28px',
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: '700',
    margin: 0,
    color: isDark ? '#e0e0e0' : '#1e293b',
  };

  const countStyle = {
    color: isDark ? '#94a3b8' : '#64748b',
    fontSize: '0.9rem',
  };

  const errorStyle = {
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    backgroundColor: isDark ? '#7f1d1d' : '#fee2e2',
    color: isDark ? '#fca5a5' : '#7f1d1d',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  };

  const loadingStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50vh',
    fontSize: '1.2rem',
    color: isDark ? '#94a3b8' : '#64748b',
  };

  const emptyStyle = {
    textAlign: 'center',
    padding: '2rem',
    color: isDark ? '#94a3b8' : '#64748b',
  };

  const retryButtonStyle = {
    marginLeft: 'auto',
    background: 'none',
    border: 'none',
    color: 'inherit',
    textDecoration: 'underline',
    cursor: 'pointer',
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={loadingStyle}>
          {t('loadingUsers') || 'Cargando usuarios...'}
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h1 style={titleStyle}>
          {t('userManagement') || 'Gestión de Usuarios'}
        </h1>
        <span style={countStyle}>
          {users.length} {t('users') || 'usuarios'}
        </span>
      </div>

      {error && (
        <div style={errorStyle}>
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={fetchUsers} style={retryButtonStyle}>
            {t('retry') || 'Reintentar'}
          </button>
        </div>
      )}

      <div style={cardStyle}>
        <table className="users-data-table">
          <thead>
            <tr>
              <th>{t('name') || 'Nombre'}</th>
              <th>{t('email') || 'Email'}</th>
              <th>{t('plan') || 'Plan'}</th>
              <th>{t('role') || 'Rol'}</th>
              <th>{t('registrationDate') || 'Fecha Registro'}</th>
              <th>{t('actions') || 'Acciones'}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan="6" style={emptyStyle}>
                  {t('noUsers') || 'No hay usuarios registrados'}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id}>
                  <td>{user.nombre}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`users-plan-badge plan-${user.plan_suscripcion}`}>
                      {user.plan_suscripcion === 'basic' ? 'Básico' :
                       user.plan_suscripcion === 'premium' ? 'Premium' :
                       user.plan_suscripcion === 'enterprise' ? 'Enterprise' :
                       user.plan_suscripcion || 'Sin plan'}
                    </span>
                  </td>
                  <td>
                    <span className={`users-role-badge role-${user.rol}`}>
                      {user.rol === 'cliente' ? 'Cliente' :
                       user.rol === 'admin' ? 'Admin' :
                       user.rol || 'Sin rol'}
                    </span>
                  </td>
                  <td>
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : 'Fecha no disponible'}
                  </td>
                  <td>
                    <button
                      className="users-delete-button"
                      onClick={() => handleDeleteUser(user.id)}
                      title={t('deleteUser') || 'Eliminar usuario'}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
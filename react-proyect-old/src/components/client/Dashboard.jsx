
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';

const Dashboard = ({ userId, user }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, netSavings: 0 });
  const [loading, setLoading] = useState(true);

  const baseCurrency = user?.base_currency || user?.configuracion?.currency || 'PEN';

  const formatCurrency = useCallback((amount) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  }, [baseCurrency]);

  // Dummy data for demonstration
  useEffect(() => {
    setLoading(false);
  }, []);

  const pageStyle = {
    padding: '1.5rem',
    backgroundColor: isDark ? '#1a1a2e' : '#f8fafc',
    color: isDark ? '#e0e0e0' : '#1e293b',
    minHeight: '100vh',
    transition: 'background-color 0.3s, color 0.3s',
  };

  const cardStyle = {
    backgroundColor: isDark ? '#16213e' : '#ffffff',
    borderRadius: '16px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
    border: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    transition: 'background-color 0.3s, border-color 0.3s',
  };

  const statCardStyle = {
    ...cardStyle,
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    flex: 1,
    minWidth: '120px',
  };

  const statValueStyle = {
    fontSize: '1.5rem',
    fontWeight: 700,
    margin: 0,
  };

  const statLabelStyle = {
    fontSize: '0.875rem',
    color: isDark ? '#94a3b8' : '#64748b',
    margin: 0,
  };

  const heroStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
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
  };

  if (loading) {
    return (
      <div style={{ ...pageStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid rgba(0,0,0,0.1)', borderTopColor: '#667eea', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p>{t('loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={heroStyle}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#667eea', margin: 0 }}>{t('financialPanel')}</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0' }}>{t('dashboard')}</h1>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{t('dashboardDescription')}</p>
        </div>
        <button style={buttonStyle}>{`📄 ${t('generateReport')}`}</button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>📈</span>
          <div>
            <p style={statLabelStyle}>{t('totalIncome')}</p>
            <p style={{ ...statValueStyle, color: '#22c55e' }}>{formatCurrency(15000)}</p>
          </div>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>📉</span>
          <div>
            <p style={statLabelStyle}>{t('totalExpenses')}</p>
            <p style={{ ...statValueStyle, color: '#ef4444' }}>{formatCurrency(8000)}</p>
          </div>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>💰</span>
          <div>
            <p style={statLabelStyle}>{t('netSavings')}</p>
            <p style={{ ...statValueStyle, color: '#22c55e' }}>{formatCurrency(7000)}</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{t('expenseDistribution')}</h2>
          <p>{t('noExpenses')}</p>
        </div>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{t('budgetVsActual')}</h2>
          <p>{t('noBudgets')}</p>
        </div>
      </div>

      <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
        <h2 style={{ marginTop: 0 }}>{t('recentTransactions')}</h2>
        <p>{t('noTransactions')}</p>
      </div>
    </div>
  );
};

export default Dashboard;

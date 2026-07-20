import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  buildUserModelRecommendations,
  compareRecommendations,
  predictNextMonth,
  getPlanRecommendationLimit,
  formatCurrency as formatCurrencyUtil,
  AI_MODEL_LABELS,
  AI_MODEL_TYPES,
} from '../../lib/aiEngine';
import { generatePDFReport } from '../../lib/pdfGenerator';
import { getUserPlan } from '../../utils/planChecker';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import CurrencyRates from './CurrencyRates';
import './ClientPages.css';

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement
);

const Dashboard = ({ userId, user }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  // Estados
  const [stats, setStats] = useState({ totalIncome: 0, totalExpenses: 0, netSavings: 0 });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Datos del usuario
  const baseCurrency = user?.base_currency || user?.configuracion?.currency || 'PEN';
  const plan = getUserPlan(user);
  const limit = getPlanRecommendationLimit(user);

  // Formateador de moneda
  const formatCurrency = useCallback((amount) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  }, [baseCurrency]);

  // --- Carga de datos desde Supabase ---
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Obtener transacciones del usuario
      const { data: transactions, error: txError } = await supabase
        .from('transacciones')
        .select('*')
        .eq('usuario_id', userId)
        .order('fecha', { ascending: false });
      if (txError) throw txError;

      // 2. Obtener todas las transacciones (para filtrado colaborativo)
      const { data: allTrans, error: allTxError } = await supabase
        .from('transacciones')
        .select('*');
      if (allTxError) throw allTxError;

      // 3. Obtener presupuestos del usuario
      const { data: budgetsData, error: bError } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('usuario_id', userId);
      if (bError) throw bError;

      // 4. Obtener metas del usuario
      const { data: goalsData, error: gError } = await supabase
        .from('metas_financieras')
        .select('*')
        .eq('usuario_id', userId);
      if (gError) throw gError;

      // 5. Calcular estadísticas
      const totalIncome = transactions
        ?.filter(t => t.tipo === 'ingreso')
        .reduce((sum, t) => sum + t.monto, 0) || 0;

      const totalExpenses = transactions
        ?.filter(t => t.tipo === 'gasto')
        .reduce((sum, t) => sum + t.monto, 0) || 0;

      setStats({ totalIncome, totalExpenses, netSavings: totalIncome - totalExpenses });
      setRecentTransactions(transactions || []);
      setBudgets(budgetsData || []);
      setGoals(goalsData || []);
      setAllTransactions(allTrans || []);

      // 6. Generar recomendaciones con IA
      if (transactions && transactions.length > 0) {
        try {
          const recsByModel = buildUserModelRecommendations({
            userId: userId,
            transactions: transactions,
            allTransactions: allTrans || [],
            budgets: budgetsData || [],
          });

          const weights = { rules: 2.0, collab: 1.5, savings: 2.5 };
          const comparison = compareRecommendations({
            recommendationsByModel: recsByModel,
            plan,
            weights,
            limit,
          });

          setRecommendations(comparison);
        } catch (e) {
          console.warn('Error generando recomendaciones:', e);
        }

        // Predicción
        try {
          const pred = predictNextMonth(transactions, budgetsData || []);
          setPrediction(pred);
        } catch (e) {
          console.warn('Error en predicción:', e);
        }
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) fetchDashboardData();
  }, [userId]);

  // --- Generar PDF ---
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const appliedRecommendations = recommendations?.topRecommendations?.filter(rec => rec.isAccepted) || [];
      generatePDFReport({
        userName: user?.nombre || 'Usuario',
        transactions: recentTransactions,
        budgets: budgets,
        goals: goals,
        plan: plan,
        baseCurrency: baseCurrency,
        recommendations: appliedRecommendations,
        prediction: prediction,
      });
    } catch (err) {
      console.error('Error generando PDF:', err);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // --- Preparar datos para gráficos ---
  const expensesByCategory = useMemo(() => {
    return recentTransactions
      ?.filter(t => t.tipo === 'gasto')
      .reduce((acc, t) => {
        acc[t.categoria] = (acc[t.categoria] || 0) + t.monto;
        return acc;
      }, {}) || {};
  }, [recentTransactions]);

  const chartColors = isDark
    ? ['#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#60a5fa', '#34d399', '#fbbf24', '#f472b6']
    : ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

  const doughnutData = {
    labels: Object.keys(expensesByCategory),
    datasets: [{
      data: Object.values(expensesByCategory),
      backgroundColor: chartColors.slice(0, Object.keys(expensesByCategory).length),
      borderColor: chartColors.slice(0, Object.keys(expensesByCategory).length),
      borderWidth: 1,
    }],
  };

  const budgetLabels = budgets?.map(b => b.categoria) || [];
  const budgetData = budgets?.map(b => b.monto_maximo) || [];
  const spentData = budgets?.map(b => expensesByCategory[b.categoria] || 0) || [];

  const barData = {
    labels: budgetLabels,
    datasets: [
      {
        label: t('budget'),
        data: budgetData,
        backgroundColor: isDark ? 'rgba(129, 140, 248, 0.5)' : 'rgba(102, 126, 234, 0.5)',
        borderColor: isDark ? '#818cf8' : '#667eea',
        borderWidth: 1,
      },
      {
        label: t('actualSpending'),
        data: spentData,
        backgroundColor: isDark ? 'rgba(167, 139, 250, 0.5)' : 'rgba(118, 75, 162, 0.5)',
        borderColor: isDark ? '#a78bfa' : '#764ba2',
        borderWidth: 1,
      },
    ],
  };

  const dailyExpenses = useMemo(() => {
    return recentTransactions
      ?.filter(t => t.tipo === 'gasto')
      .reduce((acc, t) => {
        const date = new Date(t.fecha).toLocaleDateString();
        acc[date] = (acc[date] || 0) + t.monto;
        return acc;
      }, {}) || {};
  }, [recentTransactions]);

  const sortedDates = Object.keys(dailyExpenses).sort((a, b) => new Date(a) - new Date(b));

  const lineData = {
    labels: sortedDates,
    datasets: [{
      label: t('dailySpending'),
      data: sortedDates.map(d => dailyExpenses[d] || 0),
      fill: true,
      backgroundColor: isDark ? 'rgba(129, 140, 248, 0.1)' : 'rgba(102, 126, 234, 0.1)',
      borderColor: isDark ? '#818cf8' : '#667eea',
      borderWidth: 2,
      tension: 0.4,
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: isDark ? '#e0e0e0' : '#1e293b',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: isDark ? '#94a3b8' : '#64748b' },
        grid: { color: isDark ? '#2a3a5e' : '#e5e7eb' },
      },
      x: {
        ticks: { color: isDark ? '#94a3b8' : '#64748b' },
        grid: { color: isDark ? '#2a3a5e' : '#e5e7eb' },
      },
    },
  };

  // --- Divisas permitidas según el plan ---
  let allowedCurrencies = ['PEN', 'USD'];
  if (plan === 'premium') {
    allowedCurrencies = ['PEN', 'USD', 'EUR', 'GBP', 'MXN'];
  } else if (plan === 'enterprise') {
    allowedCurrencies = ['PEN', 'USD', 'EUR', 'GBP', 'MXN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
  }
  if (!allowedCurrencies.includes(baseCurrency)) {
    allowedCurrencies.push(baseCurrency);
  }

  // --- Estilos dinámicos ---
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

  const chartContainerStyle = { height: '500px', width: '100%' };

  // --- Renderizado ---
  if (loading) {
    return (
      <div style={{ ...pageStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ borderTopColor: '#667eea', margin: '0 auto 1rem' }} />
          <p>{t('loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, backgroundColor: isDark ? '#3b1a1a' : '#fee2e2', color: isDark ? '#fca5a5' : '#991b1b' }}>
          <strong>{t('error')}:</strong> {error}
          <button onClick={fetchDashboardData} style={{ marginLeft: '1rem', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const visibleRecs = recommendations?.topRecommendations?.slice(0, limit) || [];

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          border: 4px solid rgba(0,0,0,0.1);
          border-top-color: #667eea;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
        }
      `}</style>

      {/* Hero */}
      <div style={heroStyle}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#667eea', margin: 0 }}>{t('financialPanel')}</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0' }}>{t('dashboard')}</h1>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{t('dashboardDescription')}</p>
        </div>
        <button style={buttonStyle} onClick={handleGeneratePDF} disabled={generatingPDF}>
          {generatingPDF ? t('generating') : `📄 ${t('generateReport')}`}
        </button>
      </div>

      {/* Stats financieros */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>📈</span>
          <div>
            <p style={statLabelStyle}>{t('totalIncome')}</p>
            <p style={{ ...statValueStyle, color: '#22c55e' }}>{formatCurrency(stats.totalIncome)}</p>
          </div>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>📉</span>
          <div>
            <p style={statLabelStyle}>{t('totalExpenses')}</p>
            <p style={{ ...statValueStyle, color: '#ef4444' }}>{formatCurrency(stats.totalExpenses)}</p>
          </div>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>💰</span>
          <div>
            <p style={statLabelStyle}>{t('netSavings')}</p>
            <p style={{ ...statValueStyle, color: stats.netSavings >= 0 ? '#22c55e' : '#ef4444' }}>
              {formatCurrency(stats.netSavings)}
            </p>
          </div>
        </div>
      </div>

      {/* Predicción */}
      {prediction && (
        <div style={{ ...cardStyle, background: isDark ? '#1e2a4a' : 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.14) 100%)' }}>
          <h2 style={{ marginTop: 0 }}>🔮 {t('nextMonthPrediction')}</h2>
          <p style={{ marginBottom: '1rem' }}>{prediction.recommendation}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={statCardStyle}>
              <p style={statLabelStyle}>{t('projectedIncome')}</p>
              <p style={{ ...statValueStyle, color: '#22c55e' }}>{formatCurrency(prediction.projectedIncome)}</p>
            </div>
            <div style={statCardStyle}>
              <p style={statLabelStyle}>{t('projectedExpenses')}</p>
              <p style={{ ...statValueStyle, color: '#ef4444' }}>{formatCurrency(prediction.projectedExpense)}</p>
            </div>
            <div style={statCardStyle}>
              <p style={statLabelStyle}>{t('projectedSavings')}</p>
              <p style={{ ...statValueStyle, color: prediction.projectedSavings >= 0 ? '#22c55e' : '#ef4444' }}>
                {formatCurrency(prediction.projectedSavings)}
              </p>
            </div>
          </div>
          {prediction.budgetAtRisk && (
            <p style={{ marginTop: '1rem', color: '#7c3aed' }}>
              {t('budgetAtRisk')}: <strong>{prediction.budgetAtRisk}</strong>
            </p>
          )}
        </div>
      )}

      {/* Currency Rates */}
      <CurrencyRates
        userId={userId}
        baseCurrency={baseCurrency}
        showCurrencies={allowedCurrencies.filter(c => c !== baseCurrency)}
        plan={plan}
      />

      {/* Gráficos - 3 filas */}
      <div className="dashboard-charts-vertical">
        {/* Distribución de Gastos */}
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{t('expenseDistribution')}</h2>
          {Object.keys(expensesByCategory).length > 0 ? (
            <div style={chartContainerStyle}>
              <Doughnut key={`doughnut-${theme}`} data={doughnutData} options={chartOptions} />
            </div>
          ) : (
            <p style={{ color: '#94a3b8' }}>{t('noExpenses')}</p>
          )}
        </div>

        {/* Presupuesto vs Realidad */}
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{t('budgetVsActual')}</h2>
          {budgets?.length > 0 ? (
            <div style={chartContainerStyle}>
              <Bar key={`bar-${theme}`} data={barData} options={chartOptions} />
            </div>
          ) : (
            <p style={{ color: '#94a3b8' }}>{t('noBudgets')}</p>
          )}
        </div>

        {/* Tendencias de Gastos */}
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{t('spendingTrends')}</h2>
          {sortedDates.length > 0 ? (
            <div style={chartContainerStyle}>
              <Line key={`line-${theme}`} data={lineData} options={chartOptions} />
            </div>
          ) : (
            <p style={{ color: '#94a3b8' }}>{t('noTrendData')}</p>
          )}
        </div>
      </div>

      {/* Transacciones recientes */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>{t('recentTransactions')}</h2>
        {recentTransactions.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recentTransactions.slice(0, 5).map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb' }}>
                <div>
                  <p style={{ fontWeight: 500, margin: 0 }}>{t.categoria}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0 }}>
                    {new Date(t.fecha).toLocaleDateString()}
                    {t.descripcion && ` - ${t.descripcion}`}
                  </p>
                </div>
                <div style={{ fontWeight: 600, color: t.tipo === 'ingreso' ? '#22c55e' : '#ef4444' }}>
                  {t.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(t.monto)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: '#94a3b8' }}>{t('noTransactions')}</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
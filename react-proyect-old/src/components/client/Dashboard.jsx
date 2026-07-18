import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext'; // <--- Importa el contexto global
import { RecommenderComparator, predictNextMonth, AI_MODEL_LABELS } from '../../lib/aiEngine';
import { generatePDFReport } from '../../lib/pdfGenerator';
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
import './ClientPages.css'; // si lo usas para otras clases

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

// --- Traducciones (ES/EN) ---
const translations = {
  es: {
    loading_dashboard: 'Cargando panel...',
    error: 'Error',
    retry: 'Reintentar',
    financial_panel: 'Panel financiero',
    dashboard: 'Dashboard',
    dashboard_description: 'Resumen operativo, recomendaciones inteligentes y alertas de ahorro.',
    generating: 'Generando...',
    generate_report: 'Generar Reporte PDF',
    ai_plan: 'Plan de IA',
    active_models: 'Modelos activos',
    visible_recommendations: 'Recomendaciones visibles',
    total_income: 'Ingresos Totales',
    total_expenses: 'Gastos Totales',
    net_savings: 'Ahorro Neto',
    next_month_prediction: 'Predicción del próximo mes',
    projected_income: 'Ingreso proyectado',
    projected_expenses: 'Gasto proyectado',
    projected_savings: 'Ahorro proyectado',
    budget_at_risk: 'Presupuesto en riesgo',
    expense_distribution: 'Distribución de Gastos',
    budget_vs_actual: 'Presupuesto vs Realidad',
    spending_trends: 'Tendencias de Gastos',
    budget: 'Presupuesto',
    actual_spending: 'Gastos Reales',
    daily_spending: 'Gastos diarios',
    no_expenses: 'No hay gastos para mostrar',
    no_budgets: 'No hay presupuestos para mostrar',
    no_trend_data: 'No hay datos suficientes para mostrar tendencias',
    ai_recommendations: 'Recomendaciones Inteligentes',
    visible_by_plan: 'visibles según tu plan',
    general: 'General',
    score: 'Score',
    urgency: 'Urgencia',
    impact: 'Impacto',
    no_recommendations: 'No hay suficientes datos para generar recomendaciones.',
    recent_transactions: 'Transacciones Recientes',
    no_transactions: 'No hay transacciones registradas',
  },
  en: {
    loading_dashboard: 'Loading dashboard...',
    error: 'Error',
    retry: 'Retry',
    financial_panel: 'Financial Panel',
    dashboard: 'Dashboard',
    dashboard_description: 'Operational summary, smart recommendations and savings alerts.',
    generating: 'Generating...',
    generate_report: 'Generate PDF Report',
    ai_plan: 'AI Plan',
    active_models: 'Active models',
    visible_recommendations: 'Visible recommendations',
    total_income: 'Total Income',
    total_expenses: 'Total Expenses',
    net_savings: 'Net Savings',
    next_month_prediction: 'Next month prediction',
    projected_income: 'Projected income',
    projected_expenses: 'Projected expenses',
    projected_savings: 'Projected savings',
    budget_at_risk: 'Budget at risk',
    expense_distribution: 'Expense Distribution',
    budget_vs_actual: 'Budget vs Actual',
    spending_trends: 'Spending Trends',
    budget: 'Budget',
    actual_spending: 'Actual Spending',
    daily_spending: 'Daily spending',
    no_expenses: 'No expenses to show',
    no_budgets: 'No budgets to show',
    no_trend_data: 'Not enough data to show trends',
    ai_recommendations: 'Smart Recommendations',
    visible_by_plan: 'visible by your plan',
    general: 'General',
    score: 'Score',
    urgency: 'Urgency',
    impact: 'Impact',
    no_recommendations: 'Not enough data to generate recommendations.',
    recent_transactions: 'Recent Transactions',
    no_transactions: 'No transactions registered',
  },
};

// --- Hook de idioma (ya lo tienes) ---
const useLocale = () => {
  const [locale, setLocale] = useState(() => {
    const stored = localStorage.getItem('locale');
    return stored || 'es';
  });

  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);

  const t = useCallback((key) => translations[locale]?.[key] || key, [locale]);

  return { locale, setLocale, t };
};

// --- COMPONENTE PRINCIPAL ---
const Dashboard = ({ userId, user }) => {
  const { theme } = useTheme(); // <--- Tema desde el contexto global
  const { t } = useLocale();
  const isDark = theme === 'dark';

  // --- Estados (igual que antes) ---
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

  // Moneda y plan (igual que antes)
  const baseCurrency = user?.base_currency || user?.configuracion?.currency || 'PEN';
  const plan = user?.plan_suscripcion || user?.plan_name || 'basic';

  const formatCurrency = useCallback((amount) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  }, [baseCurrency]);

  // --- Carga de datos (igual que antes) ---
  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: transactions, error: txError } = await supabase
        .from('transacciones')
        .select('*')
        .eq('usuario_id', userId)
        .order('fecha', { ascending: false });
      if (txError) throw txError;

      const { data: allTrans, error: allTxError } = await supabase
        .from('transacciones')
        .select('*');
      if (allTxError) throw allTxError;

      const { data: budgetsData, error: bError } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('usuario_id', userId);
      if (bError) throw bError;

      const { data: goalsData, error: gError } = await supabase
        .from('metas_financieras')
        .select('*')
        .eq('usuario_id', userId);
      if (gError) throw gError;

      const totalIncome = transactions?.filter(t => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0) || 0;
      const totalExpenses = transactions?.filter(t => t.tipo === 'gasto').reduce((sum, t) => sum + t.monto, 0) || 0;

      setStats({ totalIncome, totalExpenses, netSavings: totalIncome - totalExpenses });
      setRecentTransactions(transactions || []);
      setBudgets(budgetsData || []);
      setGoals(goalsData || []);
      setAllTransactions(allTrans || []);

      if (transactions && transactions.length > 0) {
        const comparator = new RecommenderComparator();
        const recs = comparator.getAllRecommendations(
          transactions,
          allTrans || [],
          budgetsData || [],
          goalsData || [],
          { id: userId, plan }
        );
        setRecommendations(recs);
        setPrediction(predictNextMonth(transactions, budgetsData || []));
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [userId]);

  // --- Generar PDF (igual que antes, pero con más parámetros) ---
  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const appliedRecommendations = recommendations?.topRecommendations?.filter(rec => rec.isApplied) || [];
      generatePDFReport({
        userName: user?.name || 'Usuario',
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

  // --- Estilos (los mismos que tienes, pero ahora isDark viene del contexto) ---
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

  const chartContainerStyle = { height: '250px' };

  // --- Datos para gráficos (con useMemo para que se actualicen al cambiar el tema o los datos) ---
  const expensesByCategory = useMemo(() => {
    return recentTransactions
      ?.filter(t => t.tipo === 'gasto')
      .reduce((acc, t) => {
        acc[t.categoria] = (acc[t.categoria] || 0) + t.monto;
        return acc;
      }, {}) || {};
  }, [recentTransactions]);

  // Paleta de colores según tema
  const chartColors = isDark
    ? ['#818cf8', '#a78bfa', '#f472b6', '#fb7185', '#60a5fa', '#34d399', '#fbbf24', '#f472b6']
    : ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

  const doughnutData = useMemo(() => ({
    labels: Object.keys(expensesByCategory),
    datasets: [{
      data: Object.values(expensesByCategory),
      backgroundColor: chartColors.slice(0, Object.keys(expensesByCategory).length),
      borderColor: chartColors.slice(0, Object.keys(expensesByCategory).length),
      borderWidth: 1,
    }],
  }), [expensesByCategory, chartColors]);

  const budgetLabels = budgets?.map(b => b.categoria) || [];
  const budgetData = budgets?.map(b => b.monto_maximo) || [];
  const spentData = budgets?.map(b => expensesByCategory[b.categoria] || 0) || [];

  const barData = useMemo(() => ({
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
        label: t('actual_spending'),
        data: spentData,
        backgroundColor: isDark ? 'rgba(167, 139, 250, 0.5)' : 'rgba(118, 75, 162, 0.5)',
        borderColor: isDark ? '#a78bfa' : '#764ba2',
        borderWidth: 1,
      },
    ],
  }), [budgetLabels, budgetData, spentData, t, isDark]);

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

  const lineData = useMemo(() => ({
    labels: sortedDates,
    datasets: [{
      label: t('daily_spending'),
      data: sortedDates.map(d => dailyExpenses[d] || 0),
      fill: true,
      backgroundColor: isDark ? 'rgba(129, 140, 248, 0.1)' : 'rgba(102, 126, 234, 0.1)',
      borderColor: isDark ? '#818cf8' : '#667eea',
      borderWidth: 2,
      tension: 0.4,
    }],
  }), [sortedDates, dailyExpenses, t, isDark]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDark ? '#e0e0e0' : '#1e293b',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
        },
        grid: {
          color: isDark ? '#2a3a5e' : '#e5e7eb',
        },
      },
      x: {
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
        },
        grid: {
          color: isDark ? '#2a3a5e' : '#e5e7eb',
        },
      },
    },
  }), [isDark]);

  // --- Divisas permitidas según plan ---
  let allowedCurrencies = ['PEN', 'USD'];
  if (plan === 'premium') {
    allowedCurrencies = ['PEN', 'USD', 'EUR', 'GBP', 'MXN'];
  } else if (plan === 'enterprise') {
    allowedCurrencies = ['PEN', 'USD', 'EUR', 'GBP', 'MXN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
  }
  if (!allowedCurrencies.includes(baseCurrency)) {
    allowedCurrencies.push(baseCurrency);
  }

  // --- Renderizado (igual que antes, pero con gráficos con key y CurrencyRates con theme) ---
  if (loading) {
    return (
      <div style={{ ...pageStyle, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ border: '4px solid rgba(0,0,0,0.1)', borderTopColor: '#667eea', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }} />
          <p>{t('loading_dashboard')}</p>
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

  return (
    <div style={pageStyle}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={heroStyle}>
        <div>
          <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#667eea', margin: 0 }}>{t('financial_panel')}</p>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, margin: '0.25rem 0' }}>{t('dashboard')}</h1>
          <p style={{ color: isDark ? '#94a3b8' : '#64748b' }}>{t('dashboard_description')}</p>
        </div>
        <button style={buttonStyle} onClick={handleGeneratePDF} disabled={generatingPDF}>
          {generatingPDF ? t('generating') : `📄 ${t('generate_report')}`}
        </button>
      </div>

      {/* Métricas del plan */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>⚡</span>
          <div>
            <p style={statLabelStyle}>{t('ai_plan')}</p>
            <p style={statValueStyle}>{plan}</p>
          </div>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>🧠</span>
          <div>
            <p style={statLabelStyle}>{t('active_models')}</p>
            <p style={statValueStyle}>3</p>
          </div>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>🎯</span>
          <div>
            <p style={statLabelStyle}>{t('visible_recommendations')}</p>
            <p style={statValueStyle}>{recommendations?.topRecommendations?.length || 0}</p>
          </div>
        </div>
      </div>

      {/* Stats financieros */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>📈</span>
          <div>
            <p style={statLabelStyle}>{t('total_income')}</p>
            <p style={{ ...statValueStyle, color: '#22c55e' }}>{formatCurrency(stats.totalIncome)}</p>
          </div>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>📉</span>
          <div>
            <p style={statLabelStyle}>{t('total_expenses')}</p>
            <p style={{ ...statValueStyle, color: '#ef4444' }}>{formatCurrency(stats.totalExpenses)}</p>
          </div>
        </div>
        <div style={statCardStyle}>
          <span style={{ fontSize: '1.8rem' }}>💰</span>
          <div>
            <p style={statLabelStyle}>{t('net_savings')}</p>
            <p style={{ ...statValueStyle, color: stats.netSavings >= 0 ? '#22c55e' : '#ef4444' }}>
              {formatCurrency(stats.netSavings)}
            </p>
          </div>
        </div>
      </div>

      {/* Predicción */}
      {prediction && (
        <div style={{ ...cardStyle, background: isDark ? '#1e2a4a' : 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.14) 100%)' }}>
          <h2 style={{ marginTop: 0 }}>🔮 {t('next_month_prediction')}</h2>
          <p style={{ marginBottom: '1rem' }}>{prediction.recommendation}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={statCardStyle}>
              <p style={statLabelStyle}>{t('projected_income')}</p>
              <p style={{ ...statValueStyle, color: '#22c55e' }}>{formatCurrency(prediction.projectedIncome)}</p>
            </div>
            <div style={statCardStyle}>
              <p style={statLabelStyle}>{t('projected_expenses')}</p>
              <p style={{ ...statValueStyle, color: '#ef4444' }}>{formatCurrency(prediction.projectedExpense)}</p>
            </div>
            <div style={statCardStyle}>
              <p style={statLabelStyle}>{t('projected_savings')}</p>
              <p style={{ ...statValueStyle, color: prediction.projectedSavings >= 0 ? '#22c55e' : '#ef4444' }}>
                {formatCurrency(prediction.projectedSavings)}
              </p>
            </div>
          </div>
          {prediction.budgetAtRisk && (
            <p style={{ marginTop: '1rem', color: '#7c3aed' }}>
              {t('budget_at_risk')}: <strong>{prediction.budgetAtRisk}</strong>
            </p>
          )}
        </div>
      )}

      {/* Currency Rates - Ahora con la prop theme */}
      <CurrencyRates
        baseCurrency={baseCurrency}
        showCurrencies={allowedCurrencies.filter(c => c !== baseCurrency)}
        theme={theme}
      />

      {/* Gráficos - Con key={theme} para forzar actualización */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{t('expense_distribution')}</h2>
          {Object.keys(expensesByCategory).length > 0 ? (
            <div style={chartContainerStyle}>
              <Doughnut key={`doughnut-${theme}`} data={doughnutData} options={chartOptions} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>{t('no_expenses')}</div>
          )}
        </div>
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>{t('budget_vs_actual')}</h2>
          {budgets?.length > 0 ? (
            <div style={chartContainerStyle}>
              <Bar key={`bar-${theme}`} data={barData} options={chartOptions} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>{t('no_budgets')}</div>
          )}
        </div>
        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <h2 style={{ marginTop: 0 }}>{t('spending_trends')}</h2>
          {sortedDates.length > 0 ? (
            <div style={chartContainerStyle}>
              <Line key={`line-${theme}`} data={lineData} options={chartOptions} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>{t('no_trend_data')}</div>
          )}
        </div>
      </div>

      {/* Recomendaciones IA */}
      {recommendations && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <h2 style={{ marginTop: 0 }}>🧠 {t('ai_recommendations')}</h2>
            <span style={{ fontSize: '0.875rem', background: isDark ? '#2a3a5e' : '#e2e8f0', padding: '0.25rem 0.75rem', borderRadius: '999px' }}>
              {recommendations.planLimit} {t('visible_by_plan')}
            </span>
          </div>
          {recommendations.topRecommendations?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recommendations.topRecommendations.slice(0, 5).map((rec, idx) => (
                <div key={idx} style={{ ...cardStyle, marginBottom: 0, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div>
                      <span style={{ fontWeight: 600 }}>
                        {idx + 1}. {rec.categoryId || t('general')}
                      </span>
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', background: '#667eea20', padding: '0.15rem 0.6rem', borderRadius: '999px', color: '#667eea' }}>
                        {AI_MODEL_LABELS[rec.modelType] || rec.modelLabel || rec.modelType}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.875rem', background: isDark ? '#2a3a5e' : '#e2e8f0', padding: '0.15rem 0.6rem', borderRadius: '999px' }}>
                      {t('score')} {(rec.score || 0).toFixed(2)}
                    </span>
                  </div>
                  <p style={{ margin: '0.5rem 0' }}>{rec.description || rec.recommendation || rec.text || ''}</p>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.875rem', color: '#94a3b8' }}>
                    <span>{t('urgency')} {(rec.urgency || 0).toFixed(2)}</span>
                    <span>{t('impact')} {formatCurrency(Math.max(0, rec.estimatedImpact || 0))}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>{t('no_recommendations')}</div>
          )}
        </div>
      )}

      {/* Transacciones recientes */}
      <div style={cardStyle}>
        <h2 style={{ marginTop: 0 }}>{t('recent_transactions')}</h2>
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
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>{t('no_transactions')}</div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
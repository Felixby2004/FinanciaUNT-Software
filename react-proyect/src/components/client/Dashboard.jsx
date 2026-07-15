import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { RecommenderComparator, predictNextMonth } from '../../lib/recommenders'
import { generatePDFReport } from '../../lib/pdfGenerator'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import './ClientPages.css'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement)

const Dashboard = ({ userId, userName }) => {
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0
  })
  const [recentTransactions, setRecentTransactions] = useState([])
  const [budgets, setBudgets] = useState([])
  const [goals, setGoals] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [recommendations, setRecommendations] = useState(null)
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [userId])

  const fetchDashboardData = async () => {
    try {
      // Fetch user's transactions
      const { data: transactions } = await supabase
        .from('transacciones')
        .select('*')
        .eq('usuario_id', userId)
        .order('fecha', { ascending: false })

      // Fetch all transactions for collaborative filtering
      const { data: allTrans } = await supabase
        .from('transacciones')
        .select('*')

      // Fetch budgets and goals
      const { data: budgetsData } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('usuario_id', userId)

      const { data: goalsData } = await supabase
        .from('metas_financieras')
        .select('*')
        .eq('usuario_id', userId)

      const totalIncome = transactions
        ?.filter(t => t.tipo === 'ingreso')
        .reduce((sum, t) => sum + t.monto, 0) || 0

      const totalExpenses = transactions
        ?.filter(t => t.tipo === 'gasto')
        .reduce((sum, t) => sum + t.monto, 0) || 0

      setStats({
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses
      })

      setRecentTransactions(transactions?.slice(0, 5) || [])
      setBudgets(budgetsData || [])
      setGoals(goalsData || [])
      setAllTransactions(allTrans || [])

      // Generate recommendations
      if (transactions && transactions.length > 0) {
        const comparator = new RecommenderComparator()
        const recs = comparator.getAllRecommendations(transactions, allTrans || [], budgetsData || [], goalsData || [])
        setRecommendations(recs)
        setPrediction(predictNextMonth(transactions, budgetsData || []))
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleGeneratePDF = () => {
    setGeneratingPDF(true)
    try {
      generatePDFReport(userName || 'Usuario', recentTransactions, budgets, goals)
    } catch (error) {
      console.error('Error generating PDF:', error)
    } finally {
      setGeneratingPDF(false)
    }
  }

  if (loading) {
    return <div className="loading">Cargando dashboard...</div>
  }

  return (
    <div className="client-page">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <button 
          className="primary-button" 
          onClick={handleGeneratePDF}
          disabled={generatingPDF}
        >
          {generatingPDF ? 'Generando...' : '📄 Generar Reporte PDF'}
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <p className="stat-label">Ingresos Totales</p>
            <p className="stat-value stat-income">${stats.totalIncome.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📉</div>
          <div className="stat-info">
            <p className="stat-label">Gastos Totales</p>
            <p className="stat-value stat-expense">${stats.totalExpenses.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <p className="stat-label">Ahorro Neto</p>
            <p className={`stat-value ${stats.netSavings >= 0 ? 'stat-income' : 'stat-expense'}`}>
              ${stats.netSavings.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {prediction && (
        <div className="section" style={{ background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.14) 100%)', border: '1px solid rgba(102, 126, 234, 0.25)' }}>
          <h2 className="section-title">🔮 Predicción del próximo mes</h2>
          <p style={{ marginBottom: '10px' }}>{prediction.recommendation}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '12px' }}>
            <div className="stat-card" style={{ minHeight: 'auto' }}>
              <p className="stat-label">Ingreso proyectado</p>
              <p className="stat-value stat-income">${prediction.projectedIncome.toLocaleString()}</p>
            </div>
            <div className="stat-card" style={{ minHeight: 'auto' }}>
              <p className="stat-label">Gasto proyectado</p>
              <p className="stat-value stat-expense">${prediction.projectedExpense.toLocaleString()}</p>
            </div>
            <div className="stat-card" style={{ minHeight: 'auto' }}>
              <p className="stat-label">Ahorro proyectado</p>
              <p className={`stat-value ${prediction.projectedSavings >= 0 ? 'stat-income' : 'stat-expense'}`}>${prediction.projectedSavings.toLocaleString()}</p>
            </div>
          </div>
          {prediction.budgetAtRisk && (
            <p style={{ marginTop: '10px', color: '#7c3aed' }}>
              Presupuesto en riesgo: <strong>{prediction.budgetAtRisk}</strong>
            </p>
          )}
        </div>
      )}

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {/* Distribución de Gastos - Doughnut Chart */}
        <div className="section" style={{ marginBottom: 0, background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Distribución de Gastos</h2>
          {(() => {
            const expensesByCategory = {};
            (recentTransactions || []).filter(t => t.tipo === 'gasto').forEach(t => {
              if (!expensesByCategory[t.categoria]) {
                expensesByCategory[t.categoria] = 0;
              }
              expensesByCategory[t.categoria] += t.monto;
            });
            const labels = Object.keys(expensesByCategory);
            const data = Object.values(expensesByCategory);
            const colors = [
              '#667eea', '#764ba2', '#f093fb', '#f5576c',
              '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
            ];
            
            const chartData = {
              labels,
              datasets: [{
                data,
                backgroundColor: colors.slice(0, labels.length),
                borderColor: colors.slice(0, labels.length),
                borderWidth: 1
              }]
            };
            
            const chartOptions = {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              }
            };
            
            return labels.length > 0 ? (
              <div style={{ height: '250px' }}>
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>No hay gastos para mostrar</div>
            );
          })()}
        </div>

        {/* Presupuesto vs Realidad - Bar Chart */}
        <div className="section" style={{ marginBottom: 0, background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Presupuesto vs Realidad</h2>
          {(() => {
            const expensesByCategory = {};
            (recentTransactions || []).filter(t => t.tipo === 'gasto').forEach(t => {
              if (!expensesByCategory[t.categoria]) {
                expensesByCategory[t.categoria] = 0;
              }
              expensesByCategory[t.categoria] += t.monto;
            });
            
            const labels = budgets.map(b => b.categoria);
            const budgetData = budgets.map(b => b.monto_maximo);
            const spentData = budgets.map(b => expensesByCategory[b.categoria] || 0);
            
            const chartData = {
              labels,
              datasets: [
                {
                  label: 'Presupuesto',
                  data: budgetData,
                  backgroundColor: 'rgba(102, 126, 234, 0.5)',
                  borderColor: 'rgba(102, 126, 234, 1)',
                  borderWidth: 1
                },
                {
                  label: 'Gastos Reales',
                  data: spentData,
                  backgroundColor: 'rgba(118, 75, 162, 0.5)',
                  borderColor: 'rgba(118, 75, 162, 1)',
                  borderWidth: 1
                }
              ]
            };
            
            const chartOptions = {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            };
            
            return budgets.length > 0 ? (
              <div style={{ height: '250px' }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>No hay presupuestos para mostrar</div>
            );
          })()}
        </div>

        {/* Tendencias de Gastos - Line Chart */}
        <div className="section" style={{ marginBottom: 0, gridColumn: '1 / -1', background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Tendencias de Gastos</h2>
          {(() => {
            const transactionsByDate = {};
            (recentTransactions || []).filter(t => t.tipo === 'gasto').forEach(t => {
              const date = new Date(t.fecha).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
              if (!transactionsByDate[date]) {
                transactionsByDate[date] = 0;
              }
              transactionsByDate[date] += t.monto;
            });
            const labels = Object.keys(transactionsByDate).sort((a, b) => {
              const dateA = new Date(a);
              const dateB = new Date(b);
              return dateA - dateB;
            });
            const data = labels.map(date => transactionsByDate[date]);
            
            const chartData = {
              labels,
              datasets: [{
                label: 'Gastos',
                data,
                fill: true,
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderColor: 'rgba(102, 126, 234, 1)',
                borderWidth: 2,
                tension: 0.4
              }]
            };
            
            const chartOptions = {
              responsive: true,
              maintainAspectRatio: true,
              plugins: {
                legend: {
                  position: 'bottom'
                }
              },
              scales: {
                y: {
                  beginAtZero: true
                }
              }
            };
            
            return labels.length > 0 ? (
              <div style={{ height: '250px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '40px 0' }}>No hay datos suficientes para mostrar tendencias</div>
            );
          })()}
        </div>
      </div>

      {/* AI Recommendations */}
      {recommendations && (
        <div className="section">
          <h2 className="section-title">🧠 Recomendaciones Inteligentes</h2>
          
          {/* Top 5 Recommendations */}
          {recommendations.mejores && recommendations.mejores.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {recommendations.mejores.slice(0, 5).map((rec, index) => (
                <div 
                  key={index}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.3)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937' }}>
                        {index + 1}. {rec.categoria}
                      </span>
                      <span style={{ 
                        marginLeft: '12px', 
                        fontSize: '12px', 
                        padding: '2px 8px', 
                        borderRadius: '9999px', 
                        background: rec.prioridad === 3 ? '#fee2e2' : rec.prioridad === 2 ? '#fef3c7' : '#d1fae5',
                        color: rec.prioridad === 3 ? '#dc2626' : rec.prioridad === 2 ? '#d97706' : '#059669'
                      }}>
                        {rec.tipo_recomendacion}
                      </span>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {rec.modelo}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '8px' }}>
                    {rec.recomendacion}
                  </p>
                  {rec.accion && (
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>
                      <strong>Acción:</strong> {rec.accion}
                    </p>
                  )}
                  {rec.beneficio && (
                    <p style={{ fontSize: '13px', color: '#6b7280' }}>
                      <strong>Beneficio:</strong> {rec.beneficio}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              No hay suficientes datos para generar recomendaciones. Añade más transacciones!
            </div>
          )}
        </div>
      )}

      <div className="section">
        <h2 className="section-title">Transacciones Recientes</h2>
        {recentTransactions.length > 0 ? (
          <div className="transactions-list">
            {recentTransactions.map((t) => (
              <div key={t.id} className="transaction-item">
                <div className="transaction-info">
                  <p className="transaction-category">{t.categoria}</p>
                  <p className="transaction-date">
                    {new Date(t.fecha).toLocaleDateString()}
                  </p>
                  {t.descripcion && (
                    <p className="transaction-description">{t.descripcion}</p>
                  )}
                </div>
                <div className={`transaction-amount ${t.tipo}`}>
                  {t.tipo === 'ingreso' ? '+' : '-'}$${t.monto.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">No hay transacciones registradas</div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

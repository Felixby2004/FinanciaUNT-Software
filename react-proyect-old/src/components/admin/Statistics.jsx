import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import { Users, CreditCard, TrendingUp, TrendingDown } from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'
import './AdminPages.css'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const Statistics = () => {
  const { t } = useLanguage()
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTransactions: 0,
    totalIncome: 0,
    totalExpenses: 0
  })
  const [expensesByUser, setExpensesByUser] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch users count
      const { data: users } = await supabase.from('usuarios').select('id')

      // Fetch transactions
      const { data: transactions } = await supabase.from('transacciones').select('*')

      // Calculate totals
      const totalIncome = transactions
        ?.filter(t => t.tipo === 'ingreso')
        .reduce((sum, t) => sum + t.monto, 0) || 0

      const totalExpenses = transactions
        ?.filter(t => t.tipo === 'gasto')
        .reduce((sum, t) => sum + t.monto, 0) || 0

      // Calculate expenses by user
      const userExpenses = {}
      transactions?.forEach(t => {
        if (t.tipo === 'gasto') {
          userExpenses[t.usuario_id] = (userExpenses[t.usuario_id] || 0) + t.monto
        }
      })

      // Get user names for the expenses
      const { data: usersData } = await supabase.from('usuarios').select('id, nombre')
      const userMap = {}
      usersData?.forEach(u => userMap[u.id] = u.nombre)

      const expensesList = Object.entries(userExpenses).map(([userId, amount]) => ({
        id: userId,
        nombre: userMap[userId] || t('user'),
        monto: amount
      })).sort((a, b) => b.monto - a.monto)

      setStats({
        totalUsers: users?.length || 0,
        totalTransactions: transactions?.length || 0,
        totalIncome,
        totalExpenses
      })
      setExpensesByUser(expensesList)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">{t('loadingStats')}</div>
  }

  return (
    <div className="admin-page">
      <h1 className="page-title">{t('generalStats')}</h1>

      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={16} /> {t('totalUsers')}
          </span>
          <span className="stat-value">{stats.totalUsers}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CreditCard size={16} /> {t('totalTransactions')}
          </span>
          <span className="stat-value">{stats.totalTransactions}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-green)' }}>
            <TrendingUp size={16} /> {t('totalIncome')}
          </span>
          <span className="stat-value" style={{ color: 'var(--accent-green)' }}>${stats.totalIncome.toLocaleString()}</span>
        </div>

        <div className="stat-item">
          <span className="stat-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-red)' }}>
            <TrendingDown size={16} /> {t('totalExpenses')}
          </span>
          <span className="stat-value" style={{ color: 'var(--accent-red)' }}>${stats.totalExpenses.toLocaleString()}</span>
        </div>
      </div>

      {/* Admin Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {/* Gastos por Usuario - Bar Chart */}
        <div className="chart-container">
          <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>{t('expensesByUser')}</h2>
          {(() => {
            const labels = expensesByUser.map(u => u.nombre);
            const data = expensesByUser.map(u => u.monto);
            const colors = [
              '#38bdf8', '#34d399', '#a78bfa', '#f472b6',
              '#fbbf24', '#f87171', '#60a5fa', '#34d399'
            ];
            
            const chartData = {
              labels,
              datasets: [{
                label: t('totalExpenses'),
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
                  display: false
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
                <Bar data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>{t('noData')}</div>
            );
          })()}
        </div>

        {/* Resumen Ingresos vs Gastos - Doughnut Chart */}
        <div className="chart-container">
          <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>{t('incomeVsExpenses')}</h2>
          {(() => {
            const labels = [t('totalIncome'), t('totalExpenses')];
            const data = [stats.totalIncome, stats.totalExpenses];
            const colors = ['#34d399', '#f87171'];
            
            const chartData = {
              labels,
              datasets: [{
                data,
                backgroundColor: colors,
                borderColor: colors,
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
            
            return data[0] > 0 || data[1] > 0 ? (
              <div style={{ height: '250px' }}>
                <Doughnut data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>{t('noData')}</div>
            );
          })()}
        </div>
      </div>

      <div className="chart-container">
        <h2 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary)' }}>{t('expensesByUser')}</h2>
        {expensesByUser.length > 0 ? (
          <div className="table-container" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('user')}</th>
                  <th>{t('totalExpenses')}</th>
                </tr>
              </thead>
              <tbody>
                {expensesByUser.map((user) => (
                  <tr key={user.id}>
                    <td>{user.nombre}</td>
                    <td>${user.monto.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)' }}>{t('noExpenseData')}</div>
        )}
      </div>
    </div>
  )
}

export default Statistics

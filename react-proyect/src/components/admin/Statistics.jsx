import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'
import './AdminPages.css'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

const Statistics = () => {
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
        nombre: userMap[userId] || 'Usuario Desconocido',
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
    return <div className="loading">Cargando estadísticas...</div>
  }

  return (
    <div className="admin-page">
      <h1 className="page-title">Estadísticas Generales</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <p className="stat-label">Total Usuarios</p>
            <p className="stat-value">{stats.totalUsers}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💳</div>
          <div className="stat-info">
            <p className="stat-label">Total Transacciones</p>
            <p className="stat-value">{stats.totalTransactions}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-info">
            <p className="stat-label">Ingresos Totales</p>
            <p className="stat-value">${stats.totalIncome.toLocaleString()}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📉</div>
          <div className="stat-info">
            <p className="stat-label">Gastos Totales</p>
            <p className="stat-value">${stats.totalExpenses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Admin Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px', marginBottom: '24px' }}>
        {/* Gastos por Usuario - Bar Chart */}
        <div className="section" style={{ marginBottom: 0, background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Gastos por Usuario</h2>
          {(() => {
            const labels = expensesByUser.map(u => u.nombre);
            const data = expensesByUser.map(u => u.monto);
            const colors = [
              '#667eea', '#764ba2', '#f093fb', '#f5576c',
              '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'
            ];
            
            const chartData = {
              labels,
              datasets: [{
                label: 'Total Gastos',
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
              <div className="empty-state" style={{ padding: '40px 0' }}>No hay datos para mostrar</div>
            );
          })()}
        </div>

        {/* Resumen Ingresos vs Gastos - Doughnut Chart */}
        <div className="section" style={{ marginBottom: 0, background: 'white', borderRadius: '16px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <h2 className="section-title" style={{ marginTop: 0 }}>Resumen Ingresos vs Gastos</h2>
          {(() => {
            const labels = ['Ingresos', 'Gastos'];
            const data = [stats.totalIncome, stats.totalExpenses];
            const colors = ['#43e97b', '#f5576c'];
            
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
              <div className="empty-state" style={{ padding: '40px 0' }}>No hay datos para mostrar</div>
            );
          })()}
        </div>
      </div>

      <div className="section">
        <h2 className="section-title">Gastos por Usuario</h2>
        {expensesByUser.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Total Gastos</th>
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
          <div className="empty-state">No hay datos de gastos</div>
        )}
      </div>
    </div>
  )
}

export default Statistics

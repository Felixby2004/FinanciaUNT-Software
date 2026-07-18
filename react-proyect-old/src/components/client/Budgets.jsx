import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './ClientPages.css'

const Budgets = ({ userId }) => {
  const [budgets, setBudgets] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newBudget, setNewBudget] = useState({
    categoria: 'Alimentación',
    monto_maximo: '',
    periodo: 'mensual'
  })

  const categories = [
    'Alimentación', 'Transporte', 'Entretenimiento', 'Servicios',
    'Salud', 'Educación', 'Compras', 'Otros'
  ]

  useEffect(() => {
    fetchBudgets()
  }, [userId])

  const fetchBudgets = async () => {
    try {
      const { data } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('usuario_id', userId)
        .order('categoria')

      setBudgets(data || [])
    } catch (error) {
      console.error('Error fetching budgets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateBudget = async (e) => {
    e.preventDefault()
    try {
      await supabase.from('presupuestos').insert({
        usuario_id: userId,
        ...newBudget,
        monto_maximo: parseFloat(newBudget.monto_maximo)
      })
      setShowModal(false)
      setNewBudget({
        categoria: 'Alimentación',
        monto_maximo: '',
        periodo: 'mensual'
      })
      fetchBudgets()
    } catch (error) {
      console.error('Error creating budget:', error)
    }
  }

  const handleDeleteBudget = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este presupuesto?')) {
      try {
        await supabase.from('presupuestos').delete().eq('id', id)
        fetchBudgets()
      } catch (error) {
        console.error('Error deleting budget:', error)
      }
    }
  }

  if (loading) {
    return <div className="loading">Cargando presupuestos...</div>
  }

  return (
    <div className="client-page">
      <div className="page-header">
        <h1 className="page-title">Presupuestos</h1>
        <button className="primary-button" onClick={() => setShowModal(true)}>
          ➕ Nuevo Presupuesto
        </button>
      </div>

      <div className="budgets-grid">
        {budgets.map((budget) => (
          <div key={budget.id} className="budget-card">
            <div className="budget-header">
              <h3 className="budget-category">{budget.categoria}</h3>
              <button
                className="delete-button"
                onClick={() => handleDeleteBudget(budget.id)}
              >
                🗑️
              </button>
            </div>
            <p className="budget-limit">Límite: ${budget.monto_maximo.toLocaleString()}</p>
            <p className="budget-period">Periodo: {budget.periodo}</p>
          </div>
        ))}
      </div>

      {budgets.length === 0 && (
        <div className="empty-state">No hay presupuestos registrados</div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Nuevo Presupuesto</h2>
            <form onSubmit={handleCreateBudget} className="modal-form">
              <div className="form-group">
                <label>Categoría</label>
                <select
                  value={newBudget.categoria}
                  onChange={(e) => setNewBudget({ ...newBudget, categoria: e.target.value })}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Límite Mensual</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBudget.monto_maximo}
                  onChange={(e) => setNewBudget({ ...newBudget, monto_maximo: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Budgets

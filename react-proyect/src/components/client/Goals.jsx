import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './ClientPages.css'

const Goals = ({ userId }) => {
  const [goals, setGoals] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newGoal, setNewGoal] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'ahorro',
    monto_objetivo: '',
    monto_actual: '0',
    fecha_limite: ''
  })

  useEffect(() => {
    fetchGoals()
  }, [userId])

  const fetchGoals = async () => {
    try {
      const { data } = await supabase
        .from('metas_financieras')
        .select('*')
        .eq('usuario_id', userId)

      setGoals(data || [])
    } catch (error) {
      console.error('Error fetching goals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGoal = async (e) => {
    e.preventDefault()
    try {
      await supabase.from('metas_financieras').insert({
        usuario_id: userId,
        ...newGoal,
        monto_objetivo: parseFloat(newGoal.monto_objetivo),
        monto_actual: parseFloat(newGoal.monto_actual),
        estado: 'activo'
      })
      setShowModal(false)
      setNewGoal({
        nombre: '',
        descripcion: '',
        tipo: 'ahorro',
        monto_objetivo: '',
        monto_actual: '0',
        fecha_limite: ''
      })
      fetchGoals()
    } catch (error) {
      console.error('Error creating goal:', error)
    }
  }

  const handleAddToGoal = async (goalId, currentAmount) => {
    const addAmount = prompt('¿Cuánto quieres agregar?')
    if (addAmount && !isNaN(addAmount)) {
      try {
        await supabase
          .from('metas_financieras')
          .update({ monto_actual: currentAmount + parseFloat(addAmount) })
          .eq('id', goalId)
        fetchGoals()
      } catch (error) {
        console.error('Error updating goal:', error)
      }
    }
  }

  const handleDeleteGoal = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta meta?')) {
      try {
        await supabase.from('metas_financieras').delete().eq('id', id)
        fetchGoals()
      } catch (error) {
        console.error('Error deleting goal:', error)
      }
    }
  }

  if (loading) {
    return <div className="loading">Cargando metas...</div>
  }

  return (
    <div className="client-page">
      <div className="page-header">
        <h1 className="page-title">Metas Financieras</h1>
        <button className="primary-button" onClick={() => setShowModal(true)}>
          ➕ Nueva Meta
        </button>
      </div>

      <div className="goals-grid">
        {goals.map((goal) => {
          const progress = (goal.monto_actual / goal.monto_objetivo) * 100
          return (
            <div key={goal.id} className="goal-card">
              <div className="goal-header">
                <h3 className="goal-name">{goal.nombre}</h3>
                <button
                  className="delete-button"
                  onClick={() => handleDeleteGoal(goal.id)}
                >
                  🗑️
                </button>
              </div>
              {goal.descripcion && (
                <p className="goal-description">{goal.descripcion}</p>
              )}
              <div className="goal-progress">
                <div
                  className="goal-progress-bar"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="goal-stats">
                <div>
                  <p className="goal-stat-label">Actual</p>
                  <p className="goal-stat-value">${goal.monto_actual.toLocaleString()}</p>
                </div>
                <div>
                  <p className="goal-stat-label">Objetivo</p>
                  <p className="goal-stat-value">${goal.monto_objetivo.toLocaleString()}</p>
                </div>
              </div>
              {goal.fecha_limite && (
                <p className="goal-deadline">
                  Fecha límite: {new Date(goal.fecha_limite).toLocaleDateString()}
                </p>
              )}
              <button
                className="add-to-goal-button"
                onClick={() => handleAddToGoal(goal.id, goal.monto_actual)}
              >
                ➕ Agregar
              </button>
            </div>
          )
        })}
      </div>

      {goals.length === 0 && (
        <div className="empty-state">No hay metas registradas</div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Nueva Meta</h2>
            <form onSubmit={handleCreateGoal} className="modal-form">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={newGoal.nombre}
                  onChange={(e) => setNewGoal({ ...newGoal, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={newGoal.descripcion}
                  onChange={(e) => setNewGoal({ ...newGoal, descripcion: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>Monto Objetivo</label>
                <input
                  type="number"
                  step="0.01"
                  value={newGoal.monto_objetivo}
                  onChange={(e) => setNewGoal({ ...newGoal, monto_objetivo: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Monto Actual</label>
                <input
                  type="number"
                  step="0.01"
                  value={newGoal.monto_actual}
                  onChange={(e) => setNewGoal({ ...newGoal, monto_actual: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Fecha Límite</label>
                <input
                  type="date"
                  value={newGoal.fecha_limite}
                  onChange={(e) => setNewGoal({ ...newGoal, fecha_limite: e.target.value })}
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

export default Goals

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import './AdminPages.css'

const Users = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newUser, setNewUser] = useState({
    nombre: '',
    email: '',
    access_token_plaid: '',
    plan_suscripcion: 'basico',
    rol: 'cliente'
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .order('fecha_registro', { ascending: false })

      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await supabase.from('usuarios').insert({
        ...newUser,
        configuracion: {}
      })
      setShowModal(false)
      setNewUser({
        nombre: '',
        email: '',
        access_token_plaid: '',
        plan_suscripcion: 'basico',
        rol: 'cliente'
      })
      fetchUsers()
    } catch (error) {
      console.error('Error creating user:', error)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        await supabase.from('usuarios').delete().eq('id', userId)
        fetchUsers()
      } catch (error) {
        console.error('Error deleting user:', error)
      }
    }
  }

  if (loading) {
    return <div className="loading">Cargando usuarios...</div>
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1 className="page-title">Gestión de Usuarios</h1>
        <button className="primary-button" onClick={() => setShowModal(true)}>
          ➕ Crear Usuario
        </button>
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Email</th>
              <th>Plan</th>
              <th>Rol</th>
              <th>Fecha Registro</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.nombre}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`plan-badge plan-${user.plan_suscripcion}`}>
                    {user.plan_suscripcion}
                  </span>
                </td>
                <td>
                  <span className={`role-badge role-${user.rol}`}>
                    {user.rol}
                  </span>
                </td>
                <td>{new Date(user.fecha_registro).toLocaleDateString()}</td>
                <td>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteUser(user.id)}
                  >
                    🗑️
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Crear Nuevo Usuario</h2>
            <form onSubmit={handleCreateUser} className="modal-form">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={newUser.nombre}
                  onChange={(e) => setNewUser({ ...newUser, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={newUser.access_token_plaid}
                  onChange={(e) => setNewUser({ ...newUser, access_token_plaid: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Plan</label>
                <select
                  value={newUser.plan_suscripcion}
                  onChange={(e) => setNewUser({ ...newUser, plan_suscripcion: e.target.value })}
                >
                  <option value="basico">Básico</option>
                  <option value="premium">Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div className="form-group">
                <label>Rol</label>
                <select
                  value={newUser.rol}
                  onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                >
                  <option value="cliente">Cliente</option>
                  <option value="admin">Admin</option>
                </select>
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

export default Users

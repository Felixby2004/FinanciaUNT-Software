import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useLanguage } from '../../contexts/LanguageContext'
import './ClientPages.css'

const Transactions = ({ userId }) => {
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newTransaction, setNewTransaction] = useState({
    monto: '',
    categoria: 'Alimentación',
    descripcion: '',
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'gasto',
    cuenta: 'Cuenta Principal'
  })

  useEffect(() => {
    fetchTransactions()
  }, [userId])

  const fetchTransactions = async () => {
    try {
      const { data } = await supabase
        .from('transacciones')
        .select('*')
        .eq('usuario_id', userId)
        .order('fecha', { ascending: false })

      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransaction = async (e) => {
    e.preventDefault()
    try {
      await supabase.from('transacciones').insert({
        usuario_id: userId,
        ...newTransaction,
        monto: parseFloat(newTransaction.monto),
        metadata: {}
      })
      setShowModal(false)
      setNewTransaction({
        monto: '',
        categoria: 'Alimentación',
        descripcion: '',
        fecha: new Date().toISOString().split('T')[0],
        tipo: 'gasto',
        cuenta: 'Cuenta Principal'
      })
      fetchTransactions()
    } catch (error) {
      console.error('Error creating transaction:', error)
    }
  }

  const handleDeleteTransaction = async (id) => {
    if (window.confirm(t('confirmDelete'))) {
      try {
        await supabase.from('transacciones').delete().eq('id', id)
        fetchTransactions()
      } catch (error) {
        console.error('Error deleting transaction:', error)
      }
    }
  }

  const categories = [
    'Alimentación', 'Transporte', 'Entretenimiento', 'Servicios',
    'Salud', 'Educación', 'Compras', 'Ingresos', 'Otros'
  ]

  if (loading) {
    return <div className="loading">{t('loading')}</div>
  }

  return (
    <div className="client-page">
      <div className="page-header">
        <h1 className="page-title">{t('transactions')}</h1>
        <button className="primary-button" onClick={() => setShowModal(true)}>
          ➕ {t('newTransaction')}
        </button>
      </div>

      <div className="transactions-list">
        {transactions.map((t) => (
          <div key={t.id} className="transaction-item">
            <div className="transaction-info">
              <p className="transaction-category">{t.categoria}</p>
              <p className="transaction-date">
                {new Date(t.fecha).toLocaleDateString()}
              </p>
              {t.descripcion && (
                <p className="transaction-description">{t.descripcion}</p>
              )}
              <p className="transaction-account">{t.cuenta}</p>
            </div>
            <div className="transaction-actions">
              <div className={`transaction-amount ${t.tipo}`}>
                {t.tipo === 'ingreso' ? '+' : '-'}$${t.monto.toLocaleString()}
              </div>
              <button
                className="delete-button"
                onClick={() => handleDeleteTransaction(t.id)}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      {transactions.length === 0 && (
        <div className="empty-state">{t('noTransactionsYet')}</div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">{t('newTransaction')}</h2>
            <form onSubmit={handleCreateTransaction} className="modal-form">
              <div className="form-group">
                <label>{t('type')}</label>
                <select
                  value={newTransaction.tipo}
                  onChange={(e) => setNewTransaction({ ...newTransaction, tipo: e.target.value })}
                >
                  <option value="gasto">{t('expense')}</option>
                  <option value="ingreso">{t('income')}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t('amount')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={newTransaction.monto}
                  onChange={(e) => setNewTransaction({ ...newTransaction, monto: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('category')}</label>
                <select
                  value={newTransaction.categoria}
                  onChange={(e) => setNewTransaction({ ...newTransaction, categoria: e.target.value })}
                >
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>{t('description')}</label>
                <input
                  type="text"
                  value={newTransaction.descripcion}
                  onChange={(e) => setNewTransaction({ ...newTransaction, descripcion: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>{t('date')}</label>
                <input
                  type="date"
                  value={newTransaction.fecha}
                  onChange={(e) => setNewTransaction({ ...newTransaction, fecha: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>{t('account')}</label>
                <input
                  type="text"
                  value={newTransaction.cuenta}
                  onChange={(e) => setNewTransaction({ ...newTransaction, cuenta: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                >
                  {t('cancel')}
                </button>
                <button type="submit" className="primary-button">
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Transactions

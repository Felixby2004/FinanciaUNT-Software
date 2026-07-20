import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Trash2, Plus, TrendingUp, Calendar, Search, X } from 'lucide-react';
import './ClientPages.css';

const Goals = ({ userId, user: propUser }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ===== ESTADOS =====
  const [plan, setPlan] = useState('basic');
  const [userCurrency, setUserCurrency] = useState('PEN');
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [goals, setGoals] = useState([]);
  const [filteredGoals, setFilteredGoals] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [addAmount, setAddAmount] = useState('');
  const [adding, setAdding] = useState(false);
  const [newGoal, setNewGoal] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'ahorro',
    monto_objetivo: '',
    monto_actual: '0',
    fecha_limite: '',
  });

  // ===== FUNCIÓN DE FORMATEO =====
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: userCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // ===== 1. OBTENER PLAN Y MONEDA =====
  useEffect(() => {
    const fetchUserData = async () => {
      if (propUser && propUser.plan_suscripcion && propUser.configuracion?.currency) {
        setPlan(propUser.plan_suscripcion);
        setUserCurrency(propUser.configuracion.currency);
        setLoadingPlan(false);
        return;
      }

      if (!userId) {
        setPlan('basic');
        setUserCurrency('PEN');
        setLoadingPlan(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('plan_suscripcion, configuracion')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error al obtener datos del usuario:', error);
          setPlan('basic');
          setUserCurrency('PEN');
        } else {
          setPlan(data?.plan_suscripcion || 'basic');
          let currency = 'PEN';
          if (data?.configuracion) {
            if (typeof data.configuracion === 'string') {
              try {
                const parsed = JSON.parse(data.configuracion);
                currency = parsed.currency || 'PEN';
              } catch {
                currency = 'PEN';
              }
            } else if (typeof data.configuracion === 'object') {
              currency = data.configuracion.currency || 'PEN';
            }
          }
          setUserCurrency(currency);
        }
      } catch (err) {
        console.error('Error inesperado:', err);
        setPlan('basic');
        setUserCurrency('PEN');
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchUserData();
  }, [userId, propUser]);

  // ===== 2. CARGAR METAS =====
  useEffect(() => {
    if (loadingPlan) return;
    loadGoals();
  }, [userId, loadingPlan]);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('metas_financieras')
        .select('*')
        .eq('usuario_id', userId)
        .order('fecha_limite', { ascending: true });
      setGoals(data || []);
      setFilteredGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshGoals = async () => {
    try {
      const { data } = await supabase
        .from('metas_financieras')
        .select('*')
        .eq('usuario_id', userId)
        .order('fecha_limite', { ascending: true });
      setGoals(data || []);
      setFilteredGoals(data || []);
    } catch (error) {
      console.error('Error refreshing goals:', error);
    }
  };

  // ===== 3. FILTRAR POR NOMBRE =====
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredGoals(goals);
    } else {
      const searchLower = searchTerm.toLowerCase();
      const filtered = goals.filter(g =>
        g.nombre?.toLowerCase().includes(searchLower)
      );
      setFilteredGoals(filtered);
    }
  }, [searchTerm, goals]);

  // ===== 4. CREAR META =====
  const handleCreateGoal = async (e) => {
    e.preventDefault();

    if (!newGoal.nombre.trim()) {
      alert(t('enterGoalName'));
      return;
    }
    if (!newGoal.monto_objetivo || parseFloat(newGoal.monto_objetivo) <= 0) {
      alert(t('enterValidTarget'));
      return;
    }

    try {
      await supabase.from('metas_financieras').insert({
        usuario_id: userId,
        ...newGoal,
        monto_objetivo: parseFloat(newGoal.monto_objetivo),
        monto_actual: parseFloat(newGoal.monto_actual) || 0,
        estado: 'activo',
      });

      setShowModal(false);
      resetForm();
      await refreshGoals();
    } catch (error) {
      console.error('Error creating goal:', error);
      alert(t('errorCreatingGoal'));
    }
  };

  const resetForm = () => {
    setNewGoal({
      nombre: '',
      descripcion: '',
      tipo: 'ahorro',
      monto_objetivo: '',
      monto_actual: '0',
      fecha_limite: '',
    });
  };

  // ===== 5. AGREGAR A META =====
  const openAddModal = (goal) => {
    setSelectedGoal(goal);
    setAddAmount('');
    setShowAddModal(true);
  };

  const handleAddToGoal = async () => {
    if (!selectedGoal) return;

    const amount = parseFloat(addAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(t('invalidAmount'));
      return;
    }

    setAdding(true);
    try {
      await supabase
        .from('metas_financieras')
        .update({ monto_actual: selectedGoal.monto_actual + amount })
        .eq('id', selectedGoal.id);

      setShowAddModal(false);
      setSelectedGoal(null);
      setAddAmount('');
      await refreshGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
      alert(t('errorUpdatingGoal'));
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteGoal = async (id) => {
    if (window.confirm(t('confirmDeleteGoal'))) {
      try {
        await supabase.from('metas_financieras').delete().eq('id', id);
        await refreshGoals();
      } catch (error) {
        console.error('Error deleting goal:', error);
        alert(t('errorDeletingGoal'));
      }
    }
  };

  // ===== ESTILOS =====
  const bgColor = isDark ? '#16213e' : '#ffffff';
  const borderColor = isDark ? '#2a3a5e' : '#e5e7eb';
  const textColor = isDark ? '#e0e0e0' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const hoverBg = isDark ? '#1e2a4a' : '#f1f5f9';
  const shadow = isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.06)';

  if (loadingPlan || loading) {
    return (
      <div className="loading" style={{ padding: '2rem', textAlign: 'center', color: textSecondary }}>
        <div className="spinner" style={{ margin: '0 auto 1rem', border: '4px solid rgba(0,0,0,0.1)', borderTopColor: '#667eea', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <p>{loadingPlan ? 'Cargando información del plan...' : t('loadingGoals')}</p>
      </div>
    );
  }

  return (
    <div className="client-page" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: textColor }}>{t('financialGoals')}</h1>
          <p style={{ fontSize: '0.9rem', color: textSecondary, margin: '0.25rem 0 0' }}>
            {filteredGoals.length} {t('goals')} • Plan: <strong>{plan}</strong> • Moneda: <strong>{userCurrency}</strong>
          </p>
        </div>
        <button
          className="primary-button"
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1.2rem',
            borderRadius: '10px',
            border: 'none',
            background: '#667eea',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus size={18} /> {t('newGoal')}
        </button>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={t('searchGoal') || 'Buscar meta por nombre...'}
          style={{
            width: '100%',
            padding: '0.6rem 0.8rem 0.6rem 2.5rem',
            borderRadius: '10px',
            border: `1px solid ${borderColor}`,
            backgroundColor: bgColor,
            color: textColor,
            outline: 'none',
            fontSize: '0.95rem',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.target.style.borderColor = '#667eea'}
          onBlur={(e) => e.target.style.borderColor = borderColor}
        />
        <Search size={18} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: textSecondary }} />
        {searchTerm && (
          <button
            type="button"
            onClick={() => setSearchTerm('')}
            style={{
              position: 'absolute',
              right: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: textSecondary,
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Grid de metas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {filteredGoals.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '3rem 1.5rem', textAlign: 'center', color: textSecondary, backgroundColor: bgColor, borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: shadow }}>
            <p style={{ fontSize: '1.1rem' }}>
              {searchTerm ? t('noGoalsFound') || 'No se encontraron metas' : t('noGoals')}
            </p>
            {searchTerm && (
              <p style={{ fontSize: '0.9rem', opacity: 0.7, marginTop: '0.25rem' }}>
                {t('tryDifferentSearch') || 'Prueba con otro término de búsqueda.'}
              </p>
            )}
          </div>
        ) : (
          filteredGoals.map((goal) => {
            const progress = Math.min((goal.monto_actual / goal.monto_objetivo) * 100, 100);
            const isCompleted = progress >= 100;
            const progressColor = isCompleted ? '#22c55e' : '#667eea';

            return (
              <div
                key={goal.id}
                style={{
                  backgroundColor: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '16px',
                  padding: '1.25rem',
                  boxShadow: shadow,
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = borderColor}
              >
                {/* Encabezado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>{isCompleted ? '🎯' : '📌'}</span>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: textColor }}>
                      {goal.nombre}
                    </h3>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(goal.id)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: textSecondary,
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '6px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#ef4444'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSecondary; }}
                    title={t('delete')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* Descripción */}
                {goal.descripcion && (
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: textSecondary, lineHeight: 1.4 }}>
                    {goal.descripcion}
                  </p>
                )}

                {/* Barra de progreso */}
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: textSecondary, marginBottom: '0.25rem' }}>
                    <span>{t('progress')}</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div
                    style={{
                      width: '100%',
                      height: '8px',
                      backgroundColor: isDark ? '#2a3a5e' : '#e5e7eb',
                      borderRadius: '999px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${progress}%`,
                        height: '100%',
                        backgroundColor: progressColor,
                        borderRadius: '999px',
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                </div>

                {/* Estadísticas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  <div style={{ backgroundColor: isDark ? '#1a1a2e' : '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', color: textSecondary }}>
                      {t('current')}
                    </p>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: textColor }}>
                      {formatCurrency(goal.monto_actual)}
                    </p>
                  </div>
                  <div style={{ backgroundColor: isDark ? '#1a1a2e' : '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                    <p style={{ margin: 0, fontSize: '0.7rem', textTransform: 'uppercase', color: textSecondary }}>
                      {t('target')}
                    </p>
                    <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: textColor }}>
                      {formatCurrency(goal.monto_objetivo)}
                    </p>
                  </div>
                </div>

                {/* Fecha y botón agregar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', borderTop: `1px solid ${borderColor}`, paddingTop: '0.75rem' }}>
                  {goal.fecha_limite && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: textSecondary }}>
                      <Calendar size={14} />
                      <span>{new Date(goal.fecha_limite).toLocaleDateString()}</span>
                    </div>
                  )}
                  <button
                    className="add-to-goal-button"
                    onClick={() => openAddModal(goal)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.25rem 0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      background: '#667eea',
                      color: 'white',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#5a6fd1'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#667eea'}
                  >
                    <Plus size={14} /> {t('add')}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal de agregar a meta */}
      {showAddModal && selectedGoal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowAddModal(false);
            setSelectedGoal(null);
            setAddAmount('');
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            padding: '1rem',
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '420px',
              width: '100%',
              boxShadow: shadow,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: textColor }}>
                ➕ {t('addToGoal') || 'Agregar a meta'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedGoal(null);
                  setAddAmount('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: textSecondary,
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: textColor }}>
                {t('amountToAdd') || 'Monto a agregar'}
              </label>
              <input
                type="number"
                step="0.01"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                style={{
                  width: '100%',
                  padding: '0.6rem 0.8rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  background: bgColor,
                  color: textColor,
                  outline: 'none',
                  fontSize: '1rem',
                }}
                onKeyPress={(e) => e.key === 'Enter' && handleAddToGoal()}
              />
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                {[10, 25, 50, 100].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAddAmount(String(amount))}
                    style={{
                      padding: '0.15rem 0.6rem',
                      borderRadius: '4px',
                      border: `1px solid ${borderColor}`,
                      background: 'transparent',
                      color: textSecondary,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.color = '#667eea'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = borderColor; e.currentTarget.style.color = textSecondary; }}
                  >
                    +{formatCurrency(amount)}
                  </button>
                ))}
              </div>
            </div>

            <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: `1px solid ${borderColor}`, paddingTop: '1rem' }}>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedGoal(null);
                  setAddAmount('');
                }}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                  background: 'transparent',
                  color: textColor,
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s',
                }}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleAddToGoal}
                disabled={adding}
                style={{
                  padding: '0.6rem 1.2rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#667eea',
                  color: 'white',
                  fontWeight: 600,
                  cursor: adding ? 'not-allowed' : 'pointer',
                  opacity: adding ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
              >
                {adding ? t('adding') || 'Agregando...' : t('add')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de nueva meta */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowModal(false);
            resetForm();
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
            padding: '1rem',
          }}
        >
          <div
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: bgColor,
              border: `1px solid ${borderColor}`,
              borderRadius: '16px',
              padding: '2rem',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: shadow,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 700, color: textColor, flexShrink: 0 }}>
              {t('newGoal')}
            </h2>

            <form onSubmit={handleCreateGoal} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Nombre */}
              <div className="form-group" style={{ marginBottom: '1rem', flexShrink: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: textColor }}>{t('name')}</label>
                <input
                  type="text"
                  value={newGoal.nombre}
                  onChange={(e) => setNewGoal({ ...newGoal, nombre: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    outline: 'none',
                  }}
                  placeholder={t('enterGoalName') || 'Ej: Viaje a Europa'}
                />
              </div>

              {/* Descripción */}
              <div className="form-group" style={{ marginBottom: '1rem', flexShrink: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: textColor }}>{t('description')}</label>
                <textarea
                  value={newGoal.descripcion}
                  onChange={(e) => setNewGoal({ ...newGoal, descripcion: e.target.value })}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    outline: 'none',
                    resize: 'vertical',
                    minHeight: '60px',
                  }}
                  placeholder={t('optional')}
                />
              </div>

              {/* Monto objetivo */}
              <div className="form-group" style={{ marginBottom: '1rem', flexShrink: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: textColor }}>{t('targetAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={newGoal.monto_objetivo}
                  onChange={(e) => setNewGoal({ ...newGoal, monto_objetivo: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    outline: 'none',
                  }}
                  placeholder="0.00"
                />
              </div>

              {/* Monto actual */}
              <div className="form-group" style={{ marginBottom: '1rem', flexShrink: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: textColor }}>{t('currentAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={newGoal.monto_actual}
                  onChange={(e) => setNewGoal({ ...newGoal, monto_actual: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    outline: 'none',
                  }}
                  placeholder="0.00"
                />
              </div>

              {/* Fecha límite */}
              <div className="form-group" style={{ marginBottom: '1rem', flexShrink: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: textColor }}>{t('deadline')}</label>
                <input
                  type="date"
                  value={newGoal.fecha_limite}
                  onChange={(e) => setNewGoal({ ...newGoal, fecha_limite: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    outline: 'none',
                  }}
                />
              </div>

              {/* Botones */}
              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '1rem', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: 'transparent',
                    color: textColor,
                    cursor: 'pointer',
                    fontWeight: 500,
                    transition: 'all 0.2s',
                  }}
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  style={{
                    padding: '0.6rem 1.2rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#667eea',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {t('create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Goals;
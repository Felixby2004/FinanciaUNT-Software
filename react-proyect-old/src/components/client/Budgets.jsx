import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Trash2, Plus, Wallet, Search, X, Check, ChevronDown, ChevronUp } from 'lucide-react';
import './ClientPages.css';

const Budgets = ({ userId, user: propUser }) => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // ===== ESTADOS =====
  const [plan, setPlan] = useState('basic');
  const [userCurrency, setUserCurrency] = useState('PEN');
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryRef = useRef(null);
  const [newBudget, setNewBudget] = useState({
    categoria: '',
    monto_maximo: '',
    periodo: 'mensual',
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

  // ===== CERRAR DROPDOWN =====
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // ===== 2. OBTENER CATEGORÍAS =====
  useEffect(() => {
    if (loadingPlan) return;

    const fetchCategories = async () => {
      const planLevels = ['basic'];
      if (plan === 'premium' || plan === 'enterprise') planLevels.push('premium');
      if (plan === 'enterprise') planLevels.push('enterprise');

      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .or(`is_global.eq.true,user_id.eq.${userId}`)
          .in('plan_level', planLevels)
          .order('name');

        if (error) {
          console.error('Error fetching categories:', error);
          setCategories(['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud', 'Educación', 'Compras', 'Otros']);
          return;
        }

        const names = data.map(c => c.name);
        if (names.length === 0) {
          setCategories(['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud', 'Educación', 'Compras', 'Otros']);
        } else {
          setCategories(names);
          if (names.length > 0 && !newBudget.categoria) {
            setNewBudget(prev => ({ ...prev, categoria: names[0] }));
          }
        }
      } catch (err) {
        console.error('Error inesperado en categorías:', err);
        setCategories(['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud', 'Educación', 'Compras', 'Otros']);
      }
    };

    fetchCategories();
  }, [plan, userId, loadingPlan]);

  // ===== 3. FILTRAR CATEGORÍAS =====
  useEffect(() => {
    if (categorySearch.trim() === '') {
      setFilteredCategories(categories);
    } else {
      const searchLower = categorySearch.toLowerCase();
      const filtered = categories.filter(cat =>
        cat.toLowerCase().includes(searchLower)
      );
      setFilteredCategories(filtered);
    }
  }, [categorySearch, categories]);

  // ===== 4. OBTENER PRESUPUESTOS =====
  useEffect(() => {
    if (loadingPlan) return;
    fetchBudgets();
  }, [userId, loadingPlan]);

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('usuario_id', userId)
        .order('categoria');
      setBudgets(data || []);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBudgets = async () => {
    try {
      const { data } = await supabase
        .from('presupuestos')
        .select('*')
        .eq('usuario_id', userId)
        .order('categoria');
      setBudgets(data || []);
    } catch (error) {
      console.error('Error refreshing budgets:', error);
    }
  };

  // ===== 5. CREAR PRESUPUESTO =====
  const handleCreateBudget = async (e) => {
    e.preventDefault();

    if (!newBudget.monto_maximo || parseFloat(newBudget.monto_maximo) <= 0) {
      alert(t('invalidAmount') || 'Ingresa un monto válido.');
      return;
    }
    if (!newBudget.categoria) {
      alert(t('selectCategory') || 'Selecciona una categoría.');
      return;
    }

    try {
      await supabase.from('presupuestos').insert({
        usuario_id: userId,
        ...newBudget,
        monto_maximo: parseFloat(newBudget.monto_maximo),
      });

      setShowModal(false);
      setCategorySearch('');
      setIsCategoryDropdownOpen(false);
      setNewBudget({
        categoria: categories[0] || '',
        monto_maximo: '',
        periodo: 'mensual',
      });
      await refreshBudgets();
    } catch (error) {
      console.error('Error creating budget:', error);
      alert(t('errorCreatingBudget') || 'Error al crear el presupuesto.');
    }
  };

  const handleDeleteBudget = async (id) => {
    if (window.confirm(t('confirmDeleteBudget'))) {
      try {
        await supabase.from('presupuestos').delete().eq('id', id);
        await refreshBudgets();
      } catch (error) {
        console.error('Error deleting budget:', error);
      }
    }
  };

  const selectCategory = (cat) => {
    setNewBudget({ ...newBudget, categoria: cat });
    setCategorySearch('');
    setIsCategoryDropdownOpen(false);
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
        <div className="spinner" />
        <p>{loadingPlan ? 'Cargando información del plan...' : t('loadingBudgets')}</p>
      </div>
    );
  }

  return (
    <div className="client-page" style={{ padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: textColor }}>{t('budgets')}</h1>
          <p style={{ fontSize: '0.9rem', color: textSecondary, margin: '0.25rem 0 0' }}>
            {budgets.length} {t('budgets')} • Plan: <strong>{plan}</strong> • Moneda: <strong>{userCurrency}</strong>
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
          <Plus size={18} /> {t('newBudget')}
        </button>
      </div>

      {/* Tabla de presupuestos */}
      <div style={{ backgroundColor: bgColor, borderRadius: '16px', border: `1px solid ${borderColor}`, boxShadow: shadow, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '0.5rem', padding: '0.75rem 1.25rem', backgroundColor: isDark ? '#1a1a2e' : '#f8fafc', borderBottom: `1px solid ${borderColor}`, fontWeight: 600, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: textSecondary }}>
          <span>{t('category')}</span>
          <span>{t('limit')}</span>
          <span>{t('period')}</span>
          <span style={{ textAlign: 'center', width: '40px' }}></span>
        </div>

        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {budgets.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: textSecondary }}>
              <p style={{ fontSize: '1.1rem' }}>{t('noBudgets')}</p>
            </div>
          ) : (
            budgets.map((budget) => (
              <div
                key={budget.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr auto',
                  gap: '0.5rem',
                  alignItems: 'center',
                  padding: '0.75rem 1.25rem',
                  borderBottom: `1px solid ${borderColor}`,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = hoverBg}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '8px', backgroundColor: 'rgba(102,126,234,0.12)', color: '#667eea' }}>
                    <Wallet size={14} />
                  </span>
                  <span style={{ fontWeight: 500, color: textColor }}>{budget.categoria}</span>
                </div>
                <div style={{ color: textColor, fontWeight: 600 }}>{formatCurrency(budget.monto_maximo)}</div>
                <div style={{ color: textSecondary }}>
                  {budget.periodo === 'mensual' ? t('monthly') : budget.periodo}
                </div>
                <button
                  onClick={() => handleDeleteBudget(budget.id)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: textSecondary,
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    justifySelf: 'center',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = textSecondary; }}
                  title={t('delete')}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            setShowModal(false);
            setCategorySearch('');
            setIsCategoryDropdownOpen(false);
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
              {t('newBudget')}
            </h2>

            <form onSubmit={handleCreateBudget} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
              {/* Categoría */}
              <div className="form-group" style={{ marginBottom: '1rem', flexShrink: 0 }} ref={categoryRef}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: textColor }}>{t('category')}</label>

                {newBudget.categoria && (
                  <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ background: 'rgba(102,126,234,0.15)', color: '#667eea', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Check size={14} /> {newBudget.categoria}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewBudget({ ...newBudget, categoria: '' });
                        setCategorySearch('');
                        setIsCategoryDropdownOpen(true);
                      }}
                      style={{ background: 'transparent', border: 'none', color: textSecondary, cursor: 'pointer', fontSize: '0.7rem' }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <input
                    type="text"
                    value={categorySearch}
                    onChange={(e) => {
                      setCategorySearch(e.target.value);
                      setIsCategoryDropdownOpen(true);
                    }}
                    onFocus={() => setIsCategoryDropdownOpen(true)}
                    placeholder={t('searchCategory') || 'Buscar categoría...'}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.8rem 0.5rem 2.2rem',
                      borderRadius: '8px',
                      border: `1px solid ${borderColor}`,
                      background: bgColor,
                      color: textColor,
                      outline: 'none',
                    }}
                  />
                  <Search size={16} style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: textSecondary }} />
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    style={{
                      position: 'absolute',
                      right: '0.4rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: textSecondary,
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {isCategoryDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {isCategoryDropdownOpen && (
                  <div
                    style={{
                      maxHeight: '140px',
                      overflowY: 'auto',
                      border: `1px solid ${borderColor}`,
                      borderRadius: '8px',
                      backgroundColor: bgColor,
                      padding: '0.25rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                  >
                    {filteredCategories.length === 0 ? (
                      <div style={{ padding: '0.5rem', textAlign: 'center', color: textSecondary, fontSize: '0.85rem' }}>
                        {t('noCategoriesFound') || 'No se encontraron categorías'}
                      </div>
                    ) : (
                      filteredCategories.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => selectCategory(cat)}
                          style={{
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            border: 'none',
                            background: newBudget.categoria === cat
                              ? isDark ? 'rgba(102,126,234,0.25)' : 'rgba(102,126,234,0.12)'
                              : 'transparent',
                            color: textColor,
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            transition: 'background 0.15s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                          onMouseEnter={(e) => {
                            if (newBudget.categoria !== cat) {
                              e.currentTarget.style.backgroundColor = hoverBg;
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (newBudget.categoria !== cat) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }
                          }}
                        >
                          <span>{cat}</span>
                          {newBudget.categoria === cat && (
                            <span style={{ color: '#667eea', fontSize: '0.8rem' }}>✓</span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Límite mensual */}
              <div className="form-group" style={{ marginBottom: '1rem', flexShrink: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: textColor }}>{t('monthlyLimit')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={newBudget.monto_maximo}
                  onChange={(e) => setNewBudget({ ...newBudget, monto_maximo: e.target.value })}
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

              {/* Periodo */}
              <div className="form-group" style={{ marginBottom: '1rem', flexShrink: 0 }}>
                <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500, color: textColor }}>{t('period')}</label>
                <select
                  value={newBudget.periodo}
                  onChange={(e) => setNewBudget({ ...newBudget, periodo: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    borderRadius: '8px',
                    border: `1px solid ${borderColor}`,
                    background: bgColor,
                    color: textColor,
                    outline: 'none',
                  }}
                >
                  <option value="mensual">{t('monthly')}</option>
                  <option value="semanal">{t('weekly')}</option>
                  <option value="anual">{t('yearly')}</option>
                </select>
              </div>

              {/* Botones */}
              <div className="modal-actions" style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '1rem', borderTop: `1px solid ${borderColor}`, flexShrink: 0 }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowModal(false);
                    setCategorySearch('');
                    setIsCategoryDropdownOpen(false);
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

export default Budgets;
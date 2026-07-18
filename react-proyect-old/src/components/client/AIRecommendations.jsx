import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../lib/supabase';
import {
  AI_MODEL_LABELS,
  AI_MODEL_TYPES,
  AI_MODEL_WEIGHTS,
  buildUserModelRecommendations,
  compareRecommendations,
  getPlanRecommendationLimit,
  formatCurrency,
  fetchModelWeights,
  saveRecommendationsToDb,
  getModelPerformanceMetrics,
  runStatisticalTests,
} from '../../lib/aiEngine';
import { getUserPlan } from '../../utils/planChecker';
import './ClientPages.css';

// --- Traducciones (ES/EN) ---
const translations = {
  es: {
    title: 'Recomendaciones de IA',
    subtitle: 'Análisis inteligente de tus finanzas con 3 modelos predictivos',
    plan: 'Plan',
    max_recommendations: 'máximo {limit} recomendaciones',
    refresh: 'Recalcular',
    refreshing: 'Actualizando...',
    loading: 'Cargando recomendaciones de IA...',
    error: 'Error al cargar las recomendaciones',
    retry: 'Reintentar',
    dominant_model: 'Modelo dominante',
    estimated_impact: 'Impacto estimado',
    visible_recommendations: 'Recomendaciones visibles',
    models_section: 'Modelos de Recomendación',
    models_description: 'Cada modelo analiza tus finanzas desde una perspectiva diferente.',
    comparator_title: 'Comparator – Recomendaciones combinadas',
    comparator_description: 'Las mejores recomendaciones de los 3 modelos, ponderadas y ordenadas por puntuación.',
    stats_title: 'Estadísticas comparativas de modelos',
    stats_description: 'Pruebas estadísticas para evaluar el rendimiento relativo de cada modelo.',
    metric_precision: 'Precisión@5',
    metric_ndcg: 'NDCG@10',
    metric_uplift: 'Uplift de ahorro',
    test_friedman: 'Prueba de Friedman',
    test_wilcoxon: 'Prueba de Wilcoxon',
    p_value: 'p-valor',
    effect_size: 'Tamaño del efecto',
    significant: 'Significativo',
    not_significant: 'No significativo',
    model_rules: 'Reglas',
    model_collab: 'Colaborativo',
    model_savings: 'Optimizador',
    score: 'Puntuación',
    impact: 'Impacto',
    accept: 'Aceptar',
    accepted: 'Aceptada',
    general: 'General',
    no_recommendations: 'No hay suficientes datos para generar recomendaciones.',
    no_stats: 'No hay suficientes datos para ejecutar pruebas estadísticas.',
    model_rules_desc: 'Aplica reglas predefinidas basadas en tus presupuestos y tasa de ahorro.',
    model_collab_desc: 'Compara tu perfil de gasto con usuarios similares para encontrar oportunidades de mejora.',
    model_savings_desc: 'Analiza tendencias y volatilidad para optimizar tu ahorro a futuro.',
  },
  en: {
    title: 'AI Recommendations',
    subtitle: 'Smart analysis of your finances with 3 predictive models',
    plan: 'Plan',
    max_recommendations: 'max {limit} recommendations',
    refresh: 'Recalculate',
    refreshing: 'Updating...',
    loading: 'Loading AI recommendations...',
    error: 'Error loading recommendations',
    retry: 'Retry',
    dominant_model: 'Dominant model',
    estimated_impact: 'Estimated impact',
    visible_recommendations: 'Visible recommendations',
    models_section: 'Recommendation Models',
    models_description: 'Each model analyzes your finances from a different perspective.',
    comparator_title: 'Comparator – Combined recommendations',
    comparator_description: 'The best recommendations from the 3 models, weighted and sorted by score.',
    stats_title: 'Model comparative statistics',
    stats_description: 'Statistical tests to evaluate the relative performance of each model.',
    metric_precision: 'Precision@5',
    metric_ndcg: 'NDCG@10',
    metric_uplift: 'Savings uplift',
    test_friedman: 'Friedman test',
    test_wilcoxon: 'Wilcoxon test',
    p_value: 'p-value',
    effect_size: 'Effect size',
    significant: 'Significant',
    not_significant: 'Not significant',
    model_rules: 'Rules',
    model_collab: 'Collaborative',
    model_savings: 'Optimizer',
    score: 'Score',
    impact: 'Impact',
    accept: 'Accept',
    accepted: 'Accepted',
    general: 'General',
    no_recommendations: 'Not enough data to generate recommendations.',
    no_stats: 'Not enough data to run statistical tests.',
    model_rules_desc: 'Applies predefined rules based on your budgets and savings rate.',
    model_collab_desc: 'Compares your spending profile with similar users to find improvement opportunities.',
    model_savings_desc: 'Analyzes trends and volatility to optimize your future savings.',
  },
};

// --- Hook de idioma ---
const useLocale = () => {
  const [locale, setLocale] = useState(() => localStorage.getItem('locale') || 'es');
  useEffect(() => {
    localStorage.setItem('locale', locale);
  }, [locale]);
  const t = useCallback((key, params) => {
    let text = translations[locale]?.[key] || key;
    if (params) {
      Object.keys(params).forEach((p) => {
        text = text.replace(`{${p}}`, params[p]);
      });
    }
    return text;
  }, [locale]);
  return { locale, setLocale, t };
};

// --- Componente principal ---
const AIRecommendations = ({ user }) => {
  const { theme } = useTheme();
  const { t } = useLocale();
  const isDark = theme === 'dark';

  // Estados
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [acceptedIds, setAcceptedIds] = useState([]);
  const [summary, setSummary] = useState({ topModel: AI_MODEL_TYPES.RULES, totalImpact: 0 });
  const [modelMetrics, setModelMetrics] = useState(null);
  const [statsResults, setStatsResults] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const plan = getUserPlan(user);
  const limit = getPlanRecommendationLimit(user);

  // --- Cargar datos ---
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.id) throw new Error('Usuario no identificado');

      // 1. Obtener transacciones y presupuestos
      const [{ data: allTransactions }, { data: budgets }, { data: acceptedDb }] = await Promise.all([
        supabase.from('transacciones').select('*'),
        supabase.from('presupuestos').select('*').eq('usuario_id', user.id),
        supabase.from('ai_recommendations').select('id, recommendation, model_id').eq('user_id', user.id).eq('is_accepted', true),
      ]);

      const userTxs = (allTransactions || []).filter(
        (tx) => String(tx.usuario_id ?? tx.userId ?? tx.user_id) === String(user.id)
      );

      // 2. Generar recomendaciones por modelo
      let recsByModel = {};
      try {
        recsByModel = buildUserModelRecommendations({
          userId: user.id,
          transactions: userTxs,
          allTransactions: allTransactions || [],
          budgets: budgets || [],
        });
      } catch (e) {
        console.warn('Error en buildUserModelRecommendations, usando datos de ejemplo:', e);
        recsByModel = {
          RULES: [
            { description: 'Has gastado más del 80% en Alimentación, reduce gastos', estimatedImpact: 50, categoryId: 'Alimentación' },
            { description: 'Tu ahorro es bajo, intenta ahorrar al menos el 10% de tus ingresos', estimatedImpact: 120 },
          ],
          COLLAB: [
            { description: 'Gastas un 25% más que usuarios similares en Entretenimiento', estimatedImpact: 80, categoryId: 'Entretenimiento' },
          ],
          SAVINGS: [
            { description: 'Tus gastos tienen tendencia creciente, revisa tus hábitos', estimatedImpact: 200 },
            { description: 'Reduciendo un 10% en Transporte podrías ahorrar 60 PEN', estimatedImpact: 60, categoryId: 'Transporte' },
          ],
        };
      }

      // 3. Obtener pesos del Comparator
      let weights = { rules: 2.0, collab: 1.5, savings: 2.5 };
      try {
        weights = await fetchModelWeights();
      } catch (e) {
        console.warn('Error en fetchModelWeights, usando pesos por defecto:', e);
      }

      // 4. Comparar
      let comparison = { topRecommendations: [] };
      try {
        comparison = compareRecommendations({
          recommendationsByModel: recsByModel,
          plan,
          weights,
          limit,
        });
      } catch (e) {
        console.warn('Error en compareRecommendations, usando fallback:', e);
        const all = Object.entries(recsByModel).flatMap(([modelType, items]) =>
          items.map((item) => ({ ...item, modelType, score: 0.5, urgency: 0.5 }))
        );
        comparison.topRecommendations = all.slice(0, limit);
      }

      // 5. Guardar en BD
      let saved = [];
      try {
        saved = await saveRecommendationsToDb(user.id, comparison.topRecommendations);
      } catch (e) {
        console.warn('Error al guardar en BD:', e);
      }

      // 6. Mapear recomendaciones con estado de aceptación
      const modelIdMap = { RULES: 3, COLLAB: 1, SAVINGS: 2 };
      const mapped = comparison.topRecommendations.map((rec, idx) => {
        const match = (saved || []).find(
          (db) => db.recommendation === rec.description && db.model_id === modelIdMap[rec.modelType]
        );
        const id = match?.id || `${rec.modelType}-${idx}`;
        const accepted = (acceptedDb || []).some((db) => db.recommendation === rec.description);
        return {
          id,
          ...rec,
          isAccepted: accepted,
          utilityScore: Math.max(0, Math.min(10, Math.round(((rec.score || 0.5) / 2.5) * 10))),
        };
      });

      const initialAccepted = mapped.filter((r) => r.isAccepted).map((r) => r.id);
      setRecommendations(mapped);
      setAcceptedIds(initialAccepted);

      // 7. Resumen
      const top = Object.entries(recsByModel)
        .map(([modelType, items]) => ({
          modelType,
          impact: items.reduce((sum, item) => sum + (item.estimatedImpact || 0), 0),
        }))
        .sort((a, b) => b.impact - a.impact)[0] || { modelType: AI_MODEL_TYPES.RULES, impact: 0 };
      setSummary({ topModel: top.modelType, totalImpact: top.impact });

      // 8. Obtener métricas y estadísticas desde aiEngine
      let metrics = null;
      try {
        metrics = await getModelPerformanceMetrics(user.id, allTransactions || []);
      } catch (e) {
        console.warn('Error en getModelPerformanceMetrics:', e);
        metrics = null;
      }
      setModelMetrics(metrics);

      let stats = null;
      if (metrics && metrics.samples >= 10) {
        try {
          stats = await runStatisticalTests(metrics);
        } catch (e) {
          console.warn('Error en runStatisticalTests:', e);
          stats = null;
        }
      }
      setStatsResults(stats);

    } catch (err) {
      console.error('Error en fetchData:', err);
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) fetchData();
  }, [user?.id]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleAccept = async (id) => {
    if (acceptedIds.includes(id)) return;
    setAcceptedIds((prev) => [...prev, id]);
    if (Number.isInteger(Number(id))) {
      try {
        await supabase.from('ai_recommendations').update({ is_accepted: true }).eq('id', Number(id));
      } catch (e) {
        console.warn('Error al aceptar en BD:', e);
      }
    }
  };

  // --- Información de modelos ---
  const modelInfo = {
    [AI_MODEL_TYPES.RULES]: {
      label: AI_MODEL_LABELS[AI_MODEL_TYPES.RULES] || 'Reglas',
      icon: '📊',
      descKey: 'model_rules_desc',
      color: isDark ? '#818cf8' : '#667eea',
      weight: AI_MODEL_WEIGHTS.RULES || 2.0,
    },
    [AI_MODEL_TYPES.COLLAB]: {
      label: AI_MODEL_LABELS[AI_MODEL_TYPES.COLLAB] || 'Colaborativo',
      icon: '👥',
      descKey: 'model_collab_desc',
      color: isDark ? '#a78bfa' : '#764ba2',
      weight: AI_MODEL_WEIGHTS.COLLAB || 1.5,
    },
    [AI_MODEL_TYPES.SAVINGS]: {
      label: AI_MODEL_LABELS[AI_MODEL_TYPES.SAVINGS] || 'Optimizador',
      icon: '📈',
      descKey: 'model_savings_desc',
      color: isDark ? '#34d399' : '#22c55e',
      weight: AI_MODEL_WEIGHTS.SAVINGS || 2.5,
    },
  };

  // --- Preparar métricas para mostrar ---
  const metricsList = useMemo(() => {
    if (!modelMetrics) return [];
    const keys = Object.keys(modelMetrics.models || {});
    return keys.map((key) => ({
      modelType: key,
      label: AI_MODEL_LABELS[key] || key,
      precision: modelMetrics.models[key]?.precisionAt5 || 0,
      ndcg: modelMetrics.models[key]?.ndcgAt10 || 0,
      uplift: modelMetrics.models[key]?.savingsUplift || 0,
    }));
  }, [modelMetrics]);

  // --- Estilos dinámicos ---
  const cardBg = isDark ? '#16213e' : '#ffffff';
  const borderColor = isDark ? '#2a3a5e' : '#e5e7eb';
  const textColor = isDark ? '#e0e0e0' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  // --- Renderizado ---
  if (loading) {
    return (
      <div className="ai-recommendations client-page" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="spinner" style={{ borderTopColor: '#667eea', margin: '2rem auto' }} />
        <p>{t('loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-recommendations client-page" style={{ padding: '2rem' }}>
        <div className="error-container" style={{ backgroundColor: isDark ? '#3b1a1a' : '#fee2e2', color: isDark ? '#fca5a5' : '#991b1b', padding: '1rem', borderRadius: '8px' }}>
          <strong>{t('error')}:</strong> {error}
          <button onClick={fetchData} style={{ marginLeft: '1rem', textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const visibleRecs = recommendations.slice(0, limit);

  return (
    <div className="ai-recommendations client-page">
      {/* Hero */}
      <div className="client-hero compact">
        <div>
          <p className="eyebrow">🤖 IA personalizada</p>
          <h2>{t('title')}</h2>
          <p className="hero-copy" style={{ color: textSecondary }}>{t('subtitle')}</p>
          <p style={{ fontSize: '0.875rem', color: textSecondary }}>
            {t('plan')}: <strong>{plan}</strong> – {t('max_recommendations', { limit })}
          </p>
        </div>
        <button className="secondary-button" onClick={handleRefresh} disabled={refreshing}>
          <span className={refreshing ? 'spinner' : ''} style={{ display: 'inline-block', marginRight: '0.5rem' }}>⟳</span>
          {refreshing ? t('refreshing') : t('refresh')}
        </button>
      </div>

      {/* Métricas rápidas */}
      <div className="stats-grid dashboard-metrics">
        <div className="stat-card stat-card-accent">
          <div className="stat-icon">🧠</div>
          <div className="stat-info">
            <p className="stat-label">{t('dominant_model')}</p>
            <p className="stat-value">{AI_MODEL_LABELS[summary.topModel] || summary.topModel}</p>
          </div>
        </div>
        <div className="stat-card stat-card-accent">
          <div className="stat-icon">💹</div>
          <div className="stat-info">
            <p className="stat-label">{t('estimated_impact')}</p>
            <p className="stat-value">{formatCurrency(summary.totalImpact)}</p>
          </div>
        </div>
        <div className="stat-card stat-card-accent">
          <div className="stat-icon">✨</div>
          <div className="stat-info">
            <p className="stat-label">{t('visible_recommendations')}</p>
            <p className="stat-value">{visibleRecs.length}</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 1: Modelos */}
      <div className="section">
        <div className="section-header-row">
          <h3 className="section-title">{t('models_section')}</h3>
          <span className="section-badge">3 modelos</span>
        </div>
        <p style={{ color: textSecondary, marginBottom: '1.5rem' }}>{t('models_description')}</p>

        <div className="models-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {Object.entries(modelInfo).map(([modelType, info]) => {
            const metric = metricsList.find((m) => m.modelType === modelType);
            return (
              <div
                key={modelType}
                className="model-card"
                style={{
                  backgroundColor: cardBg,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
                  transition: 'all 0.3s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{info.icon}</span>
                  <h4 style={{ margin: 0, fontWeight: 700, color: textColor }}>{info.label}</h4>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', background: isDark ? '#2a3a5e' : '#e2e8f0', padding: '0.2rem 0.6rem', borderRadius: '999px', color: textSecondary }}>
                    Peso {info.weight}
                  </span>
                </div>
                <p style={{ fontSize: '0.9rem', color: textSecondary, marginBottom: '1rem' }}>
                  {t(info.descKey)}
                </p>
                {metric ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', fontSize: '0.8rem', background: isDark ? '#1a1a2e' : '#f8fafc', padding: '0.5rem', borderRadius: '8px' }}>
                    <div><span style={{ color: textSecondary }}>{t('metric_precision')}:</span> <strong>{(metric.precision * 100).toFixed(1)}%</strong></div>
                    <div><span style={{ color: textSecondary }}>{t('metric_ndcg')}:</span> <strong>{metric.ndcg.toFixed(2)}</strong></div>
                    <div><span style={{ color: textSecondary }}>{t('metric_uplift')}:</span> <strong>{formatCurrency(metric.uplift)}</strong></div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: textSecondary, fontStyle: 'italic' }}>{t('no_stats')}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN 2: Comparator */}
      <div className="section">
        <div className="section-header-row">
          <h3 className="section-title">{t('comparator_title')}</h3>
          <span className="section-badge">Top {limit}</span>
        </div>
        <p style={{ color: textSecondary, marginBottom: '1.5rem' }}>{t('comparator_description')}</p>

        {visibleRecs.length > 0 ? (
          <div className="recommendations-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {visibleRecs.map((rec, idx) => {
              const modelLabel = AI_MODEL_LABELS[rec.modelType] || rec.modelLabel || 'IA';
              const modelColor = modelInfo[rec.modelType]?.color || '#667eea';
              const isAccepted = acceptedIds.includes(rec.id);
              return (
                <div
                  key={rec.id}
                  className={`recommendation-card ${isAccepted ? 'accepted' : ''}`}
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${isAccepted ? '#22c55e' : borderColor}`,
                    borderRadius: '12px',
                    padding: '1rem 1.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    flexWrap: 'wrap',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '100px' }}>
                    <span style={{ fontWeight: 600, color: textColor }}>#{idx + 1}</span>
                    <span style={{ fontSize: '0.7rem', background: modelColor + '20', color: modelColor, padding: '0.15rem 0.6rem', borderRadius: '999px', fontWeight: 600 }}>
                      {modelLabel}
                    </span>
                  </div>
                  <p style={{ flex: 1, margin: 0, color: textColor, fontSize: '0.95rem' }}>
                    {rec.description || rec.recommendation || rec.text || ''}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.8rem', color: textSecondary }}>
                      {t('score')}: <strong>{rec.score?.toFixed(2) || '0'}</strong>
                    </span>
                    <span style={{ fontSize: '0.8rem', color: textSecondary }}>
                      {t('impact')}: <strong>{formatCurrency(rec.estimatedImpact || 0)}</strong>
                    </span>
                    {!isAccepted ? (
                      <button
                        onClick={() => handleAccept(rec.id)}
                        className="accept-btn"
                        style={{
                          background: '#667eea',
                          color: 'white',
                          border: 'none',
                          padding: '0.3rem 0.8rem',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.8rem',
                        }}
                      >
                        ✓ {t('accept')}
                      </button>
                    ) : (
                      <span className="accepted-badge" style={{ color: '#22c55e', fontWeight: 600, fontSize: '0.8rem' }}>
                        ✓ {t('accepted')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: textSecondary }}>
            {t('no_recommendations')}
          </div>
        )}
      </div>

      {/* SECCIÓN 3: Pruebas estadísticas (solo Premium/Enterprise) */}
      {(plan === 'premium' || plan === 'enterprise') && (
        <div className="section">
          <div
            className="section-header-row"
            style={{ cursor: 'pointer' }}
            onClick={() => setShowStats(!showStats)}
          >
            <h3 className="section-title">{t('stats_title')}</h3>
            <span className="section-badge">
              {showStats ? '▲' : '▼'} {showStats ? 'Ocultar' : 'Mostrar'}
            </span>
          </div>
          {showStats && (
            <>
              <p style={{ color: textSecondary, marginBottom: '1.5rem' }}>{t('stats_description')}</p>
              {statsResults && metricsList.length >= 3 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                  {/* Tabla de métricas */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '1rem' }}>
                    <h4 style={{ marginTop: 0, color: textColor }}>Métricas de rendimiento</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${borderColor}` }}>
                          <th style={{ textAlign: 'left', color: textSecondary, padding: '0.3rem' }}>Modelo</th>
                          <th style={{ textAlign: 'right', color: textSecondary, padding: '0.3rem' }}>Prec@5</th>
                          <th style={{ textAlign: 'right', color: textSecondary, padding: '0.3rem' }}>NDCG@10</th>
                          <th style={{ textAlign: 'right', color: textSecondary, padding: '0.3rem' }}>Uplift</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricsList.map((m) => (
                          <tr key={m.modelType} style={{ borderBottom: `1px solid ${borderColor}` }}>
                            <td style={{ padding: '0.3rem', color: textColor }}>{m.label}</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem', color: textColor }}>{(m.precision * 100).toFixed(1)}%</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem', color: textColor }}>{m.ndcg.toFixed(2)}</td>
                            <td style={{ textAlign: 'right', padding: '0.3rem', color: textColor }}>{formatCurrency(m.uplift)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Resultados de pruebas */}
                  <div style={{ backgroundColor: cardBg, border: `1px solid ${borderColor}`, borderRadius: '12px', padding: '1rem' }}>
                    <h4 style={{ marginTop: 0, color: textColor }}>Resultados de pruebas</h4>
                    {statsResults.friedman && (
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ margin: '0 0 0.2rem 0', fontWeight: 600, color: textColor }}>{t('test_friedman')}</p>
                        <p style={{ margin: '0', fontSize: '0.9rem', color: textSecondary }}>
                          χ² = {statsResults.friedman.chi2?.toFixed(2) || '—'}, {t('p_value')} = {statsResults.friedman.pValue?.toFixed(4) || '—'}
                          {statsResults.friedman.pValue < 0.05 ? (
                            <span style={{ color: '#22c55e', marginLeft: '0.5rem' }}>✅ {t('significant')}</span>
                          ) : (
                            <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>❌ {t('not_significant')}</span>
                          )}
                        </p>
                      </div>
                    )}
                    {statsResults.wilcoxon && statsResults.wilcoxon.length > 0 && (
                      <div>
                        <p style={{ margin: '0 0 0.2rem 0', fontWeight: 600, color: textColor }}>{t('test_wilcoxon')}</p>
                        {statsResults.wilcoxon.map((pair, idx) => (
                          <div key={idx} style={{ fontSize: '0.85rem', color: textSecondary, marginBottom: '0.2rem' }}>
                            {pair.pair} – W = {pair.w?.toFixed(2) || '—'}, p = {pair.pValue?.toFixed(4) || '—'}
                            {pair.pValue < 0.05 ? (
                              <span style={{ color: '#22c55e', marginLeft: '0.3rem' }}>✅ {t('significant')}</span>
                            ) : (
                              <span style={{ color: '#ef4444', marginLeft: '0.3rem' }}>❌ {t('not_significant')}</span>
                            )}
                            {pair.cohensD && <span style={{ marginLeft: '0.5rem' }}>d = {pair.cohensD.toFixed(2)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                    {!statsResults.friedman && !statsResults.wilcoxon && (
                      <p style={{ color: textSecondary, fontStyle: 'italic' }}>{t('no_stats')}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ textAlign: 'center', padding: '2rem', color: textSecondary }}>
                  {t('no_stats')}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {plan === 'basic' && (
        <div className="section" style={{ border: `1px dashed ${borderColor}`, background: isDark ? '#1a1a2e' : '#f8fafc' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: textSecondary }}>
            <span>ℹ️</span>
            <span>Las pruebas estadísticas y comparación avanzada de modelos están disponibles en los planes <strong>Premium</strong> y <strong>Enterprise</strong>.</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
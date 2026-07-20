import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  AI_MODEL_LABELS,
  AI_MODEL_TYPES,
  AI_MODEL_WEIGHTS,
  buildUserModelRecommendations,
  compareRecommendations,
  getPlanRecommendationLimit,
  fetchModelWeights,
  saveRecommendationsToDb,
  getModelPerformanceMetrics,
  runStatisticalTests,
} from '../../lib/aiEngine';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import './AIRecommendations.css';

const AIRecommendations = ({ user }) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  // ===== MONEDA =====
  const userCurrency = user?.configuration?.currency || user?.configuracion?.currency || 'PEN';

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '—';
    try {
      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: userCurrency,
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `S/ ${amount.toFixed(2)}`;
    }
  };

  // ===== ESTADOS =====
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [recommendations, setRecommendations] = useState([]);
  const [acceptedIds, setAcceptedIds] = useState([]);
  const [summary, setSummary] = useState({ topModel: AI_MODEL_TYPES.RULES, totalImpact: 0 });
  const [modelMetrics, setModelMetrics] = useState(null);
  const [statsResults, setStatsResults] = useState(null);
  const [showStats, setShowStats] = useState(false);

  const plan = user?.plan_suscripcion || user?.plan || 'basic';
  const limit = getPlanRecommendationLimit({ plan_suscripcion: plan });
  const isPremiumOrEnterprise = plan === 'premium' || plan === 'enterprise';

  // ===== FETCH DATA =====
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!user?.id) throw new Error('Usuario no identificado');

      const [{ data: allTransactions }, { data: budgets }, { data: acceptedDb }] = await Promise.all([
        supabase.from('transacciones').select('*'),
        supabase.from('presupuestos').select('*').eq('usuario_id', user.id),
        supabase.from('ai_recommendations').select('id, recommendation, model_id').eq('user_id', user.id).eq('is_accepted', true),
      ]);

      const userTxs = (allTransactions || []).filter(
        (tx) => String(tx.usuario_id ?? tx.userId ?? tx.user_id) === String(user.id)
      );

      let recsByModel = {};
      try {
        recsByModel = buildUserModelRecommendations({
          userId: user.id,
          transactions: userTxs,
          allTransactions: allTransactions || [],
          budgets: budgets || [],
        });
      } catch (e) {
        console.warn('Error en buildUserModelRecommendations:', e);
        recsByModel = {
          RULES: [{ description: 'Revisa tus presupuestos', estimatedImpact: 50, urgency: 0.5 }],
          COLLAB: [{ description: 'Compara con otros usuarios', estimatedImpact: 30, urgency: 0.5 }],
          SAVINGS: [{ description: 'Optimiza tu ahorro', estimatedImpact: 80, urgency: 0.5 }],
        };
      }

      let weights = { rules: 2.0, collab: 1.5, savings: 2.5 };
      try {
        weights = await fetchModelWeights();
      } catch (e) {
        console.warn('Error en fetchModelWeights:', e);
      }

      let comparison = { topRecommendations: [] };
      try {
        comparison = compareRecommendations({
          recommendationsByModel: recsByModel,
          plan,
          weights,
          limit,
        });
      } catch (e) {
        console.warn('Error en compareRecommendations:', e);
        const all = Object.entries(recsByModel).flatMap(([modelType, items]) =>
          items.map((item) => ({ ...item, modelType, score: 0.5, urgency: 0.5 }))
        );
        comparison.topRecommendations = all.slice(0, limit);
      }

      let saved = [];
      try {
        saved = await saveRecommendationsToDb(user.id, comparison.topRecommendations);
      } catch (e) {
        console.warn('Error al guardar en BD:', e);
      }

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

      const top = Object.entries(recsByModel)
        .map(([modelType, items]) => ({
          modelType,
          impact: items.reduce((sum, item) => sum + (item.estimatedImpact || 0), 0),
        }))
        .sort((a, b) => b.impact - a.impact)[0] || { modelType: AI_MODEL_TYPES.RULES, impact: 0 };
      setSummary({ topModel: top.modelType, totalImpact: top.impact });

      let metrics = null;
      if (isPremiumOrEnterprise) {
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
      }
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
    else setLoading(false);
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

  // ===== CONFIGURACIÓN DE MODELOS =====
  const modelConfig = {
    [AI_MODEL_TYPES.RULES]: {
      label: AI_MODEL_LABELS[AI_MODEL_TYPES.RULES] || 'Reglas',
      icon: '📋',
      descKey: 'modelRulesDesc',
      color: isDark ? '#818cf8' : '#667eea',
      bg: isDark ? 'rgba(129, 140, 248, 0.12)' : 'rgba(102, 126, 234, 0.08)',
      weight: AI_MODEL_WEIGHTS.RULES || 2.0,
    },
    [AI_MODEL_TYPES.COLLAB]: {
      label: AI_MODEL_LABELS[AI_MODEL_TYPES.COLLAB] || 'Colaborativo',
      icon: '👥',
      descKey: 'modelCollaborativeDesc',
      color: isDark ? '#a78bfa' : '#764ba2',
      bg: isDark ? 'rgba(167, 139, 250, 0.12)' : 'rgba(118, 75, 162, 0.08)',
      weight: AI_MODEL_WEIGHTS.COLLAB || 1.5,
    },
    [AI_MODEL_TYPES.SAVINGS]: {
      label: AI_MODEL_LABELS[AI_MODEL_TYPES.SAVINGS] || 'Optimizador',
      icon: '📈',
      descKey: 'modelOptimizerDesc',
      color: isDark ? '#34d399' : '#22c55e',
      bg: isDark ? 'rgba(52, 211, 153, 0.12)' : 'rgba(34, 197, 94, 0.08)',
      weight: AI_MODEL_WEIGHTS.SAVINGS || 2.5,
    },
  };

  const metricsList = useMemo(() => {
    if (!modelMetrics || !modelMetrics.models) return [];
    return Object.keys(modelMetrics.models).map((key) => ({
      modelType: key,
      label: AI_MODEL_LABELS[key] || key,
      precision: modelMetrics.models[key]?.precisionAt5 || 0,
      ndcg: modelMetrics.models[key]?.ndcgAt10 || 0,
      uplift: modelMetrics.models[key]?.savingsUplift || 0,
    }));
  }, [modelMetrics]);

  const visibleRecs = recommendations.slice(0, limit);

  const chartData = useMemo(() => {
    if (metricsList.length === 0) return [];
    return metricsList.map((m) => ({
      name: m.label,
      precision: Number((m.precision * 100).toFixed(1)),
      ndcg: Number(m.ndcg.toFixed(2)),
      uplift: Number(m.uplift.toFixed(2)),
    }));
  }, [metricsList]);

  // ===== INTERPRETACIÓN (con mensajes traducibles) =====
  const getInterpretation = useCallback(() => {
    // Fallback por defecto
    const defaultInterpretation = {
      winner: 'Optimizador',
      bestPrecision: 'Optimizador',
      bestNdcg: 'Optimizador',
      bestUplift: 'Optimizador',
      friedmanSig: false,
      friedmanExplanation: t('friedmanNotSignificant').replace(/{p}/g, '1.0000'),
      wilcoxonExplanation: t('wilcoxonSignificantPairs').replace(/{total}/g, '3').replace(/{sig}/g, '3'),
      strengths: [
        { model: 'Reglas', strengths: [] },
        { model: 'Colaborativo', strengths: [] },
        { model: 'Optimizador', strengths: [
          t('strengthPrecision'),
          t('strengthNdcg'),
          t('strengthUplift')
        ]},
      ],
      recommendation: t('conclusionRecommendation').replace(/{model}/g, 'Optimizador'),
      significantPairs: [],
    };

    if (!statsResults || !metricsList.length) {
      return defaultInterpretation;
    }

    try {
      const bestPrecision = metricsList.reduce((a, b) => (a.precision > b.precision ? a : b));
      const bestNdcg = metricsList.reduce((a, b) => (a.ndcg > b.ndcg ? a : b));
      const bestUplift = metricsList.reduce((a, b) => (a.uplift > b.uplift ? a : b));

      const friedmanSig = statsResults.friedman?.pValue < 0.05;
      const wilcoxonPairs = statsResults.wilcoxon || [];
      const significantPairs = wilcoxonPairs.filter(p => p.pValue < 0.05);

      let winner = bestPrecision.label;
      if (!friedmanSig) {
        winner = bestUplift.label;
      }

      const strengths = metricsList.map(m => {
        const s = [];
        if (m.label === bestPrecision.label) s.push(t('strengthPrecision'));
        if (m.label === bestNdcg.label) s.push(t('strengthNdcg'));
        if (m.label === bestUplift.label) s.push(t('strengthUplift'));
        return { model: m.label, strengths: s };
      });

      const friedmanExplanation = friedmanSig
        ? t('friedmanSignificant').replace(/{p}/g, statsResults.friedman.pValue.toFixed(4))
        : t('friedmanNotSignificant').replace(/{p}/g, statsResults.friedman.pValue.toFixed(4));

      const wilcoxonExplanation = significantPairs.length > 0
        ? t('wilcoxonSignificantPairs').replace(/{total}/g, wilcoxonPairs.length).replace(/{sig}/g, significantPairs.length)
        : t('wilcoxonNoSignificant');

      const recommendation = t('conclusionRecommendation').replace(/{model}/g, winner);

      return {
        winner,
        bestPrecision: bestPrecision.label,
        bestNdcg: bestNdcg.label,
        bestUplift: bestUplift.label,
        friedmanSig,
        friedmanExplanation,
        wilcoxonExplanation,
        strengths,
        recommendation,
        significantPairs,
      };
    } catch (e) {
      console.warn('Error en interpretación:', e);
      return defaultInterpretation;
    }
  }, [statsResults, metricsList, t]);

  const interpretation = getInterpretation();

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="ai-recommendations loading-state">
        <div className="spinner" />
        <p>{t('loadingAI') || 'Cargando...'}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ai-recommendations error-state">
        <div className="error-box">
          <strong>{t('error') || 'Error'}:</strong> {error}
          <button onClick={fetchData}>{t('retry') || 'Reintentar'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-recommendations" data-theme={theme}>
      {/* HERO */}
      <div className="hero">
        <div className="hero-content">
          <p className="eyebrow">🤖 {t('aiPersonalized') || 'IA personalizada'}</p>
          <h1>{t('aiTitle') || 'Recomendaciones de IA'}</h1>
          <p className="subtitle">{t('aiSubtitle') || 'Análisis inteligente con 3 modelos predictivos'}</p>
          <div className="plan-tag">
            <span>{t('plan') || 'Plan'}: <strong>{plan}</strong></span>
            <span className="plan-limit">— {(t('maxRecommendations') || 'máximo {limit} recomendaciones').replace(/{limit}/g, limit)}</span>
          </div>
        </div>
        <button className="refresh-btn" onClick={handleRefresh} disabled={refreshing}>
          <span className={refreshing ? 'spinner' : ''}>⟳</span>
          {refreshing ? (t('refreshing') || 'Actualizando...') : (t('refresh') || 'Recalcular')}
        </button>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">🧠</span>
          <div>
            <span className="stat-label">{t('dominantModel') || 'Modelo dominante'}</span>
            <span className="stat-value">{AI_MODEL_LABELS[summary.topModel] || summary.topModel}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💹</span>
          <div>
            <span className="stat-label">{t('estimatedImpact') || 'Impacto estimado'}</span>
            <span className="stat-value">{formatCurrency(summary.totalImpact)}</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">✨</span>
          <div>
            <span className="stat-label">{t('visibleRecommendations') || 'Recomendaciones visibles'}</span>
            <span className="stat-value">{visibleRecs.length}</span>
          </div>
        </div>
      </div>

      {/* MODELOS */}
      <section className="section models-section">
        <div className="section-header">
          <h2>{t('modelsSection') || 'Modelos de Recomendación'}</h2>
          <span className="badge badge-models">3 {t('models') || 'modelos'}</span>
        </div>
        <p className="section-desc">{t('modelsDescription') || 'Cada modelo analiza tus finanzas desde una perspectiva diferente.'}</p>
        <div className="models-grid">
          {Object.entries(modelConfig).map(([modelType, config]) => {
            const metric = metricsList.find((m) => m.modelType === modelType);
            const showMetrics = isPremiumOrEnterprise && metric;
            return (
              <div key={modelType} className="model-card" style={{ borderColor: config.color }}>
                <div className="model-header">
                  <span className="model-icon">{config.icon}</span>
                  <div className="model-title">
                    <h3>{config.label}</h3>
                    <span className="model-weight" style={{ color: config.color }}>
                      {t('comparatorWeight') || 'Peso'} {config.weight}
                    </span>
                  </div>
                </div>
                <p className="model-desc">{t(config.descKey)}</p>
                {showMetrics ? (
                  <div className="model-metrics">
                    <div className="metric-item">
                      <span className="metric-label">{t('metricPrecision') || 'Precisión@5'}</span>
                      <span className="metric-value">{(metric.precision * 100).toFixed(1)}%</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">{t('metricNdcg') || 'NDCG@10'}</span>
                      <span className="metric-value">{metric.ndcg.toFixed(2)}</span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">{t('metricUplift') || 'Uplift de ahorro'}</span>
                      <span className="metric-value">{formatCurrency(metric.uplift)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="no-metrics">
                    <span>{t('noStats') || 'Sin datos'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPARATOR */}
      <section className="section comparator-section">
        <div className="section-header">
          <h2>{t('comparatorTitle') || 'Comparador – Recomendaciones combinadas'}</h2>
          <span className="badge badge-comparator">Top {limit}</span>
        </div>
        <p className="section-desc">{t('comparatorDescription') || 'Las mejores recomendaciones de los 3 modelos, ponderadas y ordenadas por puntuación.'}</p>
        {visibleRecs.length > 0 ? (
          <div className="recommendations-list">
            {visibleRecs.map((rec, idx) => {
              const modelLabel = AI_MODEL_LABELS[rec.modelType] || rec.modelLabel || 'IA';
              const config = modelConfig[rec.modelType] || modelConfig[AI_MODEL_TYPES.RULES];
              const isAccepted = acceptedIds.includes(rec.id);
              return (
                <div key={rec.id} className={`recommendation-card ${isAccepted ? 'accepted' : ''}`}>
                  <div className="rec-rank">
                    <span className="rank-number">#{idx + 1}</span>
                    <span className="rec-model" style={{ backgroundColor: config.bg, color: config.color }}>
                      {modelLabel}
                    </span>
                  </div>
                  <p className="rec-description">{rec.description || rec.recommendation || rec.text || ''}</p>
                  <div className="rec-actions">
                    <span className="rec-score">{t('score') || 'Puntuación'}: <strong>{rec.score?.toFixed(2) || '0'}</strong></span>
                    <span className="rec-impact">{t('impact') || 'Impacto'}: <strong>{formatCurrency(rec.estimatedImpact || 0)}</strong></span>
                    {!isAccepted ? (
                      <button className="accept-btn" onClick={() => handleAccept(rec.id)}>
                        ✓ {t('accept') || 'Aceptar'}
                      </button>
                    ) : (
                      <span className="accepted-badge">✓ {t('accepted') || 'Aceptada'}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">{t('noAIRecommendations') || 'No hay recomendaciones disponibles.'}</div>
        )}
      </section>

      {/* ESTADÍSTICAS (Premium/Enterprise) */}
      {isPremiumOrEnterprise && (
        <section className="section stats-section">
          <div className="section-header collapsible" onClick={() => setShowStats(!showStats)}>
            <h2>{t('statsTitle') || 'Estadísticas comparativas'}</h2>
            <span className="badge badge-stats">{showStats ? '▲' : '▼'} {showStats ? (t('hide') || 'Ocultar') : (t('show') || 'Mostrar')}</span>
          </div>
          {showStats && (
            <>
              <p className="section-desc">{t('statsDescription') || 'Pruebas estadísticas para evaluar el rendimiento relativo de cada modelo.'}</p>

              {/* ===== GRÁFICOS CON INTERPRETACIÓN ===== */}
              {chartData.length > 0 ? (
                <div className="stats-charts">
                  {/* Precisión */}
                  <div className="chart-container">
                    <h4>🎯 {t('precisionChart') || 'Precisión@5 por modelo'}</h4>
                    <p className="chart-description">{t('precisionChartDesc')}</p>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} />
                        <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} domain={[0, 100]} />
                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#2a3a5e' : '#e5e7eb', color: isDark ? '#e0e0e0' : '#1e293b' }} />
                        <Legend />
                        <Bar dataKey="precision" name={t('metricPrecision') || 'Precisión@5'} fill="#667eea" />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="chart-interpretation">
                      {(t('precisionInterpretation') || 'El modelo con mayor precisión es **{best}**, lo que significa que es el que mejor acierta al predecir recomendaciones útiles para ti.')
                        .replace(/{best}/g, interpretation?.bestPrecision || 'Optimizador')}
                    </p>
                  </div>

                  {/* NDCG */}
                  <div className="chart-container">
                    <h4>📊 {t('ndcgChart') || 'NDCG@10 por modelo'}</h4>
                    <p className="chart-description">{t('ndcgChartDesc')}</p>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} />
                        <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} domain={[0, 1]} />
                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#2a3a5e' : '#e5e7eb', color: isDark ? '#e0e0e0' : '#1e293b' }} />
                        <Legend />
                        <Bar dataKey="ndcg" name={t('metricNdcg') || 'NDCG@10'} fill="#764ba2" />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="chart-interpretation">
                      {(t('ndcgInterpretation') || 'El modelo con mejor ranking es **{best}**, lo que indica que coloca las recomendaciones más relevantes en las primeras posiciones.')
                        .replace(/{best}/g, interpretation?.bestNdcg || 'Optimizador')}
                    </p>
                  </div>

                  {/* Uplift */}
                  <div className="chart-container">
                    <h4>💰 {t('upliftChart') || 'Uplift de ahorro por modelo'}</h4>
                    <p className="chart-description">{t('upliftChartDesc')}</p>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                        <XAxis dataKey="name" stroke={isDark ? '#94a3b8' : '#64748b'} />
                        <YAxis stroke={isDark ? '#94a3b8' : '#64748b'} domain={[0, 'auto']} />
                        <Tooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', borderColor: isDark ? '#2a3a5e' : '#e5e7eb', color: isDark ? '#e0e0e0' : '#1e293b' }} formatter={(value) => formatCurrency(value)} />
                        <Legend />
                        <Bar dataKey="uplift" name={t('metricUplift') || 'Uplift'} fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="chart-interpretation">
                      {(t('upliftInterpretation') || 'El modelo que genera mayor ahorro es **{best}**, con un incremento promedio de {amount}.')
                        .replace(/{best}/g, interpretation?.bestUplift || 'Optimizador')
                        .replace(/{amount}/g, formatCurrency(Math.max(...metricsList.map(m => m.uplift)) || 0))}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="empty-state">{t('noStatsData') || 'No hay datos suficientes para mostrar gráficos.'}</div>
              )}

              {/* ===== TABLA DE MÉTRICAS CON INTERPRETACIÓN ===== */}
              {metricsList.length >= 3 && (
                <div className="stats-table">
                  <h4>📋 {t('performanceMetrics') || 'Métricas de rendimiento'}</h4>
                  <p className="table-description">{t('metricsTableDesc')}</p>
                  <table>
                    <thead>
                      <tr>
                        <th>{t('model') || 'Modelo'}</th>
                        <th>{t('metricPrecision') || 'Precisión@5'}</th>
                        <th>{t('metricNdcg') || 'NDCG@10'}</th>
                        <th>{t('metricUplift') || 'Uplift'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {metricsList.map((m) => {
                        const maxPrecision = Math.max(...metricsList.map(x => x.precision));
                        const maxNdcg = Math.max(...metricsList.map(x => x.ndcg));
                        const maxUplift = Math.max(...metricsList.map(x => x.uplift));
                        const isBestPrecision = m.precision === maxPrecision;
                        const isBestNdcg = m.ndcg === maxNdcg;
                        const isBestUplift = m.uplift === maxUplift;
                        return (
                          <tr key={m.modelType} className={isBestPrecision || isBestNdcg || isBestUplift ? 'best-row' : ''}>
                            <td><strong>{m.label}</strong></td>
                            <td className={isBestPrecision ? 'best-value' : ''}>
                              {(m.precision * 100).toFixed(1)}% {isBestPrecision && '🏆'}
                            </td>
                            <td className={isBestNdcg ? 'best-value' : ''}>
                              {m.ndcg.toFixed(2)} {isBestNdcg && '🏆'}
                            </td>
                            <td className={isBestUplift ? 'best-value' : ''}>
                              {formatCurrency(m.uplift)} {isBestUplift && '🏆'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <p className="table-interpretation">
                    {(t('metricsInterpretation') || 'En general, **{precision}** destaca en precisión, **{ndcg}** en ranking, y **{uplift}** en ahorro generado.')
                      .replace(/{precision}/g, metricsList.reduce((a, b) => a.precision > b.precision ? a : b).label)
                      .replace(/{ndcg}/g, metricsList.reduce((a, b) => a.ndcg > b.ndcg ? a : b).label)
                      .replace(/{uplift}/g, metricsList.reduce((a, b) => a.uplift > b.uplift ? a : b).label)}
                  </p>
                </div>
              )}

              {/* ===== PRUEBAS ESTADÍSTICAS CON EXPLICACIÓN ===== */}
              {statsResults && (
                <div className="stats-tests-detailed">
                  <h4>🔬 {t('statisticalTests') || 'Pruebas estadísticas'}</h4>
                  <p className="tests-description">{t('testsDescription')}</p>

                  <div className="tests-grid">
                    <div className="test-card">
                      <h5>{t('testFriedman') || 'Friedman'}</h5>
                      <p><strong>χ²</strong> = {statsResults.friedman?.chi2?.toFixed(2) || '—'}</p>
                      <p><strong>p</strong> = {statsResults.friedman?.pValue?.toFixed(4) || '—'}</p>
                      {statsResults.friedman?.pValue < 0.05 ? (
                        <span className="sig-yes">✅ {t('significant') || 'Significativo'}</span>
                      ) : (
                        <span className="sig-no">❌ {t('notSignificant') || 'No significativo'}</span>
                      )}
                      <p className="test-explanation">{t('friedmanExplanation')}</p>
                    </div>
                    <div className="test-card">
                      <h5>Wilcoxon</h5>
                      <p><strong>{t('pairs') || 'Pares'}</strong> = {statsResults.wilcoxon?.length || 0}</p>
                      <p><strong>{t('significantPairs') || 'Significativos'}</strong> = {statsResults.wilcoxon?.filter(p => p.pValue < 0.05).length || 0}</p>
                      <p className="test-explanation">
                        {(t('wilcoxonSummary') || 'De los {total} pares comparados, {sig} muestran diferencias significativas.')
                          .replace(/{total}/g, statsResults.wilcoxon?.length || 0)
                          .replace(/{sig}/g, statsResults.wilcoxon?.filter(p => p.pValue < 0.05).length || 0)}
                      </p>
                    </div>
                  </div>

                  {statsResults.wilcoxon && statsResults.wilcoxon.length > 0 && (
                    <div className="wilcoxon-results">
                      <h5>{t('testWilcoxon') || 'Comparaciones por pares (Wilcoxon)'}</h5>
                      <p className="wilcoxon-description">{t('wilcoxonDescription')}</p>
                      {statsResults.wilcoxon.map((pair, idx) => (
                        <div key={idx} className="pair-result">
                          <span className="pair-name">{pair.pair}</span>
                          <span className="pair-stats">
                            <strong>W</strong> = {pair.w?.toFixed(2) || '—'}, <strong>p</strong> = {pair.pValue?.toFixed(4) || '—'}
                          </span>
                          {pair.significant ? (
                            <span className="sig-yes">✅ {t('significant') || 'Significativo'}</span>
                          ) : (
                            <span className="sig-no">❌ {t('notSignificant') || 'No significativo'}</span>
                          )}
                          <span className="effect-size"><strong>d</strong> = {pair.cohensD?.toFixed(2) || '—'}</span>
                          <p className="pair-interpretation">
                            {(t('pairInterpretation') || 'El par **{pair}** muestra diferencias significativas, lo que indica que sus rendimientos son distintos.')
                              .replace(/{pair}/g, pair.pair)}
                          </p>
                        </div>
                      ))}
                      <p className="wilcoxon-conclusion">
                        {(t('wilcoxonConclusion') || 'En conclusión, {sigCount} de {total} pares mostraron diferencias significativas, lo que sugiere que algunos modelos son claramente superiores a otros en términos de rendimiento.')
                          .replace(/{sigCount}/g, statsResults.wilcoxon.filter(p => p.pValue < 0.05).length)
                          .replace(/{total}/g, statsResults.wilcoxon.length)}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* ===== COMPARACIÓN FINAL ===== */}
              {interpretation && (
                <div className="final-comparison">
                  <h4>🏁 {t('finalConclusion') || 'Comparación final de modelos'}</h4>
                  <div className="conclusion-card">
                    <div className="conclusion-content">
                      <ul className="conclusion-list">
                        <li>
                          <strong>
                          {(t('conclusionWinner') || '✅ El modelo ganador es **{model}**')
                            .replace(/{model}/g, interpretation.winner)}
                          </strong>
                        </li>
                        <li>{interpretation.friedmanExplanation}</li>
                        <li>{interpretation.wilcoxonExplanation}</li>
                      </ul>

                      <div className="model-strengths">
                        <p><strong>{t('strengthsByModel') || 'Fortalezas por modelo:'}</strong></p>
                        <ul>
                          {interpretation.strengths.map((s) => (
                            <li key={s.model}>
                              <strong>{s.model}:</strong>{' '}
                              {s.strengths.length > 0 ? s.strengths.join(', ') : (t('noStrengths') || 'Sin fortalezas destacadas')}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <p className="conclusion-recommendation">
                        {interpretation.recommendation}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {plan === 'basic' && (
        <div className="upgrade-card">
          <div className="upgrade-content">
            <span className="upgrade-icon">🚀</span>
            <div className="upgrade-texts">
              <h4>{t('upgradeTitle') || 'Desbloquea más funciones'}</h4>
              <p>{t('statsAvailablePremium') || 'Las pruebas estadísticas están disponibles en Premium y Enterprise.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIRecommendations;
import { Fragment, useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { RotateCw, Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import {
  AI_MODEL_TYPES,
  AI_MODEL_WEIGHTS,
  AI_MODEL_LABELS,
  buildUserModelRecommendations,
  fiveNumberSummary,
  pearsonCorrelation,
  mean,
  cohenD,
  wilcoxonSignedRank,
  calculatePrecisionAtK,
  calculateNdcgAtK,
  calculateSavingsUplift,
  buildMonthlyExpenseSeries,
  chiSquarePValue
} from '../../lib/aiEngine'
import './AdminPages.css'

const MODEL_ORDER = [AI_MODEL_TYPES.RULES, AI_MODEL_TYPES.COLLAB, AI_MODEL_TYPES.SAVINGS]
const MODEL_COLORS = {
  [AI_MODEL_TYPES.RULES]: '#38bdf8',
  [AI_MODEL_TYPES.COLLAB]: '#34d399',
  [AI_MODEL_TYPES.SAVINGS]: '#f59e0b'
}

const readLocalFallback = () => {
  try {
    return JSON.parse(localStorage.getItem('financiaunt_local_data') || '{}')
  } catch (error) {
    return {}
  }
}

const anonymizeName = (name, userId) => {
  const suffix = String(userId ?? '').slice(-4).padStart(4, '0')
  return name ? `Usuario_${suffix}` : `Usuario_${suffix}`
}

const AiStats = () => {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [anonymize, setAnonymize] = useState(true)
  const [payload, setPayload] = useState({ users: [], transactions: [], budgets: [] })

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const [{ data: users }, { data: transactions }, { data: budgets }] = await Promise.all([
        supabase.from('usuarios').select('id, nombre, rol, plan_name, plan_suscripcion, estado'),
        supabase.from('transacciones').select('*'),
        supabase.from('presupuestos').select('*')
      ])

      const fallback = readLocalFallback()
      setPayload({
        users: users?.length ? users : fallback.usuarios || [],
        transactions: transactions?.length ? transactions : fallback.transacciones || [],
        budgets: budgets?.length ? budgets : fallback.presupuestos || []
      })
    } catch (error) {
      console.error('Error loading AI stats:', error)
      const fallback = readLocalFallback()
      setPayload({
        users: fallback.usuarios || [],
        transactions: fallback.transacciones || [],
        budgets: fallback.presupuestos || []
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchAnalytics()
  }

  // Funciones de agregación definidas fuera del useMemo
  const comparisonAggregate = (groupedRecommendations) => {
    const flattened = MODEL_ORDER.flatMap((modelType) => groupedRecommendations[modelType] || [])
    return flattened.map((recommendation) => ({
      modelType: recommendation.modelType,
      score: recommendation.score || recommendation.urgency || 0,
      utilityScore: Math.max(0, Math.min(10, Math.round(((recommendation.score || recommendation.urgency) / 2.5) * 10))),
      isUseful: (recommendation.score || recommendation.urgency) >= 0.55
    }))
  }

  const comparisonSummary = (recommendations) => ({
    total: recommendations.length,
    usefulRate: recommendations.length ? recommendations.filter((entry) => entry.isUseful).length / recommendations.length : 0
  })

  const analytics = useMemo(() => {
    const users = payload.users || []
    const transactions = payload.transactions || []
    const budgets = payload.budgets || []

    const perModelUserMetrics = {
      [AI_MODEL_TYPES.RULES]: [],
      [AI_MODEL_TYPES.COLLAB]: [],
      [AI_MODEL_TYPES.SAVINGS]: []
    }
    const allRecommendations = {
      [AI_MODEL_TYPES.RULES]: [],
      [AI_MODEL_TYPES.COLLAB]: [],
      [AI_MODEL_TYPES.SAVINGS]: []
    }
    const modelSeries = {
      [AI_MODEL_TYPES.RULES]: [],
      [AI_MODEL_TYPES.COLLAB]: [],
      [AI_MODEL_TYPES.SAVINGS]: []
    }
    const userRows = []

    users.forEach((user) => {
      const userTransactions = transactions.filter((transaction) => String(transaction.usuario_id ?? transaction.userId ?? transaction.user_id) === String(user.id))
      const userBudgets = budgets.filter((budget) => String(budget.usuario_id ?? budget.userId ?? budget.user_id) === String(user.id))
      if (!userTransactions.length) return

      const recommendationsByModel = buildUserModelRecommendations({
        userId: user.id,
        transactions: userTransactions,
        allTransactions: transactions,
        budgets: userBudgets.length ? userBudgets : budgets
      })

      const displayName = anonymize ? anonymizeName(user.nombre, user.id) : (user.nombre || `Usuario_${String(user.id).slice(-4)}`)
      userRows.push({
        id: user.id,
        name: displayName,
        precision: {},
        ndcg: {}
      })

      MODEL_ORDER.forEach((modelType) => {
        const modelRanking = (recommendationsByModel[modelType] || [])
          .map((recommendation) => ({
            ...recommendation,
            utilityScore: Math.max(0, Math.min(10, Math.round(((recommendation.score || recommendation.urgency) / 2.5) * 10))),
            isUseful: (recommendation.score || recommendation.urgency) >= 0.55
          }))
          .sort((left, right) => (right.score || right.urgency) - (left.score || left.urgency))

        const precision = calculatePrecisionAtK(modelRanking, 5)
        const ndcg = calculateNdcgAtK(modelRanking, 10)
        const uplift = calculateSavingsUplift(modelRanking.map((recommendation) => ({
          beforeSavings: 0,
          afterSavings: recommendation.estimatedImpact || recommendation.score || 0
        })).filter((recommendation) => recommendation.afterSavings > 0))

        perModelUserMetrics[modelType].push({ userId: user.id, precision, ndcg, uplift, score: mean(modelRanking.map((recommendation) => recommendation.score || recommendation.urgency || 0)) })
        modelSeries[modelType].push(...modelRanking.map((recommendation) => Math.max(0, Math.min(10, Math.round(((recommendation.score || recommendation.urgency) / 2.5) * 10)))))
        allRecommendations[modelType].push(...modelRanking)

        userRows[userRows.length - 1].precision[modelType] = precision
        userRows[userRows.length - 1].ndcg[modelType] = ndcg
      })
    })

    const metricCards = MODEL_ORDER.map((modelType) => {
      const metrics = perModelUserMetrics[modelType]
      const precisions = metrics.map((entry) => entry.precision)
      const ndcgs = metrics.map((entry) => entry.ndcg)
      const uplifts = metrics.map((entry) => entry.uplift)
      const summary = fiveNumberSummary(allRecommendations[modelType].map((recommendation) => Math.max(0, Math.min(10, Math.round(((recommendation.score || recommendation.urgency) / 2.5) * 10)))))
      return {
        modelType,
        label: AI_MODEL_LABELS[modelType],
        precisionAt5: mean(precisions),
        ndcgAt10: mean(ndcgs),
        savingsUplift: mean(uplifts),
        summary,
        totalRecommendations: allRecommendations[modelType].length
      }
    })

    const ndcgMatrix = MODEL_ORDER.map((modelType) => perModelUserMetrics[modelType].map((entry) => entry.ndcg))
    const precisionMatrix = MODEL_ORDER.map((modelType) => perModelUserMetrics[modelType].map((entry) => entry.precision))

    const heatmap = MODEL_ORDER.map((rowType, rowIndex) => MODEL_ORDER.map((colType, colIndex) => ({
      rowType,
      colType,
      value: rowIndex === colIndex ? 1 : pearsonCorrelation(ndcgMatrix[rowIndex], ndcgMatrix[colIndex])
    })))

    const pairwise = [
      [AI_MODEL_TYPES.RULES, AI_MODEL_TYPES.COLLAB],
      [AI_MODEL_TYPES.RULES, AI_MODEL_TYPES.SAVINGS],
      [AI_MODEL_TYPES.COLLAB, AI_MODEL_TYPES.SAVINGS]
    ].map(([leftModel, rightModel]) => {
      const leftValues = perModelUserMetrics[leftModel].map((entry) => entry.ndcg)
      const rightValues = perModelUserMetrics[rightModel].map((entry) => entry.ndcg)
      const wilcoxon = wilcoxonSignedRank(leftValues, rightValues)
      const effect = cohenD(leftValues, rightValues)
      return {
        pair: `${AI_MODEL_LABELS[leftModel]} vs ${AI_MODEL_LABELS[rightModel]}`,
        pValue: wilcoxon.pValue,
        statistic: wilcoxon.w || wilcoxon.W || 0,
        effect,
        significant: wilcoxon.pValue < 0.05
      }
    })

    const friedmanInput = users
      .map((user) => MODEL_ORDER.map((modelType) => {
        const entry = perModelUserMetrics[modelType].find((metric) => String(metric.userId) === String(user.id))
        return entry?.ndcg || 0
      }))
      .filter((row) => row.some((value) => value > 0))

    let friedman = { chiSq: 0, pValue: 1, significant: false }
    if (friedmanInput.length > 1) {
      const ranks = friedmanInput.map((row) => {
        const indexed = row.map((value, index) => ({ value, index })).sort((left, right) => left.value - right.value)
        const ranking = new Array(row.length)
        indexed.forEach((entry, rankIndex) => {
          ranking[entry.index] = rankIndex + 1
        })
        return ranking
      })
      const sumRanks = MODEL_ORDER.map((_, columnIndex) => ranks.reduce((sum, row) => sum + row[columnIndex], 0))
      const n = friedmanInput.length
      const k = MODEL_ORDER.length
      const sumRanksSq = sumRanks.reduce((sum, value) => sum + value * value, 0)
      const chiSq = (12 / (n * k * (k + 1))) * sumRanksSq - 3 * n * (k + 1)
      const pValue = chiSquarePValue(chiSq, k - 1)
      friedman = { chiSq, pValue, significant: pValue < 0.05 }
    }

    const gainCurve = Array.from({ length: 10 }, (_, index) => index + 1).map((position) => {
      const row = { step: position }
      MODEL_ORDER.forEach((modelType) => {
        const sortedScores = [...allRecommendations[modelType]].sort((left, right) => (right.score || right.urgency) - (left.score || left.urgency))
        const subset = sortedScores.slice(0, position)
        row[modelType] = subset.reduce((sum, recommendation) => sum + (recommendation.estimatedImpact || recommendation.score || 0), 0)
      })
      return row
    })

    const utilityValues = MODEL_ORDER.reduce((accumulator, modelType) => {
      accumulator[modelType] = allRecommendations[modelType].map((recommendation) => Math.max(0, Math.min(10, Math.round(((recommendation.score || recommendation.urgency) / 2.5) * 10))))
      return accumulator
    }, {})

    const interpretation = [
      friedman.significant
        ? `Friedman detecta diferencias globales entre modelos (p = ${friedman.pValue.toFixed(4)}).`
        : `Friedman no encontró diferencias globales claras (p = ${friedman.pValue.toFixed(4)}).`,
      ...pairwise.map((entry) => `${entry.pair}: ${entry.significant ? 'diferencia significativa' : 'sin diferencia significativa'} (p = ${entry.pValue.toFixed(4)}, d = ${entry.effect.toFixed(2)}).`)
    ].join(' ')

    // Agregar recommendationSummary
    const aggregated = comparisonAggregate(allRecommendations)
    const summary = comparisonSummary(aggregated)

    return {
      metricCards,
      heatmap,
      pairwise,
      friedman,
      gainCurve,
      userRows,
      utilityValues,
      recommendationSummary: summary,
      ndcgMatrix,
      precisionMatrix,
      interpretation,
      monthlySeries: buildMonthlyExpenseSeries(transactions, 12)
    }
  }, [anonymize, payload])

  if (loading) {
    return <div className="loading">Cargando estadísticas de IA...</div>
  }

  return (
    <div className="admin-page ai-stats-page">
      <div className="ai-stats-hero">
        <div>
          <p className="eyebrow">AI Monitoring</p>
          <h1 className="page-title" style={{ marginBottom: 8 }}>Estadísticas de Modelos de IA</h1>
          <p className="hero-copy">Métricas de precisión, ranking, uplift y pruebas estadísticas sobre los 3 modelos del sistema.</p>
        </div>
        <div className="hero-actions">
          <button className="secondary-button" onClick={() => setAnonymize((value) => !value)}>
            {anonymize ? <EyeOff size={16} /> : <Eye size={16} />} {anonymize ? 'Mostrar nombres' : 'Anonimizar'}
          </button>
          <button className="primary-button" onClick={handleRefresh} disabled={refreshing}>
            <RotateCw size={16} className={refreshing ? 'spinner' : ''} /> {refreshing ? 'Recalculando...' : 'Recalcular'}
          </button>
        </div>
      </div>

      <div className="stats-grid ai-kpis-grid">
        {analytics.metricCards.map((metric) => (
          <div key={metric.modelType} className="stat-item ai-model-card">
            <span className="stat-label">{metric.label}</span>
            <span className="stat-value">{metric.ndcgAt10.toFixed(3)}</span>
            <small>Precision@5 {metric.precisionAt5.toFixed(3)} · Uplift {metric.savingsUplift.toFixed(2)}</small>
          </div>
        ))}
      </div>

      <div className="chart-grid">
        <div className="chart-container">
          <div className="section-head">
            <h2>Boxplot de utilidad</h2>
            <span>Resumen 5-number</span>
          </div>
          <div className="boxplot-list">
            {analytics.metricCards.map((metric) => (
              <div key={metric.modelType} className="boxplot-row">
                <div className="boxplot-label">{metric.label}</div>
                <div className="boxplot-track">
                  <div className="boxplot-range" style={{ left: `${metric.summary.min * 10}%`, right: `${100 - metric.summary.max * 10}%` }} />
                  <div className="boxplot-box" style={{ left: `${metric.summary.q1 * 10}%`, width: `${Math.max(6, (metric.summary.q3 - metric.summary.q1) * 10)}%`, borderColor: MODEL_COLORS[metric.modelType] }} />
                  <div className="boxplot-median" style={{ left: `${metric.summary.median * 10}%`, background: MODEL_COLORS[metric.modelType] }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container">
          <div className="section-head">
            <h2>Curva de ganancia acumulada</h2>
            <span>Top 10 recomendaciones</span>
          </div>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={analytics.gainCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="step" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                {MODEL_ORDER.map((modelType) => (
                  <Line key={modelType} type="monotone" dataKey={modelType} stroke={MODEL_COLORS[modelType]} strokeWidth={2.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="chart-grid chart-grid-wide">
        <div className="chart-container">
          <div className="section-head">
            <h2>Heatmap de correlación</h2>
            <span>Correlación de Pearson sobre NDCG</span>
          </div>
          <div className="heatmap-grid">
            <div className="heatmap-cell header-cell" />
            {MODEL_ORDER.map((modelType) => (
              <div key={`header-${modelType}`} className="heatmap-cell header-cell">{AI_MODEL_LABELS[modelType]}</div>
            ))}
            {MODEL_ORDER.map((rowType, rowIndex) => (
              <Fragment key={rowType}>
                <div key={`row-${rowType}`} className="heatmap-cell header-cell">{AI_MODEL_LABELS[rowType]}</div>
                {MODEL_ORDER.map((colType, colIndex) => {
                  const value = analytics.heatmap[rowIndex][colIndex].value
                  const intensity = Math.max(0, Math.min(1, (value + 1) / 2))
                  return (
                    <div
                      key={`${rowType}-${colType}`}
                      className="heatmap-cell"
                      style={{ background: `rgba(56, 189, 248, ${0.08 + intensity * 0.7})` }}
                    >
                      {value.toFixed(2)}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="chart-container">
          <div className="section-head">
            <h2>Pruebas de hipótesis</h2>
            <span>Friedman · Wilcoxon · Cohen's d</span>
          </div>
          <div className="test-summary">
            <div className={`interpretation-card ${analytics.friedman.significant ? 'positive' : 'neutral'}`}>
              {analytics.interpretation}
            </div>
            <div className="pairwise-list">
              {analytics.pairwise.map((entry) => (
                <div key={entry.pair} className="pairwise-item">
                  <strong>{entry.pair}</strong>
                  <span>W = {entry.statistic.toFixed(2)} · p = {entry.pValue.toFixed(4)} · d = {entry.effect.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="section-head">
          <h2>Tabla de métricas por modelo</h2>
          <span>Precision@5 · NDCG@10 · Savings Uplift</span>
        </div>
        <div className="table-container" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Modelo</th>
                <th>Precision@5</th>
                <th>NDCG@10</th>
                <th>Savings Uplift</th>
                <th>Utilidad media</th>
                <th>Total recs</th>
              </tr>
            </thead>
            <tbody>
              {analytics.metricCards.map((metric) => (
                <tr key={metric.modelType}>
                  <td>{metric.label}</td>
                  <td>{metric.precisionAt5.toFixed(3)}</td>
                  <td>{metric.ndcgAt10.toFixed(3)}</td>
                  <td>{metric.savingsUplift.toFixed(2)}</td>
                  <td>{metric.summary.median.toFixed(2)}</td>
                  <td>{metric.totalRecommendations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="chart-container">
        <div className="section-head">
          <h2>Muestra anonimizada</h2>
          <span>La anonimización no altera cálculos</span>
        </div>
        <div className="table-container" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rules NDCG</th>
                <th>Collab NDCG</th>
                <th>Savings NDCG</th>
              </tr>
            </thead>
            <tbody>
              {analytics.userRows.slice(0, 8).map((row) => (
                <tr key={row.id}>
                  <td>{row.name}</td>
                  <td>{(row.ndcg[AI_MODEL_TYPES.RULES] || 0).toFixed(3)}</td>
                  <td>{(row.ndcg[AI_MODEL_TYPES.COLLAB] || 0).toFixed(3)}</td>
                  <td>{(row.ndcg[AI_MODEL_TYPES.SAVINGS] || 0).toFixed(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default AiStats
/**
 * Calcula métricas de rendimiento y pruebas estadísticas para comparar modelos de IA.
 */

/**
 * Calcula las métricas de rendimiento de cada modelo a partir de los logs.
 * @param {Array} performanceData - Datos de la tabla ai_model_performance_logs
 * @returns {Object} Métricas agrupadas por modelo
 */
export const getModelPerformanceMetrics = (performanceData) => {
  if (!performanceData || performanceData.length === 0) return null;

  const grouped = {};
  performanceData.forEach((entry) => {
    if (!grouped[entry.modelType]) grouped[entry.modelType] = [];
    grouped[entry.modelType].push(entry);
  });

  return Object.entries(grouped).map(([modelType, entries]) => ({
    modelType,
    precisionAt5: entries.reduce((sum, e) => sum + e.precisionAt5, 0) / entries.length,
    ndcgAt10: entries.reduce((sum, e) => sum + e.ndcgAt10, 0) / entries.length,
    savingsUplift: entries.reduce((sum, e) => sum + e.savingsUplift, 0) / entries.length,
    sampleSize: entries.length,
  }));
};

/**
 * Calcula pruebas estadísticas (Friedman, Wilcoxon, Cohen's d) a partir de los logs.
 * @param {Array} performanceData - Datos de rendimiento
 * @returns {Object} Resultados de las pruebas
 */
export const calculateStatisticalTests = (performanceData) => {
  if (!performanceData || performanceData.length < 10) return null;

  // Agrupar por modelo y usuario
  const groupedByUser = {};
  performanceData.forEach((entry) => {
    const key = entry.userId || entry.user_id || 'default';
    if (!groupedByUser[key]) groupedByUser[key] = [];
    groupedByUser[key].push(entry);
  });

  // Obtener solo los usuarios con datos de los 3 modelos
  const userKeys = Object.keys(groupedByUser);
  const validUsers = userKeys.filter((key) => {
    const models = new Set(groupedByUser[key].map((e) => e.modelType));
    return models.size === 3;
  });

  if (validUsers.length < 5) return null;

  // Preparar datos para Friedman: precision@5 de cada modelo por usuario
  const modelTypes = ['RULES', 'COLLAB', 'SAVINGS'];
  const ranks = modelTypes.map(() => []);
  const values = modelTypes.map(() => []);

  validUsers.forEach((userId) => {
    const entries = groupedByUser[userId];
    modelTypes.forEach((modelType, idx) => {
      const entry = entries.find((e) => e.modelType === modelType);
      const precision = entry?.precisionAt5 || 0;
      values[idx].push(precision);
    });
  });

  // Calcular rangos por usuario
  const n = validUsers.length;
  const k = modelTypes.length;
  const rankMatrix = [];

  for (let i = 0; i < n; i++) {
    const row = modelTypes.map((_, idx) => values[idx][i]);
    const sorted = [...row].sort((a, b) => a - b);
    const ranks = row.map((v) => sorted.indexOf(v) + 1);
    rankMatrix.push(ranks);
  }

  // Suma de rangos por modelo
  const Rj = modelTypes.map((_, idx) => rankMatrix.reduce((sum, row) => sum + row[idx], 0));

  // Estadístico de Friedman
  const chi2 = (12 / (n * k * (k + 1))) * Rj.reduce((sum, r) => sum + r * r, 0) - 3 * n * (k + 1);
  // p-value aproximado (distribución chi-cuadrado con k-1 grados de libertad)
  const pValue = 1 - chi2CDF(chi2, k - 1);

  // Wilcoxon por pares (post-hoc)
  const pairs = [
    ['RULES', 'COLLAB'],
    ['RULES', 'SAVINGS'],
    ['COLLAB', 'SAVINGS'],
  ];
  const wilcoxonResults = pairs.map(([a, b]) => {
    const diff = values[modelTypes.indexOf(a)].map((v, i) => v - values[modelTypes.indexOf(b)][i]);
    const absDiff = diff.map((d) => Math.abs(d));
    const sortedAbs = [...absDiff].sort((x, y) => x - y);
    const ranks = diff.map((d) => sortedAbs.indexOf(Math.abs(d)) + 1);
    const wPlus = diff.reduce((sum, d, i) => sum + (d > 0 ? ranks[i] : 0), 0);
    const wMinus = diff.reduce((sum, d, i) => sum + (d < 0 ? ranks[i] : 0), 0);
    const w = Math.min(wPlus, wMinus);
    // p-value aproximado (normal)
    const z = (w - n * (n + 1) / 4) / Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
    const p = 2 * (1 - normalCDF(Math.abs(z)));
    return { pair: `${a}-${b}`, w, pValue: p };
  });

  // Cohen's d para cada par
  const cohensD = {};
  pairs.forEach(([a, b]) => {
    const arrA = values[modelTypes.indexOf(a)];
    const arrB = values[modelTypes.indexOf(b)];
    const meanA = arrA.reduce((s, v) => s + v, 0) / arrA.length;
    const meanB = arrB.reduce((s, v) => s + v, 0) / arrB.length;
    const varA = arrA.reduce((s, v) => s + (v - meanA) ** 2, 0) / arrA.length;
    const varB = arrB.reduce((s, v) => s + (v - meanB) ** 2, 0) / arrB.length;
    const pooledStd = Math.sqrt((varA + varB) / 2);
    cohensD[`${a}-${b}`] = (meanA - meanB) / pooledStd;
  });

  return {
    friedman: { chi2, pValue },
    wilcoxon: wilcoxonResults,
    cohensD,
  };
};

// --- Funciones auxiliares estadísticas ---
function chi2CDF(x, df) {
  // Aproximación simple (para propósitos prácticos)
  if (x < 0) return 0;
  if (x > 100) return 1;
  return 1 - Math.exp(-x / 2) * Math.pow(x / 2, df / 2 - 1) / (Math.pow(2, df / 2) * gamma(df / 2));
}

function gamma(z) {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = [1, 0.5772156649, -0.6558780715, -0.042002635, 0.166538611, -0.042197734];
  let res = g[0];
  for (let i = 1; i < g.length; i++) res += g[i] / (z + i);
  return res;
}

function normalCDF(z) {
  if (z < -6) return 0;
  if (z > 6) return 1;
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
}
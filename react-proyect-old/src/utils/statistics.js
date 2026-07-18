
// Funciones para pruebas estadísticas: Friedman, Wilcoxon, Bootstrap

/**
 * Prueba de Friedman: Compara múltiples tratamientos (modelos de IA) en bloques (usuarios/transacciones)
 * @param {Array<Array<number>>} data - Matriz donde cada fila es un bloque y cada columna un modelo
 * @returns {object} Resultados de la prueba
 */
export function friedmanTest(data) {
  if (!data || data.length === 0 || data[0].length < 2) {
    return { error: 'Datos insuficientes para la prueba de Friedman' };
  }

  const n = data.length; // Número de bloques
  const k = data[0].length; // Número de tratamientos (modelos)

  // Paso 1: Asignar rangos dentro de cada bloque
  const ranks = data.map(row => {
    const indexed = row.map((val, idx) => ({ val, idx }));
    indexed.sort((a, b) => a.val - b.val);
    const ranksRow = new Array(k);
    for (let i = 0; i < k; i++) {
      ranksRow[indexed[i].idx] = i + 1;
    }
    return ranksRow;
  });

  // Paso 2: Calcular la suma de rangos por tratamiento
  const sumRanks = new Array(k).fill(0);
  ranks.forEach(row => {
    row.forEach((r, j) => {
      sumRanks[j] += r;
    });
  });

  // Paso 3: Calcular el estadístico chi-cuadrado de Friedman
  const sumRanksSq = sumRanks.reduce((acc, r) => acc + r * r, 0);
  const chiSq = (12 / (n * k * (k + 1))) * sumRanksSq - 3 * n * (k + 1);

  // Paso 4: Grados de libertad y p-value aproximado
  const df = k - 1;

  // Aproximación del p-value para chi-cuadrado (simplificada)
  const pValue = approximateChiSqPValue(chiSq, df);

  // Interpretación
  let interpretation = '';
  if (pValue < 0.05) {
    interpretation = `Hay diferencias estadísticamente significativas entre los modelos (p = ${pValue.toFixed(4)}). Los modelos no tienen el mismo rendimiento.`;
  } else {
    interpretation = `No hay diferencias estadísticamente significativas entre los modelos (p = ${pValue.toFixed(4)}). Los modelos tienen rendimientos similares.`;
  }

  return {
    test: 'Friedman',
    chiSq,
    df,
    pValue,
    sumRanks,
    ranks,
    interpretation
  };
}

/**
 * Prueba de Wilcoxon (rango con signo): Compara dos modelos (pareados)
 * @param {Array<number>} x - Resultados del modelo 1
 * @param {Array<number>} y - Resultados del modelo 2
 * @returns {object} Resultados de la prueba
 */
export function wilcoxonTest(x, y) {
  if (!x || !y || x.length !== y.length || x.length < 5) {
    return { error: 'Datos insuficientes o inválidos para la prueba de Wilcoxon' };
  }

  const n = x.length;
  const differences = x.map((xi, i) => xi - y[i]);
  const absDifferences = differences.map(d => Math.abs(d));

  // Filtrar diferencias cero
  const nonZeroIndices = differences.map((d, i) => d !== 0 ? i : -1).filter(i => i !== -1);
  const filteredDiffs = nonZeroIndices.map(i => differences[i]);
  const filteredAbsDiffs = nonZeroIndices.map(i => absDifferences[i]);
  const nNonZero = filteredDiffs.length;

  if (nNonZero === 0) {
    return { error: 'Todas las diferencias son cero. No se puede realizar la prueba.' };
  }

  // Asignar rangos a las diferencias absolutas
  const indexed = filteredAbsDiffs.map((val, idx) => ({ val, idx, sign: Math.sign(filteredDiffs[idx]) }));
  indexed.sort((a, b) => a.val - b.val);

  const ranks = new Array(nNonZero);
  let i = 0;
  while (i < nNonZero) {
    let j = i;
    while (j < nNonZero && indexed[j].val === indexed[i].val) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].idx] = avgRank;
    }
    i = j;
  }

  // Calcular suma de rangos positivos y negativos
  let WPlus = 0, WMinus = 0;
  filteredDiffs.forEach((d, idx) => {
    if (d > 0) WPlus += ranks[idx];
    else if (d < 0) WMinus += ranks[idx];
  });

  const W = Math.min(WPlus, WMinus);

  // Aproximación normal para n > 20
  let z, pValue;
  if (nNonZero > 20) {
    const meanW = nNonZero * (nNonZero + 1) / 4;
    const varW = nNonZero * (nNonZero + 1) * (2 * nNonZero + 1) / 24;
    z = (W - meanW) / Math.sqrt(varW);
    pValue = 2 * approximateNormalPValue(Math.abs(z));
  } else {
    pValue = 'Requiere tabla exacta para n ≤ 20';
  }

  let interpretation = '';
  if (typeof pValue === 'number' && pValue < 0.05) {
    interpretation = `Hay diferencias estadísticamente significativas entre los dos modelos (p = ${pValue.toFixed(4)}).`;
  } else if (typeof pValue === 'number') {
    interpretation = `No hay diferencias estadísticamente significativas entre los dos modelos (p = ${pValue.toFixed(4)}).`;
  } else {
    interpretation = `Para n ≤ 20, consulte una tabla exacta de Wilcoxon. Estadístico W = ${W}.`;
  }

  return {
    test: 'Wilcoxon',
    W,
    WPlus,
    WMinus,
    n: nNonZero,
    z,
    pValue,
    interpretation
  };
}

/**
 * Bootstrapping: Estimar intervalos de confianza y precisión de los modelos
 * @param {Array<number>} sample - Muestra de rendimiento de un modelo
 * @param {number} numSamples - Número de remuestreos bootstrap (default: 1000)
 * @param {number} confidenceLevel - Nivel de confianza (default: 0.95)
 * @returns {object} Resultados del bootstrapping
 */
export function bootstrapTest(sample, numSamples = 1000, confidenceLevel = 0.95) {
  if (!sample || sample.length < 2) {
    return { error: 'Muestra insuficiente para bootstrapping' };
  }

  const n = sample.length;
  const bootstrapMeans = [];

  // Generar remuestreos
  for (let b = 0; b < numSamples; b++) {
    const resample = [];
    for (let i = 0; i < n; i++) {
      resample.push(sample[Math.floor(Math.random() * n)]);
    }
    const mean = resample.reduce((a, b) => a + b, 0) / n;
    bootstrapMeans.push(mean);
  }

  // Calcular estadísticos
  const originalMean = sample.reduce((a, b) => a + b, 0) / n;
  const bootstrapMean = bootstrapMeans.reduce((a, b) => a + b, 0) / numSamples;
  const bootstrapStd = Math.sqrt(
    bootstrapMeans.reduce((acc, val) => acc + (val - bootstrapMean) ** 2, 0) / numSamples
  );

  // Intervalo de confianza (percentil)
  bootstrapMeans.sort((a, b) => a - b);
  const alpha = 1 - confidenceLevel;
  const lowerIdx = Math.floor(numSamples * alpha / 2);
  const upperIdx = Math.ceil(numSamples * (1 - alpha / 2));
  const ciLower = bootstrapMeans[lowerIdx];
  const ciUpper = bootstrapMeans[upperIdx];

  const interpretation = `
    Estimación original: ${originalMean.toFixed(4)}.
    Intervalo de confianza al ${(confidenceLevel * 100).toFixed(0)}%: [${ciLower.toFixed(4)}, ${ciUpper.toFixed(4)}].
    Error estándar bootstrap: ${bootstrapStd.toFixed(4)}.
  `.trim();

  return {
    test: 'Bootstrapping',
    originalMean,
    bootstrapMean,
    bootstrapStd,
    confidenceInterval: [ciLower, ciUpper],
    confidenceLevel,
    numSamples,
    bootstrapDistributions: bootstrapMeans, // Para graficar
    interpretation
  };
}

// Funciones auxiliares para aproximar p-values

/**
 * Aproxima el p-value para una distribución chi-cuadrado (simplificado)
 */
function approximateChiSqPValue(chiSq, df) {
  // Aproximación usando la distribución normal para df grandes, o simplificada
  if (df <= 0) return 1;
  if (chiSq <= 0) return 1;

  // Usamos la aproximación de Wilson-Hilferty
  const x = chiSq / df;
  const cubeRoot = Math.pow(x, 1 / 3);
  const z = (cubeRoot - (1 - 2 / (9 * df))) / Math.sqrt(2 / (9 * df));
  return approximateNormalPValue(Math.abs(z));
}

/**
 * Aproxima el p-value para una distribución normal estándar
 */
function approximateNormalPValue(z) {
  // Aproximación de Abramowitz y Stegun
  const p = 0.2316419;
  const b = [0.319381530, -0.356563782, 1.781477937, -1.821255978, 1.330274429];
  const t = 1 / (1 + p * z);
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    sum += b[i] * Math.pow(t, i + 1);
  }
  const phi = Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
  return phi * sum;
}

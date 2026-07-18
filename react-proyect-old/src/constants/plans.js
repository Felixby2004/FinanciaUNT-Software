
// Definición de planes y sus límites
export const PLANS = {
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise',
  ADMIN: 'admin'
};

// Definición de los 3 modelos de IA
export const AI_MODELS = [
  {
    id: 1,
    modelType: 'RULES',
    name: 'Rule Based Recommender',
    description: 'Detecta excesos sobre presupuesto, prioridades de gasto y alertas de ahorro bajo.',
    icon: 'Filter'
  },
  {
    id: 2,
    modelType: 'COLLAB',
    name: 'Collaborative Recommender',
    description: 'Compara tus hábitos con usuarios similares para detectar gastos anómalos.',
    icon: 'TrendingUp'
  },
  {
    id: 3,
    modelType: 'SAVINGS',
    name: 'Savings Optimizer Recommender',
    description: 'Analiza tendencia, volatilidad y ahorro para priorizar acciones de mejora.',
    icon: 'Users'
  }
];

// Límites y características por plan
export const PLAN_FEATURES = {
  [PLANS.BASIC]: {
    currencies: { base: ['PEN', 'USD'], max: 1, updateInterval: 'daily' },
    accounts: { max: 3 },
    categories: { customAllowed: false },
    recurringTransactions: { max: 3 },
    notifications: { types: ['in_app'], maxInApp: 10 },
    helpCenter: { pdf: true, web: false },
    exports: { currentMonthOnly: true, formats: ['csv'] },
    ai: { recommendations: 3, historyMonths: 6, pool: 'global' },
    chatbot: { messagesPerDay: 10, contextMonths: 1 },
    canDowngrade: false,
    canUpgrade: true
  },
  [PLANS.PREMIUM]: {
    currencies: { base: ['PEN', 'USD', 'EUR'], extra: 2, max: 5, updateInterval: 'hourly' },
    accounts: { max: Infinity },
    categories: { customAllowed: true, maxCustom: Infinity },
    recurringTransactions: { max: Infinity },
    notifications: { types: ['in_app', 'push', 'email'], emailDaily: true },
    helpCenter: { pdf: true, web: true, search: true },
    exports: { currentMonthOnly: false, formats: ['csv', 'excel'] },
    ai: { recommendations: 10, historyMonths: Infinity, pool: 'similar' },
    chatbot: { messagesPerDay: Infinity, contextMonths: Infinity, canExecuteCrud: true },
    canDowngrade: true,
    canUpgrade: true,
    billing: { invoiceHistory: true }
  },
  [PLANS.ENTERPRISE]: {
    currencies: { base: 'all', max: Infinity, updateInterval: '5min', apiMonitoring: true },
    accounts: { max: Infinity, perDepartment: true },
    categories: { customAllowed: true, globalPerCompany: true, privateAllowed: true },
    recurringTransactions: { max: Infinity, approvalFlow: true },
    notifications: { types: ['in_app', 'push', 'email', 'slack', 'teams'] },
    helpCenter: { pdf: true, web: true, advancedSearch: true, whiteLabel: true },
    exports: { currentMonthOnly: false, formats: ['csv', 'excel', 'api'] },
    terms: { ndaRequired: true },
    ai: { recommendations: 10, compareDepartments: true, editInternalWeights: true },
    reports: { audit: true, whiteLabel: true },
    chatbot: { messagesPerDay: Infinity, canGenerateReports: true },
    invites: { csvMassive: true },
    canDowngrade: true,
    canUpgrade: true,
    billing: { consolidated: true }
  },
  [PLANS.ADMIN]: {
    currencies: { apiProviderMonitoring: true },
    accounts: { viewTotalActive: true },
    categories: { createGlobal: true },
    recurringTransactions: { viewFailed: true },
    notifications: { viewVolume: true },
    helpCenter: { manageContent: true },
    exports: { noExportOnlyMonitor: true },
    terms: { manageVersions: true },
    ai: { viewGlobalPerformance: true, editGlobalWeights: true, weightOptions: [2, 1.5, 2.5] },
    reports: { viewAdoptionStats: true },
    chatbot: { operationsMetrics: true },
    invites: { resendCodes: true, suspendAccounts: true },
    statisticalTests: { enabled: true }
  }
};

// Pruebas estadísticas disponibles
export const STATISTICAL_TESTS = [
  {
    id: 'friedman',
    name: 'Prueba de Friedman',
    description: 'Compara los 3 modelos en usuarios compartidos y detecta diferencias globales de ranking.'
  },
  {
    id: 'wilcoxon',
    name: 'Prueba de Wilcoxon',
    description: 'Compara pares de modelos después de Friedman y cuantifica la significancia del cambio.'
  },
  {
    id: 'cohen-d',
    name: 'Cohen\'s d',
    description: 'Mide el tamaño del efecto entre dos modelos y ayuda a interpretar si la diferencia es relevante.'
  },
  {
    id: 'ndcg-precision',
    name: 'Precision@5 y NDCG@10',
    description: 'Evalúa el ranking de recomendaciones usando utilidad binaria y calidad de ordenamiento.'
  },
  {
    id: 'bootstrap',
    name: 'Bootstrapping',
    description: 'Método de remuestreo para estimar intervalos de confianza y precisión de los modelos.'
  }
];

// Monedas disponibles
export const CURRENCIES = [
  'PEN', 'USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'SEK',
  'NOK', 'DKK', 'SGD', 'HKD', 'NZD', 'INR', 'MXN', 'TWD', 'ZAR', 'BRL',
  'KRW', 'RUB', 'TRY', 'CLP', 'COP', 'ARS', 'PEN', 'UYU', 'CRC', 'GTQ',
  'HNL', 'NIO', 'PAB', 'BMD', 'BBD', 'BSD', 'BZD', 'CUC', 'CUP', 'DOP',
  'ECS', 'GTQ', 'HNL', 'HTG', 'JMD', 'KYD', 'MNT', 'MOP', 'NPR', 'PKR'
];

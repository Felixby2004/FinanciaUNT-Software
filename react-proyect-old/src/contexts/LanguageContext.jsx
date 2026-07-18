
import { createContext, useContext, useState, useEffect } from 'react'

const translations = {
  es: {
    login: 'Iniciar Sesión',
    register: 'Registrar',
    logout: 'Cerrar Sesión',
    dashboard: 'Panel',
    transactions: 'Transacciones',
    budgets: 'Presupuestos',
    goals: 'Metas',
    profile: 'Mi Perfil',
    settings: 'Configuración',
    plans: 'Planes',
    admin: 'Admin',
    users: 'Usuarios',
    statistics: 'Estadísticas',
    aiRecommendations: 'Recomendaciones IA',
    helpCenter: 'Centro de Ayuda',
    billing: 'Facturación',
    chat: 'Chat',
    theme: 'Tema',
    language: 'Idioma',
    light: 'Claro',
    dark: 'Oscuro',
    system: 'Sistema',
    save: 'Guardar',
    cancel: 'Cancelar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    credentialsIncorrect: 'Credenciales incorrectas',
    name: 'Nombre',
    email: 'Email',
    password: 'Contraseña',
    currentPassword: 'Contraseña Actual',
    newPassword: 'Nueva Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    monthlyIncome: 'Ingreso Mensual',
    riskProfile: 'Perfil de Riesgo',
    advisorTone: 'Tono del Asesor',
    currency: 'Moneda',
    preferences: 'Preferencias',
    changePassword: 'Cambiar Contraseña',
    plan: 'Plan',
    role: 'Rol',
    basic: 'Básico',
    premium: 'Premium',
    enterprise: 'Enterprise',
    adminRole: 'Admin',
    welcome: 'Bienvenido',
    hello: 'Hola',
    goodbye: 'Adiós',
    features: {
      theme: 'Tema (Claro/Oscuro)',
      language: 'Idioma (ES/EN)',
      basicCurrency: 'Moneda base (PEN/USD)',
      basicAccounts: '3 Cuentas financieras',
      basicCategories: 'Categorías predefinidas',
      basicRecurring: '3 Transacciones recurrentes',
      basicManual: 'Manual PDF descargable',
      basicExport: 'Exportar mes actual (CSV)',
      basicAI: 'Top 3 recomendaciones IA',
      basicChat: '10 mensajes/día chatbot',
      premiumCurrency: 'Monedas: PEN/USD/EUR + 2 extra',
      premiumAccounts: 'Cuentas ilimitadas',
      premiumCategories: 'Categorías personalizadas',
      premiumRecurring: 'Transacciones recurrentes ilimitadas',
      premiumManual: 'PDF + Centro web de ayuda',
      premiumExport: 'Exportar histórico completo (CSV/Excel)',
      premiumAI: 'Top 10 recomendaciones IA',
      premiumChat: 'Chatbot ilimitado + ejecuta CRUD',
      enterpriseCurrency: '40+ monedas, TC cada 5 minutos',
      enterpriseAccounts: 'Cuentas ilimitadas por departamento',
      enterpriseCategories: 'Categorías globales + privadas',
      enterpriseRecurring: 'Transacciones recurrentes + flujo de aprobación',
      enterpriseManual: 'PDF white-label + Centro web avanzado',
      enterpriseExport: 'Exportar histórico + API',
      enterpriseAI: 'Top 10 recomendaciones + compara deptos',
      enterpriseChat: 'Chatbot ilimitado + genera reportes por voz'
    },
    selectPlan: 'Selecciona tu Plan',
    alreadyHave: 'Ya lo tienes',
    noAccount: '¿No tienes una cuenta?',
    signIn: 'Ingresa aquí',
    haveAccount: '¿Ya tienes cuenta?',
    createAccount: 'Crear Cuenta',
    startManaging: 'Comienza a gestionar tus finanzas',
    manageFinances: 'Gestiona tus finanzas de manera inteligente',
    choosePlan: 'Elegir Plan',
    creating: 'Creando...',
    passwordMismatch: 'Las contraseñas no coinciden',
    errorCreating: 'Error al crear la cuenta',
    yourEmail: 'tu@email.com',
    yourName: 'Tu nombre'
  },
  en: {
    login: 'Sign In',
    register: 'Register',
    logout: 'Sign Out',
    dashboard: 'Dashboard',
    transactions: 'Transactions',
    budgets: 'Budgets',
    goals: 'Goals',
    profile: 'My Profile',
    settings: 'Settings',
    plans: 'Plans',
    admin: 'Admin',
    users: 'Users',
    statistics: 'Statistics',
    aiRecommendations: 'AI Recommendations',
    helpCenter: 'Help Center',
    billing: 'Billing',
    chat: 'Chat',
    theme: 'Theme',
    language: 'Language',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    credentialsIncorrect: 'Incorrect credentials',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    monthlyIncome: 'Monthly Income',
    riskProfile: 'Risk Profile',
    advisorTone: 'Advisor Tone',
    currency: 'Currency',
    preferences: 'Preferences',
    changePassword: 'Change Password',
    plan: 'Plan',
    role: 'Role',
    basic: 'Basic',
    premium: 'Premium',
    enterprise: 'Enterprise',
    adminRole: 'Admin',
    welcome: 'Welcome',
    hello: 'Hello',
    goodbye: 'Goodbye',
    features: {
      theme: 'Theme (Light/Dark)',
      language: 'Language (ES/EN)',
      basicCurrency: 'Base Currency (PEN/USD)',
      basicAccounts: '3 Financial Accounts',
      basicCategories: 'Predefined Categories',
      basicRecurring: '3 Recurring Transactions',
      basicManual: 'Downloadable PDF Manual',
      basicExport: 'Export Current Month (CSV)',
      basicAI: 'Top 3 AI Recommendations',
      basicChat: '10 messages/day chatbot',
      premiumCurrency: 'Currencies: PEN/USD/EUR + 2 extra',
      premiumAccounts: 'Unlimited Accounts',
      premiumCategories: 'Custom Categories',
      premiumRecurring: 'Unlimited Recurring Transactions',
      premiumManual: 'PDF + Web Help Center',
      premiumExport: 'Export Full History (CSV/Excel)',
      premiumAI: 'Top 10 AI Recommendations',
      premiumChat: 'Unlimited chatbot + CRUD execution',
      enterpriseCurrency: '40+ currencies, EC every 5 minutes',
      enterpriseAccounts: 'Unlimited Accounts per Department',
      enterpriseCategories: 'Global + Private Categories',
      enterpriseRecurring: 'Recurring Transactions + Approval Flow',
      enterpriseManual: 'White-label PDF + Advanced Help Center',
      enterpriseExport: 'Export History + API',
      enterpriseAI: 'Top 10 Recommendations + Compare Depts',
      enterpriseChat: 'Unlimited chatbot + voice reports'
    },
    selectPlan: 'Choose your Plan',
    alreadyHave: 'You already have it',
    noAccount: "Don't have an account?",
    signIn: 'Sign in here',
    haveAccount: 'Already have an account?',
    createAccount: 'Create Account',
    startManaging: 'Start managing your finances',
    manageFinances: 'Manage your finances smartly',
    choosePlan: 'Choose Plan',
    creating: 'Creating...',
    passwordMismatch: 'Passwords do not match',
    errorCreating: 'Error creating account',
    yourEmail: 'your@email.com',
    yourName: 'Your name'
  }
}

const LanguageContext = createContext()

export const LanguageProvider = ({ children }) => {
  const getInitialLanguage = () => {
    const savedLang = localStorage.getItem('financiaunt_language')
    if (savedLang) return savedLang
    return 'es'
  }

  const [language, setLanguage] = useState(getInitialLanguage)

  useEffect(() => {
    localStorage.setItem('financiaunt_language', language)
  }, [language])

  const t = (key) => {
    const keys = key.split('.')
    let value = translations[language]
    for (const k of keys) {
      value = value?.[k]
    }
    return value || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

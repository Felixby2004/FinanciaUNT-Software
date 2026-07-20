import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import './AdminPages.css';

const AiStats = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const containerStyle = {
    color: isDark ? '#e0e0e0' : '#1e293b',
    minHeight: '100vh',
    padding: '32px',
    maxWidth: '1200px',
    margin: '0 auto',
    transition: 'background-color 0.3s, color 0.3s',
  };

  const cardStyle = {
    backgroundColor: isDark ? '#16213e' : '#ffffff',
    border: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)',
    transition: 'background-color 0.3s, border-color 0.3s',
  };

  const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    margin: '0 0 16px 0',
    color: isDark ? '#e0e0e0' : '#1e293b',
  };

  const subtitleStyle = {
    fontSize: '1.1rem',
    fontWeight: '600',
    margin: '20px 0 12px 0',
    color: isDark ? '#e0e0e0' : '#1e293b',
  };

  const textStyle = {
    fontSize: '0.95rem',
    lineHeight: '1.6',
    color: isDark ? '#94a3b8' : '#475569',
    marginBottom: '12px',
  };

  const listStyle = {
    paddingLeft: '24px',
    color: isDark ? '#94a3b8' : '#475569',
    lineHeight: '1.8',
  };

  const modelGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '20px',
    marginTop: '16px',
  };

  const modelCardStyle = {
    backgroundColor: isDark ? '#1a1a2e' : '#f8fafc',
    border: isDark ? '1px solid #2a3a5e' : '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '20px',
    transition: 'all 0.3s ease',
  };

  const badgeStyle = {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '600',
    marginBottom: '8px',
  };

  const badgeColors = {
    rules: { bg: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' },
    collab: { bg: 'rgba(52, 211, 153, 0.2)', color: '#34d399' },
    savings: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b' },
  };

  return (
    <div style={containerStyle}>
      <div className="page-header">
        <h1 className="page-title" style={{ color: isDark ? '#e0e0e0' : '#1e293b' }}>
          {t('aiModelsInfoTitle') || 'Modelos de IA y Pruebas Estadísticas'}
        </h1>
      </div>

      {/* ===== INTRODUCCIÓN ===== */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>{t('aiModelsIntroTitle') || '¿Qué son los modelos de IA en FinanciaUNT?'}</h2>
        <p style={textStyle}>
          {t('aiModelsIntroText') ||
            'FinanciaUNT utiliza tres modelos de inteligencia artificial para generar recomendaciones financieras personalizadas. Cada modelo analiza tus datos desde una perspectiva diferente, permitiendo obtener sugerencias más completas y precisas.'}
        </p>
        <p style={textStyle}>
          {t('aiModelsIntroText2') ||
            'Además, se aplican pruebas estadísticas para evaluar la calidad y confiabilidad de cada modelo, asegurando que las recomendaciones sean realmente útiles para los usuarios.'}
        </p>
      </div>

      {/* ===== MODELOS DE IA ===== */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>{t('aiModelsTitle') || 'Modelos de Recomendación'}</h2>
        <div style={modelGridStyle}>
          {/* Reglas */}
          <div style={modelCardStyle}>
            <span style={{ ...badgeStyle, backgroundColor: badgeColors.rules.bg, color: badgeColors.rules.color }}>
              {t('modelRulesLabel') || 'Reglas'}
            </span>
            <h3 style={{ margin: '8px 0', fontSize: '1.1rem', color: isDark ? '#e0e0e0' : '#1e293b' }}>
              {t('modelRulesName') || 'Modelo de Reglas'}
            </h3>
            <p style={textStyle}>
              {t('modelRulesDescription') ||
                'Este modelo aplica reglas predefinidas basadas en los presupuestos del usuario y su tasa de ahorro. Identifica gastos excesivos y sugiere ajustes automáticos.'}
            </p>
            <p style={{ ...textStyle, fontSize: '0.85rem', fontStyle: 'italic' }}>
              <strong>{t('whenToUse') || 'Cuándo usarlo:'}</strong>{' '}
              {t('modelRulesWhen') || 'Ideal para usuarios que necesitan control básico de sus gastos y presupuestos.'}
            </p>
          </div>

          {/* Colaborativo */}
          <div style={modelCardStyle}>
            <span style={{ ...badgeStyle, backgroundColor: badgeColors.collab.bg, color: badgeColors.collab.color }}>
              {t('modelCollabLabel') || 'Colaborativo'}
            </span>
            <h3 style={{ margin: '8px 0', fontSize: '1.1rem', color: isDark ? '#e0e0e0' : '#1e293b' }}>
              {t('modelCollabName') || 'Modelo Colaborativo'}
            </h3>
            <p style={textStyle}>
              {t('modelCollabDescription') ||
                'Compara el perfil de gasto del usuario con usuarios similares para encontrar oportunidades de mejora. Es útil para descubrir patrones de ahorro que otros ya aplican.'}
            </p>
            <p style={{ ...textStyle, fontSize: '0.85rem', fontStyle: 'italic' }}>
              <strong>{t('whenToUse') || 'Cuándo usarlo:'}</strong>{' '}
              {t('modelCollabWhen') || 'Recomendado para usuarios que quieren aprender de las mejores prácticas de otros.'}
            </p>
          </div>

          {/* Optimizador */}
          <div style={modelCardStyle}>
            <span style={{ ...badgeStyle, backgroundColor: badgeColors.savings.bg, color: badgeColors.savings.color }}>
              {t('modelSavingsLabel') || 'Optimizador'}
            </span>
            <h3 style={{ margin: '8px 0', fontSize: '1.1rem', color: isDark ? '#e0e0e0' : '#1e293b' }}>
              {t('modelSavingsName') || 'Modelo Optimizador de Ahorro'}
            </h3>
            <p style={textStyle}>
              {t('modelSavingsDescription') ||
                'Analiza tendencias y volatilidad en los gastos para optimizar el ahorro futuro. Es el modelo más avanzado y sugiere estrategias a largo plazo.'}
            </p>
            <p style={{ ...textStyle, fontSize: '0.85rem', fontStyle: 'italic' }}>
              <strong>{t('whenToUse') || 'Cuándo usarlo:'}</strong>{' '}
              {t('modelSavingsWhen') || 'Perfecto para usuarios con objetivos de ahorro a largo plazo o inversiones.'}
            </p>
          </div>
        </div>
      </div>

      {/* ===== PRUEBAS ESTADÍSTICAS ===== */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>{t('statisticalTestsTitle') || 'Pruebas Estadísticas Utilizadas'}</h2>
        <p style={textStyle}>
          {t('statisticalTestsIntro') ||
            'Para garantizar la calidad de las recomendaciones, aplicamos dos pruebas estadísticas que evalúan el rendimiento de los modelos de IA:'}
        </p>

        {/* Friedman */}
        <div style={{ marginBottom: '20px' }}>
          <h3 style={subtitleStyle}>{t('testFriedmanName') || '1. Prueba de Friedman'}</h3>
          <p style={textStyle}>
            {t('friedmanDescription') ||
              'Esta prueba no paramétrica compara el rendimiento global de los tres modelos simultáneamente. Responde a la pregunta: "¿Existen diferencias estadísticamente significativas entre el rendimiento de los modelos?"'}
          </p>
          <p style={textStyle}>
            <strong>{t('friedmanResult') || 'Resultado:'}</strong>{' '}
            {t('friedmanResultText') ||
              'Si el p-valor es menor a 0.05 (5% de significancia), concluimos que al menos un modelo es diferente a los demás. Si es mayor, no hay evidencia suficiente para afirmar diferencias.'}
          </p>
          <p style={{ ...textStyle, fontSize: '0.85rem', fontStyle: 'italic' }}>
            <strong>{t('whenToUseFriedman') || 'Cuándo se usa:'}</strong>{' '}
            {t('whenToUseFriedmanText') || 'Siempre que se quiera evaluar si los modelos tienen un desempeño similar o hay uno que destaca sobre los demás.'}
          </p>
        </div>

        {/* Wilcoxon */}
        <div>
          <h3 style={subtitleStyle}>{t('testWilcoxonName') || '2. Prueba de Wilcoxon (post-hoc)'}</h3>
          <p style={textStyle}>
            {t('wilcoxonDescription') ||
              'Mientras la prueba de Friedman evalúa si hay diferencias globales, la prueba de Wilcoxon se aplica para identificar qué pares de modelos son diferentes entre sí. Es un análisis "post-hoc" o "de seguimiento".'}
          </p>
          <p style={textStyle}>
            <strong>{t('wilcoxonResult') || 'Resultado:'}</strong>{' '}
            {t('wilcoxonResultText') ||
              'Se compara cada par de modelos (Reglas vs Colaborativo, Reglas vs Optimizador, Colaborativo vs Optimizador) para determinar si sus diferencias son significativas.'}
          </p>
          <p style={{ ...textStyle, fontSize: '0.85rem', fontStyle: 'italic' }}>
            <strong>{t('whenToUseWilcoxon') || 'Cuándo se usa:'}</strong>{' '}
            {t('whenToUseWilcoxonText') || 'Cuando la prueba de Friedman indica que existen diferencias, este test ayuda a identificar exactamente qué modelo es superior.'}
          </p>
        </div>

        {/* Cohen's d (Tamaño del efecto) */}
        <div style={{ marginTop: '20px' }}>
          <h3 style={subtitleStyle}>{t('effectSizeTitle') || '3. Tamaño del Efecto (Cohen\'s d)'}</h3>
          <p style={textStyle}>
            {t('effectSizeDescription') ||
              'Además del p-valor, calculamos el "tamaño del efecto" (Cohen\'s d) para entender la magnitud de las diferencias entre modelos. Esto complementa la significancia estadística con la relevancia práctica.'}
          </p>
          <p style={textStyle}>
            <strong>{t('effectSizeInterpretation') || 'Interpretación:'}</strong>{' '}
            {t('effectSizeInterpretationText') ||
              'Valores de d ≈ 0.2 indican un efecto pequeño, d ≈ 0.5 es moderado y d ≈ 0.8 es grande. Esto ayuda a decidir si una diferencia, aunque significativa, es realmente importante para el usuario.'}
          </p>
        </div>
      </div>

      {/* ===== MÉTRICAS DE RENDIMIENTO ===== */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>{t('performanceMetricsTitle') || 'Métricas de Rendimiento'}</h2>
        <p style={textStyle}>
          {t('performanceMetricsIntro') ||
            'Para evaluar la calidad de las recomendaciones generadas por cada modelo, utilizamos tres métricas clave:'}
        </p>

        <ul style={listStyle}>
          <li>
            <strong>{t('metricPrecisionName') || 'Precisión@5:'}</strong>{' '}
            {t('metricPrecisionDescription') ||
              'Mide el porcentaje de recomendaciones útiles entre las primeras 5 sugeridas por el modelo. Una mayor precisión indica que el modelo acierta más en sus primeras recomendaciones.'}
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>{t('metricNdcgName') || 'NDCG@10:'}</strong>{' '}
            {t('metricNdcgDescription') ||
              'Evalúa la calidad del ranking de las 10 primeras recomendaciones, considerando el orden de relevancia. Un valor cercano a 1 significa un ranking perfecto.'}
          </li>
          <li style={{ marginTop: '8px' }}>
            <strong>{t('metricUpliftName') || 'Savings Uplift:'}</strong>{' '}
            {t('metricUpliftDescription') ||
              'Incremento promedio en el ahorro que generan las recomendaciones del modelo. Se expresa en moneda local (PEN, USD, etc.) y refleja el impacto financiero real.'}
          </li>
        </ul>
      </div>

      {/* ===== COMPARADOR DE MODELOS ===== */}
      <div style={cardStyle}>
        <h2 style={titleStyle}>{t('comparatorTitle') || 'Comparador de Modelos'}</h2>
        <p style={textStyle}>
          {t('comparatorDescription') ||
            'El sistema también incluye un "Comparador" que combina las recomendaciones de los 3 modelos, ponderadas según su peso y relevancia. Esto permite ofrecer al usuario las recomendaciones más equilibradas y efectivas.'}
        </p>
        <p style={textStyle}>
          <strong>{t('howItWorks') || 'Cómo funciona:'}</strong>{' '}
          {t('howItWorksText') ||
            'Cada recomendación recibe una puntuación basada en su urgencia y el peso del modelo que la generó. Luego se ordenan por esa puntuación y se presentan al usuario en orden de prioridad.'}
        </p>
        <p style={{ ...textStyle, fontSize: '0.85rem', fontStyle: 'italic' }}>
          {t('comparatorNote') ||
            'Nota: El Comparador está disponible para todos los planes, pero el número de recomendaciones visibles depende del plan del usuario (3 para Básico, 10 para Premium y Enterprise).'}
        </p>
      </div>
    </div>
  );
};

export default AiStats;
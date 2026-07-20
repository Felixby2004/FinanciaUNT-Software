import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import './ClientPages.css';

const CACHE_KEY = 'financiaunt_fx_cache';
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes
const DEFAULT_POLL_SECONDS = Number(import.meta.env.VITE_FX_POLL_INTERVAL) || 60;

// Nombres de monedas (más de 40 para Enterprise)
const CURRENCY_NAMES = {
  PEN: 'Sol Peruano',
  USD: 'Dólar Americano',
  EUR: 'Euro',
  GBP: 'Libra Esterlina',
  JPY: 'Yen Japonés',
  MXN: 'Peso Mexicano',
  CAD: 'Dólar Canadiense',
  AUD: 'Dólar Australiano',
  CHF: 'Franco Suizo',
  CNY: 'Yuan Chino',
  BRL: 'Real Brasileño',
  ARS: 'Peso Argentino',
  CLP: 'Peso Chileno',
  COP: 'Peso Colombiano',
  UYU: 'Peso Uruguayo',
  PYG: 'Guaraní Paraguayo',
  BOB: 'Boliviano',
  VES: 'Bolívar Soberano',
  KRW: 'Won Surcoreano',
  INR: 'Rupia India',
  RUB: 'Rublo Ruso',
  ZAR: 'Rand Sudafricano',
  SGD: 'Dólar Singapurense',
  HKD: 'Dólar de Hong Kong',
  NZD: 'Dólar Neozelandés',
  SEK: 'Corona Sueca',
  NOK: 'Corona Noruega',
  DKK: 'Corona Danesa',
  PLN: 'Zloty Polaco',
  CZK: 'Corona Checa',
  HUF: 'Forinto Húngaro',
  ILS: 'Shekel Israelí',
  TRY: 'Lira Turca',
  THB: 'Baht Tailandés',
  VND: 'Dong Vietnamita',
  IDR: 'Rupia Indonesia',
  PHP: 'Peso Filipino',
  MYR: 'Ringgit Malayo',
  PKR: 'Rupia Pakistaní',
  EGP: 'Libra Egipcia',
  NGN: 'Naira Nigeriana',
  KES: 'Chelín Keniata',
  GHS: 'Cedi Ghanés',
};

// Mapa de países para banderas
const COUNTRY_MAP = {
  PEN: 'PE',
  USD: 'US',
  EUR: 'EU',
  GBP: 'GB',
  JPY: 'JP',
  MXN: 'MX',
  CAD: 'CA',
  AUD: 'AU',
  CHF: 'CH',
  CNY: 'CN',
  BRL: 'BR',
  ARS: 'AR',
  CLP: 'CL',
  COP: 'CO',
  UYU: 'UY',
  PYG: 'PY',
  BOB: 'BO',
  VES: 'VE',
  KRW: 'KR',
  INR: 'IN',
  RUB: 'RU',
  ZAR: 'ZA',
  SGD: 'SG',
  HKD: 'HK',
  NZD: 'NZ',
  SEK: 'SE',
  NOK: 'NO',
  DKK: 'DK',
  PLN: 'PL',
  CZK: 'CZ',
  HUF: 'HU',
  ILS: 'IL',
  TRY: 'TR',
  THB: 'TH',
  VND: 'VN',
  IDR: 'ID',
  PHP: 'PH',
  MYR: 'MY',
  PKR: 'PK',
  EGP: 'EG',
  NGN: 'NG',
  KES: 'KE',
  GHS: 'GH',
};

const getFlagUrl = (currencyCode) => {
  const code = COUNTRY_MAP[currencyCode] || currencyCode.slice(0, 2);
  return `https://flagsapi.com/${code}/flat/24.png`;
};

// ===== DIVISAS POR PLAN =====
const CURRENCIES_BY_PLAN = {
  basic: ['PEN', 'USD'],
  premium: ['PEN', 'USD', 'EUR', 'GBP', 'MXN'],
  enterprise: ['PEN', 'USD', 'EUR', 'GBP', 'MXN', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'KRW', 'INR', 'RUB', 'ZAR', 'SGD', 'HKD', 'NZD', 'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'ILS', 'TRY', 'THB', 'VND', 'IDR', 'PHP', 'MYR', 'PKR', 'EGP', 'NGN', 'KES', 'GHS'],
};

const planLabels = {
  basic: { label: 'Básico', color: '#64748b' },
  premium: { label: 'Premium', color: '#667eea' },
  enterprise: { label: 'Enterprise', color: '#764ba2' },
};

// ============================================================
// FUNCIÓN fetchRates CON API SIN CORS
// ============================================================
const fetchRates = async (base = 'USD', symbols = []) => {
  if (!symbols || symbols.length === 0) {
    return { rates: {} };
  }

  const promises = symbols.map(async (symbol) => {
    const url = `https://www.currencyexchangetool.com/api/v1/convert?amount=1&from=${base}&to=${symbol}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
    const data = await res.json();
    return { symbol, rate: data.rate };
  });

  const results = await Promise.all(promises);

  const rates = {};
  results.forEach(({ symbol, rate }) => {
    rates[symbol] = rate;
  });

  return { rates };
};

// ============================================================
// COMPONENTE CurrencyRates
// ============================================================
const CurrencyRates = ({
  userId,
  baseCurrency = 'USD',
  showCurrencies = null,
  planProp = null,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === 'dark';

  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [plan, setPlan] = useState('basic');
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState('all'); // Para Enterprise

  // ============================================================
  // 1. Obtener el plan del usuario desde Supabase o prop
  // ============================================================
  useEffect(() => {
    const fetchPlan = async () => {
      if (planProp) {
        const normalizedPlan = planProp.toLowerCase().trim();
        if (['premium', 'enterprise', 'basic'].includes(normalizedPlan)) {
          console.log('[CurrencyRates] ✅ Usando plan desde prop:', normalizedPlan);
          setPlan(normalizedPlan);
          setLoadingPlan(false);
          return;
        }
      }

      if (!userId) {
        console.warn('[CurrencyRates] ⚠️ No se proporcionó userId, usando plan basic.');
        setPlan('basic');
        setLoadingPlan(false);
        return;
      }

      try {
        console.log('[CurrencyRates] 🔍 Consultando plan para userId:', userId);
        const { data, error } = await supabase
          .from('usuarios')
          .select('plan_suscripcion')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('[CurrencyRates] ❌ Error al obtener plan:', error);
          setPlan('basic');
          setLoadingPlan(false);
          return;
        }

        const userPlan = data?.plan_suscripcion?.toLowerCase().trim();

        if (userPlan === 'premium') {
          console.log('[CurrencyRates] ✅ Plan detectado: Premium');
          setPlan('premium');
        } else if (userPlan === 'enterprise') {
          console.log('[CurrencyRates] ✅ Plan detectado: Enterprise');
          setPlan('enterprise');
        } else if (userPlan === 'basic') {
          console.log('[CurrencyRates] ✅ Plan detectado: Basic');
          setPlan('basic');
        } else {
          console.warn(`[CurrencyRates] ⚠️ Plan desconocido: "${userPlan}", usando basic.`);
          setPlan('basic');
        }
      } catch (err) {
        console.error('[CurrencyRates] ❌ Error inesperado:', err);
        setPlan('basic');
      } finally {
        setLoadingPlan(false);
      }
    };

    fetchPlan();
  }, [userId, planProp]);

  // ============================================================
  // 2. Determinar divisas a mostrar (SIEMPRE según el plan)
  // ============================================================
  const planInfo = planLabels[plan] || planLabels.basic;
  const currenciesToShow = CURRENCIES_BY_PLAN[plan] || CURRENCIES_BY_PLAN.basic;
  const filteredCurrencies = currenciesToShow.filter((c) => c !== baseCurrency);

  // ============================================================
  // 3. Obtener tasas de cambio
  // ============================================================
  useEffect(() => {
    if (loadingPlan) return;
    if (filteredCurrencies.length === 0) {
      setRates([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    let intervalId = null;

    const load = async (force = false) => {
      setError(null);
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        const now = Date.now();
        if (!force && cached && cached.base === baseCurrency && (now - cached.ts) < CACHE_TTL) {
          if (mounted) {
            const enriched = (cached.rates || []).map((r) => ({
              ...r,
              flagUrl: getFlagUrl(r.symbol),
              name: CURRENCY_NAMES[r.symbol] || r.symbol,
            }));
            setRates(enriched);
            setLastUpdated(new Date(cached.ts));
            setLoading(false);
          }
          return;
        }

        const latest = await fetchRates(baseCurrency, filteredCurrencies);

        const combined = filteredCurrencies.map((sym) => {
          const rate = latest.rates?.[sym] ?? null;
          const inverseRate = rate ? 1 / rate : null;
          return {
            symbol: sym,
            rate,
            inverseRate,
            change: null,
            flagUrl: getFlagUrl(sym),
            name: CURRENCY_NAMES[sym] || sym,
          };
        });

        if (mounted) {
          setRates(combined);
          setLastUpdated(new Date());
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              ts: now,
              base: baseCurrency,
              rates: combined,
            })
          );
          setLoading(false);
        }
      } catch (err) {
        console.error('FX fetch error', err);
        if (mounted) setError(err.message || 'Error al obtener tasas');
      }
    };

    load(true);
    intervalId = setInterval(() => load(true), DEFAULT_POLL_SECONDS * 1000);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [baseCurrency, filteredCurrencies.join(','), loadingPlan]);

  // Filtrar divisas según selección (solo para Enterprise)
  const displayRates = plan === 'enterprise' && selectedCurrency !== 'all'
    ? rates.filter(r => r.symbol === selectedCurrency)
    : rates;

  // Opciones para el selector (Enterprise)
  const currencyOptions = [
    { value: 'all', label: 'Todas las divisas' },
    ...rates.map(r => ({ value: r.symbol, label: `${r.symbol} - ${r.name || r.symbol}` })),
  ];

  // Estilos
  const cardBg = isDark ? '#16213e' : '#ffffff';
  const borderColor = isDark ? '#2a3a5e' : '#e5e7eb';
  const textColor = isDark ? '#e0e0e0' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';
  const shadow = isDark ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.05)';

  if (loadingPlan) {
    return (
      <div className="fx-section" style={{ marginBottom: '1.5rem' }}>
        <div style={{ textAlign: 'center', padding: '1rem', color: textSecondary }}>
          {t('loadingPlan') || 'Cargando información del plan...'}
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDERIZADO
  // ============================================================
  return (
    <div className="fx-section" style={{ marginBottom: '1.5rem' }}>
      {/* Encabezado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: textColor }}>
            💱 {t('exchangeRates') || 'Tipos de Cambio'}
          </h2>
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              padding: '0.2rem 0.75rem',
              borderRadius: '999px',
              backgroundColor: planInfo.color + '20',
              color: planInfo.color,
              border: `1px solid ${planInfo.color}40`,
            }}
          >
            {planInfo.label} • {filteredCurrencies.length} {t('currencies') || 'divisas'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: textSecondary }}>
          {t('lastUpdate') || 'Última actualización'}: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'}
          <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>
            • {t('autoUpdate') || 'Actualización automática'} {DEFAULT_POLL_SECONDS}s
          </span>
        </div>
      </div>

      {/* Moneda base */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0.75rem',
          marginBottom: '1rem',
          backgroundColor: isDark ? '#1a1a2e' : '#f1f5f9',
          borderRadius: '8px',
          fontSize: '0.85rem',
          color: textSecondary,
          border: `1px solid ${borderColor}`,
        }}
      >
        <span>{t('baseCurrency') || 'Moneda base'}:</span>
        <strong style={{ color: textColor }}>{baseCurrency}</strong>
        <span style={{ marginLeft: '0.5rem', opacity: 0.6 }}>
          ({t('allAmountsInThisCurrency') || 'todos los montos se muestran en esta moneda'})
        </span>
      </div>

      {/* Loading de tasas */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '2rem', color: textSecondary }}>
          <div className="spinner" style={{ border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#667eea', borderRadius: '50%', width: '30px', height: '30px', animation: 'spin 1s linear infinite', marginRight: '1rem' }} />
          <span>{t('loadingRates') || 'Cargando tipos de cambio...'}</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ padding: '1rem', backgroundColor: isDark ? '#3b1a1a' : '#fee2e2', color: isDark ? '#fca5a5' : '#991b1b', borderRadius: '8px', textAlign: 'center', marginBottom: '1rem' }}>
          {t('errorLoadingRates') || 'Error al cargar tipos de cambio'}: {error}
        </div>
      )}

      {/* Grid de divisas */}
      {!loading && !error && (
        <>
          {displayRates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: textSecondary, backgroundColor: isDark ? '#1a1a2e' : '#f8fafc', borderRadius: '8px', border: `1px dashed ${borderColor}` }}>
              {t('noCurrenciesAvailable') || 'No hay divisas disponibles para mostrar'}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: plan === 'enterprise'
                  ? 'repeat(auto-fill, minmax(160px, 1fr))' // más compacto para Enterprise
                  : 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: plan === 'enterprise' ? '0.5rem' : '1rem',
              }}
            >
              {displayRates.map((r) => (
                <div
                  key={r.symbol}
                  style={{
                    backgroundColor: cardBg,
                    border: `1px solid ${borderColor}`,
                    borderRadius: plan === 'enterprise' ? '8px' : '12px',
                    padding: plan === 'enterprise' ? '0.6rem 0.8rem' : '1rem 1.25rem',
                    boxShadow: shadow,
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.15rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <img
                      src={r.flagUrl}
                      alt={r.symbol}
                      style={{ width: plan === 'enterprise' ? '20px' : '30px', height: plan === 'enterprise' ? '20px' : '30px', objectFit: 'cover' }}
                      onError={(e) => (e.target.style.display = 'none')}
                    />
                    <div>
                      <div style={{ fontWeight: 700, color: textColor, fontSize: plan === 'enterprise' ? '0.85rem' : '1rem' }}>
                        {r.symbol}
                      </div>
                      {plan !== 'enterprise' && (
                        <div style={{ fontSize: '0.7rem', color: textSecondary }}>{r.name || r.symbol}</div>
                      )}
                    </div>
                  </div>
                  <div style={{ fontSize: plan === 'enterprise' ? '0.85rem' : '1.1rem', fontWeight: 600, color: textColor }}>
                    1 {baseCurrency} = {r.rate ? r.rate.toFixed(4) : '—'} {r.symbol}
                  </div>
                  {plan !== 'enterprise' && (
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: textSecondary }}>
                      1 {r.symbol} = {r.inverseRate ? r.inverseRate.toFixed(4) : '—'} {baseCurrency}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CurrencyRates;
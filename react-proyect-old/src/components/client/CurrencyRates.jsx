import { useState, useEffect } from 'react'
import './ClientPages.css'

const CACHE_KEY = 'financiaunt_fx_cache'
const CACHE_TTL = 1000 * 60 * 5 // 5 minutes
const DEFAULT_POLL_SECONDS = Number(import.meta.env.VITE_FX_POLL_INTERVAL) || 60

const defaultCurrencies = ['USD', 'EUR', 'MXN', 'GBP', 'JPY']

const fetchRates = async (base = 'USD', symbols = []) => {
  const symbolParam = symbols.length ? `&symbols=${symbols.join(',')}` : ''
  const res = await fetch(`https://api.exchangerate.host/latest?base=${base}${symbolParam}`)
  if (!res.ok) throw new Error('No se pudo obtener tasas de cambio')
  return res.json()
}

const fetchPreviousRates = async (date, base = 'USD', symbols = []) => {
  const symbolParam = symbols.length ? `&symbols=${symbols.join(',')}` : ''
  const res = await fetch(`https://api.exchangerate.host/${date}?base=${base}${symbolParam}`)
  if (!res.ok) throw new Error('No se pudo obtener tasas históricas')
  return res.json()
}

const CurrencyRates = ({ baseCurrency = 'USD', showCurrencies = defaultCurrencies }) => {
  const [rates, setRates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)

  useEffect(() => {
    let mounted = true
    let intervalId = null

    const pollSeconds = DEFAULT_POLL_SECONDS

    const load = async (force = false) => {
      setError(null)
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        const now = Date.now()
        if (!force && cached && cached.base === baseCurrency && (now - cached.ts) < CACHE_TTL) {
          if (mounted) {
            setRates(cached.rates)
            setLastUpdated(new Date(cached.ts))
            setLoading(false)
          }
          return
        }

        const latest = await fetchRates(baseCurrency, showCurrencies)

        // Calculate previous day (UTC)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const yDate = yesterday.toISOString().slice(0, 10)
        const previous = await fetchPreviousRates(yDate, baseCurrency, showCurrencies)

        const combined = showCurrencies.map((sym) => {
          const rate = latest.rates?.[sym] ?? null
          const prevRate = previous.rates?.[sym] ?? null
          const change = rate && prevRate ? ((rate - prevRate) / prevRate) * 100 : null
          return { symbol: sym, rate, prevRate, change }
        })

        if (mounted) {
          setRates(combined)
          setLastUpdated(new Date())
          localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: now, base: baseCurrency, rates: combined }))
          setLoading(false)
        }
      } catch (err) {
        console.error('FX fetch error', err)
        if (mounted) setError(err.message || 'Error')
      }
    }

    // Initial load
    load(true)

    // Respect tab visibility to avoid unnecessary polling
    const shouldPoll = () => document.visibilityState === 'visible'

    // Set up interval polling
    intervalId = setInterval(() => {
      if (shouldPoll()) load(true)
    }, pollSeconds * 1000)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // On resume, do an immediate refresh
        load(true)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      mounted = false
      if (intervalId) clearInterval(intervalId)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [baseCurrency, showCurrencies])

  return (
    <div className="section fx-section">
      <h2 className="section-title">💱 Tipos de Cambio</h2>
      <div style={{ marginBottom: 8, fontSize: 13, color: '#6b7280' }}>
        Última actualización: {lastUpdated ? new Date(lastUpdated).toLocaleString() : '—'} • Actualización automática cada {DEFAULT_POLL_SECONDS}s
      </div>
      {loading ? (
        <div className="empty-state">Cargando tipos de cambio...</div>
      ) : error ? (
        <div className="empty-state">Error: {error}</div>
      ) : (
        <div className="fx-grid">
          {rates.map(r => (
            <div key={r.symbol} className="fx-card">
              <div className="fx-symbol">{r.symbol}/{baseCurrency}</div>
              <div className="fx-rate">{r.rate ? r.rate.toFixed(4) : '—'}</div>
              <div className={`fx-change ${r.change !== null && r.change >= 0 ? 'positive' : 'negative'}`}>
                {r.change === null ? '—' : `${r.change >= 0 ? '+' : ''}${r.change.toFixed(2)}%`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CurrencyRates


import { useState } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip as ChartTooltip, Legend as ChartLegend } from 'chart.js';
import { friedmanTest, wilcoxonTest, bootstrapTest } from '../../utils/statistics';
import { STATISTICAL_TESTS, AI_MODELS } from '../../constants/plans';
import { Activity, Play, CheckCircle2 } from 'lucide-react';
import './AdminPages.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartTooltip,
  ChartLegend
);

const StatisticalTests = () => {
  const [selectedTest, setSelectedTest] = useState('friedman');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Datos de ejemplo para los modelos (pueden ser reemplazados por datos reales de Supabase)
  const sampleData = {
    friedman: [
      [0.85, 0.82, 0.88], // Usuario/Bloque 1: precisión de cada modelo
      [0.78, 0.81, 0.84], // Usuario/Bloque 2
      [0.90, 0.87, 0.92], // Usuario/Bloque 3
      [0.75, 0.79, 0.83], // Usuario/Bloque 4
      [0.82, 0.85, 0.89], // Usuario/Bloque 5
      [0.88, 0.84, 0.91], // Usuario/Bloque 6
      [0.79, 0.83, 0.86], // Usuario/Bloque 7
      [0.91, 0.88, 0.93], // Usuario/Bloque 8
    ],
    wilcoxon: {
      model1: [0.85, 0.78, 0.90, 0.75, 0.82, 0.88, 0.79, 0.91],
      model2: [0.88, 0.84, 0.92, 0.83, 0.89, 0.91, 0.86, 0.93]
    },
    bootstrap: [0.85, 0.78, 0.90, 0.75, 0.82, 0.88, 0.79, 0.91, 0.84, 0.87, 0.89, 0.83, 0.86, 0.92, 0.81]
  };

  const runTest = () => {
    setLoading(true);
    setTimeout(() => {
      let res;
      if (selectedTest === 'friedman') {
        res = friedmanTest(sampleData.friedman);
      } else if (selectedTest === 'wilcoxon') {
        res = wilcoxonTest(sampleData.wilcoxon.model1, sampleData.wilcoxon.model2);
      } else {
        res = bootstrapTest(sampleData.bootstrap);
      }
      setResults(res);
      setLoading(false);
    }, 500);
  };

  const renderResults = () => {
    if (!results) return null;
    if (results.error) return <div className="error">{results.error}</div>;

    return (
      <div className="test-results">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
          <CheckCircle2 size={20} /> Resultados de {results.test}
        </h3>
        <div className="stats-grid">
          {Object.entries(results).map(([key, val]) => {
            if (key === 'interpretation' || key === 'ranks' || key === 'bootstrapDistributions') return null;
            return (
              <div key={key} className="stat-item">
                <span className="stat-label">{key}</span>
                <span className="stat-value">{typeof val === 'number' ? val.toFixed(4) : JSON.stringify(val)}</span>
              </div>
            );
          })}
        </div>
        <div className="interpretation">
          <h4>Interpretación</h4>
          <p>{results.interpretation}</p>
        </div>
        {selectedTest === 'friedman' && results.sumRanks && (
          <div className="chart-container">
            <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Suma de Rangos por Modelo</h4>
            <div style={{ height: '250px' }}>
              <Bar 
                data={{
                  labels: AI_MODELS.map(m => m.name),
                  datasets: [{
                    label: 'Suma de Rangos',
                    data: results.sumRanks,
                    backgroundColor: '#8884d8',
                    borderColor: '#8884d8',
                    borderWidth: 1
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: { legend: { position: 'bottom' } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </div>
          </div>
        )}
        {selectedTest === 'bootstrap' && results.bootstrapDistributions && (
          <div className="chart-container">
            <h4 style={{ marginBottom: '16px', color: 'var(--text-primary)' }}>Distribución Bootstrap de la Media</h4>
            <div style={{ height: '250px' }}>
              <Line 
                data={{
                  labels: Array.from({ length: 50 }, (_, i) => i),
                  datasets: [{
                    label: 'Valor',
                    data: results.bootstrapDistributions.slice(0, 50),
                    fill: true,
                    backgroundColor: 'rgba(130, 202, 157, 0.1)',
                    borderColor: '#82ca9d',
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 0
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: { legend: { position: 'bottom' } },
                  scales: { y: { beginAtZero: true } }
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="admin-page">
      <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Activity size={28} /> Pruebas Estadísticas de Modelos de IA
      </h1>
      <div className="test-selector">
        <label style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Selecciona la prueba a ejecutar:</label>
        <select value={selectedTest} onChange={(e) => setSelectedTest(e.target.value)}>
          {STATISTICAL_TESTS.map(test => (
            <option key={test.id} value={test.id}>{test.name}</option>
          ))}
        </select>
      </div>
      <div className="test-description">
        <p>{STATISTICAL_TESTS.find(t => t.id === selectedTest)?.description}</p>
      </div>
      <button onClick={runTest} disabled={loading} className="btn-run-test">
        {loading ? (
          <>
            <Play size={18} className="spinner" /> Ejecutando...
          </>
        ) : (
          <>
            <Play size={18} /> Ejecutar Prueba
          </>
        )}
      </button>
      {renderResults()}
    </div>
  );
};

export default StatisticalTests;

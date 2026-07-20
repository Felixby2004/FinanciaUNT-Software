// src/services/openaiService.js
const fallbackReply = (message, context = {}) => {
  const lower = message.toLowerCase();
  if (lower.includes('presupuesto') || lower.includes('gasto')) {
    return `Revisé tu panorama financiero y te recomiendo priorizar tus gastos variables. Si tu gasto real supera tu presupuesto, reduce compras impulsivas y deja una reserva del 10% de tus ingresos para emergencias.`;
  }
  if (lower.includes('meta') || lower.includes('objetivo')) {
    return `Tu mejor estrategia es separar un monto fijo semanal hacia la meta y revisar tu progreso cada semana. Así mantienes el avance constante.`;
  }
  return `Estoy analizando tus finanzas. Con los datos disponibles, te recomiendo mantener un ahorro mensual constante y registrar cada movimiento para tomar mejores decisiones.`;
};

export const getFinancialAdvisorReply = async ({
  message,
  transactions = [],
  budgets = [],
  goals = [],
  userName = 'usuario',
  userPreferences = {},
}) => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || '';

  if (!apiKey) {
    return fallbackReply(message, { transactions, budgets, goals, userName, userPreferences });
  }

  try {
    const systemParts = [
      `Eres un asesor financiero amable y práctico para ${userName}. Responde en español, breve y útil, usando los datos del usuario cuando estén disponibles.`,
    ];

    if (userPreferences && Object.keys(userPreferences).length > 0) {
      systemParts.push(`Preferencias del usuario: ${JSON.stringify(userPreferences)}`);
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: systemParts.join('\n'),
          },
          {
            role: 'user',
            content: `Pregunta del usuario: ${message}\n\nContexto financiero: ${JSON.stringify({ transactions, budgets, goals })}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error('No se pudo contactar con la IA');
    }

    const data = await response.json();
    return data?.choices?.[0]?.message?.content || fallbackReply(message);
  } catch (error) {
    console.error('Error generating AI response:', error);
    return fallbackReply(message);
  }
};
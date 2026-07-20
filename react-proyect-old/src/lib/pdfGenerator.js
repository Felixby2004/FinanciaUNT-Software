import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const COLORS = {
  primary: [102, 126, 234],
  secondary: [118, 75, 162],
  success: [34, 197, 94],
  danger: [239, 68, 68],
  warning: [234, 179, 8],
  dark: [30, 41, 59],
  light: [241, 245, 249],
  white: [255, 255, 255],
  gray: [100, 116, 139],
  muted: [148, 163, 184],
};

const safeSetFillColor = (doc, color) => {
  if (Array.isArray(color) && color.length === 3) {
    doc.setFillColor(color[0], color[1], color[2]);
  } else {
    doc.setFillColor(200, 200, 200);
  }
};

const safeSetDrawColor = (doc, color) => {
  if (Array.isArray(color) && color.length === 3) {
    doc.setDrawColor(color[0], color[1], color[2]);
  } else {
    doc.setDrawColor(200, 200, 200);
  }
};

const safeSetTextColor = (doc, color) => {
  if (Array.isArray(color) && color.length === 3) {
    doc.setTextColor(color[0], color[1], color[2]);
  } else {
    doc.setTextColor(30, 41, 59);
  }
};

export const generatePDFReport = ({
  userName = 'Usuario',
  transactions = [],
  budgets = [],
  goals = [],
  plan = 'basic',
  baseCurrency = 'PEN',
  recommendations = [],
  prediction = null,
}) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  let yPosition = 28;

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '—';
    try {
      return new Intl.NumberFormat('es-PE', { style: 'currency', currency: baseCurrency, minimumFractionDigits: 2 }).format(amount);
    } catch {
      return `S/ ${Number(amount).toFixed(2)}`;
    }
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const addLine = (x, y, width, color) => {
    safeSetDrawColor(doc, color);
    doc.setLineWidth(0.4);
    doc.line(x, y, x + width, y);
  };

  const addSectionTitle = (title) => {
    if (yPosition > 250) { doc.addPage(); yPosition = 30; }
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    safeSetTextColor(doc, COLORS.dark);
    doc.text(`- ${title}`, margin, yPosition);
    yPosition += 4;
    addLine(margin, yPosition, pageWidth - margin * 2, COLORS.primary);
    yPosition += 5;
  };

  // Métricas
  const totalIncome = transactions.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
  const totalExpenses = transactions.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;
  const expenseDays = new Set(transactions.filter(t => t.tipo === 'gasto').map(t => t.fecha?.split('T')[0] || '')).size;
  const avgDailyExpense = expenseDays > 0 ? totalExpenses / expenseDays : 0;

  const expensesByCategory = transactions.filter(t => t.tipo === 'gasto').reduce((acc, t) => {
    const cat = t.categoria || 'Sin categoría';
    acc[cat] = (acc[cat] || 0) + t.monto;
    return acc;
  }, {});
  let topCategory = '—', topCategoryAmount = 0;
  for (const [cat, amount] of Object.entries(expensesByCategory)) {
    if (amount > topCategoryAmount) { topCategory = cat; topCategoryAmount = amount; }
  }

  // Portada
  const addCover = () => {
    doc.setPage(1);
    safeSetFillColor(doc, [245, 247, 250]);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    safeSetFillColor(doc, COLORS.primary);
    doc.rect(0, 0, pageWidth, 6, 'F');

    doc.setFontSize(42);
    doc.setFont('helvetica', 'bold');
    safeSetTextColor(doc, COLORS.primary);
    doc.text('FinanciaUNT', pageWidth / 2, 70, { align: 'center' });

    safeSetDrawColor(doc, COLORS.secondary);
    doc.setLineWidth(1);
    doc.line(pageWidth / 2 - 35, 80, pageWidth / 2 + 35, 80);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'normal');
    safeSetTextColor(doc, COLORS.dark);
    doc.text('Reporte Financiero', pageWidth / 2, 100, { align: 'center' });

    doc.setFontSize(11);
    safeSetTextColor(doc, COLORS.gray);
    doc.text(`Generado para: ${userName}`, pageWidth / 2, 128, { align: 'center' });
    const dateStr = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(`Fecha: ${dateStr}`, pageWidth / 2, 142, { align: 'center' });

    const planLabels = { basic: 'Basico', premium: 'Premium', enterprise: 'Enterprise' };
    const planColors = { basic: COLORS.gray, premium: COLORS.primary, enterprise: COLORS.secondary };
    const badgeColor = planColors[plan] || COLORS.gray;
    safeSetFillColor(doc, badgeColor);
    safeSetDrawColor(doc, badgeColor);
    doc.roundedRect(pageWidth / 2 - 25, 160, 50, 10, 5, 5, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    safeSetTextColor(doc, COLORS.white);
    doc.text(planLabels[plan] || plan, pageWidth / 2, 167.5, { align: 'center' });

    if (transactions.length > 0) {
      const totalTx = transactions.length;
      const incomeTx = transactions.filter(t => t.tipo === 'ingreso').length;
      const expenseTx = transactions.filter(t => t.tipo === 'gasto').length;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeSetTextColor(doc, COLORS.gray);
      doc.text(`Transacciones: ${totalTx}  ·  Ingresos: ${incomeTx}  ·  Gastos: ${expenseTx}`, pageWidth / 2, 190, { align: 'center' });
    }

    doc.setFontSize(9);
    safeSetTextColor(doc, COLORS.muted);
    doc.text('Generado automaticamente por FinanciaUNT', pageWidth / 2, pageHeight - 20, { align: 'center' });
  };

  addCover();
  doc.addPage();
  yPosition = 28;

  // Resumen Ejecutivo
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  safeSetTextColor(doc, COLORS.primary);
  doc.text('Resumen Ejecutivo', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  safeSetTextColor(doc, COLORS.gray);
  doc.text(`Analisis basado en ${transactions.length} transacciones.`, margin, yPosition);
  yPosition += 6;

  const cardWidth = (pageWidth - margin * 2 - 6) / 3;
  const startX = margin;

  const renderCard = (x, y, label, value, color, bgColor) => {
    safeSetFillColor(doc, bgColor);
    safeSetDrawColor(doc, color);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardWidth, 18, 3, 3, 'FD');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    safeSetTextColor(doc, color);
    doc.text(label, x + 3, y + 5);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    safeSetTextColor(doc, COLORS.dark);
    doc.text(value, x + 3, y + 15);
  };

  renderCard(startX, yPosition, 'Ingresos', formatCurrency(totalIncome), COLORS.success, [220, 252, 231]);
  renderCard(startX + cardWidth + 3, yPosition, 'Gastos', formatCurrency(totalExpenses), COLORS.danger, [254, 226, 226]);
  const savingsColor = netSavings >= 0 ? COLORS.success : COLORS.danger;
  const savingsBg = netSavings >= 0 ? [220, 252, 231] : [254, 226, 226];
  renderCard(startX + cardWidth * 2 + 6, yPosition, 'Ahorro Neto', formatCurrency(netSavings), savingsColor, savingsBg);
  yPosition += 24;

  // Segunda fila
  const row2 = yPosition;
  safeSetFillColor(doc, [245, 247, 250]);
  safeSetDrawColor(doc, COLORS.light);
  doc.roundedRect(margin, row2, pageWidth - margin * 2, 16, 3, 3, 'FD');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  safeSetTextColor(doc, COLORS.gray);
  doc.text(`Tasa de ahorro: ${savingsRate.toFixed(1)}%`, margin + 5, row2 + 6);

  // Barra de progreso visual (rectángulo)
  const barWidth = 35, barX = margin + 45, barY = row2 + 4;
  safeSetDrawColor(doc, COLORS.light);
  safeSetFillColor(doc, COLORS.light);
  doc.rect(barX, barY, barWidth, 4, 'F');
  const progress = Math.min(Math.max(savingsRate / 100, 0), 1);
  safeSetFillColor(doc, COLORS.primary);
  doc.rect(barX, barY, barWidth * progress, 4, 'F');

  doc.text(`Promedio diario: ${formatCurrency(avgDailyExpense)}`, margin + 90, row2 + 6);
  doc.text(`Categoria top: ${topCategory} (${formatCurrency(topCategoryAmount)})`, margin + 160, row2 + 6);
  yPosition = row2 + 22;

  // Gastos por categoría (solo porcentaje, sin barras de caracteres)
  if (Object.keys(expensesByCategory).length > 0) {
    addSectionTitle('Gastos por Categoria');
    const sorted = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1]);
    const tableData = sorted.map(([cat, amount]) => {
      const percent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
      return [cat, formatCurrency(amount), `${percent.toFixed(1)}%`];
    });
    autoTable(doc, {
      startY: yPosition,
      head: [['Categoria', 'Monto', '% del total']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 'auto', halign: 'left' }, 1: { cellWidth: 30, halign: 'right' }, 2: { cellWidth: 22, halign: 'center' } },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
    });
    yPosition = doc.lastAutoTable.finalY + 8;
  }

  // Presupuestos (solo porcentaje y estado)
  if (budgets.length > 0 && transactions.length > 0) {
    addSectionTitle('Comparacion con Presupuestos');
    const budgetData = budgets.map(b => {
      const spent = expensesByCategory[b.categoria] || 0;
      const percent = b.monto_maximo > 0 ? (spent / b.monto_maximo) * 100 : 0;
      const status = percent > 100 ? 'Excedido' : 'OK';
      return [b.categoria, formatCurrency(spent), formatCurrency(b.monto_maximo), `${percent.toFixed(1)}%`, status];
    });
    autoTable(doc, {
      startY: yPosition,
      head: [['Categoria', 'Gasto Real', 'Presupuesto', '% Uso', 'Estado']],
      body: budgetData,
      theme: 'grid',
      headStyles: { fillColor: COLORS.secondary, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 'auto', halign: 'left' }, 1: { cellWidth: 22, halign: 'right' }, 2: { cellWidth: 22, halign: 'right' }, 3: { cellWidth: 18, halign: 'center' }, 4: { cellWidth: 18, halign: 'center' } },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const status = budgetData[data.row.index]?.[4] || '';
          if (status === 'Excedido') doc.setTextColor(239, 68, 68);
          else doc.setTextColor(34, 197, 94);
        }
      },
    });
    yPosition = doc.lastAutoTable.finalY + 8;
  }

  // Metas (solo porcentaje y estado)
  if (goals.length > 0) {
    addSectionTitle('Metas Financieras');
    const goalsData = goals.map(g => {
      const progress = g.monto_objetivo > 0 ? (g.monto_actual / g.monto_objetivo) * 100 : 0;
      const status = progress >= 100 ? 'Lograda' : 'En progreso';
      return [
        g.nombre || 'Meta sin nombre',
        formatCurrency(g.monto_actual || 0),
        formatCurrency(g.monto_objetivo || 0),
        `${Math.min(100, progress).toFixed(1)}%`,
        status,
        g.fecha_limite ? formatDate(g.fecha_limite) : '—',
      ];
    });
    autoTable(doc, {
      startY: yPosition,
      head: [['Meta', 'Actual', 'Objetivo', 'Progreso', 'Estado', 'Fecha limite']],
      body: goalsData,
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7, cellPadding: 2, valign: 'middle' },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 'auto', halign: 'left' }, 1: { cellWidth: 20, halign: 'right' }, 2: { cellWidth: 20, halign: 'right' }, 3: { cellWidth: 16, halign: 'center' }, 4: { cellWidth: 20, halign: 'center' }, 5: { cellWidth: 22, halign: 'center' } },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const status = goalsData[data.row.index]?.[4] || '';
          if (status === 'Lograda') doc.setTextColor(34, 197, 94);
          else doc.setTextColor(234, 179, 8);
        }
      },
    });
    yPosition = doc.lastAutoTable.finalY + 8;
  }

  // Recomendaciones IA
  if (plan !== 'basic' && recommendations && recommendations.length > 0) {
    addSectionTitle('Recomendaciones IA Aplicadas');
    const recData = recommendations.map((rec, idx) => [
      `${idx + 1}`,
      rec.description || rec.recommendation || 'Sin descripcion',
      rec.modelType ? (rec.modelType === 'RULES' ? 'Reglas' : rec.modelType === 'COLLAB' ? 'Colaborativo' : 'Optimizador') : 'IA',
      rec.estimatedImpact ? formatCurrency(rec.estimatedImpact) : formatCurrency(0),
    ]);
    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Recomendacion', 'Modelo', 'Ahorro estimado']],
      body: recData,
      theme: 'grid',
      headStyles: { fillColor: COLORS.secondary, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 1: { cellWidth: 'auto', halign: 'left' }, 2: { cellWidth: 22, halign: 'center' }, 3: { cellWidth: 28, halign: 'right' } },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
    });
    yPosition = doc.lastAutoTable.finalY + 8;
  }

  // Pronóstico
  if (plan !== 'basic' && prediction) {
    const forecastMonths = plan === 'enterprise' ? 12 : 3;
    addSectionTitle(`Pronostico a ${forecastMonths} meses`);
    const monthLabels = [];
    const incomeForecast = [], expenseForecast = [], savingsForecast = [];
    const baseIncome = prediction.projectedIncome || totalIncome || 0;
    const baseExpense = prediction.projectedExpense || totalExpenses || 0;
    const growthRate = 0.02;
    for (let i = 0; i < forecastMonths; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      monthLabels.push(date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }));
      const inc = baseIncome * Math.pow(1 + growthRate, i);
      const exp = baseExpense * Math.pow(1 + growthRate * 0.8, i);
      incomeForecast.push(inc);
      expenseForecast.push(exp);
      savingsForecast.push(inc - exp);
    }
    const forecastData = monthLabels.map((label, idx) => [
      label,
      formatCurrency(incomeForecast[idx]),
      formatCurrency(expenseForecast[idx]),
      formatCurrency(savingsForecast[idx]),
    ]);
    autoTable(doc, {
      startY: yPosition,
      head: [['Mes', 'Ingreso', 'Gasto', 'Ahorro']],
      body: forecastData,
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 'auto', halign: 'center' }, 1: { cellWidth: 'auto', halign: 'right' }, 2: { cellWidth: 'auto', halign: 'right' }, 3: { cellWidth: 'auto', halign: 'right' } },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
    });
    yPosition = doc.lastAutoTable.finalY + 8;
  }

  // Auditoría (Enterprise)
  if (plan === 'enterprise') {
    addSectionTitle('Auditoria de Anomalias');
    const expenseList = transactions.filter(t => t.tipo === 'gasto').map(t => t.monto);
    const avg = expenseList.reduce((s, v) => s + v, 0) / (expenseList.length || 1);
    const std = Math.sqrt(expenseList.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (expenseList.length || 1));
    const threshold = avg + 2 * std;
    const anomalies = transactions
      .filter(t => t.tipo === 'gasto' && t.monto > threshold)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10)
      .map(t => [formatDate(t.fecha), t.categoria || 'Sin categoria', t.descripcion || '', formatCurrency(t.monto), `> ${formatCurrency(threshold)}`]);
    if (anomalies.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Fecha', 'Categoria', 'Descripcion', 'Monto', 'Umbral']],
        body: anomalies,
        theme: 'grid',
        headStyles: { fillColor: COLORS.danger, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: { 0: { cellWidth: 'auto', halign: 'center' }, 1: { cellWidth: 'auto', halign: 'left' }, 2: { cellWidth: 'auto', halign: 'left' }, 3: { cellWidth: 22, halign: 'right' }, 4: { cellWidth: 22, halign: 'right' } },
        margin: { left: margin },
        tableWidth: pageWidth - margin * 2,
      });
      yPosition = doc.lastAutoTable.finalY + 8;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      safeSetTextColor(doc, COLORS.success);
      doc.text('No se detectaron transacciones anomalas en el periodo.', margin, yPosition);
      yPosition += 10;
    }
  }

  // Transacciones Recientes
  const txLimit = plan === 'basic' ? 10 : plan === 'premium' ? 20 : 30;
  if (transactions.length > 0) {
    addSectionTitle(`Transacciones Recientes (ultimas ${txLimit})`);
    const recentTx = [...transactions]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, txLimit)
      .map(t => [
        formatDate(t.fecha),
        t.categoria || 'Sin categoria',
        t.descripcion || '',
        t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
        `${t.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(t.monto)}`,
        t.tipo === 'ingreso' ? 1 : -1,
      ]);
    autoTable(doc, {
      startY: yPosition,
      head: [['Fecha', 'Categoria', 'Descripcion', 'Tipo', 'Monto']],
      body: recentTx.map(row => row.slice(0, 5)),
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold', halign: 'center' },
      bodyStyles: { fontSize: 7, cellPadding: 2 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: { 0: { cellWidth: 'auto', halign: 'center' }, 1: { cellWidth: 'auto', halign: 'left' }, 2: { cellWidth: 'auto', halign: 'left' }, 3: { cellWidth: 18, halign: 'center' }, 4: { cellWidth: 28, halign: 'right' } },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const sign = recentTx[data.row.index]?.[5] || 0;
          doc.setTextColor(sign > 0 ? 34 : 239, sign > 0 ? 197 : 68, sign > 0 ? 94 : 68);
        }
      },
    });
    yPosition = doc.lastAutoTable.finalY + 8;
  }

  // Consejos Financieros
  addSectionTitle('Consejos Financieros');
  const tips = [];
  if (netSavings < 0) tips.push('Tus gastos superan tus ingresos. Considera reducir gastos no esenciales.');
  if (savingsRate < 10 && totalIncome > 0) tips.push('Tu tasa de ahorro es baja. Intenta ahorrar al menos el 10% de tus ingresos.');
  if (topCategory && topCategoryAmount > totalExpenses * 0.4) {
    tips.push(`Tu gasto en "${topCategory}" representa mas del 40% de tus gastos totales. Revisa si puedes reducirlo.`);
  }
  if (transactions.length < 5) tips.push('Registra mas transacciones para obtener analisis mas precisos.');
  if (tips.length === 0) tips.push('Buen trabajo! Tus finanzas estan en buen camino. Sigue asi.');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  safeSetTextColor(doc, COLORS.dark);
  tips.forEach((tip) => {
    if (yPosition > 250) { doc.addPage(); yPosition = 30; }
    doc.text(`- ${tip}`, margin + 2, yPosition);
    yPosition += 6;
  });
  yPosition += 4;

  // Página de cierre
  doc.addPage();
  yPosition = 80;
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  safeSetTextColor(doc, COLORS.primary);
  doc.text('Gracias por confiar en', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('FinanciaUNT!', pageWidth / 2, yPosition + 10, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  safeSetTextColor(doc, COLORS.gray);
  doc.text('Este reporte ha sido generado para ayudarte a tomar mejores decisiones financieras.', pageWidth / 2, yPosition + 35, { align: 'center' });
  doc.text('Sigue monitoreando tus finanzas para alcanzar tus metas.', pageWidth / 2, yPosition + 46, { align: 'center' });

  doc.setFontSize(9);
  safeSetTextColor(doc, COLORS.muted);
  doc.text(`Reporte generado el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, yPosition + 70, { align: 'center' });

  // Encabezado y pie en todas las páginas
  const pageCount = doc.internal.getNumberOfPages();
  const planLabels = { basic: 'Basico', premium: 'Premium', enterprise: 'Enterprise' };
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    safeSetTextColor(doc, COLORS.muted);
    doc.text('FinanciaUNT - Reporte financiero', margin, 9);
    doc.text(`Plan: ${planLabels[plan] || plan}`, pageWidth - margin, 9, { align: 'right' });
    addLine(margin, 12, pageWidth - margin * 2, COLORS.light);

    doc.setDrawColor(COLORS.light[0], COLORS.light[1], COLORS.light[2]);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    safeSetTextColor(doc, COLORS.gray);
    doc.text(`FinanciaUNT · ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin, pageHeight - 7);
    doc.text(`Pagina ${i}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  doc.save(`reporte_financiero_${new Date().toISOString().split('T')[0]}.pdf`);
};
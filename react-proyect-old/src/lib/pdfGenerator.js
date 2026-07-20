import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Colores corporativos
const COLORS = {
  primary: [102, 126, 234],   // #667eea
  secondary: [118, 75, 162],  // #764ba2
  success: [34, 197, 94],     // #22c55e
  danger: [239, 68, 68],      // #ef4444
  warning: [234, 179, 8],     // #eab308
  dark: [30, 41, 59],         // #1e293b
  light: [241, 245, 249],     // #f1f5f9
  white: [255, 255, 255],
  gray: [100, 116, 139],      // #64748b
  muted: [148, 163, 184],     // #94a3b8
};

/**
 * Genera un reporte financiero en PDF con diseño profesional adaptado al plan.
 */
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
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  let yPosition = 30;

  // ==================== UTILIDADES ====================
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const addLine = (x, y, width, color = COLORS.primary, dash = false) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    if (dash) {
      doc.setLineDashPattern([2, 2], 0);
    } else {
      doc.setLineDashPattern([], 0);
    }
    doc.line(x, y, x + width, y);
    doc.setLineDashPattern([], 0); // reset
  };

  const addSectionTitle = (title, icon = '◆') => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
      addHeaderFooter(doc, plan);
    }
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(`${icon} ${title}`, margin, yPosition);
    yPosition += 4;
    addLine(margin, yPosition, pageWidth - margin * 2, COLORS.primary);
    yPosition += 6;
  };

  const addHeaderFooter = (doc, plan) => {
    const pageCount = doc.internal.getNumberOfPages();
    const currentPage = doc.internal.getCurrentPage();
    // Encabezado en todas las páginas (excepto la portada)
    if (currentPage > 1) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.muted);
      doc.text('FinanciaUNT · Reporte financiero', margin, 10);
      const planLabels = { basic: 'Básico', premium: 'Premium', enterprise: 'Enterprise' };
      doc.text(`Plan: ${planLabels[plan] || plan}`, pageWidth - margin, 10, { align: 'right' });
      addLine(margin, 13, pageWidth - margin * 2, COLORS.light);
    }
    // Pie de página (todas)
    doc.setDrawColor(...COLORS.light);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(
      `FinanciaUNT · ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Página ${currentPage}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  };

  // ==================== PORTADA ====================
  const addCover = () => {
    doc.setPage(1);
    // Fondo degradado (simulado con rectángulos)
    doc.setFillColor(245, 247, 250);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Línea decorativa superior
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Logo (textual)
    doc.setFontSize(48);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.primary);
    doc.text('FinanciaUNT', pageWidth / 2, 80, { align: 'center' });

    // Línea decorativa
    doc.setDrawColor(...COLORS.secondary);
    doc.setLineWidth(1);
    doc.line(pageWidth / 2 - 40, 90, pageWidth / 2 + 40, 90);

    doc.setFontSize(22);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.dark);
    doc.text('Reporte Financiero', pageWidth / 2, 110, { align: 'center' });

    doc.setFontSize(12);
    doc.setTextColor(...COLORS.gray);
    doc.text(`Generado para: ${userName}`, pageWidth / 2, 140, { align: 'center' });
    doc.text(
      `Fecha: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
      pageWidth / 2,
      155,
      { align: 'center' }
    );

    // Badge de plan
    const planLabels = { basic: 'Básico', premium: 'Premium', enterprise: 'Enterprise' };
    const planColors = { basic: COLORS.gray, premium: COLORS.primary, enterprise: COLORS.secondary };
    const badgeColor = planColors[plan] || COLORS.gray;
    doc.setFillColor(...badgeColor);
    doc.setDrawColor(...badgeColor);
    doc.roundedRect(pageWidth / 2 - 25, 175, 50, 10, 5, 5, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(planLabels[plan] || plan, pageWidth / 2, 182.5, { align: 'center' });

    // Resumen de actividad (solo si hay transacciones)
    if (transactions.length > 0) {
      const totalTx = transactions.length;
      const incomeTx = transactions.filter(t => t.tipo === 'ingreso').length;
      const expenseTx = transactions.filter(t => t.tipo === 'gasto').length;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.gray);
      doc.text(
        `Transacciones: ${totalTx}  ·  Ingresos: ${incomeTx}  ·  Gastos: ${expenseTx}`,
        pageWidth / 2,
        205,
        { align: 'center' }
      );
    }

    // Pie de portada
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text('Generado automáticamente por FinanciaUNT', pageWidth / 2, pageHeight - 20, { align: 'center' });
  };

  // ==================== MÉTRICAS Y DATOS ====================
  const totalIncome = transactions.filter(t => t.tipo === 'ingreso').reduce((s, t) => s + t.monto, 0);
  const totalExpenses = transactions.filter(t => t.tipo === 'gasto').reduce((s, t) => s + t.monto, 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  // Gasto promedio diario
  const expenseDays = new Set(transactions.filter(t => t.tipo === 'gasto').map(t => t.fecha?.split('T')[0] || '')).size;
  const avgDailyExpense = expenseDays > 0 ? totalExpenses / expenseDays : 0;

  // Categoría con mayor gasto
  const expensesByCategory = transactions
    .filter(t => t.tipo === 'gasto')
    .reduce((acc, t) => {
      const cat = t.categoria || 'Sin categoría';
      acc[cat] = (acc[cat] || 0) + t.monto;
      return acc;
    }, {});
  let topCategory = '—';
  let topCategoryAmount = 0;
  for (const [cat, amount] of Object.entries(expensesByCategory)) {
    if (amount > topCategoryAmount) {
      topCategory = cat;
      topCategoryAmount = amount;
    }
  }

  // Mes con mayor gasto
  const monthlyExpenses = transactions
    .filter(t => t.tipo === 'gasto')
    .reduce((acc, t) => {
      const month = t.fecha ? t.fecha.substring(0, 7) : 'desconocido';
      acc[month] = (acc[month] || 0) + t.monto;
      return acc;
    }, {});
  let topMonth = '—';
  let topMonthAmount = 0;
  for (const [month, amount] of Object.entries(monthlyExpenses)) {
    if (amount > topMonthAmount) {
      topMonth = month;
      topMonthAmount = amount;
    }
  }

  // ==================== CONSTRUCCIÓN DEL PDF ====================
  // Portada
  addCover();
  doc.addPage();
  yPosition = 30;
  addHeaderFooter(doc, plan);

  // -------------------- 1. Resumen Ejecutivo --------------------
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Resumen Ejecutivo', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(
    `Análisis de tus finanzas basado en ${transactions.length} transacciones registradas.`,
    margin,
    yPosition
  );
  yPosition += 6;

  // Tarjetas de resumen (3 columnas)
  const cardWidth = (pageWidth - margin * 2 - 6) / 3;
  const startX = margin;

  const renderCard = (x, y, label, value, color, bgColor, icon = '') => {
    doc.setFillColor(...bgColor);
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y, cardWidth, 20, 3, 3, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...color);
    doc.text(`${icon} ${label}`, x + 4, y + 6);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(value, x + 4, y + 17);
  };

  renderCard(startX, yPosition, 'Ingresos', formatCurrency(totalIncome), COLORS.success, [220, 252, 231], '📈');
  renderCard(startX + cardWidth + 3, yPosition, 'Gastos', formatCurrency(totalExpenses), COLORS.danger, [254, 226, 226], '📉');
  renderCard(startX + cardWidth * 2 + 6, yPosition, 'Ahorro Neto', formatCurrency(netSavings), netSavings >= 0 ? COLORS.success : COLORS.danger, [220, 252, 231], '💰');
  yPosition += 26;

  // Segunda fila de métricas
  const row2 = yPosition;
  doc.setFillColor([245, 247, 250]);
  doc.setDrawColor(...COLORS.light);
  doc.roundedRect(margin, row2, pageWidth - margin * 2, 18, 3, 3, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(`Tasa de ahorro: ${savingsRate.toFixed(1)}%`, margin + 6, row2 + 7);
  // Barra de progreso
  const barWidth = 40;
  const barX = margin + 50;
  const barY = row2 + 4;
  doc.setDrawColor(...COLORS.light);
  doc.setFillColor(...COLORS.light);
  doc.rect(barX, barY, barWidth, 5, 'F');
  const progress = Math.min(Math.max(savingsRate / 100, 0), 1);
  doc.setFillColor(...COLORS.primary);
  doc.rect(barX, barY, barWidth * progress, 5, 'F');
  // Otros datos
  doc.text(`Promedio diario: ${formatCurrency(avgDailyExpense)}`, margin + 100, row2 + 7);
  doc.text(`Categoría top: ${topCategory} (${formatCurrency(topCategoryAmount)})`, margin + 180, row2 + 7);

  yPosition = row2 + 24;

  // -------------------- 2. Gastos por Categoría --------------------
  if (Object.keys(expensesByCategory).length > 0) {
    addSectionTitle('Gastos por Categoría', '◆');

    const sortedCategories = Object.entries(expensesByCategory)
      .sort((a, b) => b[1] - a[1]);

    const tableData = sortedCategories.map(([cat, amount]) => {
      const percent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
      const barLength = Math.round((percent / 100) * 20);
      const bar = '█'.repeat(Math.min(barLength, 20)) + '░'.repeat(Math.max(0, 20 - barLength));
      return [cat, formatCurrency(amount), `${percent.toFixed(1)}%`, bar];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Categoría', 'Monto', '% del total', 'Progreso']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 30, halign: 'right' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 50, halign: 'left' },
      },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          // Mostrar la barra en color según porcentaje
          const percent = parseFloat(data.cell.raw.replace(',', '.')) || 0;
          const color = percent > 70 ? COLORS.danger : percent > 40 ? COLORS.warning : COLORS.success;
          doc.setTextColor(...color);
        }
      },
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // -------------------- 3. Comparación con Presupuestos --------------------
  if (budgets.length > 0 && transactions.length > 0) {
    addSectionTitle('Comparación con Presupuestos', '◆');

    const budgetData = budgets.map((budget) => {
      const spent = expensesByCategory[budget.categoria] || 0;
      const percent = budget.monto_maximo > 0 ? (spent / budget.monto_maximo) * 100 : 0;
      const status = percent > 100 ? 'Excedido ⚠️' : 'OK ✓';
      const barLength = Math.round(Math.min(percent, 100) / 5);
      const bar = '█'.repeat(Math.min(barLength, 20)) + '░'.repeat(Math.max(0, 20 - barLength));
      return [budget.categoria, formatCurrency(spent), formatCurrency(budget.monto_maximo), `${percent.toFixed(1)}%`, bar, status, percent > 100 ? COLORS.danger : COLORS.success];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Categoría', 'Gasto Real', 'Presupuesto', '% Uso', 'Progreso', 'Estado']],
      body: budgetData.map(row => row.slice(0, 6)),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.secondary,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 25, halign: 'right' },
        2: { cellWidth: 25, halign: 'right' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 40, halign: 'left' },
        5: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const status = budgetData[data.row.index]?.[5] || '';
          const isExceeded = status.includes('Excedido');
          doc.setTextColor(isExceeded ? 239 : 34, isExceeded ? 68 : 197, isExceeded ? 68 : 94);
        }
      },
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // -------------------- 4. Metas Financieras --------------------
  if (goals.length > 0) {
    addSectionTitle('Metas Financieras', '◆');

    const goalsData = goals.map((goal) => {
      const progress = goal.monto_objetivo > 0 ? (goal.monto_actual / goal.monto_objetivo) * 100 : 0;
      const status = progress >= 100 ? 'Lograda ✓' : 'En progreso';
      const barLength = Math.round(Math.min(progress, 100) / 5);
      const bar = '█'.repeat(Math.min(barLength, 20)) + '░'.repeat(Math.max(0, 20 - barLength));
      return [
        goal.nombre || 'Meta sin nombre',
        formatCurrency(goal.monto_actual || 0),
        formatCurrency(goal.monto_objetivo || 0),
        `${Math.min(100, progress).toFixed(1)}%`,
        bar,
        status,
        progress >= 100 ? COLORS.success : COLORS.warning,
        goal.fecha_limite ? formatDate(goal.fecha_limite) : '—',
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Meta', 'Actual', 'Objetivo', 'Progreso', 'Avance', 'Estado', 'Fecha límite']],
      body: goalsData.map(row => row.slice(0, 7)),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 20, halign: 'right' },
        2: { cellWidth: 20, halign: 'right' },
        3: { cellWidth: 18, halign: 'center' },
        4: { cellWidth: 35, halign: 'left' },
        5: { cellWidth: 25, halign: 'center' },
        6: { cellWidth: 25, halign: 'center' },
      },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 5) {
          const status = goalsData[data.row.index]?.[5] || '';
          doc.setTextColor(status.includes('Lograda') ? 34 : 234, status.includes('Lograda') ? 197 : 179, status.includes('Lograda') ? 94 : 8);
        }
      },
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // -------------------- 5. Recomendaciones IA (Premium/Enterprise) --------------------
  if (plan !== 'basic' && recommendations && recommendations.length > 0) {
    addSectionTitle('Recomendaciones IA Aplicadas', '◆');

    const recData = recommendations.map((rec, idx) => [
      `${idx + 1}`,
      rec.description || rec.recommendation || 'Sin descripción',
      rec.modelType ? (rec.modelType === 'RULES' ? 'Reglas' : rec.modelType === 'COLLAB' ? 'Colaborativo' : 'Optimizador') : 'IA',
      rec.estimatedImpact ? formatCurrency(rec.estimatedImpact) : formatCurrency(0),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['#', 'Recomendación', 'Modelo', 'Ahorro estimado']],
      body: recData,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.secondary,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // -------------------- 6. Pronóstico (Premium/Enterprise) --------------------
  if (plan !== 'basic' && prediction) {
    const forecastMonths = plan === 'enterprise' ? 12 : 3;
    addSectionTitle(`Pronóstico a ${forecastMonths} meses`, '◆');

    const monthLabels = [];
    const incomeForecast = [];
    const expenseForecast = [];
    const savingsForecast = [];

    const baseIncome = prediction.projectedIncome || totalIncome || 0;
    const baseExpense = prediction.projectedExpense || totalExpenses || 0;
    const growthRate = 0.02;

    for (let i = 0; i < forecastMonths; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() + i + 1);
      monthLabels.push(date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }));
      const income = baseIncome * Math.pow(1 + growthRate, i);
      const expense = baseExpense * Math.pow(1 + growthRate * 0.8, i);
      incomeForecast.push(income);
      expenseForecast.push(expense);
      savingsForecast.push(income - expense);
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
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'center' },
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 'auto', halign: 'right' },
        3: { cellWidth: 'auto', halign: 'right' },
      },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // -------------------- 7. Auditoría de Anomalías (Enterprise) --------------------
  if (plan === 'enterprise') {
    addSectionTitle('Auditoría de Anomalías', '◆');

    const expenseList = transactions.filter(t => t.tipo === 'gasto').map(t => t.monto);
    const avg = expenseList.reduce((s, v) => s + v, 0) / (expenseList.length || 1);
    const std = Math.sqrt(
      expenseList.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (expenseList.length || 1)
    );
    const threshold = avg + 2 * std;

    const anomalies = transactions
      .filter(t => t.tipo === 'gasto' && t.monto > threshold)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10)
      .map(t => [
        formatDate(t.fecha),
        t.categoria || 'Sin categoría',
        t.descripcion || '',
        formatCurrency(t.monto),
        `> ${formatCurrency(threshold)}`,
      ]);

    if (anomalies.length > 0) {
      autoTable(doc, {
        startY: yPosition,
        head: [['Fecha', 'Categoría', 'Descripción', 'Monto', 'Umbral']],
        body: anomalies,
        theme: 'grid',
        headStyles: {
          fillColor: COLORS.danger,
          textColor: [255, 255, 255],
          fontSize: 8,
          fontStyle: 'bold',
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3,
        },
        alternateRowStyles: {
          fillColor: [245, 247, 250],
        },
        columnStyles: {
          0: { cellWidth: 'auto', halign: 'center' },
          1: { cellWidth: 'auto', halign: 'left' },
          2: { cellWidth: 'auto', halign: 'left' },
          3: { cellWidth: 25, halign: 'right' },
          4: { cellWidth: 25, halign: 'right' },
        },
        margin: { left: margin },
        tableWidth: pageWidth - margin * 2,
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.success);
      doc.text('✅ No se detectaron transacciones anómalas en el periodo.', margin, yPosition);
      yPosition += 12;
    }
  }

  // -------------------- 8. Transacciones Recientes --------------------
  const txLimit = plan === 'basic' ? 10 : plan === 'premium' ? 20 : 30;
  if (transactions.length > 0) {
    addSectionTitle(`Transacciones Recientes (últimas ${txLimit})`, '◆');

    const recentTx = [...transactions]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, txLimit)
      .map(t => [
        formatDate(t.fecha),
        t.categoria || 'Sin categoría',
        t.descripcion || '',
        t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
        `${t.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(t.monto)}`,
        t.tipo === 'ingreso' ? 1 : -1,
      ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Fecha', 'Categoría', 'Descripción', 'Tipo', 'Monto']],
      body: recentTx.map(row => row.slice(0, 5)),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'center' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 'auto', halign: 'left' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 30, halign: 'right' },
      },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const sign = recentTx[data.row.index]?.[5] || 0;
          doc.setTextColor(sign > 0 ? 34 : 239, sign > 0 ? 197 : 68, sign > 0 ? 94 : 68);
        }
      },
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // -------------------- 9. Consejos Financieros --------------------
  addSectionTitle('Consejos Financieros', '💡');
  const tips = [];
  if (netSavings < 0) {
    tips.push('Tus gastos superan tus ingresos. Considera reducir gastos no esenciales.');
  }
  if (savingsRate < 10 && totalIncome > 0) {
    tips.push('Tu tasa de ahorro es baja. Intenta ahorrar al menos el 10% de tus ingresos.');
  }
  if (topCategory && topCategoryAmount > totalExpenses * 0.4) {
    tips.push(`Tu gasto en "${topCategory}" representa más del 40% de tus gastos totales. Revisa si puedes reducirlo.`);
  }
  if (transactions.length < 5) {
    tips.push('Registra más transacciones para obtener análisis más precisos y mejores recomendaciones.');
  }
  if (tips.length === 0) {
    tips.push('¡Buen trabajo! Tus finanzas están en buen camino. Sigue así.');
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  tips.forEach((tip, idx) => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
      addHeaderFooter(doc, plan);
    }
    doc.text(`• ${tip}`, margin + 2, yPosition);
    yPosition += 7;
  });
  yPosition += 6;

  // -------------------- 10. Página de cierre --------------------
  doc.addPage();
  yPosition = 80;
  addHeaderFooter(doc, plan);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('¡Gracias por confiar en', pageWidth / 2, yPosition, { align: 'center' });
  doc.text('FinanciaUNT!', pageWidth / 2, yPosition + 12, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text('Este reporte ha sido generado para ayudarte a tomar mejores decisiones financieras.', pageWidth / 2, yPosition + 40, { align: 'center' });
  doc.text('Sigue monitoreando tus finanzas para alcanzar tus metas.', pageWidth / 2, yPosition + 52, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.muted);
  doc.text(`Reporte generado el ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, pageWidth / 2, yPosition + 80, { align: 'center' });

  // ==================== FIN ====================
  // Aplicar encabezados/pies en todas las páginas
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addHeaderFooter(doc, plan);
  }

  // Guardar PDF
  doc.save(`reporte_financiero_${new Date().toISOString().split('T')[0]}.pdf`);
};
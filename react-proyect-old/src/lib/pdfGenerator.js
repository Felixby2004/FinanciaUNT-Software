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
};

/**
 * Genera un reporte financiero en PDF con diseño profesional adaptado al plan.
 * Sin emojis para evitar caracteres extraños.
 */
export const generatePDFReport = ({
  userName,
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

  // --- Utilidades ---
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: baseCurrency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const addLine = (x, y, width, color = COLORS.primary) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.5);
    doc.line(x, y, x + width, y);
  };

  const addSectionTitle = (title, icon = '•') => {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 30;
    }
    // Línea decorativa superior
    addLine(margin, yPosition, 30, COLORS.secondary);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text(`${icon} ${title}`, margin + 2, yPosition + 5);
    yPosition += 12;
    // Línea inferior
    addLine(margin, yPosition - 2, pageWidth - margin * 2, COLORS.primary);
    yPosition += 5;
  };

  // --- Configuración de página ---
  // Encabezado
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('FinanciaUNT', margin, 22);

  // Línea decorativa
  addLine(margin, 27, 60, COLORS.secondary);

  // Fecha y plan (a la derecha)
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  const dateStr = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.text(`Generado: ${dateStr}`, pageWidth - margin, 18, { align: 'right' });

  // Badge del plan
  const planLabels = {
    basic: 'Básico',
    premium: 'Premium',
    enterprise: 'Enterprise',
  };
  const planColors = {
    basic: [100, 116, 139],
    premium: [102, 126, 234],
    enterprise: [118, 75, 162],
  };
  const badgeColor = planColors[plan] || COLORS.gray;
  doc.setFillColor(...badgeColor);
  doc.setDrawColor(...badgeColor);
  doc.roundedRect(pageWidth - margin - 35, 23, 35, 7, 3, 3, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(planLabels[plan] || plan, pageWidth - margin - 17.5, 28.5, { align: 'center' });

  // Salto
  yPosition = 40;

  // --- Información del usuario ---
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.dark);
  doc.text(`Usuario: ${userName}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Periodo analizado: ${transactions.length} transacciones`, margin, yPosition);
  yPosition += 6;
  doc.text(`Moneda base: ${baseCurrency}`, margin, yPosition);
  yPosition += 14;

  // Línea separadora
  addLine(margin, yPosition, pageWidth - margin * 2, COLORS.light);
  yPosition += 6;

  // --- Resumen Ejecutivo ---
  const totalIncome = transactions.filter((t) => t.tipo === 'ingreso').reduce((sum, t) => sum + t.monto, 0);
  const totalExpenses = transactions.filter((t) => t.tipo === 'gasto').reduce((sum, t) => sum + t.monto, 0);
  const netSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text('Resumen Ejecutivo', margin, yPosition + 2);
  yPosition += 10;

  // Tarjetas de resumen (sin emojis)
  const cardWidth = (pageWidth - margin * 2 - 6) / 3;
  const startX = margin;

  // Ingresos
  doc.setFillColor(220, 252, 231);
  doc.setDrawColor(...COLORS.success);
  doc.setLineWidth(0.5);
  doc.roundedRect(startX, yPosition, cardWidth, 22, 3, 3, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.success);
  doc.text('Ingresos', startX + 4, yPosition + 7);
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text(formatCurrency(totalIncome), startX + 4, yPosition + 18);

  // Gastos
  const x2 = startX + cardWidth + 3;
  doc.setFillColor(254, 226, 226);
  doc.setDrawColor(...COLORS.danger);
  doc.roundedRect(x2, yPosition, cardWidth, 22, 3, 3, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.danger);
  doc.text('Gastos', x2 + 4, yPosition + 7);
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text(formatCurrency(totalExpenses), x2 + 4, yPosition + 18);

  // Ahorro Neto
  const x3 = x2 + cardWidth + 3;
  const isPositive = netSavings >= 0;
  const colorSavings = isPositive ? COLORS.success : COLORS.danger;
  const bgColor = isPositive ? [220, 252, 231] : [254, 226, 226];
  doc.setFillColor(...bgColor);
  doc.setDrawColor(...colorSavings);
  doc.roundedRect(x3, yPosition, cardWidth, 22, 3, 3, 'FD');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorSavings);
  doc.text('Ahorro Neto', x3 + 4, yPosition + 7);
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.dark);
  doc.text(formatCurrency(netSavings), x3 + 4, yPosition + 18);

  yPosition += 28;

  // Tasa de ahorro con barra de progreso
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.gray);
  doc.text(`Tasa de ahorro: ${savingsRate.toFixed(1)}%`, margin, yPosition);
  const barWidth = 50;
  const barX = margin + 80;
  const barY = yPosition - 4;
  doc.setDrawColor(...COLORS.light);
  doc.setFillColor(...COLORS.light);
  doc.rect(barX, barY, barWidth, 5, 'F');
  const progress = Math.min(Math.max(savingsRate / 100, 0), 1);
  doc.setFillColor(...COLORS.primary);
  doc.rect(barX, barY, barWidth * progress, 5, 'F');
  yPosition += 14;

  // Línea separadora
  addLine(margin, yPosition, pageWidth - margin * 2, COLORS.light);
  yPosition += 6;

  // --- Gastos por Categoría ---
  if (transactions.length > 0) {
    addSectionTitle('Gastos por Categoría', '•');

    const expensesByCategory = {};
    transactions
      .filter((t) => t.tipo === 'gasto')
      .forEach((t) => {
        const cat = t.categoria || 'Sin categoría';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.monto;
      });

    const categoryData = Object.entries(expensesByCategory)
      .map(([category, amount]) => [
        category,
        formatCurrency(amount),
        totalExpenses > 0 ? `${((amount / totalExpenses) * 100).toFixed(1)}%` : '0%',
      ])
      .sort((a, b) => parseFloat(b[1].replace(/[^0-9.-]+/g, '')) - parseFloat(a[1].replace(/[^0-9.-]+/g, '')));

    autoTable(doc, {
      startY: yPosition,
      head: [['Categoría', 'Monto', 'Porcentaje']],
      body: categoryData,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 'auto', halign: 'center' },
      },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // --- Comparación con Presupuestos ---
  if (budgets.length > 0 && transactions.length > 0) {
    addSectionTitle('Comparación con Presupuestos', '•');

    const expensesByCategory = {};
    transactions
      .filter((t) => t.tipo === 'gasto')
      .forEach((t) => {
        const cat = t.categoria || 'Sin categoría';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + t.monto;
      });

    const budgetData = budgets.map((budget) => {
      const spent = expensesByCategory[budget.categoria] || 0;
      const percentage = budget.monto_maximo > 0 ? (spent / budget.monto_maximo) * 100 : 0;
      const status = percentage > 100 ? 'Excedido' : 'OK';
      return [
        budget.categoria,
        formatCurrency(spent),
        formatCurrency(budget.monto_maximo),
        `${percentage.toFixed(1)}%`,
        status,
        percentage > 100 ? COLORS.danger : COLORS.success,
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Categoría', 'Gasto Real', 'Presupuesto', '% Uso', 'Estado']],
      body: budgetData.map((row) => row.slice(0, 5)),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.secondary,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 'auto', halign: 'right' },
        3: { cellWidth: 'auto', halign: 'center' },
        4: { cellWidth: 'auto', halign: 'center' },
      },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 4) {
          const status = budgetData[data.row.index]?.[4] || '';
          if (status === 'Excedido') {
            doc.setTextColor(239, 68, 68);
          } else {
            doc.setTextColor(34, 197, 94);
          }
        }
      },
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // --- Metas Financieras ---
  if (goals.length > 0) {
    addSectionTitle('Metas Financieras', '•');

    const goalsData = goals.map((goal) => {
      const progress = goal.monto_objetivo > 0 ? (goal.monto_actual / goal.monto_objetivo) * 100 : 0;
      const status = progress >= 100 ? 'Lograda' : 'En progreso';
      return [
        goal.nombre || 'Meta sin nombre',
        formatCurrency(goal.monto_actual || 0),
        formatCurrency(goal.monto_objetivo || 0),
        `${Math.min(100, progress).toFixed(1)}%`,
        status,
        progress,
      ];
    });

    autoTable(doc, {
      startY: yPosition,
      head: [['Meta', 'Monto Actual', 'Monto Objetivo', 'Progreso', 'Estado']],
      body: goalsData.map((row) => row.slice(0, 5)),
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center',
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 3,
        valign: 'middle',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      columnStyles: {
        0: { cellWidth: 'auto', halign: 'left' },
        1: { cellWidth: 'auto', halign: 'right' },
        2: { cellWidth: 'auto', halign: 'right' },
        3: { cellWidth: 'auto', halign: 'center' },
        4: { cellWidth: 'auto', halign: 'center' },
      },
      margin: { left: margin },
      tableWidth: pageWidth - margin * 2,
      didDrawCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const progress = goalsData[data.row.index]?.[5] || 0;
          doc.setTextColor(progress >= 100 ? 34 : 239, progress >= 100 ? 197 : 68, progress >= 100 ? 94 : 68);
        }
        if (data.section === 'body' && data.column.index === 4) {
          const status = goalsData[data.row.index]?.[4] || '';
          if (status === 'Lograda') {
            doc.setTextColor(34, 197, 94);
          } else {
            doc.setTextColor(234, 179, 8);
          }
        }
      },
    });
    yPosition = doc.lastAutoTable.finalY + 10;
  }

  // --- SECCIONES EXCLUSIVAS PREMIUM / ENTERPRISE ---

  // 1. Recomendaciones IA aplicadas
  if (plan !== 'basic' && recommendations && recommendations.length > 0) {
    addSectionTitle('Recomendaciones IA Aplicadas', '•');

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

  // 2. Pronóstico
  if (plan !== 'basic' && prediction) {
    const forecastMonths = plan === 'enterprise' ? 12 : 3;
    addSectionTitle(`Pronóstico a ${forecastMonths} meses`, '•');

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
      head: [['Mes', 'Ingreso proyectado', 'Gasto proyectado', 'Ahorro proyectado']],
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

  // 3. Auditoría de Anomalías (Solo Enterprise)
  if (plan === 'enterprise') {
    addSectionTitle('Auditoría de Anomalías', '•');

    const expenseList = transactions.filter((t) => t.tipo === 'gasto').map((t) => t.monto);
    const avg = expenseList.reduce((s, v) => s + v, 0) / (expenseList.length || 1);
    const std = Math.sqrt(
      expenseList.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / (expenseList.length || 1)
    );
    const threshold = avg + 2 * std;

    const anomalies = transactions
      .filter((t) => t.tipo === 'gasto' && t.monto > threshold)
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 10)
      .map((t) => [
        new Date(t.fecha).toLocaleDateString('es-ES'),
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
          3: { cellWidth: 'auto', halign: 'right' },
          4: { cellWidth: 'auto', halign: 'right' },
        },
        margin: { left: margin },
        tableWidth: pageWidth - margin * 2,
      });
      yPosition = doc.lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.success);
      doc.text('No se detectaron transacciones anómalas en el periodo.', margin, yPosition);
      yPosition += 12;
    }
  }

  // --- Transacciones Recientes (limitadas por plan) ---
  const txLimit = plan === 'basic' ? 10 : plan === 'premium' ? 20 : 30;
  if (transactions.length > 0) {
    addSectionTitle(`Transacciones Recientes (ultimas ${txLimit})`, '•');

    const recentTx = [...transactions]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, txLimit)
      .map((t) => [
        new Date(t.fecha).toLocaleDateString('es-ES'),
        t.categoria || 'Sin categoría',
        t.descripcion || '',
        t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
        `${t.tipo === 'ingreso' ? '+' : '-'}${formatCurrency(t.monto)}`,
        t.tipo === 'ingreso' ? 1 : -1,
      ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Fecha', 'Categoría', 'Descripción', 'Tipo', 'Monto']],
      body: recentTx.map((row) => row.slice(0, 5)),
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
        3: { cellWidth: 'auto', halign: 'center' },
        4: { cellWidth: 'auto', halign: 'right' },
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

  // --- PIE DE PÁGINA (todas las páginas) ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Línea separadora
    doc.setDrawColor(...COLORS.light);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.gray);
    doc.text(
      `FinanciaUNT · Reporte generado el ${new Date().toLocaleDateString('es-ES')} · Plan ${planLabels[plan]}`,
      margin,
      pageHeight - 8
    );
    doc.text(
      `Pagina ${i} de ${pageCount}`,
      pageWidth - margin,
      pageHeight - 8,
      { align: 'right' }
    );
  }

  // Guardar PDF
  doc.save(`reporte_financiero_${new Date().toISOString().split('T')[0]}.pdf`);
};
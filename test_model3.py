#!/usr/bin/env python
"""
Script para testear que el Modelo 3 (Optimización de Ahorro) genera recomendaciones
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from models.recommenders import SavingsOptimizerRecommender
import json

# Crear datos de prueba
print("=" * 80)
print("TEST: Modelo 3 (Optimización de Ahorro)")
print("=" * 80)

# Simular transacciones variadas
dates = pd.date_range(start='2024-01-01', end='2024-07-12', freq='D')
transactions = []

categories = ['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud']

# Ingresos
for date in dates[::7]:  # Cada 7 días
    transactions.append({
        'usuario_id': 'user1',
        'tipo': 'ingreso',
        'categoria': 'Salario',
        'monto': 3000,
        'fecha': date,
        'descripcion': 'Salario'
    })

# Gastos con tendencias
for date in dates:
    # Añadir variabilidad en gastos
    trend_factor = 1 + ((date - dates[0]).days / len(dates)) * 0.2  # Aumento del 20%
    
    # Gasto base por categoría con tendencia
    if np.random.random() < 0.6:  # 60% probabilidad de gasto
        cat = np.random.choice(categories)
        base_amount = {
            'Alimentación': 100,
            'Transporte': 50,
            'Entretenimiento': 40,
            'Servicios': 150,
            'Salud': 30
        }.get(cat, 50)
        
        monto = base_amount * trend_factor * np.random.uniform(0.8, 1.2)
        
        transactions.append({
            'usuario_id': 'user1',
            'tipo': 'gasto',
            'categoria': cat,
            'monto': monto,
            'fecha': date,
            'descripcion': f'Gasto en {cat}'
        })

df_transactions = pd.DataFrame(transactions)

# Crear datos de metas vacíos
df_metas = pd.DataFrame()

# Crear recomendador
recommender = SavingsOptimizerRecommender()

print(f"\n📊 Datos de entrada:")
print(f"   - Transacciones: {len(df_transactions)}")
print(f"   - Período: {df_transactions['fecha'].min()} a {df_transactions['fecha'].max()}")
print(f"   - Ingresos totales: ${df_transactions[df_transactions['tipo'] == 'ingreso']['monto'].sum():.2f}")
print(f"   - Gastos totales: ${df_transactions[df_transactions['tipo'] == 'gasto']['monto'].sum():.2f}")

# Generar recomendaciones
print(f"\n🧠 Generando recomendaciones del Modelo 3...")
recommendations = recommender.generate_recommendations(df_transactions, df_metas)

print(f"\n✅ Recomendaciones generadas: {len(recommendations)}")

if recommendations:
    print(f"\n📋 Recomendaciones detalladas:\n")
    for idx, rec in enumerate(recommendations, 1):
        print(f"\n{idx}. [{rec['prioridad']}] {rec['categoria']}")
        print(f"   Tipo: {rec['tipo_recomendacion']}")
        print(f"   Recomendación: {rec['recomendacion']}")
        print(f"   Acción: {rec['accion']}")
        print(f"   Beneficio: {rec['beneficio']}")
        print(f"   Monto: ${rec['monto_recomendado']:.2f}")
else:
    print("\n⚠️ NO SE GENERARON RECOMENDACIONES - ESTO ES UN PROBLEMA")

print("\n" + "=" * 80)
print(f"TEST {'PASADO ✅' if recommendations else 'FALLIDO ❌'}")
print("=" * 80)

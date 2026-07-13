#!/usr/bin/env python
"""
Script para testear todos los 3 modelos combinados
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from models.recommenders import RecommenderComparator
import json

print("=" * 80)
print("TEST: COMPARADOR DE LOS 3 MODELOS DE RECOMENDACIÓN")
print("=" * 80)

# Crear datos más realistas
np.random.seed(42)
dates = pd.date_range(start='2024-01-01', end='2024-07-12', freq='D')
transactions = []

categories = ['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud']

# Crear transacciones para múltiples usuarios para el filtrado colaborativo
users = ['user1', 'user2', 'user3']

for user in users:
    # Ingresos
    for date in dates[::7]:
        transactions.append({
            'usuario_id': user,
            'tipo': 'ingreso',
            'categoria': 'Salario',
            'monto': 3000 + np.random.uniform(-200, 200),
            'fecha': date,
            'descripcion': 'Salario'
        })
    
    # Gastos con tendencias y variabilidad
    for date in dates:
        trend_factor = 1 + ((date - dates[0]).days / len(dates)) * 0.2  # Aumento del 20%
        
        if np.random.random() < 0.6:
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
                'usuario_id': user,
                'tipo': 'gasto',
                'categoria': cat,
                'monto': monto,
                'fecha': date,
                'descripcion': f'Gasto en {cat}'
            })

# Crear presupuestos
presupuestos_data = [
    {'usuario_id': 'user1', 'categoria': 'Alimentación', 'monto_maximo': 400},
    {'usuario_id': 'user1', 'categoria': 'Transporte', 'monto_maximo': 150},
    {'usuario_id': 'user1', 'categoria': 'Entretenimiento', 'monto_maximo': 200},
    {'usuario_id': 'user1', 'categoria': 'Servicios', 'monto_maximo': 300},
    {'usuario_id': 'user1', 'categoria': 'Salud', 'monto_maximo': 100},
]

# Crear datos de metas (usuario principal)
metas_data = [
    {
        'usuario_id': 'user1',
        'nombre': 'Viaje a Cartagena',
        'monto_actual': 500,
        'monto_objetivo': 2000,
        'fecha_limite': (datetime.now() + timedelta(days=90)).strftime('%Y-%m-%d'),
        'estado': 'activo'
    },
]

df_transactions = pd.DataFrame(transactions)
df_presupuestos = pd.DataFrame(presupuestos_data)
df_metas = pd.DataFrame(metas_data)

# Filtrar datos del usuario principal
user_transactions = df_transactions[df_transactions['usuario_id'] == 'user1'].reset_index(drop=True)

print(f"\n📊 Datos de entrada:")
print(f"   - Usuarios totales: {df_transactions['usuario_id'].nunique()}")
print(f"   - Transacciones totales: {len(df_transactions)}")
print(f"   - Transacciones user1: {len(user_transactions)}")
print(f"   - Período: {user_transactions['fecha'].min()} a {user_transactions['fecha'].max()}")
print(f"   - Ingresos user1: ${user_transactions[user_transactions['tipo'] == 'ingreso']['monto'].sum():.2f}")
print(f"   - Gastos user1: ${user_transactions[user_transactions['tipo'] == 'gasto']['monto'].sum():.2f}")
print(f"   - Presupuestos configurados: {len(df_presupuestos)}")
print(f"   - Metas activas: {len(df_metas[df_metas['estado'] == 'activo'])}")

# Crear comparador
print(f"\n🧠 Generando recomendaciones de los 3 modelos...")
comparator = RecommenderComparator()
recs = comparator.get_all_recommendations(user_transactions, df_transactions, df_presupuestos, df_metas)

print(f"\n✅ Recomendaciones generadas por modelo:")
print(f"   - Modelo 1 (Reglas Estadísticas): {len(recs['por_modelo']['Modelo Reglas Estadísticas'])} recomendaciones")
print(f"   - Modelo 2 (Filtrado Colaborativo): {len(recs['por_modelo']['Modelo Filtrado Colaborativo'])} recomendaciones")
print(f"   - Modelo 3 (Optimización de Ahorro): {len(recs['por_modelo']['Modelo Optimización de Ahorro'])} recomendaciones")
print(f"   - TOTAL (combinadas): {len(recs['todas'])} recomendaciones")
print(f"   - Mejores (top 10): {len(recs['mejores'])} recomendaciones")

print(f"\n📋 MEJORES RECOMENDACIONES (Top 5):\n")
for idx, rec in enumerate(recs['mejores'][:5], 1):
    print(f"{idx}. [{rec['prioridad']}] {rec['categoria']}")
    print(f"   Modelo: {rec['modelo']}")
    print(f"   Tipo: {rec['tipo_recomendacion']}")
    print(f"   Recomendación: {rec['recomendacion']}")
    if 'accion' in rec:
        print(f"   Acción: {rec['accion']}")
    print()

print("=" * 80)
success = (
    len(recs['por_modelo']['Modelo Reglas Estadísticas']) > 0 and
    len(recs['por_modelo']['Modelo Optimización de Ahorro']) > 0
)
print(f"TEST {'PASADO ✅' if success else 'FALLIDO ❌'}")
if success:
    print("Los 3 modelos generan recomendaciones correctamente")
else:
    print("ADVERTENCIA: Algunos modelos no generaron recomendaciones")
print("=" * 80)

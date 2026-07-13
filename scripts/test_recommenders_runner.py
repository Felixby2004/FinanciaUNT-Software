"""Script de prueba para los modelos de recomendación.
Genera datos sintéticos y ejecuta `RecommenderComparator`.
"""

import pandas as pd
import numpy as np
from models.recommenders import RecommenderComparator
from datetime import datetime, timedelta


def generate_synthetic_transactions(usuario_id: str, n: int = 60):
    categorias = ['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud', 'Educación', 'Compras', 'Otros']
    rows = []
    for i in range(n):
        es_ingreso = np.random.rand() < 0.2
        fecha = (datetime.now() - timedelta(days=np.random.randint(0, 90))).strftime('%Y-%m-%d')
        if es_ingreso:
            rows.append({
                'usuario_id': usuario_id,
                'monto': float(np.round(np.random.uniform(1000, 4000), 2)),
                'categoria': 'Ingresos',
                'descripcion': 'Salario',
                'fecha': fecha,
                'tipo': 'ingreso'
            })
        else:
            cat = np.random.choice(categorias, p=[0.2,0.15,0.1,0.12,0.08,0.05,0.2,0.1])
            rows.append({
                'usuario_id': usuario_id,
                'monto': float(np.round(np.random.uniform(5, 500), 2)),
                'categoria': cat,
                'descripcion': 'Compra',
                'fecha': fecha,
                'tipo': 'gasto'
            })
    return pd.DataFrame(rows)


def generate_presupuestos(usuario_id: str):
    datos = [
        {'usuario_id': usuario_id, 'categoria': 'Alimentación', 'monto_maximo': 600.0},
        {'usuario_id': usuario_id, 'categoria': 'Transporte', 'monto_maximo': 300.0},
        {'usuario_id': usuario_id, 'categoria': 'Entretenimiento', 'monto_maximo': 200.0}
    ]
    return pd.DataFrame(datos)


def generate_all_users_transactions(n_users: int = 5, per_user: int = 40):
    frames = []
    for i in range(n_users):
        uid = f'user_{i+1}'
        frames.append(generate_synthetic_transactions(uid, per_user))
    return pd.concat(frames, ignore_index=True)


def generate_metas(usuario_id: str):
    return pd.DataFrame([
        {'usuario_id': usuario_id, 'nombre': 'Vacaciones', 'monto_objetivo': 2000.0, 'monto_actual': 300.0, 'fecha_limite': (datetime.now() + timedelta(days=180)).strftime('%Y-%m-%d'), 'estado':'activo'}
    ])


def main():
    user_id = 'test_user'
    user_tx = generate_synthetic_transactions(user_id, 80)
    all_users_tx = generate_all_users_transactions(6, 50)
    presupuestos = generate_presupuestos(user_id)
    metas = generate_metas(user_id)

    comparator = RecommenderComparator()
    result = comparator.get_all_recommendations(user_tx, all_users_tx, presupuestos, metas)

    print('Recomendaciones por modelo:')
    for k, v in result['por_modelo'].items():
        print(f"\n== {k} ({len(v)} items) ==")
        for r in v[:3]:
            print('-', r.get('tipo_recomendacion'), '|', r.get('categoria'), '|', r.get('recomendacion'))

    print('\nTop 10 recomendaciones combinadas:')
    for r in result['mejores']:
        print(f"[{r['modelo']}] (score={r['score']}) {r['categoria']}: {r['recomendacion']}")


if __name__ == '__main__':
    main()

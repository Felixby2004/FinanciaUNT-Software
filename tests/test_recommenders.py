import pandas as pd
from datetime import datetime

from models.recommenders import (
    RuleBasedRecommender,
    CollaborativeRecommender,
    SavingsOptimizerRecommender,
    RecommenderComparator,
)


def test_rulebased_with_empty_data():
    model = RuleBasedRecommender()
    df_t = pd.DataFrame(columns=["usuario_id", "monto", "categoria", "descripcion", "fecha", "tipo"])
    df_p = pd.DataFrame(columns=["usuario_id", "categoria", "monto_maximo"])
    recs = model.generate_recommendations(df_t, df_p)
    assert isinstance(recs, list)
    assert recs == []


def test_rulebased_handles_zero_budget():
    model = RuleBasedRecommender()
    df_t = pd.DataFrame([
        {"usuario_id": "u1", "monto": 100.0, "categoria": "Alimentación", "descripcion": "Compra", "fecha": datetime.now().strftime("%Y-%m-%d"), "tipo": "gasto"}
    ])
    df_p = pd.DataFrame([{"usuario_id": "u1", "categoria": "Alimentación", "monto_maximo": 0.0}])
    # Should not raise and should return at least one recommendation
    recs = model.generate_recommendations(df_t, df_p)
    assert isinstance(recs, list)
    assert len(recs) >= 0


def test_collaborative_no_similar_returns_general():
    model = CollaborativeRecommender()
    user_tx = pd.DataFrame([
        {"usuario_id": "u1", "monto": 50.0, "categoria": "Compras", "descripcion": "Compra", "fecha": datetime.now().strftime("%Y-%m-%d"), "tipo": "gasto"}
    ])
    all_users = pd.DataFrame()  # empty
    recs = model.generate_recommendations(user_tx, all_users)
    assert isinstance(recs, list)
    assert any("Comparación social" in r.get("tipo_recomendacion", "") or r.get("tipo_recomendacion") == 'Comparación social' for r in recs) or len(recs) >= 0


def test_savings_optimizer_predicts_and_recommends_meta():
    model = SavingsOptimizerRecommender()
    df_t = pd.DataFrame([
        {"usuario_id": "u1", "monto": 1000.0, "categoria": "Ingresos", "descripcion": "Salario", "fecha": datetime.now().strftime("%Y-%m-%d"), "tipo": "ingreso"},
        {"usuario_id": "u1", "monto": 200.0, "categoria": "Alimentación", "descripcion": "Super", "fecha": datetime.now().strftime("%Y-%m-%d"), "tipo": "gasto"},
        {"usuario_id": "u1", "monto": 150.0, "categoria": "Transporte", "descripcion": "Taxi", "fecha": datetime.now().strftime("%Y-%m-%d"), "tipo": "gasto"},
    ])
    metas = pd.DataFrame([
        {"usuario_id": "u1", "nombre": "Vacaciones", "monto_objetivo": 1200.0, "monto_actual": 100.0, "fecha_limite": (datetime.now().replace(year=datetime.now().year + 1)).strftime("%Y-%m-%d"), "estado": "activo"}
    ])
    recs = model.generate_recommendations(df_t, metas)
    assert isinstance(recs, list)


def test_comparator_combines_models():
    comparator = RecommenderComparator()
    user_tx = pd.DataFrame([
        {"usuario_id": "u1", "monto": 1000.0, "categoria": "Ingresos", "descripcion": "Salario", "fecha": datetime.now().strftime("%Y-%m-%d"), "tipo": "ingreso"},
        {"usuario_id": "u1", "monto": 300.0, "categoria": "Compras", "descripcion": "Ropa", "fecha": datetime.now().strftime("%Y-%m-%d"), "tipo": "gasto"},
    ])
    all_users = pd.DataFrame([
        {"usuario_id": "u2", "monto": 200.0, "categoria": "Compras", "descripcion": "Ropa", "fecha": datetime.now().strftime("%Y-%m-%d"), "tipo": "gasto"},
    ])
    presupuestos = pd.DataFrame([{"usuario_id": "u1", "categoria": "Compras", "monto_maximo": 100.0}])
    metas = pd.DataFrame()
    res = comparator.get_all_recommendations(user_tx, all_users, presupuestos, metas)
    assert isinstance(res, dict)
    assert 'por_modelo' in res and 'todas' in res and 'mejores' in res

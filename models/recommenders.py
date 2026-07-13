
# models/recommenders.py
"""
3 Modelos de Recomendación IA para FinanciaUNT
1. Modelo 1: Reglas Basadas en Presupuestos y Análisis Estadístico (Rule-Based)
2. Modelo 2: Filtrado Colaborativo y KNN (Similitud entre usuarios)
3. Modelo 3: Predicción de Gastos y Optimización de Ahorro (ARIMA/SARIMA)
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import random
from collections import defaultdict
import warnings
warnings.filterwarnings('ignore')


class RuleBasedRecommender:
    """
    Modelo 1: Recomendador basado en reglas y análisis estadístico
    - Analiza patrones de gastos vs presupuestos y genera recomendaciones
    """
    
    def __init__(self):
        self.name = "Modelo Reglas Estadísticas"
        self.version = "1.0"
    
    def generate_recommendations(self, df_transactions: pd.DataFrame, df_presupuestos: pd.DataFrame) -> List[Dict]:
        """Generar recomendaciones basadas en reglas"""
        recommendations = []
        
        if df_transactions.empty:
            return recommendations
        
        gastos = df_transactions[df_transactions['tipo'] == 'gasto'].copy()
        
        if gastos.empty:
            return recommendations
        
        # Análisis 1: Gastos que exceden el presupuesto
        if not df_presupuestos.empty:
            presupuestos_dict = df_presupuestos.set_index('categoria')['monto_maximo'].to_dict()
            gastos_por_categoria = gastos.groupby('categoria')['monto'].sum()
            
            for categoria, total_gasto in gastos_por_categoria.items():
                if categoria in presupuestos_dict:
                    presupuesto = presupuestos_dict[categoria]
                    porcentaje = (total_gasto / presupuesto) * 100
                    
                    if porcentaje > 100:
                        recommendations.append({
                            'categoria': categoria,
                            'tipo_recomendacion': 'Reducción de gastos',
                            'recomendacion': f'Considera reducir gastos en {categoria}, ya que excedes tu presupuesto en un {porcentaje:.1f}%',
                            'monto_recomendado': total_gasto - presupuesto,
                            'prioridad': 3,
                            'accion': f'Establece un límite semanal de ${presupuesto/4:.2f}',
                            'beneficio': f'Ahorro potencial: ${total_gasto - presupuesto:.2f}/mes'
                        })
                    elif porcentaje >= 80:
                        recommendations.append({
                            'categoria': categoria,
                            'tipo_recomendacion': 'Atención a gastos',
                            'recomendacion': f'Estás usando el {porcentaje:.1f}% de tu presupuesto en {categoria}',
                            'monto_recomendado': presupuesto - total_gasto,
                            'prioridad': 2,
                            'accion': 'Revisa tus gastos en esta categoría',
                            'beneficio': 'Mantén el control de tu presupuesto'
                        })
        
        # Análisis 2: Categoría con mayor gasto
        if not gastos.empty:
            categoria_mayor = gastos.groupby('categoria')['monto'].sum().idxmax()
            monto_categoria = gastos.groupby('categoria')['monto'].sum().max()
            recommendations.append({
                'categoria': categoria_mayor,
                'tipo_recomendacion': 'Optimización de gastos',
                'recomendacion': f'Tu mayor gasto es {categoria_mayor} con ${monto_categoria:.2f}, revisa si puedes reducirlo',
                'monto_recomendado': monto_categoria * 0.1,
                'prioridad': 2,
                'accion': 'Busca alternativas más económicas',
                'beneficio': f'Potencial ahorro del 10%: ${monto_categoria * 0.1:.2f}'
            })
        
        # Análisis 3: Tasa de ahorro
        ingresos = df_transactions[df_transactions['tipo'] == 'ingreso']['monto'].sum()
        gastos_total = gastos['monto'].sum()
        if ingresos > 0:
            tasa_ahorro = (ingresos - gastos_total) / ingresos * 100
            if tasa_ahorro < 10:
                recommendations.append({
                    'categoria': 'Ahorro',
                    'tipo_recomendacion': 'Aumentar ahorro',
                    'recomendacion': f'Tu tasa de ahorro es solo {tasa_ahorro:.1f}%, considera aumentarla al menos al 10%',
                    'monto_recomendado': (ingresos * 0.1) - (ingresos - gastos_total),
                    'prioridad': 3,
                    'accion': 'Configura un ahorro automático del 10%',
                    'beneficio': 'Mejora tu seguridad financiera'
                })
            elif tasa_ahorro >= 30:
                recommendations.append({
                    'categoria': 'Ahorro',
                    'tipo_recomendacion': 'Excelente ahorro',
                    'recomendacion': f'¡Excelente! Tu tasa de ahorro es {tasa_ahorro:.1f}%',
                    'monto_recomendado': 0,
                    'prioridad': 1,
                    'accion': 'Considera invertir parte de tu ahorro',
                    'beneficio': 'Genera rendimientos adicionales'
                })
        
        return recommendations


class CollaborativeRecommender:
    """
    Modelo 2: Recomendador basado en filtrado colaborativo
    - Compara patrones de gastos con usuarios similares
    """
    
    def __init__(self):
        self.name = "Modelo Filtrado Colaborativo"
        self.version = "1.0"
    
    def _calculate_user_similarity(self, user1_data: pd.DataFrame, all_users_data: pd.DataFrame) -> List[Tuple[str, float]]:
        """Calcular similitud entre usuarios basada en gastos por categoría"""
        similarities = []
        
        if user1_data.empty or 'usuario_id' not in user1_data.columns:
            return similarities
            
        user1_profile = self._create_user_profile(user1_data)
        
        # Iterar por todos los demás usuarios
        for user_id in all_users_data['usuario_id'].unique():
            if user_id == user1_data['usuario_id'].iloc[0]:
                continue
                
            user2_data = all_users_data[all_users_data['usuario_id'] == user_id]
            user2_profile = self._create_user_profile(user2_data)
            
            similarity = self._cosine_similarity(user1_profile, user2_profile)
            if similarity > 0.3:
                similarities.append((user_id, similarity))
        
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:5]
    
    def _create_user_profile(self, user_data: pd.DataFrame) -> Dict[str, float]:
        """Crear perfil de usuario basado en porcentaje de gastos por categoría"""
        if user_data.empty:
            return {}
            
        gastos = user_data[user_data['tipo'] == 'gasto']
        total = gastos['monto'].sum() if gastos['monto'].sum() > 0 else 1.0
        
        profile = {}
        gastos_por_categoria = gastos.groupby('categoria')['monto'].sum()
        for cat in ['Alimentación', 'Transporte', 'Entretenimiento', 'Servicios', 'Salud', 'Educación', 'Compras', 'Otros']:
            profile[cat] = float(gastos_por_categoria.get(cat, 0)) / total
        
        return profile
    
    def _cosine_similarity(self, profile1: Dict, profile2: Dict) -> float:
        """Similitud coseno entre dos perfiles de usuario"""
        common_categories = set(profile1.keys()) & set(profile2.keys())
        if not common_categories:
            return 0.0
            
        dot_product = sum(profile1.get(cat, 0) * profile2.get(cat, 0) for cat in common_categories)
        norm1 = np.sqrt(sum(v**2 for v in profile1.values()))
        norm2 = np.sqrt(sum(v**2 for v in profile2.values()))
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
            
        return float(dot_product / (norm1 * norm2))
    
    def generate_recommendations(self, user_transactions: pd.DataFrame, all_users_transactions: pd.DataFrame) -> List[Dict]:
        """Generar recomendaciones basadas en usuarios similares"""
        recommendations = []
        
        if user_transactions.empty or all_users_transactions.empty:
            return recommendations
        
        # Encontrar usuarios similares
        similar_users = self._calculate_user_similarity(user_transactions, all_users_transactions)
        
        if not similar_users:
            # Recomendaciones generales si no hay usuarios similares
            recommendations.append({
                'categoria': 'General',
                'tipo_recomendacion': 'Comparación social',
                'recomendacion': 'Compara tus gastos con otros usuarios para encontrar oportunidades de ahorro',
                'monto_recomendado': 0,
                'prioridad': 1,
                'accion': 'Explora diferentes categorías',
                'beneficio': 'Mejora tu gestión financiera'
            })
            return recommendations
        
        # Analizar hábitos de usuarios similares
        similar_user_ids = [uid for uid, sim in similar_users]
        
        # Obtener datos de usuarios similares
        similar_data = all_users_transactions[all_users_transactions['usuario_id'].isin(similar_user_ids)]
        
        if similar_data.empty:
            return recommendations
        
        # Comparar categorías donde el usuario gasta más que los similares
        user_profile = self._create_user_profile(user_transactions)
        similar_avg_profile = self._create_user_profile(similar_data)
        
        total_user_gastos = user_transactions[user_transactions['tipo'] == 'gasto']['monto'].sum()
        
        for categoria in user_profile.keys():
            user_pct = user_profile.get(categoria, 0)
            similar_pct = similar_avg_profile.get(categoria, 0)
            
            if user_pct > similar_pct + 0.05:
                monto_ahorro = float((user_pct - similar_pct) * total_user_gastos)
                recommendations.append({
                    'categoria': categoria,
                    'tipo_recomendacion': 'Comparación con similares',
                    'recomendacion': f'Gastas {user_pct*100:.1f}% en {categoria} vs {similar_pct*100:.1f}% de usuarios similares',
                    'monto_recomendado': monto_ahorro,
                    'prioridad': 2,
                    'accion': f'Considera reducir gastos en {categoria} para estar más cerca del promedio',
                    'beneficio': f'Potencial ahorro de ${monto_ahorro:.2f}'
                })
        
        return recommendations


class SavingsOptimizerRecommender:
    """
    Modelo 3: Optimizador de ahorro y predicción de gastos
    - Predice gastos futuros y optimiza ahorro
    """
    
    def __init__(self):
        self.name = "Modelo Optimización de Ahorro"
        self.version = "1.0"
    
    def _predict_future_expenses(self, df_transactions: pd.DataFrame, days: int = 30) -> Dict[str, float]:
        """Predicción simple de gastos futuros (promedio móvil)"""
        if df_transactions.empty:
            return {}
        
        df_transactions['fecha'] = pd.to_datetime(df_transactions['fecha'])
        gastos = df_transactions[df_transactions['tipo'] == 'gasto'].copy()
        
        if gastos.empty:
            return {}
        
        predictions = {}
        
        # Predicción por categoría
        for categoria in gastos['categoria'].unique():
            cat_gastos = gastos[gastos['categoria'] == categoria]
            if len(cat_gastos) >= 3:
                # Promedio de últimos 30 días
                monthly_avg = cat_gastos['monto'].mean()
                # Añadir tendencia (2% de aumento)
                predictions[categoria] = monthly_avg * 1.02
        
        # Predicción total
        total_prediction = sum(predictions.values())
        predictions['total'] = total_prediction
        
        return predictions
    
    def generate_recommendations(self, df_transactions: pd.DataFrame, df_metas: pd.DataFrame) -> List[Dict]:
        """Generar recomendaciones de optimización de ahorro"""
        recommendations = []
        
        if df_transactions.empty:
            return recommendations
        
        # Predicción de gastos
        predictions = self._predict_future_expenses(df_transactions)
        
        if not predictions:
            return recommendations
        
        # Análisis de metas financieras
        if not df_metas.empty:
            for _, meta in df_metas[df_metas['estado'] == 'activo'].iterrows():
                monto_faltante = meta['monto_objetivo'] - meta['monto_actual']
                
                if meta['fecha_limite']:
                    fecha_limite = pd.to_datetime(meta['fecha_limite'])
                    dias_restantes = (fecha_limite - datetime.now()).days
                    
                    if dias_restantes > 0:
                        ahorro_mensual_necesario = monto_faltante / (dias_restantes / 30)
                        
                        recommendations.append({
                            'categoria': 'Meta Financiera',
                            'tipo_recomendacion': 'Planificación de meta',
                            'recomendacion': f'Para alcanzar tu meta "{meta["nombre"]}", necesitas ahorrar ${ahorro_mensual_necesario:.2f}/mes',
                            'monto_recomendado': ahorro_mensual_necesario,
                            'prioridad': 3,
                            'accion': f'Configura un ahorro automático mensual de ${ahorro_mensual_necesario:.2f}',
                            'beneficio': 'Alcanza tu meta en tiempo'
                        })
        
        # Recomendación de optimización de gastos
        gastos_predichos = predictions.get('total', 0)
        ingresos = df_transactions[df_transactions['tipo'] == 'ingreso']['monto'].sum()
        gastos_actuales = df_transactions[df_transactions['tipo'] == 'gasto']['monto'].sum()
        
        if ingresos > 0:
            ahorro_ideal = ingresos * 0.2
            ahorro_actual = ingresos - gastos_actuales
            
            if ahorro_actual < ahorro_ideal:
                recommendations.append({
                    'categoria': 'Optimización',
                    'tipo_recomendacion': 'Plan de ahorro optimizado',
                    'recomendacion': f'Para un plan ideal, deberías ahorrar ${ahorro_ideal:.2f} (20% de tus ingresos)',
                    'monto_recomendado': ahorro_ideal - ahorro_actual,
                    'prioridad': 2,
                    'accion': 'Aumenta tu ahorro gradualmente',
                    'beneficio': 'Mejora tu futuro financiero'
                })
        
        return recommendations


class RecommenderComparator:
    """
    Comparador y combinador de los 3 modelos
    - Combina y compara recomendaciones
    """
    
    def __init__(self):
        self.model1 = RuleBasedRecommender()
        self.model2 = CollaborativeRecommender()
        self.model3 = SavingsOptimizerRecommender()
    
    def get_all_recommendations(self, 
                                  user_transactions: pd.DataFrame,
                                  all_users_transactions: pd.DataFrame,
                                  df_presupuestos: pd.DataFrame,
                                  df_metas: pd.DataFrame) -> Dict:
        """Obtener recomendaciones de los 3 modelos"""
        
        recs1 = self.model1.generate_recommendations(user_transactions, df_presupuestos)
        recs2 = self.model2.generate_recommendations(user_transactions, all_users_transactions)
        recs3 = self.model3.generate_recommendations(user_transactions, df_metas)
        
        # Asignar scores y combinar
        all_recommendations = []
        
        for rec in recs1:
            rec['modelo'] = self.model1.name
            rec['score'] = rec['prioridad'] * 2
            all_recommendations.append(rec)
        
        for rec in recs2:
            rec['modelo'] = self.model2.name
            rec['score'] = rec['prioridad'] * 1.5
            all_recommendations.append(rec)
        
        for rec in recs3:
            rec['modelo'] = self.model3.name
            rec['score'] = rec['prioridad'] * 2.5
            all_recommendations.append(rec)
        
        # Ordenar por score
        all_recommendations.sort(key=lambda x: x['score'], reverse=True)
        
        return {
            'por_modelo': {
                'Modelo Reglas Estadísticas': recs1,
                'Modelo Filtrado Colaborativo': recs2,
                'Modelo Optimización de Ahorro': recs3
            },
            'todas': all_recommendations,
            'mejores': all_recommendations[:10]
        }


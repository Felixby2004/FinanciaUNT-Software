
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
                    if presupuesto and presupuesto > 0:
                        porcentaje = (total_gasto / presupuesto) * 100
                    else:
                        porcentaje = float('inf')
                    
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
            # Reducido threshold de 0.3 a 0.1 para incluir más usuarios
            if similarity > 0.1:
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
            
            # Reducido umbral de 0.05 a 0.02 para mayor sensibilidad
            if user_pct > similar_pct + 0.02:
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
    - Análisis de tendencias y volatilidad
    - Recomendaciones preventivas basadas en patrones históricos
    """
    
    def __init__(self):
        self.name = "Modelo Optimización de Ahorro"
        self.version = "2.0"
    
    def _analyze_trends(self, df_transactions: pd.DataFrame, days: int = 60) -> Dict[str, Dict]:
        """Analizar tendencias de gastos por categoría"""
        if df_transactions.empty:
            return {}
        
        df_transactions = df_transactions.copy()
        df_transactions['fecha'] = pd.to_datetime(df_transactions['fecha'])
        gastos = df_transactions[df_transactions['tipo'] == 'gasto'].copy()
        
        if gastos.empty:
            return {}
        
        trends = {}
        cutoff_date = datetime.now() - timedelta(days=days)
        
        for categoria in gastos['categoria'].unique():
            cat_gastos = gastos[gastos['categoria'] == categoria].sort_values('fecha')
            
            if len(cat_gastos) >= 3:
                # Dividir en dos períodos
                mid_point = len(cat_gastos) // 2
                first_half = cat_gastos.iloc[:mid_point]['monto'].mean() if mid_point > 0 else 0
                second_half = cat_gastos.iloc[mid_point:]['monto'].mean()
                
                # Calcular tendencia
                if first_half > 0:
                    trend_pct = ((second_half - first_half) / first_half) * 100
                else:
                    trend_pct = 0
                
                # Volatilidad (desviación estándar)
                volatility = cat_gastos['monto'].std()
                
                trends[categoria] = {
                    'avg_first': first_half,
                    'avg_second': second_half,
                    'trend_pct': trend_pct,
                    'volatility': volatility,
                    'total_transactions': len(cat_gastos),
                    'avg_transaction': cat_gastos['monto'].mean()
                }
        
        return trends
    
    def _predict_future_expenses(self, df_transactions: pd.DataFrame, days: int = 30) -> Dict[str, float]:
        """Predicción avanzada de gastos futuros con análisis de tendencias"""
        if df_transactions.empty:
            return {}
        
        df_transactions = df_transactions.copy()
        df_transactions['fecha'] = pd.to_datetime(df_transactions['fecha'])
        gastos = df_transactions[df_transactions['tipo'] == 'gasto'].copy()
        
        if gastos.empty:
            return {}
        
        predictions = {}
        trends = self._analyze_trends(df_transactions)
        
        # Predicción por categoría con análisis de tendencia
        for categoria in gastos['categoria'].unique():
            cat_gastos = gastos[gastos['categoria'] == categoria]
            if len(cat_gastos) >= 3:
                monthly_avg = cat_gastos['monto'].mean()
                
                # Ajustar por tendencia si existe
                if categoria in trends:
                    trend_factor = 1 + (trends[categoria]['trend_pct'] / 100)
                else:
                    trend_factor = 1.0
                
                # Predicción con tendencia
                predictions[categoria] = monthly_avg * trend_factor
        
        # Predicción total
        total_prediction = sum(predictions.values())
        predictions['total'] = total_prediction
        
        return predictions
    
    def generate_recommendations(self, df_transactions: pd.DataFrame, df_metas: pd.DataFrame) -> List[Dict]:
        """Generar recomendaciones predictivas y de optimización de ahorro"""
        recommendations = []
        
        if df_transactions.empty:
            return recommendations
        
        df_transactions = df_transactions.copy()
        df_transactions['fecha'] = pd.to_datetime(df_transactions['fecha'])
        gastos = df_transactions[df_transactions['tipo'] == 'gasto'].copy()
        ingresos = df_transactions[df_transactions['tipo'] == 'ingreso']['monto'].sum()
        gastos_total = gastos['monto'].sum()
        
        # Predicción de gastos
        predictions = self._predict_future_expenses(df_transactions)
        trends = self._analyze_trends(df_transactions)
        
        if not predictions or predictions.get('total', 0) == 0:
            return recommendations
        
        # ========== ANÁLISIS 1: Tendencias de gastos por categoría ==========
        for categoria, trend_data in trends.items():
            trend_pct = trend_data['trend_pct']
            
            # Detectar categorías con gastos crecientes
            if trend_pct > 15:
                recommendations.append({
                    'categoria': categoria,
                    'tipo_recomendacion': 'Tendencia creciente',
                    'recomendacion': f'Tu gasto en {categoria} está aumentando ({trend_pct:.1f}% entre períodos)',
                    'monto_recomendado': trend_data['avg_second'] * 0.15,
                    'prioridad': 3,
                    'accion': f'Analiza por qué sube tu gasto en {categoria} y toma medidas preventivas',
                    'beneficio': f'Detiene el aumento: ${trend_data["avg_second"] * 0.15:.2f}/mes'
                })
            
            # Detectar categorías volatile con gastos irregulares
            if trend_data['volatility'] > (trend_data['avg_transaction'] * 0.5):
                recommendations.append({
                    'categoria': categoria,
                    'tipo_recomendacion': 'Gastos irregulares',
                    'recomendacion': f'{categoria} tiene gastos muy irregulares (volatilidad alta)',
                    'monto_recomendado': trend_data['volatility'],
                    'prioridad': 2,
                    'accion': f'Regulariza tus gastos en {categoria} con límites mensuales',
                    'beneficio': 'Mayor control y predictibilidad de gastos'
                })
        
        # ========== ANÁLISIS 2: Predicción de gastos futuros ==========
        predicted_total = predictions.get('total', 0)
        if predicted_total > gastos_total:
            aumento = predicted_total - gastos_total
            recommendations.append({
                'categoria': 'Predicción',
                'tipo_recomendacion': 'Aumento de gastos proyectado',
                'recomendacion': f'Basado en tendencias, proyectamos un gasto de ${predicted_total:.2f} (aumento de ${aumento:.2f})',
                'monto_recomendado': aumento,
                'prioridad': 2,
                'accion': 'Anticípate reduciendo gastos ahora o aumentando ingresos',
                'beneficio': 'Evita sorpresas financieras'
            })
        
        # ========== ANÁLISIS 3: Optimización de ahorro ==========
        if ingresos > 0:
            ahorro_actual = ingresos - gastos_total
            ahorro_ideal = ingresos * 0.2
            
            if ahorro_actual < ahorro_ideal:
                ahorro_faltante = ahorro_ideal - ahorro_actual
                recommendations.append({
                    'categoria': 'Optimización',
                    'tipo_recomendacion': 'Plan de ahorro optimizado',
                    'recomendacion': f'Tu ahorro actual es ${ahorro_actual:.2f} (ideal: ${ahorro_ideal:.2f})',
                    'monto_recomendado': ahorro_faltante,
                    'prioridad': 2,
                    'accion': 'Reduce gastos en categorías con tendencia o volatilidad alta',
                    'beneficio': f'Alcanza metaahorro del 20%: ${ahorro_ideal:.2f}/mes'
                })
        
        # ========== ANÁLISIS 4: Categoría con mayor oportunidad de reducción ==========
        if trends:
            # Buscar categoría más cara con trend positivo
            high_impact = None
            for cat, trend_data in sorted(trends.items(), key=lambda x: x[1]['avg_second'], reverse=True):
                if trend_data['trend_pct'] > 5 or trend_data['volatility'] > (trend_data['avg_transaction'] * 0.3):
                    high_impact = (cat, trend_data)
                    break
            
            if high_impact:
                cat, data = high_impact
                ahorro_potencial = data['avg_second'] * 0.15
                recommendations.append({
                    'categoria': cat,
                    'tipo_recomendacion': 'Oportunidad de ahorro prioritaria',
                    'recomendacion': f'{cat} es tu categoría con mayor oportunidad (${data["avg_second"]:.2f}/mes promedio)',
                    'monto_recomendado': ahorro_potencial,
                    'prioridad': 3,
                    'accion': f'Busca reducir {cat} en un 15% mediante optimización',
                    'beneficio': f'Potencial ahorro: ${ahorro_potencial:.2f}/mes'
                })
        
        # ========== ANÁLISIS 5: Metas financieras ==========
        if not df_metas.empty and len(df_metas) > 0:
            active_metas = df_metas[df_metas['estado'] == 'activo'] if 'estado' in df_metas.columns else df_metas
            for _, meta in active_metas.iterrows():
                try:
                    monto_faltante = float(meta.get('monto_objetivo', 0)) - float(meta.get('monto_actual', 0))
                    
                    if monto_faltante > 0 and meta.get('fecha_limite'):
                        fecha_limite = pd.to_datetime(meta['fecha_limite'])
                        dias_restantes = (fecha_limite - datetime.now()).days
                        
                        if dias_restantes > 0:
                            ahorro_mensual = monto_faltante / max(1, dias_restantes / 30)
                            
                            recommendations.append({
                                'categoria': 'Meta Financiera',
                                'tipo_recomendacion': 'Planificación de meta',
                                'recomendacion': f'Para "{meta.get("nombre", "Meta")}", necesitas ${ahorro_mensual:.2f}/mes',
                                'monto_recomendado': ahorro_mensual,
                                'prioridad': 3,
                                'accion': f'Reduce gastos para ahorrar ${ahorro_mensual:.2f}/mes',
                                'beneficio': f'Completa tu meta a tiempo'
                            })
                except (ValueError, TypeError, KeyError):
                    continue
        
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


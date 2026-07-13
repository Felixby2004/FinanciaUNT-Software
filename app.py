
import streamlit as st
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import numpy as np
from datetime import datetime, timedelta
import json
from supabase import create_client, Client
from typing import Dict, List, Optional
import uuid
from fpdf import FPDF
import io
import base64
import requests
from auth import main_auth
from models.recommenders import RecommenderComparator
import time

# Configuración de la página
st.set_page_config(
    page_title="FinanciaUNT - Asesor Financiero Personal IA",
    page_icon="💰",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ==================== MANAGERS ====================

class DatabaseManager:
    """Gestor de conexión con Supabase"""
    def __init__(self):
        try:
            self.supabase_url = st.secrets.get("SUPABASE_URL")
            self.supabase_key = st.secrets.get("SUPABASE_KEY")
            self.client: Client = create_client(self.supabase_url, self.supabase_key)
        except Exception as e:
            st.error(f"Error conectando a Supabase: {str(e)}")
            self.client = None
    
    def get_client(self) -> Client:
        return self.client


class UsuarioManager:
    """Gestor de Usuarios"""
    def __init__(self, db: DatabaseManager):
        self.db = db.get_client()
    
    def listar_usuarios(self) -> pd.DataFrame:
        try:
            response = self.db.table('usuarios').select('*').order('fecha_registro', desc=True).execute()
            return pd.DataFrame(response.data) if response.data else pd.DataFrame()
        except:
            return pd.DataFrame()
    
    def obtener_usuario(self, usuario_id: str) -> Optional[Dict]:
        try:
            response = self.db.table('usuarios').select('*').eq('id', usuario_id).execute()
            return response.data[0] if response.data else None
        except:
            return None
    
    def crear_usuario(self, email: str, nombre: str, plan: str = 'basico', contraseña: str = '123456', rol: str = 'cliente') -> Dict:
        data = {
            'email': email,
            'nombre': nombre,
            'plan_suscripcion': plan,
            'access_token_plaid': contraseña,
            'rol': rol,
            'configuracion': {}
        }
        response = self.db.table('usuarios').insert(data).execute()
        return response.data[0] if response.data else None
    
    def actualizar_usuario(self, usuario_id: str, datos: Dict) -> Dict:
        response = self.db.table('usuarios').update(datos).eq('id', usuario_id).execute()
        return response.data[0] if response.data else None
    
    def eliminar_usuario(self, usuario_id: str) -> bool:
        try:
            self.db.table('presupuestos').delete().eq('usuario_id', usuario_id).execute()
            self.db.table('transacciones').delete().eq('usuario_id', usuario_id).execute()
            self.db.table('alertas').delete().eq('usuario_id', usuario_id).execute()
            self.db.table('metas_financieras').delete().eq('usuario_id', usuario_id).execute()
            self.db.table('recomendaciones').delete().eq('usuario_id', usuario_id).execute()
            self.db.table('usuarios').delete().eq('id', usuario_id).execute()
            return True
        except Exception as e:
            st.error(f"Error eliminando usuario: {str(e)}")
            return False


class TransaccionManager:
    """Gestor de Transacciones"""
    def __init__(self, db: DatabaseManager):
        self.db = db.get_client()
        self.n8n_webhook = st.secrets.get("N8N_WEBHOOK", "")
    
    def listar_transacciones(self, usuario_id: Optional[str] = None, dias: int = 90) -> pd.DataFrame:
        try:
            query = self.db.table('transacciones').select('*').gte('fecha', (datetime.now() - timedelta(days=dias)).strftime('%Y-%m-%d'))
            if usuario_id:
                query = query.eq('usuario_id', usuario_id)
            response = query.order('fecha', desc=True).execute()
            return pd.DataFrame(response.data) if response.data else pd.DataFrame()
        except:
            return pd.DataFrame()
    
    def crear_transaccion(self, usuario_id: str, monto: float, categoria: str, 
                         descripcion: str, fecha: str, tipo: str, cuenta: str = '') -> Dict:
        data = {
            'usuario_id': usuario_id,
            'monto': monto,
            'categoria': categoria,
            'descripcion': descripcion,
            'fecha': fecha,
            'tipo': tipo,
            'cuenta': cuenta,
            'metadata': {}
        }
        response = self.db.table('transacciones').insert(data).execute()
        return response.data[0] if response.data else None
    
    def actualizar_transaccion(self, transaccion_id: str, datos: Dict) -> Dict:
        response = self.db.table('transacciones').update(datos).eq('id', transaccion_id).execute()
        return response.data[0] if response.data else None
    
    def eliminar_transaccion(self, transaccion_id: str) -> bool:
        response = self.db.table('transacciones').delete().eq('id', transaccion_id).execute()
        return True if response.data else False


class PresupuestoManager:
    """Gestor de Presupuestos"""
    def __init__(self, db: DatabaseManager):
        self.db = db.get_client()
    
    def listar_presupuestos(self, usuario_id: Optional[str] = None) -> pd.DataFrame:
        try:
            query = self.db.table('presupuestos').select('*')
            if usuario_id:
                query = query.eq('usuario_id', usuario_id)
            response = query.order('categoria').execute()
            return pd.DataFrame(response.data) if response.data else pd.DataFrame()
        except:
            return pd.DataFrame()
    
    def crear_presupuesto(self, usuario_id: str, categoria: str, 
                         monto_maximo: float, periodo: str = 'mensual') -> Dict:
        data = {
            'usuario_id': usuario_id,
            'categoria': categoria,
            'monto_maximo': monto_maximo,
            'periodo': periodo
        }
        response = self.db.table('presupuestos').insert(data).execute()
        return response.data[0] if response.data else None
    
    def actualizar_presupuesto(self, presupuesto_id: str, datos: Dict) -> Dict:
        response = self.db.table('presupuestos').update(datos).eq('id', presupuesto_id).execute()
        return response.data[0] if response.data else None
    
    def eliminar_presupuesto(self, presupuesto_id: str) -> bool:
        response = self.db.table('presupuestos').delete().eq('id', presupuesto_id).execute()
        return True if response.data else False


class AlertaManager:
    """Gestor de Alertas"""
    def __init__(self, db: DatabaseManager):
        self.db = db.get_client()
    
    def listar_alertas(self, usuario_id: Optional[str] = None, solo_no_leidas: bool = False) -> pd.DataFrame:
        try:
            query = self.db.table('alertas').select('*')
            if usuario_id:
                query = query.eq('usuario_id', usuario_id)
            if solo_no_leidas:
                query = query.eq('leida', False)
            response = query.order('created_at', desc=True).execute()
            return pd.DataFrame(response.data) if response.data else pd.DataFrame()
        except:
            return pd.DataFrame()
    
    def crear_alerta(self, usuario_id: str, tipo: str, mensaje: str, 
                    severidad: str = 'media') -> Dict:
        data = {
            'usuario_id': usuario_id,
            'tipo': tipo,
            'mensaje': mensaje,
            'severidad': severidad,
            'leida': False
        }
        response = self.db.table('alertas').insert(data).execute()
        return response.data[0] if response.data else None
    
    def marcar_leida(self, alerta_id: str) -> bool:
        response = self.db.table('alertas').update({'leida': True}).eq('id', alerta_id).execute()
        return True if response.data else False


class MetaManager:
    """Gestor de Metas Financieras"""
    def __init__(self, db: DatabaseManager):
        self.db = db.get_client()
    
    def listar_metas(self, usuario_id: str) -> pd.DataFrame:
        try:
            response = self.db.table('metas_financieras').select('*').eq('usuario_id', usuario_id).execute()
            return pd.DataFrame(response.data) if response.data else pd.DataFrame()
        except:
            return pd.DataFrame()
    
    def crear_meta(self, usuario_id: str, nombre: str, descripcion: str, 
                   tipo: str, monto_objetivo: float, monto_actual: float = 0, 
                   fecha_limite: Optional[str] = None) -> Dict:
        data = {
            'usuario_id': usuario_id,
            'nombre': nombre,
            'descripcion': descripcion,
            'tipo': tipo,
            'monto_objetivo': monto_objetivo,
            'monto_actual': monto_actual,
            'fecha_limite': fecha_limite,
            'estado': 'activo'
        }
        response = self.db.table('metas_financieras').insert(data).execute()
        return response.data[0] if response.data else None
    
    def actualizar_meta(self, meta_id: str, datos: Dict) -> Dict:
        response = self.db.table('metas_financieras').update(datos).eq('id', meta_id).execute()
        return response.data[0] if response.data else None
    
    def eliminar_meta(self, meta_id: str) -> bool:
        response = self.db.table('metas_financieras').delete().eq('id', meta_id).execute()
        return True if response.data else False


class RecomendacionManager:
    """Gestor de Recomendaciones IA"""
    def __init__(self, db: DatabaseManager):
        self.db = db.get_client()
    
    def listar_recomendaciones(self, usuario_id: str) -> pd.DataFrame:
        try:
            response = self.db.table('recomendaciones').select('*').eq('usuario_id', usuario_id).execute()
            return pd.DataFrame(response.data) if response.data else pd.DataFrame()
        except:
            return pd.DataFrame()
    
    def guardar_recomendacion(self, usuario_id: str, tipo_modelo: str, categoria: str, 
                              recomendacion: str, monto_recomendado: float = 0, 
                              prioridad: int = 1, metadata: Dict = None) -> Dict:
        data = {
            'usuario_id': usuario_id,
            'tipo_modelo': tipo_modelo,
            'categoria': categoria,
            'recomendacion': recomendacion,
            'monto_recomendado': monto_recomendado,
            'prioridad': prioridad,
            'metadata': metadata or {}
        }
        response = self.db.table('recomendaciones').insert(data).execute()
        return response.data[0] if response.data else None


class AsesorFinanciero:
    """Clase principal para análisis financiero"""
    def __init__(self, transaccion_mgr: TransaccionManager, presupuesto_mgr: PresupuestoManager):
        self.transaccion_mgr = transaccion_mgr
        self.presupuesto_mgr = presupuesto_mgr
        self.n8n_webhook = st.secrets.get("N8N_WEBHOOK", "")
    
    def get_analisis_ia(self, transacciones: pd.DataFrame, presupuestos: pd.DataFrame):
        """Generar análisis financiero"""
        if transacciones.empty:
            return {
                'resumen': {
                    'total_ingresos': 0,
                    'total_gastos': 0,
                    'ahorro_neto': 0,
                    'tasa_ahorro': 0
                },
                'recomendaciones': ["No hay suficientes datos para generar recomendaciones"],
                'alertas': [],
                'predicciones': {
                    'ahorro_3_meses': 0,
                    'proyeccion_gastos': 0
                }
            }
        
        gastos_por_categoria = transacciones[transacciones['tipo'] == 'gasto'].groupby('categoria')['monto'].sum()
        total_gastos = gastos_por_categoria.sum()
        total_ingresos = transacciones[transacciones['tipo'] == 'ingreso']['monto'].sum()
        
        recomendaciones = []
        alertas = []
        
        # Análisis de presupuestos
        if not presupuestos.empty:
            presupuestos_dict = presupuestos.set_index('categoria')['monto_maximo'].to_dict()
            for categoria, gasto in gastos_por_categoria.items():
                if categoria in presupuestos_dict:
                    presupuesto = presupuestos_dict[categoria]
                    porcentaje = (gasto / presupuesto) * 100
                    if porcentaje > 90:
                        alertas.append(f"Gastos en {categoria} al {porcentaje:.1f}% del presupuesto")
                    elif porcentaje > 100:
                        alertas.append(f"¡Presupuesto excedido en {categoria}! ({porcentaje:.1f}%)")
        
        # Recomendaciones generales
        if total_ingresos > 0:
            tasa_ahorro = ((total_ingresos - total_gastos) / total_ingresos * 100)
            if tasa_ahorro < 10:
                recomendaciones.append("Considera aumentar tu tasa de ahorro al menos al 10% de tus ingresos")
            elif tasa_ahorro > 30:
                recomendaciones.append("¡Excelente! Estás ahorrando más del 30% de tus ingresos")
        
        if not gastos_por_categoria.empty:
            categoria_mayor = gastos_por_categoria.idxmax()
            recomendaciones.append(f"Tu mayor gasto es en {categoria_mayor}. Revisa si puedes optimizarlo")
        
        analisis = {
            'resumen': {
                'total_ingresos': float(total_ingresos),
                'total_gastos': float(total_gastos),
                'ahorro_neto': float(total_ingresos - total_gastos),
                'tasa_ahorro': float(((total_ingresos - total_gastos) / total_ingresos * 100) if total_ingresos > 0 else 0)
            },
            'recomendaciones': recomendaciones if recomendaciones else ["Continúa registrando tus transacciones para mejores análisis"],
            'alertas': alertas,
            'predicciones': {
                'ahorro_3_meses': float((total_ingresos - total_gastos) * 3 * 1.05),
                'proyeccion_gastos': float(total_gastos * 1.02)
            }
        }
        
        return analisis

# ==================== PDF REPORT ====================

class PDFReport(FPDF):
    def header(self):
        self.set_font('Arial', 'B', 16)
        self.cell(0, 10, 'FinanciaUNT - Reporte Financiero Personal', 0, 1, 'C')
        self.set_font('Arial', 'I', 10)
        self.cell(0, 5, f'Generado: {datetime.now().strftime("%d/%m/%Y %H:%M")}', 0, 1, 'C')
        self.ln(10)
    
    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8)
        self.cell(0, 10, f'Pagina {self.page_no()}', 0, 0, 'C')
    
    def chapter_title(self, title):
        self.set_font('Arial', 'B', 14)
        self.set_fill_color(52, 152, 219)
        self.set_text_color(255, 255, 255)
        self.cell(0, 10, title, 0, 1, 'L', 1)
        self.set_text_color(0, 0, 0)
        self.ln(5)
    
    def chapter_body(self, body):
        self.set_font('Arial', '', 11)
        self.multi_cell(0, 8, body)
        self.ln()
    
    def add_metric(self, label, value):
        self.set_font('Arial', 'B', 11)
        self.cell(60, 8, label + ':', 0, 0)
        self.set_font('Arial', '', 11)
        self.cell(0, 8, str(value), 0, 1)
    
    def add_image_from_bytes(self, img_bytes, x=None, y=None, w=0, h=0):
        """Agregar imagen desde bytes"""
        temp_file = f"temp_chart_{datetime.now().timestamp()}.png"
        with open(temp_file, 'wb') as f:
            f.write(img_bytes)
        
        if x is None:
            x = self.get_x()
        if y is None:
            y = self.get_y()
        
        self.image(temp_file, x=x, y=y, w=w, h=h)
        
        import os
        try:
            os.remove(temp_file)
        except:
            pass

def generar_graficos(transacciones: pd.DataFrame, analisis: Dict) -> Dict[str, bytes]:
    """Generar gráficos en formato PNG para el PDF"""
    graficos = {}
    
    if transacciones.empty:
        return graficos
    
    try:
        # 1. Gráfico de distribución de gastos (pie chart)
        gastos_categoria = transacciones[transacciones['tipo'] == 'gasto'].groupby('categoria')['monto'].sum()
        if not gastos_categoria.empty:
            fig = px.pie(
                values=gastos_categoria.values,
                names=gastos_categoria.index,
                title='Distribucion de Gastos por Categoria',
                hole=0.4,
                color_discrete_sequence=px.colors.qualitative.Set3
            )
            fig.update_layout(
                width=700,
                height=500,
                showlegend=True,
                font=dict(size=12)
            )
            graficos['distribucion_gastos'] = fig.to_image(format="png", width=700, height=500)
        
        # 2. Gráfico de tendencias (line chart)
        transacciones_copy = transacciones.copy()
        transacciones_copy['fecha'] = pd.to_datetime(transacciones_copy['fecha'])
        gastos_diarios = transacciones_copy[transacciones_copy['tipo'] == 'gasto'].groupby('fecha')['monto'].sum().reset_index()
        
        if not gastos_diarios.empty:
            fig = px.line(
                gastos_diarios,
                x='fecha',
                y='monto',
                title='Tendencia de Gastos Diarios',
                markers=True
            )
            fig.update_layout(
                width=700,
                height=400,
                xaxis_title='Fecha',
                yaxis_title='Monto ($)',
                font=dict(size=12)
            )
            graficos['tendencia_gastos'] = fig.to_image(format="png", width=700, height=400)
        
        # 3. Gráfico de resumen (métricas)
        fig = go.Figure()
        
        categorias_metricas = ['Ingresos', 'Gastos', 'Ahorro Neto']
        valores_metricas = [
            analisis['resumen']['total_ingresos'],
            analisis['resumen']['total_gastos'],
            analisis['resumen']['ahorro_neto']
        ]
        colores = ['#00CC96', '#EF553B', '#636EFA']
        
        fig.add_trace(go.Bar(
            x=categorias_metricas,
            y=valores_metricas,
            marker_color=colores,
            text=[f'${v:,.2f}' for v in valores_metricas],
            textposition='auto',
        ))
        
        fig.update_layout(
            title='Resumen Financiero',
            width=700,
            height=400,
            xaxis_title='',
            yaxis_title='Monto ($)',
            showlegend=False,
            font=dict(size=12)
        )
        
        graficos['resumen_financiero'] = fig.to_image(format="png", width=700, height=400)
        
    except Exception as e:
        print(f"Error generando gráficos: {str(e)}")
    
    return graficos

def generar_reporte_pdf(usuario_nombre: str, transacciones: pd.DataFrame, 
                        analisis: Dict, presupuestos: pd.DataFrame) -> bytes:
    """Generar reporte PDF completo con gráficos"""
    
    # Generar gráficos
    graficos = generar_graficos(transacciones, analisis)
    
    pdf = PDFReport()
    pdf.add_page()
    
    # Información del usuario
    pdf.chapter_title('INFORMACION DEL USUARIO')
    pdf.add_metric('Usuario', usuario_nombre)
    pdf.add_metric('Periodo analizado', f'{len(transacciones)} transacciones')
    pdf.ln(5)
    
    # Resumen ejecutivo
    pdf.chapter_title('RESUMEN EJECUTIVO')
    pdf.add_metric('Ingresos totales', f"${analisis['resumen']['total_ingresos']:,.2f}")
    pdf.add_metric('Gastos totales', f"${analisis['resumen']['total_gastos']:,.2f}")
    pdf.add_metric('Ahorro neto', f"${analisis['resumen']['ahorro_neto']:,.2f}")
    pdf.add_metric('Tasa de ahorro', f"{analisis['resumen']['tasa_ahorro']:.1f}%")
    pdf.ln(5)
    
    # Agregar gráfico de resumen financiero
    if 'resumen_financiero' in graficos:
        pdf.chapter_title('GRAFICO: RESUMEN FINANCIERO')
        pdf.add_image_from_bytes(graficos['resumen_financiero'], x=10, w=190)
        pdf.ln(10)
    
    # Nueva página para distribución de gastos
    pdf.add_page()
    
    # Análisis por categorías (tabla)
    if not transacciones.empty:
        pdf.chapter_title('GASTOS POR CATEGORIA')
        gastos_cat = transacciones[transacciones['tipo'] == 'gasto'].groupby('categoria')['monto'].sum().sort_values(ascending=False)
        
        for categoria, monto in gastos_cat.items():
            porcentaje = (monto / analisis['resumen']['total_gastos'] * 100) if analisis['resumen']['total_gastos'] > 0 else 0
            pdf.set_font('Arial', '', 10)
            pdf.cell(70, 7, f'  {categoria}', 0, 0)
            pdf.cell(50, 7, f'${monto:,.2f}', 0, 0)
            pdf.cell(0, 7, f'({porcentaje:.1f}%)', 0, 1)
        pdf.ln(5)
    
    # Agregar gráfico de distribución
    if 'distribucion_gastos' in graficos:
        pdf.chapter_title('GRAFICO: DISTRIBUCION DE GASTOS')
        pdf.add_image_from_bytes(graficos['distribucion_gastos'], x=10, w=190)
        pdf.ln(10)
    
    # Nueva página para tendencias
    pdf.add_page()
    
    # Agregar gráfico de tendencias
    if 'tendencia_gastos' in graficos:
        pdf.chapter_title('GRAFICO: TENDENCIA DE GASTOS')
        pdf.add_image_from_bytes(graficos['tendencia_gastos'], x=10, w=190)
        pdf.ln(10)
    
    # Comparación con presupuestos
    if not presupuestos.empty and not transacciones.empty:
        pdf.chapter_title('COMPARACION CON PRESUPUESTOS')
        gastos_cat = transacciones[transacciones['tipo'] == 'gasto'].groupby('categoria')['monto'].sum()
        presupuestos_dict = presupuestos.set_index('categoria')['monto_maximo'].to_dict()
        
        # Encabezados
        pdf.set_font('Arial', 'B', 10)
        pdf.cell(50, 7, 'Categoria', 1, 0, 'C')
        pdf.cell(35, 7, 'Gasto Real', 1, 0, 'C')
        pdf.cell(35, 7, 'Presupuesto', 1, 0, 'C')
        pdf.cell(30, 7, '% Uso', 1, 0, 'C')
        pdf.cell(30, 7, 'Estado', 1, 1, 'C')
        
        for categoria in set(gastos_cat.index) & set(presupuestos_dict.keys()):
            gasto = gastos_cat[categoria]
            presupuesto = presupuestos_dict[categoria]
            cumplimiento = (gasto / presupuesto * 100) if presupuesto > 0 else 0
            estado = 'OK' if cumplimiento <= 100 else 'EXCEDIDO'
            
            pdf.set_font('Arial', '', 9)
            pdf.cell(50, 6, f'{categoria[:20]}', 1, 0)
            pdf.cell(35, 6, f'${gasto:,.2f}', 1, 0, 'R')
            pdf.cell(35, 6, f'${presupuesto:,.2f}', 1, 0, 'R')
            pdf.cell(30, 6, f'{cumplimiento:.1f}%', 1, 0, 'C')
            
            pdf.set_font('Arial', 'B', 9)
            if estado == 'EXCEDIDO':
                pdf.set_text_color(255, 0, 0)
            else:
                pdf.set_text_color(0, 128, 0)
            pdf.cell(30, 6, estado, 1, 1, 'C')
            pdf.set_text_color(0, 0, 0)
        pdf.ln(5)
    
    # Predicciones
    pdf.chapter_title('PROYECCIONES FINANCIERAS')
    pdf.add_metric('Ahorro proyectado (3 meses)', f"${analisis['predicciones']['ahorro_3_meses']:,.2f}")
    pdf.add_metric('Gastos del proximo mes', f"${analisis['predicciones']['proyeccion_gastos']:,.2f}")
    
    try:
        pdf_output = pdf.output()
        if isinstance(pdf_output, str):
            return pdf_output.encode('latin1')
        return pdf_output
    except:
        return pdf.output(dest='S').encode('latin1')

# ==================== FUNCIONES AUXILIARES ====================

def mostrar_chat(usuario_id):
    """Chat simple y funcional con scroll que realmente funciona"""
    
    # Inicializar mensajes
    if 'mensajes' not in st.session_state:
        st.session_state.mensajes = [
            {
                "role": "assistant", 
                "content": "¡Hola! 👋 Soy tu asistente financiero de FinanciaUNT.\n\nEjemplos:\n- Gasté 80 soles en supermercado y 20 en la escuela\n- Añade 50 de almuerzo hace dos dias, mi preupuesto mensual es de 20 soles\n\nEn un mensaje puedes mandar varias operaciones para ingresos, gastos y presupuestos."
            }
        ]
    
    # CSS Simple pero efectivo
    st.markdown("""
        <style>
        .chat-box {
            background: #1e1e2e;
            border-radius: 12px;
            padding: 0;
            margin: 10px 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        
        .chat-header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px;
            font-weight: 600;
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        
        .chat-msg-container {
            background: #252535;
            padding: 12px;
            height: 350px;
            overflow-y: scroll;
            overflow-x: hidden;
        }
        
        .msg-assistant {
            background: #3a3a4a;
            color: #e8e8e8;
            padding: 10px 12px;
            border-radius: 12px;
            border-bottom-left-radius: 3px;
            margin: 8px 15% 8px 0;
            font-size: 13px;
            line-height: 1.5;
            max-width: 85%;
            word-wrap: break-word;
            white-space: pre-wrap;
        }
        
        .msg-user {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 10px 12px;
            border-radius: 12px;
            border-bottom-right-radius: 3px;
            margin: 8px 0 8px 15%;
            font-size: 13px;
            line-height: 1.5;
            text-align: right;
            max-width: 85%;
            word-wrap: break-word;
            white-space: pre-wrap;
            margin-left: auto;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Construir todo el chat como HTML
    chat_html = '<div class="chat-box">'
    chat_html += '<div class="chat-header">💬 Chat Financiero</div>'
    chat_html += '<div class="chat-msg-container" id="chatMessages">'
    
    # Agregar todos los mensajes
    for mensaje in st.session_state.mensajes:
        contenido = mensaje["content"].replace("\n", "<br>")
        if mensaje["role"] == "assistant":
            chat_html += f'<div class="msg-assistant">{contenido}</div>'
        else:
            chat_html += f'<div class="msg-user">{contenido}</div>'
    
    chat_html += '</div></div>'
    
    # Renderizar el chat completo
    st.markdown(chat_html, unsafe_allow_html=True)
    
    # Form para input
    with st.form(key=f"chat_form_{len(st.session_state.mensajes)}", clear_on_submit=True):
        col1, col2 = st.columns([4, 1])
        
        with col1:
            user_input = st.text_input(
                "msg",
                placeholder="Escribe tu gasto aquí...",
                label_visibility="collapsed"
            )
        
        with col2:
            enviar = st.form_submit_button("➤", use_container_width=True)
        
        if enviar and user_input.strip():
            # Agregar mensaje del usuario
            st.session_state.mensajes.append({
                "role": "user",
                "content": user_input.strip()
            })
            
            st.rerun()

# ==================== PAGINAS ====================

def pagina_dashboard(db: DatabaseManager, usuario_mgr: UsuarioManager, 
                     transaccion_mgr: TransaccionManager, presupuesto_mgr: PresupuestoManager,
                     alerta_mgr: AlertaManager, meta_mgr: MetaManager, rec_mgr: RecomendacionManager):
    """Página principal del dashboard financiero"""

    with st.sidebar:
        st.header(f"👤 {st.session_state['user_name']}")
        st.caption(f"Rol: {st.session_state.get('user_role', 'cliente')}")
        
        periodo = st.selectbox("Periodo de análisis", ["Últimos 7 días", "Últimos 30 días", "Últimos 90 días"], 1)
        dias_map = {"Últimos 7 días": 7, "Últimos 30 días": 30, "Últimos 90 días": 90}
        dias = dias_map[periodo]

        st.divider()
        mostrar_chat(st.session_state['user_id'])

        st.markdown("---")
        st.header("⚡ Acciones Rápidas")
        if st.button("🔄 Actualizar Análisis", use_container_width=True):
            st.rerun()
        
        # Botón para generar PDF
        if st.button("📄 Generar Reporte PDF", use_container_width=True, type="primary"):
            with st.spinner('📄 Generando reporte PDF...'):
                try:
                    transacciones_pdf = transaccion_mgr.listar_transacciones(st.session_state['user_id'], dias)
                    presupuestos_pdf = presupuesto_mgr.listar_presupuestos(st.session_state['user_id'])
                    asesor_pdf = AsesorFinanciero(transaccion_mgr, presupuesto_mgr)
                    analisis_pdf = asesor_pdf.get_analisis_ia(transacciones_pdf, presupuestos_pdf)
                    
                    # Generar PDF
                    pdf_bytes = generar_reporte_pdf(
                        st.session_state['user_name'], 
                        transacciones_pdf, 
                        analisis_pdf, 
                        presupuestos_pdf
                    )
                    
                    # Asegurar que sea bytes
                    if isinstance(pdf_bytes, bytearray):
                        pdf_bytes = bytes(pdf_bytes)
                    
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    
                    st.success("✅ ¡Reporte PDF generado exitosamente!")
                    st.download_button(
                        label="📥 Descargar Reporte PDF",
                        data=pdf_bytes,
                        file_name=f"reporte_financiero_{timestamp}.pdf",
                        mime="application/pdf",
                        use_container_width=True
                    )
                
                except Exception as e:
                    st.error(f"❌ Error al generar PDF: {str(e)}")
        
        st.divider()
        if st.button("🚪 Cerrar Sesión", type="secondary"):
            for key in st.session_state.keys():
                del st.session_state[key]
            st.rerun()

    st.title("💰 Dashboard Financiero - FinanciaUNT")
    
    usuario_id = st.session_state['user_id']
    
    # Tabs para organizar el contenido
    tab_resumen, tab_recomendaciones, tab_metas, tab_detalle = st.tabs(["📊 Resumen", "🧠 Recomendaciones IA", "🎯 Metas", "📋 Detalle"])

    # Obtener datos
    transacciones = transaccion_mgr.listar_transacciones(usuario_id, dias)
    presupuestos = presupuesto_mgr.listar_presupuestos(usuario_id)
    metas = meta_mgr.listar_metas(usuario_id)
    
    asesor = AsesorFinanciero(transaccion_mgr, presupuesto_mgr)
    analisis = asesor.get_analisis_ia(transacciones, presupuestos)
    
    with tab_resumen:
        # Mostrar alertas del sistema como notificaciones temporales (10 segundos)
        df_alertas = alerta_mgr.listar_alertas(usuario_id, solo_no_leidas=True)
        if not df_alertas.empty:
            with st.container():
                for idx, alerta in df_alertas.head(3).iterrows():
                    if alerta['severidad'] == 'alta':
                        st.error(f"🔴 {alerta['mensaje']}", icon="🚨")
                    elif alerta['severidad'] == 'media':
                        st.warning(f"🟡 {alerta['mensaje']}", icon="⚠️")
                    else:
                        st.info(f"🟢 {alerta['mensaje']}", icon="ℹ️")
                    
                    alerta_mgr.marcar_leida(alerta['id'])
        
        # Métricas principales
        col1, col2, col3, col4 = st.columns(4)
        
        with col1:
            st.metric(
                "💵 Ingresos Totales",
                f"${analisis['resumen']['total_ingresos']:,.2f}"
            )
        
        with col2:
            st.metric(
                "💸 Gastos Totales",
                f"${analisis['resumen']['total_gastos']:,.2f}",
                delta=f"-${analisis['resumen']['total_gastos']:,.2f}",
                delta_color="inverse"
            )
        
        with col3:
            st.metric(
                "💰 Ahorro Neto",
                f"${analisis['resumen']['ahorro_neto']:,.2f}",
                delta=f"{analisis['resumen']['tasa_ahorro']:.1f}%"
            )
        
        with col4:
            st.metric(
                "📈 Proyección 3 Meses",
                f"${analisis['predicciones']['ahorro_3_meses']:,.2f}",
                delta="+5%"
            )
        
        st.markdown("---")
        
        # Gráficos y análisis
        col1, col2 = st.columns(2)
        
        with col1:
            st.subheader("📊 Distribución de Gastos")
            if not transacciones.empty:
                gastos_categoria = transacciones[transacciones['tipo'] == 'gasto'].groupby('categoria')['monto'].sum()
                if not gastos_categoria.empty:
                    fig = px.pie(
                        values=gastos_categoria.values,
                        names=gastos_categoria.index,
                        hole=0.4,
                        color_discrete_sequence=px.colors.qualitative.Set3
                    )
                    fig.update_layout(showlegend=True, height=400)
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No hay gastos registrados")
            else:
                st.info("No hay transacciones en este período")
            
            # Tendencias
            st.subheader("📈 Tendencias de Gastos")
            if not transacciones.empty:
                transacciones_copy = transacciones.copy()
                transacciones_copy['fecha'] = pd.to_datetime(transacciones_copy['fecha'])
                gastos_diarios = transacciones_copy[transacciones_copy['tipo'] == 'gasto'].groupby('fecha')['monto'].sum().reset_index()
                
                if not gastos_diarios.empty:
                    fig = px.line(
                        gastos_diarios,
                        x='fecha',
                        y='monto',
                        title='Evolución de Gastos Diarios'
                    )
                    fig.update_layout(height=300)
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No hay gastos para mostrar tendencias")
            else:
                st.info("No hay datos de tendencias")
        
        with col2:
            st.subheader("🎯 Presupuesto Mensual vs Realidad")
            if not transacciones.empty and not presupuestos.empty:
                gastos_categoria = transacciones[transacciones['tipo'] == 'gasto'].groupby('categoria')['monto'].sum()
                presupuestos_dict = presupuestos.set_index('categoria')['monto_maximo'].to_dict()
                
                comparacion_data = []
                for cat in set(gastos_categoria.index) & set(presupuestos_dict.keys()):
                    gasto_real = gastos_categoria.get(cat, 0)
                    presupuesto = presupuestos_dict.get(cat, 0)
                    comparacion_data.append({
                        'Categoría': cat,
                        'Gasto Real': gasto_real,
                        'Presupuesto': presupuesto,
                        'Diferencia': presupuesto - gasto_real
                    })
                
                if comparacion_data:
                    df_comparacion = pd.DataFrame(comparacion_data)
                    
                    fig = go.Figure()
                    fig.add_trace(go.Bar(
                        name='Gasto Real',
                        x=df_comparacion['Categoría'],
                        y=df_comparacion['Gasto Real'],
                        marker_color='#EF553B'
                    ))
                    fig.add_trace(go.Bar(
                        name='Presupuesto',
                        x=df_comparacion['Categoría'],
                        y=df_comparacion['Presupuesto'],
                        marker_color='#00CC96'
                    ))
                    
                    fig.update_layout(barmode='group', height=400)
                    st.plotly_chart(fig, use_container_width=True)
                else:
                    st.info("No hay categorías comunes para comparar")
            else:
                st.info("Configura presupuestos para ver comparaciones")
            
            # Recomendaciones básicas
            st.subheader("💡 Recomendaciones")
            for rec in analisis['recomendaciones']:
                st.info(rec)
    
    with tab_recomendaciones:
        st.header("🧠 Recomendaciones IA - 3 Modelos Comparados")
        
        # Obtener todas las transacciones para el modelo colaborativo
        all_transacciones = transaccion_mgr.listar_transacciones(dias=365)
        
        comparator = RecommenderComparator()
        recs = comparator.get_all_recommendations(
            transacciones, 
            all_transacciones, 
            presupuestos, 
            metas
        )
        
        col_model1, col_model2, col_model3 = st.columns(3)
        
        with col_model1:
            st.subheader("📊 Modelo 1: Reglas Estadísticas")
            st.caption("Análisis basado en patrones de gastos y presupuestos")
            for r in recs['por_modelo']['Modelo Reglas Estadísticas'][:5]:
                with st.expander(f"{r['categoria']}: {r['tipo_recomendacion']}"):
                    st.write(r['recomendacion'])
                    st.write(f"**Acción sugerida**: {r['accion']}")
                    st.write(f"**Beneficio**: {r['beneficio']}")
        
        with col_model2:
            st.subheader("👥 Modelo 2: Filtrado Colaborativo")
            st.caption("Comparación con usuarios similares")
            for r in recs['por_modelo']['Modelo Filtrado Colaborativo'][:5]:
                with st.expander(f"{r['categoria']}: {r['tipo_recomendacion']}"):
                    st.write(r['recomendacion'])
                    if 'accion' in r:
                        st.write(f"**Acción sugerida**: {r['accion']}")
        
        with col_model3:
            st.subheader("🎯 Modelo 3: Optimización de Ahorro")
            st.caption("Predicciones y metas")
            for r in recs['por_modelo']['Modelo Optimización de Ahorro'][:5]:
                with st.expander(f"{r['categoria']}: {r['tipo_recomendacion']}"):
                    st.write(r['recomendacion'])
                    if 'accion' in r:
                        st.write(f"**Acción sugerida**: {r['accion']}")
        
        st.divider()
        st.subheader("🏆 Mejores Recomendaciones (Combinadas)")
        
        for idx, r in enumerate(recs['mejores'][:5]):
            st.markdown(f"""
            &lt;div style="border:1px solid #ddd; border-radius:10px; padding:15px; margin:10px 0; 
            background: linear-gradient(90deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%);"&gt;
                &lt;span style="font-weight:bold; font-size:16px;"&gt;{idx+1}. {r['categoria']}&lt;/span&gt;&lt;br&gt;
                &lt;small style="color:#666;"&gt;Modelo: {r['modelo']} | Prioridad: {r['prioridad']}&lt;/small&gt;&lt;br&gt;&lt;br&gt;
                {r['recomendacion']}
                {'&lt;br&gt;&lt;small&gt;&lt;b&gt;Acción:&lt;/b&gt; ' + r['accion'] + '&lt;/small&gt;' if 'accion' in r else ''}
            &lt;/div&gt;
            """, unsafe_allow_html=True)
    
    with tab_metas:
        st.header("🎯 Metas Financieras")
        
        if not metas.empty:
            cols = st.columns(2)
            for idx, meta in metas.iterrows():
                with cols[idx % 2]:
                    with st.container():
                        st.subheader(meta['nombre'])
                        st.write(meta['descripcion'])
                        
                        progreso = (meta['monto_actual'] / meta['monto_objetivo']) * 100
                        st.progress(min(progreso, 100) / 100)
                        
                        col1, col2 = st.columns(2)
                        col1.metric("💰 Actual", f"${meta['monto_actual']:,.2f}")
                        col2.metric("🎯 Objetivo", f"${meta['monto_objetivo']:,.2f}")
                        
                        if meta['fecha_limite']:
                            st.caption(f"📅 Fecha límite: {meta['fecha_limite']}")
                        
                        if st.button(f"Agregar ahorro a {meta['nombre']}", key=f"meta_{meta['id']}"):
                            nuevo_monto = st.number_input("Monto a agregar", min_value=0.0, step=10.0, key=f"in_{meta['id']}")
                            if nuevo_monto > 0:
                                meta_mgr.actualizar_meta(meta['id'], {'monto_actual': meta['monto_actual'] + nuevo_monto})
                                st.success(f"✅ ¡Agregado ${nuevo_monto} a tu meta!")
                                st.rerun()
        else:
            st.info("No tienes metas financieras configuradas.")
        
        st.markdown("---")
        with st.expander("➕ Crear nueva meta"):
            with st.form("form_crear_meta"):
                nombre = st.text_input("Nombre de la meta")
                descripcion = st.text_area("Descripción")
                monto_objetivo = st.number_input("Monto objetivo", min_value=0.0, step=100.0)
                fecha_limite = st.date_input("Fecha límite", min_value=datetime.now())
                
                if st.form_submit_button("Crear meta"):
                    meta_mgr.crear_meta(
                        usuario_id=usuario_id,
                        nombre=nombre,
                        descripcion=descripcion,
                        tipo='ahorro',
                        monto_objetivo=monto_objetivo,
                        fecha_limite=fecha_limite.strftime('%Y-%m-%d')
                    )
                    st.success("✅ Meta creada exitosamente!")
                    st.rerun()
    
    with tab_detalle:
        st.header("📋 Transacciones Recientes")
        if not transacciones.empty:
            st.dataframe(
                transacciones.sort_values('fecha', ascending=False)[
                    ['fecha', 'categoria', 'descripcion', 'monto', 'tipo', 'cuenta']
                ],
                use_container_width=True
            )
        else:
            st.info("No hay transacciones registradas")


def pagina_admin(db: DatabaseManager, usuario_mgr: UsuarioManager, 
                 transaccion_mgr: TransaccionManager, presupuesto_mgr: PresupuestoManager,
                 alerta_mgr: AlertaManager, meta_mgr: MetaManager):
    """Página de administración"""
    
    st.title("🔧 Panel de Administración - FinanciaUNT")
    
    with st.sidebar:
        st.header(f"👤 Admin: {st.session_state['user_name']}")
        
        st.divider()
        if st.button("🚪 Cerrar Sesión", type="secondary"):
            for key in st.session_state.keys():
                del st.session_state[key]
            st.rerun()
    
    tab_usuarios, tab_estadisticas = st.tabs(["👥 Usuarios", "📊 Estadísticas Generales"])
    
    with tab_usuarios:
        st.subheader("Gestión de Usuarios")
        
        usuarios = usuario_mgr.listar_usuarios()
        if not usuarios.empty:
            st.metric("Total Usuarios", len(usuarios))
            st.dataframe(usuarios, use_container_width=True)
            
            with st.expander("➕ Crear nuevo usuario"):
                with st.form("form_crear_usuario_admin"):
                    email = st.text_input("Email")
                    nombre = st.text_input("Nombre")
                    rol = st.selectbox("Rol", ["cliente", "admin"])
                    plan = st.selectbox("Plan", ["basico", "premium", "enterprise"])
                    contraseña = st.text_input("Contraseña", type="password")
                    
                    if st.form_submit_button("Crear Usuario"):
                        usuario_mgr.crear_usuario(email, nombre, plan, contraseña, rol)
                        st.success("✅ Usuario creado exitosamente!")
                        st.rerun()
        else:
            st.info("No hay usuarios registrados")
    
    with tab_estadisticas:
        st.subheader("Estadísticas Generales del Sistema")
        
        all_transacciones = transaccion_mgr.listar_transacciones(dias=365)
        all_presupuestos = presupuesto_mgr.listar_presupuestos()
        
        if not all_transacciones.empty:
            col1, col2, col3 = st.columns(3)
            col1.metric("Total de Transacciones", len(all_transacciones))
            col2.metric("Ingresos Totales (Todos)", f"${all_transacciones[all_transacciones['tipo'] == 'ingreso']['monto'].sum():,.2f}")
            col3.metric("Gastos Totales (Todos)", f"${all_transacciones[all_transacciones['tipo'] == 'gasto']['monto'].sum():,.2f}")
            
            # Gráfico de gastos por usuario
            st.subheader("📊 Gastos por Usuario")
            gastos_usuario = all_transacciones[all_transacciones['tipo'] == 'gasto'].groupby('usuario_id')['monto'].sum().reset_index()
            
            fig = px.bar(gastos_usuario, x='usuario_id', y='monto', title='Gastos por Usuario')
            st.plotly_chart(fig, use_container_width=True)


def pagina_mantenedores(db: DatabaseManager, usuario_mgr: UsuarioManager, 
                        transaccion_mgr: TransaccionManager, presupuesto_mgr: PresupuestoManager,
                        alerta_mgr: AlertaManager, meta_mgr: MetaManager):
    """Página de mantenedores (para clientes)"""
    
    st.title("⚙️ Mantenedores - FinanciaUNT")
    
    usuario_id = st.session_state['user_id']
    
    with st.sidebar:
        st.header(f"👤 {st.session_state['user_name']}")
        if st.button("🚪 Cerrar Sesión"):
            for key in st.session_state.keys():
                del st.session_state[key]
            st.rerun()
    
    menu = st.tabs(["💳 Transacciones", "🎯 Presupuestos", "⚙️ Mis Datos"])
    
    with menu[0]:
        st.subheader("Mantenedor de Transacciones")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("➕ Agregar Transacción")
            with st.form("form_agregar_transaccion"):
                tipo = st.selectbox("Tipo", ["gasto", "ingreso"])
                categoria = st.selectbox("Categoría", [
                    "Alimentación", "Transporte", "Entretenimiento", "Servicios",
                    "Salud", "Educación", "Compras", "Ingresos", "Otros"
                ])
                monto = st.number_input("Monto", min_value=0.0, step=10.0)
                descripcion = st.text_input("Descripción")
                fecha = st.date_input("Fecha", datetime.now())
                cuenta = st.text_input("Cuenta", "Cuenta Principal")
                
                if st.form_submit_button("Agregar"):
                    transaccion_mgr.crear_transaccion(
                        usuario_id, monto, categoria, descripcion, 
                        fecha.strftime("%Y-%m-%d"), tipo, cuenta
                    )
                    st.success("✅ Transacción agregada exitosamente!")
                    st.rerun()
        
        with col2:
            st.write("📋 Tus Transacciones")
            trans = transaccion_mgr.listar_transacciones(usuario_id)
            if not trans.empty:
                st.dataframe(trans[['fecha', 'categoria', 'descripcion', 'monto', 'tipo']], use_container_width=True)
            else:
                st.info("No hay transacciones")
    
    with menu[1]:
        st.subheader("Mantenedor de Presupuestos")
        
        col1, col2 = st.columns(2)
        
        with col1:
            st.write("➕ Agregar Presupuesto")
            with st.form("form_agregar_presupuesto"):
                categoria = st.selectbox("Categoría", [
                    "Alimentación", "Transporte", "Entretenimiento", "Servicios",
                    "Salud", "Educación", "Compras", "Otros"
                ])
                monto_maximo = st.number_input("Monto Máximo Mensual", min_value=0.0, step=50.0)
                periodo = st.selectbox("Periodo", ["mensual"])
                
                if st.form_submit_button("Agregar"):
                    presupuesto_mgr.crear_presupuesto(usuario_id, categoria, monto_maximo, periodo)
                    st.success("✅ Presupuesto agregado exitosamente!")
                    st.rerun()
        
        with col2:
            st.write("📋 Tus Presupuestos")
            pres = presupuesto_mgr.listar_presupuestos(usuario_id)
            if not pres.empty:
                st.dataframe(pres, use_container_width=True)
            else:
                st.info("No hay presupuestos")
    
    with menu[2]:
        st.subheader("Mis Datos")
        usuario = usuario_mgr.obtener_usuario(usuario_id)
        if usuario:
            st.write(f"**Nombre:** {usuario.get('nombre', '')}")
            st.write(f"**Email:** {usuario.get('email', '')}")
            st.write(f"**Plan:** {usuario.get('plan_suscripcion', '')}")
            st.write(f"**Rol:** {usuario.get('rol', 'cliente')}")


# ==================== FLUJO PRINCIPAL ====================

def main():
    """Flujo principal de la aplicación"""
    
    # Verificar si está autenticado
    if 'logged_in' not in st.session_state or not st.session_state['logged_in']:
        main_auth()
    else:
        # Inicializar managers
        db_manager = DatabaseManager()
        usuario_manager = UsuarioManager(db_manager)
        transaccion_manager = TransaccionManager(db_manager)
        presupuesto_manager = PresupuestoManager(db_manager)
        alerta_manager = AlertaManager(db_manager)
        meta_manager = MetaManager(db_manager)
        recomendacion_manager = RecomendacionManager(db_manager)
        
        user_role = st.session_state.get('user_role', 'cliente')
        
        if user_role == 'admin':
            # Menú para admin
            pagina = st.sidebar.radio(
                "Navegación",
                ["📊 Panel Admin", "📈 Dashboard", "⚙️ Mantenedores"]
            )
            
            if pagina == "📊 Panel Admin":
                pagina_admin(db_manager, usuario_manager, transaccion_manager, 
                           presupuesto_manager, alerta_manager, meta_manager)
            elif pagina == "📈 Dashboard":
                pagina_dashboard(db_manager, usuario_manager, transaccion_manager, 
                               presupuesto_manager, alerta_manager, meta_manager, recomendacion_manager)
            elif pagina == "⚙️ Mantenedores":
                pagina_mantenedores(db_manager, usuario_manager, transaccion_manager, 
                                  presupuesto_manager, alerta_manager, meta_manager)
        else:
            # Menú para clientes
            pagina = st.sidebar.radio(
                "Navegación",
                ["📈 Dashboard", "⚙️ Mantenedores"]
            )
            
            if pagina == "📈 Dashboard":
                pagina_dashboard(db_manager, usuario_manager, transaccion_manager, 
                               presupuesto_manager, alerta_manager, meta_manager, recomendacion_manager)
            elif pagina == "⚙️ Mantenedores":
                pagina_mantenedores(db_manager, usuario_manager, transaccion_manager, 
                                  presupuesto_manager, alerta_manager, meta_manager)


if __name__ == "__main__":
    main()


# init_database.py
"""
Script para inicializar la base de datos con datos de ejemplo
y verificar la configuración
"""

import streamlit as st
from supabase import create_client, Client
from datetime import datetime, timedelta
import random
import uuid

class DatabaseInitializer:
    """Clase para inicializar y poblar la base de datos"""
    
    def __init__(self):
        self.supabase_url = st.secrets.get("SUPABASE_URL")
        self.supabase_key = st.secrets.get("SUPABASE_KEY")
        self.client: Client = create_client(self.supabase_url, self.supabase_key)
    
    def verificar_conexion(self) -> bool:
        """Verificar conexión con Supabase"""
        try:
            response = self.client.table('usuarios').select('count').execute()
            st.success("✅ Conexión con Supabase establecida correctamente")
            return True
        except Exception as e:
            st.error(f"❌ Error de conexión: {str(e)}")
            return False
    
    def limpiar_datos(self):
        """Limpiar todos los datos de las tablas (usar con precaución)"""
        tablas = ['alertas', 'analisis_financiero', 'inversiones', 
                  'transacciones', 'presupuestos', 'suscripciones', 'usuarios']
        
        for tabla in tablas:
            try:
                # Nota: En Supabase no hay truncate directo, usar delete
                self.client.table(tabla).delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()
                st.info(f"Tabla {tabla} limpiada")
            except Exception as e:
                st.warning(f"No se pudo limpiar {tabla}: {str(e)}")
    
    def crear_usuarios_ejemplo(self, cantidad: int = 3) -> list:
        """Crear usuarios de ejemplo"""
        usuarios_creados = []
        
        # Crear admin primero
        admin_usuario = {
            'email': "admin@financiaunt.com",
            'nombre': "Administrador",
            'plan_suscripcion': "enterprise",
            'rol': "admin",
            'access_token_plaid': "admin123",
            'configuracion': {
                'moneda': 'USD',
                'idioma': 'es',
                'notificaciones': True
            }
        }
        
        try:
            response = self.client.table('usuarios').insert(admin_usuario).execute()
            if response.data:
                usuarios_creados.append(response.data[0])
                st.success("✅ ¡Usuario Admin creado! Email: admin@financiaunt.com, Contraseña: admin123")
        except Exception as e:
            st.warning(f"Admin ya existe o error: {str(e)}")
        
        nombres = [
            ("Juan Pérez", "juan.perez@email.com", "123456", "cliente"),
            ("María García", "maria.garcia@email.com", "123456", "cliente"),
            ("Carlos Rodríguez", "carlos.rodriguez@email.com", "123456", "cliente"),
            ("Ana Martínez", "ana.martinez@email.com", "123456", "cliente"),
            ("Luis Torres", "luis.torres@email.com", "123456", "cliente")
        ]
        
        planes = ['basico', 'premium', 'enterprise']
        
        for i in range(min(cantidad, len(nombres))):
            nombre, email, contraseña, rol = nombres[i]
            plan = random.choice(planes)
            
            try:
                usuario = {
                    'email': email,
                    'nombre': nombre,
                    'plan_suscripcion': plan,
                    'rol': rol,
                    'access_token_plaid': contraseña,
                    'configuracion': {
                        'moneda': 'USD',
                        'idioma': 'es',
                        'notificaciones': True
                    }
                }
                
                response = self.client.table('usuarios').insert(usuario).execute()
                if response.data:
                    usuarios_creados.append(response.data[0])
                    st.success(f"✅ Usuario creado: {nombre} ({plan})")
            except Exception as e:
                st.error(f"❌ Error al crear usuario {nombre}: {str(e)}")
        
        return usuarios_creados
    
    def crear_metas_ejemplo(self, usuario_id: str):
        """Crear metas financieras de ejemplo"""
        metas = [
            {'nombre': 'Vacaciones', 'descripcion': 'Vacaciones a la playa', 'tipo': 'ahorro', 'monto_objetivo': 2000, 'monto_actual': 500, 'fecha_limite': (datetime.now() + timedelta(days=180)).strftime('%Y-%m-%d')},
            {'nombre': 'Emergencia', 'descripcion': 'Fondo de emergencia', 'tipo': 'ahorro', 'monto_objetivo': 5000, 'monto_actual': 1000, 'fecha_limite': (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')}
        ]
        
        for meta in metas:
            meta['usuario_id'] = usuario_id
            try:
                self.client.table('metas_financieras').insert(meta).execute()
            except Exception as e:
                st.warning(f"Error al crear meta: {str(e)}")
        
        st.success("✅ Metas financieras de ejemplo creadas!")
    
    def login(self, usuario):
        try:
            response = self.client.table('usuarios').select('*').eq('email',usuario['email']).eq('access_token_plaid',usuario['access_token_plaid']).execute()
            
            if not response.data:
                st.error("❌ Credenciales incorrectas o usuario no encontrado")
                return False
                
            st.session_state['user_id'] = response.data[0]['id']
            st.session_state['user_name'] = response.data[0]['nombre']
            st.session_state['user_role'] = response.data[0].get('rol', 'cliente')
            st.session_state['user_email'] = response.data[0].get('email', '')
            return True
        except Exception as e:
            st.error(f"❌ Error al ingresar: {str(e)}")
            return False

    def register(self, usuario):
        try:
            self.client.table('usuarios').insert(usuario).execute()
            st.success('Usuario registrado')
        except Exception as e:
            st.error(f"❌ Error al crear usuario: {e}")

    def crear_transacciones_ejemplo(self, usuario_id: str, cantidad: int = 50):
        """Crear transacciones de ejemplo para un usuario"""
        categorias_gasto = [
            'Alimentación', 'Transporte', 'Entretenimiento', 
            'Servicios', 'Salud', 'Educación', 'Compras', 'Otros'
        ]
        
        descripciones = {
            'Alimentación': ['Supermercado', 'Restaurante', 'Cafetería', 'Delivery'],
            'Transporte': ['Gasolina', 'Uber', 'Taxi', 'Mantenimiento auto'],
            'Entretenimiento': ['Cine', 'Streaming', 'Videojuegos', 'Concierto'],
            'Servicios': ['Luz', 'Agua', 'Internet', 'Teléfono'],
            'Salud': ['Farmacia', 'Médico', 'Gimnasio', 'Seguro'],
            'Educación': ['Libros', 'Curso online', 'Material escolar'],
            'Compras': ['Ropa', 'Electrónicos', 'Hogar'],
            'Otros': ['Varios', 'Misceláneos']
        }
        
        transacciones_creadas = 0
        
        for i in range(cantidad):
            # 80% gastos, 20% ingresos
            es_ingreso = random.random() < 0.2
            
            if es_ingreso:
                transaccion = {
                    'usuario_id': usuario_id,
                    'monto': round(random.uniform(1000, 5000), 2),
                    'categoria': 'Ingresos',
                    'descripcion': random.choice(['Salario', 'Freelance', 'Bono', 'Venta']),
                    'fecha': (datetime.now() - timedelta(days=random.randint(0, 90))).strftime('%Y-%m-%d'),
                    'tipo': 'ingreso',
                    'cuenta': 'Cuenta Principal',
                    'metadata': {'generado': 'ejemplo'}
                }
            else:
                categoria = random.choice(categorias_gasto)
                transaccion = {
                    'usuario_id': usuario_id,
                    'monto': round(random.uniform(10, 500), 2),
                    'categoria': categoria,
                    'descripcion': random.choice(descripciones[categoria]),
                    'fecha': (datetime.now() - timedelta(days=random.randint(0, 90))).strftime('%Y-%m-%d'),
                    'tipo': 'gasto',
                    'cuenta': random.choice(['Cuenta Principal', 'Tarjeta Crédito', 'Efectivo']),
                    'metadata': {'generado': 'ejemplo'}
                }
            
            try:
                self.client.table('transacciones').insert(transaccion).execute()
                transacciones_creadas += 1
            except Exception as e:
                st.warning(f"Error al crear transacción: {str(e)}")
        
        st.success(f"✅ {transacciones_creadas} transacciones creadas para el usuario")
    
    def crear_presupuestos_ejemplo(self, usuario_id: str):
        """Crear presupuestos de ejemplo para un usuario"""
        presupuestos = [
            {'categoria': 'Alimentación', 'monto_maximo': 500.00, 'periodo': 'mensual'},
            {'categoria': 'Transporte', 'monto_maximo': 300.00, 'periodo': 'mensual'},
            {'categoria': 'Entretenimiento', 'monto_maximo': 200.00, 'periodo': 'mensual'},
            {'categoria': 'Servicios', 'monto_maximo': 150.00, 'periodo': 'mensual'},
            {'categoria': 'Salud', 'monto_maximo': 100.00, 'periodo': 'mensual'},
            {'categoria': 'Educación', 'monto_maximo': 200.00, 'periodo': 'mensual'},
        ]
        
        presupuestos_creados = 0
        
        for presupuesto in presupuestos:
            presupuesto['usuario_id'] = usuario_id
            
            try:
                self.client.table('presupuestos').insert(presupuesto).execute()
                presupuestos_creados += 1
            except Exception as e:
                st.warning(f"Error al crear presupuesto {presupuesto['categoria']}: {str(e)}")
        
        st.success(f"✅ {presupuestos_creados} presupuestos creados para el usuario")
    
    def crear_alertas_ejemplo(self, usuario_id: str):
        """Crear alertas de ejemplo"""
        alertas = [
            {
                'tipo': 'presupuesto_excedido',
                'mensaje': 'Has excedido tu presupuesto en Entretenimiento en un 15%',
                'severidad': 'alta',
                'leida': False
            },
            {
                'tipo': 'gasto_inusual',
                'mensaje': 'Gasto inusual detectado: $450 en Compras',
                'severidad': 'media',
                'leida': False
            },
            {
                'tipo': 'recordatorio',
                'mensaje': 'Recuerda revisar tus suscripciones mensuales',
                'severidad': 'baja',
                'leida': False
            },
            {
                'tipo': 'sugerencia',
                'mensaje': 'Podrías ahorrar $50 reduciendo gastos en delivery',
                'severidad': 'baja',
                'leida': True
            }
        ]
        
        alertas_creadas = 0
        
        for alerta in alertas:
            alerta['usuario_id'] = usuario_id
            
            try:
                self.client.table('alertas').insert(alerta).execute()
                alertas_creadas += 1
            except Exception as e:
                st.warning(f"Error al crear alerta: {str(e)}")
        
        st.success(f"✅ {alertas_creadas} alertas creadas para el usuario")
    
    def inicializar_completo(self):
        """Inicialización completa con datos de ejemplo"""
        st.header("🔧 Inicialización de Base de Datos")
        
        if not self.verificar_conexion():
            return
        
        st.markdown("---")
        
        # Opción de limpiar datos existentes
        if st.checkbox("⚠️ Limpiar datos existentes (PRECAUCIÓN)"):
            if st.button("🗑️ Confirmar Limpieza"):
                self.limpiar_datos()
                st.info("Datos limpiados. Proceda con la creación de datos de ejemplo.")
        
        st.markdown("---")
        st.subheader("Crear Datos de Ejemplo")
        
        col1, col2 = st.columns(2)
        
        with col1:
            cantidad_usuarios = st.number_input("Cantidad de usuarios", min_value=1, max_value=5, value=3)
        
        with col2:
            cantidad_transacciones = st.number_input("Transacciones por usuario", min_value=10, max_value=100, value=50)
        
        if st.button("🚀 Inicializar Base de Datos", type="primary"):
            with st.spinner("Creando datos de ejemplo..."):
                # Crear usuarios
                st.subheader("👥 Creando Usuarios")
                usuarios = self.crear_usuarios_ejemplo(cantidad_usuarios)
                
                if usuarios:
                    # Para cada usuario crear transacciones, presupuestos, alertas y metas
                    for i, usuario in enumerate(usuarios):
                        st.markdown(f"---")
                        st.subheader(f"📊 Datos para {usuario['nombre']}")
                        
                        if usuario['rol'] == 'cliente':
                            # Transacciones
                            self.crear_transacciones_ejemplo(usuario['id'], cantidad_transacciones)
                            
                            # Presupuestos
                            self.crear_presupuestos_ejemplo(usuario['id'])
                            
                            # Alertas
                            self.crear_alertas_ejemplo(usuario['id'])
                            
                            # Metas
                            self.crear_metas_ejemplo(usuario['id'])
                
                st.markdown("---")
                st.success("✅ ¡Inicialización completada exitosamente!")
                st.balloons()

def main():
    st.set_page_config(
        page_title="Inicializar Base de Datos",
        page_icon="🔧",
        layout="wide"
    )
    
    st.title("🔧 Herramienta de Inicialización")
    st.markdown("Utilice esta herramienta para configurar y poblar su base de datos con datos de ejemplo")
    
    # Verificar que existan las credenciales
    if not st.secrets.get("SUPABASE_URL") or not st.secrets.get("SUPABASE_KEY"):
        st.error("❌ Faltan credenciales de Supabase en secrets.toml")
        st.info("""
        Cree un archivo `.streamlit/secrets.toml` con:
        ```toml
        SUPABASE_URL = "tu_url"
        SUPABASE_KEY = "tu_key"
        ```
        """)
        return
    
    # Mostrar información de la base de datos
    with st.expander("ℹ️ Información de Configuración"):
        st.info(f"**URL Supabase:** {st.secrets['SUPABASE_URL']}")
        st.info(f"**API Key:** {st.secrets['SUPABASE_KEY'][:20]}...")
    
    # Tabs para diferentes funciones
    tab1, tab2, tab3 = st.tabs(["🚀 Inicialización Rápida", "🔍 Verificación", "📚 Documentación"])
    
    with tab1:
        initializer = DatabaseInitializer()
        initializer.inicializar_completo()
    
    with tab2:
        st.subheader("🔍 Verificar Estado de la Base de Datos")
        
        if st.button("Verificar Conexión"):
            initializer = DatabaseInitializer()
            if initializer.verificar_conexion():
                # Mostrar conteo de registros
                try:
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        usuarios = initializer.client.table('usuarios').select('*').execute()
                        st.metric("👥 Usuarios", len(usuarios.data) if usuarios.data else 0)
                    
                    with col2:
                        transacciones = initializer.client.table('transacciones').select('*').execute()
                        st.metric("💳 Transacciones", len(transacciones.data) if transacciones.data else 0)
                    
                    with col3:
                        presupuestos = initializer.client.table('presupuestos').select('*').execute()
                        st.metric("🎯 Presupuestos", len(presupuestos.data) if presupuestos.data else 0)
                    
                    col4, col5, col6 = st.columns(3)
                    
                    with col4:
                        alertas = initializer.client.table('alertas').select('*').execute()
                        st.metric("⚠️ Alertas", len(alertas.data) if alertas.data else 0)
                    
                    with col5:
                        inversiones = initializer.client.table('inversiones').select('*').execute()
                        st.metric("📈 Inversiones", len(inversiones.data) if inversiones.data else 0)
                    
                    with col6:
                        suscripciones = initializer.client.table('suscripciones').select('*').execute()
                        st.metric("📄 Suscripciones", len(suscripciones.data) if suscripciones.data else 0)
                    
                except Exception as e:
                    st.error(f"Error al obtener estadísticas: {str(e)}")
    
    with tab3:
        st.subheader("📚 Documentación")
        
        st.markdown("""
        ### Estructura de la Base de Datos
        
        La aplicación utiliza las siguientes tablas:
        
        1. **usuarios**: Almacena información de los usuarios
        2. **transacciones**: Registro de todas las transacciones financieras
        3. **presupuestos**: Límites de gasto por categoría
        4. **alertas**: Notificaciones y alertas para usuarios
        5. **inversiones**: Registro de inversiones (opcional)
        6. **suscripciones**: Información de suscripciones de usuarios
        7. **analisis_financiero**: Análisis generados por IA
        
        ### Uso de la Herramienta
        
        1. **Verificación**: Asegúrese de que la conexión con Supabase funciona
        2. **Inicialización**: Cree datos de ejemplo para pruebas
        3. **Limpieza**: Use con precaución, elimina todos los datos
        
        ### Requisitos
        
        ```bash
        pip install streamlit pandas supabase
        ```
        
        ### Configuración
        
        Archivo `.streamlit/secrets.toml`:
        ```toml
        SUPABASE_URL = "https://xxx.supabase.co"
        SUPABASE_KEY = "tu_api_key"
        N8N_WEBHOOK = ""
        OPENAI_API_KEY = ""
        ```
        """)

if __name__ == "__main__":
    main()
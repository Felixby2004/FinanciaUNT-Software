import streamlit as st
from supabase import create_client, Client

# Configurar la página
st.set_page_config(page_title="Prueba de Conexión", page_icon="🔧")

st.title("🔧 Prueba de Conexión con Supabase")

try:
    # Conectar a Supabase
    supabase_url = st.secrets.get("SUPABASE_URL")
    supabase_key = st.secrets.get("SUPABASE_KEY")
    client: Client = create_client(supabase_url, supabase_key)
    
    st.success("✅ Conexión a Supabase exitosa!")
    
    # Crear usuario de prueba
    st.subheader("Crear usuario de prueba")
    
    nombre = st.text_input("Nombre", "Usuario Prueba")
    email = st.text_input("Email", "prueba@email.com")
    contraseña = st.text_input("Contraseña", "123456", type="password")
    plan = st.selectbox("Plan", ["basico", "premium", "enterprise"], index=1)
    
    if st.button("Crear Usuario"):
        usuario = {
            'email': email,
            'nombre': nombre,
            'plan_suscripcion': plan,
            'access_token_plaid': contraseña,
            'configuracion': {
                'moneda': 'USD',
                'idioma': 'es',
                'notificaciones': True
            }
        }
        
        try:
            response = client.table('usuarios').insert(usuario).execute()
            st.success(f"✅ Usuario {nombre} creado exitosamente!")
            st.info(f"ID del usuario: {response.data[0]['id']}")
            
            # Crear transacciones de ejemplo
            st.subheader("Agregar transacciones de ejemplo")
            if st.button("Agregar Transacciones"):
                usuario_id = response.data[0]['id']
                
                transacciones = [
                    {
                        'usuario_id': usuario_id,
                        'monto': 3000.00,
                        'categoria': 'Ingresos',
                        'descripcion': 'Salario mensual',
                        'fecha': '2026-07-01',
                        'tipo': 'ingreso',
                        'cuenta': 'Cuenta Principal',
                        'metadata': {'generado': 'ejemplo'}
                    },
                    {
                        'usuario_id': usuario_id,
                        'monto': 150.50,
                        'categoria': 'Alimentación',
                        'descripcion': 'Supermercado',
                        'fecha': '2026-07-02',
                        'tipo': 'gasto',
                        'cuenta': 'Tarjeta Crédito',
                        'metadata': {'generado': 'ejemplo'}
                    }
                ]
                
                for t in transacciones:
                    client.table('transacciones').insert(t).execute()
                
                st.success("✅ Transacciones agregadas!")
                
        except Exception as e:
            st.error(f"❌ Error al crear usuario: {e}")
    
    # Ver usuarios existentes
    st.subheader("Usuarios existentes")
    try:
        usuarios = client.table('usuarios').select('*').execute()
        if usuarios.data:
            for u in usuarios.data:
                st.write(f"👤 {u['nombre']} ({u['email']}) - Plan: {u['plan_suscripcion']}")
        else:
            st.info("No hay usuarios todavía")
    except Exception as e:
        st.error(f"❌ Error al obtener usuarios: {e}")
        
except Exception as e:
    st.error(f"❌ Error de conexión: {e}")
    st.info("Asegúrate de que el archivo .streamlit/secrets.toml tenga las credenciales correctas")

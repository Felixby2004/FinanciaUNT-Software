# 💰 FinanciaUNT - Asesor Financiero Personal IA
Aplicación web de gestión financiera personal con IA, construida con Python, Streamlit y Supabase.

## 🚀 Características Principales

### 🔒 Sistema de Autenticación
- Login y registro de usuarios
- Roles de usuario: `cliente` y `admin`
- Gestión segura de credenciales

### 📊 Dashboard Financiero
- Resumen de ingresos y gastos
- Tasa de ahorro calculada automáticamente
- Gráficos interactivos de distribución de gastos
- Tendencias de gastos diarios
- Comparación de presupuestos vs. gastos reales

### 🧠 Recomendaciones de IA (3 Modelos Comparados)
1. **Modelo 1 - Reglas Estadísticas**: Analiza patrones de gastos y presupuestos para generar recomendaciones
2. **Modelo 2 - Filtrado Colaborativo**: Compara tu comportamiento con usuarios similares
3. **Modelo 3 - Optimización de Ahorro**: Predice gastos futuros y te ayuda a alcanzar tus metas financieras

### 🎯 Metas Financieras
- Establece metas con plazos
- Realiza un seguimiento del progreso
- Agrega ahorros automáticamente a tus metas

### ⚙️ Mantenedores
- Gestión de transacciones (agregar, ver, editar, eliminar)
- Gestión de presupuestos
- Visualización de tus datos

### 🔧 Panel de Administración (solo para roles `admin`)
- Estadísticas generales del sistema
- Gestión de usuarios
- Ver todas las transacciones del sistema

### 📄 Reportes en PDF
- Generación de reportes completos con gráficos y análisis
- Descarga de reportes en formato PDF

## 📁 Estructura del Proyecto

```
FinanciaUNT/
├── app.py                            # Archivo principal de la aplicación
├── auth.py                           # Autenticación de usuarios
├── init_database.py                  # Inicialización de la base de datos
├── schema.sql                        # Esquema de la base de datos
├── migrate_v2.sql                    # Migración para actualizar la DB
├── db_helpers.py                     # Utilidades para la base de datos
├── requirements.txt                  # Dependencias del proyecto
├── models/
│   └── recommenders.py              # Modelos de recomendación IA
└── venv/                             # Entorno virtual
```

## 🛠️ Instalación y Configuración

### 1. Clona el repositorio
```bash
git clone <url>
cd FinanciaUNT
```

### 2. Crea y activa un entorno virtual
```bash
# Windows
python -m venv venv
venv\Scripts\activate
```

### 3. Instala las dependencias
```bash
pip install -r requirements.txt
```

### 4. Configura la base de datos (Supabase)
- Crea un proyecto en [Supabase](https://supabase.com/)
- Ejecuta el script `schema.sql` en el Editor SQL de Supabase
- (Opcional) Si ya tienes una base de datos, ejecuta `migrate_v2.sql` para actualizarla

### 5. Configura los secretos de Streamlit
Crea un directorio `.streamlit` y un archivo `secrets.toml` con la siguiente estructura:
```toml
SUPABASE_URL = "https://tu-proyecto.supabase.co"
SUPABASE_KEY = "tu-clave-secreta-de-supabase"
N8N_WEBHOOK = ""  # Opcional: para integración con n8n
```

### 6. Inicializa la base de datos con datos de ejemplo
Ejecuta:
```bash
streamlit run init_database.py
```
Esto creará un usuario administrador y usuarios de prueba:
- Admin: nombre "Administrador", contraseña "admin123"
- Usuarios clientes con contraseña "123456"

### 7. Ejecuta la aplicación
```bash
streamlit run app.py
```
La aplicación se abrirá automáticamente en tu navegador.

## 📋 Cómo usar la aplicación

### Para clientes
1. **Inicia sesión** con tu usuario y contraseña
2. **Dashboard**: Ve un resumen de tus finanzas
3. **Recomendaciones IA**: Consulta recomendaciones de los 3 modelos
4. **Metas**: Establece y sigue tus metas financieras
5. **Mantenedores**: Agrega transacciones y presupuestos

### Para administradores
1. **Inicia sesión** con el usuario admin (contraseña: admin123)
2. **Panel Admin**: Gestiona usuarios y ve estadísticas generales
3. También puedes usar el Dashboard y Mantenedores como cualquier otro usuario

## 🧠 Modelos de Recomendación IA

### 1. Modelo de Reglas Estadísticas
Analiza tus gastos y presupuestos para identificar áreas de optimización:
- Alertas cuando excedes tus presupuestos
- Recomendaciones para reducir tus mayores gastos
- Consejos para aumentar tu tasa de ahorro

### 2. Modelo de Filtrado Colaborativo
Compara tu comportamiento financiero con usuarios similares:
- Identifica categorías donde gastas más que el promedio
- Sugiere ajustes basados en hábitos de usuarios con perfiles similares

### 3. Modelo de Optimización de Ahorro
Predice gastos futuros y optimiza tu plan de ahorro:
- Calcula proyecciones de gastos basadas en tu historial
- Te ayuda a planificar para alcanzar tus metas financieras
- Proporciona consejos personalizados de ahorro

## 📦 Dependencias
- Streamlit >= 1.32.0
- Pandas >= 2.3.3
- Plotly >= 5.15.0
- NumPy >= 1.26.2
- Supabase >= 2.9.0
- fpdf2 >= 2.7.4
- Python-dotenv >= 1.0.0

## 💡 Mejoras y Novedades en la Versión 2
- ✨ Sistema de roles (admin/cliente)
- 🧠 3 modelos de recomendación IA comparados
- 🎯 Gestión de metas financieras
- 🔧 Panel de administración
- 📁 Estructura de proyecto reestructurada para mejor mantenimiento
- 📊 Mejoras en el Dashboard y visualizaciones
- 📄 Mejoras en la generación de reportes PDF

## 🔧 Tecnologías
- **Frontend/Backend**: Streamlit (Python)
- **Base de Datos**: Supabase (PostgreSQL)
- **Visualizaciones**: Plotly
- **IA/ML**: Python (numpy/pandas/reglas)
- **Reportes**: fpdf2

## 📄 Licencia
Este proyecto está disponible para fines educativos y de desarrollo personal.

---

¡Gracias por usar FinanciaUNT! 🎉

# Conversor de Monedas - Integración Backend

## Integrantes:
- Izquierdo Quintana Miguel Angel  
- Raymundo Rafael  
- Serrano Victor Manuel  
- Sosa Jhoan  

## Nueva Funcionalidad:
La aplicación incorpora un **backend en Python (Flask)** para gestionar usuarios y su historial de conversiones.  
Ahora, el sistema permite operaciones **CRUD (Crear, Leer, Actualizar, Eliminar)** sobre los perfiles de usuario.  
La información se almacena en `db.json`, y el frontend en JavaScript (`app.js`) interactúa con el backend para mantener los datos sincronizados.  

## Cómo instalar aplicativo:
Antes de ejecutar el software, asegúrate de contar con lo siguiente:

**Instalar Python 3.x**  
   Comprueba la instalación ejecutando en consola:  
   ```bash
   python --version
   *Instalar dependencias del backend (Flask)*:
pip install flask
*Clonar el repositorio desde GitHub:*
git clone https://github.com/tu-usuario/repositorio.git
cd repositorio

## Cómo ejecutar:
*Iniciar el backend:*
cd backend
python server.py
*El servidor estará disponible en http://localhost:5000.*
*Abrir el frontend:
Abre en el navegador el archivo:*
frontend/index.html
*Probar la nueva opción "Perfil":

Guardar información del usuario.

Consultar el historial de conversiones.

Editar o eliminar datos existentes.*

## Lista de Endpoints implementados:
POST /users → Guardar datos de un nuevo usuario.

GET /users → Obtener todos los usuarios registrados.

GET /users/{id} → Obtener datos de un usuario específico.

PUT /users/{id} → Actualizar datos de un usuario existente.

DELETE /users/{id} → Eliminar un usuario.

Nota: Todos los endpoints operan sobre db.json como fuente de persistencia.

## Describir estructura de carpetas

/ (raíz del repositorio)
│
├── backend/
│   ├── server.py        # Lógica del servidor Flask y endpoints
│   └── db.json          # Base de datos en formato JSON
│
├── frontend/
│   ├── index.html       # Interfaz principal de la aplicación
│   ├── app.js           # Lógica del conversor y llamadas al backend
│   └── style.css        # Estilos visuales de la interfaz
│
├── README.md            # Documentación principal del proyecto
└── .gitignore           # Archivos/carpetas ignorados por Git














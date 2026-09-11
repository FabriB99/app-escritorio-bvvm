# BVVM — Sistema de Gestión Digital

Plataforma de gestión interna del **Cuerpo de Bomberos Voluntarios Villa María (BVVM)**. Reemplaza registros en papel con aplicaciones modernas con acceso por roles, auditoría de acciones y sincronización en la nube mediante Firebase.

El proyecto está organizado como **monorepo** con dos clientes principales:

| Cliente | Ubicación | Propósito |
|---------|-----------|-----------|
| **App de escritorio** | `apps/escritorio` | Gestión integral del cuartel (unidades, legajos, guardia, biblioteca, admin). Empaquetada con **Tauri v2** para Windows. |
| **App web** | `apps/revision-web` | Operaciones de campo: revisiones de unidades y control de combustible desde navegador o móvil. Desplegada en **Firebase Hosting**. |

Ambas aplicaciones comparten la misma base de datos **Firestore** y tipos TypeScript en `apps/shared`.

---

## Stack tecnológico

| Capa | Escritorio | Web |
|------|------------|-----|
| UI | React 18 + TypeScript | React 19 + TypeScript |
| Build | Vite 5 | Vite 6 |
| Desktop shell | Tauri v2 (Rust) | — |
| Routing | React Router v6 | React Router v7 |
| Backend / DB | Firebase Firestore | Firebase Firestore |
| Autenticación | Firebase Auth | Firebase Auth |
| Archivos | Firebase Storage | — |
| Funciones serverless | Firebase Cloud Functions (`functions/`) | — |
| Íconos | lucide-react, react-icons | react-icons |
| Estilos | CSS custom (sin framework UI) | CSS + Tailwind 4 |
| Exportación | jsPDF, html2canvas, xlsx | — |
| Mapas | Mapbox GL, Google Maps (áreas protegidas) | — |

---

## Estructura de carpetas

```
app-bomberos/
├── apps/
│   ├── escritorio/                 # App de escritorio (Tauri + React)
│   │   ├── src/
│   │   │   ├── app/                # App.tsx, firebase-config.ts, estilos globales
│   │   │   ├── components/         # Header, Sidebar, MainLayout, ExportarExcel…
│   │   │   ├── context/            # UserContext, UsuarioBibliotecaContext
│   │   │   ├── pages/              # Módulos funcionales (ver listado abajo)
│   │   │   ├── routes/             # RutaProtegida, AuthRedirect
│   │   │   └── utils/              # toast, auditoria, generarLegajoPDF…
│   │   ├── src-tauri/              # Backend nativo Rust (Tauri v2)
│   │   │   ├── src/                # main.rs, lib.rs
│   │   │   ├── tauri.conf.json     # Configuración de build y auto-updater
│   │   │   └── icons/              # Íconos de la app Windows
│   │   └── public/                 # Assets estáticos (logos)
│   │
│   ├── revision-web/               # App web de revisiones y combustible
│   │   ├── src/
│   │   │   ├── pages/              # Home, ElegirUnidad, RevisionUnidad, ControlCombustible
│   │   │   ├── firebase/           # firebase-config.ts, firestore.ts
│   │   │   └── components/         # LayoutContainer, ModalConfirmacion
│   │   └── firebase.json           # Config de Firebase Hosting
│   │
│   └── shared/
│       └── types/                  # Tipos compartidos: Unidad, Elemento, Revision, Ubicacion
│
├── functions/                      # Cloud Functions (Node.js 24)
│   └── index.js                    # actualizarClimaEstacion (estación meteorológica 5900)
│
├── docs/                           # Artefactos de distribución (p. ej. latest.json del updater)
├── firebase.json                   # Config raíz de Cloud Functions
├── cors.json                       # Reglas CORS para Storage
└── package.json                    # Dependencias compartidas del monorepo
```

Cada módulo de la app de escritorio sigue el patrón:

```
pages/NombreModulo/
├── NombreModulo.tsx    # Componente principal
└── NombreModulo.css    # Estilos del módulo
```

---

## Entorno de desarrollo

### Requisitos previos

- **Node.js** 18+ (Functions requiere Node 24)
- **npm**
- Para la app de escritorio:
  - [Rust](https://www.rust-lang.org/tools/install)
  - [Prerrequisitos de Tauri v2](https://v2.tauri.app/start/prerequisites/) (WebView2 en Windows)
  - [Tauri CLI](https://v2.tauri.app/reference/cli/) (incluido como devDependency)

### Instalación

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd app-bomberos

# 2. Instalar dependencias del monorepo (opcional, tipos compartidos)
npm install

# 3. App de escritorio
cd apps/escritorio
npm install

# 4. App web
cd ../revision-web
npm install

# 5. Cloud Functions (opcional, solo si vas a trabajar con funciones)
cd ../../functions
npm install
```

### Configuración de Firebase

Las credenciales de Firebase están definidas en los archivos de configuración de cada app. Completar o reemplazar con las del proyecto BVVM:

| App | Archivo |
|-----|---------|
| Escritorio | `apps/escritorio/src/app/firebase-config.ts` |
| Web | `apps/revision-web/src/firebase/firebase-config.ts` |

Campos requeridos en `firebaseConfig`:

```ts
{
  apiKey: "...",
  authDomain: "...",
  projectId: "...",
  storageBucket: "...",
  messagingSenderId: "...",
  appId: "...",
}
```

> **Recomendación:** migrar estas credenciales a variables de entorno con prefijo `VITE_` (p. ej. `VITE_FIREBASE_API_KEY`) y leerlas con `import.meta.env`. Hoy el proyecto las tiene hardcodeadas en los archivos anteriores.

#### Variables de entorno opcionales

Crear un archivo `.env` en `apps/escritorio/` si se usan funcionalidades que lo requieran:

```env
# Mapas en Áreas Protegidas (ModalDetalleArea)
VITE_GOOGLE_MAPS_API_KEY=tu_api_key
```

### Scripts disponibles

#### App de escritorio (`apps/escritorio`)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Frontend Vite en `http://localhost:5173` |
| `npm run build` | Build de producción del frontend |
| `npm run preview` | Preview del build |
| `npm run tauri:dev` | App de escritorio en modo desarrollo (Vite + Tauri) |
| `npm run tauri:build` | Genera instalador Windows (`.msi`) |

#### App web (`apps/revision-web`)

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Vite |
| `npm run build` | Compila TypeScript y genera build en `dist/` |
| `npm run preview` | Preview local del build |
| `npm run lint` | ESLint |
| `npm run deploy` | Build + deploy a Firebase Hosting |

#### Cloud Functions (`functions`)

| Comando | Descripción |
|---------|-------------|
| `npm run serve` | Emulador local de Functions |
| `npm run deploy` | Deploy de funciones a Firebase |
| `npm run logs` | Ver logs en producción |

### Levantar en desarrollo

```bash
# Escritorio (recomendado para trabajo diario)
cd apps/escritorio
npm run tauri:dev

# Solo frontend web (sin shell Tauri)
npm run dev

# App web de revisiones
cd apps/revision-web
npm run dev
```

---

## Módulos principales

### App de escritorio (`apps/escritorio`)

#### Gestión de Unidades

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Unidades** | `/unidades` | Listado del parque automotor con filtros, estados de elementos y exportación a Excel. |
| **Crear / Editar Unidad** | `/crear-unidad`, `/editar-unidad/:id` | Alta y modificación de móviles, ubicaciones internas y equipamiento. |
| **Detalle de Unidad** | `/unidad/:id` | Vista completa de una unidad con sus elementos y datos operativos. |
| **Historial de Revisiones** | `/historial-revisiones/:id` | Registro histórico de inspecciones por unidad. |
| **Control Combustible** | `/combustible` | Seguimiento de niveles y fechas de control de combustible del parque. |
| **Generador de Informe** | `/generador-informe` | Generación de informes PDF del estado del parque automotor. |

#### Gestión de Personal

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Legajos** | `/legajos` | Gestión del personal: datos personales, jerarquía, ascensos, sanciones, condecoraciones y elementos entregados. |
| **Vencimientos** | `/vencimientos` | Control de vencimientos de carnets de conducir y VTV del personal. |

#### Gestión de Guardia

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Dashboard de Guardia** | `/dashboard-guardia` | Panel central del turno con novedades, elementos médicos pendientes y clima. |
| **Novedades de Guardia** | *(widget en dashboard)* | Registro y resolución de novedades operativas del cuartel en tiempo real. |
| **Elementos Médicos en Hospitales** | *(widget en dashboard)* | Seguimiento de equipamiento médico dejado en hospitales durante intervenciones (`pendiente` → `recuperado`). |
| **Clima** | *(widget en dashboard)* | Condiciones meteorológicas locales (datos de estación 5900 vía Cloud Function). |
| **Choferes** | `/choferes` | Consulta de choferes habilitados por tipo de unidad. |
| **Áreas Protegidas** | `/areas-protegidas` | Registro georreferenciado de establecimientos bajo cobertura del cuerpo. |
| **Capacitaciones** | `/p-capacitaciones`, `/listado-capacitaciones` | Carga de partes de capacitación y listado histórico agrupado por año. |
| **Control Intervenciones** | `/p-intervenciones` | *(en construcción)* Gestión de partes de salida e intervenciones. |
| **Control Mantenimiento** | `/p-mantenimiento` | *(en construcción)* Seguimiento de mantenimientos del cuartel. |

#### Gestión Interna

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Biblioteca Virtual** | `/biblioteca` | Portal de consulta de documentación interna por secciones y grupos. |
| **Administración Biblioteca** | `/editar-biblioteca` | CRUD de secciones, grupos y registro de accesos (admin). |

#### Administración

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Panel Admin** | `/admin` | Acceso central a herramientas de administración del sistema. |
| **Identidades / Usuarios** | `/admin/identidades` | Creación y gestión de usuarios con roles y PIN de acceso. |
| **Grados** | `/admin/grados` | Configuración de grados jerárquicos del cuerpo. |
| **Auditoría** | `/admin/auditoria` | Visor de logs de acciones (creaciones, ediciones, eliminaciones, cambios de config). |

#### Acceso bomberos

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Inicio Bombero** | `/inicio-bombero` | Portal de acceso para bomberos con identificación por miembro. |
| **Mi Legajo** | `/legajo/:id` | Consulta del legajo personal (vista restringida por rol). |
| **Mis Estadísticas** | `/mis-estadisticas` | *(en construcción)* Panel de estadísticas personales. |

---

### App web (`apps/revision-web`)

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Panel de Control** | `/` | Menú principal para operaciones de campo. |
| **Control de Unidades** | `/control-unidades` | Selección de unidad e inspección de elementos por ubicación. |
| **Revisión de Unidad** | `/revision/:unidadId` | Formulario de revisión que actualiza estados de elementos en Firestore. |
| **Control de Combustible** | `/control-combustible` | Registro rápido del nivel de combustible desde dispositivo móvil. |

---

### Cloud Functions

| Función | Descripción |
|---------|-------------|
| `actualizarClimaEstacion` | Consulta la estación meteorológica 5900 cada minuto y persiste datos en `config_guardia/clima_estacion`. |

---

## Roles y permisos

| Rol | Acceso principal |
|-----|------------------|
| `admin` | Acceso completo, configuración, auditoría y gestión de usuarios |
| `jefatura` | Gestión operativa de unidades, personal, guardia y biblioteca |
| `guardia` | Operaciones de guardia, capacitaciones, áreas protegidas |
| `graduados` | Consulta y edición limitada en unidades y legajos |
| `legajo` | Gestión de legajos del personal |
| `bombero` | Consulta de legajo propio e identificación por miembro |

Las rutas protegidas se controlan en frontend con `RutaProtegida`; Firestore Security Rules refuerzan el acceso en backend.

El sistema de identidad es de **dos pasos**: `usuarios/{uid}` (Firebase Auth) solo guarda el `rol`; el nombre real de la persona vive en `miembros` y se resuelve por turno mediante identificación por PIN/DNI (`IdentificarMiembro.tsx`), guardándose en `miembroActivo` dentro del contexto `useUser()`.

---

## Colecciones Firestore principales

| Colección | Descripción |
|-----------|-------------|
| `usuarios` | Cuentas de acceso y roles |
| `legajos` / `miembros` | Personal del cuerpo |
| `identidades` | Credenciales de acceso (PIN) vinculadas a miembros |
| `unidades` | Móviles del parque automotor |
| `ubicaciones` / `elementos` | Inventario interno por unidad |
| `revisiones` | Inspecciones de unidades |
| `capacitaciones` | Registros de formación |
| `novedades_guardia` | Novedades del turno de guardia |
| `elementos_medicos_hospital` | Equipamiento médico en hospitales |
| `config_guardia` | Configuración dinámica (listas, clima, etc.) |
| `areas_protegidas` | Establecimientos bajo cobertura |
| `vencimientos` | Carnets y VTV |
| `grupos_biblioteca` / secciones | Documentación interna |
| `auditoria` | Log de acciones del sistema |

---

## Patrones de desarrollo

### Firebase

```ts
import { db, auth, storage } from "../app/firebase-config";
```

No hay capa de servicios separada: Firestore se consume directamente desde los componentes.

### Notificaciones

```ts
import { mostrarToast } from "../utils/toast";
mostrarToast("Registro guardado", "success");
```

### Auditoría

```ts
import { registrarAuditoria, buildOperador } from "../utils/auditoria";

const operador = buildOperador(miembroActivo, user.rol);
await registrarAuditoria({
  accion: "crear",
  coleccion: "capacitaciones",
  docId: id,
  docResumen: "Descripción legible del documento",
  operador,
  detalles: { descripcion: "..." },
});
```

`buildOperador` toma el `miembroActivo` del contexto (no hace lookup a Firestore) y arma `{ uid, nombre, rol }` para el log.

### Autenticación

```ts
import { useUser } from "../context/UserContext";
const { user, miembroActivo } = useUser();
// user.rol → rol de acceso (admin, guardia, etc.)
// miembroActivo.nombre / miembroActivo.apellido → identidad de la persona en turno
```

---

## Build y distribución

```bash
# Instalador Windows (.msi) con auto-updater
cd apps/escritorio
npm run tauri:build

# Deploy app web a Firebase Hosting
cd apps/revision-web
npm run deploy
```

La app de escritorio incluye **auto-actualización** configurada en `src-tauri/tauri.conf.json` (endpoint en GitHub Pages).

---

## Estado del proyecto

En desarrollo activo. Módulos funcionales: unidades, revisiones (web), combustible, guardia (dashboard, novedades, elementos médicos, capacitaciones), legajos, biblioteca, áreas protegidas, vencimientos y administración. En construcción: control de intervenciones, mantenimiento y estadísticas de bomberos.

---

*Cuerpo de Bomberos Voluntarios Villa María — Sistema interno. No distribuir.*
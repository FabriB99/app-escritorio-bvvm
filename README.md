# BVVM — Sistema de Gestión Digital

Plataforma de gestión interna del **Cuerpo de Bomberos Voluntarios Villa María (BVVM)**. Reemplaza registros en papel con aplicaciones modernas con acceso por roles, trazabilidad mediante auditoría de acciones y sincronización en tiempo real en la nube mediante Firebase.

El proyecto está organizado como **monorepo** con dos clientes principales:

| Cliente | Ubicación | Propósito |
|---------|-----------|-----------|
| **App de escritorio** | `apps/escritorio` | Gestión integral del cuartel (guardia, despacho y libro de guardia, unidades, legajos, biblioteca, administración). Empaquetada con **Tauri v2** para Windows. |
| **App web** | `apps/revision-web` | Operaciones de campo: revisiones de unidades con selección de personal y control de combustible desde navegador o móvil. Desplegada en **Firebase Hosting**. |

Ambas aplicaciones comparten la misma base de datos **Firestore** y definiciones de tipos TypeScript en `apps/shared`.

---

## Stack tecnológico

| Capa | Escritorio (`apps/escritorio`) | Web (`apps/revision-web`) |
|------|--------------------------------|---------------------------|
| UI | React 18 + TypeScript | React 19 + TypeScript |
| Build | Vite 5 | Vite 6 |
| Desktop shell | Tauri v2 (Rust) | — |
| Routing | React Router v6 (con Lazy Loading) | React Router v7 |
| Backend / DB | Firebase Firestore | Firebase Firestore |
| Autenticación | Firebase Auth + PIN por miembro | Firebase Auth |
| Archivos | Firebase Storage | — |
| Funciones serverless | Firebase Cloud Functions (`functions/`) | — |
| Íconos | `lucide-react`, `react-icons` | `lucide-react`, `react-icons` |
| Notificaciones | `sonner` | `react-hot-toast`, `react-toastify` |
| Estilos | CSS custom con variables corporativas | CSS + Tailwind 4 |
| Exportación y PDF | `@react-pdf/renderer`, `jspdf`, `jspdf-autotable`, `html2canvas`, `xlsx` | — |
| Visor PDF | `@react-pdf-viewer/core`, `react-pdf` | — |
| Mapas | Mapbox GL (`@mapbox/mapbox-gl-geocoder`), Google Maps | — |

---

## Estructura de carpetas

```
app-bomberos/
├── apps/
│   ├── escritorio/                 # App de escritorio (Tauri v2 + React)
│   │   ├── src/
│   │   │   ├── app/                # App.tsx, firebase-config.ts, estilos y variables globales
│   │   │   ├── components/         # Header, Sidebar, MainLayout, Modal, SearchableSelect, ExportarExcel…
│   │   │   ├── context/            # UserContext, UsuarioBibliotecaContext
│   │   │   ├── pages/              # Módulos funcionales (Guardia, Unidades, Legajos, Admin, Biblioteca…)
│   │   │   ├── routes/             # RutaProtegida, AuthRedirect, routesConfig.tsx (lazy loading)
│   │   │   └── utils/              # toast, auditoria, cacheCatalogos, generarLegajoPDF…
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
│   │   │   ├── components/         # LayoutContainer, ModalConfirmacion
│   │   │   └── styles/             # Estilos de vistas móviles y layout
│   │   └── firebase.json           # Config de Firebase Hosting
│   │
│   └── shared/
│       └── types/                  # Tipos compartidos: Unidad, Elemento, Revision, Ubicacion, SalidaUnidad
│
├── functions/                      # Cloud Functions (Node.js 24)
│   └── index.js                    # actualizarClimaEstacion (estación meteorológica 5900)
│
├── scripts/
│   └── release.mjs                 # Script automatizado de versionado y publicación
├── docs/                           # Artefactos de distribución (latest.json) y documentación
├── firebase.json                   # Config raíz de Cloud Functions
├── cors.json                       # Reglas CORS para Storage
└── package.json                    # Scripts y dependencias compartidas del monorepo
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

- **Node.js** 18+ (Cloud Functions requiere Node 24)
- **npm**
- Para la app de escritorio:
  - [Rust](https://www.rust-lang.org/tools/install)
  - [Prerrequisitos de Tauri v2](https://v2.tauri.app/start/prerequisites/) (WebView2 en Windows)
  - [Tauri CLI](https://v2.tauri.app/reference/cli/) (incluido como `devDependency`)

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

> **Recomendación:** migrar estas credenciales a variables de entorno con prefijo `VITE_` (p. ej. `VITE_FIREBASE_API_KEY`) y leerlas con `import.meta.env`.

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
| `npm run tauri:build` | Genera instalador Windows (`.msi` / `.exe`) |
| `npm run release` | Ejecuta el asistente de publicación de nueva versión |

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

#### Gestión de Guardia y Operaciones

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Dashboard de Guardia** | `/dashboard-guardia`, `/guardia` | Panel central del turno en tiempo real con salidas activas, novedades, elementos médicos pendientes y clima. |
| **Salidas e Intervenciones Activas** | *(widget en dashboard)* | Despacho de unidades en tiempo real (`WidgetSalidasActivas`), agrupación por incidente, asignación de unidad/chofer/recepcionista y código tipificado de siniestro, cambio de estados (`en_camino` → `en_lugar` → `finalizada`), reasignación en calle y cierre con actualización automática del kilometraje de la unidad. |
| **Libro de Guardia** | `/guardia/libro-guardia`, `/libro-guardia` | Registro histórico e integral de intervenciones y movimientos de unidades. Permite carga manual de salidas pasadas, edición, baja, filtrado por fecha/móvil/código de siniestro y exportación a Excel (`.xlsx`). |
| **Novedades de Guardia** | *(widget)* y `/guardia/novedades-historial` | Registro, seguimiento y resolución de novedades operativas del cuartel en tiempo real, con vista de historial completo y filtros. |
| **Elementos Médicos en Hospitales** | *(widget)* y `/guardia/elementos-medicos` | Seguimiento de equipamiento médico dejado en hospitales durante intervenciones (`pendiente` → `recuperado`), historial completo y configuración dinámica de catálogos de hospitales y elementos (`ModalConfigGuardia`). |
| **Clima** | *(widget en dashboard)* | Condiciones meteorológicas locales en tiempo real (datos de estación 5900 vía Cloud Function). |
| **Choferes** | `/choferes` | Tablero de choferes habilitados clasificados por categoría de unidad (`Maestranza`, `Ambulancias`, `Livianas`, `Pesadas`, `Escalera`). |
| **Áreas Protegidas** | `/areas-protegidas`, `/agregar-area`, `/editar-area/:id` | Registro georreferenciado de establecimientos bajo cobertura del cuerpo, con mapas interactivos y formulario unificado de alta/edición. |

#### Gestión de Unidades

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Unidades** | `/unidades` | Listado del parque automotor con filtros, estados operativos, kilometraje, nivel de combustible y exportación a Excel. |
| **Crear / Editar Unidad** | `/crear-unidad`, `/editar-unidad/:id` | Formulario unificado de alta y modificación de móviles, categorías de conducción, ubicaciones internas y equipamiento. |
| **Detalle de Unidad** | `/unidad/:id` | Vista completa de una unidad con sus ubicaciones, elementos y datos operativos. |
| **Selección e Historial de Revisiones** | `/seleccionar-unidad-historial`, `/historial-revisiones/:id` | Selector visual de unidades y registro histórico de inspecciones por móvil, con detalle de elementos por ubicación y bomberos intervinientes. |
| **Control Combustible** | `/combustible` | Seguimiento de niveles (`Lleno`, `3/4`, `1/2`, `1/4`) y fechas de control de combustible del parque. |
| **Generador de Informe** | `/generador-informe` | Generación de informes PDF del estado del parque automotor con resumen de últimas revisiones y observaciones normalizadas. |

#### Gestión de Personal

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Legajos** | `/legajos`, `/agregar-legajo`, `/editar-legajo/:id`, `/legajo/:id` | Gestión integral del personal: datos personales, orden operativo, jerarquía, ascensos, sanciones, condecoraciones, elementos entregados y descarga de ficha completa en PDF. |
| **Vencimientos** | `/vencimientos` | Control unificado de vencimientos de carnets de conducir y habilitaciones del personal, sincronizado con legajos y categorías de chofer. |

#### Gestión Interna (Biblioteca Virtual)

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Biblioteca Virtual** | `/biblioteca-login`, `/biblioteca`, `/biblioteca/seccion/:ruta` | Portal de consulta de documentación y protocolos internos organizados por secciones y grupos, con visor PDF integrado (`/biblioteca/previsualizar/:rutaSeccion/:archivoIndex`). |
| **Administración Biblioteca** | `/editar-biblioteca`, `/editar-biblioteca/secciones`, `/editar-biblioteca/grupos`, `/editar-biblioteca/registro` | CRUD de secciones, grupos de acceso y registro de auditoría de ingresos a la biblioteca. |

#### Administración

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Panel Ejecutivo Admin** | `/admin` | Centro de gestión con KPIs en tiempo real (personal activo por grupos G1/G2/G3, estado de flota, revisiones vencidas +14d, alertas de combustible y actividad diaria), alertas operativas de móviles, configuración de catálogos de guardia y **descarga de Backup JSON** de las colecciones críticas. |
| **Identidades / Usuarios** | `/admin/identidades`, `/admin/crear-identidad`, `/admin/editar-identidad/:id` | Creación y gestión unificada de identidades de acceso con roles y PIN vinculado a miembros. |
| **Grados** | `/admin/grados` | Configuración del escalafón y grados jerárquicos del cuerpo. |
| **Auditoría** | `/admin/auditoria` | Visor detallado de logs de acciones del sistema (creaciones, ediciones, eliminaciones y cambios de configuración). |

#### Acceso Bomberos

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Inicio Bombero** | `/inicio-bombero` | Portal de acceso personal para bomberos con identificación por miembro. |
| **Mi Legajo** | `/legajo/:id` | Consulta del legajo personal y exportación en PDF (vista restringida por rol). |
| **Mis Estadísticas** | `/mis-estadisticas` | *(en construcción)* Panel de estadísticas personales. |

---

### App web (`apps/revision-web`)

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| **Panel de Control** | `/` | Menú principal optimizado para dispositivos móviles en operaciones de campo. |
| **Control de Unidades** | `/control-unidades` | Selección rápida de unidad con buscador e indicadores de tipo de móvil. |
| **Revisión de Unidad** | `/revision/:unidadId` | Formulario de inspección por ubicación que actualiza estados de elementos (`Operativo`, `Con falla`, `Faltante`) mediante `writeBatch` en Firestore, con selector autocompletable de múltiples bomberos responsables. |
| **Control de Combustible** | `/control-combustible` | Registro rápido del nivel de combustible de las unidades desde dispositivo móvil. |

---

### Cloud Functions

| Función | Descripción |
|---------|-------------|
| `actualizarClimaEstacion` | Consulta la estación meteorológica 5900 cada minuto y persiste datos en `config_guardia/clima_estacion`. |

---

## Roles y permisos

| Rol | Acceso principal |
|-----|------------------|
| `admin` | Acceso completo, panel ejecutivo, backup JSON, configuración de listas, grados, auditoría y gestión de identidades |
| `jefatura` | Gestión operativa de unidades, personal, guardia (salidas, libro de guardia, novedades) y biblioteca |
| `guardia` | Operaciones de guardia (despacho de salidas, libro de guardia, novedades, elementos médicos), unidades y áreas protegidas |
| `graduados` | Consulta y gestión en guardia, unidades, historial de revisiones, vencimientos, legajos y biblioteca |
| `legajo` | Gestión de legajos del personal |
| `bombero` | Consulta de legajo propio e identificación por miembro |

Las rutas protegidas se definen de forma centralizada en `apps/escritorio/src/routes/routesConfig.tsx` (con soporte de `React.lazy` para carga diferida) y se validan mediante `RutaProtegida`; Firestore Security Rules refuerzan el acceso en backend.

El sistema de identidad opera en **dos pasos**: `usuarios/{uid}` (Firebase Auth) define la cuenta y el `rol` de estación/acceso; la identidad real del bombero vive en `miembros` y se resuelve por turno mediante identificación por PIN (`IdentificarMiembro.tsx`), almacenándose en `miembroActivo` dentro de `useUser()`.

---

## Colecciones Firestore principales

| Colección | Descripción |
|-----------|-------------|
| `usuarios` | Cuentas de acceso (Firebase Auth) y roles |
| `miembros` / `legajos` | Personal del cuerpo, datos de legajo, orden operativo, grupo de guardia y carnets |
| `identidades` | Credenciales de acceso (PIN) vinculadas a miembros |
| `grados` | Escalafón y jerarquías del cuerpo |
| `unidades` | Móviles del parque automotor (estado, kilometraje, combustible, categoría) |
| `ubicaciones` / `elementos` | Inventario interno de equipamiento por unidad y compartimento |
| `revisiones` | Historial de inspecciones de unidades y estado de elementos |
| `salidas_unidades` | Despachos activos en tiempo real e historial del Libro de Guardia |
| `novedades_guardia` | Novedades operativas del turno de guardia |
| `elementos_medicos_hospital` | Equipamiento médico pendiente o recuperado en hospitales |
| `config_guardia` | Configuración dinámica de guardia (catálogos de hospitales, elementos médicos, clima, etc.) |
| `areas_protegidas` | Establecimientos georreferenciados bajo cobertura |
| `vencimientos` | Vencimientos de carnets de conducir y habilitaciones |
| `grupos_biblioteca` / secciones | Estructura y documentos de la Biblioteca Virtual |
| `auditoria` | Log inmutable de acciones del sistema |

---

## Patrones de desarrollo

### Firebase y Caché de Catálogos

```ts
import { db, auth, storage } from "../app/firebase-config";
```

Para reducir lecturas redundantes en Firestore durante la sesión, los catálogos frecuentes de guardia (`unidades`, `elementos_medicos`, `hospitales`) se consultan a través de la utilidad de caché en memoria:

```ts
import { getCatalogosGuardia, invalidarCacheCatalogos } from "../utils/cacheCatalogos";

const { unidades, elementos, hospitales } = await getCatalogosGuardia();
```

### Componentes UI Reutilizables

- **`Modal` (`src/components/Modal`)**: Componente global estandarizado para diálogos y formularios modales (tamaños `sm`, `md`, `lg`, `xl`, cierre con `Escape` y bloqueo de scroll).
- **`SearchableSelect` (`src/components/SearchableSelect`)**: Selector desplegable con búsqueda predictiva, soporte de badges (p. ej. número de orden operativo) y subetiquetas.

### Notificaciones

El cliente de escritorio utiliza `sonner` (con wrapper compatible en `src/utils/toast.tsx`):

```ts
import { toast } from "sonner";
toast.success("Registro guardado correctamente");
```

### Auditoría

```ts
import { registrarAuditoria, buildOperador } from "../utils/auditoria";

const operador = buildOperador(miembroActivo, user.rol);
await registrarAuditoria({
  accion: "crear",
  coleccion: "salidas_unidades",
  docId: id,
  docResumen: "Salida U-12 — 01-101 Fuego en vivienda",
  operador,
  detalles: { descripcion: "..." },
});
```

`buildOperador` toma el `miembroActivo` del contexto (sin lecturas adicionales a Firestore) y construye `{ uid, nombre, rol }` para el registro.

### Autenticación

```ts
import { useUser } from "../context/UserContext";
const { user, miembroActivo } = useUser();
// user.rol → rol de acceso (admin, guardia, jefatura, etc.)
// miembroActivo.nombre / miembroActivo.apellido → identidad de la persona en turno
```

---

## Build y distribución

### Publicación de una nueva versión (Auto-Updater)

El monorepo cuenta con un flujo de lanzamiento automatizado:

```bash
# Lanzar una nueva versión con el asistente interactivo (desde la raíz o apps/escritorio)
npm run release

# O directamente especificando el incremento y notas:
npm run release patch -m "Correcciones en dashboard de guardia"
npm run release minor -m "Nuevo módulo de Libro de Guardia"
```

El script actualiza las versiones en `tauri.conf.json`, `package.json` y `Cargo.toml`, crea el commit y el tag Git `vX.Y.Z`, y lo pushea a GitHub. **GitHub Actions** compila la app Windows, la firma, crea la Release y actualiza automáticamente `docs/latest.json` en `main` para que GitHub Pages lo distribuya a los clientes.

👉 Para más detalles del circuito, arquitectura y contingencias, consultá la [Guía Completa de Actualizaciones](docs/GUIA_ACTUALIZACION.md).

### Compilación local y despliegue manual

```bash
# Compilar instalador Windows (.msi) localmente sin publicar
cd apps/escritorio
npm run tauri:build

# Deploy de la app web a Firebase Hosting
cd apps/revision-web
npm run deploy
```

---

## Estado del proyecto

En desarrollo activo (v0.4.0).
- **Módulos operativos**: Unidades, Revisiones (web y escritorio), Control de Combustible, Generador de Informes PDF, Guardia (Dashboard en tiempo real, Despacho de Salidas Activas, Libro de Guardia con exportación a Excel, Novedades, Elementos Médicos en Hospitales, Clima), Choferes por categoría, Áreas Protegidas, Legajos (con exportación PDF), Vencimientos, Biblioteca Virtual y Panel Ejecutivo de Administración (con KPIs, Auditoría y Backup JSON).
- **En construcción**: Panel de estadísticas personales para bomberos (`/mis-estadisticas`).

---

*Cuerpo de Bomberos Voluntarios Villa María — Sistema interno. No distribuir.*

# Asistencias · Vista Administrador

Panel de administración del Control de Asistencia NerWork: supervisión diaria,
reportes semanales, altas de personal, horarios y auditoría.

Equivale (y va más allá) de las hojas del control de asistencia original en
Google Sheets: **Reporte General**, **Asistencia por día**, **fichas individuales
por persona**, **Usuarios**, **Rechazados**, **Pendientes**, **Registro Manual**
y **Horarios Especiales**.

---

## Secciones

| Ruta | Qué hace |
|---|---|
| `/admin/login` | Acceso con correo y contraseña (Supabase Auth). |
| `/admin/asistencia` | **Registros del Día** (en vivo, editable) + **Reporte General de la Semana**. |
| `/admin/empleados` | Catálogo de trabajadores, horas de la semana y ficha individual. Exporta CSV. |
| `/admin/horarios` | Jornada por colaborador + **horarios especiales** por persona, día y vigencia. |
| `/admin/dispositivos` | Qué celular/tablet usa cada colaborador. Permite **revocar** el vínculo. |
| `/admin/pendientes` | Entradas abiertas sin salida. Nunca se cierran solas. |
| `/admin/rechazados` | Auditoría de checadas no aceptadas, con motivo y coordenadas. |
| `/admin/personas/[id]` | Ficha individual con el detalle semana por semana. |
| `/admin/reporte` | Redirige a `/admin/asistencia`. |

### Funciones clave

- **Registro manual**: desde *Registrar Manualmente* el administrador captura o
  corrige entrada y salida de cualquier persona y fecha (equivale a la hoja
  “Registro Manual”).
- **Edición en línea**: en la tabla del día, el botón **Editar** permite corregir
  la hora de entrada y salida; se guarda como ajuste manual y queda en bitácora.
- **Alta de empleado**: genera automáticamente el token secreto de la URL y la
  etiqueta NFC de la tarjeta. El token en claro se muestra **una sola vez**.
- **Rotación de token**: invalida la credencial anterior de una tarjeta.
- **Horarios especiales**: reglas por persona, día de la semana y vigencia. Si hay
  varias vigentes, gana la de *“vigente desde”* más reciente.
- **Dispositivos**: en la terminal compartida, cada celular queda vinculado a la
  persona que se identificó desde él. Aquí se ve quién usa qué equipo y se
  puede revocar (el teléfono vuelve a pedir identificación).
- **Exportes**: Excel (`.xlsx`), PDF e informe de empleados en CSV.
- **Bitácora**: toda edición del panel queda registrada con actor, entidad y
  valores antes/después.

---

## Roles

| Rol | Permisos |
|---|---|
| `admin` | Todo, incluidas las correcciones y los exports. |
| `supervisor` | Solo lectura. |

La sesión y el rol se verifican **en el servidor**, en cada página, cada route
handler y cada server action (`server/session.ts`).

---

## Puesta en marcha

### 1. Dependencias

```bash
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env.local
```

| Variable | Para qué sirve |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto de Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave anónima (login con Supabase Auth). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (**solo servidor**). |
| `SUPABASE_DEMO` | `1` activa el modo demostración (sin base de datos). |
| `NEXT_PUBLIC_REGISTRO_URL` | Dominio de la vista de registro (para mostrar la URL del token). |

### 3. Base de datos

Aplica las migraciones del repositorio **AsistenciasBackend**:

```
supabase/migrations/0001_init.sql
supabase/migrations/0002_funciones.sql
supabase/migrations/0003_seed.sql
```

Además, crea la cuenta del administrador en **Supabase Auth → Authentication →
Users** (correo + contraseña) y agrega el correo a la tabla `admins`:

```sql
INSERT INTO admins (correo, rol) VALUES ('marionly420@gmail.com', 'admin');
```

### 4. Desarrollo

```bash
npm run dev      # http://localhost:3000
npm run build
npm start
npm test         # motor de horas y zona horaria
npm run lint     # tsc --noEmit
```

### Modo demostración

Con `SUPABASE_DEMO=1` el panel funciona sin base de datos: 11 personas y 6 semanas
de historial simulados. Acceso:

```
correo:    marionly420@gmail.com
contraseña: demo1234
```

**Nunca actives el modo demo en producción.**

---

## Estructura

```
app/admin/                    Rutas del panel
components/ui/                Componentes de presentación (sin lógica)
components/admin/             Componentes interactivos (client)
lib/motor-horas.ts            Motor puro (copia autónoma del backend)
lib/tz.ts                     Zona horaria America/Mexico_City
lib/formato.ts                Formateadores compartidos servidor/cliente
server/auth.ts                Login, sesión y roles
server/session.ts             requireSesion / requireAdmin
server/actions.ts             Server actions (CRUD + bitácora)
server/queries.ts             Consultas de lectura
server/queries-admin.ts       Consultas admin (rechazados, pendientes, sedes…)
server/calculo.ts             Contexto de cálculo compartido
server/reporte.ts             Reporte semanal
server/empleados.ts           Detalle semanal por persona
server/personas.ts            Ficha individual
server/horarios.ts            Jornadas efectivas
lib/demo/                     Supabase simulado (modo demo)
```

> `lib/motor-horas.ts` y `lib/tz.ts` son copias autónomas del backend: los tres
> repositorios son independientes y se despliegan por separado.

---

## Despliegue (Vercel)

```bash
vercel --prod
```

Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_REGISTRO_URL`.

# App Remesas IA

Digitaliza el flujo PEN → USDT → VES del operador Remesas. Ver el diagnóstico completo,
estudio de mercado y breakdown técnico en [`PRD_Maestro_AppRemesasIA.md`](./PRD_Maestro_AppRemesasIA.md)
(generado por Hermes Agents — Paso 2 del pipeline).

**Pipeline:** ① Hermes Agents (diagnóstico) → ② PRD Maestro → **③ Claude (este repo: backend Supabase + frontend app móvil, con Claude Design como sistema de diseño de componentes)** → ④ N8N → ⑤ Supabase + Vercel + EAS Build

## Estructura

```
app/                          App móvil (React Native + Expo + expo-router)
  app/(auth)/                 Login con Google, registro de cliente (primera vez)
  app/(cliente)/               index (calculadora + solicitud), cuentas-utilizadas,
                               estadísticas, perfil, solicitud/[id]
  app/(operador-peru)/         onboarding (perfil del negocio), index (panel:
                               operaciones en curso/realizadas, resumen del día),
                               tasa, estadísticas (gráficas + PDF), clientes (PDF), perfil
  app/(operador-venezuela)/    index (mismo panel de Perú en modo restringido), perfil
  components/                  AppBanner, RoundCheck, LiveClock, CopyField, OperationRow,
                               PeruDashboardView (compartida Perú/Venezuela), DateRangeFilter
  lib/                         cliente Supabase, auth (Google), cálculo de tasas, tasa BCV,
                               generación de PDF, push, comprobantes
supabase/
  migrations/                  esquema SQL: tablas, RLS, máquina de estados, dashboard,
                               storage, webhooks, negocio/Venezuela/cuentas cliente (0007)
  functions/                   generar-comprobante (F9), notificar-cambio-estado (F8),
                               bcv-tasa (scraper de bcv.org.ve con caché)
*.md / *.pdf                  Documentos de diagnóstico de Hermes Agents (Paso 1-2)
```

## 1. Configurar Supabase

Proyecto ya creado: https://supabase.com/dashboard/project/vddyynachdgqmtofqxnr

**Estado actual:** las 7 migraciones de `supabase/migrations/` y las 3 Edge Functions
(`generar-comprobante`, `notificar-cambio-estado`, `bcv-tasa`) ya están desplegadas en el
proyecto remoto (aplicadas vía Supabase MCP). Esto incluye: enums, tablas (`usuarios`,
`tasas`, `solicitudes`, `mensajes_chat`, `perfil_negocio`, `cuentas_bancarias_operador`,
`operador_venezuela_perfil`, `cuentas_utilizadas_cliente`, `tasa_bcv`), RLS por rol, la
máquina de estados sincronizada con los checks de validación, la vista
`operaciones_dashboard` y el bucket de Storage `comprobantes`. `generar-comprobante` y
`notificar-cambio-estado` se desplegaron con `verify_jwt: true` (reciben el
`service_role_key` como Bearer token desde el trigger de BD); `bcv-tasa` también con
`verify_jwt: true` porque la llama directo la app con la sesión del usuario.

Si necesitas re-aplicar todo desde cero (por ejemplo, en un proyecto nuevo), usa la CLI:

```bash
npm install -g supabase
supabase login
cd "PRODUCTO SaaS - REMESAS IA"
supabase link --project-ref vddyynachdgqmtofqxnr
supabase db push
supabase functions deploy generar-comprobante
supabase functions deploy notificar-cambio-estado
```

Lo que **todavía falta configurar manualmente** (requiere secretos/credenciales que no
viven en el repo — ver las dos secciones siguientes): el proveedor de SMS OTP, los
ajustes de base de datos para los webhooks, y el secreto de Firebase para push.

### Habilitar Google Sign-In

La app ya no usa SMS OTP: el login es con Google (`signInWithOAuth`). **Ya está activado y
verificado en producción** (probado con una cuenta real de punta a punta). Si necesitas
volver a configurarlo desde cero (proyecto nuevo, otro dominio), estos son los pasos:

1. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)):
   - Crea (o usa) un proyecto → APIs & Services → OAuth consent screen → configúralo en modo
     "External" con el email de soporte y los scopes básicos (`email`, `profile`, `openid`).
   - Credentials → Create Credentials → OAuth client ID → tipo **Web application**.
   - En "Authorized redirect URIs" agrega exactamente:
     `https://vddyynachdgqmtofqxnr.supabase.co/auth/v1/callback`
   - Copia el **Client ID** y el **Client Secret** que genera.
2. **Supabase Dashboard** → Authentication → Providers → Google:
   - Actívalo y pega el Client ID / Client Secret del paso anterior.
   - Authentication → URL Configuration → Additional Redirect URLs: agrega
     `remesasia://` (login nativo) y `http://localhost:8081` (pruebas en `expo start --web`).
     Cuando despliegues el panel/dominio de producción, agrega también esa URL.

**Limitación de Expo Go:** el login con Google usa un redirect por navegador
(`expo-auth-session` + `signInWithOAuth`, no el SDK nativo de Google) justamente para
seguir funcionando en Expo Go. En **web** (`npm run web`) funciona igual que en producción.
En **nativo dentro de Expo Go** el redirect `remesasia://` no lo puede capturar el
contenedor de Expo Go (ese esquema solo lo resuelve un build real de la app) — para probar
el login nativo hace falta un development/preview build de EAS (sección 3 más abajo). El
resto de la app sí funciona normalmente en Expo Go.

### Multi-tenant: cada Operador Perú es un negocio independiente

La app soporta varios negocios (Operadores Perú) al mismo tiempo, cada uno con sus propios
clientes, tasa del día, operaciones y estadísticas — aislados entre sí por RLS
(`negocio_operador_peru_id` en `usuarios`/`solicitudes`, función `mi_negocio_operador_peru_id()`).
Nadie ve datos de un negocio que no es el suyo, ni siquiera el admin (el admin solo ve
nombre/contacto de los Operadores Perú y sus pagos de suscripción, no sus clientes ni
operaciones).

**Alta de un Operador Perú (por el admin):** panel Admin → "Invitar Operador Perú" → genera
un enlace (`/invitacion/<token>`) → se comparte por WhatsApp. Quien lo abre inicia sesión
con Google y el rol se asigna solo (RPC `canjear_invitacion`). Sigue funcionando el alta
manual por SQL como respaldo:

```sql
update usuarios set rol = 'operador_peru' where email = 'operador@gmail.com';
```

**Alta de un cliente (por el Operador Perú):** pestaña Perfil → "Invitar clientes" → genera
un enlace scopeado a ese negocio (`invitaciones.negocio_operador_peru_id`). Quien lo abre
queda vinculado automáticamente a ese Operador Perú (`usuarios.negocio_operador_peru_id`).
Un cliente que entra sin enlace de invitación ve un aviso pidiéndole el enlace — no hay
forma de adivinar a qué negocio pertenece.

**El Operador Venezuela** se vincula solo, sin enlace: el Operador Perú carga su email en
el onboarding (`operador_venezuela_perfil.email`), y en cuanto esa persona inicia sesión
con ese mismo Gmail, el trigger `handle_new_user` lo asigna automáticamente al rol
`operador_venezuela` y lo vincula a ese negocio.

**Enlaces de invitación (WhatsApp):** por defecto los enlaces copiados apuntan a
`http://localhost:8081/invitacion/<token>` (sirve para probar pegándolo en el navegador,
pero WhatsApp no lo vuelve clickeable — no es `https://`). En cuanto despliegues el panel
web (Vercel, sección "Pendiente"), define `EXPO_PUBLIC_WEB_BASE_URL=https://tu-dominio` en
`app/.env` para que los enlaces sean reales y abran bien desde WhatsApp.

### Rol Administrador

Ve un único panel: la lista de todos los Operadores Perú con sus datos de contacto, los
pagos de suscripción pendientes de verificar, y la configuración de a dónde deben pagar
(banco/CCI/titular/QR). La cuenta `productosaas2026@gmail.com` se auto-asigna este rol al
iniciar sesión por primera vez (hardcodeado en `handle_new_user`, migración `0009`); para
agregar más administradores, promuévelos a mano:

```sql
update usuarios set rol = 'administrador' where email = 'otro-admin@gmail.com';
```

### Suscripción mensual del Operador Perú

Cada Operador Perú paga S/ 50/mes (configurable en `configuracion_pagos_admin.monto_suscripcion`,
editable desde el panel Admin) para poder usar la app. Sin un pago **verificado** para el
mes en curso, `(operador-peru)/_layout.tsx` bloquea el acceso a todo el panel (incluido el
onboarding) y solo muestra la pantalla de pago (`components/SuscripcionGate.tsx`): datos
bancarios del admin + QR + botón para subir el comprobante. El admin aprueba o rechaza
desde su panel; si rechaza, el Operador Perú puede volver a subir el comprobante del mismo
período. Es un candado a nivel de la app (routing), no de RLS — el Operador Perú técnicamente
puede seguir escribiendo en las tablas de su negocio vía API aunque no haya pagado; endurecer
esto a nivel de base de datos queda pendiente si se necesita.

### Configurar webhooks de estado (F8/F9)

Las Edge Functions se disparan desde un trigger de base de datos (`pg_net`), no desde el
dashboard de Database Webhooks. Una sola vez, desde el SQL Editor:

```sql
alter database postgres set app.settings.edge_function_base_url =
  'https://vddyynachdgqmtofqxnr.supabase.co/functions/v1';
alter database postgres set app.settings.service_role_key = '<service_role_key>';
```

`service_role_key` está en Settings → API. No lo subas al repo.

### Desplegar Edge Functions

```bash
supabase functions deploy generar-comprobante
supabase functions deploy notificar-cambio-estado
supabase secrets set FIREBASE_SERVICE_ACCOUNT_JSON='<contenido del JSON de la cuenta de servicio>'
```

La cuenta de servicio de Firebase se descarga desde Firebase Console → Project Settings →
Service Accounts → Generate new private key (necesaria para FCM HTTP v1, ver F8).

### Tasa BCV (`bcv-tasa`)

Scrapea el dólar y euro oficial de bcv.org.ve bajo demanda (la calculadora del cliente la
llama al abrir la pantalla) con caché de 6 horas en `tasa_bcv` — si el scraping falla,
devuelve el último valor conocido en vez de romper la calculadora. bcv.org.ve no tiene
API pública, así que esto es HTML scraping y es inherentemente frágil si el sitio cambia
de estructura (selectores `#dolar` / `#euro`).

Nota técnica: bcv.org.ve sirve una cadena de certificados TLS incompleta (le falta el
intermediate "Sectigo Public Server Authentication CA DV R36"). Los navegadores la
completan solos vía AIA chasing, pero el runtime de Deno no, así que sin el fix la función
fallaba con `UnknownIssuer`. El certificado que falta está embebido en
`supabase/functions/bcv-tasa/index.ts` y se pasa a `Deno.createHttpClient({ caCerts })` —
no baja la seguridad, solo completa la cadena con la CA correcta.

## 2. Correr la app móvil

```bash
cd app
cp .env.example .env
# completa EXPO_PUBLIC_SUPABASE_ANON_KEY (Settings > API > anon/public)
npm run start
```

Escanea el QR con Expo Go, o `npm run android` / `npm run ios`.

## 3. Build y despliegue (EAS)

```bash
cd app
npx eas login
npx eas build:configure
npx eas build --platform android --profile preview
```

## Frontend — sistema de diseño (Claude Design)

Los componentes visuales de la app móvil (`app/components/`, `app/constants/theme.ts`:
`EstadoBadge`, `KPICard`, `SolicitudCard`, paleta y tipografía) se mantienen sincronizados
con un proyecto de sistema de diseño en claude.ai/design vía el flujo `/design-sync`, en
lugar de diseñarse ad-hoc pantalla por pantalla. Esto mantiene consistencia visual entre
las 3 apps (cliente, operador Perú, operador Venezuela) a medida que se agregan pantallas.

## WhatsApp al beneficiario en Venezuela

Al completar una operación (check "Depósito transferido en Venezuela"), aparece un botón
"Notificar por WhatsApp" que abre `wa.me/<teléfono>?text=...` con el mensaje ya escrito al
beneficiario — el operador solo toca enviar. Formateo del teléfono venezolano en
`lib/whatsapp.ts` (agrega el `58` y quita el `0` inicial de los números locales tipo
`0412-1234567`). **No es 100% automático a propósito:** el envío verdaderamente automático
(sin tocar nada) requiere la API oficial de WhatsApp Business de Meta — cuenta verificada,
número registrado, credenciales — que es justo lo que el PRD ya reserva para el Paso ④
(N8N). Mientras no se configure esa API, el enlace con un toque es la mejor opción sin
depender de cuentas externas nuevas.

## Pendiente

**No bloquea, pero falta para producción:**
- **Firebase (push F8)** — subir `FIREBASE_SERVICE_ACCOUNT_JSON` como secreto.
- **EAS dev/preview build** — para probar el login de Google en nativo (Expo Go no puede
  capturar el redirect `remesasia://`, ver nota arriba). El resto de la app sí corre en
  Expo Go sin problema.
- **QR de pago del admin** — el admin todavía debe subir el QR de Yape/Plin desde su panel
  (no pude extraer la imagen que se compartió en el chat; los datos bancarios de texto ya
  quedaron precargados).

**Siguientes pasos del pipeline:**
- **④ N8N** — WhatsApp Business API para notificaciones 100% automáticas (ver arriba),
  alertas de tasa desactualizada, resumen diario al dueño, reintentos de generación de PDF,
  sincronización con Google Sheets si se requiere respaldo.
- **Panel web (Op. Perú/Venezuela)** — React + Vite en Vercel. También es lo que hace que
  los enlaces de invitación sean `https://` de verdad y funcionen desde WhatsApp (ver
  `EXPO_PUBLIC_WEB_BASE_URL` arriba).
- **V2** — OCR de comprobantes (Google Vision), pagos online (Culqi/Niubiz), endurecer el
  candado de suscripción a nivel de RLS (hoy es solo a nivel de routing en la app).

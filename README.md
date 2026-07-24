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

### Habilitar Google Sign-In (pendiente — bloquea el login)

La app ya no usa SMS OTP: el login es con Google (`signInWithOAuth`). Esto **requiere que
completes estos pasos afuera del repo** — sin ellos el botón "Continuar con Google" falla:

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

### Vincular operadores

El **Operador Perú** (dueño del negocio) se promueve manualmente una sola vez, la primera
vez que inicia sesión con su Gmail:

```sql
update usuarios set rol = 'operador_peru' where email = 'operador@gmail.com';
```

El **Operador Venezuela** se vincula solo: el Operador Perú carga su email en la pantalla
de onboarding (`operador_venezuela_perfil.email`), y en cuanto esa persona inicia sesión
con ese mismo Gmail, el trigger `handle_new_user` lo asigna automáticamente al rol
`operador_venezuela` y lo vincula — no requiere SQL manual.

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

## Pendiente

**Bloquea probar el login real ahora mismo:**
- **Google Sign-In** — completar Google Cloud Console + Supabase Dashboard (ver
  "Habilitar Google Sign-In" arriba). Sin esto el botón "Continuar con Google" responde
  400 (verificado: el resto de la app funciona, solo falta esta configuración externa).

**No bloquea, pero falta para producción:**
- **Firebase (push F8)** — subir `FIREBASE_SERVICE_ACCOUNT_JSON` como secreto.
- **EAS dev/preview build** — para probar el login de Google en nativo (Expo Go no puede
  capturar el redirect `remesasia://`, ver nota arriba). El resto de la app sí corre en
  Expo Go sin problema.

**Siguientes pasos del pipeline:**
- **④ N8N** — automatizar: alertas de tasa desactualizada, resumen diario a WhatsApp/Telegram
  del dueño, reintentos de generación de PDF, sincronización con Google Sheets si se requiere respaldo.
- **Panel web (Op. Perú/Venezuela)** — React + Vite en Vercel, descrito en el PRD como opcional
  para operadores que prefieran computadora. No incluido en este scaffold; la app móvil cubre
  el 100% de las funciones núcleo del MVP.
- **V2** — OCR de comprobantes (Google Vision), pagos online (Culqi/Niubiz).

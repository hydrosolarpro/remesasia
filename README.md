# App Remesas IA

Digitaliza el flujo PEN → USDT → VES del operador Remesas. Ver el diagnóstico completo,
estudio de mercado y breakdown técnico en [`PRD_Maestro_AppRemesasIA.md`](./PRD_Maestro_AppRemesasIA.md)
(generado por Hermes Agents — Paso 2 del pipeline).

**Pipeline:** ① Hermes Agents (diagnóstico) → ② PRD Maestro → **③ Claude (este repo: backend Supabase + frontend app móvil, con Claude Design como sistema de diseño de componentes)** → ④ N8N → ⑤ Supabase + Vercel + EAS Build

## Estructura

```
app/                    App móvil (React Native + Expo + expo-router)
  app/(auth)/           Login por SMS OTP
  app/(cliente)/        F2 F3 F4 F9 F12 — calculadora, solicitud, pago, historial
  app/(operador-peru)/  F1 F5 F6 F10 F11 F13 — tasa, verificación, gestión, dashboard, chat
  app/(operador-venezuela)/  F7 F13 — beneficiario, marcar completada, chat
  lib/                  cliente Supabase, auth context, cálculo de tasas, push, PDF
supabase/
  migrations/           esquema SQL (tablas, RLS, máquina de estados, dashboard, storage, webhooks)
  functions/            Edge Functions: generar-comprobante (F9), notificar-cambio-estado (F8)
*.md / *.pdf            Documentos de diagnóstico de Hermes Agents (Paso 1-2)
```

## 1. Configurar Supabase

Proyecto ya creado: https://supabase.com/dashboard/project/vddyynachdgqmtofqxnr

**Estado actual:** las 5 migraciones de `supabase/migrations/` y las 2 Edge Functions
(`generar-comprobante`, `notificar-cambio-estado`) ya están desplegadas en el proyecto
remoto (aplicadas vía Supabase MCP). Esto incluye: enums, tablas (`usuarios`, `tasas`,
`solicitudes`, `mensajes_chat`), RLS por rol, la máquina de estados, la vista
`operaciones_dashboard` y el bucket de Storage `comprobantes`. Ambas funciones se
desplegaron con `verify_jwt: true` — el trigger de la sección "Configurar webhooks de
estado" les envía el `service_role_key` como Bearer token, que es un JWT válido del
proyecto, así que no hace falta desactivar la verificación.

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

### Habilitar SMS OTP

Dashboard → Authentication → Providers → Phone → activa un proveedor (Twilio, MessageBird o Vonage)
y agrega sus credenciales. Sin esto, `signInWithOtp({ phone })` fallará.

### Dar de alta operadores

Toda cuenta nueva entra automáticamente como `cliente` (trigger `handle_new_user`). Los 2-3
usuarios internos se promueven manualmente una vez que inician sesión la primera vez:

```sql
update usuarios set rol = 'operador_peru', nombre = 'Nombre del operador'
where telefono = '+51999999999';

update usuarios set rol = 'operador_venezuela', nombre = 'Nombre del operador'
where telefono = '+58999999999';
```

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

## Pendiente (siguientes pasos del pipeline)

- **④ N8N** — automatizar: alertas de tasa desactualizada, resumen diario a WhatsApp/Telegram
  del dueño, reintentos de generación de PDF, sincronización con Google Sheets si se requiere respaldo.
- **Panel web (Op. Perú/Venezuela)** — React + Vite en Vercel, descrito en el PRD como opcional
  para operadores que prefieran computadora. No incluido en este scaffold; la app móvil cubre
  el 100% de las 14 funciones núcleo del MVP.
- **V2** — OCR de comprobantes (Google Vision), tasa automática vía API Binance/El Dorado (F14),
  pagos online (Culqi/Niubiz).

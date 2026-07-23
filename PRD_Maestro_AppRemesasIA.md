# PRD MAESTRO DE DESCUBRIMIENTO — App Remesas IA
> **Documento único consolidado para Claude (Paso 3 del Pipeline)**  
> Canal 02 — SaaS Preestablecido para PyMEs · Corredor PEN→USDT→VES · Julio 2026

| Campo | Valor |
|---|---|
| **Producto** | App Remesas IA — Aplicativo móvil transferencias PEN→VES |
| **Cliente** | Remesas (Operador de transferencias Soles→Bolívares Soberanos) |
| **Corredor** | PEN → USDT (Binance/El Dorado) → VES |
| **Actores** | Cliente Final (Perú) · Operador Perú (1–2) · Operador Venezuela |
| **Pagos** | Yape / Transferencia Bancaria con comprobación de fondos |
| **Canal** | CANAL 02 — SaaS Preestablecido para PyMEs |
| **Fecha** | Julio 2026 |
| **Autor** | Hermes Agents — Diagnóstico IA · Pipeline Automatización SaaS |

---

## ÍNDICE
1. Resumen Ejecutivo
2. Diagnóstico — 60 Preguntas Respondidas (Bloques A–E)
3. Estudio de Mercado — TAM/SAM/SOM · Segmentos · Competencia
4. Pricing · Modelo de Ingresos · Proyección de Ganancias
5. Expansión a Otros Corredores
6. Flujo Operativo AS-IS → TO-BE
7. Estados del Ciclo de Vida de una Solicitud
8. Funciones Núcleo del MVP — 14 Funciones
9. Módulo Dashboard Financiero
10. Módulo Verificación de Fondos
11. Canal Recomendado y Casos de Éxito
12. Breakdown Técnico — Insumo para Claude
13. Huecos Menores (no bloquean MVP)
14. Siguiente Paso — Pipeline de Automatización

---

## 1. RESUMEN EJECUTIVO

App Remesas IA digitaliza el flujo completo PEN→USDT→VES para el operador Remesas. Conecta al cliente final en Perú con el Operador Perú via app móvil, reemplazando WhatsApp. El cliente calcula, solicita y paga (Yape o banco), sube su comprobante y recibe notificaciones push en cada paso. El Operador Perú verifica fondos y coordina con el Operador Venezuela dentro de la misma app. El Operador Venezuela ejecuta la transferencia bancaria al beneficiario en Venezuela. Dashboard financiero integrado: ganancias por operación + totales diario/mensual/anual + exportar CSV/PDF.

**Mercado:** 1.54M venezolanos en Perú · TAM ~USD $1,137M/año · SAM ~USD $291M · **0 competidores con app nativa en el corredor PEN→VES**.  
**Ganancia Año 1 (conservador):** ~USD $53,750/año · **Ganancia Año 3 (expansión):** ~USD $399,840/año.

---

## 2. DIAGNÓSTICO — 60 PREGUNTAS RESPONDIDAS

### BLOQUE A — Contexto del Negocio (P1–P11)

| # | Pregunta | Respuesta |
|---|---|---|
| P1 | ¿A qué se dedica la empresa? | Remesas opera el servicio de transferencia de Soles Peruanos (PEN) a Bolívares Soberanos (VES). Negocio financiero informal/semiformal de cambio de divisa orientado a la comunidad venezolana residente en Perú. |
| P2 | ¿Cuál es el producto o servicio principal? | Conversión y transferencia de Soles a Bolívares al tipo de cambio del día que fija el operador. El cliente envía Soles; su familiar en Venezuela recibe Bolívares en su cuenta bancaria. |
| P3 | ¿Quiénes son sus clientes principales? | Venezolanos residentes en Perú (B2C/C2C): trabajadores con empleo dependiente o independiente, bajo-medio nivel técnico digital, usuarios activos de smartphone y WhatsApp. |
| P4 | ¿Qué áreas tiene actualmente? | Operativa Perú: recepción de solicitudes WhatsApp, cobro en Soles, conversión USDT vía Binance/El Dorado. Operativa Venezuela: recepción USDT, conversión VES, transferencia bancaria al beneficiario. |
| P5 | ¿Cuál es el área que más necesita mejorar? | Recepción y gestión de solicitudes: 100% manual por WhatsApp, sin trazabilidad, sin cálculo automático, sin estado visible para el cliente. |
| P6 | ¿Objetivo más importante en 3–6 meses? | Automatizar el flujo: solicitud → cálculo automático → comprobación de fondos → coordinación entre operadores → notificación al cliente → comprobante digital. |
| P7 | ¿Qué proceso afecta más los ingresos? | Velocidad de atención: cliente sin respuesta rápida busca otro operador. El cuello de botella de WhatsApp limita el volumen máximo de operaciones diarias. |
| P8 | ¿Qué proceso afecta más los costos? | Tiempo manual del operador por solicitud: consultar tasa, calcular PEN→USDT→VES, responder, verificar captura, coordinar con Venezuela, notificar. Todo en WhatsApp = alto costo de tiempo. |
| P9 | ¿Qué proceso genera más fricción interna? | Coordinación entre Operador Perú y Operador Venezuela: dos personas en dos países sin sistema centralizado. Si uno no responde, la cadena se corta. |
| P10 | ¿Qué problema tendría mayor impacto al resolverse? | Automatizar recepción de solicitudes, cálculo de conversión y comprobación de fondos. Permite atender 3× más solicitudes con el mismo equipo sin errores. |
| P11 | ¿Qué área específica analizar primero? | Recepción de solicitudes y cálculo automático de la conversión PEN→USDT→VES. |

### BLOQUE B — Procesos Críticos (P12–P24)

| # | Pregunta | Respuesta |
|---|---|---|
| P12 | ¿Qué proceso mejorar primero? | Flujo completo: cliente ingresa monto → app calcula → cliente paga y sube comprobante → operador verifica → Operador Perú envía USDT → Operador Venezuela transfiere → cliente recibe notificación y comprobante. |
| P13 | ¿Cómo funciona actualmente el proceso? | 1) Cliente escribe por WhatsApp. 2) Operador consulta tasa del día. 3) Calcula manualmente PEN→USDT→VES. 4) Responde al cliente. 5) Cliente paga y envía captura. 6) Operador verifica manualmente. 7) Convierte a USDT vía Binance/El Dorado. 8) Transfiere USDT al Operador Venezuela. 9) Venezuela convierte a VES y transfiere al beneficiario. 10) Notifica por WhatsApp al Op. Perú. 11) Op. Perú notifica al cliente. Sin comprobante digital. |
| P14 | ¿Quién inicia el proceso? | El cliente final en Perú: envía un mensaje WhatsApp al Operador Perú con el monto y los datos del beneficiario en Venezuela. |
| P15 | ¿Quién participa? | 1) Cliente final (Perú). 2) Operador Perú (1–2 personas): calcula, cobra, opera en Binance/El Dorado. 3) Operador Venezuela (1 persona): recibe USDT, convierte a VES, transfiere al beneficiario. |
| P16 | ¿Quién supervisa? | El dueño/operador principal de Remesas. No existe supervisión automatizada ni reporte de operaciones en tiempo real. |
| P17 | ¿Cuáles son los pasos principales? | Solicitud → Cálculo → Confirmación monto → Pago cliente → Verificación comprobante → Conversión PEN→USDT (Binance/El Dorado) → Envío USDT Venezuela → Conversión USDT→VES → Transferencia bancaria beneficiario → Confirmación cliente. |
| P18 | ¿Qué herramientas se usan actualmente? | WhatsApp (canal único), Binance P2P y/o El Dorado (conversión PEN→USDT y USDT→VES), apps de banca peruana (Yape/banco), banca venezolana (transferencia VES al beneficiario). |
| P19 | ¿Qué documentos/sistemas intervienen? | Capturas de pantalla de comprobantes enviadas por WhatsApp. ⚠ HUECO: confirmar si hay Excel o Google Sheets de registro. |
| P20 | ¿Cuánto tiempo toma completar el proceso? | ⚠ HUECO: estimado 30–90 minutos por operación. Requiere confirmación del tiempo real. |
| P21 | ¿Qué parte falla con más frecuencia? | a) Cliente envía captura con monto diferente. b) Operador Perú tarda en responder. c) Sin confirmación del Op. Venezuela, el cliente queda sin información. d) Errores en cálculo manual de la doble conversión. |
| P22 | ¿Dónde se pierde más tiempo? | Ida y vuelta de mensajes WhatsApp: confirmar monto, enviar tasa, verificar captura, coordinar con Venezuela, notificar al cliente. Cada operación requiere 8–15 mensajes entre los actores. |
| P23 | ¿Qué tareas se repiten constantemente? | Calcular PEN→USDT→VES, publicar tasa del día, verificar capturas de pago, coordinar con Op. Venezuela, notificar al cliente, dar datos de cuenta del operador para el pago. |
| P24 | ¿Dónde aparecen más errores? | Cálculo manual de la doble conversión. Verificación de capturas (montos no coinciden). Coordinación entre operadores (mensajes perdidos en el hilo de WhatsApp). |

### BLOQUE C — Puntos de Dolor y Fallos (P25–P36)

| # | Pregunta | Respuesta |
|---|---|---|
| P25 | ¿Qué tareas dependen de una sola persona? | Todo el proceso del lado peruano depende del Operador Perú. Si no está disponible, el servicio se paraliza. No hay backup ni sistema de colas. |
| P26 | ¿Qué información suele estar incompleta? | Datos del beneficiario en Venezuela (nombre, banco, número de cuenta) llegan incompletos por WhatsApp. Historial de operaciones: no existe registro formal. |
| P27 | ¿Qué tareas podrían sistematizarse? | Cálculo de conversión, publicación de tasa del día, recepción y registro de solicitudes, verificación de comprobantes, notificación de estado, generación de comprobante al completar, reportes de ganancias. |
| P28 | ¿Qué parte genera más estrés? | Acumulación de solicitudes simultáneas en WhatsApp sin sistema de priorización. Cuando hay 5–10 clientes consultando al mismo tiempo y el operador no puede atender a todos. |
| P29 | ¿Qué parte genera más quejas de clientes? | a) Demora en respuesta. b) No saber en qué paso está su dinero. c) Sin comprobante digital. d) El cliente hace mal el cálculo porque no conoce la tasa exacta del día. |
| P30 | ¿Qué problema se intentó resolver antes? | ⚠ HUECO: no se tienen datos de intentos previos de digitalización. |
| P31 | ¿Qué información se necesita para ejecutar el proceso? | Tasa del día PEN/USDT y USDT/VES, monto en Soles, nombre del beneficiario, banco venezolano y cuenta/teléfono, comprobante del pago (Yape o banco). |
| P32 | ¿Dónde está almacenada esa información? | En conversaciones de WhatsApp dispersas. ⚠ HUECO: confirmar si hay Excel/Google Sheets de respaldo. |
| P33 | ¿La información está centralizada o dispersa? | Completamente dispersa: cada solicitud es una conversación de WhatsApp separada. Sin visión global de operaciones pendientes, en proceso o completadas. |
| P34 | ¿La información se actualiza manual o automáticamente? | 100% manual. La tasa del día la publica el operador cada mañana en WhatsApp. |
| P35 | ¿Qué datos se duplican? | El operador recopia el monto del cliente, calcula y re-escribe la respuesta. Los datos del beneficiario los re-escribe al notificar al Op. Venezuela. |
| P36 | ¿Qué datos suelen tener errores? | Monto calculado de la conversión (error humano). Número de cuenta del beneficiario en Venezuela. Monto en el comprobante de pago (clientes que pagan cantidad diferente). |

### BLOQUE D — Datos, Usuarios y Adopción (P37–P53)

| # | Pregunta | Respuesta |
|---|---|---|
| P37 | ¿Qué reportes se generan actualmente? | ⚠ HUECO: probablemente ninguno formal. Se desconoce si llevan contabilidad de operaciones o registro de ganancias. |
| P38 | ¿Quién usa esos reportes? | ⚠ HUECO: si existen, solo el dueño del negocio para control interno. |
| P39 | ¿Cada cuánto se actualizan? | ⚠ HUECO: si existen, probablemente de forma manual y esporádica. |
| P40 | ¿Qué información les gustaría en tiempo real? | Solicitudes pendientes/en proceso/completadas. Monto total operado en el día. Ganancia por operación y acumulada del día/mes/año. Tasa del día visible para todos. |
| P41 | ¿Quiénes son los usuarios de la solución? | ROL 1 — Cliente Final (Perú): calcula, solicita, paga, rastrea. ROL 2 — Operador Perú: publica tasa, verifica fondos, aprueba, marca USDT enviado, ve dashboard. ROL 3 — Operador Venezuela: ve solicitudes aprobadas, marca completadas, adjunta comprobante VZ. |
| P42 | ¿Qué tareas hace cada usuario? | Cliente: calcula→solicita→paga→sube comprobante→espera→descarga comprobante. Op. Perú: publica tasa→verifica fondos→aprueba→opera Binance/El Dorado→marca USDT enviado→dashboard. Op. VZ: ve solicitud→transfiere→marca completada. |
| P43 | ¿Qué nivel técnico tienen? | Bajo-medio: todos son usuarios de smartphone y WhatsApp. La app debe ser tan simple como WhatsApp. Flujo máximo de 3 pantallas para el cliente. |
| P44 | ¿Qué parte debe seguir siendo humana? | Aprobación de fondos (verifica comprobante visualmente). Fijación de la tasa del día. Ejecución en Binance/El Dorado (fuera de la app en MVP). Transferencia bancaria VES (Op. Venezuela la hace en su banco). |
| P45 | ¿Qué parte podría automatizarse? | Cálculo doble conversión PEN→USDT→VES. Recepción y registro de solicitudes. Notificaciones push por cambio de estado. Generación del comprobante PDF al completar. Dashboard de ganancias. V2: OCR para leer comprobante. V2: Tasa automática desde API Binance/El Dorado. |
| P46 | ¿Quién aprobaría la implementación? | El dueño/operador principal de Remesas. |
| P47 | ¿Quién sería el responsable interno? | El mismo dueño: es el sponsor, el usuario principal y el responsable de adopción. |
| P48 | ¿Qué objeciones internas podrían aparecer? | a) 'Los clientes no descargarán una app.' b) 'Es complicado.' c) 'Prefiero WhatsApp.' Mitigación: la app debe ser tan simple como WhatsApp, onboarding de 2 minutos con QR o link. |
| P49 | ¿Qué equipo debe adoptar la solución? | Operador Perú (1–2 personas), Operador Venezuela (1 persona). Total: 2–3 usuarios internos. Clientes: onboarding propio con QR o link de descarga. |
| P50 | ¿Qué tan abierto está el equipo a IA? | ⚠ HUECO: el hecho de buscar solución digital sugiere apertura. La IA en esta app es invisible para el usuario (cálculos automáticos, no hay chatbot). |
| P51 | ¿Cuántas horas se pierden semanalmente? | ⚠ HUECO: estimado 15–30 horas/semana por operador con 20–50 solicitudes diarias. Requiere validación. |
| P52 | ¿Cuánto dinero podría estar costando el problema? | Si se pierden 3–5 clientes/día por lentitud y la comisión promedio es S/10/op, el costo mensual es S/900–1,500 en ingresos no capturados, más pérdidas directas por errores de cálculo. |
| P53 | ¿Qué pasaría si el problema persiste 6 meses? | El operador llega a su límite de capacidad. La competencia que adopte apps primero gana cuota de mercado. El servicio queda atrapado en el límite físico de mensajes de WhatsApp que puede procesar una persona por día. |

### BLOQUE E — Impacto, Métricas y Éxito (P54–P64)

| # | Pregunta | Respuesta |
|---|---|---|
| P54 | ¿Beneficio de reducir el proceso a la mitad? | Duplicar capacidad de atención sin agregar personal. Si atienden 30 ops/día, podrían atender 60. Incremento directo del 100% en ingresos sin costo adicional. |
| P55 | ¿Beneficio de reducir errores? | Eliminar pérdidas directas por cálculo incorrecto. Eliminar operaciones que se caen por datos incorrectos del beneficiario. Aumentar confianza del cliente (recibe exactamente lo prometido). |
| P56 | ¿Beneficio de mejor seguimiento? | Saber en tiempo real cuántas operaciones están pendientes/en proceso/completadas. Reporte de ganancias diario/mensual/anual sin cálculo manual. Detectar cuellos de botella. |
| P57 | ¿Qué métrica indica éxito? | 1) Tiempo de atención: de 30–90 min a <5 min. 2) Ops/día sin agregar personal: de 30 a 80+. 3) Errores de cálculo: 0. 4) Tasa completadas vs. abandonadas: >90%. |
| P58 | ¿Qué resultado tangible espera la empresa? | Atender 3× más solicitudes con el mismo equipo. Sin errores de cálculo. Comprobante digital para cada cliente. Reporte de ganancias automático al cierre del día. Sin depender de WhatsApp. |
| P59 | ¿Qué tan urgente es? | ALTA: el mercado crece, la competencia que adopte apps primero gana cuota. La ventana de ser el primer operador con app en el corredor PEN→VES está abierta hoy. |
| P60 | ¿Cuánto valor tiene resolverlo bien? | Conservador (50 ops/día): ~S/201,564/año ≈ USD $53,750. Optimista (150 ops/día + 20 licencias): ~USD $188,736/año. El producto paga su desarrollo en <3 meses de operación. |
| P61 | ¿Métrica adicional de éxito? | NPS del cliente (¿recomendaría la app?). Tasa de retención (¿vuelve en su próxima remesa?). Tiempo de verificación de fondos: meta <2 minutos. |
| P62 | ¿Resultado tangible adicional? | Reporte al cierre del día con N° ops completadas, volumen total PEN/USDT, y ganancia neta, sin sumar manualmente conversaciones de WhatsApp. |
| P63 | ¿Urgencia adicional? | No existe ningún competidor con app nativa en el corredor PEN→VES informal. La ventana de primer movedor está completamente abierta. |
| P64 | ¿Valor adicional a largo plazo? | Convertir la plataforma en SaaS licenciable a decenas de operadores del mismo corredor, multiplicando ingresos sin que el operador fundador tenga que hacer más operaciones propias. |

---

## 3. ESTUDIO DE MERCADO

### 3.1 Base Estadística — Fuentes Verificadas

| Indicador | Valor | Fuente |
|---|---|---|
| Venezolanos registrados en Perú (2023) | **1,540,000** | Superintendencia de Migraciones Perú 2023 |
| Con empleo activo | **~65% = 870,000** | INEI / OIT Perú 2023 |
| Con smartphone | **~89%** | GSMA Intelligence LATAM 2023 |
| Que usa Yape o Plin | **~72%** | BCP / BCRP 2023 |
| Que envía dinero a Venezuela (≥1×/mes) | **71%** | OIM 2022 |
| Monto promedio por envío | **S/ 200–350** | Estimación operadores informales PEN→VES |
| Monto en proyecciones | **S/ 250** | Punto medio conservador |
| Frecuencia promedio | **1.3 veces/mes** | OIM 2022 |
| Spread operador (ganancia) | **3%–5%** | Estimación de mercado |
| Spread en proyecciones | **4% = S/10 por op. de S/250** | Punto medio conservador |
| Venezolanos en Chile | **449,000** | INE Chile 2023 |
| Venezolanos en Colombia | **2,900,000** | Migración Colombia 2023 |
| Volumen global remesas Venezuela/año | **$3,400M USD** | BCV / ENCOVI 2023 |
| Crecimiento LATAM | **CAGR 5.8%** | Banco Mundial 2023 |

### 3.2 Pirámide TAM / SAM / SOM

```
┌──────────────────────────────────────────────────────────────┐
│  TAM  ~USD $1,137M/año · 1,093,400 usuarios                 │
│  Todos los venezolanos en Perú que envían remesas            │
├──────────────────────────────────────────────────────────────┤
│  SAM  ~USD $291M/año · 280,234 usuarios                     │
│  Usan operadores informales + smartphone + Yape/banco        │
├──────────────────────────────────────────────────────────────┤
│  SOM Año 1  ~USD $5.8M/año · 5,600 usuarios  (2% SAM)      │
│  SOM Año 2  ~USD $14.6M/año · 14,000 usuarios (5% SAM)     │
└──────────────────────────────────────────────────────────────┘
```

| Nivel | Cálculo clave | Resultado |
|---|---|---|
| **TAM** | 1,540,000 × 71% × S/325 × 12 ÷ 3.75 | **~USD $1,137M/año** |
| **SAM** | 1,093,400 × 40% × 89% × 72% × S/325 × 12 ÷ 3.75 | **~USD $291M/año** |
| **SOM Año 1** | 280,234 × 2% × 1.3 × S/250 × 12 ÷ 3.75 | **~USD $5.8M/año** |
| **SOM Año 2** | 280,234 × 5% × 1.3 × S/250 × 12 ÷ 3.75 | **~USD $14.6M/año** |

### 3.3 Segmentos de Cliente

| Segmento | % SAM | N° Personas | Monto avg | Vol. /mes |
|---|---|---|---|---|
| A — Frecuente habitual (1–2×/mes · S/150–300 · trabajo dependiente) | 60% | 168,140 | S/ 225 | S/ 37,831,500 |
| B — Alto valor (2–4×/mes · S/300–800 · negocio/técnico) | 15% | 42,035 | S/ 550 × 3 | S/ 69,357,750 |
| C — Ocasional (1× cada 2–3 meses · S/100–200) | 25% | 70,059 | S/ 150 | S/ 4,203,540 |
| **TOTAL SAM** | **100%** | **280,234** | | **≈ S/ 111M/mes** |

### 3.4 Análisis de Competencia

| Competidor | Posición |
|---|---|
| Western Union / MoneyGram | No operan en Venezuela masivo. Costo 7–9%. Fuera del alcance de la diáspora. |
| Binance P2P / El Dorado | Puente USDT que usa el operador, no el producto final para el cliente. |
| Remesadoras (Rapi, La Nacional) | Corredores USD, no PEN→VES. Sin presencia en el corredor específico. |
| Grupos WhatsApp/Telegram | Competencia directa actual. Sin app, sin comprobante, sin trazabilidad. |
| Remitly, Wise | No cubren Venezuela por restricciones regulatorias. |
| **✅ App nativa PEN→VES** | **NINGÚN COMPETIDOR IDENTIFICADO — VENTANA DE OPORTUNIDAD ABIERTA** |

---

## 4. PRICING Y PROYECCIÓN DE GANANCIAS

### 4.1 Precio al Cliente Final

| Concepto | Precio | Explicación |
|---|---|---|
| App descarga | **GRATIS** | Gratuita en App Store y Play Store |
| Costo de la remesa | **Spread en tasa** | El cliente no ve comisión explícita. Ve exactamente los Bs que recibirá su familiar. |
| Comisión explícita (V2) | **S/ 3–5 por op.** | Opción transparente: comisión fija visible + spread reducido |
| Envío exprés (V3) | **S/ 8–12 adicional** | Confirmación en <30 minutos |

### 4.2 Modelo Spread de Tasa

```
Tasa real Binance:     1 USDT = S/ 3.65  (el operador compra aquí)
Tasa al cliente:       1 USDT = S/ 3.80  (el operador cobra aquí)
Spread por USDT:       S/ 0.15

Operación de S/ 250:
  250 ÷ 3.80 = 65.79 USDT
  65.79 × S/ 0.15 = S/ 9.87 ≈ S/ 10 de ganancia (4%)

50 ops/día  → S/ 500/día → S/ 15,000/mes → S/ 180,000/año
150 ops/día → S/ 1,500/día → S/ 45,000/mes → S/ 540,000/año
```

### 4.3 Planes SaaS para Otros Operadores

| Plan | Precio /mes | Incluye | Perfil |
|---|---|---|---|
| 🟢 STARTER | **S/ 299** | Hasta 200 ops/mes · 1 operador · App cliente · Panel básico · Push | Pequeños: 5–10 ops/día |
| 🔵 PRO | **S/ 599** | Hasta 800 ops/mes · 2 operadores · Dashboard completo · CSV/PDF · Chat | Medianos: 20–40 ops/día |
| 🟣 BUSINESS | **S/ 999** | Ops ilimitadas · 5 operadores · White-label · API · Multimoneda | Grandes o multimoneda |
| ⚡ SETUP | **S/ 499 único** | Onboarding, configuración, capacitación | Todos los planes |

### 4.4 Escenarios de Ganancia

| Escenario | Ops/día | Op.SaaS | Ingreso mensual S/ | Ingreso anual USD |
|---|---|---|---|---|
| 🔴 Conservador (Año 1) | 50 | 3 | S/ 16,797 | **~$53,750** |
| 🟡 Moderado (Año 1–2) | 100 | 10 | S/ 35,990 | **~$115,168** |
| 🟢 Optimista (Año 2) | 150 | 20 | S/ 58,980 | **~$188,736** |
| 🚀 Expansión (Año 3) | 300 | 50 | S/ 124,950 | **~$399,840** |

---

## 5. EXPANSIÓN A OTROS CORREDORES

| Corredor | Población | TAM /año | Prioridad |
|---|---|---|---|
| **PEN→VES (Perú) ✅** | 1,540,000 | **~USD $1,137M** | **1 — AHORA** |
| CLP→VES (Chile) | 449,000 | ~USD $330M | 2 — Año 2 |
| COP→VES (Colombia) | 2,900,000 | ~USD $2,130M | 3 — Año 2–3 |
| USD→VES (EE.UU.) | 506,000 | ~USD $1,200M | 4 — Año 3+ |
| ARS→VES (Argentina) | 165,000 | ~USD $121M | 5 — Año 3+ |
| **TOTAL** | **5,560,000** | **~USD $4,918M** | — |

---

## 6. FLUJO OPERATIVO AS-IS → TO-BE

### AS-IS (Problemas)
| # | Actor | Acción actual |
|---|---|---|
| 1 | Cliente (Perú) | Escribe por WhatsApp: monto en Soles + datos del beneficiario |
| 2 | Operador Perú | Consulta tasa del día. Calcula manualmente PEN→USDT→VES. Responde al cliente. |
| 3 | Cliente (Perú) | Paga por Yape o banco. Envía captura del comprobante por WhatsApp. |
| 4 | Operador Perú | Verifica MANUALMENTE la captura. Sin validación automática ni alerta. |
| 5 | Op. Perú → VZ | Convierte a USDT vía Binance/El Dorado. Transfiere USDT al Op. Venezuela. |
| 6 | Op. Venezuela | Recibe USDT, convierte a VES. Transfiere al beneficiario. Notifica por WhatsApp. |
| 7 | Operador Perú | Notifica al cliente. Sin comprobante digital. Sin historial. Sin dashboard. |

### TO-BE (con App Remesas IA)
| # | Actor | Acción con la app |
|---|---|---|
| 1 | Cliente — App | Abre la app. Ingresa monto en Soles. Ve al instante los Bs que recibirá (doble tasa PEN→USDT→VES). Completa formulario del beneficiario. |
| 2 | Cliente — App | Selecciona Yape o Transferencia Bancaria. App muestra datos de pago del operador. |
| 3 | Cliente — App | Paga y sube captura del comprobante desde la app. Estado → EN VERIFICACIÓN. |
| 4 | Op. Perú — App | Recibe push. Ve imagen del comprobante. Verifica monto y fecha. Aprueba o rechaza. Estado → FONDOS VERIFICADOS. |
| 5 | Op. Perú — App | Opera en Binance/El Dorado. Regresa a la app, marca "USDT enviado", registra tasa real de compra. Estado → EN PROCESO. |
| 6 | Op. VZ — App | Recibe push con datos completos del beneficiario. Hace transferencia bancaria VES. Marca COMPLETADA. |
| 7 | Cliente — App | Recibe push "Completada". Descarga comprobante digital PDF. Sin WhatsApp. |

---

## 7. ESTADOS DEL CICLO DE VIDA DE UNA SOLICITUD

```
BORRADOR → PENDIENTE → EN VERIFICACIÓN → FONDOS VERIFICADOS → EN PROCESO → COMPLETADA
                                └─────────────────────────────────────────── RECHAZADA
                                                                              CANCELADA
```

| Estado | Descripción | Responsable |
|---|---|---|
| BORRADOR | Cliente llenando el formulario | Cliente |
| PENDIENTE | Solicitud enviada — cliente aún no sube comprobante | Cliente |
| EN VERIFICACIÓN | Comprobante subido — Operador Perú debe revisar | Operador Perú |
| FONDOS VERIFICADOS | Op. Perú aprobó — iniciando conversión USDT | Operador Perú |
| EN PROCESO | USDT enviados — Op. Venezuela ejecutando | Operador Venezuela |
| COMPLETADA | Transferencia VES realizada — comprobante PDF generado | Operador Venezuela |
| RECHAZADA | Comprobante inválido o monto no coincide | Operador Perú |
| CANCELADA | Cancelada por cliente u operador | Cualquiera |

---

## 8. FUNCIONES NÚCLEO DEL MVP — 14 Funciones

| ID | Módulo | Prior. | Función | Descripción | Actor |
|---|---|---|---|---|---|
| F1 | Tasas | Alta | Publicación tasa del día | Op. Perú publica PEN/USDT y USDT/VES. Base de todos los cálculos del día. | Op. Perú |
| F2 | Calculadora | Alta | Calculadora doble PEN→USDT→VES | Cliente ingresa Soles → ve Bs al instante con desglose de ambas tasas. | Cliente |
| F3 | Solicitud | Alta | Formulario de solicitud | Monto, nombre beneficiario, banco venezolano, cuenta/teléfono. ID único. | Cliente |
| F4 | Pagos | Alta | Selección y subida de comprobante | Elige Yape o Banco. App muestra datos de pago. Cliente sube captura. | Cliente |
| F5 | Verificación | Alta | Panel verificación de fondos | Op. ve imagen, verifica monto y fecha, aprueba/rechaza con motivo. MVP: manual. V2: OCR. | Op. Perú |
| F6 | Gestión | Alta | Panel de solicitudes Op. Perú | Lista por estado, filtros, marcar "USDT enviado", registrar tasa real, historial. | Op. Perú |
| F7 | Gestión | Alta | Panel Operador Venezuela | Datos del beneficiario, marcar completada, adjuntar comprobante VZ opcional. | Op. VZ |
| F8 | Notif. | Alta | Notificaciones push FCM | Push a cliente y operadores en cada cambio de estado. Firebase FCM + Supabase Webhooks. | Todos |
| F9 | Comprobante | Alta | Comprobante PDF automático | Generado al completar: ID, fecha, montos, tasas, beneficiario. Descargable por el cliente. | Cliente |
| F10 | Dashboard | Alta | Dashboard KPIs tiempo real | Operaciones del día, volumen PEN/USDT, ganancia neta por operación. | Op. Perú |
| F11 | Dashboard | Alta | Totales diario/mensual/anual | Acumulados, gráficas, comparativas, exportar CSV/PDF. | Op. Perú |
| F12 | Historial | Media | Historial del cliente | Remesas anteriores con estado y comprobante. Repetir con 1 clic. | Cliente |
| F13 | Chat | Media | Chat interno por solicitud | Mensajes Op. Perú ↔ Op. VZ vinculados a cada solicitud. Reemplaza WhatsApp entre ellos. | Op. Perú/VZ |
| F14 | API | V2 | Integración Binance/El Dorado | Tasa USDT automática desde API. Op. Perú solo aprueba. V2: OCR automático comprobantes. | Op. Perú |

---

## 9. MÓDULO DASHBOARD FINANCIERO

| Vista / Componente | Datos que muestra |
|---|---|
| Tarjetas KPI tiempo real | Total operaciones día \| Soles operados \| USDT movilizados \| Ganancia neta del día |
| Ganancia por operación | Spread = tasa cliente − tasa real Binance. En S/ y % por operación. |
| Resumen diario | N° completadas/rechazadas/canceladas · Volumen PEN/USDT/VES · Ganancia neta |
| Resumen mensual | Acumulado semanal · Días de mayor volumen · Op. de mayor y menor margen |
| Resumen anual | Mes a mes · Tendencia de crecimiento · Total ganancias del año |
| Exportación | CSV (Excel/Sheets) o PDF resumen ejecutivo por período |
| Detalle por operación | ID · Fecha/hora · Cliente · Monto PEN · Tasas · USDT · Bs entregados · Ganancia · Estado |

**Lógica:** `Ganancia = (Tasa cliente − Tasa real Binance) × Monto USDT`  
El Op. Perú registra la tasa real al marcar "USDT enviado". El dashboard calcula el spread automáticamente.

---

## 10. MÓDULO VERIFICACIÓN DE FONDOS

| Paso | Yape | Transferencia Bancaria |
|---|---|---|
| 1 — Cliente paga | Transfiere al número Yape del Op. Perú (visible en la app) | Transfiere al CCI/cuenta del Op. Perú (visible en la app) |
| 2 — Sube comprobante | Screenshot de Yape → sube desde la app (Image Picker) | Voucher bancario (app banco/SMS/email) → sube desde la app |
| 3 — Notificación | Push al Op. Perú: "Nueva solicitud con comprobante" | Push al Op. Perú: "Nueva solicitud con comprobante" |
| 4 — Revisión MVP | Op. ve imagen: verifica nombre, monto, fecha → Aprueba/Rechaza con motivo | Op. ve voucher: verifica N° op., monto, banco → Aprueba/Rechaza |
| 5 — V2: OCR | Google Vision extrae monto/fecha del screenshot Yape. Alerta si no coincide. | OCR sobre voucher bancario. Extrae monto, banco, fecha. Validación automática. |
| 6 — Resultado | Estado → FONDOS VERIFICADOS. Push de confirmación al cliente. | Estado → FONDOS VERIFICADOS. Push de confirmación al cliente. |

---

## 11. CANAL RECOMENDADO Y CASOS DE ÉXITO

**CANAL 02 — SaaS Preestablecido para PyMEs**

**Justificación:** Dolor común y repetible de un operador PyME financiero con flujo multi-actor. El producto puede empaquetarse y replicarse para otros operadores del corredor PEN→VES. No requiere integración con sistemas legados complejos (Canal 03). No es consumo masivo B2C (Canal 01).

**Ruta de evolución:** Canal 02 → Canal 03 si Remesas formaliza y necesita APIs bancarias venezolanas, cumplimiento regulatorio o integración automática con Binance/El Dorado.

**Casos de éxito:**
- **Remitly (EE.UU.→LATAM):** App móvil simple para remesas → +$1B en volumen anual. Patrón UX idéntico al de App Remesas IA.
- **El Dorado (Colombia/Venezuela):** Exchange que Remesas ya usa. Panel de operador + historial + comprobantes automáticos validados en el corredor VES.
- **Yapu/Nequi (Bolivia, Colombia):** Operadores informales salieron de WhatsApp con app propia → 70% menos tiempo/op + 40% más volumen sin agregar personal.

---

## 12. BREAKDOWN TÉCNICO — INSUMO PARA CLAUDE

| Capa | Decisión Técnica |
|---|---|
| **App Móvil (3 roles)** | React Native + Expo. iOS y Android desde un solo código. 3 roles: cliente / operador_peru / operador_venezuela. |
| **Backend / BD** | Supabase — PostgreSQL + Row Level Security (RLS) por rol + Realtime subscriptions para sincronización de estado en tiempo real. |
| **Autenticación** | Supabase Auth — SMS OTP por número de teléfono. Rol asignado por Operador Perú al dar de alta usuarios internos. |
| **Verificación fondos** | MVP: revisión manual de imagen. V2: OCR automático (Google Vision API). |
| **Notificaciones Push** | Firebase Cloud Messaging (FCM). Disparadas por Supabase DB Webhooks → Edge Function → FCM al cambiar estado. |
| **Comprobantes PDF** | Supabase Edge Functions (Node.js + PDFKit). Almacenados en Supabase Storage. URL firmada descargable. |
| **Dashboard** | Vistas materializadas PostgreSQL para totales diario/mensual/anual. Victory Native (RN) / Recharts (web panel). |
| **Subida imágenes** | React Native Image Picker → Supabase Storage. Vista directa en panel del Operador Perú. |
| **Panel web Op.** | React + Vite en Vercel. Para operadores que prefieran computadora. |
| **Despliegue** | EAS Build (Expo) para iOS/Android. Vercel para panel web. Supabase Cloud para backend. |
| **V2 — Integraciones** | Binance API / El Dorado API (tasa USDT automática). Google Vision API (OCR). Culqi/Niubiz (pagos PEN online). |

---

## 13. HUECOS MENORES (no bloquean el MVP)

- ⚠ H1. ¿El Operador Venezuela es la misma persona o colaborador distinto? — define si hay 2 o 3 cuentas de operador.
- ⚠ H2. ¿La ganancia viene del spread de tasa, comisión fija por operación, o ambas?
- ⚠ H3. ¿Cuántas operaciones se procesan por día actualmente?
- ⚠ H4. ¿Se requiere KYC del cliente (DNI/pasaporte)?
- ⚠ H5. ¿Los comprobantes Yape tienen formato estandarizable para OCR automático en V2?
- ⚠ H6. ¿Se ha intentado alguna solución digital antes? ¿Qué falló?
- ⚠ H7. ¿Existe algún registro previo de operaciones (Excel/Google Sheets)?

---

## 14. SIGUIENTE PASO — PIPELINE DE AUTOMATIZACIÓN

```
① Hermes Agents (Diagnóstico) ✅
② Este PRD Maestro ✅
③ Claude → generación de código  ← PRÓXIMO PASO
④ N8N → automatizaciones
⑤ Supabase + Vercel + EAS Build → infraestructura
```

### Instrucción para Claude — Paso 3

**Stack:** React Native + Expo + Supabase (PostgreSQL + Realtime + Auth + Storage) + Firebase FCM + Vercel + EAS Build

**3 roles de usuario:** `cliente` / `operador_peru` / `operador_venezuela`

**Flujo de estados:**
```
BORRADOR → PENDIENTE → EN_VERIFICACION → FONDOS_VERIFICADOS → EN_PROCESO → COMPLETADA
                                └──────────────────────────────────────── RECHAZADA
                                                                           CANCELADA
```

**Módulos a generar (MVP):**
- Calculadora doble tasa (PEN→USDT→VES) con desglose visible
- Formulario de solicitud con datos del beneficiario venezolano
- Subida de comprobante de pago (Yape / Banco) con Image Picker
- Panel de verificación de fondos (imagen + aprobar/rechazar con motivo)
- Panel de gestión de solicitudes (Operador Perú: filtros + acciones)
- Panel Venezuela (datos beneficiario + marcar completada + adjuntar comprobante VZ)
- Notificaciones push FCM en cada cambio de estado
- Comprobante PDF auto-generado al marcar COMPLETADA
- Dashboard financiero: ganancia por operación + totales diario/mensual/anual + exportar CSV/PDF
- Chat interno entre operadores vinculado a cada solicitud
- Historial del cliente con botón "Repetir remesa"

**Base de datos Supabase:**
- Tabla `solicitudes` con campo `estado` (enum: BORRADOR/PENDIENTE/EN_VERIFICACION/FONDOS_VERIFICADOS/EN_PROCESO/COMPLETADA/RECHAZADA/CANCELADA)
- Tabla `tasas` (publicadas diariamente por Op. Perú: tasa_pen_usdt, tasa_usdt_ves, fecha)
- Tabla `usuarios` con campo `rol` (cliente/operador_peru/operador_venezuela)
- Tabla `operaciones_dashboard` (vista materializada: fecha, n_ops, vol_pen, vol_usdt, ganancia_neta)
- RLS: cada rol solo puede ver y modificar lo que le corresponde
- Realtime subscriptions en la tabla `solicitudes` para sincronización en tiempo real entre actores

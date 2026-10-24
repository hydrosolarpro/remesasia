# Remesas IA – Protección de datos y seguridad (documento de trabajo)

Fecha: 2026-10-24. Documento de análisis: **no modifica código ni base de datos**. Sustituye cada `[POR COMPLETAR]` antes de publicar. No es asesoría legal: debe ser revisado por un abogado peruano de datos personales.

## 1. Marco legal aplicable (Perú)

- **Ley 29733 de Protección de Datos Personales** y su **nuevo Reglamento (DS 016-2024-JUS)**, vigente desde el 30-mar-2025. Las fuentes consultadas indican:
  - Notificar a la Autoridad (ANPD) y a los titulares afectados en **máx. 48 horas** desde que se conoce un incidente que pueda afectar derechos.
  - No notificar cuando correspondía es **infracción grave**; las multas llegan hasta **50 UIT** según esas fuentes.
- Derechos **ARCO** del titular: Acceso, Rectificación, Cancelación (eliminación) y Oposición. Hay que atenderlos en plazos legales (verificar en el reglamento).
- **Registro de bancos de datos** ante la ANPD: la ley lo exige. Confirmar si ya está hecho.
- **Prevención de lavado de activos (Ley 27693, UIF-Perú):** no pude confirmar si una remesadora es "sujeto obligado" ni su plazo de conservación (suele citarse 10 años). **Debe confirmarlo el abogado**, porque condiciona qué se puede borrar.
- Si hay usuarios o beneficiarios en Venezuela, su ley local no tiene un régimen equivalente. Lo prudente es aplicar el estándar peruano a todos.

Fuentes: [CMS – notificación de incidentes](https://cms.law/content/download/705947/file/Infografia%20TMC%20-%20Notificacion%20de%20incidentes%20de%20seguridad.pdf), [El Peruano](https://elperuano.pe/noticia/292188-incidente-de-seguridad-digital-o-de-datos-personales). Vienen de firmas de abogados, no del texto oficial: verificar en El Peruano.

## 2. Diagnóstico del proyecto (lo que encontré hoy)

**Datos personales que trata la app** (tablas reales de Supabase):

| Dato | Dónde | Quién |
|---|---|---|
| Nombre, teléfono, email, país | `usuarios` | todos |
| Tipo y número de documento, **foto del documento** | `usuarios`, bucket `documentos-identidad` | clientes |
| Referido (nombre, apellido, teléfono) | `usuarios` | clientes (opcional) |
| Beneficiario: nombre, CI, teléfono, banco, cuenta | `solicitudes`, `beneficiarios_cliente`, `beneficiario_cuentas_bancarias`, `cuentas_utilizadas_cliente` | clientes |
| Montos, tasas, comprobantes de pago | `solicitudes`, bucket `comprobantes` | clientes/operadores |
| Cuentas bancarias, Yape/Plin, QR del negocio | `cuentas_bancarias_operador`, `perfil_negocio*` | operadores |
| PIN (hash), intentos fallidos | `acceso_pin` | todos |
| Token push, chat de Telegram/usuario | `usuarios`, `beneficiarios_cliente` | todos |
| Datos comerciales de interesados | `prospectos` | prospectos |

**Riesgos detectados (por gravedad):**

1. **CRÍTICO – Bucket `documentos-identidad` público.** Hay 6 fotos de documentos de identidad accesibles por URL directa por quien la conozca. Lo mismo ocurre con `comprobantes`, que tiene comprobantes de pago.
2. **ALTO – Bucket y policy de prueba en producción** (`zzz-test-bucket`, policy "zzz test insert"). Hay que borrarlos.
3. **ALTO – `anon` (sin sesión) puede ejecutar 49 funciones `SECURITY DEFINER`** (incluidas `pin_*`, `eliminar_operador_peru`, `publicar_tasa_*`, `validar_deposito_*`). Muchas validan `auth.uid()` por dentro, pero no debería haber exposición. Necesita revisión función por función.
4. **MEDIO – `anon` tiene todos los privilegios sobre todas las tablas** (INSERT, UPDATE, DELETE, TRUNCATE…). Hoy lo contiene RLS. Es defensa en profundidad: si una política falla, queda abierta.
5. **MEDIO – "Eliminar cliente" no borra los datos.** Hace borrado lógico y conserva nombre, teléfono y documento en `usuarios`. Hay que anonimizar y borrar la foto del documento, conservando solo lo que la ley obligue.
6. **MEDIO – CORS `*` en las Edge Functions** y protección contra contraseñas filtradas desactivada (aviso del advisor de Supabase).
7. **BAJO – Sin política de privacidad, sin consentimiento registrado, sin canal de soporte visible** en el perfil.
8. **Bien:** RLS activo en las 28 tablas y la `service_role` solo vive en Edge Functions. En el repo no hay llaves expuestas; `.env` está ignorado y `.env.example` usa solo la `anon key`, que es pública por diseño.

## 3. Política de privacidad (borrador listo para publicar)

**Responsable del tratamiento:** [POR COMPLETAR: nombre/razón social, RUC, domicilio en Perú].
**Contacto de privacidad y soporte:** productosaas2026@gmail.com · WhatsApp +51 960 442 025.

**3.1 Datos, finalidad, base legal y plazo**

| Dato | Para qué | Base legal | Plazo de conservación |
|---|---|---|---|
| Nombre, teléfono, email | Crear y operar tu cuenta, contactarte por tus operaciones | Ejecución del servicio | Mientras tu cuenta esté activa + [plazo legal, a confirmar] |
| Documento de identidad (número y foto) | Verificar identidad del cliente antes de remesar y cumplir prevención de lavado de activos | Obligación legal / interés legítimo en prevenir fraude | Según obligación legal, a confirmar con abogado |
| Datos del beneficiario (nombre, CI, cuenta, teléfono) | Ejecutar la remesa que ordenas | Ejecución del servicio | Mientras dure la obligación legal de conservar operaciones |
| Montos, tasas, comprobantes | Registrar y justificar cada operación, reportes y contabilidad | Obligación legal tributaria y contractual | **5 años** (plazo tributario habitual, a confirmar) |
| PIN (cifrado) | Autenticarte | Ejecución del servicio | Hasta que elimines tu cuenta |
| Token de notificaciones, Telegram | Avisarte el estado de tus operaciones | **Consentimiento** (puedes retirarlo) | Hasta que lo retires |
| Datos de interesados (landing) | Responder tu consulta comercial | **Consentimiento** | [POR COMPLETAR, ej. 12 meses] |

**3.2 Con quién se comparten**
- **Operadores de tu negocio** (Perú y Venezuela), solo lo necesario para atender tu operación.
- **Proveedores técnicos (encargados):** Supabase (base de datos, alojamiento en us-west-2, EE. UU.), Vercel (alojamiento web), Telegram y notificaciones push (avisos), Google (inicio de sesión), PayPal (pago de planes).
- **Autoridades**, cuando una ley lo exija.
- **No vendemos tus datos.** No se usan para publicidad de terceros.
- **Transferencia internacional:** tus datos se procesan en EE. UU. por nuestros proveedores, con medidas de seguridad contractuales y técnicas.

**3.3 Tus derechos y cómo ejercerlos** (siempre sin costo)
- **Acceso:** ver y descargar todos tus datos.
- **Rectificación:** editar tus datos en *Perfil*.
- **Cancelación:** eliminar tu cuenta y tus datos.
- **Oposición y revocación del consentimiento.**
- Se conservarán únicamente los registros que una ley nos obligue a mantener, bloqueados y sin otro uso, hasta que venza ese plazo.
- Escribe a productosaas2026@gmail.com o por WhatsApp al +51 960 442 025. También puedes reclamar ante la **Autoridad Nacional de Protección de Datos Personales (ANPD)**.

**3.4 Seguridad:** cifrado en tránsito (HTTPS), control de acceso por rol a nivel de base de datos, PIN almacenado con hash, accesos restringidos por negocio.
**3.5 Incidentes:** si ocurre una filtración que afecte tus datos, te avisaremos por correo en un máximo de 48 horas y notificaremos a la autoridad.

## 4. Texto para el Perfil de todas las sesiones (cliente, Operador Perú, miembro, Operador Venezuela y administrador)

> **Tus datos están protegidos**
> Todos tus datos personales se tratan conforme a la Ley 29733 de Protección de Datos Personales y su Reglamento. Se usan solo para operar tu cuenta y tus remesas, con acceso restringido por rol y almacenamiento protegido. Puedes ver, descargar, corregir o eliminar tus datos cuando quieras. [Política de privacidad] · [Descargar mis datos] · [Eliminar mi cuenta]
>
> **Soporte técnico 24/7**
> Si tienes un problema, **escríbenos por WhatsApp como URGENTE** al +51 960 442 025 e incluye tu **nombre, teléfono y rol**. Será atendido a la brevedad. También: productosaas2026@gmail.com

Botón: `https://wa.me/51960442025?text=URGENTE%20soporte%20Remesas%20IA.%20Nombre:%20{nombre}%20Tel:%20{telefono}%20Rol:%20{rol}`
La app lo arma con los datos de quien lo pulsa (sin enviar nada automáticamente).

## 5. Plan técnico (para ejecutar cuando lo autorices, en este orden seguro)

Cada paso se probaría primero para que **la app siga funcionando igual**.

1. **Documentos de identidad privados:** volver el bucket privado y mostrar la foto con enlace temporal firmado, visible solo para el dueño, su operador y el administrador. Cambia 3 pantallas.
2. **Comprobantes privados:** igual que el punto 1 (cambia ~6 llamadas).
3. **Limpieza:** borrar `zzz-test-bucket` y su policy de prueba.
4. **Quitar a `anon`** los privilegios sobre tablas y la ejecución de funciones, **dejando solo** lo que usan las pantallas sin sesión: la landing (`registrar_prospecto`) y el acceso por PIN. Se verificó que `pin_login` y `demo_operador` usan Edge Functions con `service_role`. Falta confirmar qué RPC llaman las dos landings.
5. **Derechos del usuario:**
   - *Acceso:* función que devuelve todos mis datos en JSON/PDF.
   - *Rectificación:* ya existe en Perfil.
   - *Eliminación real:* anonimizar `usuarios`, borrar la foto del documento y vaciar `cliente_*_historico`, conservando solo las operaciones que la ley obligue a guardar.
   - *Consentimiento:* tabla `consentimientos` (versión de política, fecha) y casilla obligatoria en *registro*.
6. **Pantalla pública de política de privacidad** y el bloque del punto 4 en los 4 perfiles.
7. **Protocolo de brecha:** tabla `incidentes_seguridad` y una función que avise al administrador y a todos los usuarios.
8. **Ajustes:** limitar CORS a tus dominios, activar protección de contraseñas filtradas, fijar `search_path` en 4 funciones, mover `pgcrypto` fuera de `public`.

## 6. Aviso de brecha: lo que se puede y lo que no

- **Correo a los usuarios y a productosaas2026@gmail.com:** posible. Hace falta un proveedor de correo (por ejemplo Resend) y su clave. Hoy la app no envía correos propios.
- **WhatsApp automático al +51 960 442 025:** requiere la **API oficial de WhatsApp Business (Meta)**, una plantilla aprobada y un token. Es una cuenta aparte, con costo. Sin ella, la alternativa gratuita es el aviso por Telegram (ya integrado) más el correo.
- **Detección:** ninguna herramienta detecta toda filtración. Se puede **detectar** actividad anómala (muchos intentos de PIN fallidos, lecturas masivas) y permitir que tú **declares el incidente** con un botón en el panel. Esa declaración dispara los avisos y deja la constancia de las 48 h.
- **Qué debes hacer tú:** rotar las llaves de Supabase si alguna se expone, y avisar a la ANPD en 48 h (la app solo prepara el texto).

## 7. Qué necesito de ti para continuar

1. Autorización para ejecutar el plan del punto 5, **tras** lo cual haré cada paso verificando que todo siga funcionando.
2. Razón social/RUC/domicilio para la política.
3. Elegir proveedor de correo y si quieres contratar WhatsApp Business API.
4. Confirmar con un abogado los plazos de conservación (tributario y lavado de activos) y el registro del banco de datos ante la ANPD.

# Guion — Video Promocional "Remesas Perú-Venezuela" (5 minutos)

Objetivo: convertir a dueños de negocios de remesas Perú-Venezuela (formales o informales) en leads calificados que soliciten el DEMO gratis de 7 días. Tono: profesional, seguro, cercano — habla directo al dolor de "manejar el negocio por WhatsApp y Excel".

Se usa en la sección `VideoPromocional` de la landing (`src/components/VideoPromocional.tsx`) — al terminar de grabarlo/editarlo, sube el link de embed (YouTube o Vimeo) a la constante `URL_VIDEO_PROMOCIONAL` de ese archivo.

---

## 0:00 – 0:25 · Gancho (el dolor)

**Visual:** pantalla partida — de un lado capturas de WhatsApp con decenas de mensajes de clientes sin responder, una hoja de Excel desordenada con montos tachados; del otro lado, un operador estresado revisando el celular a las 11pm.

**Locución:**
> "¿Cuántas veces has perdido la cuenta de quién ya pagó, cuánto le corresponde en bolívares, o si ya se le transfirió a su beneficiario en Venezuela? Si manejas tu negocio de remesas por WhatsApp y una hoja de cálculo... esto es para ti."

**Texto en pantalla:** "Remesas caóticas = clientes que se van con la competencia."

---

## 0:25 – 0:50 · Presentación de la solución

**Visual:** transición limpia (flash blanco/azul) al logo animado de "Remesas Perú-Venezuela" con el mapa Perú↔Venezuela.

**Locución:**
> "Te presento Remesas Perú-Venezuela: la plataforma inteligente y automática que digitaliza todo tu negocio de remesas — desde que el cliente pide su envío, hasta que su familia recibe el dinero en Venezuela."

**Texto en pantalla:** "Todo automático. Todo en un solo lugar."

---

## 0:50 – 2:00 · Recorrido de beneficios (mostrar la app en pantalla)

**Visual:** screen recording real de la app (usar las capturas de `PlatformCarousel`), con zoom a cada pantalla mencionada.

**Locución (por bloques, con corte de pantalla en cada uno):**
1. *(0:50–1:10)* "Tus clientes se registran solos, con cupo controlado automáticamente según tu plan — nada de anotar nombres en un cuaderno."
2. *(1:10–1:30)* "Cada solicitud se sincroniza al instante entre tu equipo en Perú y tu equipo en Venezuela. Se acabó el 'espérame que le escribo a mi socio para confirmar'."
3. *(1:30–1:50)* "El cliente sube su comprobante, tú lo validas con un toque, y el sistema le avisa automáticamente por WhatsApp o Telegram — sin que muevas un dedo."
4. *(1:50–2:00)* "Y al final del día tienes tus estadísticas, tu ganancia real y tus reportes en Excel y PDF, listos para descargar."

**Texto en pantalla (rotativo):** "Registro automático" → "Sincronización PE ↔ VE" → "Avisos automáticos" → "Reportes con un clic"

---

## 2:00 – 2:45 · Demo del flujo real (velocidad como argumento de venta)

**Visual:** cronómetro en pantalla mientras se muestra el flujo completo: cliente pide remesa → operador Perú valida depósito → operador Venezuela transfiere → cliente confirma recepción.

**Locución:**
> "Mira qué tan simple es: tu cliente pide su remesa, tú confirmas el pago, tu equipo en Venezuela transfiere, y tu cliente recibe la confirmación — todo en minutos, no en horas de mensajes cruzados."

**Texto en pantalla:** "De horas de WhatsApp... a minutos de plataforma."

---

## 2:45 – 3:30 · Prueba social y confianza (el fundador)

**Visual:** foto/clip del fundador (José Silva) hablando a cámara o voz en off sobre su foto, con sellos "Respaldo de base de datos" y "Seguridad cibernética" en pantalla.

**Locución:**
> "Soy José Silva, y construí esta plataforma después de ver a decenas de operadores como tú perder tiempo, dinero y clientes por no tener una herramienta hecha específicamente para este negocio. Tus datos están respaldados y protegidos, y tienes soporte técnico 24/7 sin costo adicional."

**Texto en pantalla:** "Hecho por y para el negocio de remesas Perú-Venezuela."

---

## 3:30 – 4:10 · Comparativa caos vs eficiencia

**Visual:** tabla animada (reusar el diseño de `ComparisonTable`) — columna izquierda en rojo "Sin la plataforma", columna derecha en verde "Con Remesas Perú-Venezuela".

**Locución:**
> "Sin la plataforma: mensajes perdidos, errores de cálculo, clientes que se frustran y se van. Con la plataforma: todo ordenado, automático, y tu negocio listo para crecer sin depender de tu memoria."

---

## 4:10 – 4:35 · Oferta y planes

**Visual:** tarjetas de planes (Starter, Pro, Avance, Ultra) apareciendo una a una, con el precio destacado.

**Locución:**
> "Tienes planes desde S/100 al mes, según el tamaño de tu operación — y puedes empezar ahora mismo con 7 días de DEMO completamente gratis, sin tarjeta, sin compromiso."

**Texto en pantalla:** "Desde S/100/mes · DEMO gratis 7 días"

---

## 4:35 – 5:00 · Cierre con urgencia (CTA)

**Visual:** vuelve al logo, con el botón "Solicita tu Demo Gratis" resaltado (el mismo que abre el cuestionario en la landing).

**Locución:**
> "No sigas perdiendo clientes por un negocio desordenado. Toca el botón, cuéntanos de tu negocio, y activa hoy mismo tu acceso gratis por 7 días a Remesas Perú-Venezuela."

**Texto en pantalla (grande, final):** "SOLICITA TU DEMO GRATIS →"

---

## Notas de producción

- **Música:** corporativa/tech, tono confiable pero con energía (evitar dramatismo excesivo — el problema es operativo, no emocional).
- **Duración total:** ~5:00, con margen de ±15s por edición.
- **Formato de entrega recomendado:** horizontal (16:9) para la landing y YouTube; considerar un recorte vertical (9:16) del bloque 0:00–0:50 + 4:35–5:00 para usarlo como teaser en WhatsApp/redes.
- **Subtítulos:** incluir siempre — buena parte del público lo verá con el sonido apagado desde WhatsApp.

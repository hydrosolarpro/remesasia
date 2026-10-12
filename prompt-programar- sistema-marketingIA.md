**Prompt Completo para Programar el Sistema de Marketing con IA en Supabase**

-----
**🎯 OBJETIVO**

Integrar un módulo de marketing automatizado en en la sesión del operador principal de peru que se Llame “Automaketing” que usa Supabase como backend. El sistema debe generar publicaciones únicas para redes sociales (Facebook, Instagram, TikTok) con imágenes creadas por IA y textos persuasivos, incluyendo enlace de WhatsApp ([wa.me](https://wa.me/)) y su enlace de invitación de cliente, sin mostrar tasas de cambio.

**CONTEXTO DEL NEGOCIO**

- **App existente:** Plataforma de remesas Perú → Venezuela
- **Usuarios:** operador principal de peru
- **Backend actual:** Supabase 
- **Frontend:** acuta que usamos en este proyecto
- **Lo que NO se publica:** Tasas de cambio, comisiones, precios
- **Lo que SÍ se comunica:** Rapidez, tecnología, confianza, conexión familiar

**Proceso:**

1. Obtener configuración del usuario (nombre, whatsapp)
1. Seleccionar variación aleatoria (concepto, estilo, colores, enfoque)
1. Generar imagen con [Pollinations.ai](https://pollinations.ai/) (sk\_AdDV4izDHkGGjTDv8w57RCv9cQLRyCcj)
1. Generar texto con Groq API (gsk\_1uZeb1rpBGQwoV8JcxBVWGdyb3FYTVIkddPXAsuSLBiwZpnlApQv)
1. Integrar [wa.me](https://wa.me/) y su enlace de invitación de cliente  del usuario con mensaje predefinido: 
1. Guardar en historial
1. Retornar resultado

**Prompts para Imágenes (8 conceptos):**

1. "familia latina feliz recibiendo dinero"
1. "smartphone moderno con app de remesas"
1. "conexión entre Perú y Venezuela"
1. "manos unidas en señal de apoyo"
1. "persona sonriente usando celular"
1. "mapa de Perú y Venezuela con corazones"
1. "familia reunida celebrando"
1. "joven profesional enviando dinero"

**Estilos Visuales (6 estilos):**

1. "flat illustration"
1. "fotografía realista"
1. "estilo minimalista"
1. "3d render moderno"
1. "diseño geométrico"
1. "acuarela artística"

**Paletas de Colores (5 opciones):**

1. "cálidos y vibrantes"
1. "azules y blancos"
1. "tonos pastel suaves"
1. "rojo y dorado"
1. "colores patrios Perú Venezuela"

**Enfoques de Texto (5 enfoques):**

1. "emocional y familiar"
1. "tecnológico y moderno"
1. "confianza y seguridad"
1. "rapidez y eficiencia"
1. "comunidad y apoyo"

**Total combinaciones posibles:** 8 × 6 × 5 × 5 = 1,200 variaciones únicas

` `**FLUJO DE USUARIO EN EL APP**

**Pantalla 1: Boton de automarketing**

- Botón "Crear Publicación"
- Tipo de red social a promocionar: Facebook, Instagram ó Tiktok con los tamaños de imagen que funcionen de acuerdo a la red social

**Pantalla 2: Configuración (Primera vez)**

- Nombre del negocio
- Número de WhatsApp
- Estilo preferido (opcional)

**Pantalla 3: Generación**

- Seleccionar tipo de contenido
- Seleccionar plataforma destino
- Botón "Generar Contenido"
- Spinner de carga (5-10 segundos)

**Pantalla 4: Resultado**

- Vista previa de imagen con opción a regenerar 
- Texto generado con opción a regenerar 
- Botones:
  - "Regenerar" (genera diferente)
  - "Descargar la publicación" (Logo del negocio, nombre del negocio, Eslogan, imagen generada, texto generado, enlace para conectar con su WhatsApp y su enlace de invitación de cliente)


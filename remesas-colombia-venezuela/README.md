# Remesas COLOMBIA-VENEZUELA

Copia independiente de Remesas Perú-Venezuela (`../app`), ajustada al corredor
**Colombia (recepción, COP) → Venezuela (entrega, VES)**. Perú-Venezuela no se
toca: esta carpeta tiene su propio código, su propia base de datos Supabase y
su propio despliegue en Vercel.

## Qué cambia respecto a Perú-Venezuela

| Tema | Perú-Venezuela | Colombia-Venezuela |
|---|---|---|
| País de recepción / moneda | Perú / PEN (S/) | Colombia / COP ($) |
| Teléfono | +51 (9 dígitos) y +58 | +57 (10 dígitos, móvil 3XX) y +58 |
| Billeteras móviles | Yape / Plin | Nequi / Daviplata |
| Cuenta interbancaria | CCI | Llave / Número de cuenta |
| Documento | DNI | Cédula (CC) |
| Fechas / zona | es-PE, America/Lima | es-CO, America/Bogota |

Los nombres **internos** se conservan a propósito (`operador_peru`, `monto_pen`,
`tasa_pen_ves`, `peru`, enum `yape`/`plin`) para no romper la lógica ni el
esquema: significan "país de recepción" y su moneda. Solo cambian los textos que
ve el usuario.

## Puesta en marcha (una sola vez)

1. **Supabase**: crea un proyecto nuevo (p. ej. `remesas-colombia-venezuela`).
2. **Base de datos**: aplica en orden `supabase/migrations/*.sql` (incluye
   `0200_colombia_telefono_y_pais.sql`, propia de este corredor):
   `supabase link --project-ref <ref>` y `supabase db push`.
3. **Edge Functions**: `supabase functions deploy` (las de `supabase/functions`;
   `pin-login` y `demo-operador` van con `verify_jwt = false`, ver
   `supabase/config.toml`). Configura los secretos (Telegram, etc.) como en
   Perú-Venezuela.
4. **Auth**: en Supabase → Authentication → Providers, activa Google y agrega
   la URL del nuevo sitio en *Redirect URLs*.
5. **Vercel**: proyecto nuevo con *Root Directory* =
   `remesas-colombia-venezuela/app`, y variables
   `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   (ver `app/.env.example`).
6. **Selector de corredores**: pon la URL final de este sitio en
   `app/components/SelectorCorredor.tsx` (y en el selector de las demás apps).

## Pendiente de este corredor

- Tasas: la tasa COP → USDT la publica el operador principal (igual que PEN);
  la tasa USDT → VES sigue siendo la de Venezuela.
- Landing de ventas propia (la de Perú-Venezuela está en
  `../remesas-perú-venezuela`).
- Videos tutorial y PDF de términos legales propios (no se copiaron los de
  Perú-Venezuela).
- Revisar textos largos (guías, términos) con un ojo comercial: se reemplazaron
  por script las palabras Perú/PEN/Yape/Plin/CCI.

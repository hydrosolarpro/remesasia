-- ─────────────────────────────────────────────────────────────
-- 0092 — Automarketing: publicaciones para redes sociales generadas con IA.
--
-- Módulo exclusivo del Operador principal de Perú (rol 'operador_peru').
-- Genera una imagen (Pollinations.ai) y un texto persuasivo (Groq) para
-- Facebook / Instagram / TikTok, combinando al azar concepto × estilo ×
-- paleta × enfoque. La publicación descargable lleva el logo, nombre y
-- eslogan del negocio (perfil_negocio), más el enlace de WhatsApp y el
-- enlace de invitación de cliente del operador. Nunca se publican tasas,
-- comisiones ni precios.
--
-- La Edge Function `generar-publicacion-marketing` hace el INSERT con
-- service_role (bypassa RLS); la policy de abajo cubre el SELECT del
-- historial y el borrado desde la app.
-- ─────────────────────────────────────────────────────────────

-- Datos de marketing que el operador configura la primera vez. El nombre,
-- logo y eslogan del negocio se siguen tomando de perfil_negocio.
alter table perfil_negocio add column if not exists whatsapp_marketing text;
alter table perfil_negocio add column if not exists estilo_marketing_preferido text;

create table if not exists publicaciones_marketing (
  id uuid primary key default gen_random_uuid(),
  operador_peru_id uuid not null references usuarios (id) on delete cascade,
  red_social text not null check (red_social in ('facebook', 'instagram', 'tiktok')),
  concepto text not null,
  estilo text not null,
  paleta text not null,
  enfoque text not null,
  imagen_prompt text not null,
  imagen_url text not null,
  texto text not null,
  wa_link text,
  invitacion_link text,
  ancho int not null,
  alto int not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pub_marketing_operador
  on publicaciones_marketing (operador_peru_id, created_at desc);

alter table publicaciones_marketing enable row level security;

drop policy if exists "pub_marketing: el principal ve y gestiona lo suyo" on publicaciones_marketing;
create policy "pub_marketing: el principal ve y gestiona lo suyo"
  on publicaciones_marketing for all
  using (operador_peru_id = auth.uid() and rol_actual() = 'operador_peru')
  with check (operador_peru_id = auth.uid() and rol_actual() = 'operador_peru');

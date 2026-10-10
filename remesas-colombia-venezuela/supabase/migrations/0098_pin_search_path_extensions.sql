-- En Supabase la extensión pgcrypto vive en el esquema `extensions`, no en
-- `public`. Las funciones de PIN quedaron con `search_path = public`, así
-- que `crypt()` / `gen_salt()` no se resolvían ("function crypt(text,text)
-- does not exist"). Se agrega `extensions` al search_path de las que
-- hashean/verifican el PIN.
alter function pin_definir_propio(text, text)              set search_path = public, extensions;
alter function pin_regenerar(uuid)                          set search_path = public, extensions;
alter function pin_provisionar(text, uuid, text, text)      set search_path = public, extensions;
alter function pin_verificar(text, text)                    set search_path = public, extensions;
alter function pin_activar_para(uuid, text)                 set search_path = public, extensions;

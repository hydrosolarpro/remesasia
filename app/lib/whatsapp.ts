// wa.me exige el número completo con código de país, sin espacios/guiones
// y SIN el 0 inicial que se usa en Venezuela para marcar en local
// (0412-1234567 al marcar, pero 584121234567 para wa.me). Si el usuario ya
// escribió el +58 lo respetamos tal cual.
export function normalizarTelefonoVe(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const soloDigitos = telefono.replace(/\D/g, '');
  if (!soloDigitos) return null;

  // Ya viene con código de país (58 + 10 dígitos = 12).
  if (soloDigitos.startsWith('58') && soloDigitos.length === 12) return soloDigitos;

  // Formato local venezolano: 0412xxxxxxx (11 dígitos, empieza en 0).
  if (soloDigitos.startsWith('0') && soloDigitos.length === 11) return `58${soloDigitos.slice(1)}`;

  // Sin el 0 inicial y sin código de país (10 dígitos, ej. 4121234567).
  if (soloDigitos.length === 10) return `58${soloDigitos}`;

  // Cualquier otro caso razonable: lo dejamos tal cual si tiene pinta de
  // número completo, para no bloquear números de otros países.
  return soloDigitos.length >= 10 ? soloDigitos : null;
}

export function construirEnlaceWhatsApp(telefono: string | null | undefined, mensaje: string): string | null {
  const normalizado = normalizarTelefonoVe(telefono);
  if (!normalizado) return null;
  return `https://wa.me/${normalizado}?text=${encodeURIComponent(mensaje)}`;
}

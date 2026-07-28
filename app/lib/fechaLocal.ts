function formatearFechaLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Fecha de HOY en el huso horario local del dispositivo (Perú/Venezuela),
 * como YYYY-MM-DD. A propósito NO usa `toISOString()`: esa convierte a
 * UTC, que en Perú/Venezuela (UTC-5 / UTC-4) puede seguir marcando "ayer"
 * varias horas después de medianoche local, o marcar "mañana" antes de
 * medianoche -- causando que operaciones de hoy se traten como de otro
 * día.
 */
export function hoyLocal(): string {
  return formatearFechaLocal(new Date());
}

/**
 * Convierte un timestamp UTC de la base de datos (p.ej.
 * `check_deposito_ve_at`) a su fecha YYYY-MM-DD en el huso horario local
 * del dispositivo, para compararla contra `hoyLocal()`.
 */
export function fechaLocalDe(isoUtc: string): string {
  return formatearFechaLocal(new Date(isoUtc));
}

/**
 * ¿Ya pasó la hora de cierre de HOY del horario de atención del negocio
 * (`perfil_negocio.horario_fin`, p.ej. "20:00")? El corte de "realizadas"
 * hacia solo-estadísticas es a esa hora, no a medianoche -- una vez
 * cerrado, las operaciones completadas hoy dejan de listarse aunque el día
 * calendario siga siendo el mismo hasta las 00:00. Sin horario_fin
 * configurado, el llamador debe usar medianoche como respaldo (esta
 * función devuelve `false` para no cortar nunca por sí sola).
 */
export function yaCerroHoy(horarioFin: string | null | undefined): boolean {
  if (!horarioFin) return false;
  const [horas, minutos] = horarioFin.split(':').map(Number);
  if (Number.isNaN(horas)) return false;
  const ahora = new Date();
  const cierre = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), horas, minutos || 0, 0, 0);
  return ahora.getTime() >= cierre.getTime();
}

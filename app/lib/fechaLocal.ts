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

/** Fecha de hoy (YYYY-MM-DD) en hora de Lima -- día de vigencia de la tasa especial por cliente. */
export const hoyLima = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());

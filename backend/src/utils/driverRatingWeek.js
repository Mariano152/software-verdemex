const WEEK_COUNT = 52;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const createUtcDate = (year, month, day) => new Date(Date.UTC(year, month - 1, day));

const formatUtcDate = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => new Date(date.getTime() + (days * DAY_IN_MS));

const parseDateOnly = (value) => {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return createUtcDate(Number(year), Number(month), Number(day));
};

export const getFirstMondayOfYear = (year) => {
  const januaryFirst = createUtcDate(year, 1, 1);
  const dayOfWeek = januaryFirst.getUTCDay();
  const offset = (8 - dayOfWeek) % 7;
  return addDays(januaryFirst, offset);
};

export const getDriverRatingWeekRange = (year, weekNumber) => {
  const parsedYear = Number.parseInt(year, 10);
  const parsedWeek = Number.parseInt(weekNumber, 10);

  if (!Number.isInteger(parsedYear)) {
    throw new Error('Selecciona un anio valido para el rating.');
  }

  if (!Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > WEEK_COUNT) {
    throw new Error('Selecciona una semana valida entre la 1 y la 52.');
  }

  const firstMonday = getFirstMondayOfYear(parsedYear);
  const nextFirstMonday = getFirstMondayOfYear(parsedYear + 1);
  const weekStart = addDays(firstMonday, (parsedWeek - 1) * 7);
  const weekEnd = parsedWeek === WEEK_COUNT
    ? addDays(nextFirstMonday, -1)
    : addDays(weekStart, 6);

  return {
    ratingYear: parsedYear,
    weekNumber: parsedWeek,
    weekStart,
    weekEnd,
    semana_inicio: formatUtcDate(weekStart),
    semana_fin: formatUtcDate(weekEnd)
  };
};

export const resolveDriverRatingWeek = (dateValue) => {
  const referenceDate = parseDateOnly(dateValue);
  if (!referenceDate) {
    throw new Error('No se pudo calcular la semana para la fecha indicada.');
  }

  const currentYear = referenceDate.getUTCFullYear();
  const firstMonday = getFirstMondayOfYear(currentYear);

  if (referenceDate < firstMonday) {
    return getDriverRatingWeekRange(currentYear - 1, WEEK_COUNT);
  }

  const daysSinceFirstMonday = Math.floor((referenceDate.getTime() - firstMonday.getTime()) / DAY_IN_MS);
  const computedWeek = Math.min(WEEK_COUNT, Math.floor(daysSinceFirstMonday / 7) + 1);
  return getDriverRatingWeekRange(currentYear, computedWeek);
};

export const getTodayDateString = () => formatUtcDate(new Date());

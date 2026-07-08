const WEEK_COUNT = 52;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const MONTH_FORMATTER = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC'
});

const createUtcDate = (year, month, day) => new Date(Date.UTC(year, month - 1, day));

const addDays = (date, days) => new Date(date.getTime() + (days * DAY_IN_MS));

const formatDateInput = (date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
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

export const getWeekRange = (year, weekNumber) => {
  const parsedYear = Number.parseInt(year, 10);
  const parsedWeek = Number.parseInt(weekNumber, 10);

  if (!Number.isInteger(parsedYear) || !Number.isInteger(parsedWeek) || parsedWeek < 1 || parsedWeek > WEEK_COUNT) {
    return null;
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
    semana_inicio: formatDateInput(weekStart),
    semana_fin: formatDateInput(weekEnd)
  };
};

export const getTodayDateString = () => formatDateInput(new Date());

export const fetchInternetCurrentDateString = async () => {
  const endpoints = [
    'https://worldtimeapi.org/api/timezone/America/Mexico_City',
    'https://worldtimeapi.org/api/timezone/America/Chicago'
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { cache: 'no-store' });
      if (!response.ok) {
        continue;
      }

      const data = await response.json();
      if (data?.datetime) {
        return String(data.datetime).slice(0, 10);
      }
    } catch {
      // Fallback local abajo
    }
  }

  return getTodayDateString();
};

export const resolveWeekFromDate = (value) => {
  const referenceDate = parseDateInput(value);
  if (!referenceDate) return null;

  const year = referenceDate.getUTCFullYear();
  const firstMonday = getFirstMondayOfYear(year);

  if (referenceDate < firstMonday) {
    return getWeekRange(year - 1, WEEK_COUNT);
  }

  const daysSinceFirstMonday = Math.floor((referenceDate.getTime() - firstMonday.getTime()) / DAY_IN_MS);
  const weekNumber = Math.min(WEEK_COUNT, Math.floor(daysSinceFirstMonday / 7) + 1);
  return getWeekRange(year, weekNumber);
};

export const buildWeekOptions = (year) => (
  Array.from({ length: WEEK_COUNT }, (_, index) => {
    const weekNumber = index + 1;
    const range = getWeekRange(year, weekNumber);
    const rangeLabel = range
      ? `${MONTH_FORMATTER.format(range.weekStart)} - ${MONTH_FORMATTER.format(range.weekEnd)}`
      : '';

    return {
      value: String(weekNumber),
      label: `Semana ${weekNumber} | ${rangeLabel}`,
      range
    };
  })
);

export const formatWeekRangeLabel = (startValue, endValue) => {
  const startDate = parseDateInput(startValue);
  const endDate = parseDateInput(endValue);
  if (!startDate || !endDate) return '-';
  return `${MONTH_FORMATTER.format(startDate)} - ${MONTH_FORMATTER.format(endDate)}`;
};

export const DOCUMENT_STATUS_TIMEZONE = 'America/Mexico_City';

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const getDatePartsInTimeZone = (date = new Date(), timeZone = DOCUMENT_STATUS_TIMEZONE) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === 'year')?.value || 0);
  const month = Number(parts.find((part) => part.type === 'month')?.value || 0);
  const day = Number(parts.find((part) => part.type === 'day')?.value || 0);
  return { year, month, day };
};

export const getTodayInTimeZone = (timeZone = DOCUMENT_STATUS_TIMEZONE) => {
  const { year, month, day } = getDatePartsInTimeZone(new Date(), timeZone);
  return new Date(year, month - 1, day);
};

export const getDayKeyInTimeZone = (timeZone = DOCUMENT_STATUS_TIMEZONE) => {
  const { year, month, day } = getDatePartsInTimeZone(new Date(), timeZone);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

export const getMillisecondsUntilNextTimeZoneDay = (timeZone = DOCUMENT_STATUS_TIMEZONE) => {
  const now = new Date();
  const today = getTodayInTimeZone(timeZone);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nowInZone = getTodayInTimeZone(timeZone);
  const currentDayKey = getDayKeyInTimeZone(timeZone);
  const currentTimeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now);

  const hour = Number(currentTimeParts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(currentTimeParts.find((part) => part.type === 'minute')?.value || 0);
  const second = Number(currentTimeParts.find((part) => part.type === 'second')?.value || 0);

  const elapsedTodayMs = ((hour * 60 + minute) * 60 + second) * 1000;
  const fullDayMs = 24 * 60 * 60 * 1000;
  const remainingMs = Math.max(fullDayMs - elapsedTodayMs, 1000);

  if (!nowInZone || !tomorrow || !currentDayKey) {
    return fullDayMs;
  }

  return remainingMs + 1000;
};

export const parseDateOnly = (dateValue) => {
  if (!dateValue) return null;

  if (typeof dateValue === 'string') {
    const matched = dateValue.match(DATE_ONLY_PATTERN);
    if (matched) {
      const [, year, month, day] = matched;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

export const addOneCalendarMonth = (baseDate) => {
  const nextMonthDate = new Date(baseDate);
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
  return nextMonthDate;
};

export const getDocumentExpiryTone = (vigencia, timeZone = DOCUMENT_STATUS_TIMEZONE) => {
  if (vigencia === '__NO_APLICA__') return 'not_applicable';

  const expiryDate = parseDateOnly(vigencia);
  if (!expiryDate) return 'neutral';

  const today = getTodayInTimeZone(timeZone);
  const oneMonthAhead = addOneCalendarMonth(today);

  if (expiryDate < today) {
    return 'expired';
  }

  if (expiryDate < oneMonthAhead) {
    return 'warning';
  }

  return 'healthy';
};

export const getDocumentDerivedStatus = (vigencia, timeZone = DOCUMENT_STATUS_TIMEZONE) => {
  const tone = getDocumentExpiryTone(vigencia, timeZone);

  if (tone === 'not_applicable') return 'no_aplica';
  if (tone === 'expired') return 'vencido';
  if (tone === 'warning') return 'por_vencer';
  if (tone === 'healthy') return 'vigente';
  return '';
};

export const getDocumentDerivedStatusLabel = (vigencia, timeZone = DOCUMENT_STATUS_TIMEZONE) => {
  const status = getDocumentDerivedStatus(vigencia, timeZone);

  if (status === 'no_aplica') return 'No aplica';
  if (status === 'vigente') return 'Vigente';
  if (status === 'por_vencer') return 'Por vencer';
  if (status === 'vencido') return 'Vencido';
  return 'Sin vigencia';
};

export const getDocumentTimingInput = (vigencia, estatus, timeZone = DOCUMENT_STATUS_TIMEZONE) => {
  if (estatus === 'no_aplica') {
    return {
      tone: 'not_applicable',
      status: 'no_aplica',
      label: 'No aplica'
    };
  }

  const normalizedVigencia = vigencia || '';
  const tone = getDocumentExpiryTone(normalizedVigencia, timeZone);
  const status = getDocumentDerivedStatus(normalizedVigencia, timeZone);
  const label = getDocumentDerivedStatusLabel(normalizedVigencia, timeZone);

  return { tone, status, label };
};

export const formatDriverRating = (rating) => {
  const parsed = Number(rating ?? 0);
  return Number.isNaN(parsed) ? '0.0' : parsed.toFixed(1);
};

export const buildDriverStars = (rating) => {
  const normalizedRating = (Number(rating) || 0) / 2;
  const safeRating = Math.max(0, Math.min(5, Math.round(normalizedRating)));
  return `${'★'.repeat(safeRating)}${'☆'.repeat(5 - safeRating)}`;
};

export const formatDriverDate = (value) => {
  if (!value) return '-';

  return new Date(value).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
};

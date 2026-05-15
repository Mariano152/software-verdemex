export const VALID_FUEL_TYPES = ['diesel', 'magma', 'premium'];

export const normalizeFuelType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'magna' || normalized === 'gasolina' || normalized === 'regular') {
    return 'magma';
  }

  return VALID_FUEL_TYPES.includes(normalized) ? normalized : '';
};

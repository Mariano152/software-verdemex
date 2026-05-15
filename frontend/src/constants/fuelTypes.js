export const FUEL_TYPE_OPTIONS = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'magma', label: 'Magma' },
  { value: 'premium', label: 'Premium' }
];

export const normalizeFuelType = (value) => {
  const normalized = String(value || '').trim().toLowerCase();

  if (normalized === 'magna' || normalized === 'gasolina' || normalized === 'regular') {
    return 'magma';
  }

  return FUEL_TYPE_OPTIONS.some((option) => option.value === normalized) ? normalized : '';
};

export const getFuelTypeLabel = (value) => (
  FUEL_TYPE_OPTIONS.find((option) => option.value === normalizeFuelType(value))?.label
  || 'Sin tipo'
);

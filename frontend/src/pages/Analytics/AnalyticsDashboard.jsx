import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFuelTypeLabel, normalizeFuelType } from '../../constants/fuelTypes';
import PipasAnalyticsDashboard from '../PipasAnalytics/PipasAnalyticsDashboard';
import DriverAnalyticsDashboard from '../DriverAnalytics/DriverAnalyticsDashboard';
import RouteAnalyticsDashboard from '../RouteAnalytics/RouteAnalyticsDashboard';
import './AnalyticsDashboard.css';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MONTH_LABELS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const CHART_PALETTE = ['#2563eb', '#06b6d4', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#6366f1', '#f59e0b', '#14b8a6'];
const GASOLINE_RECORDS_UPDATED_EVENT = 'gasoline-records-updated';
const GASOLINE_RECORDS_UPDATED_STORAGE_KEY = 'gasoline-records-updated-at';

const formatCurrency = (value) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
}).format(Number(value || 0));

const formatNumber = (value, maximumFractionDigits = 2) => Number(value || 0).toLocaleString('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits
});

const formatSignedNumber = (value, maximumFractionDigits = 2) => {
  const amount = Number(value || 0);
  const sign = amount > 0 ? '+' : '';
  return `${sign}${formatNumber(amount, maximumFractionDigits)}`;
};

const formatSignedCurrency = (value) => {
  const amount = Number(value || 0);
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}${formatCurrency(Math.abs(amount))}`;
};

const formatPercentage = (value) => `${formatNumber(value, 1)}%`;

const formatDateShortMonth = (value) => {
  const parts = parseDateParts(value);
  if (!parts) return value || '-';
  return `${String(parts.day).padStart(2, '0')} ${MONTH_LABELS[parts.month - 1]} ${parts.year}`;
};

function parseDateParts(value) {
  if (!value) return null;

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3])
    };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  };
}

const buildDateFromParts = (parts) => new Date(parts.year, parts.month - 1, parts.day);

const normalizeDateKey = (value) => {
  const parts = parseDateParts(value);
  if (!parts) return '';
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

const toLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDate = (value) => {
  const parts = parseDateParts(value);
  if (!parts) return value || '-';
  return `${String(parts.day).padStart(2, '0')}-${String(parts.month).padStart(2, '0')}-${parts.year}`;
};

const buildVehicleDisplayLabel = ({ economicNumber, description, fallback = 'Sin vehículo' }) => {
  const economic = String(economicNumber || '').trim();
  const detail = String(description || '').trim();

  if (economic && detail) return `${economic} - ${detail}`;
  if (economic) return economic;
  if (detail) return detail;
  return fallback;
};

const getVehicleRecordLabel = (record, fallback = 'Sin vehículo') => buildVehicleDisplayLabel({
  economicNumber: record.numero_economico_snapshot || record.vehiculo_numero_economico,
  description: record.descripcion_snapshot || record.vehiculo_descripcion || record.vehiculo_nombre,
  fallback
});

const getVehicleOptionLabel = (vehicle) => buildVehicleDisplayLabel({
  economicNumber: vehicle.numero_economico,
  description: vehicle.descripcion || vehicle.propietario_nombre,
  fallback: 'Sin vehículo'
});

const getDateRangeByPreset = (preset) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  if (preset === 'all') return { from: '', to: '' };

  if (preset === 'week') {
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? 6 : currentDay - 1;
    const start = new Date(year, month, day - mondayOffset);
    return { from: toLocalDateString(start), to: toLocalDateString(today) };
  }

  if (preset === 'quarter') {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      from: toLocalDateString(new Date(year, quarterStartMonth, 1)),
      to: toLocalDateString(today)
    };
  }

  if (preset === 'year') {
    return {
      from: toLocalDateString(new Date(year, 0, 1)),
      to: toLocalDateString(today)
    };
  }

  return {
    from: toLocalDateString(new Date(year, month, 1)),
    to: toLocalDateString(today)
  };
};

const shiftRangeByPreset = (preset, currentRange, direction) => {
  if (!currentRange.from || !currentRange.to) return { from: '', to: '' };

  const fromDate = new Date(`${currentRange.from}T00:00:00`);
  const toDate = new Date(`${currentRange.to}T00:00:00`);

  if (preset === 'week') {
    const shiftedFrom = new Date(fromDate);
    const shiftedTo = new Date(toDate);
    shiftedFrom.setDate(shiftedFrom.getDate() + (7 * direction));
    shiftedTo.setDate(shiftedTo.getDate() + (7 * direction));
    return { from: toLocalDateString(shiftedFrom), to: toLocalDateString(shiftedTo) };
  }

  if (preset === 'month') {
    const shiftedFrom = new Date(fromDate.getFullYear(), fromDate.getMonth() + direction, 1);
    const shiftedTo = new Date(fromDate.getFullYear(), fromDate.getMonth() + direction + 1, 0);
    return { from: toLocalDateString(shiftedFrom), to: toLocalDateString(shiftedTo) };
  }

  if (preset === 'quarter') {
    const shiftedFrom = new Date(fromDate.getFullYear(), fromDate.getMonth() + (3 * direction), 1);
    const shiftedTo = new Date(shiftedFrom.getFullYear(), shiftedFrom.getMonth() + 3, 0);
    return { from: toLocalDateString(shiftedFrom), to: toLocalDateString(shiftedTo) };
  }

  if (preset === 'year') {
    const shiftedFrom = new Date(fromDate.getFullYear() + direction, 0, 1);
    const shiftedTo = new Date(fromDate.getFullYear() + direction, 11, 31);
    return { from: toLocalDateString(shiftedFrom), to: toLocalDateString(shiftedTo) };
  }

  const totalDays = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1);
  const shiftedFrom = new Date(fromDate);
  shiftedFrom.setDate(shiftedFrom.getDate() + (totalDays * direction));
  const shiftedTo = new Date(toDate);
  shiftedTo.setDate(shiftedTo.getDate() + (totalDays * direction));
  return { from: toLocalDateString(shiftedFrom), to: toLocalDateString(shiftedTo) };
};

const formatRangeLabel = (preset, range) => {
  if (!range.from || !range.to) return 'todo el historial';

  const fromParts = parseDateParts(range.from);
  const toParts = parseDateParts(range.to);
  if (!fromParts || !toParts) return `${range.from} al ${range.to}`;

  if (preset === 'month') return `${MONTH_LABELS_LONG[fromParts.month - 1]} ${fromParts.year}`;
  if (preset === 'year') return `${fromParts.year}`;
  if (preset === 'quarter') return `T${Math.floor((fromParts.month - 1) / 3) + 1} ${fromParts.year}`;
  if (preset === 'week') return `semana del ${formatDate(range.from)}`;
  return `${formatDate(range.from)} al ${formatDate(range.to)}`;
};

const formatFilterDateCaption = ({ dateFrom, dateTo }) => {
  if (dateFrom && dateTo) return `Filtro: ${formatDate(dateFrom)} al ${formatDate(dateTo)}`;
  if (dateFrom) return `Filtro desde: ${formatDate(dateFrom)}`;
  if (dateTo) return `Filtro hasta: ${formatDate(dateTo)}`;
  return 'Filtro: todo el historial';
};

const formatAxisValue = (value) => {
  const amount = Number(value || 0);
  const absolute = Math.abs(amount);

  if (absolute >= 1000000) return `${formatNumber(amount / 1000000, 1)} M`;
  if (absolute >= 1000) return `${formatNumber(amount / 1000, 1)} mil`;
  if (absolute >= 100) return formatNumber(amount, 0);
  return formatNumber(amount, 1);
};

const getTrendGranularity = ({ preset, dateFrom, dateTo }) => {
  if (dateFrom && dateTo) {
    const from = new Date(`${dateFrom}T00:00:00`);
    const to = new Date(`${dateTo}T00:00:00`);
    const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86400000) + 1);
    if (days <= 14) return 'day';
    if (days <= 90) return 'week';
    return 'month';
  }

  if (preset === 'week') return 'day';
  if (preset === 'month') return 'week';
  return 'month';
};

const getTrendGranularityLabel = (granularity) => {
  if (granularity === 'day') return 'día';
  if (granularity === 'week') return 'semana';
  return 'mes';
};

const getWeekStart = (date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const buildWeeklyEfficiencyRows = (records = []) => {
  const weeks = new Map();
  records.forEach((record) => {
    const parts = parseDateParts(record.fecha_carga);
    const liters = Number(record.litros || 0);
    const kilometers = Number(record.kilometros_recorridos || 0);
    if (!parts || liters <= 0 || kilometers <= 0) return;
    const weekStart = getWeekStart(buildDateFromParts(parts));
    const key = toLocalDateString(weekStart);
    const current = weeks.get(key) || {
      key,
      label: `Sem ${String(weekStart.getDate()).padStart(2, '0')} ${MONTH_LABELS[weekStart.getMonth()]}`,
      rangeLabel: `Semana del ${formatDate(key)}`,
      totalLiters: 0,
      totalKm: 0,
      recordsCount: 0
    };
    current.totalLiters += liters;
    current.totalKm += kilometers;
    current.recordsCount += 1;
    weeks.set(key, current);
  });
  return Array.from(weeks.values()).sort((a, b) => a.key.localeCompare(b.key)).map((row, index) => ({
    ...row,
    averageEfficiency: row.totalLiters > 0 ? row.totalKm / row.totalLiters : 0,
    color: CHART_PALETTE[index % CHART_PALETTE.length]
  }));
};

const normalizeVehicleStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase();
  if (normalized === 'en_mantenimiento' || normalized === 'mantenimiento') return 'mantenimiento';
  if (normalized === 'inactivo') return 'inactivo';
  return 'activo';
};

const getDelta = (currentValue, comparisonValue) => {
  const current = Number(currentValue || 0);
  const comparison = Number(comparisonValue || 0);
  const difference = current - comparison;

  if (comparison === 0) {
    return {
      percentage: current === 0 ? 0 : 100,
      difference,
      direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat'
    };
  }

  const percentage = (difference / comparison) * 100;
  return {
    percentage,
    difference,
    direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat'
  };
};

const aggregateByKey = (records, getKey, getLabel, amountGetter, extraAccumulator) => {
  const map = new Map();

  records.forEach((record) => {
    const key = getKey(record);
    if (!key) return;

    const current = map.get(key) || {
      key,
      label: getLabel(record),
      totalAmount: 0,
      recordsCount: 0
    };

    current.totalAmount += Number(amountGetter(record) || 0);
    current.recordsCount += 1;
    if (extraAccumulator) extraAccumulator(current, record);
    map.set(key, current);
  });

  return Array.from(map.values()).map((item, index) => ({
    ...item,
    averageAmount: item.recordsCount > 0 ? item.totalAmount / item.recordsCount : 0,
    color: CHART_PALETTE[index % CHART_PALETTE.length]
  }));
};

const calculateGasolineMetrics = (records = []) => {
  const vehicleIds = new Set();
  const providers = new Set();

  const totals = records.reduce((acc, record) => {
    const amount = Number(record.costo_total || 0);
    const liters = Number(record.litros || 0);
    const kilometers = Number(record.kilometros_recorridos || 0);
    const provider = String(record.proveedor || '').trim();
    const vehicleId = String(record.vehiculo_id || '').trim();

    if (provider) providers.add(provider);
    if (vehicleId) vehicleIds.add(vehicleId);

    return {
      totalAmount: acc.totalAmount + amount,
      totalLiters: acc.totalLiters + liters,
      totalKm: acc.totalKm + kilometers,
      recordsCount: acc.recordsCount + 1,
      completeRecords: acc.completeRecords + (liters > 0 && kilometers > 0 ? 1 : 0)
    };
  }, {
    totalAmount: 0,
    totalLiters: 0,
    totalKm: 0,
    recordsCount: 0,
    completeRecords: 0
  });

  return {
    ...totals,
    averageTicket: totals.recordsCount > 0 ? totals.totalAmount / totals.recordsCount : 0,
    averagePricePerLiter: totals.totalLiters > 0 ? totals.totalAmount / totals.totalLiters : 0,
    averageEfficiency: totals.totalLiters > 0 ? totals.totalKm / totals.totalLiters : 0,
    costPerKm: totals.totalKm > 0 ? totals.totalAmount / totals.totalKm : 0,
    activeVehicles: vehicleIds.size,
    uniqueProviders: providers.size
  };
};

const calculateMaintenanceMetrics = (records = []) => {
  const providers = new Set();
  const vehicles = new Set();
  const maintenanceTypes = new Set();

  const totals = records.reduce((acc, record) => {
    const amount = Number(record.costo || 0);
    const provider = String(record.proveedor || '').trim();
    const vehicle = String(record.vehiculo_id || '').trim();
    const type = String(record.tipo_mantenimiento || '').trim();

    if (provider) providers.add(provider);
    if (vehicle) vehicles.add(vehicle);
    if (type) maintenanceTypes.add(type);

    return {
      totalAmount: acc.totalAmount + amount,
      recordsCount: acc.recordsCount + 1,
      oilChanges: acc.oilChanges + (record.es_cambio_aceite ? 1 : 0),
      withProvider: acc.withProvider + (provider ? 1 : 0)
    };
  }, {
    totalAmount: 0,
    recordsCount: 0,
    oilChanges: 0,
    withProvider: 0
  });

  return {
    ...totals,
    averageTicket: totals.recordsCount > 0 ? totals.totalAmount / totals.recordsCount : 0,
    oilChangeRate: totals.recordsCount > 0 ? (totals.oilChanges / totals.recordsCount) * 100 : 0,
    providerCoverage: totals.recordsCount > 0 ? (totals.withProvider / totals.recordsCount) * 100 : 0,
    uniqueProviders: providers.size,
    uniqueVehicles: vehicles.size,
    uniqueTypes: maintenanceTypes.size,
    costPerVehicle: vehicles.size > 0 ? totals.totalAmount / vehicles.size : 0
  };
};

const filterGasolineRecords = ({ records, filters }) => {
  const normalizedSearch = String(filters.search || '').trim().toLowerCase();

  return records.filter((record) => {
    const recordDate = normalizeDateKey(record.fecha_carga);
    const matchesDateFrom = filters.dateFrom ? recordDate >= filters.dateFrom : true;
    const matchesDateTo = filters.dateTo ? recordDate <= filters.dateTo : true;
    const matchesVehicle = filters.vehicleId === 'todos' ? true : String(record.vehiculo_id) === String(filters.vehicleId);
    const matchesProvider = filters.provider === 'todos' ? true : String(record.proveedor || '') === filters.provider;
    const matchesOperator = filters.operator === 'todos' ? true : String(record.operador || '') === filters.operator;
    const matchesFuelType = filters.fuelType === 'todos' ? true : normalizeFuelType(record.tipo_combustible) === filters.fuelType;
    const matchesComplete = filters.onlyComplete ? Number(record.litros || 0) > 0 && Number(record.kilometros_recorridos || 0) > 0 : true;
    const matchesFirstLoad = filters.includeFirstLoads ? true : !Boolean(record.primera_carga);

    const searchableText = [
      record.titulo,
      record.factura,
      record.proveedor,
      record.operador,
      record.tipo_combustible,
      record.vehiculo_placa,
      record.placa_snapshot,
      record.descripcion_snapshot,
      record.observaciones
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = normalizedSearch ? searchableText.includes(normalizedSearch) : true;

    return matchesDateFrom
      && matchesDateTo
      && matchesVehicle
      && matchesProvider
      && matchesOperator
      && matchesFuelType
      && matchesComplete
      && matchesFirstLoad
      && matchesSearch;
  });
};

const filterMaintenanceRecords = ({ records, filters }) => {
  const normalizedSearch = String(filters.search || '').trim().toLowerCase();

  return records.filter((record) => {
    const recordDate = normalizeDateKey(record.fecha_servicio);
    const matchesDateFrom = filters.dateFrom ? recordDate >= filters.dateFrom : true;
    const matchesDateTo = filters.dateTo ? recordDate <= filters.dateTo : true;
    const matchesVehicle = filters.vehicleId === 'todos' ? true : String(record.vehiculo_id) === String(filters.vehicleId);
    const matchesProvider = filters.provider === 'todos' ? true : String(record.proveedor || '') === filters.provider;
    const matchesType = filters.maintenanceType === 'todos' ? true : String(record.tipo_mantenimiento || '') === filters.maintenanceType;
    const matchesOilOnly = filters.onlyOilChanges ? Boolean(record.es_cambio_aceite) : true;

    const searchableText = [
      record.titulo,
      record.tipo_mantenimiento,
      record.proveedor,
      record.descripcion,
      record.observaciones,
      record.vehiculo_placa,
      record.vehiculo_descripcion,
      record.vehiculo_numero_economico
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesSearch = normalizedSearch ? searchableText.includes(normalizedSearch) : true;

    return matchesDateFrom && matchesDateTo && matchesVehicle && matchesProvider && matchesType && matchesOilOnly && matchesSearch;
  });
};

const buildComparisonContext = ({
  records,
  metricsCalculator,
  filterFn,
  currentRange,
  preset,
  baseFilters
}) => {
  if (!currentRange.from || !currentRange.to || preset === 'all') {
    return {
      referenceLabel: 'todo el historial',
      metrics: metricsCalculator([]),
      hasComparison: false
    };
  }

  const previousRange = shiftRangeByPreset(preset, currentRange, -1);
  const nextRange = shiftRangeByPreset(preset, currentRange, 1);

  const previousRecords = filterFn({
    records,
    filters: {
      ...baseFilters,
      dateFrom: previousRange.from,
      dateTo: previousRange.to
    }
  });

  if (previousRecords.length > 0) {
    return {
      referenceLabel: formatRangeLabel(preset, previousRange),
      metrics: metricsCalculator(previousRecords),
      hasComparison: true
    };
  }

  const nextRecords = filterFn({
    records,
    filters: {
      ...baseFilters,
      dateFrom: nextRange.from,
      dateTo: nextRange.to
    }
  });

  if (nextRecords.length > 0) {
    return {
      referenceLabel: formatRangeLabel(preset, nextRange),
      metrics: metricsCalculator(nextRecords),
      hasComparison: true
    };
  }

  return {
    referenceLabel: 'todo el historial',
    metrics: metricsCalculator([]),
    hasComparison: false
  };
};

const buildTrendSeries = ({
  records,
  preset,
  dateFrom,
  dateTo,
  dateField,
  amountField,
  extraBuilder
}) => {
  const granularity = getTrendGranularity({ preset, dateFrom, dateTo });
  const map = new Map();

  records.forEach((record) => {
    const parts = parseDateParts(record[dateField]);
    if (!parts) return;

    const date = buildDateFromParts(parts);
    let key = '';
    let label = '';
    let rangeLabel = '';
    let sortDate = null;

    if (granularity === 'day') {
      key = normalizeDateKey(record[dateField]);
      label = `${String(parts.day).padStart(2, '0')} ${MONTH_LABELS[parts.month - 1]}`;
      rangeLabel = formatDateShortMonth(key);
      sortDate = new Date(date);
    } else if (granularity === 'week') {
      const weekStart = getWeekStart(date);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      key = toLocalDateString(weekStart);
      label = `Sem ${String(weekStart.getDate()).padStart(2, '0')} ${MONTH_LABELS[weekStart.getMonth()]}`;
      rangeLabel = `${formatDate(weekStart)} al ${formatDate(weekEnd)}`;
      sortDate = weekStart;
    } else {
      key = `${parts.year}-${String(parts.month).padStart(2, '0')}`;
      label = `${MONTH_LABELS[parts.month - 1]} ${String(parts.year).slice(-2)}`;
      rangeLabel = `${MONTH_LABELS_LONG[parts.month - 1]} ${parts.year}`;
      sortDate = new Date(parts.year, parts.month - 1, 1);
    }

    const current = map.get(key) || {
      key,
      label,
      rangeLabel,
      sortValue: sortDate.getTime(),
      records: []
    };

    current.records.push(record);
    map.set(key, current);
  });

  return Array.from(map.values())
    .sort((left, right) => left.sortValue - right.sortValue)
    .map((bucket) => ({
      key: bucket.key,
      label: bucket.label,
      rangeLabel: bucket.rangeLabel,
      totalAmount: bucket.records.reduce((sum, item) => sum + Number(item[amountField] || 0), 0),
      recordsCount: bucket.records.length,
      ...extraBuilder(bucket.records)
    }));
};

const buildKpiDelta = ({
  currentValue,
  comparisonValue,
  comparison,
  formatter = (value) => formatSignedNumber(value, precision),
  precision = 2,
  suffix = ''
}) => {
  const delta = getDelta(currentValue, comparisonValue);
  const absoluteLabel = suffix
    ? `${formatSignedNumber(delta.difference, precision)} ${suffix}`.trim()
    : formatter(delta.difference);

  return {
    direction: delta.direction,
    badgeLabel: `${delta.percentage > 0 ? '+' : ''}${formatNumber(delta.percentage, 1)}% vs ${comparison.referenceLabel}`,
    detailLabel: comparison.hasComparison ? `Equivale a ${absoluteLabel}` : 'Sin periodo comparable cercano'
  };
};

const buildCardData = ({ id, label, value, detail, delta }) => ({
  id,
  label,
  value,
  detail,
  deltaDirection: delta.direction,
  deltaLabel: delta.badgeLabel,
  comparisonDetail: delta.detailLabel
});

const buildGasolinePrimaryCards = (metrics, comparison) => ([
  buildCardData({
    id: 'gasoline-total',
    label: 'Gasto total',
    value: formatCurrency(metrics.totalAmount),
    detail: `${metrics.recordsCount} cargas registradas`,
    delta: buildKpiDelta({
      currentValue: metrics.totalAmount,
      comparisonValue: comparison.metrics.totalAmount,
      comparison,
      formatter: formatSignedCurrency
    })
  }),
  buildCardData({
    id: 'gasoline-km-cost',
    label: 'Costo por km',
    value: `${formatCurrency(metrics.costPerKm)} / km`,
    detail: `${formatNumber(metrics.totalKm)} km recorridos`,
    delta: buildKpiDelta({
      currentValue: metrics.costPerKm,
      comparisonValue: comparison.metrics.costPerKm,
      comparison,
      suffix: '/km'
    })
  }),
  buildCardData({
    id: 'gasoline-efficiency',
    label: 'Rendimiento promedio',
    value: `${formatNumber(metrics.averageEfficiency)} km/L`,
    detail: `${metrics.completeRecords} cargas completas`,
    delta: buildKpiDelta({
      currentValue: metrics.averageEfficiency,
      comparisonValue: comparison.metrics.averageEfficiency,
      comparison,
      suffix: 'km/L'
    })
  }),
  buildCardData({
    id: 'gasoline-liters',
    label: 'Litros cargados',
    value: `${formatNumber(metrics.totalLiters)} L`,
    detail: 'Consumo total del periodo',
    delta: buildKpiDelta({
      currentValue: metrics.totalLiters,
      comparisonValue: comparison.metrics.totalLiters,
      comparison,
      suffix: 'L'
    })
  })
]);

const buildMaintenancePrimaryCards = (metrics, comparison) => ([
  buildCardData({
    id: 'maintenance-total',
    label: 'Costo total',
    value: formatCurrency(metrics.totalAmount),
    detail: `${metrics.recordsCount} servicios registrados`,
    delta: buildKpiDelta({
      currentValue: metrics.totalAmount,
      comparisonValue: comparison.metrics.totalAmount,
      comparison,
      formatter: formatSignedCurrency
    })
  }),
  buildCardData({
    id: 'maintenance-records',
    label: 'Servicios registrados',
    value: formatNumber(metrics.recordsCount, 0),
    detail: `${metrics.uniqueVehicles} vehículos atendidos`,
    delta: buildKpiDelta({
      currentValue: metrics.recordsCount,
      comparisonValue: comparison.metrics.recordsCount,
      comparison,
      precision: 0
    })
  }),
  buildCardData({
    id: 'maintenance-oil',
    label: 'Cambios de aceite',
    value: formatNumber(metrics.oilChanges, 0),
    detail: `${formatPercentage(metrics.oilChangeRate)} del total`,
    delta: buildKpiDelta({
      currentValue: metrics.oilChanges,
      comparisonValue: comparison.metrics.oilChanges,
      comparison,
      precision: 0
    })
  }),
  buildCardData({
    id: 'maintenance-average',
    label: 'Costo promedio por servicio',
    value: formatCurrency(metrics.averageTicket),
    detail: `${metrics.uniqueProviders} proveedores distintos`,
    delta: buildKpiDelta({
      currentValue: metrics.averageTicket,
      comparisonValue: comparison.metrics.averageTicket,
      comparison,
      formatter: formatSignedCurrency
    })
  })
]);

const buildGasolineSecondaryCards = ({ metrics, comparison, providerRows, vehicleRows, efficiencyRows }) => {
  const bestEfficiency = efficiencyRows[0];
  const worstEfficiency = efficiencyRows[efficiencyRows.length - 1];
  const topVehicle = vehicleRows[0];
  const topProvider = providerRows[0];

  return [
    buildCardData({
      id: 'gasoline-secondary-km',
      label: 'Km recorridos',
      value: formatNumber(metrics.totalKm),
      detail: 'Distancia registrada en el periodo',
      delta: buildKpiDelta({
        currentValue: metrics.totalKm,
        comparisonValue: comparison.metrics.totalKm,
        comparison
      })
    }),
    buildCardData({
      id: 'gasoline-secondary-loads',
      label: 'Número de cargas',
      value: formatNumber(metrics.recordsCount, 0),
      detail: 'Total de tickets del filtro',
      delta: buildKpiDelta({
        currentValue: metrics.recordsCount,
        comparisonValue: comparison.metrics.recordsCount,
        comparison,
        precision: 0
      })
    }),
    buildCardData({
      id: 'gasoline-secondary-ticket',
      label: 'Ticket promedio',
      value: formatCurrency(metrics.averageTicket),
      detail: 'Promedio por carga',
      delta: buildKpiDelta({
        currentValue: metrics.averageTicket,
        comparisonValue: comparison.metrics.averageTicket,
        comparison,
        formatter: formatSignedCurrency
      })
    }),
    buildCardData({
      id: 'gasoline-secondary-price',
      label: 'Costo promedio por litro',
      value: `${formatCurrency(metrics.averagePricePerLiter)} / L`,
      detail: 'Monto medio por litro cargado',
      delta: buildKpiDelta({
        currentValue: metrics.averagePricePerLiter,
        comparisonValue: comparison.metrics.averagePricePerLiter,
        comparison,
        suffix: '/L'
      })
    }),
    {
      id: 'gasoline-secondary-vehicles',
      label: 'Vehículos con carga',
      value: formatNumber(metrics.activeVehicles, 0),
      detail: `${metrics.uniqueProviders} proveedor(es) distintos`,
      deltaDirection: 'flat',
      deltaLabel: 'Cobertura del periodo',
      comparisonDetail: 'Mide cuántas unidades tuvieron actividad'
    },
    {
      id: 'gasoline-secondary-provider',
      label: 'Proveedor principal',
      value: topProvider?.label || '-',
      detail: topProvider ? formatCurrency(topProvider.totalAmount) : 'Sin datos en el filtro',
      deltaDirection: 'flat',
      deltaLabel: 'Mayor concentración de gasto',
      comparisonDetail: topProvider ? `${topProvider.recordsCount} carga(s) en el periodo` : 'Sin registros'
    },
    {
      id: 'gasoline-secondary-top-vehicle',
      label: 'Vehículo con mayor gasto',
      value: topVehicle?.label || '-',
      detail: topVehicle ? formatCurrency(topVehicle.totalAmount) : 'Sin datos en el filtro',
      deltaDirection: 'flat',
      deltaLabel: 'Unidad con más consumo',
      comparisonDetail: topVehicle ? `${topVehicle.recordsCount} carga(s) registradas` : 'Sin registros'
    },
    {
      id: 'gasoline-secondary-worst',
      label: 'Peor rendimiento',
      value: worstEfficiency ? `${formatNumber(worstEfficiency.averageEfficiency)} km/L` : '-',
      detail: worstEfficiency?.label || 'Sin datos en el filtro',
      deltaDirection: 'flat',
      deltaLabel: 'Unidad menos eficiente',
      comparisonDetail: bestEfficiency ? `Mejor rendimiento: ${bestEfficiency.label} con ${formatNumber(bestEfficiency.averageEfficiency)} km/L` : 'Sin comparativo por unidad'
    }
  ];
};

const buildMaintenanceSecondaryCards = ({ metrics, providerRows, vehicleRows, typeRows }) => {
  const topVehicle = vehicleRows[0];
  const topProvider = providerRows[0];
  const topType = typeRows[0];

  return [
    {
      id: 'maintenance-secondary-vehicles',
      label: 'Vehículos atendidos',
      value: formatNumber(metrics.uniqueVehicles, 0),
      detail: 'Unidades con mantenimiento en el periodo',
      deltaDirection: 'flat',
      deltaLabel: 'Cobertura del periodo',
      comparisonDetail: `${metrics.recordsCount} servicio(s) aplicados`
    },
    {
      id: 'maintenance-secondary-providers',
      label: 'Proveedores distintos',
      value: formatNumber(metrics.uniqueProviders, 0),
      detail: 'Talleres o proveedores activos',
      deltaDirection: 'flat',
      deltaLabel: 'Cobertura de proveedores',
      comparisonDetail: `${formatPercentage(metrics.providerCoverage)} de los registros traen proveedor`
    },
    {
      id: 'maintenance-secondary-vehicle-cost',
      label: 'Costo por vehículo atendido',
      value: formatCurrency(metrics.costPerVehicle),
      detail: 'Promedio por unidad con servicio',
      deltaDirection: 'flat',
      deltaLabel: 'Promedio del filtro',
      comparisonDetail: `${metrics.uniqueTypes} tipo(s) distintos de mantenimiento`
    },
    {
      id: 'maintenance-secondary-oil-rate',
      label: 'Porcentaje cambios de aceite',
      value: formatPercentage(metrics.oilChangeRate),
      detail: `${metrics.oilChanges} servicio(s) de aceite`,
      deltaDirection: 'flat',
      deltaLabel: 'Participación del aceite',
      comparisonDetail: 'Sirve para ver qué tanto pesa el mantenimiento preventivo'
    },
    {
      id: 'maintenance-secondary-type',
      label: 'Tipo más frecuente',
      value: topType?.label || '-',
      detail: topType ? `${topType.recordsCount} servicio(s)` : 'Sin datos en el filtro',
      deltaDirection: 'flat',
      deltaLabel: 'Mayor recurrencia',
      comparisonDetail: topType ? `Costo acumulado ${formatCurrency(topType.totalAmount)}` : 'Sin registros'
    },
    {
      id: 'maintenance-secondary-provider',
      label: 'Proveedor con mayor costo',
      value: topProvider?.label || '-',
      detail: topProvider ? formatCurrency(topProvider.totalAmount) : 'Sin datos en el filtro',
      deltaDirection: 'flat',
      deltaLabel: 'Mayor concentración de gasto',
      comparisonDetail: topProvider ? `${topProvider.recordsCount} servicio(s) capturados` : 'Sin registros'
    },
    {
      id: 'maintenance-secondary-vehicle',
      label: 'Vehículo con mayor costo',
      value: topVehicle?.label || '-',
      detail: topVehicle ? formatCurrency(topVehicle.totalAmount) : 'Sin datos en el filtro',
      deltaDirection: 'flat',
      deltaLabel: 'Unidad más costosa',
      comparisonDetail: topVehicle ? `${topVehicle.recordsCount} servicio(s) registrados` : 'Sin registros'
    }
  ];
};

const buildDefaultDateFilters = (range) => ({
  search: '',
  vehicleId: 'todos',
  dateFrom: range.from,
  dateTo: range.to
});

const KpiCard = ({ card, compact = false }) => (
  <div className={`analytics-kpi-card ${compact ? 'analytics-kpi-card-secondary' : ''}`}>
    <span>{card.label}</span>
    <strong>{card.value}</strong>
    <small>{card.detail}</small>
    <DeltaBadge direction={card.deltaDirection} label={card.deltaLabel} />
    <p className='analytics-kpi-comparison'>{card.comparisonDetail}</p>
  </div>
);

const DeltaBadge = ({ direction, label }) => (
  <span className={`analytics-delta-badge analytics-delta-${direction}`}>
    {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•'} {label}
  </span>
);

const DetailTable = ({ title, subtitle, rows, emptyMessage, valueFormatter, metricKey, secondaryLabel, dateCaption }) => {
  const maxValue = Math.max(...rows.map((row) => Number(row[metricKey] || 0)), 0);

  return (
    <div className='analytics-panel'>
      <div className='analytics-panel-header'>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className='analytics-panel-date'>{dateCaption}</span>
      </div>

      {rows.length === 0 ? (
        <div className='analytics-empty-panel'>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className='analytics-panel-scroll'>
          <div className='analytics-ranking-list'>
            {rows.map((row) => {
              const value = Number(row[metricKey] || 0);
              const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

              return (
                <div key={row.key} className='analytics-ranking-item'>
                  <div className='analytics-ranking-copy'>
                    <strong>{row.label}</strong>
                    <span>{secondaryLabel(row)}</span>
                  </div>
                  <div className='analytics-ranking-bar'>
                    <div style={{ width: `${percentage}%`, background: `linear-gradient(90deg, ${row.color || CHART_PALETTE[0]} 0%, rgba(255,255,255,0.88) 160%)` }} />
                  </div>
                  <div className='analytics-ranking-value'>{valueFormatter(value)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const MultiMetricTrendChart = ({
  data,
  granularityLabel,
  emptyMessage,
  seriesOptions,
  activeSeries,
  onToggleSeries,
  tooltipLines,
  metricCards
}) => {
  const [selectedKey, setSelectedKey] = useState(data[data.length - 1]?.key || null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    setSelectedKey(data[data.length - 1]?.key || null);
  }, [data]);

  const visibleSeries = seriesOptions.filter((series) => activeSeries.includes(series.key));

  if (!data.length) {
    return (
      <div className='analytics-empty-panel'>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const width = 760;
  const height = 320;
  const padding = 28;
  const leftPadding = 64;
  const chartHeight = height - (padding * 2);
  const stepX = data.length > 1 ? (width - leftPadding - padding) / (data.length - 1) : 0;
  const globalMaxValue = Math.max(
    ...visibleSeries.flatMap((series) => data.map((item) => Number(item[series.key] || 0))),
    1
  );
  const normalizedPoints = visibleSeries.map((series) => {
    const points = data.map((item, index) => {
      const x = leftPadding + (index * stepX);
      const y = height - padding - ((Number(item[series.key] || 0) / globalMaxValue) * chartHeight);
      return { x, y, item };
    });
    return { ...series, points };
  });

  const activeKey = hoveredKey || selectedKey || data[data.length - 1]?.key;
  const activeItem = data.find((item) => item.key === activeKey) || data[data.length - 1];

  return (
    <div className='analytics-chart-with-details'>
      <div className='analytics-trend-chart'>
        <div className='analytics-chart-controls'>
          <div className='analytics-chart-legend analytics-chart-legend-interactive'>
            {seriesOptions.map((series) => {
              const enabled = activeSeries.includes(series.key);
              return (
                <button
                  key={series.key}
                  type='button'
                  className={`analytics-legend-toggle ${enabled ? 'analytics-legend-toggle-active' : ''}`}
                  onClick={() => onToggleSeries(series.key)}
                >
                  <i className='analytics-legend-dot' style={{ background: series.color }} />
                  {series.label}
                </button>
              );
            })}
          </div>
          <p className='analytics-chart-note'>Las líneas usan valores reales. Las métricas más pequeñas pueden verse abajo cuando se comparan contra montos más altos.</p>
        </div>

        {visibleSeries.length === 0 ? (
          <div className='analytics-empty-panel'>
            <p>Activa al menos una métrica para ver la tendencia.</p>
          </div>
        ) : (
          <div className='analytics-chart-surface'>
            <svg viewBox={`0 0 ${width} ${height}`} role='img' aria-label='Tendencia del periodo'>
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padding + (chartHeight * ratio);
                const valueLabel = formatAxisValue((1 - ratio) * globalMaxValue);
                return (
                  <g key={ratio}>
                    <line x1={leftPadding} y1={y} x2={width - padding} y2={y} className='analytics-grid-line' />
                    <text x={leftPadding - 10} y={y + 4} textAnchor='end' className='analytics-y-axis-label'>
                      {valueLabel}
                    </text>
                  </g>
                );
              })}

              {normalizedPoints.map((series) => (
                <g key={series.key}>
                  <polyline
                    fill='none'
                    points={series.points.map((point) => `${point.x},${point.y}`).join(' ')}
                    className='analytics-trend-line'
                    style={{ stroke: series.color }}
                  />
                  {series.points.map((point) => {
                    const isActive = point.item.key === activeKey;

                    return (
                      <circle
                        key={`${series.key}-${point.item.key}`}
                        cx={point.x}
                        cy={point.y}
                        r={isActive ? '6' : '4.5'}
                        className='analytics-point-clickable'
                        style={{ fill: series.color }}
                        onMouseEnter={(event) => {
                          const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                          setHoveredKey(point.item.key);
                          setTooltip({
                            x: event.clientX - rect.left + 14,
                            y: event.clientY - rect.top - 10,
                            item: point.item
                          });
                        }}
                        onMouseMove={(event) => {
                          const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                          setTooltip({
                            x: event.clientX - rect.left + 14,
                            y: event.clientY - rect.top - 10,
                            item: point.item
                          });
                        }}
                        onMouseLeave={() => {
                          setHoveredKey(null);
                          setTooltip(null);
                        }}
                        onClick={() => setSelectedKey(point.item.key)}
                      />
                    );
                  })}
                </g>
              ))}

              {data.map((item, index) => {
                const x = leftPadding + (index * stepX);
                return (
                  <text key={item.key} x={x} y={height - 6} textAnchor='middle' className='analytics-axis-label'>{item.label}</text>
                );
              })}
            </svg>

            {tooltip?.item ? (
              <div className='analytics-hover-tooltip' style={{ left: tooltip.x, top: tooltip.y }}>
                <strong>{tooltip.item.rangeLabel || tooltip.item.label}</strong>
                {tooltipLines(tooltip.item).map((line) => <span key={line}>{line}</span>)}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className='analytics-selection-card'>
        <div>
          <span className='analytics-selection-tag'>Punto activo</span>
          <h4>{activeItem.rangeLabel || activeItem.label}</h4>
          <p>{activeItem.recordsCount} registros en ese {granularityLabel}.</p>
        </div>
        <div className='analytics-selection-metrics'>
          {metricCards(activeItem).map((card) => (
            <div key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SimpleBarChart = ({ data, emptyMessage, activeLabel, rowDetail, valueFormatter, activeCards, metricKey = 'totalAmount', recordNoun = 'registros' }) => {
  const [selectedKey, setSelectedKey] = useState(data[0]?.key || null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const maxAmount = Math.max(...data.map((item) => Number(item[metricKey] || 0)), 0);

  useEffect(() => {
    setSelectedKey(data[0]?.key || null);
  }, [data]);

  if (!data.length) {
    return (
      <div className='analytics-empty-panel'>
        <p>{emptyMessage}</p>
      </div>
    );
  }

  const activeItem = data.find((item) => item.key === (hoveredKey || selectedKey)) || data[0];

  return (
    <div className='analytics-chart-with-details'>
      <div className='analytics-panel-scroll'>
        <div className='analytics-bar-chart'>
          {data.map((item) => {
            const percentage = maxAmount > 0 ? (Number(item[metricKey] || 0) / maxAmount) * 100 : 0;
            const isActive = item.key === (hoveredKey || selectedKey);

            return (
              <button
                key={item.key}
                type='button'
                className={`analytics-bar-row ${isActive ? 'analytics-bar-row-active' : ''}`}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => setSelectedKey(item.key)}
              >
                <div className='analytics-bar-copy'>
                  <strong>{item.label}</strong>
                  <span>{rowDetail(item)}</span>
                </div>
                <div className='analytics-bar-track'>
                  <div style={{ width: `${percentage}%`, background: `linear-gradient(90deg, ${item.color || CHART_PALETTE[0]} 0%, rgba(255,255,255,0.9) 160%)` }} />
                </div>
                <div className='analytics-bar-value'>{valueFormatter(item[metricKey])}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className='analytics-selection-card analytics-selection-card-compact'>
        <div>
          <span className='analytics-selection-tag'>{activeLabel}</span>
          <h4>{activeItem.label}</h4>
          <p>{activeItem.recordsCount} {recordNoun} dentro del filtro actual.</p>
        </div>
        <div className='analytics-selection-metrics'>
          {activeCards(activeItem).map((card) => (
            <div key={card.label}>
              <span>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const VerticalBarChart = ({ data, emptyMessage, valueFormatter, activeCards }) => {
  const [selectedKey, setSelectedKey] = useState(data[data.length - 1]?.key || null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const maxValue = Math.max(...data.map((item) => Number(item.averageEfficiency || 0)), 0);

  useEffect(() => {
    setSelectedKey(data[data.length - 1]?.key || null);
  }, [data]);

  if (!data.length) return <div className='analytics-empty-panel'><p>{emptyMessage}</p></div>;

  const activeItem = data.find((item) => item.key === (hoveredKey || selectedKey)) || data[data.length - 1];
  return (
    <div className='analytics-chart-with-details'>
      <div className='analytics-column-chart' role='img' aria-label='Rendimiento promedio por semana'>
        <div className='analytics-column-grid' aria-hidden='true'>
          {[1, 0.75, 0.5, 0.25, 0].map((ratio) => (
            <span key={ratio} style={{ bottom: `${ratio * 100}%` }}><i>{formatNumber(maxValue * ratio)} km/L</i></span>
          ))}
        </div>
        <div className='analytics-column-bars'>
          {data.map((item) => {
            const height = maxValue > 0 ? (Number(item.averageEfficiency || 0) / maxValue) * 100 : 0;
            const isActive = item.key === (hoveredKey || selectedKey);
            return (
              <button key={item.key} type='button' className={`analytics-column-item ${isActive ? 'analytics-column-item-active' : ''}`}
                onMouseEnter={() => setHoveredKey(item.key)} onMouseLeave={() => setHoveredKey(null)} onClick={() => setSelectedKey(item.key)}>
                <strong>{valueFormatter(item.averageEfficiency)}</strong>
                <span className='analytics-column-track'><i style={{ height: `${Math.max(height, 3)}%`, background: `linear-gradient(180deg, ${item.color} 0%, ${item.color}aa 100%)` }} /></span>
                <b>{item.label}</b>
                <small>{item.recordsCount} carga(s)</small>
              </button>
            );
          })}
        </div>
      </div>
      <div className='analytics-selection-card analytics-selection-card-compact'>
        <div><span className='analytics-selection-tag'>Semana activa</span><h4>{activeItem.label}</h4><p>{formatNumber(activeItem.totalKm)} km recorridos con {formatNumber(activeItem.totalLiters)} L.</p></div>
        <div className='analytics-selection-metrics'>
          {activeCards(activeItem).map((card) => <div key={card.label}><span>{card.label}</span><strong>{card.value}</strong></div>)}
        </div>
      </div>
    </div>
  );
};

const FleetTypeStatusChart = ({ data }) => {
  const statusOptions = [
    { key: 'activo', label: 'Activo', color: '#22c55e' },
    { key: 'mantenimiento', label: 'En mantenimiento', color: '#f59e0b' },
    { key: 'inactivo', label: 'Inactivo', color: '#ef4444' }
  ];
  const maxTotal = Math.max(...data.map((item) => item.total), 1);

  if (!data.length) return <div className='analytics-empty-panel'><p>No hay tipos o estados de vehículo registrados.</p></div>;

  return (
    <div className='fleet-status-chart'>
      <div className='fleet-status-legend'>
        {statusOptions.map((status) => <span key={status.key}><i style={{ background: status.color }} />{status.label}</span>)}
      </div>
      <div className='fleet-status-scroll'>
        <div className='fleet-status-grid' aria-hidden='true'>{[0, 0.25, 0.5, 0.75, 1].map((ratio) => <span key={ratio} style={{ bottom: `${ratio * 100}%` }}><i>{formatNumber(maxTotal * ratio, 0)}</i></span>)}</div>
        <div className='fleet-status-bars'>
          {data.map((item) => (
            <div key={item.type} className='fleet-status-column'>
              <strong className='fleet-status-total'>{item.total}</strong>
              <div className='fleet-status-track' style={{ height: `${Math.max((item.total / maxTotal) * 100, 4)}%` }}>
                {statusOptions.map((status) => item[status.key] > 0 ? (
                  <div key={status.key} className='fleet-status-segment' style={{ height: `${(item[status.key] / item.total) * 100}%`, background: status.color }} title={`${item.type} · ${status.label}: ${item[status.key]}`}>
                    <span>{item[status.key]}</span>
                  </div>
                ) : null)}
              </div>
              <b title={item.type}>{item.type}</b>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DonutBreakdown = ({ title, subtitle, rows, emptyMessage, valueFormatter, metricKey = 'totalAmount', dateCaption, recordNoun = 'registro(s)' }) => {
  const [activeKey, setActiveKey] = useState(rows[0]?.key || null);
  const total = rows.reduce((sum, row) => sum + Number(row[metricKey] || 0), 0);

  useEffect(() => {
    setActiveKey(rows[0]?.key || null);
  }, [rows]);

  if (!rows.length) {
    return (
      <div className='analytics-panel'>
        <div className='analytics-panel-header'>
          <div>
            <h3>{title}</h3>
            <p>{subtitle}</p>
          </div>
          <span className='analytics-panel-date'>{dateCaption}</span>
        </div>
        <div className='analytics-empty-panel'>
          <p>{emptyMessage}</p>
        </div>
      </div>
    );
  }

  const radius = 78;
  const strokeWidth = 28;
  const circumference = 2 * Math.PI * radius;
  const activeRow = rows.find((row) => row.key === activeKey) || rows[0];
  let offset = 0;

  return (
    <div className='analytics-panel'>
      <div className='analytics-panel-header'>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
        <span className='analytics-panel-date'>{dateCaption}</span>
      </div>

      <div className='analytics-donut-layout'>
        <div className='analytics-chart-surface-center'>
          <svg viewBox='0 0 220 220' className='analytics-donut-chart' role='img' aria-label={title}>
            <circle cx='110' cy='110' r={radius} fill='none' stroke='#eef4f6' strokeWidth={strokeWidth} />
            {rows.map((row) => {
              const value = Number(row[metricKey] || 0);
              const ratio = total > 0 ? value / total : 0;
              const length = circumference * ratio;
              const dashArray = `${length} ${circumference - length}`;
              const dashOffset = -offset;
              offset += length;
              return (
                <circle
                  key={row.key}
                  cx='110'
                  cy='110'
                  r={radius}
                  fill='none'
                  stroke={row.color}
                  strokeWidth={row.key === activeRow.key ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={dashArray}
                  strokeDashoffset={dashOffset}
                  strokeLinecap='round'
                  transform='rotate(-90 110 110)'
                  className='analytics-donut-slice'
                  onMouseEnter={() => setActiveKey(row.key)}
                  onClick={() => setActiveKey(row.key)}
                />
              );
            })}
            <text x='110' y='102' textAnchor='middle' className='analytics-donut-total-label'>Total</text>
            <text x='110' y='126' textAnchor='middle' className='analytics-donut-total-value'>{valueFormatter(total)}</text>
          </svg>
        </div>

        <div className='analytics-donut-legend analytics-panel-scroll analytics-panel-scroll-legend'>
          {rows.map((row) => {
            const value = Number(row[metricKey] || 0);
            const ratio = total > 0 ? (value / total) * 100 : 0;
            const isActive = row.key === activeRow.key;
            return (
              <button
                key={row.key}
                type='button'
                className={`analytics-donut-legend-item ${isActive ? 'analytics-donut-legend-item-active' : ''}`}
                onMouseEnter={() => setActiveKey(row.key)}
                onClick={() => setActiveKey(row.key)}
              >
                <span><i style={{ background: row.color }} />{row.label}</span>
                <strong>{valueFormatter(value)}</strong>
                <small>{formatNumber(ratio, 1)}% · {row.recordsCount} {recordNoun}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const SecondaryKpiGrid = ({ cards }) => (
  <div className='analytics-kpi-grid analytics-kpi-grid-secondary'>
    {cards.map((card) => (
      <KpiCard key={card.id} card={card} compact />
    ))}
  </div>
);

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodPreset, setPeriodPreset] = useState('month');
  const [activeView, setActiveView] = useState('overview');
  const [vehicles, setVehicles] = useState([]);
  const [gasolineRecords, setGasolineRecords] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [gasolineTrendMetrics, setGasolineTrendMetrics] = useState(['totalAmount', 'totalLiters', 'averageEfficiency', 'totalKm']);
  const [maintenanceTrendMetrics, setMaintenanceTrendMetrics] = useState(['totalAmount', 'recordsCount', 'oilChanges', 'averageTicket']);
  const [gasolineFilters, setGasolineFilters] = useState(() => ({
    ...buildDefaultDateFilters(getDateRangeByPreset('month')),
    provider: 'todos',
    operator: 'todos',
    fuelType: 'todos',
    onlyComplete: false,
    includeFirstLoads: true
  }));
  const [maintenanceFilters, setMaintenanceFilters] = useState(() => ({
    ...buildDefaultDateFilters(getDateRangeByPreset('month')),
    provider: 'todos',
    maintenanceType: 'todos',
    onlyOilChanges: false
  }));

  const fetchData = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setLoading(true);

      const token = localStorage.getItem('authToken');
      const cacheBuster = Date.now();

      const [vehiclesResponse, gasolineResponse, maintenanceResponse] = await Promise.all([
        fetch(`/api/vehicles?_=${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`/api/gasoline-records?_=${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`/api/maintenance-records?_=${cacheBuster}`, {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const vehiclesData = await vehiclesResponse.json().catch(() => ({}));
      const gasolineData = await gasolineResponse.json().catch(() => ({}));
      const maintenanceData = await maintenanceResponse.json().catch(() => ({}));

      if (!vehiclesResponse.ok) throw new Error(vehiclesData.message || 'No se pudieron cargar los vehículos');
      if (!gasolineResponse.ok) throw new Error(gasolineData.message || 'No se pudieron cargar los registros de gasolina');
      if (!maintenanceResponse.ok) throw new Error(maintenanceData.message || 'No se pudieron cargar los registros de mantenimiento');

      setVehicles(vehiclesData.vehicles || []);
      setGasolineRecords((gasolineData.gasolineRecords || []).map((record) => ({
        ...record,
        tipo_combustible: normalizeFuelType(record.tipo_combustible)
      })));
      setMaintenanceRecords(maintenanceData.maintenanceRecords || []);
      setError(null);
    } catch (fetchError) {
      console.error('Error loading analytics dashboard:', fetchError);
      setError(fetchError.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData({ showLoader: true });
  }, [fetchData]);

  useEffect(() => {
    const handleUpdate = () => fetchData();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchData();
    };
    const handleWindowFocus = () => fetchData();
    const handleStorage = (event) => {
      if (event.key === GASOLINE_RECORDS_UPDATED_STORAGE_KEY) fetchData();
    };

    const intervalId = window.setInterval(() => fetchData(), 30000);

    window.addEventListener(GASOLINE_RECORDS_UPDATED_EVENT, handleUpdate);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(GASOLINE_RECORDS_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  useEffect(() => {
    const range = getDateRangeByPreset(periodPreset);
    setGasolineFilters((current) => ({ ...current, dateFrom: range.from, dateTo: range.to }));
    setMaintenanceFilters((current) => ({ ...current, dateFrom: range.from, dateTo: range.to }));
  }, [periodPreset]);

  const overviewRange = useMemo(() => getDateRangeByPreset(periodPreset), [periodPreset]);

  const providerOptions = useMemo(
    () => Array.from(new Set(gasolineRecords.map((record) => String(record.proveedor || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [gasolineRecords]
  );
  const operatorOptions = useMemo(
    () => Array.from(new Set(gasolineRecords.map((record) => String(record.operador || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [gasolineRecords]
  );
  const fuelTypeOptions = useMemo(
    () => Array.from(new Set(gasolineRecords.map((record) => normalizeFuelType(record.tipo_combustible)).filter(Boolean))),
    [gasolineRecords]
  );
  const maintenanceProviderOptions = useMemo(
    () => Array.from(new Set(maintenanceRecords.map((record) => String(record.proveedor || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [maintenanceRecords]
  );
  const maintenanceTypeOptions = useMemo(
    () => Array.from(new Set(maintenanceRecords.map((record) => String(record.tipo_mantenimiento || '').trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es')),
    [maintenanceRecords]
  );

  const gasolineOverviewRecords = useMemo(
    () => filterGasolineRecords({ records: gasolineRecords, filters: { ...gasolineFilters, ...overviewRange } }),
    [gasolineFilters, gasolineRecords, overviewRange]
  );
  const gasolineOverviewMetrics = useMemo(() => calculateGasolineMetrics(gasolineOverviewRecords), [gasolineOverviewRecords]);
  const gasolineOverviewComparison = useMemo(() => buildComparisonContext({
    records: gasolineRecords,
    metricsCalculator: calculateGasolineMetrics,
    filterFn: filterGasolineRecords,
    currentRange: overviewRange,
    preset: periodPreset,
    baseFilters: {
      search: '',
      vehicleId: 'todos',
      provider: 'todos',
      operator: 'todos',
      fuelType: 'todos',
      onlyComplete: false,
      includeFirstLoads: true
    }
  }), [gasolineRecords, overviewRange, periodPreset]);
  const gasolineOverviewCards = useMemo(
    () => buildGasolinePrimaryCards(gasolineOverviewMetrics, gasolineOverviewComparison),
    [gasolineOverviewComparison, gasolineOverviewMetrics]
  );

  const maintenanceOverviewRecords = useMemo(
    () => filterMaintenanceRecords({ records: maintenanceRecords, filters: { ...maintenanceFilters, ...overviewRange } }),
    [maintenanceFilters, maintenanceRecords, overviewRange]
  );
  const maintenanceOverviewMetrics = useMemo(() => calculateMaintenanceMetrics(maintenanceOverviewRecords), [maintenanceOverviewRecords]);
  const maintenanceOverviewComparison = useMemo(() => buildComparisonContext({
    records: maintenanceRecords,
    metricsCalculator: calculateMaintenanceMetrics,
    filterFn: filterMaintenanceRecords,
    currentRange: overviewRange,
    preset: periodPreset,
    baseFilters: {
      search: '',
      vehicleId: 'todos',
      provider: 'todos',
      maintenanceType: 'todos',
      onlyOilChanges: false
    }
  }), [maintenanceRecords, overviewRange, periodPreset]);
  const maintenanceOverviewCards = useMemo(
    () => buildMaintenancePrimaryCards(maintenanceOverviewMetrics, maintenanceOverviewComparison),
    [maintenanceOverviewComparison, maintenanceOverviewMetrics]
  );

  const gasolineDetailRecords = useMemo(
    () => filterGasolineRecords({ records: gasolineRecords, filters: gasolineFilters }),
    [gasolineFilters, gasolineRecords]
  );
  const gasolineDetailMetrics = useMemo(() => calculateGasolineMetrics(gasolineDetailRecords), [gasolineDetailRecords]);
  const gasolineDetailComparison = useMemo(() => buildComparisonContext({
    records: gasolineRecords,
    metricsCalculator: calculateGasolineMetrics,
    filterFn: filterGasolineRecords,
    currentRange: { from: gasolineFilters.dateFrom, to: gasolineFilters.dateTo },
    preset: periodPreset,
    baseFilters: gasolineFilters
  }), [gasolineFilters, gasolineRecords, periodPreset]);
  const gasolineTrendSeries = useMemo(() => buildTrendSeries({
    records: gasolineDetailRecords,
    preset: periodPreset,
    dateFrom: gasolineFilters.dateFrom,
    dateTo: gasolineFilters.dateTo,
    dateField: 'fecha_carga',
    amountField: 'costo_total',
    extraBuilder: (records) => {
      const metrics = calculateGasolineMetrics(records);
      return {
        totalLiters: metrics.totalLiters,
        totalKm: metrics.totalKm,
        averageEfficiency: metrics.averageEfficiency,
        costPerKm: metrics.costPerKm
      };
    }
  }), [gasolineDetailRecords, gasolineFilters.dateFrom, gasolineFilters.dateTo, periodPreset]);

  const gasolineVehicleRows = useMemo(() => (
    aggregateByKey(
      gasolineDetailRecords,
      (record) => String(record.vehiculo_id || record.numero_economico_snapshot || record.vehiculo_numero_economico || ''),
      (record) => getVehicleRecordLabel(record),
      (record) => record.costo_total,
      (current, record) => {
        current.totalLiters = Number(current.totalLiters || 0) + Number(record.litros || 0);
        current.totalKm = Number(current.totalKm || 0) + Number(record.kilometros_recorridos || 0);
      }
    ).map((row) => ({
      ...row,
      averageEfficiency: Number(row.totalLiters || 0) > 0 ? Number(row.totalKm || 0) / Number(row.totalLiters || 1) : 0
    })).sort((a, b) => b.totalAmount - a.totalAmount)
  ), [gasolineDetailRecords]);

  const gasolineProviderRows = useMemo(() => (
    aggregateByKey(
      gasolineDetailRecords,
      (record) => String(record.proveedor || '').trim() || 'Sin proveedor',
      (record) => String(record.proveedor || '').trim() || 'Sin proveedor',
      (record) => record.costo_total
    ).sort((a, b) => b.totalAmount - a.totalAmount)
  ), [gasolineDetailRecords]);

  const gasolineFuelRows = useMemo(() => (
    aggregateByKey(
      gasolineDetailRecords,
      (record) => normalizeFuelType(record.tipo_combustible),
      (record) => getFuelTypeLabel(record.tipo_combustible),
      (record) => record.costo_total
    ).sort((a, b) => b.totalAmount - a.totalAmount)
  ), [gasolineDetailRecords]);

  const gasolineEfficiencyRows = useMemo(
    () => gasolineVehicleRows.filter((row) => Number(row.totalLiters || 0) > 0 && Number(row.totalKm || 0) > 0).sort((a, b) => b.averageEfficiency - a.averageEfficiency),
    [gasolineVehicleRows]
  );
  const gasolineWeeklyEfficiencyRows = useMemo(
    () => buildWeeklyEfficiencyRows(gasolineDetailRecords),
    [gasolineDetailRecords]
  );

  const gasolinePrimaryCards = useMemo(
    () => buildGasolinePrimaryCards(gasolineDetailMetrics, gasolineDetailComparison),
    [gasolineDetailComparison, gasolineDetailMetrics]
  );
  const gasolineSecondaryCards = useMemo(
    () => buildGasolineSecondaryCards({
      metrics: gasolineDetailMetrics,
      comparison: gasolineDetailComparison,
      providerRows: gasolineProviderRows,
      vehicleRows: gasolineVehicleRows,
      efficiencyRows: gasolineEfficiencyRows
    }),
    [gasolineDetailComparison, gasolineDetailMetrics, gasolineEfficiencyRows, gasolineProviderRows, gasolineVehicleRows]
  );
  const gasolineRecentRecords = useMemo(
    () => [...gasolineDetailRecords].sort((a, b) => new Date(b.fecha_carga || 0).getTime() - new Date(a.fecha_carga || 0).getTime()),
    [gasolineDetailRecords]
  );

  const maintenanceDetailRecords = useMemo(
    () => filterMaintenanceRecords({ records: maintenanceRecords, filters: maintenanceFilters }),
    [maintenanceFilters, maintenanceRecords]
  );
  const maintenanceDetailMetrics = useMemo(() => calculateMaintenanceMetrics(maintenanceDetailRecords), [maintenanceDetailRecords]);
  const maintenanceDetailComparison = useMemo(() => buildComparisonContext({
    records: maintenanceRecords,
    metricsCalculator: calculateMaintenanceMetrics,
    filterFn: filterMaintenanceRecords,
    currentRange: { from: maintenanceFilters.dateFrom, to: maintenanceFilters.dateTo },
    preset: periodPreset,
    baseFilters: maintenanceFilters
  }), [maintenanceFilters, maintenanceRecords, periodPreset]);
  const maintenanceTrendSeries = useMemo(() => buildTrendSeries({
    records: maintenanceDetailRecords,
    preset: periodPreset,
    dateFrom: maintenanceFilters.dateFrom,
    dateTo: maintenanceFilters.dateTo,
    dateField: 'fecha_servicio',
    amountField: 'costo',
    extraBuilder: (records) => {
      const metrics = calculateMaintenanceMetrics(records);
      return {
        oilChanges: metrics.oilChanges,
        averageTicket: metrics.averageTicket
      };
    }
  }), [maintenanceDetailRecords, maintenanceFilters.dateFrom, maintenanceFilters.dateTo, periodPreset]);

  const maintenanceVehicleRows = useMemo(() => (
    aggregateByKey(
      maintenanceDetailRecords,
      (record) => String(record.vehiculo_id || record.vehiculo_numero_economico || record.vehiculo_placa || ''),
      (record) => getVehicleRecordLabel(record),
      (record) => record.costo
    ).sort((a, b) => b.totalAmount - a.totalAmount)
  ), [maintenanceDetailRecords]);

  const maintenanceProviderRows = useMemo(() => (
    aggregateByKey(
      maintenanceDetailRecords,
      (record) => String(record.proveedor || '').trim() || 'Sin proveedor',
      (record) => String(record.proveedor || '').trim() || 'Sin proveedor',
      (record) => record.costo
    ).sort((a, b) => b.totalAmount - a.totalAmount)
  ), [maintenanceDetailRecords]);

  const maintenanceTypeRows = useMemo(() => (
    aggregateByKey(
      maintenanceDetailRecords,
      (record) => String(record.tipo_mantenimiento || '').trim() || 'Sin tipo',
      (record) => String(record.tipo_mantenimiento || '').trim() || 'Sin tipo',
      (record) => record.costo
    ).sort((a, b) => b.totalAmount - a.totalAmount)
  ), [maintenanceDetailRecords]);

  const fleetStatusRows = useMemo(() => ([
    { key: 'activo', label: 'Activos', color: '#22c55e' },
    { key: 'mantenimiento', label: 'En mantenimiento', color: '#f59e0b' },
    { key: 'inactivo', label: 'Inactivos', color: '#64748b' }
  ].map((definition) => {
    const count = vehicles.filter((vehicle) => normalizeVehicleStatus(vehicle.estado) === definition.key).length;
    return { ...definition, totalAmount: count, recordsCount: count };
  }).filter((row) => row.recordsCount > 0)), [vehicles]);

  const fleetTypeStatusData = useMemo(() => {
    const types = Array.from(new Set(vehicles.map((vehicle) => String(vehicle.tipo_carro || '').trim() || 'Sin tipo'))).sort((a, b) => a.localeCompare(b, 'es'));
    return types.map((type) => {
      const typeVehicles = vehicles.filter((vehicle) => (String(vehicle.tipo_carro || '').trim() || 'Sin tipo') === type);
      const activo = typeVehicles.filter((vehicle) => normalizeVehicleStatus(vehicle.estado) === 'activo').length;
      const mantenimiento = typeVehicles.filter((vehicle) => normalizeVehicleStatus(vehicle.estado) === 'mantenimiento').length;
      const inactivo = typeVehicles.filter((vehicle) => normalizeVehicleStatus(vehicle.estado) === 'inactivo').length;
      return { type, activo, mantenimiento, inactivo, total: typeVehicles.length };
    }).filter((row) => row.total > 0);
  }, [vehicles]);

  const maintenancePrimaryCards = useMemo(
    () => buildMaintenancePrimaryCards(maintenanceDetailMetrics, maintenanceDetailComparison),
    [maintenanceDetailComparison, maintenanceDetailMetrics]
  );
  const maintenanceSecondaryCards = useMemo(
    () => buildMaintenanceSecondaryCards({
      metrics: maintenanceDetailMetrics,
      providerRows: maintenanceProviderRows,
      vehicleRows: maintenanceVehicleRows,
      typeRows: maintenanceTypeRows
    }),
    [maintenanceDetailMetrics, maintenanceProviderRows, maintenanceTypeRows, maintenanceVehicleRows]
  );
  const maintenanceRecentRecords = useMemo(
    () => [...maintenanceDetailRecords].sort((a, b) => new Date(b.fecha_servicio || 0).getTime() - new Date(a.fecha_servicio || 0).getTime()),
    [maintenanceDetailRecords]
  );
  const gasolineDateCaption = useMemo(
    () => formatFilterDateCaption({ dateFrom: gasolineFilters.dateFrom, dateTo: gasolineFilters.dateTo }),
    [gasolineFilters.dateFrom, gasolineFilters.dateTo]
  );
  const maintenanceDateCaption = useMemo(
    () => formatFilterDateCaption({ dateFrom: maintenanceFilters.dateFrom, dateTo: maintenanceFilters.dateTo }),
    [maintenanceFilters.dateFrom, maintenanceFilters.dateTo]
  );

  const toggleTrendMetric = (setter, current, key) => {
    if (current.includes(key)) {
      setter(current.length === 1 ? current : current.filter((item) => item !== key));
      return;
    }
    setter([...current, key]);
  };

  const gasolineSeriesOptions = [
    { key: 'totalAmount', label: 'Gasto (MXN)', color: CHART_PALETTE[0] },
    { key: 'totalLiters', label: 'Litros (L)', color: CHART_PALETTE[4] },
    { key: 'averageEfficiency', label: 'Rendimiento (km/L)', color: CHART_PALETTE[8] },
    { key: 'totalKm', label: 'Km recorridos (km)', color: CHART_PALETTE[2] }
  ];

  const maintenanceSeriesOptions = [
    { key: 'totalAmount', label: 'Costo (MXN)', color: CHART_PALETTE[6] },
    { key: 'recordsCount', label: 'Servicios (registros)', color: CHART_PALETTE[1] },
    { key: 'oilChanges', label: 'Cambios de aceite (registros)', color: CHART_PALETTE[9] },
    { key: 'averageTicket', label: 'Costo promedio (MXN)', color: CHART_PALETTE[5] }
  ];

  if (loading) {
    return (
      <div className='analytics-state'>
        <div className='spinner' />
        <p>Cargando análisis operativo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='analytics-state analytics-state-error'>
        <p>{error}</p>
        <button type='button' className='analytics-primary-btn' onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className='analytics-dashboard'>
      <div className='analytics-header'>
        <div>
          <h1>Análisis y Reportes</h1>
          <p>Panel comparativo para gasolina y mantenimiento con KPIs, tendencia, distribución y rankings operativos.</p>
        </div>

        <label className='analytics-preset-field'>
          Periodo
          <select value={periodPreset} onChange={(event) => setPeriodPreset(event.target.value)}>
            <option value='week'>Esta semana</option>
            <option value='month'>Este mes</option>
            <option value='quarter'>Este trimestre</option>
            <option value='year'>Este año</option>
            <option value='all'>Todo el historial</option>
          </select>
        </label>
      </div>

      {activeView === 'overview' ? (
        <div className='analytics-overview'>
          <div className='analytics-overview-copy'>
            <span className='analytics-section-tag'>Operación</span>
            <h2>KPIs principales del periodo</h2>
            <p>La portada resume gasolina y mantenimiento con comparación automática contra el periodo más cercano con datos.</p>
          </div>

          <button type='button' className='analytics-section-card' onClick={() => setActiveView('gasoline')}>
            <div className='analytics-section-card-top'>
              <div>
                <span className='analytics-section-eyebrow'>Sección activa</span>
                <h3>Gasolina</h3>
              </div>
              <span className='analytics-link-chip'>Ver detalle</span>
            </div>

            <div className='analytics-kpi-grid'>
              {gasolineOverviewCards.map((card) => <KpiCard key={card.id} card={card} />)}
            </div>
          </button>

          <button type='button' className='analytics-section-card' onClick={() => setActiveView('maintenance')}>
            <div className='analytics-section-card-top'>
              <div>
                <span className='analytics-section-eyebrow'>Sección activa</span>
                <h3>Mantenimiento</h3>
              </div>
              <span className='analytics-link-chip'>Ver detalle</span>
            </div>

            <div className='analytics-kpi-grid'>
              {maintenanceOverviewCards.map((card) => <KpiCard key={card.id} card={card} />)}
            </div>
          </button>

          <button type='button' className='analytics-section-card' onClick={() => setActiveView('pipas')}>
            <div className='analytics-section-card-top'>
              <div>
                <span className='analytics-section-eyebrow'>Sección activa</span>
                <h3>Pipas e inventario</h3>
              </div>
              <span className='analytics-link-chip'>Ver detalle</span>
            </div>
            <p className='analytics-section-card-description'>Inventario disponible, compras, precio promedio y comparativo de cargas desde pipa vs. gasolinera.</p>
          </button>

          <button type='button' className='analytics-section-card' onClick={() => setActiveView('drivers')}>
            <div className='analytics-section-card-top'>
              <div>
                <span className='analytics-section-eyebrow'>Sección activa</span>
                <h3>Conductores</h3>
              </div>
              <span className='analytics-link-chip'>Ver detalle</span>
            </div>
            <p className='analytics-section-card-description'>Ratings, litros cargados, gasto y rendimiento de combustible por conductor.</p>
          </button>

          <button type='button' className='analytics-section-card' onClick={() => setActiveView('routes')}>
            <div className='analytics-section-card-top'><div><span className='analytics-section-eyebrow'>Sección activa</span><h3>Rutas</h3></div><span className='analytics-link-chip'>Ver detalle</span></div>
            <p className='analytics-section-card-description'>Cantidad de rutas, valor, metros cúbicos, distancia y desempeño por conductor y trayecto.</p>
          </button>
        </div>
      ) : activeView === 'pipas' ? (
        <div className='analytics-detail'>
          <div className='analytics-detail-header'>
            <div>
              <button type='button' className='analytics-back-btn' onClick={() => setActiveView('overview')}>
                Volver al resumen
              </button>
            </div>
          </div>
          <PipasAnalyticsDashboard />
        </div>
      ) : activeView === 'drivers' ? (
        <div className='analytics-detail'>
          <div className='analytics-detail-header'><div><button type='button' className='analytics-back-btn' onClick={() => setActiveView('overview')}>Volver al resumen</button></div></div>
          <DriverAnalyticsDashboard />
        </div>
      ) : activeView === 'routes' ? (
        <div className='analytics-detail'>
          <div className='analytics-detail-header'><div><button type='button' className='analytics-back-btn' onClick={() => setActiveView('overview')}>Volver al resumen</button></div></div>
          <RouteAnalyticsDashboard />
        </div>
      ) : activeView === 'gasoline' ? (
        <div className='analytics-detail'>
          <div className='analytics-detail-header'>
            <div>
              <button type='button' className='analytics-back-btn' onClick={() => setActiveView('overview')}>
                Volver al resumen
              </button>
              <h2>Detalle de KPIs de gasolina</h2>
              <p>Comparativos de costo, litros, rendimiento, kilómetros y concentración por unidad, proveedor y combustible.</p>
            </div>
          </div>

          <div className='analytics-panel analytics-filters-panel'>
            <div className='analytics-panel-header'>
              <div>
                <h3>Filtros</h3>
                <p>Refina la vista por unidad, proveedor, operador, combustible, primeras cargas y rango de fechas.</p>
              </div>
            </div>

            <div className='analytics-filters-grid'>
              <label>
                Buscar
                <input type='search' value={gasolineFilters.search} onChange={(event) => setGasolineFilters((current) => ({ ...current, search: event.target.value }))} placeholder='Factura, placa, proveedor u operador' />
              </label>
              <label>
                Vehículo
                <select value={gasolineFilters.vehicleId} onChange={(event) => setGasolineFilters((current) => ({ ...current, vehicleId: event.target.value }))}>
                  <option value='todos'>Todos</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{getVehicleOptionLabel(vehicle)}</option>
                  ))}
                </select>
              </label>
              <label>
                Proveedor
                <select value={gasolineFilters.provider} onChange={(event) => setGasolineFilters((current) => ({ ...current, provider: event.target.value }))}>
                  <option value='todos'>Todos</option>
                  {providerOptions.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                </select>
              </label>
              <label>
                Operador
                <select value={gasolineFilters.operator} onChange={(event) => setGasolineFilters((current) => ({ ...current, operator: event.target.value }))}>
                  <option value='todos'>Todos</option>
                  {operatorOptions.map((operator) => <option key={operator} value={operator}>{operator}</option>)}
                </select>
              </label>
              <label>
                Tipo de combustible
                <select value={gasolineFilters.fuelType} onChange={(event) => setGasolineFilters((current) => ({ ...current, fuelType: event.target.value }))}>
                  <option value='todos'>Todos</option>
                  {fuelTypeOptions.map((fuelType) => <option key={fuelType} value={fuelType}>{getFuelTypeLabel(fuelType)}</option>)}
                </select>
              </label>
              <label>
                Fecha inicial
                <input type='date' value={gasolineFilters.dateFrom} onChange={(event) => setGasolineFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
              </label>
              <label>
                Fecha final
                <input type='date' value={gasolineFilters.dateTo} onChange={(event) => setGasolineFilters((current) => ({ ...current, dateTo: event.target.value }))} />
              </label>
              <label className='analytics-toggle-field'>
                <input type='checkbox' checked={gasolineFilters.onlyComplete} onChange={(event) => setGasolineFilters((current) => ({ ...current, onlyComplete: event.target.checked }))} />
                Solo registros con km y litros válidos
              </label>
              <label className='analytics-toggle-field'>
                <input type='checkbox' checked={!gasolineFilters.includeFirstLoads} onChange={(event) => setGasolineFilters((current) => ({ ...current, includeFirstLoads: !event.target.checked }))} />
                Sin contar primeras cargas
              </label>
            </div>
          </div>

          <div className='analytics-kpi-grid analytics-kpi-grid-detail'>
            {gasolinePrimaryCards.map((card) => <KpiCard key={card.id} card={card} />)}
          </div>

          <SecondaryKpiGrid cards={gasolineSecondaryCards} />

          <div className='analytics-detail-grid analytics-order-primary'>
            <DetailTable
              title='Vehículos con más litros cargados'
              subtitle='Top de unidades por volumen total de combustible dentro del rango actual.'
              rows={[...gasolineVehicleRows].sort((a, b) => Number(b.totalLiters || 0) - Number(a.totalLiters || 0)).slice(0, 12)}
              emptyMessage='No hay vehículos suficientes para mostrar litros cargados.'
              metricKey='totalLiters'
              valueFormatter={(value) => `${formatNumber(value)} L`}
              secondaryLabel={(row) => `${row.recordsCount} carga(s) · ${formatCurrency(row.totalAmount)} invertidos`}
            />
            <DetailTable
              title='Vehículos con más kilómetros recorridos'
              subtitle='Top de unidades por distancia acumulada registrada dentro del filtro actual.'
              rows={[...gasolineVehicleRows].sort((a, b) => Number(b.totalKm || 0) - Number(a.totalKm || 0)).slice(0, 12)}
              emptyMessage='No hay vehículos suficientes para mostrar kilómetros recorridos.'
              metricKey='totalKm'
              valueFormatter={(value) => `${formatNumber(value)} km`}
              secondaryLabel={(row) => `${row.recordsCount} carga(s) · ${formatNumber(row.totalLiters)} L cargados`}
            />
          </div>

          <div className='analytics-detail-grid analytics-order-secondary'>
            <DetailTable
              title='Vehículos con mayor gasto'
              subtitle='Top de unidades por monto invertido en el rango actual.'
              rows={gasolineVehicleRows.slice(0, 12)}
              emptyMessage='No hay vehículos suficientes para mostrar.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} carga(s) · promedio ${formatCurrency(row.averageAmount)}`}
              dateCaption={gasolineDateCaption}
            />
            <DetailTable
              title='Proveedores con mayor gasto'
              subtitle='Concentración de compra dentro del filtro actual.'
              rows={gasolineProviderRows.slice(0, 12)}
              emptyMessage='No hay proveedores dentro del filtro actual.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} carga(s) · promedio ${formatCurrency(row.averageAmount)}`}
              dateCaption={gasolineDateCaption}
            />
          </div>

          <div className='analytics-detail-grid analytics-order-secondary'>
            <DetailTable
              title='Tipos con mayor gasto'
              subtitle='Comparativo por mezcla de combustible dentro del rango actual.'
              rows={gasolineFuelRows.slice(0, 12)}
              emptyMessage='No hay tipos de combustible suficientes para comparar.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} carga(s) · ${formatCurrency(row.totalAmount)}`}
              dateCaption={gasolineDateCaption}
            />
            <DetailTable
              title='Rendimiento por vehículo'
              subtitle='Referencia rápida para detectar unidades más y menos eficientes.'
              rows={gasolineEfficiencyRows.slice(0, 12)}
              emptyMessage='No hay suficientes datos completos para calcular rendimiento por vehículo.'
              metricKey='averageEfficiency'
              valueFormatter={(value) => `${formatNumber(value)} km/L`}
              secondaryLabel={(row) => `${formatNumber(row.totalKm)} km · ${formatNumber(row.totalLiters)} L`}
              dateCaption={gasolineDateCaption}
            />
          </div>

          <div className='analytics-chart-grid analytics-chart-grid-single analytics-order-tertiary'>
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Tendencia del periodo</h3>
                  <p>Activa una o varias métricas para comparar gasto, litros, rendimiento y kilómetros dentro del mismo rango.</p>
                </div>
              </div>
              <MultiMetricTrendChart
                data={gasolineTrendSeries}
                granularityLabel={getTrendGranularityLabel(getTrendGranularity({ preset: periodPreset, dateFrom: gasolineFilters.dateFrom, dateTo: gasolineFilters.dateTo }))}
                emptyMessage='No hay suficiente histórico para construir la tendencia de gasolina.'
                seriesOptions={gasolineSeriesOptions}
                activeSeries={gasolineTrendMetrics}
                onToggleSeries={(key) => toggleTrendMetric(setGasolineTrendMetrics, gasolineTrendMetrics, key)}
                tooltipLines={(item) => [
                  `Gasto: ${formatCurrency(item.totalAmount)}`,
                  `Litros: ${formatNumber(item.totalLiters)} L`,
                  `Rendimiento: ${formatNumber(item.averageEfficiency)} km/L`,
                  `Km recorridos: ${formatNumber(item.totalKm)} km`,
                  `Costo por km: ${formatCurrency(item.costPerKm)} / km`
                ]}
                metricCards={(item) => [
                  { label: 'Gasto', value: formatCurrency(item.totalAmount) },
                  { label: 'Litros', value: `${formatNumber(item.totalLiters)} L` },
                  { label: 'Rendimiento', value: `${formatNumber(item.averageEfficiency)} km/L` },
                  { label: 'Km recorridos', value: `${formatNumber(item.totalKm)} km` }
                ]}
              />
            </div>
          </div>

          <div className='analytics-chart-grid analytics-chart-grid-single analytics-order-quaternary'>
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Rendimiento promedio por semana</h3>
                  <p>Promedio ponderado de kilómetros recorridos por cada litro cargado durante cada semana.</p>
                </div>
                <span className='analytics-panel-date'>{gasolineDateCaption}</span>
              </div>
              <VerticalBarChart
                data={gasolineWeeklyEfficiencyRows}
                emptyMessage='No hay datos completos de kilómetros y litros para calcular el rendimiento semanal.'
                valueFormatter={(value) => `${formatNumber(value)} km/L`}
                activeCards={(item) => [
                  { label: 'Rendimiento', value: `${formatNumber(item.averageEfficiency)} km/L` },
                  { label: 'Kilómetros', value: `${formatNumber(item.totalKm)} km` },
                  { label: 'Litros', value: `${formatNumber(item.totalLiters)} L` }
                ]}
              />
            </div>
          </div>

          <div className='analytics-chart-grid analytics-order-quaternary'>
            <DonutBreakdown
              title='Distribución del gasto por vehículo'
              subtitle='Participación de cada unidad dentro del gasto del periodo.'
              rows={gasolineVehicleRows.slice(0, 6)}
              emptyMessage='No hay vehículos suficientes para mostrar la distribución.'
              valueFormatter={formatCurrency}
              dateCaption={gasolineDateCaption}
            />
            <DonutBreakdown
              title='Distribución del gasto por proveedor'
              subtitle='Cómo se reparte la compra de combustible entre proveedores.'
              rows={gasolineProviderRows.slice(0, 6)}
              emptyMessage='No hay proveedores suficientes para mostrar la distribución.'
              valueFormatter={formatCurrency}
              dateCaption={gasolineDateCaption}
            />
          </div>

          <div className='analytics-chart-grid analytics-order-quaternary'>
            <DonutBreakdown
              title='Distribución de litros consumidos'
              subtitle='Participación por vehículo según el volumen total cargado en el periodo.'
              rows={[...gasolineVehicleRows].sort((a, b) => Number(b.totalLiters || 0) - Number(a.totalLiters || 0)).slice(0, 6)}
              emptyMessage='No hay vehículos suficientes para mostrar la distribución de litros.'
              valueFormatter={(value) => `${formatNumber(value)} L`}
              metricKey='totalLiters'
              dateCaption={gasolineDateCaption}
            />
            <DonutBreakdown
              title='Distribución por tipo de combustible'
              subtitle='Peso relativo de cada tipo de combustible dentro del periodo.'
              rows={gasolineFuelRows.slice(0, 6)}
              emptyMessage='No hay tipos de combustible suficientes para mostrar la distribución.'
              valueFormatter={formatCurrency}
              dateCaption={gasolineDateCaption}
            />
          </div>

          <div className='analytics-panel analytics-order-quinary'>
            <div className='analytics-panel-header'>
              <div>
                <h3>Registros recientes del filtro</h3>
                <p>Resumen operativo para validar facturas, litros, rendimiento, monto y costo unitario.</p>
              </div>
              <span className='analytics-panel-date'>{gasolineDateCaption}</span>
            </div>

            {gasolineRecentRecords.length === 0 ? (
              <div className='analytics-empty-panel'>
                <p>No hay registros que coincidan con los filtros actuales.</p>
              </div>
            ) : (
              <div className='analytics-records-table-wrapper analytics-records-table-wrapper-scroll'>
                <table className='analytics-records-table'>
                  <thead>
                    <tr>
                      <th>Vehículo</th>
                      <th>Fecha</th>
                      <th>Combustible</th>
                      <th>Proveedor</th>
                      <th>Operador</th>
                      <th>Litros</th>
                      <th>Km recorridos</th>
                      <th>Monto</th>
                      <th>Costo/L</th>
                      <th>Km/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gasolineRecentRecords.map((record) => {
                      const liters = Number(record.litros || 0);
                      const km = Number(record.kilometros_recorridos || 0);
                      const amount = Number(record.costo_total || 0);
                      return (
                        <tr key={record.id}>
                          <td>{getVehicleRecordLabel(record, '-')}</td>
                          <td>{formatDate(record.fecha_carga)}</td>
                          <td>{getFuelTypeLabel(record.tipo_combustible)}</td>
                          <td>{record.proveedor || '-'}</td>
                          <td>{record.operador || '-'}</td>
                          <td>{formatNumber(liters)} L</td>
                          <td>{formatNumber(km)} km</td>
                          <td>{formatCurrency(amount)}</td>
                          <td>{liters > 0 ? `${formatCurrency(amount / liters)} / L` : '-'}</td>
                          <td>{liters > 0 ? `${formatNumber(km / liters)} km/L` : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className='analytics-detail'>
          <div className='analytics-detail-header'>
            <div>
              <button type='button' className='analytics-back-btn' onClick={() => setActiveView('overview')}>
                Volver al resumen
              </button>
              <h2>Detalle de KPIs de mantenimiento</h2>
              <p>Comparativos de costo, servicios, cambios de aceite y concentración por unidad, tipo y proveedor.</p>
            </div>
          </div>

          <div className='analytics-panel analytics-filters-panel'>
            <div className='analytics-panel-header'>
              <div>
                <h3>Filtros</h3>
                <p>Refina la vista por unidad, proveedor, tipo de mantenimiento y rango de fechas.</p>
              </div>
            </div>

            <div className='analytics-filters-grid'>
              <label>
                Buscar
                <input type='search' value={maintenanceFilters.search} onChange={(event) => setMaintenanceFilters((current) => ({ ...current, search: event.target.value }))} placeholder='Título, placa, proveedor u observaciones' />
              </label>
              <label>
                Vehículo
                <select value={maintenanceFilters.vehicleId} onChange={(event) => setMaintenanceFilters((current) => ({ ...current, vehicleId: event.target.value }))}>
                  <option value='todos'>Todos</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>{getVehicleOptionLabel(vehicle)}</option>
                  ))}
                </select>
              </label>
              <label>
                Proveedor
                <select value={maintenanceFilters.provider} onChange={(event) => setMaintenanceFilters((current) => ({ ...current, provider: event.target.value }))}>
                  <option value='todos'>Todos</option>
                  {maintenanceProviderOptions.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
                </select>
              </label>
              <label>
                Tipo de mantenimiento
                <select value={maintenanceFilters.maintenanceType} onChange={(event) => setMaintenanceFilters((current) => ({ ...current, maintenanceType: event.target.value }))}>
                  <option value='todos'>Todos</option>
                  {maintenanceTypeOptions.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label>
                Fecha inicial
                <input type='date' value={maintenanceFilters.dateFrom} onChange={(event) => setMaintenanceFilters((current) => ({ ...current, dateFrom: event.target.value }))} />
              </label>
              <label>
                Fecha final
                <input type='date' value={maintenanceFilters.dateTo} onChange={(event) => setMaintenanceFilters((current) => ({ ...current, dateTo: event.target.value }))} />
              </label>
              <label className='analytics-toggle-field'>
                <input type='checkbox' checked={maintenanceFilters.onlyOilChanges} onChange={(event) => setMaintenanceFilters((current) => ({ ...current, onlyOilChanges: event.target.checked }))} />
                Solo cambios de aceite
              </label>
            </div>
          </div>

          <div className='analytics-kpi-grid analytics-kpi-grid-detail'>
            {maintenancePrimaryCards.map((card) => <KpiCard key={card.id} card={card} />)}
          </div>

          <SecondaryKpiGrid cards={maintenanceSecondaryCards} />

          <div className='analytics-chart-grid analytics-order-primary'>
            <DonutBreakdown
              title='Vehículos por estado'
              subtitle='Estado operativo actual de toda la flota: activos, inactivos y en mantenimiento.'
              rows={fleetStatusRows}
              emptyMessage='No hay vehículos disponibles para mostrar su estado.'
              valueFormatter={(value) => formatNumber(value, 0)}
              dateCaption='Estado actual de la flota'
              recordNoun='vehículo(s)'
            />
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'><div><h3>Vehículos por tipo y estado</h3><p>Cada barra representa un tipo de unidad y separa activos, en mantenimiento e inactivos.</p></div><span className='analytics-panel-date'>Flota completa</span></div>
              <FleetTypeStatusChart data={fleetTypeStatusData} />
            </div>
          </div>

          <div className='analytics-chart-grid analytics-chart-grid-single analytics-order-primary'>
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Tendencia del periodo</h3>
                  <p>Activa una o varias métricas para comparar costo, servicios, cambios de aceite y costo promedio.</p>
                </div>
              </div>
              <MultiMetricTrendChart
                data={maintenanceTrendSeries}
                granularityLabel={getTrendGranularityLabel(getTrendGranularity({ preset: periodPreset, dateFrom: maintenanceFilters.dateFrom, dateTo: maintenanceFilters.dateTo }))}
                emptyMessage='No hay suficiente histórico para construir la tendencia de mantenimiento.'
                seriesOptions={maintenanceSeriesOptions}
                activeSeries={maintenanceTrendMetrics}
                onToggleSeries={(key) => toggleTrendMetric(setMaintenanceTrendMetrics, maintenanceTrendMetrics, key)}
                tooltipLines={(item) => [
                  `Costo: ${formatCurrency(item.totalAmount)}`,
                  `Servicios: ${formatNumber(item.recordsCount, 0)}`,
                  `Cambios de aceite: ${formatNumber(item.oilChanges, 0)}`,
                  `Costo promedio: ${formatCurrency(item.averageTicket)}`
                ]}
                metricCards={(item) => [
                  { label: 'Costo', value: formatCurrency(item.totalAmount) },
                  { label: 'Servicios', value: formatNumber(item.recordsCount, 0) },
                  { label: 'Cambios de aceite', value: formatNumber(item.oilChanges, 0) },
                  { label: 'Costo promedio', value: formatCurrency(item.averageTicket) }
                ]}
              />
            </div>
          </div>

          <div className='analytics-chart-grid analytics-order-secondary'>
            <DonutBreakdown
              title='Distribución del costo por tipo'
              subtitle='Cómo se reparte el gasto entre los tipos de mantenimiento.'
              rows={maintenanceTypeRows.slice(0, 6)}
              emptyMessage='No hay tipos de mantenimiento suficientes para mostrar la distribución.'
              valueFormatter={formatCurrency}
              dateCaption={maintenanceDateCaption}
            />
            <DonutBreakdown
              title='Distribución del costo por proveedor'
              subtitle='Participación de cada proveedor dentro del costo total.'
              rows={maintenanceProviderRows.slice(0, 6)}
              emptyMessage='No hay proveedores suficientes para mostrar la distribución.'
              valueFormatter={formatCurrency}
              dateCaption={maintenanceDateCaption}
            />
          </div>

          <div className='analytics-chart-grid analytics-order-secondary'>
            <DonutBreakdown
              title='Distribución del costo por vehículo'
              subtitle='Peso relativo de cada unidad dentro del mantenimiento del periodo.'
              rows={maintenanceVehicleRows.slice(0, 6)}
              emptyMessage='No hay vehículos suficientes para mostrar la distribución.'
              valueFormatter={formatCurrency}
              dateCaption={maintenanceDateCaption}
            />
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Costo por vehículo</h3>
                  <p>Selecciona una fila para revisar la unidad con más impacto en mantenimiento.</p>
                </div>
              </div>
              <SimpleBarChart
                data={maintenanceVehicleRows.slice(0, 10)}
                emptyMessage='No hay vehículos suficientes para comparar mantenimiento.'
                activeLabel='Vehículo activo'
                rowDetail={(item) => `${item.recordsCount} servicio(s)`}
                valueFormatter={formatCurrency}
                activeCards={(item) => [
                  { label: 'Costo', value: formatCurrency(item.totalAmount) },
                  { label: 'Servicios', value: formatNumber(item.recordsCount, 0) },
                  { label: 'Promedio', value: formatCurrency(item.averageAmount) }
                ]}
              />
            </div>
          </div>

          <div className='analytics-detail-grid analytics-order-tertiary'>
            <DetailTable
              title='Vehículos con mayor costo'
              subtitle='Top de unidades por monto invertido en mantenimiento.'
              rows={maintenanceVehicleRows.slice(0, 12)}
              emptyMessage='No hay vehículos suficientes para mostrar.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} servicio(s) · promedio ${formatCurrency(row.averageAmount)}`}
              dateCaption={maintenanceDateCaption}
            />
            <DetailTable
              title='Proveedores con mayor costo'
              subtitle='Concentración de gasto por proveedor dentro del filtro actual.'
              rows={maintenanceProviderRows.slice(0, 12)}
              emptyMessage='No hay proveedores dentro del filtro actual.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} servicio(s) · promedio ${formatCurrency(row.averageAmount)}`}
              dateCaption={maintenanceDateCaption}
            />
          </div>

          <div className='analytics-detail-grid analytics-order-tertiary'>
            <DetailTable
              title='Tipos con mayor costo'
              subtitle='Comparativo por tipo de mantenimiento dentro del rango actual.'
              rows={maintenanceTypeRows.slice(0, 12)}
              emptyMessage='No hay tipos de mantenimiento suficientes para comparar.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} servicio(s) · promedio ${formatCurrency(row.averageAmount)}`}
              dateCaption={maintenanceDateCaption}
            />
            <DetailTable
              title='Tipos más frecuentes'
              subtitle='Ayuda a detectar los servicios más recurrentes del periodo.'
              rows={[...maintenanceTypeRows].sort((a, b) => b.recordsCount - a.recordsCount).slice(0, 12)}
              emptyMessage='No hay suficientes registros para mostrar frecuencia.'
              metricKey='recordsCount'
              valueFormatter={(value) => formatNumber(value, 0)}
              secondaryLabel={(row) => `${formatCurrency(row.totalAmount)} acumulados`}
              dateCaption={maintenanceDateCaption}
            />
          </div>

          <div className='analytics-panel analytics-order-quaternary'>
            <div className='analytics-panel-header'>
              <div>
                <h3>Registros recientes del filtro</h3>
                <p>Resumen operativo para validar tipo, proveedor, fecha, costo y cambios de aceite.</p>
              </div>
              <span className='analytics-panel-date'>{maintenanceDateCaption}</span>
            </div>

            {maintenanceRecentRecords.length === 0 ? (
              <div className='analytics-empty-panel'>
                <p>No hay mantenimientos que coincidan con los filtros actuales.</p>
              </div>
            ) : (
              <div className='analytics-records-table-wrapper analytics-records-table-wrapper-scroll'>
                <table className='analytics-records-table'>
                  <thead>
                    <tr>
                      <th>Vehículo</th>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Proveedor</th>
                      <th>Costo</th>
                      <th>Aceite</th>
                      <th>Km base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceRecentRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{getVehicleRecordLabel(record, '-')}</td>
                        <td>{formatDate(record.fecha_servicio)}</td>
                        <td>{record.tipo_mantenimiento || '-'}</td>
                        <td>{record.proveedor || '-'}</td>
                        <td>{formatCurrency(record.costo)}</td>
                        <td>{record.es_cambio_aceite ? 'Sí' : 'No'}</td>
                        <td>{record.kilometraje_base_aceite !== null && record.kilometraje_base_aceite !== undefined ? formatNumber(record.kilometraje_base_aceite) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FUEL_TYPE_OPTIONS, getFuelTypeLabel, normalizeFuelType } from '../../constants/fuelTypes';
import './AnalyticsDashboard.css';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const DONUT_COLORS = ['#2d7a3e', '#4d9e63', '#82bf94', '#b8d9bc', '#d9ecdc'];
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

const normalizeAnalyticsRecord = (record) => ({
  ...record,
  tipo_combustible: normalizeFuelType(record?.tipo_combustible)
});

const parseDateParts = (value) => {
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

const normalizeDateKey = (value) => {
  const parts = parseDateParts(value);
  if (!parts) return '';
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

const buildDateFromParts = (parts) => new Date(parts.year, parts.month - 1, parts.day);

const getDaysBetween = (from, to) => {
  if (!from || !to) return null;
  const fromParts = parseDateParts(from);
  const toParts = parseDateParts(to);
  if (!fromParts || !toParts) return null;
  const fromDate = buildDateFromParts(fromParts);
  const toDate = buildDateFromParts(toParts);
  return Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000) + 1);
};

const getWeekStart = (date) => {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
};

const getTrendGranularity = ({ preset, dateFrom, dateTo }) => {
  const days = getDaysBetween(dateFrom, dateTo);

  // Si el usuario selecciona fechas manuales, la granularidad debe
  // responder al rango real y no quedarse amarrada al preset.
  if (days !== null) {
    if (days <= 14) return 'day';
    if (days <= 90) return 'week';
    return 'month';
  }

  if (preset === 'week') return 'day';
  if (preset === 'month') return 'week';
  if (preset === 'quarter' || preset === 'year' || preset === 'all') return 'month';
  return 'month';
};

const getTrendGranularityLabel = (granularity) => {
  if (granularity === 'day') return 'día';
  if (granularity === 'week') return 'semana';
  return 'mes';
};

const buildRecordTimestamp = (record) => {
  if (!record?.fecha_carga) return 0;
  const time = record.hora_carga || '00:00:00';
  const date = new Date(`${record.fecha_carga}T${time}`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const sortRecordsByDateTimeDesc = (records = []) => (
  [...records].sort((left, right) => buildRecordTimestamp(right) - buildRecordTimestamp(left))
);

const getDateRangeByPreset = (preset) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const day = today.getDate();

  if (preset === 'all') {
    return { from: '', to: '' };
  }

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

const getComparisonLabel = (preset, direction = 'previous') => {
  const suffix = direction === 'next' ? 'posterior' : 'anterior';
  if (preset === 'week') return `vs semana ${suffix}`;
  if (preset === 'month') return `vs mes ${suffix}`;
  if (preset === 'quarter') return `vs trimestre ${suffix}`;
  if (preset === 'year') return `vs año ${suffix}`;
  return direction === 'next' ? 'vs periodo posterior' : 'vs periodo anterior';
};

const calculateMetrics = (records = []) => {
  const totals = records.reduce((acc, record) => {
    const amount = Number(record.costo_total || 0);
    const liters = Number(record.litros || 0);
    const kilometers = Number(record.kilometros_recorridos || 0);
    const m3 = Number(record.m3_enviados || 0);

    return {
      totalAmount: acc.totalAmount + amount,
      totalLiters: acc.totalLiters + liters,
      totalKm: acc.totalKm + kilometers,
      totalM3: acc.totalM3 + m3,
      recordsCount: acc.recordsCount + 1,
      completeRecords: acc.completeRecords + (liters > 0 && kilometers > 0 ? 1 : 0),
      recordsWithM3: acc.recordsWithM3 + (m3 > 0 ? 1 : 0),
      firstLoadCount: acc.firstLoadCount + (record.primera_carga ? 1 : 0)
    };
  }, {
    totalAmount: 0,
    totalLiters: 0,
    totalKm: 0,
    totalM3: 0,
    recordsCount: 0,
    completeRecords: 0,
    recordsWithM3: 0,
    firstLoadCount: 0
  });

  return {
    ...totals,
    averageTicket: totals.recordsCount > 0 ? totals.totalAmount / totals.recordsCount : 0,
    averagePricePerLiter: totals.totalLiters > 0 ? totals.totalAmount / totals.totalLiters : 0,
    averageEfficiency: totals.totalLiters > 0 ? totals.totalKm / totals.totalLiters : 0,
    costPerKm: totals.totalKm > 0 ? totals.totalAmount / totals.totalKm : 0,
    costPerM3: totals.totalM3 > 0 ? totals.totalAmount / totals.totalM3 : 0
  };
};

const aggregateByKey = (records, getKey, getLabel) => {
  const map = new Map();

  records.forEach((record) => {
    const key = getKey(record);
    if (!key) return;

    const current = map.get(key) || {
      key,
      label: getLabel(record),
      totalAmount: 0,
      totalLiters: 0,
      totalKm: 0,
      totalM3: 0,
      recordsCount: 0
    };

    current.totalAmount += Number(record.costo_total || 0);
    current.totalLiters += Number(record.litros || 0);
    current.totalKm += Number(record.kilometros_recorridos || 0);
    current.totalM3 += Number(record.m3_enviados || 0);
    current.recordsCount += 1;
    map.set(key, current);
  });

  return Array.from(map.values()).map((item) => ({
    ...item,
    averagePricePerLiter: item.totalLiters > 0 ? item.totalAmount / item.totalLiters : 0,
    efficiency: item.totalLiters > 0 ? item.totalKm / item.totalLiters : 0,
    costPerKm: item.totalKm > 0 ? item.totalAmount / item.totalKm : 0,
    costPerM3: item.totalM3 > 0 ? item.totalAmount / item.totalM3 : 0
  }));
};

const buildOptions = (records, field) => {
  if (field === 'tipo_combustible') {
    return FUEL_TYPE_OPTIONS
      .map((option) => option.value)
      .filter((value) => records.some((record) => normalizeFuelType(record[field]) === value));
  }

  return Array.from(
    new Set(
      records
        .map((record) => String(record[field] || '').trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right, 'es'));
};

const filterRecords = ({
  records,
  dateFrom = '',
  dateTo = '',
  vehicleId = 'todos',
  provider = 'todos',
  operator = 'todos',
  fuelType = 'todos',
  search = '',
  onlyComplete = false,
  withM3Only = false,
  excludeFirstLoad = false
}) => {
  const normalizedSearch = String(search || '').trim().toLowerCase();

  return records.filter((record) => {
    const recordDate = normalizeDateKey(record.fecha_carga);
    const matchesDateFrom = dateFrom ? recordDate >= dateFrom : true;
    const matchesDateTo = dateTo ? recordDate <= dateTo : true;
    const matchesVehicle = vehicleId === 'todos' ? true : String(record.vehiculo_id) === String(vehicleId);
    const matchesProvider = provider === 'todos' ? true : String(record.proveedor || '') === provider;
    const matchesOperator = operator === 'todos' ? true : String(record.operador || '') === operator;
    const matchesFuelType = fuelType === 'todos' ? true : normalizeFuelType(record.tipo_combustible) === fuelType;
    const matchesComplete = onlyComplete
      ? Number(record.litros || 0) > 0 && Number(record.kilometros_recorridos || 0) > 0
      : true;
    const matchesM3 = withM3Only ? Number(record.m3_enviados || 0) > 0 : true;
    const matchesFirstLoad = excludeFirstLoad ? !record.primera_carga : true;

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

    return (
      matchesDateFrom
      && matchesDateTo
      && matchesVehicle
      && matchesProvider
      && matchesOperator
      && matchesFuelType
      && matchesComplete
      && matchesM3
      && matchesFirstLoad
      && matchesSearch
    );
  });
};

const getDelta = (currentValue, comparisonValue) => {
  const safeCurrent = Number(currentValue || 0);
  const safeComparison = Number(comparisonValue || 0);
  const difference = safeCurrent - safeComparison;

  if (safeComparison === 0) {
    return {
      difference,
      percentage: safeCurrent === 0 ? 0 : 100,
      direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat'
    };
  }

  const percentage = (difference / safeComparison) * 100;
  return {
    difference,
    percentage,
    direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat'
  };
};

const formatDeltaLabel = (delta, comparisonLabel) => {
  const sign = delta.percentage > 0 ? '+' : '';
  return `${sign}${formatNumber(delta.percentage, 1)}% ${comparisonLabel}`;
};

const buildComparisonContext = ({ records, currentRange, preset, baseFilters = {} }) => {
  if (!currentRange.from || !currentRange.to || preset === 'all') {
    return {
      direction: 'previous',
      label: 'sin comparación',
      range: { from: '', to: '' },
      records: [],
      metrics: calculateMetrics([])
    };
  }

  const previousRange = shiftRangeByPreset(preset, currentRange, -1);
  const nextRange = shiftRangeByPreset(preset, currentRange, 1);

  const previousRecords = filterRecords({
    records,
    ...baseFilters,
    dateFrom: previousRange.from,
    dateTo: previousRange.to
  });

  const nextRecords = filterRecords({
    records,
    ...baseFilters,
    dateFrom: nextRange.from,
    dateTo: nextRange.to
  });

  if (previousRecords.length > 0) {
    return {
      direction: 'previous',
      label: getComparisonLabel(preset, 'previous'),
      range: previousRange,
      records: previousRecords,
      metrics: calculateMetrics(previousRecords)
    };
  }

  if (nextRecords.length > 0) {
    return {
      direction: 'next',
      label: getComparisonLabel(preset, 'next'),
      range: nextRange,
      records: nextRecords,
      metrics: calculateMetrics(nextRecords)
    };
  }

  return {
    direction: 'previous',
    label: 'sin comparación',
    range: previousRange,
    records: [],
    metrics: calculateMetrics([])
  };
};

const buildOverviewCards = (metrics, comparison) => {
  const amountDelta = getDelta(metrics.totalAmount, comparison.metrics.totalAmount);
  const litersDelta = getDelta(metrics.totalLiters, comparison.metrics.totalLiters);
  const priceDelta = getDelta(metrics.averagePricePerLiter, comparison.metrics.averagePricePerLiter);
  const efficiencyDelta = getDelta(metrics.averageEfficiency, comparison.metrics.averageEfficiency);

  return [
    {
      id: 'amount',
      label: 'Gasto total',
      value: formatCurrency(metrics.totalAmount),
      detail: `${metrics.recordsCount} cargas registradas`,
      deltaLabel: formatDeltaLabel(amountDelta, comparison.label),
      deltaDirection: amountDelta.direction
    },
    {
      id: 'liters',
      label: 'Litros cargados',
      value: `${formatNumber(metrics.totalLiters)} L`,
      detail: `Ticket promedio ${formatCurrency(metrics.averageTicket)}`,
      deltaLabel: formatDeltaLabel(litersDelta, comparison.label),
      deltaDirection: litersDelta.direction
    },
    {
      id: 'price',
      label: 'Precio promedio por litro',
      value: formatCurrency(metrics.averagePricePerLiter),
      detail: metrics.totalLiters > 0 ? 'Calculado con litros reales' : 'Sin litros suficientes',
      deltaLabel: formatDeltaLabel(priceDelta, comparison.label),
      deltaDirection: priceDelta.direction
    },
    {
      id: 'efficiency',
      label: 'Rendimiento promedio',
      value: `${formatNumber(metrics.averageEfficiency)} km/L`,
      detail: `${metrics.completeRecords} cargas con km y litros válidos`,
      deltaLabel: formatDeltaLabel(efficiencyDelta, comparison.label),
      deltaDirection: efficiencyDelta.direction
    }
  ];
};

const buildDetailCards = (metrics, comparison) => {
  const comparisonMetrics = comparison.metrics;
  const totalAmountDelta = getDelta(metrics.totalAmount, comparisonMetrics.totalAmount);
  const totalLitersDelta = getDelta(metrics.totalLiters, comparisonMetrics.totalLiters);
  const efficiencyDelta = getDelta(metrics.averageEfficiency, comparisonMetrics.averageEfficiency);
  const costPerKmDelta = getDelta(metrics.costPerKm, comparisonMetrics.costPerKm);
  const costPerM3Delta = getDelta(metrics.costPerM3, comparisonMetrics.costPerM3);

  return [
    {
      id: 'totalAmount',
      label: 'Gasto total',
      value: formatCurrency(metrics.totalAmount),
      detail: `${metrics.recordsCount} cargas consideradas`,
      deltaLabel: formatDeltaLabel(totalAmountDelta, comparison.label),
      deltaDirection: totalAmountDelta.direction
    },
    {
      id: 'totalLiters',
      label: 'Litros totales',
      value: `${formatNumber(metrics.totalLiters)} L`,
      detail: `${formatCurrency(metrics.averagePricePerLiter)} por litro promedio`,
      deltaLabel: formatDeltaLabel(totalLitersDelta, comparison.label),
      deltaDirection: totalLitersDelta.direction
    },
    {
      id: 'averageEfficiency',
      label: 'Rendimiento promedio',
      value: `${formatNumber(metrics.averageEfficiency)} km/L`,
      detail: `${formatNumber(metrics.totalKm)} km recorridos`,
      deltaLabel: formatDeltaLabel(efficiencyDelta, comparison.label),
      deltaDirection: efficiencyDelta.direction
    },
    {
      id: 'costPerKm',
      label: 'Costo por km',
      value: formatCurrency(metrics.costPerKm),
      detail: `${metrics.completeRecords} cargas completas`,
      deltaLabel: formatDeltaLabel(costPerKmDelta, comparison.label),
      deltaDirection: costPerKmDelta.direction
    },
    {
      id: 'costPerM3',
      label: 'Costo por m3',
      value: formatCurrency(metrics.costPerM3),
      detail: `${formatNumber(metrics.totalM3)} m3 enviados`,
      deltaLabel: formatDeltaLabel(costPerM3Delta, comparison.label),
      deltaDirection: costPerM3Delta.direction
    }
  ];
};

const buildTrendSeries = ({ records, preset, dateFrom, dateTo }) => {
  const granularity = getTrendGranularity({ preset, dateFrom, dateTo });
  const map = new Map();

  records.forEach((record) => {
    const parts = parseDateParts(record.fecha_carga);
    if (!parts) return;

    const date = buildDateFromParts(parts);
    let key = '';
    let label = '';
    let sortDate = null;

    if (granularity === 'day') {
      key = normalizeDateKey(record.fecha_carga);
      label = `${String(parts.day).padStart(2, '0')} ${MONTH_LABELS[parts.month - 1]}`;
      sortDate = new Date(date);
    } else if (granularity === 'week') {
      const weekStart = getWeekStart(date);
      key = toLocalDateString(weekStart);
      label = `Sem ${String(weekStart.getDate()).padStart(2, '0')} ${MONTH_LABELS[weekStart.getMonth()]}`;
      sortDate = weekStart;
    } else {
      key = `${parts.year}-${String(parts.month).padStart(2, '0')}`;
      label = `${MONTH_LABELS[parts.month - 1]} ${String(parts.year).slice(-2)}`;
      sortDate = new Date(parts.year, parts.month - 1, 1);
    }

    const current = map.get(key) || {
      key,
      label,
      sortValue: sortDate?.getTime() || 0,
      records: []
    };

    current.records.push(record);
    map.set(key, current);
  });

  return Array.from(map.values())
    .sort((left, right) => left.sortValue - right.sortValue)
    .map((bucket) => {
      const metrics = calculateMetrics(bucket.records);
      return {
        key: bucket.key,
        label: bucket.label,
        totalAmount: metrics.totalAmount,
        totalLiters: metrics.totalLiters,
        totalKm: metrics.totalKm,
        averageEfficiency: metrics.averageEfficiency,
        recordsCount: metrics.recordsCount
      };
    });
};

const buildDistributionByProvider = (records) => (
  aggregateByKey(
    records,
    (record) => String(record.proveedor || '').trim() || 'Sin proveedor',
    (record) => String(record.proveedor || '').trim() || 'Sin proveedor'
  )
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .slice(0, 5)
);

const buildVehicleLitersSeries = (records) => (
  aggregateByKey(
    records,
    (record) => record.vehiculo_id,
    (record) => record.placa_snapshot || record.vehiculo_placa || 'Sin placa'
    )
      .sort((left, right) => right.totalLiters - left.totalLiters)
      .slice(0, 8)
);

const buildVehicleDistribution = (records) => (
  aggregateByKey(
    records,
    (record) => record.vehiculo_id,
    (record) => `${record.placa_snapshot || record.vehiculo_placa || 'Sin placa'}`
  )
    .sort((left, right) => right.totalAmount - left.totalAmount)
    .slice(0, 6)
);

const buildFuelTypeDistribution = (records) => (
  aggregateByKey(
    records,
    (record) => normalizeFuelType(record.tipo_combustible),
    (record) => getFuelTypeLabel(record.tipo_combustible)
  )
    .sort((left, right) => right.totalAmount - left.totalAmount)
);

const buildFuelTypeKpis = (records) => (
  FUEL_TYPE_OPTIONS.map((option) => {
    const filteredRecords = records.filter((record) => normalizeFuelType(record.tipo_combustible) === option.value);
    const metrics = calculateMetrics(filteredRecords);

    return {
      id: option.value,
      label: option.label,
      metrics
    };
  }).filter((item) => item.metrics.recordsCount > 0)
);

const describeProjection = (trendSeries) => {
  if (trendSeries.length < 3) {
    return 'Aún no hay suficiente histórico para una proyección confiable.';
  }

  const lastThree = trendSeries.slice(-3);
  const averageAmount = lastThree.reduce((sum, item) => sum + Number(item.totalAmount || 0), 0) / lastThree.length;
  const averageLiters = lastThree.reduce((sum, item) => sum + Number(item.totalLiters || 0), 0) / lastThree.length;
  const growthBase = lastThree[0].totalAmount > 0
    ? ((lastThree[lastThree.length - 1].totalAmount - lastThree[0].totalAmount) / lastThree[0].totalAmount) * 100
    : 0;

  return `Base para predicción: promedio reciente de ${formatCurrency(averageAmount)} y ${formatNumber(averageLiters)} L por mes, con una variación de ${formatNumber(growthBase, 1)}% en los últimos tres meses.`;
};

const DeltaBadge = ({ direction, label }) => (
  <span className={`analytics-delta-badge analytics-delta-${direction}`}>
    {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•'} {label}
  </span>
);

const DetailTable = ({ title, subtitle, rows, emptyMessage, valueFormatter, metricKey }) => {
  const maxValue = Math.max(...rows.map((row) => Number(row[metricKey] || 0)), 0);

  return (
    <div className='analytics-panel'>
      <div className='analytics-panel-header'>
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className='analytics-empty-panel'>
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className='analytics-ranking-list'>
          {rows.map((row) => {
            const value = Number(row[metricKey] || 0);
            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

            return (
              <div key={row.key} className='analytics-ranking-item'>
                <div className='analytics-ranking-copy'>
                  <strong>{row.label}</strong>
                  <span>
                    {row.recordsCount} carga{row.recordsCount === 1 ? '' : 's'} · {formatCurrency(row.totalAmount)}
                  </span>
                </div>
                <div className='analytics-ranking-bar'>
                  <div style={{ width: `${percentage}%` }} />
                </div>
                <div className='analytics-ranking-value'>{valueFormatter(value)}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const TrendChart = ({ data, granularityLabel }) => {
  const [selectedKey, setSelectedKey] = useState(data[data.length - 1]?.key || null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    setSelectedKey(data[data.length - 1]?.key || null);
  }, [data]);

  if (!data.length) {
    return (
      <div className='analytics-empty-panel'>
        <p>No hay suficiente histórico para construir la tendencia.</p>
      </div>
    );
  }

  const width = 640;
  const height = 260;
  const padding = 28;
  const leftPadding = 82;
  const maxAmount = Math.max(...data.map((item) => Number(item.totalAmount || 0)), 1);
  const stepX = data.length > 1 ? (width - leftPadding - padding) / (data.length - 1) : 0;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    ratio,
    value: maxAmount * (1 - ratio)
  }));

  const amountPoints = data.map((item, index) => {
    const x = leftPadding + (index * stepX);
    const y = height - padding - ((Number(item.totalAmount || 0) / maxAmount) * (height - padding * 2));
    return `${x},${y}`;
  }).join(' ');

  const activeKey = hoveredKey || selectedKey || data[data.length - 1]?.key;
  const activeIndex = Math.max(0, data.findIndex((item) => item.key === activeKey));
  const activeItem = data[activeIndex] || data[data.length - 1];
  const updateTooltip = (event, item) => {
    const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTooltip({
      x: event.clientX - rect.left + 14,
      y: event.clientY - rect.top - 10,
      item
    });
  };

  return (
    <div className='analytics-chart-with-details'>
      <div className='analytics-trend-chart'>
        <div className='analytics-chart-legend'>
          <span><i className='analytics-legend-dot analytics-legend-amount' /> Gasto acumulado</span>
        </div>

        <div className='analytics-chart-surface'>
          <svg viewBox={`0 0 ${width} ${height}`} role='img' aria-label='Tendencia de gasto en pesos'>
            {yTicks.map((tick) => {
              const y = padding + ((height - padding * 2) * tick.ratio);
              return (
                <g key={tick.ratio}>
                  <line x1={leftPadding} y1={y} x2={width - padding} y2={y} className='analytics-grid-line' />
                  <text x={leftPadding - 10} y={y + 4} textAnchor='end' className='analytics-y-axis-label'>
                    {formatCurrency(tick.value)}
                  </text>
                </g>
              );
            })}
            <polyline fill='none' points={amountPoints} className='analytics-line-amount' />
            {data.map((item, index) => {
              const x = leftPadding + (index * stepX);
              const amountY = height - padding - ((Number(item.totalAmount || 0) / maxAmount) * (height - padding * 2));
              const isActive = item.key === activeKey;

              return (
                <g key={item.key}>
                  <circle
                    cx={x}
                    cy={amountY}
                    r={isActive ? '6' : '4.5'}
                    className='analytics-point-amount analytics-point-clickable'
                    onMouseEnter={(event) => {
                      setHoveredKey(item.key);
                      updateTooltip(event, item);
                    }}
                    onMouseMove={(event) => updateTooltip(event, item)}
                    onMouseLeave={() => {
                      setHoveredKey(null);
                      setTooltip(null);
                    }}
                    onClick={() => setSelectedKey(item.key)}
                  />
                  <text x={x} y={height - 6} textAnchor='middle' className='analytics-axis-label'>{item.label}</text>
                </g>
              );
            })}
          </svg>

          {tooltip?.item ? (
            <div className='analytics-hover-tooltip' style={{ left: tooltip.x, top: tooltip.y }}>
              <strong>{tooltip.item.label}</strong>
              <span>Gasto: {formatCurrency(tooltip.item.totalAmount)}</span>
              <span>Litros: {formatNumber(tooltip.item.totalLiters)} L</span>
              <span>Rendimiento: {formatNumber(tooltip.item.averageEfficiency)} km/L</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className='analytics-selection-card'>
        <div>
          <span className='analytics-selection-tag'>Punto activo</span>
          <h4>{activeItem.label}</h4>
          <p>{activeItem.recordsCount} cargas registradas en ese {granularityLabel}.</p>
        </div>
        <div className='analytics-selection-metrics'>
          <div>
            <span>Gasto</span>
            <strong>{formatCurrency(activeItem.totalAmount)}</strong>
          </div>
          <div>
            <span>Litros</span>
            <strong>{formatNumber(activeItem.totalLiters)} L</strong>
          </div>
          <div>
            <span>Rendimiento</span>
            <strong>{formatNumber(activeItem.averageEfficiency)} km/L</strong>
          </div>
          <div>
            <span>Costo por km</span>
            <strong>{formatCurrency(activeItem.totalKm > 0 ? activeItem.totalAmount / activeItem.totalKm : 0)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

const VehicleBarChart = ({ data }) => {
  const [selectedKey, setSelectedKey] = useState(data[0]?.key || null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const maxLiters = Math.max(...data.map((item) => Number(item.totalLiters || 0)), 0);

  useEffect(() => {
    setSelectedKey(data[0]?.key || null);
  }, [data]);

  if (!data.length) {
    return (
      <div className='analytics-empty-panel'>
        <p>No hay vehículos suficientes para construir la comparación.</p>
      </div>
    );
  }

  const activeItem = data.find((item) => item.key === (hoveredKey || selectedKey)) || data[0];

  return (
    <div className='analytics-chart-with-details'>
      <div className='analytics-bar-chart'>
        {data.map((item) => {
          const percentage = maxLiters > 0 ? (Number(item.totalLiters || 0) / maxLiters) * 100 : 0;
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
                <span>{formatCurrency(item.totalAmount)}</span>
              </div>
              <div className='analytics-bar-track'>
                <div style={{ width: `${percentage}%` }} />
              </div>
              <div className='analytics-bar-value'>{formatNumber(item.totalLiters)} L</div>
            </button>
          );
        })}
      </div>

      <div className='analytics-selection-card analytics-selection-card-compact'>
        <div>
          <span className='analytics-selection-tag'>Vehículo activo</span>
          <h4>{activeItem.label}</h4>
          <p>{activeItem.recordsCount} cargas dentro del filtro actual.</p>
        </div>
        <div className='analytics-selection-metrics'>
          <div>
            <span>Gasto</span>
            <strong>{formatCurrency(activeItem.totalAmount)}</strong>
          </div>
          <div>
            <span>Litros</span>
            <strong>{formatNumber(activeItem.totalLiters)} L</strong>
          </div>
          <div>
            <span>Rendimiento</span>
            <strong>{formatNumber(activeItem.efficiency)} km/L</strong>
          </div>
          <div>
            <span>Costo/L</span>
            <strong>{formatCurrency(activeItem.averagePricePerLiter)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

const describeArc = (centerX, centerY, radius, startAngle, endAngle) => {
  const start = {
    x: centerX + radius * Math.cos(startAngle),
    y: centerY + radius * Math.sin(startAngle)
  };
  const end = {
    x: centerX + radius * Math.cos(endAngle),
    y: centerY + radius * Math.sin(endAngle)
  };
  const largeArcFlag = endAngle - startAngle <= Math.PI ? '0' : '1';

  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
};

const DonutChart = ({
  data,
  metricKey = 'totalAmount',
  centerValueFormatter = formatCurrency,
  detailValueFormatter = formatCurrency,
  ariaLabel = 'Distribución',
  totalSuffix = '',
  selectionLabel = 'Proveedor activo',
  selectionDescription = 'cargas asociadas a este proveedor'
}) => {
  const [selectedKey, setSelectedKey] = useState(data[0]?.key || null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    setSelectedKey(data[0]?.key || null);
  }, [data]);

  const total = data.reduce((sum, item) => sum + Number(item[metricKey] || 0), 0);

  if (!data.length || total <= 0) {
    return (
      <div className='analytics-empty-panel'>
        <p>No hay suficiente información para la distribución.</p>
      </div>
    );
  }

  let currentAngle = -Math.PI / 2;
  const activeItem = data.find((item) => item.key === (hoveredKey || selectedKey)) || data[0];
  const activeValue = Number(activeItem[metricKey] || 0);
  const activePercentage = total > 0 ? (activeValue / total) * 100 : 0;

  return (
    <div className='analytics-chart-with-details'>
      <div className='analytics-donut-layout'>
        <div className='analytics-chart-surface analytics-chart-surface-center'>
          <svg viewBox='0 0 220 220' className='analytics-donut-chart' role='img' aria-label={ariaLabel}>
            {data.length === 1 ? (
              <circle
                cx='110'
                cy='110'
                r='72'
                stroke={DONUT_COLORS[0]}
                strokeWidth={data[0].key === (hoveredKey || selectedKey) ? '40' : '34'}
                fill='none'
                className='analytics-donut-slice'
                onMouseEnter={(event) => {
                  const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                  setHoveredKey(data[0].key);
                  setTooltip({
                    x: event.clientX - rect.left + 12,
                    y: event.clientY - rect.top - 8,
                    label: data[0].label,
                    percentage: 100,
                    amount: Number(data[0][metricKey] || 0)
                  });
                }}
                onMouseMove={(event) => {
                  const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                  setTooltip({
                    x: event.clientX - rect.left + 12,
                    y: event.clientY - rect.top - 8,
                    label: data[0].label,
                    percentage: 100,
                    amount: Number(data[0][metricKey] || 0)
                  });
                }}
                onMouseLeave={() => {
                  setHoveredKey(null);
                  setTooltip(null);
                }}
                onClick={() => setSelectedKey(data[0].key)}
              />
            ) : data.map((item, index) => {
              const value = Number(item[metricKey] || 0);
              const angle = (value / total) * Math.PI * 2;
              const nextAngle = currentAngle + angle;
              const path = describeArc(110, 110, 72, currentAngle, nextAngle);
              const percentage = total > 0 ? (value / total) * 100 : 0;
              const element = (
                <path
                  key={item.key}
                  d={path}
                  stroke={DONUT_COLORS[index % DONUT_COLORS.length]}
                  strokeWidth={item.key === (hoveredKey || selectedKey) ? '40' : '34'}
                  fill='none'
                  strokeLinecap='butt'
                  className='analytics-donut-slice'
                  onMouseEnter={(event) => {
                    const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                    setHoveredKey(item.key);
                    setTooltip({
                      x: event.clientX - rect.left + 12,
                      y: event.clientY - rect.top - 8,
                      label: item.label,
                      percentage,
                      amount: value
                    });
                  }}
                  onMouseMove={(event) => {
                    const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                    setTooltip({
                      x: event.clientX - rect.left + 12,
                      y: event.clientY - rect.top - 8,
                      label: item.label,
                      percentage,
                      amount: value
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredKey(null);
                    setTooltip(null);
                  }}
                  onClick={() => setSelectedKey(item.key)}
                />
              );
              currentAngle = nextAngle;
              return element;
            })}
            <circle cx='110' cy='110' r='43' fill='#ffffff' />
            <text x='110' y='102' textAnchor='middle' className='analytics-donut-total-label'>Total</text>
            <text x='110' y='124' textAnchor='middle' className='analytics-donut-total-value'>{centerValueFormatter(total)}</text>
          </svg>

          {tooltip ? (
            <div className='analytics-hover-tooltip' style={{ left: tooltip.x, top: tooltip.y }}>
              <strong>{tooltip.label}</strong>
              <span>{formatNumber(tooltip.percentage, 1)}% del total</span>
              <span>{detailValueFormatter(tooltip.amount)}{totalSuffix}</span>
            </div>
          ) : null}
        </div>

        <div className='analytics-donut-legend'>
          {data.map((item, index) => {
            const value = Number(item[metricKey] || 0);
            const percentage = total > 0 ? (value / total) * 100 : 0;
            const isActive = item.key === (hoveredKey || selectedKey);

            return (
              <button
                key={item.key}
                type='button'
                className={`analytics-donut-legend-item ${isActive ? 'analytics-donut-legend-item-active' : ''}`}
                onMouseEnter={() => setHoveredKey(item.key)}
                onMouseLeave={() => setHoveredKey(null)}
                onClick={() => setSelectedKey(item.key)}
              >
                <span>
                  <i style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                  {item.label}
                </span>
                <strong>{formatNumber(percentage, 1)}%</strong>
                <small>{detailValueFormatter(value)}{totalSuffix}</small>
              </button>
            );
          })}
        </div>
      </div>

      <div className='analytics-selection-card analytics-selection-card-compact'>
        <div>
          <span className='analytics-selection-tag'>{selectionLabel}</span>
          <h4>{activeItem.label}</h4>
          <p>{activeItem.recordsCount} {selectionDescription}.</p>
        </div>
        <div className='analytics-selection-metrics'>
          <div>
            <span>Participación</span>
            <strong>{formatNumber(activePercentage, 1)}%</strong>
          </div>
          <div>
            <span>Valor</span>
            <strong>{detailValueFormatter(activeValue)}{totalSuffix}</strong>
          </div>
          <div>
            <span>Litros</span>
            <strong>{formatNumber(activeItem.totalLiters)} L</strong>
          </div>
          <div>
            <span>Costo/L</span>
            <strong>{formatCurrency(activeItem.averagePricePerLiter)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [records, setRecords] = useState([]);
  const [periodPreset, setPeriodPreset] = useState('month');
  const [activeView, setActiveView] = useState('overview');
  const [detailFilters, setDetailFilters] = useState(() => {
    const range = getDateRangeByPreset('month');
    return {
      search: '',
      vehicleId: 'todos',
      provider: 'todos',
      operator: 'todos',
      fuelType: 'todos',
      dateFrom: range.from,
      dateTo: range.to,
      onlyComplete: false,
      withM3Only: false,
      excludeFirstLoad: false
    };
  });

  const fetchData = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) {
        setLoading(true);
      }

      const token = localStorage.getItem('authToken');
      const cacheBuster = Date.now();

      const [vehiclesResponse, recordsResponse] = await Promise.all([
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
        })
      ]);

      const vehiclesData = await vehiclesResponse.json().catch(() => ({}));
      const recordsData = await recordsResponse.json().catch(() => ({}));

      if (!vehiclesResponse.ok) {
        throw new Error(vehiclesData.message || 'No se pudieron cargar los vehículos');
      }

      if (!recordsResponse.ok) {
        throw new Error(recordsData.message || 'No se pudieron cargar los registros de gasolina');
      }

      setVehicles(vehiclesData.vehicles || []);
      setRecords(sortRecordsByDateTimeDesc((recordsData.gasolineRecords || []).map(normalizeAnalyticsRecord)));
      setError(null);
    } catch (fetchError) {
      console.error('Error loading analytics dashboard:', fetchError);
      setError(fetchError.message);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchData({ showLoader: true });
  }, [fetchData]);

  useEffect(() => {
    const handleGasolineUpdated = () => {
      fetchData();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    };

    const handleWindowFocus = () => {
      fetchData();
    };

    const handleStorage = (event) => {
      if (event.key === GASOLINE_RECORDS_UPDATED_STORAGE_KEY) {
        fetchData();
      }
    };

    const intervalId = window.setInterval(() => {
      fetchData();
    }, 30000);

    window.addEventListener(GASOLINE_RECORDS_UPDATED_EVENT, handleGasolineUpdated);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorage);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(GASOLINE_RECORDS_UPDATED_EVENT, handleGasolineUpdated);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);

  useEffect(() => {
    const range = getDateRangeByPreset(periodPreset);
    setDetailFilters((current) => ({
      ...current,
      dateFrom: range.from,
      dateTo: range.to
    }));
  }, [periodPreset]);

  const overviewRange = useMemo(() => getDateRangeByPreset(periodPreset), [periodPreset]);
  const overviewRecords = useMemo(() => filterRecords({
    records,
    dateFrom: overviewRange.from,
    dateTo: overviewRange.to
  }), [overviewRange.from, overviewRange.to, records]);
  const overviewMetrics = useMemo(() => calculateMetrics(overviewRecords), [overviewRecords]);

  const overviewComparison = useMemo(() => buildComparisonContext({
    records,
    currentRange: overviewRange,
    preset: periodPreset
  }), [overviewRange, periodPreset, records]);

  const overviewCards = useMemo(
    () => buildOverviewCards(overviewMetrics, overviewComparison),
    [overviewComparison, overviewMetrics]
  );

  const detailRange = useMemo(() => ({
    from: detailFilters.dateFrom,
    to: detailFilters.dateTo
  }), [detailFilters.dateFrom, detailFilters.dateTo]);

  const detailRecords = useMemo(() => filterRecords({
    records,
    ...detailFilters
  }), [detailFilters, records]);

  const detailMetrics = useMemo(() => calculateMetrics(detailRecords), [detailRecords]);

  const detailComparison = useMemo(() => buildComparisonContext({
    records,
    currentRange: detailRange,
    preset: periodPreset,
    baseFilters: {
      vehicleId: detailFilters.vehicleId,
      provider: detailFilters.provider,
      operator: detailFilters.operator,
      fuelType: detailFilters.fuelType,
      search: detailFilters.search,
      onlyComplete: detailFilters.onlyComplete,
      withM3Only: detailFilters.withM3Only,
      excludeFirstLoad: detailFilters.excludeFirstLoad
    }
  }), [
    detailFilters.excludeFirstLoad,
    detailFilters.fuelType,
    detailFilters.onlyComplete,
    detailFilters.operator,
    detailFilters.provider,
    detailFilters.search,
    detailFilters.vehicleId,
    detailFilters.withM3Only,
    detailRange,
    periodPreset,
    records
  ]);

  const detailCards = useMemo(
    () => buildDetailCards(detailMetrics, detailComparison),
    [detailComparison, detailMetrics]
  );

  const providerOptions = useMemo(() => buildOptions(records, 'proveedor'), [records]);
  const operatorOptions = useMemo(() => buildOptions(records, 'operador'), [records]);
  const fuelTypeOptions = useMemo(() => buildOptions(records, 'tipo_combustible'), [records]);

  const topVehiclesByAmount = useMemo(() => (
    aggregateByKey(
      detailRecords,
      (record) => record.vehiculo_id,
      (record) => `${record.placa_snapshot || record.vehiculo_placa || 'Sin placa'} · ${record.descripcion_snapshot || record.vehiculo_descripcion || 'Sin descripción'}`
    )
      .sort((left, right) => right.totalAmount - left.totalAmount)
      .slice(0, 5)
  ), [detailRecords]);

  const topProvidersByLiters = useMemo(() => (
    aggregateByKey(
      detailRecords,
      (record) => String(record.proveedor || '').trim(),
      (record) => String(record.proveedor || '').trim()
    )
      .sort((left, right) => right.totalLiters - left.totalLiters)
      .slice(0, 5)
  ), [detailRecords]);

  const topOperatorsByEfficiency = useMemo(() => (
    aggregateByKey(
      detailRecords.filter((record) => Number(record.litros || 0) > 0 && Number(record.kilometros_recorridos || 0) > 0),
      (record) => String(record.operador || '').trim(),
      (record) => String(record.operador || '').trim()
    )
      .sort((left, right) => right.efficiency - left.efficiency)
      .slice(0, 5)
  ), [detailRecords]);

  const trendGranularity = useMemo(
    () => getTrendGranularity({ preset: periodPreset, dateFrom: detailRange.from, dateTo: detailRange.to }),
    [detailRange.from, detailRange.to, periodPreset]
  );
  const trendGranularityLabel = useMemo(() => getTrendGranularityLabel(trendGranularity), [trendGranularity]);
  const trendSeries = useMemo(
    () => buildTrendSeries({
      records: detailRecords,
      preset: periodPreset,
      dateFrom: detailRange.from,
      dateTo: detailRange.to
    }),
    [detailRange.from, detailRange.to, detailRecords, periodPreset]
  );
  const providerDistribution = useMemo(() => buildDistributionByProvider(detailRecords), [detailRecords]);
  const vehicleLitersSeries = useMemo(() => buildVehicleLitersSeries(detailRecords), [detailRecords]);
  const vehicleDistribution = useMemo(() => buildVehicleDistribution(detailRecords), [detailRecords]);
  const fuelTypeDistribution = useMemo(() => buildFuelTypeDistribution(detailRecords), [detailRecords]);
  const fuelTypeKpis = useMemo(() => buildFuelTypeKpis(detailRecords), [detailRecords]);
  const recentRecords = useMemo(() => detailRecords.slice(0, 8), [detailRecords]);

  if (loading) {
    return (
      <div className='analytics-state'>
        <div className='spinner' />
        <p>Cargando análisis de gasolina...</p>
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
          <p>Vista enfocada en gasolina con comparativos, tendencias e interacción tipo BI.</p>
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
            <span className='analytics-section-tag'>Gasolina</span>
            <h2>KPIs principales del periodo</h2>
            <p>
              La portada muestra gasolina con comparación automática contra el periodo más cercano con datos.
            </p>
          </div>

          <button
            type='button'
            className='analytics-section-card'
            onClick={() => setActiveView('gasoline')}
          >
            <div className='analytics-section-card-top'>
              <div>
                <span className='analytics-section-eyebrow'>Sección activa</span>
                <h3>Gasolina</h3>
              </div>
              <span className='analytics-link-chip'>Ver detalle</span>
            </div>

            <div className='analytics-kpi-grid'>
              {overviewCards.map((card) => (
                <div key={card.id} className='analytics-kpi-card'>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.detail}</small>
                  <DeltaBadge direction={card.deltaDirection} label={card.deltaLabel} />
                </div>
              ))}
            </div>
          </button>
        </div>
      ) : (
        <div className='analytics-detail'>
          <div className='analytics-detail-header'>
            <div>
              <button type='button' className='analytics-back-btn' onClick={() => setActiveView('overview')}>
                Volver al resumen
              </button>
              <h2>Detalle de KPIs de gasolina</h2>
              <p>Comparativos por KPI, gráficas con hover/click y detalle activo como en un tablero analítico.</p>
            </div>
          </div>

          <div className='analytics-panel analytics-filters-panel'>
            <div className='analytics-panel-header'>
              <div>
                <h3>Filtros</h3>
                <p>Refina la vista por unidad, proveedor, operador, combustible y calidad del dato.</p>
              </div>
            </div>

            <div className='analytics-filters-grid'>
              <label>
                Buscar
                <input
                  type='search'
                  value={detailFilters.search}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, search: event.target.value }))}
                  placeholder='Factura, placa, proveedor u operador'
                />
              </label>

              <label>
                Vehículo
                <select
                  value={detailFilters.vehicleId}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, vehicleId: event.target.value }))}
                >
                  <option value='todos'>Todos</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.placa} - {vehicle.descripcion || vehicle.propietario_nombre || 'Sin descripción'}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Proveedor
                <select
                  value={detailFilters.provider}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, provider: event.target.value }))}
                >
                  <option value='todos'>Todos</option>
                  {providerOptions.map((provider) => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </label>

              <label>
                Operador
                <select
                  value={detailFilters.operator}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, operator: event.target.value }))}
                >
                  <option value='todos'>Todos</option>
                  {operatorOptions.map((operator) => (
                    <option key={operator} value={operator}>{operator}</option>
                  ))}
                </select>
              </label>

              <label>
                Tipo de combustible
                <select
                  value={detailFilters.fuelType}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, fuelType: event.target.value }))}
                >
                  <option value='todos'>Todos</option>
                  {fuelTypeOptions.map((fuelType) => (
                    <option key={fuelType} value={fuelType}>{getFuelTypeLabel(fuelType)}</option>
                  ))}
                </select>
              </label>

              <label>
                Fecha inicial
                <input
                  type='date'
                  value={detailFilters.dateFrom}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, dateFrom: event.target.value }))}
                />
              </label>

              <label>
                Fecha final
                <input
                  type='date'
                  value={detailFilters.dateTo}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, dateTo: event.target.value }))}
                />
              </label>

              <label className='analytics-toggle-field'>
                <input
                  type='checkbox'
                  checked={detailFilters.onlyComplete}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, onlyComplete: event.target.checked }))}
                />
                Solo registros con km y litros válidos
              </label>

              <label className='analytics-toggle-field'>
                <input
                  type='checkbox'
                  checked={detailFilters.withM3Only}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, withM3Only: event.target.checked }))}
                />
                Solo registros con m3 enviados
              </label>

              <label className='analytics-toggle-field'>
                <input
                  type='checkbox'
                  checked={detailFilters.excludeFirstLoad}
                  onChange={(event) => setDetailFilters((current) => ({ ...current, excludeFirstLoad: event.target.checked }))}
                />
                Excluir primeras cargas
              </label>
            </div>
          </div>

          <div className='analytics-kpi-grid analytics-kpi-grid-detail'>
            {detailCards.map((card) => (
              <div key={card.id} className='analytics-kpi-card'>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
                <DeltaBadge direction={card.deltaDirection} label={card.deltaLabel} />
              </div>
            ))}
          </div>

          <div className='analytics-panel'>
            <div className='analytics-panel-header'>
              <div>
                <h3>KPIs por tipo de combustible</h3>
                <p>Comparativo directo entre diesel, magma y premium dentro del filtro actual.</p>
              </div>
            </div>

            {fuelTypeKpis.length === 0 ? (
              <div className='analytics-empty-panel'>
                <p>No hay registros con tipo de combustible para calcular KPIs.</p>
              </div>
            ) : (
              <div className='analytics-kpi-grid analytics-kpi-grid-detail'>
                {fuelTypeKpis.map((item) => (
                  <div key={item.id} className='analytics-kpi-card'>
                    <span>{item.label}</span>
                    <strong>{formatCurrency(item.metrics.averagePricePerLiter)}</strong>
                    <small>
                      {formatNumber(item.metrics.totalLiters)} L · {formatNumber(item.metrics.averageEfficiency)} km/L · {item.metrics.recordsCount} cargas
                    </small>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='analytics-chart-grid'>
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Tendencia del periodo</h3>
                  <p>La agrupación cambia con el filtro: por día, semana o mes según el rango activo.</p>
                </div>
              </div>
              <TrendChart data={trendSeries} granularityLabel={trendGranularityLabel} />
            </div>

            <div className='analytics-panel analytics-chart-panel'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Distribucion por tipo de combustible</h3>
                  <p>Participacion del gasto por diesel, magma y premium.</p>
                </div>
              </div>
              <DonutChart
                data={fuelTypeDistribution}
                metricKey='totalAmount'
                centerValueFormatter={formatCurrency}
                detailValueFormatter={formatCurrency}
                ariaLabel='Distribucion de gasto por tipo de combustible'
                selectionLabel='Combustible activo'
                selectionDescription='cargas asociadas a este tipo de combustible'
              />
            </div>
          </div>

          <div className='analytics-chart-grid'>
            <div className='analytics-panel analytics-chart-panel'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Distribución por proveedor</h3>
                  <p>Hover o click para ver participación, monto, litros y costo promedio.</p>
                </div>
              </div>
              <DonutChart
                data={providerDistribution}
                metricKey='totalAmount'
                centerValueFormatter={formatCurrency}
                detailValueFormatter={formatCurrency}
                ariaLabel='Distribución de gasto por proveedor'
              />
            </div>
          </div>

          <div className='analytics-chart-grid'>
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Consumo por vehículo</h3>
                  <p>Selecciona una barra para ver el detalle operativo de esa unidad.</p>
                </div>
              </div>
              <VehicleBarChart data={vehicleLitersSeries} />
            </div>

            <div className='analytics-panel analytics-chart-panel'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Consumo por vehículo</h3>
                  <p>Distribución del consumo por unidad en dinero y litros.</p>
                </div>
              </div>
              <div className='analytics-nested-donut-grid'>
                <DonutChart
                  data={vehicleDistribution}
                  metricKey='totalAmount'
                  centerValueFormatter={formatCurrency}
                  detailValueFormatter={formatCurrency}
                  ariaLabel='Distribución de gasto por vehículo'
                />
                <DonutChart
                  data={vehicleDistribution}
                  metricKey='totalLiters'
                  centerValueFormatter={(value) => `${formatNumber(value)} L`}
                  detailValueFormatter={(value) => formatNumber(value)}
                  totalSuffix=' L'
                  ariaLabel='Distribución de litros por vehículo'
                />
              </div>
            </div>
          </div>

          <div className='analytics-detail-grid'>
            <DetailTable
              title='Tipos con mayor gasto'
              subtitle='Comparativo por mezcla de combustible en el rango actual.'
              rows={fuelTypeDistribution}
              emptyMessage='No hay tipos de combustible suficientes para comparar.'
              metricKey='totalAmount'
              valueFormatter={(value) => formatCurrency(value)}
            />
            <DetailTable
              title='Vehículos con mayor gasto'
              subtitle='Top unidades por monto invertido en el rango actual.'
              rows={topVehiclesByAmount}
              emptyMessage='No hay datos suficientes para mostrar vehículos.'
              metricKey='totalAmount'
              valueFormatter={(value) => formatCurrency(value)}
            />

            <DetailTable
              title='Proveedores con más litros'
              subtitle='Comparativo rápido para revisar volumen y concentración de compra.'
              rows={topProvidersByLiters}
              emptyMessage='No hay proveedores con datos en el filtro actual.'
              metricKey='totalLiters'
              valueFormatter={(value) => `${formatNumber(value)} L`}
            />

            <DetailTable
              title='Operadores con mejor rendimiento'
              subtitle='Se consideran solo registros con kilómetros y litros válidos.'
              rows={topOperatorsByEfficiency}
              emptyMessage='No hay operadores con registros completos.'
              metricKey='efficiency'
              valueFormatter={(value) => `${formatNumber(value)} km/L`}
            />
          </div>

          <div className='analytics-panel'>
            <div className='analytics-panel-header'>
              <div>
                <h3>Registros recientes del filtro</h3>
                <p>Resumen operativo para validar facturas, fechas, rendimiento y costo unitario.</p>
              </div>
            </div>

            {recentRecords.length === 0 ? (
              <div className='analytics-empty-panel'>
                <p>No hay registros que coincidan con los filtros actuales.</p>
              </div>
            ) : (
              <div className='analytics-records-table-wrapper'>
                <table className='analytics-records-table'>
                  <thead>
                    <tr>
                      <th>Vehículo</th>
                      <th>Fecha</th>
                      <th>Combustible</th>
                      <th>Proveedor</th>
                      <th>Operador</th>
                      <th>Litros</th>
                      <th>Monto</th>
                      <th>Precio/L</th>
                      <th>Km/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentRecords.map((record) => {
                      const liters = Number(record.litros || 0);
                      const amount = Number(record.costo_total || 0);
                      const kilometers = Number(record.kilometros_recorridos || 0);
                      const pricePerLiter = liters > 0 ? amount / liters : 0;
                      const efficiency = liters > 0 ? kilometers / liters : 0;

                      return (
                        <tr key={record.id}>
                          <td>{record.placa_snapshot || record.vehiculo_placa || '-'}</td>
                          <td>{formatDate(record.fecha_carga)}</td>
                          <td>{getFuelTypeLabel(record.tipo_combustible)}</td>
                          <td>{record.proveedor || '-'}</td>
                          <td>{record.operador || '-'}</td>
                          <td>{formatNumber(liters)}</td>
                          <td>{formatCurrency(amount)}</td>
                          <td>{formatCurrency(pricePerLiter)}</td>
                          <td>{formatNumber(efficiency)}</td>
                        </tr>
                      );
                    })}
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

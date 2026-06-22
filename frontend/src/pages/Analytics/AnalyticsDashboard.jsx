import { useCallback, useEffect, useMemo, useState } from 'react';
import { getFuelTypeLabel, normalizeFuelType } from '../../constants/fuelTypes';
import './AnalyticsDashboard.css';

const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
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

const formatPercentage = (value) => `${formatNumber(value, 1)}%`;

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

const getComparisonLabel = (preset, direction = 'previous') => {
  const suffix = direction === 'next' ? 'posterior' : 'anterior';
  if (preset === 'week') return `vs semana ${suffix}`;
  if (preset === 'month') return `vs mes ${suffix}`;
  if (preset === 'quarter') return `vs trimestre ${suffix}`;
  if (preset === 'year') return `vs año ${suffix}`;
  return direction === 'next' ? 'vs periodo posterior' : 'vs periodo anterior';
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

const getDelta = (currentValue, comparisonValue) => {
  const current = Number(currentValue || 0);
  const comparison = Number(comparisonValue || 0);
  const difference = current - comparison;

  if (comparison === 0) {
    return {
      percentage: current === 0 ? 0 : 100,
      direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat'
    };
  }

  const percentage = (difference / comparison) * 100;
  return {
    percentage,
    direction: difference > 0 ? 'up' : difference < 0 ? 'down' : 'flat'
  };
};

const formatDeltaLabel = (delta, comparisonLabel) => {
  const sign = delta.percentage > 0 ? '+' : '';
  return `${sign}${formatNumber(delta.percentage, 1)}% ${comparisonLabel}`;
};

const aggregateByKey = (records, getKey, getLabel, amountGetter) => {
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
    map.set(key, current);
  });

  return Array.from(map.values()).map((item) => ({
    ...item,
    averageAmount: item.recordsCount > 0 ? item.totalAmount / item.recordsCount : 0
  }));
};

const calculateGasolineMetrics = (records = []) => {
  const totals = records.reduce((acc, record) => {
    const amount = Number(record.costo_total || 0);
    const liters = Number(record.litros || 0);
    const kilometers = Number(record.kilometros_recorridos || 0);

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
    costPerKm: totals.totalKm > 0 ? totals.totalAmount / totals.totalKm : 0
  };
};

const calculateMaintenanceMetrics = (records = []) => {
  const providers = new Set();
  const vehicles = new Set();

  const totals = records.reduce((acc, record) => {
    const amount = Number(record.costo || 0);
    const provider = String(record.proveedor || '').trim();
    const vehicle = String(record.vehiculo_id || '').trim();

    if (provider) providers.add(provider);
    if (vehicle) vehicles.add(vehicle);

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
    uniqueVehicles: vehicles.size
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
      label: 'sin comparación',
      metrics: metricsCalculator([])
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
      label: getComparisonLabel(preset, 'previous'),
      metrics: metricsCalculator(previousRecords)
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
      label: getComparisonLabel(preset, 'next'),
      metrics: metricsCalculator(nextRecords)
    };
  }

  return {
    label: 'sin comparación',
    metrics: metricsCalculator([])
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
    let sortDate = null;

    if (granularity === 'day') {
      key = normalizeDateKey(record[dateField]);
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
      totalAmount: bucket.records.reduce((sum, item) => sum + Number(item[amountField] || 0), 0),
      recordsCount: bucket.records.length,
      ...extraBuilder(bucket.records)
    }));
};

const DeltaBadge = ({ direction, label }) => (
  <span className={`analytics-delta-badge analytics-delta-${direction}`}>
    {direction === 'up' ? '▲' : direction === 'down' ? '▼' : '•'} {label}
  </span>
);

const DetailTable = ({ title, subtitle, rows, emptyMessage, valueFormatter, metricKey, secondaryLabel }) => {
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
                    <div style={{ width: `${percentage}%` }} />
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

const SimpleTrendChart = ({ data, granularityLabel, emptyMessage, tooltipLines, metricCards }) => {
  const [selectedKey, setSelectedKey] = useState(data[data.length - 1]?.key || null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const [tooltip, setTooltip] = useState(null);

  useEffect(() => {
    setSelectedKey(data[data.length - 1]?.key || null);
  }, [data]);

  if (!data.length) {
    return (
      <div className='analytics-empty-panel'>
        <p>{emptyMessage}</p>
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
  const activeItem = data.find((item) => item.key === activeKey) || data[data.length - 1];

  return (
    <div className='analytics-chart-with-details'>
      <div className='analytics-trend-chart'>
        <div className='analytics-chart-legend'>
          <span><i className='analytics-legend-dot analytics-legend-amount' /> Gasto acumulado</span>
        </div>

        <div className='analytics-chart-surface'>
          <svg viewBox={`0 0 ${width} ${height}`} role='img' aria-label='Tendencia de costos'>
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
              const y = height - padding - ((Number(item.totalAmount || 0) / maxAmount) * (height - padding * 2));
              const isActive = item.key === activeKey;

              return (
                <g key={item.key}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isActive ? '6' : '4.5'}
                    className='analytics-point-amount analytics-point-clickable'
                    onMouseEnter={(event) => {
                      const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                      setHoveredKey(item.key);
                      setTooltip({
                        x: event.clientX - rect.left + 14,
                        y: event.clientY - rect.top - 10,
                        item
                      });
                    }}
                    onMouseMove={(event) => {
                      const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect();
                      setTooltip({
                        x: event.clientX - rect.left + 14,
                        y: event.clientY - rect.top - 10,
                        item
                      });
                    }}
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
              {tooltipLines(tooltip.item).map((line) => <span key={line}>{line}</span>)}
            </div>
          ) : null}
        </div>
      </div>

      <div className='analytics-selection-card'>
        <div>
          <span className='analytics-selection-tag'>Punto activo</span>
          <h4>{activeItem.label}</h4>
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

const SimpleBarChart = ({ data, emptyMessage, activeLabel, rowDetail, valueFormatter, activeCards, amountSuffix = '' }) => {
  const [selectedKey, setSelectedKey] = useState(data[0]?.key || null);
  const [hoveredKey, setHoveredKey] = useState(null);
  const maxAmount = Math.max(...data.map((item) => Number(item.totalAmount || 0)), 0);

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
            const percentage = maxAmount > 0 ? (Number(item.totalAmount || 0) / maxAmount) * 100 : 0;
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
                  <div style={{ width: `${percentage}%` }} />
                </div>
                <div className='analytics-bar-value'>{valueFormatter(item.totalAmount)}{amountSuffix}</div>
              </button>
            );
          })}
        </div>
      </div>

      <div className='analytics-selection-card analytics-selection-card-compact'>
        <div>
          <span className='analytics-selection-tag'>{activeLabel}</span>
          <h4>{activeItem.label}</h4>
          <p>{activeItem.recordsCount} registros dentro del filtro actual.</p>
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

const buildGasolineOverviewCards = (metrics, comparison) => {
  const totalAmountDelta = getDelta(metrics.totalAmount, comparison.metrics.totalAmount);
  const costPerKmDelta = getDelta(metrics.costPerKm, comparison.metrics.costPerKm);
  const efficiencyDelta = getDelta(metrics.averageEfficiency, comparison.metrics.averageEfficiency);
  const litersDelta = getDelta(metrics.totalLiters, comparison.metrics.totalLiters);

  return [
    {
      id: 'gasoline-total',
      label: 'Gasto total',
      value: formatCurrency(metrics.totalAmount),
      detail: `${metrics.recordsCount} cargas registradas`,
      deltaLabel: formatDeltaLabel(totalAmountDelta, comparison.label),
      deltaDirection: totalAmountDelta.direction
    },
    {
      id: 'gasoline-km',
      label: 'Costo por km',
      value: formatCurrency(metrics.costPerKm),
      detail: `${formatNumber(metrics.totalKm)} km recorridos`,
      deltaLabel: formatDeltaLabel(costPerKmDelta, comparison.label),
      deltaDirection: costPerKmDelta.direction
    },
    {
      id: 'gasoline-efficiency',
      label: 'Rendimiento',
      value: `${formatNumber(metrics.averageEfficiency)} km/L`,
      detail: `${metrics.completeRecords} cargas completas`,
      deltaLabel: formatDeltaLabel(efficiencyDelta, comparison.label),
      deltaDirection: efficiencyDelta.direction
    },
    {
      id: 'gasoline-liters',
      label: 'Litros cargados',
      value: `${formatNumber(metrics.totalLiters)} L`,
      detail: 'Consumo total del periodo',
      deltaLabel: formatDeltaLabel(litersDelta, comparison.label),
      deltaDirection: litersDelta.direction
    }
  ];
};

const buildMaintenanceOverviewCards = (metrics, comparison) => {
  const totalAmountDelta = getDelta(metrics.totalAmount, comparison.metrics.totalAmount);
  const recordsDelta = getDelta(metrics.recordsCount, comparison.metrics.recordsCount);
  const oilChangesDelta = getDelta(metrics.oilChanges, comparison.metrics.oilChanges);
  const averageTicketDelta = getDelta(metrics.averageTicket, comparison.metrics.averageTicket);

  return [
    {
      id: 'maintenance-total',
      label: 'Costo total',
      value: formatCurrency(metrics.totalAmount),
      detail: `${metrics.recordsCount} servicios registrados`,
      deltaLabel: formatDeltaLabel(totalAmountDelta, comparison.label),
      deltaDirection: totalAmountDelta.direction
    },
    {
      id: 'maintenance-records',
      label: 'Servicios',
      value: formatNumber(metrics.recordsCount, 0),
      detail: `${metrics.uniqueVehicles} vehículo(s) atendido(s)`,
      deltaLabel: formatDeltaLabel(recordsDelta, comparison.label),
      deltaDirection: recordsDelta.direction
    },
    {
      id: 'maintenance-oil',
      label: 'Cambios de aceite',
      value: formatNumber(metrics.oilChanges, 0),
      detail: `${formatPercentage(metrics.oilChangeRate)} del total`,
      deltaLabel: formatDeltaLabel(oilChangesDelta, comparison.label),
      deltaDirection: oilChangesDelta.direction
    },
    {
      id: 'maintenance-average',
      label: 'Costo promedio',
      value: formatCurrency(metrics.averageTicket),
      detail: `${metrics.uniqueProviders} proveedor(es) distintos`,
      deltaLabel: formatDeltaLabel(averageTicketDelta, comparison.label),
      deltaDirection: averageTicketDelta.direction
    }
  ];
};

const buildDefaultDateFilters = (range) => ({
  search: '',
  vehicleId: 'todos',
  dateFrom: range.from,
  dateTo: range.to
});

export default function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [periodPreset, setPeriodPreset] = useState('month');
  const [activeView, setActiveView] = useState('overview');
  const [vehicles, setVehicles] = useState([]);
  const [gasolineRecords, setGasolineRecords] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [gasolineFilters, setGasolineFilters] = useState(() => ({
    ...buildDefaultDateFilters(getDateRangeByPreset('month')),
    provider: 'todos',
    operator: 'todos',
    fuelType: 'todos',
    onlyComplete: false,
    includeFirstLoads: false
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
      includeFirstLoads: false
    }
  }), [gasolineRecords, overviewRange, periodPreset]);
  const gasolineOverviewCards = useMemo(
    () => buildGasolineOverviewCards(gasolineOverviewMetrics, gasolineOverviewComparison),
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
    () => buildMaintenanceOverviewCards(maintenanceOverviewMetrics, maintenanceOverviewComparison),
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
      (record) => String(record.vehiculo_id || ''),
      (record) => record.placa_snapshot || record.vehiculo_placa || 'Sin placa',
      (record) => record.costo_total
    ).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 8)
  ), [gasolineDetailRecords]);
  const gasolineProviderRows = useMemo(() => (
    aggregateByKey(
      gasolineDetailRecords,
      (record) => String(record.proveedor || '').trim() || 'Sin proveedor',
      (record) => String(record.proveedor || '').trim() || 'Sin proveedor',
      (record) => record.costo_total
    ).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 6)
  ), [gasolineDetailRecords]);
  const gasolineFuelRows = useMemo(() => (
    aggregateByKey(
      gasolineDetailRecords,
      (record) => normalizeFuelType(record.tipo_combustible),
      (record) => getFuelTypeLabel(record.tipo_combustible),
      (record) => record.costo_total
    ).sort((a, b) => b.totalAmount - a.totalAmount)
  ), [gasolineDetailRecords]);
  const gasolineRecentRecords = useMemo(() => gasolineDetailRecords, [gasolineDetailRecords]);

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
      (record) => String(record.vehiculo_id || ''),
      (record) => record.vehiculo_placa || record.vehiculo_numero_economico || 'Sin vehículo',
      (record) => record.costo
    ).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 8)
  ), [maintenanceDetailRecords]);
  const maintenanceProviderRows = useMemo(() => (
    aggregateByKey(
      maintenanceDetailRecords,
      (record) => String(record.proveedor || '').trim() || 'Sin proveedor',
      (record) => String(record.proveedor || '').trim() || 'Sin proveedor',
      (record) => record.costo
    ).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 6)
  ), [maintenanceDetailRecords]);
  const maintenanceTypeRows = useMemo(() => (
    aggregateByKey(
      maintenanceDetailRecords,
      (record) => String(record.tipo_mantenimiento || '').trim() || 'Sin tipo',
      (record) => String(record.tipo_mantenimiento || '').trim() || 'Sin tipo',
      (record) => record.costo
    ).sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 6)
  ), [maintenanceDetailRecords]);
  const maintenanceRecentRecords = useMemo(() => maintenanceDetailRecords.slice(0, 8), [maintenanceDetailRecords]);

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
          <p>Panel comparativo para gasolina y mantenimiento con KPIs, tendencia y ranking operativo.</p>
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
              {gasolineOverviewCards.map((card) => (
                <div key={card.id} className='analytics-kpi-card'>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                  <small>{card.detail}</small>
                  <DeltaBadge direction={card.deltaDirection} label={card.deltaLabel} />
                </div>
              ))}
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
              {maintenanceOverviewCards.map((card) => (
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
      ) : activeView === 'gasoline' ? (
        <div className='analytics-detail'>
          <div className='analytics-detail-header'>
            <div>
              <button type='button' className='analytics-back-btn' onClick={() => setActiveView('overview')}>
                Volver al resumen
              </button>
              <h2>Detalle de KPIs de gasolina</h2>
              <p>Comparativos de costo, litros, rendimiento y concentración por unidad, proveedor y combustible.</p>
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
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.placa} - {vehicle.descripcion || vehicle.propietario_nombre || 'Sin descripción'}</option>
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
                <input type='checkbox' checked={gasolineFilters.includeFirstLoads} onChange={(event) => setGasolineFilters((current) => ({ ...current, includeFirstLoads: event.target.checked }))} />
                Contar primeras cargas
              </label>
            </div>
          </div>

          <div className='analytics-kpi-grid analytics-kpi-grid-detail'>
            {buildGasolineOverviewCards(gasolineDetailMetrics, gasolineDetailComparison).map((card) => (
              <div key={card.id} className='analytics-kpi-card'>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
                <DeltaBadge direction={card.deltaDirection} label={card.deltaLabel} />
              </div>
            ))}
          </div>

          <div className='analytics-chart-grid analytics-chart-grid-single analytics-order-primary'>
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Tendencia del periodo</h3>
                  <p>El gasto se agrupa por día, semana o mes según el rango activo.</p>
                </div>
              </div>
              <SimpleTrendChart
                data={gasolineTrendSeries}
                granularityLabel={getTrendGranularityLabel(getTrendGranularity({ preset: periodPreset, dateFrom: gasolineFilters.dateFrom, dateTo: gasolineFilters.dateTo }))}
                emptyMessage='No hay suficiente histórico para construir la tendencia de gasolina.'
                tooltipLines={(item) => [
                  `Gasto: ${formatCurrency(item.totalAmount)}`,
                  `Litros: ${formatNumber(item.totalLiters)} L`,
                  `Rendimiento: ${formatNumber(item.averageEfficiency)} km/L`
                ]}
                metricCards={(item) => [
                  { label: 'Gasto', value: formatCurrency(item.totalAmount) },
                  { label: 'Litros', value: `${formatNumber(item.totalLiters)} L` },
                  { label: 'Rendimiento', value: `${formatNumber(item.averageEfficiency)} km/L` },
                  { label: 'Costo por km', value: formatCurrency(item.costPerKm) }
                ]}
              />
            </div>
          </div>

          <div className='analytics-chart-grid analytics-order-tertiary'>
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Gasto por vehículo</h3>
                  <p>Selecciona una fila para ver la unidad con mayor demanda de combustible.</p>
                </div>
              </div>
              <SimpleBarChart
                data={gasolineVehicleRows}
                emptyMessage='No hay vehículos suficientes para comparar.'
                activeLabel='Vehículo activo'
                rowDetail={(item) => `${item.recordsCount} carga(s)`}
                valueFormatter={formatCurrency}
                activeCards={(item) => [
                  { label: 'Gasto', value: formatCurrency(item.totalAmount) },
                  { label: 'Cargas', value: formatNumber(item.recordsCount, 0) },
                  { label: 'Promedio', value: formatCurrency(item.averageAmount) }
                ]}
              />
            </div>

            <DetailTable
              title='Tipos con mayor gasto'
              subtitle='Comparativo por mezcla de combustible dentro del rango actual.'
              rows={gasolineFuelRows}
              emptyMessage='No hay tipos de combustible suficientes para comparar.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} carga(s) · ${formatCurrency(row.totalAmount)}`}
            />
          </div>

          <div className='analytics-detail-grid'>
            <DetailTable
              title='Vehículos con mayor gasto'
              subtitle='Top de unidades por monto invertido en el rango actual.'
              rows={gasolineVehicleRows}
              emptyMessage='No hay vehículos suficientes para mostrar.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} carga(s) · promedio ${formatCurrency(row.averageAmount)}`}
            />
            <DetailTable
              title='Proveedores con mayor gasto'
              subtitle='Concentración de compra dentro del filtro actual.'
              rows={gasolineProviderRows}
              emptyMessage='No hay proveedores dentro del filtro actual.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} carga(s) · promedio ${formatCurrency(row.averageAmount)}`}
            />
          </div>

          <div className='analytics-panel'>
            <div className='analytics-panel-header'>
              <div>
                <h3>Registros recientes del filtro</h3>
                <p>Resumen operativo para validar facturas, rendimiento y costo unitario.</p>
              </div>
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
                      <th>Monto</th>
                      <th>Km/L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gasolineRecentRecords.map((record) => (
                      <tr key={record.id}>
                        <td>{record.placa_snapshot || record.vehiculo_placa || '-'}</td>
                        <td>{formatDate(record.fecha_carga)}</td>
                        <td>{getFuelTypeLabel(record.tipo_combustible)}</td>
                        <td>{record.proveedor || '-'}</td>
                        <td>{record.operador || '-'}</td>
                        <td>{formatNumber(record.litros)} L</td>
                        <td>{formatCurrency(record.costo_total)}</td>
                        <td>{formatNumber(Number(record.litros || 0) > 0 ? Number(record.kilometros_recorridos || 0) / Number(record.litros || 1) : 0)} km/L</td>
                      </tr>
                    ))}
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
              <p>Comparativos de costo, cambios de aceite y concentración por unidad, tipo y proveedor.</p>
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
                    <option key={vehicle.id} value={vehicle.id}>{vehicle.placa} - {vehicle.descripcion || vehicle.propietario_nombre || 'Sin descripción'}</option>
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
            {buildMaintenanceOverviewCards(maintenanceDetailMetrics, maintenanceDetailComparison).map((card) => (
              <div key={card.id} className='analytics-kpi-card'>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
                <small>{card.detail}</small>
                <DeltaBadge direction={card.deltaDirection} label={card.deltaLabel} />
              </div>
            ))}
          </div>

          <div className='analytics-chart-grid analytics-chart-grid-single analytics-order-primary'>
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Tendencia del periodo</h3>
                  <p>El costo de mantenimiento se agrupa por día, semana o mes según el rango activo.</p>
                </div>
              </div>
              <SimpleTrendChart
                data={maintenanceTrendSeries}
                granularityLabel={getTrendGranularityLabel(getTrendGranularity({ preset: periodPreset, dateFrom: maintenanceFilters.dateFrom, dateTo: maintenanceFilters.dateTo }))}
                emptyMessage='No hay suficiente histórico para construir la tendencia de mantenimiento.'
                tooltipLines={(item) => [
                  `Costo: ${formatCurrency(item.totalAmount)}`,
                  `Servicios: ${formatNumber(item.recordsCount, 0)}`,
                  `Cambios de aceite: ${formatNumber(item.oilChanges, 0)}`
                ]}
                metricCards={(item) => [
                  { label: 'Costo', value: formatCurrency(item.totalAmount) },
                  { label: 'Servicios', value: formatNumber(item.recordsCount, 0) },
                  { label: 'Cambios de aceite', value: formatNumber(item.oilChanges, 0) },
                  { label: 'Promedio', value: formatCurrency(item.averageTicket) }
                ]}
              />
            </div>
          </div>

          <div className='analytics-chart-grid analytics-order-tertiary'>
            <div className='analytics-panel analytics-chart-panel analytics-chart-panel-wide'>
              <div className='analytics-panel-header'>
                <div>
                  <h3>Costo por vehículo</h3>
                  <p>Selecciona una fila para revisar la unidad con más impacto en mantenimiento.</p>
                </div>
              </div>
              <SimpleBarChart
                data={maintenanceVehicleRows}
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

            <DetailTable
              title='Tipos con mayor costo'
              subtitle='Comparativo por tipo de mantenimiento dentro del rango actual.'
              rows={maintenanceTypeRows}
              emptyMessage='No hay tipos de mantenimiento suficientes para comparar.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} servicio(s) · promedio ${formatCurrency(row.averageAmount)}`}
            />
          </div>

          <div className='analytics-detail-grid'>
            <DetailTable
              title='Vehículos con mayor costo'
              subtitle='Top de unidades por monto invertido en mantenimiento.'
              rows={maintenanceVehicleRows}
              emptyMessage='No hay vehículos suficientes para mostrar.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} servicio(s) · promedio ${formatCurrency(row.averageAmount)}`}
            />
            <DetailTable
              title='Proveedores con mayor costo'
              subtitle='Concentración de gasto por proveedor dentro del filtro actual.'
              rows={maintenanceProviderRows}
              emptyMessage='No hay proveedores dentro del filtro actual.'
              metricKey='totalAmount'
              valueFormatter={formatCurrency}
              secondaryLabel={(row) => `${row.recordsCount} servicio(s) · promedio ${formatCurrency(row.averageAmount)}`}
            />
          </div>

          <div className='analytics-panel'>
            <div className='analytics-panel-header'>
              <div>
                <h3>Registros recientes del filtro</h3>
                <p>Resumen operativo para validar tipo, proveedor, fecha, costo y cambios de aceite.</p>
              </div>
            </div>

            {maintenanceRecentRecords.length === 0 ? (
              <div className='analytics-empty-panel'>
                <p>No hay mantenimientos que coincidan con los filtros actuales.</p>
              </div>
            ) : (
              <div className='analytics-records-table-wrapper'>
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
                        <td>{record.vehiculo_placa || record.vehiculo_numero_economico || '-'}</td>
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

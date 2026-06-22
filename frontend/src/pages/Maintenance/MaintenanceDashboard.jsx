import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import NotificationModal from '../../components/Notifications/NotificationModal';
import { getVehicleSelectorLabel } from '../../utils/vehicleLabels';
import '../../components/Notifications/NotificationModal.css';
import '../Vehicles/Sections/VehicleMaintenanceSection.css';
import GlobalMaintenanceRecordModal from './GlobalMaintenanceRecordModal';
import './MaintenanceDashboard.css';

const formatCurrency = (value) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
}).format(Number(value || 0));

const formatNumber = (value, maximumFractionDigits = 2) => Number(value || 0).toLocaleString('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits
});

const formatDate = (value) => {
  if (!value) return '-';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('es-MX');
};

const formatDateForFileName = (value) => {
  if (!value) return 'sin-fecha';
  return String(value).replaceAll('/', '-');
};

const parseDateValue = (dateValue) => {
  if (!dateValue) return new Date(Number.NaN);
  if (dateValue instanceof Date) return new Date(dateValue);
  if (typeof dateValue === 'string') {
    return new Date(dateValue.includes('T') ? dateValue : `${dateValue}T00:00:00`);
  }
  return new Date(dateValue);
};

const addMonths = (dateValue, monthsToAdd) => {
  if (!dateValue || monthsToAdd === null || monthsToAdd === undefined || monthsToAdd === '') return null;
  const date = parseDateValue(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  next.setMonth(next.getMonth() + Number(monthsToAdd));
  return next;
};

const extractFiles = (record) => {
  if (!record?.archivos_json) return [];
  try {
    const parsed = typeof record.archivos_json === 'string'
      ? JSON.parse(record.archivos_json)
      : record.archivos_json;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const buildMaintenanceTimestamp = (record) => {
  if (!record?.fecha_servicio) return 0;
  const date = new Date(`${record.fecha_servicio}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const buildGasolineTimestamp = (record) => {
  if (!record?.fecha_carga) return 0;
  const date = new Date(`${record.fecha_carga}T${record.hora_carga || '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const sortByMaintenanceDateDesc = (records = []) => (
  [...records].sort((left, right) => {
    const diff = buildMaintenanceTimestamp(right) - buildMaintenanceTimestamp(left);
    if (diff !== 0) return diff;
    return new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime();
  })
);

const getLatestOilChangeRecord = (records = [], vehicleId) => (
  sortByMaintenanceDateDesc(
    records.filter((record) => String(record.vehiculo_id) === String(vehicleId) && record.es_cambio_aceite)
  )[0] || null
);

const getLatestMileageRecord = (records = [], vehicleId) => (
  [...records]
    .filter((record) => (
      String(record.vehiculo_id) === String(vehicleId)
      && record.kilometraje_actual !== null
      && record.kilometraje_actual !== undefined
    ))
    .sort((left, right) => {
      const diff = buildGasolineTimestamp(right) - buildGasolineTimestamp(left);
      if (diff !== 0) return diff;
      return new Date(right?.created_at || 0).getTime() - new Date(left?.created_at || 0).getTime();
    })[0] || null
);

const buildTimeRemainingLabel = (targetDate) => {
  if (!targetDate) return 'Sin fecha objetivo';
  const today = new Date();
  const target = new Date(targetDate);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays < 0) return `Vencido por ${Math.abs(diffDays)} dia(s)`;
  return `Faltan ${diffDays} dia(s)`;
};

const buildDistanceRemainingLabel = (currentMileage, dueMileage) => {
  if (currentMileage === null || currentMileage === undefined || dueMileage === null || dueMileage === undefined) {
    return 'Sin kilometraje';
  }

  const remaining = Number(dueMileage) - Number(currentMileage);
  if (remaining === 0) return 'Hoy';
  if (remaining < 0) return `Vencido por ${formatNumber(Math.abs(remaining))} km`;
  return `Faltan ${formatNumber(remaining)} km`;
};

const buildOilStatus = ({ requiresAttention, overdue, hasTracking }) => {
  if (!hasTracking) return { label: 'Sin seguimiento', className: 'neutral' };
  if (overdue) return { label: 'Vencido', className: 'danger' };
  if (requiresAttention) return { label: 'Por vencer', className: 'warning' };
  return { label: 'En seguimiento', className: 'success' };
};

const buildOilTrackingItem = (vehicle, maintenanceRecords, gasolineRecords) => {
  const parameters = vehicle.operationParameters || null;
  const latestOilChange = getLatestOilChangeRecord(maintenanceRecords, vehicle.id);
  const latestMileage = getLatestMileageRecord(gasolineRecords, vehicle.id);
  const timeConfig = Number(parameters?.tiempo_cambio_aceite_meses || 0);
  const distanceConfig = Number(parameters?.distancia_cambio_aceite_km || 0);
  const warningMonths = Number(parameters?.aviso_previo_tiempo_aceite_meses || 0);
  const warningDistance = Number(parameters?.aviso_previo_cambio_aceite_km || 0);
  const hasTimeConfig = timeConfig > 0;
  const hasDistanceConfig = distanceConfig > 0;
  const hasTracking = Boolean(latestOilChange) && (hasTimeConfig || hasDistanceConfig);

  if (!hasTracking) {
    return {
      vehicle,
      hasTracking: false,
      status: buildOilStatus({ hasTracking: false }),
      sortScore: Number.POSITIVE_INFINITY,
      note: !latestOilChange
        ? 'Sin cambio de aceite registrado'
        : 'Sin parametros de cambio de aceite'
    };
  }

  const dueDate = hasTimeConfig ? addMonths(latestOilChange.fecha_servicio, timeConfig) : null;
  const baseMileage = latestOilChange.kilometraje_base_aceite !== null && latestOilChange.kilometraje_base_aceite !== undefined
    ? Number(latestOilChange.kilometraje_base_aceite)
    : null;
  const currentMileage = latestMileage?.kilometraje_actual !== null && latestMileage?.kilometraje_actual !== undefined
    ? Number(latestMileage.kilometraje_actual)
    : null;
  const dueMileage = hasDistanceConfig && baseMileage !== null ? baseMileage + distanceConfig : null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueTimeDays = dueDate ? Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const remainingDistance = dueMileage !== null && currentMileage !== null ? dueMileage - currentMileage : null;
  const timeWarning = dueTimeDays !== null && dueTimeDays <= warningMonths * 30;
  const distanceWarning = remainingDistance !== null && remainingDistance <= warningDistance;
  const overdue = (dueTimeDays !== null && dueTimeDays < 0) || (remainingDistance !== null && remainingDistance < 0);
  const requiresAttention = overdue || timeWarning || distanceWarning;

  const timeProgress = hasTimeConfig && dueDate
    ? Math.max(0, Math.min(160, (() => {
        const start = parseDateValue(latestOilChange.fecha_servicio).getTime();
        const end = dueDate.getTime();
        const now = today.getTime();
        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return 0;
        return ((now - start) / (end - start)) * 100;
      })()))
    : null;

  const distanceProgress = hasDistanceConfig && baseMileage !== null && currentMileage !== null
    ? Math.max(0, Math.min(160, ((currentMileage - baseMileage) / distanceConfig) * 100))
    : null;

  const progressCandidates = [timeProgress, distanceProgress].filter((value) => value !== null);
  const sortScore = overdue
    ? -Math.max(...progressCandidates, 101)
    : Math.min(...progressCandidates, Number.POSITIVE_INFINITY);

  return {
    vehicle,
    hasTracking: true,
    latestOilChange,
    dueDate,
    baseMileage,
    currentMileage,
    dueMileage,
    remainingDistance,
    dueTimeDays,
    status: buildOilStatus({ hasTracking: true, requiresAttention, overdue }),
    requiresAttention,
    overdue,
    timeProgress,
    distanceProgress,
    timeRemainingLabel: hasTimeConfig ? buildTimeRemainingLabel(dueDate) : 'Sin parametro por tiempo',
    distanceRemainingLabel: hasDistanceConfig ? buildDistanceRemainingLabel(currentMileage, dueMileage) : 'Sin parametro por km',
    sortScore
  };
};

export default function MaintenanceDashboard() {
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [gasolineRecords, setGasolineRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    vehicleId: 'todos',
    maintenanceType: 'todos',
    provider: 'todos',
    dateFrom: '',
    dateTo: ''
  });
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [recordModalMode, setRecordModalMode] = useState('edit');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('authToken');

        const [vehiclesResponse, maintenanceResponse, gasolineResponse] = await Promise.all([
          fetch('/api/vehicles', {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('/api/maintenance-records', {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch('/api/gasoline-records', {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        const vehiclesData = await vehiclesResponse.json().catch(() => ({}));
        const maintenanceData = await maintenanceResponse.json().catch(() => ({}));
        const gasolineData = await gasolineResponse.json().catch(() => ({}));

        if (!vehiclesResponse.ok) throw new Error(vehiclesData.message || 'No se pudieron cargar los vehiculos');
        if (!maintenanceResponse.ok) throw new Error(maintenanceData.message || 'No se pudieron cargar los mantenimientos');
        if (!gasolineResponse.ok) throw new Error(gasolineData.message || 'No se pudieron cargar los registros de gasolina');

        setVehicles(vehiclesData.vehicles || []);
        setMaintenanceRecords(sortByMaintenanceDateDesc(maintenanceData.maintenanceRecords || []));
        setGasolineRecords(gasolineData.gasolineRecords || []);
        setError(null);
      } catch (fetchError) {
        console.error('Error loading maintenance dashboard:', fetchError);
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const oilTrackingRows = useMemo(() => (
    vehicles
      .map((vehicle) => buildOilTrackingItem(vehicle, maintenanceRecords, gasolineRecords))
      .sort((left, right) => left.sortScore - right.sortScore)
  ), [vehicles, maintenanceRecords, gasolineRecords]);

  const availableMaintenanceTypes = useMemo(() => (
    Array.from(new Set(
      maintenanceRecords
        .map((record) => String(record.tipo_mantenimiento || '').trim())
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right, 'es'))
  ), [maintenanceRecords]);

  const availableProviders = useMemo(() => (
    Array.from(new Set(
      maintenanceRecords
        .map((record) => String(record.proveedor || '').trim())
        .filter(Boolean)
    )).sort((left, right) => left.localeCompare(right, 'es'))
  ), [maintenanceRecords]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = String(filters.search || '').trim().toLowerCase();

    return maintenanceRecords.filter((record) => {
      const matchesVehicle = filters.vehicleId === 'todos'
        ? true
        : String(record.vehiculo_id) === String(filters.vehicleId);
      const matchesType = filters.maintenanceType === 'todos'
        ? true
        : String(record.tipo_mantenimiento || '').trim() === filters.maintenanceType;
      const matchesProvider = filters.provider === 'todos'
        ? true
        : String(record.proveedor || '').trim() === filters.provider;
      const matchesDateFrom = filters.dateFrom ? record.fecha_servicio >= filters.dateFrom : true;
      const matchesDateTo = filters.dateTo ? record.fecha_servicio <= filters.dateTo : true;

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
      return matchesVehicle && matchesType && matchesProvider && matchesDateFrom && matchesDateTo && matchesSearch;
    });
  }, [filters, maintenanceRecords]);

  const totals = useMemo(() => filteredRecords.reduce((acc, record) => ({
    totalCost: acc.totalCost + Number(record.costo || 0),
    oilChanges: acc.oilChanges + (record.es_cambio_aceite ? 1 : 0)
  }), {
    totalCost: 0,
    oilChanges: 0
  }), [filteredRecords]);

  const alertCount = useMemo(() => (
    oilTrackingRows.filter((item) => item.hasTracking && item.requiresAttention).length
  ), [oilTrackingRows]);

  const openNewRecordModal = () => {
    setSelectedRecord(null);
    setIsNewRecord(true);
    setRecordModalMode('edit');
    setRecordModalOpen(true);
  };

  const openViewRecordModal = (record) => {
    setSelectedRecord(record);
    setIsNewRecord(false);
    setRecordModalMode('view');
    setRecordModalOpen(true);
  };

  const openEditRecordModal = (record) => {
    setSelectedRecord(record);
    setIsNewRecord(false);
    setRecordModalMode('edit');
    setRecordModalOpen(true);
  };

  const handleSaveRecord = async (formData, files, recordId) => {
    const token = localStorage.getItem('authToken');
    const payload = new FormData();

    Object.entries(formData).forEach(([key, value]) => {
      payload.append(key, value ?? '');
    });

    files.forEach((file) => {
      payload.append('documento', file);
    });

    const response = await fetch(recordId ? `/api/maintenance-records/${recordId}` : '/api/maintenance-records', {
      method: recordId ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo guardar el mantenimiento');
    }

    const savedRecord = responseData.maintenanceRecord;
    setMaintenanceRecords((current) => {
      const exists = current.some((record) => String(record.id) === String(savedRecord.id));
      const nextRecords = exists
        ? current.map((record) => (String(record.id) === String(savedRecord.id) ? savedRecord : record))
        : [savedRecord, ...current];
      return sortByMaintenanceDateDesc(nextRecords);
    });

    setNotification({
      type: 'success',
      title: 'Exito',
      message: recordId ? 'Mantenimiento actualizado correctamente' : 'Mantenimiento registrado correctamente'
    });
  };

  const handleDeleteRecord = async (recordId) => {
    const confirmed = window.confirm('Seguro que deseas eliminar este registro global de mantenimiento?');
    if (!confirmed) return;

    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/maintenance-records/${recordId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo eliminar el mantenimiento');
    }

    setMaintenanceRecords((current) => current.filter((record) => String(record.id) !== String(recordId)));
    setRecordModalOpen(false);
    setSelectedRecord(null);
    setNotification({
      type: 'success',
      title: 'Exito',
      message: 'Registro eliminado correctamente'
    });
  };

  const handleDownloadFile = async (fileInfo) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(fileInfo.download_url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('No se pudo descargar el archivo');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileInfo.nombre_original || 'archivo';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: downloadError.message || 'No se pudo descargar el archivo'
      });
    }
  };

  const handleDownloadReport = () => {
    if (filteredRecords.length === 0) {
      setNotification({
        type: 'error',
        title: 'Sin datos',
        message: 'No hay mantenimientos dentro de los filtros actuales para exportar.'
      });
      return;
    }

    const rows = filteredRecords.map((record) => ({
      Fecha: formatDate(record.fecha_servicio),
      'Numero Economico': record.vehiculo_numero_economico || '',
      Placa: record.vehiculo_placa || '',
      Vehiculo: record.vehiculo_descripcion || '',
      Titulo: record.titulo || '',
      Tipo: record.tipo_mantenimiento || '',
      Proveedor: record.proveedor || '',
      Costo: Number(record.costo || 0),
      'Cambio de aceite': record.es_cambio_aceite ? 'Si' : 'No',
      'Km base aceite': record.kilometraje_base_aceite ?? '',
      'Fuente km base': record.kilometraje_base_fuente || '',
      Descripcion: record.descripcion || '',
      Observaciones: record.observaciones || '',
      Adjuntos: extractFiles(record).map((file) => file.nombre_original).join(', ')
    }));

    const headers = Object.keys(rows[0]);
    const sheetData = [
      ['', '', 'Registro General de Mantenimiento'],
      [],
      headers,
      ...rows.map((row) => headers.map((header) => row[header]))
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
    worksheet['!cols'] = headers.map((header) => ({ wch: Math.max(header.length + 2, 16) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Mantenimiento');

    const selectedVehicle = filters.vehicleId !== 'todos'
      ? vehicles.find((vehicle) => String(vehicle.id) === String(filters.vehicleId))
      : null;

    const fileName = [
      'reporte-mantenimiento',
      selectedVehicle?.placa || 'todos',
      filters.dateFrom ? formatDateForFileName(filters.dateFrom) : 'inicio-abierto',
      filters.dateTo ? formatDateForFileName(filters.dateTo) : 'fin-abierto'
    ].join('_');

    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  };

  if (loading) {
    return (
      <div className='gasoline-dashboard-state'>
        <div className='spinner' />
        <p>Cargando historial global de mantenimiento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='gasoline-dashboard-state gasoline-dashboard-error'>
        <p>{error}</p>
        <button type='button' className='maintenance-add-btn' onClick={() => window.location.reload()}>
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className='maintenance-section maintenance-dashboard-page'>
      <div className='section-header'>
        <div className='header-left'>
          <div className='header-info'>
            <h2>Mantenimiento</h2>
            <p className='header-caption'>
              Bitacora global de mantenimientos para toda la flotilla con alertas de cambio de aceite y acceso directo por unidad.
            </p>
          </div>
          <button type='button' className='maintenance-add-btn' onClick={handleDownloadReport}>
            Descargar reporte
          </button>
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Resumen</h3>
            <p>Consulta costos, servicios registrados y unidades proximas a cambio de aceite.</p>
          </div>
        </div>

        <div className='gasoline-summary-grid'>
          <div className='gasoline-summary-card'>
            <span>Costo total</span>
            <strong>{formatCurrency(totals.totalCost)}</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>Registros</span>
            <strong>{filteredRecords.length}</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>Cambios de aceite</span>
            <strong>{totals.oilChanges}</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>Unidades en alerta</span>
            <strong>{alertCount}</strong>
          </div>
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Proximos cambios de aceite</h3>
            <p>Las unidades se ordenan de la mas urgente a la menos urgente. Al hacer click abres su modulo de mantenimiento.</p>
          </div>
        </div>

        <div className='oil-alert-list'>
          {oilTrackingRows.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>No hay vehiculos disponibles para analizar.</p>
            </div>
          ) : (
            oilTrackingRows.map((item) => (
              <button
                key={item.vehicle.id}
                type='button'
                className={`oil-alert-row status-${item.status.className}`}
                onClick={() => navigate(`/vehicles/${item.vehicle.id}/edit?section=maintenance`)}
              >
                <div className='oil-alert-main'>
                  <strong>{item.vehicle.placa || 'Sin placa'}</strong>
                  <span>{item.vehicle.numero_economico || '-'} · {item.vehicle.descripcion || item.vehicle.propietario_nombre || 'Sin descripcion'}</span>
                </div>

                <div className='oil-alert-meta'>
                  <span className={`oil-alert-badge badge-${item.status.className}`}>{item.status.label}</span>
                  {item.hasTracking ? (
                    <>
                      <span>{item.timeRemainingLabel}</span>
                      <span>{item.distanceRemainingLabel}</span>
                      <span>Ultimo: {formatDate(item.latestOilChange?.fecha_servicio)}</span>
                    </>
                  ) : (
                    <span>{item.note}</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Historial global</h3>
            <p>Se muestran del mas reciente al mas antiguo y puedes filtrar por unidad, tipo, proveedor y fechas.</p>
          </div>
          <button type='button' className='maintenance-add-btn' onClick={openNewRecordModal}>
            Agregar mantenimiento
          </button>
        </div>

        <div className='gasoline-filter-row maintenance-filter-row'>
          <div className='records-search-field'>
            <label htmlFor='maintenance-global-search'>Buscar</label>
            <input
              id='maintenance-global-search'
              type='search'
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder='Titulo, placa, numero economico, proveedor u observaciones'
            />
          </div>

          <label>
            Vehiculo
            <select
              value={filters.vehicleId}
              onChange={(event) => setFilters((current) => ({ ...current, vehicleId: event.target.value }))}
            >
              <option value='todos'>Todos</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {getVehicleSelectorLabel(vehicle)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tipo
            <select
              value={filters.maintenanceType}
              onChange={(event) => setFilters((current) => ({ ...current, maintenanceType: event.target.value }))}
            >
              <option value='todos'>Todos</option>
              {availableMaintenanceTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            Proveedor
            <select
              value={filters.provider}
              onChange={(event) => setFilters((current) => ({ ...current, provider: event.target.value }))}
            >
              <option value='todos'>Todos</option>
              {availableProviders.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </label>

          <label>
            Fecha inicial
            <input
              type='date'
              value={filters.dateFrom}
              onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
            />
          </label>

          <label>
            Fecha final
            <input
              type='date'
              value={filters.dateTo}
              onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
            />
          </label>
        </div>

        <div className='maintenance-records-list'>
          {maintenanceRecords.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>Aun no hay mantenimientos globales registrados.</p>
              <button type='button' className='maintenance-add-btn maintenance-add-btn-inline' onClick={openNewRecordModal}>
                Registrar primer mantenimiento
              </button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>No hay registros que coincidan con los filtros actuales.</p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const files = extractFiles(record);

              return (
                <div key={record.id} className='maintenance-record-card gasoline-global-card'>
                  <div className='maintenance-record-top'>
                    <div>
                      <h4>{record.titulo || 'Sin titulo'}</h4>
                      <p className='maintenance-record-type'>
                        {record.vehiculo_placa || '-'} · {record.vehiculo_descripcion || 'Sin descripcion'}
                      </p>
                      <p className='maintenance-record-type'>
                        {record.tipo_mantenimiento || 'Sin tipo'}
                        {record.es_cambio_aceite ? ` · Cambio de aceite · Base ${formatNumber(record.kilometraje_base_aceite)} km` : ''}
                      </p>
                    </div>

                    <div className='maintenance-record-actions'>
                      <button type='button' className='ghost-btn' onClick={() => openViewRecordModal(record)}>Ver</button>
                      <button type='button' className='ghost-btn' onClick={() => openEditRecordModal(record)}>Editar</button>
                      <button type='button' className='ghost-btn' onClick={() => navigate(`/vehicles/${record.vehiculo_id}/edit?section=maintenance&maintenanceId=${record.id}`)}>
                        Ir al vehiculo
                      </button>
                      <button type='button' className='danger-btn' onClick={() => handleDeleteRecord(record.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className='maintenance-record-grid'>
                    <div><span className='record-label'>Fecha</span><strong>{formatDate(record.fecha_servicio)}</strong></div>
                    <div><span className='record-label'>Costo</span><strong>{formatCurrency(record.costo)}</strong></div>
                    <div><span className='record-label'>Proveedor</span><strong>{record.proveedor || '-'}</strong></div>
                    <div><span className='record-label'>Numero economico</span><strong>{record.vehiculo_numero_economico || '-'}</strong></div>
                    <div><span className='record-label'>Placa</span><strong>{record.vehiculo_placa || '-'}</strong></div>
                    <div><span className='record-label'>Fuente km base</span><strong>{record.kilometraje_base_fuente || '-'}</strong></div>
                  </div>

                  <div className='maintenance-record-body'>
                    <div>
                      <span className='record-label'>Descripcion</span>
                      <p>{record.descripcion || 'Sin descripcion'}</p>
                    </div>
                    <div>
                      <span className='record-label'>Observaciones</span>
                      <p>{record.observaciones || 'Sin observaciones'}</p>
                    </div>
                  </div>

                  <div className='maintenance-files-inline'>
                    <span className='record-label'>Documentos adjuntos</span>
                    {files.length === 0 ? (
                      <p>Sin adjuntos</p>
                    ) : (
                      <div className='maintenance-inline-files'>
                        {files.map((fileInfo, index) => (
                          <button
                            key={fileInfo.id || index}
                            type='button'
                            className='file-chip'
                            onClick={() => handleDownloadFile(fileInfo)}
                          >
                            {fileInfo.nombre_original}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <GlobalMaintenanceRecordModal
        vehicles={vehicles}
        gasolineRecords={gasolineRecords}
        record={selectedRecord}
        isOpen={recordModalOpen}
        isNew={isNewRecord}
        mode={recordModalMode}
        onClose={() => setRecordModalOpen(false)}
        onSave={handleSaveRecord}
        onEdit={(record) => openEditRecordModal(record)}
        onDelete={(recordId) => handleDeleteRecord(recordId)}
      />

      <NotificationModal
        isOpen={!!notification}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}

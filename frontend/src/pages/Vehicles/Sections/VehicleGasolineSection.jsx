import { useEffect, useMemo, useRef, useState } from 'react';
import { getFuelTypeLabel, normalizeFuelType } from '../../../constants/fuelTypes';
import { getGasolinePerformanceStatus } from '../../../utils/gasolinePerformance';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import GasolineRecordModal from './GasolineRecordModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehicleGasolineSection.css';

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' }
];

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

const formatTimeForInput = (value) => {
  if (!value) return '';

  const match = String(value).match(/^(\d{2}:\d{2})/);
  if (match) return match[1];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

const buildRecordTimestamp = (record) => {
  const parts = parseDateParts(record?.fecha_carga);
  if (!parts) return 0;

  const time = formatTimeForInput(record?.hora_carga) || '00:00';
  const stamp = new Date(`${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}T${time}:00`);
  return Number.isNaN(stamp.getTime()) ? 0 : stamp.getTime();
};

const getRecordDate = (record) => {
  const parts = parseDateParts(record?.fecha_carga);
  if (!parts) return null;

  return new Date(parts.year, parts.month - 1, parts.day);
};

const sortRecordsByDateDesc = (records = []) => (
  [...records].sort((left, right) => {
    const dateDiff = buildRecordTimestamp(right) - buildRecordTimestamp(left);
    if (dateDiff !== 0) return dateDiff;

    const leftCreated = new Date(left?.created_at || 0).getTime();
    const rightCreated = new Date(right?.created_at || 0).getTime();
    return rightCreated - leftCreated;
  })
);

export default function VehicleGasolineSection({
  vehicleId,
  vehicle = null,
  gasolineRecords = [],
  initialRecordId = null,
  onCreateGasolineRecord,
  onUpdateGasolineRecord,
  onDeleteGasolineRecord,
  onBack
}) {
  const [records, setRecords] = useState(gasolineRecords);
  const [notification, setNotification] = useState(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [recordModalMode, setRecordModalMode] = useState('edit');
  const [selectedMonth, setSelectedMonth] = useState('todos');
  const [selectedYear, setSelectedYear] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFuelType, setSelectedFuelType] = useState('todos');
  const [selectedProvider, setSelectedProvider] = useState('todos');
  const openedFromHistoryRef = useRef(null);

  useEffect(() => {
    setRecords(sortRecordsByDateDesc(gasolineRecords));
  }, [gasolineRecords]);

  useEffect(() => {
    if (!initialRecordId) {
      openedFromHistoryRef.current = null;
      return;
    }

    if (openedFromHistoryRef.current === String(initialRecordId)) return;

    const targetRecord = records.find((record) => String(record.id) === String(initialRecordId))
      || gasolineRecords.find((record) => String(record.id) === String(initialRecordId));

    if (!targetRecord) return;

    openViewRecordModal(targetRecord);
    openedFromHistoryRef.current = String(initialRecordId);
  }, [gasolineRecords, initialRecordId, records]);

  const availableYears = useMemo(() => {
    const years = new Set();

    gasolineRecords.forEach((record) => {
      const date = getRecordDate(record);
      if (date) years.add(date.getFullYear());
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [gasolineRecords]);

  const availableFuelTypes = useMemo(() => (
    Array.from(new Set(
      records
        .map((record) => normalizeFuelType(record.tipo_combustible))
        .filter(Boolean)
    ))
  ), [records]);

  const availableProviders = useMemo(() => (
    Array.from(new Set(
      records
        .map((record) => String(record.proveedor || '').trim().toLowerCase())
        .filter(Boolean)
    ))
  ), [records]);

  const filteredRecords = useMemo(() => {
    const normalizedQuery = String(searchTerm || '').trim().toLowerCase();

    return records.filter((record) => {
      const date = getRecordDate(record);
      if (!date) return false;

      const fuelType = normalizeFuelType(record.tipo_combustible);
      const provider = String(record.proveedor || '').trim().toLowerCase();

      const matchesMonth = selectedMonth === 'todos' ? true : date.getMonth() + 1 === Number(selectedMonth);
      const matchesYear = selectedYear === 'todos' ? true : date.getFullYear() === Number(selectedYear);
      const matchesFuelType = selectedFuelType === 'todos' ? true : fuelType === selectedFuelType;
      const matchesProvider = selectedProvider === 'todos' ? true : provider === selectedProvider;

      const searchableText = [
        record.titulo,
        record.factura,
        record.tipo_combustible,
        record.proveedor,
        record.operador,
        record.observaciones
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = normalizedQuery ? searchableText.includes(normalizedQuery) : true;

      return matchesMonth && matchesYear && matchesFuelType && matchesProvider && matchesSearch;
    });
  }, [records, searchTerm, selectedFuelType, selectedMonth, selectedProvider, selectedYear]);

  const overallTotals = useMemo(() => (
    records.reduce((acc, record) => ({
      totalCost: acc.totalCost + Number(record.costo_total || 0),
      totalLiters: acc.totalLiters + Number(record.litros || 0)
    }), { totalCost: 0, totalLiters: 0 })
  ), [records]);

  const monthlyTotals = useMemo(() => (
    filteredRecords.reduce((acc, record) => ({
      totalCost: acc.totalCost + Number(record.costo_total || 0),
      totalLiters: acc.totalLiters + Number(record.litros || 0)
    }), { totalCost: 0, totalLiters: 0 })
  ), [filteredRecords]);

  const formatCurrency = (value) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(value || 0));

  const formatLiters = (value) => `${Number(value || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} L`;

  const formatNumber = (value, maximumFractionDigits = 2) => Number(value || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits
  });

  const formatDate = (value) => {
    if (!value) return '-';
    const parts = parseDateParts(value);
    if (!parts) return value;

    return `${String(parts.day).padStart(2, '0')}-${String(parts.month).padStart(2, '0')}-${parts.year}`;
  };

  const openNewRecordModal = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedRecord(null);
    setIsNewRecord(true);
    setRecordModalMode('edit');
    setRecordModalOpen(true);
  };

  const openViewRecordModal = (record) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedRecord(record);
    setIsNewRecord(false);
    setRecordModalMode('view');
    setRecordModalOpen(true);
  };

  const openEditRecordModal = (record) => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedRecord(record);
    setIsNewRecord(false);
    setRecordModalMode('edit');
    setRecordModalOpen(true);
  };

  const handleSaveRecord = async (formData, files, recordId) => {
    try {
      const savedRecord = recordId
        ? await onUpdateGasolineRecord(recordId, formData, files)
        : await onCreateGasolineRecord(formData, files);

      setRecords((current) => {
        const exists = current.some((record) => record.id === savedRecord.id);
        const nextRecords = exists
          ? current.map((record) => (record.id === savedRecord.id ? savedRecord : record))
          : [savedRecord, ...current];

        return sortRecordsByDateDesc(nextRecords);
      });
      setSelectedRecord((current) => (
        current && String(current.id) === String(savedRecord.id) ? savedRecord : current
      ));

      setNotification({
        type: 'success',
        title: 'Exito',
        message: recordId ? 'Carga actualizada correctamente' : 'Carga registrada correctamente'
      });
      setTimeout(() => setNotification(null), 2500);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo guardar la carga'
      });
      throw error;
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      if (!window.confirm('Seguro que deseas eliminar este registro de gasolina?')) {
        return;
      }

      await onDeleteGasolineRecord(recordId);
      setRecords((current) => sortRecordsByDateDesc(current.filter((record) => record.id !== recordId)));
      setRecordModalOpen(false);
      setSelectedRecord(null);
      setNotification({
        type: 'success',
        title: 'Exito',
        message: 'Registro eliminado correctamente'
      });
      setTimeout(() => setNotification(null), 2500);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo eliminar el registro'
      });
    }
  };

  const handleDownloadGasolineFile = async (fileInfo) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(fileInfo.download_url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileInfo.nombre_original || 'archivo';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo descargar el archivo'
      });
    }
  };

  const summaryLabel = selectedMonth === 'todos' && selectedYear === 'todos'
    ? 'filtros actuales'
    : `${selectedMonth === 'todos' ? 'Todos los meses' : MONTHS.find((month) => month.value === Number(selectedMonth))?.label || ''} ${selectedYear === 'todos' ? '' : selectedYear}`.trim();

  return (
    <div className='maintenance-section'>
      <div className='section-header'>
        <div className='header-left'>
          <button className='btn-back' onClick={onBack}>Volver</button>
          <div className='header-info'>
            <h2>Gasolina</h2>
            <p className='header-caption'>Registro de cargas, litros comprados y gasto del vehiculo</p>
          </div>
        </div>
        <div className='header-right'>
          <button className='maintenance-add-btn' onClick={openNewRecordModal}>Agregar carga</button>
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Resumen de gasolina</h3>
            <p>Consulta el gasto acumulado y el consumo comprado usando los filtros actuales.</p>
          </div>
        </div>

        <div className='gasoline-summary-grid'>
          <div className='gasoline-summary-card'>
            <span>Gasto total historico</span>
            <strong>{formatCurrency(overallTotals.totalCost)}</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>Litros historicos</span>
            <strong>{formatLiters(overallTotals.totalLiters)}</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>Gasto en {summaryLabel}</span>
            <strong>{formatCurrency(monthlyTotals.totalCost)}</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>Litros en {summaryLabel}</span>
            <strong>{formatLiters(monthlyTotals.totalLiters)}</strong>
          </div>
        </div>

        <div className='gasoline-filter-row'>
          <div className='records-search-field'>
            <label htmlFor='gasoline-record-search'>Buscar carga</label>
            <input
              id='gasoline-record-search'
              type='search'
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder='Nombre, factura, proveedor, operador u observaciones'
            />
          </div>

          <label>
            Mes
            <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
              <option value='todos'>Todos</option>
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>

          <label>
            Ano
            <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
              <option value='todos'>Todos</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label>
            Combustible
            <select value={selectedFuelType} onChange={(event) => setSelectedFuelType(event.target.value)}>
              <option value='todos'>Todos</option>
              {availableFuelTypes.map((fuelType) => (
                <option key={fuelType} value={fuelType}>{getFuelTypeLabel(fuelType)}</option>
              ))}
            </select>
          </label>

          <label>
            Proveedor
            <select value={selectedProvider} onChange={(event) => setSelectedProvider(event.target.value)}>
              <option value='todos'>Todos</option>
              {availableProviders.map((provider) => (
                <option key={provider} value={provider}>{provider}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Historial de cargas</h3>
            <p>Se muestran del mas reciente al mas antiguo considerando fecha y hora.</p>
          </div>
          <button type='button' className='maintenance-add-btn' onClick={openNewRecordModal}>
            Agregar carga
          </button>
        </div>

        <div className='maintenance-records-list'>
          {records.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>Aun no hay cargas de gasolina registradas para este vehiculo.</p>
              <button type='button' className='maintenance-add-btn maintenance-add-btn-inline' onClick={openNewRecordModal}>
                Agregar primera carga
              </button>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const files = extractFiles(record);
              const pricePerLiter = Number(record.litros || 0) > 0
                ? Number(record.costo_total || 0) / Number(record.litros || 1)
                : 0;
              const performance = Number(record.litros || 0) > 0
                ? Number(record.kilometros_recorridos || 0) / Number(record.litros || 1)
                : 0;
              const pricePerKm = Number(record.kilometros_recorridos || 0) > 0
                ? Number(record.costo_total || 0) / Number(record.kilometros_recorridos || 1)
                : 0;
              const pricePerM3 = Number(record.m3_enviados || 0) > 0
                ? Number(record.costo_total || 0) / Number(record.m3_enviados || 1)
                : 0;
              const performanceStatus = getGasolinePerformanceStatus({
                record,
                parameters: vehicle?.operationParameters || null
              });

              return (
                <div key={record.id} className={`maintenance-record-card gasoline-performance-card ${performanceStatus.className}`}>
                  <div className='maintenance-record-top'>
                    <div>
                      <h4>{record.titulo || 'Sin nombre de carga'}</h4>
                      <p className='maintenance-record-type'>
                        {record.factura || 'Sin factura'} · {getFuelTypeLabel(record.tipo_combustible)}
                      </p>
                      <div className={`gasoline-performance-badge ${performanceStatus.className}`}>
                        <strong>{performanceStatus.label}</strong>
                        <span>{performanceStatus.detail}</span>
                      </div>
                    </div>
                    <div className='maintenance-record-actions'>
                      <button type='button' className='ghost-btn' onClick={() => openViewRecordModal(record)}>Ver</button>
                      <button type='button' className='ghost-btn' onClick={() => openEditRecordModal(record)}>Editar</button>
                      <button type='button' className='danger-btn' onClick={() => handleDeleteRecord(record.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className='gasoline-record-grid'>
                    <div><span className='record-label'>Factura</span><strong>{record.factura || '-'}</strong></div>
                    <div><span className='record-label'>Fecha</span><strong>{formatDate(record.fecha_carga)}</strong></div>
                    <div><span className='record-label'>Hora</span><strong>{formatTimeForInput(record.hora_carga) || '-'}</strong></div>
                    <div><span className='record-label'>Proveedor</span><strong>{record.proveedor || '-'}</strong></div>
                    <div><span className='record-label'>Combustible</span><strong>{getFuelTypeLabel(record.tipo_combustible)}</strong></div>
                    <div><span className='record-label'>Operador</span><strong>{record.operador || '-'}</strong></div>
                    <div><span className='record-label'>Km actual</span><strong>{formatNumber(record.kilometraje_actual)}</strong></div>
                    <div><span className='record-label'>Km anterior</span><strong>{formatNumber(record.kilometraje_anterior)}</strong></div>
                    <div><span className='record-label'>Km recorridos</span><strong>{formatNumber(record.kilometros_recorridos)}</strong></div>
                    <div><span className='record-label'>Litros</span><strong>{formatLiters(record.litros)}</strong></div>
                    <div><span className='record-label'>Monto</span><strong>{formatCurrency(record.costo_total)}</strong></div>
                    <div><span className='record-label'>Precio por litro</span><strong>{formatCurrency(pricePerLiter)}</strong></div>
                    <div><span className='record-label'>M3 enviados</span><strong>{formatNumber(record.m3_enviados)}</strong></div>
                    <div><span className='record-label'>Rendimiento</span><strong>{formatNumber(performance)} km/L</strong></div>
                    <div><span className='record-label'>Precio por km</span><strong>{formatCurrency(pricePerKm)}</strong></div>
                    <div><span className='record-label'>Precio por m3</span><strong>{formatCurrency(pricePerM3)}</strong></div>
                    <div><span className='record-label'>Primera carga</span><strong>{record.primera_carga ? 'Si' : 'No'}</strong></div>
                  </div>

                  <div className='maintenance-record-body'>
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
                            onClick={() => handleDownloadGasolineFile(fileInfo)}
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

        {records.length > 0 && filteredRecords.length === 0 && (
          <p className='gasoline-empty-note'>
            No hay cargas registradas con los filtros actuales.
          </p>
        )}
      </div>

      <NotificationModal
        isOpen={!!notification}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        onClose={() => setNotification(null)}
      />

      <GasolineRecordModal
        vehicleId={vehicleId}
        vehicle={vehicle}
        records={records}
        record={selectedRecord}
        isOpen={recordModalOpen}
        isNew={isNewRecord}
        mode={recordModalMode}
        onClose={() => setRecordModalOpen(false)}
        onSave={handleSaveRecord}
        onEdit={(currentRecord) => openEditRecordModal(currentRecord)}
        onDelete={(recordId) => handleDeleteRecord(recordId)}
      />
    </div>
  );
}

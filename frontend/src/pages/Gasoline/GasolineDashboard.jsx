import { useEffect, useMemo, useState } from 'react';
import NotificationModal from '../../components/Notifications/NotificationModal';
import '../../components/Notifications/NotificationModal.css';
import GlobalGasolineRecordModal from './GlobalGasolineRecordModal';
import './GasolineDashboard.css';

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

const formatDate = (value) => {
  if (!value) return '-';

  const parts = parseDateParts(value);
  if (!parts) return value;

  return `${String(parts.day).padStart(2, '0')}-${String(parts.month).padStart(2, '0')}-${parts.year}`;
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

export default function GasolineDashboard() {
  const [vehicles, setVehicles] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    vehicleId: 'todos',
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

        const [vehiclesResponse, recordsResponse] = await Promise.all([
          fetch('/api/vehicles', {
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
        const recordsData = await recordsResponse.json().catch(() => ({}));

        if (!vehiclesResponse.ok) {
          throw new Error(vehiclesData.message || 'No se pudieron cargar los vehiculos');
        }

        if (!recordsResponse.ok) {
          throw new Error(recordsData.message || 'No se pudieron cargar los registros de gasolina');
        }

        setVehicles(vehiclesData.vehicles || []);
        setRecords(sortRecordsByDateTimeDesc(recordsData.gasolineRecords || []));
        setError(null);
      } catch (fetchError) {
        console.error('Error loading gasoline dashboard:', fetchError);
        setError(fetchError.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = String(filters.search || '').trim().toLowerCase();

    return records.filter((record) => {
      const matchesVehicle = filters.vehicleId === 'todos'
        ? true
        : String(record.vehiculo_id) === String(filters.vehicleId);
      const matchesDateFrom = filters.dateFrom ? record.fecha_carga >= filters.dateFrom : true;
      const matchesDateTo = filters.dateTo ? record.fecha_carga <= filters.dateTo : true;

      const searchableText = [
        record.titulo,
        record.factura,
        record.proveedor,
        record.operador,
        record.vehiculo_placa,
        record.placa_snapshot,
        record.descripcion_snapshot,
        record.observaciones
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = normalizedSearch ? searchableText.includes(normalizedSearch) : true;

      return matchesVehicle && matchesDateFrom && matchesDateTo && matchesSearch;
    });
  }, [filters, records]);

  const totals = useMemo(() => filteredRecords.reduce((acc, record) => ({
    totalAmount: acc.totalAmount + Number(record.costo_total || 0),
    totalLiters: acc.totalLiters + Number(record.litros || 0),
    totalKm: acc.totalKm + Number(record.kilometros_recorridos || 0),
    totalM3: acc.totalM3 + Number(record.m3_enviados || 0)
  }), {
    totalAmount: 0,
    totalLiters: 0,
    totalKm: 0,
    totalM3: 0
  }), [filteredRecords]);

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

    const response = await fetch(recordId ? `/api/gasoline-records/${recordId}` : '/api/gasoline-records', {
      method: recordId ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: payload
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo guardar el registro');
    }

    const savedRecord = responseData.gasolineRecord;
    setRecords((current) => {
      const exists = current.some((record) => String(record.id) === String(savedRecord.id));
      const nextRecords = exists
        ? current.map((record) => (String(record.id) === String(savedRecord.id) ? savedRecord : record))
        : [savedRecord, ...current];
      return sortRecordsByDateTimeDesc(nextRecords);
    });

    setNotification({
      type: 'success',
      title: 'Exito',
      message: recordId ? 'Carga actualizada correctamente' : 'Carga registrada correctamente'
    });
    window.dispatchEvent(new CustomEvent(GASOLINE_RECORDS_UPDATED_EVENT));
    localStorage.setItem(GASOLINE_RECORDS_UPDATED_STORAGE_KEY, String(Date.now()));

    return savedRecord;
  };

  const handleDeleteRecord = async (recordId) => {
    const confirmed = window.confirm('Seguro que deseas eliminar este registro global de gasolina?');
    if (!confirmed) return;

    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/gasoline-records/${recordId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo eliminar el registro');
    }

    setRecords((current) => current.filter((record) => String(record.id) !== String(recordId)));
    setRecordModalOpen(false);
    setSelectedRecord(null);
    setNotification({
      type: 'success',
      title: 'Exito',
      message: 'Registro eliminado correctamente'
    });
    window.dispatchEvent(new CustomEvent(GASOLINE_RECORDS_UPDATED_EVENT));
    localStorage.setItem(GASOLINE_RECORDS_UPDATED_STORAGE_KEY, String(Date.now()));
  };

  const handleDownloadFile = async (fileInfo) => {
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
    } catch (downloadError) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: downloadError.message || 'No se pudo descargar el archivo'
      });
    }
  };

  if (loading) {
    return (
      <div className='gasoline-dashboard-state'>
        <div className='spinner' />
        <p>Cargando historial global de gasolina...</p>
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
    <div className='maintenance-section gasoline-dashboard'>
      <div className='section-header'>
        <div className='header-left'>
          <div className='header-info'>
            <h2>Gasolina</h2>
            <p className='header-caption'>
              Historial global de cargas para todos los vehiculos con kilometraje, montos, litros y adjuntos.
            </p>
          </div>
        </div>
        <div className='header-right'>
          <button type='button' className='maintenance-add-btn' onClick={openNewRecordModal}>
            Agregar carga
          </button>
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Resumen</h3>
            <p>Consulta montos, litros, kilometros recorridos y m3 enviados del rango filtrado.</p>
          </div>
        </div>

        <div className='gasoline-summary-grid'>
          <div className='gasoline-summary-card'>
            <span>Monto total</span>
            <strong>{formatCurrency(totals.totalAmount)}</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>Litros totales</span>
            <strong>{formatNumber(totals.totalLiters)} L</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>Km recorridos</span>
            <strong>{formatNumber(totals.totalKm)}</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>M3 enviados</span>
            <strong>{formatNumber(totals.totalM3)}</strong>
          </div>
        </div>

        <div className='gasoline-filter-row'>
          <div className='records-search-field'>
            <label htmlFor='gasoline-global-search'>Buscar</label>
            <input
              id='gasoline-global-search'
              type='search'
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder='Factura, placa, proveedor, operador o descripcion'
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
                  {vehicle.placa} - {vehicle.descripcion || vehicle.propietario_nombre}
                </option>
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
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Registros</h3>
            <p>Se muestran del mas reciente al mas antiguo considerando fecha y hora.</p>
          </div>
          <button type='button' className='maintenance-add-btn' onClick={openNewRecordModal}>
            Agregar carga
          </button>
        </div>

        <div className='maintenance-records-list'>
          {records.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>Aun no hay cargas globales registradas.</p>
              <button type='button' className='maintenance-add-btn maintenance-add-btn-inline' onClick={openNewRecordModal}>
                Registrar primera carga
              </button>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>No hay registros que coincidan con los filtros actuales.</p>
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

              return (
                <div key={record.id} className='maintenance-record-card gasoline-global-card'>
                  <div className='maintenance-record-top'>
                    <div>
                      <h4>{record.titulo || 'Sin nombre de carga'}</h4>
                      <p className='maintenance-record-type'>
                        {record.placa_snapshot || record.vehiculo_placa || '-'} · {record.descripcion_snapshot || record.vehiculo_descripcion || 'Sin descripcion'}
                      </p>
                    </div>
                    <div className='maintenance-record-actions'>
                      <button type='button' className='ghost-btn' onClick={() => openViewRecordModal(record)}>Ver</button>
                      <button type='button' className='ghost-btn' onClick={() => openEditRecordModal(record)}>Editar</button>
                      <button type='button' className='danger-btn' onClick={() => handleDeleteRecord(record.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className='gasoline-global-grid'>
                    <div><span className='record-label'>Factura</span><strong>{record.factura || '-'}</strong></div>
                    <div><span className='record-label'>Fecha</span><strong>{formatDate(record.fecha_carga)}</strong></div>
                    <div><span className='record-label'>Hora</span><strong>{record.hora_carga?.slice(0, 5) || '-'}</strong></div>
                    <div><span className='record-label'>Proveedor</span><strong>{record.proveedor || '-'}</strong></div>
                    <div><span className='record-label'>Operador</span><strong>{record.operador || '-'}</strong></div>
                    <div><span className='record-label'>Km actual</span><strong>{formatNumber(record.kilometraje_actual)}</strong></div>
                    <div><span className='record-label'>Km anterior</span><strong>{formatNumber(record.kilometraje_anterior)}</strong></div>
                    <div><span className='record-label'>Km recorridos</span><strong>{formatNumber(record.kilometros_recorridos)}</strong></div>
                    <div><span className='record-label'>Litros</span><strong>{formatNumber(record.litros)} L</strong></div>
                    <div><span className='record-label'>Monto</span><strong>{formatCurrency(record.costo_total)}</strong></div>
                    <div><span className='record-label'>Precio por litro</span><strong>{formatCurrency(pricePerLiter)}</strong></div>
                    <div><span className='record-label'>M3 enviados</span><strong>{formatNumber(record.m3_enviados)}</strong></div>
                    <div><span className='record-label'>Rendimiento</span><strong>{formatNumber(performance)} km/L</strong></div>
                    <div><span className='record-label'>Precio por km</span><strong>{formatCurrency(pricePerKm)}</strong></div>
                    <div><span className='record-label'>Precio por m3</span><strong>{formatCurrency(pricePerM3)}</strong></div>
                    <div><span className='record-label'>Primera carga</span><strong>{record.primera_carga ? 'Si' : 'No'}</strong></div>
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

      <GlobalGasolineRecordModal
        vehicles={vehicles}
        records={records}
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

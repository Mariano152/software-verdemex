import { useEffect, useMemo, useState } from 'react';
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

const getRecordDate = (record) => {
  const date = new Date(record?.fecha_carga);
  return Number.isNaN(date.getTime()) ? null : date;
};

const sortRecordsByDateDesc = (records = []) => {
  return [...records].sort((left, right) => {
    const leftDate = getRecordDate(left);
    const rightDate = getRecordDate(right);

    if (!leftDate && !rightDate) return 0;
    if (!leftDate) return 1;
    if (!rightDate) return -1;

    const dateDiff = rightDate.getTime() - leftDate.getTime();
    if (dateDiff !== 0) return dateDiff;

    const leftCreated = new Date(left?.created_at || 0).getTime();
    const rightCreated = new Date(right?.created_at || 0).getTime();
    return rightCreated - leftCreated;
  });
};

export default function VehicleGasolineSection({
  vehicleId,
  gasolineRecords = [],
  onCreateGasolineRecord,
  onUpdateGasolineRecord,
  onDeleteGasolineRecord,
  onBack
}) {
  const today = new Date();
  const currentMonth = today.getMonth() + 1;
  const currentYear = today.getFullYear();
  const [records, setRecords] = useState(gasolineRecords);
  const [notification, setNotification] = useState(null);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [recordModalMode, setRecordModalMode] = useState('edit');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);

  useEffect(() => {
    setRecords(sortRecordsByDateDesc(gasolineRecords));
  }, [gasolineRecords]);

  const availableYears = useMemo(() => {
    const years = new Set();

    for (let year = currentYear - 10; year <= currentYear + 10; year += 1) {
      years.add(year);
    }

    gasolineRecords.forEach((record) => {
      const date = getRecordDate(record);
      if (date) years.add(date.getFullYear());
    });

    return Array.from(years).sort((a, b) => b - a);
  }, [currentYear, gasolineRecords]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const date = getRecordDate(record);
      if (!date) return false;
      return date.getMonth() + 1 === Number(selectedMonth) && date.getFullYear() === Number(selectedYear);
    });
  }, [records, selectedMonth, selectedYear]);

  const overallTotals = useMemo(() => {
    return records.reduce((acc, record) => ({
      totalCost: acc.totalCost + Number(record.costo_total || 0),
      totalLiters: acc.totalLiters + Number(record.litros || 0)
    }), { totalCost: 0, totalLiters: 0 });
  }, [records]);

  const monthlyTotals = useMemo(() => {
    return filteredRecords.reduce((acc, record) => ({
      totalCost: acc.totalCost + Number(record.costo_total || 0),
      totalLiters: acc.totalLiters + Number(record.litros || 0)
    }), { totalCost: 0, totalLiters: 0 });
  }, [filteredRecords]);

  const formatCurrency = (value) => new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(Number(value || 0));

  const formatLiters = (value) => `${Number(value || 0).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} L`;

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-MX');
  };

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
      if (!window.confirm('¿Seguro que deseas eliminar este registro de gasolina?')) {
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

  const selectedMonthLabel = MONTHS.find((month) => month.value === Number(selectedMonth))?.label || '';

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
            <p>Consulta el gasto acumulado y el consumo comprado por mes y ano.</p>
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
            <span>Gasto en {selectedMonthLabel} {selectedYear}</span>
            <strong>{formatCurrency(monthlyTotals.totalCost)}</strong>
          </div>
          <div className='gasoline-summary-card'>
            <span>Litros en {selectedMonthLabel} {selectedYear}</span>
            <strong>{formatLiters(monthlyTotals.totalLiters)}</strong>
          </div>
        </div>

        <div className='gasoline-filter-row'>
          <label>
            Mes
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))}>
              {MONTHS.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </label>
          <label>
            Ano
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Historial de cargas</h3>
            <p>Guarda cada compra de gasolina con su costo, litros y documentos.</p>
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
            records.map((record) => {
              const files = extractFiles(record);
              const costPerLiter = Number(record.litros || 0) > 0
                ? Number(record.costo_total || 0) / Number(record.litros || 1)
                : 0;

              return (
                <div key={record.id} className='maintenance-record-card'>
                  <div className='maintenance-record-top'>
                    <div>
                      <h4>{record.titulo}</h4>
                      <p className='maintenance-record-type'>{record.tipo_combustible}</p>
                    </div>
                    <div className='maintenance-record-actions'>
                      <button type='button' className='ghost-btn' onClick={() => openViewRecordModal(record)}>Ver</button>
                      <button type='button' className='ghost-btn' onClick={() => openEditRecordModal(record)}>Editar</button>
                      <button type='button' className='danger-btn' onClick={() => handleDeleteRecord(record.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className='gasoline-record-grid'>
                    <div>
                      <span className='record-label'>Fecha</span>
                      <strong>{formatDate(record.fecha_carga)}</strong>
                    </div>
                    <div>
                      <span className='record-label'>Costo</span>
                      <strong>{formatCurrency(record.costo_total)}</strong>
                    </div>
                    <div>
                      <span className='record-label'>Litros</span>
                      <strong>{formatLiters(record.litros)}</strong>
                    </div>
                    <div>
                      <span className='record-label'>Costo por litro</span>
                      <strong>{formatCurrency(costPerLiter)}</strong>
                    </div>
                    <div>
                      <span className='record-label'>Proveedor</span>
                      <strong>{record.proveedor || '-'}</strong>
                    </div>
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
            No hay cargas registradas para {selectedMonthLabel} {selectedYear}.
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
        record={selectedRecord}
        isOpen={recordModalOpen}
        isNew={isNewRecord}
        mode={recordModalMode}
        onClose={() => setRecordModalOpen(false)}
        onSave={handleSaveRecord}
        onEdit={(record) => openEditRecordModal(record)}
        onDelete={(recordId) => handleDeleteRecord(recordId)}
      />
    </div>
  );
}

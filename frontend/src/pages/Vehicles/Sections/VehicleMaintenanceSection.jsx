import { useEffect, useState } from 'react';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import MaintenanceRecordModal from './MaintenanceRecordModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehicleMaintenanceSection.css';

const SAFETY_CATALOG = [
  { id: 1, nombre: 'Rotulacion', descripcion: 'Letras y simbolos de identificacion visible' },
  { id: 2, nombre: 'Luces de iluminacion para trabajo nocturno', descripcion: 'Luces generales y reverseros' },
  { id: 3, nombre: 'Senales de alerta reflejantes', descripcion: 'Senales triangulares y cinta reflectante' },
  { id: 4, nombre: 'Estrobos', descripcion: 'Luces de advertencia intermitentes' },
  { id: 5, nombre: 'Torreta', descripcion: 'Torreta de advertencia en techo' },
  { id: 6, nombre: 'Alarma sonora de reversa', descripcion: 'Alarma audible al retroceder' },
  { id: 7, nombre: 'Arnes y conectores tipo automotriz', descripcion: 'Sistemas de amarre remolque' },
  { id: 8, nombre: 'Equipo de comunicacion', descripcion: 'GPS, telemetria, radio' },
  { id: 9, nombre: 'Extintor', descripcion: 'Extintor de incendios reglamentario' },
  { id: 10, nombre: 'Proteccion anti derrames de liquidos', descripcion: 'Diques y bandejas anti derrames' },
  { id: 11, nombre: 'Equipo de proteccion personal', descripcion: 'Chalecos, cascos, conos reflectantes' }
];

const normalizeStatus = (status) => {
  if (status === 'incorrecto') return 'pendiente';
  return status || '';
};

const normalizeElements = (elements = []) =>
  elements.map((element) => ({
    ...element,
    estatus: normalizeStatus(element.estatus),
    observaciones: element.observaciones || ''
  }));

export default function VehicleMaintenanceSection({
  vehicleId,
  maintenanceRecords = [],
  safetyElements = [],
  vehicleStatus = 'activo',
  onSaveSafety,
  onCreateMaintenanceRecord,
  onUpdateMaintenanceRecord,
  onDeleteMaintenanceRecord,
  onCancel,
  onBack
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedElements, setEditedElements] = useState(normalizeElements(safetyElements));
  const [records, setRecords] = useState(maintenanceRecords);
  const [vehicleState, setVehicleState] = useState(vehicleStatus);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recordModalOpen, setRecordModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [recordModalMode, setRecordModalMode] = useState('edit');

  useEffect(() => {
    setEditedElements(normalizeElements(safetyElements));
    setRecords(maintenanceRecords);
    setVehicleState(vehicleStatus);
  }, [safetyElements, maintenanceRecords, vehicleStatus]);

  const getElementState = (elementId) =>
    editedElements.find((element) => element.elemento_seguridad_id === elementId) || null;

  const getStatusLabel = (status) => {
    if (status === 'correcto') return 'Correcto';
    if (status === 'pendiente') return 'Pendiente';
    if (status === 'no_aplica') return 'No aplica';
    return 'Sin revision';
  };

  const getStateColor = (state) => {
    if (state === 'activo') return '#27ae60';
    if (state === 'inactivo') return '#95a5a6';
    if (state === 'en_mantenimiento') return '#f39c12';
    return '#3498db';
  };

  const getStateLabel = (state) => {
    if (state === 'activo') return 'Activo';
    if (state === 'inactivo') return 'Inactivo';
    if (state === 'en_mantenimiento') return 'Mantenimiento';
    return state;
  };

  const calculateProgress = () => {
    const reviewed = editedElements.filter((element) => element.estatus);
    const correcto = reviewed.filter((element) => element.estatus === 'correcto').length;
    const pendiente = reviewed.filter((element) => element.estatus === 'pendiente').length;
    const noAplica = reviewed.filter((element) => element.estatus === 'no_aplica').length;
    const completados = correcto + noAplica;
    const total = SAFETY_CATALOG.length;

    return {
      percentage: Math.round((completados / total) * 100),
      details: {
        correcto,
        pendiente,
        no_aplica: noAplica,
        revisados: reviewed.length,
        total
      }
    };
  };

  const { percentage, details } = calculateProgress();

  const handleSave = async () => {
    try {
      setLoading(true);

      const cleanedElements = editedElements
        .filter((element) =>
          element.elemento_seguridad_id && (element.estatus || (element.observaciones || '').trim())
        )
        .map((element) => ({
          elemento_seguridad_id: element.elemento_seguridad_id,
          estatus: normalizeStatus(element.estatus || 'pendiente'),
          observaciones: (element.observaciones || '').trim()
        }));

      await onSaveSafety(cleanedElements, vehicleState);

      setNotification({
        type: 'success',
        title: 'Exito',
        message: 'Elementos y estado guardados correctamente'
      });
      setIsEditing(false);
      setTimeout(() => setNotification(null), 2500);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Error al guardar'
      });
    } finally {
      setLoading(false);
    }
  };

  const upsertElement = (elementId, changes) => {
    const existing = getElementState(elementId);

    if (existing) {
      setEditedElements((current) =>
        current.map((element) =>
          element.elemento_seguridad_id === elementId
            ? { ...element, ...changes }
            : element
        )
      );
      return;
    }

    setEditedElements((current) => ([
      ...current,
      {
        elemento_seguridad_id: elementId,
        estatus: '',
        observaciones: '',
        ...changes
      }
    ]));
  };

  const handleStatusChange = (elementId, status) => {
    upsertElement(elementId, { estatus: status });
  };

  const handleObservationChange = (elementId, observaciones) => {
    upsertElement(elementId, { observaciones });
  };

  const formatCurrency = (value) => {
    const amount = Number(value || 0);
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

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
        ? await onUpdateMaintenanceRecord(recordId, formData, files)
        : await onCreateMaintenanceRecord(formData, files);

      setRecords((current) => {
        const exists = current.some((record) => record.id === savedRecord.id);
        return exists
          ? current.map((record) => (record.id === savedRecord.id ? savedRecord : record))
          : [savedRecord, ...current];
      });

      setNotification({
        type: 'success',
        title: 'Exito',
        message: recordId ? 'Registro actualizado correctamente' : 'Registro creado correctamente'
      });
      setTimeout(() => setNotification(null), 2500);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'No se pudo guardar el mantenimiento'
      });
      throw error;
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      if (!window.confirm('¿Seguro que deseas eliminar este registro de mantenimiento?')) {
        return;
      }

      await onDeleteMaintenanceRecord(recordId);
      setRecords((current) => current.filter((record) => record.id !== recordId));
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
        message: error.message || 'No se pudo eliminar el mantenimiento'
      });
    }
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

  const handleDownloadMaintenanceFile = async (fileInfo) => {
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

  return (
    <div className='maintenance-section'>
      <div className='section-header'>
        <div className='header-left'>
          <button className='btn-back' onClick={onBack}>Volver</button>
          <div className='header-info'>
            <h2>Seguridad y Mantenimiento</h2>
            <p className='header-caption'>Estado, historial del vehiculo y checklist de seguridad</p>
          </div>
        </div>
        <div className='header-right'>
          {!isEditing ? (
            <button className='btn-edit' onClick={() => setIsEditing(true)}>Editar</button>
          ) : (
            <div className='header-actions'>
              <button
                className='btn-cancel'
                onClick={() => {
                  setEditedElements(normalizeElements(safetyElements));
                  setVehicleState(vehicleStatus);
                  setIsEditing(false);
                  onCancel?.();
                }}
              >
                Cancelar
              </button>
              <button className='btn-save' onClick={handleSave} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className='state-section'>
        <div className='state-container'>
          <h3>Estado del vehiculo</h3>
          {isEditing ? (
            <div className='state-buttons-group'>
              <button className={`state-btn ${vehicleState === 'activo' ? 'active' : ''}`} onClick={() => setVehicleState('activo')}>
                <span className='state-text'>Activo</span>
              </button>
              <button className={`state-btn ${vehicleState === 'inactivo' ? 'active' : ''}`} onClick={() => setVehicleState('inactivo')}>
                <span className='state-text'>Inactivo</span>
              </button>
              <button className={`state-btn ${vehicleState === 'en_mantenimiento' ? 'active' : ''}`} onClick={() => setVehicleState('en_mantenimiento')}>
                <span className='state-text'>Mantenimiento</span>
              </button>
            </div>
          ) : (
            <div className='state-badge' style={{ backgroundColor: `${getStateColor(vehicleState)}22`, borderColor: getStateColor(vehicleState) }}>
              {getStateLabel(vehicleState)}
            </div>
          )}
        </div>
      </div>

      <div className='maintenance-history-section'>
        <div className='maintenance-history-header'>
          <div>
            <h3>Historial de mantenimiento</h3>
            <p>Registra trabajos realizados, costos y facturas del vehiculo.</p>
          </div>
          <button type='button' className='maintenance-add-btn' onClick={openNewRecordModal}>
            Agregar mantenimiento
          </button>
        </div>

        <div className='maintenance-records-list'>
          {records.length === 0 ? (
            <div className='maintenance-empty-state'>
              <p>Aun no hay mantenimientos registrados para este vehiculo.</p>
              <button type='button' className='maintenance-add-btn maintenance-add-btn-inline' onClick={openNewRecordModal}>
                Agregar primer mantenimiento
              </button>
            </div>
          ) : (
            records.map((record) => {
              const files = extractFiles(record);

              return (
                <div key={record.id} className='maintenance-record-card'>
                  <div className='maintenance-record-top'>
                    <div>
                      <h4>{record.titulo}</h4>
                      <p className='maintenance-record-type'>{record.tipo_mantenimiento}</p>
                    </div>
                    <div className='maintenance-record-actions'>
                      <button type='button' className='ghost-btn' onClick={() => openViewRecordModal(record)}>Ver</button>
                      <button type='button' className='ghost-btn' onClick={() => openEditRecordModal(record)}>Editar</button>
                      <button type='button' className='danger-btn' onClick={() => handleDeleteRecord(record.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className='maintenance-record-grid'>
                    <div>
                      <span className='record-label'>Fecha</span>
                      <strong>{formatDate(record.fecha_servicio)}</strong>
                    </div>
                    <div>
                      <span className='record-label'>Costo</span>
                      <strong>{formatCurrency(record.costo)}</strong>
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
                            onClick={() => handleDownloadMaintenanceFile(fileInfo)}
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

      <div className='elements-section'>
        <div className='elements-section-head'>
          <div>
            <h3>Elementos de seguridad</h3>
            <p className='header-caption'>{details.revisados} de {details.total} elementos revisados</p>
          </div>
        </div>

        <div className='progress-section progress-section-nested'>
          <div className='progress-bar-wrapper'>
            <div className='progress-label-top'>
              <span>Cumplimiento general</span>
              <span className='percentage-big'>{percentage}%</span>
            </div>
            <div className='progress-bar'>
              <div className='progress-fill' style={{ width: `${percentage}%` }}></div>
            </div>
            <p className='progress-note'>
              La completacion solo cuenta elementos en estado <strong>Correcto</strong> o <strong>No aplica</strong>.
            </p>
          </div>

          <div className='completion-table'>
            <div className='completion-row completion-head'>
              <span>Estatus</span>
              <span>Cantidad</span>
            </div>
            <div className='completion-row'>
              <span>Correcto</span>
              <span>{details.correcto}</span>
            </div>
            <div className='completion-row'>
              <span>Pendiente</span>
              <span>{details.pendiente}</span>
            </div>
            <div className='completion-row'>
              <span>No aplica</span>
              <span>{details.no_aplica}</span>
            </div>
          </div>
        </div>

        <div className='elements-list'>
          {SAFETY_CATALOG.map((catalogElement) => {
            const existing = getElementState(catalogElement.id);
            const status = normalizeStatus(existing?.estatus);

            return (
              <div
                key={catalogElement.id}
                className={`element-row ${status ? `status-${status}` : 'status-empty'}`}
              >
                <div className='element-main'>
                  <div className='element-title-group'>
                    <h4>{catalogElement.nombre}</h4>
                    <p>{catalogElement.descripcion}</p>
                  </div>

                  <div className='element-status-block'>
                    {isEditing ? (
                      <div className='status-options'>
                        <button
                          type='button'
                          className={`status-option option-correcto ${status === 'correcto' ? 'active' : ''}`}
                          onClick={() => handleStatusChange(catalogElement.id, 'correcto')}
                        >
                          Correcto
                        </button>
                        <button
                          type='button'
                          className={`status-option option-pendiente ${status === 'pendiente' ? 'active' : ''}`}
                          onClick={() => handleStatusChange(catalogElement.id, 'pendiente')}
                        >
                          Pendiente
                        </button>
                        <button
                          type='button'
                          className={`status-option option-no-aplica ${status === 'no_aplica' ? 'active' : ''}`}
                          onClick={() => handleStatusChange(catalogElement.id, 'no_aplica')}
                        >
                          No aplica
                        </button>
                      </div>
                    ) : (
                      <span className={`status-badge ${status ? `badge-${status}` : 'badge-empty'}`}>
                        {getStatusLabel(status)}
                      </span>
                    )}
                  </div>
                </div>

                <div className='element-observation'>
                  <label htmlFor={`obs-${catalogElement.id}`}>Observacion</label>
                  {isEditing ? (
                    <textarea
                      id={`obs-${catalogElement.id}`}
                      value={existing?.observaciones || ''}
                      onChange={(event) => handleObservationChange(catalogElement.id, event.target.value)}
                      placeholder='Agregar observacion para este elemento'
                      rows={3}
                    />
                  ) : (
                    <div className='observation-readonly'>
                      {existing?.observaciones?.trim() || 'Sin observacion'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <NotificationModal
        isOpen={!!notification}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        onClose={() => setNotification(null)}
      />

      <MaintenanceRecordModal
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

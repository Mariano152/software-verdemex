import { useEffect, useMemo, useRef, useState } from 'react';
import usePopupTopScroll from '../../hooks/usePopupTopScroll';
import { getVehicleSelectorLabel } from '../../utils/vehicleLabels';
import '../Vehicles/Sections/MaintenanceRecordModal.css';
import './MaintenanceDashboard.css';

const buildTodayDate = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  vehiculo_id: '',
  titulo: '',
  tipo_mantenimiento: '',
  fecha_servicio: buildTodayDate(),
  costo: '',
  proveedor: '',
  descripcion: '',
  observaciones: '',
  es_cambio_aceite: false,
  usar_kilometraje_base_manual: false,
  kilometraje_base_aceite_manual: ''
};

const formatDateForInput = (dateValue) => {
  if (!dateValue) return buildTodayDate();
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return buildTodayDate();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const buildGasolineTimestamp = (record) => {
  if (!record?.fecha_carga) return 0;
  const date = new Date(`${record.fecha_carga}T${record.hora_carga || '00:00:00'}`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const findPreviousMileage = ({ gasolineRecords, vehicleId, date, excludeRecordId }) => {
  if (!vehicleId || !date) return null;

  const currentTimestamp = new Date(`${date}T23:59:59`).getTime();
  const previousRecord = [...gasolineRecords]
    .filter((record) => (
      String(record.vehiculo_id) === String(vehicleId)
      && String(record.id) !== String(excludeRecordId || '')
      && record.kilometraje_actual !== null
      && record.kilometraje_actual !== undefined
      && buildGasolineTimestamp(record) <= currentTimestamp
    ))
    .sort((left, right) => buildGasolineTimestamp(right) - buildGasolineTimestamp(left))[0];

  return previousRecord?.kilometraje_actual ?? null;
};

export default function GlobalMaintenanceRecordModal({
  vehicles = [],
  gasolineRecords = [],
  record,
  isOpen,
  isNew = false,
  mode = 'edit',
  onClose,
  onSave,
  onEdit,
  onDelete
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [validationMessage, setValidationMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (isNew || !record) {
      setFormData(EMPTY_FORM);
      setVehicleSearch('');
      setSelectedFiles([]);
      setExistingFiles([]);
      setValidationMessage('');
      return;
    }

    const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === String(record.vehiculo_id));

    setFormData({
      vehiculo_id: record.vehiculo_id || '',
      titulo: record.titulo || '',
      tipo_mantenimiento: record.tipo_mantenimiento || '',
      fecha_servicio: formatDateForInput(record.fecha_servicio),
      costo: record.costo ?? '',
      proveedor: record.proveedor || '',
      descripcion: record.descripcion || '',
      observaciones: record.observaciones || '',
      es_cambio_aceite: Boolean(record.es_cambio_aceite),
      usar_kilometraje_base_manual: record.kilometraje_base_fuente === 'manual',
      kilometraje_base_aceite_manual: record.kilometraje_base_fuente === 'manual'
        ? (record.kilometraje_base_aceite ?? '')
        : ''
    });
    setVehicleSearch(selectedVehicle ? getVehicleSelectorLabel(selectedVehicle) : `${record.vehiculo_placa || ''}`);
    setSelectedFiles([]);
    setExistingFiles(extractFiles(record));
    setValidationMessage('');
  }, [isOpen, isNew, record, vehicles]);

  usePopupTopScroll(isOpen, [overlayRef, modalRef], [mode, record?.id]);

  const vehicleOptions = useMemo(() => vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: getVehicleSelectorLabel(vehicle)
  })), [vehicles]);

  const selectedVehicle = useMemo(() => (
    vehicles.find((vehicle) => String(vehicle.id) === String(formData.vehiculo_id)) || null
  ), [formData.vehiculo_id, vehicles]);

  const autoDetectedMileage = useMemo(() => {
    if (!formData.es_cambio_aceite || formData.usar_kilometraje_base_manual) return null;
    return findPreviousMileage({
      gasolineRecords,
      vehicleId: formData.vehiculo_id,
      date: formData.fecha_servicio,
      excludeRecordId: record?.id
    });
  }, [
    formData.es_cambio_aceite,
    formData.usar_kilometraje_base_manual,
    formData.vehiculo_id,
    formData.fecha_servicio,
    gasolineRecords,
    record?.id
  ]);

  const isViewMode = mode === 'view';

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    if (isViewMode) return;
    setValidationMessage('');
    setFormData((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleVehicleSearchChange = (value) => {
    if (isViewMode) return;

    setVehicleSearch(value);
    const matchedVehicle = vehicleOptions.find((option) => option.label === value);
    handleChange('vehiculo_id', matchedVehicle?.id || '');
  };

  const handleFileChange = (event) => {
    if (isViewMode) return;
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length > 0) {
      setSelectedFiles((current) => [...current, ...files]);
    }
  };

  const handleRemoveSelectedFile = (index) => {
    if (isViewMode) return;
    setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleDownload = async (fileInfo) => {
    try {
      if (!fileInfo?.download_url) return;
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
    } catch {
      // Se ignora dentro del modal para no romper la experiencia.
    }
  };

  const handleSubmit = async () => {
    if (!formData.vehiculo_id) {
      setValidationMessage('Selecciona un vehiculo valido.');
      return;
    }

    if (!String(formData.titulo || '').trim()) {
      setValidationMessage('El titulo del mantenimiento es obligatorio.');
      return;
    }

    if (!String(formData.tipo_mantenimiento || '').trim()) {
      setValidationMessage('El tipo de mantenimiento es obligatorio.');
      return;
    }

    if (!formData.fecha_servicio) {
      setValidationMessage('La fecha de servicio es obligatoria.');
      return;
    }

    if (formData.es_cambio_aceite && formData.usar_kilometraje_base_manual) {
      const manualMileage = Number(formData.kilometraje_base_aceite_manual);
      if (formData.kilometraje_base_aceite_manual === '' || Number.isNaN(manualMileage) || manualMileage < 0) {
        setValidationMessage('Captura un kilometraje base manual valido.');
        return;
      }
    }

    setLoading(true);
    try {
      await onSave(formData, selectedFiles, record?.id || null);
      onClose();
    } catch (saveError) {
      setValidationMessage(saveError.message || 'No se pudo guardar el mantenimiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={overlayRef} className='maintenance-modal-overlay' onClick={onClose}>
      <div ref={modalRef} className='maintenance-modal global-gasoline-modal' onClick={(event) => event.stopPropagation()}>
        <div className='maintenance-modal-header'>
          <div>
            <h3>
              {isNew ? 'Nuevo mantenimiento global' : isViewMode ? 'Detalle del mantenimiento global' : 'Editar mantenimiento global'}
            </h3>
            <p>Selecciona una unidad y registra su ficha de mantenimiento.</p>
          </div>
          <button type='button' className='maintenance-close-btn' onClick={onClose}>Cerrar</button>
        </div>

        <div className='maintenance-modal-grid'>
          <label className='full-width'>
            <span>Vehiculo</span>
            <input
              list='global-maintenance-vehicles'
              value={vehicleSearch}
              onChange={(event) => handleVehicleSearchChange(event.target.value)}
              readOnly={isViewMode}
              placeholder='Busca por numero economico, placa o tipo'
            />
            <datalist id='global-maintenance-vehicles'>
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.label} />
              ))}
            </datalist>
          </label>

          <label>
            <span>Titulo</span>
            <input value={formData.titulo} onChange={(event) => handleChange('titulo', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Tipo de mantenimiento</span>
            <input value={formData.tipo_mantenimiento} onChange={(event) => handleChange('tipo_mantenimiento', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Fecha de servicio</span>
            <input type='date' value={formData.fecha_servicio} onChange={(event) => handleChange('fecha_servicio', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Costo</span>
            <input type='number' min='0' step='0.01' value={formData.costo} onChange={(event) => handleChange('costo', event.target.value)} readOnly={isViewMode} />
          </label>

          <label className='full-width'>
            <span>Proveedor</span>
            <input value={formData.proveedor} onChange={(event) => handleChange('proveedor', event.target.value)} readOnly={isViewMode} />
          </label>

          <label className='full-width'>
            <span>Descripcion</span>
            <textarea rows={4} value={formData.descripcion} onChange={(event) => handleChange('descripcion', event.target.value)} readOnly={isViewMode} />
          </label>

          <label className='full-width'>
            <span>Observaciones</span>
            <textarea rows={3} value={formData.observaciones} onChange={(event) => handleChange('observaciones', event.target.value)} readOnly={isViewMode} />
          </label>

          <label className='full-width maintenance-checkbox-row'>
            <span>Este mantenimiento fue un cambio de aceite</span>
            <input
              type='checkbox'
              checked={Boolean(formData.es_cambio_aceite)}
              onChange={(event) => handleChange('es_cambio_aceite', event.target.checked)}
              disabled={isViewMode}
            />
          </label>

          {formData.es_cambio_aceite ? (
            <>
              <label className='full-width maintenance-checkbox-row'>
                <span>Capturar kilometraje base manual</span>
                <input
                  type='checkbox'
                  checked={Boolean(formData.usar_kilometraje_base_manual)}
                  onChange={(event) => handleChange('usar_kilometraje_base_manual', event.target.checked)}
                  disabled={isViewMode}
                />
              </label>

              <label>
                <span>Kilometraje base del cambio</span>
                <input
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.kilometraje_base_aceite_manual}
                  onChange={(event) => handleChange('kilometraje_base_aceite_manual', event.target.value)}
                  readOnly={isViewMode || !formData.usar_kilometraje_base_manual}
                  placeholder={formData.usar_kilometraje_base_manual ? 'Ej. 1000' : 'Se tomara de gasolina'}
                />
              </label>

              <div className='full-width maintenance-help-note'>
                {formData.usar_kilometraje_base_manual
                  ? 'El kilometraje base se guardara manualmente para este cambio de aceite.'
                  : autoDetectedMileage !== null
                    ? `Se tomara el kilometraje ${Number(autoDetectedMileage).toLocaleString('es-MX')} km de la carga de gasolina mas reciente anterior o igual a la fecha.`
                    : 'Si no existe una carga de gasolina previa para esa fecha, el backend te pedira capturarlo manualmente.'}
              </div>
            </>
          ) : null}

          {selectedVehicle ? (
            <div className='full-width maintenance-vehicle-preview'>
              <strong>{selectedVehicle.placa || '-'}</strong>
              <span>{selectedVehicle.numero_economico || '-'} · {selectedVehicle.descripcion || selectedVehicle.propietario_nombre || 'Sin descripcion'}</span>
            </div>
          ) : null}

          {!isViewMode && (
            <label className='full-width'>
              <span>Documentos adjuntos</span>
              <input type='file' multiple onChange={handleFileChange} />
            </label>
          )}
        </div>

        {validationMessage ? (
          <div className='global-gasoline-validation'>{validationMessage}</div>
        ) : null}

        {existingFiles.length > 0 && (
          <div className='maintenance-files-block'>
            <h4>Archivos actuales</h4>
            <div className='maintenance-files-list'>
              {existingFiles.map((fileInfo, index) => (
                <button key={fileInfo.id || index} type='button' className='maintenance-file-pill' onClick={() => handleDownload(fileInfo)}>
                  {fileInfo.nombre_original}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className='maintenance-files-block'>
            <h4>Archivos nuevos</h4>
            <div className='maintenance-files-list'>
              {selectedFiles.map((fileInfo, index) => (
                <div key={`${fileInfo.name}-${index}`} className='maintenance-file-row'>
                  <span>{fileInfo.name}</span>
                  <button type='button' onClick={() => handleRemoveSelectedFile(index)}>Quitar</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className='maintenance-modal-actions'>
          {isViewMode ? (
            <>
              <button type='button' className='danger-btn-modal' onClick={() => onDelete?.(record?.id)}>Eliminar</button>
              <button type='button' className='secondary-btn' onClick={onClose}>Cerrar</button>
              <button type='button' className='primary-btn' onClick={() => onEdit?.(record)}>Editar</button>
            </>
          ) : (
            <>
              <button type='button' className='secondary-btn' onClick={onClose}>Cancelar</button>
              <button type='button' className='primary-btn' onClick={handleSubmit} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

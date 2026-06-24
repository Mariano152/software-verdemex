import { useEffect, useMemo, useRef, useState } from 'react';
import usePopupTopScroll from '../../hooks/usePopupTopScroll';
import { FUEL_TYPE_OPTIONS, getFuelTypeLabel, normalizeFuelType } from '../../constants/fuelTypes';
import { getVehicleSelectorLabel } from '../../utils/vehicleLabels';
import '../Vehicles/Sections/MaintenanceRecordModal.css';
import './GlobalGasolineRecordModal.css';

const buildTodayDate = () => new Date().toISOString().slice(0, 10);
const buildCurrentTime = () => new Date().toTimeString().slice(0, 5);

const formatDateForInput = (value) => {
  if (!value) return '';

  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const EMPTY_FORM = {
  vehiculo_id: '',
  titulo: '',
  origen_carga: 'gasolinera',
  pipa_id: '',
  tipo_combustible: '',
  factura: '',
  fecha_carga: buildTodayDate(),
  hora_carga: buildCurrentTime(),
  proveedor: '',
  numero_economico_snapshot: '',
  placa_snapshot: '',
  descripcion_snapshot: '',
  kilometraje_actual: '',
  kilometraje_anterior: '0',
  litros: '',
  costo_total: '',
  m3_enviados: '',
  operador: '',
  primera_carga: false,
  observaciones: '',
  inventario_pipa_registro_id: '',
  pipa_nombre_snapshot: '',
  precio_litro_referencia: ''
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

const buildRecordTimestamp = (record) => {
  if (!record?.fecha_carga) return 0;
  const recordDate = formatDateForInput(record.fecha_carga);
  const recordTime = formatTimeForInput(record.hora_carga) || '00:00:00';
  const date = new Date(`${recordDate}T${recordTime}`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const sortRecordsByDateTimeDesc = (records = []) => (
  [...records].sort((left, right) => buildRecordTimestamp(right) - buildRecordTimestamp(left))
);

const findPreviousMileage = ({ records, vehicleId, date, time, excludeRecordId }) => {
  if (!vehicleId) return 0;

  const currentTimestamp = date
    ? new Date(`${date}T${time || '23:59:59'}`).getTime()
    : Number.POSITIVE_INFINITY;

  const previousRecord = sortRecordsByDateTimeDesc(
    records.filter((record) => (
      String(record.vehiculo_id) === String(vehicleId)
      && String(record.id) !== String(excludeRecordId || '')
      && record.kilometraje_actual !== null
      && record.kilometraje_actual !== undefined
      && buildRecordTimestamp(record) <= currentTimestamp
    ))
  )[0];

  return Number(previousRecord?.kilometraje_actual || 0);
};

const getPreviousMileageForForm = ({ records, vehicleId, date, time, excludeRecordId, primeraCarga }) => {
  if (primeraCarga) return null;

  return findPreviousMileage({
    records,
    vehicleId,
    date,
    time,
    excludeRecordId
  });
};

const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const buildInventoryTimestamp = (record) => {
  if (!record?.fecha) return 0;
  const date = new Date(`${record.fecha}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const calculateFifoPreview = ({ inventoryRecords = [], pipaId, liters, date }) => {
  const requestedLiters = parseNumber(liters);
  if (!pipaId || requestedLiters === null || requestedLiters <= 0) return null;

  const maxTimestamp = date ? new Date(`${date}T23:59:59`).getTime() : Number.POSITIVE_INFINITY;
  let remainingLiters = requestedLiters;
  let totalCost = 0;
  const allocations = [];

  const pipaRecords = [...inventoryRecords]
    .filter((record) => (
      String(record.pipa_id) === String(pipaId)
      && buildInventoryTimestamp(record) <= maxTimestamp
    ))
    .sort((left, right) => buildInventoryTimestamp(left) - buildInventoryTimestamp(right));

  for (const record of pipaRecords) {
    if (remainingLiters <= 0) break;

    const availableLiters = parseNumber(record.litros_disponibles) ?? parseNumber(record.litros_comprados) ?? 0;
    if (availableLiters <= 0) continue;

    const unitCost = parseNumber(record.costo_unitario)
      ?? (parseNumber(record.litros_comprados) > 0
        ? Number(record.costo_total_compra || 0) / Number(record.litros_comprados || 1)
        : 0);
    const consumedLiters = Math.min(availableLiters, remainingLiters);
    totalCost += consumedLiters * unitCost;
    allocations.push({ record, consumedLiters, unitCost });
    remainingLiters = Number((remainingLiters - consumedLiters).toFixed(2));
  }

  return {
    complete: remainingLiters <= 0,
    firstRecord: allocations[0]?.record || null,
    totalCost: Number(totalCost.toFixed(2)),
    averageUnitCost: Number((totalCost / requestedLiters).toFixed(4))
  };
};

export default function GlobalGasolineRecordModal({
  vehicles = [],
  records = [],
  pipas = [],
  inventoryRecords = [],
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
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const matchedInventoryRecord = record?.inventario_pipa_registro_id
      ? inventoryRecords.find((item) => String(item.id) === String(record.inventario_pipa_registro_id))
      : null;

    if (isNew || !record) {
      setFormData(EMPTY_FORM);
      setVehicleSearch('');
      setSelectedFiles([]);
      setExistingFiles([]);
      setValidationMessage('');
      return;
    }

    setFormData({
      vehiculo_id: record.vehiculo_id || '',
      titulo: record.titulo || '',
      origen_carga: record.origen_carga || 'gasolinera',
      pipa_id: matchedInventoryRecord?.pipa_id || '',
      tipo_combustible: normalizeFuelType(record.tipo_combustible),
      factura: record.factura || '',
      fecha_carga: formatDateForInput(record.fecha_carga) || buildTodayDate(),
      hora_carga: formatTimeForInput(record.hora_carga) || buildCurrentTime(),
      proveedor: record.proveedor || '',
      numero_economico_snapshot: record.numero_economico_snapshot || record.vehiculo_numero_economico || '',
      placa_snapshot: record.placa_snapshot || record.vehiculo_placa || '',
      descripcion_snapshot: record.descripcion_snapshot || record.vehiculo_descripcion || '',
      kilometraje_actual: record.kilometraje_actual ?? '',
      kilometraje_anterior: record.kilometraje_anterior ?? '0',
      litros: record.litros ?? '',
      costo_total: record.costo_total ?? '',
      m3_enviados: record.m3_enviados ?? '',
      operador: record.operador || '',
      primera_carga: Boolean(record.primera_carga),
      observaciones: record.observaciones || '',
      inventario_pipa_registro_id: record.inventario_pipa_registro_id || '',
      pipa_nombre_snapshot: record.pipa_nombre_snapshot || '',
      precio_litro_referencia: record.precio_litro_referencia ?? ''
    });

    const selectedVehicle = vehicles.find((vehicle) => String(vehicle.id) === String(record.vehiculo_id));
    setVehicleSearch(
      selectedVehicle
        ? getVehicleSelectorLabel(selectedVehicle)
        : `${record.numero_economico_snapshot || record.vehiculo_numero_economico || ''} - ${record.placa_snapshot || record.vehiculo_placa || ''}`
    );
    setExistingFiles(extractFiles(record));
    setSelectedFiles([]);
    setValidationMessage('');
  }, [inventoryRecords, isOpen, isNew, record, vehicles]);

  usePopupTopScroll(isOpen, [overlayRef, modalRef], [mode, record?.id]);

  const vehicleOptions = useMemo(() => vehicles.map((vehicle) => ({
    id: vehicle.id,
    label: getVehicleSelectorLabel(vehicle),
    numeroEconomico: vehicle.numero_economico || '',
    placa: vehicle.placa || '',
    descripcion: vehicle.descripcion || vehicle.propietario_nombre || ''
  })), [vehicles]);

  const selectedVehicle = useMemo(() => (
    vehicles.find((vehicle) => String(vehicle.id) === String(formData.vehiculo_id)) || null
  ), [formData.vehiculo_id, vehicles]);
  const isViewMode = mode === 'view';
  const selectedPipa = useMemo(() => (
    pipas.find((item) => String(item.id) === String(formData.pipa_id)) || null
  ), [formData.pipa_id, pipas]);
  const fifoPreview = useMemo(() => calculateFifoPreview({
    inventoryRecords,
    pipaId: formData.pipa_id,
    liters: formData.litros,
    date: formData.fecha_carga
  }), [formData.fecha_carga, formData.litros, formData.pipa_id, inventoryRecords]);

  useEffect(() => {
    if (!isOpen || mode === 'view') return;
    if (!selectedVehicle) return;

    if (!formData.primera_carga) {
      const previousMileage = findPreviousMileage({
        records,
        vehicleId: selectedVehicle.id,
        date: formData.fecha_carga,
        time: formData.hora_carga,
        excludeRecordId: record?.id
      });

      setFormData((current) => ({
        ...current,
        numero_economico_snapshot: selectedVehicle.numero_economico || '',
        placa_snapshot: selectedVehicle.placa || '',
        descripcion_snapshot: selectedVehicle.descripcion || '',
        kilometraje_anterior: String(previousMileage)
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      numero_economico_snapshot: selectedVehicle.numero_economico || '',
      placa_snapshot: selectedVehicle.placa || '',
      descripcion_snapshot: selectedVehicle.descripcion || ''
    }));
  }, [
    formData.fecha_carga,
    formData.hora_carga,
    formData.primera_carga,
    isOpen,
    mode,
    record?.id,
    records,
    selectedVehicle
  ]);

  useEffect(() => {
    if (!isOpen || isViewMode || formData.origen_carga !== 'pipa') return;

    const nextFuelType = selectedPipa?.tipo_combustible ? normalizeFuelType(selectedPipa.tipo_combustible) : formData.tipo_combustible;
    const selectedPipaRecord = fifoPreview?.firstRecord || null;

    setFormData((current) => ({
      ...current,
      tipo_combustible: nextFuelType || current.tipo_combustible,
      proveedor: current.proveedor || selectedPipaRecord?.proveedor || selectedPipa?.nombre || '',
      inventario_pipa_registro_id: selectedPipaRecord?.id || '',
      pipa_nombre_snapshot: selectedPipa?.nombre || '',
      precio_litro_referencia: fifoPreview?.complete ? String(fifoPreview.averageUnitCost) : '',
      costo_total: fifoPreview?.complete
        ? String(fifoPreview.totalCost.toFixed(2))
        : current.costo_total
    }));
  }, [fifoPreview, formData.origen_carga, formData.tipo_combustible, isOpen, isViewMode, selectedPipa]);

  const currentMileage = parseNumber(formData.kilometraje_actual);
  const previousMileage = parseNumber(formData.kilometraje_anterior) ?? 0;
  const liters = parseNumber(formData.litros);
  const totalAmount = parseNumber(formData.costo_total);
  const sourcePricePerLiter = parseNumber(formData.precio_litro_referencia);
  const m3Sent = parseNumber(formData.m3_enviados);
  const tankCapacity = parseNumber(selectedVehicle?.operationParameters?.capacidad_tanque_litros);
  const kilometersTraveled = currentMileage !== null ? currentMileage - previousMileage : 0;
  const pricePerLiter = liters && liters > 0 && totalAmount !== null ? totalAmount / liters : 0;
  const efficiency = liters && liters > 0 ? kilometersTraveled / liters : 0;
  const pricePerKm = kilometersTraveled > 0 && totalAmount !== null ? totalAmount / kilometersTraveled : 0;
  const pricePerM3 = m3Sent && m3Sent > 0 && totalAmount !== null ? totalAmount / m3Sent : 0;

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    if (isViewMode) return;

    setValidationMessage('');
    setFormData((current) => {
      const next = {
        ...current,
        [field]: value
      };

      if (field === 'origen_carga' && value === 'gasolinera') {
        next.pipa_id = '';
        next.inventario_pipa_registro_id = '';
        next.pipa_nombre_snapshot = '';
        next.precio_litro_referencia = '';
      }

      if (['vehiculo_id', 'fecha_carga', 'hora_carga'].includes(field) && !next.primera_carga) {
        const previousMileage = getPreviousMileageForForm({
          records,
          vehicleId: next.vehiculo_id,
          date: next.fecha_carga,
          time: next.hora_carga,
          excludeRecordId: record?.id,
          primeraCarga: next.primera_carga
        });
        next.kilometraje_anterior = String(previousMileage ?? 0);
      }

      if (field === 'litros' && current.origen_carga === 'pipa' && sourcePricePerLiter !== null) {
        const nextLiters = parseNumber(value);
        next.costo_total = nextLiters !== null && nextLiters > 0
          ? String((nextLiters * sourcePricePerLiter).toFixed(2))
          : '';
      }

      return next;
    });
  };

  const handleVehicleSearchChange = (value) => {
    if (isViewMode) return;

    setVehicleSearch(value);
    const matchedVehicle = vehicleOptions.find((option) => option.label === value);
    if (!matchedVehicle) {
      handleChange('vehiculo_id', '');
      handleChange('numero_economico_snapshot', '');
      handleChange('placa_snapshot', '');
      handleChange('descripcion_snapshot', '');
      return;
    }

    setFormData((current) => ({
      ...current,
      vehiculo_id: matchedVehicle.id,
      numero_economico_snapshot: matchedVehicle.numeroEconomico,
      placa_snapshot: matchedVehicle.placa,
      descripcion_snapshot: matchedVehicle.descripcion
    }));
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
    } catch {
      // El error se ignora dentro del modal para evitar romper la experiencia.
    }
  };

  const handleToggleFirstLoad = () => {
    if (isViewMode) return;

    const nextValue = !formData.primera_carga;
    if (!isNew && record) {
      setFormData((current) => ({
        ...current,
        primera_carga: nextValue
      }));
      return;
    }

    setFormData((current) => ({
      ...current,
      primera_carga: nextValue,
      kilometraje_anterior: nextValue
        ? current.kilometraje_anterior || '0'
        : String(findPreviousMileage({
            records,
            vehicleId: current.vehiculo_id,
            date: current.fecha_carga,
            time: current.hora_carga,
            excludeRecordId: record?.id
          }))
    }));
  };

  const handleSubmit = async () => {
    if (!formData.vehiculo_id) {
      setValidationMessage('Selecciona un vehiculo valido antes de guardar.');
      return;
    }

    if (!String(formData.titulo || '').trim()) {
      setValidationMessage('El nombre de la carga es obligatorio.');
      return;
    }

    if (!String(formData.factura || '').trim()) {
      setValidationMessage('La factura es obligatoria.');
      return;
    }

    if (!formData.tipo_combustible) {
      setValidationMessage('Selecciona el tipo de combustible.');
      return;
    }

    if (formData.origen_carga === 'pipa' && !formData.pipa_id) {
      setValidationMessage('Selecciona la pipa origen.');
      return;
    }

    if (!String(formData.proveedor || '').trim()) {
      setValidationMessage('El proveedor es obligatorio.');
      return;
    }

    if (!formData.fecha_carga) {
      setValidationMessage('La fecha de carga es obligatoria.');
      return;
    }

    if (!formData.hora_carga) {
      setValidationMessage('La hora es obligatoria.');
      return;
    }

    if (!String(formData.placa_snapshot || '').trim()) {
      setValidationMessage('La placa del vehiculo es obligatoria.');
      return;
    }

    if (!String(formData.numero_economico_snapshot || '').trim()) {
      setValidationMessage('El numero economico del vehiculo es obligatorio.');
      return;
    }

    if (currentMileage === null) {
      setValidationMessage('El kilometraje actual es obligatorio.');
      return;
    }

    if (currentMileage <= previousMileage) {
      setValidationMessage('El kilometraje actual debe ser mayor al kilometraje anterior.');
      return;
    }

    if (!liters || liters <= 0) {
      setValidationMessage('Los litros deben ser mayores a 0.');
      return;
    }

    if (tankCapacity && liters > tankCapacity) {
      setValidationMessage(`Los litros no pueden superar la capacidad del tanque (${tankCapacity.toLocaleString('es-MX')} L).`);
      return;
    }

    if (totalAmount === null || totalAmount < 0) {
      setValidationMessage('El monto es obligatorio.');
      return;
    }

    if (m3Sent === null || m3Sent < 0) {
      setValidationMessage('Los m3 enviados son obligatorios.');
      return;
    }

    if (!String(formData.operador || '').trim()) {
      setValidationMessage('El operador es obligatorio.');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...formData,
        tipo_combustible: formData.tipo_combustible,
        kilometraje_anterior: String(previousMileage),
        kilometros_recorridos: String(kilometersTraveled)
      }, selectedFiles, record?.id || null);
      onClose();
    } catch (saveError) {
      setValidationMessage(saveError.message || 'No se pudo guardar el registro.');
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
              {isNew ? 'Nueva carga global de gasolina' : isViewMode ? 'Detalle de la carga global' : 'Editar carga global'}
            </h3>
            <p>Selecciona un vehiculo y registra la carga con sus medidores.</p>
          </div>
          <button type='button' className='maintenance-close-btn' onClick={onClose}>Cerrar</button>
        </div>

        <div className='maintenance-modal-grid'>
          <div className='full-width global-gasoline-source-row'>
            <button type='button' className={`global-toggle-btn ${formData.origen_carga === 'gasolinera' ? 'active' : ''}`} onClick={() => handleChange('origen_carga', 'gasolinera')} disabled={isViewMode}>
              Gasolinera
            </button>
            <button type='button' className={`global-toggle-btn ${formData.origen_carga === 'pipa' ? 'active' : ''}`} onClick={() => handleChange('origen_carga', 'pipa')} disabled={isViewMode}>
              Pipa
            </button>
          </div>

          <label className='full-width'>
            <span>Vehiculo</span>
            <input
              list='global-gasoline-vehicles'
              value={vehicleSearch}
              onChange={(event) => handleVehicleSearchChange(event.target.value)}
              readOnly={isViewMode}
              placeholder='Busca por numero economico, placa o tipo'
            />
            <datalist id='global-gasoline-vehicles'>
              {vehicleOptions.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.label} />
              ))}
            </datalist>
          </label>

          <label>
            <span>Nombre de la carga</span>
            <input value={formData.titulo} onChange={(event) => handleChange('titulo', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Tipo de combustible</span>
            {isViewMode ? (
              <input value={getFuelTypeLabel(formData.tipo_combustible)} readOnly />
            ) : (
              <select value={formData.tipo_combustible} onChange={(event) => handleChange('tipo_combustible', event.target.value)}>
                <option value=''>Selecciona un tipo</option>
                {FUEL_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            )}
          </label>

          {formData.origen_carga === 'pipa' ? (
            <label>
              <span>Pipa origen</span>
              {isViewMode ? (
                <input value={formData.pipa_nombre_snapshot || '-'} readOnly />
              ) : (
                <select value={formData.pipa_id} onChange={(event) => handleChange('pipa_id', event.target.value)}>
                  <option value=''>Selecciona una pipa</option>
                  {pipas.map((pipa) => (
                    <option key={pipa.id} value={pipa.id}>
                      {pipa.nombre} - {getFuelTypeLabel(pipa.tipo_combustible)}
                    </option>
                  ))}
                </select>
              )}
            </label>
          ) : null}

          <label>
            <span>Factura</span>
            <input value={formData.factura} onChange={(event) => handleChange('factura', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Proveedor</span>
            <input value={formData.proveedor} onChange={(event) => handleChange('proveedor', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Fecha</span>
            <input type='date' value={formData.fecha_carga} onChange={(event) => handleChange('fecha_carga', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Hora</span>
            <input type='time' value={formData.hora_carga} onChange={(event) => handleChange('hora_carga', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Numero economico</span>
            <input value={formData.numero_economico_snapshot} readOnly />
          </label>

          <label>
            <span>Placa</span>
            <input value={formData.placa_snapshot} readOnly />
          </label>

          <label>
            <span>Kilometraje actual</span>
            <input type='number' min='0' step='0.01' value={formData.kilometraje_actual} onChange={(event) => handleChange('kilometraje_actual', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Kilometraje anterior</span>
            <input
              type='number'
              min='0'
              step='0.01'
              value={formData.kilometraje_anterior}
              onChange={(event) => handleChange('kilometraje_anterior', event.target.value)}
              readOnly={isViewMode || !formData.primera_carga}
            />
          </label>

          <label>
            <span>Litros</span>
            <input type='number' min='0.01' max={tankCapacity || undefined} step='0.01' value={formData.litros} onChange={(event) => handleChange('litros', event.target.value)} readOnly={isViewMode} />
            {tankCapacity ? <small>Capacidad maxima configurada: {tankCapacity.toLocaleString('es-MX')} L</small> : null}
          </label>

          <label>
            <span>Monto</span>
            <input type='number' min='0' step='0.01' value={formData.costo_total} onChange={(event) => handleChange('costo_total', event.target.value)} readOnly={isViewMode || formData.origen_carga === 'pipa'} />
          </label>

          <label>
            <span>M3 enviados</span>
            <input type='number' min='0' step='0.01' value={formData.m3_enviados} onChange={(event) => handleChange('m3_enviados', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Operador</span>
            <input value={formData.operador} onChange={(event) => handleChange('operador', event.target.value)} readOnly={isViewMode} />
          </label>

          <div className='full-width global-gasoline-toggle-row'>
            <button type='button' className={`global-toggle-btn ${formData.primera_carga ? 'active' : ''}`} onClick={handleToggleFirstLoad} disabled={isViewMode}>
              Primera carga
            </button>
            <p>
              {formData.primera_carga
                ? 'Modo manual activado para kilometraje anterior.'
                : 'Por defecto se toma el kilometraje actual de la carga anterior del vehiculo.'}
            </p>
          </div>

          <div className='full-width global-gasoline-metrics'>
            <div><span>Km recorridos</span><strong>{kilometersTraveled > 0 ? kilometersTraveled.toLocaleString('es-MX') : '0'}</strong></div>
            <div><span>Precio por litro</span><strong>{pricePerLiter.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</strong></div>
            <div><span>Precio ref. pipa</span><strong>{sourcePricePerLiter !== null ? sourcePricePerLiter.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' }) : '-'}</strong></div>
            <div><span>Rendimiento</span><strong>{efficiency.toLocaleString('es-MX', { maximumFractionDigits: 2 })} km/L</strong></div>
            <div><span>Precio por km</span><strong>{pricePerKm.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</strong></div>
            <div><span>Precio por m3</span><strong>{pricePerM3.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</strong></div>
          </div>

          <label className='full-width'>
            <span>Observaciones</span>
            <textarea rows={3} value={formData.observaciones} onChange={(event) => handleChange('observaciones', event.target.value)} readOnly={isViewMode} />
          </label>

          {!isViewMode && (
            <label className='full-width'>
              <span>Documentos adjuntos</span>
              <input type='file' multiple onChange={handleFileChange} />
            </label>
          )}
        </div>

        {validationMessage && (
          <div className='global-gasoline-validation'>
            {validationMessage}
          </div>
        )}

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

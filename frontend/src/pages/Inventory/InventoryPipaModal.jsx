import { useEffect, useMemo, useRef, useState } from 'react';
import usePopupTopScroll from '../../hooks/usePopupTopScroll';
import { FUEL_TYPE_OPTIONS, getFuelTypeLabel, normalizeFuelType } from '../../constants/fuelTypes';
import '../Vehicles/Sections/MaintenanceRecordModal.css';
import '../Gasoline/GlobalGasolineRecordModal.css';

const EMPTY_FORM = {
  nombre: '',
  tipo_combustible: '',
  capacidad_maxima_litros: '',
  observaciones: ''
};

const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatNumber = (value, maximumFractionDigits = 2) => Number(value || 0).toLocaleString('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits
});

export default function InventoryPipaModal({
  pipa,
  isOpen,
  isNew = false,
  mode = 'edit',
  onClose,
  onSave,
  onEdit,
  onDelete
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (isNew || !pipa) {
      setFormData(EMPTY_FORM);
      setValidationMessage('');
      return;
    }

    setFormData({
      nombre: pipa.nombre || '',
      tipo_combustible: normalizeFuelType(pipa.tipo_combustible),
      capacidad_maxima_litros: pipa.capacidad_maxima_litros ?? '',
      observaciones: pipa.observaciones || ''
    });
    setValidationMessage('');
  }, [isOpen, isNew, pipa]);

  usePopupTopScroll(isOpen, [overlayRef, modalRef], [mode, pipa?.id]);

  const isViewMode = mode === 'view';
  const currentLiters = useMemo(() => Number(pipa?.litros_actuales || 0), [pipa?.litros_actuales]);
  const maxCapacity = useMemo(() => Number(pipa?.capacidad_maxima_litros || formData.capacidad_maxima_litros || 0), [formData.capacidad_maxima_litros, pipa?.capacidad_maxima_litros]);
  const fillPercentage = maxCapacity > 0 ? Math.min(100, (currentLiters / maxCapacity) * 100) : 0;

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    if (isViewMode) return;

    setValidationMessage('');
    setFormData((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    if (loading || isViewMode) return;

    if (!String(formData.nombre || '').trim()) {
      setValidationMessage('El nombre de la pipa es obligatorio.');
      return;
    }

    if (!normalizeFuelType(formData.tipo_combustible)) {
      setValidationMessage('Selecciona un tipo de combustible valido.');
      return;
    }

    const capacity = parseNumber(formData.capacidad_maxima_litros);
    if (capacity === null || capacity <= 0) {
      setValidationMessage('La capacidad maxima debe ser mayor a 0.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        nombre: String(formData.nombre || '').trim(),
        tipo_combustible: normalizeFuelType(formData.tipo_combustible),
        capacidad_maxima_litros: String(capacity),
        observaciones: String(formData.observaciones || '').trim()
      }, pipa?.id || null);
      onClose();
    } catch (error) {
      setValidationMessage(error.message || 'No se pudo guardar la pipa.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='maintenance-modal-overlay' ref={overlayRef} onMouseDown={(event) => event.target === overlayRef.current && onClose()}>
      <div className='maintenance-modal' ref={modalRef}>
        <div className='maintenance-modal-header'>
          <div>
            <h3>{isNew ? 'Agregar pipa' : isViewMode ? 'Detalle de pipa' : 'Editar pipa'}</h3>
            <p>Registra la configuracion base de la pipa. La capacidad maxima quedara precargada para las siguientes recargas.</p>
          </div>
          <button type='button' className='maintenance-close-btn' onClick={onClose}>Cerrar</button>
        </div>

        {!isNew && pipa && (
          <div className='global-gasoline-metrics'>
            <div>
              <span>Combustible</span>
              <strong>{getFuelTypeLabel(pipa.tipo_combustible)}</strong>
            </div>
            <div>
              <span>Litros actuales</span>
              <strong>{formatNumber(currentLiters)} L</strong>
            </div>
            <div>
              <span>Capacidad maxima</span>
              <strong>{formatNumber(maxCapacity)} L</strong>
            </div>
            <div>
              <span>Llenado actual</span>
              <strong>{formatNumber(fillPercentage, 1)}%</strong>
            </div>
          </div>
        )}

        <div className='maintenance-modal-grid'>
          <label>
            <span>Nombre de la pipa</span>
            <input value={formData.nombre} onChange={(event) => handleChange('nombre', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Tipo de combustible</span>
            <select value={formData.tipo_combustible} onChange={(event) => handleChange('tipo_combustible', event.target.value)} disabled={isViewMode}>
              <option value=''>Selecciona una opcion</option>
              {FUEL_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Capacidad maxima (L)</span>
            <input type='number' min='0' step='0.01' value={formData.capacidad_maxima_litros} onChange={(event) => handleChange('capacidad_maxima_litros', event.target.value)} readOnly={isViewMode} />
          </label>

          <label className='full-width'>
            <span>Observaciones</span>
            <textarea rows='4' value={formData.observaciones} onChange={(event) => handleChange('observaciones', event.target.value)} readOnly={isViewMode} />
          </label>
        </div>

        {validationMessage ? <div className='global-gasoline-validation'>{validationMessage}</div> : null}

        <div className='maintenance-modal-actions'>
          {isViewMode ? (
            <>
              <button type='button' className='secondary-btn' onClick={() => onEdit?.(pipa)}>Editar</button>
              <button type='button' className='danger-btn-modal' onClick={() => onDelete?.(pipa?.id)}>Eliminar</button>
            </>
          ) : (
            <>
              {!isNew ? <button type='button' className='danger-btn-modal' onClick={() => onDelete?.(pipa?.id)} disabled={loading}>Eliminar</button> : null}
              <button type='button' className='secondary-btn' onClick={onClose} disabled={loading}>Cancelar</button>
              <button type='button' className='primary-btn' onClick={handleSubmit} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

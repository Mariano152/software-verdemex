import { useEffect, useMemo, useRef, useState } from 'react';
import usePopupTopScroll from '../../hooks/usePopupTopScroll';
import { getFuelTypeLabel } from '../../constants/fuelTypes';
import '../Vehicles/Sections/MaintenanceRecordModal.css';
import '../Gasoline/GlobalGasolineRecordModal.css';

const buildTodayDate = () => new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  pipa_id: '',
  fecha: buildTodayDate(),
  lugar: '',
  litros_iniciales: '',
  litros_finales: '',
  costo_total_compra: '',
  factura: '',
  proveedor: '',
  observaciones: ''
};

const parseNumber = (value) => {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const formatDateForInput = (value) => {
  if (!value) return buildTodayDate();
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  return buildTodayDate();
};

const formatCurrency = (value) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN'
}).format(Number(value || 0));

const formatNumber = (value, maximumFractionDigits = 2) => Number(value || 0).toLocaleString('es-MX', {
  minimumFractionDigits: 0,
  maximumFractionDigits
});

export default function InventoryRecordModal({
  pipas = [],
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
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [existingDocument, setExistingDocument] = useState(null);
  const [loading, setLoading] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (isNew || !record) {
      setFormData((current) => ({
        ...EMPTY_FORM,
        pipa_id: pipas[0]?.id || '',
        litros_iniciales: pipas[0] ? String(Number(pipas[0].litros_actuales || 0)) : ''
      }));
      setSelectedDocument(null);
      setExistingDocument(null);
      setValidationMessage('');
      return;
    }

    setFormData({
      pipa_id: record.pipa_id || '',
      fecha: formatDateForInput(record.fecha),
      lugar: record.lugar || '',
      litros_iniciales: record.litros_iniciales ?? '',
      litros_finales: record.litros_finales ?? '',
      costo_total_compra: record.costo_total_compra ?? '',
      factura: record.factura || '',
      proveedor: record.proveedor || '',
      observaciones: record.observaciones || ''
    });
    setSelectedDocument(null);
    setExistingDocument(record.documento || null);
    setValidationMessage('');
  }, [isOpen, isNew, pipas, record]);

  usePopupTopScroll(isOpen, [overlayRef, modalRef], [mode, record?.id]);

  const isViewMode = mode === 'view';
  const selectedPipa = useMemo(
    () => pipas.find((item) => String(item.id) === String(formData.pipa_id)) || null,
    [formData.pipa_id, pipas]
  );

  useEffect(() => {
    if (!isOpen || isViewMode || !isNew || !selectedPipa) return;

    setFormData((current) => ({
      ...current,
      litros_iniciales: String(Number(selectedPipa.litros_actuales || 0))
    }));
  }, [isNew, isOpen, isViewMode, selectedPipa]);

  const initialLiters = parseNumber(formData.litros_iniciales);
  const finalLiters = parseNumber(formData.litros_finales);
  const totalCost = parseNumber(formData.costo_total_compra);
  const litersPurchased = initialLiters !== null && finalLiters !== null ? finalLiters - initialLiters : 0;
  const pricePerLiter = litersPurchased > 0 && totalCost !== null ? totalCost / litersPurchased : 0;

  if (!isOpen) return null;

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
        throw new Error('No se pudo descargar el documento');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileInfo.nombre_original || 'documento';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setValidationMessage(error.message || 'No se pudo descargar el documento.');
    }
  };

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

    if (!formData.pipa_id) {
      setValidationMessage('Selecciona una pipa.');
      return;
    }

    if (!String(formData.fecha || '').trim()) {
      setValidationMessage('La fecha es obligatoria.');
      return;
    }

    if (!String(formData.lugar || '').trim()) {
      setValidationMessage('El lugar es obligatorio.');
      return;
    }

    if (initialLiters === null || initialLiters < 0) {
      setValidationMessage('Los litros iniciales deben ser 0 o mayores.');
      return;
    }

    if (finalLiters === null || finalLiters < 0) {
      setValidationMessage('Los litros finales deben ser 0 o mayores.');
      return;
    }

    if (finalLiters < initialLiters) {
      setValidationMessage('Los litros finales no pueden ser menores a los litros iniciales.');
      return;
    }

    const maxCapacity = Number(selectedPipa?.capacidad_maxima_litros || 0);
    if (maxCapacity > 0 && finalLiters > maxCapacity) {
      setValidationMessage('Los litros finales no pueden superar la capacidad maxima de la pipa.');
      return;
    }

    if (totalCost === null || totalCost < 0) {
      setValidationMessage('El costo total debe ser 0 o mayor.');
      return;
    }

    if (!String(formData.factura || '').trim()) {
      setValidationMessage('La factura es obligatoria.');
      return;
    }

    if (!String(formData.proveedor || '').trim()) {
      setValidationMessage('El proveedor es obligatorio.');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        pipa_id: formData.pipa_id,
        fecha: formData.fecha,
        lugar: String(formData.lugar || '').trim(),
        litros_iniciales: String(initialLiters),
        litros_finales: String(finalLiters),
        costo_total_compra: String(totalCost),
        factura: String(formData.factura || '').trim(),
        proveedor: String(formData.proveedor || '').trim(),
        observaciones: String(formData.observaciones || '').trim()
      }, selectedDocument, record?.id || null);
      onClose();
    } catch (error) {
      setValidationMessage(error.message || 'No se pudo guardar el registro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='maintenance-modal-overlay' ref={overlayRef} onMouseDown={(event) => event.target === overlayRef.current && onClose()}>
      <div className='maintenance-modal global-gasoline-modal' ref={modalRef}>
        <div className='maintenance-modal-header'>
          <div>
            <h3>{isNew ? 'Agregar recarga de pipa' : isViewMode ? 'Detalle de recarga' : 'Editar recarga de pipa'}</h3>
            <p>Registra el inventario antes y despues de la compra. La capacidad maxima se toma de la pipa seleccionada.</p>
          </div>
          <button type='button' className='maintenance-close-btn' onClick={onClose}>Cerrar</button>
        </div>

        <div className='global-gasoline-metrics'>
          <div>
            <span>Combustible</span>
            <strong>{selectedPipa ? getFuelTypeLabel(selectedPipa.tipo_combustible) : 'Sin pipa'}</strong>
          </div>
          <div>
            <span>Capacidad maxima</span>
            <strong>{selectedPipa ? `${formatNumber(selectedPipa.capacidad_maxima_litros)} L` : '-'}</strong>
          </div>
          <div>
            <span>Litros comprados</span>
            <strong>{formatNumber(litersPurchased)} L</strong>
          </div>
          <div>
            <span>Precio por litro</span>
            <strong>{formatCurrency(pricePerLiter)}</strong>
          </div>
        </div>

        <div className='maintenance-modal-grid'>
          <label>
            <span>Pipa</span>
            <select value={formData.pipa_id} onChange={(event) => handleChange('pipa_id', event.target.value)} disabled={isViewMode}>
              <option value=''>Selecciona una pipa</option>
              {pipas.map((item) => (
                <option key={item.id} value={item.id}>{item.nombre} - {getFuelTypeLabel(item.tipo_combustible)}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Fecha</span>
            <input type='date' value={formData.fecha} onChange={(event) => handleChange('fecha', event.target.value)} readOnly={isViewMode} />
          </label>

          <label className='full-width'>
            <span>Lugar</span>
            <input value={formData.lugar} onChange={(event) => handleChange('lugar', event.target.value)} readOnly={isViewMode} placeholder='Ej. Base Puebla, terminal norte' />
          </label>

          <label>
            <span>Factura</span>
            <input value={formData.factura} onChange={(event) => handleChange('factura', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Proveedor</span>
            <input value={formData.proveedor} onChange={(event) => handleChange('proveedor', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Litros iniciales</span>
            <input type='number' min='0' step='0.01' value={formData.litros_iniciales} onChange={(event) => handleChange('litros_iniciales', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Litros finales</span>
            <input type='number' min='0' step='0.01' value={formData.litros_finales} onChange={(event) => handleChange('litros_finales', event.target.value)} readOnly={isViewMode} />
          </label>

          <label>
            <span>Costo total de compra</span>
            <input type='number' min='0' step='0.01' value={formData.costo_total_compra} onChange={(event) => handleChange('costo_total_compra', event.target.value)} readOnly={isViewMode} />
          </label>

          <label className='full-width'>
            <span>Observaciones</span>
            <textarea rows='4' value={formData.observaciones} onChange={(event) => handleChange('observaciones', event.target.value)} readOnly={isViewMode} />
          </label>

          {!isViewMode ? (
            <label className='full-width'>
              <span>Documento</span>
              <input
                type='file'
                name='documento'
                onChange={(event) => setSelectedDocument(event.target.files?.[0] || null)}
              />
            </label>
          ) : null}
        </div>

        {validationMessage ? <div className='global-gasoline-validation'>{validationMessage}</div> : null}

        {existingDocument ? (
          <div className='maintenance-files-block'>
            <h4>Documento actual</h4>
            <div className='maintenance-files-list'>
              <button type='button' className='maintenance-file-pill' onClick={() => handleDownload(existingDocument)}>
                {existingDocument.nombre_original}
              </button>
            </div>
          </div>
        ) : null}

        {selectedDocument ? (
          <div className='maintenance-files-block'>
            <h4>Documento nuevo</h4>
            <div className='maintenance-files-list'>
              <div className='maintenance-file-row'>
                <span>{selectedDocument.name}</span>
                <button type='button' onClick={() => setSelectedDocument(null)}>Quitar</button>
              </div>
            </div>
          </div>
        ) : null}

        <div className='maintenance-modal-actions'>
          {isViewMode ? (
            <>
              <button type='button' className='secondary-btn' onClick={() => onEdit?.(record)}>Editar</button>
              <button type='button' className='danger-btn-modal' onClick={() => onDelete?.(record?.id)}>Eliminar</button>
            </>
          ) : (
            <>
              {!isNew ? <button type='button' className='danger-btn-modal' onClick={() => onDelete?.(record?.id)} disabled={loading}>Eliminar</button> : null}
              <button type='button' className='secondary-btn' onClick={onClose} disabled={loading}>Cancelar</button>
              <button type='button' className='primary-btn' onClick={handleSubmit} disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

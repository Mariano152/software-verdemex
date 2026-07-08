import { useEffect, useRef, useState } from 'react';
import usePopupTopScroll from '../../hooks/usePopupTopScroll';
import './DriverEmergencyContactsSection.css';

const EMPTY_FORM = {
  nombre: '',
  parentesco: '',
  numero_telefono: ''
};

export default function DriverEmergencyContactModal({
  isOpen,
  contact = null,
  mode = 'edit',
  isNew = false,
  onClose,
  onSave,
  onEdit,
  onDelete
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    if (isNew || !contact) {
      setFormData(EMPTY_FORM);
      return;
    }

    setFormData({
      nombre: contact.nombre || '',
      parentesco: contact.parentesco || '',
      numero_telefono: contact.numero_telefono || ''
    });
  }, [contact, isNew, isOpen]);

  usePopupTopScroll(isOpen, [overlayRef, modalRef], [mode, contact?.id]);

  if (!isOpen) return null;

  const isViewMode = mode === 'view';

  const handleChange = (field, value) => {
    if (isViewMode) return;
    setFormData((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(formData, contact?.id || null);
      onClose();
    } catch {
      // El mensaje se muestra en el padre.
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={overlayRef} className="maintenance-modal-overlay" onClick={onClose}>
      <div ref={modalRef} className="maintenance-modal driver-contact-modal" onClick={(event) => event.stopPropagation()}>
        <div className="maintenance-modal-header">
          <div>
            <h3>
              {isNew ? 'Nuevo contacto de emergencia' : isViewMode ? 'Detalle del contacto' : 'Editar contacto'}
            </h3>
            <p>Nombre, parentesco y telefono del contacto</p>
          </div>
          <button type="button" className="maintenance-close-btn" onClick={onClose}>Cerrar</button>
        </div>

        <div className="maintenance-modal-grid">
          <label>
            <span>Nombre</span>
            <input value={formData.nombre} onChange={(event) => handleChange('nombre', event.target.value)} readOnly={isViewMode} />
          </label>
          <label>
            <span>Parentesco</span>
            <input value={formData.parentesco} onChange={(event) => handleChange('parentesco', event.target.value)} readOnly={isViewMode} />
          </label>
          <label className="full-width">
            <span>Numero</span>
            <input value={formData.numero_telefono} onChange={(event) => handleChange('numero_telefono', event.target.value)} readOnly={isViewMode} />
          </label>
        </div>

        <div className="maintenance-modal-actions">
          {isViewMode ? (
            <>
              <button type="button" className="danger-btn-modal" onClick={() => onDelete?.(contact?.id)}>Eliminar</button>
              <button type="button" className="secondary-btn" onClick={onClose}>Cerrar</button>
              <button type="button" className="primary-btn" onClick={() => onEdit?.(contact)}>Editar</button>
            </>
          ) : (
            <>
              <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
              <button type="button" className="primary-btn" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

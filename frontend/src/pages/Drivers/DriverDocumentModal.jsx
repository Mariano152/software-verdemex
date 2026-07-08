import { useEffect, useMemo, useRef, useState } from 'react';
import usePopupTopScroll from '../../hooks/usePopupTopScroll';
import {
  DOCUMENT_STATUS_TIMEZONE,
  getDocumentDerivedStatus,
  getDocumentTimingInput
} from '../Vehicles/Sections/documentExpiryUtils';
import './DriverDocumentsSection.css';

const EMPTY_FORM = {
  nombre_documento: '',
  tipo_documento_id: '',
  vigencia: '',
  observaciones: '',
  estatus: 'vigente'
};

const DOCUMENT_TYPES = [
  { id: 1, nombre: 'Licencia de conducir' },
  { id: 2, nombre: 'Acto medico' },
  { id: 3, nombre: 'INE o identificacion oficial' },
  { id: 4, nombre: 'R control' }
];

const formatDateForInput = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateValue) => {
  if (!dateValue) return 'Sin fecha';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString('es-MX');
};

const parseFiles = (currentDocument) => {
  if (!currentDocument?.archivos_json) return [];

  try {
    const parsed = typeof currentDocument.archivos_json === 'string'
      ? JSON.parse(currentDocument.archivos_json)
      : currentDocument.archivos_json;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getDocumentTypeLabel = (documentOrForm) => {
  const typeId = Number(documentOrForm?.tipo_documento_id || 0);
  return DOCUMENT_TYPES.find((type) => type.id === typeId)?.nombre || 'Sin tipo';
};

const formatFileSize = (sizeInBytes) => {
  const size = Number(sizeInBytes || 0);
  if (!size) return 'Tamano no disponible';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function DriverDocumentModal({
  driverId,
  document,
  isOpen,
  isNew = false,
  mode = 'view',
  onClose,
  onSave,
  onDelete
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [storedVigencia, setStoredVigencia] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [internalMode, setInternalMode] = useState(mode);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasNoExpiry, setHasNoExpiry] = useState(false);
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    setInternalMode(mode);
  }, [mode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (isNew || !document) {
      setFormData(EMPTY_FORM);
      setStoredVigencia('');
      setSelectedFiles([]);
      setExistingFiles([]);
      setErrorMessage('');
      setHasNoExpiry(false);
      return;
    }

    const isNoAplica = document.estatus === 'no_aplica';
    const incomingVigencia = formatDateForInput(document.vigencia);

    setFormData({
      nombre_documento: document.nombre_documento || '',
      tipo_documento_id: String(document.tipo_documento_id || ''),
      vigencia: isNoAplica ? '' : incomingVigencia,
      observaciones: document.observaciones || '',
      estatus: isNoAplica ? 'no_aplica' : getDocumentDerivedStatus(document.vigencia, DOCUMENT_STATUS_TIMEZONE) || 'vigente'
    });
    setStoredVigencia(incomingVigencia);
    setSelectedFiles([]);
    setExistingFiles(parseFiles(document));
    setErrorMessage('');
    setHasNoExpiry(isNoAplica);
  }, [document, isNew, isOpen]);

  usePopupTopScroll(isOpen, [overlayRef, modalRef], [internalMode, document?.id]);

  const isViewMode = !isNew && internalMode === 'view';
  const timing = getDocumentTimingInput(hasNoExpiry ? '__NO_APLICA__' : formData.vigencia, hasNoExpiry ? 'no_aplica' : formData.estatus, DOCUMENT_STATUS_TIMEZONE);

  const summaryCards = useMemo(() => ([
    { label: 'Nombre', value: document?.nombre_documento || formData.nombre_documento || 'Sin nombre' },
    { label: 'Tipo', value: getDocumentTypeLabel(document || formData) },
    {
      label: 'Vigencia',
      value: hasNoExpiry
        ? 'No aplica'
        : formatDateForDisplay(document?.vigencia || formData.vigencia || storedVigencia)
    },
    { label: 'Estatus', value: timing.label }
  ]), [document, formData, hasNoExpiry, storedVigencia, timing.label]);

  if (!isOpen) return null;

  const handleDownload = async (fileInfo) => {
    const token = localStorage.getItem('authToken');
    const separator = fileInfo.download_url.includes('?') ? '&' : '?';
    const response = await fetch(`${fileInfo.download_url}${separator}downloadToken=${encodeURIComponent(token || '')}`);

    if (!response.ok) {
      throw new Error('No se pudo descargar el archivo');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = fileInfo.nombre_original || 'documento';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const addFiles = (filesToAdd) => {
    if (isViewMode || !filesToAdd?.length) return;
    setSelectedFiles((current) => [...current, ...filesToAdd]);
  };

  const handleChange = (field, value) => {
    if (isViewMode) return;
    setFormData((current) => {
      if (field === 'tipo_documento_id') {
        const nextTypeLabel = DOCUMENT_TYPES.find((type) => String(type.id) === String(value))?.nombre || '';
        const currentTypeLabel = DOCUMENT_TYPES.find((type) => String(type.id) === String(current.tipo_documento_id))?.nombre || '';
        const shouldAutofillName =
          !current.nombre_documento.trim() ||
          current.nombre_documento.trim() === currentTypeLabel;

        return {
          ...current,
          [field]: value,
          nombre_documento: shouldAutofillName ? nextTypeLabel : current.nombre_documento
        };
      }

      return {
        ...current,
        [field]: value
      };
    });
    if (field === 'vigencia') {
      setStoredVigencia(value);
    }
  };

  const handleFileInputChange = (event) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    addFiles(files);
    event.target.value = '';
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (!formData.tipo_documento_id) {
        throw new Error('Selecciona un tipo de documento antes de guardar.');
      }

      if (!hasNoExpiry && !formData.vigencia) {
        throw new Error('Captura la vigencia o marca que este documento no vence.');
      }

      await onSave(
        {
          ...formData,
          vigencia: hasNoExpiry ? '' : formData.vigencia,
          estatus: hasNoExpiry ? 'no_aplica' : (getDocumentDerivedStatus(formData.vigencia, DOCUMENT_STATUS_TIMEZONE) || 'vigente')
        },
        selectedFiles,
        document?.id || null
      );
      onClose?.();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el documento');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async () => {
    if (!document?.id) return;
    if (!window.confirm('Seguro que deseas eliminar este documento?')) return;
    await onDelete?.(document.id);
    onClose?.();
  };

  return (
    <div
      ref={overlayRef}
      className="document-modal-overlay"
      onClick={onClose}
      onDragOver={(event) => {
        if (isViewMode) return;
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        if (isViewMode) return;
        event.preventDefault();
        setIsDragging(false);
        addFiles(Array.from(event.dataTransfer.files || []));
      }}
    >
      <div ref={modalRef} className="document-modal-shell" onClick={(event) => event.stopPropagation()}>
        <div className="document-modal-header">
          <div>
            <h3>{isNew ? 'Nuevo documento' : isViewMode ? 'Detalle del documento' : 'Editar documento'}</h3>
            <p>Conductor {driverId}</p>
          </div>
          <button type="button" className="document-close-btn" onClick={onClose}>Cerrar</button>
        </div>

        <div className="document-summary-grid">
          {summaryCards.map((card) => (
            <div key={card.label} className="document-summary-card">
              <span className="document-summary-label">{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>

        {errorMessage && (
          <div className="document-files-block" style={{ marginTop: '0', paddingTop: '0', borderTop: 'none' }}>
            <div className="document-file-card" style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
              <strong style={{ color: '#991b1b' }}>Error</strong>
              <span style={{ color: '#7f1d1d', marginTop: '6px', display: 'block' }}>{errorMessage}</span>
            </div>
          </div>
        )}

        <div className="document-modal-grid driver-document-modal-grid">
          <label className="full-width">
            <span>Nombre del documento</span>
            <input
              type="text"
              value={formData.nombre_documento}
              onChange={(event) => handleChange('nombre_documento', event.target.value)}
              readOnly={isViewMode}
              placeholder="Ej. Licencia federal de Mariano"
            />
          </label>

          <label>
            <span>Tipo de documento</span>
            <select
              value={formData.tipo_documento_id}
              onChange={(event) => handleChange('tipo_documento_id', event.target.value)}
              disabled={isViewMode}
            >
              <option value="">Selecciona un tipo</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.id} value={String(type.id)}>{type.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Vigencia</span>
            {hasNoExpiry ? (
              <input value="No aplica" readOnly />
            ) : (
              <input
                type="date"
                value={formData.vigencia}
                onChange={(event) => handleChange('vigencia', event.target.value)}
                readOnly={isViewMode}
              />
            )}
          </label>

          <label className="full-width">
            <span>Vencimiento</span>
            <div className="document-checkbox-row">
              <input
                type="checkbox"
                checked={hasNoExpiry}
                onChange={(event) => {
                  if (isViewMode) return;
                  const nextValue = event.target.checked;
                  if (!nextValue && storedVigencia) {
                    setFormData((current) => ({ ...current, vigencia: storedVigencia }));
                  }
                  if (nextValue && formData.vigencia) {
                    setStoredVigencia(formData.vigencia);
                  }
                  setHasNoExpiry(nextValue);
                  setFormData((current) => ({
                    ...current,
                    vigencia: nextValue ? '' : (storedVigencia || current.vigencia),
                    estatus: nextValue ? 'no_aplica' : current.estatus
                  }));
                }}
                disabled={isViewMode}
              />
              <span>No aplica: este documento no vence</span>
            </div>
          </label>

          <label className="full-width">
            <span>Observaciones</span>
            <textarea
              rows={4}
              value={formData.observaciones}
              onChange={(event) => handleChange('observaciones', event.target.value)}
              readOnly={isViewMode}
            />
          </label>
        </div>

        {!isViewMode && (
          <div className={`document-files-block document-upload-area ${isDragging ? 'dragging' : ''}`}>
            <label className="document-upload-label">
              <input type="file" multiple name="documento" onChange={handleFileInputChange} hidden />
              <div className="document-upload-copy">
                <span className="document-upload-icon">Adjuntar archivos</span>
                <strong>Arrastra archivos aqui o haz clic para seleccionarlos</strong>
                <span>PDF, imagenes o documentos relacionados con este registro</span>
              </div>
            </label>
          </div>
        )}

        {existingFiles.length > 0 && (
          <div className="document-files-block">
            <h4>Archivos actuales</h4>
            <div className="document-files-list">
              {existingFiles.map((fileInfo, index) => (
                <div key={fileInfo.id || `${fileInfo.nombre_original}-${index}`} className="document-file-card">
                  <div className="document-file-card-head">
                    <div>
                      <strong>{fileInfo.nombre_original || 'Archivo adjunto'}</strong>
                      <span>{formatFileSize(fileInfo.tamano_bytes || fileInfo.tamano)}</span>
                    </div>
                    <button
                      type="button"
                      className="document-file-download-btn"
                      onClick={async () => {
                        try {
                          await handleDownload(fileInfo);
                        } catch (error) {
                          setErrorMessage(error.message || 'No se pudo descargar el archivo');
                        }
                      }}
                    >
                      Descargar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="document-files-block">
            <h4>Archivos nuevos</h4>
            <div className="document-files-list">
              {selectedFiles.map((fileInfo, index) => (
                <div key={`${fileInfo.name}-${index}`} className="document-selected-file-row">
                  <div>
                    <strong>{fileInfo.name}</strong>
                    <span>{formatFileSize(fileInfo.size)}</span>
                  </div>
                  <button type="button" onClick={() => setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))}>
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="document-modal-actions">
          {isViewMode ? (
            <>
              <button type="button" className="document-secondary-btn" onClick={handleDeleteDocument}>Eliminar</button>
              <button type="button" className="document-secondary-btn" onClick={onClose}>Cerrar</button>
              <button type="button" className="document-primary-btn" onClick={() => setInternalMode('edit')}>Editar</button>
            </>
          ) : (
            <>
              {!isNew && (
                <button type="button" className="document-secondary-btn" onClick={handleDeleteDocument}>
                  Eliminar
                </button>
              )}
              <button type="button" className="document-secondary-btn" onClick={onClose}>Cancelar</button>
              <button type="button" className="document-primary-btn" onClick={handleSubmit} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

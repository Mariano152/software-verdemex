import { useEffect, useMemo, useRef, useState } from 'react';
import usePopupTopScroll from '../../hooks/usePopupTopScroll';
import './DriverDocumentsSection.css';

const EMPTY_FORM = {
  nombre: '',
  fecha_registro: '',
  descripcion: ''
};

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const formatFileSize = (sizeInBytes) => {
  const size = Number(sizeInBytes || 0);
  if (!size) return 'Tamano no disponible';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

const parseFiles = (record) => {
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

export default function DriverHistoryModal({
  driverId,
  record,
  isOpen,
  isNew = false,
  mode = 'view',
  onClose,
  onSave,
  onDelete
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [internalMode, setInternalMode] = useState(mode);
  const [errorMessage, setErrorMessage] = useState('');
  const overlayRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    setInternalMode(mode);
  }, [mode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    if (isNew || !record) {
      setFormData({ ...EMPTY_FORM, fecha_registro: getTodayDate() });
      setSelectedFiles([]);
      setExistingFiles([]);
      setErrorMessage('');
      return;
    }

    setFormData({
      nombre: record.nombre || '',
      fecha_registro: record.fecha_registro ? String(record.fecha_registro).slice(0, 10) : '',
      descripcion: record.descripcion || ''
    });
    setSelectedFiles([]);
    setExistingFiles(parseFiles(record));
    setErrorMessage('');
  }, [record, isNew, isOpen]);

  usePopupTopScroll(isOpen, [overlayRef, modalRef], [internalMode, record?.id]);

  const isViewMode = !isNew && internalMode === 'view';

  const summaryCards = useMemo(() => ([
    { label: 'Nombre', value: record?.nombre || formData.nombre || 'Sin nombre' },
    { label: 'Fecha', value: formData.fecha_registro || 'Sin fecha' },
    { label: 'Adjuntos', value: String(existingFiles.length + selectedFiles.length) },
    { label: 'Conductor', value: driverId }
  ]), [driverId, existingFiles.length, formData.fecha_registro, formData.nombre, record?.nombre, selectedFiles.length]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    if (isViewMode) return;
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const addFiles = (filesToAdd) => {
    if (isViewMode || !filesToAdd?.length) return;
    setSelectedFiles((current) => [...current, ...filesToAdd]);
  };

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
    link.download = fileInfo.nombre_original || 'historial';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      if (!formData.nombre.trim()) {
        throw new Error('Captura el nombre del registro antes de guardar.');
      }
      if (!formData.fecha_registro) {
        throw new Error('Captura la fecha del registro antes de guardar.');
      }

      await onSave(
        {
          nombre: formData.nombre.trim(),
          fecha_registro: formData.fecha_registro,
          descripcion: formData.descripcion
        },
        selectedFiles,
        record?.id || null
      );
      onClose?.();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el registro');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!record?.id) return;
    if (!window.confirm('Seguro que deseas eliminar este registro de historial?')) return;
    await onDelete?.(record.id);
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
            <h3>{isNew ? 'Nuevo registro de historial' : isViewMode ? 'Detalle del historial' : 'Editar historial'}</h3>
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
            <span>Nombre</span>
            <input
              type="text"
              value={formData.nombre}
              onChange={(event) => handleChange('nombre', event.target.value)}
              readOnly={isViewMode}
              placeholder="Ej. Lesion en mano derecha"
            />
          </label>

          <label>
            <span>Fecha</span>
            <input
              type="date"
              value={formData.fecha_registro}
              onChange={(event) => handleChange('fecha_registro', event.target.value)}
              readOnly={isViewMode}
            />
          </label>

          <label className="full-width">
            <span>Descripcion</span>
            <textarea
              rows={5}
              value={formData.descripcion}
              onChange={(event) => handleChange('descripcion', event.target.value)}
              readOnly={isViewMode}
              placeholder="Describe que paso, seguimiento o evidencia relevante"
            />
          </label>
        </div>

        {!isViewMode && (
          <div className={`document-files-block document-upload-area ${isDragging ? 'dragging' : ''}`}>
            <label className="document-upload-label">
              <input
                type="file"
                multiple
                name="historial"
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  addFiles(files);
                  event.target.value = '';
                }}
                hidden
              />
              <div className="document-upload-copy">
                <span className="document-upload-icon">Adjuntar archivos</span>
                <strong>Arrastra archivos aqui o haz clic para seleccionarlos</strong>
                <span>Fotos, PDFs, reportes o cualquier evidencia relacionada</span>
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
                    <button type="button" className="document-file-download-btn" onClick={() => handleDownload(fileInfo)}>
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
              <button type="button" className="document-secondary-btn" onClick={handleDeleteRecord}>Eliminar</button>
              <button type="button" className="document-secondary-btn" onClick={onClose}>Cerrar</button>
              <button type="button" className="document-primary-btn" onClick={() => setInternalMode('edit')}>Editar</button>
            </>
          ) : (
            <>
              {!isNew && (
                <button type="button" className="document-secondary-btn" onClick={handleDeleteRecord}>Eliminar</button>
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

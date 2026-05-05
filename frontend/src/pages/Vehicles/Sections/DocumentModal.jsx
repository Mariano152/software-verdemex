import { useEffect, useMemo, useRef, useState } from 'react';
import usePopupTopScroll from '../../../hooks/usePopupTopScroll';
import {
  DOCUMENT_STATUS_TIMEZONE,
  getDocumentDerivedStatus,
  getDocumentTimingInput
} from './documentExpiryUtils';
import './DocumentModal.css';

const EMPTY_FORM = {
  tipo_documento_id: '',
  ambito: 'federal',
  estado: '',
  dependencia_otorga: '',
  vigencia: '',
  folio_oficio: '',
  observaciones: '',
  estatus: 'vigente'
};

const DOCUMENT_TYPES = [
  { id: 1, nombre: 'Titulo de Propiedad' },
  { id: 2, nombre: 'Registro de Circulacion' },
  { id: 3, nombre: 'Seguro de Responsabilidad Civil' },
  { id: 4, nombre: 'Inspeccion Tecnica' },
  { id: 5, nombre: 'Permiso de Circulacion' },
  { id: 6, nombre: 'Placas de Identificacion' },
  { id: 7, nombre: 'Verificacion Vehicular' },
  { id: 8, nombre: 'Otros Documentos' }
];

const AMBITO_OPTIONS = [
  { value: 'federal', label: 'Federal' },
  { value: 'estatal', label: 'Estatal' },
  { value: 'municipal', label: 'Municipal' }
];

const formatDateForInput = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
  if (typeof dateValue === 'string' && /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.test(dateValue)) {
    const [, day, month, year] = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/) || [];
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

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

const formatFileSize = (sizeInBytes) => {
  const size = Number(sizeInBytes || 0);
  if (!size) return 'Tamano no disponible';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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

export default function DocumentModal({
  vehicleId,
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
  const [downloadState, setDownloadState] = useState({});
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
      tipo_documento_id: String(document.tipo_documento_id || ''),
      ambito: document.ambito || 'federal',
      estado: document.estado || '',
      dependencia_otorga: document.dependencia_otorga || '',
      vigencia: isNoAplica ? '' : incomingVigencia,
      folio_oficio: document.folio_oficio || '',
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
  const derivedStatusLabel = timing.label;

  const summaryCards = useMemo(() => ([
    { label: 'Tipo', value: getDocumentTypeLabel(document || formData) },
    {
      label: 'Ambito',
      value: AMBITO_OPTIONS.find((option) => option.value === (document?.ambito || formData.ambito))?.label || 'Sin definir'
    },
    {
      label: 'Vigencia',
      value: hasNoExpiry
        ? 'No aplica'
        : formatDateForDisplay(document?.vigencia || formData.vigencia || storedVigencia)
    },
    { label: 'Archivos', value: String(existingFiles.length + selectedFiles.length) }
  ]), [document, existingFiles.length, formData, hasNoExpiry, selectedFiles.length, storedVigencia]);

  if (!isOpen) return null;

  const addFiles = (filesToAdd) => {
    if (isViewMode || !filesToAdd?.length) return;
    setSelectedFiles((current) => [...current, ...filesToAdd]);
  };

  const handleChange = (field, value) => {
    if (isViewMode) return;
    setFormData((current) => ({
      ...current,
      [field]: value
    }));
    if (field === 'vigencia') {
      setStoredVigencia(value);
    }
  };

  const handleFileInputChange = (event) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    addFiles(files);
    event.target.value = '';
  };

  const handleDeleteExistingFile = async (fileId) => {
    if (!document?.id || !fileId || isViewMode) return;

    if (!window.confirm('Seguro que deseas eliminar este archivo adjunto?')) return;

    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/vehicles/${vehicleId}/documents/${document.id}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo eliminar el archivo');
    }

    setExistingFiles(parseFiles(responseData.document));
    onSave?.(responseData.document);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      if (!formData.tipo_documento_id || !formData.estado.trim() || !formData.dependencia_otorga.trim() || !formData.vigencia || !formData.folio_oficio.trim()) {
        if (hasNoExpiry && formData.tipo_documento_id && formData.estado.trim() && formData.dependencia_otorga.trim() && formData.folio_oficio.trim()) {
          // Permite guardar sin fecha cuando no aplica.
        } else {
          throw new Error('Completa tipo, estado, dependencia, vigencia y folio antes de guardar.');
        }
      }

      if (!hasNoExpiry && !formData.vigencia) {
        throw new Error('Completa tipo, estado, dependencia, vigencia y folio antes de guardar.');
      }

      const token = localStorage.getItem('authToken');
      const payload = new FormData();

      Object.entries(formData).forEach(([key, value]) => {
        if (key === 'estatus') return;
        if (key === 'vigencia') {
          payload.append(key, hasNoExpiry ? '' : (value ?? ''));
          return;
        }
        payload.append(key, value ?? '');
      });

      payload.append(
        'estatus',
        hasNoExpiry ? 'no_aplica' : (getDocumentDerivedStatus(formData.vigencia, DOCUMENT_STATUS_TIMEZONE) || 'vigente')
      );

      selectedFiles.forEach((file) => {
        payload.append('documento', file);
      });

      const endpoint = document?.id
        ? `/api/vehicles/${vehicleId}/documents/${document.id}`
        : `/api/vehicles/${vehicleId}/documents`;

      const response = await fetch(endpoint, {
        method: document?.id ? 'PUT' : 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: payload
      });

      const responseData = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(responseData.message || 'No se pudo guardar el documento');
      }

      onSave?.(responseData.document);
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

    const token = localStorage.getItem('authToken');
    const response = await fetch(`/api/vehicles/${vehicleId}/documents/${document.id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const responseData = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(responseData.message || 'No se pudo eliminar el documento');
    }

    onDelete?.(document.id);
    onClose?.();
  };

  const handleDownload = async (fileInfo, index) => {
    const fileKey = fileInfo.id || `${fileInfo.nombre_original}-${index}`;

    try {
      setDownloadState((current) => ({
        ...current,
        [fileKey]: { progress: 0, status: 'loading', eta: 'Preparando descarga...' }
      }));

      const token = localStorage.getItem('authToken');
      const response = await fetch(fileInfo.download_url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('No se pudo descargar el archivo');
      }

      if (!response.body) {
        const fallbackBlob = await response.blob();
        const fallbackUrl = window.URL.createObjectURL(fallbackBlob);
        const fallbackLink = window.document.createElement('a');
        fallbackLink.href = fallbackUrl;
        fallbackLink.download = fileInfo.nombre_original || 'documento';
        window.document.body.appendChild(fallbackLink);
        fallbackLink.click();
        fallbackLink.remove();
        window.URL.revokeObjectURL(fallbackUrl);
        setDownloadState((current) => ({
          ...current,
          [fileKey]: { progress: 100, status: 'done', eta: 'Descarga completada' }
        }));
        return;
      }

      const totalBytes = Number(response.headers.get('content-length') || fileInfo.tamano_bytes || 0);
      const reader = response.body.getReader();
      const receivedChunks = [];
      let receivedBytes = 0;
      const startedAt = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        receivedChunks.push(value);
        receivedBytes += value.length;

        if (totalBytes > 0) {
          const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
          const speed = receivedBytes / elapsedSeconds;
          const remainingSeconds = Math.max((totalBytes - receivedBytes) / Math.max(speed, 1), 0);
          setDownloadState((current) => ({
            ...current,
            [fileKey]: {
              progress: Math.min(Math.round((receivedBytes / totalBytes) * 100), 100),
              status: 'loading',
              eta: remainingSeconds < 1 ? 'Finalizando...' : `${Math.ceil(remainingSeconds)} s restantes`
            }
          }));
        }
      }

      const blob = new Blob(receivedChunks, {
        type: response.headers.get('content-type') || fileInfo.tipo_mime || 'application/octet-stream'
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = fileInfo.nombre_original || 'documento';
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);

      setDownloadState((current) => ({
        ...current,
        [fileKey]: { progress: 100, status: 'done', eta: 'Descarga completada' }
      }));
    } catch (error) {
      setDownloadState((current) => ({
        ...current,
        [fileKey]: { progress: 0, status: 'error', eta: error.message || 'Error al descargar' }
      }));
      throw error;
    }
  };

  const renderDownloadState = (fileInfo, index) => {
    const fileKey = fileInfo.id || `${fileInfo.nombre_original}-${index}`;
    const state = downloadState[fileKey];
    if (!state) return null;

    return (
      <div className='document-download-progress'>
        <div className='document-download-meta'>
          <span>{state.status === 'done' ? 'Completado' : state.status === 'error' ? 'Error' : 'Descargando'}</span>
          <span>{state.progress}%</span>
        </div>
        <div className='document-download-track'>
          <div className='document-download-bar' style={{ width: `${state.progress}%` }} />
        </div>
        <div className='document-download-eta'>{state.eta}</div>
      </div>
    );
  };

  return (
    <div
      ref={overlayRef}
      className='document-modal-overlay'
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
      <div ref={modalRef} className='document-modal-shell' onClick={(event) => event.stopPropagation()}>
        <div className='document-modal-header'>
          <div>
            <h3>{isNew ? 'Nuevo documento' : isViewMode ? 'Detalle del documento' : 'Editar documento'}</h3>
            <p>Vehiculo {vehicleId}</p>
          </div>
          <button type='button' className='document-close-btn' onClick={onClose}>Cerrar</button>
        </div>

        <div className='document-summary-grid'>
          {summaryCards.map((card) => (
            <div key={card.label} className='document-summary-card'>
              <span className='document-summary-label'>{card.label}</span>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>

        {errorMessage && (
          <div className='document-files-block' style={{ marginTop: '0', paddingTop: '0', borderTop: 'none' }}>
            <div className='document-file-card' style={{ borderColor: '#fecaca', background: '#fef2f2' }}>
              <strong style={{ color: '#991b1b' }}>Error</strong>
              <span style={{ color: '#7f1d1d', marginTop: '6px', display: 'block' }}>{errorMessage}</span>
            </div>
          </div>
        )}

        <div className='document-modal-grid'>
          <label>
            <span>Tipo de documento</span>
            <select
              value={formData.tipo_documento_id}
              onChange={(event) => handleChange('tipo_documento_id', event.target.value)}
              disabled={isViewMode}
            >
              <option value=''>Selecciona un tipo</option>
              {DOCUMENT_TYPES.map((type) => (
                <option key={type.id} value={String(type.id)}>{type.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Ambito</span>
            <select
              value={formData.ambito}
              onChange={(event) => handleChange('ambito', event.target.value)}
              disabled={isViewMode}
            >
              {AMBITO_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Vigencia</span>
            {hasNoExpiry ? (
              <input value='No aplica' readOnly />
            ) : (
              <input
                type='date'
                value={formData.vigencia}
                onChange={(event) => handleChange('vigencia', event.target.value)}
                readOnly={isViewMode}
              />
            )}
          </label>

          <label>
            <span>Estatus</span>
            <input value={derivedStatusLabel} readOnly />
          </label>

          <label className='full-width'>
            <span>Vencimiento</span>
            <div className='document-checkbox-row'>
              <input
                type='checkbox'
                checked={hasNoExpiry}
                onChange={(event) => {
                  if (isViewMode) return;
                  const nextValue = event.target.checked;
                  if (!nextValue && storedVigencia) {
                    setFormData((current) => ({
                      ...current,
                      vigencia: storedVigencia,
                      estatus: current.estatus
                    }));
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
            {hasNoExpiry && storedVigencia && (
              <small className='document-helper-text'>
                Fecha registrada previamente: {formatDateForDisplay(storedVigencia)}
              </small>
            )}
            {!hasNoExpiry && storedVigencia && formData.vigencia === storedVigencia && (
              <small className='document-helper-text'>
                Fecha guardada: {formatDateForDisplay(storedVigencia)}
              </small>
            )}
          </label>

          <label className='full-width'>
            <span>Estado</span>
            <input
              value={formData.estado}
              onChange={(event) => handleChange('estado', event.target.value)}
              readOnly={isViewMode}
              placeholder='Ej. Activo, aprobado, por renovar'
            />
          </label>

          <label className='full-width'>
            <span>Dependencia que otorga</span>
            <input
              value={formData.dependencia_otorga}
              onChange={(event) => handleChange('dependencia_otorga', event.target.value)}
              readOnly={isViewMode}
            />
          </label>

          <label>
            <span>Folio u oficio</span>
            <input
              value={formData.folio_oficio}
              onChange={(event) => handleChange('folio_oficio', event.target.value)}
              readOnly={isViewMode}
            />
          </label>

          <label className='full-width'>
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
            <label className='document-upload-label'>
              <input type='file' multiple name='documento' onChange={handleFileInputChange} hidden />
              <div className='document-upload-copy'>
                <span className='document-upload-icon'>Adjuntar archivos</span>
                <strong>Arrastra archivos aqui o haz clic para seleccionarlos</strong>
                <span>PDF, imagenes o documentos relacionados con este registro</span>
              </div>
            </label>
          </div>
        )}

        {existingFiles.length > 0 && (
          <div className='document-files-block'>
            <h4>Archivos actuales</h4>
            <div className='document-files-list'>
              {existingFiles.map((fileInfo, index) => (
                <div key={fileInfo.id || `${fileInfo.nombre_original}-${index}`} className='document-file-card'>
                  <div className='document-file-card-head'>
                    <div>
                      <strong>{fileInfo.nombre_original || 'Archivo adjunto'}</strong>
                      <span>{formatFileSize(fileInfo.tamano_bytes || fileInfo.tamano)}</span>
                    </div>
                    <div>
                      <button
                        type='button'
                        className='document-file-download-btn'
                        onClick={async () => {
                          try {
                            setErrorMessage('');
                            await handleDownload(fileInfo, index);
                          } catch (error) {
                            setErrorMessage(error.message || 'No se pudo descargar el archivo');
                          }
                        }}
                        disabled={!fileInfo.download_url}
                      >
                        Descargar
                      </button>
                      {!isViewMode && fileInfo.id && (
                        <button
                          type='button'
                          className='document-secondary-btn'
                          style={{ marginLeft: '8px' }}
                          onClick={async () => {
                            try {
                              setErrorMessage('');
                              await handleDeleteExistingFile(fileInfo.id);
                            } catch (error) {
                              setErrorMessage(error.message || 'No se pudo eliminar el archivo');
                            }
                          }}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  </div>
                  {renderDownloadState(fileInfo, index)}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className='document-files-block'>
            <h4>Archivos nuevos</h4>
            <div className='document-files-list'>
              {selectedFiles.map((fileInfo, index) => (
                <div key={`${fileInfo.name}-${index}`} className='document-selected-file-row'>
                  <div>
                    <strong>{fileInfo.name}</strong>
                    <span>{formatFileSize(fileInfo.size)}</span>
                  </div>
                  <button type='button' onClick={() => setSelectedFiles((current) => current.filter((_, currentIndex) => currentIndex !== index))}>
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className='document-modal-actions'>
          {isViewMode ? (
            <>
              <button
                type='button'
                className='document-secondary-btn'
                onClick={async () => {
                  try {
                    setErrorMessage('');
                    await handleDeleteDocument();
                  } catch (error) {
                    setErrorMessage(error.message || 'No se pudo eliminar el documento');
                  }
                }}
              >
                Eliminar
              </button>
              <button type='button' className='document-secondary-btn' onClick={onClose}>Cerrar</button>
              <button type='button' className='document-primary-btn' onClick={() => setInternalMode('edit')}>Editar</button>
            </>
          ) : (
            <>
              {!isNew && (
                <button
                  type='button'
                  className='document-secondary-btn'
                  onClick={async () => {
                    try {
                      setErrorMessage('');
                      await handleDeleteDocument();
                    } catch (error) {
                      setErrorMessage(error.message || 'No se pudo eliminar el documento');
                    }
                  }}
                >
                  Eliminar
                </button>
              )}
              <button type='button' className='document-secondary-btn' onClick={onClose}>Cancelar</button>
              <button
                type='button'
                className='document-primary-btn'
                onClick={async () => {
                  try {
                    await handleSubmit();
                  } catch {
                    // El error ya se refleja en el modal.
                  }
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

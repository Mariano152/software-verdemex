import { useEffect, useMemo, useRef, useState } from 'react';
import usePopupTopScroll from '../../hooks/usePopupTopScroll';
import {
  buildWeekOptions,
  formatWeekRangeLabel,
  getTodayDateString,
  getWeekRange,
  resolveWeekFromDate
} from './driverRatingWeeks';
import './DriverDocumentsSection.css';

const EMPTY_FORM = {
  fecha_registro: '',
  rating_year: '',
  week_number: '1',
  calificacion: '',
  descripcion: ''
};

const formatFileSize = (sizeInBytes) => {
  const size = Number(sizeInBytes || 0);
  if (!size) return 'Tamaño no disponible';
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

const formatDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function DriverRatingModal({
  driverId,
  record,
  isOpen,
  isNew = false,
  mode = 'view',
  defaultWeekContext = null,
  lockWeekSelection = false,
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
      const currentWeek = defaultWeekContext || resolveWeekFromDate(getTodayDateString());
      setFormData({
        ...EMPTY_FORM,
        fecha_registro: getTodayDateString(),
        rating_year: String(currentWeek?.ratingYear || new Date().getFullYear()),
        week_number: String(currentWeek?.weekNumber || 1)
      });
      setSelectedFiles([]);
      setExistingFiles([]);
      setErrorMessage('');
      return;
    }

    const resolvedWeek = record.rating_year && record.week_number
      ? getWeekRange(record.rating_year, record.week_number)
      : resolveWeekFromDate(formatDate(record.semana_inicio) || formatDate(record.fecha_registro));

    setFormData({
      fecha_registro: formatDate(record.fecha_registro),
      rating_year: String(record.rating_year || resolvedWeek?.ratingYear || ''),
      week_number: String(record.week_number || resolvedWeek?.weekNumber || ''),
      calificacion: String(record.calificacion || ''),
      descripcion: record.descripcion || ''
    });
    setSelectedFiles([]);
    setExistingFiles(parseFiles(record));
    setErrorMessage('');
  }, [record, isNew, isOpen, defaultWeekContext]);

  usePopupTopScroll(isOpen, [overlayRef, modalRef], [internalMode, record?.id]);

  const isViewMode = !isNew && internalMode === 'view';
  const selectedWeekRange = useMemo(
    () => getWeekRange(formData.rating_year, formData.week_number),
    [formData.rating_year, formData.week_number]
  );
  const weekOptions = useMemo(
    () => buildWeekOptions(formData.rating_year || new Date().getFullYear()),
    [formData.rating_year]
  );

  const summaryCards = useMemo(() => ([
    { label: 'Calificación', value: formData.calificacion || String(record?.calificacion || '-') },
    {
      label: 'Semana',
      value: selectedWeekRange
        ? `Semana ${selectedWeekRange.weekNumber} | ${formatWeekRangeLabel(selectedWeekRange.semana_inicio, selectedWeekRange.semana_fin)}`
        : '-'
    },
    { label: 'Adjuntos', value: String(existingFiles.length + selectedFiles.length) }
  ]), [existingFiles.length, formData.calificacion, record?.calificacion, selectedFiles.length, selectedWeekRange]);

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
    link.download = fileInfo.nombre_original || 'rating';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const handleSubmit = async () => {
    setIsSaving(true);
    setErrorMessage('');
    try {
      if (!formData.rating_year) throw new Error('Captura el año del rating.');
      if (!formData.week_number) throw new Error('Selecciona la semana del rating.');
      if (!formData.calificacion) throw new Error('Captura la calificación.');
      if (Number(formData.calificacion) <= 0 || Number(formData.calificacion) > 10) {
        throw new Error('La calificación debe ser mayor que 0 y menor o igual a 10.');
      }
      if (!selectedWeekRange) throw new Error('No se pudo calcular el rango de la semana seleccionada.');

      await onSave(
        {
          fecha_registro: formData.fecha_registro || getTodayDateString(),
          rating_year: formData.rating_year,
          week_number: formData.week_number,
          calificacion: formData.calificacion,
          descripcion: formData.descripcion
        },
        selectedFiles,
        record?.id || null
      );
      onClose?.();
    } catch (error) {
      setErrorMessage(error.message || 'No se pudo guardar el rating');
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!record?.id) return;
    if (!window.confirm('Seguro que deseas eliminar este rating?')) return;
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
            <h3>{isNew ? 'Nuevo rating semanal' : isViewMode ? 'Detalle del rating' : 'Editar rating'}</h3>
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
          <label>
            <span>Año del rating</span>
            <input
              type="number"
              min="2020"
              max="2100"
              value={formData.rating_year}
              onChange={(event) => handleChange('rating_year', event.target.value)}
              readOnly={isViewMode || lockWeekSelection}
            />
          </label>

          <label>
            <span>Calificación</span>
            <input
              type="number"
              min="0.1"
              max="10"
              step="0.1"
              value={formData.calificacion}
              onChange={(event) => handleChange('calificacion', event.target.value)}
              readOnly={isViewMode}
            />
          </label>

          <label>
            <span>Semana</span>
            <select
              value={formData.week_number}
              onChange={(event) => handleChange('week_number', event.target.value)}
              disabled={isViewMode || lockWeekSelection}
            >
              {weekOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Rango calculado</span>
            <input
              type="text"
              value={selectedWeekRange ? `${selectedWeekRange.semana_inicio} a ${selectedWeekRange.semana_fin}` : 'Sin rango'}
              readOnly
            />
          </label>

          <label>
            <span>Fecha de captura</span>
            <input type="date" value={formData.fecha_registro} onChange={(event) => handleChange('fecha_registro', event.target.value)} readOnly={isViewMode} />
          </label>

          <label className="full-width">
            <span>Descripción</span>
            <textarea
              rows={5}
              value={formData.descripcion}
              onChange={(event) => handleChange('descripcion', event.target.value)}
              readOnly={isViewMode}
              placeholder="Comentarios de la semana, seguimiento o observaciones del manager"
            />
          </label>
        </div>

        {!isViewMode && (
          <div className={`document-files-block document-upload-area ${isDragging ? 'dragging' : ''}`}>
            <label className="document-upload-label">
              <input
                type="file"
                multiple
                name="rating"
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
                <span>Evidencia, comentarios o documentos del rating semanal</span>
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

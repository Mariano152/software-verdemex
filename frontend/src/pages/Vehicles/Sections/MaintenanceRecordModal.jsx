import { useEffect, useState } from 'react';
import './MaintenanceRecordModal.css';

const EMPTY_FORM = {
  titulo: '',
  tipo_mantenimiento: '',
  fecha_servicio: '',
  costo: '',
  proveedor: '',
  descripcion: '',
  observaciones: ''
};

const formatDateForInput = (dateValue) => {
  if (!dateValue) return '';
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function MaintenanceRecordModal({
  vehicleId,
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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (isNew || !record) {
      setFormData(EMPTY_FORM);
      setExistingFiles([]);
      setSelectedFiles([]);
      return;
    }

    setFormData({
      titulo: record.titulo || '',
      tipo_mantenimiento: record.tipo_mantenimiento || '',
      fecha_servicio: formatDateForInput(record.fecha_servicio),
      costo: record.costo ?? '',
      proveedor: record.proveedor || '',
      descripcion: record.descripcion || '',
      observaciones: record.observaciones || ''
    });

    try {
      const parsed = record.archivos_json
        ? (typeof record.archivos_json === 'string' ? JSON.parse(record.archivos_json) : record.archivos_json)
        : [];
      setExistingFiles(Array.isArray(parsed) ? parsed : []);
    } catch {
      setExistingFiles([]);
    }
    setSelectedFiles([]);
  }, [isOpen, isNew, record]);

  if (!isOpen) return null;

  const isViewMode = mode === 'view';

  const handleChange = (field, value) => {
    if (isViewMode) return;
    setFormData((current) => ({
      ...current,
      [field]: value
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

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onSave(formData, selectedFiles, record?.id || null);
      onClose();
    } catch {
      // El error ya se notifica en el componente padre.
    } finally {
      setLoading(false);
    }
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
      // Evita rechazos no controlados dentro del modal.
    }
  };

  return (
    <div className='maintenance-modal-overlay' onClick={onClose}>
      <div className='maintenance-modal' onClick={(event) => event.stopPropagation()}>
        <div className='maintenance-modal-header'>
          <div>
            <h3>
              {isNew ? 'Nuevo mantenimiento' : isViewMode ? 'Detalle del mantenimiento' : 'Editar mantenimiento'}
            </h3>
            <p>Vehiculo {vehicleId}</p>
          </div>
          <button type='button' className='maintenance-close-btn' onClick={onClose}>Cerrar</button>
        </div>

        <div className='maintenance-modal-grid'>
          <label>
            <span>Titulo</span>
            <input value={formData.titulo} onChange={(e) => handleChange('titulo', e.target.value)} readOnly={isViewMode} />
          </label>
          <label>
            <span>Tipo de mantenimiento</span>
            <input value={formData.tipo_mantenimiento} onChange={(e) => handleChange('tipo_mantenimiento', e.target.value)} readOnly={isViewMode} />
          </label>
          <label>
            <span>Fecha de servicio</span>
            <input type='date' value={formData.fecha_servicio} onChange={(e) => handleChange('fecha_servicio', e.target.value)} readOnly={isViewMode} />
          </label>
          <label>
            <span>Costo</span>
            <input type='number' min='0' step='0.01' value={formData.costo} onChange={(e) => handleChange('costo', e.target.value)} readOnly={isViewMode} />
          </label>
          <label className='full-width'>
            <span>Proveedor</span>
            <input value={formData.proveedor} onChange={(e) => handleChange('proveedor', e.target.value)} readOnly={isViewMode} />
          </label>
          <label className='full-width'>
            <span>Descripcion</span>
            <textarea rows={4} value={formData.descripcion} onChange={(e) => handleChange('descripcion', e.target.value)} readOnly={isViewMode} />
          </label>
          <label className='full-width'>
            <span>Observaciones</span>
            <textarea rows={3} value={formData.observaciones} onChange={(e) => handleChange('observaciones', e.target.value)} readOnly={isViewMode} />
          </label>
          {!isViewMode && (
            <label className='full-width'>
              <span>Documentos adjuntos</span>
              <input type='file' multiple name='documento' onChange={handleFileChange} />
            </label>
          )}
        </div>

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

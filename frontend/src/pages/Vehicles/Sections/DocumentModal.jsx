import { useState, useEffect } from 'react';
import '../../../components/Notifications/NotificationModal.css';
import './DocumentModal.css';

/**
 * DocumentModal - Modal para ver/editar documento individual
 * Permite:
 * - Ver detalles del documento
 * - Editar campos individuales
 * - Agregar múltiples archivos (drag-and-drop)
 * - Descargar archivo
 */
export default function DocumentModal({
  document,
  vehicleId,
  isOpen,
  isNew = false,
  onClose,
  onSave
}) {
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';

    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }

    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (error) {
      console.warn('Error formateando vigencia para input:', dateValue, error);
    }

    return '';
  };

  const [formData, setFormData] = useState({
    tipo_documento_id: '',
    ambito: 'federal',
    estado: 'válido',
    dependencia_otorga: '',
    vigencia: '',
    folio_oficio: '',
    observaciones: '',
    estatus: 'vigente',
    archivo_url: null
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [downloadState, setDownloadState] = useState({
    isActive: false,
    fileKey: null,
    progress: 0,
    receivedBytes: 0,
    totalBytes: 0,
    etaSeconds: null
  });

  const tiposDocumento = [
    { id: 1, nombre: 'Título de Propiedad' },
    { id: 2, nombre: 'Registro de Circulación' },
    { id: 3, nombre: 'Seguro de Responsabilidad Civil' },
    { id: 4, nombre: 'Inspección Técnica' },
    { id: 5, nombre: 'Permiso de Circulación' },
    { id: 6, nombre: 'Placas de Identificación' },
    { id: 7, nombre: 'Verificación Vehicular' },
    { id: 8, nombre: 'Otros Documentos' }
  ];

  // Inicializar formulario cuando se abre modal
  useEffect(() => {
    if (isOpen) {
      if (isNew) {
        console.log('📝 [DOC_MODAL] Nuevo documento - formulario vacío');
        // Formulario vacío para nuevo documento
        setFormData({
          tipo_documento_id: '',
          ambito: 'federal',
          estado: 'válido',
          dependencia_otorga: '',
          vigencia: '',
          folio_oficio: '',
          observaciones: '',
          estatus: 'vigente',
          archivo_url: null
        });
        setExistingFiles([]);
      } else if (document) {
        console.log('📂 [DOC_MODAL] Editar documento existente', { docId: document.id, hasArchivoUrl: !!document.archivo_url, hasArchivosJson: !!document.archivos_json });
        // Cargar datos del documento existente
        setFormData({
          tipo_documento_id: document.tipo_documento_id || '',
          ambito: document.ambito || 'federal',
          estado: document.estado || 'válido',
          dependencia_otorga: document.dependencia_otorga || '',
          vigencia: formatDateForInput(document.vigencia),
          folio_oficio: document.folio_oficio || '',
          observaciones: document.observaciones || '',
          estatus: document.estatus || 'vigente',
          archivo_url: document.archivo_url || null
        });

        // Parsear archivos JSON si existen
        try {
          if (document.archivos_json) {
            console.log('🔍 [DOC_MODAL] Parseando archivos_json');
            const filesData = typeof document.archivos_json === 'string' 
              ? JSON.parse(document.archivos_json) 
              : document.archivos_json;
            const filesArray = Array.isArray(filesData) ? filesData : [filesData];
            console.log('✅ [DOC_MODAL] Archivos parseados:', { count: filesArray.length, files: filesArray });
            setExistingFiles(filesArray);
          } else {
            console.warn('⚠️ [DOC_MODAL] Documento sin archivos_json. archivo_url=', document.archivo_url);
            setExistingFiles([]);
          }
        } catch (error) {
          console.error('❌ [DOC_MODAL] Error parseando archivos_json:', { error: error.message, archivos_json: document.archivos_json });
          setExistingFiles([]);
        }
      }
      setSelectedFiles([]);
      setNotification(null);
      setDownloadState({
        isActive: false,
        fileKey: null,
        progress: 0,
        receivedBytes: 0,
        totalBytes: 0,
        etaSeconds: null
      });
    }
  }, [isOpen, document, isNew]);

  const getFileKey = (fileInfo, index = 0) => fileInfo?.id || `${fileInfo?.nombre_original || 'archivo'}-${fileInfo?.orden ?? index}`;

  const formatBytes = (bytes = 0) => {
    if (!bytes || bytes < 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  };

  const formatEta = (seconds) => {
    if (seconds == null || Number.isNaN(seconds) || !Number.isFinite(seconds)) return 'Calculando...';
    if (seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Agregar archivos del input
  const handleFileChange = (e) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
    }
  };

  // Remover archivo de la lista
  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Descargar archivo específico
  const handleDownloadFile = async (fileInfo) => {
    const fileKey = getFileKey(fileInfo);

    try {
      const token = localStorage.getItem('authToken');
      
      // Usar download_url del backend (construido desde mapDocumentFileRow)
      const downloadUrl = fileInfo.download_url;
      
      console.log('🔵 [DOWNLOAD] START');
      console.log('   fileInfo:', fileInfo);
      console.log('   downloadUrl:', downloadUrl);

      if (!downloadUrl) {
        console.error('❌ No download_url encontrado en fileInfo:', fileInfo);
        setNotification({
          type: 'warning',
          title: '⚠️ Aviso',
          message: 'Este archivo no tiene URL de descarga válida'
        });
        return;
      }

      setDownloadState({
        isActive: true,
        fileKey,
        progress: 0,
        receivedBytes: 0,
        totalBytes: Number(fileInfo.tamaño_bytes || 0),
        etaSeconds: null
      });

      console.log(`📥 Iniciando descarga con progreso: ${fileInfo.nombre_original}`);

      const response = await fetch(downloadUrl, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const streamReader = response.body?.getReader();
      const totalBytesHeader = Number(response.headers.get('content-length') || 0);
      const totalBytes = totalBytesHeader > 0 ? totalBytesHeader : Number(fileInfo.tamaño_bytes || 0);

      if (!streamReader) {
        const blob = await response.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = objectUrl;
        link.download = fileInfo.nombre_original || 'documento.pdf';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);

        setDownloadState({
          isActive: false,
          fileKey: null,
          progress: 100,
          receivedBytes: blob.size,
          totalBytes: blob.size,
          etaSeconds: 0
        });
      } else {
        const chunks = [];
        let receivedBytes = 0;
        const startTime = performance.now();
        let lastUiUpdate = startTime;

        while (true) {
          const { done, value } = await streamReader.read();
          if (done) break;

          if (value) {
            chunks.push(value);
            receivedBytes += value.byteLength;
          }

          const now = performance.now();
          if (now - lastUiUpdate >= 150) {
            const elapsedSeconds = Math.max((now - startTime) / 1000, 0.001);
            const speedBytesPerSec = receivedBytes / elapsedSeconds;
            const etaSeconds = totalBytes > 0 && speedBytesPerSec > 0
              ? Math.max((totalBytes - receivedBytes) / speedBytesPerSec, 0)
              : null;
            const progress = totalBytes > 0 ? Math.min((receivedBytes / totalBytes) * 100, 100) : 0;

            setDownloadState({
              isActive: true,
              fileKey,
              progress,
              receivedBytes,
              totalBytes,
              etaSeconds
            });

            lastUiUpdate = now;
          }
        }

        const blob = new Blob(chunks, { type: response.headers.get('content-type') || fileInfo.tipo_mime || 'application/octet-stream' });
        const objectUrl = window.URL.createObjectURL(blob);
        const link = window.document.createElement('a');
        link.href = objectUrl;
        link.download = fileInfo.nombre_original || 'documento.pdf';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);

        setDownloadState({
          isActive: false,
          fileKey: null,
          progress: 100,
          receivedBytes,
          totalBytes,
          etaSeconds: 0
        });
      }

      setNotification({
        type: 'success',
        title: '✓ Descargado',
        message: `${fileInfo.nombre_original} descargado exitosamente`
      });
    } catch (error) {
      console.error('❌ [DOWNLOAD] Error:', error);
      setDownloadState({
        isActive: false,
        fileKey: null,
        progress: 0,
        receivedBytes: 0,
        totalBytes: 0,
        etaSeconds: null
      });
      setNotification({
        type: 'error',
        title: '✗ Error',
        message: 'Error al descargar el archivo: ' + error.message
      });
    }
  };

  const validateForm = () => {
    console.log('🔍 [DOC_MODAL_VALIDATE] Validando formulario...');
    const required = [
      'tipo_documento_id',
      'ambito',
      'estado',
      'dependencia_otorga',
      'vigencia',
      'folio_oficio'
    ];

    const missing = required.filter(field => !formData[field]);

    if (missing.length > 0) {
      console.warn(`⚠️ [DOC_MODAL_VALIDATE] Faltan campos: ${missing.join(', ')}`);
      setNotification({
        type: 'error',
        title: '⚠️ Campos Incompletos',
        message: `Por favor completa: ${missing.join(', ')}`
      });
      return false;
    }

    if (isNew && selectedFiles.length === 0) {
      console.warn('⚠️ [DOC_MODAL_VALIDATE] Es nuevo documento pero sin archivos');
      setNotification({
        type: 'error',
        title: '⚠️ Sin Archivos',
        message: 'Por favor agrega al menos un archivo'
      });
      return false;
    }

    console.log('✅ [DOC_MODAL_VALIDATE] Validación exitosa');
    return true;
  };

  const handleSave = async () => {
    console.log('💾 [DOC_MODAL_SAVE] INICIO - guardando documento', { isNew, vehicleId, formData: formData, selectedFiles: selectedFiles.length });
    
    if (!validateForm()) {
      console.log('❌ [DOC_MODAL_SAVE] Validación FALLÓ');
      return;
    }

    console.log('✅ [DOC_MODAL_SAVE] Validación PASÓ');
    setIsLoading(true);

    try {
      const formDataObj = new FormData();

      // Agregar campos del formulario
      console.log('📝 [DOC_MODAL_SAVE] Agregando campos a FormData');
      Object.keys(formData).forEach(key => {
        if (key !== 'archivo_url') {
          formDataObj.append(key, formData[key]);
          console.log(`  - ${key}: ${formData[key]}`);
        }
      });

      // Agregar archivos seleccionados para que el backend los suba a Cloudinary
      console.log(`📄 [DOC_MODAL_SAVE] Agregando ${selectedFiles.length} archivo(s)`);
      selectedFiles.forEach((file, idx) => {
        formDataObj.append('documento', file);
        console.log(`  - Archivo ${idx}: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
      });

      const token = localStorage.getItem('authToken');
      const url = isNew
        ? `/api/vehicles/${vehicleId}/documents`
        : `/api/vehicles/${vehicleId}/documents/${document.id}`;
      const method = isNew ? 'POST' : 'PUT';

      console.log(`🚀 [DOC_MODAL_SAVE] Enviando ${method} a ${url}`);
      console.log(`   Token: ${token ? 'PRESENTE' : 'FALTA TOKEN'}`);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataObj
      });

      console.log(`📡 [DOC_MODAL_SAVE] Respuesta ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`❌ [DOC_MODAL_SAVE] Error ${response.status}: ${errText}`);
        throw new Error(`Error ${response.status}: ${errText}`);
      }

      const result = await response.json();
      console.log(`✅ [DOC_MODAL_SAVE] Respuesta JSON:`, result);

      setNotification({
        type: 'success',
        title: '✓ Éxito',
        message: `Documento ${isNew ? 'creado' : 'actualizado'} exitosamente (${result.archivosGuardados || 0} archivo(s))`
      });

      setTimeout(() => {
        console.log(`📤 [DOC_MODAL_SAVE] Llamando onSave con:`, result.document || result);
        onSave?.(result.document || result);
      }, 1500);
    } catch (error) {
      console.error('❌ [DOC_MODAL_SAVE] Error FATAL:', error);
      setNotification({
        type: 'error',
        title: '✗ Error',
        message: error.message || 'Error al guardar el documento'
      });
    } finally {
      setIsLoading(false);
      console.log('🏁 [DOC_MODAL_SAVE] FIN');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content document-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h2>
            {isNew ? '➕ Nuevo Documento' : '📄 Editar Documento'}
          </h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Sección de Archivos Existentes - PRIMERO */}
          {existingFiles.length > 0 && (
            <div className="document-files-section" style={{ marginBottom: '30px', paddingBottom: '20px', borderBottom: '2px solid #e0e0e0' }}>
              <h3>📎 Archivos Existentes ({existingFiles.length})</h3>
              <div className="files-existing-list">
                {existingFiles.map((file, index) => (
                  <div key={getFileKey(file, index)} className="file-existing-item">
                    <div className="file-existing-info">
                      <span className="file-existing-name">{file.nombre_original}</span>
                      <span className="file-existing-size">({(file.tamaño / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                    <button
                      className="btn-download-file"
                      onClick={() => handleDownloadFile(file)}
                      disabled={downloadState.isActive}
                      type="button"
                    >
                      {downloadState.isActive && downloadState.fileKey === getFileKey(file, index)
                        ? `⏳ ${Math.round(downloadState.progress)}%`
                        : '⬇️ Descargar'}
                    </button>

                    {downloadState.isActive && downloadState.fileKey === getFileKey(file, index) && (
                      <div className="download-progress-wrap">
                        <div className="download-progress-meta">
                          <span>Descargando archivo...</span>
                          <span>
                            {formatBytes(downloadState.receivedBytes)}
                            {downloadState.totalBytes > 0 ? ` / ${formatBytes(downloadState.totalBytes)}` : ''}
                          </span>
                        </div>
                        <div className="download-progress-track">
                          <div
                            className="download-progress-bar"
                            style={{ width: `${Math.max(2, downloadState.progress)}%` }}
                          />
                        </div>
                        <div className="download-progress-eta">
                          Tiempo estimado restante: {formatEta(downloadState.etaSeconds)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-grid">
            {/* Tipo de Documento */}
            <div className="form-group full-width">
              <label>Tipo de Documento *</label>
              <select
                value={formData.tipo_documento_id}
                onChange={(e) => handleChange('tipo_documento_id', e.target.value)}
              >
                <option value="">Seleccionar tipo...</option>
                {tiposDocumento.map(tipo => (
                  <option key={tipo.id} value={tipo.id}>
                    {tipo.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Ámbito */}
            <div className="form-group">
              <label>Ámbito *</label>
              <select
                value={formData.ambito}
                onChange={(e) => handleChange('ambito', e.target.value)}
              >
                <option value="federal">Federal</option>
                <option value="estatal_jalisco">Estatal Jalisco</option>
                <option value="estatal_otro">Estatal Otro</option>
              </select>
            </div>

            {/* Estado */}
            <div className="form-group">
              <label>Estado *</label>
              <input
                type="text"
                placeholder="Ej: Válido, Renovando..."
                value={formData.estado}
                onChange={(e) => handleChange('estado', e.target.value)}
              />
            </div>

            {/* Vigencia */}
            <div className="form-group">
              <label>Vigencia *</label>
              <input
                type="date"
                value={formData.vigencia}
                onChange={(e) => handleChange('vigencia', e.target.value)}
              />
            </div>

            {/* Dependencia que Otorga */}
            <div className="form-group">
              <label>Dependencia que Otorga *</label>
              <input
                type="text"
                placeholder="Ej: SEMOVI"
                value={formData.dependencia_otorga}
                onChange={(e) => handleChange('dependencia_otorga', e.target.value)}
              />
            </div>

            {/* Folio/Oficio */}
            <div className="form-group">
              <label>Folio/Oficio *</label>
              <input
                type="text"
                placeholder="Ej: SEMOVI-2024-5001"
                value={formData.folio_oficio}
                onChange={(e) => handleChange('folio_oficio', e.target.value)}
              />
            </div>

            {/* Estatus */}
            <div className="form-group">
              <label>Estatus</label>
              <select
                value={formData.estatus}
                onChange={(e) => handleChange('estatus', e.target.value)}
              >
                <option value="vigente">Vigente</option>
                <option value="vencido">Vencido</option>
                <option value="por_renovar">Por Renovar</option>
              </select>
            </div>

            {/* Observaciones */}
            <div className="form-group full-width">
              <label>Observaciones</label>
              <textarea
                placeholder="Notas adicionales..."
                value={formData.observaciones}
                onChange={(e) => handleChange('observaciones', e.target.value)}
                rows="3"
              />
            </div>
          </div>

          {/* Sección para Agregar Nuevos Archivos */}
          <div className="document-file-section">
            <h3>➕ {existingFiles.length > 0 ? 'Agregar Más Archivos' : 'Archivos del Documento'}</h3>

            {/* Upload Area con Drag & Drop */}
            <div
              className={`file-upload-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <label className="file-input-label">
                <div className="upload-content">
                  <span className="file-placeholder">📁</span>
                  <span className="file-text">Arrastra archivos aquí o haz clic para seleccionar</span>
                  <span className="file-hint">(PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF)</span>
                </div>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif"
                  multiple
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Lista de Archivos Seleccionados */}
            {selectedFiles.length > 0 && (
              <div className="files-list">
                <h4>Archivos por subir ({selectedFiles.length})</h4>
                <ul>
                  {selectedFiles.map((file, index) => (
                    <li key={index} className="file-item">
                      <span className="file-name">{file.name}</span>
                      <span className="file-size">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                      <button
                        className="btn-remove-file"
                        onClick={() => handleRemoveFile(index)}
                        type="button"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Notificación */}
          {notification && (
            <div className={`notification notification-${notification.type}`}>
              <div className="notification-title">{notification.title}</div>
              <div className="notification-message">{notification.message}</div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            ❌ Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isLoading}
          >
            {isLoading ? '⏳ Guardando...' : '💾 Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

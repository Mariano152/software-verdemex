import { useState, useEffect } from 'react';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import DocumentModal from './DocumentModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehicleDocumentsSection.css';

/**
 * VehicleDocumentsSection - Gestión de documentos del vehículo
 * Modo lectura por defecto, con:
 * - Tabla clickeable para ver/editar documentos individuales
 * - Botón para agregar nuevos documentos
 * - Modal para editar documento individual
 */
export default function VehicleDocumentsSection({
  vehicleId,
  documents = [],
  onSave,
  onDocumentSaved,
  onCancel,
  onBack
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDocuments, setEditedDocuments] = useState(documents);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Estado para el DocumentModal
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isNewDocument, setIsNewDocument] = useState(false);

  useEffect(() => {
    console.log('📋 Documentos recibidos:', documents);
    setEditedDocuments(documents);
  }, [documents]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedDocuments(documents);
    onCancel?.();
  };

  const handleAddDocument = () => {
    const newDoc = {
      id: Date.now(),
      tipo_documento_id: '',
      ambito: 'federal',
      estado: '',
      dependencia_otorga: '',
      vigencia: '',
      folio_oficio: '',
      observaciones: '',
      estatus: 'vigente',
      isNew: true
    };
    setEditedDocuments([...editedDocuments, newDoc]);
  };

  const handleRemoveDocument = (docId) => {
    setEditedDocuments(editedDocuments.filter(doc => doc.id !== docId));
  };

  const handleDocumentChange = (docId, field, value) => {
    setEditedDocuments(editedDocuments.map(doc =>
      doc.id === docId ? { ...doc, [field]: value } : doc
    ));
  };

  const validateDocument = (doc) => {
    const missingFields = [];
    
    if (!doc.tipo_documento_id || doc.tipo_documento_id === '') {
      missingFields.push('Tipo de Documento');
    }
    if (!doc.ambito || doc.ambito === '') {
      missingFields.push('Ámbito');
    }
    if (!doc.estado || doc.estado.trim() === '') {
      missingFields.push('Estado');
    }
    if (!doc.dependencia_otorga || doc.dependencia_otorga.trim() === '') {
      missingFields.push('Dependencia que Otorga');
    }
    if (!doc.vigencia || doc.vigencia === '') {
      missingFields.push('Vigencia');
    }
    if (!doc.folio_oficio || doc.folio_oficio.trim() === '') {
      missingFields.push('Folio/Oficio');
    }
    
    // Observaciones es OPCIONAL - no se valida
    
    return missingFields;
  };

  const handleSave = async () => {
    try {
      // PASO 1: Validar todos los documentos
      const allDocuments = editedDocuments;
      const incompleteDocuments = [];
      
      for (let i = 0; i < allDocuments.length; i++) {
        const doc = allDocuments[i];
        const missingFields = validateDocument(doc);
        
        if (missingFields.length > 0) {
          incompleteDocuments.push({
            index: i + 1,
            documento: tiposDocumento.find(t => t.id == doc.tipo_documento_id)?.nombre || 'Sin tipo',
            campos: missingFields
          });
        }
      }

      // Si hay documentos incompletos, mostrar error y no guardar
      if (incompleteDocuments.length > 0) {
        const mensaje = incompleteDocuments
          .map(d => `Documento ${d.index}: ${d.campos.join(', ')}`)
          .join('\n');
        
        console.warn('❌ Documentos incompletos:', incompleteDocuments);
        
        setNotification({
          type: 'error',
          title: '⚠️ Campos Incompletos',
          message: `Rellena todos los campos del documento:\n${mensaje}`
        });
        return; // No continuar
      }

      // PASO 2: Todos los documentos están válidos, proceder a guardar
      setLoading(true);
      console.log('📤 Guardando documentos:', editedDocuments);
      
      await onSave?.(editedDocuments);
      
      console.log('✅ Documentos guardados exitosamente');
      
      setNotification({
        type: 'success',
        title: '✓ Éxito',
        message: `${editedDocuments.length} documento(s) guardado(s) correctamente`
      });
      
      // Actualizar el estado local con los documentos guardados
      setEditedDocuments(editedDocuments);
      
      // Cerrar modo edición después de 1 segundo
      setTimeout(() => {
        setIsEditing(false);
      }, 1000);
    } catch (error) {
      console.error('❌ Error guardando:', error);
      setNotification({
        type: 'error',
        title: '✗ Error',
        message: error.message || 'Error al guardar documentos'
      });
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal para editar documento
  const handleOpenDocumentModal = (doc) => {
    console.log('📂 [DOC_SECTION] Abriendo modal para editar documento:', { id: doc.id, tipo: doc.tipo_documento_id });
    setSelectedDocument(doc);
    setIsNewDocument(false);
    setDocumentModalOpen(true);
  };

  // Abrir modal para nuevo documento
  const handleOpenNewDocumentModal = () => {
    console.log('➕ [DOC_SECTION] Abriendo modal para NUEVO documento');
    setSelectedDocument(null);
    setIsNewDocument(true);
    setDocumentModalOpen(true);
  };

  // Guardar documento desde el modal
  const handleSaveDocument = (savedDocument) => {
    console.log('📝 Documento guardado:', savedDocument);
    setDocumentModalOpen(false);

    if (savedDocument?.id) {
      setEditedDocuments((prev) => {
        const exists = prev.some((doc) => doc.id === savedDocument.id);
        if (exists) {
          return prev.map((doc) => (doc.id === savedDocument.id ? { ...doc, ...savedDocument } : doc));
        }

        return [...prev, savedDocument];
      });
    }

    onDocumentSaved?.(savedDocument);
    
    // Recargar documentos
    setNotification({
      type: 'success',
      title: '✓ Éxito',
      message: 'Documento guardado correctamente'
    });
  };

  const extractDocumentFiles = (doc) => {
    if (!doc?.archivos_json) return [];

    try {
      const parsed = typeof doc.archivos_json === 'string'
        ? JSON.parse(doc.archivos_json)
        : doc.archivos_json;

      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.warn('Error parseando archivos del documento:', error);
      return [];
    }
  };

  const handleDownloadDocument = async (doc, event) => {
    event?.stopPropagation();

    const files = extractDocumentFiles(doc);
    const firstFile = files[0] || null;
    const cloudinaryUrl = firstFile?.ruta_cloudinary;
    const directUrl = doc?.archivo_url;

    if (cloudinaryUrl && cloudinaryUrl.includes('cloudinary')) {
      console.log('⬇️ Descargando desde Cloudinary (archivos_json):', cloudinaryUrl);
      window.open(cloudinaryUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (directUrl && /^https?:\/\//i.test(directUrl)) {
      console.log('⬇️ Descargando desde URL directa (archivo_url):', directUrl);
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!doc?.id) {
      setNotification({
        type: 'warning',
        title: '⚠️ Sin archivo',
        message: 'Este documento no tiene archivo disponible para descargar'
      });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `/api/vehicles/${vehicleId}/documents/${doc.id}/download?fileIndex=0`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        console.error('❌ Descarga falló', { status: response.status, docId: doc.id, vehicleId });
        throw new Error(`Error ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = firstFile?.nombre_original || `${doc.tipo_nombre || 'documento'}.pdf`;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error descargando documento:', error);
      setNotification({
        type: 'error',
        title: '✗ Error',
        message: 'No se pudo descargar el archivo del documento'
      });
    }
  };

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

  // Formatear fecha para input type="date" (YYYY-MM-DD)
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    
    // Si ya está en formato YYYY-MM-DD, retornar tal cual
    if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return dateValue;
    }
    
    // Si es una fecha con otro formato, convertir
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    } catch (e) {
      console.warn('Error formateando fecha:', dateValue);
    }
    
    return '';
  };

  // Formatear fecha para mostrar en tabla (DD/MM/YYYY)
  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return '-';
    
    try {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('es-ES');
      }
    } catch (e) {
      console.warn('Error formateando fecha para mostrar:', dateValue);
    }
    
    return '-';
  };

  return (
    <div className="documents-section">
      {/* HEADER */}
      <div className="section-header">
        <div className="header-content">
          <button className="btn-back" onClick={onBack}>← Volver</button>
          <h2>📄 Documentos del Vehículo</h2>
        </div>
        <button className="btn-add-document-header" onClick={handleOpenNewDocumentModal}>
          ➕ Agregar Documento
        </button>
      </div>

      {/* CONTENIDO */}
      <div className="section-content">
        {/* MODO LECTURA (ahora es el único modo) */}
        <div className="read-mode">
          {editedDocuments.length > 0 ? (
            <div className="documents-table-wrapper">
              <table className="documents-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Ámbito</th>
                    <th>Vigencia</th>
                    <th>Estado</th>
                    <th>Estatus</th>
                    <th>Observaciones</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {editedDocuments.map(doc => (
                    <tr
                      key={doc.id}
                      className="document-row"
                      onClick={() => handleOpenDocumentModal(doc)}
                      title="Haz clic para editar este documento"
                    >
                      <td>{tiposDocumento.find(t => t.id == doc.tipo_documento_id)?.nombre || '-'}</td>
                      <td>
                        <span className="badge-ambito">{doc.ambito.replace('_', ' ')}</span>
                      </td>
                      <td>{formatDateForDisplay(doc.vigencia)}</td>
                      <td>{doc.estado || '-'}</td>
                      <td>
                        <span className={`badge-estatus ${doc.estatus}`}>
                          {doc.estatus === 'vigente' ? '✓ Vigente' : doc.estatus === 'vencido' ? '⚠ Vencido' : doc.estatus}
                        </span>
                      </td>
                      <td className="observaciones">{doc.observaciones || '-'}</td>
                      <td className="actions-cell">
                        <button
                          className="btn-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDocumentModal(doc);
                          }}
                          title="Ver/Editar documento"
                        >
                          📋
                        </button>
                        <button
                          className="btn-action download"
                          onClick={(e) => handleDownloadDocument(doc, e)}
                          title="Descargar archivo"
                        >
                          ⬇️
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>📋 No hay documentos registrados</p>
            </div>
          )}
        </div>
      </div>

      {/* DocumentModal */}
      <DocumentModal
        document={selectedDocument}
        vehicleId={vehicleId}
        isOpen={documentModalOpen}
        isNew={isNewDocument}
        onClose={() => setDocumentModalOpen(false)}
        onSave={handleSaveDocument}
      />

      {/* NOTIFICACIÓN */}
      <NotificationModal
        isOpen={!!notification}
        type={notification?.type}
        title={notification?.title}
        message={notification?.message}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}

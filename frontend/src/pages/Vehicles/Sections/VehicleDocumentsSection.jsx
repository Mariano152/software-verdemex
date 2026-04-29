import { useState, useEffect } from 'react';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import DocumentModal from './DocumentModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehicleDocumentsSection.css';

/**
 * VehicleDocumentsSection - Gestión de documentos del vehículo
 * Modo lectura por defecto, con:
 * - Tabla clickeable para ver y editar documentos individuales
 * - Botón para agregar nuevos documentos
 * - Modal para editar documento individual
 */
export default function VehicleDocumentsSection({
  vehicleId,
  documents = [],
  initialDocumentId = null,
  onSave,
  onDocumentSaved,
  onCancel,
  onBack
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDocuments, setEditedDocuments] = useState(documents);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isNewDocument, setIsNewDocument] = useState(false);

  useEffect(() => {
    setEditedDocuments(documents);
  }, [documents]);

  useEffect(() => {
    if (!initialDocumentId || !documents.length) return;

    const targetDocument = documents.find((doc) => String(doc.id) === String(initialDocumentId));
    if (targetDocument) {
      setSelectedDocument(targetDocument);
      setIsNewDocument(false);
      setDocumentModalOpen(true);
    }
  }, [documents, initialDocumentId]);

  const handleCancel = () => {
    setIsEditing(false);
    setEditedDocuments(documents);
    onCancel?.();
  };

  const validateDocument = (doc) => {
    const missingFields = [];

    if (!doc.tipo_documento_id || doc.tipo_documento_id === '') {
      missingFields.push('Tipo de documento');
    }
    if (!doc.ambito || doc.ambito === '') {
      missingFields.push('Ámbito');
    }
    if (!doc.estado || doc.estado.trim() === '') {
      missingFields.push('Estado');
    }
    if (!doc.dependencia_otorga || doc.dependencia_otorga.trim() === '') {
      missingFields.push('Dependencia que otorga');
    }
    if (!doc.vigencia || doc.vigencia === '') {
      missingFields.push('Vigencia');
    }
    if (!doc.folio_oficio || doc.folio_oficio.trim() === '') {
      missingFields.push('Folio u oficio');
    }

    return missingFields;
  };

  const handleSave = async () => {
    try {
      const allDocuments = editedDocuments;
      const incompleteDocuments = [];

      for (let i = 0; i < allDocuments.length; i += 1) {
        const doc = allDocuments[i];
        const missingFields = validateDocument(doc);

        if (missingFields.length > 0) {
          incompleteDocuments.push({
            index: i + 1,
            documento: tiposDocumento.find((t) => t.id === Number(doc.tipo_documento_id))?.nombre || 'Sin tipo',
            campos: missingFields
          });
        }
      }

      if (incompleteDocuments.length > 0) {
        const mensaje = incompleteDocuments
          .map((d) => `Documento ${d.index}: ${d.campos.join(', ')}`)
          .join('\n');

        setNotification({
          type: 'error',
          title: 'Campos incompletos',
          message: `Completa los campos requeridos:\n${mensaje}`
        });
        return;
      }

      setLoading(true);
      await onSave?.(editedDocuments);

      setNotification({
        type: 'success',
        title: 'Éxito',
        message: `${editedDocuments.length} documento(s) guardado(s) correctamente`
      });

      setEditedDocuments(editedDocuments);

      setTimeout(() => {
        setIsEditing(false);
      }, 1000);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: error.message || 'Error al guardar documentos'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDocumentModal = (doc) => {
    setSelectedDocument(doc);
    setIsNewDocument(false);
    setDocumentModalOpen(true);
  };

  const handleOpenNewDocumentModal = () => {
    setSelectedDocument(null);
    setIsNewDocument(true);
    setDocumentModalOpen(true);
  };

  const handleSaveDocument = (savedDocument) => {
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

    setNotification({
      type: 'success',
      title: 'Éxito',
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
      window.open(cloudinaryUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (directUrl && /^https?:\/\//i.test(directUrl)) {
      window.open(directUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!doc?.id) {
      setNotification({
        type: 'warning',
        title: 'Sin archivo',
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
      setNotification({
        type: 'error',
        title: 'Error',
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

  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return '-';

    try {
      const date = new Date(dateValue);
      if (!Number.isNaN(date.getTime())) {
        return date.toLocaleDateString('es-ES');
      }
    } catch (error) {
      console.warn('Error formateando fecha para mostrar:', dateValue, error);
    }

    return '-';
  };

  return (
    <div className="documents-section">
      <div className="section-header">
        <div className="header-content">
          <button className="btn-back" onClick={onBack}>Volver</button>
          <h2>Documentos del Vehículo</h2>
        </div>
        <button className="btn-add-document-header" onClick={handleOpenNewDocumentModal}>
          Agregar Documento
        </button>
      </div>

      <div className="section-content">
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
                  {editedDocuments.map((doc) => (
                    <tr
                      key={doc.id}
                      className="document-row"
                      onClick={() => handleOpenDocumentModal(doc)}
                      title="Haz clic para editar este documento"
                    >
                      <td>{tiposDocumento.find((t) => t.id === Number(doc.tipo_documento_id))?.nombre || '-'}</td>
                      <td>
                        <span className="badge-ambito">{String(doc.ambito || '-').replace('_', ' ')}</span>
                      </td>
                      <td>{formatDateForDisplay(doc.vigencia)}</td>
                      <td>{doc.estado || '-'}</td>
                      <td>
                        <span className={`badge-estatus ${doc.estatus}`}>
                          {doc.estatus === 'vigente' ? 'Vigente' : doc.estatus === 'vencido' ? 'Vencido' : doc.estatus}
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
                          title="Ver documento"
                        >
                          Ver
                        </button>
                        <button
                          className="btn-action download"
                          onClick={(e) => handleDownloadDocument(doc, e)}
                          title="Descargar archivo"
                        >
                          Descargar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>No hay documentos registrados</p>
            </div>
          )}
        </div>
      </div>

      <DocumentModal
        document={selectedDocument}
        vehicleId={vehicleId}
        isOpen={documentModalOpen}
        isNew={isNewDocument}
        onClose={() => setDocumentModalOpen(false)}
        onSave={handleSaveDocument}
      />

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

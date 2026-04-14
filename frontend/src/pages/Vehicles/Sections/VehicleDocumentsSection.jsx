import { useState, useEffect } from 'react';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehicleDocumentsSection.css';

/**
 * VehicleDocumentsSection - Gestión de documentos del vehículo
 * Modo lectura por defecto, con botón para editar
 */
export default function VehicleDocumentsSection({
  vehicleId,
  documents = [],
  onSave,
  onCancel,
  onBack
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedDocuments, setEditedDocuments] = useState(documents);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);

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
        {!isEditing ? (
          <button className="btn-edit" onClick={handleEdit}>✏️ Editar</button>
        ) : (
          <div className="header-actions">
            <button className="btn-cancel" onClick={handleCancel}>❌ Cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={loading}>
              {loading ? '⏳ Guardando...' : '💾 Guardar Cambios'}
            </button>
          </div>
        )}
      </div>

      {/* CONTENIDO */}
      <div className="section-content">
        {isEditing ? (
          // MODO EDICIÓN
          <div className="edit-mode">
            <div className="documents-list">
              {editedDocuments.map((doc, index) => (
                <div key={doc.id} className="document-form-card">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Tipo de Documento *</label>
                      <select
                        value={doc.tipo_documento_id}
                        onChange={(e) => handleDocumentChange(doc.id, 'tipo_documento_id', e.target.value)}
                      >
                        <option value="">Seleccionar tipo...</option>
                        {tiposDocumento.map(tipo => (
                          <option key={tipo.id} value={tipo.id}>
                            {tipo.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Ámbito *</label>
                      <select
                        value={doc.ambito}
                        onChange={(e) => handleDocumentChange(doc.id, 'ambito', e.target.value)}
                      >
                        <option value="federal">Federal</option>
                        <option value="estatal_jalisco">Estatal Jalisco</option>
                        <option value="estatal_otro">Estatal Otro</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Vigencia</label>
                      <input
                        type="date"
                        value={formatDateForInput(doc.vigencia)}
                        onChange={(e) => handleDocumentChange(doc.id, 'vigencia', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Estado</label>
                      <input
                        type="text"
                        placeholder="Ej: Válido, Renovando..."
                        value={doc.estado || ''}
                        onChange={(e) => handleDocumentChange(doc.id, 'estado', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Dependencia que Otorga</label>
                      <input
                        type="text"
                        placeholder="Ej: SEMOVI"
                        value={doc.dependencia_otorga || ''}
                        onChange={(e) => handleDocumentChange(doc.id, 'dependencia_otorga', e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label>Folio/Oficio</label>
                      <input
                        type="text"
                        placeholder="Ej: SEMOVI-2024-5001"
                        value={doc.folio_oficio || ''}
                        onChange={(e) => handleDocumentChange(doc.id, 'folio_oficio', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group full">
                      <label>Observaciones</label>
                      <textarea
                        placeholder="Información adicional..."
                        value={doc.observaciones || ''}
                        onChange={(e) => handleDocumentChange(doc.id, 'observaciones', e.target.value)}
                        rows="2"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => handleRemoveDocument(doc.id)}
                  >
                    🗑️ Eliminar Documento
                  </button>
                </div>
              ))}
            </div>

            <button className="btn-add-document" onClick={handleAddDocument}>
              ➕ Agregar Documento
            </button>
          </div>
        ) : (
          // MODO LECTURA
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
                    </tr>
                  </thead>
                  <tbody>
                    {editedDocuments.map(doc => (
                      <tr key={doc.id}>
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p>📋 No hay documentos registrados</p>
                <p className="subtitle">Haz clic en "Editar" para agregar documentos</p>
              </div>
            )}
          </div>
        )}
      </div>

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

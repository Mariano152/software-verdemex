import { useEffect, useMemo, useState } from 'react';
import NotificationModal from '../../../components/Notifications/NotificationModal';
import DocumentModal from './DocumentModal';
import '../../../components/Notifications/NotificationModal.css';
import './VehicleDocumentsSection.css';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

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

export default function VehicleDocumentsSection({
  vehicleId,
  documents = [],
  initialDocumentId = null,
  onDocumentSaved,
  onBack
}) {
  const [editedDocuments, setEditedDocuments] = useState(documents);
  const [notification, setNotification] = useState(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isNewDocument, setIsNewDocument] = useState(false);
  const [documentModalMode, setDocumentModalMode] = useState('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('todos');
  const [selectedAmbito, setSelectedAmbito] = useState('todos');
  const [selectedEstatus, setSelectedEstatus] = useState('todos');

  useEffect(() => {
    setEditedDocuments(documents);
  }, [documents]);

  useEffect(() => {
    if (!initialDocumentId || !documents.length) return;

    const targetDocument = documents.find((doc) => String(doc.id) === String(initialDocumentId));
    if (!targetDocument) return;

    setSelectedDocument(targetDocument);
    setIsNewDocument(false);
    setDocumentModalMode('view');
    setDocumentModalOpen(true);
  }, [documents, initialDocumentId]);

  const handleOpenDocumentModal = (doc, mode = 'view') => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedDocument(doc);
    setIsNewDocument(false);
    setDocumentModalMode(mode);
    setDocumentModalOpen(true);
  };

  const handleOpenNewDocumentModal = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedDocument(null);
    setIsNewDocument(true);
    setDocumentModalMode('edit');
    setDocumentModalOpen(true);
  };

  const handleSaveDocument = (savedDocument) => {
    setDocumentModalOpen(false);

    if (savedDocument?.id) {
      setEditedDocuments((prev) => {
        const exists = prev.some((doc) => doc.id === savedDocument.id);
        return exists
          ? prev.map((doc) => (doc.id === savedDocument.id ? { ...doc, ...savedDocument } : doc))
          : [savedDocument, ...prev];
      });
    }

    onDocumentSaved?.(savedDocument);

    setNotification({
      type: 'success',
      title: 'Exito',
      message: 'Documento guardado correctamente'
    });
  };

  const handleDeleteDocument = (deletedDocumentId) => {
    setDocumentModalOpen(false);
    setSelectedDocument(null);
    setEditedDocuments((prev) => prev.filter((doc) => doc.id !== deletedDocumentId));
    onDocumentSaved?.({ id: deletedDocumentId, deleted: true });

    setNotification({
      type: 'success',
      title: 'Exito',
      message: 'Documento eliminado correctamente'
    });
  };

  const extractDocumentFiles = (doc) => {
    if (!doc?.archivos_json) return [];

    try {
      const parsed = typeof doc.archivos_json === 'string'
        ? JSON.parse(doc.archivos_json)
        : doc.archivos_json;

      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn('Error parseando archivos del documento:', error);
      return [];
    }
  };

  const handleDownloadDocument = async (doc, event) => {
    event?.stopPropagation();

    const files = extractDocumentFiles(doc);
    const firstFile = files[0] || null;

    if (!firstFile?.download_url) {
      setNotification({
        type: 'warning',
        title: 'Sin archivo',
        message: 'Este documento no tiene archivo disponible para descargar'
      });
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(firstFile.download_url, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = firstFile.nombre_original || `${doc.tipo_nombre || 'documento'}.pdf`;
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

  const getStatusLabel = (status) => {
    if (status === 'vigente') return 'Vigente';
    if (status === 'vencido') return 'Vencido';
    if (status === 'en_tramite') return 'En tramite';
    return status || 'Sin estatus';
  };

  const formatDateForDisplay = (dateValue) => {
    if (!dateValue) return '-';

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-MX');
  };

  const documentTypeMap = new Map(DOCUMENT_TYPES.map((tipo) => [String(tipo.id), tipo.nombre]));

  const availableAmbitos = useMemo(() => (
    Array.from(new Set(
      editedDocuments
        .map((doc) => normalizeText(doc.ambito))
        .filter(Boolean)
    ))
  ), [editedDocuments]);

  const availableStatuses = useMemo(() => (
    Array.from(new Set(
      editedDocuments
        .map((doc) => normalizeText(doc.estatus))
        .filter(Boolean)
    ))
  ), [editedDocuments]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);

    return editedDocuments.filter((doc) => {
      const tipoId = String(doc.tipo_documento_id || '');
      const tipoNombre = documentTypeMap.get(tipoId) || doc.tipo_nombre || '';
      const ambito = normalizeText(doc.ambito);
      const estatus = normalizeText(doc.estatus);

      const matchesTipo = selectedTipo === 'todos' ? true : tipoId === selectedTipo;
      const matchesAmbito = selectedAmbito === 'todos' ? true : ambito === selectedAmbito;
      const matchesEstatus = selectedEstatus === 'todos' ? true : estatus === selectedEstatus;

      const searchableText = [
        tipoNombre,
        doc.ambito,
        doc.estado,
        doc.estatus,
        doc.dependencia_otorga,
        doc.folio_oficio,
        doc.observaciones
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = normalizedQuery ? searchableText.includes(normalizedQuery) : true;

      return matchesTipo && matchesAmbito && matchesEstatus && matchesSearch;
    });
  }, [documentTypeMap, editedDocuments, searchTerm, selectedTipo, selectedAmbito, selectedEstatus]);

  return (
    <div className='documents-section'>
      <div className='section-header'>
        <div className='header-content'>
          <button className='btn-back' onClick={onBack}>Volver</button>
          <h2>Documentos del Vehiculo</h2>
        </div>
        <button className='btn-add-document-header' onClick={handleOpenNewDocumentModal}>
          Agregar Documento
        </button>
      </div>

      <div className='section-content'>
        <div className='read-mode'>
          <div className='documents-history-header'>
            <div>
              <h3>Historial de documentos</h3>
              <p>Consulta permisos, vigencias, dependencias y archivos adjuntos del vehiculo.</p>
            </div>
            <button type='button' className='documents-add-btn' onClick={handleOpenNewDocumentModal}>
              Agregar documento
            </button>
          </div>

          <div className='documents-filters'>
            <div className='documents-search'>
              <label htmlFor='documents-search'>Buscar documento</label>
              <input
                id='documents-search'
                type='search'
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder='Tipo, folio, dependencia u observaciones'
              />
            </div>

            <label>
              Tipo
              <select value={selectedTipo} onChange={(event) => setSelectedTipo(event.target.value)}>
                <option value='todos'>Todos</option>
                {DOCUMENT_TYPES.map((tipo) => (
                  <option key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</option>
                ))}
              </select>
            </label>

            <label>
              Ambito
              <select value={selectedAmbito} onChange={(event) => setSelectedAmbito(event.target.value)}>
                <option value='todos'>Todos</option>
                {availableAmbitos.map((ambito) => (
                  <option key={ambito} value={ambito}>{ambito.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>

            <label>
              Estatus
              <select value={selectedEstatus} onChange={(event) => setSelectedEstatus(event.target.value)}>
                <option value='todos'>Todos</option>
                {availableStatuses.map((estatus) => (
                  <option key={estatus} value={estatus}>{estatus.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
          </div>

          {editedDocuments.length > 0 ? (
            <div className='documents-records-list'>
              {filteredDocuments.map((doc) => {
                const files = extractDocumentFiles(doc);

                return (
                  <div key={doc.id} className='document-record-card'>
                    <div className='document-record-top'>
                      <div>
                        <h4>{documentTypeMap.get(String(doc.tipo_documento_id || '')) || 'Sin tipo'}</h4>
                        <p className='document-record-type'>{doc.folio_oficio || 'Sin folio u oficio'}</p>
                      </div>
                      <div className='document-record-actions'>
                        <button
                          type='button'
                          className='ghost-btn'
                          onClick={() => handleOpenDocumentModal(doc, 'view')}
                        >
                          Ver
                        </button>
                        <button
                          type='button'
                          className='ghost-btn'
                          onClick={() => handleOpenDocumentModal(doc, 'edit')}
                        >
                          Editar
                        </button>
                      </div>
                    </div>

                    <div className='document-record-grid'>
                      <div>
                        <span className='record-label'>Ambito</span>
                        <strong>
                          <span className='badge-ambito'>{String(doc.ambito || '-').replace('_', ' ')}</span>
                        </strong>
                      </div>
                      <div>
                        <span className='record-label'>Vigencia</span>
                        <strong>{formatDateForDisplay(doc.vigencia)}</strong>
                      </div>
                      <div>
                        <span className='record-label'>Estatus</span>
                        <strong>
                          <span className={`badge-estatus ${doc.estatus}`}>{getStatusLabel(doc.estatus)}</span>
                        </strong>
                      </div>
                      <div>
                        <span className='record-label'>Estado</span>
                        <strong>{doc.estado || 'Sin estado'}</strong>
                      </div>
                      <div>
                        <span className='record-label'>Dependencia</span>
                        <strong>{doc.dependencia_otorga || 'Sin dependencia'}</strong>
                      </div>
                    </div>

                    <div className='document-record-body'>
                      <div>
                        <span className='record-label'>Folio u oficio</span>
                        <p>{doc.folio_oficio || 'Sin folio u oficio'}</p>
                      </div>
                      <div>
                        <span className='record-label'>Observaciones</span>
                        <p>{doc.observaciones || 'Sin observaciones'}</p>
                      </div>
                    </div>

                    <div className='document-files-inline'>
                      <span className='record-label'>Documentos adjuntos</span>
                      {files.length === 0 ? (
                        <p>Sin adjuntos</p>
                      ) : (
                        <div className='document-inline-files'>
                          {files.map((fileInfo, index) => (
                            <button
                              key={fileInfo.id || `${fileInfo.nombre_original}-${index}`}
                              type='button'
                              className='file-chip'
                              onClick={(event) => handleDownloadDocument({
                                ...doc,
                                archivos_json: JSON.stringify([fileInfo])
                              }, event)}
                            >
                              {fileInfo.nombre_original || `Archivo ${index + 1}`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className='empty-state'>
              <p>No hay documentos registrados</p>
            </div>
          )}

          {editedDocuments.length > 0 && filteredDocuments.length === 0 && (
            <div className='empty-state empty-state-compact'>
              <p>No se encontraron documentos con los filtros actuales</p>
            </div>
          )}
        </div>
      </div>

      <DocumentModal
        document={selectedDocument}
        vehicleId={vehicleId}
        isOpen={documentModalOpen}
        isNew={isNewDocument}
        mode={documentModalMode}
        onClose={() => setDocumentModalOpen(false)}
        onSave={handleSaveDocument}
        onDelete={handleDeleteDocument}
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

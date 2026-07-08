import { useEffect, useMemo, useState } from 'react';
import NotificationModal from '../../components/Notifications/NotificationModal';
import DriverDocumentModal from './DriverDocumentModal';
import {
  DOCUMENT_STATUS_TIMEZONE,
  getDayKeyInTimeZone,
  getDocumentTimingInput,
  getMillisecondsUntilNextTimeZoneDay
} from '../Vehicles/Sections/documentExpiryUtils';
import './DriverDocumentsSection.css';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const DOCUMENT_TYPES = [
  { id: 1, nombre: 'Licencia de conducir' },
  { id: 2, nombre: 'Acto medico' },
  { id: 3, nombre: 'INE o identificacion oficial' },
  { id: 4, nombre: 'R control' }
];

const extractDocumentFiles = (doc) => {
  if (!doc?.archivos_json) return [];
  try {
    const parsed = typeof doc.archivos_json === 'string' ? JSON.parse(doc.archivos_json) : doc.archivos_json;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDateForDisplay = (dateValue) => {
  if (!dateValue) return '-';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX');
};

export default function DriverDocumentsSection({
  driverId,
  documents = [],
  onCreateDocument,
  onUpdateDocument,
  onDeleteDocument
}) {
  const [editedDocuments, setEditedDocuments] = useState(documents);
  const [notification, setNotification] = useState(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isNewDocument, setIsNewDocument] = useState(false);
  const [documentModalMode, setDocumentModalMode] = useState('view');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('todos');
  const [selectedEstatus, setSelectedEstatus] = useState('todos');
  const [statusDayKey, setStatusDayKey] = useState(() => getDayKeyInTimeZone(DOCUMENT_STATUS_TIMEZONE));

  useEffect(() => {
    setEditedDocuments(documents);
  }, [documents]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStatusDayKey(getDayKeyInTimeZone(DOCUMENT_STATUS_TIMEZONE));
    }, getMillisecondsUntilNextTimeZoneDay(DOCUMENT_STATUS_TIMEZONE));

    return () => window.clearTimeout(timeoutId);
  }, [statusDayKey]);

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

  const availableStatuses = useMemo(() => (
    Array.from(new Set(
      editedDocuments
        .map((doc) => normalizeText(getDocumentTimingInput(doc.vigencia, doc.estatus, DOCUMENT_STATUS_TIMEZONE).label))
        .filter(Boolean)
    ))
  ), [editedDocuments, statusDayKey]);

  const filteredDocuments = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);

    return editedDocuments.filter((doc) => {
      const tipoId = String(doc.tipo_documento_id || '');
      const estatus = normalizeText(getDocumentTimingInput(doc.vigencia, doc.estatus, DOCUMENT_STATUS_TIMEZONE).label);
      const matchesTipo = selectedTipo === 'todos' ? true : tipoId === selectedTipo;
      const matchesEstatus = selectedEstatus === 'todos' ? true : estatus === selectedEstatus;

      const searchableText = [
        doc.nombre_documento,
        DOCUMENT_TYPES.find((tipo) => String(tipo.id) === tipoId)?.nombre,
        getDocumentTimingInput(doc.vigencia, doc.estatus, DOCUMENT_STATUS_TIMEZONE).label,
        doc.observaciones
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = normalizedQuery ? searchableText.includes(normalizedQuery) : true;
      return matchesTipo && matchesEstatus && matchesSearch;
    });
  }, [editedDocuments, searchTerm, selectedTipo, selectedEstatus, statusDayKey]);

  const handleSaveDocument = async (formData, files, documentId) => {
    const savedDocument = documentId
      ? await onUpdateDocument(documentId, formData, files)
      : await onCreateDocument(formData, files);

    setEditedDocuments((prev) => {
      const exists = prev.some((doc) => doc.id === savedDocument.id);
      return exists
        ? prev.map((doc) => (doc.id === savedDocument.id ? savedDocument : doc))
        : [savedDocument, ...prev];
    });

    setNotification({
      type: 'success',
      title: 'Exito',
      message: documentId ? 'Documento actualizado correctamente' : 'Documento creado correctamente'
    });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleDeleteDocument = async (documentId) => {
    await onDeleteDocument(documentId);
    setEditedDocuments((prev) => prev.filter((doc) => doc.id !== documentId));
    setNotification({
      type: 'success',
      title: 'Exito',
      message: 'Documento eliminado correctamente'
    });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleDownloadDocument = async (fileInfo) => {
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

  return (
    <div className="documents-section driver-documents-section">
      <div className="section-header">
        <div className="header-content">
          <div>
            <h2>Documentacion del conductor</h2>
            <p>Licencias, identificaciones y documentos del expediente.</p>
          </div>
        </div>
        <button className="btn-add-document-header" onClick={handleOpenNewDocumentModal}>
          Agregar documento
        </button>
      </div>

      <div className="section-content">
        <div className="documents-history-header">
          <div>
            <h3>Historial de documentos</h3>
            <p>Consulta vigencias, estatus y archivos adjuntos del conductor.</p>
          </div>
          <button type="button" className="documents-add-btn" onClick={handleOpenNewDocumentModal}>
            Agregar documento
          </button>
        </div>

        <div className="documents-filters">
          <div className="documents-search">
            <label htmlFor="driver-documents-search">Buscar documento</label>
            <input
              id="driver-documents-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre, tipo, vigencia u observaciones"
            />
          </div>

          <label>
            Tipo
            <select value={selectedTipo} onChange={(event) => setSelectedTipo(event.target.value)}>
              <option value="todos">Todos</option>
              {DOCUMENT_TYPES.map((tipo) => (
                <option key={tipo.id} value={String(tipo.id)}>{tipo.nombre}</option>
              ))}
            </select>
          </label>

          <label>
            Estatus
            <select value={selectedEstatus} onChange={(event) => setSelectedEstatus(event.target.value)}>
              <option value="todos">Todos</option>
              {availableStatuses.map((estatus) => (
                <option key={estatus} value={estatus}>{estatus.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </label>
        </div>

        {editedDocuments.length > 0 ? (
          <div className="documents-records-list">
            {filteredDocuments.map((doc) => {
              const files = extractDocumentFiles(doc);
              const timing = getDocumentTimingInput(doc.vigencia, doc.estatus, DOCUMENT_STATUS_TIMEZONE);
              const typeLabel = DOCUMENT_TYPES.find((tipo) => tipo.id === Number(doc.tipo_documento_id))?.nombre || 'Sin tipo';

              return (
                <div key={doc.id} className={`document-record-card tone-${timing.tone}`}>
                  <div className="document-record-top">
                    <div>
                      <h4>{doc.nombre_documento || typeLabel}</h4>
                      <p className="document-record-type">{typeLabel}</p>
                    </div>
                    <div className="document-record-actions">
                      <button type="button" className="ghost-btn" onClick={() => handleOpenDocumentModal(doc, 'view')}>
                        Ver
                      </button>
                      <button type="button" className="ghost-btn" onClick={() => handleOpenDocumentModal(doc, 'edit')}>
                        Editar
                      </button>
                    </div>
                  </div>

                  <div className="document-record-grid">
                    <div>
                      <span className="record-label">Tipo</span>
                      <strong>{typeLabel}</strong>
                    </div>
                    <div>
                      <span className="record-label">Vigencia</span>
                      <strong>{timing.status === 'no_aplica' ? 'No aplica' : formatDateForDisplay(doc.vigencia)}</strong>
                    </div>
                    <div>
                      <span className="record-label">Estatus</span>
                      <strong>
                        <span className={`badge-estatus ${timing.status || 'neutral'}`}>{timing.label}</span>
                      </strong>
                    </div>
                    <div>
                      <span className="record-label">Adjuntos</span>
                      <strong>{files.length || 0}</strong>
                    </div>
                  </div>

                  <div className="document-record-body">
                    <div>
                      <span className="record-label">Observaciones</span>
                      <p>{doc.observaciones || 'Sin observaciones'}</p>
                    </div>
                  </div>

                  <div className="document-files-inline">
                    <span className="record-label">Documentos adjuntos</span>
                    {files.length === 0 ? (
                      <p>Sin adjuntos</p>
                    ) : (
                      <div className="document-inline-files">
                        {files.map((fileInfo, index) => (
                          <button
                            key={fileInfo.id || `${fileInfo.nombre_original}-${index}`}
                            type="button"
                            className="file-chip"
                            onClick={async () => {
                              try {
                                await handleDownloadDocument(fileInfo);
                              } catch (error) {
                                setNotification({
                                  type: 'error',
                                  title: 'Error',
                                  message: error.message || 'No se pudo descargar el archivo'
                                });
                              }
                            }}
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
          <div className="empty-state">
            <p>No hay documentos registrados</p>
          </div>
        )}

        {editedDocuments.length > 0 && filteredDocuments.length === 0 && (
          <div className="empty-state empty-state-compact">
            <p>No se encontraron documentos con los filtros actuales</p>
          </div>
        )}
      </div>

      <DriverDocumentModal
        driverId={driverId}
        document={selectedDocument}
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

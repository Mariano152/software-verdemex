import { useEffect, useMemo, useState } from 'react';
import NotificationModal from '../../components/Notifications/NotificationModal';
import DriverHistoryModal from './DriverHistoryModal';
import './DriverHistorySection.css';

const normalizeText = (value) => String(value || '').trim().toLowerCase();

const extractFiles = (record) => {
  if (!record?.archivos_json) return [];
  try {
    const parsed = typeof record.archivos_json === 'string' ? JSON.parse(record.archivos_json) : record.archivos_json;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-MX');
};

export default function DriverHistorySection({
  driverId,
  records = [],
  onCreateHistory,
  onUpdateHistory,
  onDeleteHistory
}) {
  const [items, setItems] = useState(records);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [modalMode, setModalMode] = useState('view');

  useEffect(() => {
    setItems(records);
  }, [records]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);
    return items.filter((record) => {
      const searchableText = [record.nombre, record.descripcion].filter(Boolean).join(' ').toLowerCase();
      const matchesText = normalizedQuery ? searchableText.includes(normalizedQuery) : true;
      const recordDate = record.fecha_registro ? String(record.fecha_registro).slice(0, 10) : '';
      const matchesStartDate = startDate ? recordDate && recordDate >= startDate : true;
      const matchesEndDate = endDate ? recordDate && recordDate <= endDate : true;
      return matchesText && matchesStartDate && matchesEndDate;
    });
  }, [endDate, items, searchTerm, startDate]);

  const openNewModal = () => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedRecord(null);
    setIsNewRecord(true);
    setModalMode('edit');
    setModalOpen(true);
  };

  const openModal = (record, mode = 'view') => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    setSelectedRecord(record);
    setIsNewRecord(false);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleSave = async (formData, files, recordId) => {
    const savedRecord = recordId
      ? await onUpdateHistory(recordId, formData, files)
      : await onCreateHistory(formData, files);

    setItems((current) => {
      const exists = current.some((item) => item.id === savedRecord.id);
      return exists
        ? current.map((item) => (item.id === savedRecord.id ? savedRecord : item))
        : [savedRecord, ...current];
    });

    setNotification({
      type: 'success',
      title: 'Exito',
      message: recordId ? 'Historial actualizado correctamente' : 'Historial creado correctamente'
    });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleDelete = async (recordId) => {
    await onDeleteHistory(recordId);
    setItems((current) => current.filter((item) => item.id !== recordId));
    setNotification({
      type: 'success',
      title: 'Exito',
      message: 'Historial eliminado correctamente'
    });
    setTimeout(() => setNotification(null), 2500);
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

  return (
    <div className="maintenance-section driver-history-section">
      <div className="section-header">
        <div className="header-left">
          <div className="header-info">
            <h2>Historial del conductor</h2>
            <p className="header-caption">Registra incidentes, observaciones, seguimientos o cualquier evento importante.</p>
          </div>
        </div>
        <div className="header-right">
          <button type="button" className="maintenance-add-btn" onClick={openNewModal}>
            Agregar historial
          </button>
        </div>
      </div>

      <div className="maintenance-history-section">
        <div className="maintenance-history-header">
          <div>
            <h3>Registros de historial</h3>
            <p>Guarda nombre, descripcion y todos los adjuntos necesarios para el expediente del conductor.</p>
          </div>
          <button type="button" className="maintenance-add-btn" onClick={openNewModal}>
            Agregar historial
          </button>
        </div>

        <div className="records-filter-grid driver-history-filters">
          <div className="records-search-field">
            <label htmlFor="driver-history-search">Buscar registro</label>
            <input
              id="driver-history-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Nombre o descripcion"
            />
          </div>
          <div className="records-search-field">
            <label htmlFor="driver-history-start-date">Fecha desde</label>
            <input
              id="driver-history-start-date"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div className="records-search-field">
            <label htmlFor="driver-history-end-date">Fecha hasta</label>
            <input
              id="driver-history-end-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>

        <div className="maintenance-records-list">
          {items.length === 0 ? (
            <div className="maintenance-empty-state">
              <p>Aun no hay registros de historial para este conductor.</p>
              <button type="button" className="maintenance-add-btn maintenance-add-btn-inline" onClick={openNewModal}>
                Agregar primer registro
              </button>
            </div>
          ) : (
            filteredItems.map((record) => {
              const files = extractFiles(record);
              return (
                <div key={record.id} className="maintenance-record-card">
                  <div className="maintenance-record-top">
                    <div>
                      <h4>{record.nombre}</h4>
                      <p className="maintenance-record-type">Actualizado {formatDate(record.updated_at || record.created_at)}</p>
                    </div>
                    <div className="maintenance-record-actions">
                      <button type="button" className="ghost-btn" onClick={() => openModal(record, 'view')}>Ver</button>
                      <button type="button" className="ghost-btn" onClick={() => openModal(record, 'edit')}>Editar</button>
                      <button type="button" className="danger-btn" onClick={() => handleDelete(record.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className="maintenance-record-grid driver-history-grid">
                    <div>
                      <span className="record-label">Nombre</span>
                      <strong>{record.nombre}</strong>
                    </div>
                    <div>
                      <span className="record-label">Fecha</span>
                      <strong>{formatDate(record.fecha_registro)}</strong>
                    </div>
                    <div>
                      <span className="record-label">Adjuntos</span>
                      <strong>{files.length}</strong>
                    </div>
                  </div>

                  <div className="document-record-body">
                    <div>
                      <span className="record-label">Descripcion</span>
                      <p>{record.descripcion || 'Sin descripcion'}</p>
                    </div>
                  </div>

                  <div className="document-files-inline">
                    <span className="record-label">Adjuntos</span>
                    {files.length === 0 ? (
                      <p>Sin adjuntos</p>
                    ) : (
                      <div className="document-inline-files">
                        {files.map((fileInfo, index) => (
                          <button
                            key={fileInfo.id || `${fileInfo.nombre_original}-${index}`}
                            type="button"
                            className="file-chip"
                            onClick={() => handleDownload(fileInfo)}
                          >
                            {fileInfo.nombre_original || `Archivo ${index + 1}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && filteredItems.length === 0 && (
          <div className="maintenance-empty-state">
            <p>No se encontraron registros con los filtros actuales.</p>
          </div>
        )}
      </div>

      <DriverHistoryModal
        driverId={driverId}
        record={selectedRecord}
        isOpen={modalOpen}
        isNew={isNewRecord}
        mode={modalMode}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        onDelete={handleDelete}
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

import { useEffect, useMemo, useState } from 'react';
import NotificationModal from '../../components/Notifications/NotificationModal';
import DriverRatingModal from './DriverRatingModal';
import { buildWeekOptions, formatWeekRangeLabel } from './driverRatingWeeks';
import './DriverRatingSection.css';

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

export default function DriverRatingSection({
  driverId,
  ratings = [],
  onCreateRating,
  onUpdateRating,
  onDeleteRating
}) {
  const [items, setItems] = useState(ratings);
  const [notification, setNotification] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScore, setSelectedScore] = useState('todos');
  const [selectedYear, setSelectedYear] = useState('todos');
  const [weekFrom, setWeekFrom] = useState('todos');
  const [weekTo, setWeekTo] = useState('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [modalMode, setModalMode] = useState('view');

  useEffect(() => {
    setItems(ratings);
  }, [ratings]);

  const availableYears = useMemo(() => (
    Array.from(new Set(items.map((item) => String(item.rating_year || '')).filter(Boolean))).sort((a, b) => Number(b) - Number(a))
  ), [items]);

  const weekOptions = useMemo(() => {
    if (selectedYear === 'todos') {
      return [];
    }

    return buildWeekOptions(selectedYear);
  }, [selectedYear]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = normalizeText(searchTerm);
    return items.filter((record) => {
      const matchesScore = selectedScore === 'todos' ? true : String(record.calificacion) === selectedScore;
      const matchesYear = selectedYear === 'todos' ? true : String(record.rating_year) === selectedYear;
      const numericWeek = Number(record.week_number || 0);
      const matchesWeekFrom = weekFrom === 'todos' ? true : numericWeek >= Number(weekFrom);
      const matchesWeekTo = weekTo === 'todos' ? true : numericWeek <= Number(weekTo);
      const searchableText = [
        record.descripcion,
        record.semana_inicio,
        record.semana_fin,
        `semana ${record.week_number}`,
        `anio ${record.rating_year}`,
        `rating ${record.calificacion}`
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      const matchesSearch = normalizedQuery ? searchableText.includes(normalizedQuery) : true;
      return matchesScore && matchesSearch && matchesYear && matchesWeekFrom && matchesWeekTo;
    });
  }, [items, searchTerm, selectedScore, selectedYear, weekFrom, weekTo]);

  const averageRating = useMemo(() => {
    if (!filteredItems.length) return '0.0';
    const total = filteredItems.reduce((sum, item) => sum + Number(item.calificacion || 0), 0);
    return (total / filteredItems.length).toFixed(1);
  }, [filteredItems]);

  const availableScores = useMemo(() => (
    Array.from(new Set(items.map((item) => String(item.calificacion || '')).filter(Boolean))).sort((a, b) => Number(b) - Number(a))
  ), [items]);

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
      ? await onUpdateRating(recordId, formData, files)
      : await onCreateRating(formData, files);

    setItems((current) => {
      const exists = current.some((item) => item.id === savedRecord.id);
      return exists
        ? current.map((item) => (item.id === savedRecord.id ? savedRecord : item))
        : [savedRecord, ...current];
    });

    setNotification({
      type: 'success',
      title: 'Exito',
      message: recordId ? 'Rating actualizado correctamente' : 'Rating creado correctamente'
    });
    setTimeout(() => setNotification(null), 2500);
  };

  const handleDelete = async (recordId) => {
    await onDeleteRating(recordId);
    setItems((current) => current.filter((item) => item.id !== recordId));
    setNotification({
      type: 'success',
      title: 'Exito',
      message: 'Rating eliminado correctamente'
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
    link.download = fileInfo.nombre_original || 'rating';
    window.document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="maintenance-section driver-rating-section">
      <div className="section-header">
        <div className="header-left">
          <div className="header-info">
            <h2>Rating semanal</h2>
            <p className="header-caption">Evaluacion exclusiva del manager por semana, con calificacion de 0.1 a 10.</p>
          </div>
        </div>
        <div className="header-right">
          <button type="button" className="maintenance-add-btn" onClick={openNewModal}>
            Agregar rating
          </button>
        </div>
      </div>

      <div className="maintenance-history-section">
        <div className="maintenance-history-header">
          <div>
            <h3>Historial de ratings</h3>
            <p>Promedio actual: <strong>{averageRating}</strong> / 10</p>
          </div>
          <button type="button" className="maintenance-add-btn" onClick={openNewModal}>
            Agregar rating
          </button>
        </div>

        <div className="records-filter-grid driver-rating-filters">
          <div className="records-search-field">
            <label htmlFor="driver-rating-search">Buscar rating</label>
            <input
              id="driver-rating-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Semana, descripcion o anio"
            />
          </div>

          <label>
            Calificacion
            <select value={selectedScore} onChange={(event) => setSelectedScore(event.target.value)}>
              <option value="todos">Todos</option>
              {availableScores.map((score) => (
                <option key={score} value={score}>{score}</option>
              ))}
            </select>
          </label>

          <label>
            Año
            <select
              value={selectedYear}
              onChange={(event) => {
                const nextYear = event.target.value;
                setSelectedYear(nextYear);
                setWeekFrom('todos');
                setWeekTo('todos');
              }}
            >
              <option value="todos">Todos</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </label>

          <label>
            Semana desde
            <select
              value={weekFrom}
              onChange={(event) => setWeekFrom(event.target.value)}
              disabled={selectedYear === 'todos'}
            >
              <option value="todos">Todas</option>
              {weekOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label>
            Semana hasta
            <select
              value={weekTo}
              onChange={(event) => setWeekTo(event.target.value)}
              disabled={selectedYear === 'todos'}
            >
              <option value="todos">Todas</option>
              {weekOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="maintenance-records-list">
          {items.length === 0 ? (
            <div className="maintenance-empty-state">
              <p>Aun no hay ratings semanales para este conductor.</p>
              <button type="button" className="maintenance-add-btn maintenance-add-btn-inline" onClick={openNewModal}>
                Agregar primer rating
              </button>
            </div>
          ) : (
            filteredItems.map((record) => {
              const files = extractFiles(record);
              return (
                <div key={record.id} className="maintenance-record-card driver-rating-card">
                  <div className="maintenance-record-top">
                    <div>
                      <h4>Semana {record.week_number || '-'} de {record.rating_year || '-'}</h4>
                      <p className="maintenance-record-type">{formatWeekRangeLabel(record.semana_inicio, record.semana_fin)}</p>
                    </div>
                    <div className="maintenance-record-actions">
                      <button type="button" className="ghost-btn" onClick={() => openModal(record, 'view')}>Ver</button>
                      <button type="button" className="ghost-btn" onClick={() => openModal(record, 'edit')}>Editar</button>
                      <button type="button" className="danger-btn" onClick={() => handleDelete(record.id)}>Eliminar</button>
                    </div>
                  </div>

                  <div className="maintenance-record-grid driver-rating-grid">
                    <div>
                      <span className="record-label">Fecha</span>
                      <strong>{formatDate(record.fecha_registro)}</strong>
                    </div>
                    <div>
                      <span className="record-label">Semana</span>
                      <strong>Semana {record.week_number || '-'} / {record.rating_year || '-'}</strong>
                    </div>
                    <div>
                      <span className="record-label">Rango</span>
                      <strong>{formatWeekRangeLabel(record.semana_inicio, record.semana_fin)}</strong>
                    </div>
                    <div>
                      <span className="record-label">Rating</span>
                      <strong>{record.calificacion} / 10</strong>
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
            <p>No se encontraron ratings con los filtros actuales.</p>
          </div>
        )}
      </div>

      <DriverRatingModal
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

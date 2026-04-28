import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './VehicleStatusHistory.css';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === '') return 'Vacio';
  if (typeof value === 'number') return value.toLocaleString('es-MX');
  return String(value);
};

const getActionLabel = (action) => {
  switch (action) {
    case 'crear': return 'Creacion';
    case 'actualizar': return 'Actualizacion';
    case 'eliminar': return 'Eliminacion';
    case 'agregar_archivo': return 'Archivo agregado';
    case 'eliminar_archivo': return 'Archivo eliminado';
    default: return action || '-';
  }
};

const renderEntryChanges = (entry) => {
  const details = entry.detalles_json || {};
  const blocks = [];

  if (Array.isArray(details.changes) && details.changes.length > 0) {
    blocks.push(
      <div key='changes' className='history-change-block'>
        <p className='history-change-title'>Cambios</p>
        {details.changes.map((change, index) => (
          <p key={`${change.field || change.label}-${index}`}>
            <strong>{change.label || change.field}:</strong> {formatValue(change.before)} → {formatValue(change.after)}
          </p>
        ))}
      </div>
    );
  }

  if (Array.isArray(details.elementos_actualizados) && details.elementos_actualizados.length > 0) {
    blocks.push(
      <div key='elements' className='history-change-block'>
        <p className='history-change-title'>Elementos de seguridad</p>
        {details.elementos_actualizados.map((item, itemIndex) => (
          <div key={`element-${item.elemento_seguridad_id || itemIndex}`} className='history-subgroup'>
            <p><strong>{item.elemento_nombre || `Elemento ${item.elemento_seguridad_id || itemIndex}`}</strong></p>
            {(item.changes || []).map((change, changeIndex) => (
              <p key={`${change.field || change.label}-${changeIndex}`}>
                <strong>{change.label || change.field}:</strong> {formatValue(change.before)} → {formatValue(change.after)}
              </p>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (Array.isArray(details.estado_changes) && details.estado_changes.length > 0) {
    blocks.push(
      <div key='status' className='history-change-block'>
        <p className='history-change-title'>Estado</p>
        {details.estado_changes.map((change, index) => (
          <p key={`${change.field || change.label}-${index}`}>
            <strong>{change.label || change.field}:</strong> {formatValue(change.before)} → {formatValue(change.after)}
          </p>
        ))}
      </div>
    );
  }

  if (Array.isArray(details.descripciones_actualizadas) && details.descripciones_actualizadas.length > 0) {
    blocks.push(
      <div key='photo-descriptions' className='history-change-block'>
        <p className='history-change-title'>Descripciones de fotos</p>
        {details.descripciones_actualizadas.map((change, index) => (
          <p key={`${change.field || change.label}-${index}`}>
            <strong>{change.label || change.field}:</strong> {formatValue(change.before)} → {formatValue(change.after)}
          </p>
        ))}
      </div>
    );
  }

  if (Array.isArray(details.fotos_agregadas) && details.fotos_agregadas.length > 0) {
    blocks.push(
      <div key='photo-added' className='history-change-block'>
        <p className='history-change-title'>Fotos agregadas o reemplazadas</p>
        {details.fotos_agregadas.map((item, index) => (
          <p key={`${item.field}-${index}`}>{item.label}</p>
        ))}
      </div>
    );
  }

  if (Array.isArray(details.fotos_eliminadas) && details.fotos_eliminadas.length > 0) {
    blocks.push(
      <div key='photo-removed' className='history-change-block'>
        <p className='history-change-title'>Fotos eliminadas</p>
        {details.fotos_eliminadas.map((item, index) => (
          <p key={`${item.field}-${index}`}>{item.label}</p>
        ))}
      </div>
    );
  }

  if (Array.isArray(details.archivos_agregados) && details.archivos_agregados.length > 0) {
    blocks.push(
      <div key='files-added' className='history-change-block'>
        <p className='history-change-title'>Archivos agregados</p>
        {details.archivos_agregados.map((fileName, index) => (
          <p key={`${fileName}-${index}`}>{fileName}</p>
        ))}
      </div>
    );
  }

  return blocks;
};

const getModuleLabel = (moduleName) => {
  switch (moduleName) {
    case 'documentos': return 'Documentos';
    case 'mantenimiento': return 'Mantenimiento';
    case 'gasolina': return 'Gasolina';
    case 'fotos': return 'Fotografias';
    default: return moduleName || 'General';
  }
};

const getModuleColor = (moduleName) => {
  switch (moduleName) {
    case 'documentos': return '#2d7a3e';
    case 'mantenimiento': return '#e74c3c';
    case 'gasolina': return '#16a085';
    case 'fotos': return '#f39c12';
    default: return '#34495e';
  }
};

const buildHistoryTarget = (vehicleId, entry) => {
  const sectionByModule = {
    documentos: 'documents',
    mantenimiento: 'maintenance',
    gasolina: 'gasoline',
    fotos: 'photos'
  };

  const section = sectionByModule[entry.modulo];
  if (!section) {
    return `/vehicles/${vehicleId}/edit`;
  }

  const params = new URLSearchParams();
  params.set('section', section);
  params.set('historyId', entry.id);

  const action = entry.accion || '';
  const entityType = entry.entidad_tipo || '';
  const entityId = entry.entidad_id || '';
  const details = entry.detalles_json || {};

  const isDeletion = action === 'eliminar';
  if (!isDeletion) {
    if (section === 'documents' && entityType === 'document' && entityId) {
      params.set('documentId', entityId);
    }

    if (section === 'maintenance' && entityType === 'maintenance_record' && entityId) {
      params.set('maintenanceId', entityId);
    }

    if (section === 'gasoline' && entityType === 'gasoline_record' && entityId) {
      params.set('gasolineId', entityId);
    }
  }

  if (action === 'eliminar_archivo') {
    if (section === 'documents' && details.documento_id) {
      params.set('documentId', String(details.documento_id));
    }
    if (section === 'maintenance' && details.maintenance_id) {
      params.set('maintenanceId', String(details.maintenance_id));
    }
    if (section === 'gasoline' && details.gasoline_id) {
      params.set('gasolineId', String(details.gasoline_id));
    }
  }

  return `/vehicles/${vehicleId}/edit?${params.toString()}`;
};

export default function VehicleStatusHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('authToken');

        const [vehicleResponse, historyResponse] = await Promise.all([
          fetch(`/api/vehicles/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }),
          fetch(`/api/vehicles/${id}/history`, {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        ]);

        if (!vehicleResponse.ok || !historyResponse.ok) {
          throw new Error('No se pudo cargar el historial');
        }

        const vehicleData = await vehicleResponse.json();
        const historyData = await historyResponse.json();

        setVehicle(vehicleData);
        setHistory(historyData.history || []);
      } catch (fetchError) {
        console.error('Error cargando historial:', fetchError);
        setError(fetchError.message || 'Error al cargar historial');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className='vehicle-status-history'>
        <div className='card'>
          <div className='card-header'>Cargando historial...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='vehicle-status-history'>
        <div className='page-header'>
          <button className='btn btn-outline' onClick={() => navigate(`/vehicles/${id}/edit`)}>← Volver</button>
        </div>
        <div className='card'>
          <div className='card-header'>Error</div>
          <div className='history-empty-state'>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className='vehicle-status-history'>
      <div className='page-header'>
        <button className='btn btn-outline' onClick={() => navigate(`/vehicles/${id}/edit`)}>← Volver</button>
        <div>
          <h1>Historial del vehiculo</h1>
          <p className='subtitle'>Vehiculo: {vehicle?.placa || id}</p>
        </div>
      </div>

      <div className='card'>
        <div className='card-header'>Cambios registrados</div>

        {history.length === 0 ? (
          <div className='history-empty-state'>
            Aun no hay cambios registrados para este vehiculo.
          </div>
        ) : (
          <div className='timeline'>
            {history.map((entry) => (
              <div
                key={entry.id}
                className='timeline-item timeline-item-clickable'
                onClick={() => navigate(buildHistoryTarget(id, entry))}
              >
                <div
                  className='timeline-marker'
                  style={{ backgroundColor: getModuleColor(entry.modulo), color: getModuleColor(entry.modulo) }}
                />
                <div className='timeline-content'>
                  <div className='timeline-header'>
                    <span className='timeline-status' style={{ color: getModuleColor(entry.modulo) }}>
                      {getModuleLabel(entry.modulo)}
                    </span>
                    <span className='timeline-date'>{formatDateTime(entry.created_at)}</span>
                  </div>

                  <div className='timeline-details'>
                    <p><strong>{entry.descripcion}</strong></p>
                    <p>Usuario: {entry.usuario_nombre || 'Sistema'}</p>
                    <p>Accion: {getActionLabel(entry.accion)}</p>
                    {renderEntryChanges(entry)}
                    {entry.accion === 'eliminar'
                      ? <p>Este cambio fue una eliminacion, por eso solo abre la seccion.</p>
                      : <p>Haz clic para ir a la seccion relacionada.</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

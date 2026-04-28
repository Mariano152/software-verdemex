import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ExpedienteSection.css';

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

export default function ExpedienteSection({ vehicleId }) {
  const navigate = useNavigate();
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecentHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/vehicles/${vehicleId}/history?limit=4`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) throw new Error('Error al obtener historial');

        const data = await response.json();
        setRecentHistory(data.history || []);
      } catch (fetchError) {
        console.error('Error cargando historial reciente:', fetchError);
        setError('No se pudo cargar el historial');
      } finally {
        setLoading(false);
      }
    };

    if (vehicleId) {
      fetchRecentHistory();
    }
  }, [vehicleId]);

  return (
    <div className='expediente-section'>
      <div className='expediente-header'>
        <h3>🕘 Historial</h3>
        <button className='btn-create-expediente' onClick={() => navigate(`/vehicles/${vehicleId}/history`)}>
          Ver todo
        </button>
      </div>

      {loading ? (
        <div className='expediente-empty'>
          <p>Cargando historial...</p>
        </div>
      ) : error ? (
        <div className='expediente-empty'>
          <p>{error}</p>
        </div>
      ) : recentHistory.length === 0 ? (
        <div className='expediente-empty'>
          <p>Aun no hay movimientos registrados para este vehiculo.</p>
        </div>
      ) : (
        <div className='expedientes-list'>
          {recentHistory.map((entry) => (
            <div
              key={entry.id}
              className='expediente-card history-card'
              onClick={() => navigate(`/vehicles/${vehicleId}/history`)}
            >
              <div className='expediente-card-header'>
                <h4>{entry.descripcion}</h4>
                <div
                  className='estado-badge'
                  style={{
                    backgroundColor: `${getModuleColor(entry.modulo)}22`,
                    borderColor: getModuleColor(entry.modulo),
                    color: getModuleColor(entry.modulo)
                  }}
                >
                  {getModuleLabel(entry.modulo)}
                </div>
              </div>

              <div className='expediente-stats history-meta'>
                <span className='stat'>{entry.usuario_nombre || 'Sistema'}</span>
                <span className='stat'>{formatDateTime(entry.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import './ExpedienteSection.css';

export default function ExpedienteSection({ vehicleId, onNavigateToExpediente }) {
  const [expedientes, setExpedientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Obtener expedientes cuando monta el componente
  useEffect(() => {
    fetchExpedientes();
  }, [vehicleId]);

  const fetchExpedientes = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/expedientes/vehicle/${vehicleId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Error al obtener expedientes');

      const data = await response.json();
      setExpedientes(data.expedientes || []);
    } catch (error) {
      console.error('❌ Error:', error);
      setNotification({
        type: 'error',
        message: 'Error al cargar expedientes'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpediente = async () => {
    const titulo = prompt('Ingrese el título del expediente:');
    if (!titulo?.trim()) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/expedientes/vehicle/${vehicleId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ titulo })
      });

      if (!response.ok) throw new Error('Error al crear expediente');

      const newExpediente = await response.json();
      setExpedientes([newExpediente, ...expedientes]);
      setNotification({
        type: 'success',
        message: '✅ Expediente creado correctamente'
      });
    } catch (error) {
      console.error('❌ Error:', error);
      setNotification({
        type: 'error',
        message: 'Error al crear expediente'
      });
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (expediente) => {
    const total = parseInt(expediente.total_items) || 0;
    const completados = parseInt(expediente.items_completados) || 0;
    if (total === 0) return 0;
    return Math.round((completados / total) * 100);
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'activo': return '#3498db';
      case 'completado': return '#27ae60';
      case 'archivado': return '#95a5a6';
      case 'cancelado': return '#e74c3c';
      default: return '#34495e';
    }
  };

  if (loading) {
    return (
      <div className='expediente-section'>
        <div className='expediente-header'>
          <h3>📋 Expediente</h3>
          <span className='loading'>Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className='expediente-section'>
      <div className='expediente-header'>
        <h3>📋 Expediente</h3>
        <button className='btn-create-expediente' onClick={handleCreateExpediente}>
          ➕ Nuevo
        </button>
      </div>

      {expedientes.length === 0 ? (
        <div className='expediente-empty'>
          <p>No hay expedientes. Crea uno para comenzar.</p>
        </div>
      ) : (
        <div className='expedientes-list'>
          {expedientes.map(exp => {
            const progress = getProgressPercentage(exp);
            return (
              <div key={exp.id} className='expediente-card'>
                <div className='expediente-card-header'>
                  <h4>{exp.titulo}</h4>
                  <div 
                    className='estado-badge'
                    style={{ backgroundColor: getEstadoColor(exp.estado) + '22', 
                             borderColor: getEstadoColor(exp.estado) }}
                  >
                    {exp.estado}
                  </div>
                </div>

                {exp.descripcion && (
                  <p className='expediente-description'>{exp.descripcion}</p>
                )}

                <div className='expediente-stats'>
                  <span className='stat'>
                    📝 {exp.items_completados}/{exp.total_items}
                  </span>
                  <span className='stat'>
                    🎯 {progress}%
                  </span>
                </div>

                <div className='progress-bar'>
                  <div 
                    className='progress-fill' 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>

                <button 
                  className='btn-access-expediente'
                  onClick={() => onNavigateToExpediente(exp.id)}
                >
                  📖 Acceder →
                </button>
              </div>
            );
          })}
        </div>
      )}

      {notification && (
        <div className={`notification notification-${notification.type}`}>
          {notification.message}
        </div>
      )}
    </div>
  );
}

import { useParams, Link } from 'react-router-dom';
import { mockVehicles } from '../../data/mockData';
import './VehicleStatusHistory.css';

export default function VehicleStatusHistory() {
  const { id } = useParams();
  const vehicle = mockVehicles.find(v => v.id === parseInt(id));

  const history = [
    { id: 1, status: 'En ruta', date: '2024-03-08 14:30', route: 'CDMX → MTY', driver: 'Juan Rodríguez', duration: '6h 45min' },
    { id: 2, status: 'Disponible', date: '2024-03-08 08:00', location: 'Centro de Distribución', notes: 'Listo para salir' },
    { id: 3, status: 'En ruta', date: '2024-03-07 10:15', route: 'MTY → Guadalajara', driver: 'Carlos López', duration: '8h 30min' },
    { id: 4, status: 'Mantenimiento', date: '2024-03-06 09:00', service: 'Cambio de aceite y filtros', cost: '$1,200' },
    { id: 5, status: 'Disponible', date: '2024-03-05 16:45', location: 'Centro de Distribución' },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'En ruta': return '#27ae60';
      case 'Disponible': return '#3498db';
      case 'Mantenimiento': return '#f39c12';
      case 'Inactivo': return '#e74c3c';
      default: return '#2d7a3e';
    }
  };

  return (
    <div className="vehicle-status-history">
      <div className="page-header">
        <Link to={`/vehicles/${id}`} className="btn btn-outline">← Volver</Link>
        <div>
          <h1>Historial de Estado</h1>
          <p className="subtitle">Vehículo: {vehicle?.plate}</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header">Últimos Cambios de Estado</div>
        <div className="timeline">
          {history.map((event) => (
            <div key={event.id} className="timeline-item">
              <div className="timeline-marker" style={{ backgroundColor: getStatusColor(event.status) }}></div>
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-status" style={{ color: getStatusColor(event.status) }}>
                    {event.status}
                  </span>
                  <span className="timeline-date">{event.date}</span>
                </div>
                <div className="timeline-details">
                  {event.route && <p>📍 Ruta: {event.route}</p>}
                  {event.driver && <p>👤 Conductor: {event.driver}</p>}
                  {event.duration && <p>⏱️ Duración: {event.duration}</p>}
                  {event.location && <p>📍 Ubicación: {event.location}</p>}
                  {event.service && <p>🔧 Servicio: {event.service}</p>}
                  {event.cost && <p>💰 Costo: {event.cost}</p>}
                  {event.notes && <p>📝 {event.notes}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

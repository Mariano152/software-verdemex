import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { mockVehicles } from '../../data/mockData';
import './VehicleEventCreate.css';

export default function VehicleEventCreate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const vehicle = mockVehicles.find(v => v.id === parseInt(id));
  const [submitted, setSubmitted] = useState(false);

  const [formData, setFormData] = useState({
    type: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    mileage: '',
    cost: '',
  });

  const eventTypes = [
    'Mantenimiento',
    'Reparación',
    'Limpieza',
    'Inspección',
    'Carga de Combustible',
    'Accidente',
    'Multa de Tránsito',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      navigate(`/vehicles/${id}`);
    }, 800);
  };

  return (
    <div className="vehicle-event-create">
      <div className="form-header">
        <Link to={`/vehicles/${id}`} className="btn btn-outline">← Volver</Link>
        <div>
          <h1>Registrar Evento</h1>
          <p className="subtitle">Vehículo: {vehicle?.plate}</p>
        </div>
      </div>

      {submitted && (
        <div className="alert alert-success">
          ✓ Evento registrado correctamente
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="type">Tipo de Evento *</label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar tipo...</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="date">Fecha *</label>
              <input
                id="date"
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="mileage">Kilometraje</label>
              <input
                id="mileage"
                type="number"
                name="mileage"
                value={formData.mileage}
                onChange={handleChange}
                placeholder="150000"
              />
            </div>
            <div className="form-group">
              <label htmlFor="cost">Costo (MXN)</label>
              <input
                id="cost"
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Descripción</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detalles del evento..."
            ></textarea>
          </div>

          <div className="form-actions">
            <Link to={`/vehicles/${id}`} className="btn btn-outline">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary btn-lg">
              ✓ Registrar Evento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

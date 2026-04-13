import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { mockDrivers } from '../../data/mockData';
import './DriverEdit.css';

export default function DriverEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const driver = mockDrivers.find(d => d.id === parseInt(id));

  const [formData, setFormData] = useState(driver || {});
  const [submitted, setSubmitted] = useState(false);

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
      navigate(`/drivers/${id}`);
    }, 800);
  };

  if (!driver) {
    return (
      <div className="driver-edit">
        <div className="alert alert-danger">
          Conductor no encontrado
        </div>
        <Link to="/drivers" className="btn btn-primary">
          Volver a Conductores
        </Link>
      </div>
    );
  }

  return (
    <div className="driver-edit">
      <div className="form-header">
        <Link to={`/drivers/${id}`} className="btn btn-outline">← Volver</Link>
        <div>
          <h1>Editar Conductor</h1>
          <p className="subtitle">{driver.name}</p>
        </div>
      </div>

      {submitted && (
        <div className="alert alert-success">
          ✓ Cambios guardados correctamente. Redirigiendo...
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Información Personal */}
          <div className="form-section">
            <h3>Información Personal</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Nombre Completo</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Correo Electrónico</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="phone">Teléfono</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="status">Estado</label>
                <select
                  id="status"
                  name="status"
                  value={formData.status || ''}
                  onChange={handleChange}
                >
                  <option value="Activo">Activo</option>
                  <option value="Vacaciones">Vacaciones</option>
                  <option value="Enfermedad">Enfermedad</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </div>

          {/* Documentación */}
          <div className="form-section">
            <h3>Documentación de Conducción</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="license">Licencia de Conducir</label>
                <input
                  id="license"
                  type="text"
                  name="license"
                  value={formData.license || ''}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="totalTrips">Total de Viajes</label>
                <input
                  id="totalTrips"
                  type="number"
                  name="totalTrips"
                  value={formData.totalTrips || ''}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="rating">Calificación</label>
                <input
                  id="rating"
                  type="number"
                  name="rating"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.rating || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="form-actions">
            <Link to={`/drivers/${id}`} className="btn btn-outline">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary btn-lg">
              ✓ Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

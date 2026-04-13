import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './DriverCreate.css';

export default function DriverCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    license: '',
    licenseExpiry: '',
    birthDate: '',
    address: '',
    experience: '',
  });

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
      navigate('/drivers');
    }, 800);
  };

  return (
    <div className="driver-create">
      <div className="form-header">
        <Link to="/drivers" className="btn btn-outline">← Volver</Link>
        <div>
          <h1>Registro de Nuevo Conductor</h1>
          <p className="subtitle">Completa los datos del conductor a registrar</p>
        </div>
      </div>

      {submitted && (
        <div className="alert alert-success">
          ✓ Conductor registrado correctamente. Redirigiendo...
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Sección Información Personal */}
          <div className="form-section">
            <h3>Información Personal</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Nombre Completo *</label>
                <input
                  id="name"
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Juan Rodríguez García"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="birthDate">Fecha de Nacimiento</label>
                <input
                  id="birthDate"
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="email">Correo Electrónico *</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="juan@verdemex.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Teléfono *</label>
                <input
                  id="phone"
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+52 55 1234 5678"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address">Dirección</label>
              <input
                id="address"
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Calle Principal 123, Apt. 4B"
              />
            </div>
          </div>

          {/* Sección Documentación */}
          <div className="form-section">
            <h3>Documentación de Conducción</h3>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="license">Licencia de Conducir *</label>
                <input
                  id="license"
                  type="text"
                  name="license"
                  value={formData.license}
                  onChange={handleChange}
                  placeholder="DL-12345"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="licenseExpiry">Vencimiento Licencia *</label>
                <input
                  id="licenseExpiry"
                  type="date"
                  name="licenseExpiry"
                  value={formData.licenseExpiry}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="experience">Años de Experiencia</label>
              <input
                id="experience"
                type="number"
                name="experience"
                value={formData.experience}
                onChange={handleChange}
                placeholder="5"
                min="0"
                max="50"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="form-actions">
            <Link to="/drivers" className="btn btn-outline">
              Cancelar
            </Link>
            <button type="submit" className="btn btn-primary btn-lg">
              ✓ Registrar Conductor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

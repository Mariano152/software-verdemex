import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDrivers } from '../Drivers/driverApi';
import { createUser } from './userApi';
import './UserForm.css';

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  username: '',
  role: 'conductor',
  driverId: '',
  password: '',
  confirmPassword: ''
};

export default function UserCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [drivers, setDrivers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDrivers = async () => {
      try {
        const data = await fetchDrivers();
        setDrivers(data);
      } catch {
        setDrivers([]);
      }
    };

    loadDrivers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
      ...(name === 'role' && value !== 'conductor' ? { driverId: '' } : {})
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contrasenas no coinciden');
      return;
    }

    try {
      setSaving(true);
      await createUser({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        username: formData.username,
        role: formData.role,
        driverId: formData.role === 'conductor' ? formData.driverId : null,
        password: formData.password
      });
      navigate('/users');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="user-form">
      <div className="form-header">
        <div>
          <h1>Crear Nuevo Usuario</h1>
          <p className="subtitle">Registra una cuenta admin o conductor</p>
        </div>
        <Link to="/users" className="btn btn-secondary">
          Volver
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        {error ? <div className="alert alert-danger">{error}</div> : null}

        <section className="form-section">
          <h3>Informacion Personal</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre *</label>
              <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Apellido *</label>
              <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Correo *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Username *</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} required />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Configuracion de Acceso</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Tipo de usuario *</label>
              <select name="role" value={formData.role} onChange={handleChange} required>
                <option value="conductor">Conductor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Conductor asignado</label>
              <select
                name="driverId"
                value={formData.driverId}
                onChange={handleChange}
                disabled={formData.role !== 'conductor'}
                required={formData.role === 'conductor'}
              >
                <option value="">Selecciona un conductor</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Contrasena</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Contrasena *</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} minLength="6" required />
            </div>
            <div className="form-group">
              <label>Confirmar contrasena *</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} minLength="6" required />
            </div>
          </div>
        </section>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/users')} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </div>
  );
}

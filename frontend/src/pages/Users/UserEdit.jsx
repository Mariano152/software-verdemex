import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './UserForm.css';

const UserEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: 'Juan Pérez',
    email: 'juan@verdemex.com',
    phone: '3001234567',
    role: 'Operador',
    department: 'Logística',
    status: 'Activo',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Usuario actualizado:', formData);
    navigate('/users');
  };

  return (
    <div className="user-form">
      <div className="form-header">
        <div>
          <h1>Editar Usuario {id}</h1>
          <p className="subtitle">Modifica la información del usuario</p>
        </div>
        <Link to="/users" className="btn btn-secondary">
          ← Volver
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        {/* USER INFO */}
        <section className="form-section">
          <h3>👤 Información Personal</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre Completo</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Teléfono</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* ROLE INFO */}
        <section className="form-section">
          <h3>⚙️ Configuración de Acceso</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Rol</label>
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="Operador">Operador</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="form-group">
              <label>Departamento</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Estado</label>
            <select name="status" value={formData.status} onChange={handleChange}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
              <option value="Suspendido">Suspendido</option>
            </select>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/users')} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            ✓ Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserEdit;

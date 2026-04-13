import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './UserForm.css';

const UserCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'Operador',
    department: '',
    password: '',
    confirmPassword: '',
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
    console.log('Usuario creado:', formData);
    navigate('/users');
  };

  return (
    <div className="user-form">
      <div className="form-header">
        <div>
          <h1>Crear Nuevo Usuario</h1>
          <p className="subtitle">Registra un nuevo usuario en el sistema</p>
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
              <label>Nombre Completo *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Juan Pérez"
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="usuario@verdemex.com"
                required
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
              placeholder="3001234567"
            />
          </div>
        </section>

        {/* ROLE INFO */}
        <section className="form-section">
          <h3>⚙️ Configuración de Acceso</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Rol *</label>
              <select name="role" value={formData.role} onChange={handleChange} required>
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
                placeholder="Ej: Logística"
              />
            </div>
          </div>
        </section>

        {/* PASSWORD */}
        <section className="form-section">
          <h3>🔒 Contraseña</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Contraseña *</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div className="form-group">
              <label>Confirmar Contraseña *</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repite la contraseña"
                required
              />
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/users')} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            ✓ Crear Usuario
          </button>
        </div>
      </form>
    </div>
  );
};

export default UserCreate;

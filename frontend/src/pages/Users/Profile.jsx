import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { mockUsers } from '../../data/mockData';
import './Profile.css';

function Profile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const currentUser = mockUsers.find(u => u.id === user?.id) || {
    id: 'U001',
    name: 'Administrador Sistema',
    email: 'admin@verdemex.com',
    phone: '+34 912 345 678',
    role: 'Admin',
    department: 'Sistemas',
    status: 'Activo',
    joinDate: '2024-01-15',
    avatar: '👤'
  };

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
    department: currentUser.department,
    password: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getRoleColor = (role) => {
    const colors = {
      'Admin': '#e74c3c',
      'Manager': '#3498db',
      'Operador': '#27ae60'
    };
    return colors[role] || '#95a5a6';
  };

  const getStatusColor = (status) => {
    const colors = {
      'Activo': '#27ae60',
      'Inactivo': '#95a5a6',
      'Suspendido': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  return (
    <div className="profile">
      <div className="profile-header">
        <h1>Perfil de Usuario</h1>
        <div className="profile-actions">
          {isEditing ? (
            <>
              <button className="btn btn-success" onClick={handleSave}>
                💾 Guardar Cambios
              </button>
              <button className="btn btn-default" onClick={() => setIsEditing(false)}>
                ✕ Cancelar
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                ✏️ Editar Perfil
              </button>
              <button className="btn btn-danger" onClick={handleLogout}>
                🚪 Cerrar Sesión
              </button>
            </>
          )}
        </div>
      </div>

      <div className="profile-container">
        {/* PROFILE CARD */}
        <div className="profile-card">
          <div className="profile-avatar">{currentUser.avatar}</div>
          <div className="profile-info">
            <h2>{currentUser.name}</h2>
            <div className="profile-badges">
              <span className="badge" style={{ backgroundColor: getRoleColor(currentUser.role) }}>
                {currentUser.role}
              </span>
              <span className="badge" style={{ backgroundColor: getStatusColor(currentUser.status) }}>
                {currentUser.status}
              </span>
            </div>
            <p className="profile-detail">
              <strong>Email:</strong> {currentUser.email}
            </p>
            <p className="profile-detail">
              <strong>Teléfono:</strong> {currentUser.phone}
            </p>
            <p className="profile-detail">
              <strong>Departamento:</strong> {currentUser.department}
            </p>
            <p className="profile-detail">
              <strong>Miembro desde:</strong> {new Date(currentUser.joinDate).toLocaleDateString('es-ES')}
            </p>
          </div>
        </div>

        {/* EDIT FORM */}
        {isEditing && (
          <div className="profile-edit-form">
            <h3>Editar Información Personal</h3>
            <div className="form-group">
              <label>Nombre Completo</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Departamento</label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Nueva Contraseña (opcional)</label>
              <input
                type="password"
                name="password"
                placeholder="Dejar en blanco para mantener contraseña actual"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>
        )}
      </div>

      {/* STATS SECTION */}
      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-value">156</div>
          <div className="stat-label">Órdenes Gestionadas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">42</div>
          <div className="stat-label">Vehículos Supervisados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">28</div>
          <div className="stat-label">Conductores Asignados</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">98%</div>
          <div className="stat-label">Tasa de Cumplimiento</div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockDrivers } from '../../data/mockData';
import './DriverDetail.css';

const DriverDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const driver = mockDrivers.find(v => v.id === id);
  const [activeTab, setActiveTab] = useState('info');

  if (!driver) {
    return (
      <div className="driver-detail error">
        <div className="error-message">
          🚫 Conductor no encontrado
          <Link to="/drivers" className="btn">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  const getRatingStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className={`star ${i < Math.floor(rating) ? 'filled' : 'empty'}`}>
          ★
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="driver-detail">
      {/* HERO SECTION */}
      <section className="detail-hero">
        <div className="hero-content">
          <div className="driver-avatar-large">{driver.name.charAt(0)}</div>
          <div className="hero-info">
            <h1>{driver.name}</h1>
            <p className="hero-subtitle">{driver.email}</p>
            <div className="rating-display">
              <div className="stars">
                {getRatingStars(driver.rating)}
              </div>
              <span className="rating-value">{driver.rating.toFixed(1)}/5.0</span>
            </div>
            <div className="status-badge" style={{ backgroundColor: driver.status === 'Activo' ? '#2d7a3e' : driver.status === 'Vacaciones' ? '#f59e0b' : '#6b7280' }}>
              {driver.status}
            </div>
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/drivers/${id}/edit`)}>
            ✏️ Editar
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/drivers/${id}/assignments`)}>
            🚗 Asignaciones
          </button>
          <button className="btn btn-secondary" onClick={() => navigate(`/drivers/${id}/ratings`)}>
            ⭐ Calificaciones
          </button>
        </div>
      </section>

      {/* TAB NAVIGATION */}
      <div className="tabs-navigation">
        <button
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          📋 Información
        </button>
        <button
          className={`tab-btn ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
        >
          📞 Contacto
        </button>
        <button
          className={`tab-btn ${activeTab === 'docs' ? 'active' : ''}`}
          onClick={() => setActiveTab('docs')}
        >
          📄 Documentos
        </button>
        <button
          className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          📊 Estadísticas
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="tabs-content">
        {/* INFO TAB */}
        {activeTab === 'info' && (
          <section className="tab-panel info-panel">
            <div className="info-grid">
              <div className="info-card">
                <label>Nombre Completo</label>
                <p className="info-value">{driver.name}</p>
              </div>
              <div className="info-card">
                <label>Documento de Identidad</label>
                <p className="info-value">{driver.licenseNumber}</p>
              </div>
              <div className="info-card">
                <label>Fecha de Nacimiento</label>
                <p className="info-value">{driver.birthDate}</p>
              </div>
              <div className="info-card">
                <label>Experiencia</label>
                <p className="info-value">{driver.experience} años</p>
              </div>
              <div className="info-card">
                <label>Viajes Totales</label>
                <p className="info-value">{driver.totalTrips} viajes</p>
              </div>
              <div className="info-card">
                <label>Calificación Promedio</label>
                <p className="info-value">{driver.rating.toFixed(1)} ⭐</p>
              </div>
              <div className="info-card">
                <label>Licencia Expira</label>
                <p className="info-value">{driver.licenseExpiry}</p>
              </div>
              <div className="info-card">
                <label>Dirección</label>
                <p className="info-value">{driver.address || 'No especificada'}</p>
              </div>
            </div>
          </section>
        )}

        {/* CONTACT TAB */}
        {activeTab === 'contact' && (
          <section className="tab-panel contact-panel">
            <div className="contact-cards">
              <a href={`mailto:${driver.email}`} className="contact-card">
                <span className="contact-icon">✉️</span>
                <div>
                  <label>Email</label>
                  <p>{driver.email}</p>
                </div>
              </a>
              <a href={`tel:${driver.phone}`} className="contact-card">
                <span className="contact-icon">📱</span>
                <div>
                  <label>Teléfono</label>
                  <p>{driver.phone}</p>
                </div>
              </a>
              <div className="contact-card">
                <span className="contact-icon">📍</span>
                <div>
                  <label>Dirección</label>
                  <p>{driver.address || 'No especificada'}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'docs' && (
          <section className="tab-panel docs-panel">
            <div className="docs-grid">
              <div className="doc-card">
                <div className="doc-icon">📋</div>
                <h4>Licencia de Conducir</h4>
                <p className="doc-number">{driver.licenseNumber}</p>
                <p className="doc-status" style={{ color: '#2d7a3e' }}>✓ Vigente</p>
                <p className="doc-expiry">Vence: {driver.licenseExpiry}</p>
              </div>
              <div className="doc-card">
                <div className="doc-icon">🆔</div>
                <h4>Documento de Identidad</h4>
                <p className="doc-number">{driver.id}</p>
                <p className="doc-status" style={{ color: '#2d7a3e' }}>✓ Verificado</p>
              </div>
              <div className="doc-card">
                <div className="doc-icon">🎓</div>
                <h4>Certificación de Experiencia</h4>
                <p className="doc-number">{driver.experience} años</p>
                <p className="doc-status" style={{ color: '#2d7a3e' }}>✓ Actualizado</p>
              </div>
            </div>
          </section>
        )}

        {/* STATS TAB */}
        {activeTab === 'stats' && (
          <section className="tab-panel stats-panel">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{driver.totalTrips}</div>
                <div className="stat-label">Viajes Completados</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{driver.rating.toFixed(1)}</div>
                <div className="stat-label">Calificación Promedio</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{driver.experience}</div>
                <div className="stat-label">Años de Experiencia</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{driver.status === 'Activo' ? '100%' : '0%'}</div>
                <div className="stat-label">Disponibilidad</div>
              </div>
            </div>

            <div className="recent-activity">
              <h3>Actividad Reciente</h3>
              <div className="activity-list">
                <div className="activity-item">
                  <div className="activity-time">Hace 2 horas</div>
                  <div className="activity-info">Completó un viaje a Bogotá</div>
                </div>
                <div className="activity-item">
                  <div className="activity-time">Hace 1 día</div>
                  <div className="activity-info">Recibió calificación de 5 estrellas</div>
                </div>
                <div className="activity-item">
                  <div className="activity-time">Hace 3 días</div>
                  <div className="activity-info">Completó 3 viajes locales</div>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ACTION BUTTONS */}
      <div className="detail-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/drivers')}>
          ← Volver
        </button>
        <button className="btn btn-danger">🗑️ Desactivar</button>
      </div>
    </div>
  );
};

export default DriverDetail;

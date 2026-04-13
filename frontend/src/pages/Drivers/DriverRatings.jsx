import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockDrivers } from '../../data/mockData';
import './DriverRatings.css';

const DriverRatings = () => {
  const { id } = useParams();
  const driver = mockDrivers.find(v => v.id === id);
  const [filter, setFilter] = useState('all');

  if (!driver) {
    return (
      <div className="driver-ratings error">
        <div className="error-message">
          🚫 Conductor no encontrado
          <Link to="/drivers" className="btn">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  // Mock ratings data
  const allRatings = [
    {
      id: 'RAT001',
      date: '2024-01-22',
      from: 'Cliente ABC Corp',
      rating: 5,
      comment: 'Excelente servicio, conductor muy profesional y cortés. Entrega a tiempo.',
      category: 'positive',
    },
    {
      id: 'RAT002',
      date: '2024-01-20',
      from: 'Cliente XYZ Logistics',
      rating: 4,
      comment: 'Buen servicio. Podría mejorar comunicación durante el trayecto.',
      category: 'positive',
    },
    {
      id: 'RAT003',
      date: '2024-01-18',
      from: 'Cliente Tech Solutions',
      rating: 5,
      comment: 'Impeccable. Muy responsable con la carga y el tiempo.',
      category: 'positive',
    },
    {
      id: 'RAT004',
      date: '2024-01-15',
      from: 'Cliente Industrial Plus',
      rating: 3,
      comment: 'Entrega completada pero con 30 minutos de retraso.',
      category: 'neutral',
    },
    {
      id: 'RAT005',
      date: '2024-01-10',
      from: 'Cliente Green Energy',
      rating: 5,
      comment: 'Mejor conductor de la flota. Siempre puntual y confiable.',
      category: 'positive',
    },
    {
      id: 'RAT006',
      date: '2024-01-05',
      from: 'Cliente Commerce Ltd',
      rating: 4,
      comment: 'Muy bien. Carga bien manejada, buen conductor.',
      category: 'positive',
    },
  ];

  const getFiltered = () => {
    if (filter === 'all') return allRatings;
    const minRating = filter === '5' ? 5 : filter === '4' ? 4 : 3;
    return allRatings.filter(r => r.rating >= minRating && r.rating <= parseInt(filter));
  };

  const displayedRatings = getFiltered();

  const getRatingStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <span key={i} className={`star ${i < rating ? 'filled' : 'empty'}`}>
          ★
        </span>
      );
    }
    return stars;
  };

  const getAverageRating = () => {
    return (allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length).toFixed(1);
  };

  const getRatingDistribution = () => {
    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    allRatings.forEach(r => dist[r.rating]++);
    return dist;
  };

  const distribution = getRatingDistribution();

  return (
    <div className="driver-ratings">
      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <h1>Calificaciones de {driver.name}</h1>
          <p className="subtitle">Historial de evaluaciones de clientes</p>
        </div>
        <Link to={`/drivers/${id}`} className="btn btn-secondary">
          ← Volver a Conductor
        </Link>
      </div>

      {/* RATING SUMMARY */}
      <div className="rating-summary">
        <div className="average-rating">
          <div className="average-number">{getAverageRating()}</div>
          <div className="average-stars">
            {getRatingStars(Math.round(getAverageRating()))}
          </div>
          <div className="ratings-count">Basado en {allRatings.length} calificaciones</div>
        </div>

        <div className="distribution-bars">
          {[5, 4, 3, 2, 1].map(stars => (
            <div key={stars} className="distribution-row">
              <span className="distribution-label">
                {stars} ★
              </span>
              <div className="distribution-bar-bg">
                <div
                  className="distribution-bar"
                  style={{
                    width: `${((distribution[stars] || 0) / allRatings.length) * 100}%`,
                  }}
                ></div>
              </div>
              <span className="distribution-count">{distribution[stars] || 0}</span>
            </div>
          ))}
        </div>

        <div className="rating-stats">
          <div className="rating-stat">
            <span className="stat-label">Excelentes (5⭐)</span>
            <p className="stat-value">{distribution[5]} calificaciones</p>
          </div>
          <div className="rating-stat">
            <span className="stat-label">Muy Buenas (4⭐)</span>
            <p className="stat-value">{distribution[4]} calificaciones</p>
          </div>
          <div className="rating-stat">
            <span className="stat-label">Aceptables (3⭐)</span>
            <p className="stat-value">{distribution[3]} calificaciones</p>
          </div>
          <div className="rating-stat">
            <span className="stat-label">Total de Reseñas</span>
            <p className="stat-value">{allRatings.length}</p>
          </div>
        </div>
      </div>

      {/* FILTER TABS */}
      <div className="filter-tabs">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas ({allRatings.length})
        </button>
        <button
          className={`filter-btn ${filter === '5' ? 'active' : ''}`}
          onClick={() => setFilter('5')}
        >
          ⭐⭐⭐⭐⭐ ({distribution[5]})
        </button>
        <button
          className={`filter-btn ${filter === '4' ? 'active' : ''}`}
          onClick={() => setFilter('4')}
        >
          ⭐⭐⭐⭐ ({distribution[4]})
        </button>
        <button
          className={`filter-btn ${filter === '3' ? 'active' : ''}`}
          onClick={() => setFilter('3')}
        >
          ⭐⭐⭐ ({distribution[3]})
        </button>
      </div>

      {/* RATINGS LIST */}
      <div className="ratings-container">
        {displayedRatings.length > 0 ? (
          <div className="ratings-list">
            {displayedRatings.map((rating) => (
              <div
                key={rating.id}
                className={`rating-card ${rating.category}`}
              >
                <div className="rating-header">
                  <div className="rater-info">
                    <div className="rater-avatar">{rating.from.charAt(0)}</div>
                    <div>
                      <h4>{rating.from}</h4>
                      <span className="rating-date">
                        {new Date(rating.date).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  </div>
                  <div className="rating-stars">
                    {getRatingStars(rating.rating)}
                  </div>
                </div>
                <p className="rating-comment">{rating.comment}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">⭐</div>
            <p>No hay calificaciones con estos criterios</p>
          </div>
        )}
      </div>

      {/* PERFORMANCE TIMELINE */}
      {allRatings.length > 0 && (
        <div className="timeline-section">
          <h2>Tendencia de Calificaciones</h2>
          <div className="performance-timeline">
            {[...allRatings]
              .reverse()
              .map((rating, index) => (
                <div
                  key={rating.id}
                  className="timeline-dot"
                  style={{
                    left: `${(index / (allRatings.length - 1)) * 100}%`,
                  }}
                  title={`${rating.rating}⭐ - ${new Date(rating.date).toLocaleDateString('es-CO')}`}
                >
                  <div
                    className="dot"
                    style={{
                      backgroundColor:
                        rating.rating === 5
                          ? '#10b981'
                          : rating.rating === 4
                          ? '#2d7a3e'
                          : rating.rating === 3
                          ? '#f59e0b'
                          : '#ef4444',
                    }}
                  ></div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverRatings;

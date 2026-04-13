import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockOrders } from '../../data/mockData';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = mockOrders.find(o => o.id === id);

  if (!order) {
    return (
      <div className="order-detail error">
        <div className="error-message">
          🚫 Pedido no encontrado
          <Link to="/orders" className="btn">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pendiente':
        return '#f59e0b';
      case 'En tránsito':
        return '#2d7a3e';
      case 'Entregado':
        return '#10b981';
      case 'Cancelado':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="order-detail">
      {/* HERO SECTION */}
      <section className="detail-hero">
        <div className="hero-content">
          <div className="order-badge">📦</div>
          <div className="hero-info">
            <h1>{order.id}</h1>
            <p className="hero-subtitle">{order.customer}</p>
            <span
              className="status-large"
              style={{ backgroundColor: getStatusColor(order.status) }}
            >
              {order.status}
            </span>
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/orders/${id}/edit`)}>
            ✏️ Editar
          </button>
          <button className="btn btn-secondary">🚗 Asignar Conductor</button>
        </div>
      </section>

      {/* MAIN CONTENT GRID */}
      <div className="detail-grid">
        {/* COLUMN 1: LOCATIONS */}
        <section className="detail-card routes-card">
          <h2>📍 Ruta del Pedido</h2>
          <div className="route-visual">
            <div className="location-box origin">
              <div className="location-icon">📤</div>
              <div className="location-info">
                <span className="location-label">ORIGEN</span>
                <span className="location-name">{order.origin}</span>
              </div>
            </div>
            <div className="route-line"></div>
            <div className="location-box destination">
              <div className="location-icon">📥</div>
              <div className="location-info">
                <span className="location-label">DESTINO</span>
                <span className="location-name">{order.destination}</span>
              </div>
            </div>
          </div>
        </section>

        {/* COLUMN 2: ORDER DETAILS */}
        <section className="detail-card">
          <h2>📋 Detalles del Pedido</h2>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">ID del Pedido</span>
              <span className="value">{order.id}</span>
            </div>
            <div className="info-row">
              <span className="label">Peso</span>
              <span className="value">{order.weight.toLocaleString()} kg</span>
            </div>
            <div className="info-row">
              <span className="label">Valor</span>
              <span className="value">${order.value.toLocaleString()}</span>
            </div>
            <div className="info-row">
              <span className="label">Prioridad</span>
              <span className="value">
                {order.priority === 'Alta' ? '🔴 Alta' : order.priority === 'Media' ? '🟡 Media' : '🟢 Baja'}
              </span>
            </div>
            <div className="info-row">
              <span className="label">Fecha</span>
              <span className="value">{new Date(order.date).toLocaleDateString('es-CO')}</span>
            </div>
          </div>
        </section>

        {/* COLUMN 3: CLIENT INFO */}
        <section className="detail-card">
          <h2>👤 Información del Cliente</h2>
          <div className="info-rows">
            <div className="info-row">
              <span className="label">Cliente</span>
              <span className="value">{order.customer}</span>
            </div>
            <div className="info-row">
              <span className="label">Teléfono</span>
              <span className="value">
                <a href={`tel:${order.phone}`}>{order.phone}</a>
              </span>
            </div>
            <div className="info-row">
              <span className="label">Email</span>
              <span className="value">
                <a href={`mailto:${order.email}`}>{order.email}</a>
              </span>
            </div>
          </div>
        </section>
      </div>

      {/* TIMELINE */}
      <section className="detail-card timeline-card">
        <h2>📅 Línea de Tiempo</h2>
        <div className="timeline">
          <div className="timeline-event completed">
            <div className="timeline-marker"></div>
            <div className="timeline-text">
              <span className="event-title">Pedido Creado</span>
              <span className="event-date">2024-01-22</span>
            </div>
          </div>
          {order.status !== 'Pendiente' && (
            <div className={`timeline-event ${order.status === 'En tránsito' || order.status === 'Entregado' ? 'completed' : ''}`}>
              <div className="timeline-marker"></div>
              <div className="timeline-text">
                <span className="event-title">En Tránsito</span>
                <span className="event-date">2024-01-23</span>
              </div>
            </div>
          )}
          {order.status === 'Entregado' && (
            <div className="timeline-event completed">
              <div className="timeline-marker"></div>
              <div className="timeline-text">
                <span className="event-title">Entregado</span>
                <span className="event-date">2024-01-24</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ACTION BUTTONS */}
      <div className="detail-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
          ← Volver a Pedidos
        </button>
        <button className="btn btn-danger">🗑️ Cancelar Pedido</button>
      </div>
    </div>
  );
};

export default OrderDetail;

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { deleteRoute, fetchRouteById } from './routeApi';
import {
  formatRouteStatus,
  formatRouteType,
  getRouteCode,
  getRouteStatusColor
} from './routeHelpers';
import './OrderDetail.css';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadRoute = async () => {
      try {
        setLoading(true);
        const data = await fetchRouteById(id);
        setRoute(data);
        setError(null);
      } catch (loadError) {
        setRoute(null);
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadRoute();
  }, [id]);

  const handleDelete = async () => {
    const confirmed = window.confirm('Esta accion eliminara la ruta. Deseas continuar?');
    if (!confirmed) return;

    try {
      await deleteRoute(id);
      navigate('/routes');
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  if (loading) {
    return <div className="order-detail"><p>Cargando ruta...</p></div>;
  }

  if (!route) {
    return (
      <div className="order-detail error">
        <div className="error-message">
          Ruta no encontrada
          <Link to="/routes" className="btn">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="order-detail">
      <section className="detail-hero">
        <div className="hero-content">
          <div className="order-badge">R</div>
          <div className="hero-info">
            <h1>{getRouteCode(route)}</h1>
            <p className="hero-subtitle">{route.conductor_nombre}</p>
            <span
              className="status-large"
              style={{ backgroundColor: getRouteStatusColor(route.estatus) }}
            >
              {formatRouteStatus(route.estatus)}
            </span>
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={() => navigate(`/routes/${id}/edit`)}>
            Editar
          </button>
        </div>
      </section>

      {error && <div className="error-message">{error}</div>}

      <div className="detail-grid">
        <section className="detail-card routes-card">
          <h2>Trayecto</h2>
          <div className="route-visual">
            <div className="location-box origin">
              <div className="location-icon">O</div>
              <div className="location-info">
                <span className="location-label">ORIGEN</span>
                <span className="location-name">{route.origen}</span>
              </div>
            </div>
            <div className="route-line"></div>
            <div className="location-box destination">
              <div className="location-icon">D</div>
              <div className="location-info">
                <span className="location-label">DESTINO</span>
                <span className="location-name">{route.destino}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="detail-card">
          <h2>Detalle Operativo</h2>
          <div className="info-rows">
            <div className="info-row"><span className="label">Ruta</span><span className="value">{getRouteCode(route)}</span></div>
            <div className="info-row"><span className="label">Vehiculo</span><span className="value">{route.vehiculo_numero_economico || route.vehiculo_placa || '-'}</span></div>
            <div className="info-row"><span className="label">Tipo de unidad</span><span className="value">{formatRouteType(route.tipo_unidad)}</span></div>
            <div className="info-row"><span className="label">Kilometros</span><span className="value">{Number(route.kilometros_programados || 0).toLocaleString()} km</span></div>
            <div className="info-row"><span className="label">Metros cubicos</span><span className="value">{Number(route.metros_cubicos_enviados || 0).toLocaleString()} m3</span></div>
            <div className="info-row"><span className="label">Valor monetario</span><span className="value">${Number(route.valor_monetario || 0).toLocaleString()}</span></div>
          </div>
        </section>

        <section className="detail-card">
          <h2>Seguimiento</h2>
          <div className="info-rows">
            <div className="info-row"><span className="label">Conductor</span><span className="value">{route.conductor_nombre}</span></div>
            <div className="info-row"><span className="label">Telefono</span><span className="value">{route.conductor_telefono || '-'}</span></div>
            <div className="info-row"><span className="label">Fecha de registro</span><span className="value">{route.fecha_registro ? new Date(route.fecha_registro).toLocaleDateString('es-MX') : '-'}</span></div>
            <div className="info-row"><span className="label">Fecha de entrega</span><span className="value">{route.fecha_entrega ? new Date(route.fecha_entrega).toLocaleDateString('es-MX') : '-'}</span></div>
            <div className="info-row"><span className="label">Descripcion</span><span className="value">{route.descripcion || 'Sin descripcion'}</span></div>
            <div className="info-row"><span className="label">Observaciones</span><span className="value">{route.observaciones || 'Sin observaciones'}</span></div>
          </div>
        </section>
      </div>

      <section className="detail-card timeline-card">
        <h2>Linea de Tiempo</h2>
        <div className="timeline">
          <div className="timeline-event completed">
            <div className="timeline-marker"></div>
            <div className="timeline-text">
              <span className="event-title">Ruta Registrada</span>
              <span className="event-date">{route.fecha_registro ? new Date(route.fecha_registro).toLocaleDateString('es-MX') : '-'}</span>
            </div>
          </div>
          <div className={`timeline-event ${route.estatus !== 'programada' ? 'completed' : ''}`}>
            <div className="timeline-marker"></div>
            <div className="timeline-text">
              <span className="event-title">Ruta en proceso</span>
              <span className="event-date">{route.estatus === 'programada' ? 'Pendiente' : formatRouteStatus(route.estatus)}</span>
            </div>
          </div>
          <div className={`timeline-event ${route.estatus === 'entregada' ? 'completed' : ''}`}>
            <div className="timeline-marker"></div>
            <div className="timeline-text">
              <span className="event-title">Entrega final</span>
              <span className="event-date">{route.fecha_entrega ? new Date(route.fecha_entrega).toLocaleDateString('es-MX') : '-'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="detail-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/routes')}>
          Volver a Rutas
        </button>
        <button className="btn btn-danger" onClick={handleDelete}>
          Eliminar Ruta
        </button>
      </div>
    </div>
  );
};

export default OrderDetail;

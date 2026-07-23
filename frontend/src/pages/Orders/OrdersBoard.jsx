import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchRoutes, updateRoute } from './routeApi';
import { buildRoutePayload, formatRouteStatus, getRouteCode, ROUTE_STATUS_OPTIONS } from './routeHelpers';
import './OrdersBoard.css';

const OrdersBoard = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [draggedRoute, setDraggedRoute] = useState(null);
  const [error, setError] = useState(null);

  const loadRoutes = async () => {
    try {
      const data = await fetchRoutes();
      setRoutes(data);
      setError(null);
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const getRoutesByStatus = (status) => routes.filter((route) => route.estatus === status);

  const handleDragStart = (event, route) => {
    setDraggedRoute(route);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (event, status) => {
    event.preventDefault();
    if (!draggedRoute || draggedRoute.estatus === status) return;

    try {
      await updateRoute(draggedRoute.id, buildRoutePayload({
        ...draggedRoute,
        estatus: status
      }));
      setDraggedRoute(null);
      await loadRoutes();
    } catch (dropError) {
      setError(dropError.message);
    }
  };

  const totalValue = routes.reduce((sum, route) => sum + Number(route.valor_monetario || 0), 0);
  const totalM3 = routes.reduce((sum, route) => sum + Number(route.metros_cubicos_enviados || 0), 0);

  return (
    <div className="orders-board">
      <div className="board-header">
        <div className="header-content">
          <h1>Panel de Rutas</h1>
          <p className="subtitle">Vista Kanban para seguimiento operativo</p>
        </div>
        <div className="header-actions">
          <Link to="/routes" className="btn btn-secondary">
            Ver Lista
          </Link>
          <Link to="/routes/create" className="btn btn-primary">
            Nueva Ruta
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="kanban-board">
        {ROUTE_STATUS_OPTIONS.map((option) => (
          <div
            key={option.value}
            className="board-column"
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, option.value)}
          >
            <div className="column-header">
              <div className="column-title">
                <h2>{option.label}</h2>
              </div>
              <span className="column-count">{getRoutesByStatus(option.value).length}</span>
            </div>

            <div className="column-cards">
              {getRoutesByStatus(option.value).length > 0 ? (
                getRoutesByStatus(option.value).map((route) => (
                  <div
                    key={route.id}
                    className="order-card"
                    draggable
                    onDragStart={(event) => handleDragStart(event, route)}
                    onClick={() => navigate(`/routes/${route.id}`)}
                  >
                    <div className="card-header">
                      <span className="card-id">{getRouteCode(route)}</span>
                    </div>

                    <div className="card-customer">
                      <strong>{route.conductor_nombre}</strong>
                    </div>

                    <div className="card-route">
                      <span className="route-text">{route.origen} - {route.destino}</span>
                    </div>

                    <div className="card-meta">
                      <div className="meta-item">
                        <span className="meta-label">Vehiculo</span>
                        <span className="meta-value">{route.vehiculo_numero_economico || route.vehiculo_placa || '-'}</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Valor</span>
                        <span className="meta-value">${(Number(route.valor_monetario || 0) / 1000).toFixed(0)}k</span>
                      </div>
                    </div>

                    <div className="card-footer">
                      <span className="card-date">
                        {route.fecha_entrega ? new Date(route.fecha_entrega).toLocaleDateString('es-MX') : '-'}
                      </span>
                      <button
                        className="card-btn"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/routes/${route.id}/edit`);
                        }}
                        title="Editar"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-column">
                  <p>Sin rutas</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="board-summary">
        <div className="summary-card">
          <span className="summary-label">Total de Rutas</span>
          <span className="summary-value">{routes.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Valor Total</span>
          <span className="summary-value">${(totalValue / 1000000).toFixed(1)}M</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">m3 Totales</span>
          <span className="summary-value">{totalM3.toLocaleString()}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">En proceso</span>
          <span className="summary-value">{routes.filter((route) => route.estatus === 'en_proceso').length}</span>
        </div>
      </div>
    </div>
  );
};

export default OrdersBoard;

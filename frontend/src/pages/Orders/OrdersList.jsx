import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteRoute, fetchRoutes } from './routeApi';
import { formatRouteStatus, formatRouteType, getRouteCode, getRouteStatusColor } from './routeHelpers';
import './OrdersList.css';

const STATUS_FILTERS = ['todos', 'programada', 'en_proceso', 'entregada', 'cancelada'];

const OrdersList = () => {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [filter, setFilter] = useState('todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRoutes = async () => {
    try {
      setLoading(true);
      const data = await fetchRoutes();
      setRoutes(data);
      setError(null);
    } catch (loadError) {
      setRoutes([]);
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const filteredRoutes = useMemo(() => routes.filter((route) => {
    const matchesStatus = filter === 'todos' ? true : route.estatus === filter;
    const query = search.trim().toLowerCase();
    const searchable = [
      route.origen,
      route.destino,
      route.conductor_nombre,
      route.vehiculo_numero_economico,
      route.vehiculo_placa,
      route.tipo_unidad,
      route.descripcion
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchesQuery = query ? searchable.includes(query) : true;
    return matchesStatus && matchesQuery;
  }), [routes, filter, search]);

  const handleDelete = async (routeId) => {
    const confirmed = window.confirm('Esta accion eliminara la ruta seleccionada. Deseas continuar?');
    if (!confirmed) return;

    try {
      await deleteRoute(routeId);
      await loadRoutes();
    } catch (deleteError) {
      setError(deleteError.message);
    }
  };

  const stats = [
    { label: 'Rutas Totales', value: routes.length },
    { label: 'Programadas', value: routes.filter((route) => route.estatus === 'programada').length },
    { label: 'En proceso', value: routes.filter((route) => route.estatus === 'en_proceso').length },
    { label: 'Entregadas', value: routes.filter((route) => route.estatus === 'entregada').length }
  ];

  return (
    <div className="routes-page">
      <div className="routes-header-card">
        <div>
          <h1>Gestion de Rutas</h1>
          <p className="routes-subtitle">Crea, asigna y da seguimiento a las rutas operativas de la flotilla</p>
        </div>
        <div className="routes-header-actions">
          <Link to="/routes/board" className="btn btn-outline btn-lg">
            Ver Panel
          </Link>
          <Link to="/routes/create" className="btn btn-primary btn-lg">
            Nueva Ruta
          </Link>
        </div>
      </div>

      <div className="routes-stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="routes-stat-card">
            <span className="routes-stat-value">{stat.value}</span>
            <span className="routes-stat-label">{stat.label}</span>
          </div>
        ))}
      </div>

      <div className="card mb-3">
        <div className="card-body">
          <div className="routes-toolbar">
            <div className="routes-search-block">
              <label htmlFor="route-search">Buscar ruta</label>
              <input
                id="route-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Origen, destino, conductor, vehiculo o descripcion"
              />
            </div>
            <div className="routes-filter-block">
              <label>Estatus</label>
              <div className="routes-filter-chips">
                {STATUS_FILTERS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`routes-filter-chip ${filter === status ? 'active' : ''}`}
                    onClick={() => setFilter(status)}
                  >
                    {status === 'todos' ? 'Todos' : formatRouteStatus(status)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          {loading ? (
            <div className="routes-empty">
              <p>Cargando rutas...</p>
            </div>
          ) : error ? (
            <div className="routes-empty">
              <p>Error: {error}</p>
              <button type="button" className="btn btn-secondary" onClick={loadRoutes}>
                Reintentar
              </button>
            </div>
          ) : filteredRoutes.length > 0 ? (
            <table className="routes-table">
              <thead>
                <tr>
                  <th>Ruta</th>
                  <th>Conductor</th>
                  <th>Vehiculo</th>
                  <th>Trayecto</th>
                  <th>Operacion</th>
                  <th>Estatus</th>
                  <th>Entrega</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredRoutes.map((route) => (
                  <tr
                    key={route.id}
                    className="routes-row"
                    onClick={() => navigate(`/routes/${route.id}`)}
                  >
                    <td>
                      <div className="routes-code">{getRouteCode(route)}</div>
                      <div className="routes-muted">{route.descripcion || 'Ruta operativa'}</div>
                    </td>
                    <td>
                      <div className="routes-primary">{route.conductor_nombre || '-'}</div>
                      <div className="routes-muted">{route.conductor_telefono || 'Sin telefono'}</div>
                    </td>
                    <td>
                      <div className="routes-primary">{route.vehiculo_numero_economico || route.vehiculo_placa || '-'}</div>
                      <div className="routes-muted">{route.vehiculo_tipo_carro || 'Unidad asignada'}</div>
                    </td>
                    <td>
                      <div className="routes-primary">{route.origen}</div>
                      <div className="routes-muted">a {route.destino}</div>
                    </td>
                    <td>
                      <div className="routes-primary">{formatRouteType(route.tipo_unidad)}</div>
                      <div className="routes-muted">
                        {Number(route.kilometros_programados || 0).toLocaleString()} km · {Number(route.metros_cubicos_enviados || 0).toLocaleString()} m3
                      </div>
                      <div className="routes-money">${Number(route.valor_monetario || 0).toLocaleString()}</div>
                    </td>
                    <td>
                      <span
                        className="routes-status-chip"
                        style={{ backgroundColor: getRouteStatusColor(route.estatus) }}
                      >
                        {formatRouteStatus(route.estatus)}
                      </span>
                    </td>
                    <td>{route.fecha_entrega ? new Date(route.fecha_entrega).toLocaleDateString('es-MX') : '-'}</td>
                    <td>
                      <div className="routes-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/routes/${route.id}`);
                          }}
                        >
                          Ver
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/routes/${route.id}/edit`);
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleDelete(route.id);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="routes-empty">
              <p>No se encontraron rutas con los filtros actuales.</p>
              <Link to="/routes/create" className="btn btn-primary">
                Crear la primera
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrdersList;

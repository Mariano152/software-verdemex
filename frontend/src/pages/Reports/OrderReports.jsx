import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchRoutes } from '../Orders/routeApi';
import './Reports.css';

const formatStatus = (status) => {
  const statusLabels = {
    programada: 'Programada',
    en_proceso: 'En proceso',
    entregada: 'Entregada',
    cancelada: 'Cancelada'
  };

  return statusLabels[status] || status || 'Sin estatus';
};

const getStatusColor = (status) => {
  switch (status) {
    case 'programada':
      return '#f59e0b';
    case 'en_proceso':
      return '#2d7a3e';
    case 'entregada':
      return '#10b981';
    case 'cancelada':
      return '#6b7280';
    default:
      return '#6b7280';
  }
};

const OrderReports = () => {
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

    loadRoutes();
  }, []);

  const totalRoutes = routes.length;
  const deliveredRoutes = routes.filter((route) => route.estatus === 'entregada').length;
  const totalRevenue = routes.reduce((sum, route) => sum + Number(route.valor_monetario || 0), 0);
  const averageValue = totalRoutes > 0 ? totalRevenue / totalRoutes : 0;

  return (
    <div className="report-page">
      <div className="report-header">
        <div>
          <h1>Reporte de Rutas</h1>
          <p className="subtitle">Analisis de entregas, asignaciones y valor monetario</p>
        </div>
        <Link to="/analytics" className="btn btn-secondary">
          Volver a Analytics
        </Link>
      </div>

      <div className="report-stats">
        <div className="stat-box">
          <span className="stat-label">Total Rutas</span>
          <p className="stat-value">{totalRoutes}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Entregadas</span>
          <p className="stat-value">{deliveredRoutes}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Valor Total</span>
          <p className="stat-value">${(totalRevenue / 1000000).toFixed(1)}M</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Valor Promedio</span>
          <p className="stat-value">${(averageValue / 1000).toFixed(0)}k</p>
        </div>
      </div>

      <div className="report-table-container">
        {loading ? (
          <p>Cargando rutas...</p>
        ) : error ? (
          <p>Error: {error}</p>
        ) : (
          <table className="report-table">
            <thead>
              <tr>
                <th>Ruta</th>
                <th>Conductor</th>
                <th>Vehiculo</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Estatus</th>
                <th>m3</th>
                <th>Valor</th>
                <th>Entrega</th>
              </tr>
            </thead>
            <tbody>
              {routes.map((route) => (
                <tr key={route.id}>
                  <td><strong>{route.id.slice(0, 8).toUpperCase()}</strong></td>
                  <td>{route.conductor_nombre}</td>
                  <td>{route.vehiculo_numero_economico || route.vehiculo_placa || '-'}</td>
                  <td>{route.origen}</td>
                  <td>{route.destino}</td>
                  <td>
                    <span className="badge" style={{ backgroundColor: getStatusColor(route.estatus) }}>
                      {formatStatus(route.estatus)}
                    </span>
                  </td>
                  <td>{Number(route.metros_cubicos_enviados || 0).toLocaleString()}</td>
                  <td>${Number(route.valor_monetario || 0).toLocaleString()}</td>
                  <td>{route.fecha_entrega ? new Date(route.fecha_entrega).toLocaleDateString('es-MX') : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default OrderReports;

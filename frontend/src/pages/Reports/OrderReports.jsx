import React from 'react';
import { Link } from 'react-router-dom';
import { mockOrders } from '../../data/mockData';
import './Reports.css';

const OrderReports = () => {
  const totalOrders = mockOrders.length;
  const completedOrders = mockOrders.filter(o => o.status === 'Entregado').length;
  const totalRevenue = mockOrders.reduce((sum, o) => sum + o.value, 0);
  const averageValue = totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(0) : 0;

  return (
    <div className="report-page">
      <div className="report-header">
        <div>
          <h1>📦 Reporte de Pedidos</h1>
          <p className="subtitle">Análisis de entregas e ingresos</p>
        </div>
        <Link to="/analytics" className="btn btn-secondary">
          ← Volver a Analytics
        </Link>
      </div>

      {/* STATS */}
      <div className="report-stats">
        <div className="stat-box">
          <span className="stat-label">Total Pedidos</span>
          <p className="stat-value">{totalOrders}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Entregados</span>
          <p className="stat-value">{completedOrders}</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Ingresos Totales</span>
          <p className="stat-value">${(totalRevenue / 1000000).toFixed(1)}M</p>
        </div>
        <div className="stat-box">
          <span className="stat-label">Valor Promedio</span>
          <p className="stat-value">${(averageValue / 1000).toFixed(0)}k</p>
        </div>
      </div>

      {/* TABLE */}
      <div className="report-table-container">
        <table className="report-table">
          <thead>
            <tr>
              <th>ID Pedido</th>
              <th>Cliente</th>
              <th>Origen</th>
              <th>Destino</th>
              <th>Estado</th>
              <th>Peso (kg)</th>
              <th>Valor ($)</th>
              <th>Fecha</th>
            </tr>
          </thead>
          <tbody>
            {mockOrders.map(order => (
              <tr key={order.id}>
                <td><strong>{order.id}</strong></td>
                <td>{order.customer}</td>
                <td>{order.origin}</td>
                <td>{order.destination}</td>
                <td>
                  <span className="badge" style={{backgroundColor: order.status === 'Entregado' ? '#10b981' : order.status === 'Pendiente' ? '#f59e0b' : '#6b7280'}}>
                    {order.status}
                  </span>
                </td>
                <td>{order.weight.toLocaleString()}</td>
                <td>${order.value.toLocaleString()}</td>
                <td>{new Date(order.date).toLocaleDateString('es-CO')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrderReports;

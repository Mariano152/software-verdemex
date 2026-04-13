import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { mockOrders } from '../../data/mockData';
import './OrdersList.css';

const OrdersList = () => {
  const [filter, setFilter] = useState('Pendiente');
  const navigate = useNavigate();

  const filteredOrders = filter === 'todos'
    ? mockOrders
    : mockOrders.filter(o => o.status === filter);

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

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'Alta':
        return '🔴';
      case 'Media':
        return '🟡';
      case 'Baja':
        return '🟢';
      default:
        return '⚪';
    }
  };

  return (
    <div className="orders-list">
      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <h1>Gestión de Pedidos</h1>
          <p className="subtitle">Administra tus entregas y logística</p>
        </div>
        <Link to="/orders/create" className="btn btn-primary btn-lg">
          ➕ Nuevo Pedido
        </Link>
      </div>

      {/* STATS */}
      <div className="orders-stats">
        <div className="stat-card">
          <span className="stat-number">{mockOrders.length}</span>
          <span className="stat-label">Pedidos Totales</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{mockOrders.filter(o => o.status === 'Pendiente').length}</span>
          <span className="stat-label">Pendientes</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{mockOrders.filter(o => o.status === 'En tránsito').length}</span>
          <span className="stat-label">En Tránsito</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{mockOrders.filter(o => o.status === 'Entregado').length}</span>
          <span className="stat-label">Entregados</span>
        </div>
      </div>

      {/* FILTERS */}
      <div className="filter-section">
        <label>Filtrar por Estado:</label>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'todos' ? 'active' : ''}`}
            onClick={() => setFilter('todos')}
          >
            📊 Todos ({mockOrders.length})
          </button>
          {['Pendiente', 'En tránsito', 'Entregado', 'Cancelado'].map((status) => (
            <button
              key={status}
              className={`filter-btn ${filter === status ? 'active' : ''}`}
              onClick={() => setFilter(status)}
            >
              {status} ({mockOrders.filter(o => o.status === status).length})
            </button>
          ))}
        </div>
      </div>

      {/* TABLE */}
      <div className="table-container">
        {filteredOrders.length > 0 ? (
          <table className="orders-table">
            <thead>
              <tr>
                <th>ID Pedido</th>
                <th>Cliente</th>
                <th>Origen</th>
                <th>Destino</th>
                <th>Prioridad</th>
                <th>Estado</th>
                <th>Peso (kg)</th>
                <th>Valor</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong className="order-id">{order.id}</strong>
                  </td>
                  <td>{order.customer}</td>
                  <td>
                    <span className="location-badge">📍 {order.origin}</span>
                  </td>
                  <td>
                    <span className="location-badge">📍 {order.destination}</span>
                  </td>
                  <td>
                    <span className="priority-badge">
                      {getPriorityIcon(order.priority)} {order.priority}
                    </span>
                  </td>
                  <td>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td>{order.weight.toLocaleString()}</td>
                  <td className="amount">
                    ${order.value.toLocaleString()}
                  </td>
                  <td className="date-small">
                    {new Date(order.date).toLocaleDateString('es-CO')}
                  </td>
                  <td className="actions-cell">
                    <button
                      className="btn-icon"
                      title="Ver detalles"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      👁️
                    </button>
                    <button
                      className="btn-icon"
                      title="Editar"
                      onClick={() => navigate(`/orders/${order.id}/edit`)}
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon"
                      title="Más opciones"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      ⋯
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>No hay pedidos con el estado seleccionado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrdersList;

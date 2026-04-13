import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { mockOrders } from '../../data/mockData';
import './OrdersBoard.css';

const OrdersBoard = () => {
  const navigate = useNavigate();
  const [draggedOrder, setDraggedOrder] = useState(null);

  const statuses = ['Pendiente', 'En tránsito', 'Entregado', 'Cancelado'];

  const getOrdersByStatus = (status) => {
    return mockOrders.filter(order => order.status === status);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Alta':
        return '#ef4444';
      case 'Media':
        return '#f59e0b';
      case 'Baja':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const handleDragStart = (e, order) => {
    setDraggedOrder(order);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    if (draggedOrder) {
      console.log(`Pedido ${draggedOrder.id} movido a ${status}`);
      // In a real app, update the order status here
      setDraggedOrder(null);
    }
  };

  return (
    <div className="orders-board">
      {/* HEADER */}
      <div className="board-header">
        <div className="header-content">
          <h1>Panel de Pedidos</h1>
          <p className="subtitle">Vista Kanban de tu logística</p>
        </div>
        <div className="header-actions">
          <Link to="/orders" className="btn btn-secondary">
            📊 Ver Lista
          </Link>
          <Link to="/orders/create" className="btn btn-primary">
            ➕ Nuevo Pedido
          </Link>
        </div>
      </div>

      {/* BOARD */}
      <div className="kanban-board">
        {statuses.map(status => (
          <div
            key={status}
            className="board-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, status)}
          >
            {/* COLUMN HEADER */}
            <div className="column-header">
              <div className="column-title">
                <span className="status-icon">
                  {status === 'Pendiente' ? '⏳' : status === 'En tránsito' ? '🚚' : status === 'Entregado' ? '✅' : '❌'}
                </span>
                <h2>{status}</h2>
              </div>
              <span className="column-count">
                {getOrdersByStatus(status).length}
              </span>
            </div>

            {/* COLUMN CONTENT */}
            <div className="column-cards">
              {getOrdersByStatus(status).length > 0 ? (
                getOrdersByStatus(status).map(order => (
                  <div
                    key={order.id}
                    className="order-card"
                    draggable
                    onDragStart={(e) => handleDragStart(e, order)}
                    onClick={() => navigate(`/orders/${order.id}`)}
                  >
                    <div className="card-header">
                      <span className="card-id">{order.id}</span>
                      <span
                        className="priority-dot"
                        style={{ backgroundColor: getPriorityColor(order.priority) }}
                        title={`Prioridad: ${order.priority}`}
                      ></span>
                    </div>

                    <div className="card-customer">
                      <strong>{order.customer}</strong>
                    </div>

                    <div className="card-route">
                      <span className="route-icon">📍</span>
                      <span className="route-text">{order.origin} → {order.destination}</span>
                    </div>

                    <div className="card-meta">
                      <div className="meta-item">
                        <span className="meta-label">Peso</span>
                        <span className="meta-value">{order.weight} kg</span>
                      </div>
                      <div className="meta-item">
                        <span className="meta-label">Valor</span>
                        <span className="meta-value">${(order.value / 1000).toFixed(0)}k</span>
                      </div>
                    </div>

                    <div className="card-footer">
                      <span className="card-date">
                        {new Date(order.date).toLocaleDateString('es-CO')}
                      </span>
                      <button
                        className="card-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${order.id}/edit`);
                        }}
                        title="Editar"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-column">
                  <span className="empty-icon">
                    {status === 'Pendiente' ? '⏳' : status === 'En tránsito' ? '🚚' : status === 'Entregado' ? '✅' : '❌'}
                  </span>
                  <p>Sin pedidos</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* SUMMARY STATS */}
      <div className="board-summary">
        <div className="summary-card">
          <span className="summary-label">Total de Pedidos</span>
          <span className="summary-value">{mockOrders.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Valor Total</span>
          <span className="summary-value">${(mockOrders.reduce((sum, o) => sum + o.value, 0) / 1000000).toFixed(1)}M</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Peso Total</span>
          <span className="summary-value">{(mockOrders.reduce((sum, o) => sum + o.weight, 0) / 1000).toFixed(1)}T</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">En Ruta</span>
          <span className="summary-value">{mockOrders.filter(o => o.status === 'En tránsito').length}</span>
        </div>
      </div>
    </div>
  );
};

export default OrdersBoard;

import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { mockOrders } from '../../data/mockData';
import './OrderEdit.css';

const OrderEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const order = mockOrders.find(o => o.id === id);

  const [formData, setFormData] = useState({
    customer: order?.customer || '',
    phone: order?.phone || '',
    email: order?.email || '',
    origin: order?.origin || '',
    destination: order?.destination || '',
    weight: order?.weight || '',
    value: order?.value || '',
    priority: order?.priority || 'Media',
    description: order?.description || '',
    status: order?.status || 'Pendiente',
    pickupDate: order?.date || '',
    deliveryDate: order?.deliveryDate || '',
  });

  if (!order) {
    return (
      <div className="order-edit error">
        <div className="error-message">
          🚫 Pedido no encontrado
          <Link to="/orders" className="btn">
            Volver a la lista
          </Link>
        </div>
      </div>
    );
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Pedido actualizado:', formData);
    navigate('/orders');
  };

  return (
    <div className="order-edit">
      {/* HEADER */}
      <div className="form-header">
        <div>
          <h1>Editar Pedido {id}</h1>
          <p className="subtitle">Modifica los detalles del pedido</p>
        </div>
        <Link to="/orders" className="btn btn-secondary">
          ← Volver
        </Link>
      </div>

      {/* FORM */}
      <form onSubmit={handleSubmit} className="order-form">
        {/* CUSTOMER SECTION */}
        <section className="form-section">
          <h3>📋 Información del Cliente</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Nombre del Cliente</label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
        </section>

        {/* LOCATION SECTION */}
        <section className="form-section">
          <h3>📍 Ubicaciones</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Ciudad de Origen</label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Ciudad de Destino</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
              />
            </div>
          </div>
        </section>

        {/* CARGO SECTION */}
        <section className="form-section">
          <h3>📦 Detalles del Pedido</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Peso (kg)</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Valor ($)</label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label>Prioridad</label>
              <select name="priority" value={formData.priority} onChange={handleChange}>
                <option value="Baja">🟢 Baja</option>
                <option value="Media">🟡 Media</option>
                <option value="Alta">🔴 Alta</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estado</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="Pendiente">Pendiente</option>
                <option value="En tránsito">En tránsito</option>
                <option value="Entregado">Entregado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/orders')} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            ✓ Guardar Cambios
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderEdit;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import './OrderCreate.css';

const OrderCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    customer: '',
    phone: '',
    email: '',
    origin: '',
    destination: '',
    weight: '',
    value: '',
    priority: 'Media',
    description: '',
    pickupDate: '',
    deliveryDate: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Simulate save
    console.log('Pedido creado:', formData);
    navigate('/orders');
  };

  return (
    <div className="order-create">
      {/* HEADER */}
      <div className="form-header">
        <div>
          <h1>Crear Nuevo Pedido</h1>
          <p className="subtitle">Registra un nuevo pedido de entrega</p>
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
              <label>Nombre del Cliente *</label>
              <input
                type="text"
                name="customer"
                value={formData.customer}
                onChange={handleChange}
                placeholder="Ej: Empresa ABC"
                required
              />
            </div>
            <div className="form-group">
              <label>Teléfono *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="3001234567"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="cliente@empresa.com"
              required
            />
          </div>
        </section>

        {/* LOCATION SECTION */}
        <section className="form-section">
          <h3>📍 Ubicaciones</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Ciudad de Origen *</label>
              <input
                type="text"
                name="origin"
                value={formData.origin}
                onChange={handleChange}
                placeholder="Ej: Bogotá"
                required
              />
            </div>
            <div className="form-group">
              <label>Ciudad de Destino *</label>
              <input
                type="text"
                name="destination"
                value={formData.destination}
                onChange={handleChange}
                placeholder="Ej: Medellín"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label>Descripción de la Carga</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe el contenido del pedido..."
              rows="3"
            ></textarea>
          </div>
        </section>

        {/* CARGO SECTION */}
        <section className="form-section">
          <h3>📦 Detalles del Pedido</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Peso (kg) *</label>
              <input
                type="number"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="1000"
                required
              />
            </div>
            <div className="form-group">
              <label>Valor ($) *</label>
              <input
                type="number"
                name="value"
                value={formData.value}
                onChange={handleChange}
                placeholder="500000"
                required
              />
            </div>
            <div className="form-group">
              <label>Prioridad *</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
              >
                <option value="Baja">🟢 Baja</option>
                <option value="Media">🟡 Media</option>
                <option value="Alta">🔴 Alta</option>
              </select>
            </div>
          </div>
        </section>

        {/* DATES SECTION */}
        <section className="form-section">
          <h3>📅 Fechas</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Recogida *</label>
              <input
                type="date"
                name="pickupDate"
                value={formData.pickupDate}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha de Entrega Estimada *</label>
              <input
                type="date"
                name="deliveryDate"
                value={formData.deliveryDate}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        </section>

        {/* ACTIONS */}
        <div className="form-actions">
          <button type="button" onClick={() => navigate('/orders')} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            ✓ Crear Pedido
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderCreate;

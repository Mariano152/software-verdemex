import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRoute, fetchRouteDependencies } from './routeApi';
import {
  buildRoutePayload,
  createEmptyRouteForm,
  getVehicleLabel,
  ROUTE_TYPE_OPTIONS
} from './routeHelpers';
import './OrderCreate.css';

const OrderCreate = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState(createEmptyRouteForm);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingDependencies, setLoadingDependencies] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadDependencies = async () => {
      try {
        setLoadingDependencies(true);
        const data = await fetchRouteDependencies();
        setDrivers(data.drivers);
        setVehicles(data.vehicles);
        setError(null);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoadingDependencies(false);
      }
    };

    loadDependencies();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      await createRoute(buildRoutePayload(formData));
      navigate('/routes');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="order-create">
      <div className="form-header">
        <div>
          <h1>Crear Nueva Ruta</h1>
          <p className="subtitle">Registra la ruta, unidad, conductor y valor monetario</p>
        </div>
        <Link to="/routes" className="btn btn-secondary">
          Volver
        </Link>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="order-form">
        <section className="form-section">
          <h3>Asignacion Operativa</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Conductor *</label>
              <select name="conductor_id" value={formData.conductor_id} onChange={handleChange} required disabled={loadingDependencies}>
                <option value="">Selecciona un conductor</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Vehiculo *</label>
              <select name="vehiculo_id" value={formData.vehiculo_id} onChange={handleChange} required disabled={loadingDependencies}>
                <option value="">Selecciona un vehiculo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {getVehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Tipo de unidad *</label>
              <select name="tipo_unidad" value={formData.tipo_unidad} onChange={handleChange}>
                {ROUTE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Ruta y Logistica</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Origen *</label>
              <input type="text" name="origen" value={formData.origen} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Destino *</label>
              <input type="text" name="destino" value={formData.destino} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Kilometros programados *</label>
              <input type="number" min="0" step="0.01" name="kilometros_programados" value={formData.kilometros_programados} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Metros cubicos enviados *</label>
              <input type="number" min="0" step="0.01" name="metros_cubicos_enviados" value={formData.metros_cubicos_enviados} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Valor monetario *</label>
              <input type="number" min="0" step="0.01" name="valor_monetario" value={formData.valor_monetario} onChange={handleChange} required />
            </div>
          </div>
        </section>

        <section className="form-section">
          <h3>Fechas y Seguimiento</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Fecha de registro *</label>
              <input type="date" name="fecha_registro" value={formData.fecha_registro} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Fecha de entrega *</label>
              <input type="date" name="fecha_entrega" value={formData.fecha_entrega} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label>Descripcion</label>
            <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} rows="3"></textarea>
          </div>
          <div className="form-group">
            <label>Observaciones</label>
            <textarea name="observaciones" value={formData.observaciones} onChange={handleChange} rows="3"></textarea>
          </div>
        </section>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/routes')} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving || loadingDependencies}>
            {saving ? 'Guardando...' : 'Crear Ruta'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderCreate;

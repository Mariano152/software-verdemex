import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchRouteById, fetchRouteDependencies, updateRoute } from './routeApi';
import {
  buildRoutePayload,
  formatRouteStatus,
  getRouteCode,
  getVehicleLabel,
  mapRouteToForm,
  ROUTE_STATUS_OPTIONS,
  ROUTE_TYPE_OPTIONS
} from './routeHelpers';
import './OrderEdit.css';

const OrderEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPage = async () => {
      try {
        setLoading(true);
        const [route, dependencies] = await Promise.all([
          fetchRouteById(id),
          fetchRouteDependencies()
        ]);
        setFormData(mapRouteToForm(route));
        setDrivers(dependencies.drivers);
        setVehicles(dependencies.vehicles);
        setError(null);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleStatusSelect = (status) => {
    setFormData((current) => ({
      ...current,
      estatus: status
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      await updateRoute(id, buildRoutePayload(formData));
      navigate(`/routes/${id}`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="order-edit"><p>Cargando ruta...</p></div>;
  }

  if (!formData) {
    return (
      <div className="order-edit error">
        <div className="error-message">
          Ruta no encontrada
          <Link to="/routes" className="btn">Volver a la lista</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="order-edit">
      <div className="form-header">
        <div>
          <h1>Editar Ruta {getRouteCode({ id })}</h1>
          <p className="subtitle">Actualiza estatus, asignaciones y datos operativos</p>
        </div>
        <Link to="/routes" className="btn btn-secondary">
          Volver
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit} className="order-form">
        <section className="form-section">
          <h3>Asignacion Operativa</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Conductor *</label>
              <select name="conductor_id" value={formData.conductor_id} onChange={handleChange} required>
                <option value="">Selecciona un conductor</option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>{driver.nombre}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Vehiculo *</label>
              <select name="vehiculo_id" value={formData.vehiculo_id} onChange={handleChange} required>
                <option value="">Selecciona un vehiculo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>{getVehicleLabel(vehicle)}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Estatus *</label>
              <div className="route-status-buttons" role="group" aria-label="Cambiar estatus de la ruta">
                {ROUTE_STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`route-status-btn ${formData.estatus === option.value ? 'active' : ''}`}
                    onClick={() => handleStatusSelect(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <select name="estatus" value={formData.estatus} onChange={handleChange}>
                {ROUTE_STATUS_OPTIONS.map((option) => (
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
            <div className="form-group">
              <label>Tipo de unidad *</label>
              <select name="tipo_unidad" value={formData.tipo_unidad} onChange={handleChange}>
                {ROUTE_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
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
            <div className="form-group">
              <label>Estatus actual</label>
              <input type="text" value={formatRouteStatus(formData.estatus)} disabled />
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
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OrderEdit;

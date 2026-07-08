import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationModal from '@components/Notifications/NotificationModal';
import { VEHICLE_TYPE_OPTIONS } from '../../constants/vehicleTypes';
import './VehicleCreate.css';

export default function VehicleCreate() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [formData, setFormData] = useState({
    numeroEconomico: '',
    tipoCarro: '',
    propietarioNombre: '',
    placa: '',
    numeroSerie: '',
    marca: '',
    modelo: '',
    color: '',
    capacidadKg: '',
    descripcion: '',
    imagen: null,
    imagenPreview: null
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((current) => ({
        ...current,
        imagen: file,
        imagenPreview: reader.result
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData((current) => ({ ...current, imagen: null, imagenPreview: null }));
  };

  const validate = () => {
    if (
      !formData.numeroEconomico
      || !formData.tipoCarro
      || !formData.propietarioNombre
      || !formData.placa
      || !formData.numeroSerie
      || !formData.marca
      || !formData.modelo
    ) {
      setNotification({
        type: 'error',
        title: 'Campos requeridos',
        message: 'Completa todos los campos obligatorios (*).'
      });
      return false;
    }

    if (!formData.imagen) {
      setNotification({
        type: 'error',
        title: 'Imagen requerida',
        message: 'Debes subir una imagen del vehiculo.'
      });
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!validate()) return;

    setLoading(true);
    setNotification(null);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) {
        throw new Error('No estas autenticado. Por favor inicia sesion.');
      }

      const submitData = new FormData();
      submitData.append('numero_economico', formData.numeroEconomico);
      submitData.append('tipo_carro', formData.tipoCarro);
      submitData.append('propietario_nombre', formData.propietarioNombre);
      submitData.append('placa', formData.placa.toUpperCase());
      submitData.append('numero_serie', formData.numeroSerie);
      submitData.append('marca', formData.marca);
      submitData.append('modelo', parseInt(formData.modelo, 10));
      submitData.append('color', formData.color || '');
      submitData.append('capacidad_kg', formData.capacidadKg ? parseInt(formData.capacidadKg, 10) : '');
      submitData.append('descripcion', formData.descripcion || '');

      if (formData.imagen) {
        submitData.append('imagen', formData.imagen);
      }

      const response = await fetch('/api/vehicles', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: submitData
      });

      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData.message || 'Error registrando vehiculo');
      }

      setNotification({
        type: 'success',
        title: 'Vehiculo registrado',
        message: `${formData.numeroEconomico} - Placa: ${formData.placa.toUpperCase()}`
      });

      setTimeout(() => navigate('/vehicles'), 1500);
    } catch (error) {
      setNotification({
        type: 'error',
        title: 'Error al registrar',
        message: error.message || 'Ocurrio un error al registrar el vehiculo.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="vehicle-create">
      <div className="form-header">
        <Link to="/vehicles" className="btn btn-outline">
          Volver
        </Link>
        <div className="entity-create-tabs" aria-label="Tipo de alta">
          <span className="entity-create-tab active">Vehiculo</span>
          <Link to="/drivers/create" className="entity-create-tab">Conductor</Link>
        </div>
        <div>
          <h1>Registro de Nuevo Vehiculo</h1>
          <p className="subtitle">Informacion basica del vehiculo</p>
        </div>
      </div>

      {notification && (
        <NotificationModal
          type={notification.type}
          title={notification.title}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h3>Informacion Basica del Vehiculo</h3>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="numeroEconomico">Numero Economico *</label>
                <input
                  id="numeroEconomico"
                  type="text"
                  name="numeroEconomico"
                  value={formData.numeroEconomico}
                  onChange={handleChange}
                  placeholder="VEH-001"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tipoCarro">Tipo de Carro *</label>
                <select
                  id="tipoCarro"
                  name="tipoCarro"
                  value={formData.tipoCarro}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecciona un tipo</option>
                  {VEHICLE_TYPE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="propietarioNombre">Nombre del Propietario *</label>
                <input
                  id="propietarioNombre"
                  type="text"
                  name="propietarioNombre"
                  value={formData.propietarioNombre}
                  onChange={handleChange}
                  placeholder="Juan Rodriguez"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="placa">Placa *</label>
                <input
                  id="placa"
                  type="text"
                  name="placa"
                  value={formData.placa}
                  onChange={handleChange}
                  placeholder="ABC-1234"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="numeroSerie">Numero de Serie *</label>
                <input
                  id="numeroSerie"
                  type="text"
                  name="numeroSerie"
                  value={formData.numeroSerie}
                  onChange={handleChange}
                  placeholder="1G1FB1S52D1234567"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="marca">Marca *</label>
                <input
                  id="marca"
                  type="text"
                  name="marca"
                  value={formData.marca}
                  onChange={handleChange}
                  placeholder="Toyota"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="modelo">Ano del Modelo *</label>
                <input
                  id="modelo"
                  type="number"
                  name="modelo"
                  value={formData.modelo}
                  onChange={handleChange}
                  placeholder="2023"
                  min="1900"
                  max="2100"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="color">Color</label>
                <input
                  id="color"
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="Blanco"
                />
              </div>

              <div className="form-group">
                <label htmlFor="capacidadKg">Capacidad (Kg)</label>
                <input
                  id="capacidadKg"
                  type="number"
                  name="capacidadKg"
                  value={formData.capacidadKg}
                  onChange={handleChange}
                  placeholder="1000"
                  min="0"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group full-width">
                <label htmlFor="descripcion">Descripcion</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  placeholder="Descripcion adicional del vehiculo..."
                  rows="3"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Fotografia del Vehiculo *</h3>

            <div className="photo-upload-container">
              {formData.imagenPreview ? (
                <div className="photo-preview-box">
                  <img src={formData.imagenPreview} alt="Vista previa" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="btn-remove-photo"
                  >
                    X
                  </button>
                </div>
              ) : (
                <label htmlFor="imagen" className="photo-upload-placeholder">
                  <div className="upload-icon">IMG</div>
                  <div className="upload-text">
                    Haz clic para seleccionar la imagen del vehiculo
                  </div>
                </label>
              )}

              <input
                id="imagen"
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Conductores</h3>
            <div className="entity-create-helper">
              <p>Tambien puedes dar de alta conductores desde aqui y despues continuar con la asignacion.</p>
              <Link to="/drivers/create" className="btn btn-outline">
                Ir a Crear Conductor
              </Link>
            </div>
          </div>

          <div className="form-actions">
            <Link to="/vehicles" className="btn btn-outline">
              Cancelar
            </Link>
            <button
              type="submit"
              className="btn btn-success btn-lg"
              disabled={loading}
            >
              {loading ? 'Registrando...' : 'Registrar Vehiculo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
